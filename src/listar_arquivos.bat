@echo off
chcp 65001 >nul

echo Gerando mapa...
echo.

> mapa.txt (
    call :listar "%cd%" 0
)

echo Mapa criado em mapa.txt
exit /b

:listar
setlocal

set "caminho=%~1"
set "nivel=%2"

for %%a in ("%caminho%") do echo %%~na

for /d %%d in ("%caminho%\*") do (
    set /a nivel2=%nivel%+1
    set "prefixo="
    for /l %%i in (1,1,%nivel2%) do set "prefixo=!prefixo!-----"

    echo !prefixo!%%~nd

    call :listar "%%d" %nivel2%
)

for %%f in ("%caminho%\*") do (
    if not "%%~xff"=="" (
        if not "%%~xff"=="." (
            if not "%%~xff"==".." (
                set /a nivel3=%nivel%+2
                set "prefixo2="
                for /l %%i in (1,1,%nivel3%) do set "prefixo2=!prefixo2!_____"

                echo !prefixo2!%%~nxf
            )
        )
    )
)

endlocal
exit /b
