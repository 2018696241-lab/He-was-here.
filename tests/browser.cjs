const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{pathToFileURL}=require('url');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'验收');
async function run(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});let server;
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>{errors.push(e.message);console.log(e.stack)});page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  const action=(a,v)=>page.locator('[data-action="'+a+'"]'+(v!==undefined?'[data-value="'+v+'"]':''));
  const click=async(a,v)=>{await action(a,v).first().click();await page.waitForTimeout(40);};
  const shot=async name=>page.screenshot({path:path.join(out,name+'.png'),fullPage:false});
  await context.setOffline(true);await page.goto(pathToFileURL(path.join(root,'artifacts','人曾在此-离线选择题版.html')).href);await page.waitForLoadState('load');
  await shot('01-LINK-桌面');await click('open','help');await shot('02-求助帖');await page.locator('.social-article').evaluate(n=>n.scrollTop=200);assert((await page.locator('.social-article').evaluate(n=>n.scrollTop))>0);await click('site','forum');
  await click('section','ghost');assert(await action('missing','novel2').count());await click('missing','novel2');assert.match(await page.locator('#rz-message').innerText(),/部分数据暂时缺失/);await shot('03-论坛占位');
  await click('open','novel6');assert.match(await page.locator('#rz-reader').innerText(),/噩梦/);await click('directory');
  await click('open','novel1');await click('directory');
  async function search(term,id){await page.locator('#rz-search').fill(term);await page.locator('#rz-search').press('Enter');await page.waitForTimeout(30);await click('search-open',id);}
  await search('独生子女','novel2');assert.match(await page.locator('#rz-message').innerText(),/回忆逐渐涌现/);await click('directory');
  await search('克罗恩病','novel3');await search('京北日报','newspaper');await search('忠义堂','clinic-rumor');await search('慧根二期','building');await shot('04-楼盘与菩萨');
  await search('英雄本色账户信息','profile');assert.match(await page.locator('#rz-reader').innerText(),/用户页面报错/);
  await search('盘点','ranking');
  await search('仙枝怀慈菩萨','novel4');await search('净濯大药','novel5');await search('忠义堂','clinic-rumor');await click('site','ritual');await click('open','clinic-page');await shot('05-新药品页');await click('zoom','clinic-page');await page.locator('.source-zoom').evaluate(i=>i.decode());assert(await page.locator('#rz-modal').evaluate(n=>n.open));await page.keyboard.press('Escape');assert(!(await page.locator('#rz-modal').evaluate(n=>n.open)));
  await click('account','ritual');await page.locator('#rz-username').fill('不存在');await page.locator('#rz-password').fill('bad');await page.locator('#rz-account-form').getByRole('button',{name:'登录',exact:true}).click();assert.match(await page.locator('#rz-message').innerText(),/帐号不存在/);
  await page.locator('#rz-username').fill('京城老饕');await page.locator('#rz-account-form').getByRole('button',{name:'登录',exact:true}).click();assert.match(await page.locator('#rz-message').innerText(),/密码错误/);
  await page.locator('#rz-username').fill('英雄本色');await page.locator('#rz-password').fill('20740705');await page.locator('#rz-account-form').getByRole('button',{name:'登录',exact:true}).click();await shot('06-患者账户');
  await click('open','patient');assert.equal(await action('open','novel5').count(),0);await click('account','ritual');await click('site','forum');
  await click('account','forum');assert(await page.locator('#rz-username').isVisible());await page.locator('#rz-username').fill('英雄本色');await page.locator('#rz-password').fill('20740705');await page.locator('#rz-account-form').getByRole('button',{name:'登录',exact:true}).click();await shot('07-账号草稿箱');
  await click('open','novel7');assert.equal(await action('site','diaries').count(),0);await click('account','forum');await click('open','doudou-message');await click('site','diaries');assert(await page.locator('#rz-doudou-username').isVisible());await click('recovery-open');await shot('08-棋盘-桌面');assert.match(await page.locator('.grid-progress').innerText(),/22 \/ 64.*42/);
  await click('grid-tool','white');await page.locator('[data-row="0"][data-col="0"]').click();assert(await page.locator('[data-row="0"][data-col="0"]').evaluate(n=>n.classList.contains('white')));await click('grid-undo');await click('grid-redo');await page.locator('[data-row="0"][data-col="0"]').focus();await page.keyboard.press('Delete');await page.keyboard.press('Control+z');assert(await page.locator('[data-row="0"][data-col="0"]').evaluate(n=>n.classList.contains('white')));await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.dataset.col),'1');await click('grid-reset');await click('close');assert.match(await page.locator('.grid-progress').innerText(),/23 \/ 64/);await click('grid-reset');await click('confirm-grid-reset');await click('grid-tool','cycle');
  assert.equal(await action('grid-hint').count(),0);assert.equal(await action('grid-skip').count(),0);
  await page.locator('[data-row="0"][data-col="0"]').click();assert.match(await page.locator('.grid-progress').innerText(),/23 \/ 64/);await click('grid-reset');await click('confirm-grid-reset');assert.match(await page.locator('.grid-progress').innerText(),/22 \/ 64/);
  await page.setViewportSize({width:390,height:844});await shot('09-棋盘-手机');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
 const cell=page.locator('[data-row="'+r+'"][data-col="'+c+'"]');
 if(await cell.isDisabled())continue;
 const value=await page.evaluate(([r,c])=>RenZengData.doudouPuzzle.solution[r][c],[r,c]);
 await click('grid-tool',value?'black':'white');await cell.click();
}await click('grid-check');assert.match(await page.locator('.grid-progress').innerText(),/64 \/ 64.*0/);assert.deepEqual(await page.locator('.grid-row-count').allTextContents(),Array(8).fill('4'));
  await click('grid-answer');assert.match(await page.locator('.recovered-password').innerText(),/41525188/);await click('recovery-close');await page.locator('#rz-doudou-username').fill('小船长');await page.locator('#rz-doudou-password').fill('00000000');await page.locator('#rz-doudou-password').press('Enter');assert.match(await page.locator('.login-message').innerText(),/密码错误/);
  await page.locator('#rz-doudou-password').fill('41525188');await page.locator('#rz-doudou-password').press('Enter');
  for(let i=1;i<=5;i++){await click('open','essay'+i);if(i<5)await click('directory');}
  await click('finish');await shot('10-离线问答-手机');for(let i=0;i<7;i++){
 const correct=await page.evaluate(i=>RenZengData.quiz[i].options.find(o=>o.score===RenZengData.quiz[i].maxScore).text,i);
 await page.locator('[data-action=quiz-answer]').filter({hasText:correct}).click();
}assert.match(await page.locator('.quiz').innerText(),/100 \/ 100/);
  await click('read-ending');assert(await action('bonus').isVisible());await click('bonus');await shot('11-番外-手机');
  assert.equal(requests.length,0,'offline must not make any HTTP requests');assert.deepEqual(errors,[]);
  const broken=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>i.getClientRects().length&&(!i.complete||!i.naturalWidth)).map(i=>i.alt));assert.deepEqual(broken,[]);
  await page.locator('.sites-menu summary').click();assert(!(await page.locator('#computer-sites').innerText()).includes('医院'));await page.locator('.sites-menu summary').click();
  await click('menu');await click('restart');await click('confirm-restart');assert(await action('open','help').isVisible());
  console.log('OFFLINE: full UI walkthrough, 100 score, bonus, restart, zero HTTP, no page errors');
  await context.close();

  // Website mode through the actual adapter, with deterministic network failure and success.
  server=http.createServer((req,res)=>{const pathname=decodeURIComponent(req.url.split('?')[0]);const f=path.join(root,'web',pathname==='/'?'index.html':pathname);if(!f.startsWith(path.join(root,'web'))||!fs.existsSync(f)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript; charset=utf-8':f.endsWith('.css')?'text/css; charset=utf-8':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.svg')?'image/svg+xml':'application/octet-stream');res.end(fs.readFileSync(f));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const online=await browser.newContext({viewport:{width:1440,height:1000}}),p=await online.newPage();let count=0,chat=0,summaryContext;
  p.on('pageerror',e=>errors.push(e.message));
  await online.route('**/api/renzeng/**',async route=>{const endpoint=new URL(route.request().url()).pathname.split('/').pop(),payload=route.request().postDataJSON();let body;
   if(endpoint==='health')body={service:'renzeng-brother-gateway',protocol:2,ready:true,capabilities:{question:true,summary:true,chat:true}};
   else if(endpoint==='sessions')body={sessionId:'mock-session'};
   else if(endpoint==='answer')body={reply:'记得。',answered:++count};
   else if(endpoint==='summary'){summaryContext=payload.context;body={score:70,reply:'听到了。',items:Array.from({length:7},(_,i)=>({questionId:i+1,score:10,evidence:'我在',feedback:'听到了'}))};}
   else body={reply:'嗯，我听着。',chatRemaining:10-++chat};await route.fulfill({json:body});
  });
  const base='http://127.0.0.1:'+server.address().port;await p.goto(base);await p.locator('[data-action=open][data-value=help]').click();await p.locator('[data-action=site][data-value=forum]').last().click();
  // Existing UI permission path; no injection of game state.
  await p.locator('[data-action=account][data-value=forum]').click();await p.locator('#rz-username').fill('英雄本色');await p.locator('#rz-password').fill('20740705');await p.locator('#rz-password').press('Enter');await p.locator('[data-action=open][data-value=doudou-message]').click();await p.locator('[data-action=site][data-value=diaries]').click();
  await p.locator('#rz-doudou-username').fill('小船长');await p.locator('#rz-doudou-password').fill('41525188');await p.locator('#rz-doudou-password').press('Enter');
  for(let i=1;i<=5;i++){await p.locator('[data-action=open][data-value=essay'+i+']').first().click();if(i<5)await p.locator('[data-action=directory]').click();}await p.locator('[data-action=finish]').click();
  await p.locator('#rz-ending-answer').fill('未发送的回答');
  await p.locator('[data-action=local-ending]').click();await p.locator('[data-action=read-ending]').click();
  await p.locator('[data-action=resume-conversation]').first().click();
  assert.equal(await p.locator('#rz-ending-answer').inputValue(),'未发送的回答');
  assert(await p.locator('#rz-ending-answer').isEnabled());
  for(let i=0;i<7;i++){await p.locator('#rz-ending-answer').fill('我在');await p.locator('#rz-ending-form button').click();try{await p.waitForFunction(n=>document.querySelectorAll('.conversation-bubble.zhou').length===n,i+1);}catch(e){console.error('AI failure',i,await p.locator('#rz-reader').innerText(),errors);throw e;}}
  await p.locator('[data-action=summarize]').click();await p.locator('[data-action=chat]').waitFor();assert(summaryContext&&summaryContext.read.includes('essay5'));await p.locator('[data-action=chat]').click();await p.locator('#rz-chat-answer').fill('可以陪我折船吗');await p.locator('#rz-chat-form button').click();await p.waitForFunction(()=>document.querySelectorAll('.conversation-bubble.zhou').length===8);
  await p.screenshot({path:path.join(out,'12-AI对话-桌面.png')});await p.locator('[data-action=read-ending]').click();assert.match(await p.locator('#rz-reader').innerText(),/我找到了你/);assert.deepEqual(errors,[]);
  await p.locator('[data-action=resume-conversation]').first().click();
  assert.equal(await p.locator('.conversation-bubble.zhou').count(),8);
  assert(await p.locator('#rz-chat-answer').isEnabled());
  await p.locator('#rz-chat-answer').fill('回来继续聊');
  await p.locator('[data-action=local-ending]').click();await p.locator('[data-action=read-ending]').click();
  await p.setViewportSize({width:390,height:844});await p.locator('[data-action=resume-conversation]').first().click();
  assert.equal(await p.locator('#rz-chat-answer').inputValue(),'回来继续聊');
  await p.locator('#rz-chat-form button').click();await p.waitForFunction(()=>document.querySelectorAll('.conversation-bubble.zhou').length===9);
  assert.equal(count,7);assert.equal(chat,2);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.screenshot({path:path.join(out,'13-AI结局返回-手机.png')});assert.deepEqual(errors,[]);
  console.log('ONLINE: ending return preserves draft/session, fallback resumes chat, UI seven answers, summary carries context, chat, ending, no page errors');await online.close();
 }finally{if(server)await new Promise(r=>server.close(r));await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
