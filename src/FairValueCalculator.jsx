import { useState, useMemo, useCallback, useRef } from "react";

// ─── Projection math ────────────────────────────────────────────────────────
// Projects EPS forward at a constant growth rate, then applies the target
// PE multiple to get a future "fair" price. Works backwards from there to
// figure out what you'd need to pay today to hit a desired annual return.

function projectFairValue({ eps, growthRate, peMultiple, desiredReturn, years, currentPrice }) {
  const growth = growthRate / 100;
  const discount = desiredReturn / 100;

  // Year-by-year projected EPS and resulting fair price
  const projections = Array.from({ length: years }, (_, i) => {
    const year = i + 1;
    const projectedEps = eps * Math.pow(1 + growth, year);
    const projectedPrice = projectedEps * peMultiple;
    return { year, projectedEps, projectedPrice };
  });

  const terminalPrice = projections[projections.length - 1]?.projectedPrice ?? 0;

  // Annualised return if you bought at today's price
  const annualisedReturn = currentPrice > 0
    ? (Math.pow(terminalPrice / currentPrice, 1 / years) - 1) * 100
    : 0;

  // The price you'd need to buy at today to achieve exactly the desired return
  const entryPriceForDesiredReturn = terminalPrice / Math.pow(1 + discount, years);

  // Margin of safety: how far below fair entry the current price sits
  const marginOfSafety = entryPriceForDesiredReturn > 0
    ? ((entryPriceForDesiredReturn - currentPrice) / entryPriceForDesiredReturn) * 100
    : 0;

  return { projections, terminalPrice, annualisedReturn, entryPriceForDesiredReturn, marginOfSafety };
}

// ─── Tiny sparkline-style chart (pure SVG) ──────────────────────────────────

function PriceChart({ projections, currentPrice }) {
  const W = 520;
  const H = 220;
  const pad = { top: 30, right: 50, bottom: 36, left: 64 };

  const allPoints = [{ year: 0, projectedPrice: currentPrice }, ...projections];
  const prices = allPoints.map((p) => p.projectedPrice);
  const minP = Math.min(...prices) * 0.9;
  const maxP = Math.max(...prices) * 1.05;

  const x = (yr) => pad.left + (yr / (allPoints.length - 1)) * (W - pad.left - pad.right);
  const y = (p) => pad.top + (1 - (p - minP) / (maxP - minP)) * (H - pad.top - pad.bottom);

  const pathD = allPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${x(pt.year)} ${y(pt.projectedPrice)}`).join(" ");

  // Gradient fill area
  const areaD = `${pathD} L ${x(allPoints.length - 1)} ${H - pad.bottom} L ${x(0)} ${H - pad.bottom} Z`;

  const formatPrice = (p) => p >= 1000 ? `$${(p / 1000).toFixed(1)}k` : `$${p.toFixed(0)}`;

  // Y-axis ticks (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => minP + (i / 4) * (maxP - minP));

  return (
    <svg id="price-chart-svg" viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="#1e293b" strokeWidth="0.5" />
          <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" fill="#64748b" fontSize="10" fontFamily="'DM Mono', monospace">
            {formatPrice(t)}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaD} fill="url(#areaGrad)" />

      {/* Line */}
      <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {allPoints.map((pt, i) => (
        <g key={i}>
          <circle cx={x(pt.year)} cy={y(pt.projectedPrice)} r="5" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
          <text x={x(pt.year)} y={H - pad.bottom + 16} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="'DM Mono', monospace">
            Yr {pt.year}
          </text>
          {/* Price label on last point */}
          {i === allPoints.length - 1 && (
            <text x={x(pt.year) + 6} y={y(pt.projectedPrice) - 10} textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="600" fontFamily="'DM Mono', monospace">
              {formatPrice(pt.projectedPrice)}
            </text>
          )}
        </g>
      ))}

      {/* "Now" label for year 0 */}
      <text x={x(0)} y={H - pad.bottom + 16} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="'DM Mono', monospace">
        Now
      </text>
    </svg>
  );
}

// ─── Reusable numeric input with label ──────────────────────────────────────

function NumericInput({ label, helpText, value, onChange, prefix, suffix, step = 1, min, max }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 6, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.02em" }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 0, background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b", overflow: "hidden", transition: "border-color 0.2s" }}>
        {prefix && (
          <span style={{ padding: "10px 0 10px 14px", color: "#475569", fontSize: 15, fontFamily: "'DM Mono', monospace", userSelect: "none" }}>{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#f1f5f9",
            fontSize: 18,
            fontWeight: 500,
            padding: "10px 12px",
            fontFamily: "'DM Mono', monospace",
            width: "100%",
            MozAppearance: "textfield",
          }}
        />
        {suffix && (
          <span style={{ padding: "10px 14px 10px 0", color: "#475569", fontSize: 15, fontFamily: "'DM Mono', monospace", userSelect: "none" }}>{suffix}</span>
        )}
      </div>
      {helpText && (
        <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "#475569", lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif" }}>{helpText}</p>
      )}
    </div>
  );
}

// ─── Verdict badge ──────────────────────────────────────────────────────────

function Verdict({ annualisedReturn, desiredReturn, marginOfSafety }) {
  let verdict, color, bg;

  if (annualisedReturn >= desiredReturn && marginOfSafety > 10) {
    verdict = "Strong Buy";
    color = "#10b981";
    bg = "rgba(16,185,129,0.1)";
  } else if (annualisedReturn >= desiredReturn) {
    verdict = "Fair Value";
    color = "#f59e0b";
    bg = "rgba(245,158,11,0.1)";
  } else if (annualisedReturn >= desiredReturn * 0.7) {
    verdict = "Slightly Overvalued";
    color = "#f97316";
    bg = "rgba(249,115,22,0.1)";
  } else {
    verdict = "Overvalued";
    color = "#ef4444";
    bg = "rgba(239,68,68,0.1)";
  }

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "6px 16px", borderRadius: 20,
      background: bg, border: `1px solid ${color}33`,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
      <span style={{ color, fontWeight: 700, fontSize: 14, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.03em" }}>{verdict}</span>
    </div>
  );
}

// ─── Metric card ────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, accent }) {
  return (
    <div style={{
      padding: "16px 20px",
      background: "#0f172a",
      borderRadius: 10,
      border: "1px solid #1e293b",
      flex: "1 1 140px",
    }}>
      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#475569", marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>{sub}</div>}
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────────────────

export default function FairValueCalculator() {
  const [eps, setEps] = useState(18.67);
  const [currentPrice, setCurrentPrice] = useState(1008.0);
  const [growthRate, setGrowthRate] = useState(13);
  const [peMultiple, setPeMultiple] = useState(45);
  const [desiredReturn, setDesiredReturn] = useState(15);
  const years = 5;

  const results = useMemo(
    () => projectFairValue({ eps, growthRate, peMultiple, desiredReturn, years, currentPrice }),
    [eps, growthRate, peMultiple, desiredReturn, currentPrice]
  );

  const formatDollar = (v) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

  // Serialise the chart SVG to a file and trigger a browser download
  const downloadChartAsSvg = useCallback(() => {
    const svgEl = document.getElementById("price-chart-svg");
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);

    // Wrap in a standalone SVG with an xmlns declaration so it opens correctly
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "fair-value-chart.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#020617",
      color: "#f1f5f9",
      fontFamily: "'DM Sans', sans-serif",
      padding: "24px 16px",
    }}>
      {/* Hide number input spinners */}
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        input[type=number]:focus { outline: none; }
        div:has(> input:focus) { border-color: #334155 !important; }
      `}</style>

      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 3, height: 28, background: "#10b981", borderRadius: 2 }} />
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>Fair Value Calculator</h1>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#475569", paddingLeft: 13 }}>
            Project 5-year earnings growth to estimate intrinsic value and find your ideal entry price.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: 28, alignItems: "start" }}>
          {/* Left: Inputs */}
          <div style={{ background: "#0b1120", borderRadius: 14, border: "1px solid #1e293b", padding: "24px 22px" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", fontWeight: 700, marginBottom: 20 }}>
              Assumptions
            </div>

            <NumericInput
              label="Current Price"
              prefix="$"
              value={currentPrice}
              onChange={setCurrentPrice}
              step={1}
              min={0}
              helpText="The stock's current market price."
            />
            <NumericInput
              label="EPS (TTM)"
              prefix="$"
              value={eps}
              onChange={setEps}
              step={0.01}
              min={0}
              helpText="Earnings per share over the trailing twelve months."
            />
            <NumericInput
              label="EPS Growth Rate"
              suffix="%"
              value={growthRate}
              onChange={setGrowthRate}
              step={0.5}
              min={-50}
              max={100}
              helpText="Your assumed annual EPS growth rate over 5 years."
            />
            <NumericInput
              label="Fair PE Multiple"
              value={peMultiple}
              onChange={setPeMultiple}
              step={1}
              min={1}
              max={200}
              helpText="The PE ratio you consider fair for this stock in 5 years."
            />
            <NumericInput
              label="Desired Annual Return"
              suffix="%"
              value={desiredReturn}
              onChange={setDesiredReturn}
              step={0.5}
              min={1}
              max={100}
              helpText="The minimum annualised return you'd want from this investment."
            />

            <div style={{ marginTop: 4, padding: "10px 14px", background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2, fontWeight: 600 }}>Current PE (TTM)</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
                {eps > 0 ? (currentPrice / eps).toFixed(1) : "N/A"}
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Verdict + key metrics row */}
            <div style={{ background: "#0b1120", borderRadius: 14, border: "1px solid #1e293b", padding: "22px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", fontWeight: 700 }}>
                  Calculation Results
                </div>
                <Verdict annualisedReturn={results.annualisedReturn} desiredReturn={desiredReturn} marginOfSafety={results.marginOfSafety} />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <MetricCard
                  label="Projected Price (Yr 5)"
                  value={formatDollar(results.terminalPrice)}
                  sub={`From ${formatDollar(currentPrice)} today`}
                />
                <MetricCard
                  label="Annualised Return"
                  value={formatPct(results.annualisedReturn)}
                  accent={results.annualisedReturn >= desiredReturn ? "#10b981" : "#ef4444"}
                  sub={`Target: ${desiredReturn}%`}
                />
                <MetricCard
                  label={`Entry for ${desiredReturn}% Return`}
                  value={formatDollar(results.entryPriceForDesiredReturn)}
                  accent="#38bdf8"
                  sub={`${results.marginOfSafety >= 0 ? "↓" : "↑"} ${Math.abs(results.marginOfSafety).toFixed(1)}% from current`}
                />
              </div>
            </div>

            {/* Chart */}
            <div style={{ background: "#0b1120", borderRadius: 14, border: "1px solid #1e293b", padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", fontWeight: 700 }}>
                  Projected Fair Price
                </div>
                <button
                  onClick={downloadChartAsSvg}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "transparent", border: "1px solid #1e293b",
                    borderRadius: 6, padding: "5px 12px", cursor: "pointer",
                    color: "#94a3b8", fontSize: 11, fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600, letterSpacing: "0.02em",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.color = "#10b981"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.color = "#94a3b8"; }}
                >
                  {/* Simple download icon */}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 1v7M3 6l3 3 3-3M1 10h10" />
                  </svg>
                  Download SVG
                </button>
              </div>
              <PriceChart projections={results.projections} currentPrice={currentPrice} />
            </div>

            {/* Year-by-year breakdown */}
            <div style={{ background: "#0b1120", borderRadius: 14, border: "1px solid #1e293b", padding: "20px 24px", overflowX: "auto" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", fontWeight: 700, marginBottom: 14 }}>
                Year-by-Year Breakdown
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1e293b" }}>
                    {["Year", "Projected EPS", "Fair Price", "Return if Bought Now"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#475569", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.projections.map((row) => {
                    const returnFromNow = currentPrice > 0
                      ? (Math.pow(row.projectedPrice / currentPrice, 1 / row.year) - 1) * 100
                      : 0;
                    return (
                      <tr key={row.year} style={{ borderBottom: "1px solid #111827" }}>
                        <td style={{ padding: "10px 12px", color: "#94a3b8" }}>Yr {row.year}</td>
                        <td style={{ padding: "10px 12px", color: "#cbd5e1" }}>${row.projectedEps.toFixed(2)}</td>
                        <td style={{ padding: "10px 12px", color: "#f1f5f9", fontWeight: 600 }}>{formatDollar(row.projectedPrice)}</td>
                        <td style={{ padding: "10px 12px", color: returnFromNow >= desiredReturn ? "#10b981" : "#f59e0b", fontWeight: 500 }}>
                          {formatPct(returnFromNow)}/yr
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
