import type { Metadata, Viewport } from 'next';
import { Anton, VT323, Space_Grotesk } from 'next/font/google';
import './globals.css';

const display = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const mono = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const body = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VCR Records — Video Cassette Recordings',
  description:
    'Step inside the VCR Records store. A fixed-camera, hand-illustrated panorama of a 1990s jungle & drum and bass record shop. Pan, explore, and discover.',
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
    description: 'An interactive record-store installation. Pan, explore, discover.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0705',
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
    <html lang="en" className={`${display.variable} ${mono.variable} ${body.variable}`}>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
