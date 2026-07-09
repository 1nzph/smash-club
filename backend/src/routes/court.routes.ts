import { Router } from "express";
import { getCourtAvailability } from "../controllers/booking.controller";

const router = Router();

// Publica - qualquer jogador pode ver os horarios livres antes de logar
router.get("/:id/availability", getCourtAvailability);

export default router;
