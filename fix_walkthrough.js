import fs from 'fs';
let code = fs.readFileSync('components/Walkthrough.tsx', 'utf8');

// Change const calculateTooltipPosition = () => { to function calculateTooltipPosition() {
code = code.replace(/const calculateTooltipPosition = \(\) => \{/, 'function calculateTooltipPosition() {');

fs.writeFileSync('components/Walkthrough.tsx', code);
