const { Pool } = require("pg");

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://esmad:esmadpass@localhost:5432/esmad";

const pool = new Pool({ connectionString: DATABASE_URL });

async function initDb() {
  // NÃO cria nem altera a tabela (porque tu disseste que não queres mexer nela)
  // Só faz um sanity check para falhar cedo se a tabela não existir.
  await pool.query(`SELECT 1 FROM notifications LIMIT 1`);
  console.log("notifications DB ready (existing schema)");
}

async function insertNotification({ userId, type, title, message, data }) {
  // A tua tabela: payload (jsonb), is_read (bool), created_at
  const res = await pool.query(
    `
    INSERT INTO notifications (user_id, type, payload, is_read)
    VALUES ($1, $2, $3, false)
    RETURNING id, user_id, type, payload, is_read, created_at
    `,
    [String(userId), String(type), data ?? null],
  );
  return res.rows[0];
}

async function listNotifications({ userId, unread, limit, offset }) {
  const where = unread ? "user_id=$1 AND is_read = false" : "user_id=$1";

  const res = await pool.query(
    `
    SELECT id, user_id, type, payload, is_read, created_at
    FROM notifications
    WHERE ${where}
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [String(userId), Number(limit), Number(offset)],
  );

  // Para manter compatibilidade com o resto do serviço (se ele espera title/message/data/read_at)
  return res.rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    type: r.type,
    // tenta obter title/message de dentro do payload; fallback null
    title: r.payload?.title ?? null,
    message: r.payload?.message ?? null,
    data: r.payload ?? null,
    // não existe read_at no teu schema
    read_at: r.is_read ? r.created_at : null,
    created_at: r.created_at,
    is_read: r.is_read,
    payload: r.payload,
  }));
}

async function markRead({ userId, id }) {
  const res = await pool.query(
    `
    UPDATE notifications
    SET is_read = true
    WHERE id=$1 AND user_id=$2 AND is_read = false
    RETURNING id, user_id, type, payload, is_read, created_at
    `,
    [id, String(userId)],
  );

  const r = res.rows[0];
  if (!r) return null;

  return {
    id: r.id,
    user_id: r.user_id,
    type: r.type,
    title: r.payload?.title ?? null,
    message: r.payload?.message ?? null,
    data: r.payload ?? null,
    read_at: r.created_at,
    created_at: r.created_at,
    is_read: r.is_read,
    payload: r.payload,
  };
}

module.exports = {
  initDb,
  insertNotification,
  listNotifications,
  markRead,
};
