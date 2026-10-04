import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Card, Button, Modal, Input, Select } from '../components/Shared';
import { InlineCurrencyConverter } from '../components/InlineCurrencyConverter';
import { Plus, Trash2, Target, Calendar, CheckCircle2, TrendingUp, Sparkles, Loader2, Edit3, Link as LinkIcon } from 'lucide-react';
import { Goal } from '../types';
import * as AIService from '../services/aiService';
import { buildHierarchicalOptions, getEffectiveBalance } from '../services/bucketEngine';

const GoalsView = () => {
  const context = useContext(AppContext)!;
  const { data, setData, symbol, filteredData, formatAmount } = context;

  const [isModalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<Partial<Goal>>({
    title: '',
    targetAmount: 0,
    currentAmount: 0,
    deadline: '',
    category: 'Savings',
    linkedAllocationId: ''
  });

  const [aiStrategy, setAiStrategy] = useState<string>('');
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const goals = filteredData.goals || [];
  const isBusiness = context.activeProfileId !== 'personal';

  const uncatBucket = filteredData.allocations.find((a) => a.name === "Uncategorized");
  const otherBuckets = filteredData.allocations.filter((a) => a.name !== "Uncategorized");

  // Create dropdown options with hierarchy
  const buckets = [
      {
          value: uncatBucket?.id || '',
          label: `${isBusiness ? 'Main Revenue Bucket (Landing)' : 'Main Income Bucket (Landing)'} (${formatAmount(uncatBucket?.balance || 0)})`
      },
      ...buildHierarchicalOptions(
          otherBuckets, 
          (a) => `${a.name} (${formatAmount(getEffectiveBalance(filteredData.allocations, a.id))})`, 
          undefined, 
          0, 
          'id'
      )
  ];

  const handleSave = () => {
    if (!currentGoal.title || !currentGoal.targetAmount) return;

    if (isEdit && currentGoal.id) {
        if (!window.confirm("Update this goal?")) return;
        context.updateGoal(currentGoal as Goal);
    } else {
        if (!window.confirm("Add this goal?")) return;
        context.addGoal(currentGoal as Omit<Goal, 'id' | 'profileId'>);
    }
    setModalOpen(false);
    resetForm();
  };

  const deleteGoal = (id: string) => {
    context.deleteGoal(id);
  };

  const editGoal = (goal: Goal) => {
    setCurrentGoal(goal);
    setIsEdit(true);
    setModalOpen(true);
  };

  const resetForm = () => {
    setCurrentGoal({
        title: '',
        targetAmount: 0,
        currentAmount: 0,
        deadline: '',
        category: 'Savings',
        linkedAllocationId: ''
    });
    setIsEdit(false);
  };

  const getStrategy = async (goal: Goal) => {
    setActiveGoalId(goal.id);
    setIsLoading(true);
    setAiStrategy('');
    try {
        const result = await AIService.getGoalStrategy(goal, symbol);
        setAiStrategy(result);
    } catch (e) {
        setAiStrategy("Unable to generate strategy.");
    } finally {
        setIsLoading(false);
    }
  };

  const isViewer = context.simulatedUser?.accessLevel === 'viewer';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold">Goals & Milestones</h2>
            <p className="text-sm text-gray-500">Visualize and achieve your financial targets.</p>
        </div>
        {!isViewer && (
            <Button onClick={() => { resetForm(); setModalOpen(true); }} data-tour="action-add-goal">
                <Plus size={18} /> New Goal
            </Button>
        )}
      </div>

      {goals.length === 0 ? (
        <Card className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400 mb-4">
                <Target size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">No Goals Set</h3>
            <p className="text-gray-500 mb-6">Create your first goal to start tracking progress.</p>
            <Button onClick={() => { resetForm(); setModalOpen(true); }} data-tour="action-add-goal">Create Goal</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map(goal => {
                const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                const isComplete = goal.isAchieved === true;
                const linkedBucket = filteredData.allocations.find(a => a.id === goal.linkedAllocationId);
                const canAfford = linkedBucket && linkedBucket.balance >= goal.targetAmount;
                
                return (
                    <Card key={goal.id} className={`${isComplete ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10' : canAfford ? 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>
                        <div className="flex justify-between items-start mb-4 gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-lg break-words min-w-0">{goal.title}</h3>
                                    {isComplete && <CheckCircle2 size={18} className="text-green-500 shrink-0" />}
                                    {canAfford && !isComplete && <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full font-bold shrink-0">Fundable!</span>}
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 inline-block max-w-full break-words">
                                    {goal.category}
                                </span>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {!isViewer && (
                                    <>
                                        <button onClick={() => editGoal(goal)} className="text-gray-400 hover:text-primary transition-colors">
                                            <Edit3 size={16} />
                                        </button>
                                        <button onClick={() => {
                                            if (window.confirm("Are you sure you want to delete this goal?")) deleteGoal(goal.id);
                                        }} className="text-gray-400 hover:text-red-500 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-500">Progress</span>
                                    <span className="font-bold">{progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                    <div 
                                        className={`h-2.5 rounded-full transition-all duration-1000 ${isComplete ? 'bg-green-500' : 'bg-primary'}`} 
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-sm mt-1 font-medium">
                                    <span>{formatAmount(goal.currentAmount)}</span>
                                    <span className="text-gray-400">Target: {formatAmount(goal.targetAmount)}</span>
                                </div>
                            </div>

                            {linkedBucket && (
                                <div className="p-2 rounded bg-white/50 dark:bg-black/20 text-xs flex items-center justify-between">
                                    <span className="text-gray-500 flex items-center gap-1"><LinkIcon size={12}/> Funding Source: {linkedBucket.name === 'Uncategorized' ? (isBusiness ? 'Main Revenue Bucket' : 'Main Income Bucket') : linkedBucket.name}</span>
                                    <span className={`font-bold ${canAfford ? 'text-green-600' : 'text-gray-700'}`}>Available: {formatAmount(linkedBucket.balance)}</span>
                                </div>
                            )}

                            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                                {canAfford && !isComplete && !isViewer && (
                                    <Button onClick={() => context.completeGoal(goal.id)} className="w-full justify-center" variant="primary">
                                        <CheckCircle2 size={16} /> Pay & Complete Goal
                                    </Button>
                                )}
                                
                                {!linkedBucket && !isComplete && !isViewer && (
                                    <Button onClick={() => context.completeGoal(goal.id)} className="w-full justify-center" variant="secondary">
                                        <CheckCircle2 size={16} /> Mark as Achieved
                                    </Button>
                                )}

                                {isComplete && !isViewer && (
                                    <Button onClick={() => context.uncompleteGoal(goal.id)} className="w-full justify-center text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50" variant="secondary">
                                        Reverse & Un-Complete Goal
                                    </Button>
                                )}

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <Calendar size={14} />
                                        <span>{goal.deadline || 'No deadline'}</span>
                                    </div>
                                    {!isComplete && (
                                        <button 
                                            onClick={() => getStrategy(goal)} 
                                            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-indigo-600 transition-colors"
                                            disabled={isLoading && activeGoalId === goal.id}
                                        >
                                            {isLoading && activeGoalId === goal.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                            Get AI Strategy
                                        </button>
                                    )}
                                </div>
                            </div>

                            {activeGoalId === goal.id && aiStrategy && (
                                <div className="mt-4 bg-primary/5 p-4 rounded-lg text-sm text-gray-700 dark:text-gray-300 animate-in fade-in slide-in-from-top-2 border border-primary/10">
                                    <p className="font-bold text-primary mb-1 flex items-center gap-2">
                                        <Sparkles size={14} /> AI Strategy
                                    </p>
                                    <div className="whitespace-pre-line text-xs leading-relaxed">
                                        {aiStrategy}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                );
            })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={isEdit ? "Edit Goal" : "New Goal"}>
        <div className="space-y-4">
            <Input 
                label="Goal Title" 
                value={currentGoal.title} 
                onChange={e => setCurrentGoal({...currentGoal, title: e.target.value})} 
                placeholder="e.g. Emergency Fund"
            />
            <InlineCurrencyConverter 
                targetCurrency={context.data.profile.currency || 'USD'} 
                onApply={(val) => setCurrentGoal(prev => ({ ...prev, targetAmount: val }))} 
            />
            <div className="grid grid-cols-2 gap-4">
                <Input 
                    label={`Target Amount (${symbol})`} 
                    type="number" 
                    value={currentGoal.targetAmount || ''} 
                    onChange={e => setCurrentGoal({...currentGoal, targetAmount: parseFloat(e.target.value)})} 
                    enableCalculator
                    enableCurrencyConvert
                />
                <Input 
                    label={`Current Saved (${symbol})`} 
                    type="number" 
                    value={currentGoal.currentAmount || ''} 
                    onChange={e => setCurrentGoal({...currentGoal, currentAmount: parseFloat(e.target.value)})} 
                    enableCalculator
                    enableCurrencyConvert
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Input 
                    label="Deadline" 
                    type="date" 
                    value={currentGoal.deadline} 
                    onChange={e => setCurrentGoal({...currentGoal, deadline: e.target.value})} 
                />
                <Select 
                    label="Category" 
                    options={[
                        { value: 'Savings', label: 'Savings' },
                        { value: 'Debt Payoff', label: 'Debt Payoff' },
                        { value: 'Investment', label: 'Investment' },
                        { value: 'Purchase', label: 'Big Purchase' },
                        { value: 'Other', label: 'Other' },
                    ]}
                    value={currentGoal.category}
                    onChange={e => setCurrentGoal({...currentGoal, category: e.target.value as any})}
                />
            </div>
            
            <div className="pt-2 border-t border-gray-100 dark:border-white/10">
                <p className="text-xs font-bold text-gray-500 mb-2">Automated Funding (Optional)</p>
                <Select 
                    label="Link to Allocation Bucket" 
                    options={[{value: '', label: 'None (Manual Savings)'}, ...buckets]} 
                    value={currentGoal.linkedAllocationId || ''}
                    onChange={e => setCurrentGoal({...currentGoal, linkedAllocationId: e.target.value})}
                />
                <p className="text-[10px] text-gray-400">If linked, we will notify you when this bucket has enough funds to reach your goal.</p>
            </div>
            <div className="pt-4 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>Save Goal</Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default GoalsView;