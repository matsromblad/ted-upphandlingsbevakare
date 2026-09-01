export type FormType = 'competition' | 'planning' | 'result' | 'ALL';
export type DatePreset = '1d' | '7d' | '14d' | '30d' | '90d' | '365d' | 'all' | 'custom';
export type TenderStatus = 'INBOX' | 'REVIEWING' | 'DECIDED_TO_BID' | 'PREPARING_BID' | 'SUBMITTED' | 'WON' | 'LOST' | 'ARCHIVED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type WatchlistEmailFrequency = 'daily' | 'weekly';

export interface CpvItem {
  code: string;
  label: string;
}

export interface KeyTermGlossary {
  term: string;
  translation: string;
  explanation: string;
}

export interface NoticeTranslation {
  translatedTitle: string;
  translatedDescription: string;
  executiveSummary?: string[];
  detectedLanguage?: string;
  languageCode?: string;
  submissionLanguageNote?: string;
  keyTerms?: KeyTermGlossary[];
  translatedAt?: string;
}

export interface Notice {
  id: string;
  publicationNumber: string;
  title: string;
  description: string;
  buyer: string;
  city?: string;
  country?: string;
  cpvList?: string[];
  cpvDetails?: CpvItem[];
  publicationDate?: string;
  deadline?: string;
  daysRemaining?: number | null;
  deadlineStatus?: 'OPEN' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNKNOWN';
  formType?: string;
  estimatedValue?: string;
  estimatedValueAmount?: number | null;
  estimatedValueCurrency?: string;
  estimatedValueFormatted?: string;
  estimatedValueDisplay?: string;
  portalName?: string;
  isForeign?: boolean;
  originalLanguage?: string;
  availableLanguages?: string[];
  translation?: NoticeTranslation;
  links?: {
    tedHtml?: string;
    tedPdf?: string;
    submission?: string;
    documents?: string;
    buyerProfile?: string;
    portalName?: string;
  };
  raw?: any;
}

export interface NoticeFilters {
  keywords?: string;
  excludeKeywords?: string;
  titleKeyword?: string;
  buyer?: string;
  countries?: string[];
  allCountries?: boolean;
  cpv?: string[];
  formType?: FormType;
  datePreset?: DatePreset;
  dateFrom?: string;
  rawQuery?: string;
  onlyActive?: boolean;
  includeExpired?: boolean;
}

export interface Watchlist {
  id: string;
  name: string;
  query?: string;
  filters_json?: string;
  filters?: NoticeFilters;
  active: number | boolean;
  interval_minutes: number;
   email_frequency: WatchlistEmailFrequency;
  last_run_at?: string;
   last_email_sent_at?: string;
  last_hit_count: number;
  new_count: number;
  created_at: string;
}

export interface WatchlistHit {
  id: string;
  watchlist_id: string;
  watchlist_name?: string;
  notice_id: string;
  notice_data_json?: string;
  notice?: Notice;
  is_read: number | boolean;
  is_saved?: number | boolean;
  discovered_at: string;
}

export interface ParsedDocument {
  name: string;
  category: string;
  size: number;
  charCount?: number;
  preview?: string;
}

export interface CvSearchSummary {
  fileNames: string[];
  profilesIdentified: string[];
  skills: string[];
  experienceHighlights?: string[];
  suggestedRoles?: string[];
  explanation: string;
  suggestedWatchlistName?: string;
}

export interface RequestedRole {
  role: string;
  requirements: string;
}

export interface AIAnalysis {
  fitScore: number;
  summary: string;
  keyRequirements: string[];
  opportunities: string[];
  risksAndChallenges: string[];
  recommendedBidStrategy: string;
  clarificationQuestions: string[];
  // Fördjupad anbudsanalys
  requestedRoles?: (RequestedRole | string)[];
  estimatedValueOrBudget?: string;
  projectDuration?: string;
  standardContractTerms?: string;
  requiredSubmissionDocuments?: string[];
  // Dokumentförankrad analys
  isDocumentGrounded?: boolean;
  documentSources?: string[];
  evaluationModel?: string;
}

export interface SavedTender {
  id: string;
  notice_id: string;
  title: string;
  buyer: string;
  country: string;
  deadline?: string;
  estimated_value?: string;
  status: TenderStatus;
  priority: Priority;
  notes: string;
  internal_deadline?: string;
  assigned_to?: string;
  tags_json?: string;
  tags?: string[];
  notice_data_json?: string;
  notice?: Notice;
  ai_analysis_json?: string;
  aiAnalysis?: AIAnalysis | null;
  translation_json?: string;
  translation?: NoticeTranslation | null;
  saved_at: string;
  updated_at: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  description: string;
  keywords: string;
  preferred_cpv: string[];
  preferred_countries: string[];
  min_value: number;
  role?: 'admin' | 'user';
  email?: string;
  fullName?: string;
  updated_at?: string;
}

export interface ChatMessage {
  id: string;
  session_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  context_notice_id?: string;
  created_at?: string;
}

export interface CpvSubcategory {
  code: string;
  nameSwe: string;
}

export interface CpvCategory {
  code: string;
  division: string;
  nameSwe: string;
  nameEng: string;
  icon: string;
  subcategories: CpvSubcategory[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role?: string;
  source?: 'registered' | 'team_member' | 'history';
  lastActiveAt?: string;
}

export interface AdminStats {
  usersCount: number;
  totalWatchlists: number;
  activeWatchlists: number;
  totalHits: number;
  unreadHits: number;
  savedTenders: number;
  chatMessages: number;
  hiddenNotices: number;
  dbMode: string;
}

export interface ServiceHealth {
  status: 'online' | 'degraded' | 'offline' | 'configured' | 'unconfigured' | 'not_configured' | 'error';
  latencyMs?: number;
  endpoint?: string;
  model?: string;
  mode?: string;
  error?: string | null;
  totalAvailable?: number;
  activeCount?: number;
  apiUrl?: string;
  fromEmail?: string;
  fromName?: string;
  category?: string;
  counts?: AdminStats;
}

export interface SystemHealthResponse {
  success: boolean;
  services: {
    ted?: ServiceHealth;
    magnit?: ServiceHealth;
    verama?: ServiceHealth;
    minimax?: ServiceHealth;
    database?: ServiceHealth;
    mailtrap?: ServiceHealth;
  };
  timestamp: string;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  companyName: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastActiveAt?: string;
  watchlistsCount: number;
  hitsCount: number;
  tendersCount: number;
}

export interface AdminWatchlist {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  companyName?: string;
  name: string;
  query?: string;
  filters: NoticeFilters;
  active: boolean;
  intervalMinutes: number;
  emailFrequency: WatchlistEmailFrequency;
  lastEmailSentAt?: string;
  lastRunAt?: string;
  lastHitCount: number;
  newCount: number;
  createdAt: string;
}

export interface EmailStatusInfo {
  configured: boolean;
  apiUrl: string;
  fromEmail: string;
  fromName: string;
  category: string;
  totalUnreadHits: number;
  activeWatchlistsCount: number;
}

