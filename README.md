# Claude Code on Databricks (ccbricks)

This repository provides a minimal setup to deploy and provision Claude Code in a Databricks workspace using a cluster init script and Databricks Asset Bundles.

## Project structure

- `src/`: Cluster init scripts. `install-claude-code.sh` installs Claude Code and configures environment variables.
- `resources/`: Databricks resource definitions (e.g., cluster).
- `databricks.yml`: Bundle definition (artifact destinations and variables).

## Prerequisites

- Databricks CLI v0.205+ (Bundles enabled)
- Unity Catalog enabled
- A writable Volume (catalog/schema/volume) available
- Artifact allowlists configured in Unity Catalog (to allow writing to Volumes)
- A model serving endpoint named `anthropic` (proxy for Claude)
- The cluster can access `DATABRICKS_HOST` and `DATABRICKS_TOKEN`
  - Use cluster environment variables or Secrets as needed

## Variables

The following variables are used in `databricks.yml`:

- `catalog`: The catalog to use (e.g., `main`)
- `schema`: The schema to use (e.g., `claude_code`)
- `volume`: The volume to use (e.g., `init_scripts`)

Artifacts are placed under `/Volumes/${catalog}/${schema}/${volume}`.

## Quickstart

1) Configure artifact allowlists  
Add Volumes to the allowlist in Unity Catalog to enable artifact deployment.

2) Set variables  
Edit `targets.prod.variables` in `databricks.yml`, or override at CLI runtime.

3) Deploy

```bash
databricks bundle deploy --profile <profile_name>
```

4) Create/Start the cluster  
The single-node cluster `claude-code` defined in `resources/cluster.yml` will be created. Start it from the UI or CLI.

5) Verify (e.g., in a notebook)

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

## Troubleshooting

- Fails to write to Volumes  
  - Confirm artifact allowlists are correctly configured
  - Ensure `catalog/schema/volume` exist

- `claude` command not found  
  - After cluster restart, run `%sh which claude` to check PATH
  - Verify init script completion in cluster event logs

- Authentication errors  
  - Ensure `DATABRICKS_HOST`/`DATABRICKS_TOKEN` are available to the cluster runtime

## Cleanup

- Delete the cluster
- Remove artifacts from the Volume if needed

## License

MIT (update if necessary)
