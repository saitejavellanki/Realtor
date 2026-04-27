import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { getToken } from "../utils/authStorage";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    getToken().then(token => {
      if (token) {
        router.replace("/home");
      } else {
        router.replace("/auth");
      }
    });
  }, []);

  // Blank white screen while SecureStore check runs (instant on device)
  return <View style={{ flex: 1, backgroundColor: "#ffffff" }} />;
}
