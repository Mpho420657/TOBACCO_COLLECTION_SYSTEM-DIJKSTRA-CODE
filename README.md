# Tobacco Collection Network of Central and Southern Malawi (Dijkstra)

Data Structures and Algorithms Assignment, Questions 4 and 5.

The program holds a graph of 22 districts and 27 roads (distances in km from Google Maps).
Three districts are tobacco auction floors: Kasungu (Chinkhoma), Lilongwe (Kanengo) and Blantyre (Limbe).
It uses Dijkstra's algorithm to find the nearest floor for every district and the route to it.

## Web version (no installation)
Open `index.html` in any browser, or use the GitHub Pages link of this repository.
It has the same graph and the same Dijkstra method as the C++ program: nearest floor, route between districts, all districts, step by step, and a check against Floyd-Warshall.

## Build and run (C++ program)

    make            # builds ./tobacco
    ./tobacco       # menu
    make test       # runs all 41 test checks.

## Commands
    ./tobacco list                 all districts and floors
    ./tobacco route BA             nearest floor for Balaka and the route to each floor
    ./tobacco path NJ MC           shortest route between any two districts
    ./tobacco table                distances to every floor and the catchment areas
    ./tobacco trace BA             Dijkstra step by step
    ./tobacco verify               checks Dijkstra against Floyd-Warshall on all pairs
    ./tobacco --graph file.txt ... use another graph

A district can be a code (BA) or a name (Balaka), in any case.
Exit codes: 0 fine, 1 wrong input, 2 bad graph file.

## Graph file format
    # comment
    NODE AA Alpha FLOOR     (FLOOR is optional; use _ for spaces in a name)
    EDGE AA BB 12.5         (distance in km, more than 0, at most one decimal place)

See `tests/graphs/` for examples.
