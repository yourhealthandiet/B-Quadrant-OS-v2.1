import React, { useContext, useState, useMemo, useEffect } from 'react';
import { AppContext } from '../App';
import { Network, Plus, Settings2, Trash2, Edit2, AlertCircle, LayoutList, Share2, GitBranch, Eye, EyeOff } from 'lucide-react';
import { OwnershipGraph, OwnershipResult } from '../services/ownershipEngine';
import { Entity, OwnershipEdge } from '../types';

import { OwnershipTree } from '../components/ownership/OwnershipTree';
import { OwnershipGraphViz } from '../components/ownership/OwnershipGraphViz';
import { EntityBreakdown } from '../components/ownership/EntityBreakdown';

export default function OwnershipGraphView() {
    const context = useContext(AppContext)!;

    const { data, setData, updateOwnershipEdges } = context;

    // Initialize or get engine data
    const entities = useMemo(() => {
        let e = data.entities || [];
        // Auto-migrate personal profile if missing
        if (!e.find(x => x.id === 'personal')) {
            e = [...e, { id: 'personal', name: data.profile.name, type: 'PERSON' }];
        }
        // Auto-migrate businesses if missing
        data.businesses.forEach(b => {
             if (!e.find(x => x.id === b.id)) {
                 e = [...e, { id: b.id, name: b.name, type: 'BUSINESS' }];
             }
        });
        return e;
    }, [data.entities, data.businesses, data.profile]);

    const edges = useMemo(() => {
        let ed = data.ownershipEdges || [];
        // If empty, backfill from legacy ownershipStake
        if (ed.length === 0 && data.businesses.length > 0) {
            ed = data.businesses.map(b => ({
                id: `edge_${b.id}`,
                parent_entity_id: 'personal',
                child_entity_id: b.id,
                percentage: b.ownershipStake || 100
            }));
        }
        return ed;
    }, [data.ownershipEdges, data.businesses]);

    const engine = useMemo(() => {
        const eng = new OwnershipGraph(entities, edges);
        return eng;
    }, [entities, edges]);

    const [selectedEntityId, setSelectedEntityId] = useState<string>(context?.activeProfileId || 'personal');
    const [isAddingEdge, setIsAddingEdge] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'tree' | 'graph'>('tree');
    const [showDirectOnly, setShowDirectOnly] = useState(false);
    
    useEffect(() => {
        if (context?.activeProfileId) {
            setSelectedEntityId(context.activeProfileId);
        }
    }, [context?.activeProfileId]);
    
    const [newParentId, setNewParentId] = useState('');
    const [newChildId, setNewChildId] = useState('');
    const [newPercentage, setNewPercentage] = useState<number>(0);
    const [errorMsg, setErrorMsg] = useState('');

    const handleAddEdge = () => {
        try {
            setErrorMsg('');
            // Ensure no duplicate edge
            engine.addEdge({
                id: `edge_${Date.now()}`,
                parent_entity_id: newParentId,
                child_entity_id: newChildId,
                percentage: newPercentage
            });

            // If it succeeds in engine, update state
            setData(prev => ({
                ...prev,
                entities: entities,
                ownershipEdges: engine.edges
            }));
            
            setIsAddingEdge(false);
            setNewParentId('');
            setNewChildId('');
            setNewPercentage(0);

        } catch (err: any) {
             setErrorMsg(err.message);
        }
    };

    const handleRemoveEdge = (parentId: string, childId: string) => {
        try {
            engine.removeEdge(parentId, childId);
            setData(prev => ({
                ...prev,
                entities: entities,
                ownershipEdges: engine.edges
            }));
        } catch (err: any) {
             alert(err.message);
        }
    };

    const handleUpdateEdge = (parentId: string, childId: string, pct: number) => {
         try {
             engine.updateEdgePercentage(parentId, childId, pct);
             setData(prev => ({
                 ...prev,
                 entities: entities,
                 ownershipEdges: engine.edges
             }));
         } catch (err: any) {
             alert(err.message);
         }
    };

    useEffect(() => {
        window.dispatchEvent(new CustomEvent('trigger-tour', { detail: 'nav-ownership-graph' }));
    }, []);

    const selectedEntity = entities.find(e => e.id === selectedEntityId);
    
    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 pb-12">
            {/* TOP BAR */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 pt-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-bold tracking-widest text-[10px] uppercase bg-primary/10 px-3 py-1 rounded-full w-fit">
                        <Share2 size={12}/> Phase 1: Ownership Visualization Layer
                    </div>
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-3" data-tour="nav-ownership-graph">
                        Ownership Engine
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 max-w-md">Visualize complex direct and indirect ownership structures with multi-path resolution.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* View Switcher */}
                    <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-white/10 w-full sm:w-auto overflow-x-auto scrollbar-thin" data-tour="ownership-view-switcher">
                        <button 
                            onClick={() => setViewMode('graph')}
                            className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-1 sm:flex-none ${viewMode === 'graph' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Network size={16}/> Graph
                        </button>
                        <button 
                            onClick={() => setViewMode('tree')}
                            className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-1 sm:flex-none ${viewMode === 'tree' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <GitBranch size={16}/> Tree
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-1 sm:flex-none ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <LayoutList size={16}/> Management
                        </button>
                    </div>

                    <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-700 hidden sm:block" />

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button onClick={() => setIsAddingEdge(!isAddingEdge)} className="flex-1 sm:flex-none justify-center bg-primary text-white font-semibold px-4 sm:px-6 py-2 rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 text-xs sm:text-sm whitespace-nowrap" data-tour="ownership-add-edge">
                            <Plus size={16} /> New Relation
                        </button>
                    </div>
                </div>
            </div>

            {/* ERROR / ADD UI */}
            {isAddingEdge && (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border border-primary/10 space-y-6 animate-in zoom-in-95 duration-300">
                    <div>
                        <h3 className="text-xl font-bold">Establish New Ownership Path</h3>
                        <p className="text-sm text-gray-500">The engine automatically checks for loops and percentage violations.</p>
                    </div>
                    {errorMsg && <div className="text-danger flex items-center gap-2 text-sm font-bold bg-danger/10 p-4 rounded-2xl"><AlertCircle size={18}/> {errorMsg}</div>}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Parent Entity</label>
                            <select className="w-full bg-gray-50 dark:bg-slate-700/50 border-none rounded-2xl p-4 font-bold outline-none ring-2 ring-transparent focus:ring-primary/20 transition-all" value={newParentId} onChange={e => setNewParentId(e.target.value)}>
                                <option value="">Select Root...</option>
                                {entities.map(e => <option key={e.id} value={e.id}>{e.name} ({e.type})</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Target/Child Entity</label>
                            <select className="w-full bg-gray-50 dark:bg-slate-700/50 border-none rounded-2xl p-4 font-bold outline-none ring-2 ring-transparent focus:ring-primary/20 transition-all" value={newChildId} onChange={e => setNewChildId(e.target.value)}>
                                <option value="">Select Asset...</option>
                                {entities.map(e => <option key={e.id} value={e.id}>{e.name} ({e.type})</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Ownership Percentage</label>
                            <div className="relative">
                                <input type="number" min="0" max="100" className="w-full bg-gray-50 dark:bg-slate-700/50 border-none rounded-2xl p-4 font-bold outline-none ring-2 ring-transparent focus:ring-primary/20 transition-all" placeholder="0 - 100" value={newPercentage || ''} onChange={e => setNewPercentage(Number(e.target.value))} />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-gray-300">%</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleAddEdge} className="bg-primary text-white font-semibold px-8 py-3 rounded-2xl shadow-lg shadow-primary/20">Apply Relationship</button>
                        <button onClick={() => setIsAddingEdge(false)} className="bg-gray-100 text-gray-500 font-bold px-8 py-3 rounded-2xl">Cancel</button>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                 {/* LEFT: Entity Browser */}
                 <div className="lg:col-span-3 space-y-4">
                     <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 p-6 overflow-hidden" data-tour="ownership-registry">
                        <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mb-6">Entity Registry ({entities.length})</h3>
                        <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {entities.map(ent => (
                                <button 
                                    key={ent.id}
                                    onClick={() => setSelectedEntityId(ent.id)}
                                    className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all group ${selectedEntityId === ent.id ? 'bg-primary text-white shadow-lg shadow-primary/30 active:scale-95' : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                >
                                    <div className={`p-2 rounded-xl ${selectedEntityId === ent.id ? 'bg-white/20' : 'bg-gray-100 dark:bg-slate-700'}`}>
                                        <span className="text-base">{ent.type === 'BUSINESS' ? '🏢' : '👤'}</span>
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold break-words text-sm">{ent.name}</span>
                                            <span className={`text-[8px] px-1 rounded border font-semibold ${ent.type === 'BUSINESS' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                                {ent.type}
                                            </span>
                                        </div>
                                        <span className={`text-[9px] font-semibold uppercase tracking-widest opacity-60`}>
                                            {engine.calculateOwnership('personal', ent.id).totalOwnership.toFixed(1)}% Owned
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                     </div>
                 </div>

                 {/* CENTER: Main Visualization */}
                 <div className="lg:col-span-9 space-y-8">
                      {/* Toggled View Visualization */}
                      {viewMode === 'graph' && (
                          <div className="animate-in fade-in zoom-in-95 duration-500">
                             <OwnershipGraphViz 
                                engine={engine} 
                                entities={entities} 
                                selectedId={selectedEntityId}
                                onSelectEntity={setSelectedEntityId}
                                onUpdateEdge={handleUpdateEdge}
                             />
                          </div>
                      )}

                      {viewMode === 'tree' && (
                          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                             <OwnershipTree 
                                engine={engine} 
                                entities={entities} 
                                rootId="personal" 
                             />
                          </div>
                      )}

                      {viewMode === 'list' && (
                          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-gray-100 dark:border-gray-700 shadow-sm animate-in fade-in duration-300">
                              <h3 className="text-xl font-bold mb-6">Relationship Management</h3>
                              <div className="space-y-3">
                                  {edges.length === 0 ? (
                                      <div className="p-12 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl">No ownership edges defined yet.</div>
                                  ) : (
                                    edges.map(edge => {
                                        const parent = entities.find(e => e.id === edge.parent_entity_id);
                                        const child = entities.find(e => e.id === edge.child_entity_id);
                                        return (
                                            <div key={edge.id} className="p-4 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/10 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-all">
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 flex-1 w-full border-b md:border-b-0 border-gray-100 dark:border-white/5 pb-3 md:pb-0">
                                                    <div className="flex flex-col flex-1 w-full sm:w-auto">
                                                        <span className="text-[10px] font-semibold text-primary uppercase mb-0.5">Parent</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm sm:text-base break-words whitespace-normal">{parent?.name}</span>
                                                            <span className={`shrink-0 text-[8px] px-1 rounded border font-semibold bg-white dark:bg-slate-800 ${parent?.type === 'BUSINESS' ? 'text-blue-600' : 'text-gray-500'}`}>{parent?.type}</span>
                                                        </div>
                                                    </div>
                                                    <div className="hidden sm:flex w-8 h-8 shrink-0 rounded-full bg-white dark:bg-slate-800 items-center justify-center border border-gray-200">
                                                        <Share2 size={14} className="text-gray-400" />
                                                    </div>
                                                    <div className="flex flex-col flex-1 w-full sm:w-auto">
                                                        <span className="text-[10px] font-semibold text-secondary uppercase mb-0.5">Child</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm sm:text-base break-words whitespace-normal">{child?.name}</span>
                                                            <span className={`shrink-0 text-[8px] px-1 rounded border font-semibold bg-white dark:bg-slate-800 ${child?.type === 'BUSINESS' ? 'text-blue-600' : 'text-gray-500'}`}>{child?.type}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end items-center gap-2 w-full md:w-auto">
                                                    <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl px-2 py-1 shadow-sm border border-gray-200 dark:border-gray-700 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                                                        <input 
                                                            type="number" 
                                                            className="w-16 bg-transparent border-none p-2 text-right font-semibold focus:ring-0 appearance-none m-0" 
                                                            style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                                                            value={edge.percentage}
                                                            onChange={(e) => handleUpdateEdge(edge.parent_entity_id, edge.child_entity_id, Number(e.target.value))}
                                                        />
                                                        <span className="text-gray-400 font-bold pr-2 select-none">%</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleRemoveEdge(edge.parent_entity_id, edge.child_entity_id)}
                                                        className="p-3 text-danger hover:bg-danger/10 rounded-xl transition-all"
                                                        title="Delete Relationship"
                                                    >
                                                        <Trash2 size={20}/>
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })
                                  )}
                              </div>
                          </div>
                      )}

                      {/* BOTTOM: Breakdown Panel for Selected Entity */}
                      <EntityBreakdown 
                        selectedId={selectedEntityId}
                        entities={entities}
                        engine={engine}
                        onSelectEntity={setSelectedEntityId}
                        showDirectOnly={showDirectOnly}
                        onUpdateEdge={handleUpdateEdge}
                      />
                 </div>
            </div>
        </div>
    );
}
