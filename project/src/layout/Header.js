import { FiBell, FiMenu } from "react-icons/fi";
import { useLocation } from "react-router-dom";

const PAGE_META = {
  "/dashboard":    { title: "Dashboard",      sub: "Overview & analytics",        emoji: "📊" },
  "/properties":   { title: "Properties",     sub: "Manage all listings",          emoji: "🏠" },
  "/map":          { title: "Map View",        sub: "Properties on map",            emoji: "🗺️" },
  "/add-property": { title: "Add Property",   sub: "Create a new listing",         emoji: "➕" },
  "/developers":   { title: "Developers",     sub: "Developer registry",           emoji: "👥" },
  "/visits":       { title: "Visit Requests", sub: "Scheduled site visits",        emoji: "📅" },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export default function Header({ isMobile, onMenuClick }) {
  const { pathname } = useLocation();
  const meta = PAGE_META[pathname] || { title: "Admin", sub: "", emoji: "⚙️" };
  const isHome = pathname === "/dashboard";

  return (
    <header style={s.header}>
      <div style={s.left}>
        {isMobile && (
          <button onClick={onMenuClick} style={s.menuBtn} aria-label="Open menu">
            <FiMenu size={20} />
          </button>
        )}
        <div>
          {isHome && !isMobile && (
            <div style={s.greeting}>{getGreeting()}, Admin 👋</div>
          )}
          <h1 style={{ ...s.title, fontSize: isMobile ? 15 : 17 }}>
            {!isMobile && <span style={{ marginRight: 8 }}>{meta.emoji}</span>}
            {meta.title}
          </h1>
          {!isMobile && <p style={s.sub}>{meta.sub}</p>}
        </div>
      </div>

      <div style={s.right}>
        {!isMobile && (
          <div style={s.dateBadge}>
            <span style={s.dateText}>{formatDate()}</span>
          </div>
        )}
        <button style={s.bell} aria-label="Notifications">
          <FiBell size={16} />
          <span style={s.notifDot} />
        </button>
        {!isMobile && (
          <div style={s.adminBadge}>
            <div style={s.adminAvatar}>A</div>
            <div>
              <div style={s.adminName}>Admin</div>
              <div style={s.adminRole}>Super Admin</div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

const s = {
  header: {
    height: 66, background: "#ffffff",
    borderBottom: "1px solid #eef0f4",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 24px", flexShrink: 0,
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  left: { display: "flex", alignItems: "center", gap: 14 },
  menuBtn: {
    width: 38, height: 38, borderRadius: 10, background: "#f8fafc",
    border: "1px solid #e8ecf0", display: "flex", alignItems: "center",
    justifyContent: "center", cursor: "pointer", color: "#374151",
  },
  greeting: { fontSize: 11.5, color: "#94a3b8", fontWeight: 500, marginBottom: 1 },
  title: { fontWeight: 800, color: "#0f172a", letterSpacing: "-0.4px", margin: 0, display: "flex", alignItems: "center" },
  sub: { fontSize: 11.5, color: "#94a3b8", marginTop: 1 },

  right: { display: "flex", alignItems: "center", gap: 10 },
  dateBadge: {
    background: "#f8fafc", border: "1px solid #e8ecf0",
    borderRadius: 10, padding: "6px 12px",
  },
  dateText: { fontSize: 11.5, color: "#64748b", fontWeight: 600 },
  bell: {
    width: 38, height: 38, borderRadius: 10, background: "#f8fafc",
    border: "1px solid #e8ecf0", display: "flex", alignItems: "center",
    justifyContent: "center", cursor: "pointer", color: "#64748b", position: "relative",
  },
  notifDot: {
    position: "absolute", top: 8, right: 8,
    width: 7, height: 7, borderRadius: "50%",
    background: "#ef4444", border: "2px solid #fff",
  },
  adminBadge: {
    display: "flex", alignItems: "center", gap: 9,
    background: "#f8fafc", border: "1px solid #e8ecf0",
    padding: "6px 14px 6px 6px", borderRadius: 12,
    cursor: "pointer",
  },
  adminAvatar: {
    width: 30, height: 30, borderRadius: "50%",
    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    color: "#fff", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0,
  },
  adminName: { fontSize: 12.5, fontWeight: 700, color: "#0f172a" },
  adminRole: { fontSize: 10.5, color: "#94a3b8", marginTop: 0.5 },
};
