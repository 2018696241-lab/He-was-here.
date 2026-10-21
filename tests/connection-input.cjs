const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{
  const f=path.join(root,'artifacts/web',req.url==='/'?'index.html':req.url);
  if(!fs.existsSync(f)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream');
  res.end(fs.readFileSync(f));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
  const p=await b.newPage();let healthRoute;
  await p.addInitScript(()=>{const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>raf(time=>setTimeout(()=>callback(time),400));});
  await p.route('**/api/renzeng/health',route=>{healthRoute=route;});
  await p.goto('http://127.0.0.1:'+server.address().port);
  const click=(a,v)=>p.locator(`[data-action="${a}"]${v?`[data-value="${v}"]`:''}`).last().click();
  await click('open','help');await click('site','forum');await click('account','forum');
  await p.locator('#rz-username').fill('英雄本色');
  await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>document.activeElement.id),'rz-username');
  await p.locator('#rz-password').fill('20740705');
  assert(healthRoute);
  await healthRoute.fulfill({json:{service:'renzeng-brother-gateway',protocol:2,ready:true,capabilities:{question:true,summary:true,chat:true}}});
  await p.waitForTimeout(100);
  assert.equal(await p.locator('#rz-username').inputValue(),'英雄本色');
  assert.equal(await p.locator('#rz-password').inputValue(),'20740705');
  await p.locator('#rz-password').press('Enter');await p.locator('[data-action=open][data-value=novel7]').waitFor();
  console.log('PASS delayed navigation frame and connection response preserve input focus, login fields and successful submit');
 }finally{await b.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
