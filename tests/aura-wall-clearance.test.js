const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(require.resolve('../game.js'),'utf8');
const Scene=vm.runInNewContext(`(class {${src.slice(src.indexOf('    findWardScale('),src.indexOf('    createWardMask('))}})`,{TILE:16});
const s=new Scene();s.walls={getChildren:()=>[]};s.hasFloor=()=>true;
assert.equal(s.findWardScale(100,100),1);
s.hasFloor=(x,y)=>x<7&&y<7;
const edge=s.findWardScale(108,100);assert(edge>0&&edge<1);assert(108+20*edge<=112);
s.hasFloor=()=>true;
s.walls={getChildren:()=>[{active:true,x:120,y:100,getBounds:()=>({left:112,right:128,top:80,bottom:120})}]};
const beside=s.findWardScale(108,100);assert.equal(beside,0,'Never show a ring cut by visible wall pixels');
const close=s.findWardScale(102,100);assert(close>0&&close<1);assert(102+20*close<=111);
s.walls={getChildren:()=>[{active:true,x:100,y:128,getBounds:()=>({left:80,right:120,top:107,bottom:139})}]};
const cap=s.findWardScale(100,100);assert(cap>0&&cap<1);assert(100+12*cap<=106);
console.log('Aura clearance passed: open floor, tile boundary, side wall and raised wall cap.');

s.walls={getChildren:()=>[]};
for (const name of ['crate','column','chest']) {
 const prop={active:true,visible:true,x:120,y:112,body:{enable:true},getBounds:()=>({left:112,right:128,top:name==='column'?64:88,bottom:112})};
 s.props={getChildren:()=>[prop]};
 const scale=s.findWardScale(102,100);assert(scale>0&&scale<1,`${name} must constrain the aura`);
 assert(102+20*scale<=111);
 prop.active=false;assert.equal(s.findWardScale(102,100),1,'Removed props do not restrict aura');
 prop.active=true;prop.body.enable=false;assert.equal(s.findWardScale(102,100),1,'Opened passage does not restrict aura');
}
s.props={getChildren:()=>[]};
s.enemies={getChildren:()=>[{active:true,x:120,y:112,getData:k=>k==='type'?'mimic':true,getBounds:()=>({left:112,right:128,top:88,bottom:112})}]};
assert(s.findWardScale(102,100)<1,'Disguised mimic chest also constrains aura');
console.log('Aura object clearance passed: crates, columns, chests, dormant mimics and cleared passages.');
