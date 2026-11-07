/*
 * Prints every step of Dijkstra on a small part of the graph (6 districts, BA to BT).
 * This is the program output that is compared with the hand dry run.
 *   node dry-run.js
 */
'use strict';
const D = require('./dijkstra.js');

const part = [['BA', 'NE', 123], ['BA', 'MA', 49.9], ['MA', 'ZA', 34.4], ['ZA', 'CR', 43], ['CR', 'BT', 26.3], ['NE', 'BT', 108]];
const graph = D.buildGraph(['BA', 'NE', 'MA', 'ZA', 'CR', 'BT'], part);
const r = D.shortestPath(graph, 'BA', 'BT', { trace: true });

console.log('Start: dist[BA] = 0, all others = infinity.  queue = [(0, BA)]');
r.trace.forEach((t, i) => {
  const q = '[' + t.queue.map(([d, n]) => `(${d}, ${n})`).join(', ') + ']';
  if (t.stale) console.log(`Step ${i + 1}: pop (${t.popped[0]}, ${t.popped[1]}) -> old entry, skipped.  queue = ${q}`);
  else {
    const ups = t.updates.length ? t.updates.map(([v, d]) => `${v}=${d}`).join(', ') : 'no updates';
    console.log(`Step ${i + 1}: pop (${t.popped[0]}, ${t.popped[1]}) -> ${ups}.  queue = ${q}`);
  }
});
console.log(`Result: distance ${r.distance} km, route ${r.path.join(' -> ')}`);
