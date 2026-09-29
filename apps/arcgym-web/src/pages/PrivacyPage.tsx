import type React from 'react';
import { Footer } from '@/components/layout/Footer';

interface PrivacyPageProps {
  navigate: (to: string) => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ navigate }) => {
  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-medium text-miro-primary tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-sm sm:text-base text-miro-slate max-w-2xl leading-relaxed">
          ArcGym is built with a local-first architecture. We do not require accounts, track
          individual identity, or store your practice history on our servers.
        </p>
        <p className="text-xs text-miro-muted">Last updated: September 2026</p>
      </div>

      <div className="bg-miro-card rounded-2xl border border-miro-hairline p-6 sm:p-8 space-y-8 shadow-xs">
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            1. Local-First Practice Data
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            ArcGym is engineered with a local-first architecture. We do not require accounts,
            passwords, or email addresses. All practice history—including completed drills, mastery
            streaks, total points, and domain proficiency—resides strictly in your browser’s local
            storage. Your practice data never leaves your device and is never synchronized to our
            servers.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            2. Anonymous Drill Feedback
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
            3. Cookieless Web Analytics
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
            4. User Control & Data Retention
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            Because all practice history is stored locally in your browser, you maintain complete
            control over your data. You can clear your practice history at any time using the in-app
            progress dialog (accessible via the target icon in the top navigation bar) or by
            clearing your browser’s site data. Because we do not store personal data on remote
            servers, there is no remote data to retrieve, export, or delete.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            5. External Documentation & Resources
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
            and the Salesforce Trailblazer Community. When following links to external domains, your
            browsing is subject to Salesforce’s own privacy statement and terms of service.
          </p>
        </section>

        <section className="border-t border-miro-hairlineSoft pt-6 space-y-2">
          <h2 className="text-base sm:text-lg font-medium text-miro-primary tracking-tight">
            6. Contact
          </h2>
          <p className="text-sm text-miro-slate leading-relaxed">
            If you have questions about this privacy policy or ArcGym’s data practices, please open
            an issue in the ArcGym project repository.
          </p>
        </section>
      </div>

      <Footer navigate={navigate} currentPath="/privacy" />
    </main>
  );
};

export default PrivacyPage;
