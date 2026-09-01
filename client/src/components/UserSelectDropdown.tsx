import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Search, Check, X, ChevronDown, UserCheck, Sparkles, Plus, UserPlus, Trash2, Loader2 } from 'lucide-react';
import { TeamMember } from '../types';
import { api } from '../api';
import { showToast } from './Toast';

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
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [addingLoading, setAddingLoading] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
        setIsAddingNew(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // The trigger can live inside a scrollable/clipped ancestor (e.g. a Kanban column), so the
  // menu is portaled to <body> and positioned from the trigger's live viewport rect instead of
  // relying on CSS positioning, which would otherwise get clipped by that ancestor's overflow.
  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setMenuPos({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 320) });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
      setIsAddingNew(false);
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

  const handleAddNewMember = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = (newName || searchQuery).trim();
    if (!cleanName) return;

    setAddingLoading(true);
    try {
      const res = await api.addTeamMember({
        name: cleanName,
        email: newEmail.trim(),
        role: 'Kollega'
      });

      if (res.success && res.member) {
        showToast('success', `Kollegan "${cleanName}" har lagts till i teamlistan.`);
        await loadUsers();
        handleSelect(cleanName);
        setNewName('');
        setNewEmail('');
        setIsAddingNew(false);
      } else {
        showToast('error', res.error || 'Kunde inte spara kollegan.');
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Kunde inte spara kollegan.');
    } finally {
      setAddingLoading(false);
    }
  };

  const handleDeleteMember = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    try {
      const res = await api.deleteTeamMember(id);
      if (res.success) {
        setTeamMembers(prev => prev.filter(m => m.id !== id));
        showToast('info', `Tog bort "${name}" från kollegelistan.`);
      }
    } catch (err) {
      console.warn('Failed to delete team member:', err);
    }
  };

  const filteredMembers = teamMembers.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.role && m.role.toLowerCase().includes(q))
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
    (m) => m.name.toLowerCase() === value.toLowerCase() || (m.email && m.email.toLowerCase() === value.toLowerCase())
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
              <div className="truncate flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {currentMember?.name || value}
                </span>
                {currentMember?.email && (
                  <span className="text-xs text-slate-400 dark:text-slate-500 truncate hidden sm:inline">
                    ({currentMember.email})
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

      {/* Dropdown Menu — portaled to <body> so it can't be clipped by a scrollable/overflow ancestor */}
      {isOpen && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: menuPos.width }}
          className="z-50 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-fadeIn"
        >
          {/* Search Box & Add Toggle */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 space-y-2">
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
                placeholder="Sök namn eller e-post..."
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

            <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>{filteredMembers.length} tillgängliga personer</span>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(!isAddingNew);
                  if (!newName && searchQuery) setNewName(searchQuery);
                }}
                className="text-ted-600 hover:text-ted-700 dark:text-ted-400 font-bold flex items-center gap-1 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {isAddingNew ? 'Avbryt' : '+ Lägg till kollega'}
              </button>
            </div>

            {/* Quick Add Colleague Form */}
            {isAddingNew && (
              <form onSubmit={handleAddNewMember} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 animate-fadeIn">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-ted-600" />
                  Lägg till ny kollega i teamlistan
                </div>
                <input
                  type="text"
                  placeholder="Kollegan namn (t.ex. Anna Svensson)*"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                  autoFocus
                  required
                />
                <input
                  type="email"
                  placeholder="E-postadress (t.ex. anna.svensson@wsp.com)"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={addingLoading || !newName.trim()}
                    className="px-3 py-1 bg-ted-600 hover:bg-ted-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm"
                  >
                    {addingLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Spara & Välj
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Members List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
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
                (member.email && value.toLowerCase() === member.email.toLowerCase());

              return (
                <div
                  key={member.id}
                  onClick={() => handleSelect(member.name)}
                  className={`w-full px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
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
                    <div className="truncate flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate text-slate-900 dark:text-white">
                          {member.name}
                        </span>
                        {member.source === 'registered' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                            Inloggad
                          </span>
                        )}
                        {member.source === 'team_member' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                            Team
                          </span>
                        )}
                      </div>
                      {member.email && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                          {member.email}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {member.source === 'team_member' && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteMember(e, member.id, member.name)}
                        className="p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all"
                        title="Ta bort från teamlistan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isSelected ? (
                      <Check className="w-4 h-4 text-ted-600 flex-shrink-0" />
                    ) : (
                      <UserCheck className="w-4 h-4 text-transparent group-hover:text-slate-400 flex-shrink-0 transition-colors" />
                    )}
                  </div>
                </div>
              );
            })}

            {/* If query has text but no exact name match, allow custom entry / quick add */}
            {searchQuery.trim() && !filteredMembers.some(m => m.name.toLowerCase() === searchQuery.toLowerCase().trim()) && (
              <div className="pt-1 space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelect(searchQuery.trim())}
                  className="w-full px-3 py-2.5 rounded-xl text-left text-xs bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Sparkles className="w-3.5 h-3.5 text-ted-600 dark:text-ted-400 flex-shrink-0" />
                    <span className="truncate">
                      Tilldela: <strong className="font-bold">"{searchQuery.trim()}"</strong>
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-ted-600 dark:text-ted-400">Välj</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewName(searchQuery.trim());
                    setIsAddingNew(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Spara "{searchQuery.trim()}" permanent i teamlistan
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Spara</span>
                </button>
              </div>
            )}

            {filteredMembers.length === 0 && !searchQuery.trim() && (
              <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                <p>Inga personer i listan ännu.</p>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="px-3 py-1 rounded-lg bg-ted-50 text-ted-600 dark:bg-ted-950 dark:text-ted-400 text-xs font-bold hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Lägg till första kollegan
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
