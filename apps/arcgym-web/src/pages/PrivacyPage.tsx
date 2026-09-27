import React from 'react';
import {
  ShieldCheck,
  EyeOff,
  Database,
  BarChart3,
  Lock,
  Server,
  ArrowLeft,
  ExternalLink,
  Compass,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Footer } from '@/components/layout/Footer';

interface PrivacyPageProps {
  navigate: (to: string) => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ navigate }) => {
  return (
    <div className="min-h-screen bg-miro-surface text-miro-primary flex flex-col font-sans antialiased">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-miro-hairline bg-white/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-3 group text-left cursor-pointer"
            >
              <div className="h-8 w-8 rounded-full bg-miro-primary flex items-center justify-center text-white font-medium text-xs tracking-tight group-hover:bg-miro-charcoal transition-colors">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 cursor-pointer text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Drills</span>
            </Button>

            <a
              href="https://architect.salesforce.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-miro-blue font-medium hidden md:flex items-center gap-1.5 transition-colors ml-1"
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Zero Personal Data Principle • Privacy by Design
          </div>

          <h1 className="text-3xl sm:text-4xl font-semibold text-miro-primary tracking-tight">
            Privacy Policy
          </h1>

          <p className="text-base text-slate-600 max-w-2xl leading-relaxed">
            ArcGym is engineered for Salesforce Technical Architects and enterprise technology leaders. We treat privacy as a non-negotiable architectural invariant: <strong>we collect, store, and process zero personal data.</strong>
          </p>

          <p className="text-xs text-slate-400">
            Effective Date: September 27, 2026 • Policy Version 1.0.0
          </p>
        </div>

        {/* Highlight Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 border-miro-hairline bg-white shadow-xs">
            <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-miro-primary mb-3">
              <EyeOff className="h-4.5 w-4.5 text-slate-700" />
            </div>
            <h3 className="font-semibold text-sm text-miro-primary mb-1">
              Zero Personal Data
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              No user accounts, no passwords, no email collection, no forms, and no identity tracking of any kind.
            </p>
          </Card>

          <Card className="p-5 border-miro-hairline bg-white shadow-xs">
            <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center text-miro-blue mb-3">
              <Database className="h-4.5 w-4.5 text-miro-blue" />
            </div>
            <h3 className="font-semibold text-sm text-miro-primary mb-1">
              Client-Side Sovereignty
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your practice streaks and drill scores reside strictly in your browser’s local storage. They never leave your device.
            </p>
          </Card>

          <Card className="p-5 border-miro-hairline bg-white shadow-xs">
            <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 mb-3">
              <BarChart3 className="h-4.5 w-4.5 text-amber-700" />
            </div>
            <h3 className="font-semibold text-sm text-miro-primary mb-1">
              Cookieless Web Analytics
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Powered by Cloudflare Web Analytics. No tracking cookies, no cross-site profiling, and no IP address storage.
            </p>
          </Card>
        </div>

        {/* Detailed Policy Sections */}
        <div className="space-y-6">
          {/* Section 1: Privacy by Design Architecture */}
          <Card className="border-miro-hairline bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-4 w-4 text-miro-blue" />
                1. Architectural Philosophy: Zero Personal Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                In alignment with the Salesforce Well-Architected <em>Trust</em> pillar, ArcGym minimizes data risk by completely eliminating personal data ingestion. We believe the safest data is the data that was never collected in the first place.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li><strong>No User Registration:</strong> You do not need to sign up, provide an email address, link a Salesforce Trailblazer profile, or log in with OAuth.</li>
                <li><strong>No User Profiling:</strong> We do not associate your architectural decision patterns with your name, company, IP address, or digital fingerprint.</li>
                <li><strong>No Free-Form Text Ingestion:</strong> All practice drills use structured multiple-choice decisions, eliminating accidental transmission of sensitive customer or enterprise credentials.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 2: What We Do NOT Collect */}
          <Card className="border-miro-hairline bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <EyeOff className="h-4 w-4 text-emerald-600" />
                2. Information We Do NOT Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                To provide absolute clarity, ArcGym <strong>does NOT collect, process, or store</strong> any of the following:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {[
                  'Names or personal identifiers',
                  'Email addresses or contact information',
                  'Employer, company, or job title',
                  'IP addresses or geolocation coordinates',
                  'Salesforce org credentials or access tokens',
                  'Payment or financial information',
                  'Device fingerprints or hardware identifiers',
                  'Cross-site advertising tracking cookies',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Local Storage & Visitor Progress */}
          <Card className="border-miro-hairline bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-4 w-4 text-miro-blue" />
                3. Browser Local Storage (`localStorage`)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                To allow you to track your daily practice streak and prevent presenting drills you have already mastered, ArcGym stores anonymous, lightweight progress state entirely inside your web browser’s local storage (`window.localStorage`).
              </p>
              <div className="rounded-xl border border-miro-hairlineSoft bg-slate-50 p-4 space-y-2 text-xs">
                <div className="font-mono font-medium text-slate-700">Storage Keys Used:</div>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-800">arcgym_visitor_state_v1</code>: Stores consecutive streak days count (integer), last active calendar date (<code className="font-mono">YYYY-MM-DD</code>), and completed drill IDs with score and accuracy records.</li>
                  <li><code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-800">arcgym_streak</code>: Backward-compatibility key for legacy streak displays.</li>
                </ul>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-slate-700">
                <AlertCircle className="h-4 w-4 text-miro-blue shrink-0 mt-0.5" />
                <div>
                  <strong>Complete User Control:</strong> This data never leaves your device and is never synchronized to a server. You can reset or purge your complete practice history at any time by opening the <strong>Progress Dialog</strong> (top bar target icon) and clicking <strong>Reset History</strong>, or by clearing your browser cache.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Cloudflare Web Analytics */}
          <Card className="border-miro-hairline bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-600" />
                4. Privacy-First Analytics: Cloudflare Web Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                We use <strong>Cloudflare Web Analytics</strong> to measure high-level aggregate website traffic and performance metrics (such as page views, visitor referral sources, and Core Web Vitals performance like page load speed).
              </p>
              <p>
                Cloudflare Web Analytics is specifically designed to protect visitor privacy:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li><strong>No Cookies:</strong> Cloudflare Web Analytics does not set, store, or read cookies in your browser (<code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">document.cookie</code> is never touched).</li>
                <li><strong>No Fingerprinting:</strong> It does not generate hardware, browser, or canvas fingerprints to track individual users.</li>
                <li><strong>No IP Address Persistence:</strong> Cloudflare does not store or log visitor IP addresses in analytics datasets.</li>
                <li><strong>No Cross-Site Tracking:</strong> It does not follow your activity across external websites or feed advertising exchanges.</li>
                <li><strong>Regulatory Alignment:</strong> Because no personal data is collected or tracked, Cloudflare Web Analytics operates in strict compliance with the European Union General Data Protection Regulation (GDPR), the ePrivacy Directive (PECR), and the California Consumer Privacy Act (CCPA) without requiring intrusive cookie consent popups.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 5: Edge Infrastructure & Hosting */}
          <Card className="border-miro-hairline bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="h-4 w-4 text-miro-primary" />
                5. Edge Infrastructure & Cloudflare Pages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                ArcGym is statically compiled and served globally via <strong>Cloudflare Pages</strong>. When you request a drill or asset:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>Requests are routed to the nearest Cloudflare edge data center for low-latency delivery.</li>
                <li>Cloudflare processes transient network telemetry (such as standard HTTP headers) solely for routing and mitigating volumetric Distributed Denial of Service (DDoS) attacks.</li>
                <li>No application-level user logs, search queries, or user behavioral records are retained in backend databases or Cloudflare Workers KV.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 6: External Grounding Citations */}
          <Card className="border-miro-hairline bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-miro-blue" />
                6. External Links & Salesforce Citations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                Every drill in ArcGym provides direct citations to official documentation published on{' '}
                <a
                  href="https://architect.salesforce.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-miro-blue hover:text-miro-blueDeep font-medium underline inline-flex items-center gap-1"
                >
                  architect.salesforce.com <ExternalLink className="h-3 w-3" />
                </a>
                .
              </p>
              <p>
                When you click an external link, you navigate outside the ArcGym application. External Salesforce domains are governed by Salesforce’s own privacy statement and terms of service.
              </p>
            </CardContent>
          </Card>

          {/* Section 7: User Rights (GDPR & CCPA) */}
          <Card className="border-miro-hairline bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                7. Your Data Protection Rights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                Data protection frameworks such as GDPR and CCPA grant individuals specific rights, including the Right to Access, Right to Rectification, Right to Erasure (&ldquo;Right to be Forgotten&rdquo;), and Right to Data Portability.
              </p>
              <p>
                <strong>Because ArcGym never collects, identifies, or transmits any personal data to our servers, we have zero personal data to retrieve, export, or delete on your behalf.</strong>
              </p>
              <p>
                All drill records are stored exclusively in your own browser&apos;s local storage, meaning you maintain complete unilateral control over your data at all times.
              </p>
            </CardContent>
          </Card>

          {/* Section 8: Changes & Inquiries */}
          <Card className="border-miro-hairline bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Compass className="h-4 w-4 text-slate-700" />
                8. Contact & Policy Governance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                If we update our architectural approach or privacy notice, changes will be published directly to this page with an updated effective date.
              </p>
              <p>
                For questions regarding this policy, security inquiries, or open-source codebase transparency, please visit the ArcGym project repository or reach out via our project issues board.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Back to practice CTA card */}
        <div className="rounded-3xl border border-miro-hairline bg-white p-8 text-center space-y-4 shadow-xs">
          <h2 className="text-xl sm:text-2xl font-semibold text-miro-primary">
            Ready to practice your architectural judgment?
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Test your trade-off analysis across Integration, Data Cloud, Security, and Agentforce with zero privacy compromise.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/')}
            className="cursor-pointer"
          >
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
