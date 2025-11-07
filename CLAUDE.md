# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Databricks asset bundle (DAB) project that deploys Claude Code to Databricks clusters. The bundle configures a Databricks cluster with an init script that automatically installs and configures Claude Code to work with Databricks-hosted Claude models via serving endpoints.

## Prerequisites

- Databricks CLI v0.205+ with Bundles enabled
- A model serving endpoint named `anthropic` configured as a proxy for Claude
- The cluster must have access to `DATABRICKS_HOST` and `DATABRICKS_TOKEN` environment variables

## Architecture

### Bundle Structure

- [databricks.yml](databricks.yml) - Main bundle configuration with artifact paths, variables, and resource includes
- [resources/cluster.yml](resources/cluster.yml) - Single-node cluster definition with init script configuration
- [src/install-claude-code.sh](src/install-claude-code.sh) - Init script that installs Claude Code and configures environment variables

### Key Components

**Variables Configuration:**
The bundle uses one variable defined in [databricks.yml](databricks.yml):
- `node_type_id`: The node type to use for the cluster (default: `m6i.2xlarge`)

Override this by editing `targets.prod.variables` or passing CLI arguments with `--var="node_type_id=<value>"`.

**Claude Code Installation Flow:**
1. Init script runs during cluster startup from Workspace files path
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
- Single-node cluster named `claude-code` with configurable node type (default: `m6i.2xlarge`)
- Spark 16.4.x with Scala 2.12
- `SINGLE_USER` data security mode for simplified setup and maximum compatibility
- Auto-terminates after 60 minutes of inactivity
- Init script sourced from Workspace files (automatically uploaded during bundle deployment)

## Common Commands

### Validate bundle configuration
```sh
databricks bundle validate
```

### Deploy the bundle
```sh
databricks bundle deploy
```
Add `--profile <profile_name>` if using a specific Databricks profile.

### Override node type at deployment
```sh
databricks bundle deploy --var="node_type_id=m5.xlarge"
```

### Destroy deployed resources
```sh
databricks bundle destroy
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
- The init script is automatically uploaded during bundle deployment
- After changes, run `databricks bundle deploy` to update the cluster definition

**Modifying the init script** ([src/install-claude-code.sh](src/install-claude-code.sh)):
- Environment variable changes only take effect on new cluster starts
- Script must be executable with proper error handling (`set -e` at the top)
- After changes, run `databricks bundle deploy` and restart the cluster

**Changing node type:**
- Edit `node_type_id` in [databricks.yml](databricks.yml) under `targets.prod.variables`
- Or override at deployment time: `databricks bundle deploy --var="node_type_id=m5.xlarge"`

## Troubleshooting

**`claude` command not found:**
- Run `%sh which claude` in a notebook to check if `/usr/local/bin/claude` is in PATH
- Check cluster event logs to verify init script completed successfully
- Ensure the cluster was restarted after deployment

**Authentication errors:**
- Verify `DATABRICKS_HOST` and `DATABRICKS_TOKEN` are available at cluster runtime
- Check that the `anthropic` serving endpoint exists and is accessible
- Test environment variables with `%sh env | grep ANTHROPIC`