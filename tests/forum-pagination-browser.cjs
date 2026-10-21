const {chromium}=require('playwright');
const {pathToFileURL}=require('url'),path=require('path'),assert=require('assert/strict'),fs=require('fs');
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
const p=await b.newPage({viewport:{width:390,height:844}}),errors=[],requests=[];
p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
await p.goto(pathToFileURL(path.resolve(__dirname,'../artifacts/人曾在此-离线选择题版.html')).href);
const click=async(a,v)=>p.locator(`[data-action="${a}"]${v===undefined?'':`[data-value="${v}"]`}`).last().click();
const toast=p.locator('#rz-message');
await click('open','help');await click('site','forum');
const lockedPageToasts=[];
for(const section of ['rumor','beijing','ghost']){
  await click('section',section);
  assert.equal(await p.locator('.forum-pagination [aria-current=page]').innerText(),'1');
  const rows=p.locator('.post-table tbody tr');assert.equal(await rows.count(),10);
  // 剧情帖仍然可以正常打开，返回后仍在第 1 页。
  await p.locator('.post-table [data-action=open]').first().click();
  await p.locator('.post-title').waitFor();
  await click('directory');
  assert.equal(await p.locator('.forum-pagination [aria-current=page]').innerText(),'1');
  // 第 1 页残影：只闪过“数据已丢失”浮层，不进入整页。
  await p.locator('.post-table [data-action=lost-toast]').first().click();
  await toast.waitFor({state:'visible'});
  assert.equal(await toast.innerText(),'相关数据已经完全丢失');
  assert.equal(await p.locator('.lost-post').count(),0);
  assert.equal(await p.locator('.forum-pagination [aria-current=page]').innerText(),'1');
  await toast.waitFor({state:'hidden',timeout:5000});
  // 分页数字 2–5：点不过去，只闪过同样提示。
  for(const n of [2,3,4,5]){
    await p.locator(`.forum-pagination [data-action=lost-toast][data-value="${n}"]`).click();
    await toast.waitFor({state:'visible'});
    assert.equal(await p.locator('.forum-pagination [aria-current=page]').innerText(),'1');
    lockedPageToasts.push(await toast.innerText());
    await toast.waitFor({state:'hidden',timeout:5000});
  }
  assert.equal(await p.locator('.forum-pagination button').count(),5);
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
}
// 站务公告：只有原有剧情帖，无残影、无分页。
await click('section','notice');
assert.equal(await p.locator('.forum-pagination').count(),0);
assert.equal(await p.locator('.post-table tbody tr:not(.empty-row)').count(),3);
assert.equal(await p.locator('.post-table [data-action=lost-toast]').count(),0);
assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await p.screenshot({path:path.resolve(__dirname,'../验收/完整文案B-手机分页.png'),fullPage:true});
assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
assert.equal(lockedPageToasts.length,12);assert(lockedPageToasts.every(t=>t==='相关数据已经完全丢失'));
fs.writeFileSync(path.resolve(__dirname,'../验收/分页浏览器验收.json'),JSON.stringify({storyBoards:3,page1Rows:10,storyPostsOpen:true,page1FragmentsToast:true,lockedPages:'2-5',lockedPageToasts:lockedPageToasts.length,noticeRows:3,noticePagination:false,mobileFit:true,pageErrors:errors,httpRequests:requests},null,2));
console.log('PASS 3 boards page 1, fragment toasts, locked pages 2-5, notice clean, mobile fit, zero HTTP');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
