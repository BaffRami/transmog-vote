"use client";
import { useState, useEffect, useCallback } from "react";

interface Player { id: number; char_name: string; code: string; voting_enabled: number; reset_requested: number; created_at: string; }
interface ActiveSession { id: number; contestant_id: number; char_name: string; opened_at: string; vote_count: number; avg_score: number | null; }
interface CompletedSession { id: number; char_name: string; vote_count: number; avg_score: number | null; }

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [tab, setTab] = useState<"players"|"session"|"results">("players");

  const [players, setPlayers] = useState<Player[]>([]);
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [completed, setCompleted] = useState<CompletedSession[]>([]);
  const [eligible, setEligible] = useState<{id:number;char_name:string}[]>([]);
  const [notVotedYet, setNotVotedYet] = useState<{char_name:string}[]>([]);
  const [pick, setPick] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [voteDetails, setVoteDetails] = useState<Record<number, {voter_name: string; score: number; voted_at: string}[]>>({});

  useEffect(() => {
    fetch("/api/admin/session")
      .then(r => { if (r.ok) setAuthed(true); });
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setLoginErr("");
    const res = await fetch("/api/admin/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) setAuthed(true);
    else setLoginErr("Wrong password, champion.");
  }

  const loadPlayers = useCallback(async () => {
    const res = await fetch("/api/admin/players");
    if (!res.ok) { setAuthed(false); return; }
    setPlayers((await res.json()).players || []);
  }, []);

  const loadSession = useCallback(async () => {
    const res = await fetch("/api/admin/session");
    if (!res.ok) return;
    const d = await res.json();
    setActive(d.active || null);
    setCompleted(d.completed || []);
    setEligible(d.eligible || []);
    setNotVotedYet(d.notVotedYet || []);
  }, []);

  useEffect(() => {
    if (!authed) return;
    loadPlayers(); loadSession();
    const iv = setInterval(() => { loadPlayers(); loadSession(); }, 4000);
    return () => clearInterval(iv);
  }, [authed, loadPlayers, loadSession]);

  async function toggleVoting(id: number, cur: number) {
    await fetch("/api/admin/players", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, votingEnabled: !cur }),
    });
    loadPlayers();
  }

  async function openSession() {
    if (!pick) { setErr("Select a contestant first"); return; }
    setErr(""); setMsg("");
    const res = await fetch("/api/admin/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contestantId: Number(pick) }),
    });
    const d = await res.json();
    if (res.ok) { setMsg("Voting opened!"); setPick(""); loadSession(); }
    else setErr(d.error);
  }

  async function closeSession() {
    setErr(""); setMsg("");
    const res = await fetch("/api/admin/session", { method: "DELETE" });
    const d = await res.json();
    if (res.ok) { setMsg("Session closed."); loadSession(); }
    else setErr(d.error);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
  }

  if (!authed) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <div className="wow-card" style={{ padding: "2rem", width: "100%", maxWidth: 360 }}>
        <h2 style={{ color: "#f5c518", textAlign: "center", marginBottom: "1.5rem" }}>⚔ Admin Access ⚔</h2>
        <form onSubmit={login}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#b8a87a", marginBottom: "0.3rem" }}>Admin Password</label>
            <input className="wow-input" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter admin password" required />
          </div>
          {loginErr && <div className="alert-error" style={{ marginBottom: "1rem" }}>{loginErr}</div>}
          <button className="wow-btn" type="submit" style={{ width: "100%" }}>Enter</button>
        </form>
      </div>
    </div>
  );

  const TABS = [
    { key: "players", label: `⚔ Players (${players.length})` },
    { key: "session", label: "🗳 Session" },
    { key: "results", label: "🏆 Results" },
  ] as const;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ color: "#f5c518", fontSize: "1.2rem" }}>Admin Dashboard</h2>
        <button className="wow-btn wow-btn-danger" style={{ padding: "0.3rem 0.75rem", fontSize: "0.7rem" }} onClick={logout}>Logout</button>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #2a1f10", marginBottom: "1.5rem" }}>
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? "active" : ""}`}
            onClick={() => { setTab(t.key); setMsg(""); setErr(""); }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* PLAYERS TAB */}
      {tab === "players" && (
        <div>
          {/* Competition controls */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <button className="wow-btn wow-btn-danger" style={{ fontSize: "0.75rem" }}
              onClick={async () => {
                if (!confirm("Disapprove ALL players? They will need to be re-approved for the next competition.")) return;
                await fetch("/api/admin/players", {
                  method: "PUT", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "disapprove_all" }),
                });
                loadPlayers();
              }}>
              Disapprove All
            </button>
            <button className="wow-btn wow-btn-danger" style={{ fontSize: "0.75rem" }}
              onClick={async () => {
                if (!confirm("RESET COMPETITION? This will wipe ALL votes and sessions, and disapprove all players. Player accounts are kept. This cannot be undone.")) return;
                await fetch("/api/admin/players", {
                  method: "PUT", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "reset" }),
                });
                loadPlayers();
                loadSession();
              }}>
              ⚠ Reset Competition
            </button>
          </div>

          {players.length === 0 && (
            <div className="wow-card" style={{ padding: "2rem", textAlign: "center" }}>
              <p style={{ color: "#6b5a3e" }}>No players registered yet.</p>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {players.map(p => (
              <div key={p.id} className="wow-card" style={{ padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#e8d5a3", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {p.char_name}
                    {p.reset_requested ? <span className="badge badge-blue">🔑 Reset Requested</span> : null}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#6b5a3e", marginTop: "0.15rem" }}>
                    Code: <span style={{ fontFamily: "monospace", color: "#c8960c", letterSpacing: "0.1em", fontWeight: 700 }}>{p.code}</span>
                    <span style={{ marginLeft: "0.75rem" }}>Registered: {new Date(p.created_at + "Z").toLocaleDateString()}</span>
                  </div>
                  {p.reset_requested ? (
                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem", alignItems: "center" }}>
                      <input className="wow-input" placeholder="New password"
                        style={{ maxWidth: 160, padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        id={`pw-${p.id}`} />
                      <button className="wow-btn" style={{ padding: "0.25rem 0.6rem", fontSize: "0.7rem" }}
                        onClick={async () => {
                          const input = document.getElementById(`pw-${p.id}`) as HTMLInputElement;
                          if (!input?.value) return;
                          await fetch("/api/admin/players", {
                            method: "PATCH", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: p.id, newPassword: input.value }),
                          });
                          input.value = "";
                          loadPlayers();
                        }}>
                        Set Password
                      </button>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                  <span className={`badge ${p.voting_enabled ? "badge-green" : "badge-red"}`}>
                    {p.voting_enabled ? "Approved" : "Pending"}
                  </span>
                  <button className={`wow-btn ${p.voting_enabled ? "wow-btn-danger" : ""}`}
                    style={{ padding: "0.25rem 0.6rem", fontSize: "0.7rem" }}
                    onClick={() => toggleVoting(p.id, p.voting_enabled)}>
                    {p.voting_enabled ? "Revoke" : "Approve"}
                  </button>
                  <button className="wow-btn wow-btn-danger" style={{ padding: "0.25rem 0.6rem", fontSize: "0.7rem" }}
                    onClick={async () => {
                      if (!confirm(`Delete ${p.char_name}? This cannot be undone.`)) return;
                      await fetch("/api/admin/players", {
                        method: "DELETE", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: p.id }),
                      });
                      loadPlayers();
                    }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SESSION TAB */}
      {tab === "session" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 540 }}>
          {active ? (
            <>
              <div className="wow-card live-pulse" style={{ padding: "1.5rem", borderColor: "#c8960c" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "0.6rem", color: "#6b5a3e", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.25rem" }}>Active Session</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#f5c518" }}>{active.char_name}</div>
                    <div style={{ fontSize: "0.8rem", color: "#b8a87a", marginTop: "0.25rem" }}>
                      {active.vote_count} vote{active.vote_count !== 1 ? "s" : ""} cast
                      {active.avg_score != null && <span> · Avg so far: {Number(active.avg_score).toFixed(2)}/10</span>}
                    </div>
                  </div>
                  <span className="badge badge-green">LIVE</span>
                </div>
                <hr className="divider" />
                <button className="wow-btn wow-btn-danger" onClick={closeSession}>Close Voting</button>
              </div>

              {notVotedYet.length > 0 && (
                <div className="wow-card" style={{ padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#b8a87a", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      Waiting to Vote
                    </div>
                    <span className="badge badge-red">{notVotedYet.length} remaining</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {notVotedYet.map((p) => (
                      <span key={p.char_name} style={{
                        padding: "0.25rem 0.6rem", background: "#080604",
                        border: "1px solid #2a1f10", borderRadius: 2,
                        fontSize: "0.75rem", color: "#b8a87a",
                      }}>
                        {p.char_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {notVotedYet.length === 0 && active.vote_count > 0 && (
                <div className="wow-card" style={{ padding: "1rem 1.25rem", textAlign: "center" }}>
                  <span style={{ color: "#4ade80", fontSize: "0.85rem" }}>✅ Everyone has voted!</span>
                </div>
              )}
            </>
          ) : (
            <div className="wow-card" style={{ padding: "1.25rem", textAlign: "center" }}>
              <p style={{ color: "#6b5a3e", fontSize: "0.85rem" }}>No active session</p>
            </div>
          )}

          {!active && (
            <div className="wow-card" style={{ padding: "1.25rem" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#b8a87a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                Open Voting For
              </div>
              <select className="wow-input" value={pick} onChange={e => setPick(e.target.value)} style={{ marginBottom: "0.75rem" }}>
                <option value="">— Select a contestant —</option>
                {eligible.map(p => <option key={p.id} value={p.id}>{p.char_name}</option>)}
              </select>
              {eligible.length === 0 && (
                <p style={{ fontSize: "0.7rem", color: "#4a3720", marginBottom: "0.75rem" }}>
                  No eligible players — approve at least one in the Players tab.
                </p>
              )}
              {err && <div className="alert-error" style={{ marginBottom: "0.75rem" }}>{err}</div>}
              {msg && <div className="alert-success" style={{ marginBottom: "0.75rem" }}>{msg}</div>}
              <button className="wow-btn" onClick={openSession} disabled={!pick}>Open Voting</button>
            </div>
          )}
        </div>
      )}

      {/* RESULTS TAB */}
      {tab === "results" && (
        <div>
          {completed.length === 0 && (
            <div className="wow-card" style={{ padding: "2rem", textAlign: "center" }}>
              <p style={{ color: "#6b5a3e" }}>No completed sessions yet.</p>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {completed.map((s, i) => (
              <div key={s.id}>
                <div className="wow-card"
                  style={{
                    padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "1rem",
                    cursor: "pointer", borderColor: expanded === s.id ? "#c8960c" : undefined,
                    transition: "border-color 0.15s",
                  }}
                  onClick={async () => {
                    if (expanded === s.id) { setExpanded(null); return; }
                    setExpanded(s.id);
                    if (!voteDetails[s.id]) {
                      const res = await fetch(`/api/admin/results?sessionId=${s.id}`);
                      const data = await res.json();
                      setVoteDetails(prev => ({ ...prev, [s.id]: data.votes || [] }));
                    }
                  }}
                >
                  <div style={{ width: "2rem", textAlign: "center", fontSize: "1.3rem" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span style={{ color: "#4a3720", fontSize: "0.8rem" }}>#{i+1}</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#e8d5a3" }}>{s.char_name}</div>
                    <div style={{ fontSize: "0.7rem", color: "#6b5a3e" }}>{s.vote_count} vote{s.vote_count !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#b8a87a" }}>
                    {s.avg_score != null ? Number(s.avg_score).toFixed(2) : "—"}
                    <span style={{ fontSize: "0.8rem", fontWeight: 400, color: "#4a3720" }}>/10</span>
                  </div>
                  <div style={{ color: "#4a3720", fontSize: "0.8rem", marginLeft: "0.5rem" }}>
                    {expanded === s.id ? "▲" : "▼"}
                  </div>
                </div>

                {expanded === s.id && (
                  <div className="wow-card" style={{
                    borderTop: "none", borderRadius: "0 0 4px 4px",
                    padding: "0.75rem 1rem", marginTop: "-0.6rem", paddingTop: "1rem",
                  }}>
                    {!voteDetails[s.id] ? (
                      <div style={{ color: "#4a3720", fontSize: "0.8rem", textAlign: "center", padding: "0.5rem" }}>Loading...</div>
                    ) : voteDetails[s.id].length === 0 ? (
                      <div style={{ color: "#4a3720", fontSize: "0.8rem", textAlign: "center", padding: "0.5rem" }}>No votes cast.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {voteDetails[s.id].map((v, vi) => (
                          <div key={vi} style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "0.4rem 0.75rem", background: "#080604",
                            borderRadius: "2px", border: "1px solid #2a1f10",
                          }}>
                            <span style={{ color: "#b8a87a", fontSize: "0.85rem" }}>{v.voter_name}</span>
                            <span style={{
                              fontWeight: 900, fontSize: "1.1rem",
                              color: v.score >= 8 ? "#4ade80" : v.score >= 5 ? "#f5c518" : "#ef4444",
                            }}>
                              {v.score}<span style={{ fontSize: "0.7rem", color: "#4a3720", fontWeight: 400 }}>/10</span>
                            </span>
                          </div>
                        ))}
                        <div style={{ textAlign: "right", fontSize: "0.65rem", color: "#2a1f10", marginTop: "0.25rem" }}>
                          Click row again to collapse
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}