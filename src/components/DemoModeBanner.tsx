import { FlaskConical, ArrowRight } from 'lucide-react';

interface DemoModeBannerProps {
  onConnectOrg: () => void;
}

export function DemoModeBanner({ onConnectOrg }: DemoModeBannerProps) {
  return (
    <div className="mx-5 mt-4 flex items-center justify-between gap-3 px-4 py-3 rounded-md bg-[hsl(var(--warning)/0.1)] border border-[hsl(var(--warning)/0.3)]">
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded bg-[hsl(var(--warning)/0.2)]">
          <FlaskConical className="w-4 h-4 text-[hsl(var(--warning))]" />
        </div>
        <div>
          <span className="text-sm font-medium text-[hsl(var(--foreground))]">
            Demo Mode
          </span>
          <span className="text-sm text-[hsl(var(--muted-foreground))] ml-2">
            // viewing sample data - connect a salesforce org to see your real data
          </span>
        </div>
      </div>
      <button
        onClick={onConnectOrg}
        className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] hover:opacity-90 transition-opacity"
      >
        connect_org()
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}
