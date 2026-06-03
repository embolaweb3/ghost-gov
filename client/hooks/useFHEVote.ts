"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useChainId, useWalletClient, usePublicClient } from "wagmi";
import type { Hex } from "viem";
import { createCofheConfig, createCofheClient } from "@cofhe/sdk/web";
import { arbSepolia } from "@cofhe/sdk/chains";
import { Encryptable } from "@cofhe/sdk";
import { parseGwei } from "viem";
import { VEILDAO_ABI, getVeilDAOAddress, type VoteChoice, type VoteWeight, WEIGHT_COSTS } from "@/lib/contracts";

const ARB_GAS = {
  maxFeePerGas:         parseGwei("0.3"),
  maxPriorityFeePerGas: parseGwei("0.01"),
  gas:                  3_000_000n,
} as const;

type VoteStage =
  | "idle"
  | "encrypting"
  | "sending"
  | "confirming"
  | "success"
  | "error";

// Single shared config — created once, reused across hook instances.
const cofheConfig = createCofheConfig({ supportedChains: [arbSepolia] });

export function useFHEVote(proposalId: bigint) {
  const chainId      = useChainId();
  const address      = getVeilDAOAddress(chainId ?? 0);
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [stage,      setStage]      = useState<VoteStage>("idle");
  const [errMsg,     setErrMsg]     = useState<string>("");
  const [lastChoice, setLastChoice] = useState<VoteChoice | null>(null);
  const [txHash,     setTxHash]     = useState<Hex | undefined>();

  // Keep the initialised client in a ref so it survives re-renders.
  const clientRef = useRef<ReturnType<typeof createCofheClient> | null>(null);

  useEffect(() => {
    if (!walletClient || !publicClient) return;

    const client = createCofheClient(cofheConfig);
    client.connect(publicClient, walletClient).then(() => {
      clientRef.current = client;
    }).catch(() => {
      // Connection will be retried on the next wallet/chain change.
    });
  }, [walletClient, publicClient]);

  const { writeContractAsync } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({
    hash:  txHash,
    query: { enabled: !!txHash },
  });

  const castVote = useCallback(
    async (choice: VoteChoice, weight: VoteWeight = 1) => {
      if (!address) {
        setErrMsg("Wrong network — switch to Arbitrum Sepolia");
        setStage("error");
        return;
      }
      const client = clientRef.current;
      if (!client) {
        setErrMsg("FHE client not ready — please wait a moment and try again");
        setStage("error");
        return;
      }

      try {
        // ── 1. Encrypt ──────────────────────────────────────────────────────
        setLastChoice(choice);
        setStage("encrypting");

        // Each vote is a triple: exactly one field carries the weight, the rest are 0.
        // The FHE ciphertexts are randomised — an observer CANNOT determine
        // which was non-zero, making coercion cryptographically impossible.
        const w = BigInt(weight);
        const forVal     = choice === "for"     ? w : 0n;
        const againstVal = choice === "against" ? w : 0n;
        const abstainVal = choice === "abstain" ? w : 0n;

        const encrypted = await client
          .encryptInputs([
            Encryptable.uint32(forVal),
            Encryptable.uint32(againstVal),
            Encryptable.uint32(abstainVal),
          ])
          .execute();

        // ── 2. Send transaction ──────────────────────────────────────────────
        setStage("sending");

        // The SDK types signature as `string`; ABI expects `0x${string}`.
        const toArg = (e: (typeof encrypted)[number]) =>
          ({ ...e, signature: e.signature as `0x${string}` }) as const;

        const cost = WEIGHT_COSTS[weight];

        const hash = weight === 1
          ? await writeContractAsync({
              address,
              abi:          VEILDAO_ABI,
              functionName: "castVote",
              args:         [proposalId, toArg(encrypted[0]), toArg(encrypted[1]), toArg(encrypted[2])],
              ...ARB_GAS,
            })
          : await writeContractAsync({
              address,
              abi:          VEILDAO_ABI,
              functionName: "castWeightedVote",
              args:         [proposalId, toArg(encrypted[0]), toArg(encrypted[1]), toArg(encrypted[2]), weight],
              value:        cost,
              ...ARB_GAS,
            });

        // ── 3. Wait for confirmation ─────────────────────────────────────────
        setTxHash(hash);
        setStage("confirming");
      } catch (err: any) {
        setErrMsg(err?.message ?? "Transaction failed");
        setStage("error");
      }
    },
    [address, proposalId, writeContractAsync]
  );

  // Advance to success once the on-chain confirmation lands.
  useEffect(() => {
    if (isSuccess) setStage("success");
  }, [isSuccess]);

  return {
    castVote,
    stage,
    errMsg,
    lastChoice,
    isEncrypting:  stage === "encrypting",
    isSending:     stage === "sending",
    isConfirming:  stage === "confirming",
    isSuccess:     stage === "success",
    isError:       stage === "error",
    reset:         () => { setStage("idle"); setErrMsg(""); setTxHash(undefined); },
  };
}
