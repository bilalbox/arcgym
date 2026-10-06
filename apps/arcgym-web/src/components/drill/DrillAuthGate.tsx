import { Lock } from 'lucide-react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { GithubIcon, GoogleIcon } from '@/components/ui/icons';

export interface DrillAuthGateProps {
  title?: string;
  description?: string;
  returnUrl?: string;
  onSignInGoogle?: (returnUrl?: string) => void;
  onSignInGithub?: (returnUrl?: string) => void;
}

export const DrillAuthGate: React.FC<DrillAuthGateProps> = ({
  title = 'Sign in to start this drill',
  description = 'Practice is 100% free. Sign in with Google or GitHub to investigate this scenario, commit decisions, and track your streak.',
  returnUrl,
  onSignInGoogle,
  onSignInGithub,
}) => {
  const currentUrl =
    returnUrl ||
    (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/');

  const handleGoogle = () => {
    if (onSignInGoogle) {
      onSignInGoogle(currentUrl);
    } else if (typeof window !== 'undefined') {
      window.location.href = `/api/auth/google/login?returnUrl=${encodeURIComponent(currentUrl)}`;
    }
  };

  const handleGithub = () => {
    if (onSignInGithub) {
      onSignInGithub(currentUrl);
    } else if (typeof window !== 'undefined') {
      window.location.href = `/api/auth/github/login?returnUrl=${encodeURIComponent(currentUrl)}`;
    }
  };

  return (
    <div className="rounded-2xl border border-miro-hairline bg-miro-surface p-6 sm:p-8 text-center space-y-5 shadow-xs">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-miro-surfaceSoft border border-miro-hairline text-miro-primary">
        <Lock className="h-5 w-5" />
      </div>
      <div className="space-y-1.5 max-w-md mx-auto">
        <h3 className="text-base sm:text-lg font-medium text-miro-primary">{title}</h3>
        <p className="text-xs sm:text-sm text-miro-slate leading-relaxed">{description}</p>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
        <Button
          type="button"
          onClick={handleGoogle}
          className="w-full sm:w-auto px-5 py-2.5 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary text-xs font-semibold rounded-full inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <GoogleIcon className="h-3.5 w-3.5" />
          <span>Continue with Google</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleGithub}
          className="w-full sm:w-auto px-5 py-2.5 bg-miro-card border-miro-hairline hover:border-miro-hairlineStrong hover:bg-miro-surfaceSoft text-miro-primary text-xs font-semibold rounded-full inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <GithubIcon className="h-3.5 w-3.5" />
          <span>Continue with GitHub</span>
        </Button>
      </div>
    </div>
  );
};
