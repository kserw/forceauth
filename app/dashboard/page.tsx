'use client';

import { useEffect, useState } from 'react';
import { Header } from '../../src/components/Header';
import { StatsCards } from '../../src/components/StatsCards';
import { UsersChart } from '../../src/components/UsersChart';
import { RecentUsers } from '../../src/components/RecentUsers';
import { ActivityTicker } from '../../src/components/ActivityTicker';
import { WorldMap } from '../../src/components/WorldMap';
import { TopCountries } from '../../src/components/TopCountries';
import { TopCities } from '../../src/components/TopCities';
import { ActiveSessions } from '../../src/components/ActiveSessions';
import { SecurityHealth } from '../../src/components/SecurityHealth';
import { AuditTrail } from '../../src/components/AuditTrail';
import { OrgLimitsPanel } from '../../src/components/OrgLimitsPanel';
import { Navigation } from '../../src/components/Navigation';
import { DemoModeBanner } from '../../src/components/DemoModeBanner';
import { useAuth } from '../../src/context/AuthContext';
import { useTab } from '../../src/context/TabContext';
import { useDemoMode } from '../../src/context/DemoModeContext';
import { X } from 'lucide-react';

// Users tab components
import { HighRiskUsersPanel } from '../../src/components/HighRiskUsersPanel';
import { GuestUsersPanel } from '../../src/components/GuestUsersPanel';

// Activity tab components
import { LoginAnomaliesPanel } from '../../src/components/LoginAnomaliesPanel';
import { FailedLoginPatternsPanel } from '../../src/components/FailedLoginPatternsPanel';

// Integrations tab components
import { IntegrationUsersPanel } from '../../src/components/IntegrationUsersPanel';
import { ConnectedAppsPanel } from '../../src/components/ConnectedAppsPanel';
import { InstalledPackagesPanel } from '../../src/components/InstalledPackagesPanel';
import { NamedCredentialsPanel } from '../../src/components/NamedCredentialsPanel';
import { TokenRiskPanel } from '../../src/components/TokenRiskPanel';
import { AuthProvidersPanel } from '../../src/components/AuthProvidersPanel';
import { ApiUsagePanel } from '../../src/components/ApiUsagePanel';

// Permissions tab components
import { PermissionSetsPanel } from '../../src/components/PermissionSetsPanel';
import { ProfilePermissionsPanel } from '../../src/components/ProfilePermissionsPanel';
import { SystemAdminsPanel } from '../../src/components/SystemAdminsPanel';

// System tab components
import { DataAuditPanel } from '../../src/components/DataAuditPanel';

export default function DashboardPage() {
  const { error, clearError, isAuthenticated } = useAuth();
  const { activeTab } = useTab();
  const { isDemoMode, setDemoMode } = useDemoMode();
  const [openOrgDropdown, setOpenOrgDropdown] = useState(false);

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  // Enable demo mode when not authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setDemoMode(false);
    } else {
      setDemoMode(true);
    }
  }, [isAuthenticated, setDemoMode]);

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

      {isDemoMode && !isAuthenticated && (
        <DemoModeBanner onConnectOrg={() => setOpenOrgDropdown(true)} />
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
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 min-h-[400px]">
                <div className="flex-1 min-h-0">
                  <ActiveSessions />
                </div>
                <div className="flex-1 min-h-0">
                  <RecentUsers />
                </div>
              </div>
              <div className="col-span-12 lg:col-span-4 min-h-[400px]">
                <HighRiskUsersPanel />
              </div>
              <div className="col-span-12 lg:col-span-4 min-h-[400px]">
                <GuestUsersPanel />
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

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-4 min-h-[400px]">
                <PermissionSetsPanel />
              </div>
              <div className="col-span-12 lg:col-span-4 min-h-[400px]">
                <ProfilePermissionsPanel />
              </div>
              <div className="col-span-12 lg:col-span-4 min-h-[400px]">
                <SystemAdminsPanel />
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
              <div className="col-span-12 lg:col-span-4 min-h-[400px]">
                <AuditTrail />
              </div>
              <div className="col-span-12 lg:col-span-4 min-h-[400px]">
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
