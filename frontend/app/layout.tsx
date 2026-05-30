import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider } from '@/lib/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: 'SmartShelf',
  description: 'Smart product matching and inventory tracking system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <LanguageProvider>
          {children}
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        </LanguageProvider>
      </body>
    </html>
  );
}
