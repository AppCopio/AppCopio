// run-database-setup.js
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function setupDatabase() {
  try {
    console.log('🔄 Iniciando configuración de la base de datos...\n');
    
    const client = await pool.connect();
    console.log('✅ Conectado a la base de datos');
    
    // Leer el archivo SQL de inicialización
    const sqlPath = path.join(process.cwd(), '..', 'db_init', '001_init.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📖 Ejecutando script de inicialización...');
    
    // Ejecutar el script SQL
    await client.query(sqlContent);
    
    console.log('✅ Script ejecutado correctamente');
    
    // Verificar que las tablas se crearon correctamente
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Tablas creadas:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Verificar centros
    const centersResult = await client.query('SELECT COUNT(*) as count FROM centers');
    console.log(`\n🏢 Centros insertados: ${centersResult.rows[0].count}`);
    
    // Verificar productos
    const productsResult = await client.query('SELECT COUNT(*) as count FROM products');
    console.log(`📦 Productos insertados: ${productsResult.rows[0].count}`);
    
    // Verificar inventario
    const inventoryResult = await client.query('SELECT COUNT(*) as count FROM centerinventories');
    console.log(`📊 Registros de inventario: ${inventoryResult.rows[0].count}`);
    
    client.release();
    console.log('\n🎉 ¡Base de datos configurada exitosamente!');
    console.log('\n💡 Ahora puedes reiniciar el backend para que funcione correctamente.');
    
  } catch (error) {
    console.error('❌ Error al configurar la base de datos:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 La base de datos PostgreSQL no está corriendo.');
      console.log('   Revisa el archivo DATABASE_SETUP_SOLUTION.md para instrucciones.');
    } else if (error.code === 'ENOENT') {
      console.log('\n💡 No se pudo encontrar el archivo SQL de inicialización.');
      console.log('   Asegúrate de ejecutar este script desde el directorio appcopio-backend.');
    } else {
      console.log('\nError completo:', error);
    }
  } finally {
    await pool.end();
  }
}

setupDatabase();
