# Claude Code on Databricks (ccbricks)

This repository provides a minimal setup to deploy and provision Claude Code in a Databricks workspace using a cluster init script and Databricks Asset Bundles.

## Project structure

- `src/`: Cluster init scripts. `install-claude-code.sh` installs Claude Code and configures environment variables.
- `resources/`: Databricks resource definitions (e.g., cluster).
- `databricks.yml`: Bundle definition (artifact destinations and variables).

## Prerequisites

- Databricks CLI v0.205+ (Bundles enabled)
- A model serving endpoint named `anthropic` (proxy for Claude)
- The cluster can access `DATABRICKS_HOST` and `DATABRICKS_TOKEN`
  - Use cluster environment variables or Secrets as needed

## Variables

The following variables are used in `databricks.yml`:

- `node_type_id`: The node type to use for the cluster (e.g., `m6i.2xlarge`)

Artifacts are uploaded to the workspace path automatically during bundle deployment.

## Quickstart

1) Set variables (optional)
Edit `targets.prod.variables` in `databricks.yml`, or override at CLI runtime.

2) Deploy

```bash
databricks bundle deploy --profile <profile_name>
```

3) Create/Start the cluster
The single-node cluster `claude-code` defined in `resources/cluster.yml` will be created with `SINGLE_USER` data security mode. Start it from the UI or CLI.

4) Verify (e.g., in a notebook)

```bash
%sh
claude --version
claude --help
```

## What the init script does

- Installs Claude Code via `curl -fsSL https://claude.ai/install.sh | bash -s stable`
- Places files under `/usr/local/share/claude` and symlinks to `/usr/local/bin/claude`
- Writes `/etc/profile.d/databricks_claude_code.sh` with:
  - `ANTHROPIC_MODEL=databricks-claude-sonnet-4-5`
  - `ANTHROPIC_BASE_URL=$DATABRICKS_HOST/serving-endpoints/anthropic`
  - `ANTHROPIC_AUTH_TOKEN=$DATABRICKS_TOKEN`

## Cluster Configuration

The cluster is configured with:
- `SINGLE_USER` data security mode for simplified setup and maximum compatibility
- Workspace-based init script (automatically uploaded during deployment)
- Single-node architecture optimized for Claude Code usage

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
