import React, { useContext, useState, useMemo, useEffect } from 'react';
import { AppContext } from '../App';
import { Card } from '../components/Shared';
import { InsightCard } from '../components/InsightCard';
import { useAdaptiveIntelligence } from '../hooks/useAdaptiveIntelligence';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';

const QuadrantView = () => {
  const context = useContext(AppContext)!;
  const { data: appData, metrics, symbol, activeProfileId, timeFilter } = context;

  const isBusiness = activeProfileId !== 'personal';

  const data = useMemo(() => [
    { name: isBusiness ? 'Founder/Operator' : 'Employee', value: metrics.quadrantSplit.E, color: '#ef4444' },
    { name: isBusiness ? 'Specialist Reliance' : 'Self-Employed', value: metrics.quadrantSplit.S, color: '#f59e0b' },
    { name: isBusiness ? 'System Driven' : 'Business Owner', value: metrics.quadrantSplit.B, color: '#10b981' },
    { name: isBusiness ? 'Capital Allocation' : 'Investor', value: metrics.quadrantSplit.I, color: '#6366f1' },
  ], [isBusiness, metrics.quadrantSplit]);

  const [activeIndex, setActiveIndex] = useState(() => {
    let maxIdx = 0;
    let maxVal = -1;
    data.forEach((d, i) => {
      if (d.value > maxVal) {
        maxVal = d.value;
        maxIdx = i;
      }
    });
    return maxIdx;
  });

  const { esbiAdvice } = useAdaptiveIntelligence(appData, activeProfileId, metrics, timeFilter, context);

  useEffect(() => {
    let maxIdx = 0;
    let maxVal = -1;
    data.forEach((d, i) => {
      if (d.value > maxVal) {
        maxVal = d.value;
        maxIdx = i;
      }
    });
    setActiveIndex(maxIdx);
  }, [data]);

  // Context-Aware Advice
  const personalTips = {
    E: "You are trading time for money. Taxes are highest here. You have no leverage. Use your salary to buy assets immediately.",
    S: "You own a job. If you stop, the money stops. You need to build a system or hire a team to move to B.",
    B: "You own a system and people work for you. This is true leverage. Take your profits and move them to I.",
    I: "Money works for you. This is the goal. Focus on tax incentives and asset protection."
  };

  const businessTips = {
    E: "Founder Operator Trap: The business relies on you working in it daily. It is not an asset, it is a job.",
    S: "Specialist Reliance: The business relies on key 'stars' (you or a top sales rep). It is fragile.",
    B: "True System: The business operates via SOPs and automation. Value is high because it is transferable.",
    I: "Capital Allocation: The business is reinvesting surplus profit into R&D or Acquisitions. Highest growth phase."
  };

  const tips = isBusiness ? businessTips : personalTips;

  // Find dominant quadrant
  // We map the quadrant letter (E,S,B,I) to the tip key
  const dominantKey = Object.entries(metrics.quadrantSplit).reduce((a, b) => a[1] > b[1] ? a : b)[0] as keyof typeof tips;

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 10}
          outerRadius={outerRadius + 14}
          fill={fill}
        />
        <text x={cx} y={cy} dy={-10} textAnchor="middle" fill={fill} className="text-xl font-bold">
            {payload.name.split(' ')[0]}
        </text>
        <text x={cx} y={cy} dy={15} textAnchor="middle" fill="#999" className="text-sm">
            {`${value}%`}
        </text>
      </g>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{isBusiness ? 'Revenue Quality (ESBI)' : 'Cashflow Quadrant (ESBI)'}</h2>
      <p className="text-gray-500">{isBusiness ? 'How reliant is the business on manual effort?' : 'Where is your cash coming from?'}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="grid grid-cols-2 gap-4">
            <Card className="flex flex-col items-center justify-center text-center !p-8 border-l-4 border-l-red-500 min-h-[160px] transition-all hover:shadow-md hover:-translate-y-1">
                <h3 className="text-2xl font-bold text-red-500">E</h3>
                <p className="font-bold text-base mt-2">{data[0].name}</p>
                <p className="text-xl mt-1">{metrics.quadrantSplit.E}%</p>
            </Card>
            <Card className="flex flex-col items-center justify-center text-center !p-8 border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-900/10 min-h-[160px] transition-all hover:shadow-md hover:-translate-y-1">
                <h3 className="text-2xl font-bold text-green-500">B</h3>
                <p className="font-bold text-base mt-2">{data[2].name}</p>
                <p className="text-xl mt-1">{metrics.quadrantSplit.B}%</p>
            </Card>
            <Card className="flex flex-col items-center justify-center text-center !p-8 border-l-4 border-l-yellow-500 min-h-[160px] transition-all hover:shadow-md hover:-translate-y-1">
                <h3 className="text-2xl font-bold text-yellow-500">S</h3>
                <p className="font-bold text-base mt-2">{data[1].name}</p>
                <p className="text-xl mt-1">{metrics.quadrantSplit.S}%</p>
            </Card>
            <Card className="flex flex-col items-center justify-center text-center !p-8 border-l-4 border-l-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 min-h-[160px] transition-all hover:shadow-md hover:-translate-y-1">
                <h3 className="text-2xl font-bold text-indigo-500">I</h3>
                <p className="font-bold text-base mt-2">{data[3].name}</p>
                <p className="text-xl mt-1">{metrics.quadrantSplit.I}%</p>
            </Card>
        </div>

        <Card title="Distribution Analysis">
            <div className="h-64 min-h-[250px] relative" data-tour="quadrant-chart">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            {...{ activeIndex } as any}
                            activeShape={renderActiveShape}
                            data={data}
                            innerRadius={70}
                            outerRadius={90}
                            paddingAngle={4}
                            dataKey="value"
                            onMouseEnter={onPieEnter}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        {/* Custom shape handles text, so tooltip might overlap, but keeping for mobile touch access if needed */}
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [`${value}%`, 'Share']}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4">
                <InsightCard result={esbiAdvice} />
            </div>
        </Card>
      </div>
    </div>
  );
};

export default QuadrantView;