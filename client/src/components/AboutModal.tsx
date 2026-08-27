import React from 'react';
import {
  X,
  Building2,
  Sparkles,
  ExternalLink,
  Code2,
  Layers,
  Heart,
  ShieldCheck,
  Cpu,
  Database,
  Mail,
  UserCheck
} from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] z-10 animate-fadeIn">
        
        {/* Header with background gradient */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white relative overflow-hidden">
          <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-16 -top-16 w-48 h-48 bg-ted-500/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ted-500 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-ted-500/30">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">TED Bevakare</h2>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-ted-500/30 text-ted-200 border border-ted-400/30">
                    v1.0
                  </span>
                </div>
                <p className="text-xs text-purple-200 font-medium">Tenders Electronic Daily Monitor & AI-Analys</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-sm">
          
          {/* Creator & Vision */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-800 space-y-2">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold text-xs uppercase tracking-wider">
              <UserCheck className="w-4 h-4" />
              <span>Skapare & Bakgrund</span>
            </div>
            <p className="text-slate-800 dark:text-slate-200 leading-relaxed text-sm">
              Appen är skapad och utvecklad av <strong>Mats Romblad</strong> (<a href="mailto:mats.romblad@wsp.com" className="text-ted-600 dark:text-ted-400 font-medium hover:underline">mats.romblad@wsp.com</a>) med syftet att ge konsulter, anbudsgivare och företag ett modernt, AI-drivet och transparent verktyg för att hitta och analysera offentliga upphandlingar i Sverige och övriga EU.
            </p>
          </div>

          {/* Purpose & Replaced Systems */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-ted-600 dark:text-ted-400" />
              Syfte & Ersatta system
            </h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
              TED Bevakare kopplar upp sig direkt mot EU:s officiella databas <strong>TED (Tenders Electronic Daily)</strong> och ersätter behovet av dyra kommersiella mellanhänder och bevakningsabonnemang såsom:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {['Tendium', 'Kommers Annons', 'e-Avrop', 'Mercell / Opic', 'Visma TendSign', 'TED Direktflöde'].map((name) => (
                <div
                  key={name}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-ted-600 dark:bg-ted-400" />
                  <span className="truncate">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tech Stack Highlights */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Teknologi & Arkitektur
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  MiniMax-M3 AI
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Djupgående anbudsanalys, matchningspoäng (0-100%), krav- och riskidentifiering samt naturligt språk-sök.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                  <Database className="w-3.5 h-3.5 text-blue-500" />
                  TED v3 API & SQLite/Supabase
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Direkt API-koppling till EU:s officiella TED-index med lokal databaslagring och molnsynkronisering.
                </p>
              </div>
            </div>
          </div>

          {/* Links & Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/matsromblad/ted-upphandlingsbevakare"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Code2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                GitHub Repository
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>

              <a
                href="https://ted.europa.eu/sv/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ted-600 dark:text-ted-400 hover:underline transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Officiella TED (EU)
              </a>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-sm transition-colors"
            >
              Stäng
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
