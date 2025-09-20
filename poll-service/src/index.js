import express from "express";
import { pool, initSchema } from "./db.js";
const app = express();
app.use(express.json());

// health
app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.get("/readyz", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.json({ ready: true }); }
  catch { res.status(500).json({ ready: false }); }
});

// create poll
app.post("/api/v1/polls", async (req, res) => {
  const { question, options } = req.body || {};
  if (typeof question !== "string" || !question.trim())
    return res.status(400).json({ error: "question is required" });
  if (!Array.isArray(options) || options.length < 2 || options.some(o => !String(o).trim()))
    return res.status(400).json({ error: "at least 2 non-empty options required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "INSERT INTO polls(question) VALUES($1) RETURNING id", [question.trim()]
    );
    const pollId = rows[0].id;
    const params = options.map((_, i) => `($1, $${i + 2})`).join(",");
    await client.query(
      `INSERT INTO options(poll_id, text) VALUES ${params}`,
      [pollId, ...options.map(o => String(o).trim())]
    );
    await client.query("COMMIT");
    res.status(201).json({ pollId });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ error: "failed to create poll" });
  } finally { client.release(); }
});

// get poll
app.get("/api/v1/polls/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "invalid id" });
  const client = await pool.connect();
  try {
    const p = await client.query("SELECT id, question, created_at FROM polls WHERE id=$1", [id]);
    if (p.rowCount === 0) return res.status(404).json({ error: "not found" });
    const o = await client.query("SELECT id, text FROM options WHERE poll_id=$1 ORDER BY id", [id]);
    res.json({ id: p.rows[0].id, question: p.rows[0].question, createdAt: p.rows[0].created_at, options: o.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed to fetch poll" });
  } finally { client.release(); }
});

// vote
app.post("/api/v1/polls/:id/vote", async (req, res) => {
  const pollId = Number(req.params.id);
  const { optionId, userId } = req.body || {};
  if (!Number.isInteger(pollId) || pollId <= 0) return res.status(400).json({ error: "invalid poll id" });
  if (!Number.isInteger(optionId) || optionId <= 0) return res.status(400).json({ error: "optionId required" });
  const client = await pool.connect();
  try {
    const chk = await client.query("SELECT 1 FROM options WHERE id=$1 AND poll_id=$2", [optionId, pollId]);
    if (!chk.rowCount) return res.status(400).json({ error: "option does not belong to poll" });
    await client.query("INSERT INTO votes(poll_id, option_id, user_id) VALUES($1,$2,$3)", [pollId, optionId, userId ?? null]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed to record vote" });
  } finally { client.release(); }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
(async () => {
  try { await initSchema(); app.listen(PORT, () => console.log(`poll-service listening on :${PORT}`)); }
  catch (e) { console.error("Startup error:", e); process.exit(1); }
})();
