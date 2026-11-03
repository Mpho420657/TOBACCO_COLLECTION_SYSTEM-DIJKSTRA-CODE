// Tobacco Collection Network of Central and Southern Malawi
// Dijkstra's algorithm: nearest auction floor for every district

#include <algorithm>
#include <cctype>
#include <climits>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <queue>
#include <sstream>
#include <string>
#include <vector>

using namespace std;

// Distances are stored in tenths of a kilometre (153.6 km is stored as 1536).
// Whole numbers add up exactly, so there are no rounding errors when we
// compare two routes.
typedef long long Dist;
const Dist INF = LLONG_MAX / 4;

struct Edge {
    int to;
    Dist w;
};

struct Node {
    string code;   // two-letter code, for example BA
    string name;   // district name, for example Balaka
    bool isFloor;  // true if this node is an auction floor
    string floorName;
};

struct Graph {
    vector<Node> nodes;
    vector<vector<Edge> > adj;  // adjacency list
    int edgeCount = 0;
};

// ---------------------------------------------------------------- helpers

string lower(string s) {
    for (size_t i = 0; i < s.size(); i++) s[i] = (char)tolower((unsigned char)s[i]);
    return s;
}

string upper(string s) {
    for (size_t i = 0; i < s.size(); i++) s[i] = (char)toupper((unsigned char)s[i]);
    return s;
}

string trim(const string& s) {
    size_t a = 0, b = s.size();
    while (a < b && isspace((unsigned char)s[a])) a++;
    while (b > a && isspace((unsigned char)s[b - 1])) b--;
    return s.substr(a, b - a);
}

// 1536 -> "153.6"
string fmt(Dist d) {
    return to_string(d / 10) + "." + to_string(d % 10);
}

// Reads a distance such as "52.3" or "89" into tenths of a km.
// Only positive numbers with at most one decimal place are accepted.
bool parseDist(const string& text, Dist& out, string& err) {
    if (text.empty()) { err = "the distance is missing"; return false; }
    size_t dot = text.find('.');
    string whole = text.substr(0, dot);
    string frac = (dot == string::npos) ? "0" : text.substr(dot + 1);
    if (whole.empty() || frac.empty() || whole.size() > 9 ||
        !all_of(whole.begin(), whole.end(), ::isdigit) ||
        !all_of(frac.begin(), frac.end(), ::isdigit)) {
        err = "'" + text + "' is not a valid distance";
        return false;
    }
    if (frac.size() > 1) {
        err = "'" + text + "' has more than one decimal place";
        return false;
    }
    out = stoll(whole) * 10 + (frac[0] - '0');
    if (out <= 0) { err = "the distance must be greater than 0"; return false; }
    return true;
}

// Finds a node by code or by district name (not case sensitive).
// Returns -1 if there is no such node.
int findNode(const Graph& g, const string& text) {
    string t = lower(trim(text));
    if (t.empty()) return -1;
    for (size_t i = 0; i < g.nodes.size(); i++)
        if (lower(g.nodes[i].code) == t || lower(g.nodes[i].name) == t) return (int)i;
    return -1;
}

string label(const Graph& g, int i) {
    return g.nodes[i].name + " (" + g.nodes[i].code + ")";
}

// ----------------------------------------------------------- building graphs

bool addNode(Graph& g, const string& code, const string& name, bool isFloor,
             const string& floorName, string& err) {
    string c = upper(code);
    if (c.empty() || c.size() > 8 ||
        !all_of(c.begin(), c.end(), ::isalnum)) {
        err = "'" + code + "' is not a valid node code (1 to 8 letters or digits)";
        return false;
    }
    for (size_t i = 0; i < g.nodes.size(); i++)
        if (g.nodes[i].code == c) { err = "node " + c + " is defined twice"; return false; }
    Node n;
    n.code = c; n.name = name; n.isFloor = isFloor; n.floorName = floorName;
    g.nodes.push_back(n);
    g.adj.push_back(vector<Edge>());
    return true;
}

bool addEdge(Graph& g, const string& a, const string& b, Dist w, string& err) {
    int u = findNode(g, a), v = findNode(g, b);
    if (u < 0) { err = "unknown node '" + a + "'"; return false; }
    if (v < 0) { err = "unknown node '" + b + "'"; return false; }
    if (u == v) { err = "a road cannot join " + upper(a) + " to itself"; return false; }
    for (size_t i = 0; i < g.adj[u].size(); i++)
        if (g.adj[u][i].to == v) {
            err = "the road " + g.nodes[u].code + "-" + g.nodes[v].code + " is defined twice";
            return false;
        }
    Edge e1 = {v, w}, e2 = {u, w};
    g.adj[u].push_back(e1);  // undirected: the road is stored in both directions
    g.adj[v].push_back(e2);
    g.edgeCount++;
    return true;
}

// The graph from Question 1: 22 districts, 27 roads, 3 auction floors.
Graph buildTobaccoGraph() {
    Graph g;
    string err;
    struct N { const char* c; const char* n; const char* floor; };
    const N nodes[] = {
        {"KA", "Kasungu", "Chinkhoma floors"}, {"LL", "Lilongwe", "Kanengo floors"},
        {"DW", "Dowa", ""}, {"DZ", "Dedza", ""}, {"MC", "Mchinji", ""},
        {"NK", "Nkhotakota", ""}, {"NS", "Ntchisi", ""}, {"NT", "Ntcheu", ""},
        {"SA", "Salima", ""}, {"BT", "Blantyre", "Limbe floors"},
        {"MA", "Machinga", ""}, {"MG", "Mangochi", ""}, {"NJ", "Nsanje", ""},
        {"PH", "Phalombe", ""}, {"ZA", "Zomba", ""}, {"BA", "Balaka", ""},
        {"CK", "Chikwawa", ""}, {"CR", "Chiradzulu", ""}, {"ML", "Mulanje", ""},
        {"MW", "Mwanza", ""}, {"NE", "Neno", ""}, {"TH", "Thyolo", ""}};
    for (size_t i = 0; i < sizeof(nodes) / sizeof(nodes[0]); i++)
        addNode(g, nodes[i].c, nodes[i].n, string(nodes[i].floor) != "", nodes[i].floor, err);

    struct E { const char* a; const char* b; Dist w; };  // w in tenths of a km
    const E edges[] = {
        {"KA", "LL", 1310}, {"LL", "MC", 1080}, {"LL", "DW", 523}, {"DW", "NS", 417},
        {"NS", "KA", 785},  {"LL", "SA", 1010}, {"SA", "NK", 1120}, {"NK", "KA", 1120},
        {"LL", "DZ", 890},  {"DZ", "NT", 732},  {"SA", "MG", 1730}, {"NT", "BA", 425},
        {"BA", "MA", 499},  {"MA", "MG", 916},  {"MA", "ZA", 344},  {"BA", "NE", 1230},
        {"NE", "BT", 1080}, {"NE", "MW", 400},  {"BT", "MW", 1040}, {"BT", "CR", 263},
        {"CR", "ZA", 430},  {"BT", "TH", 425},  {"TH", "ML", 441},  {"ML", "PH", 431},
        {"PH", "ZA", 761},  {"BT", "CK", 263},  {"CK", "NJ", 1250}};
    for (size_t i = 0; i < sizeof(edges) / sizeof(edges[0]); i++)
        addEdge(g, edges[i].a, edges[i].b, edges[i].w, err);
    return g;
}

// Reads a graph from a text file. Format (one item per line, # starts a comment):
//   NODE <code> <name> [FLOOR]
//   EDGE <code1> <code2> <distance in km>
// Returns false and sets err (with the line number) on the first mistake.
bool loadGraphFile(const string& path, Graph& g, string& err) {
    ifstream in(path.c_str());
    if (!in) { err = "cannot open file '" + path + "'"; return false; }
    g = Graph();
    string line;
    int lineNo = 0;
    while (getline(in, line)) {
        lineNo++;
        size_t hash = line.find('#');
        if (hash != string::npos) line = line.substr(0, hash);
        istringstream ss(line);
        vector<string> t;
        string w;
        while (ss >> w) t.push_back(w);
        if (t.empty()) continue;
        string e, kind = upper(t[0]);
        bool ok;
        if (kind == "NODE") {
            if (t.size() < 3 || t.size() > 4 || (t.size() == 4 && upper(t[3]) != "FLOOR")) {
                e = "a NODE line must look like: NODE <code> <name> [FLOOR]";
                ok = false;
            } else {
                string name = t[2];
                replace(name.begin(), name.end(), '_', ' ');
                ok = addNode(g, t[1], name, t.size() == 4, name + " floors", e);
            }
        } else if (kind == "EDGE") {
            Dist d = 0;
            if (t.size() != 4) {
                e = "an EDGE line must look like: EDGE <code1> <code2> <km>";
                ok = false;
            } else {
                ok = parseDist(t[3], d, e) && addEdge(g, t[1], t[2], d, e);
            }
        } else {
            e = "unknown keyword '" + t[0] + "'";
            ok = false;
        }
        if (!ok) { err = "line " + to_string(lineNo) + ": " + e; return false; }
    }
    if (g.nodes.empty()) { err = "the file has no nodes"; return false; }
    return true;
}

// ------------------------------------------------------------------ Dijkstra

struct Run {
    vector<Dist> dist;  // shortest known distance from the start
    vector<int> prev;   // the node we came from (-1 = none)
    int staleSkipped = 0;
};

// Dijkstra with a min-heap (priority queue). When a shorter route is found we
// push a new entry instead of changing the old one, so old entries can still
// be in the queue; they are skipped when they come out ("lazy deletion").
// If trace is true, every step is printed in the same layout as Table 4.
Run dijkstra(const Graph& g, int src, bool trace) {
    int n = (int)g.nodes.size();
    Run r;
    r.dist.assign(n, INF);
    r.prev.assign(n, -1);
    vector<bool> done(n, false);

    typedef pair<Dist, int> Item;  // (distance, node)
    priority_queue<Item, vector<Item>, greater<Item> > pq;
    r.dist[src] = 0;
    pq.push(Item(0, src));

    if (trace) {
        cout << "Dijkstra from " << label(g, src) << "\n";
        cout << left << setw(6) << "Step" << setw(26) << "Node finished (km)"
             << "What changes\n";
    }
    int step = 0;
    while (!pq.empty()) {
        Item top = pq.top();
        pq.pop();
        Dist d = top.first;
        int u = top.second;
        if (done[u] || d > r.dist[u]) {  // old entry, a shorter route was found later
            r.staleSkipped++;
            if (trace)
                cout << "      (skipped old queue entry: " << g.nodes[u].code << " " << fmt(d) << ")\n";
            continue;
        }
        done[u] = true;
        step++;

        string changes;
        for (size_t i = 0; i < g.adj[u].size(); i++) {
            int v = g.adj[u][i].to;
            if (done[v]) continue;
            Dist nd = d + g.adj[u][i].w;
            string vc = g.nodes[v].code, uc = g.nodes[u].code;
            if (nd < r.dist[v]) {
                if (trace) {
                    if (!changes.empty()) changes += "; ";
                    changes += vc + " = " + fmt(nd);
                    if (r.dist[v] != INF)
                        changes += " (better than " + fmt(r.dist[v]) + ", so " + vc +
                                   " is updated and now comes from " + uc + ")";
                }
                r.dist[v] = nd;
                r.prev[v] = u;
                pq.push(Item(nd, v));
            } else if (trace) {
                if (!changes.empty()) changes += "; ";
                changes += vc + " via " + uc + " = " + fmt(nd) + ", worse than " +
                           fmt(r.dist[v]) + ", so no change";
            }
        }
        if (trace) {
            if (changes.empty()) changes = "No change. All neighbours are already finished.";
            string who = g.nodes[u].code + " (" + fmt(d) + ")";
            if (g.nodes[u].isFloor) who += ", floor";
            cout << left << setw(6) << step << setw(26) << who << changes << "\n";
        }
    }
    return r;
}

// Route from the start node of the run to target, e.g. "BA -> MA -> ZA".
string routeText(const Graph& g, const Run& r, int target) {
    vector<int> p;
    for (int x = target; x != -1; x = r.prev[x]) p.push_back(x);
    reverse(p.begin(), p.end());
    string s;
    for (size_t i = 0; i < p.size(); i++) {
        if (i) s += " -> ";
        s += g.nodes[p[i]].code;
    }
    return s;
}

// Route from the target back to the start of the run (used for district -> floor).
string routeBack(const Graph& g, const Run& r, int from) {
    string s;
    for (int x = from; x != -1; x = r.prev[x]) {
        if (!s.empty()) s += " -> ";
        s += g.nodes[x].code;
    }
    return s;
}

vector<int> floorsOf(const Graph& g) {
    vector<int> f;
    for (size_t i = 0; i < g.nodes.size(); i++)
        if (g.nodes[i].isFloor) f.push_back((int)i);
    return f;
}

// ------------------------------------------------------------------ commands

void cmdList(const Graph& g) {
    cout << g.nodes.size() << " districts, " << g.edgeCount << " roads.\n";
    cout << left << setw(6) << "Code" << setw(16) << "District" << "Auction floor\n";
    for (size_t i = 0; i < g.nodes.size(); i++)
        cout << left << setw(6) << g.nodes[i].code << setw(16) << g.nodes[i].name
             << (g.nodes[i].isFloor ? g.nodes[i].floorName : "") << "\n";
}

// Nearest floor for one district: Dijkstra is run from that district.
bool cmdRoute(const Graph& g, const string& text) {
    int s = findNode(g, text);
    if (s < 0) {
        cerr << "Error: '" << trim(text) << "' is not a district in this graph. "
             << "Use 'list' to see the codes.\n";
        return false;
    }
    vector<int> fl = floorsOf(g);
    if (fl.empty()) { cerr << "Error: this graph has no auction floors.\n"; return false; }
    Run r = dijkstra(g, s, false);

    vector<int> order = fl;  // nearest first
    sort(order.begin(), order.end(), [&](int a, int b) { return r.dist[a] < r.dist[b]; });

    cout << "Shortest routes from " << label(g, s) << " to the auction floors\n";
    cout << left << setw(26) << "Floor" << setw(15) << "Distance (km)" << "Route\n";
    for (size_t i = 0; i < order.size(); i++) {
        int f = order[i];
        string name = g.nodes[f].code + " (" + g.nodes[f].floorName + ")";
        cout << left << setw(26) << name;
        if (r.dist[f] >= INF) cout << setw(15) << "unreachable" << "-\n";
        else cout << setw(15) << fmt(r.dist[f]) << routeText(g, r, f) << "\n";
    }
    if (r.dist[order[0]] >= INF)
        cout << "No auction floor can be reached from " << g.nodes[s].name << ".\n";
    else
        cout << "Nearest floor: " << g.nodes[order[0]].code << " (" << g.nodes[order[0]].floorName
             << "), " << fmt(r.dist[order[0]]) << " km.\n";
    return true;
}

bool cmdPath(const Graph& g, const string& a, const string& b) {
    int s = findNode(g, a), t = findNode(g, b);
    if (s < 0 || t < 0) {
        cerr << "Error: '" << trim(s < 0 ? a : b) << "' is not a district in this graph. "
             << "Use 'list' to see the codes.\n";
        return false;
    }
    Run r = dijkstra(g, s, false);
    cout << "Shortest route from " << label(g, s) << " to " << label(g, t) << "\n";
    if (r.dist[t] >= INF) { cout << "No route: the two districts are not connected.\n"; return true; }
    cout << "Distance: " << fmt(r.dist[t]) << " km\n";
    cout << "Route: " << routeText(g, r, t) << "\n";
    return true;
}

bool cmdTrace(const Graph& g, const string& text) {
    int s = findNode(g, text);
    if (s < 0) {
        cerr << "Error: '" << trim(text) << "' is not a district in this graph. "
             << "Use 'list' to see the codes.\n";
        return false;
    }
    Run r = dijkstra(g, s, true);
    int unreached = 0;
    for (size_t i = 0; i < g.nodes.size(); i++)
        if (r.dist[i] >= INF) unreached++;
    if (unreached > 0) cout << unreached << " node(s) could not be reached.\n";
    return true;
}

// Catchment table: Dijkstra is run once from each floor. The graph is
// undirected, so the distance from a floor to a district is also the distance
// from the district to that floor.
bool cmdTable(const Graph& g) {
    vector<int> fl = floorsOf(g);
    if (fl.empty()) { cerr << "Error: this graph has no auction floors.\n"; return false; }
    vector<Run> runs;
    for (size_t i = 0; i < fl.size(); i++) runs.push_back(dijkstra(g, fl[i], false));

    cout << left << setw(6) << "Code" << setw(14) << "District";
    for (size_t i = 0; i < fl.size(); i++) cout << right << setw(8) << g.nodes[fl[i]].code;
    cout << "   Nearest\n";

    vector<vector<int> > catchment(fl.size());
    for (size_t v = 0; v < g.nodes.size(); v++) {
        cout << left << setw(6) << g.nodes[v].code << setw(14) << g.nodes[v].name;
        int best = -1;
        for (size_t i = 0; i < fl.size(); i++) {
            Dist d = runs[i].dist[v];
            cout << right << setw(8) << (d >= INF ? string("-") : fmt(d));
            if (d < INF && (best < 0 || d < runs[best].dist[v])) best = (int)i;
        }
        if (best < 0) cout << "   none (not connected to any floor)\n";
        else {
            cout << "   " << g.nodes[fl[best]].code << "\n";
            catchment[best].push_back((int)v);
        }
    }
    cout << "\nCatchment areas (nearest floor)\n";
    for (size_t i = 0; i < fl.size(); i++) {
        cout << g.nodes[fl[i]].code << " (" << g.nodes[fl[i]].floorName << "), "
             << catchment[i].size() << " districts: ";
        for (size_t k = 0; k < catchment[i].size(); k++)
            cout << (k ? ", " : "") << g.nodes[catchment[i][k]].code;
        cout << "\n";
    }
    return true;
}

// Checks Dijkstra against Floyd-Warshall (a different algorithm) for every pair.
bool cmdVerify(const Graph& g) {
    int n = (int)g.nodes.size();
    vector<vector<Dist> > fw(n, vector<Dist>(n, INF));
    for (int i = 0; i < n; i++) {
        fw[i][i] = 0;
        for (size_t k = 0; k < g.adj[i].size(); k++)
            fw[i][g.adj[i][k].to] = min(fw[i][g.adj[i][k].to], g.adj[i][k].w);
    }
    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (fw[i][k] < INF && fw[k][j] < INF && fw[i][k] + fw[k][j] < fw[i][j])
                    fw[i][j] = fw[i][k] + fw[k][j];

    int pairs = 0, bad = 0;
    for (int s = 0; s < n; s++) {
        Run r = dijkstra(g, s, false);
        for (int t = 0; t < n; t++) {
            pairs++;
            bool ok = (r.dist[t] == fw[s][t]);
            // the stored route must also add up to the stored distance
            if (ok && r.dist[t] < INF) {
                Dist sum = 0;
                for (int x = t; r.prev[x] != -1; x = r.prev[x]) {
                    int p = r.prev[x];
                    for (size_t k = 0; k < g.adj[p].size(); k++)
                        if (g.adj[p][k].to == x) sum += g.adj[p][k].w;
                }
                ok = (sum == r.dist[t]);
            }
            if (!ok) {
                bad++;
                cout << "MISMATCH " << g.nodes[s].code << " -> " << g.nodes[t].code << "\n";
            }
        }
    }
    cout << "Checked " << pairs << " start/end combinations (" << n << " x " << n << ").\n";
    if (bad == 0) cout << "Dijkstra and Floyd-Warshall agree on every one. Result: PASS\n";
    else cout << bad << " mismatches. Result: FAIL\n";
    return bad == 0;
}

void printHelp() {
    cout << "Usage: tobacco [--graph file] [command]\n"
         << "  (no command)          menu\n"
         << "  list                  list all districts and the auction floors\n"
         << "  route <district>      nearest auction floor and routes to all floors\n"
         << "  path <from> <to>      shortest route between any two districts\n"
         << "  table                 distances to every floor and catchment areas\n"
         << "  trace <district>      Dijkstra step by step\n"
         << "  verify                check Dijkstra against Floyd-Warshall\n"
         << "  help                  this text\n"
         << "A district can be given as a code (BA) or a name (Balaka), in any case.\n"
         << "--graph file loads another graph (see README.md for the file format).\n";
}

bool readLine(const string& prompt, string& out) {
    cout << prompt << flush;
    if (!getline(cin, out)) { cout << "\n"; return false; }
    return true;
}

void menu(const Graph& g) {
    string choice, a, b;
    for (;;) {
        cout << "\n=== Tobacco collection network: Dijkstra ===\n"
             << "1. List all districts\n"
             << "2. Nearest auction floor for a district\n"
             << "3. Shortest route between two districts\n"
             << "4. Distances to all floors and catchment areas\n"
             << "5. Show Dijkstra step by step from a district\n"
             << "6. Check Dijkstra against Floyd-Warshall\n"
             << "0. Exit\n";
        if (!readLine("Choose an option: ", choice)) return;
        choice = trim(choice);
        if (choice == "0") { cout << "Goodbye.\n"; return; }
        else if (choice == "1") cmdList(g);
        else if (choice == "2") { if (readLine("District code or name: ", a)) cmdRoute(g, a); }
        else if (choice == "3") {
            if (readLine("From (code or name): ", a) && readLine("To (code or name): ", b))
                cmdPath(g, a, b);
        }
        else if (choice == "4") cmdTable(g);
        else if (choice == "5") { if (readLine("District code or name: ", a)) cmdTrace(g, a); }
        else if (choice == "6") cmdVerify(g);
        else cerr << "Invalid choice '" << choice << "'. Enter a number from 0 to 6.\n";
    }
}

// ---------------------------------------------------------------------- main

int main(int argc, char* argv[]) {
    vector<string> args;
    string graphFile;
    for (int i = 1; i < argc; i++) {
        string a = argv[i];
        if (a == "--graph") {
            if (i + 1 >= argc) { cerr << "Error: --graph needs a file name.\n"; return 1; }
            graphFile = argv[++i];
        } else args.push_back(a);
    }

    Graph g;
    if (graphFile.empty()) g = buildTobaccoGraph();
    else {
        string err;
        if (!loadGraphFile(graphFile, g, err)) {
            cerr << "Error in graph file: " << err << "\n";
            return 2;
        }
    }

    if (args.empty()) { menu(g); return 0; }

    string cmd = lower(args[0]);
    bool ok = true;
    if (cmd == "help") printHelp();
    else if (cmd == "list") cmdList(g);
    else if (cmd == "table") ok = cmdTable(g);
    else if (cmd == "verify") ok = cmdVerify(g);
    else if (cmd == "route" && args.size() == 2) ok = cmdRoute(g, args[1]);
    else if (cmd == "trace" && args.size() == 2) ok = cmdTrace(g, args[1]);
    else if (cmd == "path" && args.size() == 3) ok = cmdPath(g, args[1], args[2]);
    else {
        cerr << "Error: unknown command or wrong number of arguments. Try: tobacco help\n";
        return 1;
    }
    return ok ? 0 : 1;
}
