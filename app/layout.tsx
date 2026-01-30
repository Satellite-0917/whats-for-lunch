import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: '오늘 뭐 먹지?',
  description: 'Google Sheets powered lunch & cafe picker',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
