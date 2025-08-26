import './globals.css';
import type { Metadata } from 'next';
import { I18nProvider } from '../lib/i18n';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: { default: 'Qikiworld', template: '%s · Qikiworld' },
  description: 'Community forum',
  metadataBase: new URL(SITE),
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'Qikiworld',
  },
  alternates: {
    canonical: SITE
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
  <meta name="qw-ui-ok" content="QW_UI_OK" />
    <meta name=\"qw-ui-ok\" content=\"QW_UI_OK\" />
        <link rel="canonical" href={SITE} />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <I18nProvider>
          <div id="main" tabIndex={-1}>{children}</div>
        </I18nProvider>
      </body>
    </html>
  );
}
