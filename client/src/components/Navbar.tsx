import React, { useState } from 'react';
import {
  Search,
  Bell,
  Kanban,
  FileText,
  Sparkles,
  Sun,
  Moon,
  User,
  LogOut,
  LogIn,
  ChevronDown,
  Info
} from 'lucide-react';
import { WspLogo } from './WspLogo';
import { signOut, isSupabaseConfigured } from '../supabaseClient';

interface NavbarProps {
  currentView: 'search' | 'watchlists' | 'pipeline' | 'cpv-profile' | 'about';
  onSelectView: (view: 'search' | 'watchlists' | 'pipeline' | 'cpv-profile' | 'about') => void;
  unreadCount: number;
  pipelineCount: number;
  onOpenChat: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  currentUser: any | null;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  unreadCount,
  pipelineCount,
  onOpenChat,
  darkMode,
  onToggleDarkMode,
  currentUser,
  onOpenAuth
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
    window.location.reload();
  };

  const displayName = currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    currentUser?.email?.split('@')[0] ||
    'Användare';

  const avatarUrl = currentUser?.user_metadata?.avatar_url;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors">
      <div className="max-w-[1920px] mx-auto px-3 sm:px-5 lg:px-7 xl:px-8">
        <div className="flex items-center justify-between min-h-[4rem] h-16 sm:h-18 gap-2 sm:gap-4">
          {/* Logo & Brand */}
          <div
            className="cursor-pointer flex-shrink-0 select-none py-1"
            onClick={() => onSelectView('search')}
          >
            <WspLogo variant="full" size="md" />
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex-shrink-0">
            <button
              onClick={() => onSelectView('search')}
              className={`flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3.5 py-1.5 rounded-lg text-xs xl:text-sm font-medium transition-all ${
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
              className={`flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3.5 py-1.5 rounded-lg text-xs xl:text-sm font-medium transition-all relative ${
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
              className={`flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3.5 py-1.5 rounded-lg text-xs xl:text-sm font-medium transition-all relative ${
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
              className={`flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3.5 py-1.5 rounded-lg text-xs xl:text-sm font-medium transition-all ${
                currentView === 'cpv-profile'
                  ? 'bg-white dark:bg-slate-900 text-ted-700 dark:text-ted-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              CPV & Företagsprofil
            </button>

            <button
              onClick={() => onSelectView('about')}
              className={`flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3.5 py-1.5 rounded-lg text-xs xl:text-sm font-medium transition-all ${
                currentView === 'about'
                  ? 'bg-white dark:bg-slate-900 text-ted-700 dark:text-ted-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Info className="w-4 h-4" />
              Om
            </button>
          </nav>

          {/* Right Action buttons: AI Chat, Auth & Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            <button
              onClick={onOpenChat}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap flex-shrink-0"
            >
              <Sparkles className="w-4 h-4 text-purple-200 flex-shrink-0" />
              <span className="hidden sm:inline">MiniMax AI Copilot</span>
              <span className="inline sm:hidden">AI Copilot</span>
            </button>

            {/* User Auth Dropdown / Login button */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-lg object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-ted-100 dark:bg-ted-950 text-ted-700 dark:text-ted-300 font-bold text-xs flex items-center justify-center">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[100px] truncate hidden md:inline">
                    {displayName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{displayName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onSelectView('cpv-profile');
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Min företagsprofil
                    </button>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onSelectView('about');
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                      Om WSP TED Bevakare
                    </button>

                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Logga ut
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors shadow-sm"
              >
                <LogIn className="w-4 h-4 text-ted-600" />
                <span>Logga in</span>
              </button>
            )}

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
        <div className="flex lg:hidden items-center justify-around py-2 border-t border-slate-100 dark:border-slate-800">
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
          <button
            onClick={() => onSelectView('about')}
            className={`flex flex-col items-center gap-1 text-xs ${currentView === 'about' ? 'text-ted-600 font-bold' : 'text-slate-500'}`}
          >
            <Info className="w-4 h-4" />
            Om
          </button>
        </div>
      </div>
    </header>
  );
};

