---
name: mcp-ansible-validator
description: |
  This skill should be used when the user asks to "validate Ansible MCP", "check if Ansible MCP is configured", "verify ansible-mcp-server", "test Ansible connection", or when other skills need to verify ansible-mcp-server availability before executing playbook operations.
model: haiku
color: yellow
---

# MCP Ansible Validator

Validates that the Ansible MCP server is properly configured and accessible for playbook execution operations. Note that ansible-mcp-server is currently a mock implementation for testing.

## When to Use This Skill

Use this skill when:
- Validating Ansible MCP server configuration before playbook execution
- Troubleshooting connection issues with ansible-mcp-server
- Verifying environment setup for remediation workflows
- Other skills need to confirm ansible-mcp-server availability as a prerequisite

Do NOT use when:
- Executing actual playbooks → Use `playbook-executor` skill instead
- Generating playbooks → Use `playbook-generator` skill instead
- Verifying playbook results → Use `remediation-verifier` skill instead

## Workflow

### Step 1: Check MCP Server Configuration

**Action**: Verify that `ansible-mcp-server` exists in [.mcp.json](../../.mcp.json)

**How to verify**:
1. Read the `.mcp.json` file in the rh-sre directory
2. Check if `mcpServers` object contains an `ansible-mcp-server` key
3. Verify the server configuration has `command` and `args` fields

**Expected result**: Configuration exists with proper structure

**Report to user**:
- ✓ "MCP server `ansible-mcp-server` is configured in .mcp.json"
- ✗ "MCP server `ansible-mcp-server` not found in .mcp.json"

**If missing**: Proceed to Human Notification Protocol (Step 3)

### Step 2: Test MCP Server Connection

**Note**: This step attempts to verify server connectivity. If tool invocation fails, report this to the user and provide troubleshooting guidance.

**Action**: Attempt a health check or basic tool invocation to verify server accessibility

**Possible approaches**:
1. Try listing available MCP tools from ansible-mcp-server
2. If execute_playbook or get_job_status tools exist, verify they can be invoked (without executing actual playbooks)
3. If no health check is available, report that configuration exists but connectivity cannot be tested

**Report to user**:
- ✓ "Successfully connected to ansible-mcp-server"
- ⚠ "Configuration appears correct but connectivity test unavailable"
- ✗ "Cannot connect to ansible-mcp-server (check if server is running)"

**If connection fails**: Proceed to Human Notification Protocol (Step 3)

### Step 3: Human Notification Protocol

When validation fails, follow this protocol:

**1. Stop Execution Immediately** - Do not attempt MCP tool calls

**2. Report Clear Error**:

For missing MCP server configuration:
```
❌ Cannot validate ansible-mcp-server: Server not configured in .mcp.json

📋 Setup Instructions:
1. Add ansible-mcp-server configuration to rh-sre/.mcp.json
2. Configuration template:
   {
     "mcpServers": {
       "ansible-mcp-server": {
         "command": "npx",
         "args": ["-y", "@ansible/mcp-server"]
       }
     }
   }

📝 Note: ansible-mcp-server is currently a mock implementation for testing
         playbook execution workflows. Full Ansible integration coming soon.

🔗 Documentation: See rh-sre/README.md for MCP server setup
```

For connection failures:
```
❌ Cannot connect to ansible-mcp-server

📋 Troubleshooting steps:
1. Check if MCP server is running:
   - Verify Claude Code can access npx command
   - Check if @ansible/mcp-server package is available

2. Check MCP server logs (if available):
   - Look for initialization errors
   - Verify tool registration

3. Verify .mcp.json syntax is valid:
   - Check for JSON syntax errors
   - Ensure command and args are correct

4. Restart Claude Code to reload MCP servers

📝 Current status: ansible-mcp-server is a mock implementation
   - execute_playbook: Creates test jobs
   - get_job_status: Simulates job progression
   - Actual playbook execution not yet implemented
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

### Step 4: Validation Summary

**Action**: Report overall validation status

**Success case**:
```
✓ Ansible MCP Validation: PASSED

Configuration:
✓ MCP server configured in .mcp.json
✓ Server connectivity verified (or: ⚠ Connectivity test unavailable)

📝 Note: ansible-mcp-server is currently a mock implementation
   - Playbook execution creates test jobs
   - Job status tracking is simulated
   - Full Ansible integration coming soon

Ready to execute playbook operations (mock mode).
```

**Partial success case**:
```
⚠ Ansible MCP Validation: PARTIAL

Configuration:
✓ MCP server configured in .mcp.json
⚠ Server connectivity could not be tested

Note: Configuration appears correct, but full validation requires connectivity test.
You may proceed with caution.
```

**Failure case**:
```
✗ Ansible MCP Validation: FAILED

Issues found:
✗ [Specific issue 1]
✗ [Specific issue 2]

See troubleshooting steps above.
```

## Dependencies

### Required Files
- [.mcp.json](../../.mcp.json) - MCP server configuration file

### Required MCP Servers
- `ansible-mcp-server` - Mock Ansible playbook execution server

### Required MCP Tools
- `execute_playbook` (from ansible-mcp-server) - Create playbook execution jobs
- `get_job_status` (from ansible-mcp-server) - Monitor job status

### Related Skills
- `playbook-executor` - Uses Ansible MCP for playbook execution
- `playbook-generator` - Generates playbooks for execution
- `remediation-verifier` - Verifies playbook execution results

### Reference Documentation
- None required (validation skill)

## Example Usage

### Example 1: Pre-flight Check Before Playbook Execution

**User Query**: "Validate Ansible MCP before running playbooks"

**Skill Response**:
```
I'll validate your Ansible MCP configuration.

Checking MCP server configuration...
✓ MCP server `ansible-mcp-server` is configured in .mcp.json

Testing server connectivity...
⚠ Server connectivity test unavailable (cannot invoke MCP tools directly)

⚠ Ansible MCP Validation: PARTIAL

Configuration:
✓ MCP server configured in .mcp.json
⚠ Server connectivity could not be tested

📝 Note: ansible-mcp-server is currently a mock implementation
   - Playbook execution creates test jobs
   - Job status tracking is simulated
   - Full Ansible integration coming soon

Your Ansible MCP configuration appears correct. You can proceed with playbook operations in mock mode.
```

### Example 2: Validation Failure - Missing MCP Server

**User Query**: "Check if Ansible is ready for playbook execution"

**Skill Response**:
```
I'll validate your Ansible MCP configuration.

Checking MCP server configuration...
✗ MCP server `ansible-mcp-server` not found in .mcp.json

❌ Cannot validate ansible-mcp-server: Server not configured in .mcp.json

📋 Setup Instructions:
1. Add ansible-mcp-server configuration to rh-sre/.mcp.json
2. Configuration template:
   {
     "mcpServers": {
       "ansible-mcp-server": {
         "command": "npx",
         "args": ["-y", "@ansible/mcp-server"]
       }
     }
   }

📝 Note: ansible-mcp-server is currently a mock implementation for testing
         playbook execution workflows. Full Ansible integration coming soon.

🔗 Documentation: See rh-sre/README.md for MCP server setup

❓ How would you like to proceed?

Options:
- "setup" - Help me configure the MCP server now
- "skip" - Skip validation and try the operation anyway
- "abort" - Stop the workflow entirely

Please respond with your choice.
```

### Example 3: Successful Validation with Mock Server Note

**User Query**: "Verify ansible-mcp-server is working"

**Skill Response**:
```
I'll validate your Ansible MCP configuration.

Checking MCP server configuration...
✓ MCP server `ansible-mcp-server` is configured in .mcp.json

Testing server connectivity...
✓ Successfully connected to ansible-mcp-server

✓ Ansible MCP Validation: PASSED

Configuration:
✓ MCP server configured in .mcp.json
✓ Server connectivity verified

📝 Note: ansible-mcp-server is currently a mock implementation
   - Playbook execution creates test jobs
   - Job status tracking is simulated
   - Full Ansible integration coming soon

Ready to execute playbook operations (mock mode).

Available tools:
- execute_playbook: Submit playbook execution jobs
- get_job_status: Check job status and progress

You can now use the playbook-executor skill to run Ansible playbooks in test mode.
```

### Example 4: Invoked by Another Skill

**Context**: The `playbook-executor` skill invokes this validator before attempting playbook execution

**Internal workflow**:
```
[playbook-executor skill] → [Invoke mcp-ansible-validator]
                          ← [Validation result: PASSED/FAILED]
[playbook-executor skill] → [If PASSED: proceed with playbook execution]
                          → [If FAILED: report to user, ask for decision]
```

This skill provides a reusable validation check that other skills can invoke as a prerequisite before Ansible MCP operations.

## Mock Implementation Notes

**Current Status**: ansible-mcp-server is a mock implementation for testing and development

**Mock Behavior**:
- `execute_playbook`: Validates playbook path exists, returns mock job ID
- `get_job_status`: Simulates job lifecycle (PENDING → RUNNING → COMPLETED)
- No actual Ansible execution occurs
- Useful for testing workflow orchestration without infrastructure dependencies

**Future Implementation**:
- Real Ansible Runner integration
- Actual playbook execution in containers
- Live job status monitoring
- Playbook output capture
- Error handling and rollback support

**Using the Mock**:
- Safe for development and testing
- Validates workflow logic
- Tests skill orchestration
- No system changes occur

When the full Ansible integration is complete, this validator will test actual Ansible connectivity and authentication.
