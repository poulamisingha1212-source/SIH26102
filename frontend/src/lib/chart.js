import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, LogarithmicScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js'

// Register only the pieces this dashboard uses (tree-shaken Chart.js build).
// Imported once by any component that renders a chart.
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LogarithmicScale, PointElement, LineElement, Tooltip, Legend, Filler)

// Shared eased animation used across dashboard charts (800ms cubic-out,
// mirroring the reference dashboard's reveal feel).
export const CHART_ANIMATION = {
  duration: 800,
  easing: 'easeOutQuart',
  delay: (ctx) => (ctx.dataIndex || 0) * 40,
}

// Shared light-theme tooltip defaults (per ui-ux-pro-max accessible-chart guidance:
// never rely on color alone — tooltips + legends carry the exact values).
export const LIGHT_TOOLTIP = {
  backgroundColor: '#ffffff',
  titleColor: '#1e293b',
  bodyColor: '#475569',
  footerColor: '#b91c1c',
  borderColor: '#e2e8f0',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 10,
  titleFont: { family: 'Outfit', weight: '600' },
  bodyFont: { family: 'Work Sans' },
}

export const TICK_FONT = { family: 'Fira Code', size: 10 }
export const AXIS_LABEL_FONT = { family: 'Work Sans', size: 11 }
