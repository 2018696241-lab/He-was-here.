const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'验收');fs.mkdirSync(out,{recursive:true});
const steps=[
 ['build',['tools/build.cjs']],
 ['unit',['--test',...fs.readdirSync(path.join(root,'tests')).filter(n=>n.endsWith('.test.cjs')).map(n=>'tests/'+n)]],
 ...['browser','responsive','mobile-start','release-browser','forum-pagination-browser','connection-input'].map(n=>[n,['tests/'+n+'.cjs']])
];
const report={build:JSON.parse(fs.readFileSync(path.join(root,'release.json'))).build,suites:[]};
for(const [name,args] of steps){
 const start=Date.now(),result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',env:process.env});
 fs.writeFileSync(path.join(out,name+'.log'),(result.stdout||'')+(result.stderr||''));
 report.suites.push({name,exitCode:result.status,durationMs:Date.now()-start});
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));
 console.log(`${name}: ${result.status===0?'PASS':'FAIL'}`);
 if(result.status!==0){console.error(result.stdout,result.stderr);process.exit(1);}
}
