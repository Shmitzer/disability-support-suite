// Privacy policy — placeholder route (Phase 0 gate item). Static, public, no auth.
//
// IMPORTANT: this is a DRAFT scaffold so the route and link exist before launch. The
// wording below is NOT legal advice and has not been reviewed. Because this app
// handles NDIS participants' personal and health information, the final policy must
// be reviewed against the Australian Privacy Act 1988 (APPs) and NDIS privacy
// obligations before any real user data is collected.

import type { Metadata } from "next";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${APP_NAME} collects, uses and protects your data.`,
};

const UPDATED = "Draft — not yet finalised";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Draft.</strong> This policy is a placeholder pending legal review and is
        not yet in effect.
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Privacy Policy</h1>
      <p className="mt-1 text-sm text-zinc-500">Last updated: {UPDATED}</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-zinc-700">
        <section>
          <h2 className="text-base font-semibold text-zinc-900">Who we are</h2>
          <p className="mt-2">
            {APP_NAME} is a tool used by disability support workers and
            providers to record shifts, progress notes and related records. This policy
            explains what information we collect and how we handle it.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900">Information we collect</h2>
          <p className="mt-2">
            Account details (such as your email address), records you create in the app
            (shifts, progress notes, mileage), and the personal and health information of
            participants that you enter in the course of providing support.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900">
            Participant health information
          </h2>
          <p className="mt-2">
            Participant information is sensitive information under the Privacy Act. It is
            stored on our behalf by our infrastructure providers, access-controlled so
            that organisations can only see their own data, and is never sold. Where
            content is processed by AI features, personal identifiers are removed before
            it leaves our systems.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900">How we use it</h2>
          <p className="mt-2">
            To provide and improve the service, to generate documentation you request,
            and to meet our legal and record-keeping obligations. We do not use your data
            for advertising.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900">Your rights</h2>
          <p className="mt-2">
            You can request access to, correction of, or deletion of your personal
            information. Contact details for these requests will be published here before
            launch.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900">Contact</h2>
          <p className="mt-2">
            Questions about this policy can be directed to the support contact published
            with the final version of this document.
          </p>
        </section>
      </div>
    </main>
  );
}
