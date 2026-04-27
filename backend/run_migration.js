// Usage: node run_migration.js migrations/003_poc_transparency.sql
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const file = process.argv[2];
if (!file) {
    console.error('Usage: node run_migration.js <path-to-sql>');
    process.exit(1);
}
const sql = fs.readFileSync(path.resolve(file), 'utf8');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
    try {
        await pool.query(sql);
        console.log(`✓ Applied: ${file}`);
    } catch (e) {
        console.error(`✗ Failed: ${e.message}`);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
