const test=require('node:test'),assert=require('node:assert/strict');
const data=require('../web/src/renzeng/content/story.js');require('../web/src/renzeng/content/quiz.js');
const {Investigation}=require('../web/src/renzeng/core/investigation.js');
const quiz=require('../web/src/renzeng/core/quiz-session.js');
const saves=require('../web/src/renzeng/infrastructure/save-store.js');
const make=()=>new Investigation(data,()=>{},{mode:'choice'});
function memory(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
test('1000 shuffles preserve every option, never all-A perfect, and do not mutate content',()=>{
 const before=JSON.stringify(data.quiz),seen=new Set();
 for(let i=0;i<1000;i++){
  const q=quiz.create(data.quiz);assert(quiz.valid(data.quiz,q));
  assert(data.quiz.some((item,j)=>quiz.options(data.quiz,q,j)[0].score<item.maxScore));
  seen.add(JSON.stringify(q.orders));
 }
 assert(seen.size>900);assert.equal(JSON.stringify(data.quiz),before);
 assert(quiz.valid(data.quiz,quiz.create(data.quiz,()=>0.999999)));
});
test('session order is stable and restart creates a new order',()=>{
 const g=make(),before=JSON.stringify(g.state.quiz.orders);
 for(let i=0;i<10;i++){g.start();g.openDocument('help');g.goBack();assert.equal(JSON.stringify(g.state.quiz.orders),before);}
 g.restart();assert.notEqual(JSON.stringify(g.state.quiz.orders),before);
});
test('all A cannot get 100, every displayed selection retains its score/reply',()=>{
 for(const strategy of ['A','max','zero']){
  const g=make();g.start();g.state.forumLoggedIn=true;g.state.doudouLoggedIn=true;g.state.read=['help','doudou-message',...data.essayIds];g.openConversation();
  let total=0;
  for(const q of data.quiz){
   const options=g.quizOptions(),idx=strategy==='A'?0:options.findIndex(o=>o.score===(strategy==='max'?q.maxScore:0));
   const chosen=options[idx];total+=chosen.score;assert(g.answerQuiz(idx));
   assert.deepEqual(g.state.quiz.answers.at(-1),{questionId:q.id,optionId:chosen.id,answer:chosen.text,reply:chosen.reply,score:chosen.score});
  }
  assert.equal(g.state.quiz.summary.score,total);
  if(strategy==='A')assert(total<100);else assert.equal(total,strategy==='max'?100:0);
  assert(g.finish());
 }
});
test('save round-trip preserves puzzle, notes, order and current document',()=>{
 const g=make(),storage=memory();g.start();g.openDocument('help');g.setNotes('我的笔记');g.applyPuzzleCell(0,0,1);
 const store=saves.create(g,storage);assert(store.save());
 const next=make(),reader=saves.create(next,storage);assert(reader.restore().ok);
 assert.deepEqual(next.state,g.state);assert.deepEqual(next.quizOptions(),g.quizOptions());
});
test('saving across nullable document and puzzle transitions never rejects the previous snapshot',()=>{
 const g=make(),storage=memory(),errors=[],store=saves.create(g,storage,m=>errors.push(m));
 g.onPersist=()=>store.save();g.start();g.openDocument('help');g.goSite('forum');g.applyPuzzleCell(0,0,1);g.resetPuzzle();g.undoPuzzle();
 assert.deepEqual(errors,[]);assert(!store.blocked);
 assert(saves.create(make(),storage).restore().ok);
});
test('corruption cannot be silently overwritten and a valid backup can be restored',()=>{
 const storage=memory(),g=make(),errors=[];g.start();
 const store=saves.create(g,storage,m=>errors.push(m));store.save();g.setNotes('新笔记');store.save();
 storage.setItem(saves.KEY,'{broken');
 const next=saves.create(make(),storage,m=>errors.push(m));assert.equal(next.restore().ok,false);assert(next.blocked);
 assert.equal(next.save(),false);assert.equal(storage.getItem(saves.KEY),'{broken');assert(errors.length>0);
 assert(next.recover());assert(!next.blocked);assert(next.clear());assert.equal(storage.getItem(saves.KEY),null);assert.equal(storage.getItem(saves.BACKUP),null);
});
test('invalid board, option order, score and schema are rejected',()=>{
 const g=make();g.start();
 const base={schema:1,storyId:data.id,contentVersion:data.version,state:g.state,checksum:saves.checksum(g.state)};
 for(const damage of [e=>e.schema=7,e=>e.state.quiz.orders[0][0]='bad',e=>e.state.puzzleCells=[1],e=>e.state.quiz.answers=[{score:999}],e=>e.state.settings=null,e=>e.state.route={type:'document',id:'ending',site:'diaries'}]){
  const e=structuredClone(base);damage(e);assert.throws(()=>saves.validate(g,e));
 }
});
test('storage failures are surfaced without pretending to save',()=>{
 const errors=[],store=saves.create(make(),{getItem:()=>null,setItem:()=>{throw Error('quota')},removeItem:()=>{}},m=>errors.push(m));
 assert.equal(store.save(),false);assert(store.blocked);assert.match(errors[0],/quota/);
});
test('hints and answer bypass methods no longer exist',()=>{
 const g=make();for(const key of ['skipPuzzle','puzzleHint','applyPuzzleHint'])assert.equal(g[key],undefined);
 assert.equal(g.derivePuzzlePassword().ok,false);assert.equal(g.state.puzzleHintCell,undefined);
});
