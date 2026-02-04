import { useEffect, useState } from 'react';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTab } from '../context/TabContext';
import { useDemoMode } from '../context/DemoModeContext';
import { fetchLoginsByCountry, type CountryStat } from '../services/api';
import { mockCountryStats } from '../data/mockData';

// Country code to flag emoji mapping
const countryFlags: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', CA: '🇨🇦', AU: '🇦🇺', DE: '🇩🇪',
  FR: '🇫🇷', ES: '🇪🇸', IT: '🇮🇹', JP: '🇯🇵', CN: '🇨🇳',
  IN: '🇮🇳', BR: '🇧🇷', MX: '🇲🇽', KR: '🇰🇷', RU: '🇷🇺',
  NL: '🇳🇱', SE: '🇸🇪', NO: '🇳🇴', DK: '🇩🇰', FI: '🇫🇮',
  PL: '🇵🇱', TR: '🇹🇷', TH: '🇹🇭', PK: '🇵🇰', PH: '🇵🇭',
  ID: '🇮🇩', MY: '🇲🇾', SG: '🇸🇬', VN: '🇻🇳', AR: '🇦🇷',
  CL: '🇨🇱', CO: '🇨🇴', ZA: '🇿🇦', EG: '🇪🇬', NG: '🇳🇬',
  KE: '🇰🇪', IL: '🇮🇱', AE: '🇦🇪', SA: '🇸🇦', NZ: '🇳🇿',
  IE: '🇮🇪', PT: '🇵🇹', CH: '🇨🇭', AT: '🇦🇹', BE: '🇧🇪',
  CZ: '🇨🇿', GR: '🇬🇷', HU: '🇭🇺', RO: '🇷🇴', UA: '🇺🇦',
};

function getFlag(countryCode: string): string {
  return countryFlags[countryCode] || '🌍';
}

export function TopCountries() {
  const { isAuthenticated } = useAuth();
  const { setActiveTab } = useTab();
  const { isDemoMode } = useDemoMode();
  const [countries, setCountries] = useState<CountryStat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use mock data in demo mode
  const showDemoIndicator = isDemoMode && !isAuthenticated;

  useEffect(() => {
    if (!isAuthenticated) {
      setCountries([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetchLoginsByCountry(30)
      .then(setCountries)
      .catch((err) => {
        console.error('Failed to fetch login stats:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  // Use mock data in demo mode
  const displayCountries = showDemoIndicator ? mockCountryStats : countries;

  // Show empty state when not authenticated and not in demo mode
  if (!isAuthenticated && !isDemoMode) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// login_countries.sort()</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">-</span>
        </div>
      </div>
    );
  }

  if (error && !showDemoIndicator) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--destructive)/0.5)] bg-[hsl(var(--destructive)/0.1)] flex flex-col items-center justify-center">
        <span className="text-xs text-[hsl(var(--destructive))]">{error}</span>
      </div>
    );
  }

  const maxCount = displayCountries.length > 0 ? Math.max(...displayCountries.map(c => c.count)) : 1;

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {showDemoIndicator && (
            <span className="mr-1 px-1.5 py-0.5 rounded text-[10px] bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]">demo</span>
          )}
          // login_countries.sort()
        </span>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">last 30 days</span>
      </div>

      <div className="flex-1 space-y-2">
        {isLoading && !showDemoIndicator ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : displayCountries.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">no login data available</span>
          </div>
        ) : (
          displayCountries.slice(0, 5).map((country) => (
            <div
              key={country.country}
              className="group flex items-center gap-3 p-2 -mx-2 rounded hover:bg-[hsl(var(--muted)/0.5)] transition-colors cursor-pointer"
            >
              <span className="text-base">{getFlag(country.country)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[hsl(var(--foreground))]">{country.country}</span>
                  <span className="text-xs text-[hsl(var(--foreground))] tabular-nums">
                    {country.count}
                  </span>
                </div>
                <div className="h-1 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[hsl(var(--foreground)/0.4)] rounded-full transition-all"
                    style={{ width: `${(country.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-3 border-t border-[hsl(var(--border))] mt-auto">
        <button
          onClick={() => setActiveTab('users')}
          className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          view_all()
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
