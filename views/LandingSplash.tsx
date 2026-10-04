import React from 'react';
import { ArrowRight, Briefcase, TrendingUp, ShieldCheck, Network, Calculator, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const LandingSplash = ({ onEnter }: { onEnter: () => void }) => {
    return (
        <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[100] bg-slate-950 text-white font-sans flex flex-col justify-between overflow-y-auto sm:overflow-hidden select-none"
        >
            {/* Ambient Background Lights */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] max-w-[500px] max-h-[500px] bg-primary/25 blur-[100px] rounded-full animate-pulse-slow"></div>
                <div className="absolute top-[35%] -right-[10%] w-[45vw] h-[55vw] max-w-[450px] max-h-[550px] bg-purple-600/20 blur-[100px] rounded-full animate-pulse-slow delay-1000"></div>
                {/* Modern subtle grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_75%_75%_at_50%_50%,#000_65%,transparent_100%)]"></div>
            </div>

            {/* Viewport Container: Fits within 100dvh on mobile without scrolling */}
            <div className="relative z-10 w-full max-w-2xl mx-auto min-h-[100dvh] flex flex-col justify-between items-center px-4 py-4 sm:py-8">
                
                {/* TOP BRANDING & BADGE */}
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="flex flex-col items-center shrink-0 pt-2 sm:pt-4 text-center"
                >
                    {/* Sleek Minimalist Logo */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-tr from-primary via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.35)] border border-white/20 mb-3 relative">
                        <TrendingUp className="text-white relative z-10 w-6 h-6 sm:w-7 sm:h-7 stroke-[2]" />
                        <div className="absolute inset-0 bg-white/10 rounded-[inherit] blur-xs"></div>
                    </div>
                    
                    {/* Title */}
                    <h1 className="font-semibold text-3xl sm:text-4xl md:text-5xl tracking-tight leading-none mb-2">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-300">B-Quadrant</span>{' '}
                        <span className="text-primary font-medium">OS</span>
                    </h1>

                    {/* Tagline Pill */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-indigo-300 text-[10px] sm:text-xs font-medium tracking-wide">
                        <Sparkles size={11} className="text-primary" />
                        <span>The Operating System for Entrepreneurial Wealth</span>
                    </div>
                </motion.div>

                {/* CENTRAL VALUE PROPOSITION */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                    className="w-full flex flex-col items-center justify-center text-center my-3 sm:my-5 max-w-xl"
                >
                    {/* Clean Frosted Card */}
                    <div className="w-full bg-white/[0.04] border border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-xl text-center space-y-3">
                        <p className="text-gray-300 font-normal text-sm sm:text-base leading-relaxed">
                            Most finance apps are glorified expense trackers built for employees. <br className="hidden sm:inline"/>
                            <span className="text-white font-medium">You are a founder building real equity.</span>
                        </p>
                        <p className="text-gray-400 font-light text-xs sm:text-sm leading-relaxed border-t border-white/5 pt-3">
                            The single source of truth for your entire wealth structure: visualize <strong className="text-gray-200 font-medium">ownership stakes</strong>, calculate <strong className="text-gray-200 font-medium">real-time valuations</strong>, and manage inter-company cashflows.
                        </p>

                        {/* Quadrant Tags */}
                        <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-0.5 rounded-full">
                                <Briefcase size={12} /> Business (B)
                            </span>
                            <span className="text-gray-600 text-xs">•</span>
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-400 bg-indigo-950/40 border border-indigo-800/40 px-2.5 py-0.5 rounded-full">
                                <TrendingUp size={12} /> Investor (I)
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* FOOTER: Guaranteed Visible Action Button */}
                <motion.div 
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
                    className="w-full flex flex-col items-center shrink-0 pb-3 sm:pb-4"
                >
                    <button 
                        onClick={onEnter}
                        className="group relative w-full sm:w-auto min-w-[260px] bg-white text-slate-950 rounded-xl font-medium text-sm sm:text-base py-3 px-6 sm:px-8 hover:bg-gray-100 transition-all flex items-center justify-center gap-2 active:scale-98 shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:shadow-[0_0_35px_rgba(255,255,255,0.4)]"
                    >
                        <span className="tracking-tight font-semibold">Enter Operating System</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>

                    {/* Micro Features / Trust Bar */}
                    <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-gray-400 font-normal">
                        <span className="flex items-center gap-1">
                            <Network size={12} className="text-primary" /> Entity Ledgers
                        </span>
                        <span className="text-gray-700">•</span>
                        <span className="flex items-center gap-1">
                            <Calculator size={12} className="text-purple-400" /> Live Multipliers
                        </span>
                        <span className="text-gray-700">•</span>
                        <span className="flex items-center gap-1">
                            <ShieldCheck size={12} className="text-emerald-400" /> Zero-Sum Auditing
                        </span>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};
