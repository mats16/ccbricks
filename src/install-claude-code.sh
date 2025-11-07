#!/bin/bash

set -e

# Install Claude Code
curl -fsSL https://claude.ai/install.sh | bash -s stable
cp -r $HOME/.local/share/claude /usr/local/share/claude
ln -s /usr/local/share/claude/versions/* /usr/local/bin/claude

# Settings
echo 'export ANTHROPIC_MODEL="databricks-claude-sonnet-4-5"' >> ~/.bashrc
echo 'export ANTHROPIC_BASE_URL="$DATABRICKS_HOST/serving-endpoints/anthropic"' >> ~/.bashrc
echo 'export ANTHROPIC_AUTH_TOKEN="$DATABRICKS_TOKEN"' >> ~/.bashrc
