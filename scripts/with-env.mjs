#!/usr/bin/env node
/**
 * with-env.mjs — loads .env (if present) into process.env, then runs the
 * given command. Keeps `npm run dev / db:push / db:seed` working without
 * any external dependency (Next.js auto-loads .env for the app itself,
 * but Prisma CLI and tsx scripts do not).
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

for (const candidate of ['.env', '.env.local']) {
  const file = resolve(root, candidate)
  if (!existsSync(file)) continue
  for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    // strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

const [cmd, ...args] = process.argv.slice(2)
if (!cmd) {
  console.error('with-env: no command given')
  process.exit(1)
}

const child = spawn(cmd, args, { stdio: 'inherit', env: process.env, shell: process.platform === 'win32' })
child.on('exit', (code) => process.exit(code ?? 1))
