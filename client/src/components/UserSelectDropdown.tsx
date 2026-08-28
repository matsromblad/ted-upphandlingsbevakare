import React, { useState, useEffect, useRef } from 'react';
import { User, Search, Check, X, ChevronDown, UserCheck, Sparkles, Clock } from 'lucide-react';
import { TeamMember } from '../types';
import { api } from '../api';

interface UserSelectDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const UserSelectDropdown: React.FC<UserSelectDropdownProps> = ({
  value,
  onChange,
  placeholder = 'Välj eller sök ansvarig person...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getActiveUsers();
      if (res.success && res.users) {
        setTeamMembers(res.users);
      }
    } catch (e) {
      console.warn('Failed to load active users:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = teamMembers.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  });

  const handleSelect = (name: string) => {
    onChange(name);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Check if current value matches a known member
  const currentMember = teamMembers.find(
    (m) => m.name.toLowerCase() === value.toLowerCase() || m.email.toLowerCase() === value.toLowerCase()
  );

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between shadow-sm select-none ${
          isOpen
            ? 'border-ted-500 ring-2 ring-ted-500/20 bg-white dark:bg-slate-800'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {value ? (
            <>
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-ted-600 to-indigo-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
                {getInitials(currentMember?.name || value)}
              </div>
              <div className="truncate">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {currentMember?.name || value}
                </span>
                {currentMember?.email && (
                  <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 hidden sm:inline">
                    {currentMember.email}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <User className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
              <span className="text-sm text-slate-400 dark:text-slate-500 truncate">
                {placeholder}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Rensa ansvarig person"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180 text-ted-600' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-fadeIn">
          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredMembers.length > 0) {
                      handleSelect(filteredMembers[0].name);
                    } else if (searchQuery.trim()) {
                      handleSelect(searchQuery.trim());
                    }
                  } else if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
                placeholder="Sök namn eller e-post (WSP)..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ted-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between px-1 pt-1.5 text-[10px] text-slate-400">
              <span>WSP-kollegor inloggade senaste året</span>
              <span>{filteredMembers.length} träffar</span>
            </div>
          </div>

          {/* Members List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            {value && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                  Ingen ansvarig tilldelad
                </span>
              </button>
            )}

            {filteredMembers.map((member) => {
              const isSelected =
                value.toLowerCase() === member.name.toLowerCase() ||
                value.toLowerCase() === member.email.toLowerCase();

              return (
                <button
                  type="button"
                  key={member.id}
                  onClick={() => handleSelect(member.name)}
                  className={`w-full px-3 py-2.5 rounded-xl text-left transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'bg-ted-50 dark:bg-ted-950/60 text-ted-900 dark:text-ted-100 font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 shadow-sm ${
                        isSelected
                          ? 'bg-ted-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 group-hover:bg-ted-100 dark:group-hover:bg-ted-900 group-hover:text-ted-700 dark:group-hover:text-ted-300'
                      }`}
                    >
                      {getInitials(member.name)}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold truncate text-slate-900 dark:text-white">
                        {member.name}
                      </div>
                      {member.email && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                          {member.email}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected ? (
                    <Check className="w-4 h-4 text-ted-600 flex-shrink-0 ml-2" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-transparent group-hover:text-slate-400 flex-shrink-0 ml-2 transition-colors" />
                  )}
                </button>
              );
            })}

            {/* If no exact match, allow custom name entry */}
            {searchQuery.trim() && !filteredMembers.some(m => m.name.toLowerCase() === searchQuery.toLowerCase().trim()) && (
              <button
                type="button"
                onClick={() => handleSelect(searchQuery.trim())}
                className="w-full px-3 py-2.5 rounded-xl text-left text-xs bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between transition-colors mt-1"
              >
                <div className="flex items-center gap-2 truncate">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  <span className="truncate">
                    Använd eget namn: <strong className="font-bold">"{searchQuery.trim()}"</strong>
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Välj</span>
              </button>
            )}

            {filteredMembers.length === 0 && !searchQuery.trim() && (
              <div className="py-6 text-center text-xs text-slate-400">
                Inga inloggade WSP-användare hittades.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
