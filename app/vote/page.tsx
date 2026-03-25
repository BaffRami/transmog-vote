"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface VoteSession {
  id: number; contestantId: number; contestantName: string;
  voteCount: number; isContestant: boolean; alreadyVoted: boolean; myScore: number | null;
}

export default function VotePage() {
  const router = useRouter();
  const [charName, setCharName] = useState("");
  const [session, setSession] = useState<VoteSession | null | undefined>(undefined);
  const [votingEnabled, setVotingEnabled] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchCurrent = useCallback(async () => {
    const res = await fetch("/api/vote/current");
    if (res.status === 401) { router.push("/"); return; }
    const data = await res.json();
    setSession(data.session);
    setVotingEnabled(data.votingEnabled);
    setError("");
  }, [router]);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.user) { router.push("/"); return; }
      setCharName(d.user.charName);
    });
    fetchCurrent();
    const iv = setInterval(fetchCurrent, 4000);
    return () => clearInterval(iv);
  }, [router, fetchCurrent]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  async function submitVote() {
    if (!selected || !session) return;
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/vote/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, score: selected }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSelected(null);
      await fetchCurrent();
    } catch { setError("Network error, try again"); }
    finally { setSubmitting(false); }
  }

  if (session === undefined) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <div style={{ color: "#4a3720" }}>Loading...</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ fontSize: "0.6rem", color: "#4a3720", textTransform: "uppercase", letterSpacing: "0.12em" }}>Logged in as</div>
          <div style={{ color: "#f5c518", fontWeight: 700 }}>{charName}</div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {!votingEnabled && <span className="badge badge-red">Awaiting Approval</span>}
          {votingEnabled && <span className="badge badge-green">Voter</span>}
          <button className="wow-btn wow-btn-danger" style={{ padding: "0.3rem 0.75rem", fontSize: "0.7rem" }} onClick={logout}>Logout</button>
        </div>
      </div>

      {!session && (
        <div className="wow-card" style={{ padding: "3rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏆</div>
          <h2 style={{ color: "#f5c518", fontSize: "1.2rem", marginBottom: "0.5rem" }}>No Active Voting</h2>
          <p style={{ color: "#6b5a3e", fontSize: "0.85rem" }}>Waiting for the competition leader to open voting for the next contestant.</p>
          <p style={{ color: "#2a1f10", fontSize: "0.7rem", marginTop: "1.5rem" }}>Auto-refreshes every 4 seconds</p>
        </div>
      )}

      {session && session.isContestant && (
        <div className="wow-card live-pulse" style={{ padding: "3rem 2rem", textAlign: "center", borderColor: "#c8960c" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👑</div>
          <h2 style={{ color: "#f5c518", fontFamily: "Cinzel Decorative, Cinzel, serif", fontSize: "1.5rem", marginBottom: "0.5rem" }}>You'"'"'re Up!</h2>
          <p style={{ color: "#b8a87a", fontSize: "0.85rem", marginBottom: "1rem" }}>The guild is judging your mog. Strike a pose!</p>
          <span className="badge badge-gold">{session.voteCount} vote{session.voteCount !== 1 ? "s" : ""} cast</span>
        </div>
      )}

      {session && !session.isContestant && !votingEnabled && (
        <div className="wow-card" style={{ padding: "3rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
          <h2 style={{ color: "#c8960c", fontSize: "1.1rem", marginBottom: "0.5rem" }}>
            Rating: <span style={{ color: "#f5c518" }}>{session.contestantName}</span>
          </h2>
          <p style={{ color: "#6b5a3e", fontSize: "0.85rem" }}>Your account hasn'"'"'t been approved yet. Share your code with the admin.</p>
        </div>
      )}

      {session && !session.isContestant && votingEnabled && session.alreadyVoted && (
        <div className="wow-card" style={{ padding: "2.5rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>✅</div>
          <h2 style={{ color: "#f5c518", fontSize: "1.1rem", marginBottom: "0.5rem" }}>Vote Submitted!</h2>
          <p style={{ color: "#b8a87a", fontSize: "0.85rem", marginBottom: "1rem" }}>
            You rated <strong style={{ color: "#f5c518" }}>{session.contestantName}</strong>:
          </p>
          <div style={{ marginBottom: "1rem" }}>
            <span style={{ fontSize: "4rem", fontWeight: 900, color: "#f5c518" }}>{session.myScore}</span>
            <span style={{ fontSize: "1.5rem", color: "#4a3720" }}>/10</span>
          </div>
          <p style={{ color: "#2a1f10", fontSize: "0.7rem" }}>Waiting for the next contestant...</p>
        </div>
      )}

      {session && !session.isContestant && votingEnabled && !session.alreadyVoted && (
        <div className="wow-card" style={{ padding: "2rem" }}>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "0.6rem", color: "#6b5a3e", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "0.25rem" }}>Now Rating</div>
            <h2 style={{ fontFamily: "Cinzel Decorative, Cinzel, serif", color: "#f5c518", fontSize: "2rem" }}>{session.contestantName}</h2>
            <div style={{ fontSize: "0.7rem", color: "#4a3720", marginTop: "0.25rem" }}>{session.voteCount} vote{session.voteCount !== 1 ? "s" : ""} cast</div>
          </div>
          <hr className="divider" />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#b8a87a", marginBottom: "1rem" }}>
              Rate their transmog (1 = tragic · 10 = legendary)
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} className={`score-btn ${selected === n ? "active" : ""}`} onClick={() => setSelected(n)}>{n}</button>
              ))}
            </div>
            {selected && (
              <div style={{ fontSize: "0.85rem", color: "#b8a87a", marginBottom: "1rem" }}>
                Your score: <strong style={{ color: "#f5c518", fontSize: "1.1rem" }}>{selected}/10</strong>
              </div>
            )}
            {error && <div className="alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}
            <button className="wow-btn" style={{ padding: "0.6rem 2rem" }} onClick={submitVote} disabled={!selected || submitting}>
              {submitting ? "Submitting..." : "Submit Vote"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
