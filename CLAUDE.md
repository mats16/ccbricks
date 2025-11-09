# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Databricks asset bundle (DAB) project that deploys Claude Code to Databricks clusters. The bundle supports two deployment targets:
- **dev**: Simplified setup with Workspace-based init script and SINGLE_USER mode
- **prod**: Production setup with Unity Catalog Volumes-based init script and USER_ISOLATION mode for multi-user support

## Prerequisites

### Common (both dev and prod)
- Databricks CLI v0.205+ with Bundles enabled
- A model serving endpoint named `anthropic` configured as a proxy for Claude
- The cluster must have access to `DATABRICKS_HOST` and `DATABRICKS_TOKEN` environment variables

### Production target only
- Unity Catalog enabled in the workspace
- A writable Volume (catalog/schema/volume) available
- Artifact allowlists configured in Unity Catalog to allow writing to Volumes

## Architecture

### Bundle Structure

- [databricks.yml](databricks.yml) - Main bundle configuration with variables and target-specific settings (including init_scripts configuration)
- [resources/cluster.yml](resources/cluster.yml) - Cluster definition that uses variables to adapt between dev/prod targets
- [src/install-claude-code.sh](src/install-claude-code.sh) - Init script that installs Claude Code and configures environment variables

### Key Components

**Variables Configuration:**
The bundle uses the following variables defined in [databricks.yml](databricks.yml):
- `node_type_id`: The node type to use for the cluster (default: `m6i.2xlarge`)
- `data_security_mode`: The data security mode (`SINGLE_USER` for dev, `USER_ISOLATION` for prod)
- `init_scripts`: The init scripts configuration (workspace-based for dev, volumes-based for prod)
- `catalog`, `schema`, `volume`: Unity Catalog coordinates (required for prod target only)

The key insight is that `init_scripts` is defined as a variable, allowing each target to specify different init script sources (Workspace vs Volumes) in a single cluster definition file.

Override these by editing target-specific variables or passing CLI arguments with `--var="<name>=<value>"`.

**Claude Code Installation Flow:**
1. Init script runs during cluster startup (from Workspace in dev, from Volumes in prod)
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

*Development (`dev` target):*
- Single-node cluster named `claude-code-dev`
- `SINGLE_USER` data security mode for simplified setup
- Workspace-based init script (automatically uploaded during deployment)
- Spark 16.4.x with Scala 2.12
- Auto-terminates after 60 minutes of inactivity

*Production (`prod` target):*
- Single-node cluster named `claude-code-prod`
- `USER_ISOLATION` data security mode for multi-user support with isolation
- Volumes-based init script (deployed to Unity Catalog Volume)
- Spark 16.4.x with Scala 2.12
- Auto-terminates after 60 minutes of inactivity

## Common Commands

### Validate bundle configuration
```sh
# Validate dev target (default)
databricks bundle validate

# Validate prod target
databricks bundle validate -t prod
```

### Deploy the bundle
```sh
# Deploy dev target (default)
databricks bundle deploy

# Deploy prod target
databricks bundle deploy -t prod

# Add profile if needed
databricks bundle deploy -t prod --profile <profile_name>
```

### Override variables at deployment
```sh
databricks bundle deploy -t prod --var="node_type_id=m5.xlarge"
```

### Destroy deployed resources
```sh
# Destroy dev resources
databricks bundle destroy

# Destroy prod resources
databricks bundle destroy -t prod
```

### Verify Claude Code installation
After cluster starts, run in a notebook:
```sh
%sh
claude --version
claude --help
```

## Development Workflow

**Modifying cluster configuration** ([resources/cluster.yml](resources/cluster.yml)):
- Edit the single cluster definition file
- The file uses variables to adapt between dev/prod targets
- After changes, run `databricks bundle deploy -t <target>` to update the cluster definition

**Modifying the init script** ([src/install-claude-code.sh](src/install-claude-code.sh)):
- Environment variable changes only take effect on new cluster starts
- Script must be executable with proper error handling (`set -e` at the top)
- After changes, run `databricks bundle deploy -t <target>` and restart the cluster

**Changing variables:**
- Edit variables in [databricks.yml](databricks.yml) under the appropriate target
- The `init_scripts` variable is particularly important as it controls whether to use Workspace or Volumes
- Or override at deployment time: `databricks bundle deploy -t <target> --var="<name>=<value>"`

**Switching between targets:**
- Use `-t dev` for development environment (default)
- Use `-t prod` for production environment

## Troubleshooting

**`claude` command not found:**
- Run `%sh which claude` in a notebook to check if `/usr/local/bin/claude` is in PATH
- Check cluster event logs to verify init script completed successfully
- Ensure the cluster was restarted after deployment

**Authentication errors:**
- Verify `DATABRICKS_HOST` and `DATABRICKS_TOKEN` are available at cluster runtime
- Check that the `anthropic` serving endpoint exists and is accessible
- Test environment variables with `%sh env | grep ANTHROPIC`

**Production target fails to write to Volumes:**
- Confirm artifact allowlists are configured in Unity Catalog
- Verify `catalog/schema/volume` exist and are writable
- Check that the Volume path in [databricks.yml](databricks.yml) matches your Unity Catalog setup