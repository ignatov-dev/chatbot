/**
 * Local ingestion script — reads docs, chunks them, generates embeddings
 * via the Supabase embed Edge Function, and inserts into document_chunks.
 *
 * Usage: node scripts/ingest.mjs
 *
 * Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY in .env
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const DOCUMENTS = [
  'cryptopayx_api_documentation.txt',
  'deposit-and-withdrawals.txt',
  'verification.txt',
  'loyalty-program.txt',
  'questions.txt',
  'what_is_a_crypto_exchange.txt'
]

// Split by ===...SECTION: NAME...=== delimiters, then sub-chunk large sections
function splitIntoChunks(text) {
  // Extract section names and their content
  const sectionRegex = /={5,}\nSECTION:\s*(.+)\n={5,}/g
  const headers = []
  let m
  while ((m = sectionRegex.exec(text)) !== null) {
    headers.push({ name: m[1].trim(), end: m.index + m[0].length })
  }

  const sections = []
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].end
    const end = i + 1 < headers.length
      ? text.lastIndexOf('=', headers[i + 1].end - headers[i + 1].name.length - 20)
      : text.length
    const body = text.slice(start, end).trim()
    if (body.length > 0 && headers[i].name !== 'END OF DOCUMENT') {
      sections.push({ name: headers[i].name, body })
    }
  }

  // Fallback: if no sections found, split by double newlines
  if (sections.length === 0) {
    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => p.replace(/\n/g, ' ').trim())
      .filter((p) => p.length > 40)
    return paragraphs.length > 0 ? paragraphs : [text.trim()]
  }

  // Sub-chunk sections that exceed 1600 chars, prepend section name for context
  const chunks = []
  for (const { name, body } of sections) {
    const prefix = `[${name}]\n\n`
    if ((prefix + body).length <= 1600) {
      chunks.push(prefix + body)
      continue
    }
    const paragraphs = body
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
    let current = ''
    for (const para of paragraphs) {
      if ((prefix + current + '\n\n' + para).length > 1600 && current.length > 0) {
        chunks.push(prefix + current.trim())
        current = para
      } else {
        current = current ? current + '\n\n' + para : para
      }
    }
    if (current.trim().length > 0) chunks.push(prefix + current.trim())
  }

  return chunks
}

async function extractText(filePath) {
  if (filePath.endsWith('.txt')) {
    return fs.readFileSync(filePath, 'utf-8')
  }

  const { PDFParse } = await import('pdf-parse')
  const buffer = fs.readFileSync(filePath)
  const parsed = await new PDFParse({ data: buffer }).getText()
  return parsed.text
}

async function getEmbedding(text) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
    },
    body: JSON.stringify({ text }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Embed failed: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.embedding
}

async function main() {
  const force = process.argv.includes('--force')
  const fileArg = process.argv.find((a) => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1])
  const docsDir = path.join(__dirname, '..', 'docs')

  if (fileArg && !DOCUMENTS.includes(fileArg)) {
    console.error(`Unknown document: "${fileArg}"\nAvailable: ${DOCUMENTS.join(', ')}`)
    process.exit(1)
  }

  const targets = fileArg ? [fileArg] : DOCUMENTS

  for (const filename of targets) {
    const filePath = path.join(docsDir, filename)

    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: "${filename}" not found — skipping`)
      continue
    }

    // Check if already ingested
    const { count } = await supabase
      .from('document_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('source', filename)

    if (count && count > 0) {
      if (!force) {
        console.log(`"${filename}" already ingested (${count} chunks) — skipping`)
        continue
      }
      console.log(`"${filename}" has ${count} chunks — deleting for re-ingestion...`)
      const { error: delError } = await supabase
        .from('document_chunks')
        .delete()
        .eq('source', filename)
      if (delError) throw delError
    }

    console.log(`Extracting text from "${filename}"...`)
    const text = await extractText(filePath)
    console.log(`Extracted ${text.length} characters`)

    const chunks = splitIntoChunks(text)
    console.log(`Split into ${chunks.length} chunks`)

    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i]

      // Generate embedding via edge function (one at a time to stay within compute limits)
      const embedding = await getEmbedding(chunkContent)

      const { error } = await supabase
        .from('document_chunks')
        .insert({
          source: filename,
          chunk_index: i,
          content: chunkContent,
          embedding: JSON.stringify(embedding),
        })

      if (error) throw error
      process.stdout.write(`\r  Chunk ${i + 1}/${chunks.length}`)
    }

    console.log(`\n  Done: "${filename}" — ${chunks.length} chunks ingested`)
  }

  console.log('\nAll documents ingested!')
}

main().catch((err) => {
  console.error('Ingestion failed:', err)
  process.exit(1)
})
