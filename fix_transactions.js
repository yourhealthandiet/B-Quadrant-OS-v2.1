import fs from 'fs';
let code = fs.readFileSync('views/Transactions.tsx', 'utf8');

// remove conditional from line 41 approximately
// We'll move `if (!context) return null;` to after all the initial useStates!

// remove the first `if (!context) return null;`
code = code.replace(/\n\s*if \(\!context\) return null;\n/, '\n');


const insertPosStr = `  const [payOwnersBucket, setPayOwnersBucket] = useState<string>("Uncategorized");`;

const insertPos = code.indexOf(insertPosStr) + insertPosStr.length;

code = code.substring(0, insertPos) + '\n\n  if (!context) return null;\n' + code.substring(insertPos);

fs.writeFileSync('views/Transactions.tsx', code);
