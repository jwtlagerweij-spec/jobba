export interface Sector {
  id: string
  label: string
  labelNl: string
  adzunaCategory: string
  keywords: string[]
}

export const SECTORS: Sector[] = [
  {
    id: 'education',
    label: 'Education',
    labelNl: 'Onderwijs',
    adzunaCategory: 'education',
    keywords: [
      'teacher', 'lecturer', 'rector', 'school principal', 'teaching assistant',
      'leraar', 'docent', 'rector', 'teamleider onderwijs', 'schoolleider',
      'leerkracht', 'onderwijzer', 'pedagoog', 'didacticus', 'opleidingsmanager',
    ],
  },
  {
    id: 'hr-recruitment',
    label: 'HR & Recruitment',
    labelNl: 'HR & Recruitment',
    adzunaCategory: 'hr-recruitment',
    keywords: [
      'HR advisor', 'recruiter', 'people operations', 'HR manager', 'talent acquisition',
      'P&O adviseur', 'HR business partner', 'personeelsadviseur', 'arbeidsmarktadviseur',
    ],
  },
  {
    id: 'healthcare',
    label: 'Healthcare & Medical',
    labelNl: 'Zorg & Medisch',
    adzunaCategory: 'healthcare-nursing',
    keywords: [
      'nurse', 'doctor', 'GP', 'physiotherapist', 'care coordinator',
      'verpleegkundige', 'arts', 'fysiotherapeut', 'huisarts', 'zorgcoordinator',
      'apotheker', 'tandarts', 'medisch specialist',
    ],
  },
  {
    id: 'social-work',
    label: 'Psychology & Social Work',
    labelNl: 'Psychologie & Sociaal Werk',
    adzunaCategory: 'social-work',
    keywords: [
      'psychologist', 'therapist', 'counselor', 'social worker', 'youth worker',
      'GZ-psycholoog', 'orthopedagoog', 'psycholoog', 'maatschappelijk werker',
      'jeugdhulpverlener', 'begeleider', 'hulpverlener',
    ],
  },
  {
    id: 'legal',
    label: 'Legal',
    labelNl: 'Juridisch',
    adzunaCategory: 'legal',
    keywords: [
      'lawyer', 'legal counsel', 'compliance', 'paralegal', 'notary',
      'jurist', 'advocaat', 'paralegal', 'compliance officer', 'notaris',
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Accounting',
    labelNl: 'Finance & Accounting',
    adzunaCategory: 'accounting-finance',
    keywords: [
      'accountant', 'financial controller', 'CFO', 'bookkeeper', 'auditor',
      'boekhouder', 'controller', 'financieel adviseur', 'fiscalist', 'treasurer',
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing & Communications',
    labelNl: 'Marketing & Communicatie',
    adzunaCategory: 'marketing-pr-advertising',
    keywords: [
      'marketeer', 'communications advisor', 'content strategist', 'social media manager',
      'communicatieadviseur', 'pr manager', 'marketing manager', 'campagnemanager',
    ],
  },
  {
    id: 'it',
    label: 'IT & Tech',
    labelNl: 'IT & Tech',
    adzunaCategory: 'it-jobs',
    keywords: [
      'developer', 'software engineer', 'product manager', 'UX designer', 'devops',
      'programmeur', 'it manager', 'frontend developer', 'backend developer',
    ],
  },
  {
    id: 'data',
    label: 'Data & Analytics',
    labelNl: 'Data & Analyse',
    adzunaCategory: 'it-jobs',
    keywords: [
      'data analyst', 'data scientist', 'business intelligence', 'BI developer',
      'data engineer', 'analist', 'databricks', 'power bi', 'tableau',
    ],
  },
  {
    id: 'consulting',
    label: 'Consultancy & Strategy',
    labelNl: 'Consultancy & Strategie',
    adzunaCategory: 'consultancy',
    keywords: [
      'consultant', 'strategy advisor', 'management consultant',
      'adviseur', 'strategisch adviseur', 'organisatieadviseur',
    ],
  },
  {
    id: 'ai-tech',
    label: 'AI & Machine Learning',
    labelNl: 'AI & Machine Learning',
    adzunaCategory: 'it-jobs',
    keywords: [
      'AI engineer', 'machine learning', 'LLM', 'NLP', 'data science',
      'kunstmatige intelligentie', 'generative AI',
    ],
  },
  {
    id: 'engineering',
    label: 'Engineering',
    labelNl: 'Techniek',
    adzunaCategory: 'engineering',
    keywords: [
      'engineer', 'mechanical engineer', 'civil engineer', 'process engineer',
      'ingenieur', 'werktuigbouwkundig', 'civiel ingenieur', 'constructeur',
    ],
  },
]

export const SECTOR_BY_ID = new Map(SECTORS.map(s => [s.id, s]))

// All sectors + "all" option for the filter sidebar
export const SECTOR_FILTER_OPTIONS = [
  { id: 'all', label: 'All sectors', labelNl: 'Alle sectoren' },
  ...SECTORS.map(s => ({ id: s.id, label: s.label, labelNl: s.labelNl })),
]
