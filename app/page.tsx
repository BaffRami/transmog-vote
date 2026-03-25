"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [charName, setCharName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [done, setDone] = useState<{ charName: string; code: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) router.push("/vote");
      else setChecking(false);
    });
  }, [router]);

  if (checking) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ charName, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push("/vote");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ charName, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setDone({ charName: data.charName, code: data.code });
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  if (done) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div className="wow-card" style={{ padding: "2.5rem", width: "100%", maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
          <h2 style={{ color: "#f5c518", fontSize: "1.3rem", marginBottom: "0.5rem" }}>Registered!</h2>
          <p style={{ color: "#b8a87a", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            Welcome, <strong style={{ color: "#f5c518" }}>{done.charName}</strong>! Share your code
            with the competition leader to get voting rights.
          </p>
          <div style={{ background: "#080604", border: "1px solid #c8960c", borderRadius: 4, padding: "1rem 1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "0.6rem", color: "#6b5a3e", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "0.4rem" }}>
              Your Voter Code
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 700, letterSpacing: "0.2em", color: "#f5c518", fontFamily: "monospace" }}>
              {done.code}
            </div>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#6b5a3e", marginBottom: "1.5rem" }}>
            Post this code in Discord or whisper it to the GM. Once approved, you can log in and vote!
          </p>
          <button className="wow-btn" style={{ width: "100%" }}
            onClick={() => { setDone(null); setTab("login"); setCharName(""); setPassword(""); setConfirm(""); }}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Big title on top */}
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <div style={{ fontSize: "2rem", color: "#6b5a3e", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "0.5rem" , marginTop: "3rem" }}>
          Fnatics
        </div>
        <h1 style={{ fontFamily: "Cinzel Decorative, Cinzel, serif", color: "#f5c518", fontSize: "clamp(1.8rem, 5vw, 3.5rem)", fontWeight: 900, letterSpacing: "0.05em", margin: 0 }}>
          ⚔ Transmog Competition ⚔
        </h1>
        <p style={{ color: "#6b5a3e", fontSize: "0.8rem", marginTop: "0.5rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          May the best mog win
        </p>
      </div>

      {/* Form left, Logo right */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4rem", flexWrap: "wrap" }}>

        {/* Login form */}
        <div className="wow-card" style={{ padding: "2rem", width: "100%", maxWidth: 380, flexShrink: 0 }}>
          <div style={{ display: "flex", borderBottom: "1px solid #2a1f10", marginBottom: "1.5rem" }}>
            {(["login", "signup"] as const).map(t => (
              <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} style={{ flex: 1 }}
                onClick={() => { setTab(t); setError(""); }}>
                {t === "login" ? "Login" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={tab === "login" ? handleLogin : handleSignup}>
            {tab === "login" && forgotMode ? (
              <>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#b8a87a", marginBottom: "0.3rem" }}>
                    Character Name
                  </label>
                  <input className="wow-input" value={charName} onChange={e => setCharName(e.target.value)} placeholder="Your character name" required />
                </div>
                {error && <div className="alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}
                {forgotSent && <div className="alert-success" style={{ marginBottom: "1rem" }}>Request sent! Contact the admin in Discord.</div>}
                <button className="wow-btn" type="button" disabled={loading} style={{ width: "100%", marginBottom: "0.5rem" }}
                  onClick={async () => {
                    setError(""); setLoading(true);
                    const res = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ charName }) });
                    const d = await res.json();
                    if (!res.ok) setError(d.error);
                    else setForgotSent(true);
                    setLoading(false);
                  }}>
                  {loading ? "Sending..." : "Send Reset Request"}
                </button>
                <button className="wow-btn wow-btn-ghost" type="button" style={{ width: "100%" }} onClick={() => { setForgotMode(false); setForgotSent(false); setError(""); }}>
                  Back to Login
                </button>
              </>
            ) : (
              <>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#b8a87a", marginBottom: "0.3rem" }}>Character Name</label>
                  <input className="wow-input" value={charName} onChange={e => setCharName(e.target.value)} placeholder="e.g. Devower" required />
                </div>
                <div style={{ marginBottom: tab === "login" ? "0.25rem" : "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#b8a87a", marginBottom: "0.3rem" }}>Password</label>
                  <input className="wow-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 4 characters" required />
                </div>
                {tab === "login" && (
                  <div style={{ textAlign: "right", marginBottom: "1rem" }}>
                    <button type="button" className="wow-btn wow-btn-ghost" style={{ padding: "0.15rem 0.5rem", fontSize: "0.65rem" }}
                      onClick={() => { setForgotMode(true); setError(""); }}>
                      Forgot password?
                    </button>
                  </div>
                )}
                {tab === "signup" && (
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#b8a87a", marginBottom: "0.3rem" }}>Confirm Password</label>
                    <input className="wow-input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required />
                  </div>
                )}
                {error && <div className="alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}
                <button className="wow-btn" type="submit" disabled={loading} style={{ width: "100%", marginTop: "0.5rem" }}>
                  {loading ? "Please wait..." : tab === "login" ? "Login" : "Register"}
                </button>
              </>
            )}
          </form>
        </div>

        {/* Fnatics logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <img
            src="/fnatics-logo.png"
            alt="Fnatics"
            style={{ width: "clamp(120px, 20vw, 220px)", opacity: 0.9, filter: "drop-shadow(0 0 20px rgba(200,150,12,0.3))" }}
          />
          <div style={{ color: "#4a3720", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Fnatics
          </div>
        </div>

      </div>
    </div>
  );
}