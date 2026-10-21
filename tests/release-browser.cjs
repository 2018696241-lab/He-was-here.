const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),assetRoot=path.join(root,'android/app/src/main/assets/game');
async function run(){
 const server=http.createServer((req,res)=>{
  const f=path.join(assetRoot,decodeURIComponent(req.url.split('?')[0])==='/'?'index.html':decodeURIComponent(req.url.split('?')[0]));
  if(!f.startsWith(assetRoot+path.sep)||!fs.existsSync(f)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.svg')?'image/svg+xml':'application/octet-stream');
  res.end(fs.readFileSync(f));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH}),base='http://127.0.0.1:'+server.address().port;
 const errors=[],external=[],report={};
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:'))external.push(r.url());});
  const action=(a,v)=>p.locator(`[data-action="${a}"]${v===undefined?'':`[data-value="${v}"]`}`).last();
  const click=(a,v)=>action(a,v).click();
  await p.goto(base);await click('open','help');await click('site','forum');await click('account','forum');
  await p.locator('#rz-username').fill('英雄本色');await p.locator('#rz-password').fill('20740705');await p.locator('#rz-password').press('Enter');
  await click('open','doudou-message');await click('site','diaries');await click('recovery-open');
  assert.equal(await action('grid-skip').count(),0);assert.equal(await action('grid-hint').count(),0);
  await click('grid-tool','black');await p.locator('[data-row="0"][data-col="0"]').click();
  await p.reload();assert.match(await p.locator('.grid-progress').innerText(),/23 \/ 64/);assert.equal(await p.locator('#save-problem').count(),0);
  report.puzzleResume=true;
  for(const [width,height,font] of [[360,800,18],[390,844,22],[412,915,22],[844,390,22],[768,1024,22]]){
   await p.setViewportSize({width,height});
   await click('menu');await click('settings');await p.locator('#rz-font').selectOption(String(font));await click('close');
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const cells=await p.locator('.grid-cell').evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height};}));
   assert(cells.every(c=>c.left>=0&&c.right<=width+1&&c.width>=24&&c.height>=24));
   await p.screenshot({path:path.join(root,`验收/final-棋盘-${width}-${height}.png`),fullPage:true});
  }
  report.puzzleLayouts=[360,390,412,768,844];await p.setViewportSize({width:390,height:844});
  // Native back closes the recovery sheet, then ordinary game history.
  assert.equal(await p.evaluate(()=>RenZengPlatform.back()),true);await p.locator('#rz-doudou-username').waitFor();
  await p.locator('#rz-doudou-username').fill('小船长');await p.locator('#rz-doudou-password').fill('41525188');await p.locator('#rz-doudou-password').press('Enter');
  for(let i=1;i<=5;i++){await click('open','essay'+i);if(i<5)await click('directory');}
  await click('finish');
  const options=await p.locator('[data-action=quiz-answer]').allTextContents();
  await p.reload();assert.deepEqual(await p.locator('[data-action=quiz-answer]').allTextContents(),options);
  await click('quiz-answer','2');const nextOptions=await p.locator('[data-action=quiz-answer]').allTextContents();
  await p.reload();assert.deepEqual(await p.locator('[data-action=quiz-answer]').allTextContents(),nextOptions);assert.match(await p.locator('.quiz').innerText(),/第 2 \/ 7 问/);
  report.quizResume=true;
  await click('menu');await click('settings');assert.equal(await p.evaluate(()=>RenZengPlatform.back()),true);assert.equal(await p.locator('#rz-modal').evaluate(n=>n.open),false);
  await click('menu');await click('clue-room');assert.equal(await p.evaluate(()=>RenZengPlatform.back()),true);await p.locator('.quiz').waitFor();
  report.backOverlays=true;
  const validSave=await p.evaluate(()=>localStorage.getItem(RenZengSave.KEY));
  await p.evaluate(()=>localStorage.setItem(RenZengSave.KEY,'broken-json'));
  await p.reload();await p.locator('#save-problem').waitFor();assert.equal(await p.evaluate(()=>localStorage.getItem(RenZengSave.KEY)),'broken-json');
  await p.getByRole('button',{name:'恢复上次备份',exact:true}).click();await p.waitForLoadState('load');await p.locator('.quiz').waitFor();assert.equal(await p.locator('#save-problem').count(),0);
  report.corruptionRecovery=true;
  // A clean process/context retains the same durable record, with no live JS state.
  const state=await context.storageState();await context.close();
  const next=await browser.newContext({storageState:state,viewport:{width:390,height:844}}),page=await next.newPage();
  page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.locator('.quiz').waitFor();
  assert.equal(await page.locator('#save-problem').count(),0);report.coldContextResume=true;
  await page.locator('[data-action=menu]').click();await page.locator('[data-action=restart]').click();await page.locator('[data-action=confirm-restart]').click();
  await page.reload();await page.locator('[data-action=open][data-value=help]').waitFor();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem(RenZengSave.KEY)).state);
  assert.deepEqual(saved.quiz.answers,[]);assert.deepEqual(saved.read,[]);report.restartClearsProgress=true;
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);report.pageErrors=errors;report.externalRequests=external;
  await next.close();fs.writeFileSync(path.join(root,'验收/release-browser.json'),JSON.stringify(report,null,2));console.log(report);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}
run().catch(e=>{console.error(e);process.exitCode=1});
