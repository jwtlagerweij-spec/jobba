import Parser from 'rss-parser'
import { assignCategory, detectRemote, detectLanguage } from '@/lib/categorize'

type NVBItem = {
  title?: string
  link?: string
  pubDate?: string
  content?: string
  contentSnippet?: string
  guid?: string
  'dc:creator'?: string
  creator?: string
}

const parser = new Parser<Record<string, unknown>, NVBItem>({
  customFields: { item: ['dc:creator', 'creator'] },
  timeout: 10000,
})

export interface NVBFetchedJob {
  external_id: string
  source: 'nvb'
  title: string
  company: string | null
  location: string | null
  description: string | null
  url: string
  salary_min: number | null
  salary_max: number | null
  posted_at: string | null
  category: string
  is_remote: boolean
  language: string
}

export async function fetchNVBJobs(searchTerm: string): Promise<NVBFetchedJob[]> {
  const encodedTerm = encodeURIComponent(searchTerm)
  const url = `https://www.nationalevacaturebank.nl/vacatures/zoeken.rss?q=${encodedTerm}&land=nl`

  try {
    const feed = await parser.parseURL(url)
    return (feed.items ?? []).slice(0, 20).map(item => {
      const title = item.title ?? 'Untitled'
      const description = item.content ?? item.contentSnippet ?? null
      const link = item.link ?? ''
      const guid = item.guid ?? link

      // NVB often puts "Company - Location" in the creator or title suffix
      const creator = item['dc:creator'] ?? item.creator ?? null

      return {
        external_id: `nvb-${encodeURIComponent(guid).slice(0, 100)}`,
        source: 'nvb' as const,
        title,
        company: creator ?? null,
        location: null,
        description,
        url: link,
        salary_min: null,
        salary_max: null,
        posted_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
        category: assignCategory(title, description ?? ''),
        is_remote: detectRemote(title, description ?? ''),
        language: detectLanguage(description ?? ''),
      }
    })
  } catch (err) {
    console.warn(`NVB fetch failed for "${searchTerm}":`, err)
    return []
  }
}
