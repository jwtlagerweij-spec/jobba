export type JobCategory =
  | 'data'
  | 'consulting'
  | 'ai-tech'
  | 'strategy'
  | 'education'
  | 'healthcare'
  | 'legal'
  | 'hr-recruitment'
  | 'social-work'
  | 'marketing'
  | 'finance'
  | 'sales'
  | 'it'
  | 'engineering'
  | 'other'

export function assignCategory(title: string, description: string): JobCategory {
  const text = (title + ' ' + description).toLowerCase()
  if (/\bai\b|artificial intelligence|machine learning|llm|nlp|generative/.test(text)) return 'ai-tech'
  if (/data|analyst|analist|sql|\bbi\b|tableau|power bi|databricks/.test(text)) return 'data'
  if (/software|developer|frontend|backend|fullstack|devops|cloud|sysadmin|webdeveloper|it-er|programmeur/.test(text)) return 'it'
  if (/docent|leraar|leerkracht|onderwijis|onderwijs|rector|schoolhoofd|trainer|opleiding|curriculum|pedagoog|didactiek/.test(text)) return 'education'
  if (/verpleeg|arts\b|dokter|huisarts|klinisch|medisch|zorgverlener|fysiotherap|psycholoog|psychiater|therapeut|apotheker|tandarts/.test(text)) return 'healthcare'
  if (/jurist|juridisch|legal\b|advocaat|paralegal|rechts|notaris|compliance officer|recht\b/.test(text)) return 'legal'
  if (/\bhr\b|recruiter|human resources|talent acquisition|p&o\b|personeels|arbeidsmarkt|employee experience|people operations/.test(text)) return 'hr-recruitment'
  if (/maatschappelijk werker|sociaal werker|jeugd|welzijn|hulpverlener|begeleider|zorgcoordinator|casemanager/.test(text)) return 'social-work'
  if (/marketing|communicatie\b|pr\b|reclame|campagne|branding|advertising|social media manager|content manager/.test(text)) return 'marketing'
  if (/accountant|controller|financieel|boekhouder|audit|fiscaal|treasury|\bcfo\b|crediteur|debiteuren/.test(text)) return 'finance'
  if (/sales|verkoop|account manager|business development|commercieel|acquisitie/.test(text)) return 'sales'
  if (/engineer|ingenieur|constructeur|werktuig|elektro|civiel|proces|maintenance/.test(text)) return 'engineering'
  if (/consult|advies|advisory|strategy|strateg/.test(text)) return 'consulting'
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
