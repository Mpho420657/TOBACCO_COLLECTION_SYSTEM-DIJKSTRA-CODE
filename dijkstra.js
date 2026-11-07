/*
 * Dijkstra's algorithm for the tobacco collection network of Malawi.
 *
 * Data structures:
 *   graph = Map: node code -> Map: neighbour code -> road distance (km)   (adjacency list)
 *   MinHeap = binary min-heap used as the priority queue
 *   dist / prev = shortest distance found so far / the node we came from
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TobaccoDijkstra = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Add two distances and remove tiny floating point errors (for example 0.1 + 0.2).
  function add(a, b) {
    return Math.round((a + b) * 1e6) / 1e6;
  }

  // Codes are not case sensitive and spaces are ignored: " ba " becomes "BA".
  function normaliseCode(code) {
    return String(code).trim().toUpperCase();
  }

  // ---------- Priority queue (binary min-heap) ----------
  class MinHeap {
    constructor() { this.items = []; }
    get size() { return this.items.length; }

    // smaller distance first; if equal, smaller code first (so results are repeatable)
    static less(x, y) {
      return x[0] < y[0] || (x[0] === y[0] && x[1] < y[1]);
    }

    push(priority, value) {
      const a = this.items;
      a.push([priority, value]);
      let i = a.length - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (!MinHeap.less(a[i], a[parent])) break;
        [a[i], a[parent]] = [a[parent], a[i]];
        i = parent;
      }
    }

    pop() {
      const a = this.items;
      if (a.length === 0) return undefined;
      const top = a[0];
      const last = a.pop();
      if (a.length > 0) {
        a[0] = last;
        let i = 0;
        for (;;) {
          const left = 2 * i + 1, right = left + 1;
          let smallest = i;
          if (left < a.length && MinHeap.less(a[left], a[smallest])) smallest = left;
          if (right < a.length && MinHeap.less(a[right], a[smallest])) smallest = right;
          if (smallest === i) break;
          [a[i], a[smallest]] = [a[smallest], a[i]];
          i = smallest;
        }
      }
      return top;
    }

    // a sorted copy of the queue, used only for showing the trace
    snapshot() {
      return this.items.map((x) => [x[0], x[1]]).sort((x, y) => (MinHeap.less(x, y) ? -1 : 1));
    }
  }

  // ---------- Building the graph ----------
  // nodes: array of codes, edges: array of [from, to, distance]
  function buildGraph(nodes, edges) {
    const graph = new Map();
    for (const n of nodes) {
      const code = normaliseCode(n);
      if (code === '') throw new Error('A node code cannot be empty');
      if (graph.has(code)) throw new Error('Duplicate node: ' + code);
      graph.set(code, new Map());
    }
    for (const [from, to, weight] of edges) {
      const a = normaliseCode(from);
      const b = normaliseCode(to);
      if (!graph.has(a)) throw new Error('Unknown node in edge: ' + a);
      if (!graph.has(b)) throw new Error('Unknown node in edge: ' + b);
      if (a === b) throw new Error('An edge cannot join a node to itself: ' + a);
      const w = typeof weight === 'string' && weight.trim() === '' ? NaN : Number(weight);
      if (!Number.isFinite(w)) throw new Error('Distance must be a number: ' + a + '-' + b);
      if (w < 0) throw new Error('Negative distance not allowed: ' + a + '-' + b + ' (' + w + ')');
      // if two roads join the same pair, keep the shorter one
      const old = graph.get(a).get(b);
      if (old === undefined || w < old) {
        graph.get(a).set(b, w); // undirected: store both ways
        graph.get(b).set(a, w);
      }
    }
    return graph;
  }

  // ---------- Dijkstra ----------
  // Returns shortest distances from "start" to every node.
  // options.trace = true also records every step (used for the dry run).
  function dijkstra(graph, start, options) {
    const opts = options || {};
    if (start === undefined || start === null) throw new Error('Start node is missing');
    const s = normaliseCode(start);
    if (!graph.has(s)) throw new Error('Unknown node: ' + s);

    const dist = new Map();
    const prev = new Map();
    const done = new Set();
    for (const n of graph.keys()) dist.set(n, Infinity);
    dist.set(s, 0);

    const heap = new MinHeap();
    heap.push(0, s);
    const order = [];
    const trace = opts.trace ? [] : null;

    while (heap.size > 0) {
      const [d, u] = heap.pop();
      if (done.has(u) || d > dist.get(u)) { // old entry, a shorter route was found later
        if (trace) trace.push({ popped: [d, u], stale: true, updates: [], queue: heap.snapshot() });
        continue;
      }
      done.add(u);
      order.push(u);
      const updates = [];
      for (const [v, w] of graph.get(u)) {
        if (done.has(v)) continue;
        const nd = add(dist.get(u), w);
        if (nd < dist.get(v)) {
          dist.set(v, nd);
          prev.set(v, u);
          heap.push(nd, v);
          updates.push([v, nd]);
        }
      }
      if (trace) trace.push({ popped: [d, u], stale: false, updates, queue: heap.snapshot() });
    }
    return { start: s, dist, prev, order, trace };
  }

  // follow the "came from" links back to the start
  function buildPath(result, target) {
    const path = [];
    for (let n = target; n !== undefined; n = result.prev.get(n)) path.unshift(n);
    return path;
  }

  // Shortest route between two nodes.
  function shortestPath(graph, start, end, options) {
    const result = dijkstra(graph, start, options);
    if (end === undefined || end === null) throw new Error('End node is missing');
    const t = normaliseCode(end);
    if (!graph.has(t)) throw new Error('Unknown node: ' + t);
    const distance = result.dist.get(t);
    if (distance === Infinity) {
      return { start: result.start, end: t, distance, path: [], reachable: false, trace: result.trace };
    }
    return { start: result.start, end: t, distance, path: buildPath(result, t), reachable: true, trace: result.trace };
  }

  // Which auction floor is nearest to a district? (runs Dijkstra once)
  function nearestFloor(graph, start, floors) {
    const result = dijkstra(graph, start);
    const all = floors.map((f) => {
      const code = normaliseCode(f);
      if (!graph.has(code)) throw new Error('Unknown node: ' + code);
      const distance = result.dist.get(code);
      return { floor: code, distance, path: distance === Infinity ? [] : buildPath(result, code) };
    });
    all.sort((x, y) => (x.distance - y.distance) || (x.floor < y.floor ? -1 : 1));
    const nearest = all.length > 0 && all[0].distance !== Infinity ? all[0] : null;
    return { start: result.start, nearest, all };
  }

  return { MinHeap, add, normaliseCode, buildGraph, dijkstra, shortestPath, nearestFloor };
});
