/*
 * Command line program.
 *   node cli.js BA BT          shortest route from BA to BT
 *   node cli.js BA             distances from BA to every district, and the nearest auction floor
 *   node cli.js BA BT --trace  also print every step of the algorithm
 */
'use strict';
const D = require('./dijkstra.js');
const data = require('./graph-data.js');

const names = {};
data.districts.forEach((d) => { names[d.code] = d.name; });
const label = (c) => `${c} (${names[c]})`;
const km = (x) => x.toFixed(1) + ' km';

const args = process.argv.slice(2);
const wantTrace = args.includes('--trace');
const rest = args.filter((a) => !a.startsWith('--'));

try {
  const graph = D.buildGraph(data.districts.map((d) => d.code), data.edges);

  if (rest.length === 0) {
    console.log('Usage:');
    console.log('  node cli.js <FROM> <TO>           shortest route between two districts');
    console.log('  node cli.js <FROM>                distances to all districts and nearest auction floor');
    console.log('  node cli.js <FROM> <TO> --trace   also show every step');
    console.log('District codes: ' + data.districts.map((d) => d.code).join(' '));
    process.exit(0);
  }

  if (rest.length === 1) {
    const res = D.dijkstra(graph, rest[0], { trace: wantTrace });
    console.log(`Shortest distances from ${label(res.start)}:`);
    for (const n of res.order) console.log(`  ${label(n).padEnd(20)} ${km(res.dist.get(n)).padStart(10)}`);
    const nf = D.nearestFloor(graph, rest[0], data.floors);
    if (nf.nearest) {
      console.log(`Nearest auction floor: ${label(nf.nearest.floor)} at ${km(nf.nearest.distance)}`);
      console.log(`Route: ${nf.nearest.path.join(' -> ')}`);
    } else {
      console.log('No auction floor can be reached from this district.');
    }
    if (wantTrace) printTrace(res.trace);
  } else {
    const r = D.shortestPath(graph, rest[0], rest[1], { trace: wantTrace });
    if (!r.reachable) {
      console.log(`There is no road route from ${label(r.start)} to ${label(r.end)}.`);
    } else {
      console.log(`Shortest route from ${label(r.start)} to ${label(r.end)}`);
      console.log(`Distance: ${km(r.distance)}`);
      console.log(`Route: ${r.path.join(' -> ')}`);
    }
    if (wantTrace) printTrace(r.trace);
  }
} catch (e) {
  console.error('Error: ' + e.message);
  process.exit(1);
}

function printTrace(trace) {
  console.log('\nStep by step:');
  trace.forEach((t, i) => {
    const q = '[' + t.queue.map(([d, n]) => `(${d}, ${n})`).join(', ') + ']';
    if (t.stale) {
      console.log(`  ${i + 1}. pop (${t.popped[0]}, ${t.popped[1]}) -> old entry, skipped.  queue = ${q}`);
    } else {
      const ups = t.updates.length ? t.updates.map(([v, d]) => `${v}=${d}`).join(', ') : 'no updates';
      console.log(`  ${i + 1}. pop (${t.popped[0]}, ${t.popped[1]}) -> ${ups}.  queue = ${q}`);
    }
  });
}
