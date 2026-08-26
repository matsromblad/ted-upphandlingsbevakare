import React from 'react';
import {
  Search,
  Bell,
  Kanban,
  FileText,
  Sparkles,
  Sun,
  Moon,
  Building2,
  ExternalLink
} from 'lucide-react';

interface NavbarProps {
  currentView: 'search' | 'watchlists' | 'pipeline' | 'cpv-profile';
  onSelectView: (view: 'search' | 'watchlists' | 'pipeline' | 'cpv-profile') => void;
  unreadCount: number;
  pipelineCount: number;
  onOpenChat: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  unreadCount,
  pipelineCount,
  onOpenChat,
  darkMode,
  onToggleDarkMode
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectView('search')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ted-500 to-blue-700 flex items-center justify-center text-white shadow-md shadow-ted-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">TED Bevakare</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-ted-100 text-ted-800 dark:bg-ted-950 dark:text-ted-300 border border-ted-200 dark:border-ted-800">
                  EU & Sverige
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tenders Electronic Daily Monitor</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => onSelectView('search')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentView === 'search'
                  ? 'bg-white dark:bg-slate-900 text-ted-700 dark:text-ted-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" />
              Sök & Utforska
            </button>

            <button
              onClick={() => onSelectView('watchlists')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all relative ${
                currentView === 'watchlists'
                  ? 'bg-white dark:bg-slate-900 text-ted-700 dark:text-ted-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" />
              Bevakningar
              {unreadCount > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold bg-amber-500 text-white rounded-full animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectView('pipeline')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all relative ${
                currentView === 'pipeline'
                  ? 'bg-white dark:bg-slate-900 text-ted-700 dark:text-ted-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Kanban className="w-4 h-4" />
              Anbudspipeline
              {pipelineCount > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold bg-ted-600 text-white rounded-full">
                  {pipelineCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectView('cpv-profile')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentView === 'cpv-profile'
                  ? 'bg-white dark:bg-slate-900 text-ted-700 dark:text-ted-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              CPV & Företagsprofil
            </button>
          </nav>

          {/* Right Action buttons: AI Chat & Theme Toggle */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenChat}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold shadow-md shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-purple-200" />
              <span>MiniMax AI Copilot</span>
            </button>

            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title={darkMode ? 'Växla till ljust läge' : 'Växla till mörkt läge'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => onSelectView('search')}
            className={`flex flex-col items-center gap-1 text-xs ${currentView === 'search' ? 'text-ted-600 font-bold' : 'text-slate-500'}`}
          >
            <Search className="w-4 h-4" />
            Sök
          </button>
          <button
            onClick={() => onSelectView('watchlists')}
            className={`flex flex-col items-center gap-1 text-xs relative ${currentView === 'watchlists' ? 'text-ted-600 font-bold' : 'text-slate-500'}`}
          >
            <Bell className="w-4 h-4" />
            Bevaka
            {unreadCount > 0 && <span className="absolute -top-1 right-2 w-2 h-2 bg-amber-500 rounded-full" />}
          </button>
          <button
            onClick={() => onSelectView('pipeline')}
            className={`flex flex-col items-center gap-1 text-xs ${currentView === 'pipeline' ? 'text-ted-600 font-bold' : 'text-slate-500'}`}
          >
            <Kanban className="w-4 h-4" />
            Pipeline
          </button>
          <button
            onClick={() => onSelectView('cpv-profile')}
            className={`flex flex-col items-center gap-1 text-xs ${currentView === 'cpv-profile' ? 'text-ted-600 font-bold' : 'text-slate-500'}`}
          >
            <FileText className="w-4 h-4" />
            Profil
          </button>
        </div>
      </div>
    </header>
  );
};
