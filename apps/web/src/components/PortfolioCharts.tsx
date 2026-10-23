import { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  DoughnutController,
  BarController,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import {
  PieChart,
  BarChart3,
  Layers,
  AlertTriangle,
  Info,
  Calendar,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { money, type JsonRecord } from "../lib/api";

// Explicitly register required Chart.js controllers, elements, scales, and plugins
ChartJS.register(
  DoughnutController,
  BarController,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
);

// Institutional color palettes
const THEME_COLORS = {
  dark: {
    slices: ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"],
    border: "#101622",
    tooltipBg: "#0c1322",
    tooltipText: "#f8fafc",
    tooltipBorder: "rgba(255, 255, 255, 0.12)",
    gridColor: "rgba(255, 255, 255, 0.06)",
    axisText: "#94a3b8",
    unvaluedColor: "rgba(245, 158, 11, 0.25)",
    unvaluedBorder: "#f59e0b",
  },
  light: {
    slices: ["#059669", "#2563eb", "#7c3aed", "#d97706", "#db2777", "#0891b2"],
    border: "#ffffff",
    tooltipBg: "#ffffff",
    tooltipText: "#0f172a",
    tooltipBorder: "rgba(15, 23, 42, 0.12)",
    gridColor: "rgba(15, 23, 42, 0.06)",
    axisText: "#64748b",
    unvaluedColor: "rgba(217, 119, 6, 0.18)",
    unvaluedBorder: "#d97706",
  },
};

function useCurrentTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof document !== "undefined") {
      return (document.documentElement.getAttribute("data-theme") as "dark" | "light") || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const current = (document.documentElement.getAttribute("data-theme") as "dark" | "light") || "dark";
      setTheme(current);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}

interface PortfolioChartsProps {
  overview: JsonRecord;
  performance?: JsonRecord | null;
}

/**
 * Interactive Donut Chart for Portfolio Allocation
 * Handles valued positions with percentages and displays explicit unvalued callouts.
 */
export function PortfolioAllocationChart({ overview }: { overview: JsonRecord }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);
  const theme = useCurrentTheme();
  const colors = THEME_COLORS[theme];

  const positions: JsonRecord[] = overview?.snapshot?.positions || [];
  const totalValuedMinor: number = overview?.invested_holdings_value_minor || 0;

  // Split into valued vs unvalued positions
  const valuedPositions = positions.filter((p) => p.market_value_minor != null && Number(p.market_value_minor) > 0);
  const unvaluedPositions = positions.filter((p) => p.market_value_minor == null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !valuedPositions.length) return;

    // Safely destroy any active chart attached to this canvas before creating a new one
    const existingChart = ChartJS.getChart(canvas);
    if (existingChart) {
      existingChart.destroy();
    }
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const labels = valuedPositions.map((p) => p.symbol);
    const dataValues = valuedPositions.map((p) => Number(p.market_value_minor) / 100);
    const bgColors = valuedPositions.map((_, i) => colors.slices[i % colors.slices.length]);

    const chartData: ChartData<"doughnut"> = {
      labels,
      datasets: [
        {
          data: dataValues,
          backgroundColor: bgColors,
          borderColor: colors.border,
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };

    const options: ChartOptions<"doughnut"> = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      animation: {
        duration: 500,
        easing: "easeOutQuart",
      },
      plugins: {
        legend: {
          display: false, // We render a richer custom institutional legend below
        },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipText,
          bodyColor: colors.tooltipText,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            label: (context) => {
              const pos = valuedPositions[context.dataIndex];
              const rupees = context.parsed;
              const formattedRupees = new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
              }).format(rupees);
              const pct = totalValuedMinor > 0 ? ((Number(pos.market_value_minor) / totalValuedMinor) * 100).toFixed(1) : "—";
              return [
                ` Market Value: ${formattedRupees}`,
                ` Share of Valued Assets: ${pct}%`,
                ` Shares: ${pos.quantity} (${pos.exchange || "NSE"})`,
              ];
            },
            title: (items) => {
              const pos = valuedPositions[items[0].dataIndex];
              return `${pos.symbol} · ${pos.company_name?.split("(")[0].trim() || ""}`;
            },
          },
        },
      },
    };

    const ctx = canvas.getContext("2d");
    if (ctx) {
      try {
        chartInstanceRef.current = new ChartJS(ctx, {
          type: "doughnut",
          data: chartData,
          options,
        });
      } catch (err) {
        console.error("Failed to construct Doughnut chart:", err);
      }
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      if (canvas) {
        const lingering = ChartJS.getChart(canvas);
        if (lingering) {
          lingering.destroy();
        }
      }
    };
  }, [overview, theme]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">
            <PieChart size={16} className="text-accent" />
            Asset Allocation
          </h3>
          <p className="chart-subtitle">
            Breakdown across valued holdings · percentages relative to ₹1,53,500.00
          </p>
        </div>
        <span className="data-badge badge-green">
          {valuedPositions.length} of {positions.length} Valued
        </span>
      </div>

      <div className="chart-donut-container">
        <div className="chart-canvas-wrapper" style={{ height: 220, position: "relative" }}>
          <canvas ref={canvasRef} aria-label="Portfolio asset allocation donut chart" role="img" />
          <div className="donut-center-stat">
            <span className="donut-stat-label">Valued Total</span>
            <strong className="donut-stat-value">{money(totalValuedMinor)}</strong>
            <span className="donut-stat-sub">INR Basis</span>
          </div>
        </div>

        <div className="chart-legend-grid">
          {valuedPositions.map((pos, idx) => {
            const pct =
              totalValuedMinor > 0
                ? ((Number(pos.market_value_minor) / totalValuedMinor) * 100).toFixed(1)
                : "—";
            const color = colors.slices[idx % colors.slices.length];
            return (
              <div key={pos.symbol} className="legend-row">
                <div className="legend-info">
                  <span className="legend-dot" style={{ backgroundColor: color }} />
                  <div>
                    <strong className="legend-symbol">{pos.symbol}</strong>
                    <span className="legend-name">{pos.company_name?.split(" ")[0]}</span>
                  </div>
                </div>
                <div className="legend-figures">
                  <span className="legend-val">{money(pos.market_value_minor)}</span>
                  <span className="legend-pct">{pct}%</span>
                </div>
              </div>
            );
          })}

          {unvaluedPositions.map((pos) => (
            <div key={pos.symbol} className="legend-row unvalued-row" title="Valuation is unavailable in sample fixtures">
              <div className="legend-info">
                <span className="legend-dot dot-amber" />
                <div>
                  <strong className="legend-symbol">{pos.symbol}</strong>
                  <span className="legend-name">{pos.quantity} shares</span>
                </div>
              </div>
              <div className="legend-figures">
                <span className="data-badge badge-amber">Valuation Missing</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {unvaluedPositions.length > 0 && (
        <div className="chart-footnote">
          <Info size={13} />
          <span>
            <strong>Note:</strong> {unvaluedPositions.map((p) => p.symbol).join(", ")} ({unvaluedPositions.reduce((acc, p) => acc + Number(p.quantity || 0), 0)} shares) has no available valuation fixture and is excluded from percentage calculations.
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Interactive Holdings Comparison Bar Chart
 * Compares market values in INR with clear handling for unvalued instruments.
 */
export function HoldingsComparisonChart({ overview }: { overview: JsonRecord }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);
  const theme = useCurrentTheme();
  const colors = THEME_COLORS[theme];

  const positions: JsonRecord[] = overview?.snapshot?.positions || [];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !positions.length) return;

    // Safely destroy any active chart attached to this canvas before creating a new one
    const existingChart = ChartJS.getChart(canvas);
    if (existingChart) {
      existingChart.destroy();
    }
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    // Sort positions: valued first descending, unvalued at the end
    const sorted = [...positions].sort((a, b) => {
      const valA = a.market_value_minor != null ? Number(a.market_value_minor) : -1;
      const valB = b.market_value_minor != null ? Number(b.market_value_minor) : -1;
      return valB - valA;
    });

    const labels = sorted.map((p) => p.symbol);
    const dataValues = sorted.map((p) => (p.market_value_minor != null ? Number(p.market_value_minor) / 100 : 0));
    const bgColors = sorted.map((p, i) =>
      p.market_value_minor != null ? colors.slices[i % colors.slices.length] : colors.unvaluedColor
    );
    const borderColors = sorted.map((p) => (p.market_value_minor != null ? "transparent" : colors.unvaluedBorder));

    const chartData: ChartData<"bar"> = {
      labels,
      datasets: [
        {
          label: "Market Value (INR)",
          data: dataValues,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: sorted.map((p) => (p.market_value_minor != null ? 0 : 1.5)),
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };

    const options: ChartOptions<"bar"> = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y", // Horizontal bars for great readability on all screen widths
      animation: {
        duration: 500,
        easing: "easeOutQuart",
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipText,
          bodyColor: colors.tooltipText,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            title: (items) => {
              const pos = sorted[items[0].dataIndex];
              return `${pos.symbol} · ${pos.company_name?.split("(")[0].trim() || ""}`;
            },
            label: (context) => {
              const pos = sorted[context.dataIndex];
              if (pos.market_value_minor == null) {
                return [
                  " Status: Missing Valuation",
                  ` Holding: ${pos.quantity} shares`,
                  " Price: Unavailable",
                ];
              }
              const rupees = Number(context.parsed.x ?? 0);
              const formattedRupees = new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
              }).format(rupees);
              return [
                ` Market Value: ${formattedRupees}`,
                ` Position: ${pos.quantity} shares @ ₹${pos.valuation_price}`,
                ` Account: ${pos.account_alias}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: colors.gridColor,
          },
          ticks: {
            color: colors.axisText,
            font: { family: "var(--font-mono, monospace)", size: 11 },
            callback: (val) => `₹${Number(val).toLocaleString("en-IN")}`,
          },
        },
        y: {
          grid: { display: false },
          ticks: {
            color: colors.axisText,
            font: { family: "var(--font-mono, monospace)", size: 12, weight: 600 },
          },
        },
      },
    };

    const ctx = canvas.getContext("2d");
    if (ctx) {
      try {
        chartInstanceRef.current = new ChartJS(ctx, {
          type: "bar",
          data: chartData,
          options,
        });
      } catch (err) {
        console.error("Failed to construct Bar chart:", err);
      }
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      if (canvas) {
        const lingering = ChartJS.getChart(canvas);
        if (lingering) {
          lingering.destroy();
        }
      }
    };
  }, [overview, theme]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">
            <BarChart3 size={16} className="text-accent" />
            Holdings Value Comparison
          </h3>
          <p className="chart-subtitle">
            Direct comparison of position values (INR) across sample accounts
          </p>
        </div>
        <span className="data-badge badge-gray">Tabular Figures</span>
      </div>

      <div className="chart-canvas-wrapper" style={{ height: 230 }}>
        <canvas ref={canvasRef} aria-label="Holdings comparison bar chart" role="img" />
      </div>

      <div className="chart-footnote">
        <HelpCircle size={13} />
        <span>
          MAPLEBIO is displayed with a hashed border to highlight that its valuation data is missing, not ₹0.
        </span>
      </div>
    </div>
  );
}

/**
 * Sector Exposure Breakdown visualization
 * Reflects backend sector metrics with coverage notices.
 */
export function SectorExposureVisualizer({ overview }: { overview: JsonRecord }) {
  const metrics: JsonRecord[] = overview?.metrics || [];
  const theme = useCurrentTheme();
  const colors = THEME_COLORS[theme];

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">
            <Layers size={16} className="text-accent" />
            Sector Exposure
          </h3>
          <p className="chart-subtitle">
            Capital allocated by industry sector across valued positions
          </p>
        </div>
        <span className="data-badge badge-amber">Partial Coverage</span>
      </div>

      <div className="sector-list">
        {metrics.map((metric, i) => {
          const cleanName = metric.label.replace(" invested holdings exposure", "");
          const amount = metric.amount_minor;
          const color = colors.slices[i % colors.slices.length];

          // Compute proportion among valued holdings for visual width
          const totalValued = overview.invested_holdings_value_minor || 1;
          const barWidth = Math.min(100, Math.round(((Number(amount) || 0) / totalValued) * 100));

          return (
            <div key={metric.label} className="sector-row">
              <div className="sector-meta">
                <div className="sector-name-group">
                  <span className="sector-indicator" style={{ backgroundColor: color }} />
                  <strong>{cleanName}</strong>
                </div>
                <div className="sector-numbers">
                  <span className="sector-amount">{money(amount)}</span>
                  <span className="sector-share">~{barWidth}% of valued</span>
                </div>
              </div>
              <div className="sector-bar-track">
                <div
                  className="sector-bar-fill"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Explicit unvalued sector notice */}
        <div className="sector-row unvalued-sector">
          <div className="sector-meta">
            <div className="sector-name-group">
              <span className="sector-indicator dot-amber" />
              <strong>Healthcare (Maple Bio)</strong>
            </div>
            <div className="sector-numbers">
              <span className="data-badge badge-amber">Coverage Missing</span>
            </div>
          </div>
          <div className="sector-bar-track">
            <div className="sector-bar-fill striped-amber" style={{ width: "100%" }} />
          </div>
        </div>
      </div>

      <div className="chart-footnote">
        <AlertTriangle size={13} className="text-amber" />
        <span>
          Backend rule: Formal sector percentages are withheld because MapleBio lacks valuation data.
        </span>
      </div>
    </div>
  );
}

/**
 * Portfolio Performance Diagnostic
 * Renders an institutional empty state diagnostic explaining why time-series returns cannot be plotted.
 * Strictly adheres to rule: Never generate fake historical data.
 */
export function PerformanceDiagnostic({ performance }: { performance?: JsonRecord | null }) {
  const missingInputs = performance?.missing_inputs || [
    "complete transaction history",
    "fees and taxes",
    "dividends",
    "corporate actions",
    "complete valuation and FX history",
  ];

  return (
    <div className="chart-card performance-diagnostic-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">
            <Calendar size={16} className="text-accent" />
            Historical Return & Performance
          </h3>
          <p className="chart-subtitle">
            Time-weighted return (TWR) and performance series requirements
          </p>
        </div>
        <span className="data-badge badge-amber">Data Incomplete</span>
      </div>

      <div className="performance-diagnostic-body">
        {/* Visual silhouette of historical chart frame without fabricated data */}
        <div className="chart-placeholder-silhouette">
          <svg className="silhouette-svg" viewBox="0 0 400 120" preserveAspectRatio="none">
            <path
              d="M 0 80 Q 80 90, 160 50 T 320 60 T 400 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.25"
            />
          </svg>
          <div className="silhouette-overlay">
            <div className="empty-badge">
              <XCircle size={15} />
              <span>Time-Series Calculation Paused</span>
            </div>
            <p>
              Genuine performance curves require audited historical inputs. Market Partner never fabricates simulated historical returns.
            </p>
          </div>
        </div>

        <div className="diagnostic-checklist">
          <div className="checklist-heading">
            <span>Input Coverage Audit</span>
            <span className="checklist-ratio">0 of 5 satisfied</span>
          </div>

          <div className="checklist-items">
            {missingInputs.map((input: string) => (
              <div key={input} className="checklist-item">
                <XCircle size={14} className="text-amber" />
                <span>{input}</span>
                <span className="item-status">Missing fixture</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="chart-footnote">
        <Info size={13} />
        <span>
          Once verified brokerage ledgers are connected via Upstox API, actual Daily Net Asset Value (NAV) curves will render here.
        </span>
      </div>
    </div>
  );
}

/**
 * Combined Portfolio Visualizations Grid
 */
export function PortfolioVisualizations({
  overview,
  performance,
}: PortfolioChartsProps) {
  if (!overview?.snapshot?.positions) {
    return null;
  }

  return (
    <div className="portfolio-visuals-grid">
      <PortfolioAllocationChart overview={overview} />
      <HoldingsComparisonChart overview={overview} />
      <SectorExposureVisualizer overview={overview} />
      <PerformanceDiagnostic performance={performance} />
    </div>
  );
}
