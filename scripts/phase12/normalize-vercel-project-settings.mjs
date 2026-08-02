import fs from 'node:fs'
import path from 'node:path'

const projectId = process.env.VERCEL_PROJECT_ID?.trim()
const orgId = process.env.VERCEL_ORG_ID?.trim()
const projectFile = path.resolve(process.env.VERCEL_PROJECT_CONFIG_PATH || '.vercel/project.json')

if (!projectId || !orgId) throw new Error('VERCEL_PROJECT_ID and VERCEL_ORG_ID are required.')
if (!fs.existsSync(projectFile)) throw new Error(`Vercel project settings not found: ${projectFile}`)

const project = JSON.parse(fs.readFileSync(projectFile, 'utf8'))
if (project.projectId !== projectId || project.orgId !== orgId) {
  throw new Error('Pulled Vercel project identity does not match the approved environment configuration.')
}

project.settings = project.settings && typeof project.settings === 'object' ? project.settings : {}
project.settings.framework = 'nuxtjs'
project.settings.outputDirectory = null
fs.writeFileSync(projectFile, `${JSON.stringify(project, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'ok',
  framework: project.settings.framework,
  outputDirectory: project.settings.outputDirectory
}, null, 2))
