// src/config/db.ts
import { Pool } from 'pg';

// Carga dotenv SOLO en desarrollo (para no pisar env de Render)
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
}

const isProd = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL || ''; // Render

// Render/Postgres gestionado requiere SSL
const sslConfig = { require: true, rejectUnauthorized: false } as const;

// Si existe DATABASE_URL => úsala (Render). Si no, usa las DB_* (local).
export const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: sslConfig,
    })
  : new Pool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'postgres',
      ssl: isProd ? sslConfig : undefined, // en local normalmente sin SSL
    });

// Logs útiles para confirmar que NO está usando localhost en prod
pool.on('connect', () => {
  const safeUrl = connectionString
    ? connectionString.replace(/:\/\/.*@/, '://****@')
    : `${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 5432}`;
  console.log('✅ Conexión PostgreSQL OK →', safeUrl);
});

pool.on('error', (err) => {
  console.error('❌ Error en el pool de PostgreSQL', err);
});

export default pool;
