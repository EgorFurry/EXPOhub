@echo off
chcp 65001 >nul
echo Scanning project...

set OUTPUT=project_structure.txt

echo ======================================== > %OUTPUT%
echo EXPOHUB PROJECT STRUCTURE >> %OUTPUT%
echo Generated: %date% %time% >> %OUTPUT%
echo ======================================== >> %OUTPUT%
echo. >> %OUTPUT%

echo [FOLDER TREE - no node_modules] >> %OUTPUT%
echo. >> %OUTPUT%

for /F "tokens=*" %%a in ('dir /s /b /a:-h ^| findstr /v "\\node_modules\\" ^| findstr /v "\\.expo\\" ^| findstr /v "\\.gradle\\" ^| findstr /v "\\.kotlin\\" ^| findstr /v "\\.cxx\\" ^| findstr /v "\\build\\"') do (
    echo %%a >> %OUTPUT%
)

echo. >> %OUTPUT%
echo ======================================== >> %OUTPUT%
echo [KEY CONFIG FILES] >> %OUTPUT%
echo ======================================== >> %OUTPUT%

for %%f in (package.json app.json tsconfig.json eas.json AGENTS.md CLAUDE.md .env .env.example) do (
    if exist %%f (
        echo. >> %OUTPUT%
        echo --- %%f --- >> %OUTPUT%
        type %%f >> %OUTPUT%
    )
)

echo. >> %OUTPUT%
echo ======================================== >> %OUTPUT%
echo [SOURCE CODE - .ts .tsx files, no node_modules] >> %OUTPUT%
echo ======================================== >> %OUTPUT%

for /R %%f in (*.tsx *.ts) do (
    echo %%f | findstr /v "node_modules" | findstr /v ".expo" >nul 2>&1
    if not errorlevel 1 (
        echo. >> %OUTPUT%
        echo ==================== >> %OUTPUT%
        echo FILE: %%f >> %OUTPUT%
        echo ==================== >> %OUTPUT%
        type "%%f" >> %OUTPUT%
    )
)

echo. >> %OUTPUT%
echo ======================================== >> %OUTPUT%
echo [SQL FILES] >> %OUTPUT%
echo ======================================== >> %OUTPUT%
for /R %%f in (*.sql) do (
    echo %%f | findstr /v "node_modules" >nul 2>&1
    if not errorlevel 1 (
        echo --- %%f --- >> %OUTPUT%
        type "%%f" >> %OUTPUT%
    )
)

echo.
echo DONE! File saved: project_structure.txt
pause
