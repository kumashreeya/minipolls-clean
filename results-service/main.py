import os
from datetime import datetime, timedelta
import asyncpg, httpx
from fastapi import FastAPI, HTTPException

app = FastAPI(title="results-service")

DB_HOST = os.getenv("DB_HOST", "postgres")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_USER = os.getenv("DB_USER", "appuser")
DB_PASS = os.getenv("DB_PASS", "password")
DB_NAME = os.getenv("DB_NAME", "appdb")
POLL_BASE = os.getenv("POLL_BASE", "http://poll-service:8080")

_pool = None

@app.on_event("startup")
async def startup():
  global _pool
  _pool = await asyncpg.create_pool(host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASS, database=DB_NAME, min_size=1, max_size=10)

@app.on_event("shutdown")
async def shutdown():
  global _pool
  if _pool: await _pool.close()

@app.get("/healthz")
async def healthz():
  try:
    async with _pool.acquire() as conn:
      await conn.execute("SELECT 1;")
    return {"ok": True}
  except Exception:
    return {"ok": False}

async def fetch_poll(poll_id: int) -> dict:
  async with httpx.AsyncClient(timeout=5.0) as client:
    r = await client.get(f"{POLL_BASE}/api/v1/polls/{poll_id}")
  if r.status_code != 200:
    raise HTTPException(status_code=404, detail="poll not found")
  return r.json()

@app.get("/api/v1/results/{poll_id}/summary")
async def summary(poll_id: int):
  poll = await fetch_poll(poll_id)
  sql = """
    SELECT o.id AS option_id, o.text, COUNT(v.id)::int AS count
    FROM options o
    LEFT JOIN votes v ON v.option_id = o.id
    WHERE o.poll_id = $1
    GROUP BY o.id, o.text
    ORDER BY o.id;
  """
  async with _pool.acquire() as conn:
    rows = await conn.fetch(sql, poll_id)
  total = sum(r["count"] for r in rows)
  totals = [{
    "optionId": r["option_id"],
    "option": r["text"],
    "count": r["count"],
    "pct": round((r["count"]/total*100) if total else 0.0, 2)
  } for r in rows]
  return { "pollId": poll_id, "question": poll["question"], "totals": totals, "totalVotes": total }

@app.get("/api/v1/results/{poll_id}/24h")
async def last_24h(poll_id: int):
  _ = await fetch_poll(poll_id)
  since = datetime.utcnow() - timedelta(hours=24)
  sql = "SELECT COUNT(*)::int AS cnt FROM votes WHERE poll_id=$1 AND voted_at >= $2;"
  async with _pool.acquire() as conn:
    row = await conn.fetchrow(sql, poll_id, since)
  return { "pollId": poll_id, "sinceUTC": since.isoformat() + "Z", "count": row["cnt"] }
