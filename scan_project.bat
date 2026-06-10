@echo off
chcp 65001 >nul
echo Scanning project structure...

set OUTPUT=project_structure.txt

echo ======================================== > %OUTPUT%
echo EXPOHUB PROJECT STRUCTURE >> %OUTPUT%
echo Generated: %date% %time% >> %OUTPUT%
echo ======================================== >> %OUTPUT%
echo. >> %OUTPUT%

echo [FOLDER TREE] >> %OUTPUT%
tree /F /A >> %OUTPUT%

echo. >> %OUTPUT%
echo ======================================== >> %OUTPUT%
echo [PACKAGE.JSON] >> %OUTPUT%
echo ======================================== >> %OUTPUT%
if exist package.json (
    type package.json >> %OUTPUT%
) else (
    echo NOT FOUND >> %OUTPUT%
)

echo. >> %OUTPUT%
echo ======================================== >> %OUTPUT%
echo [APP.JSON / EXPO CONFIG] >> %OUTPUT%
echo ======================================== >> %OUTPUT%
if exist app.json (
    type app.json >> %OUTPUT%
) else (
    echo NOT FOUND >> %OUTPUT%
)

echo. >> %OUTPUT%
echo ======================================== >> %OUTPUT%
echo [TSCONFIG] >> %OUTPUT%
echo ======================================== >> %OUTPUT%
if exist tsconfig.json (
    type tsconfig.json >> %OUTPUT%
) else (
    echo NOT FOUND >> %OUTPUT%
)

echo. >> %OUTPUT%
echo ======================================== >> %OUTPUT%
echo [APP ENTRY / LAYOUT FILES] >> %OUTPUT%
echo ======================================== >> %OUTPUT%
for %%f in (App.tsx index.ts index.tsx app\_layout.tsx app\index.tsx) do (
    if exist %%f (
        echo --- %%f --- >> %OUTPUT%
        type %%f >> %OUTPUT%
        echo. >> %OUTPUT%
    )
)

echo. >> %OUTPUT%
echo ======================================== >> %OUTPUT%
echo [ALL .tsx AND .ts FILES] >> %OUTPUT%
echo ======================================== >> %OUTPUT%
for /R %%f in (*.tsx *.ts) do (
    echo. >> %OUTPUT%
    echo ==================== >> %OUTPUT%
    echo FILE: %%f >> %OUTPUT%
    echo ==================== >> %OUTPUT%
    type "%%f" >> %OUTPUT%
)

echo. >> %OUTPUT%
echo ======================================== >> %OUTPUT%
echo [SQL / MIGRATIONS] >> %OUTPUT%
echo ======================================== >> %OUTPUT%
for /R %%f in (*.sql) do (
    echo. >> %OUTPUT%
    echo --- %%f --- >> %OUTPUT%
    type "%%f" >> %OUTPUT%
)

echo. >> %OUTPUT%
echo ======================================== >> %OUTPUT%
echo [.ENV FILES] >> %OUTPUT%
echo ======================================== >> %OUTPUT%
for %%f in (.env .env.example .env.local) do (
    if exist %%f (
        echo --- %%f --- >> %OUTPUT%
        type %%f >> %OUTPUT%
    )
)

echo.
echo ======================================== 
echo DONE! File saved: %OUTPUT%
echo Drag and drop it to Claude
echo ========================================
pause
