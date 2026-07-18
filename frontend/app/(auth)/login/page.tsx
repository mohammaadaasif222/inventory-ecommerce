'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth-store';
import { config } from '@/lib/config';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useLogin();
  const { register, handleSubmit } = useForm<{ email: string; password: string }>();
  const [error, setError] = useState<string | null>(null);

  const submit = handleSubmit((values) => {
    setError(null);
    login.mutate(values, {
      onSuccess: () => {
        const redirect = params.get('redirect');
        const dest =
          redirect ?? (useAuthStore.getState().isAdmin() ? '/admin' : '/account');
        toast.success('Welcome back');
        router.push(dest);
      },
      onError: (e: Error) => {
        // Raw transport errors ("Request failed with status code 404",
        // "Network Error") mean the API is unreachable or misrouted — tell
        // the user that, not an HTTP incantation. Real auth failures keep
        // the server's message ("Invalid credentials").
        const friendly = /status code|network error/i.test(e.message)
          ? 'Could not reach the server — please try again in a moment'
          : e.message;
        setError(friendly);
        toast.error(friendly);
      },
    });
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access your account or the admin panel.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" {...register('email')} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" {...register('password')} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>
          <Button asChild variant="outline" className="w-full">
            <a href={`${config.apiUrl}/auth/google`}>Continue with Google</a>
          </Button>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account?{' '}
            <Link href="/register" className="font-medium underline underline-offset-4">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
