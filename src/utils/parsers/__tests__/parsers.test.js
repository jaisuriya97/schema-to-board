/**
 * parsers.test.js
 * ───────────────
 * Comprehensive test suite for the Prisma and SQL parsers.
 *
 * Run: npx vitest run
 */

import { describe, it, expect } from 'vitest';
import { parseSQL } from '../parseSQL.js';
import { parseSchema, detectSchemaType, ParserError } from '../parseSchema.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const SQL_SCHEMA_BASIC = `
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    published BOOLEAN DEFAULT false,
    author_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

const SQL_SCHEMA_TABLE_LEVEL_FK = `
  CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL
  );
`;

const SQL_SCHEMA_ALTER_TABLE = `
  CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
  );

  CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    department_id INTEGER
  );

  ALTER TABLE employees
    ADD CONSTRAINT fk_department
    FOREIGN KEY (department_id)
    REFERENCES departments(id);
`;

const SQL_SCHEMA_COMPOSITE_PK = `
  CREATE TABLE enrollment (
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    enrolled_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (student_id, course_id)
  );
`;

const SQL_SCHEMA_QUOTED_AND_SCHEMA_QUALIFIED = `
  CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL,
    "role_name" VARCHAR(50) NOT NULL
  );
`;

// ─────────────────────────────────────────────────────────────────────────────
// SQL Parser Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('parseSQL', () => {
  it('should parse CREATE TABLE with inline PKs and FKs', () => {
    const result = parseSQL(SQL_SCHEMA_BASIC);

    expect(result.tables).toHaveLength(2);

    const users = result.tables.find((t) => t.name === 'users');
    expect(users).toBeDefined();
    expect(users.columns).toHaveLength(4);

    const userId = users.columns.find((c) => c.name === 'id');
    expect(userId.isPrimaryKey).toBe(true);
    expect(userId.type).toMatch(/serial/i);

    const email = users.columns.find((c) => c.name === 'email');
    expect(email.isUnique).toBe(true);
    expect(email.isNullable).toBe(false);

    const posts = result.tables.find((t) => t.name === 'posts');
    const authorId = posts.columns.find((c) => c.name === 'author_id');
    expect(authorId.isForeignKey).toBe(true);
    expect(authorId.references).toEqual({ table: 'users', column: 'id' });

    // Should have at least 1 relationship
    expect(result.relationships.length).toBeGreaterThanOrEqual(1);
    expect(result.relationships[0].sourceTable).toBe('posts');
    expect(result.relationships[0].targetTable).toBe('users');
  });

  it('should parse table-level FOREIGN KEY constraints', () => {
    const result = parseSQL(SQL_SCHEMA_TABLE_LEVEL_FK);

    const orders = result.tables.find((t) => t.name === 'orders');
    expect(orders).toBeDefined();

    const userIdCol = orders.columns.find((c) => c.name === 'user_id');
    expect(userIdCol.isForeignKey).toBe(true);
    expect(userIdCol.references.table).toBe('users');

    const productIdCol = orders.columns.find((c) => c.name === 'product_id');
    expect(productIdCol.isForeignKey).toBe(true);
    expect(productIdCol.references.table).toBe('products');

    // 2 FK relationships
    expect(result.relationships).toHaveLength(2);
  });

  it('should parse ALTER TABLE ADD CONSTRAINT FOREIGN KEY', () => {
    const result = parseSQL(SQL_SCHEMA_ALTER_TABLE);

    expect(result.tables).toHaveLength(2);

    const employees = result.tables.find((t) => t.name === 'employees');
    const deptCol = employees.columns.find((c) => c.name === 'department_id');
    expect(deptCol.isForeignKey).toBe(true);
    expect(deptCol.references).toEqual({ table: 'departments', column: 'id' });

    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0].sourceTable).toBe('employees');
    expect(result.relationships[0].targetTable).toBe('departments');
  });

  it('should handle composite primary keys', () => {
    const result = parseSQL(SQL_SCHEMA_COMPOSITE_PK);

    const enrollment = result.tables.find((t) => t.name === 'enrollment');
    expect(enrollment).toBeDefined();

    const studentId = enrollment.columns.find((c) => c.name === 'student_id');
    const courseId = enrollment.columns.find((c) => c.name === 'course_id');
    expect(studentId.isPrimaryKey).toBe(true);
    expect(courseId.isPrimaryKey).toBe(true);
  });

  it('should handle schema-qualified and quoted table names', () => {
    const result = parseSQL(SQL_SCHEMA_QUOTED_AND_SCHEMA_QUALIFIED);

    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].name).toBe('user_roles');
    expect(result.tables[0].columns).toHaveLength(3);
  });

  it('should throw on empty input', () => {
    expect(() => parseSQL('')).toThrow();
    expect(() => parseSQL(null)).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unified Parser Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('parseSchema / generic entry point', () => {
  it('should parse SQL schema using parseSchema', () => {
    const result = parseSchema(SQL_SCHEMA_BASIC);
    expect(result.detectedFormat).toBe('sql');
    expect(result.tables).toHaveLength(2);
  });

  it('should throw ParserError on empty input', () => {
    expect(() => parseSchema('')).toThrow(ParserError);
    expect(() => parseSchema('   ')).toThrow(ParserError);
  });

  it('should throw ParserError on unrecognizable input', () => {
    expect(() => parseSchema('just some random text here')).toThrow(ParserError);
  });

  it('should allow forcing a specific format', () => {
    const result = parseSchema(SQL_SCHEMA_BASIC, 'sql');
    expect(result.detectedFormat).toBe('sql');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Schema Type Detection Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('detectSchemaType', () => {
  it('should detect Prisma schemas', () => {
    expect(detectSchemaType('model User { id Int @id }')).toBe('prisma');
    expect(detectSchemaType('datasource db { provider = "postgresql" }')).toBe('prisma');
  });

  it('should detect SQL schemas', () => {
    expect(detectSchemaType('CREATE TABLE users (id SERIAL PRIMARY KEY);')).toBe('sql');
    expect(detectSchemaType('ALTER TABLE foo ADD CONSTRAINT ...')).toBe('sql');
  });

  it('should return unknown for unrecognizable input', () => {
    expect(detectSchemaType('hello world')).toBe('unknown');
  });
});
