"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface VoteSession {
  id: number; contestantId: number; contestantName: string;
  voteCount: number; isContestant: boolean; alreadyVoted: boolean; myScore: number | null;
}

interface Progress { rated: number; total: number; }

const FLAVOR_TEXTS = [
  "Sharpen your judgment, champion.",
  "The next transmog awaits your verdict.",
  "Study the details. Every thread matters.",
  "A true connoisseur never rushes.",
  "May the best mog claim glory.",
  "Your vote shapes destiny.",
  "Fashion is the true endgame.",
  "Gear score means nothing. Style means everything.",
];

const scoreColor = (n: number) => {
  if (n <= 3) return '#ef4444';
  if (n <= 6) return '#f5c518';
  return '#4ade80';
};

export default function VotePage() {
  const router = useRouter();
  const [charName, setCharName] = useState("");
  const [userCode, setUserCode] = useState("");
  const [session, setSession] = useState<VoteSession | null | undefined>(undefined);
  const [progress, setProgress] = useState<Progress>({ rated: 0, total: 0 });
  const [votingEnabled, setVotingEnabled] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [flavor] = useState(() => FLAVOR_TEXTS[Math.floor(Math.random() * FLAVOR_TEXTS.length)]);

  const fetchCurrent = useCallback(async () => {
    const res = await fetch("/api/vote/current");
    if (res.status === 401) { router.push("/"); return; }
    const data = await res.json();
    setSession(data.session);
    setVotingEnabled(data.votingEnabled);
    if (data.progress) setProgress(data.progress);
    setError("");
  }, [router]);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.user) { router.push("/"); return; }
      setCharName(d.user.charName);
      setUserCode(d.user.code || "");
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

  const progressPct = progress.total > 0 ? (progress.rated / progress.total) * 100 : 0;

  return (
    <div style={{ maxWidth: 660, margin: "0 auto" }}>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ fontSize: "1.5rem", color: "#4a3720", textTransform: "uppercase", letterSpacing: "0.25em", marginBottom: "0.5rem" }}>
        Fanatics
        </div>
        <h1 style={{
          fontFamily: "Cinzel Decorative, Cinzel, serif",
          color: "#f5c518",
          fontSize: "clamp(1.6rem, 5vw, 2.8rem)",
          fontWeight: 900,
          margin: 0,
          letterSpacing: "0.05em",
          textShadow: "0 0 30px rgba(200,150,12,0.4), 0 0 60px rgba(200,150,12,0.15)",
        }}>
          ⚔ Transmog Competition ⚔
        </h1>
        {/* Decorative divider */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginTop: "0.75rem" }}>
          <div style={{ height: 1, width: 60, background: "linear-gradient(to right, transparent, #4a3720)" }} />
          <span style={{ color: "#4a3720", fontSize: "0.7rem" }}>⚔</span>
          <div style={{ height: 1, width: 60, background: "linear-gradient(to left, transparent, #4a3720)" }} />
        </div>
      </div>

      {/* Player bar */}
      <div className="wow-card" style={{ padding: "1rem 1.5rem", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "0.55rem", color: "#4a3720", textTransform: "uppercase", letterSpacing: "0.15em" }}>Champion</div>
          <div style={{ color: "#f5c518", fontWeight: 700, fontSize: "1.2rem", letterSpacing: "0.03em" }}>{charName}</div>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          {!votingEnabled && <span className="badge badge-red">Awaiting Approval</span>}
          {votingEnabled && <span className="badge badge-green">Voter</span>}
          <button className="wow-btn wow-btn-ghost" style={{ padding: "0.25rem 0.6rem", fontSize: "0.65rem" }}
            onClick={() => setShowCode(!showCode)}>
            {showCode ? "Hide Code" : "My Code"}
          </button>
          <button className="wow-btn wow-btn-danger" style={{ padding: "0.3rem 0.75rem", fontSize: "0.7rem" }} onClick={logout}>Logout</button>
        </div>
      </div>

      {/* Code reveal */}
      {showCode && (
        <div className="wow-card" style={{ padding: "1rem 1.5rem", marginBottom: "1.25rem", textAlign: "center", borderColor: "#c8960c" }}>
          <div style={{ fontSize: "0.6rem", color: "#6b5a3e", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "0.4rem" }}>
            Your Voter Code — share with the admin in Discord
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: 700, letterSpacing: "0.25em", color: "#f5c518", fontFamily: "monospace" }}>
            {userCode || "—"}
          </div>
        </div>
      )}

      {/* Progress bar */}
      {progress.total > 0 && (
        <div className="wow-card" style={{ padding: "0.85rem 1.5rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <div style={{ fontSize: "0.65rem", color: "#6b5a3e", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Competition Progress
            </div>
            <div style={{ fontSize: "0.75rem", color: "#b8a87a", fontWeight: 700 }}>
              {progress.rated} <span style={{ color: "#4a3720" }}>of</span> {progress.total} <span style={{ color: "#4a3720", fontSize: "0.65rem" }}>contestants rated</span>
            </div>
          </div>
          <div style={{ height: 6, background: "#0f0d0b", borderRadius: 3, border: "1px solid #2a1f10", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${progressPct}%`,
              background: "linear-gradient(90deg, #8a6700, #f5c518)",
              borderRadius: 3,
              transition: "width 0.6s ease",
            }} />
          </div>
        </div>
      )}

      {/* No active session */}
      {!session && (
        <div className="wow-card" style={{ padding: "3.5rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1.25rem" }}>🏆</div>
          <h2 style={{ fontFamily: "Cinzel Decorative, Cinzel, serif", color: "#f5c518", fontSize: "1.6rem", marginBottom: "0.75rem" }}>
            No Active Voting
          </h2>
          <p style={{ color: "#b8a87a", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Waiting for the competition leader to open voting for the next contestant.
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", margin: "1.5rem 0" }}>
            <div style={{ height: 1, width: 40, background: "linear-gradient(to right, transparent, #4a3720)" }} />
            <span style={{ color: "#6b5a3e", fontSize: "0.85rem", fontStyle: "italic" }}>"{flavor}"</span>
            <div style={{ height: 1, width: 40, background: "linear-gradient(to left, transparent, #4a3720)" }} />
          </div>
          <div style={{ fontSize: "0.65rem", color: "#2a1f10", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            ⟳ Auto-refreshes every 4 seconds · Stay on this page
          </div>
        </div>
      )}

      {/* You are the contestant */}
      {session && session.isContestant && (
        <div className="wow-card live-pulse" style={{ padding: "3.5rem 2rem", textAlign: "center", borderColor: "#c8960c" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>👑</div>
          <h2 style={{ color: "#f5c518", fontFamily: "Cinzel Decorative, Cinzel, serif", fontSize: "2rem", marginBottom: "0.5rem" }}>
            You're Up!
          </h2>
          <p style={{ color: "#b8a87a", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            The guild is judging your mog. Strike a pose!
          </p>
          <span className="badge badge-gold" style={{ fontSize: "0.85rem", padding: "0.35rem 1rem" }}>
            {session.voteCount} vote{session.voteCount !== 1 ? "s" : ""} cast so far
          </span>
        </div>
      )}

      {/* Not approved */}
      {session && !session.isContestant && !votingEnabled && (
        <div className="wow-card" style={{ padding: "3rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
          <h2 style={{ color: "#c8960c", fontSize: "1.2rem", marginBottom: "0.5rem" }}>
            Rating: <span style={{ color: "#f5c518" }}>{session.contestantName}</span>
          </h2>
          <p style={{ color: "#6b5a3e", fontSize: "0.85rem" }}>
            Your account hasn't been approved yet. Share your code with the admin in Discord.
          </p>
        </div>
      )}

      {/* Already voted */}
      {session && !session.isContestant && votingEnabled && session.alreadyVoted && (
        <div className="wow-card" style={{ padding: "3rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>✅</div>
          <h2 style={{ color: "#f5c518", fontSize: "1.2rem", marginBottom: "0.75rem" }}>Vote Submitted!</h2>
          <p style={{ color: "#b8a87a", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
            You rated <strong style={{ color: "#f5c518" }}>{session.contestantName}</strong>:
          </p>
          <div style={{ marginBottom: "1.5rem" }}>
            <span style={{ fontSize: "5.5rem", fontWeight: 900, color: "#f5c518", lineHeight: 1, textShadow: "0 0 30px rgba(245,197,24,0.4)" }}>
              {session.myScore}
            </span>
            <span style={{ fontSize: "2rem", color: "#4a3720" }}>/10</span>
          </div>
          <p style={{ color: "#6b5a3e", fontSize: "0.8rem", fontStyle: "italic" }}>
            Waiting for the next contestant...
          </p>
        </div>
      )}

      {/* Vote form */}
      {session && !session.isContestant && votingEnabled && !session.alreadyVoted && (
        <div className="wow-card" style={{ padding: "2.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ fontSize: "0.6rem", color: "#6b5a3e", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "0.5rem" }}>
              Now Rating
            </div>
            <h2 style={{ fontFamily: "Cinzel Decorative, Cinzel, serif", color: "#f5c518", fontSize: "clamp(1.8rem, 5vw, 2.5rem)", margin: 0, textShadow: "0 0 20px rgba(200,150,12,0.3)" }}>
              {session.contestantName}
            </h2>
            <div style={{ fontSize: "0.7rem", color: "#4a3720", marginTop: "0.4rem" }}>
              {session.voteCount} vote{session.voteCount !== 1 ? "s" : ""} cast
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "2rem" }}>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(to right, transparent, #2a1f10)" }} />
            <span style={{ color: "#2a1f10", fontSize: "0.7rem" }}>⚔</span>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(to left, transparent, #2a1f10)" }} />
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#6b5a3e", marginBottom: "1.25rem" }}>
              Rate their transmog — 1 is tragic, 10 is legendary
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.75rem" }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button
                  key={n}
                  onClick={() => setSelected(n)}
                  style={{
                    width: "3.2rem",
                    height: "3.2rem",
                    border: selected === n ? `2px solid ${scoreColor(n)}` : "1px solid #2a1f10",
                    background: selected === n
                      ? `${scoreColor(n)}22`
                      : "#0f0d0b",
                    color: selected === n ? scoreColor(n) : "#6b5a3e",
                    fontFamily: "Cinzel, serif",
                    fontWeight: 700,
                    fontSize: "1rem",
                    cursor: "pointer",
                    borderRadius: 2,
                    transition: "all 0.12s",
                    boxShadow: selected === n ? `0 0 12px ${scoreColor(n)}44` : "none",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>

            {selected && (
              <div style={{ marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "0.85rem", color: "#6b5a3e" }}>Your score: </span>
                <span style={{ fontSize: "1.6rem", fontWeight: 900, color: scoreColor(selected) }}>
                  {selected}
                </span>
                <span style={{ fontSize: "1rem", color: "#4a3720" }}>/10</span>
              </div>
            )}

            {error && <div className="alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}
            <button
              className="wow-btn"
              style={{ padding: "0.75rem 3rem", fontSize: "0.95rem" }}
              onClick={submitVote}
              disabled={!selected || submitting}
            >
              {submitting ? "Submitting..." : "⚔ Submit Vote ⚔"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}