import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Chrome } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { signInWithGoogle } from '@/lib/google-auth';

export function AuthPage() {
  const { user, loading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, []);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSignIn() {
    setIsSigningIn(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError('Sign-in failed. Please try again.');
      setIsSigningIn(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-zinc-100">
            Life <span className="text-violet-400">OS</span>
          </h1>
          <p className="mt-2 text-zinc-400">Your personal productivity layer</p>
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-zinc-100">Sign in</CardTitle>
            <CardDescription className="text-zinc-400">
              Connect your Google account to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleSignIn}
              disabled={isSigningIn || loading}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white gap-2"
            >
              <Chrome className="h-4 w-4" />
              {isSigningIn ? 'Redirecting…' : 'Sign in with Google'}
            </Button>

            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <div className="rounded-md bg-zinc-800/50 border border-zinc-700 p-3 space-y-1">
              <p className="text-xs font-medium text-zinc-400">Permissions requested:</p>
              <ul className="text-xs text-zinc-500 space-y-0.5 list-disc list-inside">
                <li>Read and create Google Calendar events</li>
                <li>Read Gmail messages (read-only)</li>
                <li>Your Google account email address</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
