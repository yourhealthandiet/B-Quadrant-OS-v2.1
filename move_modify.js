import fs from 'fs';
let code = fs.readFileSync('App.tsx', 'utf8');

const modStr = `  const modifyAllocations = (currentAllocations: AllocationCategory[], entry: Entry, direction: 'add' | 'remove') => {`;
const modEnd = `  const addTransfer = (amount: number, fromEntityId: string, toEntityId: string, description: string, date: string, category: string) => {`;
const modStartIdx = code.indexOf(modStr);
const modEndIdx = code.indexOf(modEnd);

const modCode = code.substring(modStartIdx, modEndIdx);
code = code.substring(0, modStartIdx) + code.substring(modEndIdx);

const distStr = `  const distributeBusinessProfit = `;
const distStartIdx = code.indexOf(distStr);

code = code.substring(0, distStartIdx) + modCode + code.substring(distStartIdx);

fs.writeFileSync('App.tsx', code);
