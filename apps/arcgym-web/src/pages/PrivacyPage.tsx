import { ArrowLeft } from 'lucide-react';
import type React from 'react';
import { Footer } from '@/components/layout/Footer';

interface PrivacyPageProps {
  navigate: (to: string) => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ navigate }) => {
  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-miro-slate hover:text-miro-primary transition-colors cursor-pointer group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Gym Floor
        </button>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-medium text-miro-primary tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-sm sm:text-base text-miro-slate max-w-2xl leading-relaxed">
          ArcGym is engineered with a privacy-first architecture. We do not collect passwords, email
          addresses, or personal names.
        </p>
        <p className="text-xs text-miro-muted">Last updated: October 2026</p>
      </div>

      <div className="bg-miro-card rounded-2xl border border-miro-hairline p-6 sm:p-8 space-y-8 shadow-xs">
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            1. Practice Telemetry & Cloud Synchronization
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            New learners can practice immediately without creating an account under a Trial
            Allowance. While unauthenticated, all practice telemetry—including completed drills,
            mastery streaks, confidence calibration ratings, and total points—is stored exclusively
            in your browser’s local storage.
          </p>
          <p className="text-sm text-miro-slate leading-relaxed">
            When you sign in with Google or GitHub, ArcGym synchronizes your practice telemetry
            across devices using Cloudflare D1. Synchronization employs a deterministic, monotonic
            merge: streaks are recomputed from completion timestamps, and completed drills are
            reconciled using set unions. ArcGym never connects to your Salesforce production or
            sandbox orgs, and drill content is served as static edge assets rather than personal
            records.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            2. Pseudonymous Identity & Zero-PII Authentication
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            ArcGym supports passwordless authentication via Google OpenID Connect (OIDC) and GitHub
            OAuth using standard OAuth 2.0 authorization code redirects. We avoid embedding
            third-party client JavaScript SDKs in the browser, eliminating cross-site tracker
            injections and ensuring compatibility with privacy-focused browsers and corporate
            endpoint security policies.
          </p>
          <p className="text-sm text-miro-slate leading-relaxed">
            We adhere to a strict <strong>Zero-PII (Personally Identifiable Information)</strong>{' '}
            model. Our servers and database never store your name, email address, profile picture,
            or provider username. When you authenticate:
          </p>
          <ul className="list-disc list-inside text-sm text-miro-slate space-y-1.5 pl-2 leading-relaxed">
            <li>
              The edge backend receives your provider subject identifier and computes an
              irreversible cryptographic hash salted with a private server pepper:
              <br />
              <code className="inline-block mt-1 font-mono text-xs bg-miro-surfaceSoft px-2 py-0.5 rounded text-miro-primary">
                learner_id = HMAC_SHA256(pepper, "learner:&lt;provider_sub&gt;")
              </code>
            </li>
            <li>
              Ephemeral OAuth access tokens and ID tokens are discarded immediately following
              identity verification and are never persisted to disk or database.
            </li>
            <li>
              Your practice telemetry is keyed solely by this anonymous peppered hash. Even in the
              event of a database exposure, stored practice telemetry cannot be linked back to your
              corporate, personal, or OAuth identity.
            </li>
          </ul>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            3. Essential Cookies & Session Tokens
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            ArcGym does not use tracking, advertising, or cross-site profiling cookies. We use only
            strictly essential first-party cookies to manage secure authentication sessions:
          </p>
          <ul className="list-disc list-inside text-sm text-miro-slate space-y-1.5 pl-2 leading-relaxed">
            <li>
              <code className="font-mono text-xs bg-miro-surfaceSoft px-1.5 py-0.5 rounded text-miro-primary">
                arcgym_session
              </code>
              : An encrypted, stateless session token stored as an{' '}
              <code className="font-mono text-xs bg-miro-surfaceSoft px-1.5 py-0.5 rounded text-miro-primary">
                HttpOnly
              </code>
              ,{' '}
              <code className="font-mono text-xs bg-miro-surfaceSoft px-1.5 py-0.5 rounded text-miro-primary">
                Secure
              </code>
              ,{' '}
              <code className="font-mono text-xs bg-miro-surfaceSoft px-1.5 py-0.5 rounded text-miro-primary">
                SameSite=Lax
              </code>{' '}
              cookie containing your pseudonymous learner identifier. Inaccessible to client-side
              scripts to prevent token exfiltration via XSS.
            </li>
            <li>
              <code className="font-mono text-xs bg-miro-surfaceSoft px-1.5 py-0.5 rounded text-miro-primary">
                arcgym_logged_in
              </code>
              : A non-sensitive client-readable flag used exclusively to prevent layout shifts or
              unauthenticated interface flashes while your cloud session loads.
            </li>
          </ul>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            4. Anonymous Drill Feedback
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            Learners may optionally rate drills and select predefined tags (such as <em>Useful</em>,{' '}
            <em>Good challenge</em>, or <em>Unrealistic</em>). We do not allow for free-text
            comments, preventing accidental transmission of sensitive information.
          </p>
          <p className="text-sm text-miro-slate leading-relaxed">
            To prevent automated duplicate submissions, our edge service generates a temporary,
            one-way cryptographic hash of connection parameters. Your IP address is never stored in
            feedback records or persistent databases, and deduplication tokens expire automatically
            within 24 hours. Recorded feedback includes only the drill identifier, rating, selected
            tags, and a timestamp.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            5. Cookieless Web Analytics
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            We use Cloudflare Web Analytics to monitor aggregate site performance and traffic
            trends. This analytics service operates without tracking cookies, does not collect
            personal identifiers, does not track visitors across external websites, and does not
            create advertising profiles.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            6. User Control & Immediate Data Erasure
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            You maintain full sovereignty over your practice data at all times:
          </p>
          <ul className="list-disc list-inside text-sm text-miro-slate space-y-1.5 pl-2 leading-relaxed">
            <li>
              <strong>Unauthenticated visitors</strong>: Clear your practice history anytime via the
              &quot;Clear Data&quot; button in Account &amp; Settings (the target icon in the
              header) or by wiping your browser’s local storage.
            </li>
            <li>
              <strong>Authenticated learners</strong>: Clicking &quot;Clear Data&quot; in Account
              &amp; Settings executes an immediate, hard{' '}
              <code className="font-mono text-xs bg-miro-surfaceSoft px-1.5 py-0.5 rounded text-miro-primary">
                DELETE
              </code>{' '}
              of your row from Cloudflare D1 via our backend, wipes your local storage, and clears
              all session cookies. We retain zero shadow copies or backup remnants of your
              telemetry.
            </li>
          </ul>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            7. External Documentation & Resources
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            Drill scenarios provide citations to official guidance published on{' '}
            <a
              href="https://architect.salesforce.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-miro-blue hover:text-miro-blueDeep font-medium underline inline-flex items-center gap-1"
            >
              architect.salesforce.com
            </a>{' '}
            and discussions in the{' '}
            <a
              href="https://trailhead.salesforce.com/trailblazer-community/groups"
              target="_blank"
              rel="noopener noreferrer"
              className="text-miro-blue hover:text-miro-blueDeep font-medium underline"
            >
              Trailblazer Community
            </a>
            . ArcGym is heavily inspired by the excellent{' '}
            <a
              href="https://analystgym.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-miro-blue hover:text-miro-blueDeep font-medium underline"
            >
              Analyst Gym
            </a>
            . When following links to external domains, your browsing is subject to the external
            domain's own privacy statement and terms of service.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            8. Contact
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            If you have questions about this privacy policy or ArcGym’s data practices, please email{' '}
            <a
              href="mailto:support@23p.tech"
              className="text-miro-blue hover:text-miro-blueDeep font-medium underline"
            >
              support@23p.tech
            </a>
            .
          </p>
        </section>
      </div>

      <Footer navigate={navigate} currentPath="/privacy" />
    </main>
  );
};

export default PrivacyPage;
