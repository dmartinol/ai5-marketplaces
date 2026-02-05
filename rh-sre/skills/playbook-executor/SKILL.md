---
name: playbook-executor
description: |
  **CRITICAL**: This skill must be used for Ansible playbook execution. DO NOT use raw MCP tools like execute_playbook or get_job_status directly.

  Execute Ansible remediation playbooks and track job status through the mock Ansible MCP server. Use this skill after generating a playbook to execute it and monitor completion status. The skill handles temporary file creation, job submission, status polling, and completion reporting.

  This skill orchestrates MCP tools (execute_playbook, get_job_status) from ansible-mcp-server to provide reliable playbook execution with job tracking and status monitoring.

  **IMPORTANT**: ALWAYS use this skill instead of calling execute_playbook or get_job_status directly.
---

# Ansible Playbook Executor Skill

This skill executes Ansible remediation playbooks and tracks their execution status through the mock Ansible MCP server.

**Integration with Remediator Agent**: The remediator agent orchestrates this skill as part of its Step 5 (Execute Playbook) workflow. For standalone playbook execution, you can invoke this skill directly.

## When to Use This Skill

**Use this skill directly when you need**:
- Execute a previously generated Ansible playbook
- Track the status of a running playbook execution
- Monitor playbook job completion
- Verify playbook execution succeeded

**Use the remediator agent when you need**:
- Full remediation workflow including playbook execution
- Integrated CVE analysis → playbook generation → execution → verification
- End-to-end remediation orchestration

**How they work together**: The remediator agent invokes this skill after generating a remediation playbook, asking the user for confirmation before execution, then monitoring the job to completion.

## Workflow

### 1. Save Playbook to Temporary Location

**CRITICAL: Playbooks MUST be saved under /tmp for container access**

The ansible-mcp-server runs in a container with `/tmp` mounted to `/playbooks`. All playbooks must be saved to `/tmp` on the host.

```python
import tempfile
import os

# Create temporary file with .yml extension in /tmp directory
temp_fd, temp_path = tempfile.mkstemp(suffix='.yml', prefix='remediation-', dir='/tmp')

# Write playbook content to file
with os.fdopen(temp_fd, 'w') as f:
    f.write(playbook_yaml_content)

# temp_path now contains the absolute path to the playbook file
# Example: /tmp/remediation-abc123.yml
```

**Key Requirements**:
- Playbook MUST be saved to `/tmp` directory (mounted into container as `/playbooks`)
- Playbook MUST be saved as a `.yml` or `.yaml` file
- Use absolute filesystem path starting with `/tmp/` (not relative)
- File must exist and be readable before calling execute_playbook
- Keep track of temp_path for cleanup after completion

### 2. Execute Playbook

**MCP Tool**: `execute_playbook` (from ansible-mcp-server)

Submit playbook for execution and receive job ID:

```
IMPORTANT: Convert host path to container path before calling execute_playbook

Host path:      /tmp/remediation-CVE-2024-1234.yml
Container path: /playbooks/remediation-CVE-2024-1234.yml

Path conversion:
container_path = host_path.replace('/tmp/', '/playbooks/')

Tool: execute_playbook(playbook_path="/playbooks/remediation-CVE-2024-1234.yml")

Expected Response:
{
  "job_id": "job_12345",
  "status": "PENDING",
  "playbook_path": "/playbooks/remediation-CVE-2024-1234.yml"
}

Verification:
✓ job_id returned (used for status tracking)
✓ status = "PENDING" (job queued for execution)
✓ playbook_path uses container path (/playbooks/)
```

**Error Handling**:
```
If playbook file not found:
→ Error: "Playbook file not found: /playbooks/remediation-CVE-2024-1234.yml"
→ Action: Verify file was saved to /tmp on host, check path conversion to /playbooks/

If execute_playbook fails:
→ Retry once after verifying file exists
→ If retry fails, report error to user with troubleshooting steps
```

### 3. Track Job Status

**MCP Tool**: `get_job_status` (from ansible-mcp-server)

Poll job status until completion:

```
Input: job_id from execute_playbook response
Tool: get_job_status(job_id="job_12345")

Job Status Timeline:
T+0s:  {"job_id": "job_12345", "status": "PENDING", "started_at": null, "completed_at": null}
T+2s:  {"job_id": "job_12345", "status": "RUNNING", "started_at": "2024-01-20T15:30:02Z", "completed_at": null}
T+7s:  {"job_id": "job_12345", "status": "COMPLETED", "started_at": "2024-01-20T15:30:02Z", "completed_at": "2024-01-20T15:30:07Z"}

Status Transitions:
PENDING → RUNNING → COMPLETED

Polling Strategy:
1. Initial check: Immediately after execute_playbook
2. While status = "PENDING" or "RUNNING":
   - Wait 2 seconds
   - Call get_job_status
   - Check status
3. When status = "COMPLETED":
   - Stop polling
   - Report success
```

**Status Interpretation**:
```
Status: PENDING
→ Job queued, not yet started
→ Action: Continue polling

Status: RUNNING
→ Playbook execution in progress
→ Action: Continue polling, update user on progress

Status: COMPLETED
→ Playbook execution finished successfully
→ Action: Stop polling, report success

Status: FAILED (if supported by server)
→ Playbook execution encountered errors
→ Action: Report failure, provide troubleshooting guidance
```

**Error Handling**:
```
If get_job_status returns "Job not found":
→ Error: Invalid job_id or job expired
→ Action: Report error, suggest re-executing playbook

If polling timeout (>60 seconds):
→ Warning: Job taking longer than expected
→ Action: Continue polling but warn user
```

### 4. Report Execution Results

Generate execution summary with job details:

```markdown
# Playbook Execution Report

## Job Details
**Job ID**: job_12345
**Status**: COMPLETED ✓
**Started At**: 2024-01-20T15:30:02Z
**Completed At**: 2024-01-20T15:30:07Z
**Duration**: 5 seconds

## Playbook Information
**Playbook Path**: /tmp/remediation-CVE-2024-1234.yml
**CVE**: CVE-2024-1234
**Target Systems**: 5 systems

## Execution Timeline
1. T+0s: Job submitted (PENDING)
2. T+2s: Execution started (RUNNING)
3. T+7s: Execution completed (COMPLETED)

## Next Steps
- Verify remediation success using remediation-verifier skill
- Check affected systems are no longer vulnerable
- Update vulnerability tracking system
```

### 5. Cleanup Temporary Files

After job completion, clean up temporary playbook file:

```python
import os

# After job completes successfully
if os.path.exists(temp_path):
    os.remove(temp_path)
    print(f"Cleaned up temporary playbook: {temp_path}")
```

**Cleanup Strategy**:
- Remove temp file after COMPLETED status
- Keep temp file if FAILED status (for debugging)
- Warn user if cleanup fails (not critical)

## Output Template

When completing playbook execution, provide output in this format:

```markdown
# Ansible Playbook Execution

## Execution Started
**Playbook**: remediation-CVE-2024-1234.yml
**Job ID**: job_12345
**Status**: Submitted for execution

Monitoring job status...

## Status Updates
- T+0s: PENDING (job queued)
- T+2s: RUNNING (execution started)
- T+7s: COMPLETED (execution finished)

## Execution Complete ✓

**Job ID**: job_12345
**Status**: COMPLETED
**Duration**: 5 seconds
**Started**: 2024-01-20T15:30:02Z
**Completed**: 2024-01-20T15:30:07Z

## Next Steps
1. Verify remediation success:
   - Use remediation-verifier skill to confirm CVE is resolved
   - Check package versions on affected systems
   - Verify services are running properly

2. Update tracking:
   - Mark CVE-2024-1234 as remediated in vulnerability tracker
   - Document remediation in change management system

3. Monitor systems:
   - Watch for 24-48 hours for any issues
   - Verify Red Hat Lightspeed reflects patched status
```

## Examples

### Example 1: Execute Single CVE Remediation

**User Request**: "Execute the playbook for CVE-2024-1234"

**Skill Response**:
1. Receive playbook YAML content from agent
2. Save to `/tmp/remediation-CVE-2024-1234.yml` (host path)
3. Convert to container path: `/playbooks/remediation-CVE-2024-1234.yml`
4. Call `execute_playbook(playbook_path="/playbooks/remediation-CVE-2024-1234.yml")` → job_id: "job_12345", status: PENDING
5. Poll `get_job_status` every 2 seconds
6. Status changes: PENDING → RUNNING → COMPLETED
7. Report: "Playbook executed successfully in 5 seconds"
8. Cleanup temp file from `/tmp/` on host
9. Suggest: "Use remediation-verifier skill to confirm success"

### Example 2: Track Long-Running Playbook

**User Request**: "Check status of job_67890"

**Skill Response**:
1. Call `get_job_status(job_id="job_67890")`
2. Response: status: RUNNING, started_at: 2 minutes ago
3. Continue polling every 2 seconds
4. After 3 minutes: status: COMPLETED
5. Report: "Job completed successfully after 3 minutes"

### Example 3: Handle Job Not Found

**User Request**: "Check status of job_99999"

**Skill Response**:
1. Call `get_job_status(job_id="job_99999")`
2. Response: "Job not found"
3. Report: "Job ID not found. Possible reasons: invalid ID, job expired, or execution completed and cleaned up"
4. Suggest: "Re-execute playbook if needed"

## Error Handling

**Playbook File Not Found**:
```
Execution Failed: Playbook file not found

Container Path: /playbooks/remediation-CVE-2024-1234.yml
Host Path: /tmp/remediation-CVE-2024-1234.yml

Possible causes:
1. File was not saved to /tmp before calling execute_playbook
2. Path conversion from /tmp/ to /playbooks/ was not performed
3. File permissions prevent reading
4. Volume mount not configured correctly

Troubleshooting:
1. Verify file exists on host: ls -l /tmp/remediation-CVE-2024-1234.yml
2. Check file permissions: should be readable
3. Verify path conversion: /tmp/file.yml → /playbooks/file.yml
4. Ensure .mcp.json has volume mount: "-v", "/tmp:/playbooks:Z"
5. Ensure file has .yml or .yaml extension
```

**Job Execution Timeout**:
```
Execution Timeout: Job running longer than expected

Job ID: job_12345
Status: RUNNING
Duration: 65 seconds (exceeded 60s threshold)

Action: Continuing to monitor job status
Note: Some playbooks may take longer for large-scale remediations
```

**Job Status Polling Error**:
```
Status Check Failed: Unable to retrieve job status

Job ID: job_12345
Error: Network timeout

Troubleshooting:
1. Check ansible-mcp-server is running
2. Verify network connectivity
3. Retry status check manually: get_job_status(job_id="job_12345")
```

## Best Practices

1. **Always save playbook to /tmp** - Required for container volume mount access
2. **Convert paths correctly** - Host path `/tmp/file.yml` → Container path `/playbooks/file.yml`
3. **Poll status efficiently** - 2-second intervals balance responsiveness and overhead
4. **Handle all status transitions** - PENDING → RUNNING → COMPLETED
5. **Cleanup temp files** - Remove after successful completion from `/tmp/` on host
6. **Provide progress updates** - Keep user informed during polling
7. **Link to verification** - Always suggest remediation-verifier skill after execution
8. **Keep temp files on failure** - Useful for debugging failed executions
9. **Use unique temp filenames** - Include CVE ID or timestamp to avoid conflicts

## Tools Reference

This skill primarily uses:
- `execute_playbook` (ansible-mcp-server) - Submit playbook for execution
- `get_job_status` (ansible-mcp-server) - Track execution progress

All tools are provided by the ansible-mcp-server MCP server configured in `.mcp.json`.

## Integration with Other Skills

- **playbook-generator**: Generates playbooks that this skill executes
- **remediation-verifier**: Verifies success after this skill completes execution
- **remediator agent**: Orchestrates full workflow including playbook execution

**Orchestration Example** (from remediator agent):
1. Agent invokes playbook-generator skill → Creates playbook YAML
2. Agent asks user for confirmation: "Execute this playbook?"
3. User approves
4. Agent invokes playbook-executor skill → Saves to temp file, executes, monitors
5. Agent reports: "Playbook executed successfully"
6. Agent invokes remediation-verifier skill → Confirms CVE resolved

**Execution-First Principle**:
```
Always confirm before execution:
1. Show playbook preview to user
2. Ask: "Execute this playbook?"
3. Wait for user approval
4. Then invoke playbook-executor skill

This ensures user awareness and control over infrastructure changes.
```
