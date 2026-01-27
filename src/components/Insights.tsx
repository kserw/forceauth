import { Shield, Zap, ArrowRight } from 'lucide-react';
import { insights } from '../data/mockData';

export function Insights() {
  const getIcon = (type: string) => {
    switch (type) {
      case 'security':
        return <Shield className="w-3.5 h-3.5" />;
      case 'performance':
        return <Zap className="w-3.5 h-3.5" />;
      default:
        return <Shield className="w-3.5 h-3.5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'security':
        return 'text-[hsl(var(--destructive))]';
      case 'performance':
        return 'text-[hsl(var(--info))]';
      default:
        return 'text-[hsl(var(--warning))]';
    }
  };

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">// insights.warnings[]</span>
        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[hsl(var(--warning-muted))] text-[hsl(var(--warning))] tabular-nums">
          {insights.length}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {insights.map((insight) => {
          const color = getTypeColor(insight.type);
          return (
            <div
              key={insight.id}
              className="group p-3 rounded border border-[hsl(var(--border))] hover:border-[hsl(var(--border-hover))] transition-all cursor-pointer"
            >
              <div className="flex items-start gap-2 mb-2">
                <span className={color}>{getIcon(insight.type)}</span>
                <span className={`text-[10px] uppercase tracking-wide ${color}`}>
                  {insight.type}
                </span>
              </div>
              <h4 className="text-xs font-medium text-[hsl(var(--foreground))] mb-1">
                {insight.title}
              </h4>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-relaxed line-clamp-2">
                {insight.description}
              </p>
              <button className="flex items-center gap-1 mt-2 text-[10px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors opacity-0 group-hover:opacity-100">
                fix()
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
