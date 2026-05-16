"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { VEILDAO_ABI, GHOSTANALYTICS_ABI, GHOSTDELEGATION_ABI, GHOSTVOTER_ABI, getVeilDAOAddress, getAnalyticsAddress, getDelegationAddress, getGhostVoterAddress, type Proposal, DEMO_PROPOSALS } from "@/lib/contracts";
import { useState, useEffect } from "react";

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
  const [useDemoData, setUseDemoData] = useState(false);

  const { data: count } = useReadContract({
    address,
    abi:          VEILDAO_ABI,
    functionName: "proposalCount",
    query:        { enabled: !!address },
  });

  const { data: proposals, isLoading } = useReadContract({
    address,
    abi:          VEILDAO_ABI,
    functionName: "getProposals",
    args:         [0n, 20n],
    query:        { enabled: !!address && count !== undefined },
  });

  useEffect(() => {
    if (!address) setUseDemoData(true);
  }, [address]);

  return {
    proposals:   useDemoData ? DEMO_PROPOSALS : ((proposals as Proposal[]) ?? []),
    isLoading:   !useDemoData && isLoading,
    isDemoMode:  useDemoData,
    totalCount:  useDemoData ? BigInt(DEMO_PROPOSALS.length) : (count ?? 0n),
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

  const compute = () => {
    if (!address) return;
    writeContract({
      address,
      abi:          GHOSTANALYTICS_ABI,
      functionName: "computeAnalytics",
      args:         [proposalId],
    });
  };

  return { compute, isPending, isConfirming, isSuccess };
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

  const delegate = (to: `0x${string}`, weight: 1 | 2 | 4, encWeight: { data: `0x${string}`; securityZone: `0x${string}` }) => {
    if (!address) return;
    writeContract({
      address,
      abi:          GHOSTDELEGATION_ABI,
      functionName: "delegate",
      args:         [to, encWeight, weight],
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
