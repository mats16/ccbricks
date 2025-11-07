# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Databricks asset bundle (DAB) project that deploys Claude Code to Databricks clusters. The bundle configures a Databricks cluster with an init script that automatically installs and configures Claude Code to work with Databricks-hosted Claude models via serving endpoints.

## Architecture

### Databricks Bundle Structure

- `databricks.yml` - Main bundle configuration file that defines the project structure, workspace paths, and includes resource definitions
- `resources/cluster.yml` - Cluster resource definition that specifies the Claude Code server cluster configuration
- `src/install-claude-code.sh` - Init script that installs Claude Code and configures it to use Databricks serving endpoints

### Key Architectural Patterns

**Databricks Bundle Configuration:**
The project uses Databricks Asset Bundles (DAB) to manage infrastructure as code. The bundle includes resource definitions from `resources/*.yml` files and deploys them to a workspace path under the current user's directory.

**Claude Code Installation Flow:**
1. Init script runs during cluster startup (defined in `resources/cluster.yml:15-19`)
2. Script downloads and installs Claude Code from `claude.ai/install.sh`
3. Claude Code binaries are copied to `/usr/local/share/claude` for system-wide access
4. Environment variables are configured via `/etc/profile.d/databricks_claude_code.sh` to point to Databricks serving endpoints

**Model Configuration:**
The init script configures Claude Code to use the Databricks-hosted Claude model by setting:
- `ANTHROPIC_MODEL=databricks-claude-sonnet-4-5`
- `ANTHROPIC_BASE_URL=$DATABRICKS_HOST/serving-endpoints/anthropic`
- `ANTHROPIC_AUTH_TOKEN=$DATABRICKS_TOKEN`

**Cluster Configuration:**
The cluster is configured with `USER_ISOLATION` data security mode (line 14 in `resources/cluster.yml`), which allows multiple users to share the cluster while maintaining isolation. The commented-out `SINGLE_USER` mode option is available if stronger isolation is needed.

**Init Script Path:**
The init script can be sourced from two locations (see `resources/cluster.yml:15-19`):
- Unity Catalog Volumes: `/Volumes/mats/sandbox/scripts/install-claude-code.sh` (active)
- Workspace files: `.bundle/${bundle.name}/${bundle.target}/files/src/install-claude-code.sh` (commented out)

## Common Commands

### Deploy the bundle to Databricks
```sh
databricks bundle deploy
```

### Validate bundle configuration before deploying
```sh
databricks bundle validate
```

### Destroy deployed resources
```sh
databricks bundle destroy
```

## Development Workflow

When modifying cluster configurations in `resources/cluster.yml`, note that:
- The init script path must point to a valid location (either Volumes or Workspace)
- If using Workspace files, the script will be automatically uploaded during bundle deployment
- If using Volumes, manually upload `src/install-claude-code.sh` to the specified Volume path before deployment

When modifying the init script `src/install-claude-code.sh`:
- Changes to environment variables will only take effect on new cluster starts
- The script must be executable and have proper error handling (`set -e`)
- If using Volumes for the init script, re-upload the script after changes and restart the cluster