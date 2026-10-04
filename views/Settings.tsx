
import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { Card, Button, Input, Select, Modal } from '../components/Shared';
import { InlineCurrencyConverter } from '../components/InlineCurrencyConverter';
import { WORLD_CURRENCIES } from '../services/currencyService';
import { Save, Plus, Trash2, Download, Upload, Briefcase, AlertCircle, Database, Triangle, ShieldCheck, AlertTriangle, CheckCircle, PieChart, FileJson, RefreshCw, XCircle, Clock, Users, Link as LinkIcon, Eye, Copy, Key, FileText, Table, History, RotateCcw, GripVertical, Share2, ChevronDown, Camera, UploadCloud, DownloadCloud, Check } from 'lucide-react';
import { CURRENCY_SYMBOLS, BusinessEntity, DEFAULT_ALLOCATIONS, DEFAULT_BUSINESS_ALLOCATIONS, AllocationCategory, AppData, DEFAULT_DATA, TeamMember, AccessLevel, convertCurrency } from '../types';
import { downloadFinancialStatement, downloadCSV } from '../services/receiptService';
import { saveSnapshot, getHistory, HistorySnapshot } from '../services/historyService';
import { ProfileAvatar, getInitials, processImageFile } from '../components/ProfileAvatar';
import { ONBOARDING_CONTENT } from '../components/Walkthrough';

const RangeInput = ({ label, value, onChange, tip }: { label: string, value: number, onChange: (v: number) => void, tip: string }) => (
    <div className="mb-4">
        <div className="flex justify-between items-end mb-1">
            <label className="text-sm font-bold">{label}</label>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${value < 4 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : value < 8 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>Score: {value}/10</span>
        </div>
        <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700">
            <button 
                className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-gray-600 active:scale-95 transition-transform"
                onClick={() => onChange(Math.max(0, value - 1))}
            >
                -
            </button>
            <div className="flex-1 text-center font-bold text-lg">{value}</div>
            <button 
                className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-gray-600 active:scale-95 transition-transform"
                onClick={() => onChange(Math.min(10, value + 1))}
            >
                +
            </button>
        </div>
        <p className="text-[10px] text-gray-500 mt-1">{tip}</p>
    </div>
);

// Helper Component for Hierarchical Allocation Rendering
const AllocationEditorItem = ({ 
    alloc, allAllocs, depth = 0, index,
    draggedItemIndex, activeProfileId,
    handleDragStart, handleDragOver, handleDragEnd,
    updateAllocation, removeAllocation
}: any) => {
    const isSpecial = alloc.name === 'Uncategorized';
    const children = allAllocs.filter((a: AllocationCategory) => a.parentId === alloc.id);
    const hasChildren = children.length > 0;
    const [expanded, setExpanded] = React.useState(false);

    return (
        <div className="flex flex-col gap-2 w-full">
            <div 
                className={`flex gap-2 sm:gap-4 items-center ${draggedItemIndex === index ? 'opacity-50' : 'opacity-100'} transition-opacity duration-200`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
            >
                <div className={`cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-slate-800 p-1 rounded -ml-1 ${depth > 0 ? '' : ''}`}>
                    <GripVertical className="text-gray-400 shrink-0" size={18} />
                </div>
                
                {hasChildren ? (
                   <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-gray-500">
                      <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                   </button>
                ) : (
                   <div className="w-[22px]" /> // spacer matching chevron width
                )}
                
                <div className="flex-1 min-w-0">
                    <Input 
                        value={isSpecial ? (activeProfileId !== 'personal' ? 'Main Revenue Bucket (Landing)' : 'Main Income Bucket (Landing)') : alloc.name} 
                        disabled={isSpecial}
                        onChange={e => updateAllocation(alloc.id, 'name', e.target.value)} 
                        placeholder="Bucket Name" 
                        className={`!mb-0 break-words ${isSpecial ? '!bg-blue-50 dark:!bg-blue-900/10 !border-blue-300 dark:!border-blue-800/50 !text-blue-800 dark:!text-blue-300 !font-semibold text-xs sm:text-sm' : 'text-xs sm:text-sm'}`} 
                    />
                </div>
                <div className="w-20 sm:w-24 relative shrink-0">
                   <Input type="number" disabled={isSpecial} value={alloc.percentage} onChange={e => updateAllocation(alloc.id, 'percentage', parseFloat(e.target.value))} className={`!mb-0 pr-6 text-center font-bold text-xs sm:text-sm ${isSpecial ? 'opacity-50 cursor-not-allowed' : ''}`} />
                   <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs mt-[1px]">%</span>
                </div>
                <button onClick={() => removeAllocation(alloc.id)} disabled={isSpecial} className={`p-1 shrink-0 ${isSpecial ? 'opacity-20 cursor-not-allowed' : 'text-gray-400 hover:text-red-500'}`}><Trash2 size={16} /></button>
            </div>
            
            {hasChildren && expanded && (
                <div className="pl-6 flex flex-col gap-2 border-l-2 border-gray-100 dark:border-white/5 ml-3 mt-1">
                    {children.map((child: AllocationCategory) => {
                        const childIndex = allAllocs.findIndex((a: AllocationCategory) => a.id === child.id);
                        return <AllocationEditorItem 
                            key={child.id} 
                            alloc={child} 
                            allAllocs={allAllocs} 
                            depth={depth + 1} 
                            index={childIndex}
                            draggedItemIndex={draggedItemIndex}
                            activeProfileId={activeProfileId}
                            handleDragStart={handleDragStart}
                            handleDragOver={handleDragOver}
                            handleDragEnd={handleDragEnd}
                            updateAllocation={updateAllocation}
                            removeAllocation={removeAllocation}
                        />
                    })}
                </div>
            )}
        </div>
    );
};

const SettingsView = () => {
  const context = useContext(AppContext)!;
  const { 
    data, setData, activeProfileId, setActiveProfileId, metrics, switchCurrency, 
    setSimulatedUser, navigate, filteredData, symbol, effectiveRole, updateOwnershipEdges, 
    timeFilter, syncStatus, peerCount, lastSyncedAt, isSyncing, pushSyncData, pullSyncData, 
    connectSyncKey, redeemBusinessRoleKey 
  } = context;

  const [profile, setProfile] = useState(data.profile);
  const [businesses, setBusinesses] = useState<BusinessEntity[]>(data.businesses);
  const [copiedSyncKey, setCopiedSyncKey] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [roleKeyInput, setRoleKeyInput] = useState('');
  const [roleKeyStatus, setRoleKeyStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [copiedRoleMemberId, setCopiedRoleMemberId] = useState<string | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const isBusiness = activeProfileId !== 'personal';

  const [isTipsDisabled, setIsTipsDisabled] = useState(() => {
    return localStorage.getItem('bquadrant_disable_tips') === 'true';
  });

  const handleSkipAllTipsInSettings = () => {
    localStorage.setItem('bquadrant_disable_tips', 'true');
    setIsTipsDisabled(true);
    window.dispatchEvent(new CustomEvent('tour-preferences-changed', { detail: { disabled: true } }));
  };

  const handleResetTourTipsInSettings = () => {
    // Only re-enable! Retains seen items so it remembers what you already toured.
    localStorage.removeItem('bquadrant_disable_tips');
    setIsTipsDisabled(false);
    window.dispatchEvent(new CustomEvent('tour-preferences-changed', { detail: { disabled: false } }));
  };

  const handleRestartTourFromScratch = () => {
    localStorage.removeItem('bquadrant_seen_tips');
    localStorage.removeItem('bquadrant_disable_tips');
    setIsTipsDisabled(false);
    window.dispatchEvent(new CustomEvent('tour-preferences-changed', { detail: { disabled: false, resetSeen: true } }));
    window.dispatchEvent(new CustomEvent('trigger-tour', { detail: 'welcome' }));
  };

  useEffect(() => {
    setProfile(data.profile);
  }, [data.profile]);

  useEffect(() => {
    setBusinesses(data.businesses);
  }, [data.businesses]);
  
  // History State
  const [historySnapshots, setHistorySnapshots] = useState<HistorySnapshot[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Modals
  const [isBusinessModalOpen, setBusinessModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'ownership' | 'triangle' | 'allocations' | 'team'>('basic');
  
  useEffect(() => {
      if (isBusinessModalOpen) {
          window.dispatchEvent(new CustomEvent('trigger-tour', { detail: `business-tab-${activeTab}` }));
      }
  }, [isBusinessModalOpen, activeTab]);
  
  const [newBusiness, setNewBusiness] = useState<BusinessEntity>({ 
      id: '', name: '', industry: '', currency: 'USD', ownershipStake: 100,
      employeeCount: 0, hasSystems: false, entityType: 'Sole Prop', weeklyHours: 40,
      biTriangle: { mission: 5, leadership: 5, team: 5, cashflow: 5, communications: 5, systems: 1, legal: 1, product: 5 },
      revenueTarget: 0, profitTarget: 0, monthlyRevenueTarget: 0, monthlyProfitTarget: 0,
      teamMembers: []
  });

  // Team Management State
  const [newTeamMember, setNewTeamMember] = useState<Partial<TeamMember>>({ name: '', roleTitle: '', accessLevel: 'viewer' });
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const [tempBusinessAllocations, setTempBusinessAllocations] = useState<AllocationCategory[]>([]);
  const [newTempAllocName, setNewTempAllocName] = useState('');
  const [newTempAllocParentId, setNewTempAllocParentId] = useState('');
  
  const [newBoardMemberName, setNewBoardMemberName] = useState('');
  const [newBoardMemberPct, setNewBoardMemberPct] = useState(0);
  const [newBoardMemberType, setNewBoardMemberType] = useState<'PERSON' | 'BUSINESS'>('PERSON');
  const [newBoardMemberId, setNewBoardMemberId] = useState('');

  // Allocation Editor State
  const [editedAllocations, setEditedAllocations] = useState<AllocationCategory[]>([]);
  const [newAllocName, setNewAllocName] = useState('');
  const [newAllocParentId, setNewAllocParentId] = useState('');
  const [isBucketInfoExpanded, setIsBucketInfoExpanded] = useState(false);

  useEffect(() => {
     setIsBucketInfoExpanded(false);
  }, [activeProfileId]);

  // Reset Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  // EXPORT/REPORT STATES
  const [reportTargetId, setReportTargetId] = useState<string>(activeProfileId);
  const [exportTargetId, setExportTargetId] = useState<string>('all');

  // Sync Local State with Global Data when activeProfileId changes or data updates
  useEffect(() => {
      setProfile(data.profile);
      setBusinesses(data.businesses);
      // Ensure we clone the array to prevent direct mutation of state
      let allocs = data.allocations.filter(a => a.profileId === activeProfileId).map(a => ({...a}));
      if (!allocs.some(a => a.name === 'Uncategorized')) {
          allocs.unshift({ id: Date.now().toString() + '_uncat', profileId: activeProfileId, name: 'Uncategorized', percentage: 0, balance: 0 });
      } else {
          // ensure Uncategorized has 0%
          const uncat = allocs.find(a => a.name === 'Uncategorized');
          if (uncat) uncat.percentage = 0;
      }
      
      // Sort: Uncategorized first, then descending percentage, then alphabetically
      allocs.sort((a, b) => {
          if (a.name === 'Uncategorized') return -1;
          if (b.name === 'Uncategorized') return 1;
          const diff = (b.percentage || 0) - (a.percentage || 0);
          if (diff !== 0) return diff;
          return a.name.localeCompare(b.name);
      });
      
      setEditedAllocations(allocs);
      setReportTargetId(activeProfileId);
      loadHistory();
  }, [data, activeProfileId]);

  const loadHistory = () => {
      setHistorySnapshots(getHistory());
  };

  const handleRestore = (snapshot: HistorySnapshot) => {
      if (confirm(`Restore data from ${new Date(snapshot.timestamp).toLocaleString()}? Current unsaved data will be lost.`)) {
          // Save current state before restoring, just in case
          saveSnapshot(data, "Auto-Save (Pre-Restore)");
          setData(snapshot.data);
          alert("Data restored successfully.");
          setShowHistory(false);
      }
  };

  const handleManualSnapshot = () => {
      saveSnapshot(data, "Manual Backup");
      loadHistory();
      alert("Snapshot saved.");
  };

  const validateAllocations = (allocs: AllocationCategory[]) => {
      let errors: string[] = [];
      const topLevel = allocs.filter(a => !a.parentId);
      const topTotal = topLevel.reduce((sum, a) => sum + (a.percentage || 0), 0);
      if (Math.abs(topTotal - 100) > 0.1) {
          errors.push(`Top level must be 100% (currently ${topTotal.toFixed(1)}%)`);
      }
      
      const parents = allocs.filter(a => allocs.some(child => child.parentId === a.id));
      for (const parent of parents) {
          const children = allocs.filter(a => a.parentId === parent.id);
          if (children.length > 0) {
            const childTotal = children.reduce((sum, a) => sum + (a.percentage || 0), 0);
            if (Math.abs(childTotal - 100) > 0.1) {
                errors.push(`'${parent.name}' sub-buckets must be 100% (currently ${childTotal.toFixed(1)}%)`);
            }
          }
      }
      
      return errors;
  };
  const allocationErrors = validateAllocations(editedAllocations);
  const totalAllocation = editedAllocations.filter(a => !a.parentId).reduce((sum, a) => sum + (a.percentage || 0), 0); // fallback for UI summary

  const handleSaveProfile = () => {
    if (confirm("Update Personal Profile?")) {
        setData(prev => ({ ...prev, profile: profile }));
        alert("Profile saved successfully.");
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newCurr = e.target.value;
      const success = switchCurrency('personal', newCurr, profile);
      if (success) {
          setProfile({...profile, currency: newCurr});
      } else {
          // If cancelled, reset the select box by not updating local state to the new currency
          setProfile({...profile, currency: data.profile.currency});
      }
  };

  const getDepth = (id: string, allocs: AllocationCategory[], currentDepth = 0): number => {
    const alloc = allocs.find(a => a.id === id);
    if (!alloc || !alloc.parentId) return currentDepth;
    if (currentDepth > 10) return currentDepth;
    return getDepth(alloc.parentId, allocs, currentDepth + 1);
  };

  const getParentOptions = (allocs: AllocationCategory[]) => {
      const options: { value: string; label: string }[] = [{ value: '', label: 'None (Top Level)' }];
      
      const addChildren = (parentId?: string, depth = 0) => {
          const children = allocs.filter(a => parentId ? a.parentId === parentId : !a.parentId);
          children.forEach(child => {
              if (child.name === 'Uncategorized') return;
              const prefix = depth > 0 ? '\u00A0\u00A0'.repeat(depth) + '└─ ' : '';
              options.push({ value: child.id, label: prefix + child.name });
              addChildren(child.id, depth + 1);
          });
      };
      
      addChildren();
      return options;
  };

  const handleSaveAllocations = () => {
      const errs = validateAllocations(editedAllocations);
      if (errs.length > 0) {
          alert(`Fix Allocation Errors:\n\n${errs.join('\n')}`);
          return;
      }
      
      if (confirm(`Update allocations for ${activeProfileId === 'personal' ? 'Personal' : 'Business'}?`)) {
        // Construct new allocations array
        setData(prev => {
            const otherAllocations = prev.allocations.filter(a => a.profileId !== activeProfileId);
            const newAllocations = [...otherAllocations, ...editedAllocations];
            return {
                ...prev,
                allocations: newAllocations
            };
        });
        alert("Allocations updated successfully.");
      }
  };

  const updateAllocation = (id: string, field: keyof AllocationCategory, value: any) => {
      setEditedAllocations(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  // Drag and Drop state
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedItemIndex(index);
      // Required for Firefox
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', e.currentTarget.parentNode as any);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault(); // Necessary to allow dropping
      if (draggedItemIndex === null || draggedItemIndex === index) return;
      
      const newAllocs = [...editedAllocations];
      const draggedAlloc = newAllocs[draggedItemIndex];
      const targetAlloc = newAllocs[index];
      
      if (draggedAlloc.parentId !== targetAlloc.parentId) return;

      newAllocs.splice(draggedItemIndex, 1);
      newAllocs.splice(index, 0, draggedAlloc);
      
      setEditedAllocations(newAllocs);
      setDraggedItemIndex(index);
  };

  const handleDragEnd = () => {
      setDraggedItemIndex(null);
  };

  const addNewAllocation = () => {
      if(!newAllocName) return;
      const newAlloc: AllocationCategory = {
          id: Date.now().toString(), // Ensure unique ID
          profileId: activeProfileId,
          name: newAllocName,
          percentage: 0,
          balance: 0,
          parentId: newAllocParentId || undefined
      };
      setEditedAllocations(prev => [...prev, newAlloc]);
      setNewAllocName('');
      setNewAllocParentId('');
  };

  const removeAllocation = (id: string) => { 
      if (confirm("Remove this bucket? Balance will be lost if not transferred.")) {
          setEditedAllocations(prev => prev.filter(a => a.id !== id)); 
      }
  };

  // ... (Report Logic - Keep as is) ...
  const handleFullDownload = () => {
      // Find the target data
      const targetId = reportTargetId;
      const targetName = targetId === 'personal' ? data.profile.name : data.businesses.find(b => b.id === targetId)?.name || 'Unknown';
      const targetCurrencyCode = targetId === 'personal' ? data.profile.currency : (data.businesses.find(b => b.id === targetId)?.currency || 'USD');
      const targetSymbol = CURRENCY_SYMBOLS[targetCurrencyCode] || '$';
      const formattedCurrency = `${targetCurrencyCode} (${targetSymbol})`;

      // Filter Data
      const relEntries = data.entries.filter(e => e.profileId === targetId);
      const relAssets = data.assets.filter(a => a.profileId === targetId);
      
      downloadFinancialStatement(
          targetName,
          formattedCurrency,
          relEntries.filter(e => e.type === 'income'),
          relEntries.filter(e => e.type === 'expense'),
          relAssets.filter(a => a.type === 'asset' || a.type === 'business_equity'),
          relAssets.filter(a => a.type === 'liability')
      );
  };

  const handleExcelExport = () => {
      const profileName = activeProfileId === 'personal' ? 'Personal' : businesses.find(b => b.id === activeProfileId)?.name || 'Business';
      
      const allData = [
          ...filteredData.entries.map(e => ({ ...e, recordType: 'Transaction' })),
          ...filteredData.assets.map(a => ({ ...a, recordType: 'Asset/Liability' })),
      ];
      
      downloadCSV(allData, `${profileName}_Full_Export`);
  };

  // --- Business Modal Logic ---
  const getCalculatedWeeklyHours = (bizId: string) => {
      if (!bizId) return 0;
      const now = new Date();
      now.setFullYear(2026); // Simulate 2026
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const relevantEntries = data.entries.filter(e => {
          const entryDate = new Date(e.date);
          return entryDate >= thirtyDaysAgo && entryDate <= now;
      });

      const bizHours = relevantEntries
          .filter(e => e.profileId === bizId && e.type === 'income')
          .reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
      
      return bizHours / 4; 
  };

  const handleAddBusiness = () => {
      if(!newBusiness.name || newBusiness.name.trim() === '') { alert("Business Name is required."); setActiveTab('basic'); return; }
      const errs = validateAllocations(tempBusinessAllocations);
      if (errs.length > 0) { alert(`Fix Allocation Errors:\n\n${errs.join('\n')}`); setActiveTab('allocations'); return; }

      const id = newBusiness.id || `biz_${Date.now()}`;
      
      const currentEdges = context.engine.edges.filter((e: any) => e.child_entity_id === id);
      const totalOwnership = currentEdges.reduce((sum: number, e: any) => sum + e.percentage, 0);
      if (Math.abs(totalOwnership - 100) > 0.1) {
          alert(`Total ownership must equal exactly 100%. Currently it is ${totalOwnership}%. Please verify Ownership & Board settings.`);
          setActiveTab('ownership');
          return;
      }
      
      const safeBusiness: BusinessEntity = {
          ...newBusiness, 
          id: id,
          weeklyHours: newBusiness.weeklyHours || 0,
          employeeCount: newBusiness.teamMembers?.length || 0 
      };

      const safeAllocations = tempBusinessAllocations.map(a => ({ ...a, profileId: id }));

      const existingBiz = data.businesses.find(b => b.id === id);
      const oldCurrency = existingBiz?.currency;

      const finalDataUpdater = (prev: AppData) => {
          const otherBusinesses = prev.businesses.filter(b => b.id !== id);
          const otherAllocations = prev.allocations.filter(a => a.profileId !== id);
          
          let nextEntities = prev.entities || [];
          const existingEntIndex = nextEntities.findIndex(e => e.id === id);
          if (existingEntIndex > -1) {
              nextEntities = nextEntities.map((e, idx) => idx === existingEntIndex ? { ...e, name: safeBusiness.name } : e);
          } else {
              nextEntities = [...nextEntities, { id, name: safeBusiness.name, type: 'BUSINESS' }];
          }
          if (!nextEntities.find(e => e.id === 'personal')) {
              nextEntities = [...nextEntities, { id: 'personal', name: prev.profile.name, type: 'PERSON' }];
          }
          
          let nextEdges = prev.ownershipEdges || [];
          if (!nextEdges.find(e => e.child_entity_id === id)) {
              nextEdges = [...nextEdges, { id: `edge_${id}`, parent_entity_id: 'personal', child_entity_id: id, percentage: safeBusiness.ownershipStake ?? 100 }];
          }

          return { ...prev, businesses: [...otherBusinesses, safeBusiness], allocations: [...otherAllocations, ...safeAllocations], entities: nextEntities, ownershipEdges: nextEdges };
      };

      setData(finalDataUpdater);
      setBusinessModalOpen(false);
  };

  const handleEditBusiness = (b: BusinessEntity) => {
      setNewBusiness({...b, teamMembers: b.teamMembers || []});
      const existingAllocs = data.allocations.filter(a => a.profileId === b.id);
      setTempBusinessAllocations(existingAllocs.length > 0 ? existingAllocs : DEFAULT_BUSINESS_ALLOCATIONS.map((a, i) => ({ ...a, id: `${b.id}_alloc_${i}`, balance: 0, profileId: b.id })));
      setBusinessModalOpen(true);
  };

  const resetBusinessForm = () => {
      const bizId = `biz_${Date.now()}`;
      setNewBusiness({ 
        id: bizId, name: '', industry: '', currency: 'USD', ownershipStake: 100, employeeCount: 0, hasSystems: false, entityType: 'Sole Prop', weeklyHours: 0,
        logo: '', avatar: '',
        biTriangle: { mission: 5, leadership: 5, team: 5, cashflow: 5, communications: 5, systems: 1, legal: 1, product: 5 },
        revenueTarget: 0, profitTarget: 0, monthlyRevenueTarget: 0, monthlyProfitTarget: 0,
        teamMembers: []
      });
      setTempBusinessAllocations(DEFAULT_BUSINESS_ALLOCATIONS.map((a, i) => ({ ...a, id: `temp_${Date.now()}_${i}`, balance: 0, profileId: bizId })));
      updateOwnershipEdges(bizId, [{ id: 'personal', name: data.profile.name || 'Personal', type: 'PERSON', percentage: 100 }]);
      setActiveTab('basic');
  };

  const handleDeleteBusiness = (id: string) => {
      if(confirm("Delete business? All data will be lost.")) {
          if (activeProfileId === id) {
              setActiveProfileId('personal');
          }
          
          setData(prev => ({ 
              ...prev, 
              businesses: prev.businesses.filter(b => b.id !== id), 
              entries: prev.entries.filter(e => e.profileId !== id), 
              allocations: prev.allocations.filter(a => a.profileId !== id), 
              goals: prev.goals.filter(g => g.profileId !== id), 
              assets: prev.assets.filter(a => a.profileId !== id),
              entities: (prev.entities || []).filter(e => e.id !== id),
              ownershipEdges: (prev.ownershipEdges || []).filter(e => e.child_entity_id !== id && e.parent_entity_id !== id)
          }));
      }
  };

  const updateTempAllocation = (id: string, val: number) => { setTempBusinessAllocations(prev => prev.map(a => a.id === id ? { ...a, percentage: val } : a)); };
  const addTempAllocation = () => { if(!newTempAllocName) return; setTempBusinessAllocations(prev => [...prev, { id: `temp_${Date.now()}`, profileId: 'temp', name: newTempAllocName, percentage: 0, balance: 0, parentId: newTempAllocParentId || undefined }]); setNewTempAllocName(''); setNewTempAllocParentId(''); };
  const removeTempAllocation = (id: string) => { setTempBusinessAllocations(prev => prev.filter(a => a.id !== id)); };

  const [draggedTempItemIndex, setDraggedTempItemIndex] = useState<number | null>(null);

  const handleTempDragStart = (e: React.DragEvent, index: number) => {
      setDraggedTempItemIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', e.currentTarget.parentNode as any);
  };

  const handleTempDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedTempItemIndex === null || draggedTempItemIndex === index) return;
      
      const newAllocs = [...tempBusinessAllocations];
      const draggedAlloc = newAllocs[draggedTempItemIndex];
      const targetAlloc = newAllocs[index];
      if (draggedAlloc.parentId !== targetAlloc.parentId) return;

      newAllocs.splice(draggedTempItemIndex, 1);
      newAllocs.splice(index, 0, draggedAlloc);
      setTempBusinessAllocations(newAllocs);
      setDraggedTempItemIndex(index);
  };

  const handleTempDragEnd = () => {
      setDraggedTempItemIndex(null);
  };

  // ... (Keep Team Logic / RangeInput / Export / Import as is) ...
  const addTeamMember = () => {
      if(!newTeamMember.name) return;
      const member: TeamMember = {
          id: `tm_${Date.now()}`,
          businessId: newBusiness.id,
          name: newTeamMember.name,
          roleTitle: newTeamMember.roleTitle || 'Staff',
          accessLevel: newTeamMember.accessLevel as AccessLevel || 'viewer',
          accessLink: `https://b-quadrant-os.com/access/${Math.random().toString(36).substring(7)}` // Mock Link
      };
      setNewBusiness(prev => ({ ...prev, teamMembers: [...(prev.teamMembers || []), member] }));
      setNewTeamMember({ name: '', roleTitle: '', accessLevel: 'viewer' });
  };

  const removeTeamMember = (id: string) => {
      setNewBusiness(prev => ({ ...prev, teamMembers: prev.teamMembers?.filter(m => m.id !== id) }));
  };

  const simulateUser = (member: TeamMember) => {
      if(confirm(`Switch view to ${member.name}? You will see the app as they see it.`)) {
          setSimulatedUser(member);
          setBusinessModalOpen(false);
          navigate('dashboard');
      }
  };

  const generateLink = (member: TeamMember) => {
      setGeneratedLink(member.accessLink || 'Error');
      setTimeout(() => setGeneratedLink(null), 3000);
  };

  const downloadTeamFile = (member: TeamMember) => {
      const payload = {
          _type: "B_QUADRANT_TEAM_ACCESS_KEY",
          generatedAt: new Date().toISOString(),
          businessId: newBusiness.id,
          businessName: newBusiness.name,
          role: member.accessLevel,
          memberName: member.name,
          snapshot: {
              entries: data.entries.filter(e => e.profileId === newBusiness.id),
              allocations: data.allocations.filter(a => a.profileId === newBusiness.id),
          }
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${newBusiness.name.replace(/\s+/g, '_')}_${member.name}_AccessKey.json`;
      alert('Download started! Check your device storage or downloads folder.');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const getRoleKeyString = (member: TeamMember) => {
      const payload = {
          _type: "B_QUADRANT_TEAM_ACCESS_KEY",
          generatedAt: new Date().toISOString(),
          businessId: newBusiness.id,
          businessName: newBusiness.name,
          role: member.accessLevel,
          memberName: member.name,
          snapshot: {
              entries: data.entries.filter(e => e.profileId === newBusiness.id),
              allocations: data.allocations.filter(a => a.profileId === newBusiness.id),
          }
      };
      return "BQ-ROLE-" + btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  };

  const copyRoleKey = (member: TeamMember) => {
      try {
          const token = getRoleKeyString(member);
          navigator.clipboard.writeText(token);
          setCopiedRoleMemberId(member.id);
          setTimeout(() => setCopiedRoleMemberId(null), 2500);
      } catch (err) {
          alert("Failed to generate role key string");
      }
  };

  const handleRedeemRoleKey = (keyString: string) => {
      if (!keyString.trim()) {
          setRoleKeyStatus({ message: 'Please paste a valid Business Role Key.', isError: true });
          return;
      }
      const res = redeemBusinessRoleKey(keyString.trim());
      if (res.success) {
          setRoleKeyStatus({ message: res.message, isError: false });
          setRoleKeyInput('');
      } else {
          setRoleKeyStatus({ message: res.message, isError: true });
      }
      setTimeout(() => setRoleKeyStatus(null), 5000);
  };

  const performExport = () => {
      let exportData: any = {};
      let filename = "B_QUADRANT_FULL_BACKUP";

      if (exportTargetId === 'all') {
          exportData = data;
      } else if (exportTargetId === 'personal') {
          filename = "B_QUADRANT_PERSONAL_PROFILE";
          exportData = {
              _type: "PARTIAL_PROFILE",
              profile: data.profile,
              entries: data.entries.filter(e => e.profileId === 'personal'),
              assets: data.assets.filter(a => a.profileId === 'personal'),
              goals: data.goals.filter(g => g.profileId === 'personal'),
              investments: data.investments.filter(i => i.profileId === 'personal'),
              allocations: data.allocations.filter(a => a.profileId === 'personal'),
          };
      } else {
          // Specific Business
          const biz = data.businesses.find(b => b.id === exportTargetId);
          if (biz) {
              filename = `B_QUADRANT_BUSINESS_${biz.name.replace(/\s+/g, '_').toUpperCase()}`;
              exportData = {
                  _type: "PARTIAL_BUSINESS",
                  business: biz, 
                  entries: data.entries.filter(e => e.profileId === exportTargetId),
                  assets: data.assets.filter(a => a.profileId === exportTargetId),
                  goals: data.goals.filter(g => g.profileId === exportTargetId),
                  allocations: data.allocations.filter(a => a.profileId === exportTargetId),
              };
          }
      }

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `${filename}.json`; 
      alert('Download started! Check your device storage or downloads folder.');
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]; if(!file) return;
      
      // Auto-save before import
      saveSnapshot(data, "Auto-Save (Pre-Import)");
      loadHistory();

      const reader = new FileReader();
      reader.onload = (e) => { 
          if (e.target?.result) { 
              try { 
                  const importedData = JSON.parse(e.target.result as string);
                  if (importedData._type === "PARTIAL_BUSINESS") {
                      const bizName = importedData.business.name;
                      const bizId = importedData.business.id;
                      const existingIndex = data.businesses.findIndex(b => b.id === bizId);
                      if (existingIndex >= 0) {
                          if (confirm(`A business with ID '${bizId}' (${bizName}) already exists. Overwrite it?`)) {
                              setData(prev => {
                                  const cleanEntries = prev.entries.filter(x => x.profileId !== bizId);
                                  const cleanAssets = prev.assets.filter(x => x.profileId !== bizId);
                                  const cleanGoals = prev.goals.filter(x => x.profileId !== bizId);
                                  const cleanAllocations = prev.allocations.filter(x => x.profileId !== bizId);
                                  const otherBusinesses = prev.businesses.filter(b => b.id !== bizId);
                                  return {
                                      ...prev,
                                      businesses: [...otherBusinesses, importedData.business],
                                      entries: [...cleanEntries, ...(importedData.entries || [])],
                                      assets: [...cleanAssets, ...(importedData.assets || [])],
                                      goals: [...cleanGoals, ...(importedData.goals || [])],
                                      allocations: [...cleanAllocations, ...(importedData.allocations || [])]
                                  };
                              });
                              alert("Business overwritten successfully.");
                          }
                      } else {
                          if (confirm(`Import new business: '${bizName}'?`)) {
                              setData(prev => ({
                                  ...prev,
                                  businesses: [...prev.businesses, importedData.business],
                                  entries: [...prev.entries, ...(importedData.entries || [])],
                                  assets: [...prev.assets, ...(importedData.assets || [])],
                                  goals: [...prev.goals, ...(importedData.goals || [])],
                                  allocations: [...prev.allocations, ...(importedData.allocations || [])]
                              }));
                              alert("Business imported successfully.");
                          }
                      }
                  } else if (importedData._type === "PARTIAL_PROFILE") {
                      if (confirm("Overwrite Personal Profile data only? Business data will remain touched.")) {
                           setData(prev => {
                               const cleanEntries = prev.entries.filter(x => x.profileId !== 'personal');
                               const cleanAssets = prev.assets.filter(x => x.profileId !== 'personal');
                               const cleanGoals = prev.goals.filter(x => x.profileId !== 'personal');
                               const cleanAllocations = prev.allocations.filter(x => x.profileId !== 'personal');
                               return {
                                   ...prev,
                                   profile: importedData.profile,
                                   entries: [...cleanEntries, ...(importedData.entries || [])],
                                   assets: [...cleanAssets, ...(importedData.assets || [])],
                                   goals: [...cleanGoals, ...(importedData.goals || [])],
                                   allocations: [...cleanAllocations, ...(importedData.allocations || [])],
                                   investments: [...prev.investments.filter(i => i.profileId !== 'personal'), ...(importedData.investments || [])]
                               };
                           });
                           alert("Personal profile updated.");
                      }
                  } else {
                      if (confirm("This appears to be a Full System Backup. Overwrite EVERYTHING? This cannot be undone.")) { 
                          setData(importedData); 
                          alert("Full system restore successful."); 
                      } 
                  }
              } catch (err) { console.error(err); alert("Invalid file format."); } 
          } 
      };
      reader.readAsText(file); event.target.value = ''; 
  };

  const handleFactoryReset = () => { 
      setIsResetModalOpen(true);
      setResetConfirmText('');
  };

  const executeFactoryReset = () => {
      if (resetConfirmText === 'DELETE') {
          saveSnapshot(data, "Pre-Factory Reset");
          localStorage.removeItem('gapFinancialData'); 
          localStorage.setItem('gap_ui_profile', 'personal');
          window.location.reload(); 
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Global Settings</h2>
        {effectiveRole !== 'finance_staff' && (
          <div className="flex items-center gap-2">
            {profile.syncKey?.trim() && (
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => {
                  const ok = pushSyncData();
                  if (ok) {
                    setSyncFeedback({ message: 'Broadcasted to all peers!', isError: false });
                    setTimeout(() => setSyncFeedback(null), 3000);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 hover:bg-blue-100 transition-all shadow-2xs"
                title="Push Data to devices"
              >
                <UploadCloud size={13} className={isSyncing ? 'animate-bounce' : ''} />
                <span className="hidden sm:inline">Push Data</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 hover:border-primary/50 text-gray-800 dark:text-gray-200 shadow-2xs transition-all active:scale-95"
            >
              <Key size={13} className="text-primary" />
              <span>
                {profile.syncKey?.trim() ? (
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{profile.syncKey.trim()}</span>
                ) : (
                  'Sync & Role Keys'
                )}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                syncStatus === 'connected' && profile.syncKey?.trim()
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : syncStatus === 'connecting'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
              }`}>
                {syncStatus === 'connected' && profile.syncKey?.trim() ? `🟢 ${peerCount}` : syncStatus === 'connecting' ? '🟡' : 'Offline'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Main Profile (Unchanged) */}
      <Card title="Personal Profile">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Profile Photo Uploader */}
            <div className="md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
                <ProfileAvatar 
                    name={profile.name || 'Personal'} 
                    imageUrl={profile.avatar || profile.photoUrl} 
                    isBusiness={false} 
                    size="lg" 
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Personal Profile Photo</h4>
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-200/70 dark:bg-gray-700 px-2 py-0.5 rounded">
                            Fallback: {getInitials(profile.name) || 'Initials'}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Add a profile image. If no photo is provided, your initials ({getInitials(profile.name) || 'Initials'}) will be displayed in the profile switcher and headers.
                    </p>
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-all shadow-sm">
                            <Upload size={13} />
                            <span>Upload Photo</span>
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        try {
                                            const dataUrl = await processImageFile(file);
                                            setProfile(prev => ({ ...prev, avatar: dataUrl, photoUrl: dataUrl }));
                                            setData(prev => ({ ...prev, profile: { ...prev.profile, avatar: dataUrl, photoUrl: dataUrl } }));
                                        } catch (err: any) {
                                            alert(err?.message || 'Failed to process image');
                                        }
                                    }
                                }}
                            />
                        </label>
                        {(profile.avatar || profile.photoUrl) && (
                            <button 
                                type="button"
                                onClick={() => {
                                    setProfile(prev => ({ ...prev, avatar: undefined, photoUrl: undefined }));
                                    setData(prev => ({ ...prev, profile: { ...prev.profile, avatar: undefined, photoUrl: undefined } }));
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900/40 transition-colors"
                            >
                                <Trash2 size={13} />
                                <span>Remove Photo</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <Input label="Your Name" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
            <Input label="Date of Birth" type="date" value={profile.dob} onChange={e => setProfile({...profile, dob: e.target.value})} />
            <Input label="Occupation" value={profile.occupation} onChange={e => setProfile({...profile, occupation: e.target.value})} />
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency (Auto-Converts Values)</label>
                <select 
                    value={profile.currency} 
                    onChange={handleCurrencyChange}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                >
                    {WORLD_CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>[{c.symbol || c.code}] {c.code} — {c.name}</option>
                    ))}
                </select>
            </div>
             <div className="md:col-span-2"><Input label="Financial Dream" value={profile.dream} onChange={e => setProfile({...profile, dream: e.target.value})} /></div>
            <div className="md:col-span-2 border-t border-gray-100 dark:border-white/10 pt-4 mt-2">
                <h4 className="font-bold mb-3 flex items-center gap-2"><Database size={16}/> Personal Context</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2"><Clock size={14} className="text-primary"/> Avg Weekly Work Hours</label>
                        <div className="w-full px-4 py-2 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 text-primary font-bold">{metrics.calculatedWeeklyHours.toFixed(1)} hrs</div>
                    </div>
                    <Select label="Financial Knowledge" options={[{value: 'Beginner', label: 'Beginner'}, {value: 'Intermediate', label: 'Intermediate'}, {value: 'Advanced', label: 'Advanced'}]} value={profile.financialKnowledge || 'Beginner'} onChange={e => setProfile({...profile, financialKnowledge: e.target.value as any})} />
                </div>
            </div>
            <Input label={`Freedom Target / Month (${CURRENCY_SYMBOLS[profile.currency] || '$'})`} type="number" value={profile.freedomTarget} onChange={e => setProfile({...profile, freedomTarget: parseFloat(e.target.value)})} enableCalculator enableCurrencyConvert />
        </div>
        <div className="mt-4 flex justify-end gap-3"><Button onClick={handleSaveProfile}><Save size={16} /> Save Changes</Button></div>
      </Card>

      {/* Allocation Management */}
      <Card title={`Fund Allocations: ${activeProfileId === 'personal' ? 'Personal' : businesses.find(b => b.id === activeProfileId)?.name || 'Business'}`} data-tour="section-allocations">
          <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl text-sm text-yellow-800 dark:text-yellow-500 overflow-hidden border border-yellow-200/50 dark:border-yellow-900/30">
                 <button 
                    onClick={() => setIsBucketInfoExpanded(!isBucketInfoExpanded)}
                    className="w-full text-left p-4 flex items-start gap-3 hover:bg-yellow-100/50 dark:hover:bg-yellow-800/20 transition-colors"
                 >
                     <AlertCircle className="shrink-0 mt-0.5" size={16} />
                     <div className="space-y-1 flex-1">
                        <p className="font-bold">Automated Income Splitting (The Bucket System)</p>
                        <p className="opacity-90 leading-snug">This system automatically routes your income into predefined buckets.</p>
                        <p className="text-sm font-semibold opacity-100 flex items-center gap-1 mt-1 text-yellow-800 dark:text-yellow-200">Click to learn how the endless hierarchy works <ChevronDown size={14} className={`shrink-0 transition-transform ${isBucketInfoExpanded ? 'rotate-180' : ''}`} /></p>
                     </div>
                 </button>
                 {isBucketInfoExpanded && (
                     <div className="px-4 pb-4 pt-1 ml-9 space-y-3 border-t border-yellow-200/30 dark:border-yellow-900/30 mt-1 animate-in slide-in-from-top-2 text-sm text-gray-700 dark:text-gray-300">
                        <p><strong>How it works:</strong> Revenue enters your main fund and is immediately split into buckets. You can create an endless hierarchy—buckets can have sub-buckets, and sub-buckets can have their own sub-buckets.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-1 opacity-90">
                           <li><strong>Personal Example:</strong> Salary enters &rarr; splits into Living (50%), Saving (20%), Investing (30%).</li>
                           <li><strong>Business Example:</strong> Revenue enters &rarr; splits into OPEX (40%), Taxes (30%), Profit (30%). OPEX can then split into Payroll (80%) and Software (20%).</li>
                        </ul>
                        <p><strong>Note:</strong> You can manage the allocation buckets of your current profile right here on this dashboard, saving you time from going into detailed business settings.</p>
                     </div>
                 )}
              </div>
              {editedAllocations.length === 0 ? <div className="p-4 text-center text-gray-500 italic border border-dashed rounded-xl">No allocations set. <button onClick={() => {
                  const defaults = (activeProfileId === 'personal' ? DEFAULT_ALLOCATIONS : DEFAULT_BUSINESS_ALLOCATIONS).map((a,i) => ({...a, id: Date.now()+i+'', balance: 0, profileId: activeProfileId}));
                  defaults.sort((a, b) => {
                      if (a.name === 'Uncategorized') return -1;
                      if (b.name === 'Uncategorized') return 1;
                      const diff = (b.percentage || 0) - (a.percentage || 0);
                      if (diff !== 0) return diff;
                      return a.name.localeCompare(b.name);
                  });
                  setEditedAllocations(defaults);
              }} className="ml-2 text-primary underline font-bold">Load Defaults</button></div> : editedAllocations.filter(a => !a.parentId).map((alloc) => {
                  const index = editedAllocations.findIndex(a => a.id === alloc.id);
                  return (
                      <AllocationEditorItem 
                          key={alloc.id} 
                          alloc={alloc} 
                          allAllocs={editedAllocations} 
                          index={index}
                          draggedItemIndex={draggedItemIndex}
                          activeProfileId={activeProfileId}
                          handleDragStart={handleDragStart}
                          handleDragOver={handleDragOver}
                          handleDragEnd={handleDragEnd}
                          updateAllocation={updateAllocation}
                          removeAllocation={removeAllocation}
                      />
                  );
              })}
              {allocationErrors.length > 0 && (
                  <div className="text-red-500 text-xs my-2">
                      {allocationErrors.map((err, i) => <div key={i}>• {err}</div>)}
                  </div>
              )}
              <div className="flex gap-2 items-end pt-2 border-t border-gray-100 dark:border-white/5">
                <div className="flex-1"><Input placeholder="New Bucket Name" value={newAllocName} onChange={e => setNewAllocName(e.target.value)} className="!mb-0" /></div>
                <div className="flex-1">
                    <Select 
                        className="!mb-0"
                        options={getParentOptions(editedAllocations)} 
                        value={newAllocParentId} 
                        onChange={(e) => setNewAllocParentId(e.target.value)} 
                    />
                </div>
                <Button variant="secondary" onClick={addNewAllocation}><Plus size={18} /> Add</Button>
              </div>
              <div className="flex justify-between items-center bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10"><span className="font-bold">Total Allocation</span><span className={`text-xl font-bold ${Math.abs(totalAllocation - 100) < 0.1 ? 'text-green-500' : 'text-red-500'}`}>{totalAllocation}%</span></div>
              <div className="flex justify-end"><Button onClick={handleSaveAllocations} disabled={Math.abs(totalAllocation - 100) > 0.1} className={Math.abs(totalAllocation - 100) > 0.1 ? 'opacity-50 cursor-not-allowed' : ''}>{Math.abs(totalAllocation - 100) > 0.1 ? `Fix Total (${totalAllocation}%)` : 'Save Allocations'}</Button></div>
          </div>
      </Card>

      {/* ... Business Management (Unchanged) ... */}
      {effectiveRole !== 'finance_staff' && (
      <Card title="Business Entities" action={<Button onClick={() => { resetBusinessForm(); setBusinessModalOpen(true); }} data-tour="action-add-entity"><Plus size={16} /> Add Entity</Button>}>
        {businesses.length === 0 ? <div className="text-gray-500 italic">No businesses added.</div> : (
            <div className="space-y-3">
                {businesses.map(b => (
                    <div key={b.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleEditBusiness(b)}>
                        <div className="flex items-center gap-3 min-w-0">
                            <ProfileAvatar 
                                name={b.name} 
                                imageUrl={b.logo || b.avatar} 
                                isBusiness={true} 
                                size="md" 
                            />
                            <div className="min-w-0">
                                <h4 className="font-semibold flex items-center gap-2 truncate text-gray-900 dark:text-gray-100">{b.name}</h4>
                                <p className="text-xs text-gray-500">{b.entityType} • {b.currency} • {(b.teamMembers?.length || 0) + 1} Members</p>
                            </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteBusiness(b.id); }} className="text-gray-400 hover:text-red-500 shrink-0 p-1.5"><Trash2 size={16}/></button>
                    </div>
                ))}
            </div>
        )}
      </Card>
      )}

      {/* Financial Reports (Unchanged) */}
      <Card title="Financial Reports & Receipts">
          <div className="space-y-6">
              <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select Profile to Download</label>
                  <select 
                    className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 text-sm mb-4"
                    value={reportTargetId}
                    onChange={(e) => setReportTargetId(e.target.value)}
                    data-tour="section-receipts"
                  >
                      <option value="personal">Personal Profile</option>
                      {businesses.map(b => (
                          <option key={b.id} value={b.id}>Business: {b.name}</option>
                      ))}
                  </select>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button onClick={handleFullDownload} className="w-full justify-center">
                          <FileText size={16}/> Download PDF Statement
                      </Button>
                      <Button variant="secondary" onClick={handleExcelExport} className="w-full justify-center">
                          <Table size={16}/> Export Raw Data (Excel)
                      </Button>
                  </div>
              </div>
          </div>
      </Card>

      {/* Walkthrough & Tour Preferences */}
      <Card title="Walkthrough & Tour Preferences">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Interactive Walkthrough Tips</h4>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                isTipsDisabled 
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' 
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
              }`}>
                {isTipsDisabled ? 'Silenced' : 'Active'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isTipsDisabled 
                ? 'Guide popups are currently paused. When you re-enable them, the app remembers what you already toured and only shows tips for sections you haven\'t seen yet.' 
                : 'Helpful tips guide you as you explore each feature for the first time. You can silence them or re-read any section anytime.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {!isTipsDisabled ? (
              <Button 
                variant="secondary" 
                onClick={handleSkipAllTipsInSettings}
                className="text-xs py-1.5 h-8"
              >
                Silence Tour Tips
              </Button>
            ) : (
              <Button 
                variant="primary" 
                onClick={handleResetTourTipsInSettings}
                className="text-xs py-1.5 h-8"
              >
                Re-enable Tour Tips
              </Button>
            )}
            <Button 
              variant="ghost" 
              onClick={handleRestartTourFromScratch}
              className="text-xs py-1.5 h-8 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              title="Reset all tour history and restart from the beginning"
            >
              Restart from Beginning
            </Button>
          </div>
        </div>
      </Card>

       {/* Data Management (Unchanged) */}
      {effectiveRole !== 'finance_staff' && (
      <Card title="Data & Storage">
        <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 space-y-3" data-tour="section-data-backup">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Backup Type</label>
                    <select 
                        className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 text-sm"
                        value={exportTargetId}
                        onChange={(e) => setExportTargetId(e.target.value)}
                    >
                        <option value="all">Backup Full App (All Profiles)</option>
                        <option value="personal">Backup Personal Profile Only</option>
                        {businesses.map(b => (
                            <option key={b.id} value={b.id}>Backup Business: {b.name}</option>
                        ))}
                    </select>
                </div>
                <Button variant="secondary" onClick={performExport} className="w-full justify-center">
                    <Download size={16} /> Download Backup
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative w-full" data-tour="section-data-import">
                    <input type="file" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
                    <Button variant="secondary" className="w-full justify-center"><Upload size={16} /> Smart Import Backup</Button>
                </div>
                <Button variant="danger" onClick={handleFactoryReset} className="w-full justify-center" data-tour="action-factory-reset"><Trash2 size={16} /> Factory Reset App</Button>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700" data-tour="section-snapshots">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold flex items-center gap-2"><History size={16}/> Version History (Snapshots)</h4>
                    <Button variant="secondary" onClick={handleManualSnapshot} className="text-xs py-1 h-8">Create Snapshot</Button>
                </div>
                <p className="text-xs text-gray-500 mb-4">Snapshots automatically save your exact data state every 50 minutes. You can manually create one before making big changes. Clicking "Restore System" will instantly revert your financial OS back to that exact moment.</p>
                
                {historySnapshots.length === 0 ? (
                    <p className="text-xs text-gray-500 italic text-center py-2">No history snapshots yet.</p>
                ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {historySnapshots.map((snap) => (
                            <div key={snap.id} className="flex justify-between items-center p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs">
                                <div>
                                    <span className="font-bold block">{snap.label}</span>
                                    <span className="text-gray-500">{new Date(snap.timestamp).toLocaleString()}</span>
                                </div>
                                <button onClick={() => handleRestore(snap)} className="text-primary hover:underline flex items-center gap-1 font-bold">
                                    <RotateCcw size={12}/> Restore
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </Card>
      )}

      {/* Business Modal */}
      <Modal isOpen={isBusinessModalOpen} onClose={() => setBusinessModalOpen(false)} title={newBusiness.id ? "Edit Business" : "New Business"} noScroll={true} noPadding={true}>
              <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 pt-4 pb-2 overflow-x-auto shrink-0 bg-white dark:bg-slate-800">
                  <button data-tour="business-tab-basic" onClick={() => setActiveTab('basic')} className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap ${activeTab === 'basic' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'}`}>Basic Info</button>
                  <button data-tour="business-tab-ownership" onClick={() => setActiveTab('ownership')} className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap ${activeTab === 'ownership' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'}`}>Ownership & Board</button>
                  <button data-tour="business-tab-team" onClick={() => setActiveTab('team')} className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap ${activeTab === 'team' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'}`}>Team & Access</button>
                  <button data-tour="business-tab-triangle" onClick={() => setActiveTab('triangle')} className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap ${activeTab === 'triangle' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'}`}>B-I Triangle</button>
                  <button data-tour="business-tab-allocations" onClick={() => setActiveTab('allocations')} className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap ${activeTab === 'allocations' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'}`}>Allocations</button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0 space-y-4">
                  {activeTab === 'basic' && (
                      <div className="space-y-4 animate-in fade-in">
                      {/* Business Logo Uploader */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
                          <ProfileAvatar 
                              name={newBusiness.name || 'Business'} 
                              imageUrl={newBusiness.logo || newBusiness.avatar} 
                              isBusiness={true} 
                              size="lg" 
                          />
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Business Logo</h4>
                                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-200/70 dark:bg-gray-700 px-2 py-0.5 rounded">
                                      Fallback: {getInitials(newBusiness.name) || 'AL'}
                                  </span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  Upload a brand logo. If no logo is uploaded, the business initials ({getInitials(newBusiness.name) || 'AL'}) will be displayed in the switcher and entity views.
                              </p>
                              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-all shadow-sm">
                                      <Upload size={13} />
                                      <span>Upload Logo</span>
                                      <input 
                                          type="file" 
                                          accept="image/*" 
                                          className="hidden" 
                                          onChange={async (e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                  try {
                                                      const dataUrl = await processImageFile(file);
                                                      setNewBusiness(prev => ({ ...prev, logo: dataUrl, avatar: dataUrl }));
                                                  } catch (err: any) {
                                                      alert(err?.message || 'Failed to process logo');
                                                  }
                                              }
                                          }}
                                      />
                                  </label>
                                  {(newBusiness.logo || newBusiness.avatar) && (
                                      <button 
                                          type="button"
                                          onClick={() => setNewBusiness(prev => ({ ...prev, logo: undefined, avatar: undefined }))}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900/40 transition-colors"
                                      >
                                          <Trash2 size={13} />
                                          <span>Remove Logo</span>
                                      </button>
                                  )}
                              </div>
                          </div>
                      </div>

                      <Input label="Business Name" value={newBusiness.name} onChange={e => setNewBusiness({...newBusiness, name: e.target.value})} />
                      <div className="grid grid-cols-2 gap-4">
                         <Select label="Industry" options={[
                             {value:'AI / SaaS', label:'AI / SaaS'}, 
                             {value:'Tech Services', label:'Tech Services'},
                             {value:'Agency / Marketing', label:'Agency / Marketing'}, 
                             {value:'Content / YouTube', label:'Content / YouTube'}, 
                             {value:'E-commerce', label:'E-commerce'}, 
                             {value:'Education / Coaching', label:'Education / Coaching'}, 
                             {value:'Local Business', label:'Local Business'}, 
                             {value:'Other', label:'Other'}
                         ]} value={newBusiness.industry} onChange={e => setNewBusiness({...newBusiness, industry: e.target.value})} />
                         <Select label="Entity Type" options={[
                             {value:'Sole Prop', label:'Sole Prop (Risk: High)'}, 
                             {value:'Partnership', label:'Partnership (Shared Risk)'},
                             {value:'LLC', label:'LLC (Risk: Med)'}, 
                             {value:'Corp', label:'C/S Corp (Risk: Low)'}
                         ]} value={newBusiness.entityType} onChange={e => setNewBusiness({...newBusiness, entityType: e.target.value as any})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <Input label="Team Size" type="number" value={newBusiness.teamMembers?.length || 0} disabled tip="Derived strictly from Team Members list (Founder not counted in payroll size)" />
                         <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Weekly Hours</label>
                             <div className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-100 dark:bg-white/5 text-gray-500 text-sm">
                                 {newBusiness.id ? `${getCalculatedWeeklyHours(newBusiness.id).toFixed(1)} hrs/wk` : 'Calculated automatically'}
                             </div>
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <Select label="Currency" options={WORLD_CURRENCIES.map(c => ({value: c.code, label: `[${c.symbol || c.code}] ${c.code} — ${c.name}`}))} value={newBusiness.currency} onChange={e => setNewBusiness({...newBusiness, currency: e.target.value})} />
                          {newBusiness.id && (() => {
                              if (!context.engine.entities.has('personal') || !context.engine.entities.has(newBusiness.id)) return null; const ownershipResult = context.engine.calculateOwnership('personal', newBusiness.id);
                              const myEdge = context.engine.edges.find((e: any) => e.child_entity_id === newBusiness.id && e.parent_entity_id === 'personal');
                              return (
                                  <div>
                                       {myEdge ? (
                                           <Input 
                                               label={`My Direct Ownership % (Total: ${ownershipResult.totalOwnership.toFixed(1)}%)`} 
                                               type="number" 
                                               value={myEdge.percentage} 
                                               onChange={e => {
                                                   let val = parseFloat(e.target.value) || 0;
                                                   if (val < 0) val = 0;
                                                   if (val > 100) val = 100;
                                                   
                                                   const currentEdges = context.engine.edges.filter((edge: any) => edge.child_entity_id === newBusiness.id);
                                                   const updatedMembers = currentEdges.map((edge: any) => {
                                                       const entity = context.engine.entities.get(edge.parent_entity_id);
                                                       return {
                                                           id: edge.parent_entity_id,
                                                           name: entity?.name || 'Unknown',
                                                           type: (entity?.type || 'PERSON') as 'PERSON' | 'BUSINESS',
                                                           percentage: edge.parent_entity_id === 'personal' ? val : edge.percentage
                                                       };
                                                   });
                                                   updateOwnershipEdges(newBusiness.id, updatedMembers);
                                               }}
                                           />
                                       ) : (
                                           <Input 
                                               label="My Total Ownership %" 
                                               type="text" 
                                               value={`${ownershipResult.totalOwnership.toFixed(1)}%`} 
                                               disabled 
                                               tip="Indirect ownership. Edit within Board tab."
                                           />
                                       )}
                                  </div>
                              );
                          })()}
                      </div>
                      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
                          <h4 className="font-bold text-sm mb-3">Performance Targets</h4>
                          <InlineCurrencyConverter 
                              targetCurrency={newBusiness.currency || 'USD'} 
                              onApply={(val) => setNewBusiness(prev => ({ ...prev, monthlyRevenueTarget: val }))} 
                          />
                          <div className="grid grid-cols-2 gap-4">
                              <Input label={`Monthly Revenue Target (${CURRENCY_SYMBOLS[newBusiness.currency] || '$'})`} type="number" value={newBusiness.monthlyRevenueTarget || 0} onChange={e => setNewBusiness({...newBusiness, monthlyRevenueTarget: parseFloat(e.target.value)})} enableCalculator enableCurrencyConvert />
                              <Input label={`Monthly Profit Target (${CURRENCY_SYMBOLS[newBusiness.currency] || '$'})`} type="number" value={newBusiness.monthlyProfitTarget || 0} onChange={e => setNewBusiness({...newBusiness, monthlyProfitTarget: parseFloat(e.target.value)})} enableCalculator enableCurrencyConvert />
                              <Input label={`Annual Revenue Target (${CURRENCY_SYMBOLS[newBusiness.currency] || '$'})`} type="number" value={newBusiness.revenueTarget || 0} onChange={e => setNewBusiness({...newBusiness, revenueTarget: parseFloat(e.target.value)})} enableCalculator enableCurrencyConvert />
                              <Input label={`Annual Profit Target (${CURRENCY_SYMBOLS[newBusiness.currency] || '$'})`} type="number" value={newBusiness.profitTarget || 0} onChange={e => setNewBusiness({...newBusiness, profitTarget: parseFloat(e.target.value)})} enableCalculator enableCurrencyConvert />
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'ownership' && (
                  <div className="space-y-4 animate-in fade-in">
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl text-sm border border-indigo-100 dark:border-indigo-800">
                          <h4 className="font-bold mb-1 text-indigo-700 dark:text-indigo-400">Direct Ownership & Board</h4>
                          <p className="opacity-80">Define the <strong>direct</strong> owners of this business. Total ownership must equal 100%. The system will automatically calculate total effective ownership (including indirect influence) across your entire portfolio.</p>
                      </div>
                      
                      {/* List members */}
                      <div className="space-y-3">
                         {context.engine.edges.filter((e: any) => e.child_entity_id === newBusiness.id).map((edge: any) => {
                             const entity = context.engine.entities.get(edge.parent_entity_id) || data.entities?.find(ent => ent.id === edge.parent_entity_id) || (edge.parent_entity_id === 'personal' ? { name: data.profile.name } : { name: 'Unknown' });
                             return (
                                <div key={edge.id} className="flex justify-between items-center p-3 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5">
                                    <div className="flex flex-col">
                                       <div className="flex items-center gap-2">
                                           <span className="font-bold">{entity.name} {edge.parent_entity_id === 'personal' && '(You)'}</span>
                                           {entity.type && (
                                               <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${entity.type === 'BUSINESS' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                   {entity.type === 'BUSINESS' ? '🏢 BUSINESS' : '👤 PERSON'}
                                               </span>
                                           )}
                                       </div>
                                       <span className="text-[10px] text-gray-500 uppercase font-semibold">{edge.parent_entity_id === 'personal' ? 'Founding Owner' : 'Board Member'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                           <input 
                                               type="number" 
                                               className="w-20 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 pr-6 text-right font-semibold shadow-sm text-sm" 
                                               value={edge.percentage}
                                               onChange={(e) => {
                                                   let val = parseFloat(e.target.value) || 0;
                                                   if (val < 0) val = 0;
                                                   if (val > 100) val = 100;
                                                   
                                                   const currentEdges = context.engine.edges.filter((ed: any) => ed.child_entity_id === newBusiness.id);
                                                   const updatedMembers = currentEdges.map((ed: any) => {
                                                       const ent = context.engine.entities.get(ed.parent_entity_id);
                                                       return {
                                                           id: ed.parent_entity_id,
                                                           name: ent?.name || 'Unknown',
                                                           type: (ent?.type || 'PERSON') as 'PERSON' | 'BUSINESS',
                                                           percentage: ed.id === edge.id ? val : ed.percentage
                                                       };
                                                   });
                                                   updateOwnershipEdges(newBusiness.id, updatedMembers);
                                               }}
                                           />
                                           <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 font-bold pointer-events-none text-xs">%</span>
                                        </div>
                                        {edge.parent_entity_id !== 'personal' && (
                                            <button 
                                                title={`Share Structure Setup Link to ${entity.name}`}
                                                onClick={async () => {
                                                    const payload = {
                                                        business: {
                                                            id: newBusiness.id,
                                                            name: newBusiness.name,
                                                            type: newBusiness.entityType || 'Business'
                                                        },
                                                        entities: Array.from(context.engine.entities.values()).filter((ent: any) => 
                                                            context.engine.edges.some((e: any) => e.child_entity_id === newBusiness.id && e.parent_entity_id === ent.id)
                                                        ),
                                                        ownershipEdges: context.engine.edges.filter((e: any) => e.child_entity_id === newBusiness.id),
                                                        recipient: { id: edge.parent_entity_id, name: entity.name, percentage: edge.percentage },
                                                        createdAt: new Date().toISOString()
                                                    };
                                                    const token = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
                                                    const url = `${window.location.origin}/import/${token}`;
                                                    
                                                    if (navigator.share) {
                                                        try {
                                                            await navigator.share({
                                                                title: 'Business Structure Setup',
                                                                text: `Hi ${entity.name},\n\nYou have been added as an owner of ${newBusiness.name} structure with ${edge.percentage}% stake.\n\nPlease click the link below to import this into your workspace to track your distributions:`,
                                                                url: url
                                                            });
                                                        } catch (err) {
                                                            console.log(err);
                                                            navigator.clipboard.writeText(url);
                                                            alert(`Import link specially created for ${entity.name} copied to clipboard!`);
                                                        }
                                                    } else {
                                                        navigator.clipboard.writeText(url);
                                                        alert(`Import link specially created for ${entity.name} copied to clipboard!`);
                                                    }
                                                }} 
                                                className="p-2 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400"
                                            >
                                                <Share2 size={14}/>
                                            </button>
                                        )}
                                        <button onClick={() => {
                                            const currentEdges = context.engine.edges.filter((ed: any) => ed.child_entity_id === newBusiness.id && ed.parent_entity_id !== edge.parent_entity_id);
                                            const updatedMembers = currentEdges.map((ed: any) => {
                                                const ent = context.engine.entities.get(ed.parent_entity_id);
                                                return {
                                                    id: ed.parent_entity_id,
                                                    name: ent?.name || 'Unknown',
                                                    type: (ent?.type || 'PERSON') as 'PERSON' | 'BUSINESS',
                                                    percentage: ed.percentage
                                                };
                                            });
                                            updateOwnershipEdges(newBusiness.id, updatedMembers);
                                        }} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                             )
                         })}
                      </div>

                      {/* Add new member */}
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                          <h4 className="font-bold text-sm mb-3">Add Board Member</h4>
                          <div className="grid grid-cols-12 gap-2 items-end">
                              <div className="col-span-7">
                                 <Select 
                                     label="Entity" 
                                     options={[
                                       {value:'', label:'Select Entity...'}, 
                                       ...Array.from(context.engine.entities.values()).filter((e:any) => e.type === 'PERSON').map((e:any) => ({ value: e.id, label: `${e.name} (Person)` })),
                                       ...context.data.businesses.filter((b: any) => b.id !== newBusiness.id).map((b:any) => ({ id: b.id, name: b.name, type: 'BUSINESS' })).map(e => ({ value: e.id, label: `${e.name} (Business)` })),
                                       {value:'NEW_PERSON', label:'+ Create New Person'},
                                       {value:'NEW_BUSINESS', label:'+ Create New Business (External)'}
                                     ]} 
                                     value={newBoardMemberId} 
                                     onChange={e => setNewBoardMemberId(e.target.value)} 
                                 />
                                 {(newBoardMemberId === 'NEW_PERSON' || newBoardMemberId === 'NEW_BUSINESS') && (
                                     <Input label="Name" value={newBoardMemberName} onChange={e => setNewBoardMemberName(e.target.value)} className="mt-2 !mb-0" />
                                 )}
                              </div>
                              <div className="col-span-3"><Input type="number" label="Percentage" value={newBoardMemberPct} onChange={e => setNewBoardMemberPct(parseFloat(e.target.value)||0)} className="!mb-0" /></div>
                              <div className="col-span-2 pb-1">
                                  <Button variant="secondary" onClick={() => {
                                      if ((newBoardMemberId === 'NEW_PERSON' || newBoardMemberId === 'NEW_BUSINESS') && !newBoardMemberName) return;
                                      if (!newBoardMemberId) return;
                                      if (newBoardMemberPct < 0) return;
                                      
                                      const currentEdges = context.engine.edges.filter((ed: any) => ed.child_entity_id === newBusiness.id);
                                      const members = currentEdges.map((ed: any) => {
                                          const ent = context.engine.entities.get(ed.parent_entity_id);
                                          return {
                                              id: ed.parent_entity_id,
                                              name: ent?.name || 'Unknown',
                                              type: (ent?.type || 'PERSON') as 'PERSON' | 'BUSINESS',
                                              percentage: ed.percentage
                                          };
                                      });

                                      let parentId = newBoardMemberId;
                                      let parentName = '';
                                      let parentType: 'PERSON' | 'BUSINESS' = 'PERSON';

                                      if (newBoardMemberId === 'NEW_PERSON') {
                                          parentId = `ent_${Date.now()}`;
                                          parentName = newBoardMemberName;
                                          parentType = 'PERSON';
                                      } else if (newBoardMemberId === 'NEW_BUSINESS') {
                                          parentId = `ent_${Date.now()}`;
                                          parentName = newBoardMemberName;
                                          parentType = 'BUSINESS';
                                      } else {
                                          const existingEnt = context.engine.entities.get(parentId);
                                          if (existingEnt) {
                                              parentName = existingEnt.name;
                                              parentType = existingEnt.type as 'PERSON' | 'BUSINESS';
                                          } else {
                                              const biz = context.data.businesses.find(b => b.id === parentId);
                                              parentName = biz?.name || 'Unknown';
                                              parentType = 'BUSINESS';
                                          }
                                      }

                                      const existingIdx = members.findIndex(m => m.id === parentId);
                                      if (existingIdx !== -1) {
                                          members[existingIdx].percentage += newBoardMemberPct;
                                      } else {
                                          members.push({ id: parentId, name: parentName, type: parentType, percentage: newBoardMemberPct });
                                      }
                                      
                                      updateOwnershipEdges(newBusiness.id, members);
                                      
                                      setNewBoardMemberName('');
                                      setNewBoardMemberId('');
                                      setNewBoardMemberPct(0);
                                  }} className="w-full !px-0"><Plus size={18}/></Button>
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex justify-between pt-4 pb-2">
                        <div className="text-sm font-bold mt-2">
                          Total: {context.engine.edges.filter((e: any) => e.child_entity_id === newBusiness.id).reduce((sum: number, e: any) => sum + e.percentage, 0)}%
                        </div>
                        <Button 
                            variant="primary" 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            data-tour="business-connect-api"
                            onClick={async () => {
                                const payload = {
                                    business: {
                                        id: newBusiness.id,
                                        name: newBusiness.name,
                                        type: newBusiness.entityType || 'Business'
                                    },
                                    entities: Array.from(context.engine.entities.values()).filter((ent: any) => 
                                        context.engine.edges.some((e: any) => e.child_entity_id === newBusiness.id && e.parent_entity_id === ent.id)
                                    ),
                                    ownershipEdges: context.engine.edges.filter((e: any) => e.child_entity_id === newBusiness.id),
                                    createdAt: new Date().toISOString()
                                };
                                const token = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
                                const url = `${window.location.origin}/import/${token}`;
                                
                                if (navigator.share) {
                                    try {
                                        await navigator.share({
                                            title: 'Business Structure Setup',
                                            text: `You have been invited to import the business structure for ${newBusiness.name}.\n\nClick the link below to clone this business setup into your workspace:`,
                                            url: url
                                        });
                                    } catch (err) {
                                        console.log(err);
                                        navigator.clipboard.writeText(url);
                                        alert('Import link copied to clipboard!');
                                    }
                                } else {
                                    navigator.clipboard.writeText(url);
                                    alert('Import link copied to clipboard!');
                                }
                            }}
                        >
                            Share Structure
                        </Button>
                      </div>
                  </div>
              )}

              {activeTab === 'team' && (
                  // ... (Team UI unchanged) ...
                  <div className="space-y-4 animate-in fade-in">
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl text-sm border border-indigo-100 dark:border-indigo-800">
                          <h4 className="font-bold flex items-center gap-2 mb-1 text-indigo-700 dark:text-indigo-400"><LinkIcon size={14}/> Secure Access Links</h4>
                          <p className="opacity-80">Add partners or staff here. Generate a link for them to access a simplified version of this dashboard where they can only input data or view reports based on their role.</p>
                      </div>
                      <div className="space-y-3">
                        {newBusiness.teamMembers?.map(member => (
                            <div key={member.id} className="flex flex-col sm:flex-row gap-3 p-3 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5">
                                <div className="flex-1">
                                    <h5 className="font-bold flex items-center gap-2">
                                        {member.name}
                                        <span className="text-[10px] bg-white dark:bg-black/20 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 uppercase">{member.accessLevel}</span>
                                    </h5>
                                    <p className="text-xs text-gray-500">{member.roleTitle}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => simulateUser(member)} data-tour="simulated-user" className="p-2 text-xs font-bold text-gray-600 bg-white dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700 border border-gray-200 rounded hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-1" title="View As">
                                        <Eye size={12}/>
                                    </button>
                                    <button onClick={() => generateLink(member)} className="p-2 text-xs font-bold text-primary bg-primary/10 rounded hover:bg-primary/20 flex items-center gap-1" title="Copy Link">
                                        <LinkIcon size={12}/> {generatedLink === member.accessLink ? 'Copied!' : 'Link'}
                                    </button>
                                    <button 
                                        onClick={() => copyRoleKey(member)} 
                                        className="p-2 text-xs font-bold text-violet-600 bg-violet-50 border border-violet-100 rounded hover:bg-violet-100 flex items-center gap-1 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/40" 
                                        title="Copy Business Role Key"
                                    >
                                        {copiedRoleMemberId === member.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12}/>}
                                        <span>{copiedRoleMemberId === member.id ? 'Key Copied!' : 'Role Key'}</span>
                                    </button>
                                    <button onClick={() => downloadTeamFile(member)} className="p-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded hover:bg-indigo-100 flex items-center gap-1" title="Download Access Key File">
                                        <Key size={12}/> File
                                    </button>
                                    <button onClick={() => removeTeamMember(member.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-12 gap-2 items-end pt-2 border-t border-gray-100 dark:border-gray-700">
                          <div className="col-span-4"><Input label="Name" value={newTeamMember.name} onChange={e => setNewTeamMember({...newTeamMember, name: e.target.value})} className="!mb-0" /></div>
                          <div className="col-span-4"><Input label="Role" value={newTeamMember.roleTitle} onChange={e => setNewTeamMember({...newTeamMember, roleTitle: e.target.value})} className="!mb-0" /></div>
                          <div className="col-span-3">
                              <label className="block text-xs font-medium mb-1">Access</label>
                              <select 
                                value={newTeamMember.accessLevel} 
                                onChange={e => setNewTeamMember({...newTeamMember, accessLevel: e.target.value as any})}
                                className="w-full px-2 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800"
                              >
                                  <option value="viewer">Viewer (Read Only)</option>
                                  <option value="finance_staff">Finance (Input Only)</option>
                                  <option value="partner">Partner (Admin)</option>
                              </select>
                          </div>
                          <div className="col-span-1 pb-1">
                              <Button variant="secondary" onClick={addTeamMember} className="w-full !px-0"><Plus size={18}/></Button>
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'triangle' && (
                  // ... (Triangle UI unchanged) ...
                  <div className="space-y-4 animate-in fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                          <RangeInput label="Mission" value={newBusiness.biTriangle?.mission || 0} onChange={v => setNewBusiness({...newBusiness, biTriangle: { ...newBusiness.biTriangle!, mission: v }})} tip="Is the spiritual mission clear?" />
                          <RangeInput label="Leadership" value={newBusiness.biTriangle?.leadership || 0} onChange={v => setNewBusiness({...newBusiness, biTriangle: { ...newBusiness.biTriangle!, leadership: v }})} tip="Do you inspire or just dictate?" />
                          <RangeInput label="Team" value={newBusiness.biTriangle?.team || 0} onChange={v => setNewBusiness({...newBusiness, biTriangle: { ...newBusiness.biTriangle!, team: v }})} tip="Do you have CPA, Attorneys?" />
                          <RangeInput label="Cashflow" value={newBusiness.biTriangle?.cashflow || 0} onChange={v => setNewBusiness({...newBusiness, biTriangle: { ...newBusiness.biTriangle!, cashflow: v }})} tip="Do you know your burn rate?" />
                          <RangeInput label="Comms" value={newBusiness.biTriangle?.communications || 0} onChange={v => setNewBusiness({...newBusiness, biTriangle: { ...newBusiness.biTriangle!, communications: v }})} tip="Sales & Marketing strength?" />
                          <RangeInput label="Systems" value={newBusiness.biTriangle?.systems || 0} onChange={v => setNewBusiness({...newBusiness, biTriangle: { ...newBusiness.biTriangle!, systems: v }})} tip="Can you leave for 6 months?" />
                          <RangeInput label="Legal" value={newBusiness.biTriangle?.legal || 0} onChange={v => setNewBusiness({...newBusiness, biTriangle: { ...newBusiness.biTriangle!, legal: v }})} tip="IP & Contracts?" />
                          <RangeInput label="Product" value={newBusiness.biTriangle?.product || 0} onChange={v => setNewBusiness({...newBusiness, biTriangle: { ...newBusiness.biTriangle!, product: v }})} tip="Is the product excellent?" />
                      </div>
                  </div>
              )}

              {activeTab === 'allocations' && (
                  <div className="space-y-4 animate-in fade-in">
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {tempBusinessAllocations.filter(a => !a.parentId).map((alloc) => {
                            const index = tempBusinessAllocations.findIndex(a => a.id === alloc.id);
                            return (
                                <AllocationEditorItem 
                                    key={alloc.id} 
                                    alloc={alloc} 
                                    allAllocs={tempBusinessAllocations} 
                                    index={index}
                                    draggedItemIndex={draggedTempItemIndex}
                                    activeProfileId={newBusiness.id || 'temp_business'}
                                    handleDragStart={handleTempDragStart}
                                    handleDragOver={handleTempDragOver}
                                    handleDragEnd={handleTempDragEnd}
                                    updateAllocation={(id: string, field: string, val: any) => setTempBusinessAllocations(prev => prev.map(a => a.id === id ? { ...a, [field]: val } : a))}
                                    removeAllocation={removeTempAllocation}
                                />
                            );
                        })}
                      </div>
                      <div className="flex gap-2 items-center pt-2">
                          <Input placeholder="New Bucket" value={newTempAllocName} onChange={e => setNewTempAllocName(e.target.value)} className="!mb-0 flex-1" />
                          <div className="flex-1">
                              <Select options={getParentOptions(tempBusinessAllocations)} value={newTempAllocParentId} onChange={e => setNewTempAllocParentId(e.target.value)} className="!mb-0" />
                          </div>
                          <Button variant="secondary" onClick={addTempAllocation}><Plus size={16} /></Button>
                      </div>
                      <div className="flex justify-between items-center bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-xl mt-4"><span className="font-bold text-sm">Total</span><span className={`font-bold ${Math.abs(tempBusinessAllocations.filter(a => !a.parentId).reduce((s,a) => s + (a.percentage || 0), 0) - 100) < 0.1 ? 'text-green-500' : 'text-red-500'}`}>{tempBusinessAllocations.filter(a => !a.parentId).reduce((s,a) => s + (a.percentage || 0), 0)}%</span></div>
                  </div>
              )}
              </div>

              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/80 shrink-0">
                  {activeTab === 'basic' && (
                      <div className="flex justify-end">
                          <Button onClick={() => setActiveTab('ownership')}>Next: Ownership & Board</Button>
                      </div>
                  )}
                  {activeTab === 'ownership' && (
                      <div className="flex justify-between">
                        <Button variant="secondary" onClick={() => setActiveTab('basic')}>Back</Button>
                        <Button onClick={() => setActiveTab('team')}>Next: Team & Access</Button>
                      </div>
                  )}
                  {activeTab === 'team' && (
                      <div className="flex justify-between">
                          <Button variant="secondary" onClick={() => setActiveTab('ownership')}>Back</Button>
                          <Button onClick={() => setActiveTab('triangle')}>Next: Structure</Button>
                      </div>
                  )}
                  {activeTab === 'triangle' && (
                      <div className="flex justify-between">
                          <Button variant="secondary" onClick={() => setActiveTab('team')}>Back</Button>
                          <Button onClick={() => setActiveTab('allocations')}>Next: Allocations</Button>
                      </div>
                  )}
                  {activeTab === 'allocations' && (
                      <div className="flex justify-between">
                          <Button variant="secondary" onClick={() => setActiveTab('triangle')}>Back</Button>
                          <Button onClick={handleAddBusiness}>{newBusiness.id ? 'Update Business' : 'Initialize Business'}</Button>
                      </div>
                  )}
              </div>
      </Modal>

      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Factory Reset">
          <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl text-sm text-red-800 dark:text-red-500 border border-red-200 dark:border-red-900/30">
                  <AlertTriangle className="mb-2 shrink-0" size={24} />
                  <p className="font-bold">WARNING: IRREVERSIBLE ACTION</p>
                  <p className="mt-1">This will permanently delete all your financial data, businesses, transactions, and settings from this browser. This data cannot be recovered unless you have manually downloaded a backup.</p>
              </div>
              <p className="text-sm font-medium">To confirm, please type exactly <b>DELETE</b> below:</p>
              <Input
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="Type DELETE"
              />
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <Button variant="secondary" onClick={() => setIsResetModalOpen(false)}>Cancel</Button>
                  <Button 
                      variant="danger" 
                      onClick={executeFactoryReset} 
                      disabled={resetConfirmText !== 'DELETE'}
                  >
                      Nuke My Data
                  </Button>
              </div>
          </div>
      </Modal>

      {/* Sync & Role Keys Dedicated Modal */}
      <Modal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} title="Cross-Device Sync & Team Access Keys">
        <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
          {/* Section 1: Cross-Device Sync Engine */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <UploadCloud size={16} />
              </span>
              <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                Live Multiplayer Sync Channel
              </h3>
            </div>

            {/* Sync Status Banner */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              syncStatus === 'connected' && profile.syncKey?.trim()
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : syncStatus === 'connecting'
                ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                  syncStatus === 'connected' && profile.syncKey?.trim()
                    ? 'bg-emerald-500 animate-pulse'
                    : syncStatus === 'connecting'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-gray-400'
                }`} />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <span>
                      {syncStatus === 'connected' && profile.syncKey?.trim()
                        ? `🟢 Live Connected (${peerCount} device${peerCount === 1 ? '' : 's'} in room)`
                        : syncStatus === 'connecting'
                        ? '🟡 Connecting to room channel...'
                        : '⚪ Standalone / Local Storage Mode'}
                    </span>
                    {lastSyncedAt && (
                      <span className="text-[10px] font-normal opacity-75">
                        • Last synced: {lastSyncedAt}
                      </span>
                    )}
                  </div>
                  <div className="text-xs opacity-90 mt-0.5">
                    {profile.syncKey?.trim()
                      ? `Sharing financial state on room key "${profile.syncKey.trim()}". All devices in this room stay synchronized.`
                      : 'Changes stay on this device only. Set or generate a Sync Key below to link your other phone, tablet, or friend.'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {profile.syncKey?.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(profile.syncKey || '');
                      setCopiedSyncKey(true);
                      setTimeout(() => setCopiedSyncKey(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 shrink-0 shadow-xs"
                  >
                    {copiedSyncKey ? <CheckCircle size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span>{copiedSyncKey ? 'Key Copied!' : 'Copy Key'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sync Trigger & Action Toolbar */}
            {profile.syncKey?.trim() && (
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div>
                    <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200">
                      ⚡ Instant Data Sync Triggers
                    </h4>
                    <p className="text-[11px] text-blue-800 dark:text-blue-300">
                      Push your current profile & business records to other devices, or pull updates.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => {
                        const ok = pushSyncData();
                        if (ok) {
                          setSyncFeedback({ message: 'Broadcasted full data to all devices in room!', isError: false });
                          setTimeout(() => setSyncFeedback(null), 4000);
                        } else {
                          setSyncFeedback({ message: 'Sync key not active. Connect below first.', isError: true });
                          setTimeout(() => setSyncFeedback(null), 4000);
                        }
                      }}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      <UploadCloud size={14} className={isSyncing ? 'animate-bounce' : ''} />
                      <span>{isSyncing ? 'Broadcasting...' : 'Push Data to Devices'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => {
                        const ok = pullSyncData();
                        if (ok) {
                          setSyncFeedback({ message: 'Requested latest records from connected peers!', isError: false });
                          setTimeout(() => setSyncFeedback(null), 4000);
                        }
                      }}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                    >
                      <DownloadCloud size={14} className={isSyncing ? 'animate-spin' : ''} />
                      <span>Pull / Refresh Data</span>
                    </button>
                  </div>
                </div>

                {syncFeedback && (
                  <div className={`text-xs p-2 rounded-lg font-medium ${
                    syncFeedback.isError ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                  }`}>
                    {syncFeedback.isError ? '⚠️ ' : '✅ '} {syncFeedback.message}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sync Key (Room Channel)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const randomCode = 'BQ-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
                        setProfile({ ...profile, syncKey: randomCode });
                        connectSyncKey(randomCode);
                        pushSyncData({ ...data, profile: { ...data.profile, syncKey: randomCode } });
                      }}
                      className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Key size={12} />
                      <span>Generate New Key</span>
                    </button>
                    {profile.syncKey && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfile({ ...profile, syncKey: '' });
                          connectSyncKey('');
                        }}
                        className="text-xs font-semibold text-gray-400 hover:text-rose-500"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={profile.syncKey || ''} 
                    onChange={e => setProfile({...profile, syncKey: e.target.value})} 
                    placeholder="e.g. BQ-7X9K-AL5P or any room code"
                    className="!mb-0 flex-1 font-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (profile.syncKey) {
                        connectSyncKey(profile.syncKey);
                        pushSyncData({ ...data, profile: { ...data.profile, syncKey: profile.syncKey } });
                        setSyncFeedback({ message: `Connected to room "${profile.syncKey}" and broadcasting data!`, isError: false });
                        setTimeout(() => setSyncFeedback(null), 4000);
                      }
                    }}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary/90 transition-all shrink-0 shadow-sm"
                  >
                    Connect
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Enter the exact same key on your other phone or tablet. Tap <strong>Connect</strong>, then tap <strong>Push Data</strong> to broadcast.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Role in this Sync Room</label>
                <select 
                  value={profile.role || 'admin'} 
                  onChange={e => setProfile({...profile, role: e.target.value as any})}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                >
                  <option value="admin">Admin (Full Access & Synchronization Host)</option>
                  <option value="finance_staff">Financial Team (Approval-Restricted View)</option>
                  <option value="viewer">Viewer (Read-Only Access)</option>
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Admins can broadcast personal and business ledger updates to all connected devices.
                </p>
              </div>
            </div>

            {/* Simple Explanation Guide */}
            <div className="p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 text-xs space-y-1.5 text-gray-600 dark:text-gray-300">
              <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>📱</span> How to view your data on a friend's phone or second device:
              </div>
              <p>1. <strong>Copy</strong> or write down your Sync Key shown above.</p>
              <p>2. Open this app on the second device, go to <strong>Settings</strong>, and paste the exact same Sync Key in this box.</p>
              <p>3. Tap <strong>Connect</strong>, then tap <strong>Push Data to Devices</strong> on your first phone and <strong>Pull / Refresh Data</strong> on the second phone.</p>
              <p>4. All your personal entries, business entities, and balances will appear immediately without losing any data!</p>
            </div>
          </div>

          <hr className="border-gray-200 dark:border-gray-800" />

          {/* Section 2: Business Role Key Redemption */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Key size={16} />
              </span>
              <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                Redeem Business Role Key (Team & Partner Access)
              </h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Joined as a partner, executive, or staff for another business? Paste the <strong>Business Role Key</strong> (starts with <code>BQ-ROLE-</code>) or upload the <code>AccessKey.json</code> you received to immediately access the company's financial books with your assigned permissions.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={roleKeyInput}
                onChange={e => setRoleKeyInput(e.target.value)}
                placeholder="Paste Business Role Key (e.g. BQ-ROLE-ey...)"
                className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 font-mono text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setRoleKeyInput(text.trim());
                    } catch {
                      alert('Please paste directly into the box.');
                    }
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 transition-all"
                >
                  Paste
                </button>

                <label className="cursor-pointer px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all inline-flex items-center gap-1">
                  <Upload size={13} />
                  <span>Upload Key</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = ev => {
                          const content = ev.target?.result as string;
                          if (content) handleRedeemRoleKey(content);
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => handleRedeemRoleKey(roleKeyInput)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
                >
                  Redeem & Open
                </button>
              </div>
            </div>

            {roleKeyStatus && (
              <div className={`text-xs p-3 rounded-xl font-medium flex items-center gap-2 ${
                roleKeyStatus.isError
                  ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900/40'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900/40'
              }`}>
                <span>{roleKeyStatus.isError ? '⚠️' : '🎉'}</span>
                <span>{roleKeyStatus.message}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
          <Button variant="secondary" onClick={() => setIsSyncModalOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsView;
