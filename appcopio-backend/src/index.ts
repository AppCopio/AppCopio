// src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config(); // Carga las variables de .env

const app = express();
const port = process.env.PORT || 4000; // Usa el puerto 4000 si no hay uno definido

// Middlewares
app.use(cors()); // Habilita CORS
app.use(express.json()); // Permite que Express entienda JSON

// Ruta de prueba
app.get('/api', (req: Request, res: Response) => {
  res.json({ message: '¡El Backend de AppCopio está funcionando! 災害' });
});

// TODO: Aquí irán nuestras rutas de API (/api/centers, /api/login, etc.)

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});