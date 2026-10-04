import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { Card, Button, Input } from '../components/Shared';
import { Download, AlertTriangle, Building, Users } from 'lucide-react';
import { BusinessEntity, OwnershipEdge, DEFAULT_BUSINESS_ALLOCATIONS } from '../types';

export default function ImportView() {
    const context = useContext(AppContext)!;
    const { importTokenUrl, data, setData, setCurrentView, engine } = context as any;

    const [error, setError] = useState<string | null>(null);
    const [importData, setImportData] = useState<any>(null);
    const [yourPercentage, setYourPercentage] = useState<number>(0);

    useEffect(() => {
        if (!importTokenUrl) {
            setError("No import token provided.");
            return;
        }
        
        let decoded;
        try {
            decoded = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(importTokenUrl)))));
        } catch (e) {
            setError("Invalid or corrupted import link.");
            return;
        }
        
        if (!decoded || (!decoded.business && !decoded.snapshot?.business)) {
            setError("No valid business data found in link.");
            return;
        }

        const businessData = decoded.snapshot ? decoded.snapshot : decoded;

        setImportData(businessData);
        if (decoded.distribution?.recipientId) {
            // Find percentage from edges if we can
            const edge = businessData.ownershipEdges?.find((e: any) => e.parent_entity_id === decoded.distribution.recipientId);
            if (edge) setYourPercentage(edge.percentage);
        } else if (decoded.recipient && decoded.recipient.percentage) {
            setYourPercentage(decoded.recipient.percentage);
        }
        setError(null);
    }, [importTokenUrl]);

    const handleImport = () => {
        if (!importData || !importData.business) return;

        const business = importData.business;

        // Check if business already exists
        if (data.businesses.some((b: BusinessEntity) => b.id === business.id)) {
            alert("This business has already been imported.");
            setCurrentView('dashboard');
            return;
        }

        const newBusiness: BusinessEntity = {
            id: business.id,
            name: business.name,
            industry: 'Other',
            currency: data.profile.currency || 'USD',
            ownershipStake: yourPercentage,
            entityType: business.type || 'Partnership',
            goalAmount: 100000,
            goalTimeline: 12,
            monthlyRunRate: 0,
            monthlyBurnRate: 0,
            cashReserve: 0,
            isSetup: true
        };

        try {
            if (!engine.entities.has(business.id)) {
                engine.addEntity({ id: business.id, name: business.name, type: 'BUSINESS' });
            }
            
            // Assign user ownership
            if (yourPercentage > 0) {
                 engine.addEdge({
                     id: `edge_${Date.now()}_personal_${business.id}`,
                     parent_entity_id: 'personal',
                     child_entity_id: business.id,
                     percentage: yourPercentage
                 });
            }

            // Bring the edges over but we don't know who the people are locally,
            // so let's import the entities generically if they aren't 'personal'
            const importedEdges = importData.ownershipEdges || [];
            importedEdges.forEach((edge: any) => {
                 let entityId = edge.parent_entity_id;
                 
                 // If this edge is the specific recipient we are importing for, skip it (mapped to personal above)
                 if (importData.recipient && entityId === importData.recipient.id) {
                      return;
                 }
                 
                 // The sender's 'personal' is not OUR 'personal'. We rename it so it imports as a generic person.
                 if (entityId === 'personal') {
                      entityId = `founder_${business.id}`;
                 }

                 if (!engine.entities.has(entityId)) {
                      const entityName = importData.entities?.find((ent: any) => ent.id === entityId)?.name || (entityId.startsWith('founder') ? 'Original Founder' : `Board Member (${entityId.substring(0, 4)})`);
                      engine.addEntity({ id: entityId, name: entityName, type: 'PERSON' });
                 }
                 engine.addEdge({
                     id: `edge_${edge.id}`,
                     parent_entity_id: entityId,
                     child_entity_id: business.id,
                     percentage: edge.percentage
                 });
            });

            const newAllocations = DEFAULT_BUSINESS_ALLOCATIONS.map(cat => ({
                id: `alloc_${Date.now()}_${Math.random()}`,
                profileId: business.id,
                name: cat.name,
                percentage: cat.percentage,
                balance: 0
            }));

            setData((prev: any) => {
                const nextBusinesses = prev.businesses.find((b: any) => b.id === newBusiness.id) 
                    ? prev.businesses 
                    : [...prev.businesses, newBusiness];
                    
                const nextAllocations = prev.businesses.find((b: any) => b.id === newBusiness.id)
                    ? prev.allocations
                    : [...prev.allocations, ...newAllocations];

                return {
                    ...prev,
                    businesses: nextBusinesses,
                    allocations: nextAllocations,
                    entities: Array.from(engine.entities.values()),
                    ownershipEdges: [...engine.edges]
                };
            });

            alert(`Successfully imported ${business.name}!`);
            if (context.setRefreshKey) context.setRefreshKey((prev: number) => prev + 1);
            setCurrentView('dashboard');
        } catch (e: any) {
             alert(e.message);
        }
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center pt-20 animate-in fade-in zoom-in duration-500">
                <AlertTriangle size={64} className="text-red-500 mb-6 drop-shadow-md" />
                <h2 className="text-3xl font-bold mb-3 tracking-tight">Import Error</h2>
                <p className="text-gray-500 mb-8 max-w-md text-center text-lg">{error}</p>
                <Button onClick={() => setCurrentView('dashboard')}>Return to Dashboard</Button>
            </div>
        );
    }

    if (!importData || !importData.business) return <div className="text-center pt-20 animate-pulse text-lg">Reading secure payload...</div>;

    const totalEdges = importData.ownershipEdges?.length || 0;

    return (
        <div className="max-w-2xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <Card title="Import Business Structure" className="text-center shadow-xl border-t-4 border-t-indigo-500">
                 <div className="flex justify-center mb-6">
                     <div className="bg-indigo-100 dark:bg-indigo-900/30 p-5 rounded-full">
                         <Download size={48} className="text-indigo-600 dark:text-indigo-400" />
                     </div>
                 </div>
                 
                 <h3 className="text-2xl font-bold mb-3 tracking-tight">Business Structure Received</h3>
                 <p className="text-gray-500 text-base mb-8 max-w-md mx-auto">
                     Review the business details below before importing into your workspace.
                 </p>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center text-center">
                         <Building size={24} className="text-indigo-500 mb-3" />
                         <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Business Name</span>
                         <span className="text-lg font-bold text-gray-900 dark:text-white">{importData.business.name}</span>
                     </div>
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center text-center">
                         <Users size={24} className="text-purple-500 mb-3" />
                         <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Board Members</span>
                         <span className="text-lg font-bold text-gray-900 dark:text-white">{totalEdges} members</span>
                     </div>
                 </div>

                 <div className="mb-8 max-w-sm mx-auto text-left">
                    <p className="text-sm text-gray-500 mb-3 font-medium">To properly align the ownership graph, please specify your ownership stake in this business (if any).</p>
                    <Input 
                        type="number" 
                        label="Your Ownership %" 
                        value={yourPercentage} 
                        onChange={e => setYourPercentage(parseFloat(e.target.value) || 0)} 
                        min="0" max="100" 
                    />
                 </div>

                 <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                    <Button className="w-full justify-center text-lg py-4 shadow-lg hover:shadow-xl transition-all" onClick={handleImport}>
                        Import Business & Ownership Graph
                    </Button>
                    <p className="text-xs text-center text-gray-400 mt-4 max-w-sm mx-auto">
                        This creates a local copy of the business. Future changes made by other owners will not sync automatically.
                    </p>
                 </div>
            </Card>
        </div>
    );
}
