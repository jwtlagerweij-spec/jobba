export type JobCategory = 'data' | 'consulting' | 'ai-tech' | 'strategy' | 'other'

export function assignCategory(title: string, description: string): JobCategory {
  const text = (title + ' ' + description).toLowerCase()
  if (/data|analyst|analist|sql|\bbi\b|tableau|power bi|databricks/.test(text)) return 'data'
  if (/consult|advies|advisory|strategy|strateg/.test(text)) return 'consulting'
  if (/\bai\b|artificial intelligence|machine learning|llm|nlp|generative/.test(text)) return 'ai-tech'
  if (/product|digital|innovation|transformati|change/.test(text)) return 'strategy'
  return 'other'
}

export function detectRemote(title: string, description: string): boolean {
  const text = (title + ' ' + description).toLowerCase()
  return /remote|thuiswerk|hybri/.test(text)
}

export function detectLanguage(description: string): 'nl' | 'en' {
  const nlWords = /\b(de|het|een|van|en|voor|met|op|is|dat|dit)\b/g
  const enWords = /\b(the|and|for|with|you|our|your|we|are|this)\b/g
  const nlCount = (description.match(nlWords) || []).length
  const enCount = (description.match(enWords) || []).length
  return nlCount >= enCount ? 'nl' : 'en'
}
