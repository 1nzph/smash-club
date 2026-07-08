// SQLite nao suporta listas nativamente, entao guardamos "amenities" e "photos"
// como uma string separada por virgula (ex: "estacionamento,bar,loja").
// Estas funcoes convertem entre o array que a API recebe/devolve e essa string.

export function listToString(list: string[]): string {
  return list.filter(Boolean).join(",");
}

export function stringToList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}
