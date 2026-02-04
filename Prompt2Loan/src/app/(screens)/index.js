// Basic Imports
import { useRouter } from "expo-router"; // Use router
import { useEffect } from "react";
import { Image, View } from "react-native";
import logo from "../../assets/logo.png";
import GlobalStyles from "../../core/styles";
import { useWallet } from "../../providers/walletProvider";

export default function SplashLoading() {
  const { status } = useWallet();
  const router = useRouter();

  useEffect(() => {
    console.log("Current Status:", status);
    if (status === "loading") return;
    if (status === "connected") {
      router.replace("/(screens)/main");
    } else if (status === "disconnected") {
      router.replace("/(screens)/connect");
    }
  }, [status]);

  return (
    <View style={GlobalStyles.container}>
      <Image
        resizeMode="contain"
        source={logo}
        alt="Main Logo"
        style={{
          width: "70%",
        }}
      />
    </View>
  );
}
