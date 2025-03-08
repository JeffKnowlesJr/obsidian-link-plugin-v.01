@echo off
echo Cleaning and redeploying the Obsidian plugin...

set "PLUGIN_DIR=X:/Obsidian/Link/content/.obsidian/plugins/linkplugin"

REM Clean the target directory
echo Cleaning "%PLUGIN_DIR%"...
if exist "%PLUGIN_DIR%" (
    del /Q "%PLUGIN_DIR%\*"
) else (
    mkdir "%PLUGIN_DIR%"
)

REM Set deployment target and build
set "OBSIDIAN_PLUGIN_DIR=%PLUGIN_DIR%"
echo Building plugin...
npm run build

REM Deploy
echo Copying files to "%PLUGIN_DIR%"...
node deploy.mjs

echo Deployment complete!
echo Restart Obsidian to load the clean version of the plugin. 