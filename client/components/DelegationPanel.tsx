"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, X, Lock, RefreshCw, ChevronDown, Shield } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  hasDelegated:   boolean;
  delegatedTo?:   string;
  delegatedWeight?: number;
  onDelegate:     (to: `0x${string}`, weight: 1 | 2 | 4) => Promise<void>;
  onRevoke:       () => Promise<void>;
  isPending:      boolean;
  isRevoking:     boolean;
  isDemoMode:     boolean;
}

const WEIGHTS: { value: 1 | 2 | 4; label: string; cost: string }[] = [
  { value: 1, label: "1×", cost: "free"       },
  { value: 2, label: "2×", cost: "0.0004 ETH" },
  { value: 4, label: "4×", cost: "0.0016 ETH" },
];

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function DelegationPanel({
  hasDelegated, delegatedTo, delegatedWeight,
  onDelegate, onRevoke, isPending, isRevoking, isDemoMode,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [toAddr,   setToAddr]   = useState("");
  const [weight,   setWeight]   = useState<1 | 2 | 4>(1);
  const [addrErr,  setAddrErr]  = useState("");

  const handleDelegate = async () => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(toAddr)) {
      setAddrErr("Invalid address");
      return;
    }
    setAddrErr("");
    await onDelegate(toAddr as `0x${string}`, weight as 1 | 2 | 4);
  };

  return (
    <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-violet-light" />
          <span className="text-sm font-semibold text-white">Private Delegation</span>
          {hasDelegated && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald/10 border border-emerald/20 text-emerald">
              ACTIVE
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
                <Lock className="w-3 h-3 mt-0.5 flex-shrink-0 text-cyan/50" />
                <span>
                  Delegate's total power is an{" "}
                  <span className="text-cyan">encrypted handle</span>.
                  They hold it but cannot read the aggregate without the oracle.
                  Revocation subtracts your weight silently via{" "}
                  <span className="text-violet-light">FHE.sub</span>.
                </span>
              </div>

              {hasDelegated ? (
                /* Active delegation — show status + revoke */
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald/5 border border-emerald/20 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Delegated to</span>
                      <span className="text-emerald">{delegatedTo ? formatAddress(delegatedTo) : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Weight locked</span>
                      <span className="text-violet-light">{delegatedWeight}×</span>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onRevoke}
                    disabled={isRevoking || isDemoMode}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose/30 bg-rose/8 text-rose text-xs font-medium hover:bg-rose/15 transition-all disabled:opacity-50"
                  >
                    {isRevoking ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Revoking…</>
                    ) : (
                      <><X className="w-3.5 h-3.5" /> Revoke delegation (FHE.sub)</>
                    )}
                  </motion.button>
                </div>
              ) : (
                /* No delegation — show form */
                <div className="space-y-3">
                  {/* Address input */}
                  <div>
                    <input
                      type="text"
                      placeholder="Delegate address (0x…)"
                      value={toAddr}
                      onChange={e => { setToAddr(e.target.value); setAddrErr(""); }}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900/60 border border-white/[0.08] text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan/40 transition-colors"
                    />
                    {addrErr && <p className="mt-1 text-[10px] text-rose font-mono">{addrErr}</p>}
                  </div>

                  {/* Weight selector */}
                  <div className="grid grid-cols-3 gap-2">
                    {WEIGHTS.map(w => (
                      <button
                        key={w.value}
                        onClick={() => setWeight(w.value)}
                        className={clsx(
                          "py-2 rounded-xl border text-xs font-mono transition-all",
                          weight === w.value
                            ? "border-violet/50 bg-violet/15 text-violet-light"
                            : "border-white/[0.06] bg-white/[0.02] text-slate-500 hover:border-violet/30"
                        )}
                      >
                        <div className="font-bold">{w.label}</div>
                        <div className="text-[9px] opacity-70">{w.cost}</div>
                      </button>
                    ))}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDelegate}
                    disabled={isPending || isDemoMode}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-violet/30 bg-violet/10 text-violet-light text-xs font-medium hover:bg-violet/20 transition-all disabled:opacity-50"
                  >
                    {isPending ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Delegating…</>
                    ) : (
                      <><Share2 className="w-3.5 h-3.5" /> Delegate via FHE.add + FHE.min</>
                    )}
                  </motion.button>

                  {isDemoMode && (
                    <p className="text-[10px] text-slate-700 text-center font-mono">
                      connect wallet to delegate
                    </p>
                  )}
                </div>
              )}

              {/* Anti-whale note */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-700">
                <Shield className="w-3 h-3" />
                Anti-whale cap enforced via FHE.min — silently on ciphertext
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
