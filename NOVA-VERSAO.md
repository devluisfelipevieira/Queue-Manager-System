# Atualização híbrida — implantação

## Instalação existente

Faça backup do banco e aplique a migração antes de subir a nova API:

```powershell
Get-Content docker/migrations/001-admin-and-settings.sql | docker compose exec -T db psql -U guiche -d guiche
docker compose up -d --build
```

Em uma instalação nova, `docker/init-db.sql` já cria a configuração e o administrador.

## Primeiro acesso administrativo

- usuário inicial: `admin`
- senha inicial: `admin`

Troque a senha diretamente no banco antes da operação:

```sql
UPDATE users SET password_hash = crypt('UMA-SENHA-FORTE', gen_salt('bf', 10)) WHERE username = 'admin';
```

O administrador acessa `/admin`, altera o tempo do lembrete, cria mesa + usuário operador em uma única operação e exclui mesas com seus respectivos usuários.

## Decisões implementadas

- lembrete padrão de 10 minutos, configurável entre 1 e 240;
- ações `Liberar` e `Adiar 5 min`;
- notificação nativa no vencimento e overlay vermelho 8 segundos depois;
- `Liberar` traz a janela principal para a frente;
- fechar a janela minimiza para a bandeja;
- início automático com o Windows;
- login assinado válido por um ano e preservado entre reinicializações da API;
- frontend web e Electron usam a mesma API, banco e WebSocket.

O valor de `SESSION_SECRET` deve permanecer o mesmo entre atualizações. Trocá-lo encerra todas as sessões existentes.
