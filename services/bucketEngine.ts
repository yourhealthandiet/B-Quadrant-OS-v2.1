import { AllocationCategory } from '../types';

export const getChildren = (allocations: AllocationCategory[], parentId: string): AllocationCategory[] => {
    return allocations.filter(a => a.parentId === parentId);
};

export const hasChildren = (allocations: AllocationCategory[], bucketId: string): boolean => {
    return allocations.some(a => a.parentId === bucketId);
};

export const getEffectiveBalance = (allocations: AllocationCategory[], bucketId: string): number => {
    const bucket = allocations.find(a => a.id === bucketId);
    if (!bucket) return 0;
    
    const children = getChildren(allocations, bucket.id);
    if (children.length === 0) {
        return bucket.balance; // Leaf node
    }
    
    // Parent node: sum of all children's effective balances (recursive)
    return children.reduce((sum, child) => sum + getEffectiveBalance(allocations, child.id), 0);
};

export const getTopLevelBuckets = (allocations: AllocationCategory[]): AllocationCategory[] => {
    return allocations.filter(a => !a.parentId);
};

// Build options for dropdowns recursively
export const buildHierarchicalOptions = (
    allocations: AllocationCategory[],
    formatter: (a: AllocationCategory) => string,
    parentId?: string,
    depth = 0,
    valueKey: 'name' | 'id' = 'name'
): { value: string; label: string; disabled?: boolean; depth?: number }[] => {
    const children = parentId 
        ? getChildren(allocations, parentId)
        : getTopLevelBuckets(allocations);
        
    let options: { value: string; label: string; disabled?: boolean; depth?: number }[] = [];
    
    children.forEach(child => {
        const hasChildrenFlag = hasChildren(allocations, child.id);
        options.push({
            value: child[valueKey],
            label: formatter(child),
            disabled: hasChildrenFlag, // disabled if it has children, because it shouldn't receive transactions directly
            depth: depth
        });
        
        if (hasChildrenFlag) {
            options = options.concat(buildHierarchicalOptions(allocations, formatter, child.id, depth + 1, valueKey));
        }
    });
    
    return options;
};

export const distributeAmountRecursive = (amount: number, allocations: AllocationCategory[]): AllocationCategory[] => {
    let result = [...allocations];
    
    // Uncategorized is reduced by the amount distributed
    const uncatIndex = result.findIndex(a => a.name === 'Uncategorized');
    if (uncatIndex !== -1) {
        result[uncatIndex] = { ...result[uncatIndex], balance: result[uncatIndex].balance - amount };
    }
    
    const amountsToReceive: Record<string, number> = {};
    
    // Top level
    const topLevel = getTopLevelBuckets(result).filter(a => a.name !== 'Uncategorized');
    topLevel.forEach(bucket => {
        amountsToReceive[bucket.id] = amount * (bucket.percentage / 100);
    });
    
    let queue = [...topLevel];
    while (queue.length > 0) {
        const current = queue.shift()!;
        const children = getChildren(result, current.id);
        
        if (children.length > 0) {
            const parentAmount = amountsToReceive[current.id] || 0;
            amountsToReceive[current.id] = 0; // Parents don't hold balance
            
            children.forEach(child => {
                amountsToReceive[child.id] = parentAmount * (child.percentage / 100);
                queue.push(child);
            });
        }
    }
    
    // Update balances for leaf nodes
    result = result.map(bucket => {
        if (bucket.name === 'Uncategorized') return bucket;
        const addAmount = amountsToReceive[bucket.id] || 0;
        // Parents might have legacy balances, but we shouldn't touch them, or add 0.
        // If it's a parent, addAmount will be 0.
        return { ...bucket, balance: bucket.balance + addAmount };
    });
    
    return result;
};

export const computeDistributionBreakdown = (amount: number, allocations: AllocationCategory[]): Record<string, number> => {
    const amountsToReceive: Record<string, number> = {};
    const topLevel = getTopLevelBuckets(allocations).filter(a => a.name !== 'Uncategorized');
    topLevel.forEach(bucket => {
        amountsToReceive[bucket.id] = amount * (bucket.percentage / 100);
    });
    let queue = [...topLevel];
    while (queue.length > 0) {
        const current = queue.shift()!;
        const children = getChildren(allocations, current.id);
        if (children.length > 0) {
            const parentAmount = amountsToReceive[current.id] || 0;
            amountsToReceive[current.id] = 0;
            children.forEach(child => {
                amountsToReceive[child.id] = parentAmount * (child.percentage / 100);
                queue.push(child);
            });
        }
    }
    
    return Object.fromEntries(
        Object.entries(amountsToReceive).filter(([_, val]) => val > 0)
    );
};
