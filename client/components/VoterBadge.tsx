"use client";

import { motion } from "framer-motion";
import { Ghost, Zap } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  tokenId:      bigint | undefined;
  voteCount:    bigint | undefined;
  whaleWatcher: boolean;
  hasNFT:       boolean;
}

export function VoterBadge({ tokenId, voteCount, whaleWatcher, hasNFT }: Props) {
  if (!hasNFT) return null;

  const votes = Number(voteCount ?? 0n);
  const id    = Number(tokenId ?? 0n);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={clsx(
        "glass rounded-2xl p-4 border flex items-center gap-4",
        whaleWatcher
          ? "border-amber/30 bg-amber/[0.04]"
          : "border-white/[0.06]"
      )}
    >
      {/* Icon */}
      <div className={clsx(
        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
        whaleWatcher ? "bg-amber/15 border border-amber/30" : "bg-violet/10 border border-violet/20"
      )}>
        <Ghost className={clsx("w-5 h-5", whaleWatcher ? "text-amber" : "text-violet-light")} />
      </div>

      {/* Info */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs font-semibold text-white">GhostVoter #{id}</span>
          {whaleWatcher && (
            <span className="flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber/15 border border-amber/30 text-amber">
              <Zap className="w-2.5 h-2.5" /> Whale Watcher
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 font-mono">
          {votes} vote{votes !== 1 ? "s" : ""} cast · soulbound · direction encrypted
        </p>
      </div>

      {/* Progress to whale watcher */}
      {!whaleWatcher && (
        <div className="flex-shrink-0 text-right">
          <p className="text-[10px] text-slate-600 font-mono">{votes}/3 votes</p>
          <div className="w-12 h-1 rounded-full bg-slate-800 mt-1 overflow-hidden">
            <div
              className="h-full rounded-full bg-violet/60 transition-all"
              style={{ width: `${Math.min(votes / 3 * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
