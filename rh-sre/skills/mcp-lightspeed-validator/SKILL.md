---
name: mcp-lightspeed-validator
description: |
  This skill should be used when the user asks to "validate Lightspeed MCP", "check if Lightspeed is configured", "verify Lightspeed connection", "test Lightspeed MCP server", or when other skills need to verify lightspeed-mcp availability before executing operations.
model: haiku
color: yellow
---

# MCP Lightspeed Validator

Validates that the Red Hat Lightspeed MCP server is properly configured, environment variables are set, and the server is accessible without exposing credential values.

## When to Use This Skill

Use this skill when:
- Validating Lightspeed MCP server configuration before CVE operations
- Troubleshooting connection issues with Red Hat Lightspeed platform
- Verifying environment setup for vulnerability management workflows
- Other skills need to confirm lightspeed-mcp availability as a prerequisite

Do NOT use when:
- Performing actual CVE queries → Use `cve-impact` or `cve-validation` skills instead
- Generating remediation playbooks → Use `playbook-generator` skill instead

## Important: MCP Server Naming

The Lightspeed MCP server has two different names depending on context:

| Context | Server Name | Usage |
|---------|-------------|-------|
| **Configuration** (.mcp.json file) | `lightspeed-mcp` | Check this name in the config file |
| **Runtime** (MCP tool invocations) | `plugin:sre-agents:lightspeed-mcp` | Use this name when calling MCP tools |

**Why the difference?**
- The `.mcp.json` file defines the server as `lightspeed-mcp` (short name)
- Claude Code registers it with the plugin namespace prefix: `plugin:sre-agents:lightspeed-mcp`
- Always use the runtime name when invoking MCP tools to avoid "Server not found" errors

## Validation Freshness Policy

**Can skills skip validation if it was just performed?**

**Simple rule**: Validation results are trusted **for the current session only**.

### When to Skip Validation

✅ **Skip if** validation was performed earlier in this same conversation session and succeeded (PASSED or PARTIAL)

Example:
```
User: "Validate Lightspeed MCP"
→ mcp-lightspeed-validator runs → PASSED

User: "Show the fleet inventory"
→ Skip validation (already validated this session)
→ Proceed directly to query
```

### When to Re-validate

❌ **Always re-validate if**:
- New conversation session
- Previous validation FAILED
- User explicitly requests validation
- MCP tool error occurred (suggests server state changed)

### Communicating to User

When skipping, briefly inform the user:
```
✓ Using validated Lightspeed MCP connection (validated earlier this session)
Proceeding with fleet inventory query...
```

**Rationale**: Session-scoped validation balances performance (avoid redundant checks) with safety (re-check if environment may have changed).

## Workflow

### Step 1: Check MCP Server Configuration

**Action**: Verify that `lightspeed-mcp` exists in [.mcp.json](../../.mcp.json)

**Important**: MCP server naming distinction:
- **Configuration name** (in .mcp.json): `lightspeed-mcp`
- **Runtime name** (when invoking tools): `plugin:sre-agents:lightspeed-mcp`

The configuration file uses the short name, but Claude Code registers it with the plugin namespace prefix at runtime.

**How to verify**:
1. Read the `.mcp.json` file in the rh-sre directory
2. Check if `mcpServers` object contains a `lightspeed-mcp` key (config name)
3. Verify the server configuration has `command` and `args` fields

**Expected result**: Configuration exists with proper structure

**Report to user**:
- ✓ "MCP server `lightspeed-mcp` is configured in .mcp.json"
- ✗ "MCP server `lightspeed-mcp` not found in .mcp.json"

**If missing**: Proceed to Human Notification Protocol (Step 4)

### Step 2: Check Environment Variables

**CRITICAL SECURITY REQUIREMENT**: NEVER expose environment variable values in output

**Action**: Verify required environment variables are set without displaying their values

**Required variables**:
- `LIGHTSPEED_CLIENT_ID`
- `LIGHTSPEED_CLIENT_SECRET`

**How to verify** (use bash test commands):
```bash
# Check if environment variables are set (boolean check only)
if [ -n "$LIGHTSPEED_CLIENT_ID" ] && [ -n "$LIGHTSPEED_CLIENT_SECRET" ]; then
    echo "✓ Environment variables are configured"
else
    echo "✗ Missing environment variables"
    # Report which specific variables are missing
    if [ -z "$LIGHTSPEED_CLIENT_ID" ]; then
        echo "  Missing: LIGHTSPEED_CLIENT_ID"
    fi
    if [ -z "$LIGHTSPEED_CLIENT_SECRET" ]; then
        echo "  Missing: LIGHTSPEED_CLIENT_SECRET"
    fi
fi
```

**NEVER do this** (exposes credentials):
```bash
# ❌ WRONG - This exposes credential values
echo $LIGHTSPEED_CLIENT_ID
echo $LIGHTSPEED_CLIENT_SECRET
```

**Report to user**:
- ✓ "Environment variable LIGHTSPEED_CLIENT_ID is set"
- ✓ "Environment variable LIGHTSPEED_CLIENT_SECRET is set"
- ✗ "Environment variable LIGHTSPEED_CLIENT_ID is not set"
- ✗ "Environment variable LIGHTSPEED_CLIENT_SECRET is not set"

**If missing**: Proceed to Human Notification Protocol (Step 4)

### Step 3: Test MCP Server Connection (Optional)

**Note**: This step attempts to verify server connectivity by listing available MCP tools. If tool invocation is not possible, skip to Step 5 with a PARTIAL validation result.

**Action**: List available MCP tools from lightspeed-mcp server and validate required tools exist

**CRITICAL**: When invoking MCP tools, use the **runtime server name**: `plugin:sre-agents:lightspeed-mcp`
- ✓ Correct: `ListMcpResourcesTool(server="plugin:sre-agents:lightspeed-mcp")`
- ✗ Wrong: `ListMcpResourcesTool(server="lightspeed-mcp")` - This will fail with "Server not found"

**Required Tools** (used across rh-sre skills):

**Vulnerability Toolset**:
- `get_cves` or `vulnerability__get_cves` - List/query CVEs
- `get_cve` or `vulnerability__get_cve` - Get specific CVE details
- `get_cve_systems` or `vulnerability__get_cve_systems` - Find systems affected by CVEs

**Inventory Toolset**:
- `get_host_details` or `inventory__get_host_details` - Retrieve system inventory

**Remediations Toolset**:
- `create_vulnerability_playbook` or `remediations__create_vulnerability_playbook` - Generate Ansible playbooks

**How to verify**:
1. Use `ListMcpResourcesTool` with server name `plugin:sre-agents:lightspeed-mcp` (runtime name)
2. Check that the server responds (connectivity test)
3. Verify required tools are present in the response
4. Tools may appear with or without toolset prefix (both are valid)

**Example tool invocation**:
```
ListMcpResourcesTool(server="plugin:sre-agents:lightspeed-mcp")
```

**Common error**: Using `server="lightspeed-mcp"` will fail with "Server not found" because the runtime name includes the plugin namespace prefix.

**Validation logic**:
```python
required_tools = [
    'get_cves', 'get_cve', 'get_cve_systems',  # Vulnerability
    'get_host_details',                         # Inventory
    'create_vulnerability_playbook'             # Remediations
]

# Check if tool exists with or without prefix
for tool in required_tools:
    if not (tool in available_tools or f"*__{tool}" in available_tools):
        missing_tools.append(tool)
```

**Report to user**:
- ✓ "Successfully connected to lightspeed-mcp server"
- ✓ "All required MCP tools are available (5/5 tools validated)"
- ⚠ "Successfully connected but some tools are missing: `get_cves`, `create_vulnerability_playbook` (3/5 tools available)"
- ⚠ "Server connectivity test unavailable (cannot invoke MCP tools directly)"
- ✗ "Cannot connect to lightspeed-mcp server (check container status)"

**If all tools present**: Report SUCCESS
**If some tools missing**: Report PARTIAL with warning about missing tools
**If connection fails**: Proceed to Human Notification Protocol (Step 4)
**If test unavailable**: Skip to Step 5 with PARTIAL result

### Step 4: Human Notification Protocol

When validation fails, follow this protocol:

**1. Stop Execution Immediately** - Do not attempt MCP tool calls

**2. Report Clear Error**:

For missing MCP server configuration:
```
❌ Cannot validate lightspeed-mcp: Server not configured in .mcp.json

📋 Setup Instructions:
1. Add lightspeed-mcp configuration to rh-sre/.mcp.json
2. Configuration template:
   {
     "mcpServers": {
       "lightspeed-mcp": {
         "command": "podman",
         "args": ["run", "-i", "--rm", "..."],
         "env": {
           "LIGHTSPEED_CLIENT_ID": "${LIGHTSPEED_CLIENT_ID}",
           "LIGHTSPEED_CLIENT_SECRET": "${LIGHTSPEED_CLIENT_SECRET}"
         }
       }
     }
   }

🔗 Documentation: https://github.com/RedHatInsights/insights-mcp
```

For missing environment variables:
```
❌ Cannot validate lightspeed-mcp: Required environment variables not set

📋 Missing variables:
- LIGHTSPEED_CLIENT_ID
- LIGHTSPEED_CLIENT_SECRET

Setup instructions:
1. Follow instructions from:
   https://github.com/RedHatInsights/insights-mcp

2. Set environment variables:
   export LIGHTSPEED_CLIENT_ID="your-client-id"
   export LIGHTSPEED_CLIENT_SECRET="your-client-secret"

3. Restart Claude Code to reload environment

⚠️ SECURITY: Never commit credentials to git or expose them in output
```

For connection failures:
```
❌ Cannot connect to lightspeed-mcp server

📋 Troubleshooting steps:
1. Check if container is running:
   podman ps | grep lightspeed

2. Check container logs:
   podman logs <container-id>

3. Verify network connectivity:
   curl -I https://console.redhat.com

4. Restart the MCP server or Claude Code
```

**3. Request User Decision**:
```
❓ How would you like to proceed?

Options:
- "setup" - Help me configure the MCP server now
- "skip" - Skip validation and try the operation anyway
- "abort" - Stop the workflow entirely

Please respond with your choice.
```

**4. Wait for Explicit User Input** - Do not proceed automatically

### Step 5: Validation Summary

**Action**: Report overall validation status

**Success case** (all checks passed):
```
✓ Lightspeed MCP Validation: PASSED

Configuration:
✓ MCP server configured in .mcp.json
✓ Environment variable LIGHTSPEED_CLIENT_ID is set
✓ Environment variable LIGHTSPEED_CLIENT_SECRET is set
✓ Server connectivity verified
✓ All required MCP tools available (5/5 tools validated)

Ready to execute Lightspeed MCP operations.
```

**Partial success case 1** (connectivity test unavailable):
```
⚠ Lightspeed MCP Validation: PARTIAL

Configuration:
✓ MCP server configured in .mcp.json
✓ Environment variable LIGHTSPEED_CLIENT_ID is set
✓ Environment variable LIGHTSPEED_CLIENT_SECRET is set
⚠ Server connectivity test unavailable (cannot invoke MCP tools directly)

Note: Configuration appears correct, but connectivity could not be tested.
You may proceed with caution - operations may fail if server is not running.
```

**Partial success case 2** (some tools missing):
```
⚠ Lightspeed MCP Validation: PARTIAL

Configuration:
✓ MCP server configured in .mcp.json
✓ Environment variable LIGHTSPEED_CLIENT_ID is set
✓ Environment variable LIGHTSPEED_CLIENT_SECRET is set
✓ Server connectivity verified
⚠ Some MCP tools are missing (3/5 tools available)
   Missing: get_cves, create_vulnerability_playbook

Note: Server is accessible but not all expected tools are available.
Some skills may fail if they require the missing tools.
You may proceed with limited functionality.
```

**Failure case**:
```
✗ Lightspeed MCP Validation: FAILED

Issues found:
✗ [Specific issue 1]
✗ [Specific issue 2]

See troubleshooting steps above.
```

## Dependencies

### Required Files
- [.mcp.json](../../.mcp.json) - MCP server configuration file (path is relative to skill location)

### Reference Documentation
- None required (validation skill)

## Example Usage

### Example 1: Pre-flight Check Before CVE Operations

**User Query**: "Validate my Lightspeed MCP setup before running CVE analysis"

**Skill Response**:
```
I'll validate your Lightspeed MCP configuration.

Checking MCP server configuration...
✓ MCP server `lightspeed-mcp` is configured in .mcp.json

Checking environment variables...
✓ Environment variable LIGHTSPEED_CLIENT_ID is set
✓ Environment variable LIGHTSPEED_CLIENT_SECRET is set

Testing server connectivity...
⚠ Server connectivity test unavailable (cannot invoke MCP tools directly)

✓ Lightspeed MCP Validation: PARTIAL

Configuration:
✓ MCP server configured in .mcp.json
✓ Environment variables are set
⚠ Server connectivity could not be tested

Your Lightspeed MCP configuration appears correct. You can proceed with CVE operations.
```

### Example 2: Validation Failure - Missing Environment Variables

**User Query**: "Check if Lightspeed is ready"

**Skill Response**:
```
I'll validate your Lightspeed MCP configuration.

Checking MCP server configuration...
✓ MCP server `lightspeed-mcp` is configured in .mcp.json

Checking environment variables...
✗ Environment variable LIGHTSPEED_CLIENT_ID is not set
✗ Environment variable LIGHTSPEED_CLIENT_SECRET is not set

❌ Cannot validate lightspeed-mcp: Required environment variables not set

📋 Missing variables:
- LIGHTSPEED_CLIENT_ID
- LIGHTSPEED_CLIENT_SECRET

Setup instructions:
1. Obtain credentials from Red Hat Console:
   https://console.redhat.com/settings/integrations

2. Set environment variables:
   export LIGHTSPEED_CLIENT_ID="your-client-id"
   export LIGHTSPEED_CLIENT_SECRET="your-client-secret"

3. Restart Claude Code to reload environment

⚠️ SECURITY: Never commit credentials to git or expose them in output

❓ How would you like to proceed?

Options:
- "setup" - Help me configure the MCP server now
- "skip" - Skip validation and try the operation anyway
- "abort" - Stop the workflow entirely

Please respond with your choice.
```

### Example 3: Invoked by Another Skill

**Context**: The `cve-impact` skill invokes this validator before attempting CVE queries

**Internal workflow**:
```
[cve-impact skill] → [Invoke mcp-lightspeed-validator]
                  ← [Validation result: PASSED/FAILED]
[cve-impact skill] → [If PASSED: proceed with CVE query]
                   → [If FAILED: report to user, ask for decision]
```

This skill provides a reusable validation check that other skills can invoke as a prerequisite before Lightspeed MCP operations.
