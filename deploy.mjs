import { copyFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Use environment variable or default to ./dist
// For Obsidian, you can set it to your Obsidian vault plugins folder
// e.g., OBSIDIAN_PLUGIN_DIR=C:/Users/YourName/Documents/.obsidian/plugins/obsidian-link-plugin
const targetDir = process.env.OBSIDIAN_PLUGIN_DIR || './dist'
const pluginFiles = ['main.js', 'manifest.json', 'styles.css']

async function deployPlugin() {
  console.log('Deploying plugin...')

  // Create target directory if it doesn't exist and we're using the default
  if (!existsSync(targetDir)) {
    console.log(`Creating directory ${targetDir}...`)
    await mkdir(targetDir, { recursive: true })
  }

  for (const file of pluginFiles) {
    try {
      await copyFile(file, join(targetDir, file))
      console.log(`Copied ${file} to ${targetDir}`)
    } catch (err) {
      console.error(`Error copying ${file}:`, err)
    }
  }
  console.log('Deployment complete!')
}

deployPlugin()
