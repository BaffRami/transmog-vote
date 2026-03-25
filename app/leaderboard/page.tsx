"use client";
import { useState, useEffect } from "react";

interface Result {
  char_name: string; vote_count: number;
  avg_score: number | null; max_score: number | null; min_score: number | null; is_open: number;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      setResults(data.results || []);
      setLoading(false);
    };
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  const rankColor = (i: number) => {
    if (i === 0) return "#ffd700";
    if (i === 1) return "#c0c0c0";
    if (i === 2) return "#cd7f32";
    return "#b8a87a";
  };

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h2 style={{ fontFamily: "Cinzel Decorative, Cinzel, serif", color: "#f5c518", fontSize: "2rem" }}>
          🏆 Hall of Legends 🏆
        </h2>
        <p style={{ color: "#6b5a3e", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", marginTop: "0.25rem" }}>
          Transmog Competition Rankings
        </p>
      </div>

      {loading && <div style={{ textAlign: "center", color: "#4a3720", padding: "3rem" }}>Loading rankings...</div>}

      {!loading && results.length === 0 && (
        <div className="wow-card" style={{ padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚔️</div>
          <p style={{ color: "#6b5a3e" }}>No votes cast yet. The competition is just beginning!</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {results.map((r, i) => (
          <div key={r.char_name + i} className="wow-card" style={{
            padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem",
            borderColor: i === 0 ? "#c8960c" : i === 1 ? "#666" : i === 2 ? "#8b6914" : "#4a3720",
            boxShadow: i === 0 ? "0 0 20px rgba(200,150,12,0.15)" : undefined,
          }}>
            <div style={{ width: "2.5rem", textAlign: "center", flexShrink: 0 }}>
              {i < 3
                ? <span style={{ fontSize: "1.8rem" }}>{MEDALS[i]}</span>
                : <span style={{ color: "#4a3720", fontSize: "0.85rem", fontWeight: 700 }}>#{i + 1}</span>
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: rankColor(i), fontWeight: 700, fontSize: "1.1rem", textShadow: i === 0 ? "0 0 10px rgba(255,215,0,0.4)" : undefined }}>
                {r.char_name}
                {r.is_open === 1 && <span className="badge badge-green" style={{ marginLeft: "0.5rem", fontSize: "0.55rem" }}>LIVE</span>}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6b5a3e", marginTop: "0.2rem" }}>
                {r.vote_count} vote{r.vote_count !== 1 ? "s" : ""}
                {r.vote_count > 0 && r.max_score != null && r.min_score != null && (
                  <span> · Range: {r.min_score}–{r.max_score}</span>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <span style={{ fontSize: "2.2rem", fontWeight: 900, color: rankColor(i) }}>
                {r.avg_score != null ? Number(r.avg_score).toFixed(2) : "—"}
              </span>
              <span style={{ fontSize: "0.75rem", color: "#4a3720" }}>/10</span>
            </div>
          </div>
        ))}
      </div>

      {results.length > 0 && (
        <p style={{ textAlign: "center", fontSize: "0.65rem", color: "#2a1f10", marginTop: "1.5rem" }}>
          Auto-refreshes every 5 seconds
        </p>
      )}
    </div>
  );
}
