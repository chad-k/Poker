import express from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {create,update,view,timeout} from './game.js';
export function createApp({now=Date.now,tickMs=250}={}){
 const app=express(),tables=new Map(),limits=new Map();
 const gameplay=new Set(['deal','fold','call','raise']);
 function arm(row){
  const g=row.game,p=g.players[g.turn];
  row.deadline=g.turnSeconds&&p&&!p.bot&&['preflop','flop','turn','river'].includes(g.phase)?now()+g.turnSeconds*1000:null;
 }
 function expire(row){
  if(row.deadline===null||now()<row.deadline)return;
  const game=structuredClone(row.game);timeout(game);row.game=game;row.version++;row.revision++;arm(row);
 }
 function payload(row,id){return {game:view(row.game,id),you:id,version:row.version,revision:row.revision,deadline:row.deadline,serverNow:now(),messages:row.game.players.some(p=>p.id===id)?row.messages:[]};}
 function allow(id,kind,count){const key=id+':'+kind;let bucket=limits.get(key);if(!bucket||now()-bucket.time>=60000){bucket={time:now(),count:0};limits.set(key,bucket);}return ++bucket.count<=count;}
 app.disable('x-powered-by');app.use(express.json({limit:'8kb'}));
 app.get('/healthz',(_req,res)=>res.send('ok'));
 app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');const token=req.get('x-player-token')||'';if(!/^[a-f0-9-]{36}$/.test(token))return res.status(400).json({error:'Please reload to reconnect.'});req.playerId=createHash('sha256').update(token).digest('hex');next();});
 app.get('/api/table',(req,res)=>{try{const code=String(req.query.code||'').toUpperCase(),row=tables.get(code);if(!row)return res.status(404).json({error:'Table not found. Check the invite code.'});expire(row);row.touched=now();res.json(payload(row,req.playerId));}catch(e){console.error(e);res.status(500).json({error:'Unable to refresh the table. Please retry.'});}});
 app.post('/api/table',(req,res)=>{try{
 const id=req.playerId,body=req.body||{};
 if(!allow(id,'actions',120))return res.status(429).json({error:'Too many actions. Please wait a minute.'});
 const name=String(body.name||'').trim().slice(0,24);
 if(body.action==='create'){
  if(!name)throw Error('Enter your name.');if(tables.size>=1000)throw Error('All tables are busy. Please try later.');let code;do{code=randomUUID().slice(0,8).toUpperCase();}while(tables.has(code));
  const row={game:create(id,name,body.avatar),version:0,revision:0,deadline:null,messages:[],touched:now()};tables.set(code,row);return res.json({code,...payload(row,id)});
 }
 const code=String(body.code||'').toUpperCase(),row=tables.get(code);if(!row)throw Error('Table not found.');
 // Expiry wins over late actions, even if a browser hid or paused its countdown.
 expire(row);
 if(body.action==='chat'){
  const player=row.game.players.find(p=>p.id===id);if(!player)throw Error('Join this table to chat.');
  if(typeof body.text!=='string')throw Error('Enter a message.');
  const text=body.text.trim();if(!text||text.length>300)throw Error('Messages must contain 1–300 characters.');
  if(!allow(id,'chat',20))return res.status(429).json({error:'Please slow down. You can send 20 chat messages per minute.'});
  row.messages.push({id:randomUUID(),playerId:id,name:player.name,avatar:player.avatar,text,time:now()});row.messages=row.messages.slice(-100);row.revision++;row.touched=now();return res.json(payload(row,id));
 }
 if(body.action!=='join'&&body.version!==row.version)return res.status(409).json({error:'The table changed or your turn expired. Try again with the current table.'});
 // Mutate a copy, so a rejected action cannot corrupt the table.
 const game=structuredClone(row.game);update(game,id,body.action,{...body,name:name||'Player'});row.game=game;row.version++;row.revision++;row.touched=now();
 // Chat, avatars, polling, and reconnecting never restart a turn clock.
 if(gameplay.has(body.action)||body.action==='timer')arm(row);
 res.json(payload(row,id));
 }catch(e){res.status(400).json({error:e.message||'Unable to update table.'});}});
 // The server advances expired turns without requiring any connected browser.
 const sweep=setInterval(()=>{for(const row of tables.values()){try{expire(row);}catch(e){console.error('Timer update failed:',e);}}},tickMs);sweep.unref();
 const cleanup=setInterval(()=>{const time=now();for(const [code,row] of tables)if(time-row.touched>24*60*60*1000)tables.delete(code);for(const [id,row] of limits)if(time-row.time>120000)limits.delete(id);},60000);cleanup.unref();
 app.locals.dispose=()=>{clearInterval(sweep);clearInterval(cleanup);};
 app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)),'dist')));
 app.use((err,_req,res,_next)=>res.status(400).json({error:'Invalid request.'}));
 return app;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT)||3000;createApp().listen(port,'0.0.0.0',()=>console.log(`Poker with friends listening on port ${port}`));}
