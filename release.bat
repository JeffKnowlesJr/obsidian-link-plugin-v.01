@echo off
echo =================================================
echo OBSIDIAN LINK PLUGIN RELEASE PROCESS
echo =================================================

REM Set plugin directory
set "PLUGIN_DIR=X:/Obsidian/Link/content/.obsidian/plugins/linkplugin"

REM Prompt for version type
set /p VERSION_TYPE="Enter version type (patch, minor, major) [patch]: "
if "%VERSION_TYPE%"=="" set VERSION_TYPE=patch
if not "%VERSION_TYPE%"=="patch" if not "%VERSION_TYPE%"=="minor" if not "%VERSION_TYPE%"=="major" (
    echo Invalid version type: %VERSION_TYPE%. Using 'patch'
    set VERSION_TYPE=patch
)

REM Get current version from package.json (requires node)
for /f "tokens=*" %%a in ('node -e "const pkg = require('./package.json'); console.log(pkg.version);"') do set CURRENT_VERSION=%%a
echo Current version: %CURRENT_VERSION%

REM Calculate new version (requires node)
for /f "tokens=*" %%a in ('node -e "const v = '%CURRENT_VERSION%'.split('.'); let [major, minor, patch] = v; if ('%VERSION_TYPE%' === 'major') { major++; minor=0; patch=0; } else if ('%VERSION_TYPE%' === 'minor') { minor++; patch=0; } else { patch++; } console.log(`${major}.${minor}.${patch}`);"') do set NEW_VERSION=%%a
echo New version: %NEW_VERSION%

REM Get changelog entries
echo.
echo Enter changes for the changelog (one per line, prefix with category)
echo Example: "Fixed: Resolved issue with links"
echo Enter 'done' when finished.
echo.

set CHANGELOG_ADDITIONS=

:changelog_loop
set /p ENTRY="Changelog entry (or 'done' to finish): "
if "%ENTRY%"=="done" goto :end_changelog
set CHANGELOG_ADDITIONS=%CHANGELOG_ADDITIONS%- %ENTRY%\n
goto :changelog_loop

:end_changelog

REM Update version in package.json and manifest.json
echo Updating version in package.json and manifest.json...
node -e "const fs = require('fs'); let pkg = require('./package.json'); pkg.version = '%NEW_VERSION%'; fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));"
node -e "const fs = require('fs'); let manifest = require('./manifest.json'); manifest.version = '%NEW_VERSION%'; fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));"

REM Update changelog
echo Updating CHANGELOG.md...
node -e "const fs = require('fs'); const changelog = fs.readFileSync('CHANGELOG.md', 'utf8'); const today = new Date().toISOString().split('T')[0]; const newEntry = `## [%NEW_VERSION%] - ${today}\n\n%CHANGELOG_ADDITIONS%\n`; const updatedChangelog = changelog.replace(/(# Changelog.*?\n\n)/s, '$1' + newEntry); fs.writeFileSync('CHANGELOG.md', updatedChangelog);"

REM Commit changes
echo Committing changes to git...
git add CHANGELOG.md package.json manifest.json
git commit -m "Bump version to %NEW_VERSION% and update changelog"

REM Build the plugin
echo Building plugin...
call npm run build

REM Clean the plugin directory
echo Cleaning plugin directory...
if exist "%PLUGIN_DIR%" (
    del /Q "%PLUGIN_DIR%\*"
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
echo Successfully released version %NEW_VERSION%
echo Don't forget to restart Obsidian to load the updated plugin
echo ================================================= 