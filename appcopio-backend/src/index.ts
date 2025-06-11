// src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import pool from './config/db'; 
import centerRoutes from './routes/centerRoutes'; 

import productRoutes from './routes/productRoutes';
dotenv.config();

const app = express(); // Esta es tu instancia de 'Application'
const port = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json()); 

// Ruta de prueba simple
app.get('/api', (req: Request, res: Response) => {
  res.json({ message: '¡El Backend de AppCopio está funcionando! 災害' });
});

// Rutas de la API para Centros
// app.use() espera middleware o un router. 'centerRoutes' DEBE ser un router.
app.use('/api/centers', centerRoutes); 
app.use('/api/products', productRoutes);

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
  // Prueba de conexión a la BD
  pool.query('SELECT NOW()', (err, resQuery) => {
    if (err) {
      console.error('Error al conectar con la BD al iniciar:', err);
    } else {
      // console.log('Conexión a la BD confirmada desde index.ts:', resQuery.rows[0].now);
    }
  });
});