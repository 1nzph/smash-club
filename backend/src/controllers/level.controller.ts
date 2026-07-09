import { Request, Response } from "express";
import { prisma } from "../prisma";
import { levelQuizSchema, matchResultSchema } from "../utils/validation";
import {
  calculateInitialLevel,
  calculatePostMatchAdjustment,
  INITIAL_RELIABILITY,
} from "../utils/leveling";

// ------------------------------------------------------------
// POST /players/level-quiz — define o nivel inicial do jogador
// ------------------------------------------------------------
export async function submitLevelQuiz(req: Request, res: Response) {
  const parsed = levelQuizSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Dados inválidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const profile = await prisma.playerProfile.findUnique({ where: { userId: req.userId } });
  if (!profile) {
    return res.status(404).json({ error: "Perfil de jogador não encontrado para este usuário" });
  }

  const { practiceTime, technicalLevel, frequency } = parsed.data;
  const result = calculateInitialLevel(practiceTime, technicalLevel, frequency);

  const updated = await prisma.playerProfile.update({
    where: { id: profile.id },
    data: {
      currentLevel: result.novo_nivel,
      reliability: INITIAL_RELIABILITY,
    },
  });

  await prisma.levelHistoryEntry.create({
    data: {
      playerProfileId: profile.id,
      levelBefore: profile.currentLevel,
      levelAfter: updated.currentLevel,
      reliabilityBefore: profile.reliability,
      reliabilityAfter: updated.reliability,
      delta: updated.currentLevel - profile.currentLevel,
      reason: "questionario",
      summary: result.resumo_ajuste,
    },
  });

  return res.status(200).json({
    ...result,
    nivel_anterior: profile.currentLevel,
    confiabilidade_anterior: profile.reliability,
  });
}

// ------------------------------------------------------------
// POST /players/match-result — registra o resultado de uma partida
// e recalcula o nivel/confiabilidade dos 4 jogadores envolvidos
// ------------------------------------------------------------
export async function submitMatchResult(req: Request, res: Response) {
  const parsed = matchResultSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Dados inválidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { teamA, teamB, setsA, setsB } = parsed.data;
  const allIds = [...teamA, ...teamB];

  if (new Set(allIds).size !== 4) {
    return res.status(400).json({ error: "Os 4 jogadores devem ser diferentes entre si" });
  }
  if (!allIds.includes(req.userId as string)) {
    return res.status(403).json({ error: "Você precisa fazer parte da partida para registrar o resultado" });
  }

  const profiles = await prisma.playerProfile.findMany({
    where: { userId: { in: allIds } },
    include: { user: { select: { id: true, name: true } } },
  });

  if (profiles.length !== 4) {
    return res.status(404).json({ error: "Um ou mais jogadores não têm perfil de jogador cadastrado" });
  }

  const byUserId = new Map(profiles.map((p) => [p.userId, p]));
  const winnerIsA = setsA > setsB;

  // Monta a lista de calculos para os 4 jogadores
  const jobs = [
    { userId: teamA[0], partnerId: teamA[1], oppIds: teamB, won: winnerIsA },
    { userId: teamA[1], partnerId: teamA[0], oppIds: teamB, won: winnerIsA },
    { userId: teamB[0], partnerId: teamB[1], oppIds: teamA, won: !winnerIsA },
    { userId: teamB[1], partnerId: teamB[0], oppIds: teamA, won: !winnerIsA },
  ];

  const results = [];

  for (const job of jobs) {
    const profile = byUserId.get(job.userId)!;
    const partnerProfile = byUserId.get(job.partnerId)!;
    const opp1 = byUserId.get(job.oppIds[0])!;
    const opp2 = byUserId.get(job.oppIds[1])!;

    const setsWon = job.won ? Math.max(setsA, setsB) : Math.min(setsA, setsB);
    const setsLost = job.won ? Math.min(setsA, setsB) : Math.max(setsA, setsB);

    const calc = calculatePostMatchAdjustment({
      playerLevel: profile.currentLevel,
      playerReliability: profile.reliability,
      partnerLevel: partnerProfile.currentLevel,
      opponent1Level: opp1.currentLevel,
      opponent2Level: opp2.currentLevel,
      won: job.won,
      setsWon,
      setsLost,
    });

    await prisma.playerProfile.update({
      where: { id: profile.id },
      data: { currentLevel: calc.novo_nivel, reliability: calc.nova_confiabilidade },
    });

    await prisma.levelHistoryEntry.create({
      data: {
        playerProfileId: profile.id,
        levelBefore: calc.nivel_anterior,
        levelAfter: calc.novo_nivel,
        reliabilityBefore: calc.confiabilidade_anterior,
        reliabilityAfter: calc.nova_confiabilidade,
        delta: calc.variação,
        reason: "partida",
        summary: calc.resumo_ajuste,
      },
    });

    results.push({
      userId: job.userId,
      name: profile.user.name,
      ...calc,
    });
  }

  return res.status(200).json({ results });
}

// ------------------------------------------------------------
// GET /players/:userId/level-history — historico de ajustes
// ------------------------------------------------------------
export async function getLevelHistory(req: Request, res: Response) {
  const profile = await prisma.playerProfile.findUnique({ where: { userId: req.params.userId } });
  if (!profile) return res.status(404).json({ error: "Perfil não encontrado" });

  const history = await prisma.levelHistoryEntry.findMany({
    where: { playerProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return res.json({ history });
}
