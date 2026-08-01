# Atualizações do aplicativo Windows

Copie para este diretório os artefatos produzidos pelo `electron-builder`: `latest.yml`, instalador `.exe` e `.blockmap`. Eles serão publicados em `http://IP_DO_SERVIDOR:3000/updates/`.

Publique os três arquivos da mesma compilação juntos. Enquanto o aplicativo não estiver assinado, mantenha `updateUrl` vazio em `artifacts/electron/config.json`.
