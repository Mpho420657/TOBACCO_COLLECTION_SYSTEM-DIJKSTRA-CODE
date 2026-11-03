#!/bin/bash
# Runs every test, prints the real input and output, and checks the result.
# Usage (from the project folder):  make test      or      bash tests/run_tests.sh
# Add -q to hide the program output and only see PASS / FAIL lines.

cd "$(dirname "$0")/.." || exit 1
BIN=./tobacco
G=tests/graphs
QUIET=0; [ "$1" = "-q" ] && QUIET=1
pass=0; fail=0

# run_test ID "description" expected_exit "text that must appear" "text that must NOT appear" command...
run_test() {
    local id="$1" desc="$2" want_exit="$3" must="$4" mustnot="$5"; shift 5
    local out code
    out=$("$@" 2>&1); code=$?
    local ok=1
    [ "$code" -eq "$want_exit" ] || ok=0
    if [ -n "$must" ]; then
        local IFS='|'
        for piece in $must; do grep -qF -- "$piece" <<<"$out" || ok=0; done
        unset IFS
    fi
    if [ -n "$mustnot" ] && grep -qF -- "$mustnot" <<<"$out"; then ok=0; fi
    echo "=============================================================="
    echo "$id: $desc"
    echo "Command: $*"
    if [ $QUIET -eq 0 ]; then echo "--------------------------------------------------------------"; echo "$out"; fi
    echo "--------------------------------------------------------------"
    if [ $ok -eq 1 ]; then echo "$id RESULT: PASS (exit code $code)"; pass=$((pass+1))
    else echo "$id RESULT: FAIL (exit code $code, wanted $want_exit)"; fail=$((fail+1)); fi
}

# menu_test ID "description" "text typed" expected_exit "must appear" "must not appear"
menu_test() {
    local id="$1" desc="$2" typed="$3" want_exit="$4" must="$5" mustnot="$6"
    local out code
    out=$(printf "$typed" | $BIN 2>&1); code=$?
    local ok=1
    [ "$code" -eq "$want_exit" ] || ok=0
    local IFS='|'
    for piece in $must; do grep -qF -- "$piece" <<<"$out" || ok=0; done
    unset IFS
    if [ -n "$mustnot" ] && grep -qF -- "$mustnot" <<<"$out"; then ok=0; fi
    echo "=============================================================="
    echo "$id: $desc"
    echo "Typed into the menu: $(printf "$typed" | tr '\n' ' ')"
    if [ $QUIET -eq 0 ]; then echo "--------------------------------------------------------------"; echo "$out"; fi
    echo "--------------------------------------------------------------"
    if [ $ok -eq 1 ]; then echo "$id RESULT: PASS (exit code $code)"; pass=$((pass+1))
    else echo "$id RESULT: FAIL (exit code $code, wanted $want_exit)"; fail=$((fail+1)); fi
}

[ -x $BIN ] || { echo "Build first: make"; exit 1; }

# --- Tests on the tobacco graph from Question 1 ---------------------------------
run_test T01 "Balaka: must match the Question 3 working" 0 \
  "BT (Limbe floors)         153.6|BA -> MA -> ZA -> CR -> BT|204.7|BA -> NT -> DZ -> LL|335.7|Nearest floor: BT (Limbe floors), 153.6 km." "" \
  $BIN route BA

run_test T02 "Step-by-step trace from Balaka: must match Table 4 of Question 3" 0 \
  "22    NK (417.7)|BT = 153.6 (better than 231.0, so BT is updated and now comes from CR)|SA = 305.7 (better than 314.5" "" \
  $BIN trace BA

run_test T03 "A floor to itself (Lilongwe)" 0 \
  "Nearest floor: LL (Kanengo floors), 0.0 km." "" \
  $BIN route LL

run_test T04 "Ntcheu, a district between two floors" 0 \
  "LL (Kanengo floors)       162.2|BT (Limbe floors)         196.1|KA (Chinkhoma floors)     293.2|Nearest floor: LL" "" \
  $BIN route NT

run_test T05 "Changed route: Balaka to Salima goes through Lilongwe" 0 \
  "Distance: 305.7 km|Route: BA -> NT -> DZ -> LL -> SA" "" \
  $BIN path BA SA

run_test T06a "Undirected check, Nsanje to Mchinji" 0 "Distance: 617.6 km" "" $BIN path NJ MC
run_test T06b "Undirected check, Mchinji to Nsanje (same distance expected)" 0 "Distance: 617.6 km" "" $BIN path MC NJ

run_test T07 "Table of distances and catchment areas for all 22 districts" 0 \
  "Catchment areas|KA (Chinkhoma floors)|LL (Kanengo floors)|BT (Limbe floors)" "" \
  $BIN table

run_test T08a "Input as a lowercase code" 0 "Nearest floor: BT" "" $BIN route ba
run_test T08b "Input as a district name in capitals" 0 "Nearest floor: BT" "" $BIN route BALAKA
run_test T08c "Input with spaces around it" 0 "Nearest floor: BT" "" $BIN route "  Balaka  "

run_test T09 "Unknown district code" 1 "Error: 'XX' is not a district in this graph." "Shortest routes" $BIN route XX
run_test T10 "Missing argument" 1 "Error: unknown command or wrong number of arguments." "" $BIN route
run_test T11 "Unknown command" 1 "Error: unknown command" "" $BIN fly
run_test T12 "Second district unknown in path" 1 "Error: 'Mzuzu' is not a district in this graph." "" $BIN path BA Mzuzu

menu_test T13 "Menu: wrong choices, then a good one, then exit" 'abc\n9\n\n2\nba\n0\n' 0 \
  "Invalid choice 'abc'. Enter a number from 0 to 6.|Invalid choice '9'.|Invalid choice ''.|Nearest floor: BT (Limbe floors), 153.6 km.|Goodbye." ""
menu_test T14 "Menu: input ends without choosing 0 (Ctrl+D)" '1\n' 0 "22 districts, 27 roads." "Segmentation"
menu_test T15 "Menu: unknown district typed, then the menu carries on" '2\nlilongwee\n3\nZA\nBT\n0\n' 0 \
  "Error: 'lilongwee' is not a district|Distance: 69.3 km|Route: ZA -> CR -> BT|Goodbye." ""

run_test T16 "Dijkstra against Floyd-Warshall on all 484 combinations" 0 \
  "Checked 484 start/end combinations (22 x 22).|Result: PASS" "MISMATCH" $BIN verify

# --- Tests on small graphs loaded from files ------------------------------------
run_test T17a "Single edge graph, route from the non-floor node" 0 \
  "AA (Alpha floors)         12.5           BB -> AA|Nearest floor: AA (Alpha floors), 12.5 km." "" \
  $BIN --graph $G/single_edge.txt route BB
run_test T17b "Single edge graph, table" 0 "BB    Bravo             12.5   AA" "" $BIN --graph $G/single_edge.txt table

run_test T18a "Disconnected graph, node that cannot reach the floor" 0 \
  "unreachable|No auction floor can be reached from Delta." "" \
  $BIN --graph $G/disconnected.txt route DD
run_test T18b "Disconnected graph, table" 0 "none (not connected to any floor)|AA (Alpha floors), 3 districts: AA, BB, CC" "" \
  $BIN --graph $G/disconnected.txt table
run_test T18c "Disconnected graph, path between the two parts" 0 "No route: the two districts are not connected." "" \
  $BIN --graph $G/disconnected.txt path AA EE
run_test T18d "Disconnected graph, trace reports unreached nodes" 0 "2 node(s) could not be reached." "" \
  $BIN --graph $G/disconnected.txt trace AA
run_test T18e "Disconnected graph, verify still passes" 0 "Result: PASS" "" $BIN --graph $G/disconnected.txt verify

run_test T19 "Two routes with the same length (the first one found is kept)" 0 "Distance: 10.0 km|Route: SS -> BB -> FF" "" \
  $BIN --graph $G/tie.txt path SS FF

run_test T20 "Graph with no auction floor" 1 "Error: this graph has no auction floors." "" \
  $BIN --graph $G/no_floor.txt route AA

# --- Tests on wrong graph files -------------------------------------------------
run_test T21a "File with a negative distance" 2 "line 3: '-5' is not a valid distance" "" $BIN --graph $G/bad_negative.txt list
run_test T21b "File with a distance of 0" 2 "line 3: the distance must be greater than 0" "" $BIN --graph $G/bad_zero.txt list
run_test T21c "File with two decimal places" 2 "line 3: '0.25' has more than one decimal place" "" $BIN --graph $G/bad_decimals.txt list
run_test T21d "File with a word as distance" 2 "line 3: 'far' is not a valid distance" "" $BIN --graph $G/bad_text_distance.txt list
run_test T21e "File with a road to a node that does not exist" 2 "line 3: unknown node 'ZZ'" "" $BIN --graph $G/bad_unknown_node.txt list
run_test T21f "File with the same node twice" 2 "line 2: node AA is defined twice" "" $BIN --graph $G/bad_duplicate_node.txt list
run_test T21g "File with the same road twice" 2 "line 4: the road BB-AA is defined twice" "" $BIN --graph $G/bad_duplicate_edge.txt list
run_test T21h "File with a road from a node to itself" 2 "line 2: a road cannot join AA to itself" "" $BIN --graph $G/bad_self_loop.txt list
run_test T21i "File with an unknown keyword" 2 "line 2: unknown keyword 'ROAD'" "" $BIN --graph $G/bad_keyword.txt list
run_test T21j "File with a road line missing its distance" 2 "line 3: an EDGE line must look like" "" $BIN --graph $G/bad_missing_field.txt list
run_test T21k "File that has no nodes" 2 "the file has no nodes" "" $BIN --graph $G/empty.txt list
run_test T21l "File that does not exist" 2 "cannot open file 'nofile.txt'" "" $BIN --graph nofile.txt list
run_test T21m "--graph given without a file name" 1 "Error: --graph needs a file name." "" $BIN --graph

echo "=============================================================="
echo "SUMMARY: $pass passed, $fail failed"
[ $fail -eq 0 ]
