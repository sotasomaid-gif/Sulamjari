import React from 'react';
import { Lock, EyeOff, ShieldAlert, Database } from 'lucide-react';
import { UserRole } from '../types';
import { ROLE_DEFINITIONS } from '../utils/rbac';

interface BlurMaskProps {
  isAllowed: boolean;
  children: React.ReactNode;
  activeRole?: UserRole;
  title?: string;
  reason?: string;
  mode?: 'inline' | 'card' | 'block' | 'table-cell' | 'stat';
  onGoToSettings?: () => void;
  className?: string;
}

export const BlurMask: React.FC<BlurMaskProps> = ({
  isAllowed,
  children,
  activeRole = 'admin_pabrik',
  title = 'Data Dibatasi (Hak Akses)',
  reason = 'Peran Anda tidak diizinkan melihat informasi ini',
  mode = 'block',
  onGoToSettings,
  className = '',
}) => {
  if (isAllowed) {
    return <>{children}</>;
  }

  const roleInfo = ROLE_DEFINITIONS[activeRole] || ROLE_DEFINITIONS.admin_pabrik;

  // Mode: STAT (Specially optimized for large KPI metric numbers on Dashboard / Summaries)
  // Shows realistic blurred numerical silhouette so user sees actual live figures exist,
  // accompanied by an unambiguous visual indicator badge with layout stability.
  if (mode === 'stat') {
    return (
      <div
        className={`relative inline-flex flex-col justify-center min-h-[44px] select-none cursor-not-allowed group ${className}`}
        title={`${title}: ${reason} (Konten tercatat di sistem namun dibatasi hak akses)`}
      >
        <div className="relative overflow-hidden rounded-md py-0.5 px-0.5 max-w-full">
          {/* Blurred figures maintaining layout width and shape */}
          <div className="filter blur-[6.5px] opacity-40 select-none pointer-events-none transition-all font-mono tracking-tight">
            {children}
          </div>
          {/* Subtle frosted glass sheen */}
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px] pointer-events-none rounded-md" />
        </div>

        {/* Visual indicator that content is available in the database but restricted by role */}
        <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200/90 shadow-2xs self-start">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <Lock className="w-2.5 h-2.5 text-amber-700 shrink-0" />
          <span>Data Finansial Dibatasi</span>
        </div>
      </div>
    );
  }

  // Mode: INLINE (for numbers, badges, single values inside text, tables, or headers)
  if (mode === 'inline') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 select-none cursor-not-allowed group relative align-baseline ${className}`}
        title={`${title}: ${reason} (Data tercatat di database)`}
      >
        <span className="filter blur-[5px] opacity-40 select-none pointer-events-none transition-all font-mono">
          {children}
        </span>
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs shrink-0 leading-tight">
          <Lock className="w-2.5 h-2.5 text-amber-700 shrink-0" />
          <span>Dibatasi</span>
        </span>
      </span>
    );
  }

  // Mode: TABLE CELL (fits inside <td> nicely without breaking alignment)
  if (mode === 'table-cell') {
    return (
      <div
        className={`relative inline-flex items-center justify-center min-w-[76px] select-none ${className}`}
        title={`${title}: ${reason} (Data tercatat di sistem)`}
      >
        <span className="filter blur-[5px] opacity-30 select-none pointer-events-none">
          {children}
        </span>
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50/95 text-amber-900 border border-amber-200 shadow-2xs backdrop-blur-2xs">
            <Lock className="w-2.5 h-2.5 text-amber-600" />
            <span>Dibatasi</span>
          </span>
        </span>
      </div>
    );
  }

  // Mode: CARD (For KPI metric cards, charts, alert boxes)
  if (mode === 'card') {
    return (
      <div className={`relative overflow-hidden rounded-2xl group ${className}`}>
        {/* Blurred Content Behind - silhouette proves real content exists */}
        <div className="filter blur-md opacity-25 select-none pointer-events-none transition-all scale-[0.99]">
          {children}
        </div>

        {/* Frosted Glass Overlay with Clear Status */}
        <div className="absolute inset-0 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-10 border border-slate-200/90 rounded-2xl">
          {/* Indicator that data is actually present in the system */}
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Data Tersedia di Database</span>
          </div>

          <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-1.5 shadow-2xs">
            <Lock className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-xs font-bold text-slate-800 leading-tight">
            {title}
          </span>
          <p className="text-[11px] text-slate-500 mt-1 max-w-[220px] line-clamp-2">
            Peran <strong className={roleInfo.textColor}>{roleInfo.title}</strong> tidak memiliki izin melihat data ini.
          </p>
          {onGoToSettings && (
            <button
              onClick={onGoToSettings}
              className="mt-2.5 text-[10px] font-semibold text-red-600 hover:text-red-700 underline flex items-center gap-1 cursor-pointer"
            >
              Ubah Hak Akses di Pengaturan
            </button>
          )}
        </div>
      </div>
    );
  }

  // Mode: BLOCK (Default for large sections or tab-level view restriction)
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 p-6 bg-slate-50/50 ${className}`}>
      {/* Blurred Preview Behind */}
      <div className="filter blur-lg opacity-20 select-none pointer-events-none max-h-[360px] overflow-hidden">
        {children}
      </div>

      {/* Centered Lock Message */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-white/85 backdrop-blur-xs">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3 shadow-2xs">
          <Database className="w-3 h-3 text-emerald-600" />
          <span>Data Aktif di Sistem Operasional</span>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3 shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-base font-extrabold text-slate-900 mb-1">
          {title}
        </h3>
        <p className="text-xs text-slate-600 max-w-md leading-relaxed mb-4">
          Data pada modul ini disembunyikan/blur karena peran aktif saat ini (
          <span className={`font-bold ${roleInfo.textColor}`}>{roleInfo.title}</span>) belum diberikan izin akses.
        </p>

        <div className="flex items-center gap-2">
          {onGoToSettings && (
            <button
              onClick={onGoToSettings}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              Buka Pengaturan Hak Akses
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
