import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

const ACCENT = "#FF385C";
const ACCENT_DARK = "#E11D48";

// ─── Icons ───────────────────────────────────────────────────────────────────

const PersonIcon = ({ color = "#B0B0B0" }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.8} />
    <Path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);
const EmailIcon = ({ color = "#B0B0B0" }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={5} width={18} height={14} rx={3} stroke={color} strokeWidth={1.8} />
    <Path d="M3 9l9 6 9-6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const LockIcon = ({ color = "#B0B0B0" }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x={5} y={11} width={14} height={10} rx={3} stroke={color} strokeWidth={1.8} />
    <Path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Circle cx={12} cy={16} r={1.5} fill={color} />
  </Svg>
);
const EyeIcon = ({ color = "#B0B0B0" }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={1.8} />
    <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
  </Svg>
);
const EyeOffIcon = ({ color = "#B0B0B0" }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M1 1l22 22" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);
const GoogleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" fill="#4285F4" />
    <Path d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z" fill="#34A853" />
    <Path d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z" fill="#FBBC05" />
    <Path d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" fill="#EB4335" />
  </Svg>
);

// ─── Responsive Input ─────────────────────────────────────────────────────────

function Input({
  icon, placeholder, value, onChangeText, secure, keyboard, returnKey, onNext, inputRef, rs,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secure?: boolean;
  keyboard?: "default" | "email-address";
  returnKey?: "next" | "done" | "go";
  onNext?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  rs: ResponsiveSizes;
}) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);

  return (
    <View style={[
      inp.box,
      { height: rs.inputH, marginBottom: rs.inputGap, borderRadius: rs.inputRadius },
      focused && inp.boxFocused,
    ]}>
      <View style={inp.icon}>{icon}</View>
      <TextInput
        ref={inputRef as any}
        style={[inp.input, { fontSize: rs.inputFont, paddingVertical: Platform.OS === "ios" ? rs.inputPadV : rs.inputPadV - 4 }]}
        placeholder={placeholder}
        placeholderTextColor="#B0B0B0"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure && !show}
        keyboardType={keyboard || "default"}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType={returnKey || "done"}
        onSubmitEditing={onNext}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {secure && (
        <Pressable onPress={() => setShow(!show)} style={inp.eye} hitSlop={10}>
          {show ? <EyeOffIcon color={focused ? ACCENT : "#B0B0B0"} /> : <EyeIcon color={focused ? ACCENT : "#B0B0B0"} />}
        </Pressable>
      )}
    </View>
  );
}

const inp = StyleSheet.create({
  box: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F7F7F7",
    borderWidth: 1.5, borderColor: "#EBEBEB",
  },
  boxFocused: { borderColor: ACCENT, backgroundColor: "#FFF8F9" },
  icon: { marginLeft: 14, marginRight: 10 },
  input: { flex: 1, color: "#222", fontFamily: "Manrope_400Regular" },
  eye: { padding: 12 },
});

// ─── Responsive sizes type ────────────────────────────────────────────────────

type ResponsiveSizes = {
  headerPT: number; headerPB: number;
  logoSize: number; logoRadius: number;
  logoTextSize: number; titleSize: number; subtitleSize: number;
  logoGap: number;
  cardPad: number; cardRadius: number;
  tabH: number; tabRadius: number; tabGap: number; tabFontSize: number;
  inputH: number; inputGap: number; inputFont: number; inputRadius: number; inputPadV: number;
  btnH: number; btnRadius: number; btnFont: number;
  divV: number;
  socialH: number; socialRadius: number; socialFont: number;
  checkSize: number; checkFont: number;
  bottomMT: number;
};

// Clamp: scale value from base 812px height, min/max guard
function makeRS(h: number, w: number): ResponsiveSizes {
  const s = (base: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Math.round((h / 812) * base)));
  const ios = Platform.OS === "ios";
  return {
    headerPT:      s(ios ? 60 : 44, ios ? 24 : 20, ios ? 72 : 56),
    headerPB:      s(20, 10, 28),
    logoSize:      s(38, 30, 46),
    logoRadius:    s(11, 8, 14),
    logoTextSize:  s(19, 15, 22),
    titleSize:     s(28, 20, 32),
    subtitleSize:  s(14, 12, 15),
    logoGap:       s(20, 10, 28),
    cardPad:       s(20, 14, 24),
    cardRadius:    s(20, 16, 24),
    tabH:          s(42, 34, 46),
    tabRadius:     s(10, 8, 12),
    tabGap:        s(18, 10, 22),
    tabFontSize:   s(14, 12, 15),
    inputH:        s(52, 44, 56),
    inputGap:      s(12, 8, 14),
    inputFont:     s(15, 13, 16),
    inputRadius:   s(14, 10, 16),
    inputPadV:     s(14, 10, 16),
    btnH:          s(52, 46, 56),
    btnRadius:     s(14, 12, 16),
    btnFont:       s(16, 14, 17),
    divV:          s(16, 8, 20),
    socialH:       s(48, 40, 52),
    socialRadius:  s(12, 10, 14),
    socialFont:    s(14, 12, 15),
    checkSize:     s(22, 18, 24),
    checkFont:     s(13, 11, 14),
    bottomMT:      s(16, 10, 24),
  };
}

// ─── Auth Screen ─────────────────────────────────────────────────────────────

interface AuthScreenProps {
  onSignUp?: (data: { firstName: string; lastName: string; email: string; password: string }) => void;
  onLogin?: (data: { email: string; password: string }) => void;
  onGoogleAuth?: () => void;
  loading?: boolean;
  error?: string | null;
}

export default function AuthScreen({ onSignUp, onLogin, onGoogleAuth, loading = false, error = null }: AuthScreenProps) {
  const { height, width } = useWindowDimensions();
  const rs = makeRS(height, width);
  const isTablet = width >= 600;

  const [isSignUp, setIsSignUp] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const lastNameRef = useRef<TextInput>(null);
  const emailRef    = useRef<TextInput>(null);
  const passRef     = useRef<TextInput>(null);
  const loginPassRef = useRef<TextInput>(null);

  const canSubmit = isSignUp
    ? !!(firstName && lastName && email && password && agree && !loading)
    : !!(loginEmail && loginPassword && !loading);

  const submit = () => {
    Keyboard.dismiss();
    if (!canSubmit) return;
    if (isSignUp) onSignUp?.({ firstName, lastName, email, password });
    else onLogin?.({ email: loginEmail, password: loginPassword });
  };

  // Shared input props
  const ip = { rs };

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Header ── */}
          <View style={{
            paddingTop: rs.headerPT,
            paddingBottom: rs.headerPB,
            paddingHorizontal: isTablet ? 32 : 24,
            alignSelf: isTablet ? "center" : undefined,
            width: isTablet ? Math.min(width, 500) : undefined,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: rs.logoGap }}>
              <View style={{
                width: rs.logoSize, height: rs.logoSize,
                borderRadius: rs.logoRadius,
                backgroundColor: ACCENT,
                alignItems: "center", justifyContent: "center",
              }}>
                <Svg width={rs.logoSize * 0.52} height={rs.logoSize * 0.52} viewBox="0 0 24 24" fill="none">
                  <Path d="M3 12L12 3L21 12V20C21 20.55 20.55 21 20 21H15V16H9V21H4C3.45 21 3 20.55 3 20V12Z"
                    fill="#fff" stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" />
                </Svg>
              </View>
              <Text style={{ fontSize: rs.logoTextSize, fontFamily: "Manrope_700Bold", color: "#222", letterSpacing: -0.3 }}>
                Realtor
              </Text>
            </View>
            <Text style={{ fontSize: rs.titleSize, fontFamily: "Manrope_700Bold", color: "#222", marginBottom: 6, letterSpacing: -0.5 }}>
              {isSignUp ? "Create Account" : "Welcome Back"}
            </Text>
            <Text style={{ fontSize: rs.subtitleSize, fontFamily: "Manrope_400Regular", color: "#888", lineHeight: rs.subtitleSize * 1.5 }}>
              {isSignUp ? "Sign up to discover verified properties" : "Sign in to continue your journey"}
            </Text>
          </View>

          {/* ── Card ── */}
          <View style={{
            marginHorizontal: isTablet ? "auto" : 16,
            width: isTablet ? Math.min(width - 64, 460) : undefined,
            alignSelf: isTablet ? "center" : undefined,
            backgroundColor: "#FFF",
            borderRadius: rs.cardRadius,
            padding: rs.cardPad,
            borderWidth: 1, borderColor: "#EBEBEB",
          }}>
            {/* Tab switcher */}
            <View style={{
              flexDirection: "row", backgroundColor: "#F3F3F3",
              borderRadius: rs.tabRadius + 2, padding: 3, marginBottom: rs.tabGap,
            }}>
              {[
                { label: "Sign Up", active: isSignUp, onPress: () => setIsSignUp(true) },
                { label: "Log In", active: !isSignUp, onPress: () => setIsSignUp(false) },
              ].map(({ label, active, onPress }) => (
                <Pressable key={label} onPress={onPress} style={[
                  { flex: 1, height: rs.tabH, borderRadius: rs.tabRadius, alignItems: "center", justifyContent: "center" },
                  active && { backgroundColor: "#FFF", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
                ]}>
                  <Text style={{
                    fontSize: rs.tabFontSize,
                    fontFamily: active ? "Manrope_700Bold" : "Manrope_500Medium",
                    color: active ? "#222" : "#999",
                  }}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {isSignUp ? (
              /* ── Sign Up form ── */
              <View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Input {...ip} icon={<PersonIcon color={firstName ? ACCENT : "#B0B0B0"} />}
                      placeholder="First Name" value={firstName} onChangeText={setFirstName}
                      returnKey="next" onNext={() => lastNameRef.current?.focus()} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input {...ip} icon={<PersonIcon color={lastName ? ACCENT : "#B0B0B0"} />}
                      placeholder="Last Name" value={lastName} onChangeText={setLastName}
                      inputRef={lastNameRef} returnKey="next" onNext={() => emailRef.current?.focus()} />
                  </View>
                </View>

                <Input {...ip} icon={<EmailIcon color={email ? ACCENT : "#B0B0B0"} />}
                  placeholder="Email address" value={email} onChangeText={setEmail}
                  keyboard="email-address" inputRef={emailRef} returnKey="next" onNext={() => passRef.current?.focus()} />

                <Input {...ip} icon={<LockIcon color={password ? ACCENT : "#B0B0B0"} />}
                  placeholder="Password" value={password} onChangeText={setPassword}
                  secure inputRef={passRef} returnKey="go" onNext={submit} />

                {/* Terms checkbox */}
                <Pressable
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: rs.inputGap }}
                  onPress={() => setAgree(!agree)}
                >
                  <View style={{
                    width: rs.checkSize, height: rs.checkSize, borderRadius: 6,
                    borderWidth: 1.5, borderColor: agree ? ACCENT : "#DDD",
                    backgroundColor: agree ? ACCENT : "#F7F7F7",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    {agree && (
                      <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                        <Path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    )}
                  </View>
                  <Text style={{ flex: 1, fontSize: rs.checkFont, fontFamily: "Manrope_400Regular", color: "#888" }}>
                    I agree to the <Text style={{ color: ACCENT, fontFamily: "Manrope_600SemiBold" }}>Terms</Text>
                    {" & "}
                    <Text style={{ color: ACCENT, fontFamily: "Manrope_600SemiBold" }}>Privacy Policy</Text>
                  </Text>
                </Pressable>

                {!!error && <Text style={{ color: "#EF4444", fontSize: rs.checkFont, fontFamily: "Manrope_600SemiBold", textAlign: "center", marginBottom: rs.inputGap }}>{error}</Text>}

                <TouchableOpacity
                  style={{ height: rs.btnH, borderRadius: rs.btnRadius, overflow: "hidden", opacity: canSubmit ? 1 : 0.45 }}
                  onPress={submit} disabled={!canSubmit} activeOpacity={0.85}
                >
                  <LinearGradient colors={[ACCENT, ACCENT_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: rs.btnFont, fontFamily: "Manrope_700Bold", color: "#FFF" }}>
                      {loading ? "Please wait…" : "Create Account"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <Divider rs={rs} />
                <SocialRow rs={rs} onGoogleAuth={onGoogleAuth} />
              </View>
            ) : (
              /* ── Log In form ── */
              <View>
                <Input {...ip} icon={<EmailIcon color={loginEmail ? ACCENT : "#B0B0B0"} />}
                  placeholder="Email address" value={loginEmail} onChangeText={setLoginEmail}
                  keyboard="email-address" returnKey="next" onNext={() => loginPassRef.current?.focus()} />

                <Input {...ip} icon={<LockIcon color={loginPassword ? ACCENT : "#B0B0B0"} />}
                  placeholder="Password" value={loginPassword} onChangeText={setLoginPassword}
                  secure inputRef={loginPassRef} returnKey="go" onNext={submit} />

                <TouchableOpacity style={{ alignSelf: "flex-end", marginBottom: rs.inputGap }} activeOpacity={0.7}>
                  <Text style={{ color: ACCENT, fontFamily: "Manrope_600SemiBold", fontSize: rs.checkFont }}>Forgot Password?</Text>
                </TouchableOpacity>

                {!!error && <Text style={{ color: "#EF4444", fontSize: rs.checkFont, fontFamily: "Manrope_600SemiBold", textAlign: "center", marginBottom: rs.inputGap }}>{error}</Text>}

                <TouchableOpacity
                  style={{ height: rs.btnH, borderRadius: rs.btnRadius, overflow: "hidden", opacity: canSubmit ? 1 : 0.45 }}
                  onPress={submit} disabled={!canSubmit} activeOpacity={0.85}
                >
                  <LinearGradient colors={[ACCENT, ACCENT_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: rs.btnFont, fontFamily: "Manrope_700Bold", color: "#FFF" }}>
                      {loading ? "Please wait…" : "Sign In"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <Divider rs={rs} />
                <SocialRow rs={rs} onGoogleAuth={onGoogleAuth} />
              </View>
            )}
          </View>

          {/* ── Bottom toggle ── */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: rs.bottomMT, paddingBottom: 8 }}>
            <Text style={{ fontSize: rs.checkFont + 0.5, fontFamily: "Manrope_400Regular", color: "#888" }}>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
            </Text>
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); setIsSignUp(!isSignUp); }} activeOpacity={0.7}>
              <Text style={{ color: ACCENT, fontFamily: "Manrope_600SemiBold", fontSize: rs.checkFont + 0.5 }}>
                {isSignUp ? "Sign In" : "Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Divider({ rs }: { rs: ResponsiveSizes }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginVertical: rs.divV, gap: 10 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: "#EBEBEB" }} />
      <Text style={{ fontSize: 12, fontFamily: "Manrope_400Regular", color: "#BBB" }}>or</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: "#EBEBEB" }} />
    </View>
  );
}

function SocialRow({ rs, onGoogleAuth }: { rs: ResponsiveSizes; onGoogleAuth?: () => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <TouchableOpacity
        style={{ flex: 1, height: rs.socialH, borderRadius: rs.socialRadius, borderWidth: 1.5, borderColor: "#EBEBEB", backgroundColor: "#FFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
        onPress={onGoogleAuth} activeOpacity={0.8}
      >
        <GoogleIcon />
        <Text style={{ fontSize: rs.socialFont, fontFamily: "Manrope_600SemiBold", color: "#222" }}>Google</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ flex: 1, height: rs.socialH, borderRadius: rs.socialRadius, borderWidth: 1.5, borderColor: "#EBEBEB", backgroundColor: "#FFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: rs.socialFont, fontFamily: "Manrope_600SemiBold", color: "#222" }}>Apple</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF" },
});
