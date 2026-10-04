import React from 'react';
import { Network, ArrowRight, Share2, Info, TrendingUp, UserCheck, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Entity, OwnershipEdge } from '../../types';
import { OwnershipGraph, OwnershipResult, OwnershipPath } from '../../services/ownershipEngine';

interface EntityBreakdownProps {
    selectedId: string;
    entities: Entity[];
    engine: OwnershipGraph;
    onSelectEntity: (id: string) => void;
    showDirectOnly?: boolean;
    onUpdateEdge?: (parent: string, child: string, percentage: number) => void;
}

export const EntityBreakdown: React.FC<EntityBreakdownProps> = ({ 
    selectedId, 
    entities, 
    engine,
    onSelectEntity,
    showDirectOnly = false,
    onUpdateEdge
}) => {
    const selectedEntity = entities.find(e => e.id === selectedId);
    if (!selectedEntity) return null;

    const owners = engine.getAllOwnersForEntity(selectedId);
    const holdings = engine.getAllHoldingsForEntity(selectedId);

    // Filter to top owners (ultimate roots usually)
    const topOwners = Object.entries(owners).filter(([id, res]) => {
        if (showDirectOnly) return res.directOwnership > 0;
        return true;
    }).sort((a, b) => b[1].totalOwnership - a[1].totalOwnership);

    const holdingList = Object.entries(holdings).filter(([id, res]) => {
        if (showDirectOnly) return res.directOwnership > 0;
        return true;
    }).sort((a, b) => b[1].totalOwnership - a[1].totalOwnership);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Identity */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/10">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-xs font-bold text-primary uppercase tracking-widest mb-1">{selectedEntity.type}</div>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight">{selectedEntity.name}</h2>
                    </div>
                    <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                        <Network size={24} />
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8">
                    <div className="bg-gray-50 dark:bg-slate-700/50 p-3 sm:p-4 rounded-2xl">
                        <div className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase mb-1">Direct Owners</div>
                        <div className="text-lg sm:text-2xl font-bold">{engine.edges.filter(e => e.child_entity_id === selectedId).length}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-700/50 p-3 sm:p-4 rounded-2xl">
                        <div className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase mb-1">Holdings</div>
                        <div className="text-lg sm:text-2xl font-bold">{engine.edges.filter(e => e.parent_entity_id === selectedId).length}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-700/50 p-3 sm:p-4 rounded-2xl">
                        <div className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase mb-1">Total Ownership Path Count</div>
                        <div className="text-lg sm:text-2xl font-bold">{topOwners.reduce((sum, [_, res]) => sum + res.paths.length, 0)}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-700/50 p-3 sm:p-4 rounded-2xl">
                        <div className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase mb-1">Status</div>
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500 animate-pulse" />
                             <span className="text-xs font-bold">Verified</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* SECTION A: WHO OWNS THIS */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <UserCheck className="text-primary" size={20} />
                        Ownership Summary
                    </h3>
                    <div className="space-y-4">
                        {topOwners.length > 0 ? (
                            topOwners.map(([id, result]) => {
                                const ownerEntity = entities.find(e => e.id === id);
                                return (
                                    <div key={id} className="group p-4 bg-gray-50 dark:bg-slate-700/30 rounded-2xl border border-transparent hover:border-primary/20 transition-all">
                                        <div className="flex justify-between items-center mb-3">
                                            <button 
                                                onClick={() => onSelectEntity(id)}
                                                className="font-bold text-sm hover:text-primary transition-colors flex items-center gap-2"
                                            >
                                                {ownerEntity?.name || id}
                                                <Info size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                            <div className="text-lg font-semibold text-primary">{result.totalOwnership.toFixed(2)}%</div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 mb-4">
                                            <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded-md shadow-sm">DIRECT: {result.directOwnership.toFixed(2)}%</span>
                                            <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded-md shadow-sm">INDIRECT: {result.indirectOwnership.toFixed(2)}%</span>
                                        </div>

                                        {/* SECTION C: OWNERSHIP PATHS */}
                                        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Calculation Paths</div>
                                            {result.paths.map((p, idx) => (
                                                <div key={idx} className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-slate-900/50 p-2 rounded-lg">
                                                    {p.path.map((nodeId, nodeIdx) => {
                                                        const nodeName = entities.find(e => e.id === nodeId)?.name || nodeId;
                                                        const edge = nodeIdx < p.path.length - 1 ? engine.edges.find(e => e.parent_entity_id === nodeId && e.child_entity_id === p.path[nodeIdx+1]) : null;
                                                        
                                                        return (
                                                            <React.Fragment key={nodeId}>
                                                                <span className={nodeId === selectedId ? 'font-bold text-primary' : ''}>{nodeName}</span>
                                                                {edge && (
                                                                    <>
                                                                        <div className="flex flex-col items-center group relative">
                                                                            <ArrowRight size={10} className="text-gray-300" />
                                                                            {onUpdateEdge ? (
                                                                                <input 
                                                                                    type="number"
                                                                                    className="text-[8px] font-semibold text-gray-400 bg-transparent border-none w-8 text-center focus:text-primary outline-none hover:bg-gray-100 dark:hover:bg-white/5 rounded"
                                                                                    value={edge.percentage}
                                                                                    step="0.5"
                                                                                    onChange={(e) => onUpdateEdge(edge.parent_entity_id, edge.child_entity_id, parseFloat(e.target.value) || 0)}
                                                                                    onBlur={() => {
                                                                                        if (edge.percentage < 0) onUpdateEdge(edge.parent_entity_id, edge.child_entity_id, 0);
                                                                                        if (edge.percentage > 100) onUpdateEdge(edge.parent_entity_id, edge.child_entity_id, 100);
                                                                                    }}
                                                                                />
                                                                            ) : (
                                                                                <span className="text-[8px] font-semibold text-gray-400">{edge.percentage}%</span>
                                                                            )}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                    <span className="ml-auto font-semibold text-primary">= {p.percentage.toFixed(2)}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-8 text-center bg-gray-50 dark:bg-slate-700/30 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600">
                                <Info className="mx-auto text-gray-300 mb-2" size={32} />
                                <p className="text-gray-400 text-sm">No owners found (Apex Entity)</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* SECTION B: WHAT IT OWNS */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <TrendingUp className="text-secondary" size={20} />
                        Assets & Holdings
                    </h3>
                    <div className="space-y-4">
                        {holdingList.length > 0 ? (
                            holdingList.map(([id, result]) => {
                                const childEntity = entities.find(e => e.id === id);
                                return (
                                    <div key={id} className="group p-4 bg-gray-50 dark:bg-slate-700/30 rounded-2xl border border-transparent hover:border-secondary/20 transition-all flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <button 
                                                onClick={() => onSelectEntity(id)}
                                                className="font-bold text-sm hover:text-secondary transition-colors"
                                            >
                                                {childEntity?.name || id}
                                            </button>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{childEntity?.type}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className="text-lg font-semibold text-secondary">{result.totalOwnership.toFixed(2)}%</div>
                                            <div className="text-[10px] font-bold text-gray-400">Total Effective Stake</div>
                                            {(result.directOwnership > 0 || result.indirectOwnership > 0) && (
                                                <div className="flex gap-2 mt-1 text-[9px] text-gray-500 font-medium">
                                                    {result.directOwnership > 0 && <span>Direct: {result.directOwnership.toFixed(1)}%</span>}
                                                    {result.indirectOwnership > 0 && <span>Indirect: {result.indirectOwnership.toFixed(1)}%</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-8 text-center bg-gray-50 dark:bg-slate-700/30 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600">
                                <AlertTriangle className="mx-auto text-gray-300 mb-2" size={32} />
                                <p className="text-gray-400 text-sm">No equity holdings found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ERROR VISUALIZATION */}
            {engine.hasCycle() && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-3xl flex items-center gap-4 text-red-600 dark:text-red-400">
                    <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-2xl">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold">Ownership structure has an issue</h4>
                        <p className="text-sm opacity-80">A circular dependency has been detected. The system is ignoring the latest conflicting edge to prevent infinite loops.</p>
                    </div>
                </div>
            )}
        </div>
    );
};
