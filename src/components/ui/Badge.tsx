interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'navy' | 'yellow' | 'red' | 'gray' | 'blue' | 'orange';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

// Refined status chips: soft tint, hairline ring, tabular label + a status dot.
// Deliberately restrained — reads as a professional data label, not a bubble.
const VARIANTS: Record<NonNullable<BadgeProps['variant']>, { chip: string; dot: string }> = {
  green:  { chip: 'bg-emerald-50/80 text-emerald-700 ring-1 ring-emerald-600/15', dot: 'bg-emerald-500' },
  navy:   { chip: 'bg-[#0D2B45]/6 text-[#0D2B45] ring-1 ring-[#0D2B45]/12',       dot: 'bg-[#0D2B45]' },
  yellow: { chip: 'bg-amber-50 text-amber-800 ring-1 ring-amber-500/20',          dot: 'bg-amber-500' },
  red:    { chip: 'bg-red-50 text-red-700 ring-1 ring-red-500/15',                dot: 'bg-red-500' },
  gray:   { chip: 'bg-[#65727A]/8 text-[#65727A] ring-1 ring-[#65727A]/12',       dot: 'bg-[#65727A]' },
  blue:   { chip: 'bg-sky-50 text-sky-700 ring-1 ring-sky-500/15',                dot: 'bg-sky-500' },
  orange: { chip: 'bg-orange-50 text-orange-700 ring-1 ring-orange-500/15',       dot: 'bg-orange-500' },
};

export function Badge({ children, variant = 'gray', size = 'md', dot = false, className = '' }: BadgeProps) {
  const v = VARIANTS[variant];
  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };
  return (
    <span className={`inline-flex items-center font-600 rounded-lg tracking-tight ${v.chip} ${sizes[size]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />}
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    pending_payment: { label: 'Awaiting Payment', variant: 'yellow' },
    pending_financing: { label: 'Pending Approval', variant: 'orange' },
    approved: { label: 'Approved', variant: 'blue' },
    processing: { label: 'Processing', variant: 'navy' },
    ready: { label: 'Ready', variant: 'green' },
    out_for_delivery: { label: 'Out for Delivery', variant: 'blue' },
    delivered: { label: 'Delivered', variant: 'green' },
    completed: { label: 'Completed', variant: 'green' },
    cancelled: { label: 'Cancelled', variant: 'red' },
  };
  const config = map[status] || { label: status, variant: 'gray' as const };
  return <Badge variant={config.variant} dot>{config.label}</Badge>;
}

export function FinancingStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    pending: { label: 'Pending', variant: 'yellow' },
    approved: { label: 'Approved', variant: 'blue' },
    active: { label: 'Active', variant: 'green' },
    completed: { label: 'Completed', variant: 'navy' },
    rejected: { label: 'Rejected', variant: 'red' },
    overdue: { label: 'Overdue', variant: 'red' },
  };
  const config = map[status] || { label: status, variant: 'gray' as const };
  return <Badge variant={config.variant} dot>{config.label}</Badge>;
}

export function InstallmentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    upcoming: { label: 'Upcoming', variant: 'gray' },
    due: { label: 'Due', variant: 'yellow' },
    paid: { label: 'Paid', variant: 'green' },
    overdue: { label: 'Overdue', variant: 'red' },
  };
  const config = map[status] || { label: status, variant: 'gray' as const };
  return <Badge variant={config.variant} dot>{config.label}</Badge>;
}

export function StockBadge({ stock, reorderLevel }: { stock: number; reorderLevel: number }) {
  if (stock === 0) return <Badge variant="red" dot>Out of Stock</Badge>;
  if (stock <= reorderLevel) return <Badge variant="yellow" dot>Low Stock</Badge>;
  if (stock > reorderLevel * 3) return <Badge variant="blue" dot>Fast Moving</Badge>;
  return <Badge variant="green" dot>Good</Badge>;
}
