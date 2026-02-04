import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router"; // Use useRouter for stability
import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Logo from "../../assets/logo.png";
import ConnectWallet from "../../components/walletButtonHeader";
import GlobalStyles, { footer, iconSize, mainColor } from "../../core/styles";
import { useWallet } from "../../providers/walletProvider";
import Tab1 from "./tabs/tab1";
import Tab2 from "./tabs/tab2";
import Tab3 from "./tabs/tab3";
import Tab4 from "./tabs/tab4";
import LiFiWhite from "../../assets/lifi-white.png";
import LiFiGreen from "../../assets/lifi-green.png";


const BaseStateMain = {
  tab: 0,
};

export default function Main() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(BaseStateMain.tab);
  const { status } = useWallet();
  const router = useRouter(); // Using router instead of navigation

  useEffect(() => {
    if (status === "disconnected") {
      router.replace("/(screens)/connect");
    }
  }, [status]); // Only depend on status

  const handleTabPress = (tabIndex) => {
    setTab(tabIndex);
  };

  return (
    <SafeAreaView style={[GlobalStyles.container]}>
      <View style={[GlobalStyles.header, { paddingHorizontal: 10 }]}>
        <View style={[GlobalStyles.headerItem, { alignItems: "center", width: "40%" }]}>
          <Text
            style={{
              color: mainColor,
              fontFamily: "Bungee_400Regular",
              fontSize: 16,
              fontWeight: "bold",
            }}
          >
            Prompt2Loan
          </Text>
        </View>
        <View style={[GlobalStyles.headerItem, { alignItems: "center", width: "10%" }]}>
          <Image
            source={Logo}
            alt="Logo"
            style={{
              maxHeight: "50%",
              width: "auto",
              resizeMode: "contain",
              aspectRatio: 1,
            }}
          />
        </View>
        <View style={[GlobalStyles.headerItem, { alignItems: "flex-end", width: "40%" }]}>
          <ConnectWallet />
        </View>
      </View>

      <View style={[GlobalStyles.main]}>
        {tab === 0 && <Tab1 />}
        {tab === 1 && <Tab2 />}
        {tab === 2 && <Tab3 />}
        {tab === 3 && <Tab4 />}
      </View>

      <View style={[GlobalStyles.footer, { height: footer - insets.bottom }]}>
        <Pressable
          style={GlobalStyles.selector}
          onPress={() => handleTabPress(0)}
        >
          <MaterialIcons
            name="account-balance-wallet"
            size={iconSize}
            color={tab === 0 ? mainColor : "white"}
          />
          <Text
            style={
              tab === 0
                ? GlobalStyles.selectorSelectedText
                : GlobalStyles.selectorText
            }
          >
            Assets
          </Text>
        </Pressable>

        <Pressable
          style={GlobalStyles.selector}
          onPress={() => handleTabPress(1)}
        >
          <MaterialIcons
            name="chat"
            size={iconSize}
            color={tab === 1 ? mainColor : "white"}
          />
          <Text
            style={
              tab === 1
                ? GlobalStyles.selectorSelectedText
                : GlobalStyles.selectorText
            }
          >
            Agent
          </Text>
        </Pressable>

        <Pressable
          style={GlobalStyles.selector}
          onPress={() => handleTabPress(2)}
        >
          <FontAwesome5
            name="hand-holding-usd"
            size={iconSize}
            color={tab === 2 ? mainColor : "white"}
          />
          <Text
            style={
              tab === 2
                ? GlobalStyles.selectorSelectedText
                : GlobalStyles.selectorText
            }
          >
            Loans
          </Text>
        </Pressable>

        <Pressable
          style={GlobalStyles.selector}
          onPress={() => handleTabPress(3)}
        >
          <Image
            source={tab === 3 ?  LiFiWhite: LiFiGreen}
            style={{
              width: iconSize,
              height: iconSize,
              resizeMode: "contain",
              marginBottom: 2,
            }}
          />
          <Text
            style={
              tab === 3
                ? GlobalStyles.selectorSelectedText
                : GlobalStyles.selectorText
            }
          >
            LiFi
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
