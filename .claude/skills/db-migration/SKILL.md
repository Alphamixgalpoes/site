---
name: db-migration
description: Generate explained SQL for user to execute on Supabase dashboard
---
Generate a database migration for: $ARGUMENTS

1. Read current schema from codebase (repository files, existing models)
2. **EXPLAIN** what will be created/modified and WHY
3. **EXPLAIN** each SQL concept used:
   - `CREATE TABLE` — what a table is, why these columns
   - `REFERENCES` — foreign keys link tables (referential integrity)
   - `RLS` — Row Level Security acts like a firewall per row
   - `INDEX` — speeds up queries on specific columns (tradeoff: slower writes)
   - `TRIGGER` — automatic action when data changes
   - `CHECK` — constraint that validates data on insert/update
4. Generate SQL with inline comments explaining each line
5. Present the SQL in a code block the user can copy
6. **INSTRUCT** user step by step:
   - Open Supabase Dashboard → SQL Editor
   - Paste the SQL
   - Click "Run"
   - Verify result in Table Editor
7. After user confirms execution, verify from codebase side
8. Update memory files if schema changed significantly

NEVER execute DDL/DML directly — the user ALWAYS runs SQL themselves.
