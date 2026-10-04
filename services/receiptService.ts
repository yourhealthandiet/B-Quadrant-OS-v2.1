
// Service to handle receipt generation, financial statements, and CSV exports

import { CURRENCY_SYMBOLS } from '../types';

const encodeForHTML = (str: string) => {
    return str ? str.replace(/[\u00A0-\u9999<>\&]/g, (i) => `&#${i.charCodeAt(0)};`) : '';
};

export const downloadCSV = (data: any[], filename: string) => {
    if (!data || !data.length) {
        alert("No data to export.");
        return;
    }

    const headers = Object.keys(data[0]).filter(k => k !== 'biTriangle' && k !== 'teamMembers' && k !== 'pendingEntries');
    
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(fieldName => {
            let val = row[fieldName];
            if (typeof val === 'string') {
                val = val.replace(/"/g, '""'); 
                if (val.includes(',') || val.includes('\n')) val = `"${val}"`;
            }
            return val;
        }).join(','))
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const downloadFinancialStatement = (
    profileName: string,
    currency: string,
    income: any[],
    expenses: any[],
    assets: any[],
    liabilities: any[],
    isBusiness: boolean = false
) => {
    const timestamp = new Date().toLocaleString();
    
    const totalIncome = income.reduce((s, i) => s + i.amount, 0);
    const totalExpenses = expenses.reduce((s, i) => s + i.amount, 0);
    const netIncome = totalIncome - totalExpenses;
    
    const totalAssets = assets.reduce((s, i) => s + i.amount, 0);
    const totalLiabilities = liabilities.reduce((s, i) => s + i.amount, 0);
    const equity = totalAssets - totalLiabilities;

    let note = "";
    if (netIncome > 0 && equity > 0) {
        note = `This entity is SOLVENT and PROFITABLE. Ensure surplus cashflow is reinvested into 'I' quadrant assets to increase velocity.`;
    } else if (netIncome > 0 && equity < 0) {
        note = `PROFITABLE but INSOLVENT. You have cashflow, but you owe more than you own. Prioritize paying down liabilities with your profit.`;
    } else if (netIncome < 0) {
        note = `WARNING: NEGATIVE CASHFLOW. This entity is bleeding cash. Immediate expense reduction or revenue generation is required to prevent collapse.`;
    }

    const style = `
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; color: #333; background: #fff; }
            .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .company-name { font-size: 2em; font-weight: 900; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 1px; }
            .report-title { font-size: 1.4em; font-weight: bold; color: #555; text-transform: uppercase; }
            .meta { font-size: 0.9em; color: #666; margin-top: 5px; }
            .section { margin-bottom: 40px; page-break-inside: avoid; }
            .section-header { background: #f3f4f6; padding: 10px; font-weight: bold; font-size: 1.1em; border-left: 5px solid #000; text-transform: uppercase; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9em; }
            th { text-align: left; padding: 8px; border-bottom: 2px solid #ddd; color: #666; font-size: 0.8em; text-transform: uppercase; }
            td { padding: 8px; border-bottom: 1px solid #eee; }
            .amount { text-align: right; font-family: 'Courier New', monospace; font-weight: 600; }
            .total-row { font-weight: bold; border-top: 2px solid #000; background: #fff; }
            .grand-total { font-size: 1.2em; border-top: 3px double #000; border-bottom: 3px double #000; padding: 10px 0; display: flex; justify-content: space-between; margin-top: 10px; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 0.8em; text-align: center; color: #888; }
            .note-box { background: #fffbeb; border: 1px solid #fcd34d; padding: 15px; border-radius: 8px; margin-top: 20px; font-style: italic; color: #92400e; font-size: 0.9em; }
        </style>
    `;

    const getCategoryName = (name: string) => {
        if (name === 'Uncategorized') return isBusiness ? 'Main Revenue Bucket' : 'Main Income Bucket';
        return name;
    }

    const safeCurrency = encodeForHTML(currency);
    const renderTable = (items: any[]) => {
        if (items.length === 0) return '<div style="padding:10px; font-style:italic; color:#999;">No records found.</div>';
        return `
        <table>
            <thead><tr><th>Date</th><th>Logged By</th><th>Description</th><th>Bucket/Class</th><th class="amount">Value</th></tr></thead>
            <tbody>
                ${items.map(i => `
                    <tr>
                        <td>${new Date(i.date || i.dateAcquired).toLocaleDateString()} ${i.timestamp ? new Date(i.timestamp).toLocaleTimeString() : ''}</td>
                        <td style="font-size:0.8em; color:#666;">${i.submittedBy || 'Owner'}</td>
                        <td>${i.description || i.name}</td>
                        <td>${getCategoryName(i.category || i.assetClass || i.type)}</td>
                        <td class="amount">${safeCurrency}${i.amount.toLocaleString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
    };

    const content = `
        <div class="header">
            <div class="company-name">${profileName}</div>
            <div class="report-title">Financial Statement</div>
            <div class="meta">Generated: ${timestamp} • Currency: ${safeCurrency}</div>
        </div>

        <div class="section">
            <div class="section-header"><span>Income Statement</span> <span>Net: ${safeCurrency}${netIncome.toLocaleString()}</span></div>
            <h4 style="margin-bottom:5px; border-bottom:1px solid #eee;">Revenue / Income</h4>
            ${renderTable(income)}
            <div style="text-align:right; font-weight:bold; margin-top:5px;">Total Income: ${safeCurrency}${totalIncome.toLocaleString()}</div>
            <h4 style="margin-top:20px; margin-bottom:5px; border-bottom:1px solid #eee;">Expenses</h4>
            ${renderTable(expenses)}
            <div style="text-align:right; font-weight:bold; margin-top:5px;">Total Expenses: (${safeCurrency}${totalExpenses.toLocaleString()})</div>
        </div>

        <div class="section">
            <div class="section-header"><span>Balance Sheet</span> <span>Equity: ${safeCurrency}${equity.toLocaleString()}</span></div>
            <h4 style="margin-bottom:5px; border-bottom:1px solid #eee;">Assets (Owned)</h4>
            ${renderTable(assets)}
            <div style="text-align:right; font-weight:bold; margin-top:5px; color:#16a34a;">Total Assets: ${safeCurrency}${totalAssets.toLocaleString()}</div>
            <h4 style="margin-top:20px; margin-bottom:5px; border-bottom:1px solid #eee;">Liabilities (Owed)</h4>
            ${renderTable(liabilities)}
            <div style="text-align:right; font-weight:bold; margin-top:5px; color:#dc2626;">Total Liabilities: ${safeCurrency}${totalLiabilities.toLocaleString()}</div>
        </div>

        <div class="grand-total">
            <span>NET FINANCIAL POSITION (Equity)</span>
            <span>${safeCurrency}${equity.toLocaleString()}</span>
        </div>

        <div class="note-box"><strong>Analyst Note:</strong> ${note}</div>
        <div class="footer">B-Quadrant OS • Official Record</div>
    `;

    const fullHtml = `<html><head><meta charset="UTF-8">${style}</head><body>${content}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Financial_Statement_${profileName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const downloadLoanAgreement = (
    lenderName: string,
    borrowerName: string,
    assetInfo: any,
    formatAmount: (num: number) => string
) => {
    const style = `
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; background: #fff; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .company-name { font-size: 1.8em; font-weight: 900; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 1px; }
            .report-title { font-size: 1.2em; font-weight: bold; color: #555; text-transform: uppercase; }
            .section { margin-bottom: 30px; }
            .section-header { font-weight: bold; font-size: 1.1em; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px; text-transform: uppercase; }
            .field { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .label { font-weight: bold; color: #555; }
            .value { font-family: 'Courier New', monospace; font-weight: 600; text-align: right; width: 60%; }
            .terms-box { background: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin-top: 15px; white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 0.9em; }
            .signatures { display: flex; justify-content: space-between; margin-top: 60px; page-break-inside: avoid; }
            .sig-block { width: 45%; border-top: 1px solid #000; padding-top: 10px; text-align: center; font-size: 0.9em; position: relative; }
            .sig-text { font-family: 'Brush Script MT', cursive, monospace; font-size: 1.5em; color: #1e3a8a; position: absolute; top: -35px; width: 100%; text-align: center; transform: rotate(-2deg); opacity: 0.8;}
            .timestamp { display: block; font-size: 0.8em; color: #666; margin-top: 5px; font-family: Helvetica, sans-serif; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 0.8em; text-align: center; color: #888; }
        </style>
    `;

    const isSigned = assetInfo.agreementStatus === 'signed';
    const signedDate = assetInfo.agreementSignedAt ? new Date(assetInfo.agreementSignedAt).toLocaleString() : 'Pending Signature';

    const content = `
        <div class="header">
            <div class="company-name">Internal Loan Agreement</div>
            <div class="report-title">B-Quadrant OS Record</div>
            <div>Date Issued: ${new Date(assetInfo.date).toLocaleDateString()}</div>
        </div>

        <div class="section">
            <div class="section-header">1. Parties</div>
            <div class="field"><span class="label">Lender:</span> <span class="value">${encodeForHTML(lenderName)}</span></div>
            <div class="field"><span class="label">Borrower:</span> <span class="value">${encodeForHTML(borrowerName)}</span></div>
        </div>

        <div class="section">
            <div class="section-header">2. Loan Details</div>
            <div class="field"><span class="label">Principal Amount:</span> <span class="value">${formatAmount(assetInfo.initialAmount || assetInfo.amount)}</span></div>
            <div class="field"><span class="label">Annual Interest Rate:</span> <span class="value">${assetInfo.interestRate || 0}%</span></div>
            <div class="field"><span class="label">Term:</span> <span class="value">${assetInfo.termValue || 0} ${encodeForHTML(assetInfo.termUnit || '')}</span></div>
            <div class="field"><span class="label">Estimated Monthly Payment:</span> <span class="value">${formatAmount(assetInfo.monthlyPayment || 0)}</span></div>
        </div>

        <div class="section">
            <div class="section-header">3. Agreement Terms & Conditions</div>
            <div class="terms-box">${encodeForHTML(assetInfo.agreementReason || 'Standard internal transfer loan.')}</div>
        </div>

        <div class="signatures">
            <div class="sig-block">
                <div class="sig-text">${encodeForHTML(lenderName)}</div>
                <span class="label">Lender Signature</span>
                <span class="timestamp">Digitally Signed (Auto-Verified)</span>
            </div>
            <div class="sig-block">
                ${isSigned ? `<div class="sig-text">${encodeForHTML(borrowerName)}</div>` : ''}
                <span class="label">Borrower Signature</span>
                <span class="timestamp">${isSigned ? `Digitally Signed on ${signedDate}` : 'PENDING SIGNATURE'}</span>
            </div>
        </div>

        <div class="footer">This document serves as an official accounting record for inter-entity transactions within B-Quadrant OS.</div>
    `;

    const fullHtml = `<html><head><meta charset="UTF-8">${style}</head><body>${content}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Loan_Agreement_${assetInfo.id}_${new Date().toISOString().split('T')[0]}.html`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const downloadReceipt = (data: any, title: string, type: 'single' | 'list' = 'single', context?: { profileName: string, currency: string, isBusiness?: boolean }) => {
    const timestamp = new Date().toLocaleString();
    const profileName = context?.profileName || 'Unknown Profile';
    const currency = context?.currency || '$';
    const safeCurrency = encodeForHTML(currency);
    const isBusiness = context?.isBusiness || false; // Pass this context
    
    const style = `
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; color: #333; background: #f9f9f9; }
            .paper { background: #fff; padding: 40px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e0e0e0; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .company-name { font-size: 1.8em; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; }
            .doc-title { font-size: 1.2em; font-weight: bold; color: #555; text-transform: uppercase; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 0.9em; }
            .meta-item { display: flex; flex-direction: column; }
            .meta-label { font-weight: bold; font-size: 0.8em; color: #777; text-transform: uppercase; }
            .meta-value { font-weight: 600; font-size: 1.1em; }
            
            .section-title { font-size: 1em; font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 20px; margin-bottom: 10px; color: #333; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.85em; }
            th { text-align: left; background: #f4f4f4; padding: 10px; border-bottom: 2px solid #ddd; text-transform: uppercase; font-size: 0.8em; }
            td { padding: 10px; border-bottom: 1px solid #eee; vertical-align: top; }
            .amount { text-align: right; font-family: 'Courier New', Courier, monospace; font-weight: bold; }
            .highlight { background: #fff9db; }
            
            .single-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px dashed #ddd; }
            .single-label { font-weight: bold; color: #555; }
            .single-value { font-family: 'Courier New', Courier, monospace; }

            .footer { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; font-size: 0.7em; text-align: center; color: #888; }
            .stamp { color: #22c55e; border: 2px solid #22c55e; display: inline-block; padding: 5px 10px; text-transform: uppercase; font-weight: bold; transform: rotate(-5deg); margin-top: 20px; }
            .type-header { background: #e5e7eb; color: #000; padding: 5px 10px; font-weight: bold; margin-top: 10px; border-radius: 4px; }
        </style>
    `;

    const getBucketName = (name: string) => {
        if (name === 'Uncategorized') return isBusiness ? 'Main Revenue Bucket' : 'Main Income Bucket';
        return name;
    };

    let content = '';

    if (type === 'single') {
        const isEntry = data.type === 'income' || data.type === 'expense';
        const hours = data.hoursWorked || 0;
        const rawBucket = data.category || data.assetClass || data.type;
        const bucket = getBucketName(rawBucket);
        const logger = data.submittedBy || 'Owner';
        const recordTime = data.time || (data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
        
        content = `
            <div class="paper">
                <div class="header">
                    <div class="company-name">B-Quadrant OS</div>
                    <div class="doc-title">${title.replace(/_/g, ' ')}</div>
                </div>

                <div class="meta-grid">
                    <div class="meta-item"><span class="meta-label">Profile Context</span><span class="meta-value">${profileName}</span></div>
                    <div class="meta-item"><span class="meta-label">Date & Time</span><span class="meta-value">${new Date(data.date).toLocaleDateString()} ${recordTime}</span></div>
                    <div class="meta-item"><span class="meta-label">Transaction ID</span><span class="meta-value">${data.id.substring(0, 12)}</span></div>
                    <div class="meta-item"><span class="meta-label">Logged By</span><span class="meta-value">${logger}</span></div>
                </div>

                <div class="section-title">Record Details</div>
                <div class="single-row"><span class="single-label">Description</span><span class="single-value">${data.description || data.name}</span></div>
                <div class="single-row"><span class="single-label">Category</span><span class="single-value" style="text-transform: uppercase;">${bucket}</span></div>
                ${isEntry ? `<div class="single-row highlight"><span class="single-label">Time Effort</span><span class="single-value">${hours} hrs</span></div>` : ''}
                
                <div class="single-row" style="border-bottom: 2px solid #000; margin-top: 20px;">
                    <span class="single-label" style="font-size: 1.2em;">TOTAL AMOUNT</span>
                    <span class="single-value" style="font-size: 1.2em; font-weight: bold;">${safeCurrency}${(data.amount || data.currentValue || 0).toLocaleString()}</span>
                </div>

                <div style="text-align: center;"><div class="stamp">VERIFIED</div></div>
                <div class="footer">Generated by B-Quadrant OS • Immutable Record</div>
            </div>
        `;
    } else {
        const items = Array.isArray(data) ? data : [];
        const assets = items.filter(i => i.type === 'asset' || i.type === 'business_equity');
        const liabilities = items.filter(i => i.type === 'liability');
        const others = items.filter(i => i.type !== 'asset' && i.type !== 'business_equity' && i.type !== 'liability');

        const renderTableRows = (list: any[]) => list.map(item => `
            <tr>
                <td>
                    ${new Date(item.date || item.dateAcquired).toLocaleDateString()}<br/>
                    <span style="font-size:0.8em;color:#888">${item.time || (item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}</span>
                </td>
                <td>${item.submittedBy || 'Owner'}</td>
                <td>${item.description || item.name}</td>
                <td>${getBucketName(item.category || item.assetClass || item.type)}</td>
                <td class="amount">${(item.amount || item.currentValue || 0).toLocaleString()}</td>
            </tr>
        `).join('');

        content = `
            <div class="paper">
                <div class="header">
                    <div class="company-name">B-Quadrant OS</div>
                    <div class="doc-title">${title.replace(/_/g, ' ')}</div>
                </div>
                <div class="meta-grid">
                    <div class="meta-item"><span class="meta-label">Profile Context</span><span class="meta-value">${profileName}</span></div>
                    <div class="meta-item"><span class="meta-label">Report Date</span><span class="meta-value">${timestamp}</span></div>
                </div>

                <table>
                    <thead><tr><th>Date/Time</th><th>Logger</th><th>Description</th><th>Bucket</th><th class="amount">Value (${safeCurrency})</th></tr></thead>
                    <tbody>
                        ${assets.length > 0 ? `<tr><td colspan="5" class="type-header">ASSETS</td></tr>${renderTableRows(assets)}` : ''}
                        ${liabilities.length > 0 ? `<tr><td colspan="5" class="type-header">LIABILITIES</td></tr>${renderTableRows(liabilities)}` : ''}
                        ${others.length > 0 ? `<tr><td colspan="5" class="type-header">TRANSACTIONS</td></tr>${renderTableRows(others)}` : ''}
                        
                        <tr class="total-row">
                            <td colspan="4" style="text-align: right;">NET TOTAL</td>
                            <td class="amount">${safeCurrency}${items.reduce((s:number, i:any) => s + (i.type === 'liability' || i.type === 'expense' ? -(i.amount||0) : (i.amount||i.currentValue||0)), 0).toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
                <div class="footer">B-Quadrant OS • Official Record</div>
            </div>
        `;
    }

    const fullHtml = `<html><head><meta charset="UTF-8">${style}</head><body>${content}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title}_${profileName.replace(/\s+/g, '_')}.html`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
