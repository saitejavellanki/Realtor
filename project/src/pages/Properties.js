import { useCallback, useEffect, useRef, useState } from "react";
import {
    FiEdit2,
    FiEye, FiEyeOff,
    FiPlus,
    FiRefreshCw,
    FiSearch,
    FiTrash2, FiUploadCloud, FiX,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useToast } from "../components/Toast";

const STATUS_OPTS = ["Available", "Sold", "Reserved", "Draft"];
const APPROVAL_OPTS = ["Pending", "Approved", "Rejected"];
const STATUS_STYLE = {
    Available: { bg: "#d1fae5", color: "#059669" },
    Sold: { bg: "#ede9fe", color: "#7c3aed" },
    Reserved: { bg: "#fef3c7", color: "#d97706" },
    Draft: { bg: "#f1f5f9", color: "#64748b" },
};

function StatusBadge({ status }) {
    const st = STATUS_STYLE[status] || STATUS_STYLE.Draft;
    return (
        <span style={{ ...s.badge, background: st.bg, color: st.color }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.color, display: "inline-block", marginRight: 4 }} />
            {status}
        </span>
    );
}

function PublishToggle({ value, onChange, disabled }) {
    return (
        <button onClick={onChange} disabled={disabled} title={value ? "Published" : "Private"} style={{ ...s.toggle, ...(value ? s.toggleOn : s.toggleOff) }}>
            {value ? <FiEye size={12} /> : <FiEyeOff size={12} />}
            <span>{value ? "Public" : "Private"}</span>
        </button>
    );
}

export default function Properties() {
    const navigate = useNavigate();
    const showToast = useToast();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [verifiedOnly, setVerifiedOnly] = useState(false);
    const [csvUploading, setCsvUploading] = useState(false);
    const [csvResult, setCsvResult] = useState(null);
    const csvInputRef = useRef(null);

    // Verification reports state
    const [vReports, setVReports] = useState([]);
    const [vReportsLoading, setVReportsLoading] = useState(false);
    const [newReport, setNewReport] = useState({ verified_by: "", notes: "", site_status: "" });
    const [reportSaving, setReportSaving] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        api.getAllProperties()
            .then(setProperties)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    const openDrawer = (item) => {
        setSelected({ ...item });
        setIsOpen(true);
        setSaveSuccess(false);
        // load verification reports
        setVReportsLoading(true);
        api.getVerificationReports(item.id)
            .then(r => setVReports(r || []))
            .catch(() => setVReports([]))
            .finally(() => setVReportsLoading(false));
    };
    const closeDrawer = () => { setIsOpen(false); setSelected(null); };

    const handleAddReport = async () => {
        if (!selected || !newReport.verified_by) return;
        setReportSaving(true);
        try {
            await api.createVerificationReport(selected.id, newReport);
            const r = await api.getVerificationReports(selected.id);
            setVReports(r || []);
            setNewReport({ verified_by: "", notes: "", site_status: "" });
            load(); // refresh table to show verified status
        } catch (err) { showToast("Failed to submit report: " + err.message, "error"); }
        finally { setReportSaving(false); }
    };

    const handleDeleteReport = async (reportId) => {
        try {
            await api.deleteVerificationReport(reportId);
            setVReports(prev => prev.filter(r => r.id !== reportId));
        } catch { /* ignore */ }
    };

    const handleSave = async () => {
        if (!selected) return;
        setSaving(true);
        try {
            await api.updateProperty(selected.id, {
                title: selected.title, area: selected.area, location: selected.location,
                category_type: selected.category_type, status: selected.status,
                price_per_sqft: Number(selected.price_per_sqft), size: Number(selected.size),
                unit: selected.unit, agent_contact: selected.agent_contact,
                approval_status: selected.approval_status, is_public: selected.is_public,
                description: selected.description,
                beds: selected.beds, baths: selected.baths, garage: selected.garage,
                year_built: selected.year_built, demand: selected.demand,
                agent_name: selected.agent_name, agent_role: selected.agent_role,
                zoning: selected.zoning, notes: selected.notes,
                lat: selected.lat, lng: selected.lng,
                current_price: selected.current_price, past_year_gain: selected.past_year_gain,
                price_change: selected.price_change,
                price_history: selected.price_history || [],
                // POC fields
                circle_rate: selected.circle_rate, market_rate: selected.market_rate,
                rate_source: selected.rate_source, source_attribution: selected.source_attribution,
                rera_number: selected.rera_number, developer_name: selected.developer_name,
                site_status: selected.site_status, flood_risk: selected.flood_risk,
                pollution_index: selected.pollution_index, safety_index: selected.safety_index,
                is_verified: selected.is_verified,
                site_photos: selected.site_photos || [],
                local_updates: selected.local_updates || [],
            });
            setSaveSuccess(true);
            showToast("Property saved successfully.", "success");
            setTimeout(() => { closeDrawer(); load(); }, 800);
        } catch (err) {
            showToast("Save failed: " + err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this property? This cannot be undone.")) return;
        setDeleteId(id);
        try { await api.deleteProperty(id); load(); showToast("Property deleted.", "success"); }
        catch (err) { showToast("Delete failed: " + err.message, "error"); }
        finally { setDeleteId(null); }
    };

    const handleTogglePublic = async (id, current) => {
        setTogglingId(id);
        try { await api.publishProperty(id, !current); load(); showToast(`Property ${!current ? "published" : "unpublished"}.`, "success"); }
        catch (err) { showToast("Failed to update visibility: " + err.message, "error"); }
        finally { setTogglingId(null); }
    };

    const handleCsvUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCsvUploading(true);
        setCsvResult(null);
        try {
            const result = await api.uploadCSV(file);
            setCsvResult(result);
            load();
        } catch (err) {
            setCsvResult({ error: err.message });
        } finally {
            setCsvUploading(false);
            if (csvInputRef.current) csvInputRef.current.value = "";
        }
    };

    const filtered = properties.filter((p) => {
        const q = search.toLowerCase();
        const matchesQ = !q || [p.plot_id, p.title, p.area, p.status].some(f => f?.toLowerCase().includes(q));
        const matchesVerified = !verifiedOnly || p.is_verified === true;
        return matchesQ && matchesVerified;
    });

    const upd = (key, val) => setSelected(prev => ({ ...prev, [key]: val }));

    return (
        <div style={s.page}>
            {/* Toolbar */}
            <div style={s.toolbar}>
                <div style={s.searchWrap}>
                    <FiSearch size={14} style={s.searchIcon} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by plot, title, area, status…"
                        style={s.searchInput}
                    />
                    {search && (
                        <button onClick={() => setSearch("")} style={s.clearBtn}>
                            <FiX size={13} />
                        </button>
                    )}
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", cursor: "pointer" }}>
                    <input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} style={{ accentColor: "#059669" }} />
                    Verified only
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={load} style={s.refreshBtn} title="Refresh">
                        <FiRefreshCw size={14} />
                    </button>
                    <input
                        ref={csvInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        style={{ display: "none" }}
                    />
                    <button
                        onClick={() => csvInputRef.current?.click()}
                        style={s.csvBtn}
                        disabled={csvUploading}
                        title="Upload CSV"
                    >
                        <FiUploadCloud size={15} /> {csvUploading ? "Uploading…" : "Upload CSV"}
                    </button>
                    <button onClick={() => navigate("/add-property")} style={s.addBtn}>
                        <FiPlus size={15} /> Add Property
                    </button>
                </div>
            </div>

            {/* CSV upload result */}
            {csvResult && (
                <div style={csvResult.error ? s.csvError : s.csvSuccess}>
                    {csvResult.error
                        ? `Upload failed: ${csvResult.error}`
                        : `✓ ${csvResult.created} created, ${csvResult.skipped} skipped, ${csvResult.errors} errors (${csvResult.total} total rows)`}
                    <button onClick={() => setCsvResult(null)} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 8, fontSize: 14 }}>
                        <FiX size={14} />
                    </button>
                </div>
            )}

            {/* Summary bar */}
            <div style={s.summaryBar}>
                <span style={s.summaryText}>
                    {loading ? "Loading…" : `${filtered.length} of ${properties.length} properties`}
                </span>
                {error && <span style={s.errorMsg}>⚠️ {error}</span>}
            </div>

            {/* Table */}
            <div style={s.tableCard}>
                <div style={{ overflowX: "auto" }}>
                    <table style={s.table}>
                        <thead>
                            <tr>
                                {["Plot ID", "Title", "Area", "Category", "Status", "Verified", "RERA", "Price/sqft", "Size", "Visibility", "Approval", "Updated", "Actions"].map(h => (
                                    <th key={h} style={s.th}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 13 }).map((_, j) => (
                                            <td key={j} style={s.td}>
                                                <div style={{ ...s.skeleton, height: 14, width: j === 1 ? 120 : 60, borderRadius: 6 }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={13} style={{ ...s.td, textAlign: "center", padding: "36px 0", color: "#94a3b8", fontSize: 13 }}>
                                        No properties found.
                                    </td>
                                </tr>
                            ) : filtered.map((item) => (
                                <tr key={item.id} style={s.tr}>
                                    <td style={{ ...s.td, fontWeight: 700, color: "#1e40af", fontFamily: "monospace", fontSize: 12 }}>{item.plot_id}</td>
                                    <td style={{ ...s.td, maxWidth: 180 }}>
                                        <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {item.title}
                                        </div>
                                    </td>
                                    <td style={{ ...s.td, fontSize: 12, color: "#64748b" }}>{item.area}</td>
                                    <td style={s.td}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: item.category_type === "residential" ? "#0ea5e9" : "#f59e0b", background: item.category_type === "residential" ? "#e0f2fe" : "#fef3c7", padding: "2px 8px", borderRadius: 20 }}>
                                            {item.category_type === "residential" ? "Residential" : "Commercial"}
                                        </span>
                                    </td>
                                    <td style={s.td}><StatusBadge status={item.status} /></td>
                                    <td style={s.td}>
                                        {item.is_verified ? (
                                            <span style={{ ...s.badge, background: "#d1fae5", color: "#059669" }}>✓ Verified</span>
                                        ) : (
                                            <span style={{ ...s.badge, background: "#fef3c7", color: "#d97706" }}>Unverified</span>
                                        )}
                                    </td>
                                    <td style={{ ...s.td, fontSize: 11, fontFamily: "monospace", color: item.rera_number ? "#0f172a" : "#cbd5e1" }}>
                                        {item.rera_number || "—"}
                                    </td>
                                    <td style={{ ...s.td, fontWeight: 600, fontSize: 12 }}>Rs. {Number(item.price_per_sqft).toLocaleString()}</td>
                                    <td style={{ ...s.td, fontSize: 12 }}>{Number(item.size).toLocaleString()} {item.unit}</td>
                                    <td style={s.td}>
                                        <PublishToggle
                                            value={item.is_public}
                                            onChange={() => handleTogglePublic(item.id, item.is_public)}
                                            disabled={togglingId === item.id}
                                        />
                                    </td>
                                    <td style={s.td}>
                                        <span style={{ ...s.badge, background: item.approval_status === "Approved" ? "#d1fae5" : item.approval_status === "Rejected" ? "#fee2e2" : "#fef3c7", color: item.approval_status === "Approved" ? "#059669" : item.approval_status === "Rejected" ? "#dc2626" : "#d97706" }}>
                                            {item.approval_status || "Pending"}
                                        </span>
                                    </td>
                                    <td style={{ ...s.td, fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>
                                        {new Date(item.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                                    </td>
                                    <td style={s.td}>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button onClick={() => openDrawer(item)} style={s.editBtn} title="Edit">
                                                <FiEdit2 size={13} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                disabled={deleteId === item.id}
                                                style={{ ...s.delBtn, opacity: deleteId === item.id ? 0.5 : 1 }}
                                                title="Delete"
                                            >
                                                <FiTrash2 size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Overlay */}
            {isOpen && <div onClick={closeDrawer} style={s.overlay} />}

            {/* Edit Drawer */}
            <div style={{ ...s.drawer, transform: isOpen ? "translateX(0)" : "translateX(100%)" }}>
                {selected && (
                    <>
                        <div style={s.drawerHeader}>
                            <div>
                                <div style={s.drawerTitle}>Edit Property</div>
                                <div style={s.drawerSub}>{selected.plot_id}</div>
                            </div>
                            <button onClick={closeDrawer} style={s.closeBtn}><FiX size={16} /></button>
                        </div>

                        <div style={s.drawerBody}>
                            <Field label="Plot ID">
                                <input value={selected.plot_id} readOnly style={{ ...s.fi, background: "#f8fafc", color: "#94a3b8" }} />
                            </Field>
                            <Field label="Title">
                                <input value={selected.title || ""} onChange={e => upd("title", e.target.value)} style={s.fi} />
                            </Field>
                            <div style={s.grid2}>
                                <Field label="Area">
                                    <input value={selected.area || ""} onChange={e => upd("area", e.target.value)} style={s.fi} />
                                </Field>
                                <Field label="Category">
                                    <select value={selected.category_type || ""} onChange={e => upd("category_type", e.target.value)} style={s.fi}>
                                        <option value="residential">Residential</option>
                                        <option value="commercial">Commercial</option>
                                    </select>
                                </Field>
                            </div>
                            <div style={s.grid2}>
                                <Field label="Status">
                                    <select value={selected.status || ""} onChange={e => upd("status", e.target.value)} style={s.fi}>
                                        {STATUS_OPTS.map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </Field>
                                <Field label="Unit">
                                    <select value={selected.unit || "sq.ft"} onChange={e => upd("unit", e.target.value)} style={s.fi}>
                                        <option>sq.ft</option>
                                        <option>sq.yd</option>
                                    </select>
                                </Field>
                            </div>
                            <div style={s.grid2}>
                                <Field label="Price per sq.ft (Rs.)">
                                    <input type="number" value={selected.price_per_sqft || 0} onChange={e => upd("price_per_sqft", e.target.value)} style={s.fi} />
                                </Field>
                                <Field label="Plot Size">
                                    <input type="number" value={selected.size || 0} onChange={e => upd("size", e.target.value)} style={s.fi} />
                                </Field>
                            </div>
                            <Field label="Agent Contact">
                                <input value={selected.agent_contact || ""} onChange={e => upd("agent_contact", e.target.value)} style={s.fi} />
                            </Field>
                            <Field label="Legal Approval">
                                <select value={selected.approval_status || "Pending"} onChange={e => upd("approval_status", e.target.value)} style={s.fi}>
                                    {APPROVAL_OPTS.map(o => <option key={o}>{o}</option>)}
                                </select>
                            </Field>
                            <div style={s.checkRow}>
                                <label style={s.checkLabel}>
                                    <input type="checkbox" checked={!!selected.is_public} onChange={e => upd("is_public", e.target.checked)} style={{ accentColor: "#3b82f6" }} />
                                    <span>Visible to public (mobile app)</span>
                                </label>
                            </div>

                            <div style={{ marginTop: 24, marginBottom: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Price History</div>
                                    <button
                                        onClick={() => upd("price_history", [...(selected.price_history || []), { year: new Date().getFullYear(), price: 0 }])}
                                        style={{ background: "#e0f2fe", color: "#0ea5e9", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                                    >
                                        + Add Year
                                    </button>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {(selected.price_history || []).map((h, i) => (
                                        <div key={i} style={{ display: "flex", gap: 8 }}>
                                            <input type="number" placeholder="Year" value={h.year} onChange={e => {
                                                const newHist = [...selected.price_history];
                                                newHist[i].year = Number(e.target.value);
                                                upd("price_history", newHist);
                                            }} style={{ ...s.fi, flex: 1 }} />
                                            <input type="number" placeholder="Price" value={h.price} onChange={e => {
                                                const newHist = [...selected.price_history];
                                                newHist[i].price = Number(e.target.value);
                                                upd("price_history", newHist);
                                            }} style={{ ...s.fi, flex: 2 }} />
                                            <button onClick={() => {
                                                const newHist = selected.price_history.filter((_, idx) => idx !== i);
                                                upd("price_history", newHist);
                                            }} style={{ background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 6, padding: "0 12px", cursor: "pointer" }}>
                                                <FiTrash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                    {(!selected.price_history || selected.price_history.length === 0) && (
                                        <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>No price history added.</div>
                                    )}
                                </div>
                            </div>

                            {/* ── POC Transparency Fields ── */}
                            <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 20, paddingTop: 18 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>Transparency (POC)</div>
                                <div style={s.grid2}>
                                    <Field label="Circle Rate">
                                        <input type="number" value={selected.circle_rate || 0} onChange={e => upd("circle_rate", Number(e.target.value))} style={s.fi} />
                                    </Field>
                                    <Field label="Market Rate">
                                        <input type="number" value={selected.market_rate || 0} onChange={e => upd("market_rate", Number(e.target.value))} style={s.fi} />
                                    </Field>
                                </div>
                                <div style={s.grid2}>
                                    <Field label="Rate Source">
                                        <input value={selected.rate_source || ""} onChange={e => upd("rate_source", e.target.value)} style={s.fi} />
                                    </Field>
                                    <Field label="Source Attribution">
                                        <input value={selected.source_attribution || ""} onChange={e => upd("source_attribution", e.target.value)} style={s.fi} />
                                    </Field>
                                </div>
                                <div style={s.grid2}>
                                    <Field label="RERA Number">
                                        <input value={selected.rera_number || ""} onChange={e => upd("rera_number", e.target.value)} style={s.fi} />
                                    </Field>
                                    <Field label="Developer">
                                        <input value={selected.developer_name || ""} onChange={e => upd("developer_name", e.target.value)} style={s.fi} />
                                    </Field>
                                </div>
                                <div style={s.grid2}>
                                    <Field label="Site Status">
                                        <select value={selected.site_status || "developed"} onChange={e => upd("site_status", e.target.value)} style={s.fi}>
                                            <option value="vacant">Vacant</option>
                                            <option value="under_construction">Under construction</option>
                                            <option value="developed">Developed</option>
                                        </select>
                                    </Field>
                                    <Field label="Flood Risk">
                                        <select value={selected.flood_risk || "low"} onChange={e => upd("flood_risk", e.target.value)} style={s.fi}>
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </Field>
                                </div>
                                <div style={s.grid2}>
                                    <Field label="Pollution Index (AQI)">
                                        <input type="number" value={selected.pollution_index ?? ""} onChange={e => upd("pollution_index", e.target.value ? Number(e.target.value) : null)} style={s.fi} />
                                    </Field>
                                    <Field label="Safety Index (0-100)">
                                        <input type="number" value={selected.safety_index ?? ""} onChange={e => upd("safety_index", e.target.value ? Number(e.target.value) : null)} style={s.fi} />
                                    </Field>
                                </div>
                                <div style={s.checkRow}>
                                    <label style={s.checkLabel}>
                                        <input type="checkbox" checked={!!selected.is_verified} onChange={e => upd("is_verified", e.target.checked)} style={{ accentColor: "#059669" }} />
                                        <span>Verified</span>
                                    </label>
                                </div>
                            </div>

                            {/* ── Site Photos (URL list) ── */}
                            <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 20, paddingTop: 18 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Site Photos</div>
                                    <button onClick={() => upd("site_photos", [...(selected.site_photos || []), { url: "", taken_at: "" }])}
                                        style={{ background: "#e0f2fe", color: "#0ea5e9", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                                        + Add Photo
                                    </button>
                                </div>
                                {(selected.site_photos || []).map((p, i) => (
                                    <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                                        <input placeholder="Image URL" value={p.url || ""} onChange={e => {
                                            const arr = [...(selected.site_photos || [])]; arr[i] = { ...arr[i], url: e.target.value }; upd("site_photos", arr);
                                        }} style={{ ...s.fi, flex: 3 }} />
                                        <input placeholder="Date" value={p.taken_at || ""} onChange={e => {
                                            const arr = [...(selected.site_photos || [])]; arr[i] = { ...arr[i], taken_at: e.target.value }; upd("site_photos", arr);
                                        }} style={{ ...s.fi, flex: 1 }} />
                                        <button onClick={() => upd("site_photos", (selected.site_photos || []).filter((_, idx) => idx !== i))}
                                            style={{ background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 6, padding: "0 10px", cursor: "pointer" }}>
                                            <FiTrash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                {(!selected.site_photos || selected.site_photos.length === 0) && (
                                    <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>No photos added.</div>
                                )}
                            </div>

                            {/* ── Local Updates ── */}
                            <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 20, paddingTop: 18 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Local Updates</div>
                                    <button onClick={() => upd("local_updates", [...(selected.local_updates || []), { date: new Date().toISOString().slice(0, 10), headline: "" }])}
                                        style={{ background: "#e0f2fe", color: "#0ea5e9", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                                        + Add Update
                                    </button>
                                </div>
                                {(selected.local_updates || []).map((u, i) => (
                                    <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                                        <input type="date" value={u.date || ""} onChange={e => {
                                            const arr = [...(selected.local_updates || [])]; arr[i] = { ...arr[i], date: e.target.value }; upd("local_updates", arr);
                                        }} style={{ ...s.fi, flex: 1 }} />
                                        <input placeholder="Headline" value={u.headline || ""} onChange={e => {
                                            const arr = [...(selected.local_updates || [])]; arr[i] = { ...arr[i], headline: e.target.value }; upd("local_updates", arr);
                                        }} style={{ ...s.fi, flex: 3 }} />
                                        <button onClick={() => upd("local_updates", (selected.local_updates || []).filter((_, idx) => idx !== i))}
                                            style={{ background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 6, padding: "0 10px", cursor: "pointer" }}>
                                            <FiTrash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                {(!selected.local_updates || selected.local_updates.length === 0) && (
                                    <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>No local updates.</div>
                                )}
                            </div>

                            {/* ── Verification Reports ── */}
                            <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 20, paddingTop: 18 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>Verification Reports</div>
                                {vReportsLoading ? (
                                    <div style={{ fontSize: 12, color: "#94a3b8" }}>Loading...</div>
                                ) : (
                                    <>
                                        {vReports.map((r) => (
                                            <div key={r.id} style={{ background: "#f8fafc", borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 12 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <span style={{ fontWeight: 600, color: "#0f172a" }}>{r.verified_by}</span>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        <span style={{ color: "#94a3b8", fontSize: 11 }}>{new Date(r.visited_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}</span>
                                                        <button onClick={() => handleDeleteReport(r.id)}
                                                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 2 }}>
                                                            <FiTrash2 size={11} />
                                                        </button>
                                                    </div>
                                                </div>
                                                {r.site_status && <div style={{ color: "#64748b", marginTop: 2 }}>Site: {r.site_status}</div>}
                                                {r.notes && <div style={{ color: "#475569", marginTop: 2 }}>{r.notes}</div>}
                                            </div>
                                        ))}
                                        {vReports.length === 0 && (
                                            <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", marginBottom: 10 }}>No verification reports yet.</div>
                                        )}
                                        {/* New report form */}
                                        <div style={{ background: "#f0fdf4", borderRadius: 8, padding: 10, marginTop: 6 }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: "#059669", marginBottom: 8 }}>Add Verification Report</div>
                                            <div style={s.grid2}>
                                                <input placeholder="Verified by" value={newReport.verified_by} onChange={e => setNewReport(p => ({ ...p, verified_by: e.target.value }))} style={{ ...s.fi, height: 34, fontSize: 12 }} />
                                                <select value={newReport.site_status} onChange={e => setNewReport(p => ({ ...p, site_status: e.target.value }))} style={{ ...s.fi, height: 34, fontSize: 12 }}>
                                                    <option value="">Site status...</option>
                                                    <option value="vacant">Vacant</option>
                                                    <option value="under_construction">Under construction</option>
                                                    <option value="developed">Developed</option>
                                                </select>
                                            </div>
                                            <textarea placeholder="Notes..." value={newReport.notes} onChange={e => setNewReport(p => ({ ...p, notes: e.target.value }))}
                                                style={{ ...s.fi, height: 50, paddingTop: 8, resize: "vertical", marginTop: 6, fontSize: 12 }} />
                                            <button onClick={handleAddReport} disabled={reportSaving || !newReport.verified_by}
                                                style={{ marginTop: 8, background: "#059669", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", opacity: reportSaving || !newReport.verified_by ? 0.5 : 1 }}>
                                                {reportSaving ? "Saving..." : "Submit Report"}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div style={s.drawerFooter}>
                            {saveSuccess && <span style={{ color: "#10b981", fontSize: 13, fontWeight: 600 }}>✓ Saved!</span>}
                            <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
                                <button onClick={closeDrawer} style={s.cancelBtn}>Cancel</button>
                                <button onClick={handleSave} disabled={saving || saveSuccess} style={{ ...s.saveBtn, opacity: saving || saveSuccess ? 0.7 : 1 }}>
                                    {saving ? "Saving…" : "Save Changes"}
                                </button>
                            </div>
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
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>
                {label}
            </label>
            {children}
        </div>
    );
}

const s = {
    page: { display: "flex", flexDirection: "column", gap: 16 },

    toolbar: { display: "flex", alignItems: "center", gap: 12 },
    searchWrap: {
        flex: 1, maxWidth: 360, position: "relative",
        display: "flex", alignItems: "center",
    },
    searchIcon: { position: "absolute", left: 12, color: "#94a3b8", pointerEvents: "none" },
    searchInput: {
        width: "100%", height: 40, paddingLeft: 36, paddingRight: 32,
        border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, color: "#0f172a",
        background: "#fff", outline: "none",
    },
    clearBtn: {
        position: "absolute", right: 10, background: "none", border: "none",
        color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center",
    },
    refreshBtn: {
        width: 40, height: 40, borderRadius: 10, border: "1.5px solid #e2e8f0",
        background: "#fff", color: "#64748b", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
    },
    addBtn: {
        display: "flex", alignItems: "center", gap: 6,
        height: 40, padding: "0 18px", borderRadius: 10, border: "none",
        background: "linear-gradient(135deg, #3b82f6, #2563eb)",
        color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
        boxShadow: "0 4px 14px rgba(59,130,246,0.3)",
    },
    csvBtn: {
        display: "flex", alignItems: "center", gap: 6,
        height: 40, padding: "0 18px", borderRadius: 10,
        border: "1.5px solid #e2e8f0", background: "#fff",
        color: "#374151", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
    },
    csvSuccess: {
        display: "flex", alignItems: "center", padding: "10px 16px",
        borderRadius: 10, background: "#d1fae5", color: "#059669",
        fontSize: 13, fontWeight: 500,
    },
    csvError: {
        display: "flex", alignItems: "center", padding: "10px 16px",
        borderRadius: 10, background: "#fee2e2", color: "#dc2626",
        fontSize: 13, fontWeight: 500,
    },

    summaryBar: { display: "flex", alignItems: "center", justifyContent: "space-between" },
    summaryText: { fontSize: 12, color: "#94a3b8", fontWeight: 500 },
    errorMsg: { fontSize: 12, color: "#ef4444" },

    tableCard: {
        background: "#fff", borderRadius: 16,
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        overflow: "hidden",
    },
    table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
    th: {
        padding: "12px 16px", textAlign: "left",
        fontSize: 11, fontWeight: 700, color: "#64748b",
        textTransform: "uppercase", letterSpacing: "0.6px",
        background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
        whiteSpace: "nowrap",
    },
    tr: { borderBottom: "1px solid #f1f5f9", transition: "background 0.12s" },
    td: { padding: "13px 16px", verticalAlign: "middle" },

    badge: {
        display: "inline-flex", alignItems: "center",
        padding: "3px 9px", borderRadius: 20,
        fontSize: 11, fontWeight: 600,
    },
    toggle: {
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 9px", borderRadius: 20, border: "none",
        fontSize: 11, fontWeight: 600, cursor: "pointer",
    },
    toggleOn: { background: "#d1fae5", color: "#059669" },
    toggleOff: { background: "#f1f5f9", color: "#94a3b8" },

    editBtn: {
        width: 30, height: 30, borderRadius: 8, border: "1.5px solid #e2e8f0",
        background: "#fff", color: "#3b82f6", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
    },
    delBtn: {
        width: 30, height: 30, borderRadius: 8, border: "1.5px solid #fee2e2",
        background: "#fef2f2", color: "#ef4444", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
    },

    overlay: {
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)",
        backdropFilter: "blur(2px)", zIndex: 400,
    },
    drawer: {
        position: "fixed", top: 0, right: 0, bottom: 0, width: 440,
        background: "#fff", boxShadow: "-12px 0 48px rgba(0,0,0,0.12)",
        zIndex: 500, display: "flex", flexDirection: "column",
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
    },
    drawerHeader: {
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        padding: "22px 24px", borderBottom: "1px solid #f1f5f9",
    },
    drawerTitle: { fontSize: 17, fontWeight: 700, color: "#0f172a" },
    drawerSub: { fontSize: 12, color: "#94a3b8", marginTop: 3, fontFamily: "monospace" },
    closeBtn: {
        width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0",
        background: "#f8fafc", cursor: "pointer", color: "#64748b",
        display: "flex", alignItems: "center", justifyContent: "center",
    },
    drawerBody: { flex: 1, overflowY: "auto", padding: "20px 24px" },
    drawerFooter: {
        display: "flex", alignItems: "center",
        padding: "16px 24px", borderTop: "1px solid #f1f5f9",
        background: "#f8fafc",
    },

    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    fi: {
        width: "100%", height: 40, padding: "0 12px",
        border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13,
        color: "#0f172a", background: "#fff", outline: "none",
    },
    checkRow: { marginTop: 4 },
    checkLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", cursor: "pointer" },

    cancelBtn: {
        height: 38, padding: "0 18px", borderRadius: 8,
        border: "1.5px solid #e2e8f0", background: "#fff",
        fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer",
    },
    saveBtn: {
        height: 38, padding: "0 20px", borderRadius: 8, border: "none",
        background: "linear-gradient(135deg, #3b82f6, #2563eb)",
        color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
        boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
    },

    skeleton: {
        background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
        backgroundSize: "200% 100%",
    },
};