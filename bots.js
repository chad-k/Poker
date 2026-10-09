import { rank, compare } from './poker-rank.js';
export const difficulties = ['easy', 'standard', 'challenging'];
// This is deliberately the ONLY information given to the strategy.
// No deck order, discarded cards, or other players' hole cards are included.
export function observation(g, seat) {
  const me = g.players[seat];
  return {
    cards: [...me.cards], board: [...g.board], phase: g.phase,
    seat, dealer: g.dealer, chips: me.chips, bet: me.bet, total: me.total,
    pot: g.pot, current: g.current, minRaise: g.minRaise,
    canRaise: !g.acted.includes(seat) && g.players.some((p,i) => i !== seat && !p.folded && p.chips > 0),
    difficulty: g.botDifficulty || 'standard', style: me.style || 'balanced',
    players: g.players.map(p => ({folded:p.folded, chips:p.chips, bet:p.bet, total:p.total, action:p.action}))
  };
}
function startingStrength(cards) {
  const [a,b] = cards.map(c => c % 13 + 2).sort((x,y) => y-x);
  if (a === b) return 0.45 + a / 28;
  return Math.min(1, (a+b)/32 + (Math.floor(cards[0]/13) === Math.floor(cards[1]/13) ? .08 : 0) + (a-b === 1 ? .05 : 0));
}
export function estimateEquity(o, samples = 160, rng = Math.random) {
  const known = new Set([...o.cards, ...o.board]);
  const unknown = Array.from({length:52}, (_,i)=>i).filter(c=>!known.has(c));
  const rivals = o.players.filter((p,i)=>i!==o.seat && !p.folded);
  if (!rivals.length) return 1;
  let score = 0;
  for (let t=0; t<samples; t++) {
    const pool=[...unknown];
    const draw=()=>pool.splice(Math.min(pool.length-1,Math.floor(rng()*pool.length)),1)[0];
    const hands=[];
    for (const rival of rivals) {
      let hand=[draw(),draw()];
      // Harder bots narrow the range after an observed bet/raise.
      if (o.difficulty==='challenging' && /^(Raise|Bet)/.test(rival.action || '')) {
        for (let attempt=0;attempt<3 && startingStrength(hand)<.68;attempt++) {
          pool.push(...hand); hand=[draw(),draw()];
        }
      }
      hands.push(hand);
    }
    const board=[...o.board];while(board.length<5)board.push(draw());
    const mine=rank([...o.cards,...board]);let ties=1, lost=false;
    for (const hand of hands) { const c=compare(rank([...hand,...board]),mine); if(c>0){lost=true;break;} if(c===0)ties++; }
    if(!lost)score+=1/ties;
  }
  return score/samples;
}
export function chooseAction(o, {rng=Math.random, samples} = {}) {
  const due=Math.max(0,o.current-o.bet), call=Math.min(due,o.chips), max=o.bet+o.chips;
  if(o.difficulty==='easy') {
    const made=o.board.length ? rank([...o.cards,...o.board])[0] : (o.cards[0]%13===o.cards[1]%13 ? 3 : Math.max(...o.cards.map(c=>c%13+2))>=12 ? 1 : 0);
    return {type:due>80&&made<1?'fold':'call'};
  }
  const opponents=o.players.filter((p,i)=>i!==o.seat&&!p.folded).length;
  const equity=estimateEquity(o,samples ?? (o.difficulty==='challenging'?320:140),rng);
  // Chips above this player's possible contribution are in inaccessible side pots.
  const accessible=o.players.reduce((s,p)=>s+Math.min(p.total,o.total+call),0);
  const odds=call/(accessible+call||1);
  const risk=o.style==='tight'?.075:o.style==='loose'?.005:.035;
  const late=o.seat===o.dealer;
  const playable=equity>=odds+risk-(late?.015:0);
  const value=equity>Math.max(.54,1/(opponents+1)+.17)+(o.style==='tight'?.05:0);
  const bluffChance=(o.style==='loose'?.10:.045)*(late?1.6:1);
  const bluff=opponents<=2 && due<=20 && equity>.15 && rng()<bluffChance;
  const draw=o.board.length>0 && o.board.length<5 && equity>.40 && due<o.pot*.3;
  if(o.canRaise && max>o.current && (value || bluff || (draw&&rng()<.18)) && rng()<(value?.8:.65)) {
    const size=o.phase==='preflop'?Math.max(60,o.current+o.minRaise):o.current+Math.max(o.minRaise,Math.round((o.pot+call)*(equity>.78?.8:.55)/10)*10);
    let amount=Math.min(max,Math.max(o.current+o.minRaise,size));
    // Avoid turning a marginal raise into a speculative short-stack all-in.
    if(amount<max*.85 || equity>.66 || amount===max&&equity>.56) return {type:'raise',amount};
  }
  if(due===0)return {type:'call'};
  if(playable)return {type:'call'};
  return {type:'fold'};
}
