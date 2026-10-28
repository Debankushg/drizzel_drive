'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AuthCard } from '@/components/auth/AuthCard';
import { FormError } from '@/components/auth/FormError';
import { useAuthStore } from '@/store/authStore';

/** Landing page after a social login: reads the token the backend put in the URL fragment. */
export default function SocialCallbackPage() {
  const router = useRouter();
  const completeSocialLogin = useAuthStore((s) => s.completeSocialLogin);
  const [error, setError] = useState('');
  // React dev mode runs effects twice; the URL fragment is cleared on the first run
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('token');
    const errorMessage = params.get('error');
    // Remove the token from the address bar / history right away
    window.history.replaceState(null, '', window.location.pathname);

    const run = async () => {
      if (!token) {
        setError(errorMessage ?? 'Login failed, please try again');
        return;
      }
      try {
        await completeSocialLogin(token);
        router.replace('/drive');
      } catch {
        setError('Could not complete login, please try again');
      }
    };
    void run();
  }, [completeSocialLogin, router]);

  return (
    <AuthCard
      title={error ? 'Login failed' : 'Signing you in...'}
      subtitle={error ? 'Something went wrong with social login' : 'Please wait a moment'}
      footer={
        <Link href="/login" className="link-gold">
          Back to login
        </Link>
      }
    >
      <FormError message={error} />
    </AuthCard>
  );
}
