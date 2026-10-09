export const labels = ['High card', 'One pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];
export function compare(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] || 0) - (b[i] || 0);
    if (difference) return difference;
  }
  return 0;
}
function straightHigh(values) {
  const unique = new Set(values);
  if (unique.has(14)) unique.add(1);
  let run = 0;
  for (let v = 14; v >= 1; v--) {
    run = unique.has(v) ? run + 1 : 0;
    if (run === 5) return v + 4;
  }
  return 0;
}
// Direct best-five evaluation of five to seven cards, including ace-low straights.
export function rank(cards) {
  if (cards.length < 5 || cards.length > 7) throw Error('Evaluate five to seven cards.');
  const counts = Array(15).fill(0), suits = [[], [], [], []];
  for (const c of cards) { const v = c % 13 + 2; counts[v]++; suits[Math.floor(c / 13)].push(v); }
  const values = Array.from({length:13}, (_, i) => 14 - i).filter(v => counts[v]);
  const groups = [...values].sort((a,b) => counts[b] - counts[a] || b - a);
  const flush = suits.find(s => s.length >= 5)?.sort((a,b) => b - a);
  const straightFlush = flush ? straightHigh(flush) : 0;
  if (straightFlush) return [8, straightFlush];
  if (counts[groups[0]] === 4) return [7, groups[0], values.find(v => v !== groups[0])];
  const trips = values.filter(v => counts[v] >= 3);
  const pairs = values.filter(v => counts[v] >= 2);
  if (trips.length && pairs.some(v => v !== trips[0])) return [6, trips[0], pairs.find(v => v !== trips[0])];
  if (flush) return [5, ...flush.slice(0,5)];
  const straight = straightHigh(values);
  if (straight) return [4, straight];
  if (trips.length) return [3, trips[0], ...values.filter(v => v !== trips[0]).slice(0,2)];
  if (pairs.length >= 2) return [2, ...pairs.slice(0,2), values.find(v => v !== pairs[0] && v !== pairs[1])];
  if (pairs.length) return [1, pairs[0], ...values.filter(v => v !== pairs[0]).slice(0,3)];
  return [0, ...values.slice(0,5)];
}
