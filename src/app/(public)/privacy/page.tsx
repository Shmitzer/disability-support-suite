// Privacy policy — public, static, no auth (Phase 0 gate item).
//
// IMPORTANT: this is an ENTERPRISE-ORIENTED DRAFT. The wording below is NOT legal
// advice and has NOT been reviewed by a lawyer. Because this app handles NDIS
// participants' personal and health (sensitive) information, the final policy MUST
// be reviewed against the Australian Privacy Act 1988 (incl. the APPs and the
// Notifiable Data Breaches scheme) and NDIS privacy obligations before any real
// user or participant data is collected. Contact details, the legal entity name,
// the live sub-processor list and concrete retention periods are placeholders
// pending sign-off.

import type { Metadata } from "next";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Privacy Policy (Draft)",
  description: `How ${APP_NAME} collects, uses, stores and protects personal and health information.`,
};

const UPDATED = "Draft — not yet finalised (pending legal review)";

// One section = a heading + its paragraphs/lists. Kept as a small wrapper so the
// page reads as an outline; styling lives here.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 text-foreground">
      <div className="mb-8 rounded-2xl border border-[#efe1c6] bg-[#fdf6ea] px-4 py-3 text-sm text-[#8a6a1f]">
        <strong>Draft — not in effect.</strong> This is an enterprise privacy policy draft
        prepared for review. It is not legal advice and has not been reviewed against the
        Privacy Act 1988 (Cth) or NDIS obligations. Placeholders below (legal entity,
        contact, sub-processors, retention periods) are finalised before launch.
      </div>

      <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
        Privacy Policy
      </h1>
      <p className="mt-1 text-sm text-muted">Last updated: {UPDATED}</p>

      <div className="mt-8 flex flex-col gap-7 text-sm leading-relaxed text-foreground/90">
        <Section title="1. Who we are & scope">
          <p>
            {APP_NAME} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides software used by
            disability support workers and disability-support providers to record shifts,
            progress notes, incidents and related records. This policy explains how we
            handle personal information, including the sensitive health information of NDIS
            participants, across our web and mobile applications, APIs and supporting
            infrastructure. It applies to provider organisations, their workers, and the
            participants whose information is recorded in the service.
          </p>
        </Section>

        <Section title="2. Our role: processor and controller">
          <p>
            For participant and shift records that a provider enters, the provider
            organisation is the entity that decides why and how the data is used; we act as
            a service provider (processor) handling that data <em>on the provider&rsquo;s
            instructions</em> under our customer agreement. We are an independent controller
            only for the limited account, billing and product-operations data we need to run
            the service. Where a customer agreement (e.g. a Data Processing Addendum)
            conflicts with this policy for that customer&rsquo;s data, the agreement governs.
          </p>
        </Section>

        <Section title="3. Information we collect">
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>Account &amp; organisation data:</strong> names, work email addresses,
              role, and the organisation a user belongs to.
            </li>
            <li>
              <strong>Records you create:</strong> shifts, clock-on/off times, log entries,
              progress notes, incidents, photos and AI-generated reports.
            </li>
            <li>
              <strong>Participant information:</strong> the personal and health (sensitive)
              information about NDIS participants that workers enter while providing support.
            </li>
            <li>
              <strong>Billing data:</strong> subscription and payment status (card details
              are handled by our payments provider, not stored by us).
            </li>
            <li>
              <strong>Technical &amp; product data:</strong> logs, device/usage and error
              data used to keep the service secure, reliable and improving.
            </li>
          </ul>
        </Section>

        <Section title="4. How we use information">
          <p>
            To provide, secure and improve the service; to generate the documentation you
            request; to provide support; to bill for the service; and to meet legal and
            record-keeping obligations. We do <strong>not</strong> sell personal information
            and do <strong>not</strong> use participant information for advertising or to
            train third-party AI models.
          </p>
        </Section>

        <Section title="5. AI features & de-identification">
          <p>
            Some features use AI to draft notes and reports. Before content is sent to an AI
            provider for processing, we remove direct personal identifiers (a PII-scrubbing
            step) so that identifying details are not exposed to the model. AI providers
            process this content only to return the requested output and under terms that
            prohibit using it to train their models. Any platform-level analytics we derive
            from usage (for example, common terms workers type) are de-identified and
            aggregated — they carry no organisation, worker or participant identifiers.
          </p>
        </Section>

        <Section title="6. Disclosure & sub-processors">
          <p>
            We share information only with the infrastructure and service providers we use
            to run {APP_NAME} (hosting and database, file storage, email delivery, error
            monitoring, product analytics, payments and AI processing), each bound by
            confidentiality and data-protection obligations; with your own organisation;
            where you direct us to; or where required by law. A current list of
            sub-processors is maintained and made available to customers, with advance
            notice of material changes.
          </p>
        </Section>

        <Section title="7. Data location & cross-border">
          <p>
            We aim to store participant and record data in Australia. Where any provider or
            sub-processor is located or processes data overseas, we take reasonable steps so
            that the recipient handles the information consistently with the Australian
            Privacy Principles, and we disclose the relevant locations in our sub-processor
            list. Cross-border arrangements are confirmed as part of legal review before
            launch.
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            We protect information with encryption in transit, role- and tenant-based access
            controls (so an organisation can only access its own data, enforced at the
            database layer), least-privilege access for our staff, audit logging of
            sensitive actions, and ongoing monitoring. No system is perfectly secure, but we
            work to industry-standard safeguards appropriate to the sensitivity of the data.
          </p>
        </Section>

        <Section title="9. Retention & deletion">
          <p>
            We keep information for as long as needed to provide the service and to meet the
            record-keeping obligations that apply to disability-support providers, then
            delete or de-identify it. On termination, customer data is deleted or returned
            in line with the customer agreement. Specific retention periods are set out in
            the final policy. Backups are retained for a limited period and then overwritten.
          </p>
        </Section>

        <Section title="10. Your rights & requests">
          <p>
            Individuals may request access to, correction of, or deletion of their personal
            information, subject to the provider organisation&rsquo;s rights and our legal
            obligations. For participant information held on a provider&rsquo;s behalf, we
            direct requests to that provider and assist them in responding. We support a
            right-to-erasure (de-identification) workflow for participant records.
          </p>
        </Section>

        <Section title="11. Data breaches">
          <p>
            We maintain an incident-response process. If an eligible data breach occurs that
            is likely to result in serious harm, we will notify affected customers without
            undue delay and support notifications to the Office of the Australian Information
            Commissioner (OAIC) and affected individuals as required by the Notifiable Data
            Breaches scheme.
          </p>
        </Section>

        <Section title="12. Children & vulnerable persons">
          <p>
            The service records information about people receiving disability support, who
            may be children or otherwise vulnerable. We treat this information as sensitive,
            limit access to those who need it, and expect provider organisations to obtain
            any consents required for collecting and recording it.
          </p>
        </Section>

        <Section title="13. Changes & contact">
          <p>
            We will post material changes to this policy here and, for enterprise customers,
            provide notice under the customer agreement. Privacy questions, requests and
            complaints can be directed to the contact published with the final version of
            this document; if you are not satisfied with our response, you may contact the
            OAIC.
          </p>
        </Section>
      </div>
    </main>
  );
}
