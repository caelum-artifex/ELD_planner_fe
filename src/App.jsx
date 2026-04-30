import { useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000/api";

const statusRows = [
  { key: "off_duty", label: "Off Duty" },
  { key: "sleeper", label: "Sleeper" },
  { key: "driving", label: "Driving" },
  { key: "on_duty_not_driving", label: "On Duty" },
];

function rowForStatus(status) {
  const index = statusRows.findIndex((item) => item.key === status);
  return index >= 0 ? index : 0;
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

function DailyLogSheet({ log, index }) {
  const width = 980;
  const leftPad = 130;
  const topPad = 46;
  const rowHeight = 38;
  const chartHeight = rowHeight * 4;
  const chartWidth = width - leftPad - 20;
  const pxPerHour = chartWidth / 24;

  const totals = log.totals;

  return (
    <div className="log-sheet">
      <h3>Log Sheet #{index + 1} - {log.date}</h3>
      <svg viewBox={`0 0 ${width} 280`} role="img" aria-label={`ELD log for ${log.date}`}>
        <rect x="2" y="2" width={width - 4} height="276" fill="#fff" stroke="#111" />
        <text x="16" y="24" className="sheet-title">Driver Daily Log</text>
        <text x="16" y="40" className="sheet-subtitle">24-hour period: {log.date}</text>

        {statusRows.map((row, idx) => (
          <g key={row.key}>
            <text x="16" y={topPad + idx * rowHeight + 24} className="row-label">{row.label}</text>
            <line
              x1={leftPad}
              y1={topPad + idx * rowHeight}
              x2={leftPad + chartWidth}
              y2={topPad + idx * rowHeight}
              stroke="#222"
            />
          </g>
        ))}

        <line x1={leftPad} y1={topPad + chartHeight} x2={leftPad + chartWidth} y2={topPad + chartHeight} stroke="#222" />

        {Array.from({ length: 25 }).map((_, i) => (
          <g key={i}>
            <line
              x1={leftPad + i * pxPerHour}
              y1={topPad}
              x2={leftPad + i * pxPerHour}
              y2={topPad + chartHeight}
              stroke={i % 6 === 0 ? "#222" : "#b6b6b6"}
              strokeWidth={i % 6 === 0 ? 1.4 : 0.8}
            />
            {i < 24 ? (
              <text x={leftPad + i * pxPerHour + 2} y={topPad - 8} className="hour-label">{i}</text>
            ) : null}
          </g>
        ))}

        {log.entries.map((entry, idx) => {
          const y = topPad + rowForStatus(entry.status) * rowHeight + rowHeight / 2;
          const x = leftPad + entry.start_hour * pxPerHour;
          const w = Math.max(1, (entry.end_hour - entry.start_hour) * pxPerHour);
          return (
            <g key={`${idx}-${entry.start_hour}`}>
              <rect x={x} y={y - 8} width={w} height={16} fill="#111" rx="2" />
            </g>
          );
        })}

        <text x="16" y="228" className="totals">Driving: {totals.driving_hours}h</text>
        <text x="220" y="228" className="totals">On Duty: {totals.on_duty_hours}h</text>
        <text x="430" y="228" className="totals">Sleeper: {totals.sleeper_hours}h</text>
        <text x="630" y="228" className="totals">Off Duty: {totals.off_duty_hours}h</text>
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

  const instructionCount = useMemo(() => {
    if (!result?.route?.instructions) {
      return 0;
    }
    return result.route.instructions.to_pickup.length + result.route.instructions.to_dropoff.length;
  }, [result]);

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="pill">Production-ready demo</p>
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
            <h2>Drive Instructions</h2>
            <div className="instructions-grid">
              <div>
                <h3>Current to Pickup</h3>
                <ol className="instructions">
                  {result.route.instructions.to_pickup.slice(0, 14).map((step, idx) => (
                    <li key={`pickup-step-${idx}`}>
                      <strong>{step.instruction}</strong> on {step.road}
                      <span>{step.distance_miles} mi</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <h3>Pickup to Dropoff</h3>
                <ol className="instructions">
                  {result.route.instructions.to_dropoff.slice(0, 14).map((step, idx) => (
                    <li key={`drop-step-${idx}`}>
                      <strong>{step.instruction}</strong> on {step.road}
                      <span>{step.distance_miles} mi</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          <section className="card">
            <h2>Duty Timeline & Rest Events</h2>
            <ul className="timeline">
              {result.schedule.map((segment, idx) => (
                <li key={`${segment.start}-${idx}`}>
                  <span>{fmtDateTime(segment.start)}</span>
                  <strong>{fmtStatus(segment.status)}</strong>
                  <em>{segment.notes}</em>
                </li>
              ))}
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
