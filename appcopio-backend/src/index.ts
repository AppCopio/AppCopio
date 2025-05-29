// src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import pool from './config/db'; // Importamos el pool para forzar la conexión al inicio (opcional pero bueno para testear)
import centerRoutes from './routes/centerRoutes'; // <-- 1. IMPORTA TU NUEVO ROUTER

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json()); // Para parsear cuerpos de solicitud JSON

// Ruta de prueba simple
app.get('/api', (req: Request, res: Response) => {
  res.json({ message: '¡El Backend de AppCopio está funcionando! 災害' });
});

// Rutas de la API para Centros
app.use('/api/centers', centerRoutes); // <-- 2. USA EL ROUTER BAJO EL PREFIJO /api/centers

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
  // Pequeña prueba de conexión a la BD al iniciar (opcional)
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Error al conectar con la BD al iniciar:', err);
    } else {
      // La conexión ya se loguea desde db.ts, así que no es necesario loguear de nuevo aquí
      // console.log('Conexión a la BD exitosa, hora actual de la BD:', res.rows[0].now);
    }
  });
});

// He añadido la importación de pool y una pequeña prueba de conexión dentro de app.listen
// Esto es opcional pero ayuda a verificar que la conexión a la BD se establece correctamente cuando el servidor arranca. 
// El mensaje de conexión exitosa ya lo teníamos en db.ts, así que esto es más una confirmación.