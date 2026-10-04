import fs from 'fs';

// Run with tsx or install glob
const files = ['views/Dashboard.tsx', 'views/Transactions.tsx', 'views/OwnershipGraph.tsx', 'views/Settings.tsx', 'views/Reports.tsx', 'components/Walkthrough.tsx', 'components/Calculator.tsx', 'components/InsightCard.tsx', 'components/ValuationModal.tsx', 'components/ClientCRM.tsx'];

// I will use standard fs.readdir to be safe since I didn't install glob
const getAllFiles = function(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath)
  arrayOfFiles = arrayOfFiles || []
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
    } else {
      if(file.endsWith('.tsx')) arrayOfFiles.push(dirPath + "/" + file)
    }
  })
  return arrayOfFiles
}

const allTsxFiles = getAllFiles('.', []);

allTsxFiles.forEach(file => {
    if (file.includes('node_modules')) return;
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // remove the initial 'if (!context) return null;'
    content = content.replace(/const context = useContext\(AppContext\);\n\s*if \(\!context\) return null;/g, 'const context = useContext(AppContext)!;');
    content = content.replace(/const context = useContext\(AppContext\);\n\n\s*if \(\!context\) return null;/g, 'const context = useContext(AppContext)!;');

    // also look for standalone if (!context) return null;
    content = content.replace(/\n\s*if \(\!context\) return null;/g, '\n');

    // Make sure we have the !;
    content = content.replace(/const context = useContext\(AppContext\);/g, 'const context = useContext(AppContext)!;');
    
    // Fix useCalculator -> openCalculator just in case
    content = content.replaceAll('useCalculator(', 'openCalculator(');
    
    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});
