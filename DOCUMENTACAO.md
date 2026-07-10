# Gerenciador de Guichê — Documentação Completa

> Sistema de gerenciamento de status de guichês para a **Prefeitura Municipal de Paraíba do Sul**.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Estrutura do Projeto](#3-estrutura-do-projeto)
4. [Banco de Dados](#4-banco-de-dados)
5. [API REST](#5-api-rest)
6. [WebSocket — Atualizações em Tempo Real](#6-websocket--atualizações-em-tempo-real)
7. [Frontend — Telas e Funcionalidades](#7-frontend--telas-e-funcionalidades)
8. [Autenticação e Perfis de Acesso](#8-autenticação-e-perfis-de-acesso)
9. [Usuários Padrão](#9-usuários-padrão)
10. [Variáveis de Ambiente](#10-variáveis-de-ambiente)
11. [Implantação com Docker](#11-implantação-com-docker)
12. [Desenvolvimento Local (Replit)](#12-desenvolvimento-local-replit)
13. [Manutenção e Operação](#13-manutenção-e-operação)

---

## 1. Visão Geral

O **Gerenciador de Guichê** é uma aplicação web em tempo real que permite acompanhar e controlar o status (livre/ocupado) de cada guichê de atendimento da prefeitura. O sistema é dividido em dois setores:

| Setor | Guichês |
|---|---|
| Protocolo Geral | Mesas 1, 2, 3 e 4 |
| Dívida Ativa | Mesas 5, 6 e 7 |

### Perfis de uso

- **Recepcionista** (`recepcao`) — visualiza o painel com todos os guichês em tempo real. Não altera status diretamente pelo painel de recepção, mas pode acessar o painel de qualquer mesa via `/mesa/:id`.
- **Operador de Mesa** (`mesa`) — faz login com o usuário da sua mesa e altera apenas o status da própria mesa (liberar/ocupar).

---

## 2. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────┐
│                     Navegador                       │
│           React + Vite (SPA)                        │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │  /recepcao   │  │  /mesa/:id   │                 │
│  │  (painel)    │  │  (operador)  │                 │
│  └──────┬───────┘  └──────┬───────┘                 │
│         │   HTTP / WS     │                         │
└─────────┼─────────────────┼─────────────────────────┘
          │                 │
┌─────────▼─────────────────▼─────────────────────────┐
│               Nginx (porta 80)                      │
│     /          →  arquivos estáticos do React       │
│     /api/*     →  proxy para API (porta 8080)       │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│           API Server — Express 5 (porta 8080)       │
│     REST endpoints + WebSocket (/api/ws)            │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│           PostgreSQL 16 (porta 5432)                │
│           banco: guiche                             │
└─────────────────────────────────────────────────────┘
```

### Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite, TypeScript, TailwindCSS, Radix UI / Shadcn |
| Roteamento frontend | Wouter |
| Backend | Node.js, Express 5, TypeScript |
| Banco de Dados | PostgreSQL 16 |
| ORM | Drizzle ORM |
| Validação | Zod |
| HTTP Client (frontend) | TanStack Query (React Query) |
| Tempo Real | WebSocket nativo (`ws`) |
| Servidor HTTP (produção) | Nginx (Alpine) |
| Containerização | Docker + Docker Compose |
| Gerenciador de pacotes | pnpm (monorepo) |

---

## 3. Estrutura do Projeto

```
Queue-Manager-System/
│
├── artifacts/
│   ├── api-server/              # Serviço de API
│   │   └── src/
│   │       ├── index.ts         # Ponto de entrada (Express + WS)
│   │       ├── lib/
│   │       │   ├── auth.ts      # Middleware de autenticação + token store
│   │       │   └── wsManager.ts # Gerenciamento de conexões WebSocket
│   │       └── routes/
│   │           ├── auth.ts      # Rotas de autenticação
│   │           ├── desks.ts     # Rotas de mesas
│   │           └── health.ts    # Health check (/api/healthz)
│   │
│   └── guiche/                  # Frontend React
│       └── src/
│           ├── main.tsx
│           ├── App.tsx          # Roteamento (Wouter)
│           ├── pages/
│           │   ├── login.tsx       # Tela de login (/)
│           │   ├── reception.tsx   # Painel da recepção (/recepcao)
│           │   ├── desk.tsx        # Painel do operador (/mesa/:id)
│           │   └── not-found.tsx
│           ├── hooks/
│           │   └── use-desks-ws.ts # Hook WebSocket
│           ├── components/
│           │   ├── layout.tsx   # Shell da aplicação (nav + header)
│           │   └── ui/          # Componentes Shadcn/Radix
│           └── lib/
│               └── utils.ts
│
├── lib/                         # Pacotes compartilhados (monorepo)
│   ├── db/                      # Drizzle ORM — schema e conexão
│   │   └── src/schema/
│   │       ├── desks.ts         # Tabela desks
│   │       └── users.ts         # Tabela users
│   ├── api-zod/                 # Schemas de validação Zod
│   └── api-client-react/        # Hooks TanStack Query
│
├── docker/
│   ├── init-db.sql              # Criação de tabelas + seed de usuários
│   ├── nginx.conf               # Configuração Nginx (proxy + SPA)
│   └── README.md                # Instruções de deploy
│
├── Dockerfile.api               # Build da API
├── Dockerfile.frontend          # Build do frontend
├── docker-compose.yml           # Orquestração dos serviços
├── .env.example                 # Modelo de variáveis de ambiente
├── .dockerignore
├── pnpm-workspace.yaml          # Configuração do monorepo
└── DOCUMENTACAO.md              # Este arquivo
```

---

## 4. Banco de Dados

### Tabela `desks` — Guichês

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | SERIAL PK | Identificador interno |
| `desk_number` | INTEGER UNIQUE | Número do guichê (1–7) |
| `name` | VARCHAR(50) | Nome de exibição (ex: "Mesa 1") |
| `sector` | VARCHAR(50) | Setor: `protocolo` ou `divida_ativa` |
| `status` | VARCHAR(20) | Status atual: `free` ou `occupied` |
| `updated_at` | TIMESTAMP | Data/hora da última atualização |

### Tabela `users` — Usuários

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | SERIAL PK | Identificador interno |
| `username` | VARCHAR(50) UNIQUE | Nome de usuário para login |
| `password_hash` | VARCHAR(255) | Senha em bcrypt (via `pgcrypto`) |
| `role` | VARCHAR(20) | Perfil: `recepcao` ou `mesa` |
| `desk_id` | INTEGER | FK para `desks.id` (nulo para recepção) |
| `desk_number` | INTEGER | Número da mesa vinculada (nulo para recepção) |
| `sector` | VARCHAR(50) | Setor da mesa vinculada (nulo para recepção) |

### Dados iniciais (seed)

O arquivo `docker/init-db.sql` é executado automaticamente na primeira inicialização do container PostgreSQL. Ele cria as tabelas, 7 guichês e 8 usuários com senhas bcrypt. Todos os `INSERT` usam `ON CONFLICT DO NOTHING`, portanto é seguro reexecutar.

---

## 5. API REST

Base URL: `http://<host>/api`

### Autenticação

#### `POST /api/auth/login`

Autentica um usuário e retorna um token de sessão.

**Body (JSON):**
```json
{ "username": "recepcao", "password": "recepcao" }
```

**Resposta 200:**
```json
{
  "token": "<token-hex-64-chars>",
  "role": "recepcao",
  "username": "recepcao",
  "deskId": null,
  "deskNumber": null,
  "sector": null
}
```

Para um operador de mesa (`mesa3`), a resposta inclui os dados da mesa:
```json
{
  "token": "<token>",
  "role": "mesa",
  "username": "mesa3",
  "deskId": 3,
  "deskNumber": 3,
  "sector": "protocolo"
}
```

**Erros:**
- `400` — dados inválidos (campos ausentes)
- `401` — usuário ou senha incorretos

---

#### `GET /api/auth/me`

Retorna os dados do usuário da sessão atual. Requer header `Authorization: Bearer <token>`.

**Resposta 200:** mesmo formato do login.

---

### Mesas

#### `GET /api/desks`

Lista todos os guichês ordenados por número. Não requer autenticação.

**Resposta 200:**
```json
[
  {
    "id": 1,
    "deskNumber": 1,
    "name": "Mesa 1",
    "sector": "protocolo",
    "status": "free",
    "updatedAt": "2025-01-01T12:00:00.000Z"
  },
  ...
]
```

---

#### `GET /api/desks/summary`

Retorna os guichês agrupados por setor com contadores totais. Não requer autenticação.

**Resposta 200:**
```json
{
  "protocolo":    [ /* desks 1–4 */ ],
  "divida_ativa": [ /* desks 5–7 */ ],
  "totalFree":     2,
  "totalOccupied": 5
}
```

---

#### `POST /api/desks/:id/free` 🔒

Marca um guichê como **livre**. Requer `Authorization: Bearer <token>`.

- Operador (`mesa`) só pode liberar a própria mesa (validado pelo `deskId` armazenado no token).
- Recepcionista (`recepcao`) pode liberar qualquer mesa.
- Após a atualização, um evento `desk_updated` é transmitido via WebSocket a todos os clientes conectados.

**Parâmetro:** `:id` é o `id` interno da mesa (não o `desk_number`).

**Resposta 200:** objeto `Desk` atualizado.

**Erros:**
- `400` — ID inválido
- `401` — sem token ou token inválido
- `403` — operador tentando alterar mesa de outro
- `404` — mesa não encontrada

---

#### `POST /api/desks/:id/occupy` 🔒

Marca um guichê como **ocupado**. Mesmas regras e comportamento do endpoint `/free`.

---

### Health Check

#### `GET /api/healthz`

Verifica se a API está em execução. Não requer autenticação.

**Resposta 200:**
```json
{ "status": "ok" }
```

---

## 6. WebSocket — Atualizações em Tempo Real

**Endpoint:** `ws://<host>/api/ws`

O frontend conecta ao WebSocket logo após o login. A cada mudança de status de uma mesa, a API transmite uma mensagem para **todos** os clientes conectados simultaneamente.

### Tipos de mensagem

#### `desk_updated` — atualização individual

Emitido após cada chamada a `/free` ou `/occupy`.

```json
{
  "type": "desk_updated",
  "desk": {
    "id": 1,
    "deskNumber": 1,
    "name": "Mesa 1",
    "sector": "protocolo",
    "status": "free",
    "updatedAt": "2025-01-01T12:00:00.000Z"
  }
}
```

#### `desks_reset` — reset em massa

Emitido quando todas as mesas são resetadas de uma vez (operação administrativa).

```json
{
  "type": "desks_reset",
  "desks": [ /* array completo de Desk */ ]
}
```

O frontend atualiza o estado local ao receber qualquer uma dessas mensagens, sem necessidade de recarregar a página.

A conexão WebSocket mantém `proxy_read_timeout 86400s` no Nginx, suportando sessões de até 24 horas sem reconexão.

---

## 7. Frontend — Telas e Funcionalidades

### Rotas da aplicação

| Rota | Componente | Acesso |
|---|---|---|
| `/` | `LoginPage` | Público |
| `/recepcao` | `ReceptionPage` | Apenas `recepcao` |
| `/mesa/:id` | `DeskPage` | `mesa` (própria mesa) / `recepcao` (qualquer) |

Rotas protegidas redirecionam para `/` se não autenticado. Perfil errado redireciona: operador para `/mesa/<seu-id>`, recepcionista para `/recepcao`.

---

### Tela de Login (`/`)

- Campos: **Usuário** e **Senha**.
- Após login bem-sucedido, redireciona automaticamente:
  - Recepcionista → `/recepcao`
  - Operador de mesa → `/mesa/<deskId>`
- Exibe mensagem de erro em caso de credenciais inválidas.
- Rodapé: *"Uso exclusivo da Prefeitura Municipal de Paraíba do Sul"*

---

### Painel da Recepção (`/recepcao`)

Acessível apenas pelo perfil **recepcao**.

- Exibe todos os guichês organizados em dois grupos: **Protocolo Geral** e **Dívida Ativa**.
- Indicadores de status por mesa com cores visuais (verde = livre, vermelho = ocupado).
- Contador de mesas livres e ocupadas no topo.
- Badge "TODOS OCUPADOS" aparece quando todas as mesas de um setor estão ocupadas.
- Atualização automática em tempo real via WebSocket — não requer F5.
- **Este painel é somente visualização.** Para alterar o status de uma mesa, a recepcionista pode acessar diretamente `/mesa/:id`.

---

### Painel do Operador (`/mesa/:id`)

Acessível por operadores (própria mesa) e recepcionistas (qualquer mesa).

- Exibe o status atual da mesa com indicador visual de cor (verde/vermelho).
- Dois botões grandes:
  - **LIBERAR MESA** — disponível quando a mesa está ocupada
  - **OCUPAR MESA** — disponível quando a mesa está livre
- Exibe nome da mesa, setor e horário da última atualização.
- Atualização em tempo real: se outra sessão alterar o status, o painel reflete imediatamente.
- Operador que tentar acessar `/mesa/:id` de outra mesa é redirecionado para a própria.

---

### Layout Geral

Todas as telas autenticadas compartilham o componente `layout.tsx`:

- Cabeçalho com nome **Prefeitura Municipal de Paraíba do Sul**
- Nome do usuário logado e botão **Sair** (remove token do `localStorage` e redireciona para `/`)

---

## 8. Autenticação e Perfis de Acesso

O sistema utiliza autenticação por **token Bearer** gerenciado em memória no servidor.

| Etapa | Detalhe |
|---|---|
| Login | `POST /api/auth/login` → token hex de 64 caracteres gerado com `crypto.randomBytes(32)` |
| Armazenamento no servidor | Token salvo em dois `Map` em memória: `tokenStore` (token→username) e `tokenUserStore` (token→objeto de usuário completo) |
| Armazenamento no cliente | Token salvo no `localStorage` do navegador |
| Envio | Header `Authorization: Bearer <token>` em todas as requisições protegidas |
| Validação | Middleware `authenticate` consulta `tokenUserStore`; retorna `401` se não encontrado |
| Logout | Token removido do `localStorage`; **não há invalidação no servidor** — o token expira apenas com reinicialização da API |

> ⚠️ **Limitação importante:** os tokens não têm expiração e não são invalidados no logout pelo servidor. Uma reinicialização da API (`docker compose restart api`) invalida todos os tokens ativos — os usuários precisarão fazer login novamente.

> ℹ️ A variável `SESSION_SECRET` está disponível no ambiente, mas **não participa do fluxo de autenticação atual**. Está reservada para uso futuro.

### Regras de autorização por perfil

| Ação | `recepcao` | `mesa` |
|---|---|---|
| Ver todos os guichês (`GET /api/desks`) | ✅ | ✅ |
| Ver resumo por setor (`GET /api/desks/summary`) | ✅ | ✅ |
| Liberar/Ocupar qualquer mesa | ✅ | ❌ (403) |
| Liberar/Ocupar própria mesa | ✅ | ✅ |
| Acessar `/recepcao` | ✅ | ❌ (redireciona para `/mesa/:id`) |
| Acessar `/mesa/:id` (própria) | ✅ | ✅ |
| Acessar `/mesa/:id` (outra mesa) | ✅ | ❌ (redireciona para própria mesa) |

---

## 9. Usuários Padrão

Criados automaticamente pelo `docker/init-db.sql` na primeira inicialização.

| Usuário | Senha padrão | Perfil | Mesa | Setor |
|---|---|---|---|---|
| `recepcao` | `recepcao` | Recepcionista | — | — |
| `mesa1` | `mesa1` | Operador | Mesa 1 | Protocolo Geral |
| `mesa2` | `mesa2` | Operador | Mesa 2 | Protocolo Geral |
| `mesa3` | `mesa3` | Operador | Mesa 3 | Protocolo Geral |
| `mesa4` | `mesa4` | Operador | Mesa 4 | Protocolo Geral |
| `mesa5` | `mesa5` | Operador | Mesa 5 | Dívida Ativa |
| `mesa6` | `mesa6` | Operador | Mesa 6 | Dívida Ativa |
| `mesa7` | `mesa7` | Operador | Mesa 7 | Dívida Ativa |

> ⚠️ **Altere todas as senhas antes de colocar em produção.** As senhas padrão são iguais ao nome de usuário.

### Como alterar senhas

Conecte ao banco e execute (requer a extensão `pgcrypto`, já instalada pelo init):

```sql
UPDATE users
SET password_hash = crypt('nova_senha_segura', gen_salt('bf', 10))
WHERE username = 'recepcao';
```

Repita para cada usuário. O `gen_salt('bf', 10)` usa bcrypt com fator de custo 10 (recomendado para produção).

---

## 10. Variáveis de Ambiente

Copie `.env.example` para `.env` e ajuste os valores antes de subir os containers:

```bash
cp .env.example .env
```

| Variável | Padrão | Descrição |
|---|---|---|
| `POSTGRES_PASSWORD` | `guiche_secret` | Senha do banco PostgreSQL |
| `SESSION_SECRET` | — | Segredo de sessão (reservado para uso futuro) |
| `APP_PORT` | `3000` | Porta externa da aplicação no host |

O `DATABASE_URL` é montado internamente pelo `docker-compose.yml` com o formato `postgresql://guiche:<POSTGRES_PASSWORD>@db:5432/guiche` — **não precisa ser definido manualmente**.

---

## 11. Implantação com Docker

### Pré-requisitos

- Docker Engine ≥ 24
- Docker Compose Plugin ≥ 2.20
- Conexão à internet (apenas no primeiro build)
- Modo de rede da VM: **NAT** (recomendado — modo Bridge pode causar conflitos de roteamento entre a bridge da VM e a rede interna do Docker, impedindo que os containers resolvam DNS)

---

### Primeira implantação

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd Queue-Manager-System

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas senhas

# 3. Suba os serviços
docker compose up -d --build
```

O banco de dados é inicializado automaticamente com tabelas e usuários padrão na primeira execução. A aplicação fica disponível em `http://<ip-da-vm>:3000`.

---

### Opção recomendada: Build local + transferência para VM

Se a VM tiver conexão lenta com o registry npm, construa as imagens localmente e transfira:

**Na máquina local (internet rápida):**
```bash
cd Queue-Manager-System
docker compose build
docker save queue-manager-system-api     | gzip > api.tar.gz
docker save queue-manager-system-frontend | gzip > frontend.tar.gz
scp api.tar.gz frontend.tar.gz usuario@<ip-da-vm>:~/Queue-Manager-System/
```

**Na VM:**
```bash
cd ~/Queue-Manager-System
docker load < api.tar.gz
docker load < frontend.tar.gz
docker compose up -d
```

---

### Comandos de operação

```bash
# Ver status dos serviços
docker compose ps

# Ver logs em tempo real (todos os serviços)
docker compose logs -f

# Ver logs de um serviço específico
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f db

# Reiniciar todos os serviços
docker compose restart

# Reiniciar apenas a API (invalida todos os tokens — usuários precisarão fazer login novamente)
docker compose restart api

# Parar tudo (mantém os dados do banco)
docker compose down

# Parar e apagar TODOS os dados do banco ⚠️ irreversível
docker compose down -v

# Atualizar após alterações no código
docker compose up -d --build
```

---

### Serviços e portas

| Serviço | Porta interna | Porta externa | Acesso direto |
|---|---|---|---|
| Frontend (Nginx) | 80 | `APP_PORT` (padrão: 3000) | `http://<ip>:3000` |
| API (Express) | 8080 | não exposta | somente via Nginx proxy |
| PostgreSQL | 5432 | não exposta | somente via `docker compose exec db` |

---

### Persistência de dados

Os dados do PostgreSQL são armazenados no volume Docker `postgres_data`. Ele **não é apagado** ao reiniciar ou atualizar os serviços (`docker compose down` sem `-v`).

**Backup:**
```bash
docker compose exec db pg_dump -U guiche guiche > backup_$(date +%Y%m%d_%H%M).sql
```

**Restauração:**
```bash
docker compose exec -T db psql -U guiche guiche < backup_20250101_1200.sql
```

---

## 12. Desenvolvimento Local (Replit)

O projeto está configurado como um monorepo pnpm no Replit com três workflows:

| Workflow | Comando | Descrição |
|---|---|---|
| `artifacts/guiche: web` | `pnpm --filter @workspace/guiche run dev` | Frontend Vite (hot reload) |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | API Express (tsx watch) |
| `artifacts/mockup-sandbox` | `pnpm --filter @workspace/mockup-sandbox run dev` | Preview de componentes |

O banco de dados em desenvolvimento usa o PostgreSQL gerenciado pelo próprio Replit (via `DATABASE_URL` nos secrets do ambiente).

### Scripts disponíveis

```bash
# Instalar dependências
pnpm install

# Verificar tipos em todos os pacotes
pnpm typecheck

# Build de produção (todos os pacotes)
pnpm build

# Build apenas da API
pnpm --filter @workspace/api-server build

# Build apenas do frontend
pnpm --filter @workspace/guiche build
```

---

## 13. Manutenção e Operação

### Adicionar um novo guichê

Nenhuma alteração de código é necessária — o frontend renderiza os guichês dinamicamente.

**1. Inserir a nova mesa no banco:**
```sql
INSERT INTO desks (desk_number, name, sector, status)
VALUES (8, 'Mesa 8', 'protocolo', 'occupied');
```

**2. Criar o usuário operador:**
```sql
INSERT INTO users (username, password_hash, role, desk_id, desk_number, sector)
SELECT 'mesa8', crypt('nova_senha', gen_salt('bf', 10)), 'mesa', d.id, 8, 'protocolo'
FROM desks d WHERE d.desk_number = 8;
```

---

### Remover um guichê

```sql
-- Remover usuário vinculado primeiro
DELETE FROM users WHERE desk_number = 8;
-- Depois remover a mesa
DELETE FROM desks WHERE desk_number = 8;
```

---

### Resetar status de todas as mesas para "ocupado"

```sql
UPDATE desks SET status = 'occupied', updated_at = NOW();
```

> Após este comando, reinicie a API para que o estado em memória do WebSocket fique consistente, ou aguarde a próxima atualização de qualquer mesa.

---

### Verificar saúde da API

```bash
# De dentro da VM (via Nginx)
curl http://localhost:3000/api/healthz

# Diretamente no container da API
docker compose exec api curl http://localhost:8080/api/healthz

# Resposta esperada
{ "status": "ok" }
```

---

### Acessar o banco de dados diretamente

```bash
# Abrir psql interativo
docker compose exec db psql -U guiche -d guiche

# Exemplos de consultas úteis
SELECT desk_number, name, sector, status, updated_at FROM desks ORDER BY desk_number;
SELECT username, role, desk_number, sector FROM users ORDER BY role, desk_number;
```

---

### Monitorar conexões WebSocket ativas

```bash
docker compose logs -f api | grep -i "websocket\|ws\|client"
```

---

*Documentação gerada em julho de 2026.*
