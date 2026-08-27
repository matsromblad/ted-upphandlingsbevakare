import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AIChatDrawer } from './components/AIChatDrawer';
import { TenderDetailModal } from './components/TenderDetailModal';
import { AuthModal } from './components/AuthModal';
import { AboutModal } from './components/AboutModal';
import { SearchView } from './views/SearchView';
import { WatchlistsView } from './views/WatchlistsView';
import { PipelineView } from './views/PipelineView';
import { CpvAndProfileView } from './views/CpvAndProfileView';
import { Notice, SavedTender } from './types';
import { api } from './api';
import { supabase, isSupabaseConfigured, subscribeSupabaseConfig, ensureSupabaseClient } from './supabaseClient';
import { Building2, ExternalLink, Code2, Heart, Info, Sparkles } from 'lucide-react';

function getInitialNavigationState() {
  const params = new URLSearchParams(window.location.search);
  const requestedView = params.get('view');
  const requestedTab = params.get('tab');

  return {
    view: requestedView === 'watchlists' || requestedView === 'pipeline' || requestedView === 'cpv-profile'
      ? requestedView
      : 'search',
    watchlistId: params.get('watchlist'),
    watchlistsTab: requestedTab === 'profiles' ? 'profiles' : 'feed'
  } as const;
}

export const App: React.FC = () => {
  const initialNavigation = getInitialNavigationState();
  const [currentView, setCurrentView] = useState<'search' | 'watchlists' | 'pipeline' | 'cpv-profile'>(initialNavigation.view);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('ted_dark_mode') === 'true' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [savedTenders, setSavedTenders] = useState<SavedTender[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // User Auth State
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  // Active Notice Modal & AI Chat Drawer
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [noticeForChat, setNoticeForChat] = useState<Notice | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ted_dark_mode', darkMode.toString());
  }, [darkMode]);

  // Handle Supabase Auth State
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    const setupAuth = async () => {
      const client = await ensureSupabaseClient();
      if (client) {
        const { data: { session } } = await client.auth.getSession();
        setCurrentUser(session?.user ?? null);
        loadPipelineAndWatchlists();

        const { data } = client.auth.onAuthStateChange((_event, session) => {
          setCurrentUser(session?.user ?? null);
          loadPipelineAndWatchlists();
        });
        subscription = data.subscription;
      } else {
        loadPipelineAndWatchlists();
      }
    };

    setupAuth();

    const unsubscribeConfig = subscribeSupabaseConfig((configured) => {
      if (configured) {
        setupAuth();
      }
    });

    return () => {
      if (subscription) (subscription as any).unsubscribe();
      unsubscribeConfig();
    };
  }, []);

  const loadPipelineAndWatchlists = async () => {
    try {
      const [pipeRes, wlRes] = await Promise.all([
        api.getPipeline(),
        api.getWatchlists()
      ]);

      if (pipeRes.success && pipeRes.tenders) {
        setSavedTenders(pipeRes.tenders);
      }
      if (wlRes.success) {
        setUnreadCount(wlRes.unreadCount || 0);
      }
    } catch (e) {
      console.error('Failed to load initial data:', e);
    }
  };

  const handleOpenNoticeDetail = (notice: Notice) => {
    setSelectedNotice(notice);
    setIsDetailModalOpen(true);
  };

  const handleOpenChatWithNotice = (notice: Notice) => {
    setNoticeForChat(notice);
    setIsChatOpen(true);
  };

  const handleToggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Navigation */}
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        unreadCount={unreadCount}
        pipelineCount={savedTenders.length}
        onOpenChat={() => {
          setNoticeForChat(selectedNotice);
          setIsChatOpen(true);
        }}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {currentView === 'search' && (
          <SearchView
            onOpenNoticeDetail={handleOpenNoticeDetail}
            savedTenders={savedTenders}
            onTenderSaved={loadPipelineAndWatchlists}
            onWatchlistCreated={loadPipelineAndWatchlists}
          />
        )}

        {currentView === 'watchlists' && (
          <WatchlistsView
            onOpenNoticeDetail={handleOpenNoticeDetail}
            savedTenders={savedTenders}
            onTenderSaved={loadPipelineAndWatchlists}
            onWatchlistChanged={loadPipelineAndWatchlists}
            initialSelectedWatchlistId={initialNavigation.watchlistId}
            initialTab={initialNavigation.watchlistsTab}
          />
        )}

        {currentView === 'pipeline' && (
          <PipelineView
            tenders={savedTenders}
            onOpenNoticeDetail={handleOpenNoticeDetail}
            onTenderUpdated={loadPipelineAndWatchlists}
            onNavigateToSearch={() => setCurrentView('search')}
          />
        )}

        {currentView === 'cpv-profile' && (
          <CpvAndProfileView />
        )}
      </main>

      {/* Global Footer */}
      <footer className="mt-12 border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-ted-500 to-blue-700 flex items-center justify-center text-white font-bold text-[10px]">
              TED
            </div>
            <span>
              <strong>TED Upphandlingsbevakare</strong> • Skapad av <strong>Mats Romblad</strong> (<a href="mailto:mats.romblad@wsp.com" className="text-ted-600 dark:text-ted-400 hover:underline">mats.romblad@wsp.com</a>)
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsAboutModalOpen(true)}
              className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 font-medium"
            >
              <Info className="w-3.5 h-3.5 text-ted-600 dark:text-ted-400" />
              Om appen
            </button>

            <a
              href="https://ted.europa.eu/sv/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3 text-slate-400" />
              ted.europa.eu
            </a>

            <a
              href="https://github.com/matsromblad/ted-upphandlingsbevakare"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
            >
              <Code2 className="w-3.5 h-3.5 text-slate-400" />
              GitHub
            </a>
          </div>
        </div>
      </footer>

      {/* About App Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* Tender Detail Modal */}
      <TenderDetailModal
        notice={selectedNotice}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onOpenChatWithNotice={handleOpenChatWithNotice}
        savedTenders={savedTenders}
        onTenderUpdated={loadPipelineAndWatchlists}
      />

      {/* MiniMax AI Chat Drawer */}
      <AIChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentNotice={noticeForChat}
        onOpenNoticeDetail={handleOpenNoticeDetail}
      />

      {/* Supabase SSO / Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          loadPipelineAndWatchlists();
        }}
      />
    </div>
  );
};

export default App;
