import { BarChart3, Compass, Database, EyeOff, ShieldCheck, ThumbsUp } from 'lucide-react';
import type React from 'react';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PrivacyPageProps {
  navigate: (to: string) => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ navigate }) => {
  return (
    <div className="min-h-screen bg-miro-surface text-miro-primary flex flex-col font-sans antialiased">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-miro-hairline bg-miro-card/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-3 group text-left cursor-pointer"
              aria-label="ArcGym home"
            >
              <div
                aria-hidden="true"
                className="h-8 w-8 rounded-full bg-miro-primary flex items-center justify-center text-miro-onPrimary font-medium text-xs tracking-tight group-hover:bg-miro-charcoal transition-colors"
              >
                AG
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-miro-primary tracking-tight text-lg">
                  Arc<span className="text-miro-blue">Gym</span>
                </span>
                <Badge variant="outline" className="text-[11px] font-medium hidden sm:inline-flex">
                  Salesforce Architect Edition
                </Badge>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://architect.salesforce.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-miro-muted hover:text-miro-blue font-medium flex items-center gap-1.5 transition-colors"
            >
              <Compass className="h-3.5 w-3.5 text-miro-blue" />
              architect.salesforce.com
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Hero Section */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-miro-successLight border border-miro-successBorder text-miro-successText text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-miro-successText" />
            No accounts • Local-first practice • Privacy by Design
          </div>

          <h1 className="text-3xl sm:text-4xl font-semibold text-miro-primary tracking-tight">
            Privacy Policy
          </h1>

          <p className="text-base text-miro-slate max-w-2xl leading-relaxed">
            ArcGym is engineered for Salesforce Technical Architects and enterprise technology
            leaders. We do not run user accounts, collect emails, or store practice scores on our
            servers. Practice history stays in your browser. Optional anonymous drill ratings use
            enum pills only—no free-text comments.
          </p>

          <p className="text-xs text-miro-muted">
            Effective Date: September 28, 2026 • Policy Version 1.1.0
          </p>
        </div>

        {/* Highlight Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 border-miro-hairline bg-miro-card shadow-xs">
            <div className="h-9 w-9 rounded-xl bg-miro-surface flex items-center justify-center text-miro-primary mb-3">
              <EyeOff className="h-4.5 w-4.5 text-miro-slate" />
            </div>
            <h3 className="font-semibold text-sm text-miro-primary mb-1">
              No Accounts or Identity
            </h3>
            <p className="text-xs text-miro-slate leading-relaxed">
              No user accounts, passwords, email collection, or cross-site advertising profiles. We
              do not ask you to identify yourself.
            </p>
          </Card>

          <Card className="p-5 border-miro-hairline bg-miro-card shadow-xs">
            <div className="h-9 w-9 rounded-xl bg-miro-lavenderLight flex items-center justify-center text-miro-blue mb-3">
              <Database className="h-4.5 w-4.5 text-miro-blue" />
            </div>
            <h3 className="font-semibold text-sm text-miro-primary mb-1">
              Client-Side Sovereignty
            </h3>
            <p className="text-xs text-miro-slate leading-relaxed">
              Your practice streaks and drill scores reside strictly in your browser’s local
              storage. They never leave your device.
            </p>
          </Card>

          <Card className="p-5 border-miro-hairline bg-miro-card shadow-xs">
            <div className="h-9 w-9 rounded-xl bg-miro-yellowLight flex items-center justify-center text-miro-yellowText mb-3">
              <BarChart3 className="h-4.5 w-4.5 text-miro-yellowText" />
            </div>
            <h3 className="font-semibold text-sm text-miro-primary mb-1">
              Cookieless Web Analytics
            </h3>
            <p className="text-xs text-miro-slate leading-relaxed">
              Powered by Cloudflare Web Analytics. No tracking cookies, no cross-site profiling, and
              no IP address storage.
            </p>
          </Card>
        </div>

        {/* Anonymous Feedback Section */}
        <Card className="p-6 border-miro-hairline bg-miro-card shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-miro-primary font-semibold text-base">
            <div className="h-8 w-8 rounded-lg bg-miro-lavenderLight text-miro-blue flex items-center justify-center">
              <ThumbsUp className="h-4 w-4" />
            </div>
            <span>Anonymous Drill Feedback</span>
          </div>
          <p className="text-sm text-miro-slate leading-relaxed">
            Learners can rate drills with enum pills (e.g. <em>Realistic</em>, <em>Useful</em>,{' '}
            <em>Good challenge</em>, <em>Unrealistic</em>, <em>Unclear</em>, <em>Too easy</em>, or{' '}
            <em>Too hard</em>). Designed to avoid collecting corporate or personal free-text:
          </p>
          <ul className="text-xs text-miro-slate space-y-2 list-disc list-inside leading-relaxed pl-1">
            <li>
              <strong>No free-text input</strong>: Submissions are limited to pre-defined enum
              pills. We do not collect comments or open text fields, which reduces accidental
              transmission of emails, credentials, or Salesforce Org IDs.
            </li>
            <li>
              <strong>Ephemeral anti-sybil deduplication</strong>: To limit ballot-stuffing, the
              Cloudflare edge briefly uses your connection IP (via{' '}
              <code className="font-mono bg-miro-surface px-1 py-0.5 rounded text-[11px]">
                CF-Connecting-IP
              </code>
              ) as an input to{' '}
              <code className="font-mono bg-miro-surface px-1 py-0.5 rounded text-[11px]">
                HMAC-SHA256(Secret, Date + DrillId + IP)
              </code>
              . The raw IP is not written to feedback records. Only the opaque HMAC marker is stored
              in KV and expires after 24 hours.
            </li>
            <li>
              <strong>What we store</strong>: Each accepted vote stores drill id, up/down rating,
              selected pill tags, and a timestamp. Aggregates (counts and percentages) are public.
              Feedback is decoupled from your local practice scores and streaks.
            </li>
          </ul>
        </Card>

        {/* Back to practice CTA card */}
        <div className="rounded-3xl border border-miro-hairline bg-miro-card p-8 text-center space-y-4 shadow-xs">
          <h2 className="text-xl sm:text-2xl font-semibold text-miro-primary">
            Ready to practice your architectural judgment?
          </h2>
          <p className="text-sm text-miro-slate max-w-md mx-auto">
            Test your trade-off analysis across Integration, Data Cloud, Security, and Agentforce —
            practice history stays on your device.
          </p>
          <Button size="lg" onClick={() => navigate('/')} className="cursor-pointer">
            ← Return to Practice Drills
          </Button>
        </div>

        {/* Page Footer */}
        <Footer navigate={navigate} currentPath="/privacy" />
      </main>
    </div>
  );
};

export default PrivacyPage;
