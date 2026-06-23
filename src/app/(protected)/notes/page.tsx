// The Progress Note Generator, on its own page now that the worker homepage
// lives at "/". Reads participants and recent notes from the local database.

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NoteGenerator } from "@/components/NoteGenerator";
import { getCurrentSector } from "@/lib/session";
import { sectorLabels } from "@/lib/sector-config";

// Always read fresh data from the database on each request.
export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const sector = await getCurrentSector();
  const labels = sectorLabels(sector);

  const participants = await prisma.participant.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const recentNotes = await prisma.progressNote.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { participant: true },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
          ← Home
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Progress Note Generator
        </h1>
        <p className="text-zinc-600">
          Type rough shift notes and get a clean, {labels.noteStyle} progress note. Always review
          and edit before saving to your official records.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        {participants.length > 0 ? (
          <NoteGenerator participants={participants} sector={sector} />
        ) : (
          <p className="text-zinc-600">
            No {labels.participantPlural} yet. Run the seed script to add sample data.
          </p>
        )}
      </section>

      {recentNotes.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">Recent notes</h2>
          <ul className="flex flex-col gap-3">
            {recentNotes.map((note) => (
              <li
                key={note.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-zinc-800">
                    {note.participant.name}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {note.createdAt.toLocaleString("en-AU")}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-700">
                  {note.generatedNote}
                </pre>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-auto pt-4 text-center text-xs text-zinc-400">
        Development build · sample data only · do not enter real {labels.participant} information
      </footer>
    </main>
  );
}
