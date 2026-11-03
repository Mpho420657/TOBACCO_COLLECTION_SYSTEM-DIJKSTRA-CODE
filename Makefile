# make        builds the program
# make test   builds and runs all tests
# make run    builds and starts the menu
CXX      = g++
CXXFLAGS = -std=c++17 -O2 -Wall -Wextra

tobacco: tobacco_dijkstra.cpp
	$(CXX) $(CXXFLAGS) -o tobacco tobacco_dijkstra.cpp

test: tobacco
	bash tests/run_tests.sh

run: tobacco
	./tobacco

clean:
	rm -f tobacco
