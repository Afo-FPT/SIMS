import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJSCore,
  Legend as ChartLegend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
} from 'chart.js';

let initialized = false;

export function ensureChartSetup(): void {
  if (initialized) return;

  ChartJSCore.register(
    ArcElement,
    BarElement,
    CategoryScale,
    ChartLegend,
    LineElement,
    LinearScale,
    PointElement,
    ChartTooltip,
  );

  ChartJSCore.defaults.animation = {
    duration: 1200,
    easing: 'easeOutCubic',
  };
  ChartJSCore.defaults.animations = {
    x: { duration: 900, from: 0 },
    y: { duration: 900, from: 0 },
    radius: { duration: 900, from: 0 },
  } as any;
  ChartJSCore.defaults.transitions.show = {
    animations: {
      x: { from: 0 },
      y: { from: 0 },
    },
  } as any;

  initialized = true;
}
