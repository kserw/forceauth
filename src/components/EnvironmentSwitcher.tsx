import { useAuth } from '../context/AuthContext';
import type { SalesforceEnvironment } from '../services/api';

export function EnvironmentSwitcher() {
  const { environment, setEnvironment, isAuthenticated } = useAuth();

  const handleChange = (env: SalesforceEnvironment) => {
    if (!isAuthenticated) {
      setEnvironment(env);
    }
  };

  return (
    <div className="flex items-center gap-1 p-0.5 rounded bg-[hsl(var(--muted))]">
      <button
        onClick={() => handleChange('sandbox')}
        disabled={isAuthenticated}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          environment === 'sandbox'
            ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm'
            : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
        } ${isAuthenticated ? 'cursor-not-allowed opacity-60' : ''}`}
        title={isAuthenticated ? 'Log out to switch environment' : 'Sandbox environment'}
      >
        Sandbox
      </button>
      <button
        onClick={() => handleChange('production')}
        disabled={isAuthenticated}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          environment === 'production'
            ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm'
            : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
        } ${isAuthenticated ? 'cursor-not-allowed opacity-60' : ''}`}
        title={isAuthenticated ? 'Log out to switch environment' : 'Production environment'}
      >
        Production
      </button>
    </div>
  );
}
