@echo off
rem ============================================================
rem  OX CASINO - PASTE_CASA
rem  Doble clic: regenera la carpeta paste\ con
rem    MARKER_bloque.txt  (el juego en un bloque de texto)
rem    demo.html          (doble clic y juega)
rem    LEEME.txt
rem ============================================================
setlocal
chcp 65001 >nul
title OX CASINO - Paste Builder

set "HERE=%~dp0"
set "PY="

rem --- buscar Python: py launcher, luego python en PATH ---
py -3 --version >nul 2>&1 && set "PY=py -3"
if not defined PY (
  python --version >nul 2>&1 && set "PY=python"
)

if not defined PY (
  echo.
  echo  [X] No encuentro Python en este PC.
  echo      Instalalo desde https://www.python.org/downloads/
  echo      o desde Microsoft Store, y vuelve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

%PY% "%HERE%tools\paste_builder.py" "%HERE%..\MARKER.html"
if errorlevel 1 (
  echo.
  pause
  exit /b 1
)

rem --- abrir la carpeta de salida para ver el resultado ---
start "" explorer "%HERE%paste"
exit /b 0
