import { Request, Response } from "express";
import { prisma } from "../prisma";
import {
  createArenaSchema,
  updateArenaSchema,
  createCourtSchema,
} from "../utils/validation";
import { listToString, stringToList } from "../utils/list";

// Converte uma Arena do banco (com amenities/photos em string) para o
// formato de resposta da API (com amenities/photos em array)
function toPublicArena(arena: any) {
  return {
    ...arena,
    amenities: stringToList(arena.amenities),
    photos: stringToList(arena.photos),
  };
}

// ------------------------------------------------------------
// POST /arenas - cria uma arena para o dono de clube logado
// ------------------------------------------------------------
export async function createArena(req: Request, res: Response) {
  const parsed = createArenaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Dados inválidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  // Busca o ClubProfile do usuário logado (req.userId vem do authGuard)
  const clubProfile = await prisma.clubProfile.findUnique({
    where: { userId: req.userId },
  });

  if (!clubProfile) {
    return res.status(404).json({
      error: "Perfil de clube não encontrado para este usuário",
    });
  }

  const { amenities, photos, ...rest } = parsed.data;

  const arena = await prisma.arena.create({
    data: {
      ...rest,
      ownerId: clubProfile.id,
      amenities: listToString(amenities),
      photos: listToString(photos),
    },
    include: { courts: true },
  });

  return res.status(201).json({ arena: toPublicArena(arena) });
}

// ------------------------------------------------------------
// GET /arenas - busca publica, com filtros opcionais
// query params: ?city=São Paulo&state=SP&q=vidro
// ------------------------------------------------------------
export async function listArenas(req: Request, res: Response) {
  const { city, state, q } = req.query;

  const where: any = {};
  if (city) where.city = { contains: String(city) };
  if (state) where.state = { equals: String(state) };
  if (q) where.name = { contains: String(q) };

  const arenas = await prisma.arena.findMany({
    where,
    include: { courts: true },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ arenas: arenas.map(toPublicArena) });
}

// ------------------------------------------------------------
// GET /arenas/mine - lista as arenas do dono de clube logado
// ------------------------------------------------------------
export async function listMyArenas(req: Request, res: Response) {
  const clubProfile = await prisma.clubProfile.findUnique({
    where: { userId: req.userId },
  });

  if (!clubProfile) {
    return res.status(404).json({ error: "Perfil de clube não encontrado" });
  }

  const arenas = await prisma.arena.findMany({
    where: { ownerId: clubProfile.id },
    include: { courts: true },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ arenas: arenas.map(toPublicArena) });
}

// ------------------------------------------------------------
// GET /arenas/:id - detalhe publico de uma arena
// ------------------------------------------------------------
export async function getArena(req: Request, res: Response) {
  const arena = await prisma.arena.findUnique({
    where: { id: req.params.id },
    include: { courts: true },
  });

  if (!arena) {
    return res.status(404).json({ error: "Arena não encontrada" });
  }

  return res.json({ arena: toPublicArena(arena) });
}

// ------------------------------------------------------------
// PUT /arenas/:id - atualiza uma arena (so o dono pode)
// ------------------------------------------------------------
export async function updateArena(req: Request, res: Response) {
  const parsed = updateArenaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Dados inválidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const ownershipError = await checkArenaOwnership(req);
  if (ownershipError) return res.status(ownershipError.status).json({ error: ownershipError.message });

  const { amenities, photos, ...rest } = parsed.data;
  const data: any = { ...rest };
  if (amenities) data.amenities = listToString(amenities);
  if (photos) data.photos = listToString(photos);

  const arena = await prisma.arena.update({
    where: { id: req.params.id },
    data,
    include: { courts: true },
  });

  return res.json({ arena: toPublicArena(arena) });
}

// ------------------------------------------------------------
// POST /arenas/:id/courts - adiciona uma quadra a uma arena (so o dono pode)
// ------------------------------------------------------------
export async function createCourt(req: Request, res: Response) {
  const parsed = createCourtSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Dados inválidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const ownershipError = await checkArenaOwnership(req);
  if (ownershipError) return res.status(ownershipError.status).json({ error: ownershipError.message });

  const court = await prisma.court.create({
    data: {
      ...parsed.data,
      arenaId: req.params.id,
    },
  });

  return res.status(201).json({ court });
}

// ------------------------------------------------------------
// Helper: confere se o usuario logado e o dono da arena do :id
// Retorna null se estiver tudo certo, ou um objeto de erro para devolver
// ------------------------------------------------------------
async function checkArenaOwnership(
  req: Request
): Promise<{ status: number; message: string } | null> {
  const arena = await prisma.arena.findUnique({ where: { id: req.params.id } });
  if (!arena) {
    return { status: 404, message: "Arena não encontrada" };
  }

  const clubProfile = await prisma.clubProfile.findUnique({
    where: { userId: req.userId },
  });

  if (!clubProfile || arena.ownerId !== clubProfile.id) {
    return { status: 403, message: "Você não tem permissão para editar esta arena" };
  }

  return null;
}
