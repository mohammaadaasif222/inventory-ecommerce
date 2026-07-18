import type { Metadata } from 'next';
import { Cormorant_Garamond, Fraunces, Jost } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

/**
 * Display faces for the storefront presets, self-hosted by next/font.
 * Each `.theme-*` block picks one via `--font-display`, so the type changes
 * with the palette rather than being hardcoded per component.
 */
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-fraunces',
  display: 'swap',
});

const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-jost',
  display: 'swap',
});

const fontVars = `${cormorant.variable} ${fraunces.variable} ${jost.variable}`;

export const metadata: Metadata = {
  title: 'E-Commerce Platform',
  description:
    'Production-ready commerce platform with inventory, live chat & website configuration.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVars}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
