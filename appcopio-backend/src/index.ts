// src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';


import pool from './config/db'; 

import centerRoutes from './routes/centerRoutes'; 
import productRoutes from './routes/productRoutes';

import inventoryRoutes from './routes/inventoryRoutes';
import userRouter from './routes/userRoutes';
import incidentRoutes from './routes/incidentRoutes';

import categoryRoutes from './routes/categoryRoutes';
import assignmentRoutes from './routes/assignmentRoutes';

import personsRoutes from './routes/personsRoutes';
import familyRoutes from './routes/familyRoutes';
import familyMembersRoutes from './routes/familyMembersRoutes';
import fibeRoutes from "./routes/fibeRoutes";

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
app.use('/api/incidents', incidentRoutes);
app.use('/api/users', userRouter);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/persons', personsRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/family-members', familyMembersRoutes);
app.use("/api/fibe", fibeRoutes);


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