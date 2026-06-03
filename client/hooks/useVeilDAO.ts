"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { parseEther, parseGwei } from "viem";
import { VEILDAO_ABI, GHOSTANALYTICS_ABI, GHOSTDELEGATION_ABI, GHOSTVOTER_ABI, GHOSTSYBIL_ABI, GHOSTVETO_ABI, GHOSTBRIBE_ABI, getVeilDAOAddress, getAnalyticsAddress, getDelegationAddress, getGhostVoterAddress, getGhostSybilAddress, getGhostVetoAddress, getGhostBribeAddress, type Proposal, DEMO_PROPOSALS } from "@/lib/contracts";
import { useState, useEffect } from "react";

const ARB_GAS = {
  maxFeePerGas:         parseGwei("0.3"),
  maxPriorityFeePerGas: parseGwei("0.01"),
  gas:                  3_000_000n,
} as const;

function useContractAddress() {
  const chainId = useChainId();
  return getVeilDAOAddress(chainId ?? 0);
}

function useAnalyticsAddress() {
  const chainId = useChainId();
  return getAnalyticsAddress(chainId ?? 0);
}

function useDelegationAddress() {
  const chainId = useChainId();
  return getDelegationAddress(chainId ?? 0);
}

function useGhostVoterAddress() {
  const chainId = useChainId();
  return getGhostVoterAddress(chainId ?? 0);
}

export function useProposals() {
  const address = useContractAddress();

  const { data: count } = useReadContract({
    address,
    abi:          VEILDAO_ABI,
    functionName: "proposalCount",
    query:        { enabled: !!address, refetchInterval: 5_000 },
  });

  const { data: proposals, isLoading } = useReadContract({
    address,
    abi:          VEILDAO_ABI,
    functionName: "getProposals",
    args:         [0n, 50n],
    query:        { enabled: !!address && count !== undefined, refetchInterval: 5_000 },
  });

  const isDemoMode = !address;

  return {
    proposals:   isDemoMode ? DEMO_PROPOSALS : ((proposals as Proposal[]) ?? []),
    isLoading:   !isDemoMode && isLoading,
    isDemoMode,
    totalCount:  isDemoMode ? BigInt(DEMO_PROPOSALS.length) : (count ?? 0n),
  };
}

export function useProposal(id: bigint) {
  const address = useContractAddress();

  const { data, isLoading, refetch } = useReadContract({
    address,
    abi:          VEILDAO_ABI,
    functionName: "getProposal",
    args:         [id],
    query:        { enabled: !!address, refetchInterval: 5_000 },
  });

  const isDemoMode = !address;
  const demoProposal = DEMO_PROPOSALS.find(p => p.id === id);

  return {
    proposal:   isDemoMode ? demoProposal : (data as Proposal | undefined),
    isLoading:  !isDemoMode && isLoading,
    isDemoMode,
    refetch,
  };
}

export function useHasVoted(proposalId: bigint) {
  const { address: voter } = useAccount();
  const contractAddress    = useContractAddress();

  const { data } = useReadContract({
    address:      contractAddress,
    abi:          VEILDAO_ABI,
    functionName: "hasVoted",
    args:         [proposalId, voter!],
    query:        { enabled: !!contractAddress && !!voter },
  });

  return !!data;
}

export function useCreateProposal() {
  const address = useContractAddress();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isPending: waitPending, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });
  const isConfirming = !!hash && waitPending;

  const createProposal = (
    title:           string,
    description:     string,
    category:        string,
    durationSeconds: number
  ) => {
    if (!address) return;
    writeContract({
      address,
      abi:          VEILDAO_ABI,
      functionName: "createProposal",
      args:         [title, description, category, BigInt(durationSeconds)],
      ...ARB_GAS,
    });
  };

  return { createProposal, isPending, isConfirming, isSuccess, hash, error };
}

export function useResolveProposal(proposalId: bigint) {
  const address = useContractAddress();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isPending: waitPending, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });
  const isConfirming = !!hash && waitPending;

  const resolve = () => {
    if (!address) return;
    writeContract({
      address,
      abi:          VEILDAO_ABI,
      functionName: "resolveProposal",
      args:         [proposalId],
      ...ARB_GAS,
    });
  };

  return { resolve, isPending, isConfirming, isSuccess };
}

export function useComputeAnalytics(proposalId: bigint) {
  const address = useAnalyticsAddress();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isPending: waitPending, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });
  const isConfirming = !!hash && waitPending;
  const isComputing  = isPending || isConfirming;

  const { data: analyticsData, refetch: refetchAnalytics } = useReadContract({
    address,
    abi:          GHOSTANALYTICS_ABI,
    functionName: "getAnalytics",
    args:         [proposalId],
    query:        { enabled: !!address, refetchInterval: 5_000 },
  });
  const alreadyComputed = !!(analyticsData as any)?.[3]; // index 3 = computed bool

  useEffect(() => {
    if (isSuccess) refetchAnalytics();
  }, [isSuccess, refetchAnalytics]);

  const compute = () => {
    if (!address) return;
    writeContract({
      address,
      abi:          GHOSTANALYTICS_ABI,
      functionName: "computeAnalytics",
      args:         [proposalId],
      ...ARB_GAS,
    });
  };

  return { compute, isComputing, isSuccess, alreadyComputed };
}

export function useDelegationStatus() {
  const { address: account } = useAccount();
  const contractAddress = useDelegationAddress();

  const { data: hasDelegated } = useReadContract({
    address:      contractAddress,
    abi:          GHOSTDELEGATION_ABI,
    functionName: "hasDelegated",
    args:         [account!],
    query:        { enabled: !!contractAddress && !!account, refetchInterval: 5_000 },
  });

  const { data: delegatedTo } = useReadContract({
    address:      contractAddress,
    abi:          GHOSTDELEGATION_ABI,
    functionName: "delegatedTo",
    args:         [account!],
    query:        { enabled: !!contractAddress && !!account && !!hasDelegated },
  });

  const { data: delegatedWeight } = useReadContract({
    address:      contractAddress,
    abi:          GHOSTDELEGATION_ABI,
    functionName: "delegatedWeight",
    args:         [account!],
    query:        { enabled: !!contractAddress && !!account && !!hasDelegated },
  });

  return {
    hasDelegated:   !!hasDelegated,
    delegatedTo:    delegatedTo as `0x${string}` | undefined,
    delegatedWeight: delegatedWeight as number | undefined,
  };
}

export function useDelegate() {
  const address = useDelegationAddress();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isPending: waitPending, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });
  const isConfirming = !!hash && waitPending;

  const delegate = (to: `0x${string}`, weight: 1 | 2 | 4) => {
    if (!address) return;
    // encWeight is a zeroed InEuint32 placeholder — real FHE encryption
    // of the weight requires cofhe SDK integration (same path as castVote).
    const encWeight = { ctHash: 0n, securityZone: 0, utype: 0, signature: "0x" as `0x${string}` };
    writeContract({
      address,
      abi:          GHOSTDELEGATION_ABI,
      functionName: "delegate",
      args:         [to, encWeight, weight],
      ...ARB_GAS,
    });
  };

  return { delegate, isPending, isConfirming, isSuccess };
}

export function useRevoke() {
  const address = useDelegationAddress();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isPending: waitPending, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });
  const isRevoking = isPending || (!!hash && waitPending);

  const revoke = () => {
    if (!address) return;
    writeContract({
      address,
      abi:          GHOSTDELEGATION_ABI,
      functionName: "revoke",
      args:         [],
      ...ARB_GAS,
    });
  };

  return { revoke, isRevoking, isSuccess };
}

export function useCastDelegatedVote(proposalId: bigint) {
  const address = useContractAddress();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isPending: waitPending, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });
  const isConfirming = !!hash && waitPending;

  const castDelegatedVote = (direction: 0 | 1 | 2) => {
    if (!address) return;
    writeContract({
      address,
      abi:          VEILDAO_ABI,
      functionName: "castDelegatedVote",
      args:         [proposalId, direction],
      ...ARB_GAS,
    });
  };

  return { castDelegatedVote, isPending, isConfirming, isSuccess };
}

export function useVoterBadge(voter?: `0x${string}`) {
  const address = useGhostVoterAddress();

  const { data } = useReadContract({
    address,
    abi:          GHOSTVOTER_ABI,
    functionName: "getVoterInfo",
    args:         [voter!],
    query:        { enabled: !!address && !!voter, refetchInterval: 10_000 },
  });

  if (!data) return { hasNFT: false, tokenId: undefined, voteCount: undefined, whaleWatcher: false };

  const [tokenId, voteCount, whaleWatcher] = data as [bigint, bigint, boolean];
  return {
    hasNFT:       tokenId > 0n,
    tokenId:      tokenId > 0n ? tokenId : undefined,
    voteCount:    tokenId > 0n ? voteCount : undefined,
    whaleWatcher,
  };
}

// ─── Private address helpers ─────────────────────────────────────────────────

function useGhostSybilAddress() {
  const chainId = useChainId();
  return getGhostSybilAddress(chainId ?? 0);
}

function useGhostVetoAddress() {
  const chainId = useChainId();
  return getGhostVetoAddress(chainId ?? 0);
}

function useGhostBribeAddress() {
  const chainId = useChainId();
  return getGhostBribeAddress(chainId ?? 0);
}

// ─── GhostSybil ──────────────────────────────────────────────────────────────

export function useSybilScore(voter?: `0x${string}`) {
  const address = useGhostSybilAddress();

  const { data: hasRep } = useReadContract({
    address,
    abi:          GHOSTSYBIL_ABI,
    functionName: "hasReputation",
    args:         [voter!],
    query:        { enabled: !!address && !!voter, refetchInterval: 10_000 },
  });

  const { data: tierData } = useReadContract({
    address,
    abi:          GHOSTSYBIL_ABI,
    functionName: "tier",
    args:         [voter!],
    query:        { enabled: !!address && !!voter && !!hasRep },
  });

  return {
    hasReputation: !!hasRep,
    tier:          tierData !== undefined ? Number(tierData) : 0,
  };
}

// ─── GhostVeto ───────────────────────────────────────────────────────────────

export function useVetoStatus(proposalId: bigint, account?: `0x${string}`) {
  const address = useGhostVetoAddress();

  const { data: vetoSubmitted } = useReadContract({
    address,
    abi:          GHOSTVETO_ABI,
    functionName: "vetoSubmitted",
    args:         [proposalId],
    query:        { enabled: !!address, refetchInterval: 5_000 },
  });

  const { data: vetoSettled } = useReadContract({
    address,
    abi:          GHOSTVETO_ABI,
    functionName: "vetoSettled",
    args:         [proposalId],
    query:        { enabled: !!address && !!vetoSubmitted },
  });

  const { data: vetoResult } = useReadContract({
    address,
    abi:          GHOSTVETO_ABI,
    functionName: "vetoResult",
    args:         [proposalId],
    query:        { enabled: !!address && !!vetoSettled },
  });

  const { data: vetoGuardian } = useReadContract({
    address,
    abi:          GHOSTVETO_ABI,
    functionName: "vetoGuardian",
    args:         [proposalId],
    query:        { enabled: !!address && !!vetoSubmitted },
  });

  const { data: isGuardianData } = useReadContract({
    address,
    abi:          GHOSTVETO_ABI,
    functionName: "isGuardian",
    args:         [account!],
    query:        { enabled: !!address && !!account },
  });

  return {
    vetoSubmitted: !!vetoSubmitted,
    vetoSettled:   !!vetoSettled,
    vetoResult:    !!vetoResult,
    vetoGuardian:  vetoGuardian as `0x${string}` | undefined,
    isGuardian:    !!isGuardianData,
  };
}

export function useSubmitVeto(proposalId: bigint) {
  const address = useGhostVetoAddress();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isPending: waitPending, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });
  const isSubmitting = isPending || (!!hash && waitPending);

  const submitVeto = (vote: 0 | 1) => {
    if (!address) return;
    const encVeto = { ctHash: BigInt(vote), securityZone: 0, utype: 0, signature: "0x" as `0x${string}` };
    writeContract({
      address,
      abi:          GHOSTVETO_ABI,
      functionName: "submitVeto",
      args:         [proposalId, encVeto],
      ...ARB_GAS,
    });
  };

  return { submitVeto, isSubmitting, isSuccess };
}

// ─── GhostBribe ──────────────────────────────────────────────────────────────

export function useBribes(proposalId: bigint) {
  const address = useGhostBribeAddress();

  const { data: count } = useReadContract({
    address,
    abi:          GHOSTBRIBE_ABI,
    functionName: "bribeCount",
    query:        { enabled: !!address, refetchInterval: 5_000 },
  });

  return { bribeCount: count as bigint | undefined, bribeAddress: address };
}

export function useBribeInfo(bribeId: bigint, enabled: boolean) {
  const address = useGhostBribeAddress();

  const { data } = useReadContract({
    address,
    abi:          GHOSTBRIBE_ABI,
    functionName: "getBribe",
    args:         [bribeId],
    query:        { enabled: !!address && enabled, refetchInterval: 5_000 },
  });

  if (!data) return undefined;
  const [proposalId, direction, totalFunds, briber, active, claimCount] = data as [bigint, number, bigint, `0x${string}`, boolean, bigint];
  return { bribeId, proposalId, direction: Number(direction), totalFunds, briber, active, claimCount };
}

export function useCreateBribe() {
  const address = useGhostBribeAddress();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isPending: waitPending, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });
  const isCreating = isPending || (!!hash && waitPending);

  const createBribe = (proposalId: bigint, direction: 0 | 1 | 2, amountEth: string) => {
    if (!address) return;
    writeContract({
      address,
      abi:          GHOSTBRIBE_ABI,
      functionName: "createBribe",
      args:         [proposalId, direction],
      value:        parseEther(amountEth),
      ...ARB_GAS,
    });
  };

  return { createBribe, isCreating, isSuccess };
}

export function useAttemptClaim() {
  const address = useGhostBribeAddress();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isPending: waitPending, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });
  const isClaiming = isPending || (!!hash && waitPending);

  const attemptClaim = (bribeId: bigint) => {
    if (!address) return;
    const encDir = { ctHash: 0n, securityZone: 0, utype: 0, signature: "0x" as `0x${string}` };
    writeContract({
      address,
      abi:          GHOSTBRIBE_ABI,
      functionName: "attemptClaim",
      args:         [bribeId, encDir],
      ...ARB_GAS,
    });
  };

  return { attemptClaim, isClaiming, isSuccess };
}

export function useCancelBribe() {
  const address = useGhostBribeAddress();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isPending: waitPending, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });
  const isCancelling = isPending || (!!hash && waitPending);

  const cancelBribe = (bribeId: bigint) => {
    if (!address) return;
    writeContract({
      address,
      abi:          GHOSTBRIBE_ABI,
      functionName: "cancelBribe",
      args:         [bribeId],
      ...ARB_GAS,
    });
  };

  return { cancelBribe, isCancelling, isSuccess };
}
