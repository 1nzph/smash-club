import { Request, Response } from "express";
import { prisma } from "../prisma";
import { createBookingSchema } from "../utils/validation";
import { listToString, stringToList } from "../utils/list";

function toPublicBooking(booking: any) {
  return {
    ...booking,
    invitedEmails: stringToList(booking.invitedEmails),
  };
}

// ------------------------------------------------------------
// POST /bookings
// ------------------------------------------------------------
export async function createBooking(req: Request, res: Response) {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Dados inválidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { courtId, startsAt, durationMinutes, isOpenMatch, minLevel, maxLevel, maxPlayers, invitedEmails } = parsed.data;

  const court = await prisma.court.findUnique({ where: { id: courtId } });
  if (!court) return res.status(404).json({ error: "Quadra não encontrada" });

  const startDate = new Date(startsAt);
  if (isNaN(startDate.getTime())) return res.status(400).json({ error: "startsAt inválido" });
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

  const overlapping = await prisma.booking.findFirst({
    where: { courtId, status: "confirmed", startsAt: { lt: endDate }, endsAt: { gt: startDate } },
  });
  if (overlapping) {
    return res.status(409).json({ error: "Esse horário já está reservado nesta quadra. Escolha outro horário." });
  }

  const totalPrice = court.basePriceHour * (durationMinutes / 60);

  const booking = await prisma.booking.create({
    data: {
      courtId,
      playerId: req.userId as string,
      startsAt: startDate,
      endsAt: endDate,
      totalPrice,
      isOpenMatch,
      maxPlayers: isOpenMatch ? maxPlayers : 1,
      minLevel: isOpenMatch ? minLevel : null,
      maxLevel: isOpenMatch ? maxLevel : null,
      invitedEmails: listToString(invitedEmails),
    },
    include: { court: { include: { arena: true } }, participants: { include: { player: { select: { id: true, name: true } } } } },
  });

  return res.status(201).json({ booking: toPublicBooking(booking) });
}

// ------------------------------------------------------------
// GET /bookings/mine
// ------------------------------------------------------------
export async function listMyBookings(req: Request, res: Response) {
  const bookings = await prisma.booking.findMany({
    where: { playerId: req.userId },
    include: { court: { include: { arena: true } }, participants: { include: { player: { select: { id: true, name: true } } } } },
    orderBy: { startsAt: "desc" },
  });
  return res.json({ bookings: bookings.map(toPublicBooking) });
}

// ------------------------------------------------------------
// GET /bookings/open — partidas abertas disponíveis
// ------------------------------------------------------------
export async function listOpenMatches(req: Request, res: Response) {
  const { minLevel, maxLevel, city } = req.query;

  const bookings = await prisma.booking.findMany({
    where: {
      isOpenMatch: true,
      status: "confirmed",
      startsAt: { gte: new Date() },
      ...(minLevel ? { maxLevel: { gte: Number(minLevel) } } : {}),
      ...(maxLevel ? { minLevel: { lte: Number(maxLevel) } } : {}),
    },
    include: {
      court: { include: { arena: true } },
      player: { select: { id: true, name: true } },
      participants: { include: { player: { select: { id: true, name: true } } } },
    },
    orderBy: { startsAt: "asc" },
  });

  const result = bookings
    .filter(b => {
      if (!city) return true;
      return b.court?.arena?.city?.toLowerCase().includes((city as string).toLowerCase());
    })
    .map(b => {
      const { player, participants, ...rest } = b as any;
      const allPlayers = [
        { id: player.id, name: player.name, isOrganizer: true },
        ...participants.map((p: any) => ({ id: p.player.id, name: p.player.name, isOrganizer: false })),
      ];
      return {
        ...toPublicBooking(rest),
        organizer: player,
        players: allPlayers,
        spotsLeft: rest.maxPlayers - allPlayers.length,
      };
    });

  return res.json({ matches: result });
}

// ------------------------------------------------------------
// POST /bookings/:id/join — entrar num jogo aberto
// ------------------------------------------------------------
export async function joinMatch(req: Request, res: Response) {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { participants: true },
  });

  if (!booking) return res.status(404).json({ error: "Jogo não encontrado" });
  if (!booking.isOpenMatch) return res.status(400).json({ error: "Este não é um jogo aberto" });
  if (booking.status !== "confirmed") return res.status(400).json({ error: "Este jogo não está disponível" });
  if (booking.playerId === req.userId) return res.status(400).json({ error: "Você já é o organizador deste jogo" });

  const alreadyIn = booking.participants.some(p => p.playerId === req.userId);
  if (alreadyIn) return res.status(409).json({ error: "Você já está neste jogo" });

  const totalPlayers = booking.participants.length + 1; // +1 = organizador
  if (totalPlayers >= booking.maxPlayers) return res.status(409).json({ error: "Este jogo já está lotado" });

  // Verifica nível do jogador se o jogo tem exigência de nível
  if (booking.minLevel !== null || booking.maxLevel !== null) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId: req.userId } });
    if (profile) {
      if (booking.minLevel !== null && profile.currentLevel < booking.minLevel) {
        return res.status(403).json({ error: `Seu nível (${profile.currentLevel}) está abaixo do mínimo exigido (${booking.minLevel})` });
      }
      if (booking.maxLevel !== null && profile.currentLevel > booking.maxLevel) {
        return res.status(403).json({ error: `Seu nível (${profile.currentLevel}) está acima do máximo exigido (${booking.maxLevel})` });
      }
    }
  }

  const participant = await prisma.matchParticipant.create({
    data: { bookingId: booking.id, playerId: req.userId as string },
    include: { player: { select: { id: true, name: true } } },
  });

  return res.status(201).json({ participant });
}

// ------------------------------------------------------------
// DELETE /bookings/:id/leave — sair de um jogo aberto
// ------------------------------------------------------------
export async function leaveMatch(req: Request, res: Response) {
  const existing = await prisma.matchParticipant.findFirst({
    where: { bookingId: req.params.id, playerId: req.userId },
  });

  if (!existing) return res.status(404).json({ error: "Você não está neste jogo" });

  await prisma.matchParticipant.delete({ where: { id: existing.id } });
  return res.json({ message: "Você saiu do jogo com sucesso" });
}

// ------------------------------------------------------------
// DELETE /bookings/:id — cancela reserva (só o dono)
// ------------------------------------------------------------
export async function cancelBooking(req: Request, res: Response) {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) return res.status(404).json({ error: "Reserva não encontrada" });
  if (booking.playerId !== req.userId) return res.status(403).json({ error: "Você não tem permissão para cancelar esta reserva" });

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status: "cancelled" },
  });

  return res.json({ booking: toPublicBooking(updated) });
}

// ------------------------------------------------------------
// GET /courts/:id/availability?date=YYYY-MM-DD
// ------------------------------------------------------------
export async function getCourtAvailability(req: Request, res: Response) {
  const { date } = req.query;
  if (!date || typeof date !== "string") {
    return res.status(400).json({ error: "Parâmetro 'date' é obrigatório (formato YYYY-MM-DD)" });
  }

  const court = await prisma.court.findUnique({ where: { id: req.params.id } });
  if (!court) return res.status(404).json({ error: "Quadra não encontrada" });

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  const bookings = await prisma.booking.findMany({
    where: { courtId: req.params.id, status: "confirmed", startsAt: { gte: dayStart, lte: dayEnd } },
    orderBy: { startsAt: "asc" },
  });

  return res.json({
    court: { id: court.id, name: court.name, basePriceHour: court.basePriceHour },
    bookedSlots: bookings.map(b => ({ startsAt: b.startsAt, endsAt: b.endsAt })),
  });
}
