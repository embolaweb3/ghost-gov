"use client";

import { use, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Users, Tag, Shield, ExternalLink, RefreshCw, Lock } from "lucide-react";
import Link from "next/link";
import { useAccount, useChainId } from "wagmi";
import { NavBar } from "@/components/NavBar";
import { VotePanel } from "@/components/VotePanel";
import { EncryptedCounter } from "@/components/EncryptedCounter";
import { useProposal, useHasVoted, useResolveProposal, useComputeAnalytics, useDelegationStatus, useDelegate, useRevoke, useVoterBadge } from "@/hooks/useVeilDAO";
import { useFHEVote } from "@/hooks/useFHEVote";
import { CoercionProofPanel } from "@/components/CoercionProofPanel";
import { FHEAnalyticsPanel } from "@/components/FHEAnalyticsPanel";
import { LiveVoteFeed } from "@/components/LiveVoteFeed";
import { DelegationPanel } from "@/components/DelegationPanel";
import { VoterBadge } from "@/components/VoterBadge";
import { getAnalyticsAddress } from "@/lib/contracts";

interface Props { params: Promise<{ id: string }> }

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function Countdown({ endTime }: { endTime: bigint }) {
  const [diff, setDiff] = useState(0n);

  useEffect(() => {
    const update = () => setDiff(endTime - BigInt(Math.floor(Date.now() / 1000)));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [endTime]);

  if (diff <= 0n) return <span className="text-slate-500">Ended</span>;

  const s = Number(diff);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  return (
    <span className="font-mono text-violet-light">
      {d > 0 && `${d}d `}{h.toString().padStart(2, "0")}:{m.toString().padStart(2, "0")}:{sec.toString().padStart(2, "0")}
    </span>
  );
}

export default function VotePage({ params }: Props) {
  const { id }       = use(params);
  const proposalId   = BigInt(id);
  const { isConnected } = useAccount();
  const chainId      = useChainId();

  const { proposal, isLoading, isDemoMode, refetch } = useProposal(proposalId);
  const hasVoted   = useHasVoted(proposalId);
  const { castVote, stage, errMsg, lastChoice } = useFHEVote(proposalId);
  const { resolve, isPending: isResolving, isSuccess: resolveSuccess } = useResolveProposal(proposalId);
  const { compute, isPending: isComputing, isSuccess: computeSuccess } = useComputeAnalytics(proposalId);
  const { hasDelegated, delegatedTo, delegatedWeight } = useDelegationStatus();
  const { delegate, isPending: isDelegating } = useDelegate();
  const { revoke, isRevoking } = useRevoke();
  const { address: account } = useAccount();
  const { hasNFT, tokenId, voteCount, whaleWatcher } = useVoterBadge(account);

  const analyticsAddress = getAnalyticsAddress(chainId ?? 0);

  useEffect(() => {
    if (resolveSuccess) refetch?.();
  }, [resolveSuccess, refetch]);

  useEffect(() => {
    if (computeSuccess) refetch?.();
  }, [computeSuccess, refetch]);

  const now        = BigInt(Math.floor(Date.now() / 1000));
  const isActive   = !!proposal && proposal.endTime > now && !proposal.resolved;
  const canResolve = !!proposal && proposal.endTime <= now && !proposal.resolved;

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <NavBar />
        <div className="max-w-4xl mx-auto grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass rounded-2xl h-96 animate-pulse" />
          <div className="glass rounded-2xl h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <NavBar />
        <p className="text-slate-500">Proposal not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <NavBar />

      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
          <Link href="/dao" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Proposals
          </Link>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Left: proposal detail ────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass gradient-border rounded-2xl p-6"
            >
              {/* Status + category */}
              <div className="flex items-center gap-3 mb-4">
                {isActive ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald/10 border border-emerald/20 text-emerald text-xs font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
                    LIVE
                  </span>
                ) : proposal.resultsReady ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet/10 border border-violet/20 text-violet-light text-xs font-mono">
                    <Shield className="w-3 h-3" />
                    REVEALED
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700 text-slate-400 text-xs font-mono">
                    ENDED
                  </span>
                )}
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/60 border border-slate-700 text-slate-400 text-xs">
                  <Tag className="w-3 h-3" />
                  {proposal.category}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-white mb-3 leading-snug">
                {proposal.title}
              </h1>
              <p className="text-slate-400 leading-relaxed text-sm mb-5">
                {proposal.description}
              </p>

              {/* Meta */}
              <div className="flex flex-wrap gap-5 text-sm text-slate-500 border-t border-white/[0.05] pt-4">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {Number(proposal.voterCount)} voters
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {isActive ? <Countdown endTime={proposal.endTime} /> : "Voting ended"}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-xs">
                  By: {formatAddress(proposal.proposer)}
                </span>
              </div>
            </motion.div>

            {/* Vote tallies */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">
                  {proposal.resultsReady ? "Final Results" : "Live Tally"}
                </h2>
                {!proposal.resultsReady && (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
                    <Lock className="w-3 h-3" />
                    FHE encrypted
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                <EncryptedCounter
                  value={proposal.resultsReady ? proposal.forVotes : 0n}
                  revealed={proposal.resultsReady}
                  label="FOR"
                  color="violet"
                />
                <EncryptedCounter
                  value={proposal.resultsReady ? proposal.againstVotes : 0n}
                  revealed={proposal.resultsReady}
                  label="AGAINST"
                  color="rose"
                />
                <EncryptedCounter
                  value={proposal.resultsReady ? proposal.abstainVotes : 0n}
                  revealed={proposal.resultsReady}
                  label="ABSTAIN"
                  color="amber"
                />
              </div>

              {/* Win bar */}
              {proposal.resultsReady && (
                (() => {
                  const total = Number(proposal.forVotes + proposal.againstVotes + proposal.abstainVotes);
                  const forPct = total > 0 ? Math.round(Number(proposal.forVotes) / total * 100) : 0;
                  const passed = forPct >= 50;
                  return (
                    <div>
                      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                        <span>FOR {forPct}%</span>
                        <span className={passed ? "text-emerald font-semibold" : "text-rose font-semibold"}>
                          {passed ? "PASSED ✓" : "REJECTED ✗"}
                        </span>
                        <span>AGAINST {100 - forPct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${forPct}%` }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          className={`h-full rounded-full ${passed ? "bg-emerald" : "bg-rose"}`}
                        />
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Encryption proof note */}
              {!proposal.resultsReady && (
                <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-white/[0.04] text-xs text-slate-600 leading-relaxed font-mono">
                  The contract holds three <span className="text-violet-light">euint32</span> handles — encrypted running totals.
                  Votes are homomorphically added via <span className="text-violet-light">FHE.add()</span>.
                  Results will be decrypted by the Fhenix oracle after voting ends.
                </div>
              )}
            </motion.div>

            {/* Resolve button */}
            {canResolve && !isDemoMode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass rounded-2xl p-5 border border-cyan/20 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-white mb-0.5">Voting has ended</p>
                  <p className="text-xs text-slate-500">Resolve to initiate FHE decryption of vote totals.</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={resolve}
                  disabled={isResolving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan/10 border border-cyan/30 text-cyan text-sm font-medium hover:bg-cyan/20 transition-all disabled:opacity-50"
                >
                  {isResolving ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Resolving…</>
                  ) : (
                    <><Shield className="w-4 h-4" /> Resolve & Decrypt</>
                  )}
                </motion.button>
              </motion.div>
            )}

            {/* FHE analytics — visible after resolution */}
            {proposal.resolved && (
              <FHEAnalyticsPanel
                proposal={proposal}
                onCompute={isDemoMode ? undefined : compute}
                isComputing={isComputing || computeSuccess}
                analyticsAddress={analyticsAddress || undefined}
              />
            )}
          </div>

          {/* ── Right: vote panel ────────────────────────────────────────── */}
          <div className="space-y-5">
            {isConnected || isDemoMode ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <VotePanel
                  proposalId={proposalId}
                  hasVoted={hasVoted}
                  isActive={isActive}
                  onVote={castVote}
                  stage={stage}
                  errMsg={errMsg}
                />
              </motion.div>
            ) : (
              <div className="glass rounded-2xl p-6 text-center border border-white/[0.06]">
                <Shield className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm mb-4">Connect your wallet to vote</p>
                <p className="text-xs text-slate-600">
                  Your vote will be encrypted locally before submission
                </p>
              </div>
            )}

            {/* Coercion-resistance proof — shown after a successful vote */}
            {stage === "success" && lastChoice && (
              <CoercionProofPanel votedFor={lastChoice} />
            )}

            {/* GhostVoter SBT badge */}
            <VoterBadge
              hasNFT={hasNFT}
              tokenId={tokenId}
              voteCount={voteCount}
              whaleWatcher={whaleWatcher}
            />

            {/* Private delegation */}
            {isActive && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <DelegationPanel
                  hasDelegated={hasDelegated}
                  delegatedTo={delegatedTo}
                  delegatedWeight={delegatedWeight}
                  onDelegate={async (to, weight) => delegate(to, weight, { data: "0x", securityZone: "0x0000000000000000000000000000000000000000000000000000000000000000" })}
                  onRevoke={async () => revoke()}
                  isPending={isDelegating}
                  isRevoking={isRevoking}
                  isDemoMode={isDemoMode}
                />
              </motion.div>
            )}

            {/* Live vote feed */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <LiveVoteFeed proposalId={proposalId} isDemoMode={isDemoMode} />
            </motion.div>

            {/* FHE technical card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-2xl p-5 border border-violet/[0.12]"
            >
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-violet-light" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">FHE Guarantee</h3>
              </div>
              <div className="space-y-2 text-xs text-slate-500 leading-relaxed font-mono">
                <p><span className="text-violet-light">Client:</span> enc(w,0,0) | enc(0,w,0) | enc(0,0,w)</p>
                <p><span className="text-violet-light">Contract:</span> FHE.add(total, vote)</p>
                <p><span className="text-violet-light">Analytics:</span> FHE.sub(for, against)</p>
                <p><span className="text-violet-light">Result:</span> FHE.publishDecryptResult</p>
                <p><span className="text-violet-light">Privacy:</span> direction ≡ ciphertext ← unreadable</p>
              </div>
            </motion.div>

            {/* Fhenix link */}
            <a
              href="https://docs.fhenix.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 rounded-xl glass border border-white/[0.06] text-xs text-slate-500 hover:text-white hover:border-violet/30 transition-all group"
            >
              <span>Learn about Fhenix FHE</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:text-violet-light" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
