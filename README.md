# Claude Code on Databricks (ccbricks)

English | [日本語](README_ja.md)

This repository provides a minimal setup to deploy and provision Claude Code in a Databricks workspace using a cluster init script and Databricks Asset Bundles.

## Project structure

- `src/`: Cluster init scripts. `install-claude-code.sh` installs Claude Code and configures environment variables.
- `resources/cluster.yml`: Cluster configuration that adapts based on target (dev/prod)
- `databricks.yml`: Bundle definition with target-specific variables and init script configurations

## Prerequisites

### Common (both dev and prod)
- Databricks CLI v0.205+ (Bundles enabled)
- A model serving endpoint named `anthropic` (proxy for Claude)
- The cluster can access `DATABRICKS_HOST` and `DATABRICKS_TOKEN`
  - Use cluster environment variables or Secrets as needed

### Production target only
- Unity Catalog with a writable Volume and artifact allowlists configured
  - Required for storing init scripts in Unity Catalog Volumes

## Variables

The following variables are used in `databricks.yml`:

- `node_type_id`: The node type to use for the cluster (e.g., `m6i.2xlarge`)
- `data_security_mode`: The data security mode (`SINGLE_USER` or `USER_ISOLATION`)
- `catalog`, `schema`, `volume`: Unity Catalog coordinates (required for prod target only)

## Quickstart

### Development Environment (default)

**No Unity Catalog setup required** - Uses Workspace files for init scripts.

1) Deploy

```bash
databricks bundle deploy --profile <profile_name>
# or explicitly specify dev target
databricks bundle deploy -t dev --profile <profile_name>
```

2) Create/Start the cluster
The single-node cluster `claude-code-server` will be created with:
- `SINGLE_USER` data security mode
- Workspace-based init script (no Unity Catalog Volumes needed)
- Auto-uploaded during deployment

Start the cluster from the UI or CLI.

3) Verify (e.g., in a notebook)

```bash
%sh
claude --version
claude --help
```

### Production Environment

**Unity Catalog Volumes required** - Init scripts are stored in Volumes for production.

1) Configure Unity Catalog
   - Ensure you have a writable Volume (catalog/schema/volume)
   - Configure artifact allowlists in Unity Catalog to allow writing to Volumes
   - Default Volume path: `/Volumes/main/claude_code/init_scripts`

2) Set variables (optional)
Edit `targets.prod.variables` in `databricks.yml` if your Volume coordinates differ from the defaults (`main`, `claude_code`, `init_scripts`).

3) Deploy

```bash
databricks bundle deploy -t prod --profile <profile_name>
```

This will:
- Upload the init script to the specified Unity Catalog Volume
- Create the cluster configuration with Volumes-based init script reference

4) Create/Start the cluster
The single-node cluster `claude-code-server` will be created with:
- `USER_ISOLATION` data security mode for multi-user support
- Volumes-based init script (stored in Unity Catalog Volume)
- Shared workspace path at `/Workspace/Shared/.bundle/ccbricks/prod`

Start the cluster from the UI or CLI.

## What the init script does

- Installs Claude Code via `curl -fsSL https://claude.ai/install.sh | bash -s stable`
- Places files under `/usr/local/share/claude` and symlinks to `/usr/local/bin/claude`
- Writes `/etc/profile.d/databricks_claude_code.sh` with:
  - `ANTHROPIC_MODEL=databricks-claude-sonnet-4-5`
  - `ANTHROPIC_BASE_URL=$DATABRICKS_HOST/serving-endpoints/anthropic`
  - `ANTHROPIC_AUTH_TOKEN=$DATABRICKS_TOKEN`

## Cluster Configuration

Both targets create a single-node cluster named `claude-code-server` with the following differences:

### Development Target (`dev`)
- **Data security mode**: `SINGLE_USER` for simplified setup
- **Init script location**: Workspace files (no Unity Catalog needed)
  - Path: `/Workspace/Users/<username>/.bundle/ccbricks/dev/files/src/install-claude-code.sh`
  - Automatically uploaded during `databricks bundle deploy`
- **Node type**: `m6i.xlarge` (default, can be overridden)
- **Best for**: Individual development and testing

### Production Target (`prod`)
- **Data security mode**: `USER_ISOLATION` for multi-user support with isolation
- **Init script location**: Unity Catalog Volumes (requires UC setup)
  - Path: `/Volumes/main/claude_code/init_scripts/.internal/install-claude-code.sh`
  - Uploaded to Volume during `databricks bundle deploy -t prod`
- **Node type**: `m6i.2xlarge` (default, can be overridden)
- **Workspace path**: `/Workspace/Shared/.bundle/ccbricks/prod` (shared across team)
- **Best for**: Team collaboration with secure multi-user access

## Troubleshooting

### Common issues (both dev and prod)

- **`claude` command not found**
  - After cluster restart, run `%sh which claude` to check PATH
  - Verify init script completion in cluster event logs
  - Check that the init script was uploaded correctly

- **Authentication errors**
  - Ensure `DATABRICKS_HOST`/`DATABRICKS_TOKEN` are available to the cluster runtime
  - Verify the `anthropic` serving endpoint exists and is accessible

### Production-specific issues

- **Failed to write to Volumes**
  - Confirm artifact allowlists are configured in Unity Catalog
  - Verify the Volume path exists: `/Volumes/main/claude_code/init_scripts`
  - Check that you have write permissions to the Volume
  - Ensure the catalog, schema, and volume specified in `databricks.yml` match your UC setup

## Cleanup

- Delete the cluster from the workspace
- Bundle artifacts in the workspace will be automatically removed when the cluster is deleted

## License

Apache License 2.0. See the `LICENSE` file for details.
<https://www.apache.org/licenses/LICENSE-2.0>
