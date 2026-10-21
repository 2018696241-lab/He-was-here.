const test=require('node:test'),assert=require('node:assert/strict');
const data=require('../web/src/renzeng/content/story.js');require('../web/src/renzeng/content/quiz.js');
const {Investigation,validateContent}=require('../web/src/renzeng/core/investigation.js');
function setup(mode='choice',options={}){const g=new Investigation(data,()=>{},{mode,...options});g.start();g.openDocument('help');g.goSite('forum');return g;}
function fillPuzzle(g){for(let r=0;r<8;r++)for(let c=0;c<8;c++)g.applyPuzzleCell(r,c,data.doudouPuzzle.solution[r][c]);return g.puzzleCheck();}
function recover(g,term,id){g.goSite('forum');g.search(term);assert.equal(g.openSearchResult(id),true);}
function progress(g){
 for(const [term,id] of [['独生子女','novel2'],['克罗恩病','novel3'],['京北日报','newspaper'],['忠义堂','clinic-rumor'],['慧根二期','building'],['仙枝怀慈菩萨','novel4'],['净濯','novel5'],['英雄本色','profile']])recover(g,term,id);
 assert(g.loginAccount('forum','英雄本色','20740705').ok);assert(g.loginAccount('ritual','英雄本色','20740705').ok);
 assert(g.openDocument('doudou-message'));assert(g.goSite('diaries'));assert(fillPuzzle(g).ok);assert(g.loginDoudouWithPassword('41525188').ok);
 for(const d of data.documents){if(['ending','bonus'].includes(d.id))continue;if(d.id==='doctors'){for(let p=1;p<=3;p++)g.catalog('staff',p);}else if(g.discoverable(d))g.openDocument(d.id);}
 assert(g.endingReady);assert.equal(g.keyProgress.collected,g.keyProgress.total);return g;
}
test('content references, imported replies, no hospital/deleted dependencies',()=>{
 assert.deepEqual(validateContent(data),[]);assert.equal(data.documents.length,35);assert(!data.sites.some(s=>s.id==='hospital'));
 for(const d of data.documents){assert.notEqual(d.siteId,'hospital');for(const r of d.replies||[])assert(r.text.trim(),d.id+' empty reply');}
 assert.equal(data.documents.find(d=>d.id==='help').replies.length,8);assert.equal(data.quiz.length,7);
 for(const q of data.quiz){assert.equal(q.options.length,6);assert.equal(Math.max(...q.options.map(o=>o.score)),q.maxScore);}
 assert.equal(data.quiz.reduce((n,q)=>n+q.maxScore,0),100);
});
test('main 2/3/4/5 use restoration; seventh remains private',()=>{
 const g=setup();for(const id of ['novel1','novel6'])assert(g.discoverable(g.documents.get(id)));
 for(const id of ['novel2','novel3','novel4','novel5','novel7'])assert.equal(g.openDocument(id),false);
 assert.deepEqual(data.documents.filter(d=>d.kind==='novel'&&d.searchLocked).map(d=>d.id),['novel2','novel3','novel4','novel5']);
});
test('query does not restore; only clicking a matching search result does',()=>{
 const g=setup(),events=[];g.onEvent=e=>events.push(e.type);g.search('独生子女');assert(g.searchResults('独生子女').ids.includes('novel2'));
 assert(!g.state.restored.includes('novel2'));assert(!g.state.read.includes('novel2'));assert.equal(g.openDocument('novel2'),false);
 assert.equal(g.openSearchResult('novel3'),false);assert(g.openSearchResult('novel2'));assert(events.includes('restored'));assert(g.state.restored.includes('novel2'));
 g.goSite('forum');assert(g.openDocument('novel2'));assert.equal(events.filter(x=>x==='restored').length,1);
});
test('search aliases normalize width and spacing, exact gated matching',()=>{
 const g=setup();assert(g.searchResults(' 克 罗 恩 病 ').ids.includes('novel3'));
 for(const q of ['仙枝怀慈菩萨','仙枝怀慈净血菩萨','仙枝菩萨','净血菩萨'])assert(g.searchResults(q).ids.includes('novel4'));
 assert(!g.searchResults('英雄本色').ids.includes('novel2'));assert(g.searchResults('英雄本色账户信息').ids.includes('profile'));
});
test('separate logins, error classes, private content never searchable',()=>{
 const g=setup();assert.equal(g.loginAccount('forum','不存在','20740705').message,'帐号不存在');
 assert.equal(g.loginAccount('forum','京城老饕','20740705').message,'密码错误');assert.equal(g.loginAccount('forum','英雄本色','bad').message,'密码错误');
 assert(g.loginAccount('forum','英雄本色','20740705').ok);assert.equal(g.state.patientLoggedIn,false);assert(g.openDocument('novel7'));assert.equal(g.openDocument('patient'),false);
 recover(g,'忠义堂','clinic-rumor');recover(g,'仙枝菩萨','novel4');assert(g.goSite('ritual'));assert(g.openDocument('clinic-page'));assert.equal(g.openDocument('novel5'),false);
 assert(g.loginAccount('ritual','英雄本色','20740705').ok);assert(g.openDocument('patient'));assert(!g.openDocument('novel5'));recover(g,'净濯','novel5');
 for(const q of ['刘江海','镜子','江海总有尽时','小船长'])assert(!g.searchResults(q).ids.some(id=>['novel5','novel7','patient','essay1'].includes(id)));
});
test('history does not manufacture access and is cleared on restart',()=>{
 const g=setup();recover(g,'独生子女','novel2');const view=g.snapshot();g.restart();assert.equal(g.restoreView(view),false);
 assert.equal(g.state.visited.length,1);assert.deepEqual(g.state.restored,[]);assert.equal(g.visitHistory(99),false);
});
test('puzzle counts seeds, protects them and derives the same password',()=>{
 const g=setup();assert.deepEqual(g.puzzleProgress(),{filled:22,total:64,seeds:22,left:42});assert.equal(g.togglePuzzle(0,2),false);
 g.togglePuzzle(0,0);assert.equal(g.puzzleProgress().filled,23);g.clearPuzzleStone(0,0);assert.equal(g.puzzleProgress().filled,22);
 assert.equal(g.puzzleHint,undefined);assert.equal(g.puzzleCheck().ok,false);
 g.loginAccount('forum','英雄本色','20740705');g.openDocument('doudou-message');g.goSite('diaries');
 assert(fillPuzzle(g).ok);assert.equal(g.puzzleProgress().filled,64);assert(g.puzzleGrid().every(row=>row.filter(v=>v===1).length===4));
 assert.equal(g.derivePuzzlePassword().password,'41525188');assert(!g.loginDoudouWithPassword('00000000').ok);assert(g.loginDoudouWithPassword('41525188').ok);
 assert.equal(g.togglePuzzle(0,0),false);assert.equal(g.puzzleGrid()[0][0],1);
});
test('offline 100 and zero score both finish; bonus is attainable',()=>{
 for(const high of [true,false]){
  const g=progress(setup());assert(g.beginEnding());assert.equal(g.finish(),false);
  for(const q of data.quiz){const idx=g.quizOptions().findIndex(o=>o.score===(high?q.maxScore:0));assert(g.answerQuiz(idx));}
  assert.equal(g.state.quiz.summary.score,high?100:0);assert.equal(g.answerQuiz(0),false);assert(g.finish());assert(g.openBonus());
 }
});
test('AI seven answers, summary, ten chats, invalid answer and completion',async()=>{
 let n=0;const g=progress(setup('gateway',{aiEnabled:true,check:async()=>({ready:true,status:'ready'}),judge:async()=>({reply:'记得。',answered:++n}),summary:async context=>{assert(context.keys.length>0);return {score:100,reply:'听见了。',items:Array.from({length:7},(_,i)=>({questionId:i+1,score:1,evidence:'在',feedback:'好'}))};},chat:async()=>({reply:'嗯。'})}));
 g.beginEnding();assert.equal(await g.answerEnding(''),false);assert.equal(await g.answerEnding('字'.repeat(501)),false);
 for(let i=0;i<7;i++)assert(await g.answerEnding('我在。'));assert.equal(g.finish(),false);assert(await g.summarizeEnding());assert(g.startChat());
 for(let i=0;i<10;i++)assert(await g.sendChat('再说一句。'));assert.equal(await g.sendChat('十一句。'),false);assert(g.finish());
 assert(g.resumeConversation());assert.equal(g.state.conversation.messages.length,20);assert.equal(await g.sendChat('不能靠返回重置次数'),false);
});
test('failure keeps draft, expired session can restart, local fallback completes',async()=>{
 const g=progress(setup('gateway',{aiEnabled:true,judge:async()=>{throw Object.assign(Error(),{code:'session_expired'});}}));g.beginEnding();assert.equal(await g.answerEnding('保留这句话'),false);assert.equal(g.state.conversation.draft,'保留这句话');assert(g.state.conversation.sessionExpired);assert(g.restartConversation());assert(g.useLocalEnding());assert(g.finish());
});
test('restart during a pending AI call cannot mutate the new game',async()=>{
 let resolve;const g=progress(setup('gateway',{aiEnabled:true,judge:()=>new Promise(r=>resolve=r)}));g.beginEnding();const pending=g.answerEnding('在');g.restart();resolve({reply:'嗯',answered:1});assert.equal(await pending,false);assert.equal(g.state.conversation.answers.length,0);
});
test('reading ending and bonus can resume the same AI session and draft',async()=>{
 let n=0;const g=progress(setup('gateway',{aiEnabled:true,judge:async()=>({reply:'记得',answered:++n})}));
 g.beginEnding();assert(await g.answerEnding('第一句'));g.setConversationDraft('还没发送');
 assert(g.useLocalEnding());assert(g.finish());assert(g.openBonus());assert(g.resumeConversation());
 assert.equal(g.state.route.type,'conversation');assert.equal(g.state.conversation.localOnly,false);
 assert.equal(g.state.conversation.answers.length,1);assert.equal(g.state.conversation.draft,'还没发送');
 assert(await g.answerEnding('第二句'));assert.equal(g.state.conversation.answers.length,2);
 assert.equal(setup('choice').resumeConversation(),false);
});
test('service sends summary context and reuses request id after uncertainty',async()=>{
 const {createService}=require('../web/src/renzeng/infrastructure/ending-service.js'),calls=[];let fail=true;
 const old=global.fetch;global.fetch=async(url,options)=>{const p=options.body?JSON.parse(options.body):null;calls.push({url,p});if(url.endsWith('/health'))return {ok:true,json:async()=>({service:'renzeng-brother-gateway',protocol:2,ready:true,capabilities:{question:true,summary:true,chat:true}})};if(url.endsWith('/sessions'))return {ok:true,json:async()=>({sessionId:'test'})};if(fail){fail=false;throw Error('timeout');}return {ok:true,json:async()=>({reply:'ok'})};};
 try{const s=createService({mode:'gateway',endpoint:'http://test/api',healthEndpoint:'http://test/health'});await s.check();const context={keys:['donor']};await assert.rejects(s.summary(context));await s.check();await s.summary(context);const submissions=calls.filter(c=>c.url.endsWith('/summary'));assert.deepEqual(submissions[0].p.context,context);assert.equal(submissions[0].p.requestId,submissions[1].p.requestId);}finally{global.fetch=old;}
});

test('puzzle tools, undo/redo, rule issues and justified hint preserve seeds',()=>{
 const g=setup();g.loginAccount('forum','英雄本色','20740705');g.openDocument('doudou-message');g.goSite('diaries');
 assert.equal(g.puzzleProgress().filled,22);g.setPuzzleTool('black');g.togglePuzzle(0,0);assert.equal(g.puzzleGrid()[0][0],1);
 assert(g.undoPuzzle());assert.equal(g.puzzleProgress().filled,22);assert(g.redoPuzzle());assert.equal(g.puzzleProgress().filled,23);
 g.setPuzzleTool('white');g.togglePuzzle(0,0);assert.equal(g.puzzleGrid()[0][0],0);g.resetPuzzle();assert.equal(g.puzzleProgress().filled,22);g.undoPuzzle();assert.equal(g.puzzleGrid()[0][0],0);
 g.resetPuzzle();assert.equal(g.applyPuzzleHint,undefined);
 g.applyPuzzleCell(0,0,1);g.applyPuzzleCell(0,1,1);assert(g.puzzleIssues().length);assert.match(g.puzzleCheck().message,/三|连续/);
 assert.equal(g.applyPuzzleCell(0,2,0),false);assert.equal(g.puzzleGrid()[0][2],1);
 fillPuzzle(g);assert.equal(g.puzzleProgress().filled,64);fillPuzzle(g);assert.equal(g.puzzleProgress().filled,64);assert.equal(g.undoPuzzle(),false);
});

test('named source sections, draft privacy and related deity searches',()=>{
 const g=setup(),four=g.documents.get('novel4'),five=g.documents.get('novel5'),six=g.documents.get('novel6'),seven=g.documents.get('novel7');
 assert.equal(four.title,'野神淫祀');assert.equal(four.date,'2003-02-19 02:53');assert.match(four.paragraphs[0][0],/那些外门邪道/);assert(!/加形象描写|【回帖|这里破案/.test(JSON.stringify(four.paragraphs)));assert.match(five.paragraphs[0][0],/一闭上眼/);assert.match(six.paragraphs.flat().join(''),/交换完成/);assert.equal(seven.presentation,'draft');assert.deepEqual(seven.replies,[]);assert.equal(seven.replyCount,0);
 for(const q of ['仙枝怀慈菩萨立绘','关于仙枝怀慈菩萨的画像','仙枝怀慈净血菩萨']){g.search(q);assert(g.searchResults(q).ids.includes('novel4'));assert(!g.state.restored.includes('novel4'));}
 assert(g.openSearchResult('novel4'));assert(!g.discoverable(g.documents.get('novel2')));assert(!g.discoverable(g.documents.get('novel3')));assert.equal(g.publicForumDocuments().filter(x=>x.id==='novel4').length,1);
});

test('rz9 fifth requires fourth and matching result; website history deduplicates',()=>{const g=setup();assert.deepEqual(g.searchResults('忠义堂').ids,['clinic-rumor']);assert(!g.searchResults('净濯').ids.includes('novel5'));recover(g,'仙枝怀慈菩萨立绘','novel4');g.search('净濯大药相关资料');assert(g.searchResults('净濯大药相关资料').ids.includes('novel5'));assert(!g.openDocument('novel5'));assert(g.openSearchResult('novel5'));g.goSite('forum');assert.deepEqual(g.state.visited.map(v=>v.site),['link','forum']);assert(g.loginAccount('forum','英雄本色','20740705').ok);assert(g.openDocument('doudou-message'));assert(g.goSite('diaries'));assert(!g.loginDoudouWithPassword('41525188','陌生人').ok);assert(g.loginDoudouWithPassword('41525188','小船长').ok);assert(!g.state.puzzleSolved);assert.deepEqual(g.state.visited.map(v=>v.site),['link','forum','diaries']);});
