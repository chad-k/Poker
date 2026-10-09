import express from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {create,update,view} from './game.js';
export function createApp(){
 const app=express(),tables=new Map(),limits=new Map();
 app.disable('x-powered-by');app.use(express.json({limit:'8kb'}));
 app.get('/healthz',(_req,res)=>res.send('ok'));
 app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');const token=req.get('x-player-token')||'';if(!/^[a-f0-9-]{36}$/.test(token))return res.status(400).json({error:'Please reload to reconnect.'});req.playerId=createHash('sha256').update(token).digest('hex');next();});
 app.get('/api/table',(req,res)=>{const code=String(req.query.code||'').toUpperCase(),row=tables.get(code);if(!row)return res.status(404).json({error:'Table not found. Check the invite code.'});row.touched=Date.now();res.json({game:view(row.game,req.playerId),you:req.playerId,version:row.version});});
 app.post('/api/table',(req,res)=>{try{
 const id=req.playerId,body=req.body||{};let limit=limits.get(id);if(!limit||Date.now()-limit.time>60000){limit={time:Date.now(),count:0};limits.set(id,limit);}if(++limit.count>120)return res.status(429).json({error:'Too many actions. Please wait a minute.'});
 const name=String(body.name||'').trim().slice(0,24);
 if(body.action==='create'){
 if(!name)throw Error('Enter your name.');if(tables.size>=1000)throw Error('All tables are busy. Please try later.');let code;do{code=randomUUID().slice(0,8).toUpperCase();}while(tables.has(code));let game=create(id,name);tables.set(code,{game,version:0,touched:Date.now()});return res.json({code,game:view(game,id),you:id,version:0});
 }
 let code=String(body.code||'').toUpperCase(),row=tables.get(code);if(!row)throw Error('Table not found.');if(body.action!=='join'&&body.version!==row.version)return res.status(409).json({error:'The table changed. Try your action again.'});
 // Mutate a copy, so a rejected action can never corrupt the table.
 const game=structuredClone(row.game);update(game,id,body.action,{...body,name:name||'Player'});row.game=game;row.version++;row.touched=Date.now();res.json({game:view(game,id),you:id,version:row.version});
 }catch(e){res.status(400).json({error:e.message||'Unable to update table.'});}});
 const cleanup=setInterval(()=>{const now=Date.now();for(const [code,row] of tables)if(now-row.touched>24*60*60*1000)tables.delete(code);for(const [id,row] of limits)if(now-row.time>120000)limits.delete(id);},60000);cleanup.unref();
 app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)),'dist')));
 app.use((err,_req,res,_next)=>res.status(400).json({error:'Invalid request.'}));
 return app;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT)||3000;createApp().listen(port,'0.0.0.0',()=>console.log(`Poker with friends listening on port ${port}`));}
