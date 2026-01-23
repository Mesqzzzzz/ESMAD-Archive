const { Pool } = require("pg");

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://esmad:esmadpass@localhost:5432/esmad";

const pool = new Pool({ connectionString: DATABASE_URL });

async function initDb() {
  // Tabela simples para notificações
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      data JSONB,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user_created
      ON notifications (user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
      ON notifications (user_id)
      WHERE read_at IS NULL;
  `);

  console.log("notifications DB ready");
}

async function insertNotification({ userId, type, title, message, data }) {
  const res = await pool.query(
    `
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
    [
      String(userId),
      type,
      title,
      message || null,
      data ? JSON.stringify(data) : null,
    ],
  );
  return res.rows[0];
}

async function listNotifications({ userId, unread, limit, offset }) {
  const where = unread ? "user_id=$1 AND read_at IS NULL" : "user_id=$1";
  const res = await pool.query(
    `
    SELECT id, user_id, type, title, message, data, read_at, created_at
    FROM notifications
    WHERE ${where}
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `,
    [String(userId), limit, offset],
  );
  return res.rows;
}

async function markRead({ userId, id }) {
  const res = await pool.query(
    `
    UPDATE notifications
    SET read_at = NOW()
    WHERE id=$1 AND user_id=$2 AND read_at IS NULL
    RETURNING id, user_id, type, title, message, data, read_at, created_at
  `,
    [id, String(userId)],
  );
  return res.rows[0] || null;
}

module.exports = {
  initDb,
  insertNotification,
  listNotifications,
  markRead,
};
