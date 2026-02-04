import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { fetch } from "expo/fetch";
import React, { Fragment, useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import GlobalStyles, { mainColor } from "../../../core/styles";
import { useStateAsync } from "../../../hooks/useAsyncState";
import ContextModule from "../../../providers/contextModule";
import { useWallet } from "../../../providers/walletProvider";

function formatTimestamp(unixTimestamp) {
  const now = new Date();
  const messageDate = new Date(unixTimestamp * 1000); // Convert from seconds to milliseconds

  const diffMs = now - messageDate;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60)
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";

  // Return formatted date (e.g. 03/Jul or 03/Jul/2025 if not same year)
  const day = messageDate.getDate();
  const month = messageDate.toLocaleString("default", { month: "short" });
  const year = messageDate.getFullYear();

  const showYear = year !== now.getFullYear();
  return `${day}/${month}${showYear ? "/" + year : ""}`;
}

export default function Tab4() {
  const context = React.useContext(ContextModule);
  const wallet = useWallet();
  const { account, sendTransaction } = wallet;
  const scrollView = useRef(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputHeight, setInputHeight] = useStateAsync("auto");

  async function chatWithAgent(message) {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    const raw = JSON.stringify({
      message,
      context: {
        address: account,
      },
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };
    return new Promise((resolve) => {
      fetch("/api/chatWithAgent", requestOptions)
        .then((response) => response.json())
        .then((result) => resolve(result))
        .catch(() => resolve(null));
    });
  }

  function responseModifier(response) {
    // This is only if you want to modify the response post processing
    let temp = response;
    if (temp["last_tool"] === "some_tool") {
      //temp.message = "some_tool_response";
    }
    return temp;
  }

  const executeTransactions = async (transactions) => {
    const txArray = Array.isArray(transactions) ? transactions : [transactions];
    for (const tx of txArray) {
      try {
        console.log("Executing transaction:", tx);
        const receipt = await sendTransaction(tx);
        console.log("Transaction confirmed:", receipt);
      } catch (error) {
        console.error("Transaction failed, stopping sequence:", error);
        break;
      }
    }
  };

  function catchTransaction(response) {
    const targetTools = [
      "prepare_aave_deposit",
      "prepare_aave_borrow",
      "prepare_aave_repay",
      "prepare_aave_withdraw",
      "prepare_swap_or_bridge",
      "borrow_and_bridge",
    ];

    if (
      targetTools.includes(response["last_tool"]) &&
      response["status"] === "success" &&
      response["tx"]
    ) {
      // Call the async executor
      executeTransactions(response["tx"]);
    }
  }

  const sendMessage = useCallback(async () => {
    setLoading(true);
    const userMessage = message;
    setMessage("");
    let temp = [...context.value.chatGeneral];
    temp.push({
      message: userMessage,
      type: "user",
      time: Date.now(),
      tool: "",
    });
    await context.setValueAsync({
      chatGeneral: temp,
    });
    setTimeout(() => scrollView.current.scrollToEnd({ animated: true }), 100);
    const response = await chatWithAgent(message);
    const finalResponse = responseModifier(response);
    temp.push({
      message: finalResponse.message,
      type: "system",
      time: Date.now(),
      tool: response["last_tool"],
    });
    console.log(temp);
    context.setValue({
      chatGeneral: temp,
    });
    setLoading(false);
    setTimeout(() => scrollView.current.scrollToEnd({ animated: true }), 100);
    catchTransaction(response);
  }, [scrollView, context, message, setMessage, setLoading]);

  return (
    <Fragment>
      <ScrollView
        ref={(view) => {
          scrollView.current = view;
        }}
        showsVerticalScrollIndicator={false}
        style={[GlobalStyles.scrollContainer]}
        contentContainerStyle={[
          GlobalStyles.scrollContainerContent,
          {
            width: "90%",
            height: "auto",
            alignSelf: "center",
            gap: 0,
          },
        ]}
      >
        {context.value.chatGeneral.map((item, index, array) => (
          <LinearGradient
            angle={90}
            useAngle={true}
            key={`Message:${index}`}
            style={[
              {
                borderRadius: 10,
                borderBottomRightRadius: item.type === "user" ? 0 : 10,
                borderBottomLeftRadius: item.type === "user" ? 10 : 0,
                paddingHorizontal: 16,
                paddingVertical: 10,
                maxWidth: "80%",
                alignSelf: item.type === "user" ? "flex-end" : "flex-start",
              },
              index !== 0 && array[index - 1].type !== item.type
                ? { marginTop: 16 }
                : { marginTop: 5 },
            ]}
            colors={[
              item.type === "user" ? mainColor + "cc" : mainColor + "40",
              item.type === "user" ? mainColor + "cc" : mainColor + "40",
            ]}
          >
            <Text
              style={{
                color: "white",
                textAlign: "justify",
                marginBottom: 10,
                fontSize: 16,
              }}
            >
              {item.message}
            </Text>
            <Text
              style={{
                color: "#cccccc",
                alignSelf: "flex-end",
                fontSize: 12,
                marginRight: -5,
                marginBottom: -5,
              }}
            >
              {formatTimestamp(item.time)}
            </Text>
          </LinearGradient>
        ))}
      </ScrollView>
      <View
        style={[
          {
            height: "auto",
            width: "94%",
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginVertical: 10,
          },
        ]}
      >
        <TextInput
          onPressOut={() => scrollView.current.scrollToEnd({ animated: true })}
          onChange={() => scrollView.current.scrollToEnd({ animated: true })}
          onFocus={() => scrollView.current.scrollToEnd({ animated: true })}
          multiline
          onContentSizeChange={async (event) => {
            if (event.nativeEvent.contentSize.height < 120) {
              await setInputHeight(event.nativeEvent.contentSize.height);
              scrollView.current.scrollToEnd({ animated: true });
            }
          }}
          style={[
            GlobalStyles.inputChat,
            {
              height: inputHeight,
            },
          ]}
          keyboardType="default"
          value={message}
          onChangeText={setMessage}
        />
        <Pressable
          onPress={sendMessage}
          disabled={message.length <= 0 || loading}
          style={[
            {
              width: "10%",
              height: "auto",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: mainColor,
              borderRadius: 50,
              aspectRatio: 1,
              padding: 20,
            },
            message.length <= 0 || loading ? { opacity: 0.5 } : {},
          ]}
        >
          {loading ? (
            <ActivityIndicator size={22} color="white" />
          ) : (
            <Ionicons name="send" size={22} color="white" />
          )}
        </Pressable>
      </View>
    </Fragment>
  );
}
