"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, ChevronDown, AlertTriangle, X, RefreshCw, Lock } from "lucide-react";
import { clsx } from "clsx";
import { formatEther, parseEther } from "viem";

const DIRECTIONS = ["FOR", "AGAINST", "ABSTAIN"] as const;

interface BribeInfo {
  bribeId:    bigint;
  direction:  number;
  totalFunds: bigint;
  briber:     string;
  active:     boolean;
  claimCount: bigint;
}

interface Props {
  proposalId:     bigint;
  bribes:         BribeInfo[];
  hasVoted:       boolean;
  isDemoMode:     boolean;
  isCreating:     boolean;
  isClaiming:     boolean;
  isCancelling:   boolean;
  onCreateBribe:  (direction: 0 | 1 | 2, amountEth: string) => Promise<void>;
  onAttemptClaim: (bribeId: bigint) => Promise<void>;
  onCancelBribe:  (bribeId: bigint) => Promise<void>;
}

function formatAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const DIRECTION_COLORS = {
  0: { text: "text-emerald", bg: "bg-emerald/10", border: "border-emerald/20" },
  1: { text: "text-rose",    bg: "bg-rose/10",    border: "border-rose/20"    },
  2: { text: "text-amber",   bg: "bg-amber/10",   border: "border-amber/20"   },
} as const;

export function BribeMonitor({
  proposalId, bribes, hasVoted, isDemoMode,
  isCreating, isClaiming, isCancelling,
  onCreateBribe, onAttemptClaim, onCancelBribe,
}: Props) {
  const [expanded,      setExpanded]      = useState(false);
  const [showForm,      setShowForm]      = useState(false);
  const [targetDir,     setTargetDir]     = useState<0 | 1 | 2>(0);
  const [amountEth,     setAmountEth]     = useState("0.001");
  const [amountErr,     setAmountErr]     = useState("");
  const [activeClaiming, setActiveClaiming] = useState<bigint | null>(null);

  const handleCreate = async () => {
    const parsed = parseFloat(amountEth);
    if (isNaN(parsed) || parsed <= 0) { setAmountErr("Enter a valid ETH amount"); return; }
    setAmountErr("");
    await onCreateBribe(targetDir, amountEth);
    setShowForm(false);
  };

  const handleClaim = async (bribeId: bigint) => {
    setActiveClaiming(bribeId);
    await onAttemptClaim(bribeId);
    setActiveClaiming(null);
  };

  const activeBribes = bribes.filter(b => b.active);

  return (
    <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-rose" />
          <span className="text-sm font-semibold text-white">Bribe Monitor</span>
          {activeBribes.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose/10 border border-rose/20 text-rose">
              {activeBribes.length} ACTIVE
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
              {/* Explanation */}
              <div className="flex items-start gap-1.5 text-[11px] font-mono text-slate-600 leading-relaxed">
                <Lock className="w-3 h-3 mt-0.5 flex-shrink-0 text-rose/50" />
                <span>
                  Bribe funds are{" "}
                  <span className="text-rose">permanently locked</span>.{" "}
                  FHE.eq cannot settle — vote direction is an encrypted handle the bribe contract can never read.
                  Only the briber can cancel explicitly.
                </span>
              </div>

              {/* Active bribes */}
              {activeBribes.length > 0 ? (
                <div className="space-y-2">
                  {activeBribes.map(b => {
                    const colors = DIRECTION_COLORS[b.direction as 0 | 1 | 2];
                    return (
                      <div
                        key={b.bribeId.toString()}
                        className={clsx("p-3 rounded-xl border space-y-2", colors.bg, colors.border)}
                      >
                        <div className="flex items-center justify-between">
                          <span className={clsx("text-[10px] font-mono font-bold", colors.text)}>
                            {DIRECTIONS[b.direction]} bribe
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            by {formatAddr(b.briber)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-white font-semibold">{formatEther(b.totalFunds)} ETH locked</span>
                          <span className="text-slate-500">{Number(b.claimCount)} failed claim{Number(b.claimCount) !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex gap-2">
                          {hasVoted && (
                            <motion.button
                              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                              onClick={() => handleClaim(b.bribeId)}
                              disabled={isClaiming || isDemoMode}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-slate-400 hover:text-white transition-all disabled:opacity-50"
                            >
                              {isClaiming && activeClaiming === b.bribeId
                                ? <><RefreshCw className="w-3 h-3 animate-spin" /> Attempting…</>
                                : "Attempt claim (will fail)"}
                            </motion.button>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            onClick={() => onCancelBribe(b.bribeId)}
                            disabled={isCancelling || isDemoMode}
                            className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-rose/8 border border-rose/20 text-[10px] font-mono text-rose hover:bg-rose/15 transition-all disabled:opacity-50"
                          >
                            <X className="w-3 h-3" /> Cancel
                          </motion.button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-700 font-mono text-center py-2">No active bribes on this proposal</p>
              )}

              {/* Create bribe form */}
              {!showForm ? (
                <motion.button
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setShowForm(true)}
                  disabled={isDemoMode}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-rose/20 bg-rose/5 text-rose text-xs font-medium hover:bg-rose/10 transition-all disabled:opacity-40"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Simulate bribe attack
                </motion.button>
              ) : (
                <div className="space-y-3 p-3 rounded-xl bg-rose/5 border border-rose/20">
                  <p className="text-[10px] text-rose font-mono">This bribe will fail — for demonstration only</p>

                  {/* Direction selector */}
                  <div className="grid grid-cols-3 gap-2">
                    {([0, 1, 2] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setTargetDir(d)}
                        className={clsx(
                          "py-1.5 rounded-lg border text-[10px] font-mono transition-all",
                          targetDir === d
                            ? `${DIRECTION_COLORS[d].border} ${DIRECTION_COLORS[d].bg} ${DIRECTION_COLORS[d].text}`
                            : "border-white/[0.06] text-slate-500 hover:border-white/20"
                        )}
                      >{DIRECTIONS[d]}</button>
                    ))}
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="ETH amount (e.g. 0.001)"
                      value={amountEth}
                      onChange={e => { setAmountEth(e.target.value); setAmountErr(""); }}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-white/[0.08] text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-rose/40 transition-colors"
                    />
                    {amountErr && <p className="mt-1 text-[10px] text-rose font-mono">{amountErr}</p>}
                  </div>

                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                      onClick={handleCreate}
                      disabled={isCreating}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-rose/10 border border-rose/30 text-rose text-[10px] font-medium hover:bg-rose/20 transition-all disabled:opacity-50"
                    >
                      {isCreating
                        ? <><RefreshCw className="w-3 h-3 animate-spin" /> Creating…</>
                        : "Lock ETH (doomed to fail)"}
                    </motion.button>
                    <button
                      onClick={() => setShowForm(false)}
                      className="px-3 py-2 rounded-lg border border-white/[0.06] text-slate-500 text-[10px] hover:text-white transition-colors"
                    >Cancel</button>
                  </div>
                </div>
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
