Agentic packs to automate interaction with Red Hat platforms and products for various marketplaces.


| Agentic Pack | Persona/Role | Marketplaces |
|--------------|--------------|--------------|
| [Red Hat SRE](rh-sre/README.md) | SRE | Claude code, Cursor |
| [Red Hat Developer](rh-developer/README.md) | Developer | Claude code, Cursor |
| [OpenShift Administration](ocp-admin/README.md) | OpenShift Administration | Claude code, Cursor |
| [Red Hat Support Engineer](rh-support-engineer/README.md) | Support Engineer | Claude code, Cursor, ChatGPT |
| [Red Hat Virtualization](rh-virt/README.md) | Virt Admin | Claude code, Cursor |

## Security

This repository uses [gitleaks](https://github.com/gitleaks/gitleaks) to prevent accidental commits of sensitive data.

### Quick Start

```bash
# Install gitleaks and pre-commit hook (one-time setup)
scripts/install-hooks.sh
```

### What's Protected

- **API keys**: OpenAI, GitHub, AWS, Google Cloud
- **Private keys**: SSH, SSL/TLS certificates
- **Hardcoded credentials** in `.mcp.json` files
- **Database connection strings** with passwords
- **JWT tokens** and authentication secrets

### MCP Configuration Rules

✅ **CORRECT** - Use environment variable references:
```json
{
  "env": {
    "LIGHTSPEED_CLIENT_ID": "${LIGHTSPEED_CLIENT_ID}",
    "LIGHTSPEED_CLIENT_SECRET": "${LIGHTSPEED_CLIENT_SECRET}"
  }
}
```

❌ **BLOCKED** - Hardcoded values:
```json
{
  "env": {
    "LIGHTSPEED_CLIENT_SECRET": "sk-proj-abc123..."
  }
}
```

### Manual Scanning

```bash
# Scan entire repository history
gitleaks detect --source . --verbose

# Scan only staged changes
gitleaks protect --staged
```

See [SECURITY.md](SECURITY.md) for details.

