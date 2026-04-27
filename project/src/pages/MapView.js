import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiFilter, FiMapPin, FiRefreshCw, FiSearch, FiX } from "react-icons/fi";
import { api } from "../api";

const MAP_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;
const HYDERABAD_CENTER = { lat: 17.4065, lng: 78.4772 };

const STATUS_COLOR = {
    Available: "#10b981",
    Sold:      "#7c3aed",
    Reserved:  "#f59e0b",
    Draft:     "#94a3b8",
};

const CATEGORY_COLOR = {
    residential: "#3b82f6",
    commercial:  "#f97316",
};

function formatPrice(n) {
    if (!n) return "—";
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
    return `₹${Number(n).toLocaleString("en-IN")}`;
}

function makePinSvg(color) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
        <filter id="shadow" x="-30%" y="-20%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
        <ellipse cx="18" cy="41" rx="6" ry="3" fill="rgba(0,0,0,0.15)"/>
        <path d="M18 2C10.82 2 5 7.82 5 15c0 9.75 13 27 13 27S31 24.75 31 15C31 7.82 25.18 2 18 2z"
            fill="${color}" filter="url(#shadow)"/>
        <circle cx="18" cy="15" r="6" fill="white" opacity="0.9"/>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function MapView() {
    const { isLoaded } = useJsApiLoader({ googleMapsApiKey: MAP_KEY });
    const mapRef = useRef(null);

    const [properties, setProperties] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [selected, setSelected]     = useState(null);
    const [search, setSearch]         = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [catFilter, setCatFilter]   = useState("All");
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        api.getAllProperties()
            .then(data => setProperties(data || []))
            .finally(() => setLoading(false));
    }, []);

    const filtered = properties.filter(p => {
        const q = search.toLowerCase();
        const matchQ = !q || [p.title, p.area, p.plot_id].some(f => f?.toLowerCase().includes(q));
        const matchS = statusFilter === "All" || p.status === statusFilter;
        const matchC = catFilter === "All" || p.category_type === catFilter;
        return matchQ && matchS && matchC && p.lat && p.lng;
    });

    const onMapLoad = useCallback(map => { mapRef.current = map; }, []);

    const fitBounds = useCallback(() => {
        if (!mapRef.current || filtered.length === 0) return;
        const bounds = new window.google.maps.LatLngBounds();
        filtered.forEach(p => bounds.extend({ lat: Number(p.lat), lng: Number(p.lng) }));
        mapRef.current.fitBounds(bounds, { top: 80, bottom: 40, left: 40, right: 40 });
    }, [filtered]);

    const stats = {
        total:     filtered.length,
        available: filtered.filter(p => p.status === "Available").length,
        sold:      filtered.filter(p => p.status === "Sold").length,
        reserved:  filtered.filter(p => p.status === "Reserved").length,
    };

    return (
        <div style={s.page}>
            {/* ── Toolbar ── */}
            <div style={s.toolbar}>
                <div style={s.searchWrap}>
                    <FiSearch size={14} style={{ position: "absolute", left: 12, color: "#94a3b8" }} />
                    <input
                        style={s.searchInput}
                        placeholder="Search by title, area, plot ID…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button onClick={() => setSearch("")} style={s.clearBtn}><FiX size={13} /></button>
                    )}
                </div>
                <button onClick={() => setShowFilters(f => !f)} style={{ ...s.btn, ...(showFilters ? s.btnActive : {}) }}>
                    <FiFilter size={14} /> Filters
                    {(statusFilter !== "All" || catFilter !== "All") && <span style={s.badge} />}
                </button>
                <button onClick={fitBounds} style={s.btn} title="Fit all pins">
                    <FiMapPin size={14} /> Fit All
                </button>
                <button onClick={() => { setLoading(true); api.getAllProperties().then(d => setProperties(d || [])).finally(() => setLoading(false)); }} style={s.iconBtn}>
                    <FiRefreshCw size={14} />
                </button>
            </div>

            {/* ── Filter panel ── */}
            {showFilters && (
                <div style={s.filterPanel}>
                    <div style={s.filterGroup}>
                        <div style={s.filterLabel}>STATUS</div>
                        <div style={s.filterRow}>
                            {["All", "Available", "Sold", "Reserved", "Draft"].map(v => (
                                <button key={v} onClick={() => setStatusFilter(v)}
                                    style={{ ...s.chip, ...(statusFilter === v ? { ...s.chipActive, borderColor: STATUS_COLOR[v] || "#3b82f6", color: STATUS_COLOR[v] || "#3b82f6", background: `${STATUS_COLOR[v] || "#3b82f6"}18` } : {}) }}>
                                    {v !== "All" && <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_COLOR[v], display: "inline-block", marginRight: 5 }} />}
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={s.filterGroup}>
                        <div style={s.filterLabel}>CATEGORY</div>
                        <div style={s.filterRow}>
                            {["All", "residential", "commercial"].map(v => (
                                <button key={v} onClick={() => setCatFilter(v)}
                                    style={{ ...s.chip, ...(catFilter === v ? { ...s.chipActive, borderColor: CATEGORY_COLOR[v] || "#3b82f6", color: CATEGORY_COLOR[v] || "#3b82f6", background: `${CATEGORY_COLOR[v] || "#3b82f6"}18` } : {}) }}>
                                    {v === "All" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Stats bar ── */}
            <div style={s.statsBar}>
                {[
                    { label: "Showing", value: stats.total, color: "#3b82f6" },
                    { label: "Available", value: stats.available, color: "#10b981" },
                    { label: "Sold", value: stats.sold, color: "#7c3aed" },
                    { label: "Reserved", value: stats.reserved, color: "#f59e0b" },
                ].map(({ label, value, color }) => (
                    <div key={label} style={s.statItem}>
                        <span style={{ ...s.statDot, background: color }} />
                        <span style={s.statValue}>{value}</span>
                        <span style={s.statLabel}>{label}</span>
                    </div>
                ))}
                {loading && <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>Loading…</span>}
            </div>

            {/* ── Map ── */}
            <div style={s.mapWrap}>
                {!isLoaded ? (
                    <div style={s.mapLoader}>
                        <div style={s.spinner} />
                        <span style={{ color: "#64748b", fontSize: 13, marginTop: 12 }}>Loading Google Maps…</span>
                    </div>
                ) : (
                    <GoogleMap
                        mapContainerStyle={{ width: "100%", height: "100%" }}
                        center={HYDERABAD_CENTER}
                        zoom={11}
                        onLoad={onMapLoad}
                        onClick={() => setSelected(null)}
                        options={{
                            styles: mapStyles,
                            disableDefaultUI: false,
                            zoomControl: true,
                            mapTypeControl: false,
                            streetViewControl: false,
                            fullscreenControl: true,
                            gestureHandling: "greedy",
                        }}
                    >
                        {filtered.map(p => (
                            <Marker
                                key={p.id}
                                position={{ lat: Number(p.lat), lng: Number(p.lng) }}
                                icon={{
                                    url: makePinSvg(STATUS_COLOR[p.status] || "#64748b"),
                                    scaledSize: new window.google.maps.Size(36, 44),
                                    anchor: new window.google.maps.Point(18, 44),
                                }}
                                onClick={() => setSelected(p)}
                                title={p.title}
                            />
                        ))}

                        {selected && (
                            <InfoWindow
                                position={{ lat: Number(selected.lat), lng: Number(selected.lng) }}
                                onCloseClick={() => setSelected(null)}
                                options={{ pixelOffset: new window.google.maps.Size(0, -44) }}
                            >
                                <div style={s.infoWin}>
                                    <div style={s.infoHeader}>
                                        <span style={{ ...s.infoStatus, background: `${STATUS_COLOR[selected.status]}18`, color: STATUS_COLOR[selected.status] }}>
                                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLOR[selected.status], display: "inline-block", marginRight: 4 }} />
                                            {selected.status}
                                        </span>
                                        <span style={{ ...s.infoCat, color: CATEGORY_COLOR[selected.category_type] || "#64748b" }}>
                                            {selected.category_type === "residential" ? "Residential" : "Commercial"}
                                        </span>
                                    </div>
                                    <div style={s.infoTitle}>{selected.title}</div>
                                    <div style={s.infoArea}>
                                        <FiMapPin size={11} style={{ color: "#94a3b8", flexShrink: 0 }} />
                                        {selected.area}
                                    </div>
                                    <div style={s.infoPrice}>{formatPrice(selected.current_price)}</div>
                                    <div style={s.infoRow}>
                                        <span style={s.infoMeta}>₹{Number(selected.price_per_sqft).toLocaleString("en-IN")}/sqft</span>
                                        <span style={s.infoMeta}>{selected.size} {selected.unit}</span>
                                    </div>
                                    {selected.rera_number && (
                                        <div style={s.infoRera}>RERA: {selected.rera_number}</div>
                                    )}
                                    {selected.is_verified && (
                                        <div style={s.infoVerified}>✓ Verified</div>
                                    )}
                                </div>
                            </InfoWindow>
                        )}
                    </GoogleMap>
                )}
            </div>

            {/* ── Legend ── */}
            <div style={s.legend}>
                {Object.entries(STATUS_COLOR).map(([status, color]) => (
                    <div key={status} style={s.legendItem}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
                        <span style={s.legendLabel}>{status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Subtle light map style ──────────────────────────────────────────────────
const mapStyles = [
    { featureType: "all", elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9d8e8" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e0e0e0" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5f0e5" }] },
    { featureType: "poi.business", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#424242" }] },
    { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
];

// ── Styles ─────────────────────────────────────────────────────────────────
const s = {
    page: { display: "flex", flexDirection: "column", height: "100%", gap: 0 },

    toolbar: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
    searchWrap: { flex: 1, maxWidth: 380, position: "relative", display: "flex", alignItems: "center" },
    searchInput: { width: "100%", height: 40, paddingLeft: 36, paddingRight: 32, border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, color: "#0f172a", background: "#fff", outline: "none" },
    clearBtn: { position: "absolute", right: 10, background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center" },
    btn: { display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer", position: "relative" },
    btnActive: { borderColor: "#3b82f6", color: "#3b82f6", background: "#eff6ff" },
    badge: { position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: "50%", background: "#ef4444" },
    iconBtn: { width: 40, height: 40, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },

    filterPanel: { background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "14px 18px", marginBottom: 12, display: "flex", gap: 24 },
    filterGroup: { display: "flex", flexDirection: "column", gap: 8 },
    filterLabel: { fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.8px" },
    filterRow: { display: "flex", gap: 6, flexWrap: "wrap" },
    chip: { display: "flex", alignItems: "center", padding: "5px 12px", borderRadius: 20, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" },
    chipActive: { borderColor: "#3b82f6", color: "#3b82f6", background: "#eff6ff" },

    statsBar: { display: "flex", alignItems: "center", gap: 20, padding: "10px 16px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, marginBottom: 12 },
    statItem: { display: "flex", alignItems: "center", gap: 7 },
    statDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
    statValue: { fontSize: 15, fontWeight: 700, color: "#0f172a" },
    statLabel: { fontSize: 12, color: "#64748b", fontWeight: 500 },

    mapWrap: { flex: 1, minHeight: 500, borderRadius: 16, overflow: "hidden", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" },
    mapLoader: { width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc" },
    spinner: { width: 32, height: 32, border: "3px solid #e2e8f0", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" },

    infoWin: { minWidth: 200, maxWidth: 240, fontFamily: "-apple-system, sans-serif" },
    infoHeader: { display: "flex", alignItems: "center", gap: 6, marginBottom: 8 },
    infoStatus: { display: "flex", alignItems: "center", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 },
    infoCat: { fontSize: 11, fontWeight: 600 },
    infoTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 4, lineHeight: 1.3 },
    infoArea: { display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#64748b", marginBottom: 8 },
    infoPrice: { fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 4 },
    infoRow: { display: "flex", gap: 12, marginBottom: 6 },
    infoMeta: { fontSize: 11, color: "#94a3b8", fontWeight: 500 },
    infoRera: { fontSize: 11, color: "#64748b", fontFamily: "monospace", marginTop: 4 },
    infoVerified: { fontSize: 11, color: "#059669", fontWeight: 700, marginTop: 4 },

    legend: { display: "flex", gap: 16, padding: "10px 4px 0", flexWrap: "wrap" },
    legendItem: { display: "flex", alignItems: "center", gap: 6 },
    legendLabel: { fontSize: 12, color: "#64748b", fontWeight: 500 },
};
