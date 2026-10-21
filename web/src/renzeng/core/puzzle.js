(function(root){
'use strict';
const EMPTY=-1,BLACK=1,WHITE=0;
function puzzleLinesOk(cells,partial){
 const filled=cells.filter(v=>v!==EMPTY).length;
 if(partial){
  if(cells.filter(v=>v===BLACK).length>4||cells.filter(v=>v===WHITE).length>4)return false;
 }else if(cells.filter(v=>v===BLACK).length!==4)return false;
 let run=0,prev=null;
 for(const v of cells){
  if(v===EMPTY){run=0;prev=null;continue;}
  if(v===prev)run++;else{run=1;prev=v;}
  if(run>=3)return false;
 }
 return true;
}
function puzzleGridOf(state,spec){
 const n=spec.size,grid=spec.cells.map(row=>row.map(ch=>ch==='b'?BLACK:ch==='w'?WHITE:EMPTY));
 for(let r=0;r<n;r++)for(let c=0;c<n;c++){
  const cell=state.puzzleCells&&state.puzzleCells[r*n+c];
  if(cell!==undefined&&cell!==EMPTY)grid[r][c]=cell;
 }
 return grid;
}
function puzzleSolved(state,spec){
 const n=spec.size,grid=puzzleGridOf(state,spec);
 if(grid.some(row=>row.some(v=>v===EMPTY)))return false;
 for(let r=0;r<n;r++)if(!puzzleLinesOk(grid[r],false))return false;
 for(let c=0;c<n;c++)if(!puzzleLinesOk(grid.map(row=>row[c]),false))return false;
 const rowKeys=new Set(grid.map(r=>r.join(''))),colKeys=new Set(grid.map((_,c)=>grid.map(r=>r[c]).join('')));
 if(rowKeys.size!==n||colKeys.size!==n)return false;
 return spec.solution.every((row,r)=>row.every((v,c)=>grid[r][c]===v));
}

root.RenZengPuzzle={puzzleSpec(){return this.data.doudouPuzzle;},
 puzzleAt(row,col){const spec=this.data.doudouPuzzle;if(row<0||col<0||row>=spec.size||col>=spec.size)return null;
  const v=this.state.puzzleCells?this.state.puzzleCells[row*spec.size+col]:undefined;
  return v===EMPTY||v===undefined?undefined:v;},
 puzzleGrid(){const spec=this.data.doudouPuzzle,n=spec.size;
  const grid=spec.cells.map(row=>row.map(ch=>ch==='b'?BLACK:ch==='w'?WHITE:EMPTY));
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){const v=this.puzzleAt(r,c);if(v!==undefined)grid[r][c]=v;}
  return grid;}
 // Given stones cannot be moved, and a click cycles empty to black to white and back.,
 setPuzzleTool(tool){if(!['cycle','black','white','erase'].includes(tool))return false;this.state.puzzleTool=tool;this.changed();return true;},
 puzzleMoveSnapshot(){const n=this.puzzleSpec().size;return Array.from({length:n*n},(_,i)=>this.state.puzzleCells?.[i]??EMPTY);},
 applyPuzzleCell(row,col,value){
  const s=this.state,spec=this.puzzleSpec();if(s.puzzleSolved||!Number.isInteger(row)||!Number.isInteger(col)||row<0||col<0||row>=spec.size||col>=spec.size||![-1,0,1].includes(value)||['b','w'].includes(spec.cells[row][col]))return false;
  const next=this.puzzleMoveSnapshot(),i=row*spec.size+col;if(next[i]===value)return false;
  s.puzzleUndo.push(this.puzzleMoveSnapshot());s.puzzleUndo=s.puzzleUndo.slice(-100);s.puzzleRedo=[];next[i]=value;s.puzzleCells=next;s.puzzleMessage='';this.changed();return true;
 },
 togglePuzzle(row,col){const tool=this.state.puzzleTool,current=this.puzzleAt(row,col);return this.applyPuzzleCell(row,col,tool==='black'?BLACK:tool==='white'?WHITE:tool==='erase'?EMPTY:current===undefined?BLACK:current===BLACK?WHITE:EMPTY);},
 clearPuzzleStone(row,col){return this.applyPuzzleCell(row,col,EMPTY);},
 resetPuzzle(){const s=this.state;if(s.puzzleSolved||!this.puzzleMoveSnapshot().some(v=>v!==EMPTY))return false;s.puzzleUndo.push(this.puzzleMoveSnapshot());s.puzzleUndo=s.puzzleUndo.slice(-100);s.puzzleRedo=[];s.puzzleCells=null;s.puzzleMessage='已清空自己的落子。可以撤销这一步。';this.changed();return true;},
 undoPuzzle(){const s=this.state;if(s.puzzleSolved||!s.puzzleUndo.length)return false;s.puzzleRedo.push(this.puzzleMoveSnapshot());s.puzzleCells=s.puzzleUndo.pop();s.puzzleMessage='已撤销上一步。';this.changed();return true;},
 redoPuzzle(){const s=this.state;if(s.puzzleSolved||!s.puzzleRedo.length)return false;s.puzzleUndo.push(this.puzzleMoveSnapshot());s.puzzleCells=s.puzzleRedo.pop();s.puzzleMessage='已重做上一步。';this.changed();return true;},
 puzzleIssues(){
  const grid=this.puzzleGrid(),n=this.puzzleSpec().size,issues=[];
  const check=(line,label,cells)=>{if(line.filter(v=>v===BLACK).length>4)issues.push({message:label+'黑子超过四颗。',cells});else if(line.filter(v=>v===WHITE).length>4)issues.push({message:label+'白子超过四颗。',cells});else if(!puzzleLinesOk(line,true))issues.push({message:label+'有连续三颗同色棋子。',cells});};
  for(let r=0;r<n;r++)check(grid[r],'第 '+(r+1)+' 行',Array.from({length:n},(_,c)=>[r,c]));
  for(let c=0;c<n;c++)check(grid.map(row=>row[c]),String.fromCharCode(65+c)+' 列',Array.from({length:n},(_,r)=>[r,c]));
  for(let a=0;a<n;a++)for(let b=a+1;b<n;b++){
   if(!grid[a].includes(EMPTY)&&grid[a].join(',')===grid[b].join(','))issues.push({message:'第 '+(a+1)+'、'+(b+1)+' 行排列相同。',cells:[...grid[a].map((_,c)=>[a,c]),...grid[b].map((_,c)=>[b,c])]});
   const col=grid.map(row=>row[a]);if(!col.includes(EMPTY)&&col.join(',')===grid.map(row=>row[b]).join(','))issues.push({message:String.fromCharCode(65+a)+'、'+String.fromCharCode(65+b)+' 列排列相同。',cells:grid.flatMap((_,r)=>[[r,a],[r,b]])});
  }
  return issues;
 },
 puzzleProgress(){const spec=this.puzzleSpec(),grid=this.puzzleGrid(),total=spec.size*spec.size,seeds=spec.cells.flat().filter(c=>c==='b'||c==='w').length,filled=grid.flat().filter(c=>c!==EMPTY).length;return {filled,total,seeds,left:total-filled};
 },
 puzzleCheck(){const spec=this.data.doudouPuzzle,n=spec.size;
  const issues=this.puzzleIssues();if(issues.length)return {ok:false,complete:this.puzzleProgress().left===0,message:issues[0].message};
  if(!this.state.puzzleCells)return {ok:false,complete:false,message:'还没有落子。'};
  const grid=this.puzzleGrid();
  if(grid.some(row=>row.some(v=>v===EMPTY)))return {ok:false,complete:false,message:'还有格子空着。'};
  for(let r=0;r<n;r++){const b=grid[r].filter(v=>v===BLACK).length;
   if(b!==4)return {ok:false,complete:true,message:'第 '+(r+1)+' 行有 '+b+' 颗黑子，应该是 4 颗。'};}
  for(let c=0;c<n;c++){const col=grid.map(row=>row[c]);const b=col.filter(v=>v===BLACK).length;
   if(b!==4)return {ok:false,complete:true,message:String.fromCharCode(65+c)+' 列有 '+b+' 颗黑子，应该是 4 颗。'};}
  for(let r=0;r<n;r++)if(!puzzleLinesOk(grid[r],false))return {ok:false,complete:true,message:'第 '+(r+1)+' 行有连续三颗同色。'};
  for(let c=0;c<n;c++)if(!puzzleLinesOk(grid.map(row=>row[c]),false))return {ok:false,complete:true,message:String.fromCharCode(65+c)+' 列有连续三颗同色。'};
  if(new Set(grid.map(r=>r.join(''))).size!==n)return {ok:false,complete:true,message:'有两行的排列长得一模一样。'};
  if(new Set(grid.map((_,c)=>grid.map(r=>r[c]).join(''))).size!==n)return {ok:false,complete:true,message:'有两列的排列长得一模一样。'};
if(!puzzleSolved(this.state,spec))return {ok:false,complete:true,message:'规则都对，但这不是唯一的那个填法。'};
 if(!this.state.puzzleSolved){this.state.puzzleSolved=true;this.changed();}
 return {ok:true,complete:true,message:'对了。'};
 }
,
 derivePuzzlePassword(){
  const result=this.puzzleCheck();
  return result.ok?{ok:true,password:this.puzzleSpec().password}:result;
 }};
})(globalThis);
