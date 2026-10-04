import React from 'react';
import { ArrowRight, Briefcase, TrendingUp, ShieldCheck, Wallet, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const LandingSplash = ({ onEnter }: { onEnter: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97, filter: 'blur(8px)' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] bg-[#02081b] text-white font-sans flex flex-col justify-between overflow-y-auto sm:overflow-hidden select-none"
    >
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.18),transparent_26%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-40 [mask-image:radial-gradient(ellipse_78%_78%_at_50%_45%,#000_58%,transparent_100%)]"></div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col justify-between px-4 py-5 sm:px-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="pt-2 text-center sm:pt-4"
        >
          <div className="mx-auto mb-5 flex w-full max-w-[560px] items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.04] p-3 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-4">
            <img
              src="/brand/bquadrant-lockup.png"
              alt="B-Quadrant OS"
              className="h-auto w-full max-w-[440px] object-contain"
            />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium tracking-wide text-cyan-100 sm:text-xs">
            <Sparkles size={12} className="text-cyan-300" />
            <span>See your money clearly. Make your next move with confidence.</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.12, ease: 'easeOut' }}
          className="mx-auto my-4 w-full max-w-2xl rounded-[28px] border border-white/10 bg-white/[0.05] p-5 text-center shadow-[0_18px_60px_rgba(0,0,0,0.32)] backdrop-blur-md sm:p-7"
        >
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">Simple in front. Powerful underneath.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Track personal money and business money in one place. Follow cash flow, assets, ownership, and your move from <strong className="font-semibold text-white">B</strong> to <strong className="font-semibold text-cyan-300">I</strong> without a crowded screen.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-2.5 text-left sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-3.5">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300"><Wallet size={18} /></div>
              <p className="text-sm font-semibold text-white">Quick glance first</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">See the key numbers fast before opening deeper reports.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-3.5">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300"><Briefcase size={18} /></div>
              <p className="text-sm font-semibold text-white">Built for owners</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Manage personal, business, and team money from one workspace.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-3.5">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300"><TrendingUp size={18} /></div>
              <p className="text-sm font-semibold text-white">Grow to the I side</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Use clear numbers to make better business and investment decisions.</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.24, ease: 'easeOut' }}
          className="pb-3 text-center sm:pb-4"
        >
          <button
            onClick={onEnter}
            className="group mx-auto flex min-h-[52px] w-full max-w-[320px] items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_24px_rgba(255,255,255,0.22)] transition-all hover:bg-slate-100 hover:shadow-[0_0_34px_rgba(255,255,255,0.32)] active:scale-[0.99] sm:text-base"
          >
            <span>Open B-Quadrant OS</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-emerald-400" /> Clear structure</span>
            <span className="hidden text-slate-600 sm:inline">•</span>
            <span className="flex items-center gap-1"><Briefcase size={12} className="text-indigo-300" /> Business + personal</span>
            <span className="hidden text-slate-600 sm:inline">•</span>
            <span className="flex items-center gap-1"><TrendingUp size={12} className="text-cyan-300" /> Better decisions</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
