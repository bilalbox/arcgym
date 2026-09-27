import React from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';

interface FooterProps {
  navigate: (to: string) => void;
  currentPath?: string;
}

export const Footer: React.FC<FooterProps> = ({ navigate, currentPath = '/' }) => {
  const isPrivacyPage = currentPath === '/privacy';

  return (
    <footer className="pt-8 pb-12 border-t border-miro-hairlineSoft text-center space-y-3">
      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl mx-auto">
        All practice scenarios are strictly grounded in official guidance from{' '}
        <a
          href="https://architect.salesforce.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-miro-blue hover:text-miro-blueDeep font-medium underline inline-flex items-center gap-1"
        >
          architect.salesforce.com <ExternalLink className="h-3 w-3" />
        </a>
        . Note: ArcGym is heavily inspired by{' '}
        <a
          href="https://analystgym.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-miro-blue hover:text-miro-blueDeep font-medium underline inline-flex items-center gap-1"
        >
          Analyst Gym <ExternalLink className="h-3 w-3" />
        </a>
        .
      </p>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-slate-400">
        <span>Powered by Cloudflare Pages</span>
        <span className="text-slate-300">•</span>
        <span className="inline-flex items-center gap-1 text-slate-600">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Zero Personal Data Stored
        </span>
        {!isPrivacyPage && (
          <>
            <span className="text-slate-300">•</span>
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                navigate('/privacy');
              }}
              className="text-slate-500 hover:text-miro-primary underline underline-offset-2 transition-colors cursor-pointer"
            >
              Privacy Policy
            </a>
          </>
        )}
      </div>
    </footer>
  );
};
