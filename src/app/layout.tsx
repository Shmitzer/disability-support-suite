import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import "@/components/caira/caira.css";
import { APP_NAME } from "@/lib/brand";
import { sectorLabels } from "@/lib/sector-config";
import { PostHogInit } from "@/components/PostHogInit";
import { CairaProvider } from "@/components/caira/CairaContext";
import CairaBar from "@/components/caira/CairaBar";
import CairaAIOverlay from "@/components/caira/CairaAIOverlay";
import CairaRecordingOverlay from "@/components/caira/CairaRecordingOverlay";

// Caira type system: Bricolage Grotesque for display/headings, Figtree for body.
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const sans = Figtree({
  variable: "--font-sans-base",
  subsets: ["latin"],
  display: "swap",
});

// App-level metadata is static; it uses the default (NDIS) sector tagline. A
// per-tenant title can move to generateMetadata() once orgs/RLS land.
export const metadata: Metadata = {
  title: APP_NAME,
  description: `${APP_NAME} — ${sectorLabels().tagline}`,
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
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col pt-[58px]">
        <PostHogInit />
        <CairaProvider>
          <CairaBar />
          {children}
          <CairaAIOverlay />
          <CairaRecordingOverlay />
        </CairaProvider>
      </body>
    </html>
  );
}
