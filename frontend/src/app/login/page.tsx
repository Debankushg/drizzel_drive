'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { AuthCard } from '@/components/auth/AuthCard';
import { FormError } from '@/components/auth/FormError';
import { SocialButtons } from '@/components/auth/SocialButtons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiRequestError } from '@/lib/api';
import { firstFieldErrors, validateLogin, type FieldErrors } from '@/lib/validation';
import { useAuthStore } from '@/store/authStore';
import type { LoginPayload } from '@/types/auth.types';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [values, setValues] = useState<LoginPayload>({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<LoginPayload>>({});
  const [formError, setFormError] = useState('');

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    const clientErrors = validateLogin(values);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    try {
      await login({ ...values, email: values.email.trim() });
      router.replace('/drive');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(firstFieldErrors<LoginPayload>(err.fieldErrors));
        setFormError(err.message);
      } else {
        setFormError('Something went wrong');
      }
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your account"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/register" className="link-gold">
            Register
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormError message={formError} />
        <Input label="Email" name="email" type="email" autoComplete="email" value={values.email} onChange={onChange} error={errors.email} />
        <Input label="Password" name="password" type="password" autoComplete="current-password" value={values.password} onChange={onChange} error={errors.password} />
        <Button type="submit" loading={isLoading}>
          Sign in
        </Button>
      </form>
      <SocialButtons />
    </AuthCard>
  );
}
