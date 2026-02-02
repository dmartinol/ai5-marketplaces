.PHONY: help install validate generate serve clean test test-full

help:
	@echo "ai5-marketplaces Documentation Generator"
	@echo ""
	@echo "Available targets:"
	@echo "  install     - Install Python dependencies"
	@echo "  validate    - Validate pack structure"
	@echo "  generate    - Generate docs/data.json"
	@echo "  serve       - Start local server on http://localhost:8000"
	@echo "  test        - Quick test (validate + generate + verify)"
	@echo "  test-full   - Full test suite (test + serve with browser open)"
	@echo "  clean       - Remove generated files"
	@echo "  update      - Full update (validate + generate)"

install:
	@echo "Installing Python dependencies..."
	@pip install -q -r scripts/requirements.txt
	@echo "Dependencies installed!"

validate:
	@echo "Validating agentic pack structure..."
	@python scripts/validate_structure.py
	@echo "✓ Validation passed!"

generate:
	@echo "Generating documentation..."
	@python scripts/build_website.py
	@echo "✓ Documentation generated in docs/"

serve:
	@echo "Starting local server on http://localhost:8000"
	@echo "Press Ctrl+C to stop the server"
	@cd docs && python -m http.server 8000

clean:
	@echo "Cleaning generated files..."
	@rm -f docs/data.json
	@echo "✓ Cleaned!"

test: validate generate
	@echo ""
	@echo "Running verification checks..."
	@./scripts/test_local.sh
	@echo ""
	@echo "✓ All tests passed!"
	@echo ""
	@echo "To view the site locally, run: make serve"

test-full: test
	@echo ""
	@echo "Opening browser and starting server..."
	@(sleep 2 && open http://localhost:8000) &
	@make serve

update: validate generate
	@echo "✓ Documentation updated successfully!"
