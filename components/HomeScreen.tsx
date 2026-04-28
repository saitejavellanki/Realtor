import { useRouter } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    BackHandler,
    FlatList,
    Linking,
    Modal,
    PanResponder,
    Platform,
    Image as RNImage,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Line, Path, Polygon, Polyline, Rect, Stop, LinearGradient as SvgLinearGradient, Text as SvgText } from "react-native-svg";
import { ChatMessage, clearChatHistory, getChatHistory, getComparables, getFraudCheck, getProfile, getProperties, getSavedIds, saveProperty, scheduleVisit, sendChatMessage, unsaveProperty, updateProfile } from "../utils/api";
import { clearSession, getUser } from "../utils/authStorage";
import AboutScreen from "./AboutScreen";
import MapView, { Marker, PROVIDER_GOOGLE } from "./MapViewWrapper";

// "€"€"€ Responsive system "€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€
const FIGMA_W = 375;
const FIGMA_H = 812;
const MAX_LAYOUT_W = 430;

function useResponsive() {
  const { width: winW, height: winH } = useWindowDimensions();
  const layoutW = Math.min(winW, MAX_LAYOUT_W);
  const layoutH = winH;
  const vw = (p: number) => (layoutW * p) / 100;
  const vh = (p: number) => (layoutH * p) / 100;
  const fw = (px: number) => vw((px / FIGMA_W) * 100);
  const fh = (px: number) => vh((px / FIGMA_H) * 100);
  return { layoutW, layoutH, vw, vh, fw, fh, isTablet: winW > 600 };
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Property = {
  id: string;
  plot: string;
  title: string;
  area: string;
  location: string;
  pricePerSqft: number;
  priceChange: string;
  size: string;
  zoning: string;
  status: "Available" | "Sold" | "Pending" | "Reserved" | "Draft";
  demand: "High demand" | "Medium" | "Low";
  type: "residential" | "commercial";
  currentPrice: number;
  pastYearGain: number;
  description: string;
  agentName: string;
  agentRole: string;
  agentPhone?: string;
  beds: number;
  baths: number;
  garage: number;
  yearBuilt: number;
  priceHistory: { year: number; price: number }[] | number[];
  lat?: number;
  lng?: number;
  // ─── POC Transparency fields ───
  circleRate?: number;
  marketRate?: number;
  rateVariance?: number;
  rateSource?: string | null;
  rateLastUpdated?: string | null;
  isVerified?: boolean;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  verificationNotes?: string | null;
  reraNumber?: string | null;
  siteStatus?: "vacant" | "under_construction" | "developed";
  developerName?: string | null;
  developerId?: number | null;
  floodRisk?: "low" | "medium" | "high";
  pollutionIndex?: number | null;
  safetyIndex?: number | null;
  nearbyInfra?: { type: string; name: string; distance_km: number }[];
  localUpdates?: { date: string; headline: string }[];
  sitePhotos?: { url: string; taken_at?: string }[];
  sourceAttribution?: string | null;
  transparencyScore?: number;
  isPublic?: boolean;
};

// Map API response to include latitude/longitude for MapView
type PropertyWithCoords = Property & {
  latitude: number;
  longitude: number;
};

// "€"€"€ Helpers "€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€
const demandColors = (d: Property["demand"]) => {
  if (d === "High demand") return { bg: "#FFF0F2", text: "#FF6B8A" };
  if (d === "Medium") return { bg: "#FFF8EC", text: "#F5A623" };
  return { bg: "#F0F0F0", text: "#888888" };
};
const statusColors = (s: Property["status"]) => {
  if (s === "Available") return { bg: "#E8F7EF", text: "#47CB84" };
  if (s === "Pending") return { bg: "#FFF8EC", text: "#F5A623" };
  return { bg: "#F0F0F0", text: "#888888" };
};

const formatPrice = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

// "€"€"€ Map / List toggle icons "€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€
const MapViewIcon = ({ active }: { active: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 20L3 17V4l6 3m0 13l6-3m-6 3V7m6 10l6 3V7l-6-3m0 13V4"
      stroke={active ? "#FF385C" : "#717171"} strokeWidth={1.7}
      strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

const ListViewIcon = ({ active }: { active: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M8 6h13M8 12h13M8 18h13" stroke={active ? "#FF385C" : "#717171"} strokeWidth={1.7} strokeLinecap="round" />
    <Circle cx="3" cy="6" r="1.2" fill={active ? "#FF385C" : "#717171"} />
    <Circle cx="3" cy="12" r="1.2" fill={active ? "#FF385C" : "#717171"} />
    <Circle cx="3" cy="18" r="1.2" fill={active ? "#FF385C" : "#717171"} />
  </Svg>
);

// "€"€"€ Price Pin Marker "€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€
const PricePinMarker = ({ price, selected }: { price: number; selected: boolean; type: string }) => {
  // Short format: ₹8.8K — keeps label compact and consistent across all pin sizes
  const label = price >= 100000
    ? `₹${(price / 100000).toFixed(1)}L`
    : price >= 1000
    ? `₹${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}K`
    : `₹${price}`;

  return (
    <View collapsable={false} style={{ alignItems: "center" }}>
      <View collapsable={false} style={{
        backgroundColor: selected ? "#FF385C" : "#FFFFFF",
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        elevation: selected ? 6 : 4,
        borderWidth: selected ? 0 : 1,
        borderColor: "#DDDDDD",
      }}>
        <Text style={{
          color: selected ? "#FFFFFF" : "#222222",
          fontSize: 11,
          fontWeight: "700",
        }}>{label}</Text>
      </View>
      <View collapsable={false} style={{
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: selected ? "#FF385C" : "#999999",
        marginTop: 3,
      }} />
    </View>
  );
};

// "€"€"€ Map View Screen "€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€
const MapViewScreen = ({
  properties, likedIds, onLikeToggle, onViewDetail,
  NAV_HEIGHT, NAV_BOTTOM, statusBarH, vw,
}: {
  properties: PropertyWithCoords[];
  likedIds: Set<string>;
  onLikeToggle: (id: string) => void;
  onViewDetail: (p: PropertyWithCoords) => void;
  NAV_HEIGHT: number;
  NAV_BOTTOM: number;
  statusBarH: number;
  vw: (p: number) => number;
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(260)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const selectedProp = properties.find((p) => p.id === selectedId) ?? null;

  // Start tracking so Android snapshots the markers after they render.
  // Switch off after 3s to save battery — selected markers stay tracked always.
  const [tracksViews, setTracksViews] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTracksViews(false), 3000);
    return () => clearTimeout(t);
  }, []);

  // Guard: on Android, MapView.onPress fires right after Marker.onPress,
  // which would immediately hide the card we just showed.
  const markerJustPressed = useRef(false);

  const showCard = (id: string) => {
    markerJustPressed.current = true;
    setTimeout(() => { markerJustPressed.current = false; }, 350);
    setSelectedId(id);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 11 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 70, friction: 11 }),
    ]).start();
  };

  const hideCard = () => {
    if (markerJustPressed.current) return; // ignore map tap that fires alongside marker tap
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 260, duration: 220, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 220, useNativeDriver: true }),
    ]).start(() => setSelectedId(null));
  };

  const CARD_BOTTOM = NAV_HEIGHT + NAV_BOTTOM + vw(2);
  const dc = selectedProp ? demandColors(selectedProp.demand) : { bg: "#FFF", text: "#000" };
  const sc = selectedProp ? statusColors(selectedProp.status) : { bg: "#FFF", text: "#000" };
  const liked = selectedProp ? likedIds.has(selectedProp.id) : false;
  const isResidential = selectedProp?.type === "residential";

  const navBottomInset = NAV_HEIGHT + NAV_BOTTOM;

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: 17.4401,
          longitude: 78.3913,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        }}
        onPress={() => hideCard()}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        mapPadding={{ top: 0, right: 0, bottom: navBottomInset + 160, left: 0 }}
      >
        {properties.map((prop) => (
          <Marker
            key={`${prop.id}-${selectedId === prop.id}`}
            coordinate={{ latitude: prop.latitude, longitude: prop.longitude }}
            onPress={() => showCard(prop.id)}
            anchor={{ x: 0.5, y: 0.9 }}
            tracksViewChanges={tracksViews || selectedId === prop.id}
          >
            <PricePinMarker
              price={prop.pricePerSqft}
              selected={selectedId === prop.id}
              type={prop.type}
            />
          </Marker>
        ))}
      </MapView>

      {/* "€"€ Bottom property card "€"€ */}
      {selectedProp && (
        <Animated.View
          style={[
            mapS.card,
            {
              bottom: CARD_BOTTOM,
              left: vw(4),
              right: vw(4),
              borderRadius: vw(6),
              zIndex: 50,
              elevation: 30,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {/* Drag handle */}
          <View style={mapS.dragHandle} />

          {/* Photo panel */}
          <View style={mapS.imgPanel}>
            <RNImage
              source={isResidential ? RESIDENTIAL_IMAGES[0] : COMMERCIAL_IMAGES[0]}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
            <View style={mapS.imgOverlay} />
            {/* Status badge */}
            <View style={[mapS.statusBadge, { backgroundColor: sc.bg }]}>
              <View style={[mapS.statusDot, { backgroundColor: sc.text }]} />
              <Text style={[mapS.statusBadgeText, { color: sc.text }]}>{selectedProp.status}</Text>
            </View>
            {/* Price + close on image */}
            <View style={mapS.imgPriceRow}>
              <Text style={mapS.imgPrice}>
                ₹{selectedProp.pricePerSqft.toLocaleString("en-IN")}<Text style={mapS.imgPriceUnit}>/sqft</Text>
              </Text>
              <TouchableOpacity onPress={hideCard} style={mapS.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                  <Path d="M3 3l8 8M11 3l-8 8" stroke="rgba(255,255,255,0.85)" strokeWidth={1.8} strokeLinecap="round" />
                </Svg>
              </TouchableOpacity>
            </View>
          </View>

          {/* Card body */}
          <View style={mapS.bodyPad}>
            <View style={mapS.cardTopRow}>
              <View style={[mapS.demandBadge, { backgroundColor: dc.bg }]}>
                <Text style={[mapS.demandText, { color: dc.text }]}>{selectedProp.demand}</Text>
              </View>
              <Text style={mapS.plotText}>{selectedProp.plot}</Text>
            </View>
            <Text style={mapS.cardTitle} numberOfLines={1}>{selectedProp.title}</Text>
            <Text style={mapS.cardLocation} numberOfLines={1}>&#x1F4CD; {selectedProp.location}</Text>

            {/* Stats strip */}
            <View style={mapS.statsStrip}>
              <View style={mapS.statItem}>
                <Text style={mapS.statLabel}>SIZE</Text>
                <Text style={mapS.statValue}>{selectedProp.size}</Text>
              </View>
              <View style={mapS.statSep} />
              <View style={mapS.statItem}>
                <Text style={mapS.statLabel}>ZONE</Text>
                <Text style={mapS.statValue}>{selectedProp.zoning.split(" ")[0]}</Text>
              </View>
              <View style={mapS.statSep} />
              <View style={mapS.statItem}>
                <Text style={mapS.statLabel}>CHANGE</Text>
                <Text style={[mapS.statValue, { color: "#10B981" }]}>{selectedProp.priceChange.replace(" vs last year", "")}</Text>
              </View>
            </View>

            {/* Action row */}
            <View style={mapS.actionRow}>
              <TouchableOpacity style={mapS.viewDetailBtn} onPress={() => onViewDetail(selectedProp)} activeOpacity={0.85}>
                <Text style={mapS.viewDetailText}>View Details</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onLikeToggle(selectedProp.id)} activeOpacity={0.7} style={[mapS.likeBtn, liked && mapS.likeBtnActive]}>
                <HeartIcon filled={liked} size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}


      {/* Property count badge on map */}
      <View style={[mapS.countBadge, { top: vw(3), right: vw(3), zIndex: 10, elevation: 10 }]}>
        <Text style={mapS.countBadgeText}>{properties.length} plots</Text>
      </View>
    </View>
  );
};

const mapS = StyleSheet.create({
  card: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 20,
    overflow: "hidden",
  },
  dragHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignSelf: "center",
    marginBottom: 12,
  },
  imgPanel: {
    width: "100%",
    height: 140,
    position: "relative",
    marginBottom: 0,
  },
  imgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  imgPriceRow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  imgPrice: {
    fontSize: 20,
    fontFamily: "Manrope_700Bold",
    color: "#FFFFFF",
  },
  imgPriceUnit: {
    fontSize: 11,
    fontFamily: "Manrope_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  bodyPad: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  statusBadge: {
    position: "absolute",
    top: 10,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 10, fontFamily: "Manrope_700Bold" },
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  statItem: { flex: 1, alignItems: "center" },
  statSep: { width: 1, height: 20, backgroundColor: "#EBEBEB" },
  statLabel: { fontSize: 7, fontFamily: "Manrope_600SemiBold", color: "#717171", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 1 },
  statValue: { fontSize: 11, fontFamily: "Manrope_700Bold", color: "#222222" },

  cardTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  demandBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  demandText: { fontSize: 10, fontFamily: "Manrope_600SemiBold" },
  plotText: { fontSize: 11, fontFamily: "Manrope_400Regular", color: "#717171", flex: 1 },
  closeBtn: { padding: 4 },
  bodyRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  imgBox: {
    width: 72, height: 72, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    position: "relative",
  },

  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  changePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  changeText: { fontSize: 10, fontFamily: "Manrope_600SemiBold", color: "#3FB770" },
  cardTitle: { fontSize: 15, fontFamily: "Manrope_700Bold", color: "#222222", lineHeight: 20 },
  cardLocation: { fontSize: 11, fontFamily: "Manrope_400Regular", color: "#717171", marginTop: 3 },
  cardPrice: { fontSize: 16, fontFamily: "Manrope_700Bold", color: "#FF385C" },
  cardPriceUnit: { fontSize: 11, fontFamily: "Manrope_400Regular", color: "#717171" },
  cardPriceChange: { fontSize: 10, fontFamily: "Manrope_400Regular", color: "#47CB84", marginTop: 2, textAlign: "right" },
  divider: { height: 1, backgroundColor: "#F0F3F7", marginBottom: 12 },
  tagsRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  tag: { flex: 1, alignItems: "center" },
  tagSep: { width: 1, height: 28, backgroundColor: "#F0F3F7" },
  tagLabel: { fontSize: 8, fontFamily: "Manrope_600SemiBold", color: "#C4CAD4", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 },
  tagValue: { fontSize: 11, fontFamily: "Manrope_700Bold", color: "#222222" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  viewDetailBtn: {
    flex: 1, backgroundColor: "#FF385C", borderRadius: 24,
    height: 46, alignItems: "center", justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#FF385C", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  viewDetailText: { fontSize: 14, fontFamily: "Manrope_700Bold", color: "#FFFFFF" },
  likeBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: "#F4F6FA",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#EDF0F7",
  },
  likeBtnActive: { backgroundColor: "#FFF0F3", borderColor: "#FFD6DF" },
  countBadge: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 6,
  },
  countBadgeText: { fontSize: 11, fontFamily: "Manrope_600SemiBold", color: "#222222" },
});

// "€"€"€ SVG Icons "€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€
const SearchIcon = ({ color = "#222222" }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Circle cx="8" cy="8" r="5.5" stroke={color} strokeWidth={1.6} />
    <Line x1="12.2" y1="12.2" x2="16" y2="16" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

const FilterIcon = ({ active }: { active: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M3 5h14" stroke={active ? "#FF385C" : "#B0BABF"} strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M6 10h8" stroke={active ? "#FF385C" : "#B0BABF"} strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M9 15h2" stroke={active ? "#FF385C" : "#B0BABF"} strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

const WifiIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path d="M1.5 6.5C4.5 3.5 13.5 3.5 16.5 6.5" stroke="#252C32" strokeWidth={1.4} strokeLinecap="round" />
    <Path d="M4 9.2C6 7.2 12 7.2 14 9.2" stroke="#252C32" strokeWidth={1.4} strokeLinecap="round" />
    <Path d="M6.5 11.8C7.8 10.5 10.2 10.5 11.5 11.8" stroke="#252C32" strokeWidth={1.4} strokeLinecap="round" />
    <Circle cx="9" cy="14" r="1" fill="#252C32" />
  </Svg>
);

const HeartIcon = ({ filled = false, size = 20 }: { filled?: boolean; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill={filled ? "#FF6B8A" : "none"}
      stroke={filled ? "#FF6B8A" : "#717171"}
      strokeWidth={1.8}
    />
  </Svg>
);

const ClearIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M4 4l8 8M12 4l-8 8" stroke="#717171" strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

const CheckmarkIcon = () => (
  <Svg width={10} height={8} viewBox="0 0 10 8">
    <Path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const HomeNavIcon = ({ active }: { active: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"
      stroke={active ? "#FF385C" : "#717171"} strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

const HeartNavIcon = ({ active }: { active: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill={active ? "#FF385C" : "none"}
      stroke={active ? "#FF385C" : "#717171"} strokeWidth={1.8}
    />
  </Svg>
);

const DashboardNavIcon = ({ active }: { active: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="2" width="8" height="8" rx="1" stroke={active ? "#FF385C" : "#717171"} strokeWidth={1.8} />
    <Rect x="14" y="2" width="8" height="8" rx="1" stroke={active ? "#FF385C" : "#717171"} strokeWidth={1.8} />
    <Rect x="2" y="14" width="8" height="8" rx="1" stroke={active ? "#FF385C" : "#717171"} strokeWidth={1.8} />
    <Rect x="14" y="14" width="8" height="8" rx="1" stroke={active ? "#FF385C" : "#717171"} strokeWidth={1.8} />
  </Svg>
);

const ProfileNavIcon = ({ active }: { active: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={active ? "#FF385C" : "#717171"} strokeWidth={1.8} />
    <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={active ? "#FF385C" : "#717171"} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const EditIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M11.333 2a1.886 1.886 0 012.667 2.667L4.667 14H2v-2.667L11.333 2z"
      stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

const PhoneIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1V20a1 1 0 01-1 1C9.61 21 3 14.39 3 6a1 1 0 011-1h3.5a1 1 0 011 1c0 1.36.27 2.67.76 3.88a1 1 0 01-.21 1.11l-2.43 1.8z"
      fill="#FF385C"
    />
  </Svg>
);

const BedIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M3 17v-6a2 2 0 012-2h14a2 2 0 012 2v6" stroke="#FF385C" strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M3 17h18M3 11V7a2 2 0 012-2h3a2 2 0 012 2v4" stroke="#FF385C" strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

const BathIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M4 12h16v4a4 4 0 01-4 4H8a4 4 0 01-4-4v-4z" stroke="#FF385C" strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M6 12V6a2 2 0 012-2h1" stroke="#FF385C" strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

const GarageIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M3 10l9-7 9 7v10a1 1 0 01-1 1H4a1 1 0 01-1-1V10z" stroke="#FF385C" strokeWidth={1.6} strokeLinecap="round" />
    <Path d="M8 21V14h8v7" stroke="#FF385C" strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

const CalendarIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" stroke="#FF385C" strokeWidth={1.6} />
    <Path d="M8 2v4M16 2v4M3 10h18" stroke="#FF385C" strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

const VerifiedBadge = ({ size = 80 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <Path
      d="M40 6L48.5 12.5L59 10L63 20.5L73 25L70.5 36L77 44.5L70.5 53L73 64L63 68.5L59 79L48.5 76.5L40 83L31.5 76.5L21 79L17 68.5L7 64L9.5 53L3 44.5L9.5 36L7 25L17 20.5L21 10L31.5 12.5L40 6Z"
      fill="#3B6351"
    />
    <Path
      d="M28 40l8 8 16-16"
      stroke="#FFFFFF"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M40 14L46.2 19L55 17.5L58.2 25.8L66.5 30L64.5 39L70 46.2L64.5 53.5L66.5 62.5L58.2 66.5L55 74.8L46.2 72.5L40 77.5L33.8 72.5L25 74.8L21.8 66.5L13.5 62.5L15.5 53.5L10 46.2L15.5 39L13.5 30L21.8 25.8L25 17.5L33.8 19L40 14Z"
      fill="none"
      stroke="#F9F2ED"
      strokeWidth={1.5}
    />
    <Path d="M40 14L46.2 19L55 17.5L58.2 25.8L66.5 30L64.5 39L70 46.2" stroke="#F9F2ED" strokeWidth={0.5} />
  </Svg>
);

// "€"€"€ Price History Chart "€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€
const PriceHistoryChart = ({ data, width, height }: { data: number[]; width: number; height: number }) => {
  const PADDING = { left: 8, right: 8, top: 20, bottom: 0 };
  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => ({
    x: PADDING.left + (i / (data.length - 1)) * chartW,
    y: PADDING.top + chartH - ((v - min) / range) * chartH,
  }));

  const linePoints = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints = [
    `${pts[0].x},${PADDING.top + chartH}`,
    ...pts.map((p) => `${p.x},${p.y}`),
    `${pts[pts.length - 1].x},${PADDING.top + chartH}`,
  ].join(" ");

  // Peak point
  const peakIdx = data.indexOf(max);
  const peakPt = pts[peakIdx];

  // Mid-range dashed line (average)
  const avgY = PADDING.top + chartH - ((((max + min) / 2) - min) / range) * chartH;

  // Year labels: 2017€"2021 mapped across
  const years = ["2017", "2018", "2019", "2020", "2021"];

  return (
    <Svg width={width} height={height + 24}>
      <Defs>
        <SvgLinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#4568FF" stopOpacity="0.3" />
          <Stop offset="100%" stopColor="#4568FF" stopOpacity="0" />
        </SvgLinearGradient>
      </Defs>

      {/* Area fill */}
      <Polygon points={areaPoints} fill="url(#chartGrad)" />

      {/* Avg dashed line */}
      <Line
        x1={PADDING.left} y1={avgY}
        x2={PADDING.left + chartW} y2={avgY}
        stroke="#BFC6E5" strokeWidth={1} strokeDasharray="4,3"
      />

      {/* Main line */}
      <Polyline
        points={linePoints}
        fill="none"
        stroke="#4568FF"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Peak annotation */}
      {peakPt && (
        <>
          <Line
            x1={peakPt.x} y1={PADDING.top - 4}
            x2={peakPt.x} y2={peakPt.y - 6}
            stroke="#3D3E42" strokeWidth={1} strokeDasharray="3,2"
          />
          <SvgText
            x={peakPt.x + 5}
            y={PADDING.top + 4}
            fontSize={9}
            fontWeight="500"
            fill="#3D3E42"
            letterSpacing={0.5}
          >
            +₹{max > 100000 ? `${(max / 100000).toFixed(1)}L` : max.toLocaleString("en-IN")}
          </SvgText>

          {/* Dot at peak */}
          <Circle cx={peakPt.x} cy={peakPt.y} r={4} fill="#4568FF" />
          <Circle cx={peakPt.x} cy={peakPt.y} r={7} fill="#4568FF" fillOpacity={0.2} />
        </>
      )}

      {/* Year labels */}
      {years.map((yr, i) => (
        <SvgText
          key={yr}
          x={PADDING.left + (i / (years.length - 1)) * chartW}
          y={height + 16}
          fontSize={9}
          fill="#95969B"
          textAnchor={i === 0 ? "start" : i === years.length - 1 ? "end" : "middle"}
          letterSpacing={0.5}
        >
          {yr}
        </SvgText>
      ))}
    </Svg>
  );
};

// "€"€"€ Property Detail Screen "€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€
// Detail page image carousel
const DetailImageCarousel = ({ images, width }: { images: any[]; width: number }) => {
  const [activeSlide, setActiveSlide] = React.useState(0);
  const handleScroll = (e: any) => {
    const slide = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveSlide(slide);
  };
  return (
    <View style={{ width, height: 280, position: "relative" }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ width, height: 280 }}
      >
        {images.map((img, i) => (
          <View key={i} style={{ width, height: 280, overflow: "hidden" }}>
            <RNImage source={img} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            {/* Subtle bottom gradient for text readability */}
            <View style={[StyleSheet.absoluteFill as any, { justifyContent: "flex-end" }]}>
              <View style={{ height: 80, backgroundColor: "rgba(0,0,0,0.15)" }} />
            </View>
          </View>
        ))}
      </ScrollView>
      {/* Count badge */}
      <View style={{ position: "absolute", top: 14, right: 14, backgroundColor: "rgba(0,0,0,0.35)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backdropFilter: "blur(10px)" }}>
        <Text style={{ color: "#FFF", fontSize: 12, fontFamily: "Manrope_600SemiBold" }}>{activeSlide + 1} / {images.length}</Text>
      </View>
      {/* Dot indicators */}
      <View style={{ position: "absolute", bottom: 16, alignSelf: "center", flexDirection: "row", gap: 6 }}>
        {images.map((_, i) => (
          <View key={i} style={[
            { height: 6, borderRadius: 3 },
            i === activeSlide ? { width: 22, backgroundColor: "#FFFFFF" } : { width: 6, backgroundColor: "rgba(255,255,255,0.5)" },
          ]} />
        ))}
      </View>
    </View>
  );
};

// Property Detail Screen
// ─── NRI / Investor Dashboard ────────────────────────────────────────────────
const NriDashboardScreen = ({
  vw, fw, NAV_HEIGHT, NAV_BOTTOM, statusBarH, properties, onOpenProperty,
}: {
  vw: (p: number) => number;
  fw: (px: number) => number;
  NAV_HEIGHT: number; NAV_BOTTOM: number; statusBarH: number;
  properties: Property[];
  onOpenProperty: (p: Property) => void;
}) => {
  // Aggregate client-side from already-loaded properties (no extra API roundtrip needed for POC)
  const total = properties.length;
  const verified = properties.filter(p => p.isVerified).length;
  const withRera = properties.filter(p => !!p.reraNumber).length;
  const avgPremium = properties.length
    ? Math.round(
        (properties.reduce((s, p) => s + (p.rateVariance || 0), 0) / properties.length) * 10
      ) / 10
    : 0;

  // Top zones by avg market rate
  const zoneMap: Record<string, { count: number; sumRate: number; sumYoY: number }> = {};
  properties.forEach(p => {
    if (!zoneMap[p.area]) zoneMap[p.area] = { count: 0, sumRate: 0, sumYoY: 0 };
    zoneMap[p.area].count += 1;
    zoneMap[p.area].sumRate += p.marketRate || p.pricePerSqft || 0;
    const yoy = p.currentPrice > 0 ? (p.pastYearGain * 100) / p.currentPrice : 0;
    zoneMap[p.area].sumYoY += yoy;
  });
  const topZones = Object.entries(zoneMap)
    .map(([area, v]) => ({
      area,
      listings: v.count,
      avgRate: Math.round(v.sumRate / v.count),
      avgYoY: Math.round((v.sumYoY / v.count) * 10) / 10,
    }))
    .sort((a, b) => b.avgYoY - a.avgYoY)
    .slice(0, 5);

  // Top ROI properties
  const topRoi = properties
    .filter(p => p.currentPrice > 0 && p.pastYearGain > 0)
    .map(p => ({ p, roi: (p.pastYearGain * 100) / p.currentPrice }))
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 4);

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        contentContainerStyle={{
          paddingTop: statusBarH + fw(14),
          paddingHorizontal: fw(16),
          paddingBottom: NAV_HEIGHT + NAV_BOTTOM + fw(20),
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: fw(22), fontFamily: "Manrope_700Bold", color: "#222222", marginBottom: 4 }}>
          Investor Dashboard
        </Text>
        <Text style={{ fontSize: fw(13), fontFamily: "Manrope_400Regular", color: "#717171", marginBottom: fw(16) }}>
          Trends, transparency & top opportunities
        </Text>

        {/* Transparency stats */}
        <View style={{
          backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#EBEBEB",
          padding: fw(14), marginBottom: fw(12),
          shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
        }}>
          <Text style={{ fontSize: fw(11), fontFamily: "Manrope_700Bold", color: "#717171", letterSpacing: 0.5, marginBottom: fw(10) }}>
            TRANSPARENCY OVERVIEW
          </Text>
          <View style={{ flexDirection: "row", gap: fw(8) }}>
            <View style={{ flex: 1, backgroundColor: "#F7F7F7", borderRadius: 12, padding: fw(10), alignItems: "center" }}>
              <Text style={{ fontSize: fw(20), fontFamily: "Manrope_700Bold", color: "#10B981" }}>{verified}</Text>
              <Text style={{ fontSize: fw(10), fontFamily: "Manrope_500Medium", color: "#717171" }}>Verified</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "#F7F7F7", borderRadius: 12, padding: fw(10), alignItems: "center" }}>
              <Text style={{ fontSize: fw(20), fontFamily: "Manrope_700Bold", color: "#2563EB" }}>{withRera}</Text>
              <Text style={{ fontSize: fw(10), fontFamily: "Manrope_500Medium", color: "#717171" }}>RERA filed</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "#F7F7F7", borderRadius: 12, padding: fw(10), alignItems: "center" }}>
              <Text style={{ fontSize: fw(20), fontFamily: "Manrope_700Bold", color: "#FF385C" }}>+{avgPremium}%</Text>
              <Text style={{ fontSize: fw(10), fontFamily: "Manrope_500Medium", color: "#717171" }}>Avg premium</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "#F7F7F7", borderRadius: 12, padding: fw(10), alignItems: "center" }}>
              <Text style={{ fontSize: fw(20), fontFamily: "Manrope_700Bold", color: "#222222" }}>{total}</Text>
              <Text style={{ fontSize: fw(10), fontFamily: "Manrope_500Medium", color: "#717171" }}>Total</Text>
            </View>
          </View>
          <Text style={{ fontSize: fw(10), color: "#717171", fontFamily: "Manrope_400Regular", marginTop: fw(10), lineHeight: fw(15) }}>
            "Avg premium" = how much actual market rates exceed official circle rates across listings.
          </Text>
        </View>

        {/* Top zones */}
        <View style={{
          backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#EBEBEB",
          padding: fw(14), marginBottom: fw(12),
          shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
        }}>
          <Text style={{ fontSize: fw(15), fontFamily: "Manrope_700Bold", color: "#222222", marginBottom: fw(10) }}>
            🔥 Top Investment Zones
          </Text>
          {topZones.length === 0 ? (
            <Text style={{ fontSize: fw(12), color: "#717171" }}>No data yet.</Text>
          ) : topZones.map((z, i) => (
            <View key={z.area} style={{
              flexDirection: "row", alignItems: "center", paddingVertical: fw(10),
              borderBottomWidth: i < topZones.length - 1 ? 1 : 0, borderBottomColor: "#F2F2F2",
            }}>
              <View style={{
                width: fw(28), height: fw(28), borderRadius: fw(14), backgroundColor: "#FFF0F3",
                alignItems: "center", justifyContent: "center", marginRight: fw(10),
              }}>
                <Text style={{ fontSize: fw(12), fontFamily: "Manrope_700Bold", color: "#FF385C" }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fw(13), fontFamily: "Manrope_700Bold", color: "#222222" }}>{z.area}</Text>
                <Text style={{ fontSize: fw(11), fontFamily: "Manrope_500Medium", color: "#717171" }}>
                  {z.listings} listing{z.listings !== 1 ? "s" : ""} · ₹{z.avgRate.toLocaleString()}/sqft
                </Text>
              </View>
              <Text style={{ fontSize: fw(13), fontFamily: "Manrope_700Bold", color: z.avgYoY >= 0 ? "#10B981" : "#EF4444" }}>
                {z.avgYoY >= 0 ? "+" : ""}{z.avgYoY}%
              </Text>
            </View>
          ))}
        </View>

        {/* Top ROI properties */}
        <View style={{
          backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#EBEBEB",
          padding: fw(14), marginBottom: fw(12),
          shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
        }}>
          <Text style={{ fontSize: fw(15), fontFamily: "Manrope_700Bold", color: "#222222", marginBottom: fw(10) }}>
            💰 Highest 1-Year ROI
          </Text>
          {topRoi.length === 0 ? (
            <Text style={{ fontSize: fw(12), color: "#717171" }}>No data yet.</Text>
          ) : topRoi.map(({ p, roi }, i) => (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.8}
              onPress={() => onOpenProperty(p)}
              style={{
                flexDirection: "row", alignItems: "center", paddingVertical: fw(10),
                borderBottomWidth: i < topRoi.length - 1 ? 1 : 0, borderBottomColor: "#F2F2F2",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fw(13), fontFamily: "Manrope_700Bold", color: "#222222" }} numberOfLines={1}>{p.title}</Text>
                <Text style={{ fontSize: fw(11), fontFamily: "Manrope_500Medium", color: "#717171" }}>{p.area}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: fw(14), fontFamily: "Manrope_700Bold", color: "#10B981" }}>+{roi.toFixed(1)}%</Text>
                {p.isVerified && (
                  <Text style={{ fontSize: fw(9), fontFamily: "Manrope_700Bold", color: "#10B981", marginTop: 1 }}>✓ Verified</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ fontSize: fw(10), color: "#717171", fontFamily: "Manrope_400Regular", textAlign: "center", marginTop: fw(8) }}>
          Data sourced from registered transactions & verified field reports.
        </Text>
      </ScrollView>
    </View>
  );
};

const PropertyDetailScreen = ({
  property,
  liked,
  onLike,
  onBack,
  vw, vh, layoutW,
  NAV_HEIGHT, NAV_BOTTOM, statusBarH,
  userToken,
  userName,
}: {
  property: Property;
  liked: boolean;
  onLike: () => void;
  onBack: () => void;
  vw: (p: number) => number;
  vh: (p: number) => number;
  layoutW: number;
  NAV_HEIGHT: number;
  NAV_BOTTOM: number;
  statusBarH: number;
  userToken: string | null;
  userName: string;
}) => {
  const fw = (px: number) => vw((px / FIGMA_W) * 100);
  const sc = statusColors(property.status);
  const dc = demandColors(property.demand);

  // ─── Schedule Visit modal state ─────────────────────────────────────────
  const [visitModalVisible, setVisitModalVisible] = useState(false);
  const [visitModalMounted, setVisitModalMounted] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [visitName, setVisitName] = useState(userName || "");
  const [visitMsg, setVisitMsg] = useState("");
  const [visitSubmitting, setVisitSubmitting] = useState(false);
  const visitSlideAnim = useRef(new Animated.Value(0)).current;

  const openVisitModal = () => {
    setVisitModalMounted(true);
    setVisitModalVisible(true);
    requestAnimationFrame(() => {
      Animated.spring(visitSlideAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 20,
        stiffness: 180,
      }).start();
    });
  };

  const closeVisitModal = () => {
    Animated.timing(visitSlideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setVisitModalMounted(false);
      setVisitModalVisible(false);
    });
  };
  const [visitSuccess, setVisitSuccess] = useState(false);
  const visitToastAnim = useRef(new Animated.Value(0)).current;

  // ─── Comparables + Fraud state ──────────────────────────────────────────
  const [comparables, setComparables] = useState<any[]>([]);
  const [fraudRisk, setFraudRisk] = useState<string | null>(null);
  const [fraudDuplicates, setFraudDuplicates] = useState<any[]>([]);

  useEffect(() => {
    getComparables(property.id).then(r => setComparables(r.comparables || [])).catch(() => {});
    getFraudCheck(property.id).then(r => { setFraudRisk(r.risk); setFraudDuplicates(r.duplicates || []); }).catch(() => {});
  }, [property.id]);

  const showVisitToast = () => {
    Animated.sequence([
      Animated.timing(visitToastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(visitToastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const handleCallAgent = () => {
    if (property.agentPhone) {
      Linking.openURL(`tel:${property.agentPhone}`);
    }
  };

  const [visitError, setVisitError] = useState("");

  const handleSubmitVisit = async () => {
    if (!visitDate.trim() || !visitTime.trim() || !visitName.trim()) return;
    setVisitError("");
    if (!userToken) {
      setVisitError("Please log in to schedule a visit");
      return;
    }
    setVisitSubmitting(true);
    try {
      await scheduleVisit(userToken, {
        property_id: property.id,
        visit_date: visitDate.trim(),
        visit_time: visitTime.trim(),
        visitor_name: visitName.trim(),
        message: visitMsg.trim() || undefined,
      });
      setVisitSuccess(true);
      closeVisitModal();
      setVisitDate(""); setVisitTime(""); setVisitMsg("");
      setVisitError("");
      showVisitToast();
    } catch (err: any) {
      setVisitError(err.message || "Failed to schedule visit. Please try again.");
    } finally {
      setVisitSubmitting(false);
    }
  };

  // Intercept Android hardware back button €" go back to list, not login
  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (visitModalVisible) { closeVisitModal(); return true; }
      onBack();
      return true; // true = we handled it, don't bubble up
    });
    return () => handler.remove();
  }, [onBack, visitModalVisible]);

  const CHART_WIDTH = layoutW - fw(16) * 2 - fw(14) * 2;
  const NAV_SPACE = NAV_HEIGHT + NAV_BOTTOM + fw(8);

  const featureItems = [
    ...(property.type === "residential" ? [{ icon: <BedIcon />, label: "Bedrooms", value: `${property.beds}` }] : []),
    { icon: <BathIcon />, label: "Bathrooms", value: `${property.baths}` },
    { icon: <GarageIcon />, label: "Parking", value: `${property.garage}` },
    { icon: <CalendarIcon />, label: "Year Built", value: `${property.yearBuilt}` },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* "€"€ Fixed Header "€"€ */}
      <View style={[dS.header, {
        paddingTop: statusBarH + fw(14),
        paddingHorizontal: fw(21),
        paddingBottom: fw(12),
      }]}>
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          style={[dS.backBtn, { width: fw(36), height: fw(36), borderRadius: fw(18) }]}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke="#1D1D1F" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>

        <Text numberOfLines={1} style={[dS.headerTitle, { fontSize: fw(16), maxWidth: layoutW - fw(120) }]}>{property.title}</Text>

        <TouchableOpacity onPress={onLike} activeOpacity={0.7} style={{ padding: 4 }}>
          <HeartIcon filled={liked} size={22} />
        </TouchableOpacity>
      </View>

      {/* "€"€ Scrollable content "€"€ */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: NAV_SPACE + fw(12) }}
        showsVerticalScrollIndicator={false}
      >

        {/* Image Carousel */}
        <DetailImageCarousel
          images={property.type === "residential" ? RESIDENTIAL_IMAGES : COMMERCIAL_IMAGES}
          width={layoutW}
        />

        {/* "€"€ Price History Card "€"€ */}
        <View style={[dS.card, {
          marginHorizontal: fw(16),
          marginTop: fw(12),
          borderRadius: fw(14),
          padding: fw(14),
        }]}>

          {/* Title row */}
          <View style={[dS.rowBetween, { marginBottom: fw(10) }]}>
            <Text style={[dS.sectionTitle, { fontSize: fw(16) }]}>Price History</Text>
            {/* <VerifiedBadge size={fw(44)} /> */}
          </View>

          {/* Current Price box */}
          <View style={[dS.currentPriceBox, {
            borderRadius: fw(14),
            padding: fw(10),
            marginBottom: fw(12),
          }]}>
            <Text style={[dS.currentPriceLabel, { fontSize: fw(10) }]}>CURRENT PRICE</Text>
            <Text style={[dS.currentPriceValue, { fontSize: fw(18) }]}>
              {formatPrice(property.currentPrice)}
            </Text>
          </View>

          {/* Chart */}
          {Array.isArray(property.priceHistory) && property.priceHistory.length >= 2 ? (
            <View style={{ marginBottom: fw(4) }}>
              <PriceHistoryChart
                data={property.priceHistory.map((h: any) => typeof h === 'number' ? h : (h?.price || 0))}
                width={CHART_WIDTH}
                height={fw(100)}
              />
            </View>
          ) : (
            <View style={{ marginBottom: fw(4), alignItems: "center", paddingVertical: fw(16) }}>
              <Text style={{ fontSize: fw(12), color: "#717171", fontFamily: "Manrope_500Medium" }}>No price history available</Text>
            </View>
          )}

          {/* From past year row */}
          <View style={[dS.gainRow, {
            borderRadius: fw(14),
            paddingHorizontal: fw(12),
            paddingVertical: fw(10),
            marginTop: fw(8),
          }]}>
            <View style={{ flex: 1 }}>
              <Text style={[dS.gainLabel, { fontSize: fw(12) }]}>From past 1 year</Text>
            </View>
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path d="M2 10L7 4l5 6" stroke="#3FB770" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={[dS.gainValue, { fontSize: fw(18), marginLeft: fw(4) }]}>
              {formatPrice(property.pastYearGain)}
            </Text>
          </View>
        </View>

        {/* ── Transparency / Verification Card (POC core) ── */}
        <View style={[dS.card, {
          marginHorizontal: fw(16),
          marginTop: fw(12),
          borderRadius: fw(14),
          padding: fw(14),
        }]}>
          <View style={[dS.rowBetween, { marginBottom: fw(10) }]}>
            <Text style={[dS.sectionTitle, { fontSize: fw(16) }]}>Transparency</Text>
            {typeof property.transparencyScore === "number" && (
              <View style={{ backgroundColor: "#FFF0F3", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ fontSize: fw(11), fontFamily: "Manrope_700Bold", color: "#FF385C" }}>
                  Trust Score {property.transparencyScore}/100
                </Text>
              </View>
            )}
          </View>

          {/* Dual rate */}
          {!!property.circleRate && !!property.marketRate && (
            <View style={{ flexDirection: "row", gap: fw(8), marginBottom: fw(10) }}>
              <View style={{ flex: 1, backgroundColor: "#F7F7F7", borderRadius: fw(10), padding: fw(10) }}>
                <Text style={{ fontSize: fw(9), fontFamily: "Manrope_700Bold", color: "#717171", letterSpacing: 0.5 }}>OFFICIAL CIRCLE RATE</Text>
                <Text style={{ fontSize: fw(15), fontFamily: "Manrope_700Bold", color: "#222222", marginTop: 2 }}>
                  ₹{property.circleRate.toLocaleString()}<Text style={{ fontSize: fw(10), color: "#717171" }}>/sqft</Text>
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: "#FFF0F3", borderRadius: fw(10), padding: fw(10) }}>
                <Text style={{ fontSize: fw(9), fontFamily: "Manrope_700Bold", color: "#FF385C", letterSpacing: 0.5 }}>ACTUAL MARKET RATE</Text>
                <Text style={{ fontSize: fw(15), fontFamily: "Manrope_700Bold", color: "#222222", marginTop: 2 }}>
                  ₹{property.marketRate.toLocaleString()}<Text style={{ fontSize: fw(10), color: "#717171" }}>/sqft</Text>
                </Text>
                {!!property.rateVariance && (
                  <Text style={{ fontSize: fw(10), fontFamily: "Manrope_600SemiBold", color: "#FF385C", marginTop: 2 }}>
                    +{property.rateVariance}% premium
                  </Text>
                )}
              </View>
            </View>
          )}
          {!!property.rateSource && (
            <Text style={{ fontSize: fw(10), color: "#717171", fontFamily: "Manrope_500Medium", marginBottom: fw(10) }}>
              Source: {property.rateSource}
            </Text>
          )}

          {/* Verified / RERA / Site status row */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: fw(6), marginBottom: fw(8) }}>
            {property.isVerified ? (
              <View style={{ backgroundColor: "#E8F7EF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
                <Text style={{ fontSize: fw(10), fontFamily: "Manrope_700Bold", color: "#10B981" }}>✓ Verified</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: "#FFF8EC", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
                <Text style={{ fontSize: fw(10), fontFamily: "Manrope_700Bold", color: "#F5A623" }}>⚠ Unverified</Text>
              </View>
            )}
            {!!property.reraNumber && (
              <View style={{ backgroundColor: "#F0F7FF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
                <Text style={{ fontSize: fw(10), fontFamily: "Manrope_700Bold", color: "#2563EB" }}>RERA: {property.reraNumber}</Text>
              </View>
            )}
            {!!property.siteStatus && (
              <View style={{ backgroundColor: "#F7F7F7", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
                <Text style={{ fontSize: fw(10), fontFamily: "Manrope_700Bold", color: "#222222" }}>
                  Site: {property.siteStatus.replace("_", " ")}
                </Text>
              </View>
            )}
            {!!property.developerName && (
              <View style={{ backgroundColor: "#F7F7F7", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
                <Text style={{ fontSize: fw(10), fontFamily: "Manrope_700Bold", color: "#222222" }}>{property.developerName}</Text>
              </View>
            )}
          </View>

          {!!property.verificationNotes && (
            <Text style={{ fontSize: fw(11), color: "#717171", fontFamily: "Manrope_400Regular", lineHeight: fw(16) }}>
              {property.verificationNotes}
              {property.verifiedAt ? `  ·  Verified ${new Date(property.verifiedAt).toLocaleDateString()}` : ""}
            </Text>
          )}
        </View>

        {/* ── Local & Market Insights ── */}
        {(property.floodRisk || property.pollutionIndex != null || property.safetyIndex != null ||
          (property.nearbyInfra && property.nearbyInfra.length > 0) ||
          (property.localUpdates && property.localUpdates.length > 0)) && (
          <View style={[dS.card, {
            marginHorizontal: fw(16),
            marginTop: fw(12),
            borderRadius: fw(14),
            padding: fw(14),
          }]}>
            <Text style={[dS.sectionTitle, { fontSize: fw(16), marginBottom: fw(10) }]}>Area Insights</Text>

            <View style={{ flexDirection: "row", gap: fw(6), marginBottom: fw(10) }}>
              <View style={{ flex: 1, backgroundColor: "#F7F7F7", borderRadius: fw(10), padding: fw(10), alignItems: "center" }}>
                <Text style={{ fontSize: fw(9), color: "#717171", fontFamily: "Manrope_700Bold", letterSpacing: 0.4 }}>FLOOD</Text>
                <Text style={{ fontSize: fw(13), fontFamily: "Manrope_700Bold",
                  color: property.floodRisk === "high" ? "#EF4444" : property.floodRisk === "medium" ? "#F5A623" : "#10B981",
                  marginTop: 2, textTransform: "capitalize" }}>{property.floodRisk}</Text>
              </View>
              {property.pollutionIndex != null && (
                <View style={{ flex: 1, backgroundColor: "#F7F7F7", borderRadius: fw(10), padding: fw(10), alignItems: "center" }}>
                  <Text style={{ fontSize: fw(9), color: "#717171", fontFamily: "Manrope_700Bold", letterSpacing: 0.4 }}>AQI</Text>
                  <Text style={{ fontSize: fw(13), fontFamily: "Manrope_700Bold",
                    color: property.pollutionIndex > 150 ? "#EF4444" : property.pollutionIndex > 100 ? "#F5A623" : "#10B981",
                    marginTop: 2 }}>{property.pollutionIndex}</Text>
                </View>
              )}
              {property.safetyIndex != null && (
                <View style={{ flex: 1, backgroundColor: "#F7F7F7", borderRadius: fw(10), padding: fw(10), alignItems: "center" }}>
                  <Text style={{ fontSize: fw(9), color: "#717171", fontFamily: "Manrope_700Bold", letterSpacing: 0.4 }}>SAFETY</Text>
                  <Text style={{ fontSize: fw(13), fontFamily: "Manrope_700Bold", color: "#222222", marginTop: 2 }}>{property.safetyIndex}/100</Text>
                </View>
              )}
            </View>

            {property.nearbyInfra && property.nearbyInfra.length > 0 && (
              <View style={{ marginTop: fw(4), marginBottom: fw(8) }}>
                <Text style={{ fontSize: fw(11), color: "#717171", fontFamily: "Manrope_700Bold", letterSpacing: 0.4, marginBottom: fw(6) }}>NEARBY</Text>
                {property.nearbyInfra.map((n, i) => (
                  <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: fw(4) }}>
                    <Text style={{ fontSize: fw(12), color: "#222222", fontFamily: "Manrope_500Medium" }}>{n.type} · {n.name}</Text>
                    <Text style={{ fontSize: fw(12), color: "#717171", fontFamily: "Manrope_500Medium" }}>{n.distance_km} km</Text>
                  </View>
                ))}
              </View>
            )}

            {property.localUpdates && property.localUpdates.length > 0 && (
              <View>
                <Text style={{ fontSize: fw(11), color: "#717171", fontFamily: "Manrope_700Bold", letterSpacing: 0.4, marginBottom: fw(6) }}>LOCAL DEVELOPMENT UPDATES</Text>
                {property.localUpdates.map((u, i) => (
                  <View key={i} style={{ paddingVertical: fw(4) }}>
                    <Text style={{ fontSize: fw(12), color: "#222222", fontFamily: "Manrope_500Medium" }}>• {u.headline}</Text>
                    <Text style={{ fontSize: fw(10), color: "#717171", fontFamily: "Manrope_400Regular", marginLeft: fw(10) }}>{u.date}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Site Photos Gallery ── */}
        {property.sitePhotos && property.sitePhotos.length > 0 && (
          <View style={{ marginHorizontal: fw(16), marginTop: fw(12), backgroundColor: "#FFFFFF", borderRadius: fw(14), padding: fw(14), borderWidth: 1, borderColor: "#EBEBEB" }}>
            <Text style={[dS.sectionTitle, { fontSize: fw(16), marginBottom: fw(10) }]}>Site Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -fw(4) }}>
              {property.sitePhotos.map((photo: any, i: number) => (
                <View key={i} style={{ marginHorizontal: fw(4), borderRadius: fw(8), overflow: "hidden", backgroundColor: "#F7F7F7", width: fw(140), height: fw(100) }}>
                  <RNImage source={{ uri: photo.url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  {photo.taken_at && (
                    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.5)", padding: fw(3) }}>
                      <Text style={{ color: "#fff", fontSize: fw(8), fontFamily: "Manrope_500Medium", textAlign: "center" }}>{photo.taken_at}</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Comparables ── */}
        {comparables.length > 0 && (
          <View style={{ marginHorizontal: fw(16), marginTop: fw(12), backgroundColor: "#FFFFFF", borderRadius: fw(14), padding: fw(14), borderWidth: 1, borderColor: "#EBEBEB" }}>
            <Text style={[dS.sectionTitle, { fontSize: fw(16), marginBottom: fw(10) }]}>Comparable Properties</Text>
            <Text style={{ fontSize: fw(10), color: "#717171", fontFamily: "Manrope_500Medium", marginBottom: fw(8) }}>Similar plots within ~2 km</Text>
            {comparables.map((c: any, i: number) => (
              <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: fw(6), borderTopWidth: i > 0 ? 1 : 0, borderTopColor: "#F5F5F5" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fw(12), color: "#222222", fontFamily: "Manrope_600SemiBold" }}>{c.title || c.plot_id}</Text>
                  <Text style={{ fontSize: fw(10), color: "#717171", fontFamily: "Manrope_400Regular" }}>{c.area} · {Number(c.size).toLocaleString()} sqft</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: fw(12), color: "#222222", fontFamily: "Manrope_700Bold" }}>₹{Number(c.market_rate || c.current_price || 0).toLocaleString()}</Text>
                  <Text style={{ fontSize: fw(9), color: "#717171", fontFamily: "Manrope_400Regular" }}>{c.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Fraud / Duplicate Check ── */}
        {fraudRisk && fraudRisk !== "unknown" && (
          <View style={{ marginHorizontal: fw(16), marginTop: fw(12), backgroundColor: fraudRisk === "low" ? "#F0FDF4" : fraudRisk === "medium" ? "#FFFBEB" : "#FEF2F2", borderRadius: fw(14), padding: fw(14), borderWidth: 1, borderColor: fraudRisk === "low" ? "#BBF7D0" : fraudRisk === "medium" ? "#FDE68A" : "#FECACA" }}>
            <Text style={{ fontSize: fw(13), fontFamily: "Manrope_700Bold", color: fraudRisk === "low" ? "#166534" : fraudRisk === "medium" ? "#92400E" : "#991B1B", marginBottom: fw(4) }}>
              Fraud Risk: {fraudRisk.charAt(0).toUpperCase() + fraudRisk.slice(1)}
            </Text>
            {fraudRisk === "low" ? (
              <Text style={{ fontSize: fw(11), color: "#166534", fontFamily: "Manrope_500Medium" }}>No duplicate listings detected near this location.</Text>
            ) : (
              <>
                <Text style={{ fontSize: fw(11), color: fraudRisk === "medium" ? "#92400E" : "#991B1B", fontFamily: "Manrope_500Medium", marginBottom: fw(4) }}>
                  {fraudDuplicates.length} listing(s) found within 50m of this property:
                </Text>
                {fraudDuplicates.map((d: any, i: number) => (
                  <Text key={i} style={{ fontSize: fw(10), color: "#717171", fontFamily: "Manrope_400Regular" }}>• {d.plot_id} — {d.title || d.area} {d.is_verified ? "✓" : "(unverified)"}</Text>
                ))}
              </>
            )}
          </View>
        )}

        {/* ── Developer Info ── */}
        {property.developerName && (
          <View style={{ marginHorizontal: fw(16), marginTop: fw(12), backgroundColor: "#FFFFFF", borderRadius: fw(14), padding: fw(14), borderWidth: 1, borderColor: "#EBEBEB" }}>
            <Text style={[dS.sectionTitle, { fontSize: fw(16), marginBottom: fw(8) }]}>Developer</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: fw(10) }}>
              <View style={{ width: fw(36), height: fw(36), borderRadius: fw(18), backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: fw(16), fontFamily: "Manrope_700Bold", color: "#3B82F6" }}>{property.developerName.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fw(14), color: "#222222", fontFamily: "Manrope_700Bold" }}>{property.developerName}</Text>
                {property.reraNumber && (
                  <Text style={{ fontSize: fw(10), color: "#717171", fontFamily: "Manrope_500Medium" }}>RERA: {property.reraNumber}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ── Source Attribution ── */}
        {property.sourceAttribution && (
          <View style={{ marginHorizontal: fw(16), marginTop: fw(8), paddingHorizontal: fw(4) }}>
            <Text style={{ fontSize: fw(9), color: "#999999", fontFamily: "Manrope_400Regular", fontStyle: "italic" }}>
              Data source: {property.sourceAttribution}
            </Text>
          </View>
        )}

        {/* ── Description Card ── */}
        <View style={[dS.descCard, {
          marginHorizontal: fw(16),
          marginTop: fw(12),
          borderRadius: fw(14),
          padding: fw(14),
        }]}>
          <Text style={[dS.descText, { fontSize: fw(12), lineHeight: fw(18) }]}>
            {property.description}
          </Text>
        </View>

        {/* "€"€ Agent Card "€"€ */}
        <View style={[dS.agentCard, {
          marginHorizontal: fw(16),
          marginTop: fw(12),
          borderRadius: fw(14),
          paddingVertical: fw(14),
          paddingHorizontal: fw(16),
        }]}>
          {/* Avatar */}
          <View style={[dS.agentAvatar, { width: fw(38), height: fw(38), borderRadius: fw(19) }]}>
            <Svg width={fw(22)} height={fw(22)} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="8" r="4" fill="#A8C5E8" />
              <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#A8C5E8" />
            </Svg>
          </View>

          {/* Text */}
          <View style={{ flex: 1, marginLeft: fw(12) }}>
            <Text style={[dS.agentRole, { fontSize: fw(11) }]}>{property.agentRole}</Text>
            <Text style={[dS.agentName, { fontSize: fw(14) }]}>{property.agentName}</Text>
          </View>

          {/* Call button */}
          <TouchableOpacity
            onPress={handleCallAgent}
            activeOpacity={0.75}
            style={[dS.callBtn, { width: fw(36), height: fw(36), borderRadius: fw(12) }]}
          >
            <PhoneIcon />
          </TouchableOpacity>
        </View>

        {/* "€"€ Additional Information "€"€ */}
        <View style={[{
          marginHorizontal: fw(16),
          marginTop: fw(18),
        }]}>
          <Text style={[dS.addInfoTitle, { fontSize: fw(16), marginBottom: fw(12) }]}>
            Additional Information
          </Text>

          {/* Status + Demand row */}
          <View style={[dS.rowBetween, { marginBottom: fw(10), gap: fw(8) }]}>
            <View style={[dS.infoPill, { flex: 1, backgroundColor: sc.bg }]}>
              <Text style={[dS.infoPillLabel, { color: sc.text }]}>Status</Text>
              <Text style={[dS.infoPillValue, { color: sc.text, fontSize: fw(14) }]}>{property.status}</Text>
            </View>
            <View style={[dS.infoPill, { flex: 1, backgroundColor: dc.bg }]}>
              <Text style={[dS.infoPillLabel, { color: dc.text }]}>Demand</Text>
              <Text style={[dS.infoPillValue, { color: dc.text, fontSize: fw(14) }]}>{property.demand}</Text>
            </View>
          </View>

          {/* Features Grid */}
          <View style={[dS.featuresBox, {
            borderRadius: fw(16),
            padding: fw(14),
            borderWidth: 1.5,
          }]}>
            <View style={dS.featuresGrid}>
              {featureItems.map((f, i) => (
                <View
                  key={f.label}
                  style={[dS.featureItem, {
                    width: "48%",
                    borderRadius: fw(12),
                    padding: fw(12),
                    marginBottom: i < featureItems.length - 2 ? fw(8) : 0,
                  }]}
                >
                  <View style={[dS.featureIconBox, { width: fw(32), height: fw(32), borderRadius: fw(8), marginBottom: fw(6) }]}>
                    {f.icon}
                  </View>
                  <Text style={[dS.featureLabel, { fontSize: fw(10) }]}>{f.label}</Text>
                  <Text style={[dS.featureValue, { fontSize: fw(15) }]}>{f.value}</Text>
                </View>
              ))}
            </View>

            {/* Extra details */}
            <View style={[dS.detailRow, { marginTop: fw(10), paddingTop: fw(10) }]}>
              <Text style={[dS.detailKey, { fontSize: fw(12) }]}>Plot Number</Text>
              <Text style={[dS.detailVal, { fontSize: fw(12) }]}>{property.plot}</Text>
            </View>
            <View style={dS.detailRow}>
              <Text style={[dS.detailKey, { fontSize: fw(12) }]}>Size</Text>
              <Text style={[dS.detailVal, { fontSize: fw(12) }]}>{property.size}</Text>
            </View>
            <View style={dS.detailRow}>
              <Text style={[dS.detailKey, { fontSize: fw(12) }]}>Zoning</Text>
              <Text style={[dS.detailVal, { fontSize: fw(12) }]}>{property.zoning}</Text>
            </View>
            <View style={[dS.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={[dS.detailKey, { fontSize: fw(12) }]}>Price / sqft</Text>
              <Text style={[dS.detailVal, { fontSize: fw(12), color: "#FF385C" }]}>
                ₹{property.pricePerSqft.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Contact CTA ── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openVisitModal}
          style={[dS.ctaBtn, {
            marginHorizontal: fw(16),
            marginTop: fw(20),
            height: fw(52),
            borderRadius: fw(26),
          }]}
        >
          <Text style={[dS.ctaBtnText, { fontSize: fw(16) }]}>Schedule a Visit</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Visit Success Toast ── */}
      <Animated.View
        pointerEvents="none"
        style={[
          dS.visitToast,
          { opacity: visitToastAnim, transform: [{ translateY: visitToastAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
        ]}
      >
        <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
          <Circle cx="9" cy="9" r="9" fill="#10B981" />
          <Path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="white" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text style={dS.visitToastText}>Visit request sent!</Text>
      </Animated.View>

      {/* ── Schedule a Visit Modal ── */}
      <Modal
        visible={visitModalMounted}
        transparent
        animationType="none"
        onRequestClose={closeVisitModal}
      >
        <View style={{ flex: 1 }}>
          <Animated.View
            style={[dS.modalOverlay, { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: visitSlideAnim }]}
          >
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeVisitModal} />
          </Animated.View>
          <View style={{ flex: 1, justifyContent: "flex-end" }} pointerEvents="box-none">
            <Animated.View
              style={[dS.modalSheet, {
                paddingBottom: NAV_BOTTOM + fw(16),
                transform: [{
                  translateY: visitSlideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [500, 0],
                  }),
                }],
              }]}
            >
            {/* Handle */}
            <View style={dS.modalHandle} />

            <Text style={[dS.modalTitle, { fontSize: fw(18) }]}>Schedule a Visit</Text>
            <Text style={[dS.modalSubtitle, { fontSize: fw(12), marginBottom: fw(20) }]}>
              {property.title}
            </Text>

            {/* Date */}
            <Text style={[dS.visitLabel, { fontSize: fw(11) }]}>PREFERRED DATE</Text>
            <View style={[dS.visitInput, { height: fw(46), borderRadius: fw(12), paddingHorizontal: fw(14), marginBottom: fw(14) }]}>
              <TextInput
                style={[dS.visitInputText, { fontSize: fw(14) }]}
                value={visitDate}
                onChangeText={setVisitDate}
                placeholder="e.g. 2025-03-20"
                placeholderTextColor="rgba(0,0,0,0.4)"
                keyboardType="default"
              />
            </View>

            {/* Time */}
            <Text style={[dS.visitLabel, { fontSize: fw(11) }]}>PREFERRED TIME</Text>
            <View style={[dS.visitInput, { height: fw(46), borderRadius: fw(12), paddingHorizontal: fw(14), marginBottom: fw(14) }]}>
              <TextInput
                style={[dS.visitInputText, { fontSize: fw(14) }]}
                value={visitTime}
                onChangeText={setVisitTime}
                placeholder="e.g. 10:00 AM"
                placeholderTextColor="rgba(0,0,0,0.4)"
              />
            </View>

            {/* Name */}
            <Text style={[dS.visitLabel, { fontSize: fw(11) }]}>YOUR NAME</Text>
            <View style={[dS.visitInput, { height: fw(46), borderRadius: fw(12), paddingHorizontal: fw(14), marginBottom: fw(14) }]}>
              <TextInput
                style={[dS.visitInputText, { fontSize: fw(14) }]}
                value={visitName}
                onChangeText={setVisitName}
                placeholder="Enter your name"
                placeholderTextColor="rgba(0,0,0,0.4)"
              />
            </View>

            {/* Message */}
            <Text style={[dS.visitLabel, { fontSize: fw(11) }]}>MESSAGE (OPTIONAL)</Text>
            <View style={[dS.visitInput, { minHeight: fw(80), borderRadius: fw(12), paddingHorizontal: fw(14), paddingVertical: fw(12), marginBottom: fw(22), alignItems: "flex-start" }]}>
              <TextInput
                style={[dS.visitInputText, { fontSize: fw(13), width: "100%" }]}
                value={visitMsg}
                onChangeText={setVisitMsg}
                placeholder="Any specific requirements?"
                placeholderTextColor="rgba(0,0,0,0.4)"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Error */}
            {!!visitError && (
              <Text style={{ color: "#EF4444", fontSize: fw(12), fontFamily: "Manrope_600SemiBold", textAlign: "center", marginBottom: fw(10) }}>
                {visitError}
              </Text>
            )}

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmitVisit}
              activeOpacity={0.85}
              disabled={visitSubmitting || !visitDate.trim() || !visitTime.trim() || !visitName.trim()}
              style={[
                dS.ctaBtn,
                { height: fw(52), borderRadius: fw(26), marginHorizontal: 0 },
                (visitSubmitting || !visitDate.trim() || !visitTime.trim() || !visitName.trim()) && { opacity: 0.5 },
              ]}
            >
              <Text style={[dS.ctaBtnText, { fontSize: fw(15) }]}>
                {visitSubmitting ? "Sending..." : "Confirm Visit Request"}
              </Text>
            </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const dS = StyleSheet.create({
  header: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 10,
  },
  backBtn: {
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Manrope_600SemiBold",
    color: "#222222",
  },
  card: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: "Manrope_600SemiBold",
    color: "#222222",
    letterSpacing: 0.5,
  },
  currentPriceBox: {
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  currentPriceLabel: {
    fontFamily: "Manrope_400Regular",
    color: "#717171",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  currentPriceValue: {
    fontFamily: "Manrope_700Bold",
    color: "#222222",
    letterSpacing: 0.5,
  },
  gainRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16,185,129,0.1)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.2)",
  },
  gainLabel: {
    fontFamily: "Manrope_600SemiBold",
    color: "#222222",
  },
  gainValue: {
    fontFamily: "Manrope_500Medium",
    color: "#10B981",
    letterSpacing: 0.5,
  },
  descCard: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  descText: {
    fontFamily: "Manrope_400Regular",
    color: "#717171",
    lineHeight: 22,
  },
  agentCard: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  agentAvatar: {
    backgroundColor: "#EBEBEB",
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  agentRole: {
    fontFamily: "Manrope_400Regular",
    color: "#717171",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  agentName: {
    fontFamily: "Manrope_500Medium",
    color: "#222222",
    letterSpacing: 0.5,
  },
  callBtn: {
    backgroundColor: "rgba(14,165,233,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.3)",
  },
  addInfoTitle: {
    fontFamily: "Manrope_500Medium",
    color: "#222222",
    letterSpacing: 0.5,
  },
  infoPill: {
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  infoPillLabel: {
    fontSize: 10,
    fontFamily: "Manrope_400Regular",
    marginBottom: 4,
    opacity: 0.7,
  },
  infoPillValue: {
    fontFamily: "Manrope_700Bold",
  },
  featuresBox: {
    backgroundColor: "#FFFFFF",
    borderColor: "#EBEBEB",
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureItem: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  featureIconBox: {
    backgroundColor: "rgba(14,165,233,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: {
    fontFamily: "Manrope_400Regular",
    color: "#717171",
    letterSpacing: 0.3,
  },
  featureValue: {
    fontFamily: "Manrope_700Bold",
    color: "#222222",
    marginTop: 2,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  detailKey: {
    fontFamily: "Manrope_400Regular",
    color: "#717171",
  },
  detailVal: {
    fontFamily: "Manrope_600SemiBold",
    color: "#222222",
  },
  ctaBtn: {
    backgroundColor: "#FF385C",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF385C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 8,
  },
  ctaBtnText: {
    fontFamily: "Manrope_600SemiBold",
    color: "#FFFFFF",
  },
  // ─── Visit toast ──────────────────────────────────────────────────────────
  visitToast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  visitToastText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
    color: "#222222",
  },
  // ─── Modal ────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: "Manrope_700Bold",
    color: "#222222",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: "Manrope_400Regular",
    color: "#717171",
  },
  // ─── Visit form inputs ────────────────────────────────────────────────────
  visitLabel: {
    fontFamily: "Manrope_600SemiBold",
    color: "#717171",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  visitInput: {
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    flexDirection: "row",
    alignItems: "center",
  },
  visitInputText: {
    fontFamily: "Manrope_400Regular",
    color: "#222222",
    flex: 1,
    paddingVertical: 0,
  },
});


// "€"€"€ Property image pools "€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€
const RESIDENTIAL_IMAGES = [
  require("../assets/images/prop1.jpg"),
  require("../assets/images/prop2.jpg"),
  require("../assets/images/prop4.jpg"),
];
const COMMERCIAL_IMAGES = [
  require("../assets/images/prop3.jpg"),
  require("../assets/images/prop1.jpg"),
  require("../assets/images/prop2.jpg"),
];

// "€"€"€ Property Card "€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€
const PropertyCard = React.memo(({
  item, liked, onLike, onPress, vw,
}: {
  item: Property;
  liked: boolean;
  onLike: () => void;
  onPress: () => void;
  vw: (p: number) => number;
}) => {
  const dc = demandColors(item.demand);
  const sc = statusColors(item.status);
  const isResidential = item.type === "residential";
  const accentColor = isResidential ? "#FF385C" : "#F59E0B";
  const images = isResidential ? RESIDENTIAL_IMAGES : COMMERCIAL_IMAGES;

  const [activeSlide, setActiveSlide] = React.useState(0);
  const cardWidth = vw(92); // 100% - 2*4% margin

  const handleScroll = (e: any) => {
    const slide = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    setActiveSlide(slide);
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.94}
      style={[cardS.card, {
        borderRadius: vw(5),
        marginHorizontal: vw(4),
        marginBottom: vw(4),
      }]}
    >
      {/* "€"€ Image Carousel "€"€ */}
      <View style={[cardS.carouselWrap, { borderTopLeftRadius: vw(5), borderTopRightRadius: vw(5) }]}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={{ width: cardWidth, height: 170 }}
          contentContainerStyle={{ width: cardWidth * images.length }}
          nestedScrollEnabled={true}
          directionalLockEnabled={true}
          decelerationRate="fast"
          disableIntervalMomentum={true}
        >
          {images.map((img, i) => (
            <View key={i} style={{ width: cardWidth, height: 170, overflow: "hidden" }}>
              <RNImage
                source={img}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
              {/* Dark gradient overlay */}
              <View style={cardS.imgOverlay} />
            </View>
          ))}
        </ScrollView>

        {/* Dot indicators */}
        <View style={cardS.dotsRow}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[
                cardS.dot,
                i === activeSlide ? cardS.dotActive : cardS.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Like button */}
        <TouchableOpacity
          onPress={onLike}
          activeOpacity={0.7}
          style={[cardS.likeBtn, liked && cardS.likeBtnActive]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <HeartIcon filled={liked} size={18} />
        </TouchableOpacity>

        {/* Status badge top-left */}
        <View style={[cardS.statusBadge, { backgroundColor: sc.bg }]}>
          <View style={[cardS.statusDotInline, { backgroundColor: sc.text }]} />
          <Text style={[cardS.statusBadgeText, { color: sc.text }]}>{item.status}</Text>
        </View>

        {/* Price overlay on image bottom */}
        <View style={cardS.imgBottomRow}>
          <View>
            <Text style={cardS.imgPrice}>
              ₹{item.pricePerSqft.toLocaleString("en-IN")}<Text style={cardS.imgPriceUnit}>/sqft</Text>
            </Text>
          </View>
          <View style={[cardS.typeBadge, { backgroundColor: accentColor }]}>
            <Text style={cardS.typeBadgeText}>{isResidential ? "Residential" : "Commercial"}</Text>
          </View>
        </View>
      </View>

      {/* "€"€ Card body "€"€ */}
      <View style={cardS.body}>
        {/* Meta row: demand + plot */}
        <View style={cardS.metaRow}>
          <View style={[cardS.demandBadge, { backgroundColor: dc.bg }]}>
            <Text style={[cardS.demandText, { color: dc.text }]}>{item.demand}</Text>
          </View>
          <Text style={cardS.plotText}>{item.plot}</Text>
        </View>

        {/* Title & location */}
        <Text style={cardS.title} numberOfLines={1}>{item.title}</Text>
        <Text style={cardS.location} numberOfLines={1}>
          {`📍 ${item.location}`}
        </Text>

        {/* Transparency row: verified + score + dual-rate */}
        {(item.isVerified || (item.transparencyScore ?? 0) > 0 || item.circleRate) && (
          <View style={cardS.transparencyRow}>
            {item.isVerified && (
              <View style={cardS.verifiedPill}>
                <Text style={cardS.verifiedPillText}>✓ Verified</Text>
              </View>
            )}
            {typeof item.transparencyScore === "number" && (
              <View style={cardS.scorePill}>
                <Text style={cardS.scorePillText}>Trust {item.transparencyScore}</Text>
              </View>
            )}
            {!!item.circleRate && !!item.marketRate && (
              <Text style={cardS.dualRateText}>
                Circle ₹{item.circleRate.toLocaleString()} · Market ₹{item.marketRate.toLocaleString()}
                {item.rateVariance ? `  (+${item.rateVariance}%)` : ""}
              </Text>
            )}
          </View>
        )}

        {/* Stats row */}
        <View style={cardS.statsRow}>
          <View style={cardS.statItem}>
            <Text style={cardS.statLabel}>SIZE</Text>
            <Text style={cardS.statValue}>{item.size}</Text>
          </View>
          <View style={cardS.statSep} />
          <View style={cardS.statItem}>
            <Text style={cardS.statLabel}>ZONE</Text>
            <Text style={cardS.statValue}>{item.zoning.split(" ")[0]}</Text>
          </View>
          <View style={cardS.statSep} />
          <View style={cardS.statItem}>
            <Text style={cardS.statLabel}>CHANGE</Text>
            <Text style={[cardS.statValue, { color: "#10B981" }]}>{(item.priceChange || "").replace(" vs last year", "")}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={cardS.footer}>
          <Text style={cardS.zoningText}>{item.zoning}</Text>
          <View style={[cardS.ctaChip, { backgroundColor: accentColor }]}>
            <Text style={cardS.ctaText}>View Details</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const cardS = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    overflow: "hidden",
  },

  // "€"€ Carousel "€"€
  carouselWrap: {
    height: 170,
    overflow: "hidden",
    position: "relative",
  },
  imgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  dotsRow: {
    position: "absolute",
    bottom: 44,
    alignSelf: "center",
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: "#FFFFFF",
  },
  dotInactive: {
    width: 5,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  likeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  likeBtnActive: { backgroundColor: "#FFF0F3" },
  statusBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDotInline: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 10, fontFamily: "Manrope_700Bold" },
  imgBottomRow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 28,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  imgPrice: {
    fontSize: 20,
    fontFamily: "Manrope_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  imgPriceUnit: {
    fontSize: 11,
    fontFamily: "Manrope_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: "Manrope_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  // "€"€ Card body "€"€
  body: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 5 },
  demandBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  demandText: { fontSize: 9, fontFamily: "Manrope_700Bold" },
  plotText: { fontSize: 11, fontFamily: "Manrope_400Regular", color: "#717171", flex: 1, textAlign: "right" },
  title: { fontSize: 15, fontFamily: "Manrope_700Bold", color: "#222222", lineHeight: 21, marginBottom: 2 },
  location: { fontSize: 12, fontFamily: "Manrope_400Regular", color: "#717171", marginBottom: 12 },

  // Stats strip
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  statItem: { flex: 1, alignItems: "center" },
  statSep: { width: 1, height: 24, backgroundColor: "#EBEBEB" },
  statLabel: { fontSize: 8, fontFamily: "Manrope_600SemiBold", color: "#717171", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 },
  statValue: { fontSize: 12, fontFamily: "Manrope_700Bold", color: "#222222" },

  // Footer
  divider: { height: 1, backgroundColor: "#EBEBEB", marginBottom: 10 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  zoningText: { fontSize: 11, fontFamily: "Manrope_400Regular", color: "#717171" },
  ctaChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  ctaText: { fontSize: 11, fontFamily: "Manrope_700Bold", color: "#FFFFFF", letterSpacing: 0.2 },
  transparencyRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 8, marginBottom: 4 },
  verifiedPill: { backgroundColor: "#E8F7EF", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  verifiedPillText: { fontSize: 10, fontFamily: "Manrope_700Bold", color: "#10B981", letterSpacing: 0.2 },
  scorePill: { backgroundColor: "#FFF0F3", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  scorePillText: { fontSize: 10, fontFamily: "Manrope_700Bold", color: "#FF385C", letterSpacing: 0.2 },
  dualRateText: { fontSize: 10, fontFamily: "Manrope_500Medium", color: "#717171", flexShrink: 1 },

  // legacy
  topRow: { flexDirection: "row", alignItems: "center" },
  heartBtn: { marginLeft: 4 },
  statusDot: { width: 8, height: 8 },
});

// ─── Profile Screen ───────────────────────────────────────────────────────────
const ProfileScreen = ({
  vw, vh, layoutW, NAV_HEIGHT, NAV_BOTTOM, statusBarH, onBack, userToken,
  showAIButton, onToggleAIButton,
}: {
  vw: (p: number) => number;
  vh: (p: number) => number;
  layoutW: number;
  NAV_HEIGHT: number;
  NAV_BOTTOM: number;
  statusBarH: number;
  onBack: () => void;
  userToken: string | null;
  showAIButton: boolean;
  onToggleAIButton: (value: boolean) => void;
}) => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveAnim = useRef(new Animated.Value(0)).current;
  
  const [showAbout, setShowAbout] = useState(false);

  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    settings: true,
    account: true,
    about: false,
  });
  
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    // Load local data first so the screen is never stuck on "Loading"
    getUser().then(user => {
      if (user) {
        setName(prev => prev || user.name || "");
        setEmail(prev => prev || user.email || "");
      }
    });
    // Then try to fetch full profile from backend
    if (userToken) {
      getProfile(userToken).then(profile => {
        setName(profile.name || "");
        setEmail(profile.email || "");
        setPhone(profile.phone || "");
        setGender(profile.gender || "");
      }).catch(() => {});
    }
  }, [userToken]);

  const fw = (px: number) => vw((px / 375) * 100);
  const HORIZ = fw(20);
  const NAV_SPACE = NAV_HEIGHT + NAV_BOTTOM + fw(8);

  const handleSave = async () => {
    if (!userToken) return;
    setSaving(true);
    try {
      await updateProfile(userToken, { name, phone, gender });
      setSaved(true);
      Animated.sequence([
        Animated.timing(saveAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(saveAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setSaved(false));
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await clearSession();
    router.replace("/auth");
  };

  const fields = [
    { label: "Name", value: name, set: setName, placeholder: "Enter your name", kb: "default" },
    { label: "Gender", value: gender, set: setGender, placeholder: "Enter your gender", kb: "default" },
    { label: "Phone", value: phone, set: setPhone, placeholder: "Enter your phone number", kb: "phone-pad" },
    { label: "Email", value: email, set: setEmail, placeholder: "Enter your email", kb: "email-address" },
  ] as const;

  const fieldIcons: Record<string, React.ReactNode> = {
    Name: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#999" strokeWidth={1.8} strokeLinecap="round" /><Circle cx="12" cy="7" r="4" stroke="#999" strokeWidth={1.8} /></Svg>,
    Gender: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="8" r="5" stroke="#999" strokeWidth={1.8} /><Path d="M12 13v8m-3-3h6" stroke="#999" strokeWidth={1.8} strokeLinecap="round" /></Svg>,
    Phone: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="#999" strokeWidth={1.8} strokeLinecap="round" /></Svg>,
    Email: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#999" strokeWidth={1.8} strokeLinecap="round" /><Path d="M22 6l-10 7L2 6" stroke="#999" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>,
  };

  if (showAbout) {
    return (<AboutScreen onBack={() => setShowAbout(false)} />);
  }

  return (
    <View style={[pS.root, { paddingBottom: NAV_SPACE }]}>
      {/* Header */}
      <View style={[pS.header, {
        paddingTop: statusBarH + fw(13),
        paddingHorizontal: HORIZ,
        paddingBottom: fw(14),
      }]}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}
          style={[pS.backBtn, { width: fw(42), height: fw(42), borderRadius: fw(21) }]}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke="#717171" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={pS.headerTitle}>My Profile</Text>
        <View style={{ width: fw(42) }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {/* Avatar section */}
        <View style={[pS.avatarSection, { marginTop: fw(24), marginBottom: fw(28) }]}>
          <View style={[pS.avatar, { width: fw(96), height: fw(96), borderRadius: fw(48) }]}>
            <Svg width={fw(52)} height={fw(52)} viewBox="0 0 54 54" fill="none">
              <Circle cx="27" cy="20" r="12" fill="#A8C5E8" />
              <Path d="M4 54c0-13 10.5-21 23-21s23 8 23 21" fill="#A8C5E8" />
            </Svg>
          </View>
          <TouchableOpacity activeOpacity={0.7}
            style={[pS.editBadge, { width: fw(32), height: fw(32), borderRadius: fw(16) }]}>
            <EditIcon />
          </TouchableOpacity>
        </View>
        <View style={[pS.profileNameCard, { marginHorizontal: HORIZ, marginBottom: fw(24) }]}>
          <Text style={pS.avatarName}>{name || "Your Name"}</Text>
          <Text style={pS.avatarEmail}>{email || "user@example.com"}</Text>
        </View>

        {/* Personal Information Section */}
        <View style={{ marginBottom: fw(12), marginHorizontal: HORIZ }}>
          <TouchableOpacity
            onPress={() => toggleSection('personal')}
            activeOpacity={0.7}
            style={[pS.sectionHeader, pS.sectionHeaderTouchable]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: fw(10), flex: 1 }}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#FF385C" strokeWidth={1.8} strokeLinecap="round" />
                <Circle cx="12" cy="7" r="4" stroke="#FF385C" strokeWidth={1.8} />
              </Svg>
              <Text style={pS.sectionTitle}>Personal Information</Text>
            </View>
            <View style={[pS.expandArrow, expandedSections.personal && pS.expandArrowOpen]}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M6 9l6 6 6-6" stroke="#222222" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
          </TouchableOpacity>

          {expandedSections.personal && (
            <View style={[pS.card, { marginTop: fw(8) }]}>
              {fields.map(({ label, value, set, placeholder, kb }, idx) => (
                <View key={label}>
                  <View style={[pS.cardRow, { height: fw(68), paddingVertical: 12, alignItems: "flex-start" }]}>
                    <View style={pS.cardRowLabel}>
                      <View style={pS.fieldIcon}>{fieldIcons[label]}</View>
                      <View style={{ flex: 1 }}>
                        <Text style={pS.cardRowTitle}>{label}</Text>
                        <TextInput
                          style={[pS.cardInput, { marginTop: fw(4) }]}
                          value={value}
                          onChangeText={set}
                          placeholder={placeholder}
                          placeholderTextColor="#BCBCBC"
                          keyboardType={kb as any}
                          autoCapitalize={kb === "email-address" || kb === "phone-pad" ? "none" : "words"}
                        />
                      </View>
                    </View>
                  </View>
                  {idx < fields.length - 1 && <View style={pS.cardDivider} />}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Settings Section */}
        <View style={{ marginBottom: fw(12), marginHorizontal: HORIZ }}>
          <TouchableOpacity
            onPress={() => toggleSection('settings')}
            activeOpacity={0.7}
            style={[pS.sectionHeader, pS.sectionHeaderTouchable]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: fw(10), flex: 1 }}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="3" stroke="#FF9500" strokeWidth={1.8} />
                <Path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" stroke="#FF9500" strokeWidth={1.8} strokeLinecap="round" />
              </Svg>
              <Text style={pS.sectionTitle}>Settings</Text>
            </View>
            <View style={[pS.expandArrow, expandedSections.settings && pS.expandArrowOpen]}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M6 9l6 6 6-6" stroke="#222222" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
          </TouchableOpacity>

          {expandedSections.settings && (
            <View style={[pS.card, { marginTop: fw(8) }]}>
              <View style={[pS.cardRow, { height: fw(60) }]}>
                <View style={pS.cardRowLabel}>
                  <View style={[pS.fieldIcon, { backgroundColor: "#E0F2FE" }]}>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                      <Circle cx="12" cy="12" r="3" stroke="#0EA5E9" strokeWidth={1.8} />
                      <Path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" stroke="#0EA5E9" strokeWidth={1.8} strokeLinecap="round" />
                    </Svg>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={pS.cardRowTitle}>AI Assistant Button</Text>
                    <Text style={pS.cardRowValue}>Chat button on home screen</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => onToggleAIButton(!showAIButton)}
                  activeOpacity={0.7}
                  style={[pS.toggle, showAIButton ? pS.toggleActive : pS.toggleInactive]}
                >
                  <View style={[pS.toggleThumb, { alignSelf: showAIButton ? "flex-end" : "flex-start" }]} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Account Section */}
        <View style={{ marginBottom: fw(16), marginHorizontal: HORIZ }}>
          <TouchableOpacity
            onPress={() => toggleSection('account')}
            activeOpacity={0.7}
            style={[pS.sectionHeader, pS.sectionHeaderTouchable]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: fw(10), flex: 1 }}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="#EF4444" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={pS.sectionTitle}>Account</Text>
            </View>
            <View style={[pS.expandArrow, expandedSections.account && pS.expandArrowOpen]}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M6 9l6 6 6-6" stroke="#222222" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
          </TouchableOpacity>

          {expandedSections.account && (
            <View style={[pS.card, { marginTop: fw(8) }]}>
              <TouchableOpacity onPress={handleSave} activeOpacity={0.8} disabled={saving}
                style={[pS.cardRow, { height: fw(54), justifyContent: "center" }, saving && { opacity: 0.6 }]}>
                <Text style={[pS.cardRowTitle, { color: "#222222", marginBottom: 0 }]}>{saving ? "Saving..." : "Save Changes"}</Text>
              </TouchableOpacity>

              <View style={pS.cardDivider} />

              <TouchableOpacity onPress={handleSignOut} activeOpacity={0.8}
                style={[pS.cardRow, { height: fw(54), justifyContent: "center", paddingVertical: 0 }]}>
                <Text style={[pS.cardRowTitle, { color: "#EF4444", marginBottom: 0 }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* About Section — navigates to dedicated screen */}
          <TouchableOpacity
            onPress={() => setShowAbout(true)}
            activeOpacity={0.7}
            style={[pS.sectionHeader, pS.sectionHeaderTouchable, { marginTop: fw(16) }]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: fw(10), flex: 1 }}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="10" stroke="#1D1D1F" strokeWidth={1.8} />
                <Path d="M12 16v-4m0-4h.01" stroke="#1D1D1F" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={pS.sectionTitle}>About This App</Text>
            </View>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path d="M9 18l6-6-6-6" stroke="#999999" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Toast */}
      <Animated.View
        style={[pS.toast, {
          opacity: saveAnim,
          transform: [{ translateY: saveAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        }]}
        pointerEvents="none"
      >
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          <Circle cx="8" cy="8" r="8" fill="#47CB84" />
          <Path d="M4.5 8l2.5 2.5 4-4" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text style={pS.toastText}>Profile saved!</Text>
      </Animated.View>
    </View>
  );
};

const pS = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F8F8" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  backBtn: { backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Manrope_700Bold", color: "#222222" },
  avatarSection: { alignItems: "center", justifyContent: "center", position: "relative" },
  avatar: { backgroundColor: "#F0F4F8", alignItems: "center", justifyContent: "flex-end", overflow: "hidden", borderWidth: 3, borderColor: "#E8EDF2" },
  editBadge: { position: "absolute", bottom: 0, right: "33%", backgroundColor: "#222222", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 },
  avatarName: { fontSize: 20, fontFamily: "Manrope_700Bold", color: "#222222", textAlign: "center" },
  avatarEmail: { fontSize: 13, fontFamily: "Manrope_400Regular", color: "#999999", textAlign: "center", marginTop: 2 },
  profileNameCard: { backgroundColor: "rgba(0,0,0,0.02)", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.04)" },
  
  // Expandable Section Styles
  sectionHeader: { paddingVertical: 12, paddingHorizontal: 14, backgroundColor: "rgba(255,255,255,0.6)", borderRadius: 8, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },
  sectionHeaderTouchable: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 14, fontFamily: "Manrope_700Bold", color: "#222222" },
  expandArrow: { width: 20, height: 20, alignItems: "center", justifyContent: "center", transform: [{ rotate: "0deg" }] },
  expandArrowOpen: { transform: [{ rotate: "180deg" }] },
  
  // Card styles
  card: { backgroundColor: "#FFFFFF", borderRadius: 10, borderWidth: 1, borderColor: "#F0F0F0", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 8 },
  cardRowLabel: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  cardRowTitle: { fontSize: 14, fontFamily: "Manrope_600SemiBold", color: "#222222", marginBottom: 0 },
  cardRowValue: { fontSize: 12, fontFamily: "Manrope_400Regular", color: "#999999", marginTop: 2 },
  cardDivider: { height: 1, backgroundColor: "#F5F5F5", marginHorizontal: 14 },
  cardInput: { fontSize: 14, fontFamily: "Manrope_500Medium", color: "#222222", paddingVertical: 6, paddingHorizontal: 0, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  
  // Field styles
  fieldLabel: { fontSize: 12, fontFamily: "Manrope_600SemiBold", color: "#999999", letterSpacing: 0.5, textTransform: "uppercase" },
  fieldBox: { backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", width: "100%", borderWidth: 1, borderColor: "#EEEEEE" },
  fieldIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center", marginRight: 10 },
  fieldInput: { flex: 1, fontSize: 15, fontFamily: "Manrope_500Medium", color: "#222222", paddingVertical: 0 },
  
  // Button styles
  saveBtn: { backgroundColor: "#222222", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, borderRadius: 14 },
  saveBtnText: { fontSize: 16, fontFamily: "Manrope_600SemiBold", color: "#FFFFFF" },
  signOutBtn: { flexDirection: "row", backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#FECACA", borderRadius: 14 },
  signOutBtnText: { fontSize: 15, fontFamily: "Manrope_600SemiBold", color: "#EF4444" },
  
  toast: { position: "absolute", bottom: 100, flexDirection: "row", alignItems: "center", alignSelf: "center", backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  toastText: { fontSize: 13, fontFamily: "Manrope_500Medium", color: "#222222" },
  
  // Toggle/Settings styles
  toggle: { width: 52, height: 32, borderRadius: 16, justifyContent: "center", paddingHorizontal: 2 },
  toggleActive: { backgroundColor: "#FF385C" },
  toggleInactive: { backgroundColor: "#E5E7EB" },
  toggleThumb: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
});


// "€"€"€ Main Screen "€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€"€
export default function HomeScreen() {
  const { layoutW, vw, vh, fw, isTablet } = useResponsive();

  const [searchText, setSearchText] = useState("");
  const [showCategories, setShowCategories] = useState(false);
  const [residential, setResidential] = useState(false);
  const [commercial, setCommercial] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"home" | "saved" | "dashboard" | "profile">("home");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedProp, setSelectedProp] = useState<PropertyWithCoords | null>(null);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [showAIButton, setShowAIButton] = useState(true);

  // ─── FAB Drag state ────────────────────────────────────────────────────────
  const fabX = useRef(new Animated.Value(0)).current;
  const fabY = useRef(new Animated.Value(0)).current;
  const fabPosRef = useRef({ x: 0, y: 0 });

  // ─── Auth context ──────────────────────────────────────────────────────────
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userName, setUserName] = useState("");

  // ─── AI Chat state ─────────────────────────────────────────────────────────
  const [chatVisible, setChatVisible] = useState(false);
  const [chatModalMounted, setChatModalMounted] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistoryLoaded, setChatHistoryLoaded] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);
  const [thinkingPhase, setThinkingPhase] = useState(0);
  const thinkingDotAnim = useRef(new Animated.Value(0)).current;
  const chatSlideAnim = useRef(new Animated.Value(0)).current;

  const thinkingSteps = [
    "Thinking...",
    "Scanning properties database...",
    "Analyzing data...",
    "Preparing response...",
  ];

  useEffect(() => {
    if (!chatLoading) { setThinkingPhase(0); return; }
    const interval = setInterval(() => {
      setThinkingPhase(p => (p + 1) % thinkingSteps.length);
    }, 2000);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(thinkingDotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(thinkingDotAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => { clearInterval(interval); pulse.stop(); };
  }, [chatLoading]);

  // Load chat history from backend when chat opens
  useEffect(() => {
    if (chatVisible && !chatHistoryLoaded && userToken) {
      getChatHistory(userToken).then(msgs => {
        if (msgs.length > 0) setChatMessages(msgs);
        setChatHistoryLoaded(true);
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: false }), 150);
      }).catch(() => setChatHistoryLoaded(true));
    }
  }, [chatVisible, chatHistoryLoaded, userToken]);

  const openChat = () => {
    setChatModalMounted(true);
    requestAnimationFrame(() => {
      Animated.spring(chatSlideAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 20,
        stiffness: 180,
      }).start();
    });
    setChatVisible(true);
  };

  const closeChat = () => {
    Animated.timing(chatSlideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setChatModalMounted(false);
      setChatVisible(false);
    });
  };

  const handleClearChat = async () => {
    setChatMessages([]);
    if (userToken) clearChatHistory(userToken).catch(() => { });
  };

  const handleSendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const userMsg: ChatMessage = { role: "user", text };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    setChatInput("");
    setChatLoading(true);
    try {
      const history = updated.slice(0, -1);
      const reply = await sendChatMessage([userMsg], history, userToken);
      setChatMessages(prev => [...prev, { role: "model", text: reply }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: "model", text: `Sorry, something went wrong: ${err.message}` }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // ─── Format AI response with markdown-like rendering ─────────────────────
  const renderFormattedAI = (text: string) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];

    lines.forEach((line, li) => {
      const trimmed = line.trim();
      if (!trimmed) {
        elements.push(<View key={`sp-${li}`} style={{ height: 6 }} />);
        return;
      }

      // Heading: lines starting with ##, ###, or **Title**
      if (/^#{1,3}\s+/.test(trimmed)) {
        const headingText = trimmed.replace(/^#{1,3}\s+/, "");
        elements.push(
          <Text key={`h-${li}`} style={{ fontSize: 15, fontFamily: "Manrope_700Bold", color: "#222222", marginTop: li > 0 ? 8 : 0, marginBottom: 4 }}>
            {headingText}
          </Text>
        );
        return;
      }

      // Numbered list: "1. ", "2. ", etc.
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.push(
          <View key={`nl-${li}`} style={{ flexDirection: "row", marginTop: 4, paddingLeft: 4 }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#FF385C", alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 1 }}>
              <Text style={{ fontSize: 11, fontFamily: "Manrope_700Bold", color: "#FFFFFF" }}>{numMatch[1]}</Text>
            </View>
            <View style={{ flex: 1 }}>{renderInlineFormatting(numMatch[2], `nlt-${li}`)}</View>
          </View>
        );
        return;
      }

      // Bullet list: "- " or "• "
      if (/^[-•]\s+/.test(trimmed)) {
        const bulletText = trimmed.replace(/^[-•]\s+/, "");
        elements.push(
          <View key={`bl-${li}`} style={{ flexDirection: "row", marginTop: 3, paddingLeft: 6 }}>
            <Text style={{ fontSize: 14, color: "#FF385C", marginRight: 8, marginTop: 1, fontFamily: "Manrope_700Bold" }}>•</Text>
            <View style={{ flex: 1 }}>{renderInlineFormatting(bulletText, `blt-${li}`)}</View>
          </View>
        );
        return;
      }

      // Separator line
      if (/^[-—]{3,}$/.test(trimmed)) {
        elements.push(<View key={`hr-${li}`} style={{ height: 1, backgroundColor: "#E0E0E0", marginVertical: 8 }} />);
        return;
      }

      // Regular text with inline formatting
      elements.push(
        <View key={`p-${li}`} style={{ marginTop: li > 0 ? 2 : 0 }}>
          {renderInlineFormatting(trimmed, `pt-${li}`)}
        </View>
      );
    });

    return <View>{elements}</View>;
  };

  const renderInlineFormatting = (text: string, keyPrefix: string) => {
    // Split by **bold** segments
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
      <Text style={{ fontSize: 14, fontFamily: "Manrope_400Regular", color: "#222222", lineHeight: 21 }}>
        {parts.map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <Text key={`${keyPrefix}-b-${i}`} style={{ fontFamily: "Manrope_700Bold", color: "#222222" }}>
                {part.slice(2, -2)}
              </Text>
            );
          }
          return <Text key={`${keyPrefix}-t-${i}`}>{part}</Text>;
        })}
      </Text>
    );
  };

  // ─── Live data from backend ────────────────────────────────────────────────
  const [properties, setProperties] = useState<PropertyWithCoords[]>([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Load token + user info and then fetch saved IDs from backend
  useEffect(() => {
    SecureStore.getItemAsync('mobile_auth_token').then(token => {
      setUserToken(token);
      if (token) {
        getSavedIds(token)
          .then(ids => setLikedIds(new Set(ids)))
          .catch(() => { }); // silently degrade
      }
    });
    getUser().then(u => { if (u) setUserName(u.name || ""); });
  }, []);


  useEffect(() => {
    setLoadingProps(true);
    setFetchError("");
    const filters: Record<string, string> = {};
    if (residential && !commercial) filters.category = "residential";
    if (commercial && !residential) filters.category = "commercial";

    console.log("📍 Fetching properties with filters:", filters);
    getProperties(filters)
      .then((data) => {
        console.log("✅ Properties fetched successfully:", data.length, "properties");
        const mapped: PropertyWithCoords[] = data.map((p: any) => ({
          ...p,
          latitude: p.lat ?? 17.4123,
          longitude: p.lng ?? 78.4234,
          priceHistory: Array.isArray(p.priceHistory)
            ? p.priceHistory.map((h: any) => (typeof h === "number" ? h : h.price))
            : [],
        }));
        console.log("📦 Mapped properties:", mapped.length);
        setProperties(mapped);
      })
      .catch((err) => {
        console.error("❌ API Error:", err.message);
        // Backend unavailable: show a small curated mock list so the UI still works.
        const mock: PropertyWithCoords[] = [
          {
            id: "mock-1",
            plot: "Plot 21, Green Valley",
            title: "Modern Family Home",
            area: "Green Valley",
            location: "Hyderabad",
            type: "residential",
            status: "Available",
            demand: "High demand",
            pricePerSqft: 6500,
            size: "2,100 sq.ft",
            zoning: "Residential",
            description: "Bright 3BHK with balcony, close to parks and schools.",
            beds: 3,
            baths: 3,
            garage: 1,
            yearBuilt: 2021,
            agentName: "Sarah Thomas",
            agentRole: "Senior Agent",
            agentPhone: "+91 98765 43210",
            currentPrice: 14500000,
            pastYearGain: 12,
            priceChange: "+₹18.2L in last year",
            priceHistory: [85, 92, 95, 101, 110, 118, 123],
            lat: 17.4123,
            lng: 78.4234,
            latitude: 17.4123,
            longitude: 78.4234,
            isPublic: true,
          },
          {
            id: "mock-2",
            plot: "Plot 8, Tech Park",
            title: "Premium Office Space",
            area: "Financial District",
            location: "Hyderabad",
            type: "commercial",
            status: "Available",
            demand: "Medium",
            pricePerSqft: 9800,
            size: "4,500 sq.ft",
            zoning: "Commercial",
            description: "Grade A office space in a landmark tower with 24/7 security.",
            beds: 0,
            baths: 4,
            garage: 6,
            yearBuilt: 2019,
            agentName: "Rohit Verma",
            agentRole: "Commercial Specialist",
            agentPhone: "+91 99887 66554",
            currentPrice: 52000000,
            pastYearGain: 9,
            priceChange: "+₹4.3Cr in last 3 years",
            priceHistory: [120, 125, 130, 136, 142, 147, 152],
            lat: 17.4301,
            lng: 78.3502,
            latitude: 17.4301,
            longitude: 78.3502,
            isPublic: true,
          },
        ];
        console.log("📋 Showing mock data:", mock.length, "properties");
        setProperties(mock);
      })
      .finally(() => setLoadingProps(false));
  }, [residential, commercial]);

  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const NAV_HEIGHT = vw(14);
  const NAV_BOTTOM = vh(5.5);
  const LIST_PAD_BOTTOM = NAV_HEIGHT + NAV_BOTTOM + vw(4);

  const insets = useSafeAreaInsets();
  // Use safe area top inset €" correctly handles Dynamic Island iPhones (59px)
  const statusBarH = Platform.OS === "android" ? (StatusBar.currentHeight ?? insets.top) : insets.top;

  const toggleCategories = () => {
    if (showCategories) {
      Animated.parallel([
        Animated.timing(dropdownAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 160, useNativeDriver: false }),
      ]).start(() => setShowCategories(false));
    } else {
      setShowCategories(true);
      Animated.parallel([
        Animated.timing(dropdownAnim, { toValue: 1, duration: 240, useNativeDriver: false }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 240, useNativeDriver: false }),
      ]).start();
    }
  };

  const cardMaxHeight = dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 340] });

  const toggleLike = useCallback((id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      const isNowSaving = !next.has(id);
      isNowSaving ? next.add(id) : next.delete(id);
      // Persist to backend (fire-and-forget)
      if (userToken) {
        if (isNowSaving) saveProperty(userToken, id).catch(() => { });
        else unsaveProperty(userToken, id).catch(() => { });
      }
      return next;
    });
  }, [userToken]);

  const onSearchBarLayout = useCallback((e: any) => {
    e.target.measure((_x: number, _y: number, _w: number, _h: number, _px: number, py: number) => {
      setDropdownTop(py + e.nativeEvent.layout.height + 6);
    });
  }, []);

  // Extract unique area names for location filter chips
  const uniqueAreas = Array.from(new Set(properties.map(p => p.area).filter(Boolean))).sort();

  const filtered = properties.filter((p) => {
    const q = searchText.trim().toLowerCase();
    const matchesSearch = !q ||
      p.title.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      p.plot.toLowerCase().includes(q);
    const matchesType =
      (!residential && !commercial) ||
      (residential && p.type === "residential") ||
      (commercial && p.type === "commercial");
    const matchesVerified = !verifiedOnly || p.isVerified === true;
    const matchesArea = !selectedArea || p.area === selectedArea;
    return matchesSearch && matchesType && matchesVerified && matchesArea;
  });

  const displayList = activeTab === "saved"
    ? filtered.filter((p) => likedIds.has(p.id))
    : filtered;

  // ─── FAB Drag Setup (must be before any early return) ──────────────────────
  const fabPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Store the current position when drag starts
      },
      onPanResponderMove: (evt, { dx, dy }) => {
        fabX.setValue(fabPosRef.current.x + dx);
        fabY.setValue(fabPosRef.current.y + dy);
      },
      onPanResponderRelease: (evt, { dx, dy }) => {
        // Update stored position with the new location
        fabPosRef.current.x += dx;
        fabPosRef.current.y += dy;
      },
    })
  ).current;

  // Initialize FAB position on mount and load AI button visibility setting
  useEffect(() => {
    const initialX = layoutW - vw(19);
    const initialY = vh(82);
    fabPosRef.current = { x: initialX, y: initialY };
    fabX.setValue(initialX);
    fabY.setValue(initialY);

    // Load AI button visibility setting
    SecureStore.getItemAsync('showAIButton')
      .then(value => {
        if (value !== null) {
          setShowAIButton(value === 'true');
        }
      })
      .catch(() => {});
  }, []);

  // "€"€ Render Property Detail Screen "€"€
  if (selectedProp) {
    return (
      <View style={[s.root, { width: layoutW }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <PropertyDetailScreen
          property={selectedProp}
          liked={likedIds.has(selectedProp.id)}
          onLike={() => toggleLike(selectedProp.id)}
          onBack={() => setSelectedProp(null)}
          vw={vw} vh={vh} layoutW={layoutW}
          NAV_HEIGHT={NAV_HEIGHT} NAV_BOTTOM={NAV_BOTTOM}
          statusBarH={statusBarH}
          userToken={userToken}
          userName={userName}
        />

        {/* Bottom nav on detail screen too */}
        <View style={[s.bottomNav, {
          bottom: NAV_BOTTOM,
          left: vw(17),
          right: vw(17),
          height: NAV_HEIGHT,
          borderRadius: vw(10),
          paddingHorizontal: vw(6),
        }]}>
          {(["home", "saved", "dashboard", "profile"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={s.navItem}
              onPress={() => { setSelectedProp(null); setActiveTab(tab); }}
              activeOpacity={0.7}
            >
              {tab === "home" && <HomeNavIcon active={false} />}
              {tab === "saved" && <HeartNavIcon active={false} />}
              {tab === "dashboard" && (
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Path d="M3 12l9-9 9 9M5 10v10h14V10" stroke="#717171" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M9 20v-6h6v6" stroke="#717171" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              )}
              {tab === "profile" && <ProfileNavIcon active={false} />}
            </TouchableOpacity>
          ))}
        </View>
        <View style={[s.homeIndicator, { width: vw(35.7), bottom: vh(0.5) }]} />
      </View>
    );
  }

  return (
    <View style={[s.root, {
      width: layoutW,
      backgroundColor: activeTab === "profile" ? "#FFFFFF" : "#FFFFFF",
    }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      {/* "€"€ Profile tab "€"€ */}
      {activeTab === "profile" ? (
        <ProfileScreen
          vw={vw} vh={vh} layoutW={layoutW}
          NAV_HEIGHT={NAV_HEIGHT} NAV_BOTTOM={NAV_BOTTOM}
          statusBarH={statusBarH}
          onBack={() => setActiveTab("home")}
          userToken={userToken}
          showAIButton={showAIButton}
          onToggleAIButton={async (value) => {
            setShowAIButton(value);
            await SecureStore.setItemAsync('showAIButton', value.toString());
          }}
        />
      ) : activeTab === "dashboard" ? (
        <NriDashboardScreen
          vw={vw} fw={fw}
          NAV_HEIGHT={NAV_HEIGHT} NAV_BOTTOM={NAV_BOTTOM}
          statusBarH={statusBarH}
          properties={properties}
          onOpenProperty={(p) => setSelectedProp(p as PropertyWithCoords)}
        />
      ) : (
        <>{/* non-profile branch */}
          {/* Fullscreen map behind everything */}
          {viewMode === "map" && (
            <View style={[StyleSheet.absoluteFillObject as any, { zIndex: 0 }]}>
              <MapViewScreen
                properties={displayList as PropertyWithCoords[]}
                likedIds={likedIds}
                onLikeToggle={toggleLike}
                onViewDetail={(p) => setSelectedProp(p)}
                NAV_HEIGHT={NAV_HEIGHT}
                NAV_BOTTOM={NAV_BOTTOM}
                statusBarH={statusBarH}
                vw={vw}
              />
            </View>
          )}

          {/* Search bar — floats on top in both modes */}
          <View style={[s.topArea, { paddingTop: statusBarH + vw(2), zIndex: 20 }]}>
            <View
              style={[s.searchRow, {
                marginHorizontal: vw(4),
                height: vw(12.8),
                borderRadius: vw(5),
                paddingHorizontal: vw(4.5),
              }]}
              onLayout={onSearchBarLayout}
            >
              <View style={[s.searchLeft, { gap: vw(2.1) }]}>
                <SearchIcon color="#222222" />
                <TextInput
                  style={s.searchInput}
                  placeholder="search area"
                  placeholderTextColor="rgba(0,0,0,0.4)"
                  value={searchText}
                  onChangeText={setSearchText}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <ClearIcon />
                  </TouchableOpacity>
                )}
              </View>
              <View style={[s.divider, { height: vw(7), marginHorizontal: vw(3) }]} />
              <TouchableOpacity onPress={toggleCategories} style={[s.filterBtn, { width: vw(6.4), height: vw(6.4) }]} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                <FilterIcon active={showCategories || !!(selectedArea || residential || commercial || verifiedOnly)} />
                {(selectedArea || residential || commercial || verifiedOnly) && (
                  <View style={{ position: "absolute", top: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: "#FF385C", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 8, fontFamily: "Manrope_700Bold", color: "#FFF" }}>
                      {[selectedArea, residential, commercial, verifiedOnly].filter(Boolean).length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={[s.divider, { height: vw(7), marginHorizontal: vw(3) }]} />
              <TouchableOpacity
                onPress={() => setViewMode(viewMode === "map" ? "list" : "map")}
                style={[s.filterBtn, { width: vw(6.4), height: vw(6.4) }]}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              >
                {viewMode === "map" ? <ListViewIcon active /> : <MapViewIcon active={false} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* List view content (visible only in list mode) */}
          {viewMode === "list" && (
            <>
              {/* Section header */}
              <View style={[s.sectionHeader, { paddingHorizontal: vw(4), paddingTop: vw(4.8), paddingBottom: vw(2.4) }]}>
                <Text style={s.sectionTitle}>{activeTab === "saved" ? "Saved Properties" : "Listed Properties"}</Text>
                <Text style={s.sectionCount}>
                  {loadingProps ? "Loading..." : fetchError ? "Error" : `${displayList.length} ${displayList.length === 1 ? "result" : "results"}`}
                </Text>
              </View>

              {/* Loading / error states */}
              {loadingProps && (
                <View style={[s.emptyState, { paddingBottom: LIST_PAD_BOTTOM }]}>
                  <Text style={s.emptyTitle}>Loading properties...</Text>
                </View>
              )}
              {!loadingProps && !!fetchError ? (
                <View style={[s.emptyState, { paddingBottom: LIST_PAD_BOTTOM, gap: vw(3.2) }]}>
                  <Text style={[s.emptyTitle, { color: "#EF4444" }]}>Could not load properties</Text>
                  <Text style={[s.emptySubtitle, { paddingHorizontal: vw(10) }]}>{fetchError}</Text>
                </View>
              ) : null}

              {/* Property list */}
              {!loadingProps && !fetchError && displayList.length === 0 ? (
                <View style={[s.emptyState, { paddingBottom: LIST_PAD_BOTTOM, gap: vw(3.2) }]}>
                  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
                    <Circle cx="11" cy="11" r="7" stroke="#DFDAD3" strokeWidth={1.6} />
                    <Path d="M16.5 16.5L21 21" stroke="#DFDAD3" strokeWidth={1.6} strokeLinecap="round" />
                  </Svg>
                  <Text style={s.emptyTitle}>No properties found</Text>
                  <Text style={[s.emptySubtitle, { paddingHorizontal: vw(10) }]}>
                    {activeTab === "saved" ? "Like properties to save them here" : "Try a different search or filter"}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={displayList}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <PropertyCard
                      item={item}
                      liked={likedIds.has(item.id)}
                      onLike={() => toggleLike(item.id)}
                      onPress={() => setSelectedProp(item)}
                      vw={vw}
                    />
                  )}
                  contentContainerStyle={{ paddingBottom: LIST_PAD_BOTTOM, paddingTop: vw(1.6) }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                />
              )}
            </>
          )}


          {/* "€"€ Filter dropdown "€"€ */}
          {showCategories && (
            <Animated.View
              style={[s.categoriesCard, {
                top: dropdownTop, left: vw(4), right: vw(4),
                borderRadius: vw(4), paddingHorizontal: vw(4),
                paddingVertical: vw(3.5), maxHeight: cardMaxHeight, opacity: opacityAnim,
              }]}
              pointerEvents="auto"
            >
              {/* Header with clear */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: vw(2.5), marginBottom: vw(2.5), borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)" }}>
                <Text style={{ fontSize: 14, fontFamily: "Manrope_700Bold", color: "#222222" }}>Filters</Text>
                {(selectedArea || residential || commercial || verifiedOnly) && (
                  <TouchableOpacity
                    onPress={() => { setSelectedArea(null); setResidential(false); setCommercial(false); setVerifiedOnly(false); }}
                    activeOpacity={0.7}
                    style={{ paddingVertical: 2, paddingHorizontal: 8 }}
                  >
                    <Text style={{ fontSize: 12, fontFamily: "Manrope_600SemiBold", color: "#FF385C" }}>Clear all</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Location section */}
              <Text style={{ fontSize: 11, fontFamily: "Manrope_600SemiBold", color: "#86868B", letterSpacing: 0.8, marginBottom: vw(2) }}>LOCATION</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: vw(3), marginHorizontal: -vw(1) }}>
                <View style={{ flexDirection: "row", gap: vw(2), paddingHorizontal: vw(1) }}>
                  <TouchableOpacity
                    onPress={() => setSelectedArea(null)}
                    activeOpacity={0.7}
                    style={{
                      paddingVertical: vw(1.8),
                      paddingHorizontal: vw(3),
                      borderRadius: vw(5),
                      backgroundColor: !selectedArea ? "#1D1D1F" : "#F5F5F7",
                      borderWidth: 1,
                      borderColor: !selectedArea ? "#1D1D1F" : "#E8E8E8",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontFamily: "Manrope_600SemiBold", color: !selectedArea ? "#FFFFFF" : "#1D1D1F" }}>All</Text>
                  </TouchableOpacity>
                  {uniqueAreas.map((area) => {
                    const isActive = selectedArea === area;
                    const count = properties.filter(p => p.area === area).length;
                    return (
                      <TouchableOpacity
                        key={area}
                        onPress={() => setSelectedArea(isActive ? null : area)}
                        activeOpacity={0.7}
                        style={{
                          paddingVertical: vw(1.8),
                          paddingHorizontal: vw(3),
                          borderRadius: vw(5),
                          backgroundColor: isActive ? "#1D1D1F" : "#F5F5F7",
                          borderWidth: 1,
                          borderColor: isActive ? "#1D1D1F" : "#E8E8E8",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: vw(1.2),
                        }}
                      >
                        <Text style={{ fontSize: 12, fontFamily: "Manrope_600SemiBold", color: isActive ? "#FFFFFF" : "#1D1D1F" }}>{area}</Text>
                        <View style={{
                          backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.06)",
                          paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8,
                        }}>
                          <Text style={{ fontSize: 10, fontFamily: "Manrope_600SemiBold", color: isActive ? "#FFFFFF" : "#86868B" }}>{count}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Type section */}
              <Text style={{ fontSize: 11, fontFamily: "Manrope_600SemiBold", color: "#86868B", letterSpacing: 0.8, marginBottom: vw(2) }}>TYPE</Text>
              <View style={{ flexDirection: "row", gap: vw(2), marginBottom: vw(3) }}>
                {[
                  { label: "Residential", val: residential, set: setResidential },
                  { label: "Commercial", val: commercial, set: setCommercial },
                ].map(({ label, val, set }) => (
                  <TouchableOpacity
                    key={label}
                    onPress={() => set(!val)}
                    activeOpacity={0.7}
                    style={{
                      paddingVertical: vw(1.8),
                      paddingHorizontal: vw(3),
                      borderRadius: vw(5),
                      backgroundColor: val ? "rgba(255,56,92,0.1)" : "#F5F5F7",
                      borderWidth: 1,
                      borderColor: val ? "#FF385C" : "#E8E8E8",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: vw(1.5),
                    }}
                  >
                    <View style={[s.checkbox, { borderRadius: 3 }, val && s.checkboxActive]}>
                      {val && <CheckmarkIcon />}
                    </View>
                    <Text style={{ fontSize: 12, fontFamily: "Manrope_500Medium", color: val ? "#FF385C" : "#1D1D1F" }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Verified toggle */}
              <TouchableOpacity
                onPress={() => setVerifiedOnly(!verifiedOnly)}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: vw(2.5),
                  paddingHorizontal: vw(2),
                  borderRadius: vw(3),
                  backgroundColor: verifiedOnly ? "rgba(16,185,129,0.08)" : "#F5F5F7",
                  borderWidth: 1,
                  borderColor: verifiedOnly ? "rgba(16,185,129,0.3)" : "#E8E8E8",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: vw(2) }}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={verifiedOnly ? "#10B981" : "#86868B"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M9 12l2 2 4-4" stroke={verifiedOnly ? "#10B981" : "#86868B"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text style={{ fontSize: 12, fontFamily: "Manrope_600SemiBold", color: verifiedOnly ? "#10B981" : "#1D1D1F" }}>Verified only</Text>
                </View>
                <View style={[
                  { width: 36, height: 22, borderRadius: 11, justifyContent: "center", paddingHorizontal: 2 },
                  verifiedOnly ? { backgroundColor: "#10B981" } : { backgroundColor: "#E0E0E0" },
                ]}>
                  <View style={{
                    width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFFFFF",
                    alignSelf: verifiedOnly ? "flex-end" : "flex-start",
                    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
                  }} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </>
      )}

      {/* ── AI Chat FAB (Draggable) ── */}
      {!chatVisible && showAIButton && (
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              width: vw(14),
              height: vw(14),
              borderRadius: vw(7),
              zIndex: 90,
            },
            {
              transform: [
                { translateX: fabX },
                { translateY: fabY },
              ],
            },
          ]}
          {...fabPanResponder.panHandlers}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={openChat}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: vw(7),
              backgroundColor: "#FF385C",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#FF385C",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 10,
            }}
          >
            <Svg width={vw(6)} height={vw(6)} viewBox="0 0 24 24" fill="none">
              <Path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" fill="#fff" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── AI Chat Modal (smooth animated) ── */}
      <Modal visible={chatModalMounted} animationType="none" transparent>
        <Animated.View style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          opacity: chatSlideAnim,
        }}>
          <Animated.View style={{
            flex: 1,
            marginTop: vh(8),
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
            transform: [{
              translateY: chatSlideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [600, 0],
              }),
            }],
          }}>
            {/* Header */}
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#F0F0F0",
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#FF385C", alignItems: "center", justifyContent: "center" }}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" fill="#fff" stroke="#fff" strokeWidth={1.5} />
                  </Svg>
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontFamily: "Manrope_700Bold", color: "#222222" }}>Property Assistant</Text>
                  <Text style={{ fontSize: 11, fontFamily: "Manrope_500Medium", color: "#717171" }}>Powered by OpenAI</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {chatMessages.length > 0 && (
                  <TouchableOpacity onPress={handleClearChat} activeOpacity={0.7}
                    style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center" }}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                      <Path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" stroke="#999" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={closeChat} activeOpacity={0.7}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center" }}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M18 6L6 18M6 6l12 12" stroke="#222" strokeWidth={2} strokeLinecap="round" />
                  </Svg>
                </TouchableOpacity>
              </View>
            </View>

            {/* Messages */}
            <ScrollView
              ref={chatScrollRef}
              style={{ flex: 1, paddingHorizontal: 16 }}
              contentContainerStyle={{ paddingVertical: 16 }}
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
            >
              {chatMessages.length === 0 && (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFF0F2", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                      <Path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" fill="#FF385C" opacity={0.2} stroke="#FF385C" strokeWidth={1.5} />
                    </Svg>
                  </View>
                  <Text style={{ fontSize: 16, fontFamily: "Manrope_700Bold", color: "#222222", marginBottom: 8 }}>Hi! I'm your property assistant</Text>
                  <Text style={{ fontSize: 13, fontFamily: "Manrope_400Regular", color: "#717171", textAlign: "center", lineHeight: 20, paddingHorizontal: 20 }}>
                    Ask me about properties, pricing, areas, developers, investment analysis, or transparency scores. I have access to all live platform data.
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 20 }}>
                    {[
                      "Show me verified properties",
                      "Which area has best ROI?",
                      "Compare properties in Tech Park",
                      "Any fraud risks?",
                    ].map((q) => (
                      <TouchableOpacity key={q} activeOpacity={0.7}
                        onPress={() => { setChatInput(q); }}
                        style={{ backgroundColor: "#F7F7F7", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "#EBEBEB" }}>
                        <Text style={{ fontSize: 12, fontFamily: "Manrope_500Medium", color: "#222222" }}>{q}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {chatMessages.map((msg, i) => (
                <View key={i} style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "82%",
                  marginBottom: 12,
                }}>
                  <View style={{
                    backgroundColor: msg.role === "user" ? "#FF385C" : "#F5F5F5",
                    borderRadius: 18,
                    borderBottomRightRadius: msg.role === "user" ? 4 : 18,
                    borderBottomLeftRadius: msg.role === "user" ? 18 : 4,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}>
                    {msg.role === "user" ? (
                      <Text style={{ fontSize: 14, fontFamily: "Manrope_400Regular", color: "#FFFFFF", lineHeight: 21 }}>{msg.text}</Text>
                    ) : (
                      renderFormattedAI(msg.text)
                    )}
                  </View>
                  <Text style={{
                    fontSize: 10,
                    fontFamily: "Manrope_400Regular",
                    color: "#BBBBBB",
                    marginTop: 4,
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    marginHorizontal: 4,
                  }}>{msg.role === "user" ? "You" : "AI Assistant"}</Text>
                </View>
              ))}

              {chatLoading && (
                <View style={{ alignSelf: "flex-start", maxWidth: "80%", marginBottom: 12 }}>
                  <View style={{ backgroundColor: "#F5F5F5", borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Animated.View style={{
                        width: 10, height: 10, borderRadius: 5,
                        backgroundColor: "#FF385C",
                        opacity: thinkingDotAnim,
                      }} />
                      <Text style={{ fontSize: 13, fontFamily: "Manrope_600SemiBold", color: "#666666" }}>
                        {thinkingSteps[thinkingPhase]}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input bar */}
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderTopWidth: 1,
              borderTopColor: "#F0F0F0",
              backgroundColor: "#FFFFFF",
              gap: 8,
            }}>
              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Ask about properties, areas, pricing..."
                placeholderTextColor="#AAAAAA"
                style={{
                  flex: 1,
                  height: 44,
                  backgroundColor: "#F7F7F7",
                  borderRadius: 22,
                  paddingHorizontal: 18,
                  fontSize: 14,
                  fontFamily: "Manrope_400Regular",
                  color: "#222222",
                  borderWidth: 1,
                  borderColor: "#EBEBEB",
                }}
                onSubmitEditing={handleSendChat}
                returnKeyType="send"
                editable={!chatLoading}
              />
              <TouchableOpacity
                onPress={handleSendChat}
                disabled={chatLoading || !chatInput.trim()}
                activeOpacity={0.7}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: chatInput.trim() ? "#FF385C" : "#EBEBEB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
            </View>

            {/* Safe area spacer */}
            <View style={{ height: vh(3), backgroundColor: "#FFFFFF" }} />
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* -- Bottom navigation -- */}
      <View style={[s.bottomNav, {
        bottom: NAV_BOTTOM,
        left: vw(17),
        right: vw(17),
        height: NAV_HEIGHT,
        borderRadius: vw(10),
        paddingHorizontal: vw(6),
      }]}>
        {(["home", "saved", "dashboard", "profile"] as const).map((tab) => (
          <TouchableOpacity key={tab} style={s.navItem} onPress={() => setActiveTab(tab)} activeOpacity={0.7}>
            {tab === "home" && <HomeNavIcon active={activeTab === tab} />}
            {tab === "saved" && <HeartNavIcon active={activeTab === tab} />}
            {tab === "dashboard" && <DashboardNavIcon active={activeTab === tab} />}
            {tab === "profile" && <ProfileNavIcon active={activeTab === tab} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={[s.homeIndicator, { width: vw(35.7), bottom: vh(0.5) }]} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignSelf: "center", backgroundColor: "#FFFFFF", overflow: "hidden" },
  topArea: { backgroundColor: "rgba(255,255,255,0.98)", borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8, zIndex: 20, paddingBottom: 12 },
  topAreaFloat: { position: "absolute", left: 0, right: 0, zIndex: 50, elevation: 50 },
  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  searchLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Manrope_400Regular", color: "#222222", letterSpacing: 0.3, paddingVertical: 0 },
  divider: { width: 1, backgroundColor: "rgba(0,0,0,0.08)" },
  wifiRow: { flexDirection: "row", alignItems: "center" },
  wifiText: { fontSize: 14, fontFamily: "Manrope_500Medium", color: "#222222" },
  filterBtn: { alignItems: "center", justifyContent: "center" },
  categoriesCard: { position: "absolute", backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 20, zIndex: 100, overflow: "hidden", borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
  categoriesTitle: { fontSize: 12, fontFamily: "Manrope_600SemiBold", color: "#222222", lineHeight: 20 },
  checkboxRow: { flexDirection: "row", alignItems: "center" },
  checkboxItem: { flexDirection: "row", alignItems: "center" },
  checkbox: { width: 14, height: 14, borderRadius: 3, borderWidth: 1, borderColor: "#EBEBEB", backgroundColor: "transparent", alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: "#FF385C", borderColor: "#FF385C" },
  checkboxLabel: { fontSize: 10, fontFamily: "Manrope_400Regular", color: "#222222", lineHeight: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontFamily: "Manrope_700Bold", color: "#222222" },
  sectionCount: { fontSize: 12, fontFamily: "Manrope_400Regular", color: "#717171" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 16, fontFamily: "Manrope_600SemiBold", color: "#717171" },
  emptySubtitle: { fontSize: 13, fontFamily: "Manrope_400Regular", color: "#717171", textAlign: "center" },
  bottomNav: { position: "absolute", backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "space-around", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 16, zIndex: 20, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  navLabel: { fontSize: 10, fontFamily: "Manrope_500Medium", color: "#717171" },
  navLabelActive: { color: "#FF385C" },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#FF385C" },
  homeIndicator: { position: "absolute", height: 4, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2, alignSelf: "center" },
});
