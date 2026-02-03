import { useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Command, Terminal } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useTab } from '../context/TabContext';
import { CommandPalette } from './CommandPalette';
import { ConnectOrgModal } from './ConnectOrgModal';
import { OrgDropdown } from './OrgDropdown';
import Link from 'next/link';

interface HeaderProps {
  openOrgDropdown?: boolean;
  onOrgDropdownChange?: (open: boolean) => void;
}

export function Header({ openOrgDropdown, onOrgDropdownChange }: HeaderProps) {
  const { preference, setPreference } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const { setActiveTab } = useTab();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [orgRefreshKey, setOrgRefreshKey] = useState(0);

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
          {isAuthenticated && user?.orgName && (
            <>
              <span className="text-[hsl(var(--muted-foreground))]">//</span>
              <span className="text-sm text-[hsl(var(--muted-foreground))]">{user.orgName.toLowerCase()}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <OrgDropdown onAddEnvironment={() => setIsConnectModalOpen(true)} refreshKey={orgRefreshKey} />

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
        onClose={() => {
          setIsConnectModalOpen(false);
          setOrgRefreshKey(k => k + 1);
        }}
      />
    </>
  );
}
