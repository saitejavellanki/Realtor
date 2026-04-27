import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRef, useState } from "react";
import { FiAlertCircle, FiArrowLeft, FiArrowRight, FiCheck, FiSearch, FiTrash2 } from "react-icons/fi";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
    iconUrl: require("leaflet/dist/images/marker-icon.png"),
    shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

function LocationMarker({ position, setPosition }) {
    useMapEvents({ click(e) { setPosition(e.latlng); } });
    return position ? <Marker position={position} /> : null;
}

function FlyToPosition({ position }) {
    const map = useMap();
    const prevPos = useRef(null);
    if (position && (!prevPos.current || prevPos.current.lat !== position.lat || prevPos.current.lng !== position.lng)) {
        prevPos.current = position;
        map.flyTo([position.lat, position.lng], 15, { duration: 1 });
    }
    return null;
}

const STEPS = ["Basic Info", "Pricing", "Details", "Preview"];
const CATEGORY_TYPES = [
    { value: "residential", label: "Residential", icon: "\ud83c\udfe0" },
    { value: "commercial", label: "Commercial", icon: "\ud83c\udfe2" },
    { value: "land", label: "Land", icon: "\ud83c\udf33" },
    { value: "apartment", label: "Apartment", icon: "\ud83c\udfd7\ufe0f" },
    { value: "villa", label: "Villa", icon: "\ud83c\udfe1" },
    { value: "plot", label: "Plot", icon: "\ud83d\udccd" },
    { value: "office", label: "Office Space", icon: "\ud83d\udcbc" },
    { value: "retail", label: "Retail", icon: "\ud83d\udecd\ufe0f" },
    { value: "warehouse", label: "Warehouse", icon: "\ud83c\udfed" },
    { value: "farmland", label: "Farmland", icon: "\ud83c\udf3e" },
];
const RES_TYPES = ["Villa", "Gated Community", "Apartment", "Standalone", "Individual"];
const ROOM_OPTS = ["1bhk", "2bhk", "3bhk", "4bhk", "5bhk"];

function StepIndicator({ current }) {
    return (
        <div style={s.stepper}>
            {STEPS.map((label, i) => {
                const num = i + 1;
                const done = current > num;
                const active = current === num;
                return (
                    <div key={label} style={s.stepWrap}>
                        <div style={{ ...s.stepCircle, ...(active ? s.stepActive : done ? s.stepDone : s.stepIdle) }}>
                            {done ? <FiCheck size={13} /> : num}
                        </div>
                        <div style={{ ...s.stepLabel, color: active ? "#3b82f6" : done ? "#10b981" : "#94a3b8" }}>{label}</div>
                        {i < STEPS.length - 1 && (
                            <div style={{ ...s.stepLine, background: done ? "#10b981" : "#e2e8f0" }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function Field({ label, required, children }) {
    return (
        <div style={{ marginBottom: 18 }}>
            <label style={s.label}>{label}{required && <span style={{ color: "#ef4444" }}> *</span>}</label>
            {children}
        </div>
    );
}

export default function AddProperty() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");

    const [plotId, setPlotId] = useState("");
    const [area, setArea] = useState("");
    const [title, setTitle] = useState("");
    const [categoryType, setCategoryType] = useState("");
    const [propertyType, setPropertyType] = useState("");
    const [roomCount, setRoomCount] = useState("");
    const [status, setStatus] = useState("Draft");
    const [catOpen, setCatOpen] = useState(false);

    const [price, setPrice] = useState(0);
    const [size, setSize] = useState(0);
    const [unit, setUnit] = useState("sq.ft");
    const [priceHistory, setPriceHistory] = useState([]);
    const total = price * size;

    const [approval, setApproval] = useState("Pending");
    const [isPublic, setIsPublic] = useState(false);
    const [notes, setNotes] = useState("");
    const [agentName, setAgentName] = useState("");
    const [agentContact, setAgentContact] = useState("");
    const [description, setDescription] = useState("");
    const [position, setPosition] = useState({ lat: 17.3850, lng: 78.4867 });
    const [mapSearch, setMapSearch] = useState("");
    const [mapSearching, setMapSearching] = useState(false);
    const [flyTarget, setFlyTarget] = useState(null);

    const handleMapSearch = async () => {
        if (!mapSearch.trim()) return;
        setMapSearching(true);
        try {
            const q = encodeURIComponent(mapSearch.trim() + ", Hyderabad, India");
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`);
            const data = await res.json();
            if (data.length > 0) {
                const loc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                setPosition(loc);
                setFlyTarget({ ...loc });
            } else {
                alert("Location not found. Try a more specific search.");
            }
        } catch {
            alert("Search failed. Check your internet connection.");
        } finally {
            setMapSearching(false);
        }
    };

    // POC transparency fields
    const [circleRate, setCircleRate] = useState(0);
    const [marketRate, setMarketRate] = useState(0);
    const [rateSource, setRateSource] = useState("");
    const [reraNumber, setReraNumber] = useState("");
    const [isVerified, setIsVerified] = useState(false);
    const [verificationNotes, setVerificationNotes] = useState("");
    const [siteStatus, setSiteStatus] = useState("vacant");
    const [developerName, setDeveloperName] = useState("");
    const [floodRisk, setFloodRisk] = useState("low");
    const [pollutionIndex, setPollutionIndex] = useState("");
    const [safetyIndex, setSafetyIndex] = useState("");
    const [sourceAttribution, setSourceAttribution] = useState("");
    const [sitePhotos, setSitePhotos] = useState([]);
    const [localUpdates, setLocalUpdates] = useState([]);

    const next = () => setStep(p => p + 1);
    const back = () => setStep(p => p - 1);

    const handlePublish = async () => {
        setSubmitting(true);
        setSubmitError("");
        try {
            await api.createProperty({
                plot_id: plotId,
                title: title || `${area} - ${propertyType || categoryType}`,
                area, category_type: categoryType?.toLowerCase() || "residential",
                property_type: propertyType || null, room_count: roomCount || null,
                status, price_per_sqft: Number(price), size: Number(size), unit,
                approval_status: approval, is_public: isPublic,
                notes, agent_name: agentName || null, agent_contact: agentContact || null,
                description: description || null, current_price: total,
                lat: position.lat, lng: position.lng,
                price_history: priceHistory,
                circle_rate: Number(circleRate) || 0,
                market_rate: Number(marketRate) || 0,
                rate_source: rateSource || null,
                rera_number: reraNumber || null,
                is_verified: isVerified,
                verification_notes: verificationNotes || null,
                site_status: siteStatus,
                developer_name: developerName || null,
                flood_risk: floodRisk,
                pollution_index: pollutionIndex !== "" ? Number(pollutionIndex) : null,
                safety_index: safetyIndex !== "" ? Number(safetyIndex) : null,
                source_attribution: sourceAttribution || null,
                site_photos: sitePhotos.filter(p => p.url),
                local_updates: localUpdates.filter(u => u.headline),
            });
            navigate("/properties");
        } catch (err) {
            setSubmitError(err.message || "Failed to publish property.");
        } finally {
            setSubmitting(false);
        }
    };

    const catObj = CATEGORY_TYPES.find(c => c.value === categoryType);
    const catLabel = categoryType
        ? (categoryType === "residential" || categoryType === "apartment" || categoryType === "villa")
            ? `${catObj?.label || categoryType}${propertyType ? ` · ${propertyType}` : ""}${roomCount ? ` · ${roomCount}` : ""}`
            : (catObj?.label || categoryType)
        : "Select category";

    return (
        <div style={s.page}>
            <StepIndicator current={step} />

            <div style={s.card}>
                {/* STEP 1 */}
                {step === 1 && (
                    <div style={s.stepContent}>
                        <SectionHeader title="Basic Information" sub="Property identity and classification" />
                        <Field label="Plot ID" required>
                            <input style={s.fi} placeholder="e.g. PLT-011" value={plotId} onChange={e => setPlotId(e.target.value)} />
                        </Field>
                        <Field label="Title">
                            <input style={s.fi} placeholder="e.g. Sunrise Heights Block B" value={title} onChange={e => setTitle(e.target.value)} />
                        </Field>
                        <div style={s.grid2}>
                            <Field label="Area">
                                <input style={s.fi} placeholder="e.g. Gachibowli, HITEC City" value={area} onChange={e => setArea(e.target.value)} />
                            </Field>
                            {/* Category dropdown */}
                            <Field label="Category">
                                <div style={{ position: "relative" }}>
                                    <div style={{ ...s.fi, ...s.ddTrigger }} onClick={() => setCatOpen(!catOpen)}>
                                        <span style={{ color: categoryType ? "#0f172a" : "#94a3b8" }}>{catLabel}</span>
                                        <span style={{ fontSize: 10, color: "#94a3b8" }}>▾</span>
                                    </div>
                                    {catOpen && (
                                        <div style={{ ...s.ddMenu, minWidth: 260 }}>
                                            {!categoryType && (
                                                <>
                                                    {CATEGORY_TYPES.map(ct => (
                                                        <div key={ct.value} style={s.ddItem} onClick={() => {
                                                            setCategoryType(ct.value);
                                                            if (ct.value === "residential" || ct.value === "apartment" || ct.value === "villa") {
                                                                // keep dropdown open for sub-type selection
                                                            } else {
                                                                setCatOpen(false);
                                                            }
                                                        }}>{ct.icon} {ct.label}{(ct.value === "residential" || ct.value === "apartment" || ct.value === "villa") ? " ›" : ""}</div>
                                                    ))}
                                                </>
                                            )}
                                            {(categoryType === "residential" || categoryType === "apartment" || categoryType === "villa") && (
                                                <>
                                                    <div style={s.ddGroupHeader}>Property Sub-Type</div>
                                                    {RES_TYPES.map(t => (
                                                        <div key={t} style={{ ...s.ddItem, ...(propertyType === t ? s.ddItemActive : {}) }} onClick={() => setPropertyType(t)}>{t}</div>
                                                    ))}
                                                    <div style={{ padding: "8px 14px 4px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>BHK</div>
                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 14px 12px" }}>
                                                        {ROOM_OPTS.map(r => (
                                                            <button key={r} onClick={() => setRoomCount(r)} style={{ ...s.chip, ...(roomCount === r ? s.chipActive : {}) }}>{r}</button>
                                                        ))}
                                                    </div>
                                                    <div style={{ padding: "8px 14px", borderTop: "1px solid #f1f5f9" }}>
                                                        <button style={s.doneBtn} onClick={() => setCatOpen(false)}>Done</button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Field>
                        </div>
                        <Field label="Status">
                            <select style={s.fi} value={status} onChange={e => setStatus(e.target.value)}>
                                {["Draft", "Available", "Reserved", "Sold"].map(o => <option key={o}>{o}</option>)}
                            </select>
                        </Field>
                        <div style={s.btnRow}>
                            <div />
                            <button style={s.nextBtn} onClick={next}>Next <FiArrowRight size={14} /></button>
                        </div>
                    </div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                    <div style={s.stepContent}>
                        <SectionHeader title="Pricing" sub="Set the price and size of the property" />
                        <div style={s.grid2}>
                            <Field label="Price per unit (Rs.)">
                                <input style={s.fi} type="number" placeholder="0" value={price} onChange={e => setPrice(Number(e.target.value))} />
                            </Field>
                            <Field label="Unit">
                                <select style={s.fi} value={unit} onChange={e => setUnit(e.target.value)}>
                                    <option>sq.ft</option>
                                    <option>sq.yd</option>
                                </select>
                            </Field>
                        </div>
                        <Field label="Plot Size">
                            <input style={s.fi} type="number" placeholder="0" value={size} onChange={e => setSize(Number(e.target.value))} />
                        </Field>
                        <div style={s.totalBox}>
                            <div style={s.totalLeft}>
                                <div style={s.totalLabel}>Calculated Total Price</div>
                                <div style={s.totalValue}>Rs. {total.toLocaleString()}</div>
                            </div>
                            <div style={s.totalRight}>
                                <div style={s.totalSmall}>{price.toLocaleString()}/{unit}</div>
                                <div style={s.totalSmall}>× {size.toLocaleString()} {unit}</div>
                            </div>
                        </div>

                        {/* Price History */}
                        <div style={{ marginTop: 24, marginBottom: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                <label style={s.label}>Price History (Optional)</label>
                                <button
                                    onClick={() => setPriceHistory([...priceHistory, { year: new Date().getFullYear(), price: 0 }])}
                                    style={{ background: "#e0f2fe", color: "#0ea5e9", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                                >
                                    + Add Year
                                </button>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {priceHistory.map((h, i) => (
                                    <div key={i} style={{ display: "flex", gap: 8 }}>
                                        <input type="number" placeholder="Year" value={h.year} onChange={e => {
                                            const newHist = [...priceHistory];
                                            newHist[i] = { ...newHist[i], year: Number(e.target.value) };
                                            setPriceHistory(newHist);
                                        }} style={{ ...s.fi, flex: 1 }} />
                                        <input type="number" placeholder="Price" value={h.price} onChange={e => {
                                            const newHist = [...priceHistory];
                                            newHist[i] = { ...newHist[i], price: Number(e.target.value) };
                                            setPriceHistory(newHist);
                                        }} style={{ ...s.fi, flex: 2 }} />
                                        <button onClick={() => {
                                            setPriceHistory(priceHistory.filter((_, idx) => idx !== i));
                                        }} style={{ background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 6, padding: "0 12px", cursor: "pointer" }}>
                                            <FiTrash2 size={13} />
                                        </button>
                                    </div>
                                ))}
                                {priceHistory.length === 0 && (
                                    <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>No price history added.</div>
                                )}
                            </div>
                        </div>

                        <div style={s.btnRow}>
                            <button style={s.backBtn} onClick={back}><FiArrowLeft size={14} /> Back</button>
                            <button style={s.nextBtn} onClick={next}>Next <FiArrowRight size={14} /></button>
                        </div>
                    </div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                    <div style={s.stepContent}>
                        <SectionHeader title="Additional Details" sub="Agent info, legal status and map location" />
                        <div style={s.grid2}>
                            <Field label="Agent Name">
                                <input style={s.fi} placeholder="e.g. Rajesh Kumar" value={agentName} onChange={e => setAgentName(e.target.value)} />
                            </Field>
                            <Field label="Agent Contact">
                                <input style={s.fi} placeholder="+91 98765 43210" value={agentContact} onChange={e => setAgentContact(e.target.value)} />
                            </Field>
                        </div>
                        <Field label="Description">
                            <textarea style={{ ...s.fi, height: 90, paddingTop: 12, resize: "vertical" }} placeholder="Write a brief description…" value={description} onChange={e => setDescription(e.target.value)} />
                        </Field>
                        <div style={s.grid2}>
                            <Field label="Legal Approval">
                                <select style={s.fi} value={approval} onChange={e => setApproval(e.target.value)}>
                                    {["Pending", "Approved", "Rejected"].map(o => <option key={o}>{o}</option>)}
                                </select>
                            </Field>
                        </div>
                        <Field label="Notes">
                            <textarea style={{ ...s.fi, height: 70, paddingTop: 12, resize: "vertical" }} placeholder="Internal notes…" value={notes} onChange={e => setNotes(e.target.value)} />
                        </Field>
                        <div style={s.checkRow}>
                            <label style={s.checkLabel}>
                                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} style={{ accentColor: "#3b82f6" }} />
                                <span>Publish to mobile app</span>
                            </label>
                        </div>
                        <SectionHeader title="Transparency (POC)" sub="Dual rate, RERA & verification" />
                        <div style={s.grid2}>
                            <Field label="Circle Rate (Rs./sqft)">
                                <input style={s.fi} type="number" value={circleRate} onChange={e => setCircleRate(e.target.value)} />
                            </Field>
                            <Field label="Market Rate (Rs./sqft)">
                                <input style={s.fi} type="number" value={marketRate} onChange={e => setMarketRate(e.target.value)} />
                            </Field>
                        </div>
                        <Field label="Rate Source">
                            <input style={s.fi} placeholder="e.g. Telangana Registration Dept" value={rateSource} onChange={e => setRateSource(e.target.value)} />
                        </Field>
                        <div style={s.grid2}>
                            <Field label="RERA Number">
                                <input style={s.fi} placeholder="e.g. P02400001234" value={reraNumber} onChange={e => setReraNumber(e.target.value)} />
                            </Field>
                            <Field label="Developer">
                                <input style={s.fi} value={developerName} onChange={e => setDeveloperName(e.target.value)} />
                            </Field>
                        </div>
                        <div style={s.grid2}>
                            <Field label="Site Status">
                                <select style={s.fi} value={siteStatus} onChange={e => setSiteStatus(e.target.value)}>
                                    <option value="vacant">Vacant</option>
                                    <option value="under_construction">Under construction</option>
                                    <option value="developed">Developed</option>
                                </select>
                            </Field>
                            <Field label="Flood Risk">
                                <select style={s.fi} value={floodRisk} onChange={e => setFloodRisk(e.target.value)}>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </Field>
                        </div>
                        <div style={s.grid2}>
                            <Field label="Pollution Index (0-100)">
                                <input style={s.fi} type="number" value={pollutionIndex} onChange={e => setPollutionIndex(e.target.value)} />
                            </Field>
                            <Field label="Safety Index (0-100)">
                                <input style={s.fi} type="number" value={safetyIndex} onChange={e => setSafetyIndex(e.target.value)} />
                            </Field>
                        </div>
                        <Field label="Verification Notes">
                            <textarea style={{ ...s.fi, height: 70, paddingTop: 12, resize: "vertical" }} value={verificationNotes} onChange={e => setVerificationNotes(e.target.value)} />
                        </Field>
                        <div style={s.checkRow}>
                            <label style={s.checkLabel}>
                                <input type="checkbox" checked={isVerified} onChange={e => setIsVerified(e.target.checked)} style={{ accentColor: "#059669" }} />
                                <span>Mark as verified</span>
                            </label>
                        </div>

                        <Field label="Source Attribution">
                            <input style={s.fi} placeholder="e.g. Govt rate: Dharani | Market rate: Q4 2025 registrations" value={sourceAttribution} onChange={e => setSourceAttribution(e.target.value)} />
                        </Field>

                        {/* Site Photos */}
                        <div style={{ marginTop: 12, marginBottom: 18 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <label style={s.label}>Site Photos (URLs)</label>
                                <button onClick={() => setSitePhotos([...sitePhotos, { url: "", taken_at: "" }])}
                                    style={{ background: "#e0f2fe", color: "#0ea5e9", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                                    + Add Photo
                                </button>
                            </div>
                            {sitePhotos.map((p, i) => (
                                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                                    <input placeholder="Image URL" value={p.url} onChange={e => {
                                        const arr = [...sitePhotos]; arr[i] = { ...arr[i], url: e.target.value }; setSitePhotos(arr);
                                    }} style={{ ...s.fi, flex: 3 }} />
                                    <input placeholder="Date" value={p.taken_at} onChange={e => {
                                        const arr = [...sitePhotos]; arr[i] = { ...arr[i], taken_at: e.target.value }; setSitePhotos(arr);
                                    }} style={{ ...s.fi, flex: 1 }} />
                                    <button onClick={() => setSitePhotos(sitePhotos.filter((_, idx) => idx !== i))}
                                        style={{ background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 6, padding: "0 12px", cursor: "pointer" }}>
                                        <FiTrash2 size={13} />
                                    </button>
                                </div>
                            ))}
                            {sitePhotos.length === 0 && <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>No photos added.</div>}
                        </div>

                        {/* Local Updates */}
                        <div style={{ marginBottom: 18 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <label style={s.label}>Local Development Updates</label>
                                <button onClick={() => setLocalUpdates([...localUpdates, { date: new Date().toISOString().slice(0, 10), headline: "" }])}
                                    style={{ background: "#e0f2fe", color: "#0ea5e9", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                                    + Add Update
                                </button>
                            </div>
                            {localUpdates.map((u, i) => (
                                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                                    <input type="date" value={u.date} onChange={e => {
                                        const arr = [...localUpdates]; arr[i] = { ...arr[i], date: e.target.value }; setLocalUpdates(arr);
                                    }} style={{ ...s.fi, flex: 1 }} />
                                    <input placeholder="Headline" value={u.headline} onChange={e => {
                                        const arr = [...localUpdates]; arr[i] = { ...arr[i], headline: e.target.value }; setLocalUpdates(arr);
                                    }} style={{ ...s.fi, flex: 3 }} />
                                    <button onClick={() => setLocalUpdates(localUpdates.filter((_, idx) => idx !== i))}
                                        style={{ background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 6, padding: "0 12px", cursor: "pointer" }}>
                                        <FiTrash2 size={13} />
                                    </button>
                                </div>
                            ))}
                            {localUpdates.length === 0 && <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>No updates added.</div>}
                        </div>

                        <Field label="Map Location">
                            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                                <div style={{ flex: 1, position: "relative" }}>
                                    <FiSearch size={14} style={{ position: "absolute", left: 12, top: 15, color: "#94a3b8", pointerEvents: "none" }} />
                                    <input
                                        style={{ ...s.fi, paddingLeft: 34 }}
                                        placeholder="Search location, e.g. Gachibowli, Banjara Hills..."
                                        value={mapSearch}
                                        onChange={e => setMapSearch(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleMapSearch(); } }}
                                    />
                                </div>
                                <button
                                    onClick={handleMapSearch}
                                    disabled={mapSearching}
                                    style={{ height: 44, padding: "0 18px", borderRadius: 10, border: "none", background: "#3b82f6", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: mapSearching ? 0.6 : 1, whiteSpace: "nowrap" }}
                                >
                                    {mapSearching ? "Searching…" : "Search"}
                                </button>
                            </div>
                            <div style={s.mapWrap}>
                                <MapContainer center={[position.lat, position.lng]} zoom={12} style={{ height: "100%", width: "100%" }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <LocationMarker position={position} setPosition={setPosition} />
                                    {flyTarget && <FlyToPosition position={flyTarget} />}
                                </MapContainer>
                            </div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                                Lat: {position.lat?.toFixed(5)}, Lng: {position.lng?.toFixed(5)} — Click map to change or search above
                            </div>
                        </Field>
                        <div style={s.btnRow}>
                            <button style={s.backBtn} onClick={back}><FiArrowLeft size={14} /> Back</button>
                            <button style={s.nextBtn} onClick={next}>Next <FiArrowRight size={14} /></button>
                        </div>
                    </div>
                )}

                {/* STEP 4 — Preview */}
                {step === 4 && (
                    <div style={s.stepContent}>
                        <SectionHeader title="Review & Publish" sub="Confirm the details before publishing" />
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                            {[
                                ["Plot ID", plotId],
                                ["Title", title || `${area} - ${propertyType || categoryType}`],
                                ["Area", area],
                                ["Category", categoryType],
                                ["Status", status],
                                ["Price/unit", `Rs. ${Number(price).toLocaleString()}`],
                                ["Plot Size", `${Number(size).toLocaleString()} ${unit}`],
                                ["Total Price", `Rs. ${total.toLocaleString()}`],
                                ["Agent", agentName],
                                ["Contact", agentContact],
                                ["Approval", approval],
                                ["Published", isPublic ? "Yes" : "No"],
                                ["Price History", priceHistory.length > 0 ? `${priceHistory.length} entry(ies)` : "None"],
                                ["Circle Rate", circleRate ? `Rs. ${Number(circleRate).toLocaleString()}` : ""],
                                ["Market Rate", marketRate ? `Rs. ${Number(marketRate).toLocaleString()}` : ""],
                                ["RERA", reraNumber],
                                ["Developer", developerName],
                                ["Site Status", siteStatus],
                                ["Verified", isVerified ? "Yes" : "No"],
                                ["Site Photos", sitePhotos.length > 0 ? `${sitePhotos.length} photo(s)` : "None"],
                                ["Local Updates", localUpdates.length > 0 ? `${localUpdates.length} update(s)` : "None"],
                                ["Source", sourceAttribution],
                            ].map(([k, v]) => v ? (
                                <div key={k} style={{ display: "flex", gap: 12, fontSize: 14 }}>
                                    <span style={{ fontWeight: 600, color: "#64748b", minWidth: 120 }}>{k}</span>
                                    <span style={{ color: "#0f172a" }}>{v}</span>
                                </div>
                            ) : null)}
                        </div>
                        {submitError && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fee2e2", color: "#dc2626", padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
                                <FiAlertCircle size={15} /> {submitError}
                            </div>
                        )}
                        <div style={s.btnRow}>
                            <button style={s.backBtn} onClick={back}><FiArrowLeft size={14} /> Back</button>
                            <button style={{ ...s.publishBtn, opacity: submitting ? 0.7 : 1 }} onClick={handlePublish} disabled={submitting}>
                                {submitting ? "Publishing…" : <><FiCheck size={14} /> Publish Property</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function SectionHeader({ title, sub }) {
    return (
        <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{title}</h3>
            <p style={{ fontSize: 13, color: "#94a3b8" }}>{sub}</p>
        </div>
    );
}

const s = {
    page: { maxWidth: 640, margin: "0 auto", padding: "20px 16px" },
    stepper: { display: "flex", justifyContent: "space-between", marginBottom: 32 },
    stepWrap: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" },
    stepCircle: { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, zIndex: 2 },
    stepActive: { background: "#3b82f6", color: "#fff", boxShadow: "0 0 0 4px #eff6ff" },
    stepDone: { background: "#10b981", color: "#fff" },
    stepIdle: { background: "#f1f5f9", color: "#94a3b8" },
    stepLabel: { fontSize: 11, fontWeight: 600, marginTop: 8, textAlign: "center" },
    stepLine: { position: "absolute", top: 16, left: "50%", right: "-50%", height: 2, zIndex: 1 },
    card: { background: "#fff", borderRadius: 16, padding: 32, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" },
    stepContent: { animation: "fadeIn 0.3s ease" },
    label: { display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 },
    fi: { width: "100%", height: 44, padding: "0 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", background: "#fff", outline: "none", transition: "border-color 0.2s" },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
    ddTrigger: { display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" },
    ddMenu: { position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, marginTop: 4, zIndex: 20, boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", overflow: "hidden" },
    ddItem: { padding: "10px 14px", fontSize: 14, color: "#334155", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" },
    ddItemActive: { background: "#f0f9ff", color: "#0ea5e9", fontWeight: 600 },
    ddGroupHeader: { padding: "12px 14px 4px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" },
    chip: { padding: "6px 14px", borderRadius: 20, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    chipActive: { borderColor: "#0ea5e9", background: "#f0f9ff", color: "#0ea5e9" },
    doneBtn: { width: "100%", padding: "10px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
    btnRow: { display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 24, borderTop: "1px solid #f1f5f9" },
    nextBtn: { display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" },
    backBtn: { display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" },
    publishBtn: { display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "#10b981", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" },
    totalBox: { background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 12, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 },
    totalLeft: {},
    totalLabel: { fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 },
    totalValue: { fontSize: 24, fontWeight: 800, color: "#0f172a" },
    totalRight: { textAlign: "right" },
    totalSmall: { fontSize: 13, color: "#64748b", fontWeight: 500 },
    mapWrap: { height: 300, borderRadius: 12, overflow: "hidden", border: "1.5px solid #e2e8f0" },
    checkRow: { display: "flex", gap: 12, marginTop: 12, marginBottom: 18 },
    checkLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#334155", cursor: "pointer" },
};
