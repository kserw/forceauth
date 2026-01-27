import { useEffect, useState, useRef } from 'react';
import { Globe, Loader2, RefreshCw, ChevronLeft, ChevronRight, Download, ShieldOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchRemoteSiteSettings, exportToCSV, type RemoteSiteSetting } from '../services/api';

const ITEMS_PER_PAGE = 8;

function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

export function RemoteSitesPanel() {
  const { isAuthenticated, refreshKey } = useAuth();
  const [sites, setSites] = useState<RemoteSiteSetting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    fetchRemoteSiteSettings()
      .then(data => {
        setSites(data);
        setCurrentPage(0);
      })
      .catch(err => {
        console.error('Failed to fetch remote site settings:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated, refreshKey]);

  const handleExport = () => {
    exportToCSV(sites, 'remote_site_settings', [
      { key: 'SiteName', header: 'Site Name' },
      { key: 'EndpointUrl', header: 'Endpoint URL' },
      { key: 'Description', header: 'Description' },
      { key: 'IsActive', header: 'Active' },
      { key: 'DisableProtocolSecurity', header: 'Protocol Security Disabled' },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// remote_sites[]</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">login to view remote sites</span>
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

  const totalPages = Math.ceil(sites.length / ITEMS_PER_PAGE);
  const paginatedSites = sites.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const activeSites = sites.filter(s => s.IsActive);
  const insecureSites = sites.filter(s => s.DisableProtocolSecurity);

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-[hsl(var(--info))]" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// remote_sites[]</span>
        </div>
        <div className="flex items-center gap-2">
          {insecureSites.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--warning-muted))] text-[hsl(var(--warning))] flex items-center gap-1">
              <ShieldOff className="w-2.5 h-2.5" />
              {insecureSites.length} insecure
            </span>
          )}
          <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `${activeSites.length} active`}
          </span>
          <button
            onClick={handleExport}
            disabled={isLoading || sites.length === 0}
            className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
            title="Export to CSV"
          >
            <Download className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 text-[hsl(var(--muted-foreground))] ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto -mx-4 px-4">
        {isLoading && sites.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : sites.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">no remote sites configured</span>
          </div>
        ) : (
          <div className="space-y-1">
            {paginatedSites.map((site) => (
              <div
                key={site.Id}
                className="group flex items-center gap-3 p-2 -mx-2 rounded hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
              >
                <div className={`p-1.5 rounded ${
                  !site.IsActive
                    ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                    : site.DisableProtocolSecurity
                    ? 'bg-[hsl(var(--warning-muted))] text-[hsl(var(--warning))]'
                    : 'bg-[hsl(var(--success-muted))] text-[hsl(var(--success))]'
                }`}>
                  {site.DisableProtocolSecurity ? (
                    <ShieldOff className="w-3.5 h-3.5" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[hsl(var(--foreground))] truncate">{site.SiteName}</span>
                    {!site.IsActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                        inactive
                      </span>
                    )}
                    {site.DisableProtocolSecurity && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--warning-muted))] text-[hsl(var(--warning))]">
                        no TLS
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] truncate block">
                    {getDomainFromUrl(site.EndpointUrl)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[hsl(var(--border))]">
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
            {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, sites.length)} of {sites.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setCurrentPage(p => Math.max(0, p - 1)); scrollRef.current?.scrollTo(0, 0); }}
              disabled={currentPage === 0}
              className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
            </button>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] tabular-nums px-2">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={() => { setCurrentPage(p => Math.min(totalPages - 1, p + 1)); scrollRef.current?.scrollTo(0, 0); }}
              disabled={currentPage === totalPages - 1}
              className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
