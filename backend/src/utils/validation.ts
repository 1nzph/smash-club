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

// ============================================================
// ARENAS E QUADRAS
// ============================================================
export const createArenaSchema = z.object({
  name: z.string().min(2, "Nome da arena deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  address: z.string().min(5, "Endereço obrigatório"),
  city: z.string().min(2, "Cidade obrigatória"),
  state: z.string().length(2, "Estado deve ser a sigla, ex: SP"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  // O front-end manda uma lista, aqui a gente aceita array e junta em string
  amenities: z.array(z.string()).optional().default([]),
  photos: z.array(z.string()).optional().default([]),
});

export const updateArenaSchema = createArenaSchema.partial();

export const createCourtSchema = z.object({
  name: z.string().min(1, "Nome da quadra é obrigatório"),
  type: z.enum(["coberta", "descoberta"], {
    errorMap: () => ({ message: "type deve ser 'coberta' ou 'descoberta'" }),
  }),
  surface: z.enum(["vidro", "alvenaria"], {
    errorMap: () => ({ message: "surface deve ser 'vidro' ou 'alvenaria'" }),
  }),
  basePriceHour: z.number().positive("Preço deve ser maior que zero"),
});

export const searchArenasSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  q: z.string().optional(), // busca livre por nome
});

export type CreateArenaInput = z.infer<typeof createArenaSchema>;
export type CreateCourtInput = z.infer<typeof createCourtSchema>;
