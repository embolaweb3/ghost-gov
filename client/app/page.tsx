"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Lock, Eye, ArrowRight, Zap, Users, ChevronDown, ShieldCheck, Vote } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { ParticleField } from "@/components/ParticleField";
import { ProposalCard } from "@/components/ProposalCard";
import { useProposals } from "@/hooks/useVeilDAO";

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Lock,
    title: "You Choose",
    desc:  "Select FOR, AGAINST, or ABSTAIN. Your browser encrypts the vote using FHE before it ever leaves your device.",
    color: "violet",
  },
  {
    step: "02",
    icon: Shield,
    title: "Blockchain Tallies Blindly",
    desc:  "The smart contract adds your encrypted vote to the running total without seeing what you voted. The tally itself stays encrypted.",
    color: "cyan",
  },
  {
    step: "03",
    icon: Eye,
    title: "Only Totals Are Revealed",
    desc:  "After voting ends, only the aggregate results are decrypted. Individual votes are mathematically impossible to recover.",
    color: "emerald",
  },
];

const WHY_IT_MATTERS = [
  {
    icon: ShieldCheck,
    title: "Kills Vote Buying",
    desc:  "You cannot prove how you voted — making bribery worthless. The attacker pays but gets no guarantee.",
  },
  {
    icon: Users,
    title: "Coercion-Resistant",
    desc:  "Even under duress, you can't reveal your encrypted ballot. The FHE ciphertext is randomised and unlinkable to any choice.",
  },
  {
    icon: Zap,
    title: "Fully On-Chain",
    desc:  "No off-chain oracle, no trusted third party. Votes are aggregated homomorphically on Fhenix — verifiable by anyone.",
  },
  {
    icon: Vote,
    title: "Drop-In for DAOs",
    desc:  "Compatible with standard DAO token weights and quorum rules. Private voting as a primitive, not a custom solution.",
  },
];

export default function HomePage() {
  const { proposals } = useProposals();
  const previewProposals = proposals.slice(0, 2);

  return (
    <div className="min-h-screen">
      <NavBar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        {/* Particle canvas fills hero */}
        <div className="absolute inset-0 opacity-60">
          <ParticleField />
        </div>

        {/* Hero content */}
        <motion.div
          className="relative z-10 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-violet/30 text-xs font-mono text-violet-light mb-8"
          >
            <Shield className="w-3.5 h-3.5" />
            Powered by Fhenix Fully Homomorphic Encryption
            <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
          </motion.div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 leading-[0.95]">
            Vote.{" "}
            <span className="text-gradient">Vanish.</span>
            <br />
            Count.
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-4 leading-relaxed">
            GhostGov encrypts every ballot <strong className="text-white">in your browser</strong> using FHE.
            The contract tallies votes <strong className="text-white">without ever seeing them</strong>.
            Bribery becomes mathematically pointless.
          </p>

          {/* Technical proof */}
          <p className="text-sm text-slate-600 font-mono mb-10">
            enc(1) + enc(0) + enc(0) → aggregate • individual votes provably unrecoverable
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/dao"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-violet text-white font-semibold text-sm glow-violet transition-all"
              >
                View Live Proposals
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/propose"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl glass border border-white/[0.1] text-white font-semibold text-sm hover:border-violet/40 transition-all"
              >
                <Shield className="w-4 h-4" />
                Create Proposal
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <ChevronDown className="w-5 h-5 text-slate-600" />
        </motion.div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="py-24 px-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-violet-light font-mono text-sm mb-3">The Protocol</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            How FHE Voting Works
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc, color }, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="glass gradient-border rounded-2xl p-6"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-${color}/10 border border-${color}/20 flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 text-${color}-light`} />
                </div>
                <span className={`text-4xl font-black text-${color}/20 font-mono`}>{step}</span>
              </div>
              <h3 className="text-white font-semibold mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Why it matters ───────────────────────────────────────────────── */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-cyan font-mono text-sm mb-3">Coercion Resistance</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Why DAOs Need This Now
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-5">
          {WHY_IT_MATTERS.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass glass-hover rounded-xl p-5 flex gap-4"
            >
              <div className="w-9 h-9 rounded-lg bg-violet/10 border border-violet/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4.5 h-4.5 text-violet-light" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1 text-sm">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Live proposals preview ────────────────────────────────────────── */}
      <section className="py-16 px-4 max-w-6xl mx-auto pb-32">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-slate-500 font-mono text-xs mb-1">Active votes</p>
            <h2 className="text-2xl font-bold text-white">Live Proposals</h2>
          </div>
          <Link
            href="/dao"
            className="flex items-center gap-1.5 text-sm text-violet-light hover:text-white transition-colors"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {previewProposals.map((p, i) => (
            <ProposalCard key={p.id.toString()} proposal={p} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
