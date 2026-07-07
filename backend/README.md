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
