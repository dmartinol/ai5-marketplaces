#!/usr/bin/env bash
#
# Install gitleaks pre-commit hook
#
# This script sets up gitleaks to run automatically before each commit
# to prevent sensitive data from being committed.
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "Gitleaks Pre-Commit Hook Installation"
echo "========================================="
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}Error: Not a git repository${NC}"
    echo "Run this script from the repository root"
    exit 1
fi

# Check if gitleaks is installed
if ! command -v gitleaks >/dev/null 2>&1; then
    echo -e "${YELLOW}Gitleaks not found.${NC} Installing..."
    echo ""

    # Detect OS and install
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew >/dev/null 2>&1; then
            echo "Installing via Homebrew..."
            brew install gitleaks
        else
            echo -e "${RED}Error: Homebrew not found${NC}"
            echo "Install gitleaks manually: https://github.com/gitleaks/gitleaks#installation"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "Downloading gitleaks binary..."
        GITLEAKS_VERSION="8.18.2"
        ARCH=$(uname -m)

        if [ "$ARCH" = "x86_64" ]; then
            ARCH="x64"
        elif [ "$ARCH" = "aarch64" ]; then
            ARCH="arm64"
        fi

        curl -sSfL "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_${ARCH}.tar.gz" | \
            tar -xz -C /tmp
        sudo mv /tmp/gitleaks /usr/local/bin/
        sudo chmod +x /usr/local/bin/gitleaks
    else
        echo -e "${RED}Error: Unsupported OS${NC}"
        echo "Install gitleaks manually: https://github.com/gitleaks/gitleaks#installation"
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} Gitleaks already installed: $(gitleaks version)"
fi

echo ""

# Create pre-commit hook
HOOK_FILE=".git/hooks/pre-commit"

# Backup existing hook if present
if [ -f "$HOOK_FILE" ]; then
    BACKUP="${HOOK_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
    echo -e "${YELLOW}Backing up existing hook to: $BACKUP${NC}"
    mv "$HOOK_FILE" "$BACKUP"
fi

# Write gitleaks pre-commit hook
cat > "$HOOK_FILE" << 'EOF'
#!/usr/bin/env bash
#
# Gitleaks pre-commit hook
# Scans staged changes for secrets before allowing commit
#

set -e

# Run gitleaks on staged changes
if ! gitleaks protect --staged --redact --verbose; then
    echo ""
    echo "========================================="
    echo "🚨 COMMIT BLOCKED - Secrets Detected"
    echo "========================================="
    echo ""
    echo "Gitleaks found potential secrets in your staged changes."
    echo ""
    echo "To fix:"
    echo "  1. Remove hardcoded secrets"
    echo "  2. Use environment variables: \${ENV_VAR}"
    echo "  3. Review .gitleaks.toml for allowed patterns"
    echo ""
    echo "To bypass (DANGEROUS - only for test fixtures):"
    echo "  git commit --no-verify"
    echo ""
    echo "For help: See SECURITY.md"
    echo "========================================="
    exit 1
fi

echo "✓ No secrets detected"
exit 0
EOF

chmod +x "$HOOK_FILE"

echo -e "${GREEN}✓${NC} Pre-commit hook installed: $HOOK_FILE"
echo ""

# Verify configuration exists
if [ ! -f ".gitleaks.toml" ]; then
    echo -e "${YELLOW}Warning: .gitleaks.toml not found${NC}"
    echo "Gitleaks will use default rules only"
else
    echo -e "${GREEN}✓${NC} Configuration found: .gitleaks.toml"
fi

echo ""
echo "========================================="
echo "Installation Complete"
echo "========================================="
echo ""
echo "Test the hook:"
echo "  1. Make a test commit with a secret"
echo "  2. Hook should block it"
echo ""
echo "Manual scan:"
echo "  gitleaks detect --source . --verbose"
echo ""
echo "Update hook:"
echo "  Re-run this script: scripts/install-hooks.sh"
echo ""
