// Basic Imports
import { useRouter } from "expo-router"; // Switched to useRouter
import { useEffect } from "react";
import { Image, Text, View } from "react-native";
import logo from "../../assets/logo.png";
import ConnectWallet from "../../components/walletButton";
import GlobalStyles, { mainColor } from "../../core/styles";
import { useWallet } from "../../providers/walletProvider";

export default function Connect() {
  const { status } = useWallet();
  const router = useRouter(); // Using the router object

  useEffect(() => {
    if (status === "connected") {
      router.replace("/(screens)/main");
    }
  }, [status]); // Removed router/navigation from dependencies to stop the loop

  return (
    <View style={GlobalStyles.container}>
      <View
        style={{
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          resizeMode="contain"
          source={logo}
          alt="Main Logo"
          style={{
            width: "50%",
            height: "35%",
          }}
        />
        <View style={{ height: "25%" }}>
          <Text
            style={{
              flex: 1,
              color: mainColor,
              fontFamily: "Bungee_400Regular",
              fontSize: 24,
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            Prompt2Loan
          </Text>
        </View>
        <View style={{ height: "25%", width: "75%" }}>
          <Text
            style={{
              flex: 1,
              color: mainColor,
              fontFamily: "Bungee_400Regular",
              fontSize: 18,
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            Borrow. Bet. Build. Let your agent lead.
          </Text>
        </View>
        <ConnectWallet />
      </View>
    </View>
  );
}