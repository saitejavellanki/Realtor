import { useState } from "react";
import { FiArrowRight, FiEye, FiEyeOff, FiLock, FiMail } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { api, saveToken } from "../api";

export default function Login() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(email, password);
      saveToken(data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      {/* LEFT — branding panel */}
      <div style={s.left}>
        <div style={s.leftInner}>
          <div style={s.brand}>
            <div style={s.brandIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 9.5L12 3l9 6.5V21H3V9.5z" fill="#fff" opacity="0.9" />
                <path d="M9 21v-7h6v7" fill="rgba(255,255,255,0.5)" />
              </svg>
            </div>
            <span style={s.brandName}>PropAdmin</span>
          </div>

          <div style={s.hero}>
            <h1 style={s.heroTitle}>Manage your<br />properties<br />with confidence.</h1>
            <p style={s.heroSub}>The professional real estate admin console for tracking listings, pricing, agents, and performance — all in one place.</p>
          </div>

          <div style={s.statsRow}>
            {[
              { val: "150+", label: "Properties" },
              { val: "98%", label: "Uptime" },
              { val: "24/7", label: "Support" },
            ].map(({ val, label }) => (
              <div key={label} style={s.stat}>
                <div style={s.statVal}>{val}</div>
                <div style={s.statLabel}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — form panel */}
      <div style={s.right}>
        <div style={s.formCard}>
          <div style={s.formHeader}>
            <h2 style={s.formTitle}>Sign in to Admin</h2>
            <p style={s.formSub}>Enter your credentials to continue</p>
          </div>

          {error && (
            <div style={s.errorBanner}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="#b91c1c" style={{ flexShrink: 0 }}>
                <path fillRule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={s.form}>
            {/* Email */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Email address</label>
              <div style={s.inputWrap}>
                <FiMail size={15} style={s.inputIcon} />
                <input
                  type="email"
                  placeholder="admin@realestate.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={s.input}
                />
              </div>
            </div>

            {/* Password */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Password</label>
              <div style={s.inputWrap}>
                <FiLock size={15} style={s.inputIcon} />
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ ...s.input, paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={s.eyeBtn}>
                  {showPwd ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ ...s.submitBtn, ...(loading ? s.submitDisabled : {}) }}>
              {loading ? (
                <>
                  <span style={s.spinner} />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <FiArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div style={s.hint}>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>Default: admin@realestate.com / admin123</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { display: "flex", height: "100vh", fontFamily: "'Inter', sans-serif" },

  /* Left */
  left: {
    flex: "0 0 440px",
    background: "linear-gradient(145deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
    position: "relative",
    overflow: "hidden",
  },
  leftInner: { position: "relative", zIndex: 1, width: "100%" },
  brand: { display: "flex", alignItems: "center", gap: 10, marginBottom: 64 },
  brandIcon: {
    width: 42, height: 42, borderRadius: 12,
    background: "rgba(59,130,246,0.25)", border: "1px solid rgba(59,130,246,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  brandName: { fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" },
  hero: { marginBottom: 56 },
  heroTitle: { fontSize: 38, fontWeight: 800, color: "#fff", lineHeight: 1.2, letterSpacing: "-1px", marginBottom: 18 },
  heroSub: { fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, maxWidth: 320 },
  statsRow: { display: "flex", gap: 0 },
  stat: { flex: 1, borderRight: "1px solid rgba(255,255,255,0.1)", paddingRight: 20, paddingLeft: 0 },
  statVal: { fontSize: 24, fontWeight: 800, color: "#60a5fa", letterSpacing: "-0.5px" },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" },

  /* Right */
  right: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f8fafc",
    padding: "40px",
  },
  formCard: {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    borderRadius: 20,
    padding: "40px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)",
    border: "1px solid #e2e8f0",
  },
  formHeader: { marginBottom: 28 },
  formTitle: { fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" },
  formSub: { fontSize: 14, color: "#94a3b8", marginTop: 6 },

  errorBanner: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#fef2f2", color: "#b91c1c",
    padding: "11px 14px", borderRadius: 10,
    fontSize: 13, marginBottom: 20,
    border: "1px solid #fecaca",
  },

  form: { display: "flex", flexDirection: "column", gap: 18 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: "#475569", letterSpacing: "0.3px" },
  inputWrap: { position: "relative", display: "flex", alignItems: "center" },
  inputIcon: { position: "absolute", left: 14, color: "#94a3b8", pointerEvents: "none" },
  input: {
    width: "100%", height: 46, paddingLeft: 40, paddingRight: 14,
    border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14,
    color: "#0f172a", background: "#f8fafc", outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  eyeBtn: {
    position: "absolute", right: 12, background: "none",
    border: "none", color: "#94a3b8", cursor: "pointer",
    display: "flex", alignItems: "center",
  },
  submitBtn: {
    height: 48, borderRadius: 12,
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    color: "#fff", border: "none", fontSize: 15, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    cursor: "pointer", marginTop: 4,
    boxShadow: "0 8px 24px rgba(59,130,246,0.35)",
    transition: "opacity 0.2s",
  },
  submitDisabled: { opacity: 0.6, cursor: "not-allowed" },
  spinner: {
    width: 16, height: 16,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
  hint: { textAlign: "center", marginTop: 20 },
};