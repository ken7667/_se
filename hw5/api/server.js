const express = require("express");
const { Pool } = require("pg");
const os = require("os");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const pool = new Pool({
  host: process.env.DB_HOST || "db",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD || "apppass",
  database: process.env.DB_NAME || "appdb",
});

const START_TIME = Date.now();

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      content    TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function waitForDb(retries = 20) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query("SELECT 1");
      await ensureSchema();
      console.log(`[api] connected to database on attempt ${i}`);
      return;
    } catch (err) {
      console.log(`[api] waiting for database (${i}/${retries}): ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("could not connect to database");
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/info", async (req, res) => {
  try {
    const db = await pool.query("SELECT version() AS version");
    const count = await pool.query("SELECT count(*)::int AS n FROM messages");
    res.json({
      api: {
        hostname: os.hostname(),
        node: process.version,
        platform: `${os.type()} ${os.release()}`,
        uptimeSeconds: Math.round((Date.now() - START_TIME) / 1000),
      },
      database: {
        version: db.rows[0].version.split(" ").slice(0, 2).join(" "),
        messages: count.rows[0].n,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/messages", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, content, created_at FROM messages ORDER BY id DESC LIMIT 50"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/messages", async (req, res) => {
  const { name, content } = req.body || {};
  if (!name || !content) {
    return res.status(400).json({ error: "name and content are required" });
  }
  try {
    const result = await pool.query(
      "INSERT INTO messages (name, content) VALUES ($1, $2) RETURNING *",
      [String(name).slice(0, 60), String(content).slice(0, 1000)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

waitForDb()
  .then(() => {
    app.listen(PORT, () => console.log(`[api] listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error("[api] fatal:", err.message);
    process.exit(1);
  });
