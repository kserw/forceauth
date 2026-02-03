import { useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Command, Terminal, Building2, LogOut, LogIn } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useTab } from '../context/TabContext';
import { CommandPalette } from './CommandPalette';
import { ConnectOrgModal } from './ConnectOrgModal';
import { getStoredOrgCredentials } from '../services/api';
import Link from 'next/link';

interface HeaderProps {
  openOrgDropdown?: boolean;
  onOrgDropdownChange?: (open: boolean) => void;
}

export function Header({ openOrgDropdown, onOrgDropdownChange }: HeaderProps) {
  const { preference, setPreference } = useTheme();
  const { isAuthenticated, user, logout, login } = useAuth();
  const { setActiveTab } = useTab();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [storedCredentials, setStoredCredentials] = useState<ReturnType<typeof getStoredOrgCredentials>>(null);

  // Load stored credentials on mount (client-side only)
  useEffect(() => {
    setStoredCredentials(getStoredOrgCredentials());
  }, []);

  const cycleTheme = () => {
    const next = preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system';
    setPreference(next);
  };

  // Global keyboard shortcut for ⌘K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update browser tab title with org name
  useEffect(() => {
    if (isAuthenticated && user?.orgName) {
      document.title = `forceauth // ${user.orgName.toLowerCase()}`;
    } else {
      document.title = 'forceauth';
    }
  }, [isAuthenticated, user?.orgName]);

  // Handle forceOpen from parent
  useEffect(() => {
    if (openOrgDropdown) {
      setIsConnectModalOpen(true);
      onOrgDropdownChange?.(false);
    }
  }, [openOrgDropdown, onOrgDropdownChange]);

  // Refresh stored credentials when modal closes
  useEffect(() => {
    if (!isConnectModalOpen) {
      setStoredCredentials(getStoredOrgCredentials());
    }
  }, [isConnectModalOpen]);

  const handleLogout = async () => {
    await logout();
  };

  const orgName = isAuthenticated ? user?.orgName : storedCredentials?.orgName;
  const environment = storedCredentials?.environment;

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between px-5 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.9)] backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2 px-2 py-1 rounded bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] transition-colors"
          >
            <Terminal className="w-4 h-4 text-[hsl(var(--foreground))]" />
            <span className="text-sm font-medium text-[hsl(var(--foreground))]">forceauth</span>
          </Link>
          {orgName && (
            <>
              <span className="text-[hsl(var(--muted-foreground))]">//</span>
              <span className="text-sm text-[hsl(var(--muted-foreground))]">{orgName.toLowerCase()}</span>
              {environment && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                  environment === 'sandbox'
                    ? 'bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]'
                    : 'bg-[hsl(var(--success)/0.2)] text-[hsl(var(--success))]'
                }`}>
                  {environment}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Org connection button */}
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[hsl(var(--muted))] text-xs hover:bg-[hsl(var(--accent))] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              <span className="text-[hsl(var(--foreground))]">Logout</span>
            </button>
          ) : storedCredentials ? (
            <button
              onClick={() => login()}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[hsl(var(--success)/0.1)] text-xs hover:bg-[hsl(var(--success)/0.2)] transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
              <span className="text-[hsl(var(--success))]">Login</span>
            </button>
          ) : (
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[hsl(var(--info)/0.1)] text-xs hover:bg-[hsl(var(--info)/0.2)] transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-[hsl(var(--info))]" />
              <span className="text-[hsl(var(--info))]">Connect Org</span>
            </button>
          )}

          <div className="w-px h-5 bg-[hsl(var(--border))]" />

          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-xs hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))] transition-colors border border-transparent hover:border-[hsl(var(--border))]"
          >
            <Command className="w-3 h-3" />
            <span>Search...</span>
            <kbd className="ml-1 px-1 py-0.5 rounded bg-[hsl(var(--background))] text-[10px] border border-[hsl(var(--border))]">
              ⌘K
            </kbd>
          </button>

          <div className="w-px h-5 bg-[hsl(var(--border))]" />

          <button
            onClick={cycleTheme}
            className="p-2 rounded hover:bg-[hsl(var(--muted))] transition-colors"
            aria-label={`Theme: ${preference}`}
            title={`Theme: ${preference}`}
          >
            {preference === 'system' ? (
              <Monitor className="w-4 h-4 text-[hsl(var(--foreground))]" />
            ) : preference === 'dark' ? (
              <Moon className="w-4 h-4 text-[hsl(var(--foreground))]" />
            ) : (
              <Sun className="w-4 h-4 text-[hsl(var(--foreground))]" />
            )}
          </button>
        </div>

        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      </header>

      <ConnectOrgModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />
    </>
  );
}
