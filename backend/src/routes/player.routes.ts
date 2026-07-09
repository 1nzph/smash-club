import { Router } from "express";
import { submitLevelQuiz, submitMatchResult, getLevelHistory } from "../controllers/level.controller";
import { authGuard } from "../middleware/auth.middleware";

const router = Router();

router.post("/level-quiz", authGuard, submitLevelQuiz);
router.post("/match-result", authGuard, submitMatchResult);
router.get("/:userId/level-history", getLevelHistory); // público - qualquer um pode ver o historico de um jogador

export default router;
