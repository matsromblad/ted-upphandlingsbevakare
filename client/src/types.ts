export type FormType = 'competition' | 'planning' | 'result' | 'ALL';
export type DatePreset = '1d' | '7d' | '14d' | '30d' | '90d' | '365d' | 'custom';
export type TenderStatus = 'INBOX' | 'REVIEWING' | 'DECIDED_TO_BID' | 'PREPARING_BID' | 'SUBMITTED' | 'WON' | 'LOST' | 'ARCHIVED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface CpvItem {
  code: string;
  label: string;
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
  links?: {
    tedHtml?: string;
    tedPdf?: string;
    submission?: string;
    documents?: string;
    buyerProfile?: string;
  };
  raw?: any;
}

export interface NoticeFilters {
  keywords?: string;
  titleKeyword?: string;
  buyer?: string;
  countries?: string[];
  allCountries?: boolean;
  cpv?: string[];
  formType?: FormType;
  datePreset?: DatePreset;
  dateFrom?: string;
  rawQuery?: string;
}

export interface Watchlist {
  id: string;
  name: string;
  query?: string;
  filters_json?: string;
  filters?: NoticeFilters;
  active: number | boolean;
  interval_minutes: number;
  last_run_at?: string;
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

export interface AIAnalysis {
  fitScore: number;
  summary: string;
  keyRequirements: string[];
  opportunities: string[];
  risksAndChallenges: string[];
  recommendedBidStrategy: string;
  clarificationQuestions: string[];
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
