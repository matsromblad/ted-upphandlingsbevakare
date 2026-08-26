import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AIChatDrawer } from './components/AIChatDrawer';
import { TenderDetailModal } from './components/TenderDetailModal';
import { SearchView } from './views/SearchView';
import { WatchlistsView } from './views/WatchlistsView';
import { PipelineView } from './views/PipelineView';
import { CpvAndProfileView } from './views/CpvAndProfileView';
import { Notice, SavedTender } from './types';
import { api } from './api';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'search' | 'watchlists' | 'pipeline' | 'cpv-profile'>('search');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('ted_dark_mode') === 'true' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [savedTenders, setSavedTenders] = useState<SavedTender[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

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

  useEffect(() => {
    loadPipelineAndWatchlists();
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
    </div>
  );
};

export default App;
