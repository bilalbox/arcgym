import type React from 'react';

interface FooterProps {
  navigate: (to: string) => void;
  currentPath?: string;
}

export const Footer: React.FC<FooterProps> = ({ navigate, currentPath = '/' }) => {
  const isPrivacyPage = currentPath === '/privacy';
  const isTermsPage = currentPath === '/terms';

  return (
    <footer className="pt-8 pb-12 border-t border-miro-hairlineSoft text-center space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-miro-muted">
        <span>© 2026 23p Technologies, LLC</span>
        <span className="text-miro-hairlineStrong">•</span>
        <a
          href="/privacy"
          onClick={(e) => {
            e.preventDefault();
            if (!isPrivacyPage) navigate('/privacy');
          }}
          className={
            isPrivacyPage
              ? 'text-miro-primary font-medium underline underline-offset-2 cursor-default'
              : 'text-miro-muted hover:text-miro-primary underline underline-offset-2 transition-colors cursor-pointer'
          }
        >
          Privacy Policy
        </a>
        <span className="text-miro-hairlineStrong">•</span>
        <a
          href="/terms"
          onClick={(e) => {
            e.preventDefault();
            if (!isTermsPage) navigate('/terms');
          }}
          className={
            isTermsPage
              ? 'text-miro-primary font-medium underline underline-offset-2 cursor-default'
              : 'text-miro-muted hover:text-miro-primary underline underline-offset-2 transition-colors cursor-pointer'
          }
        >
          Terms of Service
        </a>
      </div>
    </footer>
  );
};
