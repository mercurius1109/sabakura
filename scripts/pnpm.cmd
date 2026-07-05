@echo off
setlocal

set "PROJECT_ROOT=%~dp0.."
set "APPDATA_PNPM=%APPDATA%\npm\pnpm.cmd"
set "LOCAL_PNPM=%LOCALAPPDATA%\pnpm\pnpm.cmd"
set "PROGRAMFILES_PNPM=%ProgramFiles%\nodejs\pnpm.cmd"
set "PROGRAMFILES_COREPACK=%ProgramFiles%\nodejs\corepack.cmd"
set "PROGRAMFILESX86_PNPM=%ProgramFiles(x86)%\nodejs\pnpm.cmd"
set "PROGRAMFILESX86_COREPACK=%ProgramFiles(x86)%\nodejs\corepack.cmd"

if exist "%APPDATA_PNPM%" (
  call "%APPDATA_PNPM%" %*
  exit /b %errorlevel%
)

if exist "%LOCAL_PNPM%" (
  call "%LOCAL_PNPM%" %*
  exit /b %errorlevel%
)

if exist "%PROGRAMFILES_PNPM%" (
  call "%PROGRAMFILES_PNPM%" %*
  exit /b %errorlevel%
)

if exist "%PROGRAMFILESX86_PNPM%" (
  call "%PROGRAMFILESX86_PNPM%" %*
  exit /b %errorlevel%
)

if exist "%PROGRAMFILES_COREPACK%" (
  call "%PROGRAMFILES_COREPACK%" pnpm %*
  exit /b %errorlevel%
)

if exist "%PROGRAMFILESX86_COREPACK%" (
  call "%PROGRAMFILESX86_COREPACK%" pnpm %*
  exit /b %errorlevel%
)

echo pnpm was not found in common install locations. 1>&2
echo Checked: 1>&2
echo   %APPDATA_PNPM% 1>&2
echo   %LOCAL_PNPM% 1>&2
echo   %PROGRAMFILES_PNPM% 1>&2
echo   %PROGRAMFILESX86_PNPM% 1>&2
echo   %PROGRAMFILES_COREPACK% 1>&2
echo   %PROGRAMFILESX86_COREPACK% 1>&2
exit /b 1
