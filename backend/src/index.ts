import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import arenaRoutes from "./routes/arena.routes";

const app = express();

app.use(cors());
app.use(express.json());

// Rota simples para checar se a API esta no ar
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "smash-club-api" });
});

app.use("/auth", authRoutes);
app.use("/arenas", arenaRoutes);

// Tratamento de rota nao encontrada
app.use((req, res) => {
  res.status(404).json({ error: `Rota nao encontrada: ${req.method} ${req.path}` });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3333;

app.listen(PORT, () => {
  console.log(`\nSmash Club API rodando em http://localhost:${PORT}`);
  console.log(`Teste rapido: http://localhost:${PORT}/health\n`);
});
