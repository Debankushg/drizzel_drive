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
import { firstFieldErrors, validateRegister, type FieldErrors } from '@/lib/validation';
import { useAuthStore } from '@/store/authStore';
import type { RegisterPayload } from '@/types/auth.types';

const initialValues: RegisterPayload = { name: '', email: '', password: '', confirmPassword: '' };

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FieldErrors<RegisterPayload>>({});
  const [formError, setFormError] = useState('');

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    const clientErrors = validateRegister(values);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    try {
      await register({ ...values, name: values.name.trim(), email: values.email.trim() });
      router.replace('/drive');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(firstFieldErrors<RegisterPayload>(err.fieldErrors));
        setFormError(err.message);
      } else {
        setFormError('Something went wrong');
      }
    }
  };

  return (
    <AuthCard
      title="Create account"
      subtitle="Sign up to get started"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="link-gold">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormError message={formError} />
        <Input label="Name" name="name" autoComplete="name" value={values.name} onChange={onChange} error={errors.name} />
        <Input label="Email" name="email" type="email" autoComplete="email" value={values.email} onChange={onChange} error={errors.email} />
        <Input label="Password" name="password" type="password" autoComplete="new-password" value={values.password} onChange={onChange} error={errors.password} />
        <Input label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" value={values.confirmPassword} onChange={onChange} error={errors.confirmPassword} />
        <Button type="submit" loading={isLoading}>
          Register
        </Button>
      </form>
      <SocialButtons />
    </AuthCard>
  );
}
