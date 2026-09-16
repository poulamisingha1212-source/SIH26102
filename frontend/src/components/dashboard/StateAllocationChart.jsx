import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Card } from '@/components/ui/card';
import { CHART_ANIMATION, LIGHT_TOOLTIP, TICK_FONT, AXIS_LABEL_FONT } from '@/lib/chart';

/**
 * State funds overview — one clean chart instead of two.
 * Bullet-style horizontal bars: the light track is the sanctioned amount,
 * the solid fill is what was actually disbursed, so utilization reads at a
 * glance. Tooltip carries the exact numbers and the utilization %.
 */
export default function StateAllocationChart({ states = [], title = 'State Funds Overview' }) {
  const top = useMemo(
    () => [...states].sort((a, b) => (b.total_sanctioned || 0) - (a.total_sanctioned || 0)).slice(0, 10),
    [states]
  );

  const data = useMemo(() => ({
    labels: top.map((s) => s.state),
    datasets: [
      {
        label: 'Disbursed',
        data: top.map((s) => Math.round((s.total_disbursed || 0) / 1e7)),
        backgroundColor: '#4f46e5',
        borderRadius: 6,
        barPercentage: 0.62,
        grouped: false,
        order: 1,
      },
      {
        label: 'Sanctioned',
        data: top.map((s) => Math.round((s.total_sanctioned || 0) / 1e7)),
        backgroundColor: '#e0e7ff',
        borderRadius: 6,
        barPercentage: 0.95,
        grouped: false,
        order: 2,
      },
    ],
  }), [top]);

  const options = useMemo(() => ({
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation: CHART_ANIMATION,
    interaction: { mode: 'nearest', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: { font: AXIS_LABEL_FONT, boxWidth: 10, boxHeight: 10, borderRadius: 3, useBorderRadius: true },
        sort: (a, b) => (a.text === 'Sanctioned' ? -1 : b.text === 'Sanctioned' ? 1 : 0),
      },
      tooltip: {
        ...LIGHT_TOOLTIP,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ₹${Number(ctx.raw).toLocaleString('en-IN')} Cr`,
          afterBody: (items) => {
            const s = top[items[0].dataIndex];
            if (!s) return '';
            const pct = ((s.total_disbursed || 0) / (s.total_sanctioned || 1)) * 100;
            return `\nUtilization: ${pct.toFixed(1)}% of sanctioned`;
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: '₹ Crore', font: AXIS_LABEL_FONT },
        ticks: { font: TICK_FONT, maxTicksLimit: 8 },
        grid: { color: 'rgba(148,163,184,0.12)' },
        beginAtZero: true,
      },
      y: {
        ticks: { font: TICK_FONT, autoSkip: false },
        grid: { display: false },
        border: { display: false },
      },
    },
  }), [top]);

  return (
    <Card className="glass-panel p-5 rounded-2xl">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
        <span className="text-[10px] text-muted-foreground">Top 10 by sanctioned funds</span>
      </div>
      <div className="h-[340px] mt-2">
        <Bar data={data} options={options} />
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        Light track = sanctioned · solid fill = disbursed. The wider the solid fill inside its
        track, the higher the state's fund utilization. Hover for exact figures.
      </p>
    </Card>
  );
}
