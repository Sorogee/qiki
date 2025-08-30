import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Qikiworld',
  description: 'Qikiworld UI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="qw-ui-ok" content="QW_UI_OK" />
      </head>
      <body>{children}</body>
    </html>
  );
}
