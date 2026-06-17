import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { BottomNav } from "@/components/BottomNav";
import { listWorkers, getCurrentWorker } from "@/lib/session";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Disability Support Suite",
  description: "NDIS support-worker tools — development build",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [workers, current] = await Promise.all([listWorkers(), getCurrentWorker()]);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-[calc(env(safe-area-inset-bottom)+4.5rem)]">
        {/* Dev-only role switch — replaced by real PIN login later. */}
        <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2">
          <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
            Dev
          </span>
          {workers.length > 0 && (
            <RoleSwitcher workers={workers} currentId={current?.id} />
          )}
        </div>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
