'use client';

import { signIn } from 'next-auth/react';
import { useEffect } from 'react';

export default function SignInPage() {
  useEffect(() => {
    signIn('keycloak');
  });

  return null;
}
