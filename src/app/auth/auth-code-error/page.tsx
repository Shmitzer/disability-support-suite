// Shown when a magic link couldn't be verified (expired, already used, or the
// link was opened on a different device than the one that requested it).

import Link from "next/link";

export default function AuthCodeError() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-6 py-16 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Sign-in link didn&apos;t work
        </h1>
        <p className="text-sm text-zinc-500">
          That link may have expired or already been used. Request a fresh one
          and open it on this device.
        </p>
      </div>
      <Link
        href="/login"
        className="self-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        Back to sign in
      </Link>
    </main>
  );
}
