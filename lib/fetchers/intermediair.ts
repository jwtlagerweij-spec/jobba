import Parser from 'rss-parser'
import { assignCategory, detectRemote, detectLanguage } from '@/lib/categorize'

type Item = {
  title?: string
  link?: string
  pubDate?: string
  content?: string
  contentSnippet?: string
  guid?: string
  'dc:creator'?: string
  creator?: string
}

const parser = new Parser<Record<string, unknown>, Item>({
  customFields: { item: ['dc:creator', 'creator'] },
  timeout: 10000,
})

export async function fetchIntermediairJobs(searchTerm: string): Promise<{
  external_id: string; source: string; title: string; company: string | null;
  location: string | null; description: string | null; url: string;
  salary_min: null; salary_max: null; posted_at: string | null;
  category: string; is_remote: boolean; language: string;
}[]> {
  const encoded = encodeURIComponent(searchTerm)
  // Intermediair RSS — targets higher-educated Dutch professionals (HBO/WO)
  const url = `https://www.intermediair.nl/vacatures.rss?q=${encoded}`

  try {
    const feed = await parser.parseURL(url)
    return (feed.items ?? []).slice(0, 20).map(item => {
      const title = item.title ?? 'Untitled'
      const description = item.content ?? item.contentSnippet ?? null
      const link = item.link ?? ''
      const guid = item.guid ?? link
      const creator = item['dc:creator'] ?? item.creator ?? null

      return {
        external_id: `intermediair-${encodeURIComponent(guid).slice(0, 100)}`,
        source: 'intermediair',
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
    console.warn(`Intermediair fetch failed for "${searchTerm}":`, err)
    return []
  }
}
