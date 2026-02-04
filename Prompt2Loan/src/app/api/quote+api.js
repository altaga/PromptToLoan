import { convertQuoteToRoute, createConfig, getQuote } from "@lifi/sdk";
import { utils } from "ethers";
import numeral from "numeral";

createConfig({
  integrator: "EffiSend",
  apiKey: process.env.LIFI_API_KEY,
});

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      amount,
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAddress,
      toAddress,
      decimals,
    } = body;

    const sanitizedAmount = sanitizeAndFormatAmount(amount, decimals);

    if (!fromToken || !toToken || !sanitizedAmount || sanitizedAmount === "0") {
      return Response.json(
        {
          error: "InvalidRequest",
          message: "Invalid amount or missing tokens.",
        },
        { status: 400 },
      );
    }

    try {
      const quote = await getQuote(
        {
          fromChain,
          toChain,
          fromToken,
          toToken,
          fromAmount: sanitizedAmount,
          fromAddress,
          toAddress: toAddress || fromAddress,
        },
        { order: "FASTEST", exchanges: { deny: ["fly"] } },
      );
      const route = convertQuoteToRoute(quote);
      return Response.json({
        error: null,
        result: {
          fromChain,
          toChain,
          fromAmount: quote.action.fromAmount,
          toAmount: quote.estimate.toAmount,
          executionDuration: quote.estimate.executionDuration,
          gasCosts: quote.estimate.gasCosts,
          route,
          quote,
        },
      });
    } catch (apiError) {
      const errorMessage = apiError.message || "";
      const isNoRoute =
        errorMessage.includes("No available quotes") ||
        errorMessage.includes("NotFoundError") ||
        apiError.status === 404;

      if (isNoRoute) {
        return Response.json(
          {
            error: "NoRouteFound",
            message:
              "No route available. Try changing the amount or token pair.",
          },
          { status: 404 },
        );
      }
      throw apiError;
    }
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: "API_Error", message: e.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

function sanitizeAndFormatAmount(rawInput, decimals) {
  if (!rawInput) return "0";

  let inputStr = String(rawInput).trim();

  const lastComma = inputStr.lastIndexOf(",");
  const lastDot = inputStr.lastIndexOf(".");
  if (lastComma > lastDot && lastDot !== -1) {
    inputStr = inputStr.replace(/\./g, "").replace(",", ".");
  }

  const numericValue = numeral(inputStr).value();

  if (numericValue === null || numericValue <= 0) return "0";

  const cleanString = numericValue.toFixed(decimals);

  try {
    return utils.parseUnits(cleanString, decimals).toString();
  } catch (e) {
    return "0";
  }
}
