// ============================================================
// MOTOR DE NIVELAMENTO — Smash Club
// Sistema de nivel estilo Playtomic: 0.5 a 7.0, com confiabilidade
// que comeca em 20% e sobe +5% a cada partida (max 100%).
//
// NOTA IMPORTANTE SOBRE A FORMULA:
// A especificacao original pedia:
//   DeltaNivel = K x (Resultado_Esperado - Resultado_Real) x Vantagem_Sets
// Essa ordem faz o nivel SEMPRE cair para quem vence (porque
// Resultado_Esperado nunca passa de 1, e o vencedor tem Resultado_Real=1).
// Isso e o oposto de um sistema Elo padrao. Corrigimos para:
//   DeltaNivel = K x (Resultado_Real - Resultado_Esperado) x Vantagem_Sets
// Assim: vencer como "azarao" sobe bastante o nivel; vencer como
// favorito sobe pouco; perder como favorito desce mais que perder
// como azarao. O resto da logica (K, expectativa, multiplicador de
// sets, confiabilidade) segue exatamente a especificacao original.
// ============================================================

export const MIN_LEVEL = 0.5;
export const MAX_LEVEL = 7.0;
export const INITIAL_RELIABILITY = 20;
export const MAX_RELIABILITY = 100;
export const RELIABILITY_STEP_PER_MATCH = 5;

function clampLevel(level: number): number {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, level));
}

function roundToHalf(level: number): number {
  return Math.round(level * 2) / 2;
}

// ------------------------------------------------------------
// PARTE 1 — Nivel inicial via questionario
// ------------------------------------------------------------
export type PracticeTime = "menos_3_meses" | "3_a_12_meses" | "1_a_3_anos" | "mais_3_anos";
export type TechnicalLevel = "dificuldade_raquete" | "trocas_fundo" | "paredes_saques" | "smash_bandeja_rede";
export type PlayFrequency = "ocasional" | "regular" | "competitivo";

const PRACTICE_TIME_BASE: Record<PracticeTime, number> = {
  // Usamos o ponto medio de cada faixa da especificacao como base
  menos_3_meses: 1.0,   // faixa 0.5 - 1.5
  "3_a_12_meses": 2.25, // faixa 1.5 - 3.0
  "1_a_3_anos": 3.75,   // faixa 3.0 - 4.5
  mais_3_anos: 5.25,    // faixa 4.5 - 6.0
};

const TECHNICAL_ADJUSTMENT: Record<TechnicalLevel, number> = {
  dificuldade_raquete: -0.5,
  trocas_fundo: 0.0,
  paredes_saques: 0.5,
  smash_bandeja_rede: 1.0,
};

const FREQUENCY_ADJUSTMENT: Record<PlayFrequency, number> = {
  ocasional: -0.2,
  regular: 0.0,
  competitivo: 0.3,
};

export interface InitialLevelResult {
  nivel_anterior: number;
  novo_nivel: number;
  confiabilidade_anterior: number;
  nova_confiabilidade: number;
  variação: number;
  resumo_ajuste: string;
}

export function calculateInitialLevel(
  practiceTime: PracticeTime,
  technicalLevel: TechnicalLevel,
  frequency: PlayFrequency
): InitialLevelResult {
  const base = PRACTICE_TIME_BASE[practiceTime];
  const techAdj = TECHNICAL_ADJUSTMENT[technicalLevel];
  const freqAdj = FREQUENCY_ADJUSTMENT[frequency];

  const rawLevel = base + techAdj + freqAdj;
  const novoNivel = roundToHalf(clampLevel(rawLevel));

  return {
    nivel_anterior: 0,
    novo_nivel: novoNivel,
    confiabilidade_anterior: 0,
    nova_confiabilidade: INITIAL_RELIABILITY,
    variação: novoNivel,
    resumo_ajuste: `Nível inicial definido em ${novoNivel.toFixed(1)} com base no questionário (tempo de prática, domínio técnico e frequência de jogo). Confiabilidade inicial de ${INITIAL_RELIABILITY}%.`,
  };
}

// ------------------------------------------------------------
// PARTE 2 — Fator K baseado na confiabilidade
// ------------------------------------------------------------
export function calculateK(reliability: number): number {
  if (reliability < 40) return 0.4;
  if (reliability <= 70) return 0.25;
  return 0.15;
}

// ------------------------------------------------------------
// PARTE 3 — Resultado esperado (probabilidade de vitoria)
// ------------------------------------------------------------
// A cada 0.5 de diferenca de nivel entre as duplas, a probabilidade
// da dupla mais forte vencer aumenta 15 pontos percentuais.
// Limitamos entre 5% e 95% para nunca termos certeza absoluta.
export function calculateExpectedResult(teamLevel: number, opponentLevel: number): number {
  const diff = teamLevel - opponentLevel;
  const steps = diff / 0.5;
  const expected = 0.5 + steps * 0.15;
  return Math.min(0.95, Math.max(0.05, expected));
}

// ------------------------------------------------------------
// Multiplicador de vantagem por sets (placar)
// ------------------------------------------------------------
export function calculateSetsMultiplier(setsWon: number, setsLost: number): number {
  if (setsWon === 2 && setsLost === 0) return 1.2; // sets limpos
  if (setsWon === 2 && setsLost === 1) return 1.0; // jogo apertado
  // Fallback generico para outros formatos de partida (ex: melhor de 1 set)
  if (setsWon > setsLost) return 1.0;
  return 1.0;
}

// ------------------------------------------------------------
// Ajuste pos-partida para UM jogador
// ------------------------------------------------------------
export interface PostMatchInput {
  playerLevel: number;       // nivel atual do jogador
  playerReliability: number; // confiabilidade atual do jogador (0-100)
  partnerLevel: number;      // nivel do parceiro de dupla
  opponent1Level: number;
  opponent2Level: number;
  won: boolean;               // este jogador/dupla venceu?
  setsWon: number;
  setsLost: number;
}

export function calculatePostMatchAdjustment(input: PostMatchInput): InitialLevelResult {
  const {
    playerLevel,
    playerReliability,
    partnerLevel,
    opponent1Level,
    opponent2Level,
    won,
    setsWon,
    setsLost,
  } = input;

  const teamLevel = (playerLevel + partnerLevel) / 2;
  const opponentTeamLevel = (opponent1Level + opponent2Level) / 2;

  const K = calculateK(playerReliability);
  const expected = calculateExpectedResult(teamLevel, opponentTeamLevel);
  const real = won ? 1 : 0;
  const mult = calculateSetsMultiplier(setsWon, setsLost);

  // Formula corrigida (ver nota no topo do arquivo): Real - Esperado
  const delta = K * (real - expected) * mult;

  // Diferente do questionario inicial, aqui NAO arredondamos para 0.5 -
  // isso preservaria variacoes pequenas (comuns em jogadores com alta
  // confiabilidade) que, se descartadas partida apos partida, fariam o
  // nivel nunca evoluir de fato ao longo do tempo.
  const novoNivelBruto = playerLevel + delta;
  const novoNivel = Math.round(clampLevel(novoNivelBruto) * 100) / 100;
  const deltaReal = Math.round((novoNivel - playerLevel) * 100) / 100;

  const novaConfiabilidade = Math.min(MAX_RELIABILITY, playerReliability + RELIABILITY_STEP_PER_MATCH);

  const favoritoTexto = expected > 0.5 ? "favorito" : expected < 0.5 ? "azarão" : "empate técnico";
  const resultadoTexto = won ? "venceu" : "perdeu";
  const direcaoTexto = deltaReal > 0 ? "subiu" : deltaReal < 0 ? "desceu" : "manteve-se";

  return {
    nivel_anterior: playerLevel,
    novo_nivel: novoNivel,
    confiabilidade_anterior: playerReliability,
    nova_confiabilidade: novaConfiabilidade,
    variação: deltaReal,
    resumo_ajuste: `Jogando como ${favoritoTexto} (expectativa de ${(expected * 100).toFixed(0)}% de vitória) e tendo ${resultadoTexto} por ${setsWon}x${setsLost}, o nível ${direcaoTexto} de ${playerLevel.toFixed(1)} para ${novoNivel.toFixed(1)}.`,
  };
}
