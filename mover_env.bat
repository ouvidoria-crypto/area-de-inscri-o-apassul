@echo off
setlocal enabledelayedexpansion

echo Este script vai mover o arquivo mais recente da subpasta "Claude outputs"
echo (chamado "env" ou ".env", dependendo da sincronizacao) para ".env"
echo na pasta principal do projeto.
echo.

if not exist "package.json" (
  echo [ERRO] Nao encontrei o arquivo "package.json" aqui.
  echo Mova este script "mover_env.bat" para a pasta principal do projeto
  echo ^(a mesma pasta onde estao o server.js e o package.json^) e rode de novo.
  echo.
  pause
  exit /b 1
)

set ORIGEM=

if exist "Claude outputs\.env" (
  set ORIGEM=Claude outputs\.env
) else (
  if exist "Claude outputs\env" (
    set ORIGEM=Claude outputs\env
  )
)

if "!ORIGEM!"=="" (
  echo [ERRO] Nao encontrei nem "Claude outputs\.env" nem "Claude outputs\env".
  echo Verifique se a subpasta "Claude outputs" ainda tem o arquivo mais recente.
  echo.
  pause
  exit /b 1
)

echo Arquivo encontrado: "!ORIGEM!"
echo.

if exist ".env" (
  echo Ja existe um arquivo ".env" nesta pasta.
  set /p RESPOSTA="Quer substituir ele pelo novo? (S/N): "
  if /I not "!RESPOSTA!"=="S" (
    echo Operacao cancelada. Nada foi alterado.
    pause
    exit /b 0
  )
  del /F ".env"
)

move /Y "!ORIGEM!" ".env" >nul

if exist ".env" (
  echo.
  echo Pronto! O arquivo ".env" foi atualizado com sucesso na pasta do projeto.
  echo Agora e so reiniciar o servidor ^(Ctrl+C e depois "node server.js"^)
  echo para ele carregar essas novas configuracoes.
) else (
  echo.
  echo Algo deu errado ao mover o arquivo. Tente fazer manualmente:
  echo 1. Va na subpasta "Claude outputs"
  echo 2. Recorte o arquivo "!ORIGEM!"
  echo 3. Cole aqui na pasta principal
  echo 4. Renomeie para ".env"
)

echo.
pause
