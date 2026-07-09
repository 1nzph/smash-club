# Smash Club — API de Autenticação

API de cadastro e login para jogadores e donos de arena de padel. Este guia assume que você **nunca programou back-end antes** — siga na ordem.

---

## 1. Instalar o Node.js (só uma vez no seu computador)

1. Acesse **https://nodejs.org**
2. Baixe a versão **LTS** (a recomendada, não a "Current")
3. Instale normalmente (Next, Next, Finish)
4. Para confirmar que funcionou, abra o Terminal (Mac/Linux) ou Prompt de Comando/PowerShell (Windows) e digite:
   ```
   node -v
   npm -v
   ```
   Se aparecer um número de versão em cada comando, está tudo certo.

## 2. Instalar um editor de código

Recomendo o **VS Code**: https://code.visualstudio.com — baixe, instale, abra.

## 3. Abrir o projeto

1. Extraia a pasta `smash-club-backend` em algum lugar do seu computador (ex: Área de Trabalho ou Documentos)
2. Abra o VS Code
3. Vá em **File → Open Folder** e selecione a pasta `smash-club-backend`
4. Abra o terminal integrado do VS Code: menu **Terminal → New Terminal**

## 4. Instalar as dependências do projeto

No terminal que você acabou de abrir, rode:

```bash
npm install
```

Isso vai baixar todas as bibliotecas que o projeto usa (Express, Prisma, etc). Pode demorar um ou dois minutos.

## 5. Configurar as variáveis de ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

*(No Windows, se o comando `cp` não funcionar, apenas duplique o arquivo `.env.example` manualmente pelo Explorador de Arquivos e renomeie a cópia para `.env`)*

Não precisa mudar nada nele para rodar localmente — os valores padrão já funcionam.

## 6. Criar o banco de dados

Este projeto usa SQLite, que é só um arquivo (não precisa instalar nenhum programa de banco de dados). Para criar as tabelas, rode:

```bash
npx prisma migrate dev --name init
```

Isso vai criar um arquivo `prisma/dev.db` já com as tabelas `User`, `PlayerProfile` e `ClubProfile`.

## 7. Rodar a API

```bash
npm run dev
```

Se tudo deu certo, você verá no terminal:

```
Smash Club API rodando em http://localhost:3333
```

Deixe esse terminal aberto rodando — é o seu servidor funcionando localmente.

---

## Testando a API

Você pode testar com o navegador, com `curl`, ou com uma ferramenta como **Postman** ou **Insomnia** (recomendo instalar uma dessas — são gratuitas e facilitam muito).

### Checar se está no ar
Abra no navegador: http://localhost:3333/health

### Cadastrar um jogador
```bash
curl -X POST http://localhost:3333/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Marina Torres",
    "email": "marina@exemplo.com",
    "password": "senha12345",
    "role": "PLAYER",
    "city": "São Paulo",
    "state": "SP"
  }'
```

A resposta traz um `token` — guarde ele, você vai precisar para as próximas chamadas.

### Cadastrar um dono de arena
```bash
curl -X POST http://localhost:3333/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rafael Mendes",
    "email": "rafael@arenavidroverde.com",
    "password": "senha12345",
    "role": "CLUB_OWNER",
    "companyName": "Arena Vidro Verde",
    "phone": "11999999999"
  }'
```

### Fazer login
```bash
curl -X POST http://localhost:3333/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "marina@exemplo.com",
    "password": "senha12345"
  }'
```

### Ver os dados do usuário logado (rota protegida)
Troque `SEU_TOKEN_AQUI` pelo token que você recebeu no cadastro ou login:
```bash
curl http://localhost:3333/auth/me \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## Explorar o banco de dados visualmente

O Prisma tem uma interface visual para ver os dados sem escrever SQL:

```bash
npx prisma studio
```

Isso abre uma página no navegador onde você vê e edita as tabelas diretamente.

---

## Estrutura do projeto

```
smash-club-backend/
├── prisma/
│   └── schema.prisma       # Modelagem das tabelas (User, PlayerProfile, ClubProfile)
├── src/
│   ├── controllers/
│   │   └── auth.controller.ts   # Lógica de registro, login e "meus dados"
│   ├── middleware/
│   │   └── auth.middleware.ts   # Verifica o token JWT nas rotas protegidas
│   ├── routes/
│   │   └── auth.routes.ts       # Define os endpoints /auth/*
│   ├── utils/
│   │   ├── jwt.ts               # Gera e valida tokens
│   │   ├── password.ts          # Criptografa e compara senhas
│   │   └── validation.ts        # Valida os dados recebidos (Zod)
│   ├── prisma.ts             # Conexão compartilhada com o banco
│   └── index.ts              # Ponto de entrada - inicia o servidor
├── .env.example
├── package.json
└── tsconfig.json
```

## O que vem a seguir

Este é o módulo de autenticação. Os próximos módulos naturais são:
- **Arenas e quadras** (CRUD de arenas, fotos, comodidades)
- **Reservas** (booking de horários, split de pagamento)
- **Sistema de nível** (cálculo automático pós-partida)

Quando quiser seguir para o próximo, é só pedir.

---

## Módulo: Arenas e Quadras

Adicionamos dois modelos novos ao banco: `Arena` (pertence a um dono de clube) e `Court` (uma quadra dentro de uma arena).

### Aplicar a migração do banco

Como mudamos o `schema.prisma`, é preciso gerar uma nova migração:

```bash
npx prisma migrate dev --name add_arenas_and_courts
```

### Endpoints disponíveis

| Método | Rota | Quem pode acessar | O que faz |
|---|---|---|---|
| `POST` | `/arenas` | Dono de arena (logado) | Cria uma arena vinculada à conta logada |
| `GET` | `/arenas` | Público | Lista arenas, com filtros opcionais `?city=` `?state=` `?q=` |
| `GET` | `/arenas/mine` | Dono de arena (logado) | Lista só as arenas do usuário logado |
| `GET` | `/arenas/:id` | Público | Detalhe de uma arena, com suas quadras |
| `PUT` | `/arenas/:id` | Dono da arena | Atualiza dados da arena |
| `POST` | `/arenas/:id/courts` | Dono da arena | Adiciona uma quadra à arena |

### Testando com PowerShell

**Primeiro, faça login como um dono de clube** (se ainda não tiver um cadastrado, cadastre um com `role: "CLUB_OWNER"` — veja exemplo lá em cima). Guarde o token:

```powershell
$loginBody = @{ email = "rafael@arenavidroverde.com"; password = "senha12345" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:3333/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $response.token
```

**Criar uma arena:**
```powershell
$arenaBody = @{
    name        = "Arena Vidro Verde"
    description = "Arena coberta no coracao de Pinheiros"
    address     = "Rua dos Pinheiros, 500"
    city        = "Sao Paulo"
    state       = "SP"
    amenities   = @("estacionamento", "bar", "vestiario")
    photos      = @()
} | ConvertTo-Json

$arena = Invoke-RestMethod -Uri "http://localhost:3333/arenas" -Method Post -Body $arenaBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" }
$arena
```

Guarde o `id` da arena criada (`$arena.arena.id`) para o próximo passo.

**Adicionar uma quadra a essa arena:**
```powershell
$arenaId = $arena.arena.id

$courtBody = @{
    name          = "Quadra 1"
    type          = "coberta"
    surface       = "vidro"
    basePriceHour = 90
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3333/arenas/$arenaId/courts" -Method Post -Body $courtBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" }
```

**Buscar arenas publicamente (sem precisar de token):**
```powershell
Invoke-RestMethod -Uri "http://localhost:3333/arenas?city=Sao Paulo"
```

---

## Módulo: Reservas

Novo modelo `Booking`, ligado a uma `Court` e a um `User` (jogador).

### Aplicar a migração do banco

```bash
npx prisma migrate dev --name add_bookings
```

### Endpoints disponíveis

| Método | Rota | Quem acessa | O que faz |
|---|---|---|---|
| `POST` | `/bookings` | Jogador (logado) | Cria uma reserva, verificando conflito de horário |
| `GET` | `/bookings/mine` | Jogador (logado) | Lista as reservas do jogador logado |
| `DELETE` | `/bookings/:id` | Dono da reserva | Cancela a reserva |
| `GET` | `/courts/:id/availability?date=YYYY-MM-DD` | Público | Lista os horários já ocupados naquele dia |

### Testando com PowerShell

**Login como jogador e busca de uma quadra existente:**
```powershell
$loginBody = @{ email = "marina@exemplo.com"; password = "senha12345" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "http://localhost:3333/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $login.token

$arenas = Invoke-RestMethod -Uri "http://localhost:3333/arenas"
$courtId = $arenas.arenas[0].courts[0].id
$courtId
```

**Ver disponibilidade da quadra em uma data:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3333/courts/$courtId/availability?date=2026-07-10"
```

**Criar uma reserva:**
```powershell
$bookingBody = @{
    courtId         = $courtId
    startsAt        = "2026-07-10T19:00:00"
    durationMinutes = 60
} | ConvertTo-Json

$booking = Invoke-RestMethod -Uri "http://localhost:3333/bookings" -Method Post -Body $bookingBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" }
$booking.booking
```

**Tentar reservar o mesmo horário de novo (deve dar erro 409 de conflito):**
```powershell
Invoke-RestMethod -Uri "http://localhost:3333/bookings" -Method Post -Body $bookingBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" }
```

**Ver minhas reservas:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3333/bookings/mine" -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 5
```

---

## Módulo: Jogo aberto e convidados na reserva

A `Booking` ganhou três campos novos: `isOpenMatch`, `minLevel`/`maxLevel` (faixa de nível aceita) e `invitedEmails` (lista de e-mails convidados diretamente).

### Aplicar a migração do banco

```bash
npx prisma migrate dev --name add_open_match_fields
```

### O que mudou no endpoint de criar reserva

`POST /bookings` agora aceita esses campos extras (todos opcionais, exceto quando `isOpenMatch` é `true` — aí `minLevel` e `maxLevel` passam a ser obrigatórios):

```powershell
$bookingBody = @{
    courtId         = $courtId
    startsAt        = "2026-07-10T19:00:00"
    durationMinutes = 60
    isOpenMatch     = $true
    minLevel        = 3.0
    maxLevel         = 4.0
    invitedEmails   = @("amigo1@exemplo.com", "amigo2@exemplo.com")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3333/bookings" -Method Post -Body $bookingBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" }
```

### Novo endpoint: listar jogos abertos

```powershell
Invoke-RestMethod -Uri "http://localhost:3333/bookings/open" | ConvertTo-Json -Depth 5
```

Essa rota é pública (não exige token) — é o que vai alimentar a aba "Jogos abertos" para outros jogadores encontrarem partidas.


---

## Módulo: Sistema de Nível (Motor de Nivelamento)

Sistema de nível estilo Playtomic: escala de **0.5 a 7.0**, com **confiabilidade** (0-100%) que começa em 20% e sobe +5% a cada partida registrada.

### Aplicar a migração

```bash
npx prisma migrate dev --name add_leveling_system
```

### Endpoints

| Método | Rota | O que faz |
|---|---|---|
| `POST` | `/players/level-quiz` | Define o nível inicial via questionário de boas-vindas |
| `POST` | `/players/match-result` | Registra o resultado de uma partida e recalcula o nível dos 4 jogadores |
| `GET` | `/players/:userId/level-history` | Histórico de ajustes de nível de um jogador |

### Testando o questionário inicial

```powershell
$login = Invoke-RestMethod -Uri "http://localhost:3333/auth/login" -Method Post -Body (@{email="marina@exemplo.com";password="senha12345"}|ConvertTo-Json) -ContentType "application/json"
$token = $login.token

$quizBody = @{
    practiceTime = "1_a_3_anos"
    technicalLevel = "paredes_saques"
    frequency = "regular"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3333/players/level-quiz" -Method Post -Body $quizBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" }
```

### Testando o resultado de uma partida

Precisa dos IDs de 4 jogadores cadastrados (2 de cada dupla). Pegue os IDs em `/auth/me` de cada conta ou no Prisma Studio (`npx prisma studio`).

```powershell
$matchBody = @{
    teamA = @("id-jogador-1", "id-jogador-2")
    teamB = @("id-jogador-3", "id-jogador-4")
    setsA = 2
    setsB = 1
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3333/players/match-result" -Method Post -Body $matchBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 5
```

A resposta traz o ajuste de nível e confiabilidade dos 4 jogadores, no formato:
```json
{
  "nivel_anterior": 3.0,
  "novo_nivel": 3.15,
  "confiabilidade_anterior": 50,
  "nova_confiabilidade": 55,
  "variação": 0.15,
  "resumo_ajuste": "Jogando como... "
}
```

### Nota sobre a fórmula

A especificação original usava `K x (Esperado - Real)`, o que faz o nível cair sempre que se vence. Corrigimos para `K x (Real - Esperado)`, que é a convenção padrão de sistemas Elo — vencer aumenta o nível (mais quando se é azarão, menos quando já era esperado vencer).
