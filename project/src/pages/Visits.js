import { useCallback, useEffect, useState } from "react";
import {
    FiCalendar, FiCheck, FiClock, FiMail,
    FiRefreshCw, FiUser, FiX,
} from "react-icons/fi";
import { api } from "../api";

const STATUS_COLORS = {
    Pending: { bg: "#fef3c7", color: "#d97706" },
    Confirmed: { bg: "#d1fae5", color: "#059669" },
    Cancelled: { bg: "#fee2e2", color: "#dc2626" },
};

export default function Visits() {
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState(null);
    const [filter, setFilter] = useState("All");

    const load = useCallback(() => {
        setLoading(true);
        api.getVisitRequests()
            .then((data) => { setVisits(data || []); setError(""); })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleStatus = async (id, status) => {
        setUpdatingId(id);
        try {
            await api.updateVisitStatus(id, status);
            setVisits(prev => prev.map(v => v.id === id ? { ...v, status } : v));
        } catch { /* ignore */ }
        setUpdatingId(null);
    };

    const filtered = filter === "All" ? visits : visits.filter(v => v.status === filter);
    const counts = {
        All: visits.length,
        Pending: visits.filter(v => v.status === "Pending").length,
        Confirmed: visits.filter(v => v.status === "Confirmed").length,
        Cancelled: visits.filter(v => v.status === "Cancelled").length,
    };

    return (
        <div style={s.page}>
            {/* Header */}
            <div style={s.header}>
                <div>
                    <h2 style={s.title}>Visit Requests</h2>
                    <p style={s.subtitle}>Manage property visit requests from mobile users</p>
                </div>
                <button onClick={load} style={s.refreshBtn} title="Refresh">
                    <FiRefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Filter tabs */}
            <div style={s.filterRow}>
                {["All", "Pending", "Confirmed", "Cancelled"].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            ...s.filterBtn,
                            ...(filter === f ? s.filterBtnActive : {}),
                        }}
                    >
                        {f}
                        <span style={{
                            ...s.filterCount,
                            ...(filter === f ? s.filterCountActive : {}),
                        }}>
                            {counts[f]}
                        </span>
                    </button>
                ))}
            </div>

            {error && <div style={s.errorMsg}>⚠️ {error}</div>}

            {/* Table */}
            <div style={s.tableCard}>
                {loading ? (
                    <div style={s.empty}>Loading visit requests...</div>
                ) : filtered.length === 0 ? (
                    <div style={s.empty}>
                        {filter === "All" ? "No visit requests yet" : `No ${filter.toLowerCase()} requests`}
                    </div>
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
                                {filtered.map((v) => {
                                    const vc = STATUS_COLORS[v.status] || STATUS_COLORS.Pending;
                                    const dateStr = v.visit_date
                                        ? new Date(v.visit_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                                        : "—";
                                    return (
                                        <tr key={v.id} style={s.tr}>
                                            <td style={s.td}>
                                                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{v.property_title}</div>
                                                <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
                                                    {v.plot_id} · {v.property_area}
                                                </div>
                                            </td>
                                            <td style={s.td}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <div style={s.visitorAvatar}>
                                                        <FiUser size={13} style={{ color: "#3b82f6" }} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{v.visitor_name}</div>
                                                        {v.user_email && (
                                                            <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                                                                <FiMail size={10} /> {v.user_email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={s.td}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                                    <FiCalendar size={12} style={{ color: "#64748b" }} />
                                                    <span style={{ fontSize: 13, color: "#374151" }}>{dateStr}</span>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                                                    <FiClock size={11} style={{ color: "#94a3b8" }} />
                                                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{v.visit_time}</span>
                                                </div>
                                            </td>
                                            <td style={{ ...s.td, maxWidth: 200 }}>
                                                <div style={{ fontSize: 12, color: "#64748b", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                                                    {v.message || "—"}
                                                </div>
                                            </td>
                                            <td style={s.td}>
                                                <span style={{ ...s.badge, background: vc.bg, color: vc.color }}>
                                                    {v.status}
                                                </span>
                                            </td>
                                            <td style={s.td}>
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    {v.status !== "Confirmed" && (
                                                        <button
                                                            disabled={updatingId === v.id}
                                                            onClick={() => handleStatus(v.id, "Confirmed")}
                                                            style={{ ...s.actionBtn, background: "#d1fae5", color: "#059669", borderColor: "#a7f3d0" }}
                                                        >
                                                            <FiCheck size={12} /> Confirm
                                                        </button>
                                                    )}
                                                    {v.status !== "Cancelled" && (
                                                        <button
                                                            disabled={updatingId === v.id}
                                                            onClick={() => handleStatus(v.id, "Cancelled")}
                                                            style={{ ...s.actionBtn, background: "#fee2e2", color: "#dc2626", borderColor: "#fecaca" }}
                                                        >
                                                            <FiX size={12} /> Cancel
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

const s = {
    page: { display: "flex", flexDirection: "column", gap: 16 },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between" },
    title: { fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.3px" },
    subtitle: { fontSize: 13, color: "#94a3b8", marginTop: 4 },
    refreshBtn: {
        display: "flex", alignItems: "center", gap: 6,
        height: 38, padding: "0 16px", borderRadius: 10,
        border: "1.5px solid #e2e8f0", background: "#fff",
        color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer",
    },
    filterRow: { display: "flex", gap: 8 },
    filterBtn: {
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0",
        background: "#fff", color: "#64748b", fontSize: 13, fontWeight: 500,
        cursor: "pointer", transition: "all 0.15s",
    },
    filterBtnActive: {
        background: "#0f172a", color: "#fff", borderColor: "#0f172a",
    },
    filterCount: {
        fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 8,
        background: "#f1f5f9", color: "#64748b",
    },
    filterCountActive: {
        background: "rgba(255,255,255,0.2)", color: "#fff",
    },
    errorMsg: { fontSize: 13, color: "#ef4444", padding: "8px 0" },
    tableCard: {
        background: "#fff", borderRadius: 16,
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        overflow: "hidden",
    },
    table: { width: "100%", borderCollapse: "collapse", minWidth: 800 },
    th: {
        padding: "12px 16px", textAlign: "left",
        fontSize: 11, fontWeight: 700, color: "#64748b",
        textTransform: "uppercase", letterSpacing: "0.6px",
        background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
        whiteSpace: "nowrap",
    },
    tr: { borderBottom: "1px solid #f1f5f9", transition: "background 0.12s" },
    td: { padding: "14px 16px", verticalAlign: "middle" },
    badge: {
        display: "inline-flex", alignItems: "center",
        padding: "4px 10px", borderRadius: 20,
        fontSize: 11, fontWeight: 600,
    },
    visitorAvatar: {
        width: 32, height: 32, borderRadius: "50%",
        background: "#eff6ff", display: "flex",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    actionBtn: {
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "5px 12px", borderRadius: 8,
        fontSize: 12, fontWeight: 600, cursor: "pointer",
        border: "1px solid", transition: "opacity 0.15s",
    },
    empty: {
        padding: "40px 0", textAlign: "center",
        fontSize: 13, color: "#94a3b8",
    },
};
