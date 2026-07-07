import { Request, Response } from "express";
import { prisma } from "../prisma";
import { hashPassword, comparePassword } from "../utils/password";
import { generateToken } from "../utils/jwt";
import { registerSchema, loginSchema } from "../utils/validation";

export async function register(req: Request, res: Response) {
  // 1. Valida o corpo da requisicao
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Dados invalidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }
  const { name, email, password, role, city, state, companyName, phone } = parsed.data;

  // 2. Verifica se ja existe usuario com esse e-mail
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: "Ja existe uma conta com este e-mail" });
  }

  // 3. Cria o hash da senha (nunca guardamos a senha em texto puro)
  const passwordHash = await hashPassword(password);

  // 4. Cria o usuario e o perfil especifico (jogador ou clube) numa unica transacao
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      ...(role === "PLAYER"
        ? { playerProfile: { create: { city, state } } }
        : { clubProfile: { create: { companyName, phone } } }),
    },
    include: { playerProfile: true, clubProfile: true },
  });

  // 5. Gera o token de sessao (o usuario ja entra logado apos o cadastro)
  const token = generateToken({ userId: user.id, role: user.role });

  return res.status(201).json({
    token,
    user: toPublicUser(user),
  });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Dados invalidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { playerProfile: true, clubProfile: true },
  });

  // Mensagem generica de proposito - nao revela se o e-mail existe ou nao.
  // Isso evita que alguem descubra quais e-mails estao cadastrados.
  const invalidCredentialsMessage = "E-mail ou senha incorretos";

  if (!user) {
    return res.status(401).json({ error: invalidCredentialsMessage });
  }

  const passwordMatches = await comparePassword(password, user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ error: invalidCredentialsMessage });
  }

  const token = generateToken({ userId: user.id, role: user.role });

  return res.json({
    token,
    user: toPublicUser(user),
  });
}

export async function me(req: Request, res: Response) {
  // req.userId e injetado pelo middleware de autenticacao (authGuard)
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { playerProfile: true, clubProfile: true },
  });

  if (!user) {
    return res.status(404).json({ error: "Usuario nao encontrado" });
  }

  return res.json({ user: toPublicUser(user) });
}

// Remove campos sensiveis (como passwordHash) antes de devolver o usuario na resposta
function toPublicUser(user: any) {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}
