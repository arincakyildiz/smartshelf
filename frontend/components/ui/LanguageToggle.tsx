'use client';

import { useI18n } from '@/lib/i18n';

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useI18n();

  return (
    <div className={`flex rounded-lg border border-navy-700 overflow-hidden text-xs font-semibold ${className}`}>
      {(['tr', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`flex-1 px-3 py-1.5 transition-colors ${
            lang === l
              ? 'bg-white text-navy-900'
              : 'text-navy-200 hover:bg-navy-800 hover:text-white'
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
