import type { Metadata, Viewport } from 'next';
import { Archivo_Black, Outfit } from 'next/font/google';
import './globals.css';

/** Bold display — brand mark only (gate / panel titles). */
const display = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

/** Clean geometric sans — balmingtiger-style floating chrome. */
const body = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VCR Records — Video Cassette Recordings',
  description:
    'Step inside the VCR Records store. A full 360° illustrated jungle & drum and bass record shop. Look around, explore, and discover.',
  keywords: [
    'VCR Records',
    'jungle',
    'drum and bass',
    'record store',
    'vinyl',
    'immersive',
    'underground',
  ],
  openGraph: {
    title: 'VCR Records',
    description: 'An interactive 360° underground record-store. Look around, explore, discover.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#e9b21d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
