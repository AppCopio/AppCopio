#!/usr/bin/env node

/**
 * Script para verificar conexión a PostgreSQL en producción
 * 
 * Uso: 
 *   DATABASE_URL="postgresql://..." node verify-db-connection.js
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no está definida');
  console.log('\nUso:');
  console.log('  DATABASE_URL="postgresql://..." node verify-db-connection.js');
  process.exit(1);
}

console.log('\n🔍 Verificando conexión a base de datos...\n');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function verifyConnection() {
  try {
    // Test de conexión básica
    console.log('1️⃣  Probando conexión...');
    const client = await pool.connect();
    console.log('   ✅ Conexión exitosa\n');

    // Verificar versión de PostgreSQL
    console.log('2️⃣  Verificando versión de PostgreSQL...');
    const versionResult = await client.query('SELECT version()');
    console.log('   ✅', versionResult.rows[0].version.split(',')[0], '\n');

    // Listar tablas
    console.log('3️⃣  Listando tablas existentes...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('   ⚠️  No se encontraron tablas. ¿Ya ejecutaste los scripts SQL?\n');
    } else {
      console.log(`   ✅ ${tablesResult.rows.length} tablas encontradas:`);
      tablesResult.rows.forEach(row => {
        console.log(`      - ${row.table_name}`);
      });
      console.log();
    }

    // Verificar tabla Roles (tabla crítica)
    console.log('4️⃣  Verificando tabla Roles...');
    const rolesResult = await client.query('SELECT COUNT(*) FROM Roles');
    const rolesCount = parseInt(rolesResult.rows[0].count);
    
    if (rolesCount > 0) {
      console.log(`   ✅ ${rolesCount} roles encontrados\n`);
    } else {
      console.log('   ⚠️  No hay roles. Ejecuta los scripts de datos iniciales.\n');
    }

    // Verificar tabla Users
    console.log('5️⃣  Verificando tabla Users...');
    const usersResult = await client.query('SELECT COUNT(*) FROM Users');
    const usersCount = parseInt(usersResult.rows[0].count);
    console.log(`   ✅ ${usersCount} usuarios registrados\n`);

    client.release();

    console.log('=' .repeat(60));
    console.log('✅ VERIFICACIÓN COMPLETADA EXITOSAMENTE');
    console.log('=' .repeat(60));
    console.log('\nLa base de datos está lista para usar en producción.\n');

  } catch (error) {
    console.error('\n❌ Error en la verificación:');
    console.error(error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Sugerencias:');
      console.log('  - Verifica que el hostname sea correcto');
      console.log('  - Verifica tu conexión a internet');
    } else if (error.code === '28P01') {
      console.log('\n💡 Sugerencias:');
      console.log('  - Verifica el username y password');
      console.log('  - Asegúrate de copiar la DATABASE_URL completa');
    } else if (error.message.includes('does not exist')) {
      console.log('\n💡 Sugerencias:');
      console.log('  - Las tablas no existen aún');
      console.log('  - Ejecuta los scripts SQL de inicialización');
      console.log('  - psql <DATABASE_URL> < db_init/001_tablas.sql');
    }
    
    console.log();
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyConnection();
