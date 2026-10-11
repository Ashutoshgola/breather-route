import { useEffect, useRef } from 'react';
import { Award, Download, X } from 'lucide-react';

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

export default function CertificateModal({ points, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    dialogRef.current?.querySelector('button')?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'Tab') {
        const buttons = dialogRef.current?.querySelectorAll('button');
        if (!buttons?.length) return;

        const firstButton = buttons[0];
        const lastButton = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === firstButton) {
          event.preventDefault();
          lastButton.focus();
        } else if (!event.shiftKey && document.activeElement === lastButton) {
          event.preventDefault();
          firstButton.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  const downloadCertificate = () => {
    const issuedDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850" viewBox="0 0 1200 850">
      <rect width="1200" height="850" fill="#071426"/>
      <rect x="32" y="32" width="1136" height="786" rx="28" fill="none" stroke="#34d399" stroke-width="4"/>
      <rect x="52" y="52" width="1096" height="746" rx="20" fill="none" stroke="#fbbf24" stroke-width="1.5"/>
      <text x="600" y="150" fill="#6ee7b7" font-family="Arial,sans-serif" font-size="26" letter-spacing="8" text-anchor="middle">BREATHEROUTE • DELHI-NCR</text>
      <text x="600" y="290" fill="#f8fafc" font-family="Arial,sans-serif" font-size="56" font-weight="700" text-anchor="middle">CLEAN AIR CHAMPION</text>
      <path d="M440 330H760" stroke="#34d399" stroke-width="4"/>
      <text x="600" y="410" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="27" text-anchor="middle">In recognition of choosing a cleaner route</text>
      <text x="600" y="465" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="27" text-anchor="middle">and supporting healthier journeys across Delhi-NCR.</text>
      <circle cx="600" cy="580" r="72" fill="#064e3b" stroke="#34d399" stroke-width="3"/>
      <text x="600" y="575" fill="#f8fafc" font-family="Arial,sans-serif" font-size="38" font-weight="700" text-anchor="middle">${escapeXml(points)}</text>
      <text x="600" y="612" fill="#a7f3d0" font-family="Arial,sans-serif" font-size="17" text-anchor="middle">BREATHEPOINTS</text>
      <text x="600" y="720" fill="#94a3b8" font-family="Arial,sans-serif" font-size="19" text-anchor="middle">Issued ${escapeXml(issuedDate)} • A BreatheRoute community achievement</text>
      <text x="600" y="758" fill="#64748b" font-family="Arial,sans-serif" font-size="15" text-anchor="middle">Not a government-issued certificate</text>
    </svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'delhi-ncr-clean-air-champion.svg';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="certificate-title"
        ref={dialogRef}
        className="w-full max-w-lg rounded-3xl border border-emerald-400/30 bg-slate-900 p-6 shadow-2xl shadow-emerald-950/40"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex rounded-xl bg-emerald-400/10 p-3 text-emerald-300">
              <Award className="h-7 w-7" />
            </div>
            <h2 id="certificate-title" className="text-xl font-bold text-white">
              Delhi-NCR Clean Air Champion
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Celebrate your cleaner-route choices and the air-quality awareness you bring to every commute.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close certificate"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="my-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Your BreathePoints</p>
          <p className="mt-1 text-4xl font-black text-white">{points}</p>
        </div>

        <p className="mb-4 text-xs text-slate-400">
          This is a BreatheRoute community achievement, not a government-issued certificate.
        </p>
        <button
          type="button"
          onClick={downloadCertificate}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
        >
          <Download className="h-4 w-4" />
          Download certificate
        </button>
      </section>
    </div>
  );
}
