# OpenShift Administration Agentic Pack

Administration and management tools for OpenShift Container Platform. This pack provides automation capabilities for cluster lifecycle management, installation orchestration, workload operations, and operational tasks.

**Persona**: OpenShift Administrator
**Marketplaces**: Claude Code

## Overview

The ocp-admin collection provides specialized tools for managing OpenShift clusters throughout their lifecycle:

- **2 specialized skills** for complete cluster lifecycle management
- **2 OpenShift MCP server integrations** for cluster installation and operations
- **End-to-end automation** from cluster creation to operational monitoring

**Current Capabilities:**
- **Cluster Creation**: Full end-to-end OpenShift cluster creation and installation (SNO and HA)
- **Cluster Discovery**: Inventory management and status monitoring via Red Hat Console
- **Installation Orchestration**: Automated installation with real-time progress tracking
- **Network Configuration**: Three-tier static networking (Simple/Advanced/Manual modes)
- **Cluster Operations**: Pod management, resource operations, node monitoring

**Future Expansion:**
Additional skills planned for cluster upgrades, backup/restore, operator management, and advanced troubleshooting automation.

## Quick Start

### Prerequisites

**Required**:
- Claude Code CLI or IDE extension
- Podman or Docker installed
- Red Hat account with cluster management permissions ([sign up](https://www.redhat.com/wapps/ugc/register.html))

**For Cluster Installation** (openshift-installer MCP server):
- Red Hat offline token for API authentication (see setup below)

**For Cluster Operations** (openshift-administration MCP server):
- Existing OpenShift cluster with valid KUBECONFIG
- RBAC permissions for cluster resources (recommended: `cluster-admin` role)

### Environment Setup

**Choose your setup based on your goal:**

#### Scenario 1: Creating/Installing a New Cluster (Most Common)

Set up the **openshift-installer** MCP server to create and manage clusters through Red Hat Console.

**Obtain your offline token**:

1. Visit https://cloud.redhat.com/openshift/token
2. Log in with your Red Hat account
3. Copy the offline token displayed on the page
4. Set the environment variable:

```bash
export OFFLINE_TOKEN="your-offline-token-here"
```

**Token requirements**:
- Your Red Hat account must have permissions to create, read, and update OpenShift clusters
- The token provides API access to console.redhat.com services
- Treat this token like a password - keep it secure

**Verify the token is set** (without exposing the value):
```bash
test -n "$OFFLINE_TOKEN" && echo "✓ OFFLINE_TOKEN configured" || echo "✗ OFFLINE_TOKEN not set"
```

---

#### Scenario 2: Managing an Existing Cluster

Set up the **openshift-administration** MCP server to operate an already-running cluster.

**Configure cluster access**:

```bash
export KUBECONFIG="/path/to/your/kubeconfig"
```

**Verify access to the cluster**:

```bash
oc get nodes
# or
kubectl get nodes
```

**Note**: This requires an existing, operational OpenShift cluster. If you don't have a cluster yet, start with Scenario 1 above.

### Installation (Claude Code)

Install the pack as a Claude Code plugin:

```bash
claude plugin marketplace add https://github.com/RHEcosystemAppEng/agentic-collections
claude plugin install openshift-administration
```

Or for local development:

```bash
claude plugin marketplace add /path/to/agentic-collections
claude plugin install openshift-administration
```

## Skills

The pack provides specialized skills for OpenShift administration operations:

### Current Skills Availability

| User Request | Skill to Use | What It Does |
|--------------|--------------|--------------|
| "Create a new OpenShift cluster" | **cluster-creator** | End-to-end cluster creation and installation |
| "Install OpenShift on my servers" | **cluster-creator** | Guides through full installation workflow |
| "Set up a single-node cluster" | **cluster-creator** | Creates SNO cluster for edge deployments |
| "Deploy an HA cluster" | **cluster-creator** | Creates multi-node production cluster |
| "List all clusters" | **cluster-inventory** | Lists all clusters from Red Hat Console |
| "Show cluster status" | **cluster-inventory** | Shows lifecycle state and installation progress |
| "Get cluster details" | **cluster-inventory** | Displays configuration, network, hosts, validation |
| "Show cluster events" | **cluster-inventory** | Retrieves event history for diagnostics |
| "Why is my cluster stuck?" | **cluster-inventory** | Interprets status and suggests next steps |
| "What's the installation progress?" | **cluster-inventory** | Shows installation phase and completion percentage |
| "Can I get the cluster logs?" | **cluster-inventory** | Provides logs download URL for deep diagnostics |

**Decision Logic:**
- Cluster creation and installation → Use **cluster-creator** skill
- Cluster inspection and status queries → Use **cluster-inventory** skill
- Both skills work together: cluster-creator creates, cluster-inventory monitors

---

### 1. **cluster-creator** - End-to-End Cluster Creation and Installation

Creates and installs OpenShift clusters using Red Hat Assisted Installer. Handles both Single-Node OpenShift (SNO) and High-Availability (HA) multi-node clusters across all supported platforms.

**Use when:**
- "Create a new OpenShift cluster"
- "Install OpenShift on my servers"
- "Set up a single-node cluster for edge deployment"
- "Deploy a production HA OpenShift cluster"
- "I need to create an OpenShift cluster on VMware/bare metal/OCI/Nutanix"

**MCP Tools Used:**
- `list_versions` (from openshift-installer) - Get available OpenShift versions
- `create_cluster` (from openshift-installer) - Create cluster definition
- `set_cluster_vips` (from openshift-installer) - Configure virtual IP addresses
- `set_cluster_ssh_key` (from openshift-installer) - Set SSH key for node access
- `set_cluster_platform` (from openshift-installer) - Configure platform type
- `generate_nmstate_yaml` (from openshift-installer) - Generate static network configuration
- `validate_nmstate_yaml` (from openshift-installer) - Validate network YAML
- `alter_static_network_config_nmstate_for_host` (from openshift-installer) - Apply static networking
- `cluster_iso_download_url` (from openshift-installer) - Get boot ISO URL
- `cluster_info` (from openshift-installer) - Check host discovery and validation
- `set_host_role` (from openshift-installer) - Assign master/worker roles
- `install_cluster` (from openshift-installer) - Start installation
- `cluster_credentials_download_url` (from openshift-installer) - Download kubeconfig and credentials

**What it does:**
- **End-to-end workflow**: Guides through all 18 steps from cluster definition to credential retrieval
- **Cluster type selection**: SNO (single-node) or HA (multi-node) clusters
- **Platform support**: Bare metal, VMware vSphere, Oracle Cloud (OCI), Nutanix AHV, or platform-agnostic
- **Version selection**: Lists available OpenShift versions with support level filtering
- **Network configuration**: Three-tier static networking (Simple/Advanced/Manual modes) or DHCP
- **VIP management**: Automatic VIP configuration for HA clusters on supported platforms
- **Host discovery**: Generates bootable ISO and monitors host discovery
- **Role assignment**: Intelligent role suggestions based on hardware specs
- **Validation checking**: Pre-installation validation with troubleshooting guidance
- **Installation monitoring**: User-triggered or background monitoring with progress tracking
- **Credential management**: Secure credential retrieval and storage in `/tmp/`
- **Error handling**: Comprehensive error documentation and recovery options
- **Cleanup support**: Rollback and cleanup strategies for failed installations

**Supports:**
- **Single-Node OpenShift (SNO)**: Edge deployments, development environments
- **High-Availability (HA)**: Production clusters with 3+ control plane nodes
- **All platforms**: baremetal, vsphere, oci, nutanix, none (platform-agnostic)
- **Static networking**: VLANs, bonding, custom routes via NMState
- **DHCP networking**: Simple network autoconfiguration

**Documentation:**
- See [static-networking-guide.md](docs/static-networking-guide.md) for detailed network configuration
- See [docs/troubleshooting.md](docs/troubleshooting.md) for installation troubleshooting

---

### 2. **cluster-inventory** - Cluster Discovery and Status

List and inspect OpenShift clusters with comprehensive status information including installation progress and configuration details.

**Use when:**
- "List all clusters"
- "Show cluster status"
- "What clusters are available?"
- "Get details of cluster [name]"

**MCP Tools Used:**
- `list_clusters` (from openshift-installer) - Lists all clusters
- `cluster_info` (from openshift-installer) - Retrieves detailed cluster information
- `cluster_events` (from openshift-installer) - Gets cluster event history
- `cluster_logs_download_url` (from openshift-installer) - Gets cluster logs for deep diagnostics

**What it does:**
- **Lists all clusters**: Retrieves all OpenShift clusters associated with your Red Hat account
- **Status interpretation**: Shows cluster lifecycle state (insufficient, pending-for-input, ready, installing, finalizing, installed, error)
- **Configuration details**: Displays OpenShift version, base domain, platform type (baremetal, vsphere, nutanix, oci, none)
- **Network information**: Shows VIP configuration, machine network CIDR, cluster/service network settings
- **Host discovery**: Lists discovered hosts with hardware specs, assigned roles (master/worker), and validation status
- **Installation tracking**: Monitors installation progress through phases (preparing, installing, bootstrapping, finalizing)
- **Event analysis**: Retrieves chronological cluster events for troubleshooting (INFO, WARNING, ERROR levels)
- **Log diagnostics**: Provides cluster logs download URL for deep troubleshooting of error states
- **Validation checking**: Identifies blocking issues (insufficient hosts, missing VIPs, hardware requirements)
- **Diagnostic guidance**: Consults troubleshooting.md to interpret status values and recommend next steps
- **Read-only safety**: All operations are non-destructive queries with no cluster modifications
- **Multi-cluster support**: Can manage and monitor multiple clusters across different environments

## MCP Server Integration

The pack integrates with **two distinct MCP servers** (configured in `.mcp.json`), each serving a specific purpose in the cluster lifecycle:

**Architecture:**
- **openshift-installer**: For **creating and installing** new clusters via Red Hat Console's assisted installer API
  - Requires: `OFFLINE_TOKEN` environment variable
  - Use when: Planning, creating, configuring, and installing new clusters
  - Access: Red Hat Console API at https://api.openshift.com

- **openshift-administration**: For **operating and managing** existing clusters via Kubernetes API
  - Requires: `KUBECONFIG` environment variable pointing to running cluster
  - Use when: Managing workloads, inspecting resources, monitoring existing clusters
  - Access: Direct cluster API access via kubeconfig

---

### **openshift-installer** - Red Hat Assisted Installer Service

Provides access to cluster installation and lifecycle management through Red Hat Console's assisted installer service.

**Available Tools**:

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `list_clusters` | List all clusters for current user | None |
| `cluster_info` | Get comprehensive cluster details | `cluster_id` (UUID) |
| `cluster_events` | Get event history for diagnostics | `cluster_id` (UUID) |
| `list_versions` | List available OpenShift versions | None |
| `create_cluster` | Create new cluster definition | `name`, `version`, `base_domain`, `single_node` |
| `install_cluster` | Start cluster installation | `cluster_id` (UUID) |
| `set_cluster_vips` | Configure virtual IP addresses | `cluster_id`, `api_vip`, `ingress_vip` |
| `set_cluster_ssh_key` | Set SSH key for node access | `cluster_id`, `ssh_public_key` |
| `set_cluster_platform` | Set platform type | `cluster_id`, `platform` |
| `set_host_role` | Assign host role (master/worker) | `host_id`, `cluster_id`, `role` |
| `cluster_iso_download_url` | Get cluster boot ISO URL | `cluster_id` (UUID) |
| `cluster_credentials_download_url` | Get kubeconfig/credentials | `cluster_id`, `file_name` |
| `cluster_logs_download_url` | Get cluster logs URL | `cluster_id` (UUID) |

**Container Image**: `quay.io/ecosystem-appeng/assisted-service-mcp:latest` (publicly available)

**Configuration**:
```json
{
  "mcpServers": {
    "openshift-installer": {
      "command": "podman",
      "args": [
        "run",
        "--rm",
        "-i",
        "--network=host",
        "-e", "TRANSPORT=stdio",
        "-e", "OFFLINE_TOKEN=${OFFLINE_TOKEN}",
        "-e", "INVENTORY_URL=https://api.openshift.com/api/assisted-install/",
        "-e", "PULL_SECRET_URL=https://api.openshift.com/api/accounts_mgmt/v1/access_token",
        "quay.io/ecosystem-appeng/assisted-service-mcp:latest"
      ],
      "env": {
        "OFFLINE_TOKEN": "${OFFLINE_TOKEN}"
      },
      "description": "Red Hat Openshift MCP server for installing and managing clusters",
      "security": {
        "isolation": "container",
        "network": "local",
        "credentials": "env-only"
      }
    }
  }
}
```

**Configuration Details**:
- Uses Podman to run the pre-built container image from quay.io
- `TRANSPORT=stdio` - Uses standard I/O for MCP protocol communication
- `OFFLINE_TOKEN` - Red Hat API authentication token (from environment variable)
- `INVENTORY_URL` - Red Hat assisted installer API endpoint
- `PULL_SECRET_URL` - Red Hat pull secret retrieval endpoint
- `--network=host` - Required for API access to console.redhat.com

**Repository**: https://github.com/openshift-assisted/assisted-service-mcp

### **openshift-administration** - OpenShift Cluster Operations

Provides access to Kubernetes core operations for managing existing OpenShift clusters.

**Container Image**: `quay.io/ecosystem-appeng/openshift-mcp-server:latest` (publicly available)

**Repository**: https://github.com/openshift/openshift-mcp-server

**Enabled Toolsets**: `core` (via `--toolsets core`)

**Core Toolset** (`core`) - Available Tools:

| Category | Tool | Purpose | Key Parameters |
|----------|------|---------|----------------|
| **Resources** | `resources_list` | List Kubernetes resources | `apiVersion`, `kind`, `namespace`, `labelSelector` |
| | `resources_get` | Get detailed resource info | `apiVersion`, `kind`, `name`, `namespace` |
| | `resources_create_or_update` | Create/update resources | `resource` (YAML/JSON) |
| | `resources_delete` | Delete resources | `apiVersion`, `kind`, `name`, `namespace` |
| | `resources_scale` | Scale deployments/statefulsets | `apiVersion`, `kind`, `name`, `scale` |
| **Pods** | `pods_list` | List pods (all namespaces) | `labelSelector`, `fieldSelector` |
| | `pods_list_in_namespace` | List pods in namespace | `namespace`, `labelSelector` |
| | `pods_get` | Get pod details | `name`, `namespace` |
| | `pods_log` | Get pod logs | `name`, `namespace`, `container`, `tail` |
| | `pods_exec` | Execute command in pod | `name`, `command`, `container` |
| | `pods_delete` | Delete pod | `name`, `namespace` |
| | `pods_run` | Run new pod | `image`, `name`, `namespace` |
| | `pods_top` | Pod resource metrics | `name`, `namespace`, `all_namespaces` |
| **Nodes** | `nodes_top` | Node resource metrics | `name`, `label_selector` |
| | `nodes_log` | Get node logs | `name`, `query`, `tailLines` |
| | `nodes_stats_summary` | Node stats (CPU/memory/PSI) | `name` |
| **Cluster** | `events_list` | List cluster events | `namespace` |
| | `namespaces_list` | List namespaces | None |
| | `projects_list` | List projects (OpenShift) | None |

**Configuration**:
```json
{
  "mcpServers": {
    "openshift-administration": {
      "command": "podman",
      "args": [
        "run",
        "--rm",
        "-i",
        "--network=host",
        "--userns=keep-id:uid=65532,gid=65532",
        "-v", "${KUBECONFIG}:/kubeconfig:ro,Z",
        "--entrypoint", "/app/kubernetes-mcp-server",
        "quay.io/ecosystem-appeng/openshift-mcp-server:latest",
        "--kubeconfig", "/kubeconfig",
        "--toolsets", "core"
      ],
      "env": {
        "KUBECONFIG": "${KUBECONFIG}"
      },
      "description": "Red Hat Openshift MCP server for interacting with Openshift Container Platform clusters and its operators",
      "security": {
        "isolation": "container",
        "network": "local",
        "credentials": "env-only"
      }
    }
  }
}
```

**Configuration Details**:
- `--userns=keep-id:uid=65532,gid=65532` - Maps container user namespace for rootless Podman security
- `,Z` flag on volume mount - Applies SELinux context label for container access to kubeconfig
- `--entrypoint /app/kubernetes-mcp-server` - Specifies the MCP server binary to execute
- `--kubeconfig /kubeconfig` - Path to kubeconfig inside the container
- `--toolsets core` - Enables core Kubernetes tool collection
- `--network=host` - Required for accessing local/remote Kubernetes clusters

## Sample Workflows

### Workflow 1: Cluster Discovery

```
User: "List all my OpenShift clusters"
→ cluster-inventory skill lists all clusters with status

User: "Show details for cluster 'production-ocp'"
→ cluster-inventory skill displays comprehensive cluster information
```

### Workflow 2: Installation Progress Monitoring

```
User: "What's the status of my new cluster?"
→ cluster-inventory skill shows installation progress and validation status

User: "Show me the events for cluster XYZ"
→ cluster-inventory skill retrieves cluster event history for diagnostics
```

### Workflow 3: End-to-End Cluster Creation

This workflow demonstrates the complete cluster creation process from start to finish:

```
User: "I want to create a single-node OpenShift cluster for my edge location"
→ cluster-creator skill initiates guided workflow
→ Verifies OFFLINE_TOKEN is configured
→ Verifies prerequisites (hardware requirements)

cluster-creator skill:
→ Lists available OpenShift versions with support levels
→ Guides through cluster configuration (name, domain, SSH key, architecture)
→ Creates cluster definition via Red Hat Console
→ Generates and provides bootable ISO URL

User: [Downloads ISO and boots physical server from it]

cluster-creator skill:
→ Monitors host discovery in real-time
→ Confirms: "1 host discovered with 8 cores, 32GB RAM"
→ Automatically suggests role: "master" (SNO requirement)
→ Validates cluster readiness for installation

cluster-creator skill:
→ Human confirmation checkpoint: "Ready to start installation?"
→ Starts installation after user approval
→ Provides monitoring options: manual checks or background monitoring

User: "Start background monitoring"
→ cluster-creator enables background installation tracking
→ User continues working on other tasks

[Automatic notification when installation completes]

cluster-creator skill:
→ Downloads credentials securely to /tmp/edge-01/
→ Provides access instructions and verification commands
→ References cluster-inventory for ongoing monitoring

User: "Is my cluster ready?"
→ cluster-inventory skill shows:
  - Status: "installed"
  - All hosts: Ready
  - Cluster operators: Available
  - API endpoint and console URL
```

**Skills Involved:**
- ✅ **cluster-creator**: Complete cluster creation, configuration, and installation workflow
- ✅ **cluster-inventory**: Status monitoring, event analysis, ongoing cluster inspection

## Configuration

MCP servers are configured in `.mcp.json`:

```json
{
  "mcpServers": {
    "openshift-installer": {
      "command": "podman",
      "args": [
        "run",
        "--rm",
        "-i",
        "--network=host",
        "-e", "TRANSPORT=stdio",
        "-e", "OFFLINE_TOKEN=${OFFLINE_TOKEN}",
        "-e", "INVENTORY_URL=https://api.openshift.com/api/assisted-install/",
        "-e", "PULL_SECRET_URL=https://api.openshift.com/api/accounts_mgmt/v1/access_token",
        "quay.io/ecosystem-appeng/assisted-service-mcp:latest"
      ],
      "env": {
        "OFFLINE_TOKEN": "${OFFLINE_TOKEN}"
      },
      "description": "Red Hat Openshift MCP server for installing and managing clusters",
      "security": {
        "isolation": "container",
        "network": "local",
        "credentials": "env-only"
      }
    },
    "openshift-administration": {
      "command": "podman",
      "args": [
        "run",
        "--rm",
        "-i",
        "--network=host",
        "--userns=keep-id:uid=65532,gid=65532",
        "-v", "${KUBECONFIG}:/kubeconfig:ro,Z",
        "--entrypoint", "/app/kubernetes-mcp-server",
        "quay.io/ecosystem-appeng/openshift-mcp-server:latest",
        "--kubeconfig", "/kubeconfig",
        "--toolsets", "core"
      ],
      "env": {
        "KUBECONFIG": "${KUBECONFIG}"
      },
      "description": "Red Hat Openshift MCP server for interacting with Openshift Container Platform clusters and its operators",
      "security": {
        "isolation": "container",
        "network": "local",
        "credentials": "env-only"
      }
    }
  }
}
```

**Key Configuration Notes**:
- **openshift-installer**: Podman-based container using Red Hat assisted installer API
  - Requires `OFFLINE_TOKEN` environment variable for authentication
  - Communicates with `https://api.openshift.com` endpoints
  - Uses pre-built image `quay.io/ecosystem-appeng/assisted-service-mcp:latest`
- **openshift-administration**: Podman-based Kubernetes operations container
  - Requires `KUBECONFIG` environment variable pointing to existing cluster
  - Uses pre-built image `quay.io/ecosystem-appeng/openshift-mcp-server:latest`
- Both use `--network=host` for API/cluster access
- `--userns=keep-id:uid=65532,gid=65532` - Enables rootless container security
- `,Z` flag on volume mount - Applies SELinux context label for secure file access

## Troubleshooting

**Comprehensive Guides:**
- **[troubleshooting.md](docs/troubleshooting.md)** - Cluster installation issues, validation failures, common errors
- **[static-networking-guide.md](docs/static-networking-guide.md)** - Network configuration, NMState YAML, VLANs, bonding

### Intelligent Status Interpretation (Automatic)

The **cluster-inventory** skill includes automatic consultation of domain knowledge for intelligent cluster status interpretation:

**How it works:**
1. **Document Consultation**: Before each operation, the skill reads [docs/troubleshooting.md](docs/troubleshooting.md) to understand cluster lifecycle states and common error patterns
2. **Status Interpretation**: Translates raw cluster status values (insufficient, pending-for-input, ready, installing, error) into actionable explanations
3. **Next-Step Guidance**: Recommends specific actions based on cluster state (e.g., "Configure VIPs", "Boot hosts from ISO", "Wait for installation")
4. **Validation Analysis**: Identifies blocking issues and suggests resolutions (missing hosts, hardware requirements, network configuration)
5. **Event Correlation**: Cross-references cluster events with known error patterns for root cause analysis

**Example:**
```
User: "Why is my cluster stuck in 'pending-for-input' status?"

cluster-inventory skill:
1. Consults troubleshooting.md for "pending-for-input" interpretation
2. Retrieves cluster validation messages
3. Identifies: "Network VIPs not configured"
4. Explains: "HA clusters require API and Ingress VIPs"
5. Recommends: "Use set_cluster_vips tool with two unused IPs in your network"
```

**Benefits:**
- No manual documentation lookup required
- Consistent interpretation of cluster states across all queries
- Domain knowledge integrated into every cluster inspection
- Reduces user confusion from cryptic status values

---

### MCP Server Won't Start

**Problem**: openshift-administration server fails to connect to cluster

**Solutions**:
1. Verify KUBECONFIG is set: `echo $KUBECONFIG`
2. Test cluster access: `oc get nodes` or `kubectl get nodes`
3. Check ServiceAccount permissions if using service account authentication

**Problem**: openshift-installer server authentication fails

**Solutions**:
1. Verify OFFLINE_TOKEN is set (without exposing the value):
   ```bash
   test -n "$OFFLINE_TOKEN" && echo "✓ Token set" || echo "✗ Token missing"
   ```
2. If missing, obtain token from https://cloud.redhat.com/openshift/token
3. Verify your Red Hat account has cluster management permissions
4. Check container can access Red Hat API:
   ```bash
   podman run --rm -i --network=host \
     -e "OFFLINE_TOKEN=${OFFLINE_TOKEN}" \
     quay.io/ecosystem-appeng/assisted-service-mcp:latest
   ```

For detailed OFFLINE_TOKEN troubleshooting, see [docs/troubleshooting.md](docs/troubleshooting.md).

### Cluster Operations Fail

**Problem**: Cluster listing or inspection returns errors

**Solutions**:
1. Verify MCP server connectivity
2. Check authentication credentials
3. Ensure proper RBAC permissions for cluster access
4. Review cluster events using the cluster-inventory skill

### Skills Not Triggering

**Problem**: Skills don't activate on expected queries

**Solutions**:
1. Verify plugin installed: `claude plugin list`
2. Reload Claude Code to refresh plugins
3. Check skill descriptions match query intent
4. Use explicit phrasing from skill examples

## Architecture Reference

### Directory Structure

```
ocp-admin/
├── README.md                           # This file
├── .claude-plugin/
│   └── plugin.json                     # Plugin metadata
├── .mcp.json                           # MCP server configurations
├── docs/                               # AI-optimized knowledge base
│   ├── troubleshooting.md              # Cluster troubleshooting guide
│   └── static-networking-guide.md      # Static network configuration guide
└── skills/
    ├── cluster-creator/SKILL.md        # End-to-end cluster creation and installation
    └── cluster-inventory/SKILL.md      # Cluster discovery and status monitoring
```

### Key Patterns

- **Skills encapsulate operations** - Each skill handles one category of cluster tasks (discovery, creation, configuration, installation)
- **Dual-server architecture** - Separate MCP servers for cluster creation (openshift-installer) and operations (openshift-administration)
- **Dual authentication model**:
  - OFFLINE_TOKEN for Red Hat Console API (cluster installation)
  - KUBECONFIG for Kubernetes API (cluster operations)
- **Document consultation** - Skills automatically read troubleshooting.md for intelligent status interpretation
- **Environment-based auth** - Credentials via environment variables only, never hardcoded
- **Read-only safety** - Current cluster-inventory skill performs only non-destructive queries
- **Human-in-the-loop** - Future modification skills will require explicit user confirmation
- **Container isolation** - All MCP servers run in isolated, rootless Podman containers

## Security Model

**Authentication and Credentials**:

*OFFLINE_TOKEN (for openshift-installer)*:
- Treat as a password - never expose in logs, output, or version control
- Stored only in environment variables, never hardcoded
- Provides full cluster management permissions for your Red Hat organization
- Obtain from https://cloud.redhat.com/openshift/token (requires Red Hat account login)
- Token does not expire automatically but can be revoked via Red Hat Console
- **Best Practice**: Set in shell profile (`.bashrc`, `.zshrc`) for persistence
- **Security**: Never use `echo $OFFLINE_TOKEN` or print token values
- **Network**: Requires outbound HTTPS access to `api.openshift.com`

*KUBECONFIG (for openshift-administration)*:
- Contains cluster API endpoint and authentication certificates
- Mounted read-only (`:ro`) in container for security
- Respects Kubernetes RBAC permissions (recommended: `cluster-admin` role)
- ServiceAccount-based authorization supported
- No credential caching beyond kubeconfig file itself

**Container Isolation**:
- Both MCP servers run in isolated Podman containers
- Rootless execution with user namespace mapping (`--userns=keep-id:uid=65532,gid=65532`)
- SELinux context labeling (`,Z`) for secure volume mounts
- Network isolation: `--network=host` only for required API access
- Containers removed after each invocation (`--rm` flag)

**Audit and Compliance**:
- openshift-installer: All operations logged in Red Hat Console audit trail
- openshift-administration: All operations logged in Kubernetes API server logs
- cluster-inventory skill: Read-only operations with no destructive actions
- Future skills will require human-in-the-loop confirmation for cluster modifications

**Data Protection**:
- No credential storage beyond environment variables and kubeconfig files
- Credentials passed to containers via environment variable injection
- No persistent credential caching in container images or volumes

## Development

See main repository [README.md](../README.md) for:
- Adding new skills
- Creating agents
- Integrating MCP servers
- Testing and validation

## License

[Apache 2.0](../LICENSE)

## References

- [OpenShift Documentation](https://docs.openshift.com/)
- [Red Hat Assisted Installer Console](https://console.redhat.com/openshift/assisted-installer/clusters)
- [Red Hat Offline Token](https://cloud.redhat.com/openshift/token) - Obtain OFFLINE_TOKEN for API authentication
- [Assisted Service MCP Server](https://github.com/openshift-assisted/assisted-service-mcp) - openshift-installer MCP server
- [OpenShift MCP Server](https://github.com/openshift/openshift-mcp-server) - openshift-administration MCP server
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Main Repository](https://github.com/RHEcosystemAppEng/agentic-collections)
