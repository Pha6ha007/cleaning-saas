import { useState, useEffect } from "react";

/* ─── Palette ─── */
const C = {
  bg: "#F8F9FB",
  white: "#FFFFFF",
  card: "#FFFFFF",
  surface: "#F4F5F7",
  surfaceHover: "#EDEEF1",
  border: "#E2E4E9",
  borderFocus: "#C5C8D0",
  accent: "#2563EB",
  accentHover: "#1D4FD7",
  accentLight: "#EFF4FF",
  text: "#111318",
  textSecondary: "#4B5161",
  textMuted: "#6C7281",
  textDim: "#9CA3B0",
  error: "#DC2626",
  errorBg: "#FEF2F2",
  errorBorder: "#FECACA",
  // Product accents (for right panel)
  blue: "#2563EB",
  blueLight: "#EFF4FF",
  green: "#059669",
  greenLight: "#ECFDF5",
  violet: "#7C3AED",
  violetLight: "#F5F3FF",
};

/* ─── Icons ─── */
const ShieldLogo = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" 
      fill="url(#logo_g)" fillOpacity="0.12" stroke="url(#logo_g)" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M9 12l2 2 4-4" stroke="url(#logo_g)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <defs><linearGradient id="logo_g" x1="4" y1="2" x2="20" y2="22">
      <stop stopColor="#2563EB"/><stop offset="1" stopColor="#7C3AED"/>
    </linearGradient></defs>
  </svg>
);

const IconMail = ({ focus }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" 
    stroke={focus ? C.accent : C.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: "stroke 0.2s" }}>
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4l-10 7L2 4"/>
  </svg>
);
const IconLock = ({ focus }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" 
    stroke={focus ? C.accent : C.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: "stroke 0.2s" }}>
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);
const IconUser = ({ focus }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" 
    stroke={focus ? C.accent : C.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: "stroke 0.2s" }}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconBuilding = ({ focus }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" 
    stroke={focus ? C.accent : C.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: "stroke 0.2s" }}>
    <rect x="4" y="2" width="16" height="20" rx="2"/>
    <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/>
  </svg>
);
const IconEye = ({ open }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);
const Spinner = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" style={{ animation: "spin .7s linear infinite" }}>
    <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
    <path d="M12 2a10 10 0 019.8 8" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);
const IconGPS = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconCamera = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);
const IconClipboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.violet} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/>
  </svg>
);
const IconFileText = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
  </svg>
);

/* ─── Input ─── */
function Input({ icon: Icon, label, type = "text", placeholder, value, onChange, autoComplete, showToggle, required }) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  const actualType = showToggle ? (show ? "text" : "password") : type;

  return (
    <div style={{ marginBottom: "18px" }}>
      <label style={{
        display: "block", fontSize: "13.5px", fontWeight: 500,
        color: C.textSecondary, marginBottom: "6px",
      }}>
        {label}{required && <span style={{ color: C.error, marginLeft: "3px" }}>*</span>}
      </label>
      <div className="input-group" style={{ position: "relative" }}>
        <div style={{
          position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)",
          display: "flex", pointerEvents: "none",
        }}>
          <Icon focus={focused} />
        </div>
        <input
          type={actualType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          style={{
            width: "100%", height: "46px",
            padding: `0 ${showToggle ? "46px" : "14px"} 0 42px`,
            fontSize: "14px",
            color: C.text,
            background: focused ? C.white : C.surface,
            border: `1.5px solid ${focused ? C.accent : C.border}`,
            borderRadius: "10px",
            outline: "none",
            transition: "all 0.2s ease",
            boxSizing: "border-box",
            boxShadow: focused ? `0 0 0 3px ${C.accent}14` : "none",
          }}
        />
        {showToggle && (
          <button type="button" onClick={() => setShow(!show)} style={{
            position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px",
          }}>
            <IconEye open={show} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Proof items for right panel ─── */
const proofSteps = [
  { icon: <IconGPS />, color: C.blueLight, title: "GPS Verification", desc: "Confirm presence at every location" },
  { icon: <IconCamera />, color: C.greenLight, title: "Photo Evidence", desc: "Timestamped before & after documentation" },
  { icon: <IconClipboard />, color: C.violetLight, title: "Smart Checklists", desc: "Track every task with SLA compliance" },
  { icon: <IconFileText />, color: C.accentLight, title: "PDF Reports", desc: "Client-ready reports generated instantly" },
];

/* ─── Main ─── */
export default function ProofAuth() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const switchMode = (m) => {
    if (m === mode) return;
    setError("");
    setMode(m);
    setAnimKey(k => k + 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "signin" && (!email || !password)) {
      setError("Please enter your email and password"); return;
    }
    if (mode === "signup") {
      if (!company || !name || !email || !password || !confirmPw) {
        setError("All fields are required"); return;
      }
      if (password !== confirmPw) { setError("Passwords do not match"); return; }
    }
    setError(""); setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body, #root { height:100%; }
        body { background: ${C.bg}; }
        ::placeholder { color: ${C.textDim}; font-size: 13.5px; }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 40px ${C.surface} inset !important;
          -webkit-text-fill-color: ${C.text} !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes fadeSlide {
          from { opacity:0; transform:translateY(10px) }
          to { opacity:1; transform:translateY(0) }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) }
          50% { transform: translateY(-8px) }
        }
        .form-animated {
          animation: fadeSlide 0.35s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        .tab-btn {
          position: relative; transition: all 0.2s ease; cursor: pointer;
          background: none; border: none; font-family: 'Inter', sans-serif;
          font-size: 14px; font-weight: 500; padding: 10px 2px 14px;
        }
        .tab-btn::after {
          content:''; position:absolute; bottom:0; left:0; right:0;
          height:2px; border-radius:1px; transition:all 0.25s ease;
        }
        .tab-btn.active { color: ${C.text}; }
        .tab-btn.active::after { background: ${C.accent}; }
        .tab-btn:not(.active) { color: ${C.textDim}; }
        .tab-btn:not(.active):hover { color: ${C.textMuted}; }

        .submit-btn {
          transition: all 0.2s ease; position: relative; overflow: hidden;
        }
        .submit-btn:hover:not(:disabled) {
          background: ${C.accentHover} !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37,99,235,0.25);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }

        .link-a { color: ${C.accent}; text-decoration: none; font-weight: 500; transition: color 0.15s; }
        .link-a:hover { color: ${C.accentHover}; text-decoration: underline; }

        .input-group:hover input { border-color: ${C.borderFocus} !important; }

        .proof-card {
          transition: all 0.2s ease;
        }
        .proof-card:hover {
          background: rgba(255,255,255,0.85) !important;
          transform: translateX(4px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        @media (max-width: 960px) {
          .auth-split { flex-direction: column !important; min-height: auto !important; }
          .auth-right-panel { display: none !important; }
          .auth-left-panel {
            max-width: 100% !important; flex: 1 !important;
            border-radius: 16px !important; border-right: none !important;
          }
        }
      `}</style>

      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Inter', sans-serif", padding: "20px", background: C.bg,
      }}>
        <div className="auth-split" style={{
          display: "flex", width: "100%", maxWidth: "1000px", minHeight: "620px",
          borderRadius: "20px", overflow: "hidden",
          background: C.white,
          border: `1px solid ${C.border}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "scale(1)" : "scale(0.98)",
          transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)",
        }}>

          {/* ── LEFT: Form ── */}
          <div className="auth-left-panel" style={{
            flex: "0 0 440px", maxWidth: "440px",
            padding: "40px 36px",
            display: "flex", flexDirection: "column", justifyContent: "center",
            borderRight: `1px solid ${C.border}`,
            background: C.white,
          }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
              <ShieldLogo />
              <div>
                <span style={{ fontSize: "19px", fontWeight: 700, color: C.text, letterSpacing: "-0.025em" }}>
                  Proof
                </span>
                <span style={{ fontSize: "19px", fontWeight: 300, color: C.textDim, marginLeft: "4px", letterSpacing: "-0.025em" }}>
                  Platform
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              display: "flex", gap: "24px", marginBottom: "24px",
              borderBottom: `1px solid ${C.border}`,
            }}>
              <button className={`tab-btn ${mode === "signin" ? "active" : ""}`}
                onClick={() => switchMode("signin")}>Sign in</button>
              <button className={`tab-btn ${mode === "signup" ? "active" : ""}`}
                onClick={() => switchMode("signup")}>Create account</button>
            </div>

            {/* Form */}
            <div className="form-animated" key={animKey}>
              {mode === "signin" ? (
                <>
                  <p style={{ fontSize: "14px", color: C.textMuted, marginBottom: "24px", lineHeight: 1.5 }}>
                    Welcome back. Sign in to your workspace.
                  </p>

                  {error && <div style={{
                    padding: "10px 14px", marginBottom: "16px", borderRadius: "9px",
                    fontSize: "13px", color: C.error, background: C.errorBg, border: `1px solid ${C.errorBorder}`,
                  }}>{error}</div>}

                  <form onSubmit={handleSubmit}>
                    <Input icon={IconMail} label="Email" type="email"
                      placeholder="name@company.com" value={email}
                      onChange={e => setEmail(e.target.value)} autoComplete="email" />
                    <Input icon={IconLock} label="Password"
                      placeholder="Enter your password" value={password}
                      onChange={e => setPassword(e.target.value)} autoComplete="current-password" showToggle />
                    <div style={{ display:"flex", justifyContent:"flex-end", marginTop:"-10px", marginBottom:"22px" }}>
                      <a href="#" className="link-a" style={{ fontSize:"12.5px" }}>Forgot password?</a>
                    </div>
                    <button type="submit" disabled={loading} className="submit-btn" style={{
                      width:"100%", height:"46px", border:"none", borderRadius:"10px",
                      fontSize:"14px", fontWeight:600, color:"#fff", cursor: loading?"wait":"pointer",
                      background: C.accent,
                      display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
                      opacity: loading ? 0.8 : 1,
                    }}>
                      {loading ? <Spinner /> : <>Sign in <IconArrow /></>}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <p style={{ fontSize: "14px", color: C.textMuted, marginBottom: "22px", lineHeight: 1.5 }}>
                    Start your 7-day free trial. No credit card required.
                  </p>

                  {error && <div style={{
                    padding: "10px 14px", marginBottom: "16px", borderRadius: "9px",
                    fontSize: "13px", color: C.error, background: C.errorBg, border: `1px solid ${C.errorBorder}`,
                  }}>{error}</div>}

                  <form onSubmit={handleSubmit}>
                    <Input icon={IconBuilding} label="Company name" required
                      placeholder="e.g., Sparkle Clean Services" value={company}
                      onChange={e => setCompany(e.target.value)} autoComplete="organization" />
                    <Input icon={IconUser} label="Your name" required
                      placeholder="e.g., Aisha Khan" value={name}
                      onChange={e => setName(e.target.value)} autoComplete="name" />
                    <Input icon={IconMail} label="Work email" type="email" required
                      placeholder="name@company.com" value={email}
                      onChange={e => setEmail(e.target.value)} autoComplete="email" />
                    <Input icon={IconLock} label="Password" required
                      placeholder="Create a password" value={password}
                      onChange={e => setPassword(e.target.value)} autoComplete="new-password" showToggle />
                    <Input icon={IconLock} label="Confirm password" required
                      placeholder="Confirm your password" value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)} autoComplete="new-password" showToggle />

                    <button type="submit" disabled={loading} className="submit-btn" style={{
                      width:"100%", height:"46px", border:"none", borderRadius:"10px",
                      fontSize:"14px", fontWeight:600, color:"#fff", cursor: loading?"wait":"pointer",
                      background: C.accent,
                      display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
                      opacity: loading ? 0.8 : 1,
                    }}>
                      {loading ? <Spinner /> : <>Create account <IconArrow /></>}
                    </button>

                    <p style={{ fontSize:"11.5px", color:C.textDim, textAlign:"center", marginTop:"14px", lineHeight:1.6 }}>
                      By creating an account you agree to our{" "}
                      <a href="#" className="link-a" style={{ fontSize:"11.5px" }}>Terms</a> and{" "}
                      <a href="#" className="link-a" style={{ fontSize:"11.5px" }}>Privacy Policy</a>
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* ── RIGHT: Platform showcase ── */}
          <div className="auth-right-panel" style={{
            flex: 1, padding: "44px 40px",
            background: "linear-gradient(160deg, #F8FAFF 0%, #F0F4FF 40%, #F5F0FF 100%)",
            display: "flex", flexDirection: "column", justifyContent: "center",
            position: "relative", overflow: "hidden",
          }}>
            {/* Decorative shapes */}
            <div style={{
              position: "absolute", top: "-80px", right: "-80px",
              width: "220px", height: "220px", borderRadius: "50%",
              background: "radial-gradient(circle, rgba(37,99,235,0.05), transparent 70%)",
            }} />
            <div style={{
              position: "absolute", bottom: "-60px", left: "-60px",
              width: "180px", height: "180px", borderRadius: "50%",
              background: "radial-gradient(circle, rgba(124,58,237,0.04), transparent 70%)",
            }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              {/* Headline */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "4px 12px 4px 8px", borderRadius: "20px",
                background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.1)",
                marginBottom: "20px",
              }}>
                <div style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: C.accent, boxShadow: `0 0 6px rgba(37,99,235,0.4)`,
                }} />
                <span style={{ fontSize: "12px", color: C.accent, fontWeight: 600, letterSpacing: "0.02em" }}>
                  Operational proof platform
                </span>
              </div>

              <h2 style={{
                fontSize: "26px", fontWeight: 700, color: C.text,
                lineHeight: 1.25, letterSpacing: "-0.025em", marginBottom: "8px",
              }}>
                If it's not proven,<br />
                <span style={{ color: C.accent }}>it didn't happen.</span>
              </h2>
              <p style={{ fontSize: "14px", color: C.textMuted, lineHeight: 1.6, marginBottom: "32px", maxWidth: "380px" }}>
                Every job verified. Every report audit‑ready. Full operational transparency for service teams.
              </p>

              {/* Proof chain */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "32px" }}>
                {proofSteps.map((s, i) => (
                  <div key={i} className="proof-card" style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "12px 14px", borderRadius: "12px",
                    background: "rgba(255,255,255,0.5)",
                    cursor: "default",
                  }}>
                    <div style={{
                      width: "38px", height: "38px", borderRadius: "10px",
                      background: s.color, display: "flex", alignItems: "center",
                      justifyContent: "center", flexShrink: 0,
                    }}>
                      {s.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: 600, color: C.text }}>{s.title}</div>
                      <div style={{ fontSize: "12.5px", color: C.textMuted, marginTop: "1px" }}>{s.desc}</div>
                    </div>
                    {i < proofSteps.length - 1 && (
                      <div style={{ marginLeft: "auto", color: C.textDim, fontSize: "11px", opacity: 0.5 }}>→</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Products row */}
              <div style={{
                paddingTop: "20px", borderTop: `1px solid rgba(0,0,0,0.06)`,
                display: "flex", gap: "12px", alignItems: "center",
              }}>
                <span style={{ fontSize: "12px", color: C.textDim, fontWeight: 500 }}>Products:</span>
                {[
                  { name: "CleanProof", color: C.blue, bg: C.blueLight },
                  { name: "MaintainProof", color: C.green, bg: C.greenLight },
                ].map((p, i) => (
                  <div key={i} style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "5px 12px", borderRadius: "8px",
                    background: p.bg, fontSize: "12px", fontWeight: 600, color: p.color,
                  }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "2px", background: p.color }} />
                    {p.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          position: "fixed", bottom: "14px", left: 0, right: 0, textAlign: "center",
          fontSize: "11.5px", color: C.textDim,
        }}>
          © 2026 Proof Platform ·{" "}
          <a href="#" style={{ color: C.textMuted, textDecoration: "none" }}>Privacy</a>{" · "}
          <a href="#" style={{ color: C.textMuted, textDecoration: "none" }}>Terms</a>
        </div>
      </div>
    </>
  );
}
