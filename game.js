import { rank, compare, labels } from './poker-rank.js';
import { chooseAction, observation, difficulties } from './bots.js';
import { validAvatar } from './avatars.js';
export { rank, compare, labels } from './poker-rank.js';
export function create(id,name,avatar='fox'){return {turnSeconds:30,botDifficulty:'standard',sessionHands:0,players:[player(id,name,false,avatar)],host:id,phase:'waiting',board:[],dealer:-1,hand:0,pot:0,log:['Table opened. Invite friends or add bots.'],turn:-1};}
function blankStats(){return {hands:0,wins:0,ties:0,net:0,lastNet:0,biggestPot:0};}
function player(id,name,bot=false,avatar='fox'){return {id,name:name.slice(0,24),bot,avatar:validAvatar(avatar)?avatar:'fox',stats:blankStats(),chips:1000,cards:[],bet:0,total:0,folded:false};}
function finishHand(g){
 g.sessionHands++;
 for(const p of g.players){if(!p.cards.length)continue;p.stats.hands++;p.stats.net+=p.chips-p.startChips;p.stats.lastNet=p.chips-p.startChips;if(p.wonPot)p.stats.wins++;if(p.tiedPot)p.stats.ties++;p.stats.biggestPot=Math.max(p.stats.biggestPot,p.potAward||0);}
}
function log(g,s){g.log=[...g.log.slice(-24),s];}
function next(g,i,pred){for(let n=1;n<=g.players.length;n++){let j=(i+n)%g.players.length;if(pred(g.players[j]))return j;}return -1;}
function pay(g,p,n){n=Math.min(n,p.chips);p.chips-=n;p.bet+=n;p.total+=n;g.pot+=n;}
export function deal(g){
 if(!['waiting','showdown'].includes(g.phase))throw Error('Finish this hand first.');
 if(g.players.filter(p=>p.chips>0).length<2)throw Error('At least two players need chips.');
 g.deck=Array.from({length:52},(_,i)=>i);for(let i=51;i>0;i--){let b=new Uint32Array(1);crypto.getRandomValues(b);let j=b[0]%(i+1);[g.deck[i],g.deck[j]]=[g.deck[j],g.deck[i]];}
 g.players.forEach(p=>{p.startChips=p.chips;p.wonPot=false;p.tiedPot=false;p.potAward=0;p.handName='';p.bet=0;p.total=0;p.folded=p.chips===0;p.cards=p.folded?[]:[g.deck.pop(),g.deck.pop()];p.action='';});g.board=[];g.pot=0;g.hand++;g.phase='preflop';g.dealer=next(g,g.dealer,p=>!p.folded);let heads=g.players.filter(p=>!p.folded).length===2;let sb=heads?g.dealer:next(g,g.dealer,p=>!p.folded),bb=next(g,sb,p=>!p.folded);pay(g,g.players[sb],10);pay(g,g.players[bb],20);g.current=20;g.minRaise=20;g.pending=g.players.map((p,i)=>!p.folded&&p.chips>0?i:-1).filter(i=>i>=0);g.acted=[];g.turn=next(g,bb,p=>!p.folded&&p.chips>0);log(g,`Hand ${g.hand} · blinds 10 / 20`);settle(g);
}
export function act(g,i,type,amount){
 if(g.turn!==i||!['preflop','flop','turn','river'].includes(g.phase))throw Error('It is not your turn.');let p=g.players[i],call=Math.max(0,g.current-p.bet);
 if(type==='fold'){p.folded=true;p.action='Fold';}
 else if(type==='call'){pay(g,p,call);p.action=call?'Call':'Check';}
 else if(type==='raise'){
 if(g.acted.includes(i))throw Error('A short all-in does not reopen raising.');
 let target=Number(amount);if(!Number.isInteger(target)||target<=g.current||target>p.bet+p.chips)throw Error('Choose a valid total bet.');let delta=target-g.current;
 if(delta<g.minRaise&&target!==p.bet+p.chips)throw Error(`Minimum total bet is ${g.current+g.minRaise}.`);
 pay(g,p,target-p.bet);g.current=target;
 if(delta>=g.minRaise){g.minRaise=delta;g.acted=[];}
 g.pending=g.players.map((x,j)=>j!==i&&!x.folded&&x.chips>0&&x.bet<target?j:-1).filter(j=>j>=0);p.action=`Raise to ${target}`;
 }else throw Error('Unknown action.');
 log(g,`${p.name}: ${p.action}`);g.pending=g.pending.filter(j=>j!==i);if(!g.acted.includes(i))g.acted.push(i);g.turn=next(g,i,(x)=>g.pending.includes(g.players.indexOf(x)));settle(g);
}
function settle(g){
 let live=g.players.filter(p=>!p.folded);
 if(live.length===1){let winner=live[0];winner.chips+=g.pot;log(g,`${winner.name} wins ${g.pot}; everyone else folded.`);g.phase='showdown';g.turn=-1;g.reveal=false;winner.wonPot=true;const otherMax=Math.max(0,...g.players.filter(p=>p!==winner).map(p=>p.total));winner.potAward=g.pot-Math.max(0,winner.total-otherMax);finishHand(g);return;}
 g.pending=g.pending.filter(i=>!g.players[i].folded&&g.players[i].chips>0);
 if(g.pending.length===1&&g.players.filter(p=>!p.folded&&p.chips>0).length===1&&g.players[g.pending[0]].bet>=g.current)g.pending=[];
 if(g.pending.length){if(!g.pending.includes(g.turn))g.turn=g.pending[0];return;}
 if(g.phase==='river'){showdown(g);return;}
 g.deck.pop();let n=g.phase==='preflop'?3:1;for(let i=0;i<n;i++)g.board.push(g.deck.pop());g.phase=g.phase==='preflop'?'flop':g.phase==='flop'?'turn':'river';g.players.forEach(p=>{p.bet=0;p.action=p.folded?'Fold':'';});g.current=0;g.minRaise=20;g.acted=[];g.pending=g.players.map((p,i)=>!p.folded&&p.chips>0?i:-1).filter(i=>i>=0);if(g.pending.length<2)g.pending=[];g.turn=next(g,g.dealer,p=>!p.folded&&p.chips>0);log(g,`${g.phase[0].toUpperCase()+g.phase.slice(1)} dealt.`);settle(g);
}
function showdown(g){
 g.phase='showdown';g.reveal=true;g.turn=-1;const levels=[...new Set(g.players.map(p=>p.total).filter(Boolean))].sort((a,b)=>a-b);let previous=0;
 for(let level of levels){let contributors=g.players.filter(p=>p.total>=level),pot=(level-previous)*contributors.length;previous=level;let eligible=contributors.filter(p=>!p.folded);if(contributors.length===1){contributors[0].chips+=pot;log(g,`${contributors[0].name}: ${pot} uncalled chips returned.`);continue;}
 let best=[],wins=[];for(let p of eligible){let r=rank([...g.board,...p.cards]),cmp=compare(r,best);p.handName=labels[r[0]];if(cmp>0){best=r;wins=[p];}else if(cmp===0)wins.push(p);}
 if(!wins.length)throw Error('No eligible pot winner.');let ordered=[];for(let k=1;k<=g.players.length;k++){let p=g.players[(g.dealer+k)%g.players.length];if(wins.includes(p))ordered.push(p);}ordered.forEach((p,i)=>{const award=Math.floor(pot/wins.length)+(i<pot%wins.length?1:0);p.chips+=award;p.potAward+=award;p.wonPot=true;if(wins.length>1)p.tiedPot=true;});log(g,`${wins.map(p=>p.name).join(' & ')} win ${pot} with ${labels[best[0]]}.`);
 }
 finishHand(g);
}
export function bots(g){
 for(let n=0;n<200&&g.turn>=0&&g.players[g.turn]?.bot;n++){const choice=chooseAction(observation(g,g.turn));act(g,g.turn,choice.type,choice.amount);}
}
export function update(g,id,action,data={}){
 let i=g.players.findIndex(p=>p.id===id);
 if(action==='join'){if(i>=0)return;if(!['waiting','showdown'].includes(g.phase))throw Error('Join after this hand ends.');if(g.players.length>=6)throw Error('Table is full.');g.players.push(player(id,data.name||'Player',false,data.avatar));return;}
 if(i<0)throw Error('Join this table first.');
 if(['bot','deal','reset','remove','difficulty','resetScores','timer'].includes(action)&&g.host!==id)throw Error('Only the host can do that.');
 if(action==='bot'){if(!['waiting','showdown'].includes(g.phase)||g.players.length>=6)throw Error('Add bots between hands; maximum six seats.');const profiles=[['Milo','fox','balanced'],['Luna','owl','tight'],['Rex','shark','loose'],['Nova','alien','balanced'],['Ace','dragon','tight']];const profile=profiles.find(([name])=>!g.players.some(p=>p.bot&&p.name===name))||profiles[0];const bot=player('bot-'+crypto.randomUUID(),profile[0],true,profile[1]);bot.style=profile[2];g.players.push(bot);}
 else if(action==='avatar'){if(!validAvatar(data.avatar))throw Error('Choose an available avatar.');g.players[i].avatar=data.avatar;}
 else if(action==='timer'){if(!['waiting','showdown'].includes(g.phase))throw Error('Change the timer between hands.');if(![0,15,30,60].includes(data.seconds))throw Error('Choose 15, 30, 60 seconds, or Off.');g.turnSeconds=data.seconds;log(g,data.seconds?`Turn timer: ${data.seconds} seconds.`:'Turn timer disabled.');}
 else if(action==='difficulty'){if(!['waiting','showdown'].includes(g.phase))throw Error('Change bot difficulty between hands.');if(!difficulties.includes(data.difficulty))throw Error('Choose a bot difficulty.');g.botDifficulty=data.difficulty;log(g,`Bot difficulty: ${data.difficulty}.`);}
 else if(action==='resetScores'){if(!['waiting','showdown'].includes(g.phase))throw Error('Reset the scoreboard between hands.');g.players.forEach(p=>p.stats=blankStats());g.sessionHands=0;log(g,'Session scoreboard reset; chip stacks kept.');}
 else if(action==='deal')deal(g);
 else if(action==='reset'){if(!['waiting','showdown'].includes(g.phase))throw Error('Finish the hand first.');g.players.forEach(p=>p.chips=1000);log(g,'All stacks reset to 1,000. Session scores kept.');}
 else if(action==='remove'){if(!['waiting','showdown'].includes(g.phase))throw Error('Remove players between hands.');g.players=g.players.filter(p=>p.id!==data.target||p.id===g.host);}
 else act(g,i,action,data.amount);
 bots(g);
}
export function view(g,id){let {deck,...v}=g;return {...v,players:g.players.map(p=>({...p,cards:p.id===id||(g.phase==='showdown'&&g.reveal&&!p.folded)?p.cards:p.cards.map(()=>null)}))};}

export function timeout(g){
 if(g.turn<0||!['preflop','flop','turn','river'].includes(g.phase))return;
 const p=g.players[g.turn];if(p.bot)return;const check=p.bet>=g.current;
 log(g,`${p.name}: time expired — automatic ${check?'check':'fold'}.`);
 act(g,g.turn,check?'call':'fold');bots(g);
}
