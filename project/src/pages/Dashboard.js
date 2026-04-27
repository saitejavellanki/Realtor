import { useEffect, useState } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiHome,
  FiMapPin,
  FiTrendingUp,
  FiUser,
  FiShield,
  FiFileText,
  FiPercent,
  FiAlertTriangle,
} from "react-icons/fi";
import { api } from "../api";

const STATUS_COLORS = {
  Available: { bg: "#d1fae5", text: "#059669" },
  Sold: { bg: "#ede9fe", text: "#7c3aed" },
  Reserved: { bg: "#fef3c7", text: "#d97706" },
  Draft: { bg: "#f1f5f9", text: "#64748b" },
  Pending: { bg: "#fef3c7", text: "#d97706" },
};

const VISIT_STATUS_COLORS = {
  Pending: { bg: "#fef3c7", text: "#d97706" },
  Confirmed: { bg: "#d1fae5", text: "#059669" },
  Cancelled: { bg: "#fee2e2", text: "#dc2626" },
};

function KpiCard({ icon: Icon, color, bgColor, label, value, sub, trend }) {
  return (
    <div style={{ ...s.kpi, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ ...s.kpiIconWrap, background: bgColor }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend !== undefined && (
          <span style={{ ...s.trend, color: trend >= 0 ? "#10b981" : "#ef4444" }}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={s.kpiValue}>{value ?? "--"}</div>
      <div style={s.kpiLabel}>{label}</div>
      {sub && <div style={s.kpiSub}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [transparency, setTransparency] = useState(null);
  const [byStatus, setByStatus] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [visits, setVisits] = useState([]);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    api.getDashboard()
      .then((data) => {
        setStats(data.summary);
        setTransparency(data.transparency || null);
        setByStatus(data.byStatus || []);
        setRecent(data.recentActivity || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    api.getVisitRequests()
      .then((data) => setVisits(data || []))
      .catch(() => { })
      .finally(() => setVisitsLoading(false));
  }, []);

  const handleVisitStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await api.updateVisitStatus(id, status);
      setVisits(prev => prev.map(v => v.id === id ? { ...v, status } : v));
    } catch { /* ignore */ }
    setUpdatingId(null);
  };

  const getCount = (status) => byStatus.find((s) => s.status === status)?.count || 0;

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const totalProps = stats?.totalProperties ?? 0;
  const available = getCount("Available");
  const sold = getCount("Sold");
  const avgPrice = stats?.avgPricePerSqft;
  const pendingVisits = visits.filter(v => v.status === "Pending").length;

  return (
    <div style={s.page}>
      {/* KPI Row */}
      <div style={s.kpiGrid}>
        <KpiCard icon={FiHome} color="#3b82f6" bgColor="#eff6ff" label="Total Properties" value={totalProps} sub="All time listings" trend={12} />
        <KpiCard icon={FiCheckCircle} color="#10b981" bgColor="#d1fae5" label="Available" value={available} sub={`${((available / Math.max(totalProps, 1)) * 100).toFixed(0)}% of total`} trend={4} />
        <KpiCard icon={FiTrendingUp} color="#8b5cf6" bgColor="#ede9fe" label="Sold" value={sold} sub="Completed deals" trend={-2} />
        <KpiCard icon={FiDollarSign} color="#f59e0b" bgColor="#fef3c7" label="Avg Price / sqft" value={avgPrice ? `Rs. ${Number(avgPrice).toLocaleString()}` : "--"} sub="Across all listings" />
      </div>

      {/* Transparency Overview */}
      {transparency && (
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span style={s.cardTitle}>Transparency Overview (POC)</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, padding: 22 }}>
            <TransparencyTile icon={FiShield} color="#059669" bg="#d1fae5" label="Verified" value={transparency.verified ?? 0} />
            <TransparencyTile icon={FiFileText} color="#3b82f6" bg="#eff6ff" label="With RERA" value={transparency.with_rera ?? 0} />
            <TransparencyTile icon={FiTrendingUp} color="#8b5cf6" bg="#ede9fe" label="Dual Rate Disclosed" value={transparency.with_dual_rate ?? 0} />
            <TransparencyTile icon={FiAlertTriangle} color="#d97706" bg="#fef3c7" label="Unverified" value={transparency.unverified ?? 0} />
            <TransparencyTile icon={FiPercent} color="#FF385C" bg="#ffe4e9" label="Avg Market Premium" value={transparency.avg_market_premium != null ? `${transparency.avg_market_premium}%` : "—"} />
          </div>
        </div>
      )}

      {/* Status breakdown + Recent */}
      <div style={s.mid}>
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span style={s.cardTitle}>Status Breakdown</span>
          </div>
          <div style={s.statusList}>
            {["Available", "Sold", "Reserved", "Draft"].map((status) => {
              const count = getCount(status);
              const pct = totalProps ? Math.round((count / totalProps) * 100) : 0;
              const col = STATUS_COLORS[status] || { bg: "#f1f5f9", text: "#64748b" };
              return (
                <div key={status} style={s.statusRow}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 100 }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: col.text }} />
                    <span style={s.statusName}>{status}</span>
                  </div>
                  <div style={s.barWrap}>
                    <div style={{ ...s.bar, width: `${pct}%`, background: col.text }} />
                  </div>
                  <div style={s.statusMeta}>
                    <span style={{ fontWeight: 700, color: "#0f172a" }}>{count}</span>
                    <span style={{ color: "#94a3b8", fontSize: 11 }}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ ...s.card, flex: 1 }}>
          <div style={s.cardHeader}>
            <span style={s.cardTitle}>Recent Listings</span>
            <a href="/properties" style={s.viewAll}>View all &rarr;</a>
          </div>
          <div style={s.recentList}>
            {recent.length === 0 && <div style={s.empty}>No recent activity</div>}
            {recent.map((item) => {
              const col = STATUS_COLORS[item.status] || STATUS_COLORS.Draft;
              return (
                <div key={item.id} style={s.recentRow}>
                  <div style={s.recentIcon}>
                    <FiHome size={14} style={{ color: "#3b82f6" }} />
                  </div>
                  <div style={s.recentBody}>
                    <div style={s.recentTitle}>{item.title || item.plot_id}</div>
                    <div style={s.recentMeta}>
                      <FiMapPin size={10} style={{ color: "#94a3b8" }} />
                      <span>{item.area || "—"}</span>
                      <FiClock size={10} style={{ color: "#94a3b8", marginLeft: 6 }} />
                      <span>{new Date(item.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span style={{ ...s.badge, background: col.bg, color: col.text }}>{item.status}</span>
                    <span style={s.price}>Rs. {Number(item.price_per_sqft || 0).toLocaleString()}/sqft</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Visit Requests */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ ...s.kpiIconWrap, width: 32, height: 32, background: "#eff6ff", marginBottom: 0 }}>
              <FiCalendar size={15} style={{ color: "#3b82f6" }} />
            </div>
            <span style={s.cardTitle}>Visit Requests</span>
            {pendingVisits > 0 && (
              <span style={{ ...s.badge, background: "#fef3c7", color: "#d97706", fontSize: 11 }}>
                {pendingVisits} pending
              </span>
            )}
          </div>
        </div>

        {visitsLoading ? (
          <div style={s.empty}>Loading visit requests...</div>
        ) : visits.length === 0 ? (
          <div style={s.empty}>No visit requests yet</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Property", "Visitor", "Date & Time", "Message", "Status", "Actions"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => {
                  const vc = VISIT_STATUS_COLORS[v.status] || VISIT_STATUS_COLORS.Pending;
                  return (
                    <tr key={v.id} style={s.tr}>
                      <td style={s.td}>
                        <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{v.property_title}</div>
                        <div style={{ color: "#94a3b8", fontSize: 11 }}>{v.plot_id} &middot; {v.property_area}</div>
                      </td>
                      <td style={s.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <FiUser size={13} style={{ color: "#3b82f6" }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{v.visitor_name}</div>
                            {v.user_email && <div style={{ fontSize: 11, color: "#94a3b8" }}>{v.user_email}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={s.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <FiCalendar size={12} style={{ color: "#64748b" }} />
                          <span style={{ fontSize: 13, color: "#374151" }}>{v.visit_date}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                          <FiClock size={11} style={{ color: "#94a3b8" }} />
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>{v.visit_time}</span>
                        </div>
                      </td>
                      <td style={{ ...s.td, maxWidth: 180 }}>
                        <div style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {v.message || "—"}
                        </div>
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: vc.bg, color: vc.text }}>{v.status}</span>
                      </td>
                      <td style={s.td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {v.status !== "Confirmed" && (
                            <button
                              disabled={updatingId === v.id}
                              onClick={() => handleVisitStatus(v.id, "Confirmed")}
                              style={{ ...s.actionBtn, background: "#d1fae5", color: "#059669", borderColor: "#a7f3d0" }}
                            >
                              Confirm
                            </button>
                          )}
                          {v.status !== "Cancelled" && (
                            <button
                              disabled={updatingId === v.id}
                              onClick={() => handleVisitStatus(v.id, "Cancelled")}
                              style={{ ...s.actionBtn, background: "#fee2e2", color: "#dc2626", borderColor: "#fecaca" }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TransparencyTile({ icon: Icon, color, bg, label, value }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, background: "#fff" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={s.kpiGrid}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ ...s.kpi, background: "#fff" }}>
            <div style={{ ...s.skeleton, width: 42, height: 42, borderRadius: 12, marginBottom: 16 }} />
            <div style={{ ...s.skeleton, width: "60%", height: 28, marginBottom: 8 }} />
            <div style={{ ...s.skeleton, width: "80%", height: 14 }} />
          </div>
        ))}
      </div>
      <div style={s.mid}>
        <div style={{ ...s.card, height: 300 }}>
          <div style={{ ...s.skeleton, width: "50%", height: 18, margin: "20px" }} />
        </div>
        <div style={{ ...s.card, flex: 1, height: 300 }}>
          <div style={{ ...s.skeleton, width: "50%", height: 18, margin: "20px" }} />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 24, color: "#b91c1c", fontSize: 14 }}>
      Error: {message}
    </div>
  );
}

const s = {
  page: { display: "flex", flexDirection: "column", gap: 24 },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 },
  kpi: { borderRadius: 16, padding: 22, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column" },
  kpiIconWrap: { width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  kpiValue: { fontSize: 28, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px", marginBottom: 4 },
  kpiLabel: { fontSize: 13, fontWeight: 600, color: "#475569" },
  kpiSub: { fontSize: 11, color: "#94a3b8", marginTop: 4 },
  trend: { fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#f0fdf4" },

  mid: { display: "flex", gap: 20 },
  card: { background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #f1f5f9" },
  cardTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a" },
  viewAll: { fontSize: 12, color: "#3b82f6", fontWeight: 600 },

  statusList: { padding: "16px 22px", display: "flex", flexDirection: "column", gap: 16, minWidth: 280 },
  statusRow: { display: "flex", alignItems: "center", gap: 12 },
  statusName: { fontSize: 13, fontWeight: 500, color: "#374151" },
  barWrap: { flex: 1, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 3, transition: "width 0.5s ease" },
  statusMeta: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, minWidth: 44 },

  recentList: { padding: "8px 0", display: "flex", flexDirection: "column" },
  recentRow: { display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", borderBottom: "1px solid #f8fafc", transition: "background 0.15s" },
  recentIcon: { width: 36, height: 36, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  recentBody: { flex: 1, minWidth: 0 },
  recentTitle: { fontSize: 13.5, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  recentMeta: { display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#94a3b8", marginTop: 3 },
  badge: { fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, letterSpacing: "0.2px" },
  price: { fontSize: 11, fontWeight: 600, color: "#64748b" },
  empty: { padding: "24px 22px", color: "#94a3b8", fontSize: 13, textAlign: "center" },

  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 22px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" },
  tr: { borderBottom: "1px solid #f8fafc" },
  td: { padding: "12px 22px", verticalAlign: "middle" },
  actionBtn: { padding: "4px 10px", borderRadius: 8, border: "1px solid", fontSize: 11, fontWeight: 600, cursor: "pointer" },

  skeleton: { background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", borderRadius: 8 },
};