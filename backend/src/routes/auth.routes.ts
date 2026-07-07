import { Router } from "express";
import { register, login, me } from "../controllers/auth.controller";
import { authGuard } from "../middleware/auth.middleware";

const router = Router();

// Rotas publicas
router.post("/register", register);
router.post("/login", login);

// Rota protegida - precisa enviar o token no header Authorization
router.get("/me", authGuard, me);

export default router;
