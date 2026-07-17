import type { Metadata, Viewport } from 'next';
import { Nunito, Archivo_Black } from 'next/font/google';
import './globals.css';

/** Bold display — cartoon storefront title energy. */
const display = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

/** Rounded sans — flat cartoon UI like balmingtiger’s clean labels. */
const body = Nunito({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VCR Records — Video Cassette Recordings',
  description:
    'Step inside the VCR Records store. A full 360° hand-illustrated panorama of a 1990s jungle & drum and bass record shop. Look around, explore, and discover.',
  keywords: [
    'VCR Records',
    'jungle',
    'drum and bass',
    'record store',
    'vinyl',
    'immersive',
  ],
  openGraph: {
    title: 'VCR Records',
    description: 'An interactive 360° record-store installation. Look around, explore, discover.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#ebe4d6',
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
