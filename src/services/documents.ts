import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export async function fetchAvailableSources(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_available_sources')
  if (error) throw error
  return (data ?? []).map((row: { source: string }) => row.source)
}

export async function ingestDocument(
  source: string,
  content: string,
  force?: boolean,
): Promise<{ message: string; chunks: number }> {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch(`${SUPABASE_URL}/functions/v1/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify({ source, content, force }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Ingestion failed')
  return data
}

export async function formatDocument(content: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch(`${SUPABASE_URL}/functions/v1/format-document`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify({ content }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Formatting failed')
  return data.formatted
}

export async function deleteDocument(source: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch(`${SUPABASE_URL}/functions/v1/ingest`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify({ source }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? 'Delete failed')
  }
}

export interface PreviewChunk {
  title: string
  content: string
}

/** Strip ===...SECTION...=== delimiter lines from text */
function stripDelimiters(text: string): string {
  return text.replace(/={5,}(?:\nSECTION:\s*.+\n={5,}|[ \t]*)/g, '').trim()
}

/** Port of scripts/ingest.mjs splitIntoChunks — section-aware chunking for preview */
export function splitIntoChunks(text: string): PreviewChunk[] {
  const sectionRegex = /={5,}\nSECTION:\s*(.+)\n={5,}/g
  const headers: { name: string; end: number }[] = []
  let m: RegExpExecArray | null
  while ((m = sectionRegex.exec(text)) !== null) {
    headers.push({ name: m[1].trim(), end: m.index + m[0].length })
  }

  const sections: { name: string; body: string }[] = []
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].end
    const end = i + 1 < headers.length
      ? text.lastIndexOf('=', headers[i + 1].end - headers[i + 1].name.length - 20)
      : text.length
    const body = stripDelimiters(text.slice(start, end))
    if (body.length > 0 && headers[i].name !== 'END OF DOCUMENT') {
      sections.push({ name: headers[i].name, body })
    }
  }

  if (sections.length === 0) {
    const cleaned = stripDelimiters(text)
    const paragraphs = cleaned
      .split(/\n{2,}/)
      .map((p) => p.replace(/\n/g, ' ').trim())
      .filter((p) => p.length > 40)
    const raw = paragraphs.length > 0 ? paragraphs : [cleaned]
    return raw.map((p, i) => ({ title: `Section ${i + 1}`, content: p }))
  }

  const chunks: PreviewChunk[] = []
  for (const { name, body } of sections) {
    const prefix = `[${name}]\n\n`
    if ((prefix + body).length <= 1600) {
      chunks.push({ title: name, content: body })
      continue
    }
    const paragraphs = body
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
    let current = ''
    let part = 1
    for (const para of paragraphs) {
      if ((prefix + current + '\n\n' + para).length > 1600 && current.length > 0) {
        chunks.push({ title: `${name} (${part})`, content: current.trim() })
        current = para
        part++
      } else {
        current = current ? current + '\n\n' + para : para
      }
    }
    if (current.trim().length > 0) {
      chunks.push({ title: part > 1 ? `${name} (${part})` : name, content: current.trim() })
    }
  }
  return chunks
}
