import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { UsersChart } from './components/UsersChart';
import { RecentUsers } from './components/RecentUsers';
import { ActivityTicker } from './components/ActivityTicker';
import { WorldMap } from './components/WorldMap';
import { TopCountries } from './components/TopCountries';
import { TopCities } from './components/TopCities';
import { ActiveSessions } from './components/ActiveSessions';
import { SecurityHealth } from './components/SecurityHealth';
import { AuditTrail } from './components/AuditTrail';
import { OrgLimitsPanel } from './components/OrgLimitsPanel';
import { Navigation } from './components/Navigation';
import { LandingPage } from './components/LandingPage';
import { useAuth } from './context/AuthContext';
import { useTab } from './context/TabContext';
import { X } from 'lucide-react';

// Users tab components
import { UserRiskScoresPanel } from './components/UserRiskScoresPanel';
import { HighRiskUsersPanel } from './components/HighRiskUsersPanel';
import { GuestUsersPanel } from './components/GuestUsersPanel';

// Activity tab components
import { ConcurrentSessionsPanel } from './components/ConcurrentSessionsPanel';
import { LoginAnomaliesPanel } from './components/LoginAnomaliesPanel';
import { FailedLoginPatternsPanel } from './components/FailedLoginPatternsPanel';

// Integrations tab components
import { IntegrationUsersPanel } from './components/IntegrationUsersPanel';
import { ConnectedAppsPanel } from './components/ConnectedAppsPanel';
import { InstalledPackagesPanel } from './components/InstalledPackagesPanel';
import { NamedCredentialsPanel } from './components/NamedCredentialsPanel';
import { TokenRiskPanel } from './components/TokenRiskPanel';
import { AuthProvidersPanel } from './components/AuthProvidersPanel';
import { ApiUsagePanel } from './components/ApiUsagePanel';
import { TrackingTable } from './components/TrackingTable';

// Permissions tab components
import { PermissionSetsPanel } from './components/PermissionSetsPanel';
import { ProfilePermissionsPanel } from './components/ProfilePermissionsPanel';

// System tab components
import { DataAuditPanel } from './components/DataAuditPanel';

function App() {
  const { error, clearError, isAuthenticated, isLoading } = useAuth();
  const { activeTab } = useTab();
  const [showDashboard, setShowDashboard] = useState(false);
  const [integrationsSubTab, setIntegrationsSubTab] = useState<'overview' | 'tracking'>('overview');
  const [openOrgDropdown, setOpenOrgDropdown] = useState(false);

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  // Show landing page if not authenticated and user hasn't clicked to enter dashboard
  // Wait for auth check to complete first
  if (!isLoading && !isAuthenticated && !showDashboard) {
    return <LandingPage onGetStarted={() => {
      setShowDashboard(true);
      setOpenOrgDropdown(true);
    }} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--background))]">
      <Header openOrgDropdown={openOrgDropdown} onOrgDropdownChange={setOpenOrgDropdown} />

      {error && (
        <div className="mx-5 mt-4 flex items-center justify-between gap-3 px-4 py-3 rounded bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.3)]">
          <span className="text-sm text-[hsl(var(--destructive))]">{error}</span>
          <button
            onClick={clearError}
            className="p-1 rounded hover:bg-[hsl(var(--destructive)/0.2)] transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4 text-[hsl(var(--destructive))]" />
          </button>
        </div>
      )}

      <main className="flex-1 px-5 py-5 space-y-5">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Top row */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-3 min-h-[380px]">
                <StatsCards />
              </div>
              <div className="col-span-12 lg:col-span-5 min-h-[380px]">
                <UsersChart />
              </div>
              <div className="col-span-12 lg:col-span-4 min-h-[380px]">
                <RecentUsers />
              </div>
            </div>

            {/* Ticker */}
            <div className="-mx-5">
              <ActivityTicker />
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-12 gap-4 lg:grid-rows-1">
              <div className="col-span-12 lg:col-span-5 min-h-[320px]">
                <WorldMap />
              </div>
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 min-h-[320px]">
                <div className="flex-1">
                  <TopCountries />
                </div>
                <div className="flex-1">
                  <TopCities />
                </div>
              </div>
              <div className="col-span-12 lg:col-span-3 min-h-[320px]">
                <SecurityHealth />
              </div>
            </div>
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-4 min-h-[400px]">
                <RecentUsers />
              </div>
              <div className="col-span-12 lg:col-span-8 min-h-[400px]">
                <UserRiskScoresPanel />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-6 min-h-[350px]">
                <HighRiskUsersPanel />
              </div>
              <div className="col-span-12 lg:col-span-6 min-h-[350px]">
                <GuestUsersPanel />
              </div>
            </div>
          </>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-7 min-h-[400px]">
                <ActiveSessions />
              </div>
              <div className="col-span-12 lg:col-span-5 min-h-[400px]">
                <ConcurrentSessionsPanel />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-6 min-h-[350px]">
                <LoginAnomaliesPanel />
              </div>
              <div className="col-span-12 lg:col-span-6 min-h-[350px]">
                <FailedLoginPatternsPanel />
              </div>
            </div>
          </>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <>
            {/* Sub-tab navigation */}
            <div className="flex items-center gap-1 mb-4">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'tracking', label: 'Tracking' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setIntegrationsSubTab(tab.id as 'overview' | 'tracking')}
                  className={`px-3 py-1.5 rounded text-xs transition-colors ${
                    integrationsSubTab === tab.id
                      ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--background))]'
                      : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview sub-tab */}
            {integrationsSubTab === 'overview' && (
              <>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 lg:col-span-6 min-h-[400px]">
                    <TokenRiskPanel />
                  </div>
                  <div className="col-span-12 lg:col-span-6 min-h-[400px]">
                    <ApiUsagePanel />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 lg:col-span-6 min-h-[350px]">
                    <ConnectedAppsPanel />
                  </div>
                  <div className="col-span-12 lg:col-span-6 min-h-[350px]">
                    <NamedCredentialsPanel />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 lg:col-span-4 min-h-[320px]">
                    <AuthProvidersPanel />
                  </div>
                  <div className="col-span-12 lg:col-span-4 min-h-[320px]">
                    <IntegrationUsersPanel />
                  </div>
                  <div className="col-span-12 lg:col-span-4 min-h-[320px]">
                    <InstalledPackagesPanel />
                  </div>
                </div>
              </>
            )}

            {/* Tracking sub-tab */}
            {integrationsSubTab === 'tracking' && (
              <TrackingTable />
            )}
          </>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-6 min-h-[400px]">
                <PermissionSetsPanel />
              </div>
              <div className="col-span-12 lg:col-span-6 min-h-[400px]">
                <ProfilePermissionsPanel />
              </div>
            </div>
          </>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-4 min-h-[400px]">
                <OrgLimitsPanel />
              </div>
              <div className="col-span-12 lg:col-span-8 min-h-[400px]">
                <AuditTrail />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 min-h-[350px]">
                <DataAuditPanel />
              </div>
            </div>
          </>
        )}

      </main>

      <Navigation />
    </div>
  );
}

export default App;
