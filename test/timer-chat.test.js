import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server.js';
async function fixture(t){
 let time=100000;const app=createApp({now:()=>time,tickMs:5});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin=`http://127.0.0.1:${server.address().port}`;
 t.after(async()=>{app.locals.dispose();await new Promise(r=>server.close(r));});const a=randomUUID(),b=randomUUID(),outsider=randomUUID();
 async function post(token,body){const r=await fetch(origin+'/api/table',{method:'POST',headers:{'Content-Type':'application/json','x-player-token':token},body:JSON.stringify(body)});return {status:r.status,...await r.json()};}
 async function get(token,code){return fetch(origin+'/api/table?code='+code,{headers:{'x-player-token':token}}).then(r=>r.json());}
 const made=await post(a,{action:'create',name:'Alice'});const code=made.code;const joined=await post(b,{action:'join',name:'Bob',code});
 return {a,b,outsider,code,post,get,joined,advance:ms=>time+=ms};
}
test('server times out an absent player with auto-fold, without client requests',async t=>{
 const f=await fixture(t);const dealt=await f.post(f.a,{action:'deal',code:f.code,version:f.joined.version});assert.equal(dealt.deadline,130000);f.advance(30001);await new Promise(r=>setTimeout(r,20));
 const ended=await f.get(f.b,f.code);assert.equal(ended.game.phase,'showdown');assert.equal(ended.deadline,null);assert.equal(ended.game.players[0].folded,true);assert.match(ended.game.log.join(' '),/automatic fold/);assert.equal(ended.game.players[1].stats.wins,1);
});
test('timeout checks when no chips owed and gives next player a fresh turn',async t=>{
 const f=await fixture(t);let d=await f.post(f.a,{action:'deal',code:f.code,version:f.joined.version});d=await f.post(f.a,{action:'call',code:f.code,version:d.version});assert.equal(d.game.turn,1);f.advance(30001);const next=await f.get(f.a,f.code);assert.equal(next.game.phase,'flop');assert.equal(next.game.players[1].folded,false);assert.match(next.game.log.join(' '),/automatic check/);assert.equal(next.deadline,160001);assert.equal(next.game.turn,1);
});
test('chat, polling, avatar changes and rejoining do not extend deadline',async t=>{
 const f=await fixture(t);let d=await f.post(f.a,{action:'deal',code:f.code,version:f.joined.version});const deadline=d.deadline;f.advance(10000);
 const chat=await f.post(f.a,{action:'chat',code:f.code,text:'Hello 👋'});assert.equal(chat.version,d.version);assert.equal(chat.deadline,deadline);assert.equal(chat.messages[0].name,'Alice');assert.equal(chat.messages[0].text,'Hello 👋');
 assert.equal((await f.get(f.b,f.code)).messages.length,1);const avatar=await f.post(f.a,{action:'avatar',code:f.code,version:chat.version,avatar:'owl'});assert.equal(avatar.deadline,deadline);
 const joined=await f.post(f.a,{action:'join',code:f.code,name:'Alice'});assert.equal(joined.deadline,deadline);assert.equal((await f.get(f.b,f.code)).deadline,deadline);
});
test('late action cannot rescue timed-out hand; a chat message does not invalidate a timely action',async t=>{
 const f=await fixture(t);let d=await f.post(f.a,{action:'deal',code:f.code,version:f.joined.version});await f.post(f.b,{action:'chat',code:f.code,text:'Good luck'});const called=await f.post(f.a,{action:'call',code:f.code,version:d.version});assert.equal(called.status,200);
 f.advance(30001);const late=await f.post(f.b,{action:'raise',amount:100,code:f.code,version:called.version});assert.equal(late.status,409);assert.equal((await f.get(f.a,f.code)).game.phase,'flop');
});
test('timer choices are host-only, between hands, and Off has no deadline',async t=>{
 const f=await fixture(t);assert.equal((await f.post(f.b,{action:'timer',seconds:15,code:f.code,version:f.joined.version})).status,400);
 let d=await f.post(f.a,{action:'timer',seconds:15,code:f.code,version:f.joined.version});assert.equal(d.game.turnSeconds,15);
 d=await f.post(f.a,{action:'timer',seconds:0,code:f.code,version:d.version});d=await f.post(f.a,{action:'deal',code:f.code,version:d.version});assert.equal(d.deadline,null);f.advance(600000);assert.equal((await f.get(f.a,f.code)).game.phase,'preflop');
 assert.equal((await f.post(f.a,{action:'timer',seconds:60,code:f.code,version:d.version})).status,400);
});
test('only seated players can chat; input is bounded and chat is isolated by table',async t=>{
 const f=await fixture(t);assert.equal((await f.post(f.outsider,{action:'chat',code:f.code,text:'Intruder'})).status,400);
 assert.equal((await f.post(f.a,{action:'chat',code:f.code,text:' '.repeat(5)})).status,400);
 assert.equal((await f.post(f.a,{action:'chat',code:f.code,text:'x'.repeat(301)})).status,400);
 const text='<img src=x onerror=alert(1)>';const msg=await f.post(f.a,{action:'chat',code:f.code,text,name:'Fake'});assert.equal(msg.messages[0].text,text);assert.equal(msg.messages[0].name,'Alice');
 assert.equal((await f.get(f.outsider,f.code)).messages.length,0);const other=await f.post(f.outsider,{action:'create',name:'Other'});assert.equal(other.messages.length,0);
 for(let n=0;n<19;n++)assert.equal((await f.post(f.a,{action:'chat',code:f.code,text:'message'})).status,200);
 assert.equal((await f.post(f.a,{action:'chat',code:f.code,text:'too many'})).status,429);
});
