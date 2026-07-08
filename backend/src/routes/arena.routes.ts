import { Router } from "express";
import {
  createArena,
  listArenas,
  listMyArenas,
  getArena,
  updateArena,
  createCourt,
} from "../controllers/arena.controller";
import { authGuard, requireClubOwner } from "../middleware/auth.middleware";

const router = Router();

// Rotas publicas - qualquer jogador pode buscar e ver arenas
router.get("/", listArenas);

// Rota protegida especifica - precisa vir ANTES de "/:id" para nao ser
// confundida com um ID de arena
router.get("/mine", authGuard, requireClubOwner, listMyArenas);

router.get("/:id", getArena);

// Rotas protegidas - so donos de clube autenticados
router.post("/", authGuard, requireClubOwner, createArena);
router.put("/:id", authGuard, requireClubOwner, updateArena);
router.post("/:id/courts", authGuard, requireClubOwner, createCourt);

export default router;
