/*
 * Test program for the Dijkstra implementation.
 *   node tests.js                         run all tests on dijkstra.js
 *   node tests.js ./other.js --core       run only the core tests on another version
 *   node tests.js --json=results.json     also save the results to a file
 */
'use strict';
const path = require('path');
const fs = require('fs');

const argv = process.argv.slice(2);
const modArg = argv.find((a) => !a.startsWith('--'));
const coreOnly = argv.includes('--core');
const jsonArg = argv.find((a) => a.startsWith('--json='));
const D = require(path.resolve(modArg || path.join(__dirname, 'dijkstra.js')));
const data = require('./graph-data.js');

const codes = data.districts.map((d) => d.code);
const graph = D.buildGraph(codes, data.edges);

// ---------- helpers ----------
const show = (r) => (r.distance === Infinity
  ? `Infinity km; path=[${r.path.join('>')}]`
  : `${r.distance} km; ${r.path.join('>')}`);

function expectError(fn, needle) {
  try {
    fn();
  } catch (e) {
    return { actual: 'Error: ' + e.message, pass: e.message.toLowerCase().includes(needle.toLowerCase()) };
  }
  return { actual: 'No error was raised', pass: false };
}

// Independent check: Floyd-Warshall (a different algorithm, written separately)
function floyd(edgeList, nodeList) {
  const n = nodeList.length;
  const idx = new Map(nodeList.map((c, i) => [c, i]));
  const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)));
  for (const [a, b, w] of edgeList) {
    const i = idx.get(a), j = idx.get(b);
    d[i][j] = Math.min(d[i][j], w);
    d[j][i] = Math.min(d[j][i], w);
  }
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
  }
  return { d, idx };
}
const same = (x, y) => (x === Infinity && y === Infinity) || Math.abs(x - y) < 1e-6;

// ---------- test list ----------
const tests = [];
function test(id, group, description, input, expected, fn, core = true) {
  tests.push({ id, group, description, input, expected, fn, core });
}
const route = (from, to) => () => show(D.shortestPath(graph, from, to));

// A. Correct answers on the tobacco graph
test('A1', 'A', 'Balaka to Limbe floors (the fewest roads is not the shortest)', 'BA, BT', '153.6 km; BA>MA>ZA>CR>BT', route('BA', 'BT'));
test('A2', 'A', 'Balaka to Kanengo floors', 'BA, LL', '204.7 km; BA>NT>DZ>LL', route('BA', 'LL'));
test('A3', 'A', 'Balaka to Chinkhoma floors', 'BA, KA', '335.7 km; BA>NT>DZ>LL>KA', route('BA', 'KA'));
test('A4', 'A', 'Nkhotakota to Lilongwe (lakeshore route beats the Kasungu route)', 'NK, LL', '213 km; NK>SA>LL', route('NK', 'LL'));
test('A5', 'A', 'Two districts joined by one road', 'ZA, CR', '43 km; ZA>CR', route('ZA', 'CR'));
test('A6', 'A', 'Balaka to Salima (route through Lilongwe beats route through Mangochi)', 'BA, SA', '305.7 km; BA>NT>DZ>LL>SA', route('BA', 'SA'));
test('A7', 'A', 'Longest route in the graph, Kasungu to Nsanje', 'KA, NJ', '640.6 km; KA>LL>DZ>NT>BA>MA>ZA>CR>BT>CK>NJ', route('KA', 'NJ'));
test('A8', 'A', 'Long route across both regions, Mchinji to Nsanje', 'MC, NJ', '617.6 km; MC>LL>DZ>NT>BA>MA>ZA>CR>BT>CK>NJ', route('MC', 'NJ'));
test('A9', 'A', 'Distance is the same in both directions (undirected graph), all pairs', 'all 22 x 22 pairs', '484 pairs checked, 0 not symmetric', () => {
  let bad = 0, count = 0;
  for (const a of codes) for (const b of codes) {
    count++;
    if (!same(D.shortestPath(graph, a, b).distance, D.shortestPath(graph, b, a).distance)) bad++;
  }
  return `${count} pairs checked, ${bad} not symmetric`;
});
test('A10', 'A', 'Compare with Floyd-Warshall (a different algorithm), all pairs', 'all 22 x 22 pairs', '484 pairs checked, 0 differences', () => {
  const { d, idx } = floyd(data.edges, codes);
  let bad = 0, count = 0;
  for (const a of codes) for (const b of codes) {
    count++;
    if (!same(D.shortestPath(graph, a, b).distance, d[idx.get(a)][idx.get(b)])) bad++;
  }
  return `${count} pairs checked, ${bad} differences`;
});

// B. Unusual and wrong input
test('B1', 'B', 'Start and end are the same node', 'BA, BA', '0 km; BA', route('BA', 'BA'));
test('B2', 'B', 'Lower case codes', 'ba, bt', '153.6 km; BA>MA>ZA>CR>BT', route('ba', 'bt'));
test('B3', 'B', 'Codes with extra spaces', '" BA ", "BT "', '153.6 km; BA>MA>ZA>CR>BT', route(' BA ', 'BT '));
test('B4', 'B', 'Start node that does not exist', 'XX, BT', 'Error that says the node is unknown', () => expectError(() => D.shortestPath(graph, 'XX', 'BT'), 'Unknown node'));
test('B5', 'B', 'End node that does not exist', 'BA, ZZ', 'Error that says the node is unknown', () => expectError(() => D.shortestPath(graph, 'BA', 'ZZ'), 'Unknown node'));
test('B6', 'B', 'Destination cannot be reached (road Lilongwe-Mchinji removed)', 'BA, MC', 'Infinity km; path=[]', () => {
  const g = D.buildGraph(codes, data.edges.filter(([a, b]) => !(a === 'LL' && b === 'MC')));
  return show(D.shortestPath(g, 'BA', 'MC'));
});
test('B7', 'B', 'Graph in two separate parts', 'A, D', 'Infinity km; path=[]', () => {
  const g = D.buildGraph(['A', 'B', 'C', 'D'], [['A', 'B', 1], ['C', 'D', 1]]);
  return show(D.shortestPath(g, 'A', 'D'));
});
test('B8', 'B', 'Graph with only one node', 'A, A', '0 km; A', () => show(D.shortestPath(D.buildGraph(['A'], []), 'A', 'A')));
test('B9', 'B', 'Start node is missing', '(nothing), BT', 'Error that says the start node is missing', () => expectError(() => D.shortestPath(graph, undefined, 'BT'), 'missing'));
test('B10', 'B', 'Two routes of equal length', 'A, D', '2 km; a valid route through B or C', () => {
  const g = D.buildGraph(['A', 'B', 'C', 'D'], [['A', 'B', 1], ['B', 'D', 1], ['A', 'C', 1], ['C', 'D', 1]]);
  const r = D.shortestPath(g, 'A', 'D');
  const ok = r.distance === 2 && r.path.length === 3 && r.path[0] === 'A' && r.path[2] === 'D' && ['B', 'C'].includes(r.path[1]);
  return { actual: show(r), pass: ok };
});
test('B11', 'B', 'Road with distance 0', 'A, C', '5 km; A>B>C', () => show(D.shortestPath(D.buildGraph(['A', 'B', 'C'], [['A', 'B', 0], ['B', 'C', 5]]), 'A', 'C')));
test('B12', 'B', 'Two roads between the same two districts (10 km and 7 km)', 'A, B', '7 km; A>B', () => show(D.shortestPath(D.buildGraph(['A', 'B'], [['A', 'B', 10], ['B', 'A', 7]]), 'A', 'B')));
test('B13', 'B', 'Road with a negative distance', 'A-B = -5', 'Error that says negative distance is not allowed', () => expectError(() => D.buildGraph(['A', 'B'], [['A', 'B', -5]]), 'Negative'));
test('B14', 'B', 'Road distance that is not a number', 'A-B = "abc"', 'Error that says the distance must be a number', () => expectError(() => D.buildGraph(['A', 'B'], [['A', 'B', 'abc']]), 'number'));
test('B15', 'B', 'Road that joins a district to itself', 'A-A = 3', 'Error that says a node cannot join itself', () => expectError(() => D.buildGraph(['A'], [['A', 'A', 3]]), 'itself'));
test('B16', 'B', 'Road that uses a district that does not exist', 'A-X = 1', 'Error that says the node is unknown', () => expectError(() => D.buildGraph(['A'], [['A', 'X', 1]]), 'Unknown node'));
test('B17', 'B', 'Decimal distances add up correctly (0.1 + 0.2)', 'A-B = 0.1, B-C = 0.2; A, C', '0.3 km; A>B>C', () => show(D.shortestPath(D.buildGraph(['A', 'B', 'C'], [['A', 'B', 0.1], ['B', 'C', 0.2]]), 'A', 'C')));

// C. Bigger graph (checks the priority queue)
test('C1', 'C', 'Random graph, 1000 nodes and 5000 roads, 5 start nodes, compared with a slow simple version', '1000 nodes, seed 12345', 'all distances equal', () => {
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const N = 1000;
  const nodes = Array.from({ length: N }, (_, i) => 'N' + i);
  const edges = [];
  for (let i = 0; i < N; i++) edges.push(['N' + i, 'N' + ((i + 1) % N), 1 + Math.floor(rnd() * 100)]);
  for (let k = 0; k < 4000; k++) {
    const a = Math.floor(rnd() * N); let b = Math.floor(rnd() * N);
    if (a === b) b = (b + 1) % N;
    edges.push(['N' + a, 'N' + b, 1 + Math.floor(rnd() * 100)]);
  }
  const g = D.buildGraph(nodes, edges);
  // slow simple Dijkstra (scans all nodes each time) for comparison
  const adj = Array.from({ length: N }, () => []);
  edges.forEach(([a, b, w]) => { const i = +a.slice(1), j = +b.slice(1); adj[i].push([j, w]); adj[j].push([i, w]); });
  const slow = (s) => {
    const dist = new Array(N).fill(Infinity), done = new Array(N).fill(false); dist[s] = 0;
    for (let k = 0; k < N; k++) {
      let u = -1; for (let i = 0; i < N; i++) if (!done[i] && (u === -1 || dist[i] < dist[u])) u = i;
      done[u] = true; for (const [v, w] of adj[u]) if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
    }
    return dist;
  };
  let bad = 0; let ms = 0;
  for (const s of [0, 137, 411, 700, 999]) {
    const t0 = Date.now();
    const r = D.dijkstra(g, 'N' + s);
    ms += Date.now() - t0;
    const ref = slow(s);
    const get = (i) => (r.dist instanceof Map ? r.dist.get('N' + i) : r.dist['N' + i]);
    for (let i = 0; i < N; i++) if (get(i) !== ref[i]) bad++;
  }
  return { actual: bad === 0 ? 'all distances equal' : bad + ' distances differ', pass: bad === 0, note: `5 runs took ${ms} ms in total` };
});

// D. Dry run check (needs the step-by-step trace)
test('D1', 'D', 'Dry run: the program\'s steps match the hand dry run on the 6-district part, BA to BT', 'BA, BT', '0 BA | 49.9 MA | 84.3 ZA | 123 NE | 127.3 CR | 153.6 BT | 231 BT (old entry)', () => {
  const part = [['BA', 'NE', 123], ['BA', 'MA', 49.9], ['MA', 'ZA', 34.4], ['ZA', 'CR', 43], ['CR', 'BT', 26.3], ['NE', 'BT', 108]];
  const g = D.buildGraph(['BA', 'NE', 'MA', 'ZA', 'CR', 'BT'], part);
  const r = D.shortestPath(g, 'BA', 'BT', { trace: true });
  const steps = r.trace.map((t) => `${t.popped[0]} ${t.popped[1]}${t.stale ? ' (old entry)' : ''}`).join(' | ');
  return steps + (r.distance === 153.6 ? '' : ' | WRONG DISTANCE ' + r.distance);
}, false);

// E. Nearest auction floor
test('E1', 'E', 'Nearest floor to Balaka', 'BA', 'BT 153.6 km', () => { const r = D.nearestFloor(graph, 'BA', data.floors); return `${r.nearest.floor} ${r.nearest.distance} km`; }, false);
test('E2', 'E', 'A floor district is its own nearest floor', 'LL', 'LL 0 km', () => { const r = D.nearestFloor(graph, 'LL', data.floors); return `${r.nearest.floor} ${r.nearest.distance} km`; }, false);
test('E3', 'E', 'Nearest floor for every district compared with Floyd-Warshall', 'all 22 districts', '22 districts checked, 0 differences', () => {
  const { d, idx } = floyd(data.edges, codes);
  let bad = 0;
  for (const c of codes) {
    const best = Math.min(...data.floors.map((f) => d[idx.get(c)][idx.get(f)]));
    if (!same(D.nearestFloor(graph, c, data.floors).nearest.distance, best)) bad++;
  }
  return `${codes.length} districts checked, ${bad} differences`;
}, false);
test('E4', 'E', 'No floor can be reached', 'A (floors: C)', 'No reachable floor', () => {
  const g = D.buildGraph(['A', 'B', 'C'], [['A', 'B', 1]]);
  const r = D.nearestFloor(g, 'A', ['C']);
  return r.nearest === null ? 'No reachable floor' : 'Found ' + r.nearest.floor;
}, false);

// ---------- run ----------
const results = [];
for (const t of tests) {
  if (coreOnly && !t.core) continue;
  let out;
  try { out = t.fn(); } catch (e) { out = { actual: 'ERROR: ' + e.message, pass: false }; }
  if (typeof out === 'string') out = { actual: out, pass: out === t.expected };
  results.push({ id: t.id, group: t.group, description: t.description, input: t.input, expected: t.expected, actual: out.actual, pass: out.pass, note: out.note || '' });
}

const passed = results.filter((r) => r.pass).length;
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id.padEnd(4)} ${r.description}`);
  if (!r.pass) { console.log(`        expected: ${r.expected}`); console.log(`        actual:   ${r.actual}`); }
  if (r.note) console.log(`        note: ${r.note}`);
}
console.log(`\n${passed} of ${results.length} tests passed.`);

if (jsonArg) {
  const extra = {};
  if (typeof D.nearestFloor === 'function') {
    extra.nearest = codes.map((c) => { const r = D.nearestFloor(graph, c, data.floors); return { code: c, floor: r.nearest.floor, distance: r.nearest.distance, path: r.nearest.path }; });
  }
  fs.writeFileSync(jsonArg.slice(7), JSON.stringify({ results, passed, total: results.length, extra }, null, 2));
}
process.exit(passed === results.length ? 0 : 1);
