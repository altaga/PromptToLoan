// ============================================================================
// 💠 1. IMPORTS & SETUP
// ============================================================================
import IPoolABI from "@aave/core-v3/artifacts/contracts/interfaces/IPool.sol/IPool.json" with { type: "json" };
import WETHGatewayABI from "@aave/periphery-v3/artifacts/contracts/misc/WrappedTokenGatewayV3.sol/WrappedTokenGatewayV3.json" with { type: "json" };
import { AaveV3Base } from "@bgd-labs/aave-address-book";
import { ChatBedrockConverse } from "@langchain/aws";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { tool } from "@langchain/core/tools";
import { END, MemorySaver, MessagesAnnotation, START, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { createConfig, getQuote } from "@lifi/sdk";
import ERC20ABI from "@openzeppelin/contracts/build/contracts/ERC20.json" with { type: "json" };
import bodyParser from "body-parser";
import "dotenv/config";
import * as ethers from "ethers";
import express from "express";
import { findBestMatch } from "string-similarity";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { NetworksList } from "./networks.js";
import { TokensList } from "./tokens.js";
import { prepareApproval } from "./utils.js";

createConfig({
  integrator: "EffiSend",
  apiKey: process.env.LIFI_API_KEY, // Optional: Higher rate limits
});

// ============================================================================
// 💠 2. MODEL CONFIGURATION
// ============================================================================
const llm = new ChatBedrockConverse({
  model: "us.meta.llama3-1-8b-instruct-v1:0",
  region: "us-east-1",
  temperature: 0,
});

// ============================================================================
// 💠 3. GENERIC TOOLS
// ============================================================================

// 1. Web Search Tool (Retained as a functional example)
const webSearchTool = new DuckDuckGoSearch();
const webSearch = tool(
  async ({ query }) => {
    try {
      const res = await webSearchTool.invoke(query);
      return JSON.stringify({
        status: "success",
        last_tool: "web_search",
        message: res,
      });
    } catch (error) {
      return JSON.stringify({
        status: "fail",
        last_tool: "web_search",
        message: error.message,
      });
    }
  },
  {
    name: "web_search",
    description: "Searches the web for current information, facts, and news.",
    schema: z.object({ query: z.string() }),
  },
);

const fallbackTool = tool(
  () => {
    return JSON.stringify({
      status: "success",
      last_tool: "fallback",
      message:
        "Welcome to Loanify, your DeFi liquidity strategist. \n\nI can help you supply assets or manage loans on Aave, and execute cross-chain bridges or swaps via LiFi. \n\nWhat is your next move? You can say things like: \n\nSupply 1 ETH to Aave, or Bridge USDC to Base.",
    });
  },
  {
    name: "fallback",
    description: "Loanify greeting covering Aave lending and LiFi bridging.",
    schema: z.object({}),
  },
);

// ============================================================================
// 💠 3.1. AAVE Tools
// ============================================================================

const prepareAaveDeposit = tool(
  async ({ amountInEth }, { configurable: { address } }) => {
    try {
      console.log({
        address,
        amountInEth,
        wethGateway: AaveV3Base.WETH_GATEWAY,
      });
      // 1. Setup Provider & Contract
      const provider = new ethers.providers.JsonRpcProvider(
        "https://mainnet.base.org",
      );
      const amountWei = ethers.utils.parseEther(amountInEth);

      // Use a VoidSigner to simulate the transaction for a specific address
      const voidSigner = new ethers.VoidSigner(address, provider);
      const wethGateway = new ethers.Contract(
        AaveV3Base.WETH_GATEWAY,
        WETHGatewayABI.abi,
        voidSigner,
      );

      // 2. Populate Transaction Data
      const txRequest = await wethGateway.populateTransaction.depositETH(
        AaveV3Base.POOL,
        address,
        0,
        { value: amountWei },
      );

      // 3. Gas Calculation
      // Estimate units required for this specific user/action
      const estimatedGas = await provider.estimateGas({
        to: txRequest.to,
        from: address,
        data: txRequest.data,
        value: txRequest.value,
      });

      // Add a 10% buffer to avoid "Out of Gas" errors during network spikes
      const gasLimit = estimatedGas.mul(110).div(100);

      // Get current market gas price
      const gasPrice = await provider.getGasPrice();

      // 4. Return the Payload for the Frontend
      return JSON.stringify({
        status: "success",
        last_tool: "prepare_aave_deposit",
        tx: [
          {
            to: txRequest.to,
            data: txRequest.data,
            value: txRequest.value.toString(),
            gasLimit: gasLimit.toString(),
            gasPrice: gasPrice.toString(),
            chainId: 8453, // Base Mainnet
          },
        ],
        message: `I've prepared the transaction to deposit ${amountInEth} ETH into Aave on Base. The estimated gas price is ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei. Please confirm the transaction in your wallet.`,
      });
    } catch (error) {
      console.error("Tool Error:", error);
      return JSON.stringify({
        last_tool: "prepare_aave_deposit",
        status: "fail",
        message:
          "Failed to prepare transaction. Ensure you have enough ETH for the deposit and gas.",
      });
    }
  },
  {
    name: "prepare_aave_deposit",
    description:
      "Prepares a transaction object for depositing ETH into Aave on Base. This executes when user wants to deposit or supply ETH into Aave.",
    schema: z.object({
      amountInEth: z
        .string()
        .describe("The amount of ETH to supply (e.g. 0.01)"),
    }),
  },
);

// ============================================================================
// 💠 3.3. AAVE Repay Tool
// ============================================================================

const prepareAaveRepay = tool(
  async ({ amountUsdc }, { configurable: { address } }) => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(
        "https://mainnet.base.org",
      );
      const voidSigner = new ethers.VoidSigner(address, provider);

      const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
      const pool = new ethers.Contract(
        AaveV3Base.POOL,
        IPoolABI.abi,
        voidSigner,
      );
      const usdc = new ethers.Contract(USDC_ADDRESS, ERC20ABI.abi, voidSigner);

      const isMax = amountUsdc.toUpperCase() === "MAX";
      const contractAmount = isMax
        ? ethers.constants.MaxUint256
        : ethers.utils.parseUnits(amountUsdc, 6);

      const txList = [];

      // 1. Check Allowance
      const allowance = await usdc.allowance(address, AaveV3Base.POOL);
      const threshold = ethers.utils.parseUnits("1000000", 6); // 1M USDC threshold

      const needsApproval = isMax
        ? allowance.lt(threshold)
        : allowance.lt(contractAmount);

      if (needsApproval) {
        const approveData = await usdc.populateTransaction.approve(
          AaveV3Base.POOL,
          ethers.constants.MaxUint256,
        );
        const estApproveGas = await provider.estimateGas({
          ...approveData,
          from: address,
        });

        txList.push({
          to: USDC_ADDRESS,
          data: approveData.data,
          value: "0",
          gasLimit: estApproveGas.mul(110).div(100).toString(),
          chainId: 8453,
        });
      }

      // 2. Prepare Repay
      const repayData = await pool.populateTransaction.repay(
        USDC_ADDRESS,
        contractAmount,
        2, // Variable rate
        address,
      );
      const estRepayGas = await provider.estimateGas({
        ...repayData,
        from: address,
      });
      const gasPrice = await provider.getGasPrice();

      txList.push({
        to: AaveV3Base.POOL,
        data: repayData.data,
        value: "0",
        gasLimit: estRepayGas.mul(110).div(100).toString(),
        gasPrice: gasPrice.toString(),
        chainId: 8453,
      });

      return JSON.stringify({
        status: "success",
        last_tool: "prepare_aave_repay",
        tx: txList,
        message: needsApproval
          ? "I have prepared an approval and a repayment transaction. You will need to sign both in your wallet to clear your USDC debt."
          : `I have prepared the transaction to repay ${amountUsdc} USDC. Please confirm in your wallet.`,
      });
    } catch (error) {
      return JSON.stringify({
        status: "fail",
        last_tool: "prepare_aave_repay",
        message:
          "Failed to prepare repayment. Ensure you have the required USDC balance in your wallet.",
      });
    }
  },
  {
    name: "prepare_aave_repay",
    description:
      "Prepares transactions to repay borrowed USDC on Aave. Handles ERC20 approval if necessary.",
    schema: z.object({
      amountUsdc: z
        .string()
        .describe("Amount to repay or 'MAX' to clear the full debt."),
    }),
  },
);

// ============================================================================
// 💠 3.4. AAVE Withdraw Tool
// ============================================================================

const prepareAaveWithdraw = tool(
  async ({ amountEth }, { configurable: { address } }) => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(
        "https://mainnet.base.org",
      );
      const voidSigner = new ethers.VoidSigner(address, provider);

      const AWETH_ADDRESS = "0xD4a0e0b9149BCe49a6332E4861623832d2946F1f"; // aWETH on Base
      const gateway = new ethers.Contract(
        AaveV3Base.WETH_GATEWAY,
        WETHGatewayABI.abi,
        voidSigner,
      );
      const aWethContract = new ethers.Contract(
        AWETH_ADDRESS,
        ERC20ABI.abi,
        voidSigner,
      );

      const isMax = amountEth.toUpperCase() === "MAX";
      const amountWei = isMax
        ? ethers.constants.MaxUint256
        : ethers.utils.parseEther(amountEth);

      const txList = [];

      // 1. Threshold Allowance Logic for aWETH
      const allowance = await aWethContract.allowance(
        address,
        AaveV3Base.WETH_GATEWAY,
      );
      const threshold = ethers.utils.parseEther("1000000000"); // 1B aWETH threshold

      const needsApproval = isMax
        ? allowance.lt(threshold)
        : allowance.lt(amountWei);

      if (needsApproval) {
        const approveData = await aWethContract.populateTransaction.approve(
          AaveV3Base.WETH_GATEWAY,
          ethers.constants.MaxUint256,
        );
        const estApproveGas = await provider.estimateGas({
          ...approveData,
          from: address,
        });

        txList.push({
          to: AWETH_ADDRESS,
          data: approveData.data,
          value: "0",
          gasLimit: estApproveGas.mul(110).div(100).toString(),
          chainId: 8453,
        });
      }

      // 2. Prepare Withdraw
      const withdrawData = await gateway.populateTransaction.withdrawETH(
        AaveV3Base.POOL,
        amountWei,
        address,
      );

      const estWithdrawGas = await provider.estimateGas({
        ...withdrawData,
        from: address,
      });
      const gasPrice = await provider.getGasPrice();

      txList.push({
        to: AaveV3Base.WETH_GATEWAY,
        data: withdrawData.data,
        value: "0",
        gasLimit: estWithdrawGas.mul(110).div(100).toString(),
        gasPrice: gasPrice.toString(),
        chainId: 8453,
      });

      return JSON.stringify({
        status: "success",
        last_tool: "prepare_aave_withdraw",
        tx: txList,
        message: needsApproval
          ? "I have prepared an approval for your aWETH and the withdrawal transaction. You will need to sign both to receive your ETH."
          : `I have prepared the transaction to withdraw ${amountEth} ETH. Please confirm in your wallet.`,
      });
    } catch (error) {
      console.error("Withdraw Tool Error:", error);
      return JSON.stringify({
        status: "fail",
        last_tool: "prepare_aave_withdraw",
        message:
          "Failed to prepare withdrawal. Ensure you have enough supplied ETH and that withdrawing this amount won't put your loan at risk.",
      });
    }
  },
  {
    name: "prepare_aave_withdraw",
    description:
      "Prepares transactions to withdraw ETH from Aave on Base. Handles aWETH approval if necessary.",
    schema: z.object({
      amountEth: z
        .string()
        .describe("Amount of ETH to withdraw or 'MAX' for full balance."),
    }),
  },
);

// ============================================================================
// 💠 3.5. Swap or Bridge Tool
// ============================================================================

// Helpers
export async function getTokenAllowance(
  tokenAddress,
  ownerAddress,
  spenderAddress,
) {
  const provider = new ethers.providers.JsonRpcProvider(
    "https://mainnet.base.org",
  );
  try {
    if (
      tokenAddress.toLowerCase() ===
      "0x0000000000000000000000000000000000000000"
    ) {
      return ethers.constants.MaxUint256;
    }
    const contract = new ethers.Contract(tokenAddress, ERC20ABI.abi, provider);
    const allowance = await contract.allowance(ownerAddress, spenderAddress);
    return allowance;
  } catch (error) {
    console.error("Manual Allowance Check Failed:", error);
    return ethers.BigNumber.from(0);
  }
}

const getBestNetworkMatch = (inputName) => {
  const names = NetworksList.map((n) => n.name);
  const matches = findBestMatch(inputName, names);
  return NetworksList.find((n) => n.name === matches.bestMatch.target);
};

const swapOrBridgeTool = tool(
  async (
    {
      fromTokenSymbol,
      toTokenSymbol,
      destinationChainName,
      amount,
      swap,
      toAddress,
    },
    { configurable: { address } },
  ) => {
    try {
      const FROM_CHAIN_ID = 8453; // Origin is always Base
      let toChainId = FROM_CHAIN_ID;
      let displayDestName = "Base";

      // Inside your tool...
      if (!swap) {
        // Try fuzzy matching the destination chain
        const destChain = getBestNetworkMatch(destinationChainName);

        if (!destChain) {
          throw new Error(
            `Could not find a network similar to "${destinationChainName}".`,
          );
        }

        toChainId = destChain.id;
        displayDestName = destChain.name;
        console.log(
          `Fuzzy matched "${destinationChainName}" to "${displayDestName}"`,
        );
      }

      // 2. Find Token Metadata
      const fromToken = TokensList.find(
        (t) =>
          t.symbol.toLowerCase() === fromTokenSymbol.toLowerCase() &&
          t.chainId === FROM_CHAIN_ID,
      );
      const toToken = TokensList.find(
        (t) =>
          t.symbol.toLowerCase() === toTokenSymbol.toLowerCase() &&
          t.chainId === toChainId,
      );

      if (!fromToken || !toToken)
        throw new Error("Token symbols not found in supported list.");

      // 3. Prepare Amounts
      const rawAmount = ethers.utils.parseUnits(amount, fromToken.decimals);

      // 4. Fetch LI.FI Quote
      // We pass toAddress if provided, otherwise default to the sender's address
      const quote = await getQuote({
        fromChain: FROM_CHAIN_ID,
        toChain: toChainId,
        fromToken: fromToken.address,
        toToken: toToken.address,
        fromAmount: rawAmount.toString(),
        fromAddress: address,
        toAddress: toAddress || address,
      });

      const txList = [];
      const isNative =
        fromToken.address === "0x0000000000000000000000000000000000000000";

      // 5. Check Allowance (Only for ERC20)
      if (!isNative) {
        const currentAllowance = await getTokenAllowance(
          fromToken.address,
          address,
          quote.transactionRequest.to,
        );

        if (ethers.BigNumber.from(currentAllowance).lt(rawAmount)) {
          const erc20Interface = new ethers.utils.Interface(ERC20ABI.abi);
          const approveData = erc20Interface.encodeFunctionData("approve", [
            quote.transactionRequest.to,
            ethers.constants.MaxUint256, // Manual Max Approval for convenience
          ]);

          txList.push({
            to: fromToken.address,
            data: approveData,
            value: "0",
            chainId: FROM_CHAIN_ID,
          });
        }
      }

      // 6. Add the Swap/Bridge transaction
      txList.push({
        to: quote.transactionRequest.to,
        data: quote.transactionRequest.data,
        value: isNative
          ? rawAmount.toString()
          : quote.transactionRequest.value || "0",
        chainId: FROM_CHAIN_ID,
      });

      return JSON.stringify({
        status: "success",
        last_tool: "prepare_swap_or_bridge",
        tx: txList,
        message:
          toAddress && toAddress.toLowerCase() !== address.toLowerCase()
            ? `I've prepared a ${swap ? "swap" : "bridge"} to send ${amount} ${fromToken.symbol} to ${toAddress} on ${displayDestName}.`
            : `I've prepared your ${swap ? "swap" : "bridge"} of ${amount} ${fromToken.symbol} on ${displayDestName}.`,
      });
    } catch (error) {
      return JSON.stringify({ status: "fail", message: error.message });
    }
  },
  {
    name: "prepare_swap_or_bridge",
    description:
      "Swaps or bridges tokens from Base. Can send to an optional destination address.",
    schema: z.object({
      fromTokenSymbol: z.string().describe("Token to send from Base"),
      toTokenSymbol: z.string().describe("Token to receive"),
      destinationChainName: z
        .string()
        .optional()
        .describe("Target chain name (ignored if swap is true)"),
      amount: z.string().describe("Human amount (e.g., '10.5')"),
      swap: z.boolean().describe("True for swap on Base, false for bridge"),
      toAddress: z
        .string()
        .optional()
        .describe(
          "Optional destination wallet address if different from sender",
        ),
    }),
  },
);

// ============================================================================
// 💠 3.6. FUSION TOOL
// ============================================================================

const borrowAndBridgeTool = tool(
  async (
    { borrowAmountUsdc, toTokenSymbol, destinationChainName, toAddress },
    { configurable: { address } },
  ) => {
    try {
      // --- CONSTANTS ---
      const BASE_CHAIN_ID = 8453;
      const AAVE_POOL_ADDRESS = AaveV3Base.POOL; // Aave V3 Base Pool
      const USDC_BASE_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Native USDC
      const USDC_DECIMALS = 6;
      // --- RPC and Signer ---
      const provider = new ethers.providers.JsonRpcProvider(
        "https://mainnet.base.org",
      );
      const voidSigner = new ethers.VoidSigner(address, provider);
      // --- Contracts ---
      const aavePool = new ethers.Contract(
        AAVE_POOL_ADDRESS,
        IPoolABI.abi,
        voidSigner,
      );
      const contractUSDC = new ethers.Contract(
        USDC_BASE_ADDRESS,
        ERC20ABI.abi,
        voidSigner,
      );
      // --- Variables ---
      let isBorrow = true;
      let amountToBorrowReal = ethers.BigNumber.from(0);
      // -- Tx List ---
      const txList = [];
      // --- CALCULATIONS ---
      const targetRaw = ethers.utils.parseUnits(
        borrowAmountUsdc,
        USDC_DECIMALS,
      );
      const currentBalance = await contractUSDC.balanceOf(address);

      if (currentBalance.lt(targetRaw)) {
        amountToBorrowReal = targetRaw.sub(currentBalance);
      } else {
        isBorrow = false;
      }

      if (isBorrow) {
        const borrowTxRequest = await aavePool.populateTransaction.borrow(
          USDC_BASE_ADDRESS,
          amountToBorrowReal,
          2, // Variable Interest
          0,
          address,
        );
        txList.push({
          to: borrowTxRequest.to,
          data: borrowTxRequest.data,
          value: "0",
          chainId: BASE_CHAIN_ID,
        });
      }

      // Setup Targets
      const targetSymbol = toTokenSymbol ? toTokenSymbol.toUpperCase() : "USDC";
      let targetChainId = BASE_CHAIN_ID;
      let targetChainName = "Base";

      if (
        destinationChainName &&
        destinationChainName.toLowerCase() !== "base"
      ) {
        const destChain = getBestNetworkMatch(destinationChainName);
        if (!destChain)
          throw new Error(`Chain "${destinationChainName}" not supported.`);
        targetChainId = destChain.id;
        targetChainName = destChain.name;
      }

      // Determine if LiFi is required
      const isLiFi = targetChainId !== BASE_CHAIN_ID || targetSymbol !== "USDC";
      const isBridge = targetChainId !== BASE_CHAIN_ID;
      const isSimpleTransfer =
        !isLiFi &&
        toAddress &&
        toAddress.toLowerCase() !== address.toLowerCase();

      if (isLiFi) {
        // Resolve Target Token on Target Chain
        const toToken = TokensList.find(
          (t) =>
            t.symbol.toUpperCase() === targetSymbol &&
            t.chainId === targetChainId,
        );
        if (!toToken)
          throw new Error(
            `Token ${targetSymbol} not found on ${targetChainName}.`,
          );

        const isNative =
          toToken.address === "0x0000000000000000000000000000000000000000";

        // Get Quote from LI.FI
        const quote = await getQuote({
          fromChain: BASE_CHAIN_ID,
          toChain: targetChainId,
          fromToken: USDC_BASE_ADDRESS,
          toToken: toToken.address,
          fromAmount: targetRaw.toString(),
          fromAddress: address,
          toAddress: toAddress || address, // Use optional recipient or self
        });

        // --- CHECK BALANCE ---

        const tx = await prepareApproval(
          USDC_BASE_ADDRESS,
          address,
          quote.transactionRequest.to,
          borrowAmountUsdc,
        );

        if (tx) {
          txList.push(tx);
        }

        txList.push({
          to: quote.transactionRequest.to,
          data: quote.transactionRequest.data,
          value: isNative ? targetRaw.toString() : "0",
          chainId: BASE_CHAIN_ID,
        });
      } else if (isSimpleTransfer) {
        // SIMPLE TRANSFER LOGIC
        const transferData = await contractUSDC.populateTransaction.transfer(
          toAddress,
          targetRaw,
        );
        txList.push({
          to: USDC_BASE_ADDRESS,
          data: transferData.data,
          value: "0",
          chainId: BASE_CHAIN_ID,
        });
      }

      console.log(txList);

      // --- 5. MESSAGE CONSTRUCTION ---
      const format = (bn, dec) => ethers.utils.formatUnits(bn, dec);
      let finalMessage = "I've prepared your request: ";

      const borrowStr = isBorrow
        ? `borrowing **${format(amountToBorrowReal, USDC_DECIMALS)} USDC**`
        : "";

      if (isLiFi) {
        const actionStr = isBridge
          ? `bridging to **${targetSymbol}** on **${targetChainName}**`
          : `swapping for **${targetSymbol}**`;
        finalMessage += isBorrow
          ? `${borrowStr} and then ${actionStr}.`
          : `Using balance to ${actionStr}.`;
      } else if (isSimpleTransfer) {
        finalMessage += isBorrow
          ? `${borrowStr} and sending it to **${toAddress}** on Base.`
          : `Sending **${format(targetRaw, USDC_DECIMALS)} USDC** from your balance to **${toAddress}**.`;
      } else {
        finalMessage += isBorrow
          ? `borrowing **${format(amountToBorrowReal, USDC_DECIMALS)} USDC** to your wallet.`
          : `You already have the desired USDC balance in your wallet.`;
      }

      return JSON.stringify({
        status: "success",
        last_tool: "borrow_and_bridge",
        tx: txList,
        message: `${finalMessage}\n\n**Please sign the ${txList.length} transaction(s).**`,
      });
    } catch (error) {
      console.error("Borrow Tool Error:", error);
      return JSON.stringify({ status: "fail", message: error.message });
    }
  },
  {
    name: "borrow_and_bridge",
    description:
      "Comprehensive DeFi tool to borrow USDC from Aave (only if the wallet balance is insufficient) and then optionally transfer, swap, or bridge the total amount to a target token, chain, or recipient.",
    schema: z.object({
      borrowAmountUsdc: z
        .string()
        .describe("Amount of USDC to borrow (e.g. '1000')"),
      toTokenSymbol: z
        .string()
        .optional()
        .describe("Target token (defaults to USDC if empty)"),
      destinationChainName: z
        .string()
        .optional()
        .describe("Target chain (defaults to Base if empty)"),
      toAddress: z
        .string()
        .optional()
        .describe("Recipient address (defaults to sender if empty)"),
    }),
  },
);

const tools = [
  fallbackTool,
  prepareAaveDeposit,
  prepareAaveRepay,
  prepareAaveWithdraw,
  borrowAndBridgeTool,
];
const toolNode = new ToolNode(tools);

// ============================================================================
// 💠 4. GRAPH LOGIC (LANGGRAPH)
// ============================================================================

const llmWithTools = llm.bindTools(tools);

// Node: Call Model
const callModel = async (state) => {
  const response = await llmWithTools.invoke(state.messages);
  // If the LLM didn't pick a tool, force the fallback
  if (!response.tool_calls || response.tool_calls.length === 0) {
    response.tool_calls = [{ name: "fallback", args: {} }];
  }
  return { messages: [...state.messages, response] };
};

// Edge: Routing Logic
function routeAfterModel(state) {
  const lastMessage = state.messages[state.messages.length - 1];
  console.log(lastMessage.tool_calls);
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }
  return END;
}

// Workflow Definition
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("model", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "model")
  .addConditionalEdges("model", routeAfterModel, {
    tools: "tools",
    [END]: END,
  })
  .addEdge("tools", END); // Logic: Model -> Tools -> End

const memory = new MemorySaver();
const graph = workflow.compile({ checkpointer: memory });

// ============================================================================
// 💠 5. AGENT INVOKER
// ============================================================================
async function invokeAgent(message, contextData = {}) {
  const threadId = contextData.sessionId || uuidv4();

  const input = {
    messages: [
      {
        role: "system",
        content:
          "You are a helpful AI Assistant. You MUST respond by calling a tool.",
      },
      { role: "user", content: message },
    ],
  };

  const output = await graph.invoke(input, {
    configurable: { thread_id: threadId, ...contextData },
  });

  // Extract the final tool output to return to API
  const lastMsg = output.messages[output.messages.length - 1];

  // Try to parse JSON if the tool returned JSON string
  try {
    return JSON.parse(lastMsg.content);
  } catch {
    return { message: lastMsg.content };
  }
}

// ============================================================================
// 💠 6. EXPRESS API
// ============================================================================
const app = express();
const port = process.env.PORT || 8000;

app.use(bodyParser.json());

// Auth Middleware
app.use((req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.AI_URL_API_KEY) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }
  next();
});

// Chat Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, context } = req.body;
    console.log({ message, context });
    const response = await invokeAgent(message, context);
    console.log(response);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});

// Health Check Endpoint
app.get("/", (_, res) => {
  res.json({ status: "ok", message: "Minimalist Agent API running." });
});

app.listen(port, () => {
  console.log(`Agent API listening at http://localhost:${port}`);
});
