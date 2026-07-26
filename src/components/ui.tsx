export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "danger" | "warning" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-neutral-100 text-neutral-600",
    success: "bg-emerald-100 text-emerald-700",
    danger: "bg-red-100 text-red-700",
    warning: "bg-amber-100 text-amber-700",
    info: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-neutral-300 bg-white/60">
      {icon && <div className="text-4xl mb-3">{icon}</div>}
      <p className="font-semibold text-neutral-800">{title}</p>
      {description && <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "neutral" | "success" | "danger" | "warning";
}) {
  const accents: Record<string, string> = {
    neutral: "from-neutral-50 to-white border-neutral-200",
    success: "from-emerald-50 to-white border-emerald-200",
    danger: "from-red-50 to-white border-red-200",
    warning: "from-amber-50 to-white border-amber-200",
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-b ${accents[accent]} p-4 shadow-sm`}>
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1.5 text-neutral-900">{value}</p>
      {hint && <p className="text-xs text-neutral-400 mt-1">{hint}</p>}
    </div>
  );
}
