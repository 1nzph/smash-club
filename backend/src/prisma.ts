import { PrismaClient } from "@prisma/client";

// Uma unica instancia do Prisma Client compartilhada por toda a aplicacao.
// Evita abrir varias conexoes com o banco desnecessariamente.
export const prisma = new PrismaClient();
