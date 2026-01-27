import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { TrackedIntegration, TrackedIntegrationStatus } from '../services/api';

// Fields that are sent when creating/updating an integration
type IntegrationFormData = Omit<TrackedIntegration, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isOwner' | 'permission'>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: IntegrationFormData) => Promise<void>;
  integration: TrackedIntegration | null;
  prefill?: Partial<TrackedIntegration> | null;
}

const emptyForm = {
  appName: '',
  contact: '',
  contactId: null as string | null,
  sfUsername: '',
  sfUserId: null as string | null,
  profile: '',
  inRetool: false,
  hasIpRanges: false,
  notes: '',
  ipRanges: [] as string[],
  status: 'pending' as TrackedIntegrationStatus,
};

export function AddEditIntegrationModal({ open, onClose, onSave, integration, prefill }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [newIpRange, setNewIpRange] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (integration) {
      setForm({
        appName: integration.appName,
        contact: integration.contact,
        contactId: integration.contactId,
        sfUsername: integration.sfUsername,
        sfUserId: integration.sfUserId,
        profile: integration.profile,
        inRetool: integration.inRetool,
        hasIpRanges: integration.hasIpRanges,
        notes: integration.notes,
        ipRanges: [...integration.ipRanges],
        status: integration.status,
      });
    } else if (prefill) {
      // Pre-fill from Salesforce user data
      setForm({
        ...emptyForm,
        appName: prefill.appName || '',
        sfUsername: prefill.sfUsername || '',
        sfUserId: prefill.sfUserId || null,
        profile: prefill.profile || '',
        status: prefill.status || 'pending',
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [integration, prefill, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.appName.trim()) {
      setError('App name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function addIpRange() {
    const ip = newIpRange.trim();
    if (ip && !form.ipRanges.includes(ip)) {
      setForm({ ...form, ipRanges: [...form.ipRanges, ip], hasIpRanges: true });
      setNewIpRange('');
    }
  }

  function removeIpRange(index: number) {
    const updated = form.ipRanges.filter((_, i) => i !== index);
    setForm({ ...form, ipRanges: updated, hasIpRanges: updated.length > 0 });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
          <h3 className="font-medium">
            {integration ? 'Edit Integration' : 'Add Integration'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-2 rounded bg-red-500/10 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
                App Name *
              </label>
              <input
                type="text"
                value={form.appName}
                onChange={(e) => setForm({ ...form, appName: e.target.value })}
                className="w-full px-3 py-2 rounded bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]"
                placeholder="e.g. Rocketlane"
              />
            </div>
            <div>
              <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
                Contact
              </label>
              <input
                type="text"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                className="w-full px-3 py-2 rounded bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]"
                placeholder="e.g. John Smith"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
                SFDC Username
              </label>
              <input
                type="text"
                value={form.sfUsername}
                onChange={(e) => setForm({ ...form, sfUsername: e.target.value })}
                className="w-full px-3 py-2 rounded bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]"
                placeholder="e.g. Integration User"
              />
            </div>
            <div>
              <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
                Profile
              </label>
              <input
                type="text"
                value={form.profile}
                onChange={(e) => setForm({ ...form, profile: e.target.value })}
                className="w-full px-3 py-2 rounded bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]"
                placeholder="e.g. API ONLY Read/Write"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}
                className="w-full px-3 py-2 rounded bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.inRetool}
                  onChange={(e) => setForm({ ...form, inRetool: e.target.checked })}
                  className="w-4 h-4 rounded border-[hsl(var(--border))]"
                />
                <span className="text-sm">In Retool</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))] resize-none"
              placeholder="Any additional notes..."
            />
          </div>

          <div>
            <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
              IP Ranges
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newIpRange}
                onChange={(e) => setNewIpRange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIpRange())}
                className="flex-1 px-3 py-2 rounded bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]"
                placeholder="e.g. 192.168.1.0/24"
              />
              <button
                type="button"
                onClick={addIpRange}
                className="px-3 py-2 rounded bg-[hsl(var(--muted))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/80 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {form.ipRanges.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.ipRanges.map((ip, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[hsl(var(--muted))] text-xs"
                  >
                    <code>{ip}</code>
                    <button
                      type="button"
                      onClick={() => removeIpRange(index)}
                      className="p-0.5 rounded hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-sm hover:bg-[hsl(var(--muted))] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded text-sm bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving...' : integration ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
