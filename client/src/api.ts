import {
  Notice,
  NoticeFilters,
  Watchlist,
  WatchlistHit,
  SavedTender,
  CompanyProfile,
  ChatMessage,
  AIAnalysis,
  CpvCategory
} from './types';

const API_BASE = '/api';

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
    const res = await fetch(`${API_BASE}/ted/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`${API_BASE}/ai/smart-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    return res.json();
  },

  // AI Analyze Notice
  analyzeNotice: async (notice: Notice): Promise<{ success: boolean; analysis?: AIAnalysis; error?: string }> => {
    const res = await fetch(`${API_BASE}/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context, sessionId })
    });
    return res.json();
  },

  getChatHistory: async (sessionId = 'default'): Promise<{ success: boolean; messages: ChatMessage[] }> => {
    const res = await fetch(`${API_BASE}/ai/chat/history?sessionId=${encodeURIComponent(sessionId)}`);
    return res.json();
  },

  clearChatHistory: async (sessionId = 'default'): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/ai/chat/history?sessionId=${encodeURIComponent(sessionId)}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // Watchlists
  getWatchlists: async (): Promise<{ success: boolean; watchlists: Watchlist[]; unreadCount: number }> => {
    const res = await fetch(`${API_BASE}/watchlists`);
    return res.json();
  },

  createWatchlist: async (data: { name: string; filters: NoticeFilters; intervalMinutes?: number }): Promise<{
    success: boolean;
    watchlist: Watchlist;
    error?: string;
  }> => {
    const res = await fetch(`${API_BASE}/watchlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateWatchlist: async (id: string, data: { name?: string; filters?: NoticeFilters; active?: boolean; intervalMinutes?: number }): Promise<{
    success: boolean;
    watchlist: Watchlist;
    error?: string;
  }> => {
    const res = await fetch(`${API_BASE}/watchlists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  deleteWatchlist: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/watchlists/${id}`, { method: 'DELETE' });
    return res.json();
  },

  runWatchlist: async (id: string): Promise<{ success: boolean; totalFound: number; newHits: number }> => {
    const res = await fetch(`${API_BASE}/watchlists/${id}/run`, { method: 'POST' });
    return res.json();
  },

  runAllWatchlists: async (): Promise<{ success: boolean; results: any[] }> => {
    const res = await fetch(`${API_BASE}/watchlists/run-all`, { method: 'POST' });
    return res.json();
  },

  getWatchlistHits: async (id: string): Promise<{ success: boolean; hits: WatchlistHit[] }> => {
    const res = await fetch(`${API_BASE}/watchlists/${id}/hits`);
    return res.json();
  },

  getRecentHits: async (limit = 100): Promise<{ success: boolean; hits: WatchlistHit[] }> => {
    const res = await fetch(`${API_BASE}/watchlists-hits/recent?limit=${limit}`);
    return res.json();
  },

  markHitRead: async (hitId: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/watchlists/hits/${hitId}/read`, { method: 'PUT' });
    return res.json();
  },

  markAllHitsRead: async (watchlistId?: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/watchlists/hits/mark-all-read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchlistId })
    });
    return res.json();
  },

  // Pipeline
  getPipeline: async (): Promise<{ success: boolean; tenders: SavedTender[] }> => {
    const res = await fetch(`${API_BASE}/pipeline`);
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
    const res = await fetch(`${API_BASE}/pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notice, ...options })
    });
    return res.json();
  },

  updatePipelineStatus: async (id: string, status: string): Promise<{ success: boolean; tender: SavedTender }> => {
    const res = await fetch(`${API_BASE}/pipeline/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`${API_BASE}/pipeline/${id}/details`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  deleteFromPipeline: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/pipeline/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Profile & CPV
  getProfile: async (): Promise<{ success: boolean; profile: CompanyProfile }> => {
    const res = await fetch(`${API_BASE}/profile`);
    return res.json();
  },

  updateProfile: async (profile: Partial<CompanyProfile>): Promise<{ success: boolean; profile: CompanyProfile }> => {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    return res.json();
  },

  getCpvCategories: async (q = ''): Promise<{ success: boolean; categories: CpvCategory[] }> => {
    const res = await fetch(`${API_BASE}/cpv?q=${encodeURIComponent(q)}`);
    return res.json();
  }
};
