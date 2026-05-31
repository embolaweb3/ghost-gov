"use client";

import { motion } from "framer-motion";
import { ShieldCheck, ShieldX, ShieldQuestion, Lock } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  hasReputation: boolean;
  tier:          number; // 0=unscored, 1=sybil, 2=legit
  isDemoMode:    boolean;
}

const TIERS = {
  0: {
    label:  "Unscored",
    sub:    "No reputation data — vote applies at full weight",
    icon:   ShieldQuestion,
    color:  "text-slate-500",
    bg:     "bg-slate-800/40",
    border: "border-white/[0.06]",
  },
  1: {
    label:  "Sybil Flagged",
    sub:    "Vote silently zeroed via FHE.min — undetectable by voter",
    icon:   ShieldX,
    color:  "text-rose",
    bg:     "bg-rose/[0.04]",
    border: "border-rose/20",
  },
  2: {
    label:  "Verified Participant",
    sub:    "Reputation confirmed — vote passes FHE gate at full weight",
    icon:   ShieldCheck,
    color:  "text-emerald",
    bg:     "bg-emerald/[0.04]",
    border: "border-emerald/20",
  },
} as const;

export function SybilScore({ hasReputation, tier, isDemoMode }: Props) {
  const t = TIERS[tier as 0 | 1 | 2] ?? TIERS[0];
  const Icon = t.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx("glass rounded-2xl p-4 border flex items-center gap-3", t.bg, t.border)}
    >
      <div className={clsx(
        "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border",
        t.bg, t.border
      )}>
        <Icon className={clsx("w-4 h-4", t.color)} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={clsx("text-xs font-semibold", t.color)}>{t.label}</span>
          <Lock className="w-2.5 h-2.5 text-slate-600" />
        </div>
        <p className="text-[10px] text-slate-600 font-mono leading-snug">{t.sub}</p>
      </div>

      {isDemoMode && (
        <span className="text-[9px] font-mono text-slate-700 flex-shrink-0">demo</span>
      )}
    </motion.div>
  );
}
