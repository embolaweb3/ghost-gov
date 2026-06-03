"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Loader2, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { useCreateProposal } from "@/hooks/useVeilDAO";

interface Props {
  open:    boolean;
  onClose: () => void;
}

const CATEGORIES = ["Protocol", "Treasury", "Security", "Community", "Other"];
const DURATIONS  = [
  { label: "5 minutes (demo)",  value: 300      },
  { label: "1 hour",            value: 3600     },
  { label: "1 day",             value: 86400    },
  { label: "3 days",            value: 259200   },
  { label: "7 days",            value: 604800   },
];

export function CreateProposalModal({ open, onClose }: Props) {
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [category,    setCategory]    = useState("Protocol");
  const [duration,    setDuration]    = useState(300);

  const { createProposal, isPending, isConfirming, isSuccess } = useCreateProposal();

  useEffect(() => {
    if (!isSuccess) return;
    const t = setTimeout(onClose, 1500);
    return () => clearTimeout(t);
  }, [isSuccess, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    createProposal(title.trim(), description.trim(), category, duration);
  };

  const isBusy = isPending || isConfirming;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="glass gradient-border rounded-2xl w-full max-w-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-violet-light" />
                  </div>
                  <h2 className="font-semibold text-white">New Proposal</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              {isSuccess ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-6 py-10 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-emerald/10 border border-emerald/30 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-7 h-7 text-emerald" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Proposal Created!</h3>
                  <p className="text-slate-400 text-sm mb-5">
                    Your proposal is live. FHE voting is now open.
                  </p>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 rounded-xl bg-violet text-white font-medium text-sm"
                  >
                    View Proposals
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. Allocate 50 ETH for security audit"
                      maxLength={120}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet/50 transition-colors"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Full proposal details, rationale, and expected impact..."
                      rows={4}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet/50 transition-colors resize-none"
                    />
                  </div>

                  {/* Category + Duration */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Category</label>
                      <div className="relative">
                        <select
                          value={category}
                          onChange={e => setCategory(e.target.value)}
                          className="w-full appearance-none bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet/50 transition-colors"
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Voting Duration</label>
                      <div className="relative">
                        <select
                          value={duration}
                          onChange={e => setDuration(Number(e.target.value))}
                          className="w-full appearance-none bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet/50 transition-colors"
                        >
                          {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Once created, votes are encrypted with FHE. Individual ballots are mathematically unreadable until the voting period ends — only aggregate totals are ever revealed.
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="submit"
                      disabled={!title || !description || isBusy}
                      whileHover={title && description && !isBusy ? { scale: 1.02 } : {}}
                      whileTap={{ scale: 0.98 }}
                      className={clsx(
                        "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                        title && description && !isBusy
                          ? "bg-violet text-white glow-violet"
                          : "bg-white/5 text-slate-600 cursor-not-allowed"
                      )}
                    >
                      {isBusy ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Creating…
                        </span>
                      ) : (
                        "Create Proposal"
                      )}
                    </motion.button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
