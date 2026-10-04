const fs=require('fs'),path=require('path'),ts=require('typescript');
const root=__dirname;
let tests=0,failed=0;const check=(name,valid)=>{tests++;console.log((valid?'PASS':'FAIL')+' '+name);if(!valid)failed++};
const app=fs.readFileSync(path.join(root,'App.tsx'),'utf8'), dash=fs.readFileSync(path.join(root,'views/Dashboard.tsx'),'utf8'), hub=fs.readFileSync(path.join(root,'components/DashboardLaunchpad.tsx'),'utf8'), search=fs.readFileSync(path.join(root,'components/WorkspaceSearch.tsx'),'utf8'), transaction=fs.readFileSync(path.join(root,'views/Transactions.tsx'),'utf8');
for(const file of ['App.tsx','views/Dashboard.tsx','components/DashboardLaunchpad.tsx','components/WorkspaceSearch.tsx']){
 let contents=fs.readFileSync(path.join(root,file),'utf8');let parsed=ts.transpileModule(contents,{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}});check(file+' TSX syntax',(parsed.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length===0);
}
const validRoutes=new Set([...app.matchAll(/case '([^']+)': return <RouteErrorBoundary/g)].map(m=>m[1]));
const routes=[...hub.matchAll(/route: '([^']+)'/g),...search.matchAll(/route: '([^']+)'/g)].map(x=>x[1]);
check('Dashboard/search feature shortcuts all target existing routes',routes.every(x=>validRoutes.has(x.split(':')[0])));
const tabs=new Set([...transaction.matchAll(/requestedTab === '([^']+)'/g)].map(x=>x[1]));
check('Deep-linked transaction tabs are supported',routes.filter(x=>x.includes(':')).every(x=>tabs.has(x.split(':')[1])));
check('Pending approval actions open preserved approval queue',dash.includes('id="approval-queue"') && dash.includes('target === \'approvals\''));
check('Detailed dashboard and user preference are retained',dash.includes('bquad_detailed_dashboard') && dash.includes('showDetailedDashboard &&'));
check('Existing local financial records key remains unchanged',app.includes("localStorage.getItem('gapFinancialData')")&&app.includes("localStorage.setItem('gapFinancialData'"));
check('Keyboard navigation and Escape handling are present',app.includes("event.key.toLowerCase() === 'k'")&&search.includes("e.key === 'Escape'"));
check('Navigation respects finance staff restrictions',search.includes("effectiveRole === 'finance_staff' && x.limited")&&hub.includes("restricted: financeStaff"));
check('Mobile navigation and return-to-overview exist',app.includes('Mobile quick navigation')&&app.includes("navigate('dashboard')"));
console.log(`${tests-failed}/${tests} static checks passed`);process.exit(failed?1:0);
