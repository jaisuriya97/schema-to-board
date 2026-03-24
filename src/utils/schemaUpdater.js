/**
 * Utility to safely mutate raw database schema strings (SQL only) 
 * when graphical nodes are renamed by the user.
 * It restricts operations to specific block boundaries to avoid destroying the user's manual formatting.
 */

export const renameTableInSchema = (schemaStr, oldName, newName) => {
  if (oldName === newName) return schemaStr;
  
  let updated = schemaStr;

  // SQL Explicit:
  updated = updated.replace(new RegExp(`CREATE\\s+TABLE\\s+["'\`]?${oldName}["'\`]?\\s*\\(`, 'gi'), `CREATE TABLE "${newName}" (`);
  updated = updated.replace(new RegExp(`REFERENCES\\s+["'\`]?${oldName}["'\`]?`, 'gi'), `REFERENCES "${newName}"`);

  return updated;
};

export const renameColumnInSchema = (schemaStr, tableName, oldCol, newCol) => {
  if (oldCol === newCol) return schemaStr;

  // Find the block corresponding to the tableName
  let startIndex = -1;
  const rx = new RegExp(`CREATE\\s+TABLE\\s+["'\`]?${tableName}["'\`]?\\s*\\(`, 'gi');
  const match = rx.exec(schemaStr);
  if (match) startIndex = match.index;

  if (startIndex === -1) {
    // Fallback global replace
    return schemaStr.replace(new RegExp(`\\b${oldCol}\\b`, 'g'), newCol);
  }

  // Find end of the block
  let endIndex = schemaStr.length;
  const nextRx = /CREATE\s+TABLE/gi;
  nextRx.lastIndex = startIndex + 10;
  const nextMatch = nextRx.exec(schemaStr);
  if (nextMatch) endIndex = nextMatch.index;

  const before = schemaStr.substring(0, startIndex);
  const block = schemaStr.substring(startIndex, endIndex);
  const after = schemaStr.substring(endIndex);

  // Replace oldCol with newCol ONLY inside this table block using exact word boundaries
  const mutatedBlock = block.replace(new RegExp(`\\b${oldCol}\\b`, 'g'), newCol);

  // Update references in OTHER tables
  let mutatedAfter = after;
  let mutatedBefore = before;
  
  const fkRx = new RegExp(`REFERENCES\\s+["'\`]?${tableName}["'\`]?\\s*\\(["'\`]?${oldCol}["'\`]?\\)`, 'gi');
  mutatedAfter = mutatedAfter.replace(fkRx, `REFERENCES "${tableName}"("${newCol}")`);
  mutatedBefore = mutatedBefore.replace(fkRx, `REFERENCES "${tableName}"("${newCol}")`);

  return mutatedBefore + mutatedBlock + mutatedAfter;
};

export const addRelationToSchema = (schemaStr, sourceTable, sourceCol, targetTable, targetCol) => {
  const alterTable = `\n\nALTER TABLE "${targetTable}" ADD FOREIGN KEY ("${targetCol}") REFERENCES "${sourceTable}"("${sourceCol}");`;
  return schemaStr + alterTable;
};

const getTableBlockBounds = (schemaStr, tableName) => {
  let startIndex = -1;
  const rx = new RegExp(`CREATE\\s+TABLE\\s+["'\`]?${tableName}["'\`]?\\s*\\(`, 'gi');
  const match = rx.exec(schemaStr);
  if (match) startIndex = match.index;

  if (startIndex === -1) return null;

  let endIndex = schemaStr.length;
  const nextRx = /CREATE\s+TABLE/gi;
  nextRx.lastIndex = startIndex + 10;
  const nextMatch = nextRx.exec(schemaStr);
  if (nextMatch) endIndex = nextMatch.index;
  
  return { startIndex, endIndex };
};

export const changeColumnTypeInSchema = (schemaStr, tableName, colName, newType) => {
  const bounds = getTableBlockBounds(schemaStr, tableName);
  if (!bounds) return schemaStr;

  const { startIndex, endIndex } = bounds;
  const before = schemaStr.substring(0, startIndex);
  const block = schemaStr.substring(startIndex, endIndex);
  const after = schemaStr.substring(endIndex);

  // Matches exactly the column name, followed by its data type (which may include structural parameters like (10, 2))
  const rx = new RegExp(`(["'\`]?${colName}["'\`]?)\\s+([a-zA-Z0-9_]+(?:\\s*\\([^)]*\\))?)`, 'i');
  const mutatedBlock = block.replace(rx, `$1 ${newType}`);

  return before + mutatedBlock + after;
};

export const togglePrimaryKeyInSchema = (schemaStr, tableName, colName) => {
  const bounds = getTableBlockBounds(schemaStr, tableName);
  if (!bounds) return schemaStr;

  const { startIndex, endIndex } = bounds;
  const before = schemaStr.substring(0, startIndex);
  const block = schemaStr.substring(startIndex, endIndex);
  const after = schemaStr.substring(endIndex);

  const lineRx = new RegExp(`([^\\n]*["'\`]?${colName}["'\`]?[^\\n]*)`, 'g');
  const mutatedBlock = block.replace(lineRx, (line) => {
      if (line.toUpperCase().includes('PRIMARY KEY')) {
        return line.replace(/\\s+PRIMARY KEY/ig, '');
      } else {
        if (line.trim().endsWith(',')) {
          return line.replace(/,$/, ' PRIMARY KEY,');
        } else {
          return line + ' PRIMARY KEY';
        }
      }
  });

  return before + mutatedBlock + after;
};
