import { useEffect, useState } from 'react';
import { Database, Loader2, RefreshCw, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchDataAccessData } from '../services/api';

interface ObjectSecurity {
  name: string;
  description: string;
  risk: 'high' | 'medium' | 'low';
}

const sensitiveObjects: ObjectSecurity[] = [
  { name: 'User', description: 'User account information', risk: 'high' },
  { name: 'Profile', description: 'User profiles and permissions', risk: 'high' },
  { name: 'PermissionSet', description: 'Permission set definitions', risk: 'high' },
  { name: 'SetupAuditTrail', description: 'Admin activity logs', risk: 'medium' },
  { name: 'LoginHistory', description: 'User login records', risk: 'medium' },
  { name: 'AuthSession', description: 'Active user sessions', risk: 'medium' },
  { name: 'EmailMessage', description: 'Email communications', risk: 'medium' },
  { name: 'Attachment', description: 'File attachments', risk: 'medium' },
  { name: 'ContentDocument', description: 'Salesforce Files', risk: 'medium' },
  { name: 'Case', description: 'Support cases', risk: 'low' },
  { name: 'Lead', description: 'Sales leads', risk: 'low' },
  { name: 'Contact', description: 'Contact records', risk: 'low' },
];

export function SensitiveObjectsPanel() {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    // We're just showing a static list of sensitive objects
    // In a real implementation, you might check actual object permissions
    fetchDataAccessData()
      .then(() => {})
      .catch(err => {
        console.error('Failed to fetch data:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// sensitive_objects[]</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">login to view objects</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--destructive)/0.5)] bg-[hsl(var(--destructive)/0.1)] flex flex-col items-center justify-center">
        <span className="text-xs text-[hsl(var(--destructive))]">{error}</span>
      </div>
    );
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]';
      case 'medium': return 'bg-[hsl(var(--warning-muted))] text-[hsl(var(--warning))]';
      default: return 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]';
    }
  };

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// sensitive_objects[]</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `${sensitiveObjects.length} objects`}
          </span>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 text-[hsl(var(--muted-foreground))] ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto -mx-4 px-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : (
          <div className="space-y-1">
            {sensitiveObjects.map((obj) => (
              <div
                key={obj.name}
                className="group flex items-center gap-3 p-2 -mx-2 rounded hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
              >
                <div className={`p-1.5 rounded ${getRiskColor(obj.risk)}`}>
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-[hsl(var(--foreground))] block">{obj.name}</span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] truncate block">
                    {obj.description}
                  </span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${getRiskColor(obj.risk)}`}>
                  {obj.risk}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
