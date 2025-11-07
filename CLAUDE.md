# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Databricks asset bundle (DAB) project that deploys Claude Code to Databricks clusters. The bundle configures a Databricks cluster with an init script that automatically installs and configures Claude Code to work with Databricks-hosted Claude models via serving endpoints.

## Prerequisites

- Databricks CLI v0.205+ with Bundles enabled
- Unity Catalog enabled in the workspace
- A writable Volume (catalog/schema/volume) available
- Artifact allowlists configured in Unity Catalog to allow writing to Volumes
- A model serving endpoint named `anthropic` configured as a proxy for Claude
- The cluster must have access to `DATABRICKS_HOST` and `DATABRICKS_TOKEN` environment variables

## Architecture

### Bundle Structure

- [databricks.yml](databricks.yml) - Main bundle configuration with artifact paths, variables, and resource includes
- [resources/cluster.yml](resources/cluster.yml) - Single-node cluster definition with init script configuration
- [src/install-claude-code.sh](src/install-claude-code.sh) - Init script that installs Claude Code and configures environment variables

### Key Components

**Variables Configuration:**
The bundle uses three variables defined in [databricks.yml](databricks.yml):
- `catalog`: Unity Catalog catalog name (default: `main`)
- `schema`: Schema name within the catalog (default: `claude_code`)
- `volume`: Volume name for artifacts (default: `init_scripts`)

Artifacts are deployed to `/Volumes/${catalog}/${schema}/${volume}`. Override these by editing `targets.prod.variables` or passing CLI arguments.

**Claude Code Installation Flow:**
1. Init script runs during cluster startup from Unity Catalog Volumes path
2. Downloads and installs Claude Code via `curl -fsSL https://claude.ai/install.sh | bash -s stable`
3. Copies binaries from `$HOME/.local/share/claude` to `/usr/local/share/claude` for system-wide access
4. Creates symlink in `/usr/local/bin/claude` pointing to the installed version
5. Writes `/etc/profile.d/databricks_claude_code.sh` with environment variables

**Model Configuration:**
The init script configures Claude Code to use Databricks-hosted Claude by setting:
- `ANTHROPIC_MODEL=databricks-claude-sonnet-4-5`
- `ANTHROPIC_BASE_URL=$DATABRICKS_HOST/serving-endpoints/anthropic`
- `ANTHROPIC_AUTH_TOKEN=$DATABRICKS_TOKEN`

**Cluster Configuration:**
- Single-node cluster named `claude-code` using `m6i.2xlarge` instance type
- Spark 16.4.x with Scala 2.12
- `USER_ISOLATION` data security mode (allows multi-user sharing with isolation)
- Auto-terminates after 60 minutes of inactivity
- Init script sourced from Unity Catalog Volumes (alternative Workspace path commented out in [resources/cluster.yml](resources/cluster.yml:18-19))

**Init Script Deployment:**
The init script can be sourced from two locations:
- **Unity Catalog Volumes** (active): `/Volumes/${catalog}/${schema}/${volume}/.internal/install-claude-code.sh`
- **Workspace files** (commented): `/Workspace/Users/${workspace.current_user.userName}/.bundle/${bundle.name}/${bundle.target}/files/src/install-claude-code.sh`

The Volumes approach is preferred for production; Workspace approach can be used for testing.

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