@echo off
echo =================================================
echo OBSIDIAN LINK PLUGIN DEPLOYMENT
echo =================================================

REM Set plugin directory
set "PLUGIN_DIR=X:/Obsidian/Link/content/.obsidian/plugins/linkplugin"

REM Build the plugin
echo Building plugin...
call npm run build

REM Clean the plugin directory (but preserve data.json)
echo Cleaning plugin directory...
if exist "%PLUGIN_DIR%" (
    echo Preserving data.json file...
    if exist "%PLUGIN_DIR%\data.json" (
        copy "%PLUGIN_DIR%\data.json" "%TEMP%\obsidian_plugin_data.json" /Y
    )
    del /Q "%PLUGIN_DIR%\main.js"
    del /Q "%PLUGIN_DIR%\manifest.json"
    del /Q "%PLUGIN_DIR%\styles.css"
    if exist "%TEMP%\obsidian_plugin_data.json" (
        copy "%TEMP%\obsidian_plugin_data.json" "%PLUGIN_DIR%\data.json" /Y
        del "%TEMP%\obsidian_plugin_data.json"
    )
) else (
    mkdir "%PLUGIN_DIR%"
)

REM Copy files to plugin directory
echo Copying files to plugin directory...
copy main.js "%PLUGIN_DIR%\"
copy manifest.json "%PLUGIN_DIR%\"
copy styles.css "%PLUGIN_DIR%\"

echo.
echo =================================================
echo Successfully deployed version 2.0.0
echo Don't forget to restart Obsidian to load the updated plugin
echo ================================================= 