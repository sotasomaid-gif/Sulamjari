import React from 'react';
import {
  X,
  CheckCheck,
  Copy,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  Send,
  MessageSquare,
  Check,
  Smartphone,
} from 'lucide-react';
import { OtpSimulationMessage } from '../utils/auth';

interface WhatsAppChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: OtpSimulationMessage | null;
  onAutoFillAndVerify?: (otpCode: string) => void;
}

export const WhatsAppChatModal: React.FC<WhatsAppChatModalProps> = ({
  isOpen,
  onClose,
  message,
  onAutoFillAndVerify,
}) => {
  const [copiedOtp, setCopiedOtp] = React.useState(false);
  const [copiedFull, setCopiedFull] = React.useState(false);

  if (!isOpen || !message) return null;

  const handleCopyOtp = () => {
    navigator.clipboard.writeText(message.otpCode);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2500);
  };

  const handleCopyFullMessage = () => {
    navigator.clipboard.writeText(message.messageText);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-100 rounded-3xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden flex flex-col font-sans transition-all scale-100 max-h-[92vh]">
        {/* WhatsApp App Bar Header */}
        <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-lg shadow-inner">
                🍜
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#075E54] rounded-full"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-base leading-tight">
                  Pabrik Mie Sulamjari
                </span>
                <span className="bg-emerald-500 text-white rounded-full p-0.5" title="Akun Bisnis Resmi">
                  <ShieldCheck className="w-3 h-3" />
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 flex items-center gap-1">
                <span>WhatsApp Gateway Otomatis</span>
                <span>•</span>
                <span className="text-emerald-300">Online</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-white/80">
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
              title="Tutup Pratinjau WhatsApp"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* WhatsApp Subheader Alert Banner with Direct Action */}
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center justify-between gap-2 text-xs text-emerald-900 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
            <span className="truncate">
              Tujuan: <strong>{message.toPhone}</strong>{' '}
              <span className="font-mono text-emerald-700 font-semibold">(+{message.rawPhone})</span>
            </span>
          </div>

          <a
            href={message.waWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-black shadow-xs shrink-0 transition-transform active:scale-95 cursor-pointer"
            title="Klik untuk langsung membuka chat WhatsApp Web dengan nomor pendaftar"
          >
            <span>Kirim via WA Web</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Chat Body (WhatsApp Wallpaper feel) */}
        <div className="p-4 sm:p-5 flex-1 min-h-[220px] overflow-y-auto space-y-3 bg-[#EFEAE2] relative">
          {/* Encryption notice */}
          <div className="text-center my-1">
            <span className="inline-block bg-[#FFEECD] text-amber-900 text-[10px] font-semibold px-3 py-1 rounded-lg shadow-2xs border border-amber-200/60 max-w-[90%] leading-relaxed">
              🔒 Pesan verifikasi akun resmi Pabrik Mie Sulamjari siap dikirim ke WhatsApp pendaftar.
            </span>
          </div>

          {/* Today Divider */}
          <div className="text-center my-2">
            <span className="bg-white/80 text-slate-500 text-[10px] uppercase font-bold px-3 py-0.5 rounded-md shadow-2xs">
              HARI INI
            </span>
          </div>

          {/* WhatsApp Message Bubble */}
          <div className="flex justify-start">
            <div className="bg-white text-slate-800 rounded-2xl rounded-tl-none p-3.5 sm:p-4 max-w-[95%] shadow-md border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100 pb-1.5">
                <span className="font-bold text-[#075E54]">Sistem Pabrik Mie Sulamjari</span>
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">
                  {message.roleName}
                </span>
              </div>

              <div className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed font-normal">
                {message.messageText}
              </div>

              {/* Large OTP Visual Card inside bubble */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-400 rounded-xl p-3 text-center my-2 shadow-xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  KODE VERIFIKASI OTP ANDA
                </span>
                <div className="text-2xl sm:text-3xl font-black tracking-widest text-[#075E54] py-1 select-all font-mono">
                  {message.otpCode}
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Berlaku selama 15 menit • Rahasiakan dari siapapun
                </span>
              </div>

              {/* Timestamp & Double Blue Ticks */}
              <div className="flex items-center justify-end gap-1 text-[11px] text-slate-600 font-medium pt-1">
                <span>{message.timestamp}</span>
                <CheckCheck className="w-4 h-4 text-sky-500 stroke-[2.5]" />
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Modal Footer Actions */}
        <div className="bg-white p-4 border-t border-slate-200 space-y-3 shrink-0">
          {/* Main Hero CTA: Direct WhatsApp Web Link */}
          <a
            href={message.waWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1da850] text-white font-extrabold text-sm shadow-md transition-all active:scale-[0.99] border border-emerald-600/30 cursor-pointer"
          >
            <Send className="w-4 h-4 shrink-0" />
            <span>Kirim Otomatis via WhatsApp Web</span>
            <ExternalLink className="w-4 h-4 shrink-0" />
          </a>

          {/* Secondary Action Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              onClick={handleCopyOtp}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-all border border-slate-300 cursor-pointer"
            >
              {copiedOtp ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Kode Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>Salin Kode OTP</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyFullMessage}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-all border border-slate-300 cursor-pointer"
            >
              {copiedFull ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Pesan Tersalin!</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                  <span>Salin Teks Lengkap</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Universal Link & Auto-fill */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
            <a
              href={message.waUniversalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 font-medium hover:underline"
            >
              <Smartphone className="w-3 h-3 text-emerald-600" />
              <span>Buka di Aplikasi WhatsApp (HP / Desktop)</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>

            {onAutoFillAndVerify && (
              <button
                onClick={() => {
                  onAutoFillAndVerify(message.otpCode);
                  onClose();
                }}
                className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer"
              >
                <span>Gunakan &amp; Verifikasi Langsung</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full text-center py-1 text-[11px] text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            Tutup Pratinjau
          </button>
        </div>
      </div>
    </div>
  );
};
