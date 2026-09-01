import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Activity,
  Users,
  Bell,
  Mail,
  Cpu,
  Database,
  RefreshCw,
  Play,
  Trash2,
  Edit2,
  UserPlus,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Download,
  Terminal,
  Send,
  Sparkles,
  Server,
  Lock,
  Eye,
  Check,
  X,
  FileSpreadsheet,
  Clock,
  Layers,
  ChevronRight,
  Info,
  Calendar,
  AlertCircle
} from 'lucide-react';
import {
  AdminStats,
  AdminUser,
  AdminWatchlist,
  SystemHealthResponse,
  EmailStatusInfo,
  Notice
} from '../types';
import { api } from '../api';
import { showToast } from '../components/Toast';

type AdminTab = 'health' | 'users' | 'watchlists' | 'email' | 'playground' | 'maintenance';

export const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('health');

  // Stats & Health State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState<string | null>(null);

  // Users State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserCompany, setNewUserCompany] = useState('WSP Sverige AB');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [creatingUser, setCreatingUser] = useState(false);

  // Edit User State
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [savingUser, setSavingUser] = useState(false);

  // Watchlists State
  const [watchlists, setWatchlists] = useState<AdminWatchlist[]>([]);
  const [loadingWatchlists, setLoadingWatchlists] = useState(false);
  const [watchlistSearch, setWatchlistSearch] = useState('');
  const [runningWatchlistId, setRunningWatchlistId] = useState<string | null>(null);
  const [inspectWatchlist, setInspectWatchlist] = useState<AdminWatchlist | null>(null);

  // Cron Run State
  const [runningGlobalCron, setRunningGlobalCron] = useState(false);

  // Email State
  const [emailStatus, setEmailStatus] = useState<EmailStatusInfo | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState('mats.romblad@wsp.com');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string; messageId?: string } | null>(null);

  // API & AI Playground State
  const [tedQueryInput, setTedQueryInput] = useState('(buyer-country IN (SWE)) AND classification-cpv IN (71300000, 71240000, 71320000)');
  const [tedTesting, setTedTesting] = useState(false);
  const [tedTestResult, setTedTestResult] = useState<any | null>(null);

  const [aiPromptInput, setAiPromptInput] = useState('Förklara kort på svenska vad WSP har för nytta av att bevaka CPV-kod 71300000 (Tekniska konsulttjänster) på TED.');
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<any | null>(null);

  // Maintenance State
  const [cleanupHitsDays, setCleanupHitsDays] = useState(30);
  const [cleaningHits, setCleaningHits] = useState(false);
  const [cleanupChatsDays, setCleanupChatsDays] = useState(30);
  const [cleaningChats, setCleaningChats] = useState(false);
  const [releasingLock, setReleasingLock] = useState(false);

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    setLoadingHealth(true);
    try {
      const [statsRes, healthRes] = await Promise.all([
        api.adminGetStats(),
        api.adminGetHealth()
      ]);

      if (statsRes.success && statsRes.stats) {
        setStats(statsRes.stats);
      }
      if (healthRes.success) {
        setHealth(healthRes);
        setLastHealthCheck(new Date().toLocaleTimeString('sv-SE'));
      }
    } catch (e: any) {
      console.error('Failed to load admin overview:', e);
      showToast('error', 'Kunde inte hämta administratörsöversikt.');
    } finally {
      setLoadingHealth(false);
    }
  };

  const loadUsersData = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.adminGetUsers();
      if (res.success && res.users) {
        setUsers(res.users);
      }
    } catch (e: any) {
      console.error('Failed to load users:', e);
      showToast('error', 'Kunde inte hämta användarlista.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadWatchlistsData = async () => {
    setLoadingWatchlists(true);
    try {
      const res = await api.adminGetWatchlists();
      if (res.success && res.watchlists) {
        setWatchlists(res.watchlists);
      }
    } catch (e: any) {
      console.error('Failed to load watchlists:', e);
      showToast('error', 'Kunde inte hämta bevakningslista.');
    } finally {
      setLoadingWatchlists(false);
    }
  };

  const loadEmailData = async () => {
    try {
      const res = await api.adminGetEmailStatus();
      if (res.success) {
        setEmailStatus(res);
      }
    } catch (e: any) {
      console.error('Failed to load email status:', e);
    }
  };

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    if (tab === 'health') loadOverviewData();
    if (tab === 'users') loadUsersData();
    if (tab === 'watchlists') loadWatchlistsData();
    if (tab === 'email') loadEmailData();
  };

  // Run Global Cron
  const handleRunGlobalCron = async () => {
    setRunningGlobalCron(true);
    try {
      const res = await api.adminRunCron();
      if (res.success) {
        showToast('success', `Bakgrundskörning slutförd! ${res.count || 0} aktiva bevakningar synkades.`);
        loadOverviewData();
        if (activeTab === 'watchlists') loadWatchlistsData();
      } else {
        showToast('error', res.error || 'Körningen misslyckades.');
      }
    } catch (e: any) {
      showToast('error', e.message || 'Fel vid körning av schemaläggare.');
    } finally {
      setRunningGlobalCron(false);
    }
  };

  // User Actions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail) return;

    setCreatingUser(true);
    try {
      const res = await api.adminCreateUser({
        email: newUserEmail,
        password: newUserPassword || undefined,
        fullName: newUserName,
        companyName: newUserCompany,
        role: newUserRole
      });

      if (res.success) {
        showToast('success', `Användare ${newUserEmail} har skapats.`);
        setIsCreateUserModalOpen(false);
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserName('');
        loadUsersData();
        loadOverviewData();
      } else {
        showToast('error', res.error || 'Kunde inte skapa användare.');
      }
    } catch (e: any) {
      showToast('error', e.message || 'Ett fel uppstod.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleUserRole = async (user: AdminUser) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      const res = await api.adminUpdateUserRole(user.id, nextRole);
      if (res.success) {
        showToast('success', `${user.fullName || user.email} är nu ${nextRole === 'admin' ? 'Administratör' : 'Standardanvändare'}.`);
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: nextRole } : u));
      } else {
        showToast('error', res.error || 'Kunde inte uppdatera roll.');
      }
    } catch (e: any) {
      showToast('error', e.message || 'Fel vid rolländring.');
    }
  };

  const handleOpenEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setEditName(user.fullName);
    setEditCompany(user.companyName);
    setEditRole(user.role);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSavingUser(true);
    try {
      const res = await api.adminUpdateUserProfile(editingUser.id, {
        fullName: editName,
        companyName: editCompany,
        role: editRole
      });

      if (res.success) {
        showToast('success', 'Användarprofilen har uppdaterats.');
        setEditingUser(null);
        loadUsersData();
      } else {
        showToast('error', res.error || 'Kunde inte uppdatera profil.');
      }
    } catch (e: any) {
      showToast('error', e.message || 'Fel vid sparning.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!window.confirm(`Är du säker på att du vill radera användaren ${user.fullName || user.email}? Detta tar även bort användarens bevakningar och sparade anbud.`)) {
      return;
    }

    try {
      const res = await api.adminDeleteUser(user.id);
      if (res.success) {
        showToast('info', `Användaren ${user.email} har raderats.`);
        setUsers(prev => prev.filter(u => u.id !== user.id));
        loadOverviewData();
      } else {
        showToast('error', res.error || 'Kunde inte radera användare.');
      }
    } catch (e: any) {
      showToast('error', e.message || 'Fel vid radering.');
    }
  };

  // Watchlist Actions
  const handleRunWatchlistAdmin = async (id: string, name: string) => {
    setRunningWatchlistId(id);
    try {
      const res = await api.adminRunWatchlist(id);
      if (res.success) {
        showToast('success', `Körning klar för "${name}": Hittade ${res.result?.totalFound || 0} upphandlingar (${res.result?.newHits || 0} nya).`);
        loadWatchlistsData();
        loadOverviewData();
      } else {
        showToast('error', res.error || 'Körningen misslyckades.');
      }
    } catch (e: any) {
      showToast('error', e.message || 'Fel vid körning.');
    } finally {
      setRunningWatchlistId(null);
    }
  };

  const handleToggleWatchlistActive = async (wl: AdminWatchlist) => {
    const nextState = !wl.active;
    try {
      const res = await api.adminToggleWatchlist(wl.id, nextState);
      if (res.success) {
        showToast('info', `Bevakningen "${wl.name}" är nu ${nextState ? 'aktiv' : 'pausad'}.`);
        setWatchlists(prev => prev.map(w => w.id === wl.id ? { ...w, active: nextState } : w));
        loadOverviewData();
      } else {
        showToast('error', res.error || 'Kunde inte uppdatera status.');
      }
    } catch (e: any) {
      showToast('error', e.message || 'Fel vid ändring.');
    }
  };

  const handleDeleteWatchlistAdmin = async (wl: AdminWatchlist) => {
    if (!window.confirm(`Är du säker på att du vill ta bort bevakningen "${wl.name}"?`)) {
      return;
    }

    try {
      const res = await api.adminDeleteWatchlist(wl.id);
      if (res.success) {
        showToast('info', `Bevakningen "${wl.name}" har raderats.`);
        setWatchlists(prev => prev.filter(w => w.id !== wl.id));
        loadOverviewData();
      } else {
        showToast('error', res.error || 'Kunde inte radera bevakning.');
      }
    } catch (e: any) {
      showToast('error', e.message || 'Fel vid radering.');
    }
  };

  // Email Test
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress) return;

    setSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const res = await api.adminSendTestEmail(testEmailAddress);
      if (res.success) {
        setTestEmailResult({
          success: true,
          message: res.message || `Testmail skickat till ${testEmailAddress}`,
          messageId: res.messageId
        });
        showToast('success', `Testmail har skickats till ${testEmailAddress}!`);
      } else {
        setTestEmailResult({
          success: false,
          message: res.error || 'Kunde inte skicka testmail.'
        });
        showToast('error', res.error || 'Kunde inte skicka mail.');
      }
    } catch (e: any) {
      setTestEmailResult({
        success: false,
        message: e.message || 'Ett oväntat fel uppstod.'
      });
      showToast('error', e.message || 'Fel vid utskick.');
    } finally {
      setSendingTestEmail(false);
    }
  };

  // API Playground Actions
  const handleRunTestTed = async (e: React.FormEvent) => {
    e.preventDefault();
    setTedTesting(true);
    setTedTestResult(null);
    try {
      const res = await api.adminTestTed({ query: tedQueryInput, limit: 5 });
      setTedTestResult(res);
      if (res.success) {
        showToast('success', `TED API svarade på ${res.latencyMs} ms med ${res.totalCount || 0} träffar.`);
      } else {
        showToast('error', res.error || 'TED API anrop misslyckades.');
      }
    } catch (e: any) {
      setTedTestResult({ success: false, error: e.message });
      showToast('error', e.message || 'Fel vid TED-anrop.');
    } finally {
      setTedTesting(false);
    }
  };

  const handleRunTestMinimax = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiTesting(true);
    setAiTestResult(null);
    try {
      const res = await api.adminTestMinimax(aiPromptInput);
      setAiTestResult(res);
      if (res.success) {
        showToast('success', `MiniMax LLM svarade på ${res.latencyMs} ms.`);
      } else {
        showToast('error', res.error || 'MiniMax anrop misslyckades.');
      }
    } catch (e: any) {
      setAiTestResult({ success: false, error: e.message });
      showToast('error', e.message || 'Fel vid AI-anrop.');
    } finally {
      setAiTesting(false);
    }
  };

  // Maintenance Actions
  const handleCleanupHits = async () => {
    if (!window.confirm(`Rensa alla upphandlingsträffar som är äldre än ${cleanupHitsDays} dagar?`)) {
      return;
    }
    setCleaningHits(true);
    try {
      const res = await api.adminCleanupHits(cleanupHitsDays);
      if (res.success) {
        showToast('success', `Rensning klar! ${res.deletedCount || 0} gamla träffar togs bort.`);
        loadOverviewData();
      } else {
        showToast('error', res.error || 'Kunde inte rensa träffar.');
      }
    } catch (e: any) {
      showToast('error', e.message || 'Fel vid rensning.');
    } finally {
      setCleaningHits(false);
    }
  };

  const handleCleanupChats = async () => {
    if (!window.confirm(`Rensa alla AI-chattmeddelanden som är äldre än ${cleanupChatsDays} dagar?`)) {
      return;
    }
    setCleaningChats(true);
    try {
      const res = await api.adminCleanupChats(cleanupChatsDays);
      if (res.success) {
        showToast('success', `Rensning klar! ${res.deletedCount || 0} gamla chattmeddelanden togs bort.`);
        loadOverviewData();
      } else {
        showToast('error', res.error || 'Kunde inte rensa chattar.');
      }
    } catch (e: any) {
      showToast('error', e.message || 'Fel vid rensning.');
    } finally {
      setCleaningChats(false);
    }
  };

  const handleReleaseCronLock = async () => {
    setReleasingLock(true);
    try {
      const res = await api.adminReleaseCronLock();
      if (res.success) {
        showToast('success', res.message || 'Cron-lås frigjort.');
      } else {
        showToast('error', res.error || 'Kunde inte frigöra lås.');
      }
    } catch (e: any) {
      showToast('error', e.message || 'Fel vid frigörande av lås.');
    } finally {
      setReleasingLock(false);
    }
  };

  // Filtered lists
  const filteredUsers = users.filter(u =>
    u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.companyName.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredWatchlists = watchlists.filter(w =>
    w.name.toLowerCase().includes(watchlistSearch.toLowerCase()) ||
    w.userName.toLowerCase().includes(watchlistSearch.toLowerCase()) ||
    w.userEmail.toLowerCase().includes(watchlistSearch.toLowerCase()) ||
    (w.query || '').toLowerCase().includes(watchlistSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1920px] mx-auto pb-16 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-wsp-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-wsp-500/20 text-wsp-300 text-xs font-bold uppercase tracking-wider border border-wsp-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              Administratörspanel
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Systemöversikt & Administration
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Övervaka systemhälsa, hantera användare och roller, kontrollera bakgrundsschemaläggaren, utför diagnostik och underhåll databasen.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRunGlobalCron}
              disabled={runningGlobalCron}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-wsp-600 hover:bg-wsp-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-wsp-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${runningGlobalCron ? 'animate-spin' : ''}`} />
              {runningGlobalCron ? 'Synkar alla...' : 'Kör alla bevakningar nu'}
            </button>

            <a
              href={api.adminExportAllUrl()}
              download
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportera systembackup (JSON)
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 mt-8 pt-4 border-t border-slate-700/60 overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleTabChange('health')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'health'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            Översikt & Hälsa
          </button>

          <button
            onClick={() => handleTabChange('users')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            Användare ({stats?.usersCount || users.length || '...'})
          </button>

          <button
            onClick={() => handleTabChange('watchlists')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'watchlists'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Bell className="w-4 h-4" />
            Alla Bevakningar ({stats?.totalWatchlists || watchlists.length || '...'})
          </button>

          <button
            onClick={() => handleTabChange('email')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'email'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Mail className="w-4 h-4" />
            E-post & Utskick
          </button>

          <button
            onClick={() => handleTabChange('playground')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'playground'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
            API & AI Diagnostik
          </button>

          <button
            onClick={() => handleTabChange('maintenance')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'maintenance'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-4 h-4" />
            Databas & Underhåll
          </button>
        </div>
      </div>

      {/* TAB 1: ÖVERSIKT & SYSTEMHÄLSA */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Användare</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats?.usersCount ?? '...'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Registrerade konton</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Bevakningar</span>
                <Bell className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats?.activeWatchlists ?? '...'} <span className="text-sm font-normal text-slate-400">/ {stats?.totalWatchlists ?? 0}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Aktiva / totalt</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Träffar</span>
                <Search className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats?.totalHits ?? '...'}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                {stats?.unreadHits ?? 0} olästa
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Anbudspipeline</span>
                <Layers className="w-4 h-4 text-wsp-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats?.savedTenders ?? '...'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Sparade affärscase</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">AI Meddelanden</span>
                <Sparkles className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats?.chatMessages ?? '...'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">MiniMax interaktioner</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Databasläge</span>
                <Database className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate" title={stats?.dbMode}>
                {stats?.dbMode?.includes('PostgreSQL') ? 'PostgreSQL (Cloud)' : 'SQLite (Lokal)'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {stats?.dbMode?.includes('PostgreSQL') ? 'Row Level Security' : 'Enanvändare'}
              </p>
            </div>
          </div>

          {/* Service Health Cards */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  Live Systemhälsa & Tjänsteanslutningar
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Senast kontrollerad: {lastHealthCheck || 'Kontrollerar...'}
                </p>
              </div>

              <button
                onClick={loadOverviewData}
                disabled={loadingHealth}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
                Kontrollera nu
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* TED API v3 */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold text-xs">
                      TED
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">TED Search API v3</div>
                      <div className="text-[11px] text-slate-500">api.ted.europa.eu</div>
                    </div>
                  </div>
                  {health?.services?.ted?.status === 'online' ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs font-bold">
                      <XCircle className="w-3.5 h-3.5" /> Fel
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Svarstid:</span>
                    <strong className="font-mono text-slate-900 dark:text-slate-100">{health?.services?.ted?.latencyMs ?? '-'} ms</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Träffar tillgängliga:</span>
                    <strong className="font-mono text-slate-900 dark:text-slate-100">{(health?.services?.ted?.totalAvailable || 0).toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* MiniMax LLM */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold text-xs">
                      AI
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">MiniMax AI LLM</div>
                      <div className="text-[11px] text-slate-500">MiniMax-M3 Engine</div>
                    </div>
                  </div>
                  {health?.services?.minimax?.status === 'online' ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Redo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" /> Ej aktiv
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Modell:</span>
                    <strong className="font-mono text-purple-600 dark:text-purple-400">{health?.services?.minimax?.model || 'MiniMax-M3'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Endpoint:</span>
                    <span className="truncate max-w-[150px] font-mono text-[11px]">api.minimax.io</span>
                  </div>
                </div>
              </div>

              {/* Magnit Source */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-600 flex items-center justify-center font-bold text-xs">
                      MS
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">Magnit Source Portal</div>
                      <div className="text-[11px] text-slate-500">Konsultuppdrag</div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Online
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Svarstid:</span>
                    <strong className="font-mono text-slate-900 dark:text-slate-100">{health?.services?.magnit?.latencyMs ?? '-'} ms</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Aktiva uppdrag:</span>
                    <strong className="font-mono text-slate-900 dark:text-slate-100">{health?.services?.magnit?.activeCount ?? '-'} st</strong>
                  </div>
                </div>
              </div>

              {/* Verama / Ework */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 flex items-center justify-center font-bold text-xs">
                      VR
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">Verama / Ework</div>
                      <div className="text-[11px] text-slate-500">Konsultportal</div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Online
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Svarstid:</span>
                    <strong className="font-mono text-slate-900 dark:text-slate-100">{health?.services?.verama?.latencyMs ?? '-'} ms</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Aktiva uppdrag:</span>
                    <strong className="font-mono text-slate-900 dark:text-slate-100">{health?.services?.verama?.activeCount ?? '-'} st</strong>
                  </div>
                </div>
              </div>

              {/* Database */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      DB
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">Databas & Auth</div>
                      <div className="text-[11px] text-slate-500">{health?.services?.database?.mode || 'Databas'}</div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Online
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Svarstid:</span>
                    <strong className="font-mono text-slate-900 dark:text-slate-100">{health?.services?.database?.latencyMs ?? '-'} ms</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-emerald-600 font-bold">Aktiv anslutning</span>
                  </div>
                </div>
              </div>

              {/* Mailtrap */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center font-bold text-xs">
                      MT
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">Mailtrap Email API</div>
                      <div className="text-[11px] text-slate-500">Digest-utskick</div>
                    </div>
                  </div>
                  {health?.services?.mailtrap?.status === 'configured' ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Konfigurerad
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" /> Valfri
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Från:</span>
                    <span className="truncate max-w-[150px] font-mono text-[11px]">{health?.services?.mailtrap?.fromEmail || 'Ej angiven'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kategori:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Watchlist Digest</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ANVÄNDARHANTERING */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Registrerade användare & behörigheter
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Hantera användarkonton, tilldela administratörsroller och se aktivitet.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Sök användare..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-wsp-500 w-48 sm:w-64"
                />
              </div>

              <button
                onClick={() => setIsCreateUserModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                Skapa användare
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Användare</th>
                  <th className="py-3 px-4">Företag / Enhet</th>
                  <th className="py-3 px-4">Roll</th>
                  <th className="py-3 px-4 text-center">Bevakningar</th>
                  <th className="py-3 px-4 text-center">Träffar</th>
                  <th className="py-3 px-4 text-center">Anbud</th>
                  <th className="py-3 px-4">Senast aktiv</th>
                  <th className="py-3 px-4 text-right">Åtgärder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Inga användare matchade sökningen.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-ted-100 dark:bg-ted-950 text-ted-700 dark:text-ted-300 font-bold text-xs flex items-center justify-center">
                            {(user.fullName || user.email || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {user.fullName || 'Namnlös'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {user.companyName}
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleUserRole(user)}
                          title="Klicka för att växla roll"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-transform active:scale-95 ${
                            user.role === 'admin'
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {user.role === 'admin' ? <ShieldCheck className="w-3 h-3 text-rose-500" /> : <Users className="w-3 h-3" />}
                          {user.role === 'admin' ? 'Admin' : 'Användare'}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-center font-semibold text-slate-800 dark:text-slate-200">
                        {user.watchlistsCount}
                      </td>

                      <td className="py-3.5 px-4 text-center font-semibold text-slate-800 dark:text-slate-200">
                        {user.hitsCount}
                      </td>

                      <td className="py-3.5 px-4 text-center font-semibold text-slate-800 dark:text-slate-200">
                        {user.tendersCount}
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-slate-500">
                        {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }) : 'Aldrig'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditUser(user)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Redigera användare"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Radera användare"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ALLA BEVAKNINGAR & SCHEMALÄGGARE */}
      {activeTab === 'watchlists' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                Alla Bevakningar & Bakgrundspollning
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Övervaka och trigga automatiska bevakningar för samtliga användare i systemet.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Sök bevakning eller ägare..."
                  value={watchlistSearch}
                  onChange={(e) => setWatchlistSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-wsp-500 w-48 sm:w-64"
                />
              </div>

              <button
                onClick={loadWatchlistsData}
                disabled={loadingWatchlists}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                title="Ladda om bevakningar"
              >
                <RefreshCw className={`w-4 h-4 ${loadingWatchlists ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Bevakningsnamn</th>
                  <th className="py-3 px-4">Ägare</th>
                  <th className="py-3 px-4">Frekvens</th>
                  <th className="py-3 px-4 text-center">Träffar (Nya/Totalt)</th>
                  <th className="py-3 px-4">Senast körd</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Åtgärder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredWatchlists.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Inga bevakningar hittades.
                    </td>
                  </tr>
                ) : (
                  filteredWatchlists.map((wl) => (
                    <tr key={wl.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {wl.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs" title={wl.query}>
                          {wl.query || 'Ingen rå query'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {wl.userName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {wl.userEmail}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          wl.emailFrequency === 'weekly'
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                            : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        }`}>
                          {wl.emailFrequency === 'weekly' ? 'Veckovis' : 'Dagligen'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          +{wl.newCount} nya
                        </span>
                        <span className="text-slate-400 text-[11px] ml-1">
                          ({wl.lastHitCount} totalt)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-slate-500">
                        {wl.lastRunAt ? new Date(wl.lastRunAt).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }) : 'Aldrig'}
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleWatchlistActive(wl)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                            wl.active
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {wl.active ? 'Aktiv' : 'Pausad'}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleRunWatchlistAdmin(wl.id, wl.name)}
                            disabled={runningWatchlistId === wl.id}
                            className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                            title="Kör denna bevakning nu"
                          >
                            <Play className={`w-3.5 h-3.5 ${runningWatchlistId === wl.id ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => setInspectWatchlist(wl)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Inspektera filter & TED Query"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteWatchlistAdmin(wl)}
                            className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Radera bevakning"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: E-POST & MAILTRAP */}
      {activeTab === 'email' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Email Service Status */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-rose-500" />
                Mailtrap E-postintegration & Digest-motor
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfiguration för automatiska sammanfattningsmail till användare vid nya upphandlingar.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Konfiguration:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Status:</span>{' '}
                    <strong className={emailStatus?.configured ? 'text-emerald-600' : 'text-amber-500'}>
                      {emailStatus?.configured ? 'Aktiv / Konfigurerad' : 'Ej konfigurerad'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Från e-post:</span>{' '}
                    <strong className="font-mono text-slate-800 dark:text-slate-200">{emailStatus?.fromEmail || 'Ej satt'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Avsändarnamn:</span>{' '}
                    <strong className="text-slate-800 dark:text-slate-200">{emailStatus?.fromName || 'WSP TED Bevakare'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Kategori:</span>{' '}
                    <strong className="text-slate-800 dark:text-slate-200">{emailStatus?.category || 'Watchlist Digest'}</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-600" />
                  Hur sammanfattningsmail fungerar:
                </div>
                <p className="leading-relaxed">
                  Bakgrundsmotorn pollar alla aktiva bevakningar var 10:e minut. När nya upphandlingar hittas flaggas de i databasen. Vid schemalagd tidpunkt (dagligen eller veckovis) skickas ett samlat HTML-mail med WSP-branding och direktlänkar till mottagaren.
                </p>
              </div>
            </div>
          </div>

          {/* Test Email Sender Form */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-wsp-500" />
                Skicka provsammanfattning (Test Digest)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verifiera att HTML-mall, länkar och Mailtrap-leverans fungerar korrekt.
              </p>
            </div>

            <form onSubmit={handleSendTestEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mottagarens e-postadress:
                </label>
                <input
                  type="email"
                  required
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="mats.romblad@wsp.com"
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-wsp-500"
                />
              </div>

              <button
                type="submit"
                disabled={sendingTestEmail}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-wsp-600 hover:bg-wsp-700 text-white text-xs font-bold shadow-md shadow-wsp-600/20 transition-all disabled:opacity-50"
              >
                <Send className={`w-4 h-4 ${sendingTestEmail ? 'animate-spin' : ''}`} />
                {sendingTestEmail ? 'Skickar testmail...' : 'Skicka testmail nu'}
              </button>

              {testEmailResult && (
                <div className={`p-4 rounded-2xl border text-xs ${
                  testEmailResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                }`}>
                  <div className="font-bold mb-1">{testEmailResult.message}</div>
                  {testEmailResult.messageId && (
                    <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                      Message ID: {testEmailResult.messageId}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: API & AI DIAGNOSTIK */}
      {activeTab === 'playground' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TED API Explorer */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-blue-500" />
                TED Search API v3 Testare
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kör råa Expert Queries direkt mot EU TED Search API och analysera resultatet.
              </p>
            </div>

            <form onSubmit={handleRunTestTed} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  TED Expert Query Syntax:
                </label>
                <textarea
                  rows={3}
                  value={tedQueryInput}
                  onChange={(e) => setTedQueryInput(e.target.value)}
                  className="w-full p-3 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTedQueryInput('(buyer-country IN (SWE)) AND classification-cpv IN (71300000) AND form-type = competition')}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  Sverige CPV 71300000
                </button>
                <button
                  type="button"
                  onClick={() => setTedQueryInput('(buyer-country IN (SWE, NOR, DNK, FIN)) AND FT ~ (BIM) AND form-type = competition')}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  Norden BIM
                </button>
              </div>

              <button
                type="submit"
                disabled={tedTesting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                <Play className={`w-4 h-4 ${tedTesting ? 'animate-spin' : ''}`} />
                {tedTesting ? 'Skickar anrop till TED API...' : 'Kör TED API-anrop'}
              </button>

              {tedTestResult && (
                <div className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs space-y-2 max-h-72 overflow-y-auto">
                  <div className="flex justify-between border-b border-slate-800 pb-2 text-[11px]">
                    <span className="text-emerald-400 font-bold">Status: {tedTestResult.success ? '200 OK' : 'FEL'}</span>
                    <span className="text-slate-400">Latens: {tedTestResult.latencyMs} ms | Träffar: {tedTestResult.totalCount ?? 0}</span>
                  </div>
                  <pre className="text-[11px] leading-relaxed whitespace-pre-wrap">
                    {JSON.stringify(tedTestResult.notices?.slice(0, 2) || tedTestResult, null, 2)}
                  </pre>
                </div>
              )}
            </form>
          </div>

          {/* MiniMax LLM Playground */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                MiniMax LLM Diagnostic & Playground
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Testa anslutning och svarstid mot MiniMax-M3 språkmodellen.
              </p>
            </div>

            <form onSubmit={handleRunTestMinimax} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Test-prompt:
                </label>
                <textarea
                  rows={3}
                  value={aiPromptInput}
                  onChange={(e) => setAiPromptInput(e.target.value)}
                  className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAiPromptInput('Generera en kort anbudsstrategi för WSP inom BIM och digital tvilling för Trafikverket.')}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  Anbudsstrategi
                </button>
                <button
                  type="button"
                  onClick={() => setAiPromptInput('Vilka skall-krav är vanligast i offentliga upphandlingar för tekniska konsulter i Sverige?')}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  Skall-krav
                </button>
              </div>

              <button
                type="submit"
                disabled={aiTesting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${aiTesting ? 'animate-spin' : ''}`} />
                {aiTesting ? 'Kallar MiniMax-M3...' : 'Skicka anrop till MiniMax'}
              </button>

              {aiTestResult && (
                <div className="p-4 rounded-2xl bg-slate-950 text-slate-200 text-xs space-y-2 max-h-72 overflow-y-auto">
                  <div className="flex justify-between border-b border-slate-800 pb-2 text-[11px] font-mono">
                    <span className="text-purple-400 font-bold">Modell: {aiTestResult.model || 'MiniMax-M3'}</span>
                    <span className="text-slate-400">Latens: {aiTestResult.latencyMs} ms</span>
                  </div>
                  <div className="text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
                    {aiTestResult.reply || JSON.stringify(aiTestResult, null, 2)}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* TAB 6: DATABAS & UNDERHÅLL */}
      {activeTab === 'maintenance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cleanup Tools */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-500" />
                Databasunderhåll & Rensningsverktyg
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rensa gamla upphandlingsträffar och loggar för att optimera lagringsutrymme.
              </p>
            </div>

            <div className="space-y-4">
              {/* Cleanup Hits */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Rensa gamla bevakningsträffar
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={cleanupHitsDays}
                    onChange={(e) => setCleanupHitsDays(parseInt(e.target.value))}
                    className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value={14}>Äldre än 14 dagar</option>
                    <option value={30}>Äldre än 30 dagar</option>
                    <option value={60}>Äldre än 60 dagar</option>
                    <option value={90}>Äldre än 90 dagar</option>
                  </select>

                  <button
                    onClick={handleCleanupHits}
                    disabled={cleaningHits}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {cleaningHits ? 'Rensar...' : 'Rensa träffar'}
                  </button>
                </div>
              </div>

              {/* Cleanup Chats */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Rensa gamla AI-chattloggar
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={cleanupChatsDays}
                    onChange={(e) => setCleanupChatsDays(parseInt(e.target.value))}
                    className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value={14}>Äldre än 14 dagar</option>
                    <option value={30}>Äldre än 30 dagar</option>
                    <option value={60}>Äldre än 60 dagar</option>
                  </select>

                  <button
                    onClick={handleCleanupChats}
                    disabled={cleaningChats}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {cleaningChats ? 'Rensar...' : 'Rensa chattar'}
                  </button>
                </div>
              </div>

              {/* Release Cron Lock */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Återställ fastnade Cron-lås (Cross-Instance Locking)
                </div>
                <p className="text-[11px] text-slate-500">
                  Om en schemalagd körning avbrutits i molnet kan låset ligga kvar. Klicka här för att tvinga frigörande.
                </p>
                <button
                  onClick={handleReleaseCronLock}
                  disabled={releasingLock}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {releasingLock ? 'Frigör...' : 'Frigör Cron-lås'}
                </button>
              </div>
            </div>
          </div>

          {/* Backup & System Export */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-500" />
                Dataexport & Systembackup
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ladda ner en fullständig strukturerad backup av all systemdata.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <div className="font-bold text-slate-900 dark:text-white">Backupen innehåller:</div>
                <ul className="list-disc pl-5 space-y-1 text-[11px]">
                  <li>Samtliga användarkonton och företagsprofiler</li>
                  <li>Alla aktiva och sparade bevakningar med filter</li>
                  <li>Alla upptäckta anbudsträffar och status</li>
                  <li>Alla sparade anbud i pipelinen med MiniMax AI-analyser</li>
                </ul>
              </div>

              <a
                href={api.adminExportAllUrl()}
                download
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01]"
              >
                <Download className="w-4 h-4" />
                Ladda ner fullständig JSON-backup
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SKAPA NY ANVÄNDARE */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-wsp-500" />
                Skapa nytt användarkonto
              </h3>
              <button
                onClick={() => setIsCreateUserModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  E-postadress *
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="fornamn.efternamn@wsp.com"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-wsp-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fullständigt namn
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Mats Romblad"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-wsp-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Företag / Enhet
                </label>
                <input
                  type="text"
                  value={newUserCompany}
                  onChange={(e) => setNewUserCompany(e.target.value)}
                  placeholder="WSP Sverige AB (BIM-enheten)"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-wsp-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lösenord (valfritt, standard sätts annars)
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Minst 8 tecken"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-wsp-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Behörighetsroll
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'user')}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-wsp-500"
                >
                  <option value="user">Standardanvändare</option>
                  <option value="admin">Administratör (Full åtkomst)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-2 rounded-xl bg-wsp-600 hover:bg-wsp-700 text-white text-xs font-bold shadow-md shadow-wsp-600/20 disabled:opacity-50"
                >
                  {creatingUser ? 'Skapar...' : 'Skapa användare'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REDIGERA ANVÄNDARE */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-500" />
                Redigera användarprofil
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  E-postadress
                </label>
                <input
                  type="email"
                  disabled
                  value={editingUser.email}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fullständigt namn
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Företag / Enhet
                </label>
                <input
                  type="text"
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Roll
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as 'admin' | 'user')}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">Standardanvändare</option>
                  <option value="admin">Administratör</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {savingUser ? 'Sparar...' : 'Spara ändringar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INSPEKTERA BEVAKNING */}
      {inspectWatchlist && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                Bevakningsdetaljer: {inspectWatchlist.name}
              </h3>
              <button
                onClick={() => setInspectWatchlist(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                <div><span className="text-slate-400">Ägare:</span> <strong>{inspectWatchlist.userName}</strong> ({inspectWatchlist.userEmail})</div>
                <div><span className="text-slate-400">Frekvens:</span> <strong>{inspectWatchlist.emailFrequency}</strong></div>
                <div><span className="text-slate-400">Senast körd:</span> <strong>{inspectWatchlist.lastRunAt || 'Aldrig'}</strong></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Genererad TED Expert Query:
                </label>
                <div className="p-3 bg-slate-950 text-slate-200 font-mono text-[11px] rounded-xl overflow-x-auto">
                  {inspectWatchlist.query || 'Ingen query genererad'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sparade Filter (JSON):
                </label>
                <pre className="p-3 bg-slate-950 text-slate-200 font-mono text-[11px] rounded-xl overflow-x-auto max-h-48">
                  {JSON.stringify(inspectWatchlist.filters, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectWatchlist(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
