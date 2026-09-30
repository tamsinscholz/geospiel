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

# Nothing is generated or cached in this repo, so there is nothing to remove.
clean:
	@echo "Nothing to clean."

clean-all: clean
	@echo "Nothing to clean."
