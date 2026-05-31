"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, ChevronDown, Lock, RefreshCw, Eye, EyeOff } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  proposalId:      bigint;
  isGuardian:      boolean;
  vetoSubmitted:   boolean;
  vetoSettled:     boolean;
  vetoResult:      boolean;
  vetoGuardian:    string | undefined;
  isDemoMode:      boolean;
  isSubmitting:    boolean;
  onSubmitVeto:    (vote: 0 | 1) => Promise<void>; // 0=pass, 1=veto
}

function formatAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function VetoStatus({
  proposalId, isGuardian, vetoSubmitted, vetoSettled, vetoResult,
  vetoGuardian, isDemoMode, isSubmitting, onSubmitVeto,
}: Props) {
  const [expanded,    setExpanded]    = useState(false);
  const [showVetoed,  setShowVetoed]  = useState(false);
  const [pendingVote, setPendingVote] = useState<0 | 1 | null>(null);

  const handleSubmit = async (v: 0 | 1) => {
    setPendingVote(v);
    await onSubmitVeto(v);
    setPendingVote(null);
  };

  const statusLabel = !vetoSubmitted
    ? "No veto submitted"
    : !vetoSettled
      ? "Veto pending oracle decryption…"
      : vetoResult
        ? "VETOED"
        : "Veto not exercised";

  const statusColor = !vetoSubmitted
    ? "text-slate-500"
    : !vetoSettled
      ? "text-amber"
      : vetoResult
        ? "text-rose"
        : "text-emerald";

  const badgeColor = !vetoSubmitted
    ? ""
    : !vetoSettled
      ? "bg-amber/10 border-amber/20 text-amber"
      : vetoResult
        ? "bg-rose/10 border-rose/20 text-rose"
        : "bg-emerald/10 border-emerald/20 text-emerald";

  return (
    <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber" />
          <span className="text-sm font-semibold text-white">Guardian Veto</span>
          {vetoSubmitted && (
            <span className={clsx("text-[10px] font-mono px-1.5 py-0.5 rounded border", badgeColor)}>
              {!vetoSettled ? "PENDING" : vetoResult ? "VETOED" : "PASSED"}
            </span>
          )}
        </div>
        <ChevronDown className={clsx("w-4 h-4 text-slate-500 transition-transform", expanded && "rotate-180")} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {/* Privacy note */}
              <div className="flex items-start gap-1.5 text-[11px] font-mono text-slate-600 leading-relaxed">
                <Lock className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber/50" />
                <span>
                  Guardian intent is{" "}
                  <span className="text-amber">encrypted until oracle decryption</span>.
                  Identity is public; direction is hidden — eliminating lobbying before the veto settles.
                </span>
              </div>

              {/* Current status */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.04] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Status</span>
                  <span className={statusColor}>{statusLabel}</span>
                </div>
                {vetoSubmitted && vetoGuardian && (
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Guardian</span>
                    <span className="text-slate-400">{formatAddr(vetoGuardian)}</span>
                  </div>
                )}
                {vetoSubmitted && !vetoSettled && (
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Direction</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-700">
                        {showVetoed ? "Still encrypted — oracle pending" : "???? encrypted"}
                      </span>
                      <button onClick={() => setShowVetoed(v => !v)} className="text-slate-600 hover:text-slate-400">
                        {showVetoed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Guardian section */}
              {isGuardian && !vetoSubmitted && (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-500 font-mono">You are a guardian. Submit your encrypted veto decision:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handleSubmit(0)}
                      disabled={isSubmitting || isDemoMode}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald/30 bg-emerald/8 text-emerald text-xs font-medium hover:bg-emerald/15 transition-all disabled:opacity-50"
                    >
                      {isSubmitting && pendingVote === 0
                        ? <><RefreshCw className="w-3 h-3 animate-spin" /> Encrypting…</>
                        : "Enc(0) — Pass"}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handleSubmit(1)}
                      disabled={isSubmitting || isDemoMode}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-rose/30 bg-rose/8 text-rose text-xs font-medium hover:bg-rose/15 transition-all disabled:opacity-50"
                    >
                      {isSubmitting && pendingVote === 1
                        ? <><RefreshCw className="w-3 h-3 animate-spin" /> Encrypting…</>
                        : "Enc(1) — Veto"}
                    </motion.button>
                  </div>
                  <p className="text-[9px] text-slate-700 font-mono text-center">
                    Both produce identical-looking ciphertexts on-chain
                  </p>
                </div>
              )}

              {isGuardian && vetoSubmitted && (
                <p className="text-[10px] text-slate-600 font-mono text-center">
                  Your encrypted veto is on-chain. Outcome hidden until oracle decryption.
                </p>
              )}

              {!isGuardian && !vetoSubmitted && (
                <p className="text-[10px] text-slate-700 font-mono text-center">
                  Only guardians can submit a veto
                </p>
              )}

              {isDemoMode && (
                <p className="text-[10px] text-slate-700 text-center font-mono">connect wallet to interact</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
