import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import AuthScreen from "../components/AuthScreen";
import { loginUser, registerUser } from "../utils/api";
import { saveToken, saveUser } from "../utils/authStorage";

export default function Auth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (data: { firstName: string; lastName: string; email: string; password: string }) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await registerUser(
        `${data.firstName} ${data.lastName}`.trim(),
        data.email,
        data.password
      );
      await saveToken(result.token);
      await saveUser(result.user);
      router.replace("/home");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (data: { email: string; password: string }) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await loginUser(data.email, data.password);
      await saveToken(result.token);
      await saveUser(result.user);
      router.replace("/home");
    } catch (err: any) {
      setError("Invalid user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      onSignUp={handleSignUp}
      onLogin={handleLogin}
      onGoogleAuth={() => Alert.alert("Coming Soon", "Google authentication will be available soon.")}
      loading={loading}
      error={error}
    />
  );
}
