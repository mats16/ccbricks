#!/bin/bash

set -e

# Install Claude Code
curl -fsSL https://claude.ai/install.sh | bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# Settings
echo 'export ANTHROPIC_MODEL="databricks-claude-sonnet-4-5"' >> ~/.bashrc
echo 'export ANTHROPIC_BASE_URL="$DATABRICKS_HOST/serving-endpoints/anthropic"' >> ~/.bashrc
echo 'export ANTHROPIC_AUTH_TOKEN="$DATABRICKS_TOKEN"' >> ~/.bashrc
