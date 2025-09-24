// src/index.ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import pool from "./config/db";
import authRoutes from "./routes/authRoutes";
import centerRoutes from "./routes/centerRoutes";
//import productRoutes from "./routes/productRoutes";
import inventoryRoutes from "./routes/inventoryRoutes";
import userRouter from "./routes/userRoutes";
import updateRoutes from "./routes/updateRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import assignmentRoutes from "./routes/assignmentRoutes";
import personsRoutes from "./routes/personsRoutes";
import familyRoutes from "./routes/familyRoutes";
import familyMembersRoutes from "./routes/familyMembersRoutes";
import fibeRoutes from "./routes/fibeRoutes";
import roleRoutes from "./routes/roleRoutes";
import {requireAuth} from "./auth/middleware";

import databaseRoutes from "./routes/databaseRoutes";
import fieldRoutes from "./routes/fieldRoutes";
import recordRoutes from "./routes/recordRoutes";
import templateRoutes from "./routes/templateRoutes";
import auditLogRoutes from "./routes/auditLogRoutes";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());

/** Orígenes permitidos */
const allowedOrigins = [
  "http://localhost:5173",
  "https://appcopio.vercel.app",
];

const corsOptions: cors.CorsOptions = {
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

/** CORS antes de las rutas */


app.use((req, res, next) => {
  res.header("Vary", "Origin");
  next();
});
app.use(cors(corsOptions));

/** Rate limit solo en auth */
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), authRoutes);

/** Rutas */
app.get("/api", (req: Request, res: Response) => {
  res.json({ message: "¡El Backend de AppCopio está funcionando! 災害" });
});

app.use("/api/centers", requireAuth, centerRoutes)
//app.use("/api/products", productRoutes);
app.use("/api/updates", updateRoutes);
app.use("/api/users", userRouter);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/persons", personsRoutes);
app.use("/api/family", familyRoutes);
app.use("/api/family-members", familyMembersRoutes);
app.use("/api/fibe", fibeRoutes);
app.use("/api/roles", roleRoutes);

app.use("/api/database", databaseRoutes);
app.use("/api/database-fields", fieldRoutes);
app.use("/api/database-records", recordRoutes);
app.use("/api/database-templates", templateRoutes);
app.use("/api/database-history", auditLogRoutes);

/** Middleware de errores (último siempre) */
app.use((err: any, req: Request, res: Response, next: NextFunction): void => {
  if (err?.message === "Not allowed by CORS") {
    res.status(403).json({ error: "Origen no permitido por CORS" });
    return;
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
  pool.query("SELECT NOW()", (err, resQuery) => {
    if (err) {
      console.error("Error al conectar con la BD al iniciar:", err);
    }
  });
});
