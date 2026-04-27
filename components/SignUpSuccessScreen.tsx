import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Polyline } from "react-native-svg";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const IS_WEB = Platform.OS === "web";
const CANVAS_W = IS_WEB ? 375 : SCREEN_W;
const CANVAS_H = IS_WEB ? 812 : SCREEN_H;

const sw = (px: number) => px * (CANVAS_W / 375);
const sh = (px: number) => px * (CANVAS_H / 812);

// ─── Background Illustration ──────────────────────────────────────────────────
// Figma: left=88, top=164, 200×200 — DO NOT TOUCH

function Illustration() {
  return (
    <View style={illStyles.wrapper}>
      {/* Yellow circle: left=10, top=10, 180×180 */}
      <View style={illStyles.yellowCircle} />

      {/* Card 1: left=40, top=69, 121×51 */}
      <View style={illStyles.card1}>
        <View style={illStyles.avatar1} />
        <View style={illStyles.textLine1} />
      </View>

      {/* Card 2: left=61, top=127, 121×51 */}
      <View style={illStyles.card2}>
        <View style={illStyles.avatar2} />
        <View style={illStyles.textLine2} />
      </View>

      {/* Outer light green ring: left=64, top=20, 71×71 */}
      <View style={illStyles.checkOuterCircle} />

      {/* Inner green circle: left=72, top=28, 55×55 */}
      <View style={illStyles.checkInnerCircle}>
        <Svg width={sw(27)} height={sw(27)} viewBox="0 0 27 27" fill="none">
          <Polyline
            points="5,14 11,20 22,8"
            stroke="#FFFFFF"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </View>
    </View>
  );
}

const illStyles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: sw(88),
    top: sh(164),
    width: sw(200),
    height: sw(200),
  },
  yellowCircle: {
    position: "absolute",
    left: sw(10),
    top: sw(10),
    width: sw(180),
    height: sw(180),
    borderRadius: sw(90),
    backgroundColor: "#FEE19D",
  },
  card1: {
    position: "absolute",
    left: sw(40),
    top: sw(69),
    width: sw(121),
    height: sw(51),
    backgroundColor: "#FFFFFF",
    borderRadius: sw(8),
    shadowColor: "#666666",
    shadowOffset: { width: 0, height: sw(5) },
    shadowOpacity: 0.13,
    shadowRadius: sw(20),
    elevation: 4,
  },
  avatar1: {
    position: "absolute",
    left: sw(12),
    top: sw(12),
    width: sw(28),
    height: sw(28),
    borderRadius: sw(14),
    backgroundColor: "#EAECF0",
  },
  textLine1: {
    position: "absolute",
    left: sw(50),
    top: sw(22),
    width: sw(60),
    height: sw(8),
    borderRadius: sw(4),
    backgroundColor: "#EAECF0",
  },
  card2: {
    position: "absolute",
    left: sw(61),
    top: sw(127),
    width: sw(121),
    height: sw(51),
    backgroundColor: "#FFFFFF",
    borderRadius: sw(8),
    shadowColor: "#666666",
    shadowOffset: { width: 0, height: sw(5) },
    shadowOpacity: 0.13,
    shadowRadius: sw(20),
    elevation: 4,
  },
  avatar2: {
    position: "absolute",
    left: sw(12),
    top: sw(12),
    width: sw(28),
    height: sw(28),
    borderRadius: sw(14),
    backgroundColor: "#EAECF0",
  },
  textLine2: {
    position: "absolute",
    left: sw(50),
    top: sw(22),
    width: sw(60),
    height: sw(8),
    borderRadius: sw(4),
    backgroundColor: "#EAECF0",
  },
  checkOuterCircle: {
    position: "absolute",
    left: sw(64),
    top: sw(20),
    width: sw(71),
    height: sw(71),
    borderRadius: sw(35.5),
    backgroundColor: "#EFFAF3",
  },
  checkInnerCircle: {
    position: "absolute",
    left: sw(72),
    top: sw(28),
    width: sw(55),
    height: sw(55),
    borderRadius: sw(27.5),
    backgroundColor: "#47CB84",
    shadowColor: "#666666",
    shadowOffset: { width: 0, height: sw(5) },
    shadowOpacity: 0.2,
    shadowRadius: sw(20),
    elevation: 4,
    justifyContent: "center",
    alignItems: "center",
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface SignUpSuccessProps {
  onTakeMeHome?: () => void;
}

export default function SignUpSuccessScreen({ onTakeMeHome }: SignUpSuccessProps) {
  return (
    <View style={styles.shell}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <View style={styles.screen}>

        {/* ── Background gradient ── */}
        <LinearGradient
          colors={["#D6EEF8", "#EEF6FB", "#F5F9FC", "#FFFFFF"]}
          locations={[0, 0.35, 0.55, 1]}
          style={styles.bgGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* ── Background illustration — untouched ── */}
        <Illustration />

        {/* ── White card ── */}
        {/* Figma: top=480, width=375, height=332 */}
        <View style={styles.card}>

          {/* ── "Successfully Done" image — pixel perfect from Figma ── */}
          {/* Figma: width=227, height=227, left=74, top=423 (screen absolute) */}
          {/* Relative to card top=480: top = 423-480 = -57px */}
          {/* left=74 is screen absolute, same as card left=0, so left=74 inside card */}
          <Image
            source={require("../assets/images/success-done.png")}
            style={styles.successImage}
            resizeMode="contain"
          />

          {/* Title */}
          {/* Figma: top=591, left=24 → relative to card: top=591-480=111, left=24 */}
          <Text style={styles.title}>{"Account\nSuccesfully Created!"}</Text>

          {/* Button */}
          {/* Figma: top=708, left=24 → relative to card: top=708-480=228, left=24 */}
          <TouchableOpacity
            style={styles.button}
            onPress={onTakeMeHome}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonLabel}>Take Me to Home</Text>
          </TouchableOpacity>

        </View>

        {/* Home indicator pill */}
        {/* <View style={styles.homeBar}>
          <View style={styles.homePill} />
        </View> */}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#FEFEFE",
    alignItems: IS_WEB ? "center" : "stretch",
    justifyContent: IS_WEB ? "center" : "flex-start",
  },
  screen: {
    width: CANVAS_W,
    height: CANVAS_H,
    backgroundColor: "#FEFEFE",
    overflow: "hidden",
  },

  // ── Gradient background ───────────────────────────────────────────────────
  bgGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: sh(500),
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  // Figma: top=480, left=0, width=375, height=332
  card: {
    position: "absolute",
    top: sh(480),
    left: 0,
    width: sw(375),
    height: sh(332),
    backgroundColor: "#FFFFFF",
    borderRadius: sw(28),
    shadowColor: "#556880",
    shadowOffset: { width: 0, height: sh(-8) },
    shadowOpacity: 0.12,
    shadowRadius: sw(80),
    elevation: 10,
  },

  // ── Successfully Done image ───────────────────────────────────────────────
  // Figma (screen absolute): left=74, top=423, width=227, height=227
  // Inside card (card top=480): top = 423-480 = -57, left = 74
  successImage: {
    position: "absolute",
    left: sw(74),
    top: sh(-57),
    width: sw(227),
    height: sh(227),
  },

  // ── Title ─────────────────────────────────────────────────────────────────
  // Figma: top=591, left=24, width=327
  // Inside card: top = 591-480 = 111
  title: {
    position: "absolute",
    top: sh(111),
    left: sw(24),
    width: sw(327),
    fontFamily: "Manrope_700Bold",
    fontSize: 28,
    lineHeight: 38,
    textAlign: "center",
    letterSpacing: -0.28,
    color: "#222222",
  },

  // ── Button ────────────────────────────────────────────────────────────────
  // Figma: top=708, left=24, width=327, height=50
  // Inside card: top = 708-480 = 228
  button: {
    position: "absolute",
    top: sh(225),
    left: sw(24),
    width: sw(327),
    height: sh(50),
    backgroundColor: "#FF385C",
    borderRadius: sw(30),
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8D9BAA",
    shadowOffset: { width: 0, height: sh(6) },
    shadowOpacity: 0.08,
    shadowRadius: sw(20),
    elevation: 4,
  },
  buttonLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 16,
    lineHeight: 26,
    textAlign: "center",
    letterSpacing: -0.16,
    color: "#FFFFFF",
  },

  // ── Home indicator ────────────────────────────────────────────────────────
  homeBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: sh(34),
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: sh(9),
  },
//   homePill: {
//     width: sw(134),
//     height: 5,
//     backgroundColor: "#000000",
//     borderRadius: 100,
//   },
});