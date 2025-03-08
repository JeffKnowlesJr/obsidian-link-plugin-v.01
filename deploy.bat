@echo off
echo Deploying to Obsidian plugins folder...
set OBSIDIAN_PLUGIN_DIR=X:/Obsidian/Link/content/.obsidian/plugins/linkplugin
npm run build
node deploy.mjs
echo Deployment complete! 