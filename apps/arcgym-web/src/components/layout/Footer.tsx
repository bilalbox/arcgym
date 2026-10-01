import type React from 'react';

interface FooterProps {
  navigate: (to: string) => void;
  currentPath?: string;
}

export const Footer: React.FC<FooterProps> = ({ navigate, currentPath = '/' }) => {
  const isPrivacyPage = currentPath === '/privacy';

  return (
    <footer className="pt-8 pb-12 border-t border-miro-hairlineSoft text-center space-y-3">
      <div className="text-xs text-miro-slate leading-relaxed max-w-2xl mx-auto space-y-2">
        <p>
          All scenarios are grounded in guidance from{' '}
          <a
            href="https://architect.salesforce.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-miro-blue hover:text-miro-blueDeep font-medium underline"
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
          .
        </p>
        <p>
          ArcGym is heavily inspired by{' '}
          <a
            href="https://analystgym.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-miro-blue hover:text-miro-blueDeep font-medium underline"
          >
            Analyst Gym
          </a>
          .
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-miro-muted">
        <span>Powered by Cloudflare Pages</span>
        {!isPrivacyPage && (
          <>
            <span className="text-miro-hairlineStrong">•</span>
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                navigate('/privacy');
              }}
              className="text-miro-muted hover:text-miro-primary underline underline-offset-2 transition-colors cursor-pointer"
            >
              Privacy Policy
            </a>
          </>
        )}
      </div>
    </footer>
  );
};
