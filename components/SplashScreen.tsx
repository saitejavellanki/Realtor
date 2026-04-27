import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Dimensions,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Replace with your local asset:
// const HERO_IMAGE = require("../assets/farm_aerial.jpg");
const HERO_IMAGE = require("../assets/images/hero-photo.jpg");

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const IS_WEB = Platform.OS === "web";
const CANVAS_W = IS_WEB ? 375 : SCREEN_W;
const CANVAS_H = IS_WEB ? 812 : SCREEN_H;

const vw = (p: number) => (CANVAS_W * p) / 100;
const vh = (p: number) => (CANVAS_H * p) / 100;

interface Props {
  onGetStarted?: () => void;
}

export default function SplashScreen({ onGetStarted }: Props) {
  return (
    <View style={styles.shell}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View style={styles.screen}>

        {/* Hero photo — 375×432, rounded bottom-left 187.5px */}
        <View style={styles.photoBackground}>
          <ImageBackground
            source={HERO_IMAGE}
            style={styles.photo}
            imageStyle={styles.photoImageStyle}
            resizeMode="cover"
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.headline}>Find The Place Of Your Dream</Text>
          <Text style={styles.subtitle}>
            Enjoy the convenience of purchasing with our application.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={onGetStarted}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#FF385C", "#FF385C", "#E11D48"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Get Started</Text>
              {/* Arrow icon */}
              <View style={styles.arrowCircle}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Home indicator space */}
        <View style={styles.homeIndicatorSpace} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: IS_WEB ? "center" : "stretch",
    justifyContent: IS_WEB ? "center" : "flex-start",
  },
  screen: {
    width: CANVAS_W,
    height: CANVAS_H,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  photoBackground: {
    position: "absolute",
    left: 0,
    top: 0,
    width: vw(100),
    height: vh(53.2),             // 432 / 812
    overflow: "hidden",
    borderBottomLeftRadius: vw(50), // 187.5 / 375
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoImageStyle: {
    borderBottomLeftRadius: vw(50),
  },
  content: {
    position: "absolute",
    width: vw(87.2),              // 327 / 375
    top: vh(60.6),                // 492 / 812
    left: vw(6.4),                // (375 - 327) / 2 / 375
    bottom: vh(4.9),
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: vh(3.7),                 // 30 / 812
  },
  headline: {
    width: vw(87.2),
    fontFamily: "Manrope_700Bold",
    fontSize: 32,
    lineHeight: 40,
    textAlign: "center",
    color: "#323232",
  },
  subtitle: {
    width: vw(77.6),              // 291 / 375
    fontFamily: "Manrope_400Regular",
    fontSize: 18,
    lineHeight: 30,
    textAlign: "center",
    color: "#9A9A9A",
  },
  button: {
    width: vw(87.2),
    height: vh(7.8),
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 14,
  },
  buttonText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 19,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  arrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 22,
  },
  homeIndicatorSpace: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: vw(100),
    height: vh(4.9),              // 40 / 812
    backgroundColor: "#FFFFFF",
  },
});