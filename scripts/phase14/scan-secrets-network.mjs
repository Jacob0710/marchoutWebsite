import { readdir, readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { findSensitiveMaterial, root } from './lib.mjs'

const walk = async directory => (await Promise.all((await readdir(directory, { withFileTypes: true })).map(async entry => entry.isDirectory() ? walk(resolve(directory, entry.name)) : resolve(directory, entry.name)))).flat()
const networkPattern = /(?:from\s+['"]node:(?:http|https|net|tls|dns|dgram)['"]|\bfetch\s*\(|@supabase\/supabase-js|createClient\s*\(|postgres(?:ql)?:\/\/|new\s+(?:WebSocket|EventSource)\s*\()/i
export const detectNetworkSource = source => networkPattern.test(source)

export const scanPhase14 = async () => {
  const scriptFiles = (await walk(resolve(root, 'scripts/phase14'))).filter(file => ['.mjs', '.js', '.ts'].includes(extname(file)))
  const networkFindings = []
  const secretFindings = []
  for (const file of scriptFiles.sort()) {
    const source = await readFile(file, 'utf8')
    if (detectNetworkSource(source) && !file.endsWith('scan-secrets-network.mjs')) networkFindings.push(file.replace(root, '').replaceAll('\\', '/'))
    for (const finding of findSensitiveMaterial(source)) secretFindings.push(`${file.replace(root, '').replaceAll('\\', '/')}:${finding}`)
  }
  return { networkFindings, secretFindings }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scan-secrets-network.mjs')) {
  const result = await scanPhase14()
  if (result.networkFindings.length || result.secretFindings.length) { console.error(JSON.stringify(result, null, 2)); process.exitCode = 1 }
  else console.log(JSON.stringify({ status: 'ok', productionNetworkPaths: 0, secretFindings: 0 }, null, 2))
}
