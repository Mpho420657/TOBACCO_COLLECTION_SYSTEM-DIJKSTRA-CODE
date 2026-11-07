# Tobacco collection network: Dijkstra's algorithm

DSA assignment 2026. The graph shows 22 district trading centres in central and southern Malawi
joined by 27 roads (distances in km from Google Maps). The three auction floors are the destinations:

- KA, Kasungu (Chinkhoma floors)
- LL, Lilongwe (Kanengo floors)
- BT, Blantyre (Limbe floors)

The program finds the shortest road route from any district to any other district,
and the nearest auction floor for any district.

## Files

| File | What it does |
|---|---|
| `dijkstra.js` | The algorithm: min-heap priority queue, `buildGraph`, `dijkstra`, `shortestPath`, `nearestFloor` |
| `graph-data.js` | The 22 districts, 27 roads with distances, and the 3 auction floors |
| `cli.js` | Command line program |
| `tests.js` | 33 tests with PASS or FAIL for each |
| `dry-run.js` | Prints every step of the algorithm on a small part of the graph |

## How to run

You need Node.js (version 14 or newer). No other installation is needed.

```
node cli.js BA BT           shortest route from Balaka to Blantyre
node cli.js BA              distances from Balaka to every district, and the nearest auction floor
node cli.js BA BT --trace   also show every step of the algorithm
node tests.js               run all the tests
node dry-run.js             show the step-by-step dry run
```

District codes: KA LL DW DZ MC NK NS NT SA BT MA MG NJ PH ZA BA CK CR ML MW NE TH

Codes are not case sensitive, so `ba bt` works too.

## Example

```
$ node cli.js BA BT
Shortest route from BA (Balaka) to BT (Blantyre)
Distance: 153.6 km
Route: BA -> MA -> ZA -> CR -> BT
```

## Notes

- The graph is undirected: every road is stored in both directions.
- Distances must not be negative. The program rejects bad data with a clear error message.
- If two roads join the same two districts, the shorter one is kept.
- Running time is O((V + E) log V) because of the priority queue.

Live version: [insert link when deployed]
