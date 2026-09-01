import {
  Notice,
  NoticeFilters,
  Watchlist,
  WatchlistEmailFrequency,
  WatchlistHit,
  SavedTender,
  CompanyProfile,
  ChatMessage,
  AIAnalysis,
  ParsedDocument,
  CvSearchSummary,
  CpvCategory,
  TeamMember,
  AdminStats,
  AdminUser,
  AdminWatchlist,
  SystemHealthResponse,
  EmailStatusInfo
} from './types';
import { getAccessToken } from './supabaseClient';

const API_BASE = '/api';

/**
 * Helper to generate fetch headers including optional Supabase Bearer token
 */
async function getHeaders(customHeaders: Record<string, string> = {}): Promise<HeadersInit> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Search TED
  searchTed: async (filters: NoticeFilters, page = 1, limit = 20, signal?: AbortSignal): Promise<{
    success: boolean;
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
    notices: Notice[];
    query: string;
    error?: string;
  }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/ted/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ filters, page, limit }),
      signal
    });
    return res.json();
  },

  getNoticeById: async (id: string): Promise<{ success: boolean; notice?: Notice; error?: string }> => {
    const res = await fetch(`${API_BASE}/ted/notice/${encodeURIComponent(id)}`);
    return res.json();
  },

  // AI Smart Search
  smartSearch: async (prompt: string): Promise<{
    success: boolean;
    filters: NoticeFilters & { explanation?: string; suggestedWatchlistName?: string };
    tedQuery: string;
    error?: string;
  }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/ai/smart-search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt })
    });
    return res.json();
  },

  // AI CV Search (Match tenders from uploaded CVs)
  cvSearch: async (
    files: File[],
    prompt = '',
    countries: string[] = ['SWE']
  ): Promise<{
    success: boolean;
    filters?: NoticeFilters & { explanation?: string; suggestedWatchlistName?: string };
    tedQuery?: string;
    cvSummary?: CvSearchSummary;
    parsedDocuments?: Array<{ name: string; size: number; charCount?: number }>;
    error?: string;
  }> => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    if (prompt) {
      formData.append('prompt', prompt);
    }
    if (countries && countries.length > 0) {
      formData.append('countries', JSON.stringify(countries));
    }

    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/ai/cv-search`, {
      method: 'POST',
      headers,
      body: formData
    });
    return res.json();
  },

  // AI Analyze Notice
  analyzeNotice: async (notice: Notice): Promise<{ success: boolean; analysis?: AIAnalysis; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/ai/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ notice })
    });
    return res.json();
  },

  // AI Analyze Notice with Uploaded Documents (ZIP, PDF, DOCX, XLSX)
  analyzeNoticeWithDocuments: async (
    notice: Notice,
    files: File[]
  ): Promise<{
    success: boolean;
    analysis?: AIAnalysis;
    parsedDocuments?: ParsedDocument[];
    documentCount?: number;
    error?: string;
  }> => {
    const authHeaders = await getHeaders();
    const headers: Record<string, string> = {};
    if (authHeaders['Authorization']) {
      headers['Authorization'] = authHeaders['Authorization'];
    }

    const formData = new FormData();
    formData.append('notice', JSON.stringify(notice));
    for (const file of files) {
      formData.append('files', file);
    }

    const res = await fetch(`${API_BASE}/ai/analyze-documents`, {
      method: 'POST',
      headers,
      body: formData
    });
    return res.json();
  },

  // AI Chat
  sendChatMessage: async (message: string, context: { currentNotice?: Notice | null; searchState?: any } = {}, sessionId = 'default'): Promise<{
    success: boolean;
    reply: string;
    messageId: string;
    error?: string;
  }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, context, sessionId })
    });
    return res.json();
  },

  getChatHistory: async (sessionId = 'default'): Promise<{ success: boolean; messages: ChatMessage[] }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/ai/chat/history?sessionId=${encodeURIComponent(sessionId)}`, {
      headers
    });
    return res.json();
  },

  clearChatHistory: async (sessionId = 'default'): Promise<{ success: boolean }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/ai/chat/history?sessionId=${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      headers
    });
    return res.json();
  },

  // Watchlists
  getWatchlists: async (): Promise<{ success: boolean; watchlists: Watchlist[]; unreadCount: number }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/watchlists`, { headers });
    return res.json();
  },

  createWatchlist: async (data: { name: string; filters: NoticeFilters; emailFrequency: WatchlistEmailFrequency }): Promise<{
    success: boolean;
    watchlist: Watchlist;
    error?: string;
  }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/watchlists`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateWatchlist: async (id: string, data: { name?: string; filters?: NoticeFilters; active?: boolean; emailFrequency?: WatchlistEmailFrequency }): Promise<{
    success: boolean;
    watchlist: Watchlist;
    error?: string;
  }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/watchlists/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    return res.json();
  },

  deleteWatchlist: async (id: string): Promise<{ success: boolean }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/watchlists/${id}`, {
      method: 'DELETE',
      headers
    });
    return res.json();
  },

  runWatchlist: async (id: string): Promise<{ success: boolean; totalFound: number; newHits: number }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/watchlists/${id}/run`, {
      method: 'POST',
      headers
    });
    return res.json();
  },

  runAllWatchlists: async (): Promise<{ success: boolean; results: any[] }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/watchlists/run-all`, {
      method: 'POST',
      headers
    });
    return res.json();
  },

  getWatchlistHits: async (id: string): Promise<{ success: boolean; hits: WatchlistHit[] }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/watchlists/${id}/hits`, { headers });
    return res.json();
  },

  getRecentHits: async (limit = 100): Promise<{ success: boolean; hits: WatchlistHit[] }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/watchlists-hits/recent?limit=${limit}`, { headers });
    return res.json();
  },

  markHitRead: async (hitId: string): Promise<{ success: boolean }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/watchlists/hits/${hitId}/read`, {
      method: 'PUT',
      headers
    });
    return res.json();
  },

  markAllHitsRead: async (watchlistId?: string): Promise<{ success: boolean }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/watchlists/hits/mark-all-read`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ watchlistId })
    });
    return res.json();
  },

  // Pipeline
  getPipeline: async (): Promise<{ success: boolean; tenders: SavedTender[] }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/pipeline`, { headers });
    return res.json();
  },

  saveToPipeline: async (notice: Notice, options: {
    status?: string;
    priority?: string;
    notes?: string;
    internalDeadline?: string | null;
    assignedTo?: string;
    tags?: string[];
  } = {}): Promise<{ success: boolean; tender: SavedTender; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/pipeline`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ notice, ...options })
    });
    return res.json();
  },

  updatePipelineStatus: async (id: string, status: string): Promise<{ success: boolean; tender: SavedTender }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/pipeline/${id}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  updatePipelineDetails: async (id: string, data: {
    notes?: string;
    internalDeadline?: string | null;
    priority?: string;
    assignedTo?: string;
    tags?: string[];
  }): Promise<{ success: boolean; tender: SavedTender }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/pipeline/${id}/details`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    return res.json();
  },

  deleteFromPipeline: async (id: string): Promise<{ success: boolean }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/pipeline/${id}`, {
      method: 'DELETE',
      headers
    });
    return res.json();
  },

  // Profile & CPV
  getProfile: async (): Promise<{ success: boolean; profile: CompanyProfile }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/profile`, { headers });
    return res.json();
  },

  updateProfile: async (profile: Partial<CompanyProfile>): Promise<{ success: boolean; profile: CompanyProfile }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(profile)
    });
    return res.json();
  },

  getCpvCategories: async (q = ''): Promise<{ success: boolean; categories: CpvCategory[] }> => {
    const res = await fetch(`${API_BASE}/cpv?q=${encodeURIComponent(q)}`);
    return res.json();
  },

  getActiveUsers: async (): Promise<{ success: boolean; users: TeamMember[]; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/users/active`, { headers });
    return res.json();
  },

  getTeamMembers: async (): Promise<{ success: boolean; members: TeamMember[]; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/team-members`, { headers });
    return res.json();
  },

  addTeamMember: async (member: { name: string; email?: string; role?: string }): Promise<{ success: boolean; member?: TeamMember; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/team-members`, {
      method: 'POST',
      headers,
      body: JSON.stringify(member)
    });
    return res.json();
  },

  deleteTeamMember: async (id: string): Promise<{ success: boolean; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/team-members/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers
    });
    return res.json();
  },

  // Hidden Notices (User-Dismissed)
  getHiddenNotices: async (): Promise<{ success: boolean; hiddenNotices: string[]; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/hidden-notices`, { headers });
    return res.json();
  },

  hideNotice: async (noticeId: string, reason = 'dismissed'): Promise<{ success: boolean; noticeId?: string; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/hidden-notices`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ noticeId, reason })
    });
    return res.json();
  },

  unhideNotice: async (noticeId: string): Promise<{ success: boolean; noticeId?: string; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/hidden-notices/${encodeURIComponent(noticeId)}`, {
      method: 'DELETE',
      headers
    });
    return res.json();
  },

  // ==========================================
  // Admin Methods
  // ==========================================
  adminGetStats: async (): Promise<{ success: boolean; stats: AdminStats; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/stats`, { headers });
    return res.json();
  },

  adminGetHealth: async (): Promise<SystemHealthResponse & { error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/health`, { headers });
    return res.json();
  },

  adminGetUsers: async (): Promise<{ success: boolean; users: AdminUser[]; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/users`, { headers });
    return res.json();
  },

  adminCreateUser: async (data: { email: string; password?: string; fullName?: string; companyName?: string; role?: 'admin' | 'user' }): Promise<{ success: boolean; userId?: string; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return res.json();
  },

  adminUpdateUserRole: async (userId: string, role: 'admin' | 'user'): Promise<{ success: boolean; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(userId)}/role`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ role })
    });
    return res.json();
  },

  adminUpdateUserProfile: async (userId: string, data: Partial<AdminUser>): Promise<{ success: boolean; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(userId)}/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    return res.json();
  },

  adminDeleteUser: async (userId: string): Promise<{ success: boolean; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers
    });
    return res.json();
  },

  adminGetWatchlists: async (): Promise<{ success: boolean; watchlists: AdminWatchlist[]; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/watchlists`, { headers });
    return res.json();
  },

  adminRunWatchlist: async (id: string): Promise<{ success: boolean; result?: any; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/watchlists/${encodeURIComponent(id)}/run`, {
      method: 'POST',
      headers
    });
    return res.json();
  },

  adminToggleWatchlist: async (id: string, active: boolean): Promise<{ success: boolean; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/watchlists/${encodeURIComponent(id)}/toggle`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ active })
    });
    return res.json();
  },

  adminDeleteWatchlist: async (id: string): Promise<{ success: boolean; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/watchlists/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers
    });
    return res.json();
  },

  adminRunCron: async (): Promise<{ success: boolean; count?: number; results?: any[]; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/cron/run`, {
      method: 'POST',
      headers
    });
    return res.json();
  },

  adminGetEmailStatus: async (): Promise<EmailStatusInfo & { success: boolean; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/email/status`, { headers });
    return res.json();
  },

  adminSendTestEmail: async (targetEmail: string): Promise<{ success: boolean; message?: string; messageId?: string; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/email/test`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetEmail })
    });
    return res.json();
  },

  adminTestTed: async (data: { query?: string; filters?: NoticeFilters; limit?: number }): Promise<{ success: boolean; latencyMs?: number; totalCount?: number; notices?: Notice[]; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/test/ted`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return res.json();
  },

  adminTestMinimax: async (prompt?: string): Promise<{ success: boolean; reply?: string; latencyMs?: number; model?: string; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/test/minimax`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt })
    });
    return res.json();
  },

  adminCleanupHits: async (days = 30): Promise<{ success: boolean; deletedCount?: number; days?: number; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/maintenance/cleanup-hits`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ days })
    });
    return res.json();
  },

  adminCleanupChats: async (days = 30): Promise<{ success: boolean; deletedCount?: number; days?: number; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/maintenance/cleanup-chats`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ days })
    });
    return res.json();
  },

  adminReleaseCronLock: async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/admin/maintenance/release-lock`, {
      method: 'POST',
      headers
    });
    return res.json();
  },

  adminExportAllUrl: (): string => {
    return `${API_BASE}/admin/export/all`;
  }
};
