// src/config/db.ts
import { Pool } from 'pg'; // Importa el constructor Pool de la librería pg
import dotenv from 'dotenv'; // Importa dotenv para cargar variables de entorno

dotenv.config(); // Esto lee tu archivo .env y carga sus variables en process.env

// Creamos un 'pool' de conexiones a la base de datos
// El pool maneja múltiples conexiones eficientemente
const pool = new Pool({
  host: process.env.DB_HOST, // Lee el host desde .env
  port: parseInt(process.env.DB_PORT || '5432'), // Lee el puerto (y lo convierte a número)
  user: process.env.DB_USER, // Lee el usuario desde .env
  password: process.env.DB_PASSWORD, // Lee la contraseña desde .env
  database: process.env.DB_NAME, // Lee el nombre de la base de datos desde .env
});

// Evento que se dispara cuando una conexión del pool se establece con éxito
pool.on('connect', () => {
  console.log('¡Backend conectado exitosamente a la base de datos PostgreSQL! 🎉');
});

// Evento que se dispara si hay un error en el pool (ej. credenciales incorrectas, BD no disponible)
pool.on('error', (err) => {
  console.error('Error inesperado en el cliente del pool de PostgreSQL', err);
  // En un caso real, podrías querer manejar esto de forma más robusta
  // process.exit(-1); // Comentado para no detener el server en cada error durante dev
});

// Exportamos el pool para que otras partes de nuestra aplicación puedan usarlo para hacer consultas
export default pool;