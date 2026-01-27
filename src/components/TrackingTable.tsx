import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Upload, Check, X, Clock, AlertCircle, Loader2, Zap, ZapOff, UserPlus, RefreshCw, Search, EyeOff, Eye, Save, User, Download, Share2, Users, Pencil } from 'lucide-react';
import {
  fetchTrackedIntegrations,
  createTrackedIntegration,
  updateTrackedIntegration,
  deleteTrackedIntegration,
  importTrackedIntegrations,
  fetchIntegrationsData,
  fetchUsers,
  fetchForceAuthUsers,
  shareIntegration,
  removeIntegrationShare,
  fetchIntegrationShares,
  type TrackedIntegration,
  type TrackedIntegrationStatus,
  type IntegrationUser,
  type SalesforceUser,
  type ForceAuthUser,
  type IntegrationShare,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSalesforceUserUrl } from '../utils/salesforceLinks';

const statusConfig = {
  done: { label: 'Done', icon: Check, className: 'bg-emerald-500/20 text-emerald-400' },
  in_progress: { label: 'In Progress', icon: Clock, className: 'bg-blue-500/20 text-blue-400' },
  pending: { label: 'Pending', icon: Clock, className: 'bg-yellow-500/20 text-yellow-400' },
  blocked: { label: 'Blocked', icon: AlertCircle, className: 'bg-red-500/20 text-red-400' },
};

const SAMPLE_CSV = `App Name,Internal Contact User ID,Integration User ID,Profile,Status,Notes,IP Range 1,IP Range 2
Acme Integration,005xx000001234ABC,005xx000009876XYZ,API Only User,pending,Needs IP restriction review,10.0.0.0/8,192.168.1.0/24
Data Sync Service,005xx000005678DEF,005xx000008765WVU,System Administrator,done,Completed setup,,
External Reporting,,005xx000007654TSR,Analytics User,in progress,Waiting on vendor,,`;

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'integrations-sample.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface EnrichedIntegration extends TrackedIntegration {
  sfUser?: IntegrationUser;
  contactUser?: SalesforceUser;
  detected: boolean;
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

interface EditingRow {
  id: string;
  appName: string;
  contact: string;
  contactId: string | null;
  sfUsername: string;
  profile: string;
  inRetool: boolean;
  notes: string;
  status: TrackedIntegrationStatus;
  ipRanges: string[];
  ipRangeInput: string;
}

export function TrackingTable() {
  const { isAuthenticated, instanceUrl } = useAuth();
  const [integrations, setIntegrations] = useState<TrackedIntegration[]>([]);
  const [sfUsers, setSfUsers] = useState<IntegrationUser[]>([]);
  const [allUsers, setAllUsers] = useState<SalesforceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sfLoading, setSfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showUntracked, setShowUntracked] = useState(true);
  const [untrackedSearch, setUntrackedSearch] = useState('');
  const [hiddenUserIds, setHiddenUserIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('hiddenIntegrationUsers');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [showHidden, setShowHidden] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const contactInputRef = useRef<HTMLInputElement>(null);

  // Sharing state (holistic - share all integrations at once)
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [teammates, setTeammates] = useState<ForceAuthUser[]>([]);
  const [currentShares, setCurrentShares] = useState<IntegrationShare[]>([]);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [shareUserSearch, setShareUserSearch] = useState('');

  useEffect(() => {
    loadIntegrations();
  }, []);

  useEffect(() => {
    localStorage.setItem('hiddenIntegrationUsers', JSON.stringify([...hiddenUserIds]));
  }, [hiddenUserIds]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSalesforceData();
      loadTeammates();
    }
  }, [isAuthenticated]);

  async function loadTeammates() {
    try {
      const users = await fetchForceAuthUsers();
      setTeammates(users);
    } catch (err) {
      console.error('Failed to load teammates:', err);
    }
  }

  // Click outside handler for contact dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contactInputRef.current && !contactInputRef.current.contains(event.target as Node)) {
        // Small delay to allow click on dropdown items
        setTimeout(() => setShowContactDropdown(false), 150);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update dropdown position when showing
  function updateDropdownPosition() {
    if (contactInputRef.current) {
      const rect = contactInputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width + 28, // Account for the clear button width
      });
    }
  }

  async function loadIntegrations() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTrackedIntegrations();
      setIntegrations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }

  async function loadSalesforceData() {
    try {
      setSfLoading(true);
      const [integrationsData, usersData] = await Promise.all([
        fetchIntegrationsData(),
        fetchUsers({ all: true, limit: 200 }),
      ]);
      setSfUsers(integrationsData.integrationUsers);
      setAllUsers(usersData);
    } catch (err) {
      console.error('Failed to load SF data:', err);
    } finally {
      setSfLoading(false);
    }
  }

  // Cross-reference tracked integrations with SF users
  const enrichedIntegrations: EnrichedIntegration[] = integrations.map((integration) => {
    const sfUser = sfUsers.find(
      (u) =>
        // Match by sfUserId first (from CSV import)
        (integration.sfUserId && u.id === integration.sfUserId) ||
        // Fall back to username matching
        (integration.sfUsername && (
          u.username.toLowerCase() === integration.sfUsername.toLowerCase() ||
          u.name.toLowerCase() === integration.sfUsername.toLowerCase()
        ))
    );
    // Look up contact user by contactId
    const contactUser = integration.contactId
      ? allUsers.find((u) => u.id === integration.contactId)
      : undefined;
    return {
      ...integration,
      sfUser,
      contactUser,
      detected: !!sfUser,
    };
  });

  // Find untracked SF users (not in tracked integrations)
  const trackedUserIds = new Set(
    integrations.map((i) => i.sfUserId).filter(Boolean)
  );
  const trackedUsernames = new Set(
    integrations.map((i) => i.sfUsername.toLowerCase()).filter(Boolean)
  );
  const allUntrackedUsers = sfUsers.filter(
    (u) =>
      !trackedUserIds.has(u.id) &&
      !trackedUsernames.has(u.username.toLowerCase()) &&
      !trackedUsernames.has(u.name.toLowerCase())
  );

  // Apply search and hidden filter
  const searchLower = untrackedSearch.toLowerCase();
  const filteredUntrackedUsers = allUntrackedUsers.filter((u) => {
    const isHidden = hiddenUserIds.has(u.id);
    if (!showHidden && isHidden) return false;
    if (showHidden && !isHidden) return false;
    if (searchLower) {
      return (
        u.name.toLowerCase().includes(searchLower) ||
        u.username.toLowerCase().includes(searchLower) ||
        (u.profile?.toLowerCase().includes(searchLower) ?? false)
      );
    }
    return true;
  });

  const hiddenCount = allUntrackedUsers.filter((u) => hiddenUserIds.has(u.id)).length;
  const visibleCount = allUntrackedUsers.length - hiddenCount;

  function hideUser(userId: string) {
    setHiddenUserIds((prev) => new Set([...prev, userId]));
  }

  function unhideUser(userId: string) {
    setHiddenUserIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }

  function startEditing(integration: TrackedIntegration) {
    setEditingRow({
      id: integration.id,
      appName: integration.appName,
      contact: integration.contact,
      contactId: integration.contactId,
      sfUsername: integration.sfUsername,
      profile: integration.profile,
      inRetool: integration.inRetool,
      notes: integration.notes,
      status: integration.status,
      ipRanges: [...integration.ipRanges],
      ipRangeInput: '',
    });
    setContactSearch(integration.contact);
    setShowContactDropdown(false);
  }

  function cancelEditing() {
    setEditingRow(null);
    setContactSearch('');
    setShowContactDropdown(false);
  }

  function addIpRange() {
    if (!editingRow || !editingRow.ipRangeInput.trim()) return;
    const newIp = editingRow.ipRangeInput.trim();
    if (!editingRow.ipRanges.includes(newIp)) {
      setEditingRow({
        ...editingRow,
        ipRanges: [...editingRow.ipRanges, newIp],
        ipRangeInput: '',
      });
    }
  }

  function removeIpRange(index: number) {
    if (!editingRow) return;
    setEditingRow({
      ...editingRow,
      ipRanges: editingRow.ipRanges.filter((_, i) => i !== index),
    });
  }

  async function saveEditing() {
    if (!editingRow) return;

    try {
      setSavingRow(editingRow.id);
      await updateTrackedIntegration(editingRow.id, {
        appName: editingRow.appName,
        contact: editingRow.contact,
        contactId: editingRow.contactId,
        sfUsername: editingRow.sfUsername,
        profile: editingRow.profile,
        inRetool: editingRow.inRetool,
        notes: editingRow.notes,
        status: editingRow.status,
        ipRanges: editingRow.ipRanges,
        hasIpRanges: editingRow.ipRanges.length > 0,
      });
      await loadIntegrations();
      setEditingRow(null);
      setContactSearch('');
      setShowContactDropdown(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingRow(null);
    }
  }

  // Filter users for contact lookup
  const filteredContactUsers = allUsers.filter((user) => {
    if (!contactSearch) return true;
    const search = contactSearch.toLowerCase();
    return (
      user.name.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.username.toLowerCase().includes(search)
    );
  }).slice(0, 10);

  function selectContact(user: SalesforceUser) {
    if (!editingRow) return;
    setEditingRow({
      ...editingRow,
      contact: user.name,
      contactId: user.id,
    });
    setContactSearch(user.name);
    setShowContactDropdown(false);
  }

  function clearContact() {
    if (!editingRow) return;
    setEditingRow({
      ...editingRow,
      contact: '',
      contactId: null,
    });
    setContactSearch('');
  }

  async function addNewIntegration() {
    try {
      const newIntegration = await createTrackedIntegration({
        appName: 'New Integration',
        status: 'pending',
      });
      await loadIntegrations();
      // Start editing the new row immediately
      startEditing(newIntegration);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTrackedIntegration(id);
      await loadIntegrations();
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete integration');
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      await importTrackedIntegrations(content);
      await loadIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import CSV');
    }
    e.target.value = '';
  }

  async function addFromSfUser(user: IntegrationUser) {
    try {
      await createTrackedIntegration({
        appName: user.name.replace(/\s*(Integration|API|User)\s*/gi, '').trim() || user.name,
        sfUsername: user.username,
        sfUserId: user.id,
        profile: user.profile || '',
        status: 'pending',
      });
      await loadIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add integration');
    }
  }

  const statusCounts = integrations.reduce(
    (acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Sharing functions (holistic - share all user's integrations at once)
  async function openShareModal() {
    setShowSharingModal(true);
    setSharingLoading(true);
    setShareUserSearch('');
    try {
      // Load shares from the first owned integration to show current state
      // In holistic mode, all integrations share the same access list
      const ownedIntegrations = integrations.filter(i => i.isOwner);
      if (ownedIntegrations.length > 0) {
        const shares = await fetchIntegrationShares(ownedIntegrations[0].id);
        setCurrentShares(shares);
      } else {
        setCurrentShares([]);
      }
    } catch (err) {
      console.error('Failed to load shares:', err);
      setCurrentShares([]);
    } finally {
      setSharingLoading(false);
    }
  }

  function closeShareModal() {
    setShowSharingModal(false);
    setCurrentShares([]);
    setShareUserSearch('');
  }

  async function handleShare(userId: string, permission: 'view' | 'edit') {
    try {
      setSharingLoading(true);
      // Share all owned integrations with this user
      const ownedIntegrations = integrations.filter(i => i.isOwner);
      for (const integration of ownedIntegrations) {
        await shareIntegration(integration.id, userId, permission);
      }
      // Reload shares
      if (ownedIntegrations.length > 0) {
        const shares = await fetchIntegrationShares(ownedIntegrations[0].id);
        setCurrentShares(shares);
      }
      await loadIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share');
    } finally {
      setSharingLoading(false);
    }
  }

  async function handleRemoveShare(userId: string) {
    try {
      setSharingLoading(true);
      // Remove share from all owned integrations
      const ownedIntegrations = integrations.filter(i => i.isOwner);
      for (const integration of ownedIntegrations) {
        await removeIntegrationShare(integration.id, userId);
      }
      // Reload shares
      if (ownedIntegrations.length > 0) {
        const shares = await fetchIntegrationShares(ownedIntegrations[0].id);
        setCurrentShares(shares);
      }
      await loadIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove share');
    } finally {
      setSharingLoading(false);
    }
  }

  // Filter teammates for sharing (exclude already shared users)
  const sharedUserIds = new Set(currentShares.map(s => s.sharedWithUserId));
  const availableTeammates = teammates.filter(t => {
    if (sharedUserIds.has(t.id)) return false;
    if (!shareUserSearch) return true;
    const search = shareUserSearch.toLowerCase();
    return (
      t.name?.toLowerCase().includes(search) ||
      t.email?.toLowerCase().includes(search)
    );
  });


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-medium">Integration Tracking</h2>
          <div className="flex items-center gap-2">
            {Object.entries(statusConfig).map(([key, config]) => {
              const count = statusCounts[key] || 0;
              const Icon = config.icon;
              return (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${config.className}`}
                >
                  <Icon className="w-3 h-3" />
                  {count}
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <button
              onClick={loadSalesforceData}
              disabled={sfLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80 transition-colors disabled:opacity-50"
              title="Refresh SFDC data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sfLoading ? 'animate-spin' : ''}`} />
              Sync SFDC
            </button>
          )}
          <button
            onClick={openShareModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors"
            title="Share your integrations with teammates"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
          <button
            onClick={downloadSampleCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80 transition-colors"
            title="Download sample CSV template"
          >
            <Download className="w-3.5 h-3.5" />
            Sample CSV
          </button>
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <button
            onClick={addNewIntegration}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Integration
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-red-500/10 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="border border-[hsl(var(--border))] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                <th className="text-left px-4 py-2.5 font-medium text-[hsl(var(--muted-foreground))]">App</th>
                <th className="text-left px-4 py-2.5 font-medium text-[hsl(var(--muted-foreground))]">Contact</th>
                <th className="text-left px-4 py-2.5 font-medium text-[hsl(var(--muted-foreground))]">SFDC Username</th>
                <th className="text-left px-4 py-2.5 font-medium text-[hsl(var(--muted-foreground))]">Profile</th>
                <th className="text-center px-4 py-2.5 font-medium text-[hsl(var(--muted-foreground))]">IP Ranges</th>
                <th className="text-left px-4 py-2.5 font-medium text-[hsl(var(--muted-foreground))]">Status</th>
                {isAuthenticated && (
                  <th className="text-left px-4 py-2.5 font-medium text-[hsl(var(--muted-foreground))]">Last Login</th>
                )}
                <th className="text-left px-4 py-2.5 font-medium text-[hsl(var(--muted-foreground))]">Notes</th>
                <th className="text-right px-4 py-2.5 font-medium text-[hsl(var(--muted-foreground))]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrichedIntegrations.length === 0 ? (
                <tr>
                  <td colSpan={isAuthenticated ? 9 : 8} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">
                    No integrations tracked yet. Add one or import from CSV.
                  </td>
                </tr>
              ) : (
                enrichedIntegrations.map((integration) => {
                  const isEditing = editingRow?.id === integration.id;
                  const status = statusConfig[isEditing ? editingRow.status : integration.status];
                  const StatusIcon = status.icon;
                  const isSaving = savingRow === integration.id;

                  if (isEditing) {
                    return (
                      <tr
                        key={integration.id}
                        className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30"
                      >
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={editingRow.appName}
                            onChange={(e) => setEditingRow({ ...editingRow, appName: e.target.value })}
                            className="w-full px-2 py-1 text-sm rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]"
                            placeholder="App name"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="relative">
                            <div className="flex items-center gap-1">
                              <div className="relative flex-1">
                                <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                                <input
                                  ref={contactInputRef}
                                  type="text"
                                  value={contactSearch}
                                  onChange={(e) => {
                                    setContactSearch(e.target.value);
                                    setShowContactDropdown(true);
                                    updateDropdownPosition();
                                    if (!e.target.value) {
                                      setEditingRow({ ...editingRow, contact: '', contactId: null });
                                    }
                                  }}
                                  onFocus={() => {
                                    setShowContactDropdown(true);
                                    updateDropdownPosition();
                                  }}
                                  className="w-full pl-7 pr-2 py-1 text-sm rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]"
                                  placeholder={isAuthenticated ? "Search users..." : "Contact name"}
                                />
                              </div>
                              {editingRow.contactId && (
                                <button
                                  type="button"
                                  onClick={clearContact}
                                  className="p-1 rounded hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                                  title="Clear contact"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            {showContactDropdown && isAuthenticated && filteredContactUsers.length > 0 && dropdownPosition && (
                              <div
                                className="fixed z-[100] max-h-48 overflow-y-auto rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-lg"
                                style={{
                                  top: dropdownPosition.top,
                                  left: dropdownPosition.left,
                                  width: dropdownPosition.width,
                                }}
                              >
                                {filteredContactUsers.map((user) => (
                                  <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => selectContact(user)}
                                    className={`w-full px-3 py-2 text-left hover:bg-[hsl(var(--muted))] transition-colors ${
                                      editingRow.contactId === user.id ? 'bg-[hsl(var(--muted))]' : ''
                                    }`}
                                  >
                                    <div className="text-xs font-medium">{user.name}</div>
                                    <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{user.email || user.username}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <code className="text-xs bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded text-[hsl(var(--muted-foreground))]">
                            {editingRow.sfUsername || '-'}
                          </code>
                        </td>
                        <td className="px-2 py-2 text-[hsl(var(--muted-foreground))] text-sm">
                          {editingRow.profile || '-'}
                        </td>
                        <td className="px-2 py-2">
                          <div className="space-y-1">
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={editingRow.ipRangeInput}
                                onChange={(e) => setEditingRow({ ...editingRow, ipRangeInput: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIpRange())}
                                className="w-24 px-1.5 py-0.5 text-[10px] font-mono rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]"
                                placeholder="Add IP..."
                              />
                              <button
                                type="button"
                                onClick={addIpRange}
                                className="px-1.5 py-0.5 text-[10px] rounded bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80"
                              >
                                +
                              </button>
                            </div>
                            {editingRow.ipRanges.length > 0 && (
                              <div className="flex flex-wrap gap-0.5 max-w-[150px]">
                                {editingRow.ipRanges.map((ip, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-[hsl(var(--muted))] text-[9px] font-mono"
                                  >
                                    {ip}
                                    <button
                                      type="button"
                                      onClick={() => removeIpRange(idx)}
                                      className="hover:text-red-400"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="relative">
                            <select
                              value={editingRow.status}
                              onChange={(e) => setEditingRow({ ...editingRow, status: e.target.value as TrackedIntegrationStatus })}
                              className={`w-full px-2 py-1 text-xs rounded border-0 focus:outline-none focus:ring-1 focus:ring-current appearance-none cursor-pointer pr-6 ${statusConfig[editingRow.status].className}`}
                            >
                              <option value="done" className="bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">✓ Done</option>
                              <option value="in_progress" className="bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">◐ In Progress</option>
                              <option value="pending" className="bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">○ Pending</option>
                              <option value="blocked" className="bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">✕ Blocked</option>
                            </select>
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </td>
                        {isAuthenticated && (
                          <td className="px-2 py-2 text-[hsl(var(--muted-foreground))] text-xs">
                            {integration.sfUser ? formatTimeAgo(integration.sfUser.lastLoginDate) : '-'}
                          </td>
                        )}
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={editingRow.notes}
                            onChange={(e) => setEditingRow({ ...editingRow, notes: e.target.value })}
                            className="w-full px-2 py-1 text-sm rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]"
                            placeholder="Notes"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={saveEditing}
                              disabled={isSaving}
                              className="p-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                              title="Save"
                            >
                              {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={isSaving}
                              className="p-1.5 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={integration.id}
                      className="border-b border-[hsl(var(--border))] last:border-b-0 hover:bg-[hsl(var(--muted))]/50 transition-colors cursor-pointer"
                      onDoubleClick={() => startEditing(integration)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{integration.appName}</span>
                          {/* Shared badge for non-owner integrations */}
                          {!integration.isOwner && integration.permission && (
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                                integration.permission === 'edit'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}
                              title={`Shared with you (${integration.permission} access)`}
                            >
                              <Users className="w-2.5 h-2.5" />
                              {integration.permission === 'edit' ? 'Edit' : 'View'}
                            </span>
                          )}
                          {isAuthenticated && (
                            integration.detected ? (
                              <span title="Detected in SFDC">
                                <Zap className="w-3.5 h-3.5 text-violet-400" />
                              </span>
                            ) : (
                              <span title="Not found in SFDC">
                                <ZapOff className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                        {(integration.contact || integration.contactUser?.name) ? (
                          <div
                            onClick={(e) => {
                              if (integration.contactId) {
                                e.stopPropagation();
                                const url = getSalesforceUserUrl(instanceUrl, integration.contactId);
                                if (url) window.open(url, '_blank');
                              }
                            }}
                            className={`flex items-center gap-1.5 ${integration.contactId ? 'cursor-pointer hover:text-[hsl(var(--foreground))] transition-colors' : ''}`}
                          >
                            {integration.contactId && (
                              <User className="w-3 h-3 text-[hsl(var(--info))]" />
                            )}
                            <span>{integration.contact || integration.contactUser?.name}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {(integration.sfUsername || integration.sfUser?.username) ? (
                          <code
                            onClick={(e) => {
                              e.stopPropagation();
                              const userId = integration.sfUserId || integration.sfUser?.id;
                              const url = userId ? getSalesforceUserUrl(instanceUrl, userId) : null;
                              if (url) window.open(url, '_blank');
                            }}
                            className="text-xs bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded hover:bg-[hsl(var(--muted))]/80 cursor-pointer transition-colors"
                          >
                            {integration.sfUsername || integration.sfUser?.username}
                          </code>
                        ) : (
                          <code className="text-xs bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded">-</code>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                        {integration.sfUser?.profile || integration.profile || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {integration.hasIpRanges ? (
                          <div className="relative group inline-block">
                            <span className="text-xs text-emerald-400 cursor-help underline decoration-dotted underline-offset-2">
                              {integration.ipRanges.length}
                            </span>
                            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
                              <div className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-md shadow-lg p-2 min-w-[140px]">
                                <div className="text-[10px] text-[hsl(var(--muted-foreground))] mb-1.5 uppercase tracking-wide">IP Ranges</div>
                                <div className="space-y-1">
                                  {integration.ipRanges.map((ip, idx) => (
                                    <code key={idx} className="block text-[11px] font-mono text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded">
                                      {ip}
                                    </code>
                                  ))}
                                </div>
                              </div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-[hsl(var(--border))]" />
                            </div>
                          </div>
                        ) : (
                          <X className="w-4 h-4 text-[hsl(var(--muted-foreground))] mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${status.className}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      {isAuthenticated && (
                        <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] text-xs">
                          {integration.sfUser ? (
                            <span className={integration.sfUser.isActive ? '' : 'text-red-400'}>
                              {formatTimeAgo(integration.sfUser.lastLoginDate)}
                              {!integration.sfUser.isActive && ' (inactive)'}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] max-w-[200px] truncate">
                        {integration.notes || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit button - disabled for view-only */}
                          <button
                            onClick={() => startEditing(integration)}
                            disabled={integration.permission === 'view'}
                            className={`p-1.5 rounded transition-colors ${
                              integration.permission === 'view'
                                ? 'opacity-30 cursor-not-allowed'
                                : 'hover:bg-[hsl(var(--muted))]'
                            }`}
                            title={integration.permission === 'view' ? 'View only - cannot edit' : 'Edit'}
                          >
                            <Pencil className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                          </button>
                          {/* Delete button - owner only */}
                          {integration.isOwner ? (
                            deleteConfirm === integration.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(integration.id)}
                                  className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 transition-colors"
                                  title="Confirm delete"
                                >
                                  <Check className="w-3.5 h-3.5 text-red-400" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="p-1.5 rounded hover:bg-[hsl(var(--muted))] transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(integration.id)}
                                className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                              </button>
                            )
                          ) : (
                            <button
                              disabled
                              className="p-1.5 rounded opacity-30 cursor-not-allowed"
                              title="Only owner can delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Untracked SFDC Integration Users */}
      {isAuthenticated && allUntrackedUsers.length > 0 && (
        <div className="border border-[hsl(var(--border))] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[hsl(var(--muted))]">
            <button
              onClick={() => setShowUntracked(!showUntracked)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <UserPlus className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-medium">Untracked SFDC Integration Users</span>
              <span className="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-400">
                {visibleCount}
              </span>
              {hiddenCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]">
                  {hiddenCount} hidden
                </span>
              )}
            </button>
            <div className="flex items-center gap-2">
              {showUntracked && (
                <>
                  {hiddenCount > 0 && (
                    <button
                      onClick={() => setShowHidden(!showHidden)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                        showHidden
                          ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--background))]'
                          : 'bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                      }`}
                    >
                      {showHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {showHidden ? hiddenCount : 'Hidden'}
                    </button>
                  )}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                    <input
                      type="text"
                      value={untrackedSearch}
                      onChange={(e) => setUntrackedSearch(e.target.value)}
                      placeholder="Search..."
                      className="w-32 pl-7 pr-2 py-1 text-xs rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]"
                    />
                  </div>
                </>
              )}
              <button
                onClick={() => setShowUntracked(!showUntracked)}
                className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              >
                {showUntracked ? 'Collapse' : 'Expand'}
              </button>
            </div>
          </div>

          {showUntracked && (
            <div className="divide-y divide-[hsl(var(--border))] max-h-[400px] overflow-y-auto">
                {filteredUntrackedUsers.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
                    {untrackedSearch ? 'No users match your search' : showHidden ? 'No hidden users' : 'All users are hidden'}
                  </div>
                ) : (
                  filteredUntrackedUsers.map((user) => {
                    const isHidden = hiddenUserIds.has(user.id);
                    return (
                      <div
                        key={user.id}
                        className={`flex items-center justify-between px-4 py-3 hover:bg-[hsl(var(--muted))]/30 transition-colors ${
                          isHidden ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            onClick={() => {
                              const url = getSalesforceUserUrl(instanceUrl, user.id);
                              if (url) window.open(url, '_blank');
                            }}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <div className="text-sm font-medium">{user.name}</div>
                            <code className="text-xs text-[hsl(var(--muted-foreground))]">{user.username}</code>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded bg-[hsl(var(--muted))]">
                            {user.profile || user.userType}
                          </span>
                          <span className={`text-xs ${user.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">
                            Last login: {formatTimeAgo(user.lastLoginDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isHidden ? (
                            <button
                              onClick={() => unhideUser(user.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Unhide
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => hideUser(user.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                              >
                                <EyeOff className="w-3.5 h-3.5" />
                                Hide
                              </button>
                              <button
                                onClick={() => addFromSfUser(user)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Track
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
            </div>
          )}
        </div>
      )}

      {/* Sharing Modal */}
      {showSharingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeShareModal}
          />
          <div className="relative bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-violet-400" />
                <h3 className="font-medium">Share Integrations</h3>
              </div>
              <button
                onClick={closeShareModal}
                className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors"
              >
                <X className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                Share all your tracked integrations with teammates
              </div>

              {/* Current shares */}
              {currentShares.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Shared with</div>
                  <div className="space-y-1">
                    {currentShares.map((share) => (
                      <div
                        key={share.id}
                        className="flex items-center justify-between px-3 py-2 rounded bg-[hsl(var(--muted))]"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                          <div>
                            <div className="text-sm">{share.sharedWithUserName || 'Unknown User'}</div>
                            {share.sharedWithUserEmail && (
                              <div className="text-xs text-[hsl(var(--muted-foreground))]">{share.sharedWithUserEmail}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            share.permission === 'edit'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {share.permission}
                          </span>
                          <button
                            onClick={() => handleRemoveShare(share.sharedWithUserId)}
                            disabled={sharingLoading}
                            className="p-1 rounded hover:bg-red-500/20 transition-colors disabled:opacity-50"
                            title="Remove share"
                          >
                            <X className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new share */}
              <div className="space-y-2">
                <div className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Add people</div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                  <input
                    type="text"
                    value={shareUserSearch}
                    onChange={(e) => setShareUserSearch(e.target.value)}
                    placeholder="Search teammates..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded bg-[hsl(var(--muted))] border border-[hsl(var(--border))] focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                </div>
                {availableTeammates.length === 0 ? (
                  <div className="text-xs text-[hsl(var(--muted-foreground))] text-center py-4">
                    {teammates.length === 0
                      ? 'No teammates found'
                      : shareUserSearch
                      ? 'No matching teammates'
                      : 'All teammates already have access'}
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {availableTeammates.slice(0, 10).map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between px-3 py-2 rounded hover:bg-[hsl(var(--muted))] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                          <div>
                            <div className="text-sm">{user.name || 'Unknown'}</div>
                            {user.email && (
                              <div className="text-xs text-[hsl(var(--muted-foreground))]">{user.email}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleShare(user.id, 'view')}
                            disabled={sharingLoading}
                            className="px-2 py-1 text-xs rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors disabled:opacity-50"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleShare(user.id, 'edit')}
                            disabled={sharingLoading}
                            className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end px-4 py-3 border-t border-[hsl(var(--border))]">
              <button
                onClick={closeShareModal}
                className="px-4 py-1.5 text-sm rounded bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
