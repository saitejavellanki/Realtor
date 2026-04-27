import { FiBell } from "react-icons/fi";
import { useLocation } from "react-router-dom";

const PAGE_META = {
  "/dashboard": { title: "Dashboard", sub: "Overview & analytics" },
  "/properties": { title: "Properties", sub: "Manage all listings" },
  "/add-property": { title: "Add Property", sub: "Create a new listing" },
};

export default function Header() {
  const { pathname } = useLocation();
  const meta = PAGE_META[pathname] || { title: "Admin", sub: "" };

  return (
    <header style={s.header}>
      <div style={s.left}>
        <h1 style={s.title}>{meta.title}</h1>
        <p style={s.sub}>{meta.sub}</p>
      </div>
      <div style={s.right}>
        <button style={s.bell} aria-label="Notifications">
          <FiBell size={17} />
          <span style={s.notifDot} />
        </button>
        <div style={s.adminBadge}>
          <div style={s.adminDot} />
          <span style={s.adminText}>admin@realestate.com</span>
        </div>
      </div>
    </header>
  );
}

const s = {
  header: {
    height: 64,
    background: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 28px",
    flexShrink: 0,
  },
  left: {},
  title: { fontSize: 18, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" },
  sub: { fontSize: 12, color: "#94a3b8", marginTop: 1 },
  right: { display: "flex", alignItems: "center", gap: 14 },
  bell: {
    width: 36, height: 36, borderRadius: 10,
    background: "#f8fafc", border: "1px solid #e2e8f0",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "#64748b", position: "relative",
  },
  notifDot: {
    position: "absolute", top: 7, right: 7,
    width: 7, height: 7, borderRadius: "50%",
    background: "#ef4444", border: "1.5px solid #fff",
  },
  adminBadge: {
    display: "flex", alignItems: "center", gap: 7,
    background: "#f8fafc", border: "1px solid #e2e8f0",
    padding: "6px 12px", borderRadius: 10,
  },
  adminDot: { width: 7, height: 7, borderRadius: "50%", background: "#10b981", flexShrink: 0 },
  adminText: { fontSize: 12.5, fontWeight: 600, color: "#374151" },
};