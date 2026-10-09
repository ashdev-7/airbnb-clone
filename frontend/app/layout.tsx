import type { Metadata } from "next";
import { Instrument_Sans, Nunito } from "next/font/google";
import { SITE_NAME, SITE_TITLE } from "@/lib/config";
import "./globals.css";
import { Providers } from "./providers";

// The free family closest to the original's typeface, chosen by measuring rendered text
// against capture A1 (docs/parity-notes.md). Fetched at build time and served by us.
const brandFont = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand",
  display: "swap",
});

// The wordmark alone: a rounded face, as the original mark is rounded (capture A1).
const wordmarkFont = Nunito({ subsets: ["latin"], weight: ["800"], variable: "--font-wordmark-face", display: "swap" });

export const metadata: Metadata = {
  // Each page names itself; the home page keeps the full title (plan §5.2).
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: `${SITE_NAME}: find and book homes.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${brandFont.variable} ${wordmarkFont.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
