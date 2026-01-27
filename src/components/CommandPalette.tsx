import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  LayoutDashboard,
  Activity,
  Users,
  Plug,
  Key,
  Settings,
  Moon,
  Sun,
  Monitor,
  LogOut,
  X
} from 'lucide-react';
import { useTab } from '../context/TabContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: typeof LayoutDashboard;
  action: () => void;
  category: 'navigation' | 'actions';
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { setActiveTab } = useTab();
  const { preference, setPreference } = useTheme();
  const { logout, isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    { id: 'overview', label: 'Overview', description: 'Dashboard overview', icon: LayoutDashboard, action: () => { setActiveTab('overview'); onClose(); }, category: 'navigation' },
    { id: 'users', label: 'Users', description: 'User risk & management', icon: Users, action: () => { setActiveTab('users'); onClose(); }, category: 'navigation' },
    { id: 'activity', label: 'Activity', description: 'Sessions & anomalies', icon: Activity, action: () => { setActiveTab('activity'); onClose(); }, category: 'navigation' },
    { id: 'integrations', label: 'Integrations', description: 'Connected apps & packages', icon: Plug, action: () => { setActiveTab('integrations'); onClose(); }, category: 'navigation' },
    { id: 'permissions', label: 'Permissions', description: 'Access control & sharing', icon: Key, action: () => { setActiveTab('permissions'); onClose(); }, category: 'navigation' },
    { id: 'system', label: 'System', description: 'Org limits & audit logs', icon: Settings, action: () => { setActiveTab('system'); onClose(); }, category: 'navigation' },
    // Actions - Theme
    { id: 'theme-system', label: 'System Theme', description: preference === 'system' ? 'Currently active' : 'Match OS setting', icon: Monitor, action: () => { setPreference('system'); onClose(); }, category: 'actions' },
    { id: 'theme-light', label: 'Light Mode', description: preference === 'light' ? 'Currently active' : 'Switch to light', icon: Sun, action: () => { setPreference('light'); onClose(); }, category: 'actions' },
    { id: 'theme-dark', label: 'Dark Mode', description: preference === 'dark' ? 'Currently active' : 'Switch to dark', icon: Moon, action: () => { setPreference('dark'); onClose(); }, category: 'actions' },
    ...(isAuthenticated ? [{ id: 'logout', label: 'Logout', description: 'Sign out of SFDC', icon: LogOut, action: () => { logout(); onClose(); }, category: 'actions' as const }] : []),
  ], [setActiveTab, onClose, preference, setPreference, logout, isAuthenticated]);

  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      cmd => cmd.label.toLowerCase().includes(lower) ||
             cmd.description?.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => (i + 1) % filteredCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  const navigationCommands = filteredCommands.filter(c => c.category === 'navigation');
  const actionCommands = filteredCommands.filter(c => c.category === 'actions');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-4 right-4 z-[101] w-full max-w-md">
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))]">
            <Search className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commands..."
              className="flex-1 bg-transparent text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none"
            />
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors"
            >
              <X className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[300px] overflow-y-auto p-2">
            {filteredCommands.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                No results found
              </div>
            ) : (
              <>
                {navigationCommands.length > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1 text-[10px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      Navigation
                    </div>
                    {navigationCommands.map((cmd) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      return (
                        <button
                          key={cmd.id}
                          onClick={cmd.action}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                            globalIndex === selectedIndex
                              ? 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                              : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
                          }`}
                        >
                          <cmd.icon className="w-4 h-4" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm">{cmd.label}</div>
                            {cmd.description && (
                              <div className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                                {cmd.description}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {actionCommands.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      Actions
                    </div>
                    {actionCommands.map((cmd) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      return (
                        <button
                          key={cmd.id}
                          onClick={cmd.action}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                            globalIndex === selectedIndex
                              ? 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                              : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
                          }`}
                        >
                          <cmd.icon className="w-4 h-4" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm">{cmd.label}</div>
                            {cmd.description && (
                              <div className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                                {cmd.description}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
            <div className="flex items-center gap-4 text-[10px] text-[hsl(var(--muted-foreground))]">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))]">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))]">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))]">esc</kbd>
                close
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
