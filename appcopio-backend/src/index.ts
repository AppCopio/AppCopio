// src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes';
import { requireAuth } from './auth/middleware';


import pool from './config/db'; 

import centerRoutes from './routes/centerRoutes'; 
import productRoutes from './routes/productRoutes';

import inventoryRoutes from './routes/inventoryRoutes';
import userRouter from './routes/userRoutes';
import updateRoutes from './routes/updateRoutes';

import categoryRoutes from './routes/categoryRoutes';
import assignmentRoutes from './routes/assignmentRoutes';

import personsRoutes from './routes/personsRoutes';
import familyRoutes from './routes/familyRoutes';
import familyMembersRoutes from './routes/familyMembersRoutes';
import fibeRoutes from "./routes/fibeRoutes";

import roleRoutes from './routes/roleRoutes';

dotenv.config();

const app = express(); // Esta es tu instancia de 'Application'
const port = process.env.PORT || 4000;

// Middlewares
app.use(express.json()); 
const allowedOrigins = [
  "http://localhost:5173",          
  "https://appcopio.vercel.app/",    
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(cookieParser());
app.set('trust proxy', 1);


app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), authRoutes);

// Ruta de prueba simple
app.get('/api', (req: Request, res: Response) => {
  res.json({ message: '¡El Backend de AppCopio está funcionando! 災害' });
});

// Rutas de la API para Centros
// app.use() espera middleware o un router. 'centerRoutes' DEBE ser un router.
app.use('/api/centers', centerRoutes); 
//app.get('/api/centers/secure', requireAuth, (req, res) => res.json({ ok: true }));
app.use('/api/products', productRoutes);
app.use('/api/updates', updateRoutes);
app.use('/api/users', userRouter);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/assignments', assignmentRoutes);

app.use('/api/persons', personsRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/family-members', familyMembersRoutes);
app.use("/api/fibe", fibeRoutes);

app.use('/api/roles', roleRoutes);

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