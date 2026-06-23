import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { sectorLabels } from "@/lib/sector-config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// App-level metadata is static; it uses the default (NDIS) sector tagline. A
// per-tenant title can move to generateMetadata() once orgs/RLS land.
export const metadata: Metadata = {
  title: "Disability Support Suite",
  description: `${sectorLabels().tagline} — development build`,
};

// Root layout: html/body/fonts only. The authenticated chrome (nav, sign-out)
// lives in (protected)/layout.tsx; the login screen lives in (public).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
