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
  CpvCategory,
  TeamMember
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
  searchTed: async (filters: NoticeFilters, page = 1, limit = 20): Promise<{
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
      body: JSON.stringify({ filters, page, limit })
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
  }
};
