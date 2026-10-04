import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { Card, Button } from '../components/Shared';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { CURRENCY_SYMBOLS, Entry, DEFAULT_BUSINESS_ALLOCATIONS } from '../types';

export default function ClaimView() {
    const context = useContext(AppContext)!;
    const { claimTokenUrl, data, setData, setCurrentView, activeProfileId, modifyAllocations } = context as any;

    const [error, setError] = useState<string | null>(null);
    const [claimData, setClaimData] = useState<any>(null);

    useEffect(() => {
        if (!claimTokenUrl) {
            setError("No claim token provided.");
            return;
        }
        
        let decoded;
        try {
            decoded = JSON.parse(atob(claimTokenUrl));
        } catch (e) {
            setError("Invalid or corrupted claim link.");
            return;
        }

        if (!decoded || (!decoded.businessId && !decoded.business && !decoded.distribution)) {
            setError("No valid data found in claim link.");
            return;
        }

        setClaimData(decoded);
        setError(null);
    }, [claimTokenUrl]);

    const handleClaim = () => {
        if (!claimData) return;

         const distInfo = claimData.distribution || claimData;
         const snapshot = claimData.snapshot || {};

         // Check against double claim
         const alreadyClaimed = data.entries.some((e: Entry) => e.transfer_id === distInfo.id && e.profileId === activeProfileId);
         if (alreadyClaimed) {
             alert("You have already claimed this distribution.");
             setCurrentView('dashboard');
             return;
         }

         const incomingEntry: Entry = {
              id: `entry_${Date.now()}_claim`,
              profileId: activeProfileId,
              date: new Date().toISOString().split('T')[0],
              timestamp: new Date().toISOString(),
              description: distInfo.businessName ? `Distribution from ${distInfo.businessName}` : `Distribution Claim from External Source`,
              amount: Number(distInfo.amount || 0),
              type: 'income',
              subtype: 'DISTRIBUTION',
              transfer_id: distInfo.id || distInfo.distributionId,
              from_entity_id: distInfo.businessId,
              to_entity_id: activeProfileId,
              category: 'Uncategorized',
              quadrant: 'I', // Passive income from distribution
              effortLevel: 'None',
              hoursWorked: 0,
              affectsCashflow: true,
              affectsIncome: true
         };

         let importedBusinessText = "";
         const business = snapshot.business;
         let userOwnershipPercentage = 0;

         // Auto-import business if needed
         if (business && !data.businesses.find((b: any) => b.id === distInfo.businessId)) {
             try {
                 if (!context.engine.entities.has(business.id)) {
                     context.engine.addEntity({ id: business.id, name: business.name, type: 'BUSINESS' });
                 }
                 
                 const importedEdges = snapshot.ownership || snapshot.ownershipEdges || [];
                 importedEdges.forEach((edge: any) => {
                     let entityId = edge.parent_entity_id || edge.from;
                     
                     if (entityId === distInfo.recipientId) {
                          entityId = activeProfileId === 'personal' ? 'personal' : activeProfileId; 
                          userOwnershipPercentage = edge.percentage;
                     } else if (entityId === 'personal') {
                          entityId = `founder_${business.id}`;
                     }
                     
                     if (entityId !== 'personal' && entityId !== activeProfileId && !context.engine.entities.has(entityId)) {
                          const originalEntityId = edge.parent_entity_id || edge.from;
                          const entityName = snapshot.entities?.find((ent: any) => ent.id === originalEntityId)?.name || (entityId.startsWith('founder') ? 'Original Founder' : `Board Member (${entityId.substring(0, 4)})`);
                          context.engine.addEntity({ id: entityId, name: entityName, type: 'PERSON' });
                     }
                     
                     context.engine.addEdge({
                         id: `edge_${Date.now()}_${Math.random()}`,
                         parent_entity_id: entityId,
                         child_entity_id: business.id,
                         percentage: edge.percentage
                     });
                 });
                 importedBusinessText = ` and imported business structure for ${business.name}`;
             } catch(e) {
                 console.log("Failed to auto-import business", e);
             }
         }

         // Track locally so sender can see without backend
         const recId = distInfo.recordId || distInfo.id;
         if (recId) {
             localStorage.setItem(`claimed_${recId}`, "true");
         }

         // Mark record claimed if it exists locally
         setData((prev: any) => {
             const updatedRecords = prev.distributionRecords?.map((r: any) => 
                (r.token === claimTokenUrl || r.id === recId) ? { ...r, status: 'claimed' } : r
             ) || [];
             
             let nextBusinesses = prev.businesses;
             let nextAllocations = [...prev.allocations];
             if (business && !nextBusinesses.find((b: any) => b.id === business.id)) {
                 nextBusinesses = [...nextBusinesses, {
                     id: business.id,
                     name: business.name,
                     industry: 'Other',
                     currency: prev.profile.currency,
                     ownershipStake: userOwnershipPercentage,
                     entityType: business.entityType || 'Partnership',
                     goalAmount: 100000,
                     goalTimeline: 12,
                     monthlyRunRate: 0,
                     monthlyBurnRate: 0,
                     cashReserve: 0,
                     isSetup: true
                 }];

                 const newAllocations = DEFAULT_BUSINESS_ALLOCATIONS.map(cat => ({
                     id: `alloc_${Date.now()}_${Math.random()}`,
                     profileId: business.id,
                     name: cat.name,
                     percentage: cat.percentage,
                     balance: 0
                 }));
                 nextAllocations = [...nextAllocations, ...newAllocations];
             }

             // APPLY ALLOCATION UPDATE FOR THE INCOMING ENTRY
             const recipientAllocations = nextAllocations.filter((a: any) => a.profileId === activeProfileId);
             const updatedRecipientAllocations = modifyAllocations(recipientAllocations, incomingEntry, 'add');
             
             nextAllocations = [
                 ...nextAllocations.filter((a: any) => a.profileId !== activeProfileId),
                 ...updatedRecipientAllocations
             ];

             return {
                 ...prev,
                 entries: [...prev.entries, incomingEntry],
                 businesses: nextBusinesses,
                 allocations: nextAllocations,
                 entities: Array.from(context.engine.entities.values()),
                 ownershipEdges: [...context.engine.edges],
                 distributionRecords: updatedRecords
             };
         });

         alert(`Successfully claimed ${distInfo.amount}${importedBusinessText}!`);
         if (context.setRefreshKey) context.setRefreshKey((prev: number) => prev + 1);
         setCurrentView('dashboard');
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center pt-20">
                <AlertTriangle size={48} className="text-red-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Claim Error</h2>
                <p className="text-gray-500 mb-6">{error}</p>
                <Button onClick={() => setCurrentView('dashboard')}>Return to Dashboard</Button>
            </div>
        );
    }

    if (!claimData) return <div className="text-center pt-10">Loading...</div>;

    const currencySymbol = CURRENCY_SYMBOLS[data.profile.currency] || '$';

    const distInfo = claimData.distribution || claimData;

    return (
        <Card title="Claim Distribution" className="max-w-md mx-auto mt-12 text-center">
             <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
             <h3 className="text-xl font-bold mb-2">You received a distribution!</h3>
             <p className="text-gray-500 text-sm mb-6">
                 Verify the details and claim this into your active profile: <strong>{activeProfileId === 'personal' ? data.profile.name : data.businesses.find((b:any)=>b.id===activeProfileId)?.name}</strong>
             </p>

             <div className="bg-gray-50 dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
                 <div className="text-sm text-gray-500 mb-2 uppercase tracking-wider font-bold">From: {distInfo.businessName || 'External Business'}</div>
                 <div className="text-3xl font-semibold text-green-600 dark:text-green-400 mb-2">
                     {currencySymbol}{Number(distInfo.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                 </div>
                 <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Total Amount</div>
             </div>

             {claimData.snapshot?.business && !data.businesses.find((b: any) => b.id === distInfo.businessId) && (
                 <div className="text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg mb-6">
                     <p className="font-bold mb-1">Includes Business Setup</p>
                     <p>Claiming this will automatically import the ownership structure for {distInfo.businessName} into your workspace.</p>
                 </div>
             )}

             <Button className="w-full justify-center text-lg py-3" onClick={handleClaim}>Accept & Import</Button>
        </Card>
    );
}
