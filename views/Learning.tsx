import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { Card, Button } from '../components/Shared';
import { InsightCard } from '../components/InsightCard';
import { useAdaptiveIntelligence } from '../hooks/useAdaptiveIntelligence';
import { BookOpen, Lightbulb, GraduationCap, Compass, Layers, Sparkles, Download } from 'lucide-react';
import * as AIService from '../services/aiService';
import { downloadMasterManual } from '../services/manualService';

const Term = ({ title, desc }: { title: string; desc: string }) => (
  <div className="mb-4 last:mb-0">
    <h4 className="font-bold text-gray-800 dark:text-gray-200">{title}</h4>
    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{desc}</p>
  </div>
);

const LearningView = () => {
  const context = useContext(AppContext)!;
  const { data, metrics, activeProfileId, timeFilter } = context;
  const { context: learningCtx, learningAdvice } = useAdaptiveIntelligence(data, activeProfileId, metrics, timeFilter, context);

  const [dailyLesson, setDailyLesson] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLesson = async () => {
        setLoading(true);
        const lesson = await AIService.getPersonalizedLesson(data, metrics, activeProfileId, learningCtx);
        setDailyLesson(lesson);
        setLoading(false);
    };
    fetchLesson();
  }, [data.profile.financialKnowledge, activeProfileId, learningCtx]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-slate-900 to-indigo-900 p-8 rounded-2xl text-white shadow-xl gap-4 sm:gap-0">
         <div>
            <h2 className="text-3xl font-bold mb-2">B-Quadrant Philosophy</h2>
            <p className="text-indigo-200 max-w-xl">Master the mindset of the rich. Understanding the fundamental laws of cashflow is the prerequisite to true financial freedom.</p>
         </div>
         <button onClick={() => downloadMasterManual(data.profile.name)} className="bg-white/10 text-white hover:bg-white/20 border border-white/20 font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/50 active:scale-95 shrink-0 self-start mt-4 sm:mt-0">
            <Download size={18} />
            Download OS Master Guide
         </button>
      </div>

      {/* Real-time Dynamic Lesson */}
      <div className="mb-8">
        <InsightCard result={learningAdvice} />
      </div>

      {/* Daily AI Lesson */}
      <Card className="bg-gradient-to-r from-primary to-purple-600 text-white border-none shadow-xl">
          <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                  <Sparkles size={32} className="text-yellow-300" />
              </div>
              <div>
                  <h3 className="text-xl font-bold mb-2">Today's Lesson for {data.profile.name}</h3>
                  {loading ? (
                      <p className="animate-pulse">Consulting the mentors...</p>
                  ) : (
                      <div className="prose prose-invert max-w-none text-sm md:text-base">
                          <p className="leading-relaxed whitespace-pre-line">{dailyLesson}</p>
                      </div>
                  )}
              </div>
          </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quadrant Definitions */}
        <Card title="The Cashflow Quadrant (ESBI)" className="border-l-4 border-l-primary shadow-md">
            <div className="space-y-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 pb-2 border-b border-gray-100 dark:border-gray-800">
                    To escape the rat race, you must migrate from the left side (working for money) to the right side (owning systems and assets). 
                    <br/><br/>
                    <em>Highly recommended reading: "Rich Dad Poor Dad" by Robert Kiyosaki.</em>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                        <div className="w-8 h-8 rounded mb-2 bg-red-100 text-red-600 flex items-center justify-center font-bold">E</div>
                        <h4 className="font-bold text-red-900 dark:text-red-400">Employee</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">You trade time for money. You have a job. Security is high, leverage is zero.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30">
                        <div className="w-8 h-8 rounded mb-2 bg-yellow-100 text-yellow-600 flex items-center justify-center font-bold">S</div>
                        <h4 className="font-bold text-yellow-900 dark:text-yellow-400">Self-Employed</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">You own a job. If you stop working, income stops. It's an illusion of a business.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                        <div className="w-8 h-8 rounded mb-2 bg-green-100 text-green-600 flex items-center justify-center font-bold">B</div>
                        <h4 className="font-bold text-green-900 dark:text-green-400">Business Owner</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">You own a system. People work for you. You can leave for a year and it grows.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30">
                        <div className="w-8 h-8 rounded mb-2 bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">I</div>
                        <h4 className="font-bold text-indigo-900 dark:text-indigo-400">Investor</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Money works for you. Passive income from assets covers all expenses. Freedom.</p>
                    </div>
                </div>
            </div>
        </Card>

        {/* User Guide */}
        <Card title="OS Master Tools" className="shadow-md">
            <div className="space-y-5">
                <div className="flex gap-4 p-4 rounded-xl bg-gray-50 dark:bg-slate-800">
                    <Compass className="shrink-0 text-primary mt-1" />
                    <div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200">1. Freedom Ratio (Dashboard)</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Your ultimate metric. (Recurring Passive Income ÷ Living Expenses). When this hits 100%, you are financially free.</p>
                    </div>
                </div>
                <div className="flex gap-4 p-4 rounded-xl bg-gray-50 dark:bg-slate-800">
                    <Layers className="shrink-0 text-primary mt-1" />
                    <div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200">2. Bucket Hierarchy (Settings)</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">The rich do not commingle funds. Revenue is strictly divided into OPEX, Taxes, and Profit. Manage these directly in your Settings.</p>
                    </div>
                </div>
                 <div className="flex gap-4 p-4 rounded-xl bg-gray-50 dark:bg-slate-800">
                    <GraduationCap className="shrink-0 text-primary mt-1" />
                    <div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200">3. Corporate Profiling</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Isolate risk. Keep personal living expenses separate from your wealth-generating business entities.</p>
                    </div>
                </div>
            </div>
        </Card>

        <Card title="Key Concepts: Wealth" className="shadow-md">
            <Term title="Asset vs Liability" desc="An Asset puts money in your pocket (rent, dividends). A Liability takes money out (car loan, mortgages on personal homes). The rich buy assets." />
            <Term title="Cashflow" desc="The real measure of wealth. Not net worth, but the actual liquid cash entering your system every month." />
            <Term title="Leverage" desc="Doing more with less. Using Other People's Time (OPT) or Other People's Money (OPM) to scale a 'B' or 'I' quadrant vehicle." />
        </Card>

        <Card title="Key Concepts: Business Engine" className="shadow-md">
            <Term title="Revenue vs Profit" desc="Revenue is vanit metric. Profit is sanity. Net Income is what is left to distribute to your personal profile to buy actual assets." />
            <Term title="Systematization" desc="The only way to move from an 'S' to a 'B'. Standard Operating Procedures (SOPs), hired operators, and software pipelines." />
            <Term title="Corporate Veil" desc="The legal barrier between your personal assets and business liabilities. Maintaining strict separate accounts ensures this protection." />
        </Card>
      </div>
    </div>
  );
};

export default LearningView;