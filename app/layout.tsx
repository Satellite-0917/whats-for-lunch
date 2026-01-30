import './globals.css';
import type { ReactNode } from 'react';
import Script from 'next/script';

export const metadata = {
  title: '오늘 뭐 먹지?',
  description: 'Google Sheets powered lunch & cafe picker',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <Script
          strategy="beforeInteractive"
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
