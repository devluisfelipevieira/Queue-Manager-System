# Aplicativo Windows

O aplicativo Electron usa o mesmo frontend, API e banco da versão web. Ele mantém o login no armazenamento local do Windows, inicia com o sistema, permanece na bandeja e exibe o lembrete nativo mesmo quando a janela está oculta.

## Configurar o servidor

Antes de gerar o instalador, edite `config.json`:

```json
{
  "serverUrl": "http://IP_FIXO",
  "updateUrl": "http://IP_FIXO/updates"
}
```

Deixe `updateUrl` vazio enquanto não existir um diretório HTTP para as versões. O computador precisa conseguir acessar o IP e a porta informados.

## Gerar o instalador no Windows

Este pacote é independente do workspace pnpm usado pelo servidor:

```powershell
cd artifacts/electron
npm install
npm run typecheck
npm run build
```

O instalador será criado em `artifacts/electron/dist/Guiche-Setup-<versao>.exe`. A instalação é por usuário e não exige privilégios administrativos por padrão.

## Atualização automática

Para cada versão, aumente `version` no `package.json`, gere o instalador e publique juntos no endereço de atualização:

- `Guiche-Setup-<versao>.exe`
- `latest.yml`
- arquivo `.blockmap` gerado

O aplicativo consulta esse endereço ao iniciar. Não misture o `latest.yml` de uma versão com os binários de outra.

## Assinatura no Windows

Para eliminar o aviso de editor desconhecido e proteger as atualizações, obtenha um certificado de assinatura de código emitido para a Prefeitura. No ambiente seguro de build, defina as credenciais aceitas pelo `electron-builder` (`CSC_LINK` apontando para o `.pfx` e `CSC_KEY_PASSWORD`) ou integre o certificado mantido em hardware/cofre. Nunca versione o `.pfx` ou a senha.
