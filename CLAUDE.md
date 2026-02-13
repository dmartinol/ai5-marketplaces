# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains **agentic collections** - plugin collections that automate interactions with Red Hat platforms and products across multiple AI marketplaces (Claude Code, Cursor, ChatGPT). Each pack is persona-specific and includes skills, agents, and supporting documentation.

## Repository Structure

```
agentic-collections/
├── rh-sre/              # Site Reliability Engineering pack (reference implementation)
├── rh-developer/        # Developer tools pack
├── ocp-admin/           # OpenShift administration pack
├── rh-support-engineer/ # Technical support pack
└── rh-virt/             # Virtualization management pack
```

### Agentic Pack Architecture

Each pack follows this structure:
```
<pack-name>/
├── README.md            # Pack description, persona, target marketplaces
├── .claude-plugin/      # Claude Code plugin metadata
│   └── plugin.json      # Name, version, description, author, license
├── .mcp.json           # MCP server configurations (uses env vars for credentials)
├── agents/             # Multi-step workflow orchestrators
│   └── <agent>.md      # Agent definition with YAML frontmatter
├── skills/             # Specialized task executors
│   └── <skill>/
│       └── SKILL.md    # Skill definition with YAML frontmatter
└── docs/               # AI-optimized knowledge base (rh-sre only currently)
    ├── INDEX.md        # Documentation map and AI discovery guide
    ├── SOURCES.md      # Official Red Hat source attributions
    └── .ai-index/      # Semantic indexing for token optimization
```

## Working with Agentic Collections

### Skills vs Agents

**Skills** (`skills/<skill-name>/SKILL.md`):
- Single-purpose task executors
- Encapsulate specific tool access and domain knowledge
- Invoked via the `Skill` tool
- Structure: YAML frontmatter + implementation guide
- Example: `cve-impact` (CVE risk assessment), `playbook-generator` (Ansible generation)

**Agents** (`agents/<agent>.md`):
- Multi-step workflow orchestrators
- Delegate to multiple skills in sequence
- Invoked via the `Task` tool with `subagent_type`
- Structure: YAML frontmatter + workflow definition
- Example: `remediator` (orchestrates 5 skills for end-to-end CVE remediation)

**Key Pattern**: Agents orchestrate skills; skills encapsulate tools. Never call MCP tools directly - always go through skills.

## Design Principles for Skills and Agents

### 1. No Time Estimates

Skills and agents **MUST NOT** provide time estimates or predictions for how long tasks will take, whether for their own work or for users planning their projects.

**Prohibited phrases**:
- "This will take me a few minutes"
- "Should be done in about 5 minutes"
- "This is a quick fix"
- "This will take 2-3 weeks"
- "Estimated time: 45-60 minutes"
- "We can do this later"

**Instead, use**:
- Describe phases/steps: "Installation progresses through: preparing → installing → finalizing"
- Show completion percentage: "Progress: 60% complete"
- Indicate current phase: "Currently: Installing control plane"
- Let users judge timing: "You can monitor progress and check back when ready"

**Rationale**:
- **Accuracy impossible**: AI cannot reliably predict real-world timing (network speed, hardware performance, user actions vary widely)
- **Environment variability**: Same task takes vastly different time in different environments
- **Avoids false expectations**: Users plan around estimates, then get frustrated when incorrect
- **Focus on substance**: Describing WHAT happens is more useful than WHEN it completes
- **User empowerment**: Let users judge timing based on their environment knowledge

**Examples**:

❌ **Wrong**:
```markdown
Installation will take approximately 45-60 minutes for SNO clusters.
```

✅ **Correct**:
```markdown
Installation progresses through several phases:
1. Preparing for installation
2. Installing (bootstrapping cluster)
3. Installing control plane
4. Finalizing
5. Completed

Progress: 60% complete
Current phase: Installing control plane
```

### 2. Document Consultation Transparency

When a skill or agent consults documentation (from `docs/` or skill/agent files), it **MUST**:
1. **Actually read the file** using the Read tool to load it into context
2. **Then declare** the consultation to the user

**CRITICAL**: Document consultation means READING the file, not just claiming to have read it.

**Required Implementation**:
```markdown
**Document Consultation** (REQUIRED):
1. **Action**: Read [filename.md](path/to/filename.md) using the Read tool to understand [specific topic]
2. **Output to user**: "I consulted [filename.md](path/to/filename.md) to understand [specific topic]."
```

**❌ WRONG - Transparency Theater** (just claims, no actual reading):
```markdown
**Document Consultation** (output to user):
```
I consulted [filename.md](path/to/filename.md) to understand [topic].
```
```

**✅ CORRECT - Actual Consultation** (reads first, then declares):
```markdown
**Document Consultation** (REQUIRED):
1. **Action**: Read [cvss-scoring.md](../../docs/references/cvss-scoring.md) using the Read tool to understand CVSS severity mapping
2. **Output to user**: "I consulted [cvss-scoring.md](../../docs/references/cvss-scoring.md) to understand CVSS severity mapping."
```

**Examples in execution**:
- Read `docs/references/cvss-scoring.md` → "I consulted [cvss-scoring.md](rh-sre/docs/references/cvss-scoring.md) to verify the CVSS severity mapping."
- Read `skills/playbook-generator/SKILL.md` → "I consulted [playbook-generator/SKILL.md](rh-sre/skills/playbook-generator/SKILL.md) to understand playbook generation parameters."

**Rationale**:
- **Substance**: Ensures AI actually enriches its context with domain knowledge
- **Transparency**: Users understand the AI's knowledge sources
- **Auditability**: The execution-summary skill can track actual Read tool calls

### 3. Precise Parameter Specification

Skills MUST specify **exact parameters** when instructing agents to use tools, ensuring first-attempt success.

**CRITICAL**: Document consultation must be specified BEFORE tool parameters to ensure it happens first.

**❌ Bad Example - Vague parameters**:
```
Use get_cve tool with the CVE ID
```

**❌ Bad Example - Wrong parameters**:
```
**MCP Tool**: get_cves

**Parameters**:
- severity: ["Critical", "Important"]
- sort_by: "cvss_score"
```
(Actual tool uses `impact: "7,6"` and `sort: "-cvss_score"`)

**✅ Good Example - Correct structure with document consultation first**:
```
**CRITICAL**: Document consultation MUST happen BEFORE tool invocation.

**Document Consultation** (REQUIRED - Execute FIRST):
1. **Action**: Read [vulnerability-logic.md](../../docs/insights/vulnerability-logic.md) using the Read tool
2. **Output to user**: "I consulted [vulnerability-logic.md]..."

**MCP Tool**: `get_cves` or `vulnerability__get_cves` (from lightspeed-mcp)

**Parameters**:
- impact: "7,6" (string with comma-separated impact levels: 7=Important, 6=Moderate, 5=Low)
- sort: "-cvss_score" (use - prefix for descending; valid fields: "cvss_score", "public_date")
- limit: 20 (maximum number of CVEs to return)
```

**Rationale**:
- **Ordering**: Document consultation before parameters ensures it's executed first
- **Precision**: Exact parameter names and formats prevent tool errors
- **Examples**: Value examples (e.g., "7,6") show correct format
- **Determinism**: First-attempt success reduces wasted cycles

### 4. Skill Precedence and Conciseness

**Precedence Rule**: Skills > Tools (always invoke skills, not raw MCP tools)

**Conciseness Requirement**: Skill descriptions (loaded at agent start time) must be:
- **Under 500 tokens** for the YAML frontmatter description field
- **Focus on "when to use"** with 3-5 concrete examples
- **Defer implementation details** to the skill body (not frontmatter)

**Example**:
```yaml
---
name: cve-impact
description: |
  Analyze CVE impact across the fleet without immediate remediation.

  Use when:
  - "What are the most critical vulnerabilities?"
  - "Show CVEs affecting my systems"
  - "List high-severity CVEs"

  NOT for remediation actions (use remediator agent instead).
model: inherit
---
```

**Rationale**: Minimizes token usage at agent initialization while maintaining clarity.

### 5. Dependencies Declaration

Every skill MUST include a **Dependencies** section listing:
- **Skills**: Other skills this skill may invoke
- **MCP Tools**: Specific tools from MCP servers
- **MCP Servers**: Required MCP server names
- **Documentation**: Reference docs for context

**Required Format**:
```markdown
## Dependencies

### Required MCP Servers
- `lightspeed-mcp` - Red Hat Lightspeed platform access

### Required MCP Tools
- `vulnerability__get_cves` (from lightspeed-mcp) - List CVEs
- `vulnerability__get_cve` (from lightspeed-mcp) - Get CVE details

### Related Skills
- `cve-validation` - Validate CVEs before impact analysis
- `fleet-inventory` - Identify affected systems

### Reference Documentation
- [cvss-scoring.md](docs/references/cvss-scoring.md) - CVSS severity mappings
- [insights-api.md](docs/insights/insights-api.md) - API usage patterns
```

**Rationale**: Makes dependencies explicit for debugging and ensures proper error handling.

### 6. Human-in-the-Loop Requirements

Skills performing **critical operations** MUST include this section:

**Required Section**:
```markdown
## Critical: Human-in-the-Loop Requirements

This skill requires explicit user confirmation at the following steps:

1. **Before Tool Invocation** [if applicable]
   - Ask: "Should I proceed with [specific action]?"
   - Wait for user confirmation

2. **Before Destructive Actions** [if applicable]
   - Display preview of changes
   - Ask: "Review the changes above. Should I execute this?"
   - Wait for explicit "yes" or "proceed"

3. **After Each Major Step** [if applicable]
   - Report results
   - Ask: "Continue to next step?"

**Never assume approval** - always wait for explicit user confirmation.
```

**When to Use**:
- Playbook execution (ansible-mcp-server)
- System modifications (package updates, config changes)
- Multi-system operations (batch remediation)
- Data deletion or irreversible actions

**Rationale**: Prevents unintended automation; maintains user control over critical operations.

### 7. Mandatory Skill Sections

Every skill MUST include these sections in order:

#### Template Structure:
```markdown
---
name: skill-name
description: |
  [Concise when-to-use with 3-5 examples]
model: inherit|sonnet|haiku
color: red|blue|green|yellow
---

# [Skill Name]

## Prerequisites

**Required MCP Servers**: `server-name` ([setup guide](link))
**Required MCP Tools**: `tool_name` (from server-name)
**Environment Variables**: `VAR_NAME` (if applicable)

**Verification**:
Before executing, verify MCP server availability:
1. Check `server-name` is configured in `.mcp.json`
2. Verify environment variables are set
3. If missing: Report to user with setup instructions

**Human Notification on Failure**:
If prerequisites are not met:
- ❌ "Cannot proceed: MCP server `server-name` is not available"
- 📋 "Setup required: [link to setup guide]"
- ❓ "How would you like to proceed? (setup now / skip / abort)"
- ⏸️ Wait for user decision

## When to Use This Skill

Use this skill when:
- [Specific scenario 1]
- [Specific scenario 2]
- [Specific scenario 3]

Do NOT use when:
- [Anti-pattern 1] → Use [alternative] instead
- [Anti-pattern 2] → Use [alternative] instead

## Workflow

### Step 1: [Action Name]

**CRITICAL**: Document consultation MUST happen BEFORE tool invocation.

**Document Consultation** (REQUIRED - Execute FIRST):
1. **Action**: Read [doc.md](../../docs/category/doc.md) using the Read tool to understand [specific topic]
2. **Output to user**: "I consulted [doc.md](../../docs/category/doc.md) to understand [specific topic]."

**MCP Tool**: `tool_name` or `toolset__tool_name` (from server-name)

**Parameters**:
- `param1`: [exact specification with example - see Design Principle #8]
  - Example: `"CVE-2024-1234"`
- `param2`: [exact specification with example]
  - Example: `true` (description of what this does)

**Expected Output**: [describe what the tool returns]

**Error Handling**:
- If [error condition]: [how to handle]

### Step 2: [Next Action]

[Continue pattern...]

## Dependencies

[As specified in principle #4]

## Critical: Human-in-the-Loop Requirements

[As specified in principle #5, if applicable]

## Example Usage

[Concrete example with user query and skill response]
```

**Rationale**: Standardizes skill structure for consistency and completeness.

### 8. MCP Server Availability Verification

The **Prerequisites** section MUST include verification logic:

**CRITICAL SECURITY CONSTRAINT**:
- **NEVER print environment variable values in user-visible output**
- When checking if env vars are set, only report presence/absence
- Do NOT use `echo $VAR_NAME` or display actual credential values
- Protect sensitive data like API keys, tokens, secrets, passwords

**❌ WRONG - Exposes credentials**:
```bash
echo $LIGHTSPEED_CLIENT_SECRET  # Shows actual secret value
```

**✅ CORRECT - Check without exposing**:
```bash
# Check if set (exit code only, no output)
test -n "$LIGHTSPEED_CLIENT_SECRET"

# Or check and report boolean result
if [ -n "$LIGHTSPEED_CLIENT_SECRET" ]; then
    echo "✓ LIGHTSPEED_CLIENT_SECRET is set"
else
    echo "✗ LIGHTSPEED_CLIENT_SECRET is not set"
fi
```

**In User-Visible Messages**:
```
✓ Environment variable LIGHTSPEED_CLIENT_ID is set
✓ Environment variable LIGHTSPEED_CLIENT_SECRET is set
```

**NEVER show**:
```
LIGHTSPEED_CLIENT_SECRET=sk-abc123-xyz789-...  ❌ SECURITY VIOLATION
```

**Rationale**: Prevents accidental credential exposure in conversation history, logs, or screenshots.

---

**Required Pattern**:
```markdown
## Prerequisites

**Required MCP Servers**: `lightspeed-mcp` ([setup guide](https://console.redhat.com/))
**Required MCP Tools**:
- `vulnerability__get_cves`
- `vulnerability__get_cve`

**Verification Steps**:
1. **Check MCP Server Configuration**
   - Verify `lightspeed-mcp` exists in `.mcp.json`
   - If missing → Proceed to Human Notification

2. **Check Environment Variables**
   - Verify `LIGHTSPEED_CLIENT_ID` is set
   - Verify `LIGHTSPEED_CLIENT_SECRET` is set
   - If missing → Proceed to Human Notification

3. **Test MCP Server Connection** (optional, for critical skills)
   - Attempt simple tool call (e.g., `get_mcp_version`)
   - If fails → Proceed to Human Notification

**Human Notification Protocol**:

When prerequisites fail, the skill MUST:

1. **Stop Execution Immediately** - Do not attempt tool calls
2. **Report Clear Error**:
   ```
   ❌ Cannot execute [skill-name]: MCP server `lightspeed-mcp` is not available

   📋 Setup Instructions:
   1. Add lightspeed-mcp to `.mcp.json` (see: [setup guide])
   2. Set environment variables:
      export LIGHTSPEED_CLIENT_ID="your-id"
      export LIGHTSPEED_CLIENT_SECRET="your-secret"
   3. Restart Claude Code to reload MCP servers

   🔗 Documentation: [link to MCP server docs]
   ```

3. **Request User Decision**:
   ```
   ❓ How would you like to proceed?

   Options:
   - "setup" - I'll help you configure the MCP server now
   - "skip" - Skip this skill and continue with alternative approach
   - "abort" - Stop the workflow entirely

   Please respond with your choice.
   ```

4. **Wait for Explicit User Input** - Do not proceed automatically

**Error Message Templates**:

- Missing MCP Server:
  ```
  ❌ MCP server `{server_name}` not configured in .mcp.json
  📋 Add server configuration: [setup guide link]
  ```

- Missing Environment Variable:
  ```
  ❌ Environment variable `{VAR_NAME}` not set
  📋 Set variable: export {VAR_NAME}="your-value"

  ⚠️ SECURITY: Never expose actual values in output or logs
  ```

- Connection Failure:
  ```
  ❌ Cannot connect to `{server_name}` MCP server
  📋 Possible causes:
     - Container not running (run: podman ps)
     - Network issues (check: podman logs)
     - Invalid credentials (verify env vars)
  ```
```

**Rationale**: Provides graceful degradation and clear user guidance when dependencies are missing.

### Skill File Format

Skills MUST follow the structure defined in **Design Principle #8** above. Here's a minimal template:

```yaml
---
name: skill-name
description: |
  [Concise when-to-use with 3-5 examples - under 500 tokens]
model: inherit|sonnet|haiku
color: red|blue|green|yellow
---

# [Skill Name]

## Prerequisites
[As defined in Design Principle #8 - with verification and human notification]

## When to Use This Skill
[Clear use cases and anti-patterns]

## Workflow
### Step 1: [Action]

**CRITICAL**: Document consultation MUST happen BEFORE tool invocation.

**Document Consultation** (REQUIRED - Execute FIRST):
1. **Action**: Read [doc.md](path/to/doc.md) using the Read tool to understand [topic]
2. **Output to user**: "I consulted [doc.md](path/to/doc.md) to understand [topic]."

**MCP Tool**: `tool_name` or `toolset__tool_name` (from server-name)

**Parameters**:
- param1: "value" (exact format with example - Design Principle #8)
- param2: true (description of what this does)

[Implementation details]

## Dependencies
[As defined in Design Principle #8]

## Critical: Human-in-the-Loop Requirements
[If applicable - Design Principle #8]
```

**Important**: See **Design Principles for Skills and Agents** section above for complete requirements and rationale.

### Agent File Format

Agents MUST follow similar principles as skills, with focus on skill orchestration:

```yaml
---
name: agent-name
description: |
  When to use this agent vs skills
  [Concise with 3-5 examples - under 500 tokens]
model: inherit
color: red
tools: ["All"]
---

# [Agent Name]

## Prerequisites
[MCP servers and skills this agent depends on - Design Principle #8]

## When to Use This Agent
[Multi-step workflows requiring orchestration]

## Workflow

### 1. Step Name
**Invoke the skill-name skill**:
```
Skill: skill-name
Args: [Precise parameters - Design Principle #8]
```

**Document Consultation** (if needed):
I consulted [filename.md](path/to/filename.md) to understand [topic].
[Design Principle #2]

**Human Confirmation** (if critical):
Ask: "Should I proceed with [action]?"
Wait for confirmation.
[Design Principle #8]

### 2. Next Step
[Continue orchestration pattern...]

## Dependencies
[Skills, tools, docs this agent uses - Design Principle #8]

## Critical: Human-in-the-Loop Requirements
[For agents performing critical operations - Design Principle #8]
```

**Important**: Agents inherit the same design principles as skills. See **Design Principles for Skills and Agents** section above.

### MCP Server Integration

MCP servers are configured in `<pack>/.mcp.json`:
```json
{
  "mcpServers": {
    "server-name": {
      "command": "podman|docker|npx",
      "args": ["..."],
      "env": {
        "VAR_NAME": "${VAR_NAME}"  // Environment variable references
      },
      "security": {
        "isolation": "container",
        "network": "local",
        "credentials": "env-only"
      }
    }
  }
}
```

**Critical**: Never hardcode credentials. Always use `${ENV_VAR}` references.

## AI-Optimized Documentation (rh-sre Reference)

The `rh-sre` pack demonstrates advanced documentation patterns for token optimization:

### Semantic Indexing System

Located in `docs/.ai-index/`:
- `semantic-index.json` - Document metadata with semantic keywords
- `task-to-docs-mapping.json` - Pre-computed doc sets for common workflows
- `cross-reference-graph.json` - Document relationship graph

**Usage Pattern** (for AI agents reading rh-sre docs):
1. Read `semantic-index.json` first (~200 tokens)
2. Match task keywords to relevant docs
3. Load only required docs using progressive disclosure
4. Follow cross-references for related content

**Performance**: 29% token reduction on average, 85% reduction in navigation overhead

### Documentation Standards

All docs include YAML frontmatter:
```yaml
---
title: Document Title
category: rhel|ansible|openshift|insights|references
sources:
  - title: Official Red Hat Doc Title
    url: https://docs.redhat.com/...
    date_accessed: YYYY-MM-DD
tags: [keyword1, keyword2]
semantic_keywords: [phrases for AI discovery]
use_cases: [task_ids]
related_docs: [cross-references]
last_updated: YYYY-MM-DD
---
```

**Source Attribution**: All content derived from official Red Hat documentation (see `docs/SOURCES.md`)

## Naming Conventions

### Folders
- Lowercase with dash separators: `rh-sre`, `ocp-admin`
- Red Hat prefix: `rh-`
- Acronyms for brevity: `ocp` (OpenShift Container Platform), `virt` (Virtualization)

### Files
- Skills: `skills/<skill-name>/SKILL.md` (uppercase SKILL.md)
- Agents: `agents/<agent-name>.md` (lowercase, no folder)
- Docs: Lowercase with dashes, categorized by directory

## Development Workflow

### Creating a New Agentic Pack

1. Create pack folder: `<pack-name>/`
2. Add `README.md` with description, persona, marketplaces
3. Create `skills/` directory
4. Optional: Add `.claude-plugin/plugin.json` for Claude Code
5. Optional: Add `.mcp.json` for MCP server integrations
6. Optional: Add `agents/` for multi-step workflows
7. Update main `README.md` table with link

### Adding a Skill

1. Create `skills/<skill-name>/SKILL.md`
2. Define YAML frontmatter (name, description, model, color)
3. Document workflow with MCP tool references
4. Include concrete examples
5. Test with `Skill` tool invocation

### Adding an Agent

1. Create `agents/<agent-name>.md`
2. Define YAML frontmatter (name, description, model, tools, color)
3. Document workflow orchestrating skills
4. Provide clear examples of when to use agent vs skills
5. Test with `Task` tool invocation

### Adding Documentation (rh-sre pattern)

1. Create doc in appropriate category: `docs/{rhel,ansible,openshift,insights,references}/`
2. Add complete YAML frontmatter with official sources
3. Follow content structure: Overview → When to Use → Main Content → Related Docs
4. Lead with code examples (production-ready, not toy examples)
5. Update `docs/INDEX.md` navigation structure
6. Update `docs/SOURCES.md` with source URLs
7. Regenerate indexes: `python docs/.ai-index/generate-index.py` (when available)

## Integration with Red Hat Platforms

### Red Hat Lightspeed MCP Server
- CVE vulnerability data and risk assessment
- System inventory and compliance
- Remediation playbook generation
- Requires: `LIGHTSPEED_CLIENT_ID`, `LIGHTSPEED_CLIENT_SECRET` env vars

### Ansible MCP Server
- Playbook execution and job tracking
- Status monitoring
- Container-isolated execution

## OpenShift and Kubernetes Operations

**CRITICAL RULE**: When working with OpenShift, Kubernetes, or Virtual Machines:

### 1. MCP Tools Have Absolute Priority

**ALWAYS use MCP server tools FIRST** - Never use `oc` or `kubectl` commands unless explicitly required:

- All OpenShift/Kubernetes operations MUST use tools from `openshift-virtualization` MCP server
- All VM operations MUST use tools from `openshift-virtualization` MCP server
- Skills MUST invoke MCP tools, NEVER shell commands (`oc`, `kubectl`)

### 2. Shell Commands Only as Last Resort

Use `oc`/`kubectl` commands ONLY when:
- No equivalent MCP tool exists for the specific operation
- MCP server is unavailable AND user explicitly requests shell fallback
- You are performing cluster admin operations not exposed via MCP tools

**Before using shell commands, you MUST**:
1. Explicitly state: "No MCP tool available for this operation"
2. Ask user: "Should I proceed with `oc`/`kubectl` command as fallback?"
3. Wait for user confirmation

### 3. Available MCP Tool Categories

The `openshift-virtualization` MCP server provides:

**Namespaces/Projects**:
- `namespaces_list` - List Kubernetes namespaces
- `projects_list` - List OpenShift projects

**Pods**:
- `pods_list` - List pods across all namespaces
- `pods_list_in_namespace` - List pods in specific namespace
- `pods_get` - Get pod details
- `pods_delete` - Delete a pod
- `pods_exec` - Execute command in pod
- `pods_log` - Get pod logs
- `pods_run` - Run a new pod
- `pods_top` - Get pod resource usage

**Generic Resources**:
- `resources_get` - Get any Kubernetes resource
- `resources_list` - List any Kubernetes resources
- `resources_create_or_update` - Create or update resources
- `resources_delete` - Delete resources
- `resources_scale` - Scale deployments/statefulsets

**Virtual Machines**:
- `vm_create` - Create new VMs with instance types
- `vm_lifecycle` - Start/stop/restart VMs

**Nodes**:
- `nodes_log` - Get node logs
- `nodes_stats_summary` - Get node statistics
- `nodes_top` - Get node resource usage

**Events**:
- `events_list` - List cluster events

### 4. Examples

#### ❌ WRONG - Direct shell usage:
```bash
oc get pods -n my-namespace
oc get vms -n openshift-cnv
oc delete pod my-pod
kubectl logs my-pod
```

#### ✅ CORRECT - MCP tools:
```
Use: mcp__plugin_openshift-virtualization_openshift-virtualization__pods_list_in_namespace
     Parameters: {namespace: "my-namespace"}

Use: mcp__plugin_openshift-virtualization_openshift-virtualization__resources_list
     Parameters: {apiVersion: "kubevirt.io/v1", kind: "VirtualMachine", namespace: "openshift-cnv"}

Use: mcp__plugin_openshift-virtualization_openshift-virtualization__pods_delete
     Parameters: {name: "my-pod", namespace: "my-namespace"}

Use: mcp__plugin_openshift-virtualization_openshift-virtualization__pods_log
     Parameters: {name: "my-pod", namespace: "my-namespace"}
```

### 5. Skill Implementation Requirements

All skills working with OpenShift/Kubernetes MUST:

1. **Declare MCP tool dependencies**:
   ```markdown
   ## Prerequisites

   **Required MCP Servers**: `openshift-virtualization`
   **Required MCP Tools**:
   - `pods_list_in_namespace` (from openshift-virtualization)
   - `vm_lifecycle` (from openshift-virtualization)
   ```

2. **Use MCP tools in workflows**:
   ```markdown
   ### Step 1: List Virtual Machines

   **MCP Tool**: `resources_list` (from openshift-virtualization)

   **Parameters**:
   - apiVersion: "kubevirt.io/v1"
   - kind: "VirtualMachine"
   - namespace: "[user-provided-namespace]"
   ```

3. **Handle unavailability gracefully**:
   ```markdown
   **Error Handling**:
   - If MCP server unavailable:
     ❌ "MCP server `openshift-virtualization` not available"
     📋 "Setup required: Add server to .mcp.json"
     ❓ "Fallback to `oc` commands? (yes/no)"
     ⏸️ Wait for user decision
   ```

### 6. Rationale

- **Consistency**: MCP tools provide standardized, typed interfaces
- **Security**: MCP tools enforce proper authentication and authorization
- **Auditability**: MCP tool calls are tracked and logged
- **Error Handling**: MCP tools return structured errors
- **Skills Integration**: Skills encapsulate MCP tools, not shell commands

## Reference Implementation

The `rh-sre` pack is the most complete implementation, demonstrating:
- Full skill orchestration (10 skills)
- Agent-based workflows (remediator agent)
- AI-optimized documentation system
- MCP server integration
- Red Hat Lightspeed platform integration

When creating new collection, use `rh-sre` as the architectural reference.

## Key Principles

### Core Architecture
1. **Skills encapsulate tools** - Never call MCP tools directly; always invoke skills
2. **Agents orchestrate skills** - Complex workflows delegate to specialized skills
3. **Skill precedence** - Skills > Tools in all cases (Design Principle #8)

### Security & Configuration
4. **Environment variables for secrets** - Never hardcode credentials
5. **Never expose credential values** - Check env vars are set, but NEVER print their values in output
6. **Verify prerequisites** - Check MCP server availability before execution (Design Principle #8)
7. **Human-in-the-loop for critical ops** - Require explicit confirmation (Design Principle #8)

### Documentation & Transparency
8. **Official sources only** - Document all sources in SOURCES.md
9. **Declare document consultation** - Explicitly state "I consulted [file]" (Design Principle #2)
10. **Progressive disclosure** - Load docs incrementally based on task needs

### Quality & Usability
11. **Precise parameters** - Specify exact tool parameters for first-attempt success (Design Principle #8)
12. **Declare dependencies** - List all skills, tools, docs, and MCP servers (Design Principle #8)
13. **Production-ready examples** - No toy code, include error handling
14. **Persona-focused design** - Each collection serves specific user roles
15. **Concise skill descriptions** - Keep YAML frontmatter under 500 tokens (Design Principle #8)

**See**: **Design Principles for Skills and Agents** section for detailed requirements and templates.

---

## Universal Skill Patterns

These patterns emerged from skill development and should be applied across all agentic packs.

### 1. User-Triggered Monitoring for Long-Running Operations

**Pattern**: For operations that take significant time (installations, deployments, builds), use user-triggered status checks instead of autonomous polling loops.

**Why**: AI cannot implement true autonomous polling loops with sleep intervals. User-triggered checks give users control.

**Implementation**:

```markdown
### Monitoring Long-Running Operation

**Display Initial Message**:
```
✅ Operation started!

You can check progress anytime by saying:
- "check status"
- "how is it going?"
- "show progress"

I'll poll and show current status.

Would you like background monitoring instead? (yes/no)
```

**If user chooses background monitoring**:

**MCP Tool**: Task tool with run_in_background=true

**Parameters**:
```json
{
  "subagent_type": "general-purpose",
  "description": "Monitor operation",
  "prompt": "Monitor {operation} using {mcp_server}. Poll {status_tool} every 60 seconds. Notify when complete or failed.",
  "run_in_background": true
}
```

**If user chooses manual monitoring**:

**When user says "check status"**:
- Call status check tool
- Display current progress/phase
- Offer to check again or switch to background
```

**Rationale**: Balances user control with automation convenience.

---

### 2. Standardized Question Mechanisms

**Pattern**: Use consistent mechanisms for gathering user input based on input type.

**Rules**:
- **AskUserQuestion**: For structured multiple-choice selections
- **Plain prompts**: For freeform text input (names, paths, passwords, IPs)

**AskUserQuestion Example** (Structured Choice):
```json
{
  "questions": [{
    "question": "Which platform will you use?",
    "header": "Platform",
    "multiSelect": false,
    "options": [
      {"label": "Bare Metal (Recommended)", "description": "Physical servers..."},
      {"label": "VMware vSphere", "description": "VMware virtualization..."}
    ]
  }]
}
```

**Plain Prompt Example** (Freeform Text):
```markdown
**Prompt to user**:
```
Enter cluster name:

Requirements:
- 1-54 characters
- Start with letter
- Only lowercase letters, numbers, hyphens

Examples: "production-ocp", "edge-01"
```

**Wait for user response**

**Validation**:
{validation logic}

**If invalid**: Re-prompt with error message
**If valid**: Continue
```

**Rationale**: Clear separation based on input type improves UX consistency.

---

### 3. Secure Temporary Credential Storage

**Pattern**: Store sensitive credentials (passwords, keys, kubeconfigs) in temporary storage by default, offer permanent storage as option.

**Implementation**:

```markdown
### Download Sensitive Credentials

**Create Secure Temporary Directory**:

**MCP Tool**: Bash

**Parameters**:
- command: `mkdir -p /tmp/{resource_name} && chmod 700 /tmp/{resource_name}`
- description: "Create secure temporary directory"

**Download Credentials**:
- Save to: `/tmp/{resource_name}/{credential_file}`
- Set permissions: `chmod 600` (owner read/write only)

**Security Notice**:
```
⚠️  SECURITY:
- Credentials stored in /tmp/ (temporary - cleared on reboot)
- Only you can access these files (600 permissions)
- Never share credentials publicly
- Never commit to version control

Would you like to copy to permanent storage? (yes/no)
```

**If yes**: Prompt for permanent path, copy with secure permissions
**If no**: Acknowledge temporary storage limitation
```

**Rationale**:
- Temporary storage by default prevents accidental persistence
- User has option to save permanently if needed
- Clear security warnings set expectations

---

### 4. Error Documentation Workflow

**Pattern**: When encountering new errors, ask user permission before documenting.

**Implementation**:

```markdown
### Handle New Error

**After error occurs and details gathered**:

**Ask User**:
```
📝 I've encountered a new error.

Would you like me to document this in troubleshooting.md for future reference?
This will help you and others troubleshoot similar issues.

(yes/no)
```

**If "yes"**:

1. **Document Consultation**:
   - Read current troubleshooting.md
   - Check if error already documented

2. **Update Documentation**:
   **MCP Tool**: Write tool

   **Parameters**:
   - file_path: "{pack}/docs/troubleshooting.md"
   - content: {updated_content_with_new_error_section}

   **Format**:
   ```markdown
   ### Error: "{error_pattern}"
   **Symptoms**: {observed_behavior}
   **Context**: {when_it_occurs}
   **Resolution**: {steps or "Under investigation"}
   **First Observed**: {date}
   ```

3. **Output to user**: "✅ Error documented in troubleshooting.md"

**If "no"**: Skip documentation, continue with error resolution
```

**Rationale**: Builds living knowledge base while respecting user choice.

---

### 5. Cleanup and Rollback Strategy

**Pattern**: For skills that create resources, always provide cleanup/rollback options when operations fail.

**Implementation**:

```markdown
### Cleanup Strategy (Add to resource creation skills)

**When to Offer Cleanup**:
- Resource created but configuration failed
- User wants to abort and start over
- Operation failed and resource is in error state

**Cleanup Options Display**:
```
🗑️  Cleanup Options

Current resource:
- Name: {name}
- ID: {id}
- Status: {status}

Options:
1. "delete" - Delete resource and start over
2. "preserve" - Keep resource for manual fix
3. "retry" - Retry current step

Choose option (1/2/3):
```

**If "delete"**:
- If delete tool exists: Use it
- If not: Provide manual deletion instructions
- Offer to restart from beginning

**If "preserve"**:
- Save resource info to /tmp/{name}/resource-info.txt
- Provide console/UI URL for manual management
- Exit skill gracefully

**If "retry"**:
- Re-execute current failed step
- Allow up to 3 retries before offering cleanup again
```

**Rationale**: Prevents orphaned resources and gives users recovery options.

---

### 6. Tiered Complexity for Advanced Features

**Pattern**: For complex features (networking, security, configuration), offer tiered complexity levels.

**Implementation**:

```markdown
### Complex Feature Configuration

**Display Complexity Options**:
```
⚠️  {Feature} Configuration

Choose complexity level:

1. **Simple Mode** (Recommended)
   - Basic settings covering 90% of use cases
   - Guided step-by-step configuration
   - Suitable for most deployments

2. **Advanced Mode** (For experts)
   - Full control over all parameters
   - Complex configurations (VLANs, bonding, custom rules)
   - Requires deep technical knowledge

3. **Manual Mode** (Expert users with prepared config)
   - Provide your own configuration files
   - Full control, no validation

Which mode? (1/2/3):
```

**Mode 1 - Simple**:
- Gather only essential parameters
- Use sensible defaults
- Clear explanations for each field

**Mode 2 - Advanced**:
- Full workflow with all options
- Technical language acceptable
- Detailed validation

**Mode 3 - Manual**:
- Accept user-provided config
- Validate syntax only
- Trust user expertise
```

**Rationale**: Makes skills accessible to beginners while not limiting experts.

---

### 7. Always Clarify Scope Before Starting

**Pattern**: Before executing any task, summarize understanding and ask for confirmation.

**Implementation**:

```markdown
### Initial Scope Clarification (Every Skill Should Do This)

**Before any tool calls or operations**:

**Display to User**:
```
Let me confirm I understand correctly:

**Task**: {summarize_what_user_wants}

**Scope**:
- {key_aspect_1}
- {key_aspect_2}
- {key_aspect_3}

**Prerequisites**:
- {required_mcp_server}
- {required_environment_variable}
- {required_permission_or_access}

**What I'll do**:
1. {step_1}
2. {step_2}
3. {step_3}

Is this correct, or should I adjust my understanding?
```

**Wait for user confirmation**

**If user says "adjust"**:
- Ask specific clarification questions
- Re-display scope summary
- Get confirmation before proceeding

**If user confirms**:
- Proceed with workflow
```

**Rationale**: Prevents wasted work from misunderstandings; sets clear expectations.

---

### 8. Progress Indicators for Multi-Step Workflows

**Pattern**: For skills with many steps, show progress throughout execution.

**Implementation**:

```markdown
### Step N: {Step Name}

**Progress**: Step {N} of {Total} - {Short Description}

{step content}

---

### Example Progress Indicators:

**Step 1 of 18 - Verifying Prerequisites**
**Step 5 of 18 - Configuration Review**
**Step 10 of 18 - Discovering Hosts**
**Step 13 of 18 - Final Confirmation Required ⚠️**
**Step 18 of 18 - Complete! 🎉**
```

**For percentage-based progress** (when available):
```
Progress: 45% complete

Phase Progression:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Phase 1: Initialization ................ 100%
✅ Phase 2: Configuration ................ 100%
🔄 Phase 3: Execution ..................... 45%
⏳ Phase 4: Finalization ................... 0%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Rationale**: Users can track progress and estimate remaining work; reduces anxiety during long operations.

---

### 9. Contextual Troubleshooting Links

**Pattern**: When errors occur or validation fails, provide quick links to relevant troubleshooting documentation.

**Implementation**:

```markdown
### Error or Validation Failure

**Display Error**:
```
❌ {Error Title}

**Problem**: {error_description}

**Resolution**: {steps_or_guidance}

Quick Fix → See [{relevant_section}](../../docs/troubleshooting.md#{anchor})
```

**Examples**:
```
Quick Fix → See [MCP Server Setup](../../README.md#environment-setup)
Quick Fix → See [Host Discovery Issues](../../docs/troubleshooting.md#host-discovery-issues)
Quick Fix → See [VIP Configuration](../../docs/troubleshooting.md#vip-configuration-issues)
```

**Automatic Link Generation**:
- Parse error type/validation name
- Map to known troubleshooting sections
- Provide clickable link with anchor
```

**Rationale**: Reduces friction in error resolution; guides users to relevant documentation immediately.

---

### 10. Explain Hardcoded Values

**Pattern**: When using hardcoded or default values, always explain their meaning and purpose.

**Implementation**:

```markdown
### Using Defaults or Hardcoded Values

**Good - With Explanation**:
```
- destination: "0.0.0.0/0" (default route - all traffic not matching specific routes)
- table_id: 254 (main routing table - Linux default for primary routes)
- cidr_length: 24 (255.255.255.0 subnet mask - supports 254 hosts)
- bond_mode: "active-backup" (one active interface, others standby - simplest redundancy)
```

**Bad - No Explanation**:
```
- destination: "0.0.0.0/0"
- table_id: 254
```

**In Documentation**:
Create a "Default Values Reference" section:

```markdown
## Default Values Reference

| Parameter | Default Value | Meaning | When to Change |
|-----------|---------------|---------|----------------|
| cidr_length | 24 | /24 subnet (254 hosts) | Larger/smaller networks |
| table_id | 254 | Main routing table | Custom routing policies |
| bond_mode | active-backup | Simple failover | Need load balancing (use 802.3ad) |
```
```

**Rationale**: Makes skills educational; users understand not just what but why.

---

**See**: Individual skill implementations for application of these patterns.
