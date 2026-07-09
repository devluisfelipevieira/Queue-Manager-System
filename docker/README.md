# Rodando localmente com Docker

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (inclui Docker Compose)
- Git (para clonar o projeto)

## Início rápido

```bash
# 1. Clone o projeto
git clone <URL-DO-REPOSITORIO>
cd <PASTA-DO-PROJETO>

# 2. Crie o arquivo de variáveis de ambiente
cp .env.example .env
# Edite .env se quiser trocar a senha do banco ou a porta

# 3. Suba os containers (na primeira vez faz o build — leva alguns minutos)
docker compose up --build

# 4. Acesse no navegador
open http://localhost:3000
```

Para rodar em background:
```bash
docker compose up --build -d
```

## Usuários padrão

| Usuário   | Senha     | Função                    |
|-----------|-----------|---------------------------|
| recepcao  | recepcao  | Painel da Recepção        |
| mesa1     | mesa1     | Mesa 1 — Protocolo        |
| mesa2     | mesa2     | Mesa 2 — Protocolo        |
| mesa3     | mesa3     | Mesa 3 — Protocolo        |
| mesa4     | mesa4     | Mesa 4 — Protocolo        |
| mesa5     | mesa5     | Mesa 5 — Dívida Ativa     |
| mesa6     | mesa6     | Mesa 6 — Dívida Ativa     |
| mesa7     | mesa7     | Mesa 7 — Dívida Ativa     |

## Serviços

| Serviço    | Descrição                                   |
|------------|---------------------------------------------|
| `frontend` | React + Vite servido pelo nginx na porta 80 |
| `api`      | Express + WebSocket na porta 8080 (interna) |
| `db`       | PostgreSQL 16 com pgcrypto                  |

O nginx expõe tudo na porta configurada em `APP_PORT` (padrão: 3000):
- `http://localhost:3000/` → frontend
- `http://localhost:3000/api/` → API REST
- `ws://localhost:3000/api/ws` → WebSocket (atualizações em tempo real)

## Comandos úteis

```bash
# Parar os containers
docker compose down

# Parar e remover o banco de dados (dados serão apagados)
docker compose down -v

# Ver logs em tempo real
docker compose logs -f

# Ver logs de um serviço específico
docker compose logs -f api

# Reconstruir após mudanças no código
docker compose up --build
```

## Observações sobre o build

- O build usa **linux/amd64**. Em máquinas Apple Silicon (M1/M2/M3) o Docker emula
  amd64 automaticamente — o build funciona, mas é mais lento.
- Na primeira execução, o PostgreSQL roda o script `docker/init-db.sql` que cria as
  tabelas e insere os usuários com senhas em bcrypt. Esse script só roda uma vez
  (enquanto o volume `postgres_data` existir).
- Os tokens de autenticação ficam **em memória** no servidor da API. Reiniciar o
  container `api` invalida todas as sessões ativas — os usuários precisarão fazer
  login novamente.

## Para produção

Antes de usar em produção, troque no `.env`:
1. `POSTGRES_PASSWORD` — use uma senha forte
2. `SESSION_SECRET` — gere com `openssl rand -hex 32`

E troque as senhas dos usuários no banco após o primeiro login.
