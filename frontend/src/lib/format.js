// Shared formatting helpers — single source of truth across all components.

export function formatINR(val) {
  if (!val || isNaN(val)) return '₹0';
  const num = Number(val);
  const NBSP = ' ';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}${NBSP}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}${NBSP}L`;
  return `₹${num.toLocaleString('en-IN')}`;
}

export function formatNumber(val) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Number(val).toLocaleString('en-IN');
}

export function formatPct(ratio, digits = 0) {
  if (!ratio || isNaN(ratio)) return '0%';
  return `${(Number(ratio) * 100).toFixed(digits)}%`;
}

export function tierBadgeClass(tier) {
  if (tier?.includes('High')) return 'high-risk-badge';
  if (tier?.includes('Medium')) return 'medium-risk-badge';
  return 'low-risk-badge';
}

// Soft light-theme score chips (WCAG-safe on white cards).
export function scoreColorClass(score) {
  if (score >= 90) return 'text-red-700 bg-red-50 border-red-200';
  if (score >= 70) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-emerald-700 bg-emerald-50 border-emerald-200';
}

export function riskTextClass(score) {
  if (score >= 70) return 'text-red-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-emerald-600';
}

export const RISK_TIER_COLORS = {
  'High Risk - Review': '#f43f5e',
  'Medium Risk - Monitor': '#f59e0b',
  'Low Risk': '#10b981',
};

// Rotating soft palette for status / category segments (chart-1..5 + extras).
export const SEGMENT_PALETTE = [
  '#6366f1', '#38bdf8', '#10b981', '#f59e0b', '#f43f5e',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
];

export function paletteColor(index) {
  return SEGMENT_PALETTE[index % SEGMENT_PALETTE.length];
}
