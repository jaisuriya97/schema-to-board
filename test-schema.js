import { addColumnToSchema, changeColumnTypeInSchema } from "./src/utils/schemaUpdater.js";
import { parseSchema } from "./src/utils/parsers/parseSchema.js";

let sql = `-- Paste your SQL dump here!

CREATE TABLE Users (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  role VARCHAR(50)
);`;

console.log("Original Schema: \n", sql);

let s1 = addColumnToSchema(sql, "Users", "new_column_1234");
console.log("\nAfter Add Column: \n", s1);

let s2 = changeColumnTypeInSchema(s1, "Users", "new_column_1234", "BOOLEAN");
console.log("\nAfter Change Type to BOOLEAN: \n", s2);

let parsed = parseSchema(s2);
console.log("\nParsed output: \n", JSON.stringify(parsed, null, 2));
