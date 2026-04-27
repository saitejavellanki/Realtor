const db = require('./src/db');

db.query(`
  CREATE TABLE IF NOT EXISTS mobile_users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  )
`).then(() => {
    console.log('mobile_users table created successfully');
    process.exit(0);
}).catch(e => {
    console.error('Migration failed:', e.message);
    process.exit(1);
});
