---
name: remediation-verifier
description: |
  **CRITICAL**: This skill must be used for remediation verification. DO NOT use raw MCP tools like get_cve or get_host_details directly for verification.

  Verify CVE remediation success by checking Red Hat Lightspeed CVE status, validating package versions, and confirming service health. Use this skill after executing remediation playbooks to ensure vulnerabilities are properly fixed.

  This skill orchestrates MCP tools (get_cve, get_cve_systems, get_host_details) to provide comprehensive remediation verification including CVE status checking, package version validation, and service health confirmation.

  **IMPORTANT**: ALWAYS use this skill instead of calling verification MCP tools directly.
---

# Remediation Verification Skill

This skill verifies CVE remediation success by validating that vulnerabilities have been properly fixed on target systems.

**Integration with Remediator Agent**: The remediator agent orchestrates this skill as part of its Step 6 (Verify Deployment) workflow. For standalone verification after manual remediation, you can invoke this skill directly.

## When to Use This Skill

**Use this skill directly when you need**:
- Verify CVE remediation after playbook execution
- Confirm package updates were applied successfully
- Check service health after remediation
- Validate Kubernetes pod recovery after node updates
- Generate verification reports for compliance

**Use the remediator agent when you need**:
- Full remediation workflow including verification
- Integrated remediation → execution → verification

**How they work together**: The remediator agent invokes this skill after the user executes the remediation playbook, providing final confirmation that the CVE is resolved.

## Workflow

### 1. CVE Status Verification

**MCP Tool**: `get_cve` and `get_cve_systems` (from lightspeed-mcp vulnerability toolset)

Check CVE status in Red Hat Lightspeed after remediation:

```
Step 1: Retrieve current CVE status
Tool: get_cve(cve_id="CVE-2024-1234")

Expected After Remediation:
- CVE metadata still exists (CVE doesn't disappear)
- Remediation marked as applied
- Fixed version recorded

Step 2: Check affected systems list
Tool: get_cve_systems(cve_id="CVE-2024-1234")

Expected After Remediation:
- Target systems removed from affected list OR
- Systems marked as "patched" status OR
- Systems show fixed package version

Verification Logic:
✓ System UUID not in affected systems list → PASS
✓ System status = "patched" → PASS
✗ System still in affected list with "vulnerable" status → FAIL
```

**Important**: Red Hat Lightspeed updates may take time (up to 24 hours). Consider this when interpreting results.

### 2. Package Version Verification

**MCP Tool**: `get_host_details` (from lightspeed-mcp inventory toolset)

Verify package versions on remediated systems:

```
For each target system:

1. Get current installed packages
   Tool: get_host_details(system_id="uuid-1")
   Extract: system_profile.installed_packages

2. Compare against expected fixed versions
   CVE Fix: httpd-2.4.37-1.el8 → httpd-2.4.37-2.el8

   Installed Packages Check:
   ✓ httpd-2.4.37-2.el8 (or newer) installed → PASS
   ✗ httpd-2.4.37-1.el8 (old version) still present → FAIL
   ✗ httpd not found → FAIL (package removed unexpectedly)

3. Handle version comparison edge cases
   - Epoch numbers (e.g., 1:httpd-2.4.37)
   - Release suffixes (e.g., 2.4.37-2.el8_9.1)
   - Architecture (x86_64, aarch64)
```

**Package Version Comparison Logic**:
```python
def verify_package_version(installed, expected_fixed):
    """
    installed: "httpd-2.4.37-2.el8.x86_64"
    expected_fixed: "httpd-2.4.37-2.el8"

    Returns: True if installed >= expected_fixed
    """
    # Parse version components using RPM version comparison
    # Account for epoch, version, release
    # Use >= comparison (newer versions are acceptable)
```

### 3. Service Health Verification

**MCP Tool**: `get_host_details` (from lightspeed-mcp inventory toolset)

Verify affected services are running properly:

```
For each affected service (e.g., httpd):

1. Check service status
   Extract from: system_profile.enabled_services
   Extract from: system_profile.running_processes

   Service Health Checks:
   ✓ Service in enabled_services list → Service will start on boot
   ✓ Service process in running_processes → Service currently running
   ✗ Service not enabled → WARN (service won't start on reboot)
   ✗ Service process not running → FAIL (service down)

2. Check for service errors
   Look for: system_profile.systemd_failed_units
   ✓ Service not in failed units → PASS
   ✗ Service in failed units → FAIL (service failed to start)

3. Verify uptime (if applicable)
   Check: Service started recently (after remediation)
   ✓ Service uptime < remediation time + 10 minutes → Service restarted
   ⚠ Service uptime > remediation time → Service may not have restarted
```

### 4. Remediation Summary Generation

Generate comprehensive verification report:

```json
{
  "verification_status": "success",  # or "partial_success", "failed"

  "cve_id": "CVE-2024-1234",
  "verification_date": "2024-01-20T15:30:00Z",

  "systems_remediated": {
    "total": 10,
    "successful": 10,
    "failed": 0,
    "partial": 0
  },

  "verification_details": [
    {
      "system_id": "uuid-1",
      "hostname": "web-server-01",
      "status": "verified",

      "checks": {
        "cve_status": {
          "result": "pass",
          "details": "System removed from affected systems list"
        },
        "package_version": {
          "result": "pass",
          "expected": "httpd-2.4.37-2.el8",
          "installed": "httpd-2.4.37-2.el8",
          "details": "Package updated successfully"
        },
        "service_health": {
          "result": "pass",
          "service": "httpd",
          "status": "running",
          "details": "Service restarted and healthy"
        }
      }
    }
  ],

  "compliance": {
    "all_systems_patched": true,
    "services_healthy": true
  },

  "recommendations": [
    "Remediation verified successfully on all systems",
    "Consider re-scanning with insights-client for updated inventory",
    "Document remediation in change management system"
  ]
}
```

### 6. Handle Verification Failures

If verification fails, provide troubleshooting guidance:

**Package Version Mismatch**:
```
Verification Failed: Package Not Updated

System: web-server-01 (uuid-1)
Expected: httpd-2.4.37-2.el8
Found: httpd-2.4.37-1.el8 (OLD VERSION)

Possible causes:
1. Playbook execution failed (check Ansible output)
2. Package repository doesn't have fixed version
3. Package update was skipped due to dependency conflict

Troubleshooting:
1. Check Ansible playbook output for errors
2. Verify package availability:
   sudo dnf info httpd-2.4.37-2.el8
3. Manually update package:
   sudo dnf update httpd
4. Check for package holds:
   sudo dnf versionlock list
```

**Service Not Running**:
```
Verification Failed: Service Not Running

System: web-server-01 (uuid-1)
Service: httpd
Status: Failed

Troubleshooting:
1. Check service status:
   sudo systemctl status httpd
2. View service logs:
   sudo journalctl -u httpd --since "10 minutes ago"
3. Check for configuration errors:
   sudo httpd -t
4. Restart service manually:
   sudo systemctl restart httpd
```

## Output Template

When completing verification, provide output in this format:

```markdown
# Remediation Verification Report

## CVE: CVE-YYYY-NNNNN
**Verification Date**: 2024-01-20 15:30 UTC
**Overall Status**: ✓ SUCCESS

## Summary
**Total Systems**: 10
**Successfully Remediated**: 10
**Failed**: 0
**Partial Success**: 0

## Verification Results

### System: web-server-01 (uuid-1)
**Status**: ✓ VERIFIED

**Checks Performed**:
✓ CVE Status: System removed from affected list
✓ Package Version: httpd-2.4.37-2.el8 (updated from 2.4.37-1.el8)
✓ Service Health: httpd running and healthy

---

### System: web-server-02 (uuid-2)
**Status**: ✓ VERIFIED

**Checks Performed**:
✓ CVE Status: System marked as patched
✓ Package Version: httpd-2.4.37-2.el8 installed
✓ Service Health: httpd running

---

[Additional systems...]

## Compliance Status
✓ All systems successfully patched
✓ All services running and healthy

## Recommendations
1. Remediation verified successfully on all 10 systems
2. Re-scan systems with Red Hat Lightspeed for updated inventory:
   ```bash
   sudo insights-client --check-results
   ```
3. Document remediation in change management system
4. Consider scheduling next vulnerability scan in 7 days

## Next Steps
- Remediation complete, no further action required
- Monitor systems for 24 hours to ensure stability
- Update vulnerability tracking system
```

## Examples

### Example 1: Successful Verification

**User Request**: "Verify remediation for CVE-2024-1234 on 5 systems"

**Skill Response**:
1. Call `get_cve_systems` → 0 systems affected (down from 5)
2. Call `get_host_details` for each → All have httpd-2.4.37-2.el8
3. Check service status → All httpd services running
4. Return: "✓ All 5 systems verified, CVE remediated successfully"

### Example 2: Partial Success

**User Request**: "Verify batch remediation on 20 systems"

**Skill Response**:
1. Call `get_cve_systems` → 2 systems still affected (18 fixed)
2. Call `get_host_details` → 2 systems have old package version
3. Identify failed systems: web-server-18, web-server-19
4. Return: "⚠ 18/20 systems verified. 2 systems failed package update. Troubleshooting guidance provided."

## Best Practices

1. **Wait before verification** - Allow 5-10 minutes after playbook execution
2. **Check multiple indicators** - CVE status + package version + service health
3. **Re-scan with Lightspeed** - Recommend insights-client --check-results
4. **Document failures** - Provide detailed troubleshooting for any failures
5. **Consider timing** - Lightspeed inventory updates may take up to 24 hours
6. **Verify at scale** - Use batch verification for large deployments

## Tools Reference

This skill primarily uses:
- `get_cve` (vulnerability toolset) - Get CVE metadata
- `get_cve_systems` (vulnerability toolset) - Check if systems still affected
- `get_host_details` (inventory toolset) - Verify package versions and service status

All tools are provided by the lightspeed-mcp MCP server configured in `.mcp.json`.

## Integration with Other Skills

- **playbook-generator**: Generates playbooks that this skill verifies
- **system-context**: Provides system context for verification scope
- **cve-impact**: Initial impact assessment to compare against verification results

**Orchestration Example** (from remediator agent):
1. User requests CVE remediation
2. Agent invokes playbook-generator → Creates playbook
3. User executes playbook manually
4. Agent invokes remediation-verifier skill → Confirms success
5. Agent reports: "✓ CVE remediated and verified on all systems"

**Verification-First Principle**:
```
Never assume remediation worked. Always verify:
1. CVE status in Lightspeed
2. Package versions updated
3. Services running

Trust, but verify.
```
