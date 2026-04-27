import { useCallback, useEffect, useState } from "react";
import {
    FiEdit2, FiPlus, FiRefreshCw, FiTrash2, FiX,
} from "react-icons/fi";
import { api } from "../api";

export default function Developers() {
    const [developers, setDevelopers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const blank = { name: "", rera_id: "", established: "", is_verified: false, website: "", description: "" };

    const load = useCallback(() => {
        setLoading(true);
        api.getDevelopers()
            .then(setDevelopers)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    const openDrawer = (item) => { setSelected(item ? { ...item } : { ...blank }); setIsOpen(true); };
    const closeDrawer = () => { setIsOpen(false); setSelected(null); };

    const handleSave = async () => {
        if (!selected || !selected.name) return;
        setSaving(true);
        try {
            if (selected.id) {
                await api.updateDeveloper(selected.id, selected);
            } else {
                await api.createDeveloper(selected);
            }
            closeDrawer();
            load();
        } catch (err) {
            alert("Save failed: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this developer?")) return;
        setDeleteId(id);
        try { await api.deleteDeveloper(id); load(); }
        catch (err) { alert("Delete failed: " + err.message); }
        finally { setDeleteId(null); }
    };

    const upd = (key, val) => setSelected(prev => ({ ...prev, [key]: val }));

    return (
        <div style={s.page}>
            <div style={s.toolbar}>
                <h2 style={s.heading}>Developers</h2>
                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={load} style={s.refreshBtn} title="Refresh"><FiRefreshCw size={14} /></button>
                    <button onClick={() => openDrawer(null)} style={s.addBtn}><FiPlus size={15} /> Add Developer</button>
                </div>
            </div>

            {error && <div style={s.errorMsg}>Error: {error}</div>}

            <div style={s.tableCard}>
                <div style={{ overflowX: "auto" }}>
                    <table style={s.table}>
                        <thead>
                            <tr>
                                {["Name", "RERA ID", "Est.", "Verified", "Properties", "Website", "Actions"].map(h => (
                                    <th key={h} style={s.th}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                                        <td key={j} style={s.td}><div style={{ ...s.skeleton, height: 14, width: 60, borderRadius: 6 }} /></td>
                                    ))}</tr>
                                ))
                            ) : developers.length === 0 ? (
                                <tr><td colSpan={7} style={{ ...s.td, textAlign: "center", padding: 36, color: "#94a3b8" }}>No developers found.</td></tr>
                            ) : developers.map((d) => (
                                <tr key={d.id} style={s.tr}>
                                    <td style={{ ...s.td, fontWeight: 600, color: "#0f172a" }}>{d.name}</td>
                                    <td style={{ ...s.td, fontSize: 11, fontFamily: "monospace", color: d.rera_id ? "#0f172a" : "#cbd5e1" }}>{d.rera_id || "—"}</td>
                                    <td style={{ ...s.td, fontSize: 12, color: "#64748b" }}>{d.established || "—"}</td>
                                    <td style={s.td}>
                                        {d.is_verified
                                            ? <span style={{ ...s.badge, background: "#d1fae5", color: "#059669" }}>Verified</span>
                                            : <span style={{ ...s.badge, background: "#fef3c7", color: "#d97706" }}>Unverified</span>}
                                    </td>
                                    <td style={{ ...s.td, fontWeight: 600 }}>{d.property_count ?? 0}</td>
                                    <td style={{ ...s.td, fontSize: 11, color: "#3b82f6", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {d.website ? <a href={d.website} target="_blank" rel="noreferrer" style={{ color: "#3b82f6" }}>{d.website}</a> : "—"}
                                    </td>
                                    <td style={s.td}>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button onClick={() => openDrawer(d)} style={s.editBtn} title="Edit"><FiEdit2 size={13} /></button>
                                            <button onClick={() => handleDelete(d.id)} disabled={deleteId === d.id}
                                                style={{ ...s.delBtn, opacity: deleteId === d.id ? 0.5 : 1 }} title="Delete"><FiTrash2 size={13} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isOpen && <div onClick={closeDrawer} style={s.overlay} />}

            <div style={{ ...s.drawer, transform: isOpen ? "translateX(0)" : "translateX(100%)" }}>
                {selected && (
                    <>
                        <div style={s.drawerHeader}>
                            <div style={s.drawerTitle}>{selected.id ? "Edit Developer" : "New Developer"}</div>
                            <button onClick={closeDrawer} style={s.closeBtn}><FiX size={16} /></button>
                        </div>
                        <div style={s.drawerBody}>
                            <Field label="Name *"><input style={s.fi} value={selected.name} onChange={e => upd("name", e.target.value)} /></Field>
                            <Field label="RERA ID"><input style={s.fi} value={selected.rera_id || ""} onChange={e => upd("rera_id", e.target.value)} /></Field>
                            <div style={s.grid2}>
                                <Field label="Established"><input style={s.fi} type="number" value={selected.established || ""} onChange={e => upd("established", e.target.value)} /></Field>
                                <Field label="Website"><input style={s.fi} value={selected.website || ""} onChange={e => upd("website", e.target.value)} /></Field>
                            </div>
                            <Field label="Description">
                                <textarea style={{ ...s.fi, height: 80, paddingTop: 10, resize: "vertical" }} value={selected.description || ""} onChange={e => upd("description", e.target.value)} />
                            </Field>
                            <div style={s.checkRow}>
                                <label style={s.checkLabel}>
                                    <input type="checkbox" checked={!!selected.is_verified} onChange={e => upd("is_verified", e.target.checked)} style={{ accentColor: "#059669" }} />
                                    <span>Mark as verified</span>
                                </label>
                            </div>
                        </div>
                        <div style={s.drawerFooter}>
                            <button onClick={closeDrawer} style={s.cancelBtn}>Cancel</button>
                            <button onClick={handleSave} disabled={saving} style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}>
                                {saving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>{label}</label>
            {children}
        </div>
    );
}

const s = {
    page: { display: "flex", flexDirection: "column", gap: 16 },
    heading: { fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 },
    toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between" },
    refreshBtn: { width: 40, height: 40, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
    addBtn: { display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 14px rgba(59,130,246,0.3)" },
    errorMsg: { fontSize: 12, color: "#ef4444", padding: "8px 0" },
    tableCard: { background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" },
    table: { width: "100%", borderCollapse: "collapse", minWidth: 700 },
    th: { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" },
    tr: { borderBottom: "1px solid #f1f5f9" },
    td: { padding: "13px 16px", verticalAlign: "middle", fontSize: 13 },
    badge: { display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
    editBtn: { width: 30, height: 30, borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#3b82f6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
    delBtn: { width: 30, height: 30, borderRadius: 8, border: "1.5px solid #fee2e2", background: "#fef2f2", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
    overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(2px)", zIndex: 400 },
    drawer: { position: "fixed", top: 0, right: 0, bottom: 0, width: 420, background: "#fff", boxShadow: "-12px 0 48px rgba(0,0,0,0.12)", zIndex: 500, display: "flex", flexDirection: "column", transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)" },
    drawerHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px", borderBottom: "1px solid #f1f5f9" },
    drawerTitle: { fontSize: 17, fontWeight: 700, color: "#0f172a" },
    closeBtn: { width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" },
    drawerBody: { flex: 1, overflowY: "auto", padding: "20px 24px" },
    drawerFooter: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid #f1f5f9", background: "#f8fafc" },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    fi: { width: "100%", height: 40, padding: "0 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#0f172a", background: "#fff", outline: "none" },
    checkRow: { marginTop: 4 },
    checkLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", cursor: "pointer" },
    cancelBtn: { height: 38, padding: "0 18px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" },
    saveBtn: { height: 38, padding: "0 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" },
    skeleton: { background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)", backgroundSize: "200% 100%" },
};
