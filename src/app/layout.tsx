import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import "@/components/caira/caira.css";
import { APP_NAME } from "@/lib/brand";
import { sectorLabels } from "@/lib/sector-config";
import { PostHogInit } from "@/components/PostHogInit";
import { getCurrentUser } from "@/lib/session";
import { getOrgCairaEnabled } from "@/lib/org-settings";
import { cairaPersona } from "@/lib/caira/roles";
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
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The Caira character system is an org-wide setting (admins can switch it off for
  // all their users). getCurrentUser() is cache()d, so this is deduped with the
  // protected layout. Unknown org (e.g. pre-auth) falls back to the default (on).
  //
  // Resilient by design: the root layout wraps EVERY page (incl. public/login), so a
  // transient DB hiccup must never 500 the whole app — fall back to sensible Caira
  // defaults and let the page itself decide what to do about the outage.
  let cairaEnabled = true;
  let persona: ReturnType<typeof cairaPersona> = "worker";
  let aiLevel: "simple" | "adjusted" = "simple";
  try {
    const user = await getCurrentUser();
    cairaEnabled = await getOrgCairaEnabled(user?.organisationId);
    persona = cairaPersona(user?.role);
    aiLevel =
      (user as { participantAILevel?: string } | null)?.participantAILevel === "adjusted"
        ? "adjusted"
        : "simple";
  } catch (err) {
    console.error("Root layout: Caira context lookup failed, using defaults:", err);
  }

  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className={`flex min-h-full flex-col ${cairaEnabled ? "pt-[58px]" : ""}`}>
        <PostHogInit />
        <CairaProvider enabled={cairaEnabled} persona={persona} initialAiLevel={aiLevel}>
          {cairaEnabled && <CairaBar />}
          {children}
          {cairaEnabled && <CairaAIOverlay />}
          {cairaEnabled && <CairaRecordingOverlay />}
        </CairaProvider>
      </body>
    </html>
  );
}
