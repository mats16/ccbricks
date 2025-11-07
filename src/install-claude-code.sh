#!/bin/bash

set -e

# Install Claude Code
curl -fsSL https://claude.ai/install.sh | bash -s stable

# Copy to /usr/local
cp -r $HOME/.local/share/claude /usr/local/share/claude
chmod -R 755 /usr/local/share/claude
ln -s /usr/local/share/claude/versions/* /usr/local/bin/claude

# Settings
cat <<EOF > /etc/profile.d/databricks_claude_code.sh
export ANTHROPIC_MODEL="databricks-claude-sonnet-4-5"
export ANTHROPIC_BASE_URL="\$DATABRICKS_HOST/serving-endpoints/anthropic"
export ANTHROPIC_AUTH_TOKEN="\$DATABRICKS_TOKEN"
EOF

chmod 644 /etc/profile.d/databricks_claude_code.sh
