import { useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000/api";

// FMCSA standard row order (top → bottom), matching 49 CFR 395 log paper layout
const LOG_ROWS = [
  { key: "off_duty",            label: "1. Off Duty",          color: "#64748b", bg: "#f1f5f9" },
  { key: "sleeper",             label: "2. Sleeper Berth",      color: "#0ea5e9", bg: "#e0f2fe" },
  { key: "driving",             label: "3. Driving",            color: "#16a34a", bg: "#dcfce7" },
  { key: "on_duty_not_driving", label: "4. On Duty (Not Drv.)", color: "#dc2626", bg: "#fee2e2" },
];

function rowForStatus(status) {
  const i = LOG_ROWS.findIndex((r) => r.key === status);
  return i >= 0 ? i : 3;
}

function fmtDateTime(value) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtStatus(status) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

// Hour labels matching real FMCSA log: M 1 2 3 4 5 6 7 8 9 10 11 N 1 2 3 4 5 6 7 8 9 10 11 M
const HOUR_LABELS = [
  "M","1","2","3","4","5","6","7","8","9","10","11",
  "N","1","2","3","4","5","6","7","8","9","10","11","M",
];

function DailyLogSheet({ log, index }) {
  const SVG_W      = 1020;
  const LEFT       = 148;   // label column width
  const RIGHT_PAD  = 20;
  const CHART_W    = SVG_W - LEFT - RIGHT_PAD;
  const ROW_H      = 44;
  const ROWS       = LOG_ROWS.length;
  const GRID_TOP   = 52;
  const GRID_H     = ROW_H * ROWS;
  const GRID_BOT   = GRID_TOP + GRID_H;
  const PX_PER_H   = CHART_W / 24;
  const TOTAL_Y    = GRID_BOT + 28;
  const SVG_H      = TOTAL_Y + 40;

  const totals = log.totals;

  return (
    <div className="log-sheet">
      <div className="log-sheet-header">
        <span>Log Sheet #{index + 1}</span>
        <strong>{log.date}</strong>
        <span>Driving: <b>{totals.driving_hours}h</b></span>
        <span>On Duty (Not Drv.): <b>{totals.on_duty_not_driving_hours}h</b></span>
        <span>Sleeper: <b>{totals.sleeper_hours}h</b></span>
        <span>Off Duty: <b>{totals.off_duty_hours}h</b></span>
      </div>

      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        role="img"
        aria-label={`ELD log for ${log.date}`}
        style={{ display: "block", width: "100%", minWidth: 700 }}
      >
        {/* Background */}
        <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="#fafafa" />

        {/* Row background bands */}
        {LOG_ROWS.map((row, idx) => (
          <rect
            key={row.key + "-bg"}
            x={LEFT}
            y={GRID_TOP + idx * ROW_H}
            width={CHART_W}
            height={ROW_H}
            fill={row.bg}
            opacity="0.55"
          />
        ))}

        {/* Hour grid vertical lines */}
        {Array.from({ length: 25 }).map((_, i) => {
          const isMajor = i % 6 === 0 || i === 12;
          return (
            <line
              key={`vline-${i}`}
              x1={LEFT + i * PX_PER_H}
              y1={GRID_TOP}
              x2={LEFT + i * PX_PER_H}
              y2={GRID_BOT}
              stroke={isMajor ? "#64748b" : "#cbd5e1"}
              strokeWidth={isMajor ? 1.5 : 0.7}
            />
          );
        })}

        {/* Every-30-min minor tick lines */}
        {Array.from({ length: 48 }).map((_, i) => {
          const x = LEFT + (i * 0.5) * PX_PER_H;
          return (
            <line
              key={`tick-${i}`}
              x1={x} y1={GRID_BOT}
              x2={x} y2={GRID_BOT + 5}
              stroke="#94a3b8"
              strokeWidth={0.6}
            />
          );
        })}

        {/* Hour labels above grid (FMCSA style: M 1 2 … N … M) */}
        {HOUR_LABELS.map((lbl, i) => (
          <text
            key={`hlbl-${i}`}
            x={LEFT + i * PX_PER_H}
            y={GRID_TOP - 8}
            textAnchor="middle"
            fontSize="11"
            fill="#475467"
            fontFamily="monospace"
          >
            {lbl}
          </text>
        ))}

        {/* Row separators + row labels */}
        {LOG_ROWS.map((row, idx) => (
          <g key={row.key}>
            {/* Row top border */}
            <line
              x1={LEFT} y1={GRID_TOP + idx * ROW_H}
              x2={LEFT + CHART_W} y2={GRID_TOP + idx * ROW_H}
              stroke="#94a3b8" strokeWidth="1"
            />
            {/* Row label */}
            <text
              x={LEFT - 6}
              y={GRID_TOP + idx * ROW_H + ROW_H / 2 + 5}
              textAnchor="end"
              fontSize="12"
              fontWeight="600"
              fill={row.color}
              fontFamily="Inter, sans-serif"
            >
              {row.label}
            </text>
            {/* Horizontal center line inside each row (FMCSA paper dashes) */}
            <line
              x1={LEFT} y1={GRID_TOP + idx * ROW_H + ROW_H / 2}
              x2={LEFT + CHART_W} y2={GRID_TOP + idx * ROW_H + ROW_H / 2}
              stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="4 3"
            />
          </g>
        ))}

        {/* Bottom border */}
        <line
          x1={LEFT} y1={GRID_BOT}
          x2={LEFT + CHART_W} y2={GRID_BOT}
          stroke="#64748b" strokeWidth="1.5"
        />

        {/* Left border */}
        <line
          x1={LEFT} y1={GRID_TOP}
          x2={LEFT} y2={GRID_BOT}
          stroke="#64748b" strokeWidth="1.5"
        />

        {/* Right border */}
        <line
          x1={LEFT + CHART_W} y1={GRID_TOP}
          x2={LEFT + CHART_W} y2={GRID_BOT}
          stroke="#64748b" strokeWidth="1.5"
        />

        {/* Duty status bars */}
        {log.entries.map((entry, i) => {
          const rowIdx = rowForStatus(entry.status);
          const row    = LOG_ROWS[rowIdx];
          const barH   = ROW_H * 0.52;
          const barY   = GRID_TOP + rowIdx * ROW_H + (ROW_H - barH) / 2;
          const x      = LEFT + entry.start_hour * PX_PER_H;
          const w      = Math.max(2, (entry.end_hour - entry.start_hour) * PX_PER_H);
          return (
            <g key={`bar-${i}`}>
              <rect
                x={x} y={barY}
                width={w} height={barH}
                fill={row.color}
                rx="2"
                opacity="0.9"
              />
            </g>
          );
        })}

        {/* Totals row – driving is separate from on-duty not driving */}
        {[
          { label: "Driving",        value: totals.driving_hours,              color: "#16a34a" },
          { label: "On Duty (Stop)", value: totals.on_duty_not_driving_hours,  color: "#dc2626" },
          { label: "Sleeper",        value: totals.sleeper_hours,              color: "#0ea5e9" },
          { label: "Off Duty",       value: totals.off_duty_hours,             color: "#64748b" },
        ].map((t, i) => (
          <g key={t.label}>
            <rect
              x={LEFT + i * (CHART_W / 4)} y={TOTAL_Y - 4}
              width={CHART_W / 4} height={26}
              fill={t.color} opacity="0.1" rx="3"
            />
            <text
              x={LEFT + i * (CHART_W / 4) + 8}
              y={TOTAL_Y + 13}
              fontSize="13" fill={t.color} fontWeight="700"
              fontFamily="Inter, sans-serif"
            >
              {t.label}: {t.value}h
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function App() {
  const [form, setForm] = useState({
    current_location: "",
    pickup_location: "",
    dropoff_location: "",
    current_cycle_used_hours: 20,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/plan-trip/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          current_cycle_used_hours: Number(form.current_cycle_used_hours),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to plan trip");
      }
      setResult(data);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  const mapCenter = useMemo(() => {
    if (result?.route?.stops?.length) {
      return result.route.stops[0].coordinates;
    }
    return [39.8283, -98.5795];
  }, [result]);

  const [activeLeg, setActiveLeg] = useState("pickup");

  const instructionCount = useMemo(() => {
    if (!result?.route?.instructions) return 0;
    return result.route.instructions.to_pickup.length + result.route.instructions.to_dropoff.length;
  }, [result]);

  const activeSteps = useMemo(() => {
    if (!result?.route?.instructions) return [];
    return activeLeg === "pickup"
      ? result.route.instructions.to_pickup
      : result.route.instructions.to_dropoff;
  }, [result, activeLeg]);

  const legDistances = useMemo(() => {
    if (!result?.route?.stops) return { pickup: 0, dropoff: 0 };
    return {
      pickup:  result.route.distance_miles,
      dropoff: result.route.distance_miles,
    };
  }, [result]);

  return (
    <main className="page">
      <section className="hero">
        <div>
          <h1>Trip Route + ELD Log Planner</h1>
          <p className="hero-copy">
            Plan long-haul trips with FMCSA assumptions, visualize route and rest logic, and auto-generate
            daily ELD-style log sheets.
          </p>
        </div>
      </section>

      <section className="card">
        <h2>Trip Inputs</h2>
        <p className="muted">Property-carrying, 70h/8d cycle, no adverse conditions.</p>
        <form onSubmit={onSubmit} className="form-grid">
          <label>
            Current Location
            <input
              value={form.current_location}
              onChange={(e) => setForm((s) => ({ ...s, current_location: e.target.value }))}
              placeholder="Dallas, TX"
              required
            />
          </label>
          <label>
            Pickup Location
            <input
              value={form.pickup_location}
              onChange={(e) => setForm((s) => ({ ...s, pickup_location: e.target.value }))}
              placeholder="Kansas City, MO"
              required
            />
          </label>
          <label>
            Dropoff Location
            <input
              value={form.dropoff_location}
              onChange={(e) => setForm((s) => ({ ...s, dropoff_location: e.target.value }))}
              placeholder="Chicago, IL"
              required
            />
          </label>
          <label>
            Current Cycle Used (hours)
            <input
              type="number"
              min="0"
              max="70"
              step="0.5"
              value={form.current_cycle_used_hours}
              onChange={(e) => setForm((s) => ({ ...s, current_cycle_used_hours: e.target.value }))}
              required
            />
          </label>
          <button className="primary-btn" disabled={loading}>
            {loading ? "Planning route and logs..." : "Generate Route + Logs"}
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </section>

      {result ? (
        <>
          <section className="kpis">
            <article className="kpi-card">
              <span>Total Distance</span>
              <strong>{result.route.distance_miles} mi</strong>
            </article>
            <article className="kpi-card">
              <span>Estimated Drive Time</span>
              <strong>{result.route.duration_hours} h</strong>
            </article>
            <article className="kpi-card">
              <span>Projected Cycle Used</span>
              <strong>{result.trip_totals.projected_cycle_used} h</strong>
            </article>
            <article className="kpi-card">
              <span>Turn-by-turn Steps</span>
              <strong>{instructionCount}</strong>
            </article>
          </section>

          <section className="card">
            <h2>Route Overview</h2>
            <div className="map-wrap">
              <MapContainer center={mapCenter} zoom={5} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {result.route.polyline?.length ? <Polyline positions={result.route.polyline} color="#1d4ed8" /> : null}
                {result.route.stops.map((stop) => (
                  <Marker key={stop.type} position={stop.coordinates}>
                    <Popup>
                      <strong>{stop.type}</strong>
                      <br />
                      {stop.location}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </section>

          <section className="card">
            <div className="section-head">
              <h2>Drive Instructions</h2>
              <span className="step-count">{instructionCount} total steps</span>
            </div>

            <div className="leg-tabs">
              <button
                className={`leg-tab${activeLeg === "pickup" ? " active" : ""}`}
                onClick={() => setActiveLeg("pickup")}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="8" cy="8" r="2.5" fill="currentColor"/>
                </svg>
                Current → Pickup
                <em>{result.route.instructions.to_pickup.length} steps</em>
              </button>
              <button
                className={`leg-tab${activeLeg === "dropoff" ? " active" : ""}`}
                onClick={() => setActiveLeg("dropoff")}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2 L8 12 M4 9 L8 13 L12 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Pickup → Dropoff
                <em>{result.route.instructions.to_dropoff.length} steps</em>
              </button>
            </div>

            <ol className="steps-list">
              {activeSteps.map((step, idx) => (
                <li key={`step-${activeLeg}-${idx}`} className="step-item">
                  <span className="step-num">{idx + 1}</span>
                  <div className="step-body">
                    <span className="step-instruction">{step.instruction}</span>
                    {step.road && step.road !== "unnamed road" && (
                      <span className="step-road">on {step.road}</span>
                    )}
                  </div>
                  <span className="step-dist">{step.distance_miles > 0 ? `${step.distance_miles} mi` : ""}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="card">
            <div className="section-head">
              <h2>Duty Timeline & Rest Events</h2>
              <span className="step-count">{result.schedule.length} events</span>
            </div>
            <ul className="timeline">
              {result.schedule.map((segment, idx) => {
                const statusClass = "status-" + segment.status.replaceAll("_", "-");
                const hrs = segment.hours != null ? segment.hours : "";
                return (
                  <li key={`${segment.start}-${idx}`} className={statusClass}>
                    <span className="timeline-time">
                      {fmtDateTime(segment.start)} → {fmtDateTime(segment.end)}
                    </span>
                    <span className="timeline-status">{fmtStatus(segment.status)}</span>
                    <span className="timeline-notes">{segment.notes}</span>
                    {hrs ? <span className="timeline-dur">{hrs}h</span> : null}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card">
            <h2>Daily Log Sheets</h2>
            {result.daily_logs.map((log, i) => (
              <DailyLogSheet key={log.date} log={log} index={i} />
            ))}
          </section>
        </>
      ) : null}
    </main>
  );
}
