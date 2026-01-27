import { LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginButton() {
  const { isAuthenticated, isLoading, isLoggingIn, login } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-xs">
        <Loader2 className="w-3 h-3 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      <div className="w-px h-5 bg-[hsl(var(--border))]" />
      <button
        onClick={() => login()}
        disabled={isLoggingIn}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[hsl(var(--info))] text-white text-xs hover:opacity-90 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isLoggingIn ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Logging in...</span>
          </>
        ) : (
          <>
            <LogIn className="w-3 h-3" />
            <span>Login with SFDC</span>
          </>
        )}
      </button>
    </>
  );
}
