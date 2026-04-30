import React, { useRef, useEffect } from "react";
import {
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect, Line, Polyline, Polygon } from "react-native-svg";

const FIGMA_W = 375;
const MAX_LAYOUT_W = 430;

function useResponsive() {
  const { width: winW, height: winH } = useWindowDimensions();
  const layoutW = Math.min(winW, MAX_LAYOUT_W);
  const fw = (px: number) => (layoutW * (px / FIGMA_W) * 100) / 100;
  return { layoutW, fw };
}

// ─── Minimal SVG Icons ──────────────────────────────────────────────────────
const IconShield = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#1D1D1F" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 12l2 2 4-4" stroke="#1D1D1F" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconMap = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="#1D1D1F" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="10" r="3" stroke="#1D1D1F" strokeWidth={1.5} />
  </Svg>
);

const IconTrending = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke="#1D1D1F" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="17 6 23 6 23 12" stroke="#1D1D1F" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconStar = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="#1D1D1F" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconCpu = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="4" width="16" height="16" rx="2" stroke="#1D1D1F" strokeWidth={1.5} />
    <Rect x="9" y="9" width="6" height="6" stroke="#1D1D1F" strokeWidth={1.5} />
    <Line x1="9" y1="1" x2="9" y2="4" stroke="#1D1D1F" strokeWidth={1.5} />
    <Line x1="15" y1="1" x2="15" y2="4" stroke="#1D1D1F" strokeWidth={1.5} />
    <Line x1="9" y1="20" x2="9" y2="23" stroke="#1D1D1F" strokeWidth={1.5} />
    <Line x1="15" y1="20" x2="15" y2="23" stroke="#1D1D1F" strokeWidth={1.5} />
    <Line x1="20" y1="9" x2="23" y2="9" stroke="#1D1D1F" strokeWidth={1.5} />
    <Line x1="20" y1="15" x2="23" y2="15" stroke="#1D1D1F" strokeWidth={1.5} />
    <Line x1="1" y1="9" x2="4" y2="9" stroke="#1D1D1F" strokeWidth={1.5} />
    <Line x1="1" y1="15" x2="4" y2="15" stroke="#1D1D1F" strokeWidth={1.5} />
  </Svg>
);

const IconSearch = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke="#1D1D1F" strokeWidth={1.5} />
    <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke="#1D1D1F" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const IconHeart = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="#1D1D1F" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconBarChart = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Line x1="18" y1="20" x2="18" y2="10" stroke="#1D1D1F" strokeWidth={1.5} strokeLinecap="round" />
    <Line x1="12" y1="20" x2="12" y2="4" stroke="#1D1D1F" strokeWidth={1.5} strokeLinecap="round" />
    <Line x1="6" y1="20" x2="6" y2="14" stroke="#1D1D1F" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

// ─── Feature Data ───────────────────────────────────────────────────────────
const features = [
  {
    icon: <IconMap />,
    title: "Interactive Map",
    description: "Explore properties on a live map with custom price pins. Tap any marker to see details instantly.",
  },
  {
    icon: <IconShield />,
    title: "Verified Listings",
    description: "Every property is cross-checked with RERA records and government databases for authenticity.",
  },
  {
    icon: <IconStar />,
    title: "Trust Score",
    description: "A 0-100 transparency score reflecting data completeness, verification status, and source reliability.",
  },
  {
    icon: <IconTrending />,
    title: "Price History",
    description: "Track circle rates and market values over time. Understand pricing trends before you invest.",
  },

  {
    icon: <IconBarChart />,
    title: "Risk Assessment",
    description: "Flood risk, pollution index, and safety metrics help you make informed decisions.",
  },
  {
    icon: <IconSearch />,
    title: "Smart Filters",
    description: "Filter by type, verification status, price range, and more. Find exactly what you're looking for.",
  },
  {
    icon: <IconHeart />,
    title: "Save & Compare",
    description: "Save properties to your wishlist and compare them side by side on the NRI dashboard.",
  },
];

const steps = [
  { number: "1", text: "Browse properties in Map or List view" },
  { number: "2", text: "Use filters to narrow by type and verification" },
  { number: "3", text: "Tap a property for detailed transparency data" },
  { number: "4", text: "Save properties and schedule visits" },
  { number: "5", text: "Use the dashboard for investment insights" },
];

// ─── About Screen Component ─────────────────────────────────────────────────
export default function AboutScreen({ onBack }: { onBack: () => void }) {
  const { layoutW, fw } = useResponsive();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.root, { width: layoutW }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + fw(8), paddingBottom: fw(12), paddingHorizontal: fw(16) }]}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={[styles.backBtn, { width: fw(36), height: fw(36), borderRadius: fw(18) }]}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#1D1D1F" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: fw(36) }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: fw(40) }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Hero */}
          <View style={[styles.heroSection, { paddingHorizontal: fw(24), paddingTop: fw(40), paddingBottom: fw(32) }]}>
            {/* App Icon */}
            <View style={[styles.appIcon, { width: fw(72), height: fw(72), borderRadius: fw(18), marginBottom: fw(20) }]}>
              <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
                <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#1D1D1F" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                <Polyline points="9 22 9 12 15 12 15 22" stroke="#1D1D1F" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <Text style={[styles.heroTitle, { fontSize: fw(28) }]}>Realtor</Text>
            <Text style={[styles.heroVersion, { fontSize: fw(13), marginTop: fw(6) }]}>Version 1.0</Text>
            <Text style={[styles.heroSubtitle, { fontSize: fw(15), marginTop: fw(16), paddingHorizontal: fw(8) }]}>
              Real estate transparency, powered by verified data and intelligent analytics.
            </Text>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { marginHorizontal: fw(24) }]} />

          {/* Features Section */}
          <View style={{ paddingHorizontal: fw(24), paddingTop: fw(28) }}>
            <Text style={[styles.sectionLabel, { fontSize: fw(12), marginBottom: fw(16) }]}>FEATURES</Text>

            <View style={styles.featureGrid}>
              {features.map((feature, idx) => (
                <View key={idx} style={[styles.featureCard, { padding: fw(16), borderRadius: fw(14), marginBottom: fw(10) }]}>
                  <View style={[styles.featureIconWrap, { width: fw(40), height: fw(40), borderRadius: fw(12), marginBottom: fw(12) }]}>
                    {feature.icon}
                  </View>
                  <Text style={[styles.featureTitle, { fontSize: fw(14), marginBottom: fw(4) }]}>{feature.title}</Text>
                  <Text style={[styles.featureDesc, { fontSize: fw(12), lineHeight: fw(17) }]}>{feature.description}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { marginHorizontal: fw(24), marginTop: fw(18) }]} />

          {/* How It Works */}
          <View style={{ paddingHorizontal: fw(24), paddingTop: fw(28) }}>
            <Text style={[styles.sectionLabel, { fontSize: fw(12), marginBottom: fw(20) }]}>HOW IT WORKS</Text>

            {steps.map((step, idx) => (
              <View key={idx} style={[styles.stepRow, { marginBottom: fw(16) }]}>
                <View style={[styles.stepNumber, { width: fw(28), height: fw(28), borderRadius: fw(14) }]}>
                  <Text style={[styles.stepNumberText, { fontSize: fw(13) }]}>{step.number}</Text>
                </View>
                <Text style={[styles.stepText, { fontSize: fw(14), marginLeft: fw(14), flex: 1 }]}>{step.text}</Text>
              </View>
            ))}
          </View>

          {/* Divider */}
          <View style={[styles.divider, { marginHorizontal: fw(24), marginTop: fw(12) }]} />

          {/* About Info */}
          <View style={{ paddingHorizontal: fw(24), paddingTop: fw(28), paddingBottom: fw(20) }}>
            <Text style={[styles.sectionLabel, { fontSize: fw(12), marginBottom: fw(16) }]}>ABOUT</Text>

            <View style={[styles.infoCard, { padding: fw(18), borderRadius: fw(14) }]}>
              {[
                { label: "Developer", value: "Realtor" },
                { label: "Platform", value: "iOS, Android, Web" },
                { label: "Data Sources", value: "RERA, Government Records" },

              ].map((item, idx, arr) => (
                <View key={idx}>
                  <View style={[styles.infoRow, { paddingVertical: fw(12) }]}>
                    <Text style={[styles.infoLabel, { fontSize: fw(13) }]}>{item.label}</Text>
                    <Text style={[styles.infoValue, { fontSize: fw(13) }]}>{item.value}</Text>
                  </View>
                  {idx < arr.length - 1 && <View style={styles.infoSeparator} />}
                </View>
              ))}
            </View>
          </View>

          {/* Footer */}
          <View style={{ alignItems: "center", paddingTop: fw(8), paddingBottom: fw(20) }}>
            <Text style={[styles.footerText, { fontSize: fw(12) }]}>
              Built with transparency in mind.
            </Text>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  backBtn: {
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Manrope_600SemiBold",
    color: "#1D1D1F",
    letterSpacing: -0.3,
  },

  // Hero
  heroSection: {
    alignItems: "center",
  },
  appIcon: {
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  heroTitle: {
    fontFamily: "Manrope_700Bold",
    color: "#1D1D1F",
    letterSpacing: -0.5,
  },
  heroVersion: {
    fontFamily: "Manrope_500Medium",
    color: "#86868B",
  },
  heroSubtitle: {
    fontFamily: "Manrope_400Regular",
    color: "#6E6E73",
    textAlign: "center",
    lineHeight: 22,
  },

  // Divider
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.1)",
  },

  // Section Label
  sectionLabel: {
    fontFamily: "Manrope_600SemiBold",
    color: "#86868B",
    letterSpacing: 1,
  },

  // Features
  featureGrid: {},
  featureCard: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  featureIconWrap: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  featureTitle: {
    fontFamily: "Manrope_600SemiBold",
    color: "#1D1D1F",
  },
  featureDesc: {
    fontFamily: "Manrope_400Regular",
    color: "#6E6E73",
  },

  // Steps
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepNumber: {
    backgroundColor: "#1D1D1F",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontFamily: "Manrope_700Bold",
    color: "#FFFFFF",
  },
  stepText: {
    fontFamily: "Manrope_400Regular",
    color: "#1D1D1F",
  },

  // Info Card
  infoCard: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontFamily: "Manrope_400Regular",
    color: "#86868B",
  },
  infoValue: {
    fontFamily: "Manrope_600SemiBold",
    color: "#1D1D1F",
  },
  infoSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  // Footer
  footerText: {
    fontFamily: "Manrope_400Regular",
    color: "#86868B",
  },
});
