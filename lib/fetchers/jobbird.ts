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
  author?: string
}

const parser = new Parser<Record<string, unknown>, Item>({
  customFields: { item: ['dc:creator', 'creator', 'author'] },
  timeout: 10000,
})

export async function fetchJobbirdJobs(searchTerm: string): Promise<{
  external_id: string; source: string; title: string; company: string | null;
  location: string | null; description: string | null; url: string;
  salary_min: null; salary_max: null; posted_at: string | null;
  category: string; is_remote: boolean; language: string;
}[]> {
  const encoded = encodeURIComponent(searchTerm)
  // Jobbird — popular Dutch job board with broad coverage
  const url = `https://www.jobbird.com/nl/vacature/rss?q=${encoded}`

  try {
    const feed = await parser.parseURL(url)
    return (feed.items ?? []).slice(0, 20).map(item => {
      const title = item.title ?? 'Untitled'
      const description = item.content ?? item.contentSnippet ?? null
      const link = item.link ?? ''
      const guid = item.guid ?? link
      const company = item['dc:creator'] ?? item.creator ?? item.author ?? null

      return {
        external_id: `jobbird-${encodeURIComponent(guid).slice(0, 100)}`,
        source: 'jobbird',
        title,
        company,
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
    console.warn(`Jobbird fetch failed for "${searchTerm}":`, err)
    return []
  }
}
