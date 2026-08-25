export default function StatCard({
  label,
  value,
  sub,
  tone = 'default',
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'warn' | 'danger' | 'good';
  icon?: string;
}) {
  const toneClasses: Record<string, string> = {
    default: 'text-stone-900',
    warn: 'text-amber-600',
    danger: 'text-red-600',
    good: 'text-agri-700',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">{label}</div>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className={`text-2xl font-bold mt-1 ${toneClasses[tone]}`}>{value}</div>
      {sub && <div className="text-xs text-stone-400 mt-1">{sub}</div>}
    </div>
  );
}
