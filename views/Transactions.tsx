import React, { useContext, useState, useMemo, useEffect } from "react";
import { AppContext, MoneyDisplay } from "../App";
import { Card, Button, Modal, Input, Select } from "../components/Shared";
import {
  Plus,
  Trash2,
  Bot,
  Info,
  Layers,
  Edit2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Lock,
  Download,
  Filter,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  Banknote,
  Scale,
  Clock,
  Copy,
  Share2,
  CheckCircle,
  X,
} from "lucide-react";
import { Entry, getSystemTimeString, formatEntryTime, buildEntryTimestamp } from "../types";
import { FREQUENCY_OPTIONS } from "../constants";
import * as AIService from "../services/aiService";
import { downloadReceipt } from "../services/receiptService";
import { buildHierarchicalOptions, getEffectiveBalance } from "../services/bucketEngine";
import { LiabilityCalculatorForm } from "./Assets";
import { InlineCurrencyConverter } from "../components/InlineCurrencyConverter";

const TransactionsView = () => {
  const context = useContext(AppContext)!;
  
  // View State
  const [activeTab, setActiveTab] = useState<
    "income" | "expense" | "transfer" | "distribution"
  >("income");
  const [expandedSeq, setExpandedSeq] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
     if (context.requestedTab) {
        if (context.requestedTab === 'distribution') setActiveTab('distribution');
        if (context.requestedTab === 'income') setActiveTab('income');
        if (context.requestedTab === 'expense') setActiveTab('expense');
        if (context.requestedTab === 'transfer') setActiveTab('transfer');
        context.setRequestedTab(null);
     }
  }, [context.requestedTab]);

  const [excludeTransfers, setExcludeTransfers] = useState<boolean>(true); // For reporting
  const {
    filteredData,
    profileData,
    addEntry,
    addTransfer,
    addPendingEntry,
    updateEntry,
    deleteEntry,
    distributeBusinessProfit,
    symbol,
    fullCurrencyName,
    activeCurrencyCode,
    activeProfileId,
    data,
    formatAmount,
    simulatedUser,
    effectiveRole,
    metrics,
    timeFilter,
  } = context;

  // Modal State
  const [isModalOpen, setModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<"monthly" | "weekly" | "daily">(
    "monthly",
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Filter State
  const [localTimeFilter, setLocalTimeFilter] = useState<
    "24h" | "7d" | "month" | "year" | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    timeRange: 'Any time',
    exactDate: '',
    category: 'All',
    ownerId: 'All',
    actorRole: 'All',
    incomeSourceType: 'All',
    recurringFrequency: 'All',
    recurringCustomVal: 1,
    recurringCustomUnit: 'months'
  });

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(profileData.entries.map((e) => e.category))).filter(Boolean).sort();
  }, [profileData.entries]);


  const isBusiness = activeProfileId !== "personal";
  const isFinanceStaff = effectiveRole === "finance_staff";
  const isViewer = effectiveRole === "viewer";

  const profileName =
    activeProfileId === "personal"
      ? data.profile.name
      : data.businesses.find((b) => b.id === activeProfileId)?.name ||
        "Unknown Business";

  // Buckets Logic - RENAME UNCATEGORIZED FOR BUSINESS
  const uncatBucket = profileData.allocations.find(
    (a) => a.name === "Uncategorized",
  );
  const otherBuckets = profileData.allocations.filter(
    (a) => a.name !== "Uncategorized",
  );

  const buckets = [
    {
      value: "Uncategorized",
      label: `${isBusiness ? "Main Revenue Bucket (Landing)" : "Main Income Bucket (Landing)"} (${formatAmount(uncatBucket?.balance || 0)})`,
    },
    ...buildHierarchicalOptions(otherBuckets, (a) => `${a.name} (${formatAmount(getEffectiveBalance(profileData.allocations, a.id))})`)
  ];

  const distBuckets = [
    { value: "Uncategorized", label: "Proportional (All Buckets)" },
    ...buildHierarchicalOptions(otherBuckets, (a) => `${a.name} (${formatAmount(getEffectiveBalance(profileData.allocations, a.id))})`)
  ];

  const getSimulatedDate = () => {
    const now = new Date();
    now.setFullYear(2026);
    return now.toISOString().split("T")[0];
  };

  // --- Distribution Engine State ---
  const [payOwnersAmount, setPayOwnersAmount] = useState<number>(0);
  const [payOwnersDate, setPayOwnersDate] =
    useState<string>(getSimulatedDate());
  const [payOwnersTime, setPayOwnersTime] =
    useState<string>(() => getSystemTimeString());
  const [payOwnersDesc, setPayOwnersDesc] = useState<string>(
    "Profit Distribution",
  );
  const [payOwnersFrequency, setPayOwnersFrequency] =
    useState<string>("one_time");
  const [payOwnersCustomVal, setPayOwnersCustomVal] = useState<number>(1);
  const [payOwnersCustomUnit, setPayOwnersCustomUnit] = useState<string>("months");
  const [payOwnersAuto, setPayOwnersAuto] = useState<boolean>(false);
  const [payOwnersIsDirect, setPayOwnersIsDirect] = useState<boolean>(false);
  const [payOwnersBucket, setPayOwnersBucket] = useState<string>("Uncategorized");
  const [payOwnersActorRole, setPayOwnersActorRole] = useState<string>("Founder");
  const [editingDistProfile, setEditingDistProfile] = useState<any>(null);
  
  // Recurring Income Models Modal State
  const [isRecurringModelsOpen, setIsRecurringModelsOpen] = useState(false);
  const [recurringEditTarget, setRecurringEditTarget] = useState<any>(null);
  const [recurringSearchQuery, setRecurringSearchQuery] = useState('');



  const retainedEarningsStats = useMemo(() => {
    if (activeProfileId === "personal") return null;
    const entityEntries = data.entries.filter(
      (e) => e.profileId === activeProfileId,
    );
    const totalIncome = entityEntries
      .filter((e) => e.type === "income" && e.subtype !== "INTERNAL_TRANSFER")
      .reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = entityEntries
      .filter(
        (e) =>
          e.type === "expense" &&
          e.subtype !== "INTERNAL_TRANSFER" &&
          e.subtype !== "DISTRIBUTION",
      )
      .reduce((sum, e) => sum + e.amount, 0);
    const totalDistributions = entityEntries
      .filter((e) => e.type === "expense" && e.subtype === "DISTRIBUTION")
      .reduce((sum, e) => sum + e.amount, 0);
    const retainedEarnings = totalIncome - totalExpenses - totalDistributions;
    return { totalIncome, totalExpenses, totalDistributions, retainedEarnings };
  }, [data.entries, activeProfileId]);

  const owners = useMemo(() => {
    // @ts-ignore
    return context.engine
      ? context.engine.edges.filter(
          (e) => e.child_entity_id === activeProfileId,
        )
      : [];
  }, [context.engine, activeProfileId]);

  const handlePayOwnersSubmit = () => {
    if (!retainedEarningsStats) return;
    const maxAmount = retainedEarningsStats.retainedEarnings;

    if (isNaN(payOwnersAmount) || payOwnersAmount <= 0) {
      alert("Amount must be greater than zero.");
      return;
    }
    if (payOwnersAmount > maxAmount) {
      alert(
        `Insufficient retained earnings. Maximum available is ${formatAmount(maxAmount)}.`,
      );
      return;
    }
    
    let finalBucket = payOwnersBucket;
    if (payOwnersBucket !== "Uncategorized") {
      const targetBucket = profileData.allocations.find(a => a.name === payOwnersBucket);
      const bBalance = targetBucket ? getEffectiveBalance(profileData.allocations, targetBucket.id) : 0;
      if (payOwnersAmount > bBalance) {
        const totalProfileCash = profileData.allocations.reduce((sum, a) => sum + Math.max(0, a.balance), 0);
        if (totalProfileCash < payOwnersAmount) {
           alert(`Insufficient total funds. Your total cash across all buckets is ${formatAmount(totalProfileCash)}, but you are trying to distribute ${formatAmount(payOwnersAmount)}.`);
           return;
        }

        if (!confirm(`Insufficient funds in selected bucket (${formatAmount(bBalance)}).\n\nDo you want to instead use the default method and remove the money dynamically from all profit buckets?`)) {
          return; // User canceled
        } else {
          finalBucket = "Uncategorized"; // User clicked OK, use dynamic all buckets
        }
      }
    }

    if (finalBucket === "Uncategorized") {
        const allocsForProp = profileData.allocations.filter(a => a.profileId === activeProfileId && a.name !== 'Uncategorized');
        const totalProfitCash = allocsForProp.reduce((sum, a) => sum + Math.max(0, a.balance), 0);
        if (payOwnersAmount > totalProfitCash) {
            const mainBalance = profileData.allocations.find(a => a.profileId === activeProfileId && a.name === 'Uncategorized')?.balance || 0;
            alert(`Insufficient funds in your profit buckets (${formatAmount(totalProfitCash)}).\n\nThe Proportional method only deducts from profit buckets, not the main income bucket. Please move funds from your Main Bucket (${formatAmount(Math.max(0, mainBalance))}) to profit buckets first, or select a specific bucket to deduct from.`);
            return;
        }
    }

    if (!window.confirm("Add this distribution?")) {
      return;
    }

    try {
      const sequenceId = payOwnersFrequency !== 'one_time' ? `seq_${Date.now()}` : undefined;
      const actualFrequency = payOwnersFrequency === 'custom' ? `custom:${payOwnersCustomVal}:${payOwnersCustomUnit}` : payOwnersFrequency;

      distributeBusinessProfit(
        activeProfileId,
        payOwnersAmount,
        payOwnersDesc,
        payOwnersDate,
        finalBucket,
        {
           frequency: actualFrequency as any,
           isRecurring: payOwnersFrequency !== "one_time",
           lastExecutedAt: new Date().toISOString(),
           autoDistribute: payOwnersAuto,
           sourceBucket: finalBucket,
           sequenceId,
           targetAmount: payOwnersAmount,
           targetDescription: payOwnersDesc,
           actorRole: payOwnersActorRole,
           isActive: true,
           time: payOwnersTime || getSystemTimeString()
        },
        undefined,
        payOwnersTime || getSystemTimeString()
      );
      setPayOwnersAmount(0);
      setPayOwnersDesc("Profit Distribution");
      setPayOwnersFrequency("one_time");
      setPayOwnersAuto(false);
      setPayOwnersBucket("Uncategorized");
      setPayOwnersTime(getSystemTimeString());
      alert("Successfully processed distribution.");
    } catch (err: any) {
      alert(err.message || "Distribution failed.");
    }
  };
  // --- End Distribution Engine State ---

  const [newEntry, setNewEntry] = useState<Partial<Entry>>({
    date: getSimulatedDate(),
    time: getSystemTimeString(),
    description: "",
    amount: 0,
    category: "Uncategorized",
    isDirectAllocation: false,
    hoursWorked: 0,
    actorRole: "Founder",
    profileId: activeProfileId,
    frequency: "one_time",
    incomeSourceType: "OTHER",
  });

  const [customFrequencyVal, setCustomFrequencyVal] = useState<number>(1);
  const [customFrequencyUnit, setCustomFrequencyUnit] = useState<string>("months");

  const [newTransfer, setNewTransfer] = useState<{
    date: string,
    time: string,
    description: string,
    amount: number,
    fromEntityId: string,
    toEntityId: string,
    category: string,
    toCategory: string,
    isInternalBucketTransfer: boolean,
    isLoan?: boolean,
    loanDetails?: any
  }>({
    date: getSimulatedDate(),
    time: getSystemTimeString(),
    description: "",
    amount: 0,
    fromEntityId: activeProfileId,
    toEntityId: "",
    category: "Uncategorized", // Bucket to pay from
    toCategory: "Uncategorized", // Bucket to pay into
    isInternalBucketTransfer: false,
    isLoan: false,
    loanDetails: {
      interestRate: 0,
      termValue: 12,
      termUnit: 'Months',
      repaymentDate: '',
      monthlyPayment: 0,
      agreementReason: ''
    }
  });

  const transferSenderAllocations = data.allocations.filter(
    (a) => a.profileId === newTransfer.fromEntityId,
  );
  const transferUncatBucket = transferSenderAllocations.find(
    (a) => a.name === "Uncategorized",
  );
  const transferOtherBuckets = transferSenderAllocations.filter(
    (a) => a.name !== "Uncategorized",
  );
  const transferSenderIsBusiness =
    newTransfer.fromEntityId && newTransfer.fromEntityId !== "personal";
  const transferBuckets = [
    {
      value: "Uncategorized",
      label: `${transferSenderIsBusiness ? "Main Revenue Bucket (Landing)" : "Main Income Bucket (Landing)"} (${formatAmount(transferUncatBucket?.balance || 0)})`,
    },
    ...buildHierarchicalOptions(transferOtherBuckets, (a) => `${a.name} (${formatAmount(getEffectiveBalance(transferSenderAllocations, a.id))})`)
  ];

  const transferReceiverAllocations = data.allocations.filter(
    (a) => a.profileId === newTransfer.toEntityId,
  );
  const transferReceiverUncatBucket = transferReceiverAllocations.find(
    (a) => a.name === "Uncategorized",
  );
  const transferReceiverOtherBuckets = transferReceiverAllocations.filter(
    (a) => a.name !== "Uncategorized",
  );
  const transferReceiverIsBusiness =
    newTransfer.toEntityId && newTransfer.toEntityId !== "personal";
  const transferReceiverBuckets = [
    {
      value: "Uncategorized",
      label: `${transferReceiverIsBusiness ? "Main Revenue Bucket (Landing)" : "Main Income Bucket (Landing)"} (${formatAmount(transferReceiverUncatBucket?.balance || 0)})`,
    },
    ...buildHierarchicalOptions(transferReceiverOtherBuckets, (a) => `${a.name} (${formatAmount(getEffectiveBalance(transferReceiverAllocations, a.id))})`)
  ];

  useEffect(() => {
    setNewTransfer((prev) => ({ ...prev, fromEntityId: activeProfileId }));
  }, [activeProfileId]);

  const getEntityOptions = () => {
    const options = [];
    options.push({ value: "personal", label: data.profile.name });
    data.businesses.forEach((b) => {
      options.push({ value: b.id, label: b.name });
    });
    return options;
  };

  const entityOptions = getEntityOptions();

  const handleTransferSubmit = () => {
    let fromEntity = newTransfer.fromEntityId;
    let toEntity = newTransfer.toEntityId;

    if (newTransfer.isInternalBucketTransfer) {
      fromEntity = activeProfileId;
      toEntity = activeProfileId;
      if (newTransfer.category === newTransfer.toCategory) {
        alert("Cannot transfer to the same bucket.");
        return;
      }
    } else {
      if (!fromEntity || !toEntity) {
        alert("Please select both a sender and a receiver entity.");
        return;
      }
      if (fromEntity === toEntity) {
        alert("Cannot transfer to the same entity.");
        return;
      }
    }

    if (!newTransfer.description || !newTransfer.amount) {
      alert("Please provide a valid description and amount greater than 0.");
      return;
    }

    const currentAllocations = data.allocations.filter(
      (a) => a.profileId === fromEntity,
    );
    let finalTransferCategory = newTransfer.category || "Uncategorized";
    const targetBucket = currentAllocations.find(
      (a) => a.name === finalTransferCategory,
    );
    const availableBalance = targetBucket ? getEffectiveBalance(currentAllocations, targetBucket.id) : 0;

    if (availableBalance < newTransfer.amount) {
      const totalProfileCash = currentAllocations.reduce((sum, a) => sum + a.balance, 0);
      if (totalProfileCash < newTransfer.amount) {
         alert(`Insufficient total funds. Your total cash across all buckets is ${formatAmount(totalProfileCash)}, but you are trying to transfer ${formatAmount(newTransfer.amount)}.`);
         return;
      }

      if (!window.confirm(`Insufficient funds in selected bucket (${formatAmount(availableBalance)}).\n\nDo you want to instead use the default method and remove the money dynamically from all buckets?`)) {
        return;
      } else {
        finalTransferCategory = "PROPORTIONAL_DEDUCTION";
      }
    }

    if (!window.confirm("Are you sure you want to process this transfer?")) {
      return;
    }

    try {
      addTransfer(
        newTransfer.amount,
        fromEntity,
        toEntity,
        newTransfer.description,
        newTransfer.date,
        finalTransferCategory,
        newTransfer.isInternalBucketTransfer ? newTransfer.toCategory : "Uncategorized",
        newTransfer.isLoan,
        newTransfer.loanDetails,
        newTransfer.time || getSystemTimeString()
      );
      setIsTransferModalOpen(false);
      setNewTransfer({
        date: getSimulatedDate(),
        time: getSystemTimeString(),
        description: "",
        amount: 0,
        fromEntityId: activeProfileId,
        toEntityId: "",
        category: "Uncategorized",
        toCategory: "Uncategorized",
        isInternalBucketTransfer: false,
        isLoan: false,
        loanDetails: {
          interestRate: 0,
          termValue: 12,
          termUnit: 'Months',
          repaymentDate: '',
          monthlyPayment: 0,
          agreementReason: ''
        }
      });
      alert("Successfully processed transfer.");
    } catch (err: any) {
      alert(err.message || "Failed to process transfer");
    }
  };

  // Filter Logic
  const entries = useMemo(() => {
    let filtered = [];
    if (activeTab === "transfer") {
      filtered = profileData.entries.filter(
        (e) => e.subtype === "INTERNAL_TRANSFER",
      );
    } else if (activeTab === "distribution") {
      filtered = profileData.entries.filter(
        (e) => e.subtype === "DISTRIBUTION",
      );
    } else {
      filtered = profileData.entries.filter((e) => e.type === activeTab);
      if (excludeTransfers) {
        filtered = filtered.filter((e) => e.subtype !== "INTERNAL_TRANSFER");
        if (activeTab === "expense") {
          filtered = filtered.filter((e) => e.subtype !== "DISTRIBUTION");
        }
      }
    }

    const now = new Date();
    now.setFullYear(2026);

    const currentYear = now.getFullYear();
    const currentMonth = now.toISOString().slice(0, 7);

    if (localTimeFilter !== "all") {
      filtered = filtered.filter((e) => {
        const entryDate = new Date(e.date);
        const diffTime = Math.abs(now.getTime() - entryDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (localTimeFilter === "24h") return diffDays <= 1;
        if (localTimeFilter === "7d") return diffDays <= 7;
        if (localTimeFilter === "month") return e.date.startsWith(currentMonth);
        if (localTimeFilter === "year")
          return e.date.startsWith(currentYear.toString());
        return true;
      });
    }

    if (advancedFilters.timeRange !== 'Any time') {
      filtered = filtered.filter((e) => {
        const entryDate = new Date(e.date);
        const diffTime = Math.abs(now.getTime() - entryDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (advancedFilters.timeRange === 'Today') return diffDays <= 1;
        if (advancedFilters.timeRange === 'This week') return diffDays <= 7;
        if (advancedFilters.timeRange === 'This month') return e.date.startsWith(currentMonth);
        if (advancedFilters.timeRange === 'Past 3 months') return diffDays <= 90;
        if (advancedFilters.timeRange === 'This year') return e.date.startsWith(currentYear.toString());
        if (advancedFilters.timeRange === 'Exact date' && advancedFilters.exactDate) return e.date === advancedFilters.exactDate;
        return true;
      });
    }

    if (advancedFilters.category !== 'All') {
      filtered = filtered.filter(e => e.category === advancedFilters.category);
    }

    if (activeTab === 'income' && advancedFilters.ownerId !== 'All') {
      filtered = filtered.filter(e => e.source === advancedFilters.ownerId || (e.linkedGoalId === advancedFilters.ownerId));
    }
    
    if ((activeTab === 'income' || activeTab === 'distribution') && advancedFilters.incomeSourceType !== 'All') {
      filtered = filtered.filter(e => {
         const hasHours = (e.hoursWorked || 0) > 0;
         
         let actualFreq = e.frequency;
         if (e.subtype === 'DISTRIBUTION' && !actualFreq && e.transfer_id) {
            const distRecord = profileData.distributionRecords?.find((dr: any) => dr.distributionId === e.transfer_id);
            if (distRecord?.meta?.frequency) {
               actualFreq = distRecord.meta.frequency;
            }
         }
         
         const isRecurring = actualFreq && actualFreq !== 'one_time';
         
         if (advancedFilters.incomeSourceType === 'ACTIVE') {
             if (activeTab === 'distribution') return !isRecurring;
             return hasHours;
         }
         if (advancedFilters.incomeSourceType === 'PASSIVE') return !hasHours;
         if (advancedFilters.incomeSourceType === 'RECURRING') {
             if (hasHours || !isRecurring) return false;
             if (advancedFilters.recurringFrequency === 'All') return true;
             if (advancedFilters.recurringFrequency === 'custom') {
                 return actualFreq === `custom:${advancedFilters.recurringCustomVal}:${advancedFilters.recurringCustomUnit}`;
             }
             return actualFreq === advancedFilters.recurringFrequency;
         }
         return true;
      });
    }

    if (advancedFilters.actorRole !== 'All') {
      filtered = filtered.filter(e => e.actorRole === advancedFilters.actorRole);
    }

    if (searchQuery.trim().length > 0) {
      const lowerQuery = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((e: any) => {
        return (
          (e.description && e.description.toLowerCase().includes(lowerQuery)) ||
          (e.category && e.category.toLowerCase().includes(lowerQuery)) ||
          (e.type && e.type.toLowerCase().includes(lowerQuery)) ||
          (e.date && e.date.toLowerCase().includes(lowerQuery)) ||
          (e.amount && e.amount.toString().includes(lowerQuery))
        );
      });
    }

    return filtered.sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      const aTime = a.time || (a.timestamp ? a.timestamp.slice(11, 16) : "");
      const bTime = b.time || (b.timestamp ? b.timestamp.slice(11, 16) : "");
      if (bTime && aTime && bTime !== aTime) {
          return bTime.localeCompare(aTime);
      }
      if (b.timestamp && a.timestamp) {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      return 0;
    });
  }, [profileData.entries, activeTab, localTimeFilter, excludeTransfers, searchQuery, advancedFilters]);

  // Calculations for Summary
  const summaryMetrics = useMemo(() => {
    // USE profileData (Unfiltered by global time)
    const now = new Date();
    now.setFullYear(2026);

    const currentYear = now.getFullYear();
    const currentMonth = now.toISOString().slice(0, 7);

    let relevantEntries = profileData.entries;
    if (excludeTransfers) {
      relevantEntries = relevantEntries.filter(
        (e) => e.subtype !== "INTERNAL_TRANSFER",
      );
    }

    if (localTimeFilter !== "all") {
      relevantEntries = relevantEntries.filter((e) => {
        const entryDate = new Date(e.date);
        const diffTime = Math.abs(now.getTime() - entryDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (localTimeFilter === "24h") return diffDays <= 1;
        if (localTimeFilter === "7d") return diffDays <= 7;
        if (localTimeFilter === "month") return e.date.startsWith(currentMonth);
        if (localTimeFilter === "year")
          return e.date.startsWith(currentYear.toString());
        return true;
      });
    }

    const externalIncomeEntries = relevantEntries.filter(
      (e) =>
        e.type === "income" &&
        e.subtype !== "INTERNAL_TRANSFER",
    );
    const externalExpenseEntries = relevantEntries.filter(
      (e) =>
        e.type === "expense" &&
        e.subtype !== "INTERNAL_TRANSFER" &&
        e.subtype !== "DISTRIBUTION",
    );

    const totalInc = externalIncomeEntries.reduce((s, e) => s + e.amount, 0);
    const totalExp = externalExpenseEntries.reduce((s, e) => s + e.amount, 0);
    const totalDist = relevantEntries
      .filter((e) => e.type === "expense" && e.subtype === "DISTRIBUTION")
      .reduce((s, e) => s + e.amount, 0);

    return {
      totalInc,
      totalExp,
      totalDist,
      net: totalInc - totalExp,
      retained: totalInc - totalExp - totalDist,
    };
  }, [profileData.entries, localTimeFilter, excludeTransfers]);

  // Grouping Logic
  const groupedEntries = useMemo(() => {
    const groups: Record<
      string,
      { total: number; hours: number; items: Entry[] }
    > = {};
    entries.forEach((entry) => {
      const date = new Date(entry.date);
      let key = "";
      let label = "";

      if (viewMode === "monthly") {
        key = `${date.getFullYear()}-${date.getMonth()}`;
        label = date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      } else if (viewMode === "weekly") {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDays = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7);
        key = `${date.getFullYear()}-W${weekNum}`;
        label = `Week ${weekNum}, ${date.getFullYear()}`;
      } else {
        key = entry.date;
        label = new Date(entry.date).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }

      if (!groups[key]) groups[key] = { total: 0, hours: 0, items: [] };
      groups[key].items.push(entry);
      if (activeTab === "transfer" || activeTab === "distribution") {
        const isTxIn = entry.type === "income" || entry.type === "transfer_in";
        groups[key].total +=
          isTxIn ? Math.abs(entry.amount) : -Math.abs(entry.amount);
      } else {
        groups[key].total += Math.abs(entry.amount);
      }
      groups[key].hours += entry.hoursWorked || 0;
    });
    return Object.entries(groups).map(([key, data]) => ({
      key,
      label:
        viewMode === "daily"
          ? key
          : key.includes("W")
            ? `Week ${key.split("W")[1]}`
            : new Date(
                parseInt(key.split("-")[0]),
                parseInt(key.split("-")[1]),
              ).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      ...data,
    }));
  }, [entries, viewMode, activeTab]);

  const toggleGroup = (key: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setExpandedGroups(newSet);
  };

  const handleSubmit = async () => {
    if (!newEntry.description || !newEntry.amount) return;
    setIsClassifying(true);

    if (activeTab === "expense") {
      const expAmount = newEntry.amount || 0;
      const expCat = newEntry.category || "Uncategorized";
      const currentAllocations = data.allocations.filter(
        (a) => a.profileId === activeProfileId,
      );
      const targetBucket = currentAllocations.find((a) => a.name === expCat);
      const availableBalance = targetBucket ? getEffectiveBalance(currentAllocations, targetBucket.id) : 0;

      if (availableBalance < expAmount) {
        const totalProfileCash = currentAllocations.reduce((sum, a) => sum + a.balance, 0);
        if (totalProfileCash < expAmount) {
           alert(`Insufficient total funds. Your total cash across all buckets is ${formatAmount(totalProfileCash)}, but you are trying to spend ${formatAmount(expAmount)}.`);
           setIsClassifying(false);
           return;
        }

        if (!window.confirm(`Insufficient funds in selected bucket (${formatAmount(availableBalance)}).\n\nDo you want to instead use the default method and remove the money dynamically from all buckets?`)) {
          setIsClassifying(false);
          return;
        } else {
          newEntry.category = "PROPORTIONAL_DEDUCTION"; // use proportional
        }
      }
    }

    let defaultCat = "Uncategorized";
    if (activeTab === "income") {
      defaultCat = newEntry.isDirectAllocation
        ? newEntry.category || "Uncategorized"
        : "Uncategorized";
    } else {
      defaultCat = newEntry.category || "Uncategorized";
    }

    const effectiveTime = (newEntry.time && newEntry.time.trim().length >= 4) ? newEntry.time.trim() : getSystemTimeString();
    const { timestamp: finalTimestamp } = buildEntryTimestamp(newEntry.date || getSimulatedDate(), effectiveTime);

    const entryToSave = {
      ...(newEntry as Entry),
      time: effectiveTime,
      timestamp: finalTimestamp,
      type: activeTab,
      profileId: activeProfileId,
      category: defaultCat,
      submittedBy: simulatedUser ? simulatedUser.name : "Owner",
    };

    if (activeTab === "income" && newEntry.frequency === "custom") {
      entryToSave.frequency = `custom:${customFrequencyVal}:${customFrequencyUnit}`;
    }

    if (isFinanceStaff) {
      if (!window.confirm("Submit this entry for approval?")) {
        setIsClassifying(false);
        return;
      }
      addPendingEntry({
        ...entryToSave,
        submittedBy: simulatedUser ? simulatedUser.id : "owner",
        submittedByName: simulatedUser ? simulatedUser.name : "Owner",
      });
      alert("Entry submitted for approval.");
    } else {
      if (isEditMode && newEntry.id) {
        if (!window.confirm("Update this entry?")) {
          setIsClassifying(false);
          return;
        }
        updateEntry(entryToSave);
      } else {
        if (!window.confirm("Add this entry?")) {
          setIsClassifying(false);
          return;
        }
        addEntry(entryToSave);
      }
    }

    setIsClassifying(false);
    closeModal();
  };

  const openEditModal = (entry: Entry) => {
    let entryToEdit = { ...entry };
    if (!entryToEdit.time) {
      entryToEdit.time = formatEntryTime(entry) || getSystemTimeString();
    }
    if (entry.frequency && entry.frequency.startsWith('custom:')) {
      const [, val, unit] = entry.frequency.split(':');
      setCustomFrequencyVal(parseFloat(val) || 1);
      setCustomFrequencyUnit(unit || 'months');
      entryToEdit.frequency = 'custom';
    }
    setNewEntry(entryToEdit);
    setIsEditMode(true);
    setModalOpen(true);
  };

  const openAddModal = () => {
    let suggestedHours = 0;

    if (activeTab === "income") {
      // Calculate rolling average over last 30 days
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      const relevantIncomes = data.entries.filter(
        (e) =>
          e.profileId === activeProfileId &&
          e.type === "income" &&
          new Date(e.date) >= thirtyDaysAgo &&
          new Date(e.date) <= now &&
          (e.hoursWorked || 0) > 0,
      );

      if (relevantIncomes.length > 0) {
        const totalHrs = relevantIncomes.reduce(
          (sum, e) => sum + (e.hoursWorked || 0),
          0,
        );
        suggestedHours =
          Math.round((totalHrs / relevantIncomes.length) * 10) / 10;
      }
    }

    setNewEntry({
      date: getSimulatedDate(),
      time: getSystemTimeString(),
      description: "",
      amount: 0,
      category: "Uncategorized",
      isDirectAllocation: false,
      hoursWorked: suggestedHours,
      actorRole: "Founder",
      profileId: activeProfileId,
      frequency: "one_time",
      incomeSourceType: "OTHER",
    });
    setIsEditMode(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setIsEditMode(false);
    setNewEntry({
      date: getSimulatedDate(),
      time: getSystemTimeString(),
      description: "",
      amount: 0,
      category: "Uncategorized",
      isDirectAllocation: false,
      hoursWorked: 0,
      profileId: activeProfileId,
      frequency: "one_time",
      incomeSourceType: "OTHER",
    });
  };
  const handleDeleteEntry = (id: string) => {
    if (window.confirm("Are you sure you want to delete this entry?"))
      deleteEntry(id);
  };

  const getFrequencyLabel = (frequency?: string) => {
    if (!frequency) return "🔛";
    if (frequency.startsWith('custom:')) {
      const parts = frequency.split(':');
      const val = parts[1] || '1';
      const unit = parts[2] || 'months';
      if (unit === 'times_per_month') return `🔁 ${val}x/M`;
      if (unit === 'times_per_year') return `🔁 ${val}x/Y`;
      const shortUnit = unit === 'months' ? 'M' : unit === 'weeks' ? 'W' : unit === 'days' ? 'D' : unit === 'years' ? 'Y' : '';
      return `🔁 ${val}${shortUnit}`;
    }

    const map: Record<string, string> = {
      weekly: "🔁 W",
      monthly: "🔁 M",
      yearly: "🔁 Y",
      quarterly: "🔁 Q",
      biweekly: "🔁 BW",
      semiannual: "🔁 6M",
      one_time: "🔛"
    };
    // normalized logic for hyphen vs underscore
    const key = frequency.replace('-', '_');
    return map[key] || map[frequency] || "🔁";
  };

  const getEntityName = (id: string | undefined) => {
    if (!id) return '';
    const o = entityOptions.find(opt => opt.value === id);
    return o ? o.label : 'Unknown';
  };

  const getFlowLabel = (entry: Entry) => {
    const freqLabel = entry.frequency ? ` ${getFrequencyLabel(entry.frequency)}` : '';
    if (entry.subtype === "INTERNAL_TRANSFER") {
      const isInternalBucket = entry.from_entity_id === entry.to_entity_id;
      if (entry.isLoanTransaction && !isInternalBucket) {
        return {
          text: `Internal Loan${freqLabel}`,
          color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        };
      }
      return {
        text: isInternalBucket ? `Bucket transfer${freqLabel}` : `Transfer${freqLabel}`,
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      };
    }
    if (entry.subtype === "DISTRIBUTION") {
      return {
        text: `Distribution${freqLabel}`,
        color:
          "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      };
    }
    if (entry.type === "income")
      return {
        text: `External Inflow${freqLabel}`,
        color:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      };
    return {
      text: `External Expense${freqLabel}`,
      color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    };
  };

  const displayCategory = (entry: Entry) => {
    if (entry.subtype === "DISTRIBUTION" && entry.type === "expense" && entry.category === "Uncategorized") {
      return "Proportional (All Buckets)";
    }
    if (entry.category === "PROPORTIONAL_DEDUCTION") {
      return "Proportional (All Buckets)";
    }
    if (entry.category === "Uncategorized" || entry.category === "Revenue") {
      return isBusiness ? "Main Revenue Bucket" : "Main Income Bucket";
    }
    return entry.category;
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20">
      {/* Top Header & Summary */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Income Statement</h2>
            <p className="text-sm text-gray-500">Profit & Loss Overview</p>
          </div>
          <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
            {(["all", "year", "month", "7d", "24h"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setLocalTimeFilter(f)}
                className={`px-3 py-1 text-xs font-bold rounded-md capitalize transition-all ${localTimeFilter === f ? "bg-white dark:bg-slate-700 shadow text-primary" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* P&L Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 flex flex-col items-center sm:items-start group transition-all hover:bg-green-100 dark:hover:bg-green-900/20">
            <span className="text-xs sm:text-sm font-bold text-green-600 uppercase mb-1 flex items-center gap-1">
              <ArrowUpCircle size={14} /> {isBusiness ? "Revenue" : "Income"}
            </span>
            <span className="text-[clamp(18px,4vw,28px)] font-semibold text-green-700 dark:text-green-400 break-words whitespace-normal leading-tight w-full text-center sm:text-left">
              <MoneyDisplay amount={summaryMetrics.totalInc} symbol={symbol} />
            </span>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 flex flex-col items-center sm:items-start group transition-all hover:bg-red-100 dark:hover:bg-red-900/20">
            <span className="text-xs sm:text-sm font-bold text-red-600 uppercase mb-1 flex items-center gap-1">
              <ArrowDownCircle size={14} /> Expenses
            </span>
            <span className="text-[clamp(18px,4vw,28px)] font-semibold text-red-700 dark:text-red-400 break-words whitespace-normal leading-tight w-full text-center sm:text-left">
              <MoneyDisplay amount={summaryMetrics.totalExp} symbol={symbol} />
            </span>
          </div>
          <div
            className={`p-4 sm:p-5 rounded-2xl border flex flex-col items-center sm:items-start group transition-all relative overflow-hidden ${summaryMetrics.net >= 0 ? "bg-indigo-50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/20" : "bg-orange-50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/20"}`}
          >
            <span
              className={`text-xs sm:text-sm font-bold uppercase mb-1 flex items-center gap-1 ${summaryMetrics.net >= 0 ? "text-indigo-600" : "text-orange-600"}`}
            >
              <Banknote size={14} /> Net {isBusiness ? "Profit" : "Cashflow"}
            </span>
            <span
              className={`text-[clamp(18px,4vw,28px)] font-semibold break-words whitespace-normal leading-tight w-full text-center sm:text-left ${summaryMetrics.net >= 0 ? "text-indigo-700 dark:text-indigo-400" : "text-orange-700 dark:text-orange-400"}`}
            >
              {summaryMetrics.net > 0 ? "+" : ""}
              <MoneyDisplay amount={summaryMetrics.net} symbol={symbol} />
            </span>
          </div>
          {isBusiness && (
            <div className="p-4 sm:p-5 rounded-2xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 flex flex-col items-center sm:items-start group transition-all hover:bg-purple-100 dark:hover:bg-purple-900/20">
              <span className="text-xs sm:text-sm font-bold text-purple-600 uppercase mb-1 flex items-center gap-1">
                <Scale size={14} /> Distributions Out
              </span>
              <span className="text-[clamp(18px,4vw,28px)] font-semibold text-purple-700 dark:text-purple-400 break-words whitespace-normal leading-tight w-full text-center sm:text-left">
                -{summaryMetrics.totalDist > 0 ? "" : ""}
                <MoneyDisplay
                  amount={summaryMetrics.totalDist}
                  symbol={symbol}
                />
              </span>
              <div className="mt-2 text-[10px] sm:text-xs font-bold text-purple-800 dark:text-purple-300">
                Retained:{" "}
                <MoneyDisplay
                  amount={summaryMetrics.retained}
                  symbol={symbol}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs & List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab("income")}
            className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === "income" ? "border-green-500 text-green-600 bg-green-50/30" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {isBusiness ? "Revenue Streams" : "Income Sources"}
          </button>
          <button
            onClick={() => setActiveTab("expense")}
            className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === "expense" ? "border-red-500 text-red-600 bg-red-50/30" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab("transfer")}
            className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === "transfer" ? "border-amber-500 text-amber-600 bg-amber-50/30" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            Transfers
          </button>
          <button
            onClick={() => setActiveTab("distribution")}
            className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === "distribution" ? "border-purple-500 text-purple-600 bg-purple-50/30" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            Distributions
          </button>
        </div>

        <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/50 dark:bg-slate-800/50 gap-4">
          <div className="text-xs text-gray-500 italic max-w-[200px] hidden lg:block">
            {activeTab === "income"
              ? "Track money in. Hours update Quadrant status."
              : activeTab === "expense"
                ? "Track money out. Manage burn rate."
                : activeTab === "transfer"
                  ? "Money moving between entities."
                  : "Profit paid to owners."}
          </div>

          <div className="flex-1 w-full max-w-md relative flex bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm group">
            <div className="pl-3 flex items-center pointer-events-none flex-shrink-0">
              <Search className="h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              placeholder={`Search or filter ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-2 pr-3 py-2 bg-transparent border-none focus:ring-0 text-sm placeholder-gray-400"
            />
            <div className="relative border-l border-gray-100 dark:border-gray-800">
               <button 
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  data-tour="filter-transactions"
                  className={`h-full px-3 flex items-center gap-1.5 text-xs font-bold transition-colors ${isFilterMenuOpen || advancedFilters.timeRange !== 'Any time' || advancedFilters.category !== 'All' || advancedFilters.incomeSourceType !== 'All' ? 'text-primary bg-primary/5' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                  title="Search filters"
               >
                  <Filter size={14} />
                  <span className="hidden sm:inline">Filters</span>
               </button>
               
               {isFilterMenuOpen && (
                 <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 z-50 transform origin-top-right transition-all max-h-[80vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4 shrink-0">
                      <h3 className="font-bold text-sm">Search filters</h3>
                      <button onClick={() => setIsFilterMenuOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white"><X size={16}/></button>
                    </div>

                    <div className="space-y-4 overflow-y-auto pr-2 flex-1">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time Range</label>
                        <select 
                          value={advancedFilters.timeRange}
                          onChange={(e) => setAdvancedFilters({...advancedFilters, timeRange: e.target.value})}
                          className="w-full text-sm bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                        >
                          <option>Any time</option>
                          <option>Today</option>
                          <option>This week</option>
                          <option>This month</option>
                          <option>Past 3 months</option>
                          <option>This year</option>
                          <option>Exact date</option>
                        </select>
                      </div>

                      {advancedFilters.timeRange === 'Exact date' && (
                         <div>
                          <input type="date" value={advancedFilters.exactDate} onChange={(e) => setAdvancedFilters({...advancedFilters, exactDate: e.target.value})} className="w-full text-sm bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none" />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                        <select 
                          value={advancedFilters.category}
                          onChange={(e) => setAdvancedFilters({...advancedFilters, category: e.target.value})}
                          className="w-full text-sm bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                        >
                           <option value="All">All</option>
                           {uniqueCategories.map(cat => (
                             <option key={cat} value={cat}>{cat}</option>
                           ))}
                        </select>
                      </div>

                      {(activeTab === 'income' || activeTab === 'distribution') && (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{activeTab === 'income' ? 'Income' : 'Distribution'} Type & Frequency</label>
                              <select 
                                value={advancedFilters.incomeSourceType}
                                onChange={(e) => setAdvancedFilters({...advancedFilters, incomeSourceType: e.target.value})}
                                className="w-full text-sm bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                              >
                                <option value="All">All types</option>
                                {activeTab === 'distribution' ? (
                                    <option value="ACTIVE">One-Time Distribution</option>
                                ) : (
                                    <>
                                        <option value="ACTIVE">Active Income (Hours Logged)</option>
                                        <option value="PASSIVE">Passive Income (No Hours)</option>
                                    </>
                                )}
                                <option value="RECURRING">{activeTab === 'distribution' ? 'Recurring Distribution' : 'Recurring Income'}</option>
                              </select>
                            </div>
                            
                            {advancedFilters.incomeSourceType === 'RECURRING' && (
                              <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Specific Frequency</label>
                                  <select 
                                    value={advancedFilters.recurringFrequency}
                                    onChange={(e) => setAdvancedFilters({...advancedFilters, recurringFrequency: e.target.value})}
                                    className="w-full text-sm bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                                  >
                                      <option value="All">All Frequencies</option>
                                      {FREQUENCY_OPTIONS.filter(f => f.value !== 'one_time').map(opt => (
                                          <option key={opt.value} value={opt.value}>{opt.label.replace('🔘 ', '')}</option>
                                      ))}
                                  </select>
                                  
                                  {advancedFilters.recurringFrequency === 'custom' && (
                                     <div className="flex gap-2 items-center">
                                         <input 
                                           type="number" 
                                           min="1"
                                           value={advancedFilters.recurringCustomVal}
                                           onChange={e => setAdvancedFilters({...advancedFilters, recurringCustomVal: parseFloat(e.target.value) || 1})}
                                           className="w-20 text-sm bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                                         />
                                         <select
                                           value={advancedFilters.recurringCustomUnit}
                                           onChange={e => setAdvancedFilters({...advancedFilters, recurringCustomUnit: e.target.value})}
                                           className="flex-1 text-sm bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                                         >
                                            <option value="days">Days</option>
                                            <option value="weeks">Weeks</option>
                                            <option value="months">Months</option>
                                            <option value="years">Years</option>
                                            <option value="times_per_month">Times Per Month</option>
                                            <option value="times_per_year">Times Per Year</option>
                                         </select>
                                     </div>
                                  )}
                              </div>
                            )}
                          </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Logged By</label>
                        <select 
                          value={advancedFilters.actorRole}
                          onChange={(e) => setAdvancedFilters({...advancedFilters, actorRole: e.target.value})}
                          className="w-full text-sm bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                        >
                           <option value="All">Everyone</option>
                           <option value="Founder">Founder/Owner</option>
                           <option value="Team">Team Member</option>
                           <option value="External">External/System</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 shrink-0">
                        <button 
                          className="flex-1 px-3 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                          onClick={() => setAdvancedFilters({ timeRange: 'Any time', exactDate: '', category: 'All', ownerId: 'All', actorRole: 'All', incomeSourceType: 'All' })}
                        >
                          Clear
                        </button>
                        <button 
                          className="flex-1 px-3 py-2 text-sm font-bold text-white bg-primary hover:opacity-90 rounded-lg"
                          onClick={() => setIsFilterMenuOpen(false)}
                        >
                          Apply Filters
                        </button>
                    </div>
                 </div>
               )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 m-0 ml-auto w-full md:w-auto mt-2 md:mt-0 justify-end">
            {(activeTab === "income" || activeTab === "expense") && (
              <label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 mr-2 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={excludeTransfers}
                  onChange={(e) => setExcludeTransfers(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                Exclude Internal Transfers
              </label>
            )}

            <Button
              onClick={() => {
                const enrichedEntries = entries.map((e: any) => ({
                  ...e,
                  description: e.subtype === 'INTERNAL_TRANSFER' 
                    ? `${e.description} (${e.type === 'transfer_in' ? `From ${getEntityName(e.from_entity_id)}` : `To ${getEntityName(e.to_entity_id)}`})`
                    : e.type === 'expense' && e.subtype === 'DISTRIBUTION' 
                        ? `${e.description} ${e.to_entity_id ? `(To ${getEntityName(e.to_entity_id)})` : ''}`
                        : e.description
                }));
                downloadReceipt(
                  enrichedEntries,
                  `${activeTab === "transfer" ? "Transfer" : activeTab === "distribution" ? "Distribution" : activeTab === "income" ? "Revenue" : "Expense"}_Report`,
                  "list",
                  { profileName, currency: fullCurrencyName },
                )
              }}
              variant="secondary"
              className="!px-3 !py-1.5 h-auto text-xs"
            >
              <Download size={14} /> Export
            </Button>
            {!isViewer && activeTab !== "distribution" && (
              <Button
                onClick={() =>
                  activeTab === "transfer"
                    ? setIsTransferModalOpen(true)
                    : openAddModal()
                }
                className={`!px-3 !py-1.5 h-auto text-xs ${activeTab === "transfer" ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                data-tour={
                  activeTab === "income"
                    ? "action-add-income"
                    : activeTab === "expense" 
                    ? "add-expense"
                    : "add-transfer"
                }
              >
                <Plus size={14} /> Add{" "}
                {activeTab === "transfer"
                  ? "Transfer"
                  : activeTab === "income"
                    ? "Income"
                    : "Expense"}
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4 min-h-[300px]">
          {activeTab === "distribution" && !isBusiness && (
            <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mb-6 text-center">
              <p className="text-purple-700 dark:text-purple-300 text-sm">
                <Info className="inline-block w-4 h-4 mr-1 pb-0.5" />
                You are viewing your Personal profile. Profit distributions are
                executed from <strong>Business</strong> profiles. Any
                distributions received from your businesses will appear here.
              </p>
            </div>
          )}

          {activeTab === "distribution" &&
            isBusiness &&
            retainedEarningsStats && (
              <div className="space-y-6 mb-6">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 text-xs rounded-xl border border-purple-100 dark:border-purple-800 leading-relaxed shadow-sm">
                    <p className="font-bold mb-1 flex items-center gap-2"><Scale size={14}/> Profit Distribution Protocol</p>
                    Extends extracted cash from the business to owners proportionally based on stake. This reduces retained earnings but is not an operational expense.
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-purple-100 dark:border-purple-800 shadow-sm space-y-4">
                            <div className="flex justify-between items-center text-sm text-gray-500 uppercase font-semibold tracking-widest border-b border-purple-50 dark:border-purple-900/10 pb-4">
                                <span>Profit Metric</span>
                                <span>Amount</span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-sm">Total Income (All Time):</span>
                                    <span className="font-bold text-green-500">{formatAmount(retainedEarningsStats.totalIncome)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-sm">Total Expenses:</span>
                                    <span className="font-bold text-red-500">-{formatAmount(retainedEarningsStats.totalExpenses)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-sm">Previous Distributions:</span>
                                    <span className="font-bold text-purple-500">-{formatAmount(retainedEarningsStats.totalDistributions)}</span>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-purple-50 dark:border-purple-900/10">
                                <div className="text-[10px] uppercase font-semibold text-purple-600 dark:text-purple-400 mb-1 flex items-center justify-between">
                                    <span>Available Profit</span>
                                    <span>(Retained Earnings)</span>
                                </div>
                                <div className="text-3xl font-semibold text-purple-700 dark:text-purple-400">
                                    <MoneyDisplay amount={Math.max(0, retainedEarningsStats.retainedEarnings)} symbol={symbol} />
                                </div>
                            </div>
                        </div>

                        {owners.length > 0 && payOwnersAmount > 0 && (
                            <div className="bg-purple-50/50 dark:bg-purple-900/10 p-6 rounded-[2rem] border border-purple-100 dark:border-purple-800 shadow-sm mt-6">
                                <h4 className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 mb-6 uppercase tracking-widest flex justify-between items-center">
                                    <span>Payout Preview breakdown</span>
                                    <span>{formatAmount(payOwnersAmount)}</span>
                                </h4>
                                <div className="space-y-4">
                                    {owners.map(o => {
                                        const ownerEntity = context.engine.entities.get(o.parent_entity_id);
                                        const entityName = ownerEntity ? ownerEntity.name : (o.parent_entity_id === 'personal' ? 'Personal' : o.parent_entity_id);
                                        const share = (payOwnersAmount * o.percentage) / 100;
                                        return (
                                            <div key={o.parent_entity_id} className="flex justify-between items-center animate-in slide-in-from-left-2 duration-300">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs">
                                                        {o.parent_entity_id === 'personal' ? '👤' : '🏢'}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-none">{entityName}</span>
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mt-1">{o.percentage}% Stake</span>
                                                    </div>
                                                </div>
                                                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatAmount(share)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                  </div>
                  <div className="space-y-5 bg-gray-50/50 dark:bg-white/5 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5">
                    {!isViewer && (
                      <>
                        <div className="space-y-1 ml-2">
                             <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Execution Parameters</h4>
                             <p className="text-xs text-gray-500">Configure how and when profit is moved.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <Input
                            label="Date"
                            type="date"
                            value={payOwnersDate}
                            onChange={(e) => setPayOwnersDate(e.target.value)}
                          />
                          <Input
                            label="Time (Bank Info)"
                            type="time"
                            value={payOwnersTime}
                            onChange={(e) => setPayOwnersTime(e.target.value)}
                          />
                          <Select
                            label="Frequency"
                            options={FREQUENCY_OPTIONS}
                            value={payOwnersFrequency}
                            onChange={(e: any) =>
                              setPayOwnersFrequency(e.target.value)
                            }
                          />
                        </div>

                        {payOwnersFrequency === 'custom' && (
                            <div className="flex gap-2 items-center p-3 rounded-xl border border-purple-100 bg-purple-50 shrink-0">
                                <div className="flex-1 shrink-0">
                                    <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Recur every</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        className="w-full px-3 py-2 text-sm rounded border border-gray-200 outline-none"
                                        value={payOwnersCustomVal} 
                                        onChange={(e) => setPayOwnersCustomVal(parseFloat(e.target.value) || 1)} 
                                    />
                                </div>
                                <div className="flex-1 shrink-0">
                                    <Select
                                        label="Unit"
                                        options={[
                                           { value: "days", label: "Days" },
                                           { value: "weeks", label: "Weeks" },
                                           { value: "months", label: "Months" },
                                           { value: "years", label: "Years" },
                                        ]}
                                        value={payOwnersCustomUnit}
                                        onChange={(e: any) => setPayOwnersCustomUnit(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-2 mb-4">
                          <label className="text-sm font-bold flex items-center gap-2">
                            <Layers size={14} /> Deduction Method
                          </label>
                          <div className="flex gap-2">
                            <button
                                className={`text-xs px-2 py-1 rounded ${!payOwnersIsDirect ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-300"}`}
                              onClick={() => { setPayOwnersIsDirect(false); setPayOwnersBucket("Uncategorized"); }}
                            >
                              Proportional (All Buckets)
                            </button>
                            <button
                                className={`text-xs px-2 py-1 rounded ${payOwnersIsDirect ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-300"}`}
                              onClick={() => { setPayOwnersIsDirect(true); setPayOwnersBucket(distBuckets[0]?.value || ""); }}
                            >
                              Direct from Bucket
                            </button>
                          </div>
                        </div>

                        {payOwnersIsDirect && (
                          <Select
                             label="Source Bucket"
                             options={distBuckets}
                             value={payOwnersBucket}
                             onChange={(e) => setPayOwnersBucket(e.target.value)}
                          />
                        )}

                        <Input
                          label="Description"
                          value={payOwnersDesc}
                          onChange={(e) => setPayOwnersDesc(e.target.value)}
                          placeholder="e.g., Q1 Profit Distribution"
                        />

                        <Select
                          label="Logged By (Actor Role)"
                          options={[
                            { value: "Founder", label: "Founder/Owner" },
                            { value: "Team", label: "Team Member" },
                            { value: "System", label: "System/Automatic" }
                          ]}
                          value={payOwnersActorRole}
                          onChange={(e) => setPayOwnersActorRole(e.target.value)}
                        />

                        <Input
                          label={`Amount to Pay Out (${symbol})`}
                          type="number"
                          value={payOwnersAmount || ""}
                          onChange={(e) =>
                            setPayOwnersAmount(parseFloat(e.target.value))
                          }
                          placeholder="0.00"
                          enableCalculator
                          className="font-bold text-lg"
                        />

                        {payOwnersFrequency !== "one_time" && (
                          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-purple-100 dark:border-purple-800">
                            <input
                              type="checkbox"
                              id="auto_dist_trans"
                              checked={payOwnersAuto}
                              onChange={(e) =>
                                setPayOwnersAuto(e.target.checked)
                              }
                              className="w-5 h-5 rounded-lg text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                            <div>
                              <label
                                htmlFor="auto_dist_trans"
                                className="text-sm font-bold cursor-pointer block"
                              >
                                Enable Smart Auto-Distribute
                              </label>
                              <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70">
                                Automatically execute when balance is
                                sufficient.
                              </p>
                            </div>
                          </div>
                        )}

                        <Button
                          onClick={handlePayOwnersSubmit}
                          data-tour="add-distribution"
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold h-14 rounded-2xl shadow-lg shadow-purple-500/20"
                        >
                          Execute Distribution
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

          {activeTab === "income" && data.recurringIncomeRecords && data.recurringIncomeRecords.length > 0 && (
            <div className="mb-8" data-tour="recurring-income-modal">
              <button 
                onClick={() => setIsRecurringModelsOpen(true)}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-colors shadow-sm group"
              >
                <div className="flex flex-col text-left">
                  <span className="font-bold text-sm text-gray-800 dark:text-gray-200 uppercase tracking-widest flex items-center gap-2">
                    <Layers size={14} className="text-green-600 dark:text-green-500" /> Recurring Income Models
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    {data.recurringIncomeRecords.filter(r => r.profileId === activeProfileId).length} Active Models
                  </span>
                </div>
                <div className="flex items-center gap-2 text-green-600 dark:text-green-500 font-bold text-xs bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg group-hover:bg-green-100 dark:group-hover:bg-green-900/40 transition-colors">
                  <Edit2 size={12} /> Manage
                </div>
              </button>
            </div>
          )}

          {entries.length === 0 ? (
            <div className="text-center py-10 text-gray-500 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl">
              No entries found for this period.
            </div>
          ) : isBusiness && activeTab === "distribution" ? (
             (() => {
                const seenSeq = new Set<string>();
                return entries.map((entry) => {
                  const isOutbound = entry.type === "expense";
                  // Only find matching legs if this is an outbound distribution
                  const incomingLegs = isOutbound ? data.entries.filter(
                    (e) =>
                      e.transfer_id === entry.transfer_id &&
                      e.type === "income" &&
                      e.subtype === "DISTRIBUTION",
                  ) : [];
                  const pendingLegs = isOutbound ? (
                    data.distributionRecords?.filter(
                      (r) =>
                        r.distributionId === entry.transfer_id &&
                        !incomingLegs.some((inLeg) => inLeg.profileId === r.recipientId)
                    ) || []
                  ) : [];
                  
                  const myDistRecord = isOutbound ? data.distributionRecords?.find(r => r.distributionId === entry.transfer_id) : null;
                  const sequenceId = myDistRecord?.meta?.sequenceId || null;
                  
                  if (sequenceId) {
                      if (seenSeq.has(sequenceId)) return null;
                      seenSeq.add(sequenceId);
                  }
                  
                  const isRecurring = isOutbound && entry.frequency && entry.frequency !== 'one_time';
                  const pastExecs = (isRecurring && sequenceId) ? data.entries.filter(e => e.type === 'expense' && e.subtype === 'DISTRIBUTION' && e.profileId === activeProfileId && e.id !== entry.id && data.distributionRecords?.find(r => r.distributionId === e.transfer_id)?.meta?.sequenceId === sequenceId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

                  return (
                    <div
                      key={entry.id}
                  className={`bg-white dark:bg-slate-800 border ${isOutbound ? 'border-purple-100 dark:border-purple-800' : 'border-green-100 dark:border-green-800'} rounded-xl overflow-hidden mb-4 transition-all duration-300 ${myDistRecord?.meta?.isActive === false ? 'opacity-60 grayscale' : ''}`}
                >
                  <div className={`p-4 ${isOutbound ? 'bg-purple-50 dark:bg-purple-900/10' : 'bg-green-50 dark:bg-green-900/10'} flex items-center justify-between`}>
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 mr-2 flex items-center min-w-0">
                        <span className="break-words">{isOutbound ? entry.description.replace(" (Distribution Outbound)", "").replace(" (Distribution Out)", "") : entry.description.replace(" (Distribution Outbound)", "").replace(" (Distribution Out)", "")}</span>
                        {!isOutbound && entry.from_entity_id && (
                           <span className="text-gray-400 font-normal ml-2 text-xs break-words shrink-0">
                             (From {getEntityName(entry.from_entity_id)})
                           </span>
                        )}
                      </h3>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span>{new Date(entry.date).toLocaleDateString()}{formatEntryTime(entry) ? ` • ${formatEntryTime(entry)}` : ''}</span>
                        {isOutbound && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-100/50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 break-words"
                          >
                            <Layers size={8} />
                            {displayCategory(entry)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-auto pl-4">
                      <span className={`text-sm sm:text-lg font-semibold whitespace-nowrap sm:whitespace-normal text-right ${isOutbound ? 'text-purple-700 dark:text-purple-400' : 'text-green-700 dark:text-green-400'}`}>
                        {isOutbound ? '-' : '+'}<MoneyDisplay amount={Math.abs(entry.amount)} symbol={symbol} />
                      </span>
                      {isOutbound && isRecurring && sequenceId && (
                         <div className="flex items-center gap-1.5 mt-1" title="Toggle active status of this recurring distribution">
                            <span className="text-[10px] font-bold text-gray-400">{myDistRecord?.meta?.isActive !== false ? 'Active' : 'Inactive'}</span>
                            <button
                               onClick={() => {
                                   context.updateDistributionSequence(sequenceId, { isActive: myDistRecord?.meta?.isActive === false ? true : false });
                               }}
                               className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors ${myDistRecord?.meta?.isActive !== false ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                            >
                               <div className={`w-3 h-3 rounded-full bg-white transform transition-transform ${myDistRecord?.meta?.isActive !== false ? 'translate-x-3' : 'translate-x-0'}`} />
                            </button>
                         </div>
                      )}
                    </div>
                  </div>
                  {isOutbound && (incomingLegs.length > 0 || pendingLegs.length > 0) && (
                    <div className="p-4 border-t border-purple-100 dark:border-purple-800/50 bg-white dark:bg-slate-800">
                      <h4 className="flex justify-between items-center text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">
                        <span>Owner Breakdown</span>
                        {entry.frequency && entry.frequency !== 'one_time' && (
                           <span className="ml-2 text-[10px] text-purple-600 dark:text-purple-400 bg-purple-100 flex items-center gap-1 dark:bg-purple-900/30 px-2 py-0.5 rounded-full normal-case tracking-normal">
                             Frequency: {getFrequencyLabel(entry.frequency)} ({entry.frequency})
                           </span>
                        )}
                      </h4>
                      <div className="space-y-2">
                        {incomingLegs.map((inLeg) => {
                          const ownerEntity = context.engine.entities.get(inLeg.profileId);
                          const ownerName = ownerEntity ? ownerEntity.name : (inLeg.profileId === 'personal' ? 'Personal' : inLeg.profileId);

                          // Display value in the current profile's currency
                          // Since we are viewing from the SENDER's profile, the sender distributed exactly `inLeg.baseAmount` in its own currency.
                          // Wait, if we are in the sender's profile, `inLeg.baseCurrency` is the sender's currency, and `inLeg.baseAmount` is exactly the amount sent!
                          // Wait, what if the sender changed their currency? `inLeg.baseAmount` is updated during currency change! Yes!
                          // However, just to strictly show the equivalent in the current profile's active `symbol`:
                          const displayAmount = inLeg.baseAmount || (Math.abs(entry.amount) * (inLeg.ownership_snapshot || 0) / 100);

                          return (
                            <div
                              key={inLeg.id}
                              className="flex justify-between items-start text-sm border-b border-gray-50 dark:border-gray-800 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0"
                            >
                              <div className="flex-1 min-w-0 pr-2 flex flex-col gap-1">
                                <span className="text-gray-700 dark:text-gray-300 flex items-start gap-2 font-medium">
                                  <ArrowDownCircle
                                    size={14}
                                    className="text-purple-500 shrink-0 mt-0.5"
                                  />
                                  <span className="break-words sm:break-normal">{ownerName}</span>
                                </span>
                                <div className="pl-5">
                                  <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full inline-block">
                                    {inLeg.ownership_snapshot || Math.round((inLeg.baseAmount || Math.abs(inLeg.amount)) / Math.abs(entry.amount) * 100)}%
                                  </span>
                                </div>
                              </div>
                              <span className="font-bold text-gray-900 dark:text-gray-100 shrink-0 text-right mt-0.5">
                                <MoneyDisplay
                                  amount={displayAmount}
                                  symbol={symbol}
                                />
                              </span>
                            </div>
                          );
                        })}
                        {pendingLegs.map((pending: any) => {
                          const ownerEntity = context.engine.entities.get(
                            pending.recipientId,
                          );
                          const ownerName = ownerEntity
                            ? ownerEntity.name
                            : (pending.recipientId === 'personal' ? 'Personal' : "Unknown");
                          const businessName =
                            context.data.businesses.find(
                              (b: any) => b.id === pending.businessId,
                            )?.name || "the business";
                          const distDate = new Date(
                            pending.timestamp,
                          ).toLocaleDateString();
                          const link = pending.token
                            ? `${window.location.origin}/claim/${pending.token}`
                            : "";
                          const isClaimedLocally =
                            localStorage.getItem(`claimed_${pending.id}`) ===
                              "true" || pending.status === "claimed";
                          const isAlertedLocally =
                            localStorage.getItem(`alerted_${pending.id}`) ===
                            "true";

                          const edge = context.engine.edges.find(
                            (e: any) =>
                              e.child_entity_id === pending.businessId &&
                              e.parent_entity_id === pending.recipientId,
                          );
                          const pct = edge ? `(${edge.percentage}%)` : "";

                          return (
                            <div
                              key={pending.id}
                              className="flex justify-between items-start text-sm border-b border-gray-50 dark:border-gray-800 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0"
                            >
                              <div className="flex-1 min-w-0 pr-2 flex flex-col gap-1">
                                <span className={`${isClaimedLocally ? "text-green-600" : isAlertedLocally ? "text-blue-500" : "text-orange-500"} flex items-start gap-2 font-medium`}>
                                  <Clock size={14} className="shrink-0 mt-0.5" />
                                  <span className="break-words sm:break-normal">{ownerName}</span>
                                </span>
                                <div className="flex items-center gap-2 pl-5 flex-wrap">
                                  <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full inline-block">
                                    {edge ? `${edge.percentage}%` : "Unknown %"}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {isClaimedLocally ? "(Claimed)" : isAlertedLocally ? "(Alerted)" : "(Pending Claim)"}
                                  </span>
                                </div>
                                {(!isClaimedLocally && link) && (
                                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500 pl-5 mt-1">
                                    <span>Claim Link:</span>
                                    <input
                                      type="text"
                                      value={link}
                                      readOnly
                                      className="bg-gray-100 dark:bg-slate-700 rounded px-2 py-1 flex-1 min-w-[50px] select-all outline-none"
                                    />
                                    <div className="flex shrink-0 gap-1">
                                    <button
                                      onClick={async () => {
                                        localStorage.setItem(
                                          `alerted_${pending.id}`,
                                          "true",
                                        );
                                        if (navigator.share) {
                                          try {
                                            await navigator.share({
                                              title: "Distribution Claim",
                                              text: `Hi ${ownerName},\n\nYou have received a distribution of ${symbol}${pending.amount} from ${businessName} for the date ${distDate}.\n\nPlease click the link below to claim this into your profile and track your returns!`,
                                              url: link,
                                            });
                                          } catch (err) {
                                            console.log("Error sharing:", err);
                                            navigator.clipboard.writeText(
                                              `Hi ${ownerName},\n\nYou have received a distribution of ${symbol}${pending.amount} from ${businessName} for the date ${distDate}.\n\nPlease click the link below to claim this into your profile and track your returns!\n\n${link}`,
                                            );
                                            alert("Copied to clipboard! (Share not supported)");
                                          }
                                        } else {
                                          navigator.clipboard.writeText(
                                            `Hi ${ownerName},\n\nYou have received a distribution of ${symbol}${pending.amount} from ${businessName} for the date ${distDate}.\n\nPlease click the link below to claim this into your profile and track your returns!\n\n${link}`,
                                          );
                                          alert(
                                            "Copied to clipboard! (Share not supported on this browser)",
                                          );
                                        }
                                        context.setData((prev: any) => ({
                                          ...prev,
                                        })); // trigger re-render
                                      }}
                                      className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded bg-primary text-white"
                                      title="Share Link"
                                    >
                                      <Share2 size={12} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        localStorage.setItem(
                                          `alerted_${pending.id}`,
                                          "true",
                                        );
                                        navigator.clipboard.writeText(
                                          `Hi ${ownerName},\n\nYou have received a distribution of ${symbol}${pending.amount} from ${businessName} for the date ${distDate}.\n\nPlease click the link below to claim this into your profile and track your returns!\n\n${link}`,
                                        );
                                        alert("Copied to clipboard!");
                                        context.setData((prev: any) => ({
                                          ...prev,
                                        })); // trigger re-render
                                      }}
                                      className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-gray-500"
                                      title="Copy Link"
                                    >
                                      <Copy size={12} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (
                                          window.confirm(
                                            `Mark this distribution to ${ownerName} as Claimed?`,
                                          )
                                        ) {
                                          localStorage.setItem(
                                            `claimed_${pending.id}`,
                                            "true",
                                          );
                                          context.setData((prev: any) => {
                                            const newRecords =
                                              prev.distributionRecords?.map(
                                                (r: any) =>
                                                  r.id === pending.id
                                                    ? {
                                                        ...r,
                                                        status: "claimed",
                                                      }
                                                    : r,
                                              ) || [];
                                            return {
                                              ...prev,
                                              distributionRecords: newRecords,
                                            };
                                          });
                                        }
                                      }}
                                      className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600 dark:text-green-500"
                                      title="Mark as Claimed"
                                    >
                                      <CheckCircle size={12} />
                                    </button>
                                  </div>
                                </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0 mt-0.5">
                                  <span className="font-bold text-gray-900 dark:text-gray-100 text-right">
                                    <MoneyDisplay amount={pending.amount} symbol={symbol} />
                                  </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {pastExecs.length > 0 && (
                      <div className="border-t border-purple-50 dark:border-purple-900/10 bg-white dark:bg-slate-800">
                          <button onClick={() => setExpandedSeq(p => ({...p, [sequenceId!]: !p[sequenceId!]}))} className="w-full p-3 flex justify-between items-center text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                              <span>Past Distributions ({pastExecs.length})</span>
                              {expandedSeq[sequenceId!] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          {expandedSeq[sequenceId!] && (
                              <div className="p-3 bg-gray-50 dark:bg-slate-800 space-y-2 border-t border-purple-50 dark:border-purple-900/10 max-h-48 overflow-y-auto">
                                   {pastExecs.map(pe => (
                                       <div key={pe.id} className="flex justify-between items-center text-xs">
                                           <span className="text-gray-500">{new Date(pe.date).toLocaleDateString()}{formatEntryTime(pe) ? ` • ${formatEntryTime(pe)}` : ''}</span>
                                           <span className="font-bold text-gray-700 dark:text-gray-300">{formatAmount(Math.abs(pe.amount))}</span>
                                       </div>
                                   ))}
                              </div>
                          )}
                      </div>
                  )}

                  {!isFinanceStaff && !isViewer && (
                    <div className="p-3 bg-gray-50/50 dark:bg-white/5 border-t border-gray-200 dark:border-white/10 flex justify-between items-center">
                      {(entry.subtype !== 'INTERNAL_TRANSFER' && entry.subtype !== 'DISTRIBUTION' && entry.subtype !== 'BAD_DEBT') ? (
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          disabled={myDistRecord?.meta?.isActive === false}
                          className="text-xs flex items-center gap-1 text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={12} /> Revert
                        </button>
                      ) : (
                        <span />
                      )}
                      
                      {entry.type === 'expense' && entry.subtype === 'DISTRIBUTION' && entry.frequency && entry.frequency !== 'one_time' && (
                          <div className="flex gap-2 items-center">
                              <button
                                onClick={() => {
                                    setEditingDistProfile({
                                        sequenceId: myDistRecord?.meta?.sequenceId || myDistRecord?.distributionId,
                                        amount: myDistRecord?.meta?.targetAmount || Math.abs(entry.amount),
                                        autoDistribute: myDistRecord?.meta?.autoDistribute ?? true,
                                        targetDescription: myDistRecord?.meta?.targetDescription || entry.description.replace(" (Distribution Outbound)", "").replace(" (Distribution Out)", ""),
                                        sourceBucket: myDistRecord?.meta?.sourceBucket || entry.category || "Uncategorized",
                                        entry
                                    });
                                }}
                                disabled={myDistRecord?.meta?.isActive === false}
                                className="bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm disabled:cursor-not-allowed"
                              >
                                  Edit
                              </button>
                              <button
                                onClick={() => {
                                    if (window.confirm('Execute another distribution cycle immediately using these parameters?')) {
                                        context.distributeBusinessProfit(entry.profileId, myDistRecord?.meta?.targetAmount || Math.abs(entry.amount), entry.description.replace(" (Distribution Outbound)", ""), getSimulatedDate(), entry.category, { ...myDistRecord?.meta, lastExecutedAt: new Date().toISOString() });
                                    }
                                }}
                                disabled={myDistRecord?.meta?.isActive === false}
                                className="bg-purple-600 text-white hover:bg-purple-700 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
                              >
                                 Redistribute ♻️
                              </button>
                          </div>
                      )}
                    </div>
                  )}
                </div>
              );
            });
            })()
          ) : (
            groupedEntries.map((group) => (
              <div
                key={group.key}
                className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden"
              >
                <div
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  onClick={() => toggleGroup(group.key)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-500">
                      {expandedGroups.has(group.key) || viewMode === "daily" ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200">
                      {group.label}
                    </h3>
                  </div>
                  <span
                    className={`text-sm font-bold ${activeTab === "transfer" || activeTab === "distribution" ? (group.total >= 0 ? "text-green-600" : "text-red-600") : activeTab === "income" ? "text-green-600" : "text-red-600"}`}
                  >
                    {activeTab === "transfer" || activeTab === "distribution"
                      ? group.total > 0
                        ? "+"
                        : ""
                      : activeTab === "income"
                        ? "+"
                        : "-"}
                    <MoneyDisplay
                      amount={Math.abs(group.total)}
                      symbol={symbol}
                    />
                  </span>
                </div>
                {(expandedGroups.has(group.key) || viewMode === "daily") && (
                  <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                    {group.items.reduce<JSX.Element[]>((acc, entry, idx, arr) => {
                      if (entry.subtype === 'INTERNAL_TRANSFER' && entry.transfer_id) {
                         const pairedIndex = arr.findIndex(e => e.transfer_id === entry.transfer_id && e.id !== entry.id);
                         
                         // Check if this pair represents a bucket transfer within the same entity
                         const isBucketTransfer = pairedIndex !== -1 && (() => {
                             const pairedEntry = arr[pairedIndex];
                             const outflow = entry.type === 'transfer_out' ? entry : pairedEntry;
                             const inflow = entry.type === 'transfer_in' ? entry : pairedEntry;
                             return outflow.from_entity_id === inflow.to_entity_id;
                         })();

                         if (isBucketTransfer) {
                             if (idx > pairedIndex) {
                                 return acc; // Already rendered the merged version
                             }
                             
                             if (idx < pairedIndex) {
                                 const pairedEntry = arr[pairedIndex];
                                 const outflow = entry.type === 'transfer_out' ? entry : pairedEntry;
                                 const inflow = entry.type === 'transfer_in' ? entry : pairedEntry;
                                 
                                 acc.push(
                                   <div
                                     key={`merged-${entry.transfer_id}`}
                                     className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                   >
                                     <div className="flex-1 min-w-0 pr-2">
                                       <div className="flex flex-wrap items-center gap-2">
                                         <span className="font-medium text-sm break-words">
                                           {entry.description}
                                         </span>
                                         <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                           BUCKET TRANSFER
                                         </span>
                                         <span className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 shrink-0 min-w-0 break-words truncate max-w-[250px]">
                                           {displayCategory(outflow)} → {displayCategory(inflow)}
                                         </span>
                                       </div>
                                       <div className="text-xs text-gray-400 mt-0.5 break-words">
                                         {new Date(entry.date).toLocaleDateString()}{formatEntryTime(entry) ? ` • ${formatEntryTime(entry)}` : ''}
                                       </div>
                                     </div>
                                     <div className="flex items-center justify-end gap-2 sm:gap-3 shrink min-w-[30%] max-w-[85%] sm:max-w-[70%] ml-auto">
                                       <span className="font-bold text-sm min-w-0 break-all text-right text-gray-600 dark:text-gray-400">
                                         <MoneyDisplay amount={Math.abs(entry.amount)} symbol={symbol} />
                                       </span>
                                     </div>
                                   </div>
                                 );
                                 return acc;
                             }
                         }
                      }

                      acc.push(
                        <div
                          key={entry.id}
                          className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-sm break-words">
                                {entry.description.replace(" (Distribution Outbound)", "").replace(" (Distribution Out)", "")}
                                {entry.subtype === 'INTERNAL_TRANSFER' && (
                                  <span className="text-gray-400 font-normal ml-1 text-xs break-words">
                                    ({entry.type === 'transfer_in' ? `From ${getEntityName(entry.from_entity_id)}` : `To ${getEntityName(entry.to_entity_id)}`})
                                  </span>
                                )}
                                {entry.subtype === 'DISTRIBUTION' && entry.type === 'income' && entry.from_entity_id && (
                                  <span className="text-gray-400 font-normal ml-1 text-xs break-words">
                                    (From {getEntityName(entry.from_entity_id)})
                                  </span>
                                )}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${getFlowLabel(entry).color}`}
                              >
                                {getFlowLabel(entry).text}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 shrink-0 min-w-0 break-words truncate max-w-[120px]">
                                {displayCategory(entry)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5 break-words">
                              {new Date(entry.date).toLocaleDateString()}{formatEntryTime(entry) ? ` • ${formatEntryTime(entry)}` : ''}{" "}
                              {activeTab === "income" &&
                                entry.hoursWorked > 0 &&
                                `• ${entry.hoursWorked} hrs`}
                              {entry.description.includes("(Repaid)") && (
                                <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-[9px] font-bold uppercase tracking-wider">
                                  Completed
                                </span>
                              )}
                              {entry.frequency && entry.frequency !== 'one_time' && !entry.description.includes("(Repaid)") && (
                                <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-[9px] font-bold uppercase tracking-wider">
                                  Recurring: {getFrequencyLabel(entry.frequency)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 sm:gap-3 shrink min-w-[30%] max-w-[85%] sm:max-w-[70%] ml-auto">
                            <span
                              className={`font-bold text-sm min-w-0 break-all text-right ${activeTab === "transfer" || activeTab === "distribution" ? (entry.type === "income" || entry.type === "transfer_in" ? "text-green-600" : "text-red-600") : activeTab === "income" ? "text-green-600" : "text-red-600"}`}
                            >
                              {activeTab === "transfer" ||
                              activeTab === "distribution"
                                ? (entry.type === "income" || entry.type === "transfer_in")
                                  ? "+"
                                  : "-"
                                : ""}
                              <MoneyDisplay
                                amount={Math.abs(entry.amount)}
                                symbol={symbol}
                              />
                            </span>
                            <div className="flex gap-1">
                              {!isFinanceStaff && !isViewer && entry.subtype !== 'INTERNAL_TRANSFER' && entry.subtype !== 'DISTRIBUTION' && entry.subtype !== 'BAD_DEBT' && (
                                <>
                                  {activeTab !== "transfer" &&
                                    activeTab !== "distribution" && (
                                      <>
                                        {(!entry.transfer_id || !entry.transfer_id.startsWith('rin_')) && (
                                          <>
                                            <button
                                              onClick={() => openEditModal(entry)}
                                              className="p-1.5 text-gray-400 hover:text-primary rounded bg-gray-100 dark:bg-gray-700"
                                            >
                                              <Edit2 size={12} />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteEntry(entry.id)}
                                              className="p-1.5 text-gray-400 hover:text-red-500 rounded bg-gray-100 dark:bg-gray-700"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </>
                                        )}
                                      </>
                                    )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                      return acc;
                    }, [])}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`${isEditMode ? "Edit" : "Add"} ${activeTab === "income" ? "Income" : "Expense"}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={newEntry.date}
              onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
            />
            <Input
              label="Time (Bank Info)"
              type="time"
              value={newEntry.time || getSystemTimeString()}
              onChange={(e) => setNewEntry({ ...newEntry, time: e.target.value })}
            />
          </div>
          <Input
            label="Description"
            value={newEntry.description}
            onChange={(e) =>
              setNewEntry({ ...newEntry, description: e.target.value })
            }
            placeholder="Description"
          />
          <InlineCurrencyConverter 
            targetCurrency={activeCurrencyCode || context?.activeCurrencyCode || context?.data?.profile?.currency || 'USD'} 
            onApply={(val) => setNewEntry(prev => ({ ...prev, amount: val }))} 
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`Amount (${symbol})`}
              type="number"
              value={newEntry.amount || ""}
              onChange={(e) =>
                setNewEntry({ ...newEntry, amount: parseFloat(e.target.value) })
              }
              placeholder="0.00"
              enableCalculator
              enableCurrencyConvert
            />
            {activeTab === "income" && (
              <div className="relative">
                <Input
                  label="Hours Spent"
                  type="number"
                  value={newEntry.hoursWorked || ""}
                  onChange={(e) =>
                    setNewEntry({
                      ...newEntry,
                      hoursWorked: parseFloat(e.target.value),
                    })
                  }
                  placeholder="0"
                />
                <p className="text-[10px] text-orange-500 absolute -bottom-4 left-0">
                  Required for {isBusiness ? "Business Dependency" : "ESBI"}{" "}
                  Logic.
                </p>
              </div>
            )}
            {activeTab === "income" && isBusiness && (
              <Select
                label="Time Logged By"
                options={[
                  { value: "Founder", label: "Founder (Owner)" },
                  { value: "Team", label: "Internal Team" },
                  { value: "External", label: "External / System" },
                ]}
                value={newEntry.actorRole || "Founder"}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, actorRole: e.target.value as any })
                }
              />
            )}
            {activeTab === "income" && (
              <>
                <Select
                  label="Frequency"
                  options={FREQUENCY_OPTIONS}
                  value={newEntry.frequency?.startsWith('custom:') ? 'custom' : (newEntry.frequency || "one_time")}
                  onChange={(e) =>
                    setNewEntry({
                      ...newEntry,
                      frequency: e.target.value as any,
                    })
                  }
                />
                
                {newEntry.frequency === 'custom' && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                       <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recur every</label>
                       <input 
                         type="number" 
                         min="1"
                         className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                         value={customFrequencyVal} 
                         onChange={(e) => setCustomFrequencyVal(parseFloat(e.target.value) || 1)} 
                       />
                    </div>
                    <div className="flex-1">
                       <Select
                         label="Unit"
                         options={[
                           { value: "days", label: "Days" },
                           { value: "weeks", label: "Weeks" },
                           { value: "months", label: "Months" },
                           { value: "years", label: "Years" },
                           { value: "times_per_month", label: "Times Per Month" },
                           { value: "times_per_year", label: "Times Per Year" }
                         ]}
                         value={customFrequencyUnit}
                         onChange={(e) => setCustomFrequencyUnit(e.target.value)}
                       />
                    </div>
                  </div>
                )}
              </>
            )}
            {activeTab === "income" && !isBusiness && (
              <Select
                label="Income Source"
                options={[
                  { value: "SALARY", label: "Salary/Wages" },
                  {
                    value: "BUSINESS_DISTRIBUTION",
                    label: "Business Distribution",
                  },
                  { value: "ASSET_INCOME", label: "Asset/Investment Returns" },
                  { value: "OTHER", label: "Other/Misc" },
                ]}
                value={newEntry.incomeSourceType || "OTHER"}
                onChange={(e) =>
                  setNewEntry({
                    ...newEntry,
                    incomeSourceType: e.target.value as any,
                  })
                }
              />
            )}
          </div>
          {activeTab === "income" ? (
            <div className="space-y-3 pt-2">
              <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold flex items-center gap-2">
                    <Layers size={14} /> Allocation Method
                  </label>
                  <div className="flex gap-2">
                    <button
                      className={`text-xs px-2 py-1 rounded ${!newEntry.isDirectAllocation ? "bg-primary text-white" : "bg-gray-200 text-gray-600"}`}
                      onClick={() =>
                        setNewEntry({
                          ...newEntry,
                          isDirectAllocation: false,
                          category: "Uncategorized",
                        })
                      }
                    >
                      {isBusiness ? "Revenue" : "Income"}
                    </button>
                    <button
                      className={`text-xs px-2 py-1 rounded ${newEntry.isDirectAllocation ? "bg-primary text-white" : "bg-gray-200 text-gray-600"}`}
                      onClick={() =>
                        setNewEntry({
                          ...newEntry,
                          isDirectAllocation: true,
                          category: buckets[0]?.value,
                        })
                      }
                    >
                      {isBusiness ? "Direct Injection" : "Direct"}
                    </button>
                  </div>
                </div>
                {newEntry.isDirectAllocation ? (
                  <Select
                    label="Destination Bucket"
                    options={buckets}
                    value={newEntry.category}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, category: e.target.value })
                    }
                  />
                ) : (
                  <div className="mt-2 text-xs text-gray-500 italic p-2 bg-gray-100 dark:bg-slate-800 rounded">
                    {isBusiness
                      ? "Funds load to Main Revenue Bucket for manual distribution."
                      : "Funds load to Main Income Bucket for manual distribution."}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Select
              label="Paid From Bucket"
              options={buckets}
              value={newEntry.category}
              onChange={(e) =>
                setNewEntry({ ...newEntry, category: e.target.value })
              }
            />
          )}
          <div className="pt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isClassifying}>
              {isClassifying
                ? "Analyzing..."
                : isFinanceStaff
                  ? "Submit to Approvals"
                  : isEditMode
                    ? "Update"
                    : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Record Inter-Entity Transfer"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-xs rounded border border-amber-100 dark:border-amber-800">
            Transfers move money between your tracked entities. They do not
            increase total system wealth and are treated as zero-sum in the
            global ledger.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={newTransfer.date}
              onChange={(e) =>
                setNewTransfer({ ...newTransfer, date: e.target.value })
              }
            />
            <Input
              label="Time (Bank Info)"
              type="time"
              value={newTransfer.time || getSystemTimeString()}
              onChange={(e) =>
                setNewTransfer({ ...newTransfer, time: e.target.value })
              }
            />
          </div>
          <Input
            label="Description (e.g. 'Loan to LLC', 'Founder Contribution')"
            value={newTransfer.description}
            onChange={(e) =>
              setNewTransfer({ ...newTransfer, description: e.target.value })
            }
            placeholder="Description"
          />
          <InlineCurrencyConverter 
            targetCurrency={activeCurrencyCode || context?.activeCurrencyCode || context?.data?.profile?.currency || 'USD'} 
            onApply={(val) => setNewTransfer(prev => ({ ...prev, amount: val }))} 
          />
          <Input
            label={`Amount (${symbol})`}
            type="number"
            value={newTransfer.amount || ""}
            onChange={(e) =>
              setNewTransfer({
                ...newTransfer,
                amount: parseFloat(e.target.value),
              })
            }
            placeholder="0.00"
            enableCalculator
            enableCurrencyConvert
          />

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl mb-4 border border-gray-100 dark:border-gray-700">
            <div>
              <p className="font-semibold text-sm">Internal Bucket Transfer</p>
              <p className="text-xs text-gray-500">Move money between buckets within this profile</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={newTransfer.isInternalBucketTransfer} onChange={(e) => setNewTransfer({ ...newTransfer, isInternalBucketTransfer: e.target.checked, fromEntityId: activeProfileId, toEntityId: activeProfileId })} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {!newTransfer.isInternalBucketTransfer ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="From Entity (Sender)"
                options={entityOptions.filter(opt => opt.value === activeProfileId)}
                value={activeProfileId}
                disabled
                onChange={() => {}}
              />
              <Select
                label="To Entity (Receiver)"
                options={[
                  { value: "", label: "Select Receiver..." },
                  ...entityOptions.filter(opt => opt.value !== activeProfileId),
                ]}
                value={newTransfer.toEntityId}
                onChange={(e) =>
                  setNewTransfer({ ...newTransfer, toEntityId: e.target.value })
                }
              />
            </div>
          ) : null}

          {((!newTransfer.isInternalBucketTransfer && activeProfileId) || newTransfer.isInternalBucketTransfer) && (
            <div className={`grid grid-cols-1 ${newTransfer.isInternalBucketTransfer ? 'md:grid-cols-2 gap-4' : ''}`}>
              <Select
                label="From Bucket"
                options={transferBuckets}
                value={newTransfer.category}
                onChange={(e) =>
                  setNewTransfer({ ...newTransfer, category: e.target.value })
                }
              />
              {newTransfer.isInternalBucketTransfer && (
               <Select
                label="To Bucket"
                options={transferBuckets}
                value={newTransfer.toCategory}
                onChange={(e) =>
                  setNewTransfer({ ...newTransfer, toCategory: e.target.value })
                }
               />
              )}
            </div>
          )}

          {!newTransfer.isInternalBucketTransfer && activeProfileId && (
            <div className="mt-4 p-4 border rounded-xl bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10">
               <div className="flex items-center justify-between">
                 <div>
                    <p className="font-semibold text-sm">Record as Internal Loan</p>
                    <p className="text-xs text-gray-500">Record an asset for the sender and a liability for the receiver</p>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={newTransfer.isLoan} onChange={(e) => setNewTransfer({ ...newTransfer, isLoan: e.target.checked })} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                 </label>
               </div>
               
               {newTransfer.isLoan && (
                 <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                    <div className="mb-3 sm:mb-4 relative">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason / Agreement Terms</label>
                        <textarea 
                            className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                            rows={3} 
                            placeholder="Provide detailed explanation and conditions of the loan..." 
                            value={newTransfer.loanDetails.agreementReason} 
                            onChange={e => setNewTransfer({...newTransfer, loanDetails: {...newTransfer.loanDetails, agreementReason: e.target.value}})} 
                        />
                    </div>
                    <LiabilityCalculatorForm 
                      details={newTransfer.loanDetails} 
                      setDetails={(details: any) => setNewTransfer(prev => ({...prev, loanDetails: typeof details === 'function' ? details(prev.loanDetails) : details}))} 
                      isBusiness={transferSenderIsBusiness} 
                      amount={newTransfer.amount} 
                      formatAmount={formatAmount} 
                      isEditMode={false} 
                      buckets={transferReceiverBuckets}
                      isInternalLoan={true}
                    />
                 </div>
               )}
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsTransferModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransferSubmit}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Execute Transfer
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={editingDistProfile !== null}
        onClose={() => setEditingDistProfile(null)}
        title="Edit Recurring Distribution Settings"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Below are the settings for this recurring distribution sequence. The sequence ID is {editingDistProfile?.sequenceId}. Editing this will update the target amount, source bucket, and auto-distribute settings for future automated distributions and reminders.
          </p>

          <Input
            label="General Description"
            type="text"
            value={editingDistProfile?.targetDescription || ""}
            onChange={(e) => setEditingDistProfile({ ...editingDistProfile, targetDescription: e.target.value })}
          />

          <Input
            label="New Target Amount"
            type="number"
            value={editingDistProfile?.amount || 0}
            onChange={(e) => setEditingDistProfile({ ...editingDistProfile, amount: parseFloat(e.target.value) || 0 })}
            className="text-lg font-bold"
          />

          <div className="mb-4">
            <span className="block text-xs font-bold text-gray-500 uppercase mb-2">Deduction Method</span>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                className={`text-xs px-3 py-2 rounded-lg font-bold flex-1 transition-colors ${editingDistProfile?.sourceBucket === "Uncategorized" || !editingDistProfile?.sourceBucket ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"}`}
                onClick={() => setEditingDistProfile({ ...editingDistProfile, sourceBucket: "Uncategorized" })}
              >
                Proportional (All Buckets)
              </button>
              <button
                className={`text-xs px-3 py-2 rounded-lg font-bold flex-1 transition-colors ${editingDistProfile?.sourceBucket && editingDistProfile?.sourceBucket !== "Uncategorized" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"}`}
                onClick={() => setEditingDistProfile({ ...editingDistProfile, sourceBucket: distBuckets.filter(b => b.value !== "Uncategorized")[0]?.value || "" })}
              >
                Direct from Bucket
              </button>
            </div>
          </div>

          {editingDistProfile?.sourceBucket && editingDistProfile?.sourceBucket !== "Uncategorized" && (
            <Select
              label="Source Bucket"
              options={distBuckets.filter(b => b.value !== "Uncategorized")}
              value={editingDistProfile?.sourceBucket || ""}
              onChange={(e) => setEditingDistProfile({ ...editingDistProfile, sourceBucket: e.target.value })}
            />
          )}

          <Select
            label="Logged By (Actor Role)"
            options={[
              { value: "Founder", label: "Founder/Owner" },
              { value: "Team", label: "Team Member" },
              { value: "System", label: "System/Automatic" }
            ]}
            value={editingDistProfile?.actorRole || "Founder"}
            onChange={(e) => setEditingDistProfile({ ...editingDistProfile, actorRole: e.target.value })}
          />

          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mt-4">
              <input 
                  type="checkbox" 
                  id="modal_auto_dist" 
                  checked={editingDistProfile?.autoDistribute ?? true} 
                  onChange={e => setEditingDistProfile({ ...editingDistProfile, autoDistribute: e.target.checked })} 
                  className="w-5 h-5 rounded-lg text-purple-600 focus:ring-purple-500 cursor-pointer" 
              />
              <div>
                  <label htmlFor="modal_auto_dist" className="text-sm font-bold cursor-pointer block">Enable Smart Auto-Distribute</label>
                  <p className="text-[10px] text-gray-500">System will execute automatically as capital builds.</p>
              </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setEditingDistProfile(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingDistProfile?.sequenceId) {
                    context.updateDistributionSequence(editingDistProfile.sequenceId, {
                        targetAmount: editingDistProfile.amount,
                        autoDistribute: editingDistProfile.autoDistribute,
                        targetDescription: editingDistProfile.targetDescription,
                        sourceBucket: editingDistProfile.sourceBucket || "Uncategorized",
                        actorRole: editingDistProfile.actorRole || "Founder",
                    });
                    alert("Sequence updated successfully.");
                }
                setEditingDistProfile(null);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Save Settings
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isRecurringModelsOpen}
        onClose={() => { setIsRecurringModelsOpen(false); setRecurringEditTarget(null); setRecurringSearchQuery(''); }}
        title="Manage Recurring Income Models"
      >
         {!recurringEditTarget ? (
           <div className="space-y-4">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
               <input
                 type="text"
                 placeholder="Search models..."
                 value={recurringSearchQuery}
                 onChange={e => setRecurringSearchQuery(e.target.value)}
                 className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm outline-none focus:border-green-500"
               />
             </div>
             
             <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
               {(data.recurringIncomeRecords || [])
                 .filter(r => r.profileId === activeProfileId)
                 .filter(r => r.name.toLowerCase().includes(recurringSearchQuery.toLowerCase()) || r.category?.toLowerCase().includes(recurringSearchQuery.toLowerCase()))
                 .sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                 .map(rec => (
                   <div key={rec.id} className={`p-4 rounded-xl border bg-white dark:bg-slate-800 transition-all ${rec.isActive ? "border-green-200 dark:border-green-800/60 shadow-sm" : "border-gray-200 dark:border-gray-700 opacity-70"}`}>
                     <div className="flex flex-col sm:flex-row justify-between gap-2 mb-3">
                       <div className="flex-1 min-w-0">
                         <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate">{rec.name}</h4>
                         <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
                           <span className="bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-bold uppercase">{rec.category || 'UNCATEGORIZED'}</span>
                           <span className="bg-green-100/50 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded font-bold uppercase border border-green-200 dark:border-green-800/50 shrink-0">
                             {rec.frequency.replace('custom:', 'CUSTOM:')}
                           </span>
                           <span className="shrink-0 text-gray-400 dark:text-gray-500">Since {new Date(rec.startDate).toLocaleDateString()}</span>
                         </div>
                       </div>
                       <div className="text-left sm:text-right shrink-0">
                         <div className="text-base sm:text-lg font-semibold text-green-600 dark:text-green-400 break-words max-w-full">
                           <MoneyDisplay amount={rec.amount} symbol={symbol} />
                         </div>
                         <div className="text-[10px] sm:text-xs text-gray-400 font-medium">Target per cycle</div>
                       </div>
                     </div>
                     
                     <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 gap-2 flex-wrap">
                       <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1.5 cursor-pointer group" onClick={() => context.updateRecurringIncomeSequence?.(rec.id, { isActive: !rec.isActive })}>
                           <div className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors ${rec.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                              <div className={`w-3.5 h-3.5 rounded-full bg-white transform transition-transform ${rec.isActive ? 'translate-x-3.5' : 'translate-x-0'}`} />
                           </div>
                           <span className="text-[10px] font-bold text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors uppercase select-none">{rec.isActive ? 'Active' : 'Paused'}</span>
                         </div>
                         <div className="w-px h-3 bg-gray-200 dark:bg-gray-700"></div>
                         <button 
                           onClick={() => setRecurringEditTarget(rec)}
                           className="px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 text-[10px] font-bold uppercase rounded-lg flex items-center gap-1.5 transition-colors"
                         >
                           <Edit2 size={12} /> Edit Settings
                         </button>
                       </div>
                       <button onClick={() => {
                           if(confirm("Log this recurring income now?")) {
                               context.reLogRecurringIncome?.(rec.id);
                           }
                       }} disabled={!rec.isActive} className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 focus:ring-2 ring-green-500/20 font-bold text-xs rounded-lg transition-all disabled:opacity-50">
                         Re-Log Latest
                       </button>
                     </div>
                   </div>
                 ))}
               
               {(!data.recurringIncomeRecords?.filter(r => r.profileId === activeProfileId).length) && (
                 <div className="text-center py-10 text-gray-400">No recurring models found.</div>
               )}
             </div>
           </div>
         ) : (
           <div className="space-y-4">
             <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
               <div>
                 <div className="text-xs text-gray-500 font-bold uppercase">Editing Model</div>
                 <div className="font-bold text-sm text-gray-900 dark:text-white">{recurringEditTarget.name}</div>
               </div>
               <button onClick={() => setRecurringEditTarget(null)} className="text-gray-400 hover:text-gray-600 p-1">
                 <X size={16} />
               </button>
             </div>
             
             <Input
               label="Model Name"
               type="text"
               value={recurringEditTarget.name}
               onChange={(e) => setRecurringEditTarget({ ...recurringEditTarget, name: e.target.value })}
             />
             
             <Input
               label="Target Amount"
               type="number"
               value={recurringEditTarget.amount}
               onChange={(e) => setRecurringEditTarget({ ...recurringEditTarget, amount: parseFloat(e.target.value) || 0 })}
               className="text-lg font-bold"
             />
             
             <Select
               label="Frequency"
               value={recurringEditTarget.frequency?.startsWith('custom') ? 'custom' : recurringEditTarget.frequency}
               onChange={e => {
                   const val = e.target.value;
                   if (val === 'custom') {
                       setRecurringEditTarget({...recurringEditTarget, frequency: 'custom:1:months'});
                   } else {
                       setRecurringEditTarget({...recurringEditTarget, frequency: val});
                   }
               }}
               options={FREQUENCY_OPTIONS.filter(f => f.value !== 'one_time').map(o => ({ value: o.value, label: o.label.replace('🔘 ', '') }))}
             />
             
             {recurringEditTarget.frequency?.startsWith('custom') && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                       <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recur every</label>
                       <input 
                         type="number" 
                         min="1"
                         className="w-full px-4 py-2 sm:py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm sm:text-base outline-none focus:border-primary"
                         value={recurringEditTarget.frequency.split(':')[1] ? parseFloat(recurringEditTarget.frequency.split(':')[1]) : 1} 
                         onChange={(e) => setRecurringEditTarget({...recurringEditTarget, frequency: `custom:${parseFloat(e.target.value) || 1}:${recurringEditTarget.frequency.split(':')[2] || 'months'}`})}
                       />
                    </div>
                    <div className="flex-1">
                       <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Unit</label>
                       <select 
                         className="w-full px-4 py-2 sm:py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm sm:text-base outline-none focus:border-primary appearance-none"
                         value={recurringEditTarget.frequency.split(':')[2] || 'months'}
                         onChange={(e) => setRecurringEditTarget({...recurringEditTarget, frequency: `custom:${recurringEditTarget.frequency.split(':')[1] ? parseFloat(recurringEditTarget.frequency.split(':')[1]) : 1}:${e.target.value}`})}
                       >
                         <option value="days">Days</option>
                         <option value="weeks">Weeks</option>
                         <option value="months">Months</option>
                         <option value="years">Years</option>
                         <option value="times_per_month">Times per month</option>
                         <option value="times_per_year">Times per year</option>
                       </select>
                    </div>
                  </div>
             )}
             
             <Select
               label="Allocation/Bucket (Where it lands)"
               value={recurringEditTarget.category || "Uncategorized"}
               onChange={e => setRecurringEditTarget({...recurringEditTarget, category: e.target.value})}
               options={[
                  { value: "Uncategorized", label: "Uncategorized" },
                  ...uniqueCategories.map(c => ({ value: c, label: c }))
               ]}
             />
             
             <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm mt-4">
                 <input 
                     type="checkbox" 
                     id="modal_auto_log" 
                     checked={recurringEditTarget.autoLog ?? false} 
                     onChange={e => setRecurringEditTarget({ ...recurringEditTarget, autoLog: e.target.checked })} 
                     className="w-5 h-5 rounded-lg text-green-600 focus:ring-green-500 cursor-pointer" 
                 />
                 <div>
                     <label htmlFor="modal_auto_log" className="text-sm font-bold cursor-pointer block">Auto-Log Next Term</label>
                     <p className="text-[10px] text-gray-500">System will automatically log entries when due.</p>
                 </div>
             </div>

             <div className="flex justify-between pt-4">
                {!recurringEditTarget.isActive ? (
                    <button
                       onClick={() => {
                           if (confirm(`Are you sure you want to completely delete "${recurringEditTarget.name}"? This action cannot be reversed, but historical entries will remain.`)) {
                               if(context.deleteRecurringIncomeSequence) {
                                   context.deleteRecurringIncomeSequence(recurringEditTarget.id);
                                   setRecurringEditTarget(null);
                               } else {
                                   alert("Delete feature not available yet.");
                               }
                           }
                       }}
                       className="text-red-500 hover:text-red-600 font-bold text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                       <Trash2 size={12} /> Delete Model
                    </button>
                ) : (
                    <div className="text-[10px] text-gray-400 italic flex items-center px-2">Pause model to unlock deletion</div>
                )}
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setRecurringEditTarget(null)}>Cancel</Button>
                  <Button
                    onClick={() => {
                        context.updateRecurringIncomeSequence?.(recurringEditTarget.id, {
                            name: recurringEditTarget.name,
                            amount: recurringEditTarget.amount,
                            frequency: recurringEditTarget.frequency,
                            category: recurringEditTarget.category,
                            autoLog: recurringEditTarget.autoLog
                        });
                        alert("Recurring model updated successfully.");
                        setRecurringEditTarget(null);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Save Changes
                  </Button>
                </div>
             </div>
           </div>
         )}
      </Modal>

    </div>
  );
};

export default TransactionsView;
