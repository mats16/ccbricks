# Claude Code on Databricks (ccbricks)

This repository provides a minimal setup to deploy and provision Claude Code in a Databricks workspace using a cluster init script and Databricks Asset Bundles.

## Project structure

- `src/`: Cluster init scripts. `install-claude-code.sh` installs Claude Code and configures environment variables.
- `resources/cluster.yml`: Cluster configuration that adapts based on target (dev/prod)
- `databricks.yml`: Bundle definition with target-specific variables and init script configurations

## Prerequisites

- Databricks CLI v0.205+ (Bundles enabled)
- A model serving endpoint named `anthropic` (proxy for Claude)
- The cluster can access `DATABRICKS_HOST` and `DATABRICKS_TOKEN`
  - Use cluster environment variables or Secrets as needed
- **For production target**: Unity Catalog with a writable Volume and artifact allowlists configured

## Variables

The following variables are used in `databricks.yml`:

- `node_type_id`: The node type to use for the cluster (e.g., `m6i.2xlarge`)
- `data_security_mode`: The data security mode (`SINGLE_USER` or `USER_ISOLATION`)
- `catalog`, `schema`, `volume`: Unity Catalog coordinates (required for prod target only)

## Quickstart

### Development Environment (default)

1) Deploy

```bash
databricks bundle deploy --profile <profile_name>
# or explicitly specify dev target
databricks bundle deploy -t dev --profile <profile_name>
```

2) Create/Start the cluster
The single-node cluster `claude-code-dev` will be created with `SINGLE_USER` data security mode and Workspace-based init script. Start it from the UI or CLI.

3) Verify (e.g., in a notebook)

```bash
%sh
claude --version
claude --help
```

### Production Environment

1) Configure Unity Catalog
   - Ensure you have a writable Volume (catalog/schema/volume)
   - Configure artifact allowlists in Unity Catalog

2) Set variables (optional)
Edit `targets.prod.variables` in `databricks.yml` if your Volume coordinates differ from the defaults.

3) Deploy

```bash
databricks bundle deploy -t prod --profile <profile_name>
```

4) Create/Start the cluster
The single-node cluster `claude-code-prod` will be created with `USER_ISOLATION` data security mode and Volumes-based init script. Start it from the UI or CLI.

## What the init script does

- Installs Claude Code via `curl -fsSL https://claude.ai/install.sh | bash -s stable`
- Places files under `/usr/local/share/claude` and symlinks to `/usr/local/bin/claude`
- Writes `/etc/profile.d/databricks_claude_code.sh` with:
  - `ANTHROPIC_MODEL=databricks-claude-sonnet-4-5`
  - `ANTHROPIC_BASE_URL=$DATABRICKS_HOST/serving-endpoints/anthropic`
  - `ANTHROPIC_AUTH_TOKEN=$DATABRICKS_TOKEN`

## Cluster Configuration

### Development Target (`dev`)
- `SINGLE_USER` data security mode for simplified setup
- Workspace-based init script (automatically uploaded during deployment)
- Single-node architecture optimized for Claude Code usage
- Cluster name: `claude-code-dev`

### Production Target (`prod`)
- `USER_ISOLATION` data security mode for multi-user support with isolation
- Volumes-based init script (deployed to Unity Catalog Volume)
- Single-node architecture optimized for Claude Code usage
- Cluster name: `claude-code-prod`

## Troubleshooting

- `claude` command not found
  - After cluster restart, run `%sh which claude` to check PATH
  - Verify init script completion in cluster event logs

- Authentication errors
  - Ensure `DATABRICKS_HOST`/`DATABRICKS_TOKEN` are available to the cluster runtime
  - Verify the `anthropic` serving endpoint exists and is accessible

## Cleanup

- Delete the cluster from the workspace
- Bundle artifacts in the workspace will be automatically removed when the cluster is deleted

## License

Apache License 2.0. See the `LICENSE` file for details.
<https://www.apache.org/licenses/LICENSE-2.0>
