/**
 * parseSQL.js
 * ───────────
 * Parses raw PostgreSQL dump text (CREATE TABLE + ALTER TABLE statements)
 * into the normalized { tables, relationships } format.
 *
 * Strategy:
 *  1. Strip comments (-- and /* *​/)
 *  2. Collapse multi-line statements and split by semicolons
 *  3. Extract CREATE TABLE blocks → columns + inline constraints
 *  4. Extract ALTER TABLE ADD CONSTRAINT → foreign keys
 *  5. Derive relationships from all FK sources
 *
 * No external parsing libraries — only regex + string manipulation.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Remove SQL comments: -- line comments and /* block comments *​/
 */
function stripComments(text) {
  let cleaned = text.replace(/\/\*[\s\S]*?\*\//g, '');
  cleaned = cleaned.replace(/--.*$/gm, '');
  return cleaned;
}

/**
 * Normalize a schema-qualified table name.
 * Strips quotes and schema prefix (e.g. "public"."users" → users).
 */
function normalizeTableName(raw) {
  return raw
    .replace(/["'`]/g, '')
    .replace(/^\w+\./, '') // strip schema prefix
    .trim();
}

/**
 * Normalize a column name (strip quotes).
 */
function normalizeColumnName(raw) {
  return raw.replace(/["'`]/g, '').trim();
}

/**
 * Split a parenthesized column definition body by commas,
 * but respect nested parentheses (e.g., DEFAULT values with function calls).
 */
function splitColumnDefs(body) {
  const parts = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

/**
 * Extract the parenthesized body from a CREATE TABLE statement.
 * Returns the content between the outer ( and ) enclosing the column defs.
 */
function extractCreateTableBody(statement) {
  // Find the first '(' after CREATE TABLE name
  let depth = 0;
  let start = -1;

  for (let i = 0; i < statement.length; i++) {
    if (statement[i] === '(') {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (statement[i] === ')') {
      depth--;
      if (depth === 0) {
        return statement.slice(start, i);
      }
    }
  }
  return null;
}

// ─── Type Normalization ─────────────────────────────────────────────────────────

/**
 * Normalize a PostgreSQL column type for display.
 */
function normalizeType(raw) {
  return raw
    .replace(/\s+/g, ' ')           // collapse whitespace
    .replace(/character varying/i, 'varchar')
    .replace(/character/i, 'char')
    .replace(/integer/i, 'int')
    .replace(/boolean/i, 'bool')
    .replace(/timestamp\s+with(out)?\s+time\s+zone/i, (m) =>
      m.toLowerCase().includes('without') ? 'timestamp' : 'timestamptz'
    )
    .trim();
}

// ─── Column Parser ──────────────────────────────────────────────────────────────

/**
 * Parse a single column definition string.
 * Returns a column object, or a constraint object, or null.
 */
function parseColumnDef(def, tableName) {
  const trimmed = def.trim();
  const upper = trimmed.toUpperCase();

  // ── Table-Level Constraints ────────────────────────────────────────────────

  // PRIMARY KEY (col1, col2, ...)
  if (/^(?:CONSTRAINT\s+\w+\s+)?PRIMARY\s+KEY/i.test(trimmed)) {
    const match = trimmed.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    if (match) {
      const cols = match[1].split(',').map((c) => normalizeColumnName(c));
      return { _type: 'pk_constraint', columns: cols };
    }
    return null;
  }

  // FOREIGN KEY (...) REFERENCES table(...)
  if (/^(?:CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY/i.test(trimmed)) {
    const fkMatch = trimmed.match(
      /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(\S+)\s*\(([^)]+)\)/i
    );
    if (fkMatch) {
      const sourceCols = fkMatch[1].split(',').map((c) => normalizeColumnName(c));
      const targetTable = normalizeTableName(fkMatch[2]);
      const targetCols = fkMatch[3].split(',').map((c) => normalizeColumnName(c));
      return {
        _type: 'fk_constraint',
        sourceColumns: sourceCols,
        targetTable,
        targetColumns: targetCols,
      };
    }
    return null;
  }

  // UNIQUE constraint at table level
  if (/^(?:CONSTRAINT\s+\S+\s+)?UNIQUE/i.test(trimmed)) {
    const match = trimmed.match(/UNIQUE\s*\(([^)]+)\)/i);
    if (match) {
      const cols = match[1].split(',').map((c) => normalizeColumnName(c));
      return { _type: 'unique_constraint', columns: cols };
    }
    return null;
  }

  // CHECK, EXCLUDE, or other constraints we can skip
  if (/^(?:CONSTRAINT\s+\S+\s+)?(?:CHECK|EXCLUDE)/i.test(trimmed)) {
    return null;
  }

  // ── Regular Column Definition ──────────────────────────────────────────────

  // Match: columnName  dataType  [constraints...]
  // Column name can be quoted
  const colMatch = trimmed.match(/^(["'`]?\w+["'`]?)\s+(.+)$/);
  if (!colMatch) return null;

  const name = normalizeColumnName(colMatch[1]);
  const rest = colMatch[2];

  // Extract the type — everything before the first constraint keyword
  // Constraint keywords: NOT NULL, NULL, PRIMARY KEY, UNIQUE, DEFAULT, REFERENCES, CHECK, GENERATED
  const constraintKeywords = /\b(?:NOT\s+NULL|NULL|PRIMARY\s+KEY|UNIQUE|DEFAULT|REFERENCES|CHECK|GENERATED|CONSTRAINT)\b/i;
  const constraintStart = rest.search(constraintKeywords);

  let typeStr, constraintStr;
  if (constraintStart === -1) {
    typeStr = rest;
    constraintStr = '';
  } else {
    typeStr = rest.slice(0, constraintStart);
    constraintStr = rest.slice(constraintStart);
  }

  const type = normalizeType(typeStr);
  const upperConstraint = constraintStr.toUpperCase();

  const isPrimaryKey = /\bPRIMARY\s+KEY\b/i.test(constraintStr);
  const isNotNull = /\bNOT\s+NULL\b/i.test(constraintStr);
  const isUnique = /\bUNIQUE\b/i.test(constraintStr);

  // Default value
  let defaultValue = null;
  const defaultMatch = constraintStr.match(/\bDEFAULT\s+('(?:[^']*)'|\S+)/i);
  if (defaultMatch) {
    defaultValue = defaultMatch[1];
  }

  // Serial types imply auto-increment + PK in many schemas
  const isSerial = /\bserial\b/i.test(typeStr);

  // Inline REFERENCES
  let references = null;
  let isForeignKey = false;
  const refMatch = constraintStr.match(/\bREFERENCES\s+(\S+)\s*\(([^)]+)\)/i);
  if (refMatch) {
    isForeignKey = true;
    references = {
      table: normalizeTableName(refMatch[1]),
      column: normalizeColumnName(refMatch[2]),
    };
  }

  return {
    _type: 'column',
    name,
    type: isSerial ? type.replace(/serial/i, 'serial') : type,
    isPrimaryKey: isPrimaryKey || isSerial,
    isForeignKey,
    isNullable: !isNotNull && !isPrimaryKey && !isSerial,
    isUnique: isUnique || isPrimaryKey,
    defaultValue,
    references,
  };
}

// ─── Main Parser ────────────────────────────────────────────────────────────────

/**
 * Parse a PostgreSQL schema dump string.
 * @param {string} input - Raw SQL text
 * @returns {{ tables: Array, relationships: Array }}
 */
export function parseSQL(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('parseSQL: input must be a non-empty string');
  }

  const cleaned = stripComments(input);

  // Split by semicolons to get individual statements
  const statements = cleaned
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const tablesMap = new Map(); // tableName → { name, columns }
  const relationships = [];

  for (const stmt of statements) {
    // ── CREATE TABLE ───────────────────────────────────────────────────────

    const createMatch = stmt.match(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\S+)/i
    );

    if (createMatch) {
      const tableName = normalizeTableName(createMatch[1]);
      const body = extractCreateTableBody(stmt);
      if (!body) continue;

      const defs = splitColumnDefs(body);
      const columns = [];
      const pkCols = [];
      const uniqueCols = [];
      const fkConstraints = [];

      for (const def of defs) {
        const parsed = parseColumnDef(def, tableName);
        if (!parsed) continue;

        if (parsed._type === 'column') {
          const { _type, ...col } = parsed;
          columns.push(col);

          // Track inline FK relationships
          if (col.isForeignKey && col.references) {
            const relId = `${tableName}.${col.name}->${col.references.table}.${col.references.column}`;
            relationships.push({
              id: relId,
              sourceTable: tableName,
              sourceColumn: col.name,
              targetTable: col.references.table,
              targetColumn: col.references.column,
              type: 'one-to-many',
            });
          }
        } else if (parsed._type === 'pk_constraint') {
          pkCols.push(...parsed.columns);
        } else if (parsed._type === 'unique_constraint') {
          uniqueCols.push(...parsed.columns);
        } else if (parsed._type === 'fk_constraint') {
          fkConstraints.push(parsed);
        }
      }

      // Apply table-level PK constraints
      for (const col of columns) {
        if (pkCols.includes(col.name)) {
          col.isPrimaryKey = true;
          col.isNullable = false;
        }
        if (uniqueCols.includes(col.name)) {
          col.isUnique = true;
        }
      }

      // Apply table-level FK constraints
      for (const fk of fkConstraints) {
        for (let i = 0; i < fk.sourceColumns.length; i++) {
          const srcCol = fk.sourceColumns[i];
          const tgtCol = fk.targetColumns[i] || fk.targetColumns[0];

          const col = columns.find((c) => c.name === srcCol);
          if (col) {
            col.isForeignKey = true;
            col.references = { table: fk.targetTable, column: tgtCol };
          }

          const relId = `${tableName}.${srcCol}->${fk.targetTable}.${tgtCol}`;
          relationships.push({
            id: relId,
            sourceTable: tableName,
            sourceColumn: srcCol,
            targetTable: fk.targetTable,
            targetColumn: tgtCol,
            type: 'one-to-many',
          });
        }
      }

      tablesMap.set(tableName, { name: tableName, columns });
      continue;
    }

    // ── ALTER TABLE ADD CONSTRAINT FOREIGN KEY ─────────────────────────────

    const alterMatch = stmt.match(
      /ALTER\s+TABLE\s+(?:ONLY\s+)?(\S+)\s+ADD\s+(?:CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(\S+)\s*\(([^)]+)\)/i
    );

    if (alterMatch) {
      const sourceTable = normalizeTableName(alterMatch[1]);
      const sourceCols = alterMatch[2].split(',').map((c) => normalizeColumnName(c));
      const targetTable = normalizeTableName(alterMatch[3]);
      const targetCols = alterMatch[4].split(',').map((c) => normalizeColumnName(c));

      for (let i = 0; i < sourceCols.length; i++) {
        const srcCol = sourceCols[i];
        const tgtCol = targetCols[i] || targetCols[0];

        // Update the column in the table if it exists
        const table = tablesMap.get(sourceTable);
        if (table) {
          const col = table.columns.find((c) => c.name === srcCol);
          if (col) {
            col.isForeignKey = true;
            col.references = { table: targetTable, column: tgtCol };
          }
        }

        const relId = `${sourceTable}.${srcCol}->${targetTable}.${tgtCol}`;
        relationships.push({
          id: relId,
          sourceTable: sourceTable,
          sourceColumn: srcCol,
          targetTable: targetTable,
          targetColumn: tgtCol,
          type: 'one-to-many',
        });
      }
    }
  }

  // Deduplicate relationships by id
  const uniqueRels = [];
  const seenIds = new Set();
  for (const rel of relationships) {
    if (!seenIds.has(rel.id)) {
      seenIds.add(rel.id);
      uniqueRels.push(rel);
    }
  }

  return {
    tables: Array.from(tablesMap.values()),
    relationships: uniqueRels,
  };
}
