import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
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

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: `${SITE_NAME}: find and book homes.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${brandFont.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
