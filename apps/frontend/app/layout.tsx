import type {Metadata} from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'dewa.fun',
  description: 'The AI-Native Token Launchpad & Social Casino on Solana — Launch, Play, and Grow your memecoin with AI-powered tools.',
};

import { Providers } from '@/components/Providers';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} dark`}>
      <body className="bg-[#121212] text-zinc-200 font-mono antialiased selection:bg-white/30" suppressHydrationWarning>
        <Providers>
          <div className="min-h-screen flex flex-col md:flex-row">
            <Sidebar />
            <main className="flex-1 p-4 md:p-6 max-w-[1400px] mx-auto w-full h-screen overflow-y-auto">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
