import React from 'react';
import { Lock, EyeOff } from 'lucide-react';

interface BlurredValueProps {
  isAllowed: boolean;
  children: React.ReactNode;
  fallbackText?: string;
  showBadge?: boolean;
  className?: string;
}

export const BlurredValue: React.FC<BlurredValueProps> = ({
  isAllowed,
  children,
  fallbackText = 'Disamarkan',
  showBadge = true,
  className = '',
}) => {
  if (isAllowed) {
    return <>{children}</>;
  }

  return (
    <span
      className={`relative inline-flex items-center align-middle group cursor-help select-none ${className}`}
      title="Data sensitif ini disamarkan sesuai pengaturan Hak Akses peran Anda"
    >
      <span className="filter blur-[6px] select-none pointer-events-none opacity-45 px-1 py-0.5 rounded bg-slate-200/50 transition-all font-mono">
        {children}
      </span>
      {showBadge && (
        <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs whitespace-nowrap">
          <Lock className="w-2.5 h-2.5 text-amber-600" />
          <span>{fallbackText}</span>
        </span>
      )}
    </span>
  );
};

interface BlurredCardProps {
  isAllowed: boolean;
  roleName?: string;
  message?: string;
  children: React.ReactNode;
  className?: string;
  onOpenHakAkses?: () => void;
}

export const BlurredCard: React.FC<BlurredCardProps> = ({
  isAllowed,
  roleName = 'Peran Anda',
  message,
  children,
  className = '',
  onOpenHakAkses,
}) => {
  if (isAllowed) {
    return <>{children}</>;
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-amber-200 bg-amber-50/20 ${className}`}>
      {/* Blurred background content */}
      <div className="filter blur-[7px] select-none pointer-events-none opacity-30 p-2">
        {children}
      </div>

      {/* Floating Restricted Overlay Card */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-white/75 backdrop-blur-[2px]">
        <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shadow-xs mb-2.5">
          <Lock className="w-5 h-5 text-amber-700" />
        </div>
        <h4 className="text-sm font-bold text-slate-900">
          Informasi Terkunci untuk {roleName}
        </h4>
        <p className="text-xs text-slate-600 max-w-md mt-1 mb-3">
          {message || 'Data keuangan dan profitabilitas disamarkan sesuai matriks checklist Hak Akses.'}
        </p>
        {onOpenHakAkses && (
          <button
            onClick={onOpenHakAkses}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors shadow-2xs"
          >
            <EyeOff className="w-3.5 h-3.5 text-amber-700" />
            Buka Pengaturan Hak Akses
          </button>
        )}
      </div>
    </div>
  );
};
