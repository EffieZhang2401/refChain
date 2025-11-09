import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? '35.236.223.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? 'Refchain@123',
  database: process.env.DB_NAME ?? 'refchain',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE ?? 10),
  timezone: 'Z'
});

export default pool;
