import { getPool } from '../../db/pool.js';

function mapAsset(row) {
  if (!row) return null;

  return {
    id: row.id,
    assetCode: row.asset_code,
    assetType: row.asset_type,
    serialNumber: row.serial_number,
    condition: row.condition,
    status: row.status,
    createdAt: row.created_at,
  };
}

export const postgresAssetRepo = {
  async all() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT *
      FROM assets
      ORDER BY created_at DESC
    `);

    return rows.map(mapAsset);
  },

  async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM assets WHERE id = $1 LIMIT 1`,
      [id]
    );

    return mapAsset(rows[0]);
  },

  async findOne(predicate) {
    const rows = await this.all();
    return rows.find(predicate) || null;
  },

  async find(predicate) {
    const rows = await this.all();
    return rows.filter(predicate);
  },

  async insert(asset) {
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO assets (
        id,
        asset_code,
        asset_type,
        serial_number,
        condition,
        status
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        asset.id,
        asset.assetCode,
        asset.assetType,
        asset.serialNumber || null,
        asset.condition || 'good',
        asset.status || 'available',
      ]
    );

    return mapAsset(rows[0]);
  },

  async update(id, patch) {
    const allowedFields = {
      assetCode: 'asset_code',
      assetType: 'asset_type',
      serialNumber: 'serial_number',
      condition: 'condition',
      status: 'status',
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
      `UPDATE assets
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    return mapAsset(rows[0]);
  },

  async nextId() {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)),
        0
      ) AS max_id
      FROM assets
      WHERE id LIKE 'AST-%'
    `);

    return `AST-${Number(rows[0].max_id) + 1}`;
  },
};