'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),web=path.join(root,'web'),out=path.join(root,'artifacts');
const release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));
fs.mkdirSync(path.join(root,'验收'),{recursive:true});
const read=p=>fs.readFileSync(path.join(web,p),'utf8');
const write=(p,data)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,data);};
const config=autosave=>`globalThis.RenZengEndingConfig=${JSON.stringify({build:release.build,mode:'choice',autosave})};`;
const context={};vm.runInNewContext(read('image-assets.js'),context);
const manifest=context.RenZengImageAssets;
const files=new Set(Object.values(manifest).flatMap(v=>[v.preview,v.full]).concat(['assets/boat.svg','assets/computer/captain.svg','assets/computer/bamboo.svg','assets/computer/magazine.svg','assets/taptap/ui/blank-photo.svg','assets/taptap/ui/doudou-qr.svg','assets/taptap/ui/doudou-ad.svg']));
const mime={'.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const assets=Object.fromEntries([...files].map(p=>[p,`data:${mime[path.extname(p)]};base64,${fs.readFileSync(path.join(web,p)).toString('base64')}`]));
let html=read('index.html').replace(/20261020-rz10/g,release.build);
html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,p)=>{
 let text=p==='ending-config.js'?config(false):read(p);
 if(p==='image-assets.js')text=`globalThis.RenZengAssetMap=${JSON.stringify(assets)};`+text;
 if(p.endsWith('/boot.js'))text+='\nif(document.getElementById("rz-reader").childElementCount){document.getElementById("offline-startup")?.remove();document.body.classList.remove("offline-starting");}';
 return '<script>'+text.replace(/<\/script/gi,'<\\/script')+'</script>';
});
html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,p)=>'<style>'+read(p)+'</style>');
html=html.replace('href="assets/boat.svg"',`href="${assets['assets/boat.svg']}"`);
html=html.replace('<title>人曾在此 · 旧电脑</title>','<title>人曾在此 · 离线选择题版</title>');
html=html.replace('<body>','<body class="offline-starting">'+fs.readFileSync(path.join(__dirname,'offline-startup.html'),'utf8'));
html=html.replace('<meta charset="utf-8">',`<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">`);
for(const name of ['人曾在此-离线版.html','人曾在此-离线选择题版.html'])write(path.join(out,name),html);
for(const [target,android] of [[path.join(out,'web'),false],[path.join(root,'android/app/src/main/assets/game'),true]]){
 const absolute=path.resolve(target);
 const allowed=[path.resolve(root,'artifacts/web'),path.resolve(root,'android/app/src/main/assets/game')];
 if(!allowed.includes(absolute)||fs.existsSync(absolute)&&fs.lstatSync(absolute).isSymbolicLink())throw Error('Unsafe generated output path');
 fs.rmSync(absolute,{recursive:true,force:true});
 fs.mkdirSync(target,{recursive:true});
 fs.cpSync(web,target,{recursive:true,filter:source=>{
  const relative=path.relative(web,source).split(path.sep).join('/');
  return !relative.startsWith('assets/')||fs.statSync(source).isDirectory()||files.has(relative);
 }});
 write(path.join(target,'index.html'),read('index.html').replace(/20261020-rz10/g,release.build));
 if(android)write(path.join(target,'ending-config.js'),config(true));
 else write(path.join(target,'ending-config.js'),read('ending-config.js').replace(/20261020-rz10/g,release.build));
}
const hash=crypto.createHash('sha256').update(html).digest('hex');
console.log(`Built ${release.build}; offline ${(Buffer.byteLength(html)/1048576).toFixed(2)} MiB; SHA256 ${hash}`);
