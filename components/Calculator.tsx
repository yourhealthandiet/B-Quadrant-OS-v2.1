import React, { useState, useEffect, useRef } from 'react';
import { X, Delete, Check, RotateCcw, Copy, ListPlus, Calculator as CalcIcon, Plus, Trash2 } from 'lucide-react';

interface CalculatorProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (value: number) => void;
    initialValue?: number;
    actionLabel?: string;
}

export const Calculator: React.FC<CalculatorProps> = ({ 
    isOpen, 
    onClose, 
    onApply, 
    initialValue = 0, 
    actionLabel = "Apply Value" 
}) => {
    // Calculator Modes: Standard Keypad vs Multi-Figure List
    const [mode, setMode] = useState<'keypad' | 'multiAdd'>('keypad');

    // Keypad state
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');
    const [isResult, setIsResult] = useState(false);
    const [lastAction, setLastAction] = useState<'digit' | 'operator' | 'equals'>('digit');
    
    // Multi-Add figures list state
    const [figureList, setFigureList] = useState<Array<{ id: string; value: number; label: string }>>([]);
    const [newFigureInput, setNewFigureInput] = useState('');
    const [newFigureLabel, setNewFigureLabel] = useState('');

    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize on open
    useEffect(() => {
        if (isOpen) {
            const startVal = initialValue ? initialValue.toString() : '0';
            setDisplay(startVal);
            setEquation('');
            setIsResult(false);
            setLastAction('digit');
            if (initialValue && initialValue > 0) {
                setFigureList([{ id: '1', value: initialValue, label: 'Initial Figure' }]);
            } else {
                setFigureList([]);
            }
        }
    }, [isOpen, initialValue]);

    // Safe mathematical evaluation
    const evaluateExpr = (expr: string): number => {
        try {
            // Strip trailing operators and whitespace
            let clean = expr.trim().replace(/[+\-*/\s]+$/, '').trim();
            if (!clean) return 0;
            // Strict sanitization - only numbers, decimals, math symbols, parentheses
            if (!/^[\d.\s+*/()%-]+$/.test(clean)) return NaN;
            // eslint-disable-next-line no-new-func
            const res = new Function(`return (${clean})`)();
            if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
                return Math.round(res * 100000000) / 100000000;
            }
            return NaN;
        } catch {
            return NaN;
        }
    };

    // Live running subtotal
    const getRunningSubtotal = (): number => {
        if (!equation && !display) return 0;
        const testExpr = equation + (lastAction === 'operator' ? '' : display);
        const val = evaluateExpr(testExpr);
        return isNaN(val) ? 0 : val;
    };

    const handleNumber = (num: string) => {
        if (isResult) {
            setDisplay(num);
            setEquation('');
            setIsResult(false);
            setLastAction('digit');
            return;
        }

        if (lastAction === 'operator') {
            setDisplay(num);
            setLastAction('digit');
            return;
        }

        if (num === '.') {
            if (display.includes('.')) return;
            setDisplay(display + '.');
            setLastAction('digit');
            return;
        }

        if (display === '0') {
            setDisplay(num);
        } else {
            setDisplay(display + num);
        }
        setLastAction('digit');
    };

    /**
     * Handles operators (+, -, *, /) with continuous chaining for unlimited figures
     */
    const handleOperator = (op: string) => {
        if (isResult) {
            // Continue chaining from previous evaluated result
            setEquation(`${display} ${op} `);
            setIsResult(false);
            setLastAction('operator');
            return;
        }

        if (lastAction === 'operator') {
            // Replace the last operator if user clicked another operator consecutively
            const trimmed = equation.trim().replace(/[+\-*/]$/, '').trim();
            setEquation(`${trimmed} ${op} `);
            return;
        }

        // Standard chaining: Append previous equation + current display + operator
        const nextEquation = equation ? `${equation}${display} ${op} ` : `${display} ${op} `;
        setEquation(nextEquation);
        
        // Calculate running subtotal and show in display preview
        const subtotal = evaluateExpr(nextEquation);
        if (!isNaN(subtotal)) {
            setDisplay(subtotal.toString());
        }
        setLastAction('operator');
    };

    const calculate = () => {
        if (!equation && !display) return;
        
        const fullExpr = lastAction === 'operator' 
            ? equation.trim().replace(/[+\-*/]$/, '').trim()
            : `${equation}${display}`.trim();

        if (!fullExpr) return;

        const result = evaluateExpr(fullExpr);
        if (isNaN(result)) {
            setDisplay('Error');
            setIsResult(true);
        } else {
            setDisplay(result.toString());
            setEquation(`${fullExpr} =`);
            setIsResult(true);
            setLastAction('equals');
        }
    };

    const clearAll = () => {
        setDisplay('0');
        setEquation('');
        setIsResult(false);
        setLastAction('digit');
    };

    const clearEntry = () => {
        setDisplay('0');
        setLastAction('digit');
    };

    const handleDelete = () => {
        if (isResult) {
            clearAll();
            return;
        }
        if (display.length > 1) {
            setDisplay(display.slice(0, -1));
        } else {
            setDisplay('0');
        }
    };

    const toggleSign = () => {
        const val = parseFloat(display);
        if (!isNaN(val) && val !== 0) {
            setDisplay((-val).toString());
        }
    };

    // Apply value to destination
    const handleApply = (valueToApply?: number) => {
        const val = typeof valueToApply === 'number' ? valueToApply : parseFloat(display);
        if (!isNaN(val)) {
            onApply(val);
            onClose();
        }
    };

    // Multi-Add Figures Methods
    const addFigureToList = () => {
        const val = parseFloat(newFigureInput);
        if (isNaN(val) || val === 0) return;
        const newFig = {
            id: Date.now().toString() + Math.random().toString().slice(2, 5),
            value: val,
            label: newFigureLabel.trim() || `Figure #${figureList.length + 1}`
        };
        setFigureList(prev => [...prev, newFig]);
        setNewFigureInput('');
        setNewFigureLabel('');
    };

    const removeFigureFromList = (id: string) => {
        setFigureList(prev => prev.filter(f => f.id !== id));
    };

    const multiAddTotal = figureList.reduce((sum, item) => sum + item.value, 0);

    // Keyboard support
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (mode !== 'keypad') return;

            // Numbers
            if (/^[0-9]$/.test(e.key)) {
                e.preventDefault();
                handleNumber(e.key);
            } else if (e.key === '.') {
                e.preventDefault();
                handleNumber('.');
            } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
                e.preventDefault();
                handleOperator(e.key);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (equation !== '' && lastAction !== 'equals') {
                    calculate();
                } else {
                    handleApply();
                }
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                handleDelete();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, display, equation, lastAction, isResult, mode]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-[340px] overflow-hidden border border-gray-200 dark:border-white/10 flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="bg-gray-100 dark:bg-slate-900 p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-1.5">
                        <CalcIcon size={16} className="text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Calculator</span>
                    </div>

                    {/* Mode Toggle Tabs */}
                    <div className="flex bg-gray-200 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                        <button 
                            type="button"
                            onClick={() => setMode('keypad')}
                            className={`px-2 py-0.5 rounded-md transition-all ${mode === 'keypad' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                            title="Interactive Keypad"
                        >
                            Keypad
                        </button>
                        <button 
                            type="button"
                            onClick={() => setMode('multiAdd')}
                            className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 ${mode === 'multiAdd' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                            title="Add Multiple Figures List"
                        >
                            <ListPlus size={12} />
                            Multi-Add
                        </button>
                    </div>

                    <button 
                        type="button"
                        onClick={onClose} 
                        className="p-1 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                        <X size={16}/>
                    </button>
                </div>

                {mode === 'keypad' ? (
                    <>
                        {/* Display Area */}
                        <div className="p-4 bg-gray-50 dark:bg-slate-900/60 text-right border-b border-gray-100 dark:border-gray-800 select-none">
                            {/* Running Equation / Chained Expression */}
                            <div className="text-xs font-mono text-gray-500 dark:text-gray-400 h-5 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center justify-end">
                                {equation || (display !== '0' ? display : '')}
                            </div>
                            
                            {/* Main Active Number Display */}
                            <input 
                                ref={inputRef}
                                type="text"
                                value={display}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/,/g, '');
                                    if (/^[\d.\s+*/()-]*$/.test(val)) {
                                        setDisplay(val);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (/[+*/-]/.test(display) || equation) {
                                            calculate();
                                        } else {
                                            handleApply();
                                        }
                                    }
                                }}
                                className="w-full bg-transparent text-right text-3xl font-mono font-bold text-gray-900 dark:text-white truncate outline-none placeholder-gray-300"
                            />

                            {/* Running Subtotal Indicator */}
                            {equation && !isResult && (
                                <div className="text-[11px] text-primary/80 font-mono mt-1">
                                    Subtotal: {getRunningSubtotal().toLocaleString()}
                                </div>
                            )}
                        </div>

                        {/* Interactive Keypad Grid */}
                        <div className="grid grid-cols-4 gap-px bg-gray-200 dark:bg-gray-700 select-none">
                            {/* Row 1 */}
                            <button 
                                type="button"
                                onClick={clearAll} 
                                className="p-3.5 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 font-bold text-sm active:bg-gray-100 transition-colors"
                                title="Clear All"
                            >
                                AC
                            </button>
                            <button 
                                type="button"
                                onClick={clearEntry} 
                                className="p-3.5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 font-bold text-sm active:bg-gray-100 transition-colors"
                                title="Clear Current Entry"
                            >
                                C
                            </button>
                            <button 
                                type="button"
                                onClick={handleDelete} 
                                className="p-3.5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 font-bold active:bg-gray-100 flex items-center justify-center transition-colors"
                                title="Backspace"
                            >
                                <Delete size={17} />
                            </button>
                            <button 
                                type="button"
                                onClick={() => handleOperator('/')} 
                                className="p-3.5 bg-indigo-50/70 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-primary font-bold text-lg active:bg-indigo-200 transition-colors"
                            >
                                ÷
                            </button>

                            {/* Row 2 */}
                            {['7', '8', '9'].map((num) => (
                                <button 
                                    key={num}
                                    type="button"
                                    onClick={() => handleNumber(num)} 
                                    className="p-3.5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-100 font-bold text-lg active:bg-gray-100 transition-colors"
                                >
                                    {num}
                                </button>
                            ))}
                            <button 
                                type="button"
                                onClick={() => handleOperator('*')} 
                                className="p-3.5 bg-indigo-50/70 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-primary font-bold text-lg active:bg-indigo-200 transition-colors"
                            >
                                ×
                            </button>

                            {/* Row 3 */}
                            {['4', '5', '6'].map((num) => (
                                <button 
                                    key={num}
                                    type="button"
                                    onClick={() => handleNumber(num)} 
                                    className="p-3.5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-100 font-bold text-lg active:bg-gray-100 transition-colors"
                                >
                                    {num}
                                </button>
                            ))}
                            <button 
                                type="button"
                                onClick={() => handleOperator('-')} 
                                className="p-3.5 bg-indigo-50/70 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-primary font-bold text-lg active:bg-indigo-200 transition-colors"
                            >
                                −
                            </button>

                            {/* Row 4 */}
                            {['1', '2', '3'].map((num) => (
                                <button 
                                    key={num}
                                    type="button"
                                    onClick={() => handleNumber(num)} 
                                    className="p-3.5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-100 font-bold text-lg active:bg-gray-100 transition-colors"
                                >
                                    {num}
                                </button>
                            ))}
                            <button 
                                type="button"
                                onClick={() => handleOperator('+')} 
                                className="p-3.5 bg-indigo-50/70 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-primary font-bold text-lg active:bg-indigo-200 transition-colors"
                                title="Add figure (Supports unlimited consecutive additions)"
                            >
                                +
                            </button>

                            {/* Row 5 */}
                            <button 
                                type="button"
                                onClick={toggleSign} 
                                className="p-3.5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold text-sm active:bg-gray-100 transition-colors"
                            >
                                ±
                            </button>
                            <button 
                                type="button"
                                onClick={() => handleNumber('0')} 
                                className="p-3.5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-100 font-bold text-lg active:bg-gray-100 transition-colors"
                            >
                                0
                            </button>
                            <button 
                                type="button"
                                onClick={() => handleNumber('.')} 
                                className="p-3.5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-100 font-bold text-lg active:bg-gray-100 transition-colors"
                            >
                                .
                            </button>
                            <button 
                                type="button"
                                onClick={calculate} 
                                className="p-3.5 bg-primary hover:bg-indigo-600 text-white font-bold text-xl active:bg-indigo-700 transition-colors flex items-center justify-center shadow-inner"
                                title="Calculate total"
                            >
                                =
                            </button>
                        </div>
                    </>
                ) : (
                    /* Multi-Figure Tape / List Mode */
                    <div className="p-4 flex-1 flex flex-col overflow-y-auto">
                        <div className="text-xs text-gray-500 mb-2 font-medium">
                            Add multiple figures one by one or sum a list:
                        </div>

                        {/* Input Row */}
                        <div className="flex gap-1.5 mb-3">
                            <input 
                                type="number" 
                                placeholder="Amount (e.g. 500)"
                                value={newFigureInput}
                                onChange={(e) => setNewFigureInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addFigureToList()}
                                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary font-mono"
                                autoFocus
                            />
                            <button 
                                type="button"
                                onClick={addFigureToList}
                                className="px-3 py-1.5 bg-primary hover:bg-indigo-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm transition-colors"
                            >
                                <Plus size={14} /> Add
                            </button>
                        </div>

                        {/* Figures List */}
                        <div className="flex-1 min-h-[160px] max-h-[220px] overflow-y-auto space-y-1.5 pr-1 border border-gray-100 dark:border-gray-800 rounded-xl p-2 bg-gray-50/50 dark:bg-slate-900/30">
                            {figureList.length === 0 ? (
                                <div className="text-xs text-gray-400 text-center py-8">
                                    No figures added yet.<br />Enter an amount above and click <span className="font-semibold text-primary">Add</span>.
                                </div>
                            ) : (
                                figureList.map((fig, idx) => (
                                    <div key={fig.id} className="flex justify-between items-center bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700 text-xs shadow-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400 font-mono text-[10px]">#{idx + 1}</span>
                                            <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">{fig.value.toLocaleString()}</span>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => removeFigureFromList(fig.id)}
                                            className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Total Bar */}
                        <div className="mt-3 p-2.5 bg-primary/10 dark:bg-primary/20 rounded-xl flex justify-between items-center border border-primary/20">
                            <span className="text-xs font-bold text-primary uppercase">Total Sum:</span>
                            <span className="text-base font-bold font-mono text-primary">{multiAddTotal.toLocaleString()}</span>
                        </div>
                    </div>
                )}

                {/* Footer Apply Button */}
                <div className="p-3 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-gray-700">
                    <button 
                        type="button"
                        onClick={() => handleApply(mode === 'multiAdd' ? multiAddTotal : undefined)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-98 transition-all text-sm"
                    >
                        {actionLabel === 'Copy' ? <Copy size={16} /> : <Check size={16} />} 
                        {actionLabel} ({mode === 'multiAdd' ? multiAddTotal.toLocaleString() : parseFloat(display || '0').toLocaleString()})
                    </button>
                </div>
            </div>
        </div>
    );
};
