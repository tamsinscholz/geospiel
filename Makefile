.PHONY: install run test clean clean-all

# There are no dependencies: the app is vanilla JS served as static files, and
# the tests run on Node's built-in test runner. Nothing to install.
install:
	@echo "No dependencies to install (no npm, no build step)."

# Serve the app; open http://localhost:8000
run:
	python3 -m http.server 8000

test:
	node --test test/

# The only cache is tools/vendor-germany-data.sh's download cache (GISCO
# GeoJSON + raw Commons SVGs); it is re-downloaded on the next run. The vendored
# data/ and wappen/ outputs are committed and never cleaned.
clean:
	rm -rf tools/.cache

clean-all: clean
