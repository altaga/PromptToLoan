import { Bungee_400Regular } from "@expo-google-fonts/bungee";
import { Exo2_400Regular, Exo2_700Bold } from "@expo-google-fonts/exo-2";
import { Inter_400Regular, Inter_700Bold } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import "react-native-reanimated";
import { ContextProvider } from "../providers/contextModule";
import SmartProvider from "../providers/smartProvider";
import { WalletProvider } from "../providers/walletProvider";

export default function RootLayout() {
  useFonts({
    Exo2_400Regular,
    Exo2_700Bold,
    Inter_400Regular,
    Inter_700Bold,
    Bungee_400Regular,
  });

  return (
    <React.Fragment>
      <SmartProvider>
        <ContextProvider>
          <WalletProvider>
            <Stack
              initialRouteName="(screens)/connect"
              screenOptions={{
                animation: "simple_push",
                headerShown: false,
              }}
            >
              <Stack.Screen name="(screens)/index" />
              <Stack.Screen name="(screens)/main" />
              <Stack.Screen name="(screens)/connect" />
            </Stack>
            <StatusBar style="auto" />
          </WalletProvider>
        </ContextProvider>
      </SmartProvider>
    </React.Fragment>
  );
}
