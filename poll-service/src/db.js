import pkg from "pg";
const { Pool } = pkg;
export const pool = new Pool({
  host: process.env.DB_HOST || "postgres",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASS || "password",
  database: process.env.DB_NAME || "appdb",
  max: 10,
  idleTimeoutMillis: 10000
});
export async function initSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS polls (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS options (
        id SERIAL PRIMARY KEY,
        poll_id INT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
        text TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        poll_id INT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
        option_id INT NOT NULL REFERENCES options(id) ON DELETE CASCADE,
        user_id TEXT NULL,
        voted_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_options_poll ON options(poll_id);
      CREATE INDEX IF NOT EXISTS idx_votes_poll ON votes(poll_id, voted_at DESC);
    `);
  } finally { client.release(); }
}
