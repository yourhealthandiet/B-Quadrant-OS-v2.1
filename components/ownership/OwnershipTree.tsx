import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Building2, User, ArrowRight } from 'lucide-react';
import { Entity, OwnershipEdge } from '../../types';
import { OwnershipGraph, OwnershipPath } from '../../services/ownershipEngine';

interface TreeNodeProps {
    entity: Entity;
    engine: OwnershipGraph;
    entities: Entity[];
    rootId: string;
    level: number;
    parentPercentage: number; // The percentage this parent owns of THIS child
    accumulatedPercentage: number; // The indirect ownership from the absolute root
}

const TreeNode: React.FC<TreeNodeProps> = ({ 
    entity, 
    engine, 
    entities, 
    rootId, 
    level, 
    parentPercentage,
    accumulatedPercentage 
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    
    // Find children: entities where this entity is the parent
    const childEdges = engine.edges.filter(e => e.parent_entity_id === entity.id);
    const hasChildren = childEdges.length > 0;

    const Icon = entity.type === 'PERSON' ? User : Building2;

    return (
        <div className="select-none">
            <div 
                className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-slate-700/50 group`}
                style={{ marginLeft: `${level * 1.5}rem` }}
            >
                {hasChildren ? (
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                ) : (
                    <div className="w-6" /> // Spacer
                )}
                
                <div className={`p-1.5 rounded-md ${entity.type === 'PERSON' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                    <Icon size={16} />
                </div>

                <div className="flex flex-col">
                    <span className="font-semibold text-sm">{entity.name}</span>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                        {level > 0 && (
                            <>
                                <span className="bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                    Direct: {parentPercentage.toFixed(1)}%
                                </span>
                                <span className="text-gray-300">|</span>
                                <span className="text-primary">
                                    Effective Path Value: {accumulatedPercentage.toFixed(2)}%
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div className="mt-1">
                    {childEdges.map(edge => {
                        const childEntity = entities.find(e => e.id === edge.child_entity_id);
                        if (!childEntity) return null;
                        
                        return (
                            <TreeNode 
                                key={edge.id}
                                entity={childEntity}
                                engine={engine}
                                entities={entities}
                                rootId={rootId}
                                level={level + 1}
                                parentPercentage={edge.percentage}
                                accumulatedPercentage={accumulatedPercentage * (edge.percentage / 100)}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

interface OwnershipTreeProps {
    engine: OwnershipGraph;
    entities: Entity[];
    rootId?: string;
}

export const OwnershipTree: React.FC<OwnershipTreeProps> = ({ engine, entities, rootId = 'personal' }) => {
    const rootEntity = entities.find(e => e.id === rootId);
    
    if (!rootEntity) {
        return (
            <div className="flex items-center justify-center p-12 text-gray-400 italic">
                Root entity not found.
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6 overflow-x-auto">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <ChevronDown className="text-primary" size={20} />
                Ownership Hierarchy
            </h3>
            <div className="min-w-[400px]">
                <TreeNode 
                    entity={rootEntity}
                    engine={engine}
                    entities={entities}
                    rootId={rootId}
                    level={0}
                    parentPercentage={100}
                    accumulatedPercentage={100}
                />
            </div>
        </div>
    );
};
