import type { Metadata } from "next";
import { SITE_NAME, SITE_TITLE } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: `${SITE_NAME}: find and book homes.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
