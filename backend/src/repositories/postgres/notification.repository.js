import { getPool } from '../../db/pool.js';

function mapNotification(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    module: row.module,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export const postgresNotificationRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM notifications
      ORDER BY created_at DESC
    `);

    return rows.map(mapNotification);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM notifications WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapNotification(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(notification) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO notifications (
        id,
        user_id,
        title,
        body,
        module,
        is_read
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        notification.id,
        notification.userId,
        notification.title,
        notification.body || null,
        notification.module || null,
        notification.isRead || false,
      ]
    );

    return mapNotification(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      userId: 'user_id',
      title: 'title',
      body: 'body',
      module: 'module',
      isRead: 'is_read',
    };

    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(patch)) {
      const column = allowedFields[key];

      if (!column) continue;

      updates.push(`${column} = $${values.length + 1}`);
      values.push(value);
    }

    if (!updates.length) {
      return this.findById(id);
    }

    values.push(id);

    const pool = getPool();

    const { rows } = await pool.query(
      `UPDATE notifications
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapNotification(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM '[0-9]+$') AS INTEGER)),
        0
      ) AS max_id
      FROM notifications
      WHERE id LIKE 'NOTIF-%'
    `);

    return `NOTIF-${Number(rows[0].max_id) + 1}`;
  },
};