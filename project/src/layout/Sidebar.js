import { useState } from "react";
import {
  FiCalendar, FiChevronRight,
  FiGrid, FiHome, FiLogOut, FiMap,
  FiPlusCircle, FiUsers, FiX,
} from "react-icons/fi";
import { NavLink, useNavigate } from "react-router-dom";

const NAV = [
  { to: "/dashboard",   icon: FiGrid,       label: "Dashboard" },
  { to: "/properties",  icon: FiHome,       label: "Properties" },
  { to: "/map",         icon: FiMap,        label: "Map View" },
  { to: "/add-property",icon: FiPlusCircle, label: "Add Property" },
  { to: "/developers",  icon: FiUsers,      label: "Developers" },
  { to: "/visits",      icon: FiCalendar,   label: "Visit Requests" },
];

export default function Sidebar({ isMobile, isOpen, onClose }) {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    setLoggingOut(true);
    localStorage.removeItem("re_admin_token");
    sessionStorage.clear();
    setTimeout(() => navigate("/"), 800);
  };

  const sidebarStyle = isMobile
    ? {
        ...s.sidebar,
        position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 100,
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: isOpen ? "4px 0 24px rgba(0,0,0,0.18)" : "none",
      }
    : s.sidebar;

  return (
    <aside style={sidebarStyle}>
      {/* Logo */}
      <div style={s.logoSection}>
        <div style={s.logoIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 9.5L12 3l9 6.5V21H3V9.5z" fill="#3b82f6" opacity="0.9" />
            <path d="M9 21v-6h6v6" fill="#1e40af" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={s.logoName}>Realtor (Admin)</div>
          <div style={s.logoSub}>Real Estate Console</div>
        </div>
        {isMobile && (
          <button onClick={onClose} style={s.closeBtn} aria-label="Close menu">
            <FiX size={18} />
          </button>
        )}
      </div>

      <div style={s.divider} />
      <div style={s.navSection}>MAIN MENU</div>

      <nav style={s.nav}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={isMobile ? onClose : undefined}
            style={({ isActive }) => ({
              ...s.navItem,
              ...(isActive ? s.navItemActive : {}),
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{ ...s.navIcon, ...(isActive ? s.navIconActive : {}) }}>
                  <Icon size={17} />
                </span>
                <span style={s.navLabel}>{label}</span>
                {isActive && <FiChevronRight size={13} style={{ marginLeft: "auto", opacity: 0.5 }} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={{ flex: 1 }} />
      <div style={s.divider} />

      <div style={s.adminCard}>
        <div style={s.adminAvatar}>A</div>
        <div style={s.adminInfo}>
          <div style={s.adminName}>Admin</div>
          <div style={s.adminRole}>Super Admin</div>
        </div>
      </div>

      <div
        style={{ ...s.logout, ...(loggingOut ? s.logoutDisabled : {}) }}
        onClick={!loggingOut ? handleLogout : undefined}
      >
        <FiLogOut size={15} />
        <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
      </div>
    </aside>
  );
}

const s = {
  sidebar: {
    width: 240, minWidth: 240, height: "100vh",
    background: "#0f172a", display: "flex", flexDirection: "column",
    padding: "0 12px 20px", overflowY: "auto", flexShrink: 0,
  },
  logoSection: {
    display: "flex", alignItems: "center", gap: 11, padding: "20px 8px 16px",
  },
  logoIcon: {
    width: 38, height: 38, borderRadius: 10,
    background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  logoName: { fontSize: 14, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.3px" },
  logoSub: { fontSize: 10, color: "#475569", fontWeight: 500, marginTop: 1 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.08)",
    border: "none", color: "#94a3b8", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  divider: { height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" },
  navSection: {
    fontSize: 10, fontWeight: 700, color: "#64748b",
    letterSpacing: "1px", padding: "12px 10px 8px",
  },
  nav: { display: "flex", flexDirection: "column", gap: 2 },
  navItem: {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 10px",
    borderRadius: 10, color: "#94a3b8", fontWeight: 500, fontSize: 13.5,
    transition: "all 0.18s", textDecoration: "none", cursor: "pointer",
  },
  navItemActive: { background: "rgba(59,130,246,0.12)", color: "#60a5fa" },
  navIcon: {
    width: 30, height: 30, display: "flex", alignItems: "center",
    justifyContent: "center", borderRadius: 8,
    background: "rgba(255,255,255,0.04)", flexShrink: 0,
  },
  navIconActive: { background: "rgba(59,130,246,0.18)", color: "#60a5fa" },
  navLabel: { flex: 1 },
  adminCard: { display: "flex", alignItems: "center", gap: 10, padding: "12px 10px", marginTop: 8 },
  adminAvatar: {
    width: 34, height: 34, borderRadius: "50%",
    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    color: "#fff", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0,
  },
  adminInfo: { flex: 1, minWidth: 0 },
  adminName: { fontSize: 13, fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  adminRole: { fontSize: 11, color: "#475569", marginTop: 1 },
  logout: {
    display: "flex", alignItems: "center", gap: 8, padding: "10px 10px",
    borderRadius: 10, color: "#ef4444", fontSize: 13.5, fontWeight: 500,
    cursor: "pointer", transition: "background 0.18s", marginTop: 4,
  },
  logoutDisabled: { opacity: 0.5, cursor: "not-allowed" },
};
