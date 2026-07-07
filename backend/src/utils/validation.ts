import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail invalido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  role: z.enum(["PLAYER", "CLUB_OWNER"], {
    errorMap: () => ({ message: "role deve ser PLAYER ou CLUB_OWNER" }),
  }),
  // Campos extras opcionais dependendo do papel do usuario
  city: z.string().optional(),
  state: z.string().optional(),
  companyName: z.string().optional(),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("E-mail invalido"),
  password: z.string().min(1, "Senha e obrigatoria"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
