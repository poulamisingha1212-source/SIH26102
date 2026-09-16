import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Card } from '@/components/ui/card';
import { CHART_ANIMATION } from '@/lib/chart';

/**
 * Half-gauge fund-utilization meter (mirrors the reference dashboard's
 * FundUtilizationGauge, rebuilt on Chart.js): colour-banded arc, animated
 * sweep, and the big percentage readout centred under the arc.
 */
export default function UtilizationGauge({ utilization = 0, title = 'Fund Utilization', subtitle }) {
  const pct = Math.max(0, Math.min(100, Number(utilization) || 0));
  const color = pct > 70 ? '#10b981' : pct > 40 ? '#f59e0b' : '#ef4444';

  const data = useMemo(() => ({
    datasets: [
      {
        data: [pct, 100 - pct],
        backgroundColor: [color, '#eef2f7'],
        borderWidth: 0,
        borderRadius: 12,
      },
    ],
  }), [pct, color]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '76%',
    rotation: -90,
    circumference: 180,
    animation: { ...CHART_ANIMATION, delay: 0, duration: 1100 },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  }), []);

  return (
    <Card className="glass-panel p-5 rounded-2xl overflow-hidden h-full flex flex-col">
      <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>

      {/* Arc + percentage readout centred in the semicircle */}
      <div className="relative flex-1 min-h-[190px] mt-2">
        <Doughnut data={data} options={options} />
        <div className="absolute inset-x-0 bottom-0 text-center pointer-events-none">
          <div className="text-4xl font-extrabold font-[Outfit] tracking-tight" style={{ color }}>
            {pct.toFixed(1)}%
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] font-semibold text-muted-foreground px-1">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {subtitle && (
        <p className="text-[11px] text-muted-foreground text-center mt-3">{subtitle}</p>
      )}
    </Card>
  );
}
