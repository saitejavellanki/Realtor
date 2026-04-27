import SignUpSuccessScreen from "../components/SignUpSuccessScreen";
import { useRouter } from "expo-router";

export default function Success() {
  const router = useRouter();
  return <SignUpSuccessScreen onTakeMeHome={() => router.push("/home")} />;
}