/**
 * parseSchema.js
 * Main entry point for parsing schema input.
 * Expects pure SQL CREATE TABLE data.
 */

import { parseSQL } from './parseSQL.js';

/**
 * Parse a schema string of SQL format.
 * @param {string} input - Raw schema text
 * @returns {{ tables: Array, relationships: Array, detectedFormat: 'sql' | 'unknown', error?: string, hint?: string }} Target representation
 */
export function parseSchema(input) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return {
      tables: [],
      relationships: [],
      detectedFormat: 'unknown',
      error: 'Input is empty.',
      hint: 'Paste a valid PostgreSQL CREATE TABLE dump.',
    };
  }

  try {
    const result = parseSQL(input);
    return {
      ...result,
      detectedFormat: 'sql'
    };
  } catch (error) {
    console.error('Schema Parsing Error:', error);
    return {
      tables: [],
      relationships: [],
      detectedFormat: 'unknown',
      error: error.message,
      hint: 'The input doesn\'t look like a valid SQL dump. Make sure it contains standard `CREATE TABLE` and `ALTER TABLE` statements.'
    };
  }
}
