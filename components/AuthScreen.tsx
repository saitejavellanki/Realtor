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
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" fill="#4285F4" />
    <Path d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z" fill="#34A853" />
    <Path d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z" fill="#FBBC05" />
    <Path d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" fill="#EB4335" />
  </Svg>
);
const AppleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="#222">
    <Path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.36.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.55-1.32 3.07-2.53 4zm-3.99-17.8c-.06 2.3 1.67 4.08 3.9 4.08.16-2.28-1.65-4.14-3.9-4.08z" />
  </Svg>
);

// ─── Input ───────────────────────────────────────────────────────────────────

function Input({
  icon, placeholder, value, onChangeText, secure, keyboard, returnKey, onNext, inputRef,
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
}) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);

  return (
    <View style={[inp.box, focused && inp.boxFocused]}>
      <View style={inp.icon}>{icon}</View>
      <TextInput
        ref={inputRef as any}
        style={inp.input}
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
    height: 52, flexDirection: "row", alignItems: "center",
    backgroundColor: "#F7F7F7", borderRadius: 14,
    borderWidth: 1.5, borderColor: "#EBEBEB", marginBottom: 12,
  },
  boxFocused: {
    borderColor: ACCENT, backgroundColor: "#FFF8F9",
  },
  icon: { marginLeft: 14, marginRight: 10 },
  input: {
    flex: 1, fontSize: 15, color: "#222", fontFamily: "Manrope_400Regular",
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
  },
  eye: { padding: 12 },
});

// ─── Auth Screen ─────────────────────────────────────────────────────────────

interface AuthScreenProps {
  onSignUp?: (data: { firstName: string; lastName: string; email: string; password: string }) => void;
  onLogin?: (data: { email: string; password: string }) => void;
  onGoogleAuth?: () => void;
  loading?: boolean;
  error?: string | null;
}

export default function AuthScreen({ onSignUp, onLogin, onGoogleAuth, loading = false, error = null }: AuthScreenProps) {
  const { height } = useWindowDimensions();
  const isSmall = height < 700; // iPhone SE / compact screens
  const [isSignUp, setIsSignUp] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const loginPassRef = useRef<TextInput>(null);

  const canSubmit = isSignUp
    ? firstName && lastName && email && password && agree && !loading
    : loginEmail && loginPassword && !loading;

  const submit = () => {
    Keyboard.dismiss();
    if (!canSubmit) return;
    if (isSignUp) onSignUp?.({ firstName, lastName, email, password });
    else onLogin?.({ email: loginEmail, password: loginPassword });
  };

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[s.header, isSmall && { paddingTop: 32, paddingBottom: 16 }]}>
            <View style={s.logoRow}>
              <View style={s.logoBox}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path d="M3 12L12 3L21 12V20C21 20.55 20.55 21 20 21H15V16H9V21H4C3.45 21 3 20.55 3 20V12Z" fill="#fff" stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" />
                </Svg>
              </View>
              <Text style={s.logoText}>Realtor</Text>
            </View>
            <Text style={s.title}>{isSignUp ? "Create Account" : "Welcome Back"}</Text>
            <Text style={s.subtitle}>
              {isSignUp
                ? "Sign up to discover verified properties"
                : "Sign in to continue your journey"}
            </Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            {/* Tab switcher */}
            <View style={s.tabs}>
              <Pressable style={[s.tab, isSignUp && s.tabActive]} onPress={() => setIsSignUp(true)}>
                <Text style={[s.tabText, isSignUp && s.tabTextActive]}>Sign Up</Text>
              </Pressable>
              <Pressable style={[s.tab, !isSignUp && s.tabActive]} onPress={() => setIsSignUp(false)}>
                <Text style={[s.tabText, !isSignUp && s.tabTextActive]}>Log In</Text>
              </Pressable>
            </View>

            {isSignUp ? (
              /* ── Sign Up ── */
              <View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      icon={<PersonIcon color={firstName ? ACCENT : "#B0B0B0"} />}
                      placeholder="First Name"
                      value={firstName}
                      onChangeText={setFirstName}
                      returnKey="next"
                      onNext={() => lastNameRef.current?.focus()}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      icon={<PersonIcon color={lastName ? ACCENT : "#B0B0B0"} />}
                      placeholder="Last Name"
                      value={lastName}
                      onChangeText={setLastName}
                      inputRef={lastNameRef}
                      returnKey="next"
                      onNext={() => emailRef.current?.focus()}
                    />
                  </View>
                </View>

                <Input
                  icon={<EmailIcon color={email ? ACCENT : "#B0B0B0"} />}
                  placeholder="Email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboard="email-address"
                  inputRef={emailRef}
                  returnKey="next"
                  onNext={() => passRef.current?.focus()}
                />

                <Input
                  icon={<LockIcon color={password ? ACCENT : "#B0B0B0"} />}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secure
                  inputRef={passRef}
                  returnKey="go"
                  onNext={submit}
                />

                {/* Terms */}
                <Pressable style={s.checkRow} onPress={() => setAgree(!agree)}>
                  <View style={[s.checkBox, agree && s.checkBoxActive]}>
                    {agree && (
                      <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                        <Path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    )}
                  </View>
                  <Text style={s.checkText}>
                    I agree to the <Text style={s.link}>Terms</Text> & <Text style={s.link}>Privacy Policy</Text>
                  </Text>
                </Pressable>

                {!!error && <Text style={s.error}>{error}</Text>}

                <TouchableOpacity
                  style={[s.btn, !canSubmit && { opacity: 0.45 }]}
                  onPress={submit}
                  disabled={!canSubmit}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={[ACCENT, ACCENT_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnGrad}>
                    <Text style={s.btnText}>{loading ? "Please wait…" : "Create Account"}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={s.divRow}>
                  <View style={s.divLine} />
                  <Text style={s.divText}>or</Text>
                  <View style={s.divLine} />
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity style={s.social} onPress={onGoogleAuth} activeOpacity={0.8}>
                    <GoogleIcon /><Text style={s.socialText}>Google</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.social} activeOpacity={0.8}>
                    <Text style={s.socialText}>Apple</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* ── Log In ── */
              <View>
                <Input
                  icon={<EmailIcon color={loginEmail ? ACCENT : "#B0B0B0"} />}
                  placeholder="Email address"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  keyboard="email-address"
                  returnKey="next"
                  onNext={() => loginPassRef.current?.focus()}
                />

                <Input
                  icon={<LockIcon color={loginPassword ? ACCENT : "#B0B0B0"} />}
                  placeholder="Password"
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  secure
                  inputRef={loginPassRef}
                  returnKey="go"
                  onNext={submit}
                />

                <TouchableOpacity style={{ alignSelf: "flex-end", marginBottom: 16 }} activeOpacity={0.7}>
                  <Text style={s.link}>Forgot Password?</Text>
                </TouchableOpacity>

                {!!error && <Text style={s.error}>{error}</Text>}

                <TouchableOpacity
                  style={[s.btn, !canSubmit && { opacity: 0.45 }]}
                  onPress={submit}
                  disabled={!canSubmit}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={[ACCENT, ACCENT_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnGrad}>
                    <Text style={s.btnText}>{loading ? "Please wait…" : "Sign In"}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={s.divRow}>
                  <View style={s.divLine} />
                  <Text style={s.divText}>or</Text>
                  <View style={s.divLine} />
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity style={s.social} onPress={onGoogleAuth} activeOpacity={0.8}>
                    <GoogleIcon /><Text style={s.socialText}>Google</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.social} activeOpacity={0.8}>
                    <Text style={s.socialText}>Apple</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Bottom toggle */}
          <View style={s.bottom}>
            <Text style={s.bottomText}>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
            </Text>
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); setIsSignUp(!isSignUp); }} activeOpacity={0.7}>
              <Text style={s.link}>{isSignUp ? "Sign In" : "Sign Up"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF" },
  scroll: { paddingBottom: 32 },

  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 44,
    paddingHorizontal: 24, paddingBottom: 20,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 },
  logoBox: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: ACCENT,
    alignItems: "center", justifyContent: "center",
  },
  logoText: { fontSize: 19, fontFamily: "Manrope_700Bold", color: "#222", letterSpacing: -0.3 },
  title: { fontSize: 28, fontFamily: "Manrope_700Bold", color: "#222", marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: "Manrope_400Regular", color: "#888", lineHeight: 20 },

  card: {
    marginHorizontal: 16, backgroundColor: "#FFF", borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: "#EBEBEB",
  },

  tabs: {
    flexDirection: "row", backgroundColor: "#F3F3F3", borderRadius: 12,
    padding: 3, marginBottom: 20,
  },
  tab: {
    flex: 1, height: 42, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  tabActive: { backgroundColor: "#FFF", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  tabText: { fontSize: 14, fontFamily: "Manrope_500Medium", color: "#999" },
  tabTextActive: { fontFamily: "Manrope_700Bold", color: "#222" },

  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  checkBox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "#DDD",
    backgroundColor: "#F7F7F7", alignItems: "center", justifyContent: "center",
  },
  checkBoxActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  checkText: { flex: 1, fontSize: 13, fontFamily: "Manrope_400Regular", color: "#888" },
  link: { color: ACCENT, fontFamily: "Manrope_600SemiBold", fontSize: 13 },

  error: {
    color: "#EF4444", fontSize: 13, fontFamily: "Manrope_600SemiBold",
    textAlign: "center", marginBottom: 12,
  },

  btn: { height: 52, borderRadius: 14, overflow: "hidden", marginBottom: 4 },
  btnGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 16, fontFamily: "Manrope_700Bold", color: "#FFF" },

  divRow: { flexDirection: "row", alignItems: "center", marginVertical: 16, gap: 10 },
  divLine: { flex: 1, height: 1, backgroundColor: "#EBEBEB" },
  divText: { fontSize: 12, fontFamily: "Manrope_400Regular", color: "#BBB" },

  social: {
    flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: "#EBEBEB",
    backgroundColor: "#FFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  socialText: { fontSize: 14, fontFamily: "Manrope_600SemiBold", color: "#222" },

  bottom: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    marginTop: 16, paddingBottom: 8,
  },
  bottomText: { fontSize: 13.5, fontFamily: "Manrope_400Regular", color: "#888" },
});
