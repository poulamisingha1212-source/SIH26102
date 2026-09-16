import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Card } from '@/components/ui/card';
import { CHART_ANIMATION, LIGHT_TOOLTIP, AXIS_LABEL_FONT } from '@/lib/chart';

/**
 * Risk-tier doughnut — JanNidhi's own layer on top of the reference dashboard:
 * how the portfolio spreads across High / Medium / Low risk after scoring.
 */
export default function RiskTierDonut({ tier = {}, title = 'Risk Tier Distribution' }) {
  const data = useMemo(() => ({
    labels: ['High Risk — Review', 'Medium Risk — Monitor', 'Low Risk'],
    datasets: [
      {
        data: [
          tier['High Risk - Review'] || 0,
          tier['Medium Risk - Monitor'] || 0,
          tier['Low Risk'] || 0,
        ],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  }), [tier]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '58%',
    animation: CHART_ANIMATION,
    plugins: {
      legend: { position: 'bottom', labels: { font: AXIS_LABEL_FONT, boxWidth: 12, padding: 12 } },
      tooltip: LIGHT_TOOLTIP,
    },
  }), []);

  const total = (tier['High Risk - Review'] || 0) + (tier['Medium Risk - Monitor'] || 0) + (tier['Low Risk'] || 0);

  return (
    <Card className="glass-panel p-5 rounded-2xl h-full">
      <h3 className="text-sm font-bold uppercase tracking-wider mb-3">{title}</h3>
      <div className="h-72">
        <Doughnut data={data} options={options} />
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 text-center">
        {total.toLocaleString('en-IN')} works risk-scored by the AI Sentinel engine
      </p>
    </Card>
  );
}
