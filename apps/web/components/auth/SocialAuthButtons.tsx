'use client';

import { GoogleButton } from './GoogleButton';
import { FacebookButton } from './FacebookButton';

export function SocialAuthButtons() {
  return (
    <div className="space-y-3">
      <GoogleButton label="Continue with Google" />
      <FacebookButton label="Continue with Facebook" />
    </div>
  );
}
