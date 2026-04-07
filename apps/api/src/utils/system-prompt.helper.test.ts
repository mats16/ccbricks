import { describe, it, expect } from 'vitest';
import type { SessionOutcome } from '@repo/types';
import {
  buildSystemPromptConfig,
  createWorkspacePushInstruction,
  type SystemPromptConfig,
} from './system-prompt.helper.js';

describe('createWorkspacePushInstruction', () => {
  it('should generate instruction with workspace path', () => {
    const result = createWorkspacePushInstruction('/Workspace/Users/test@example.com/project');

    expect(result).toContain('Databricks Workspace Push Requirements');
    expect(result).toContain('/Workspace/Users/test@example.com/project');
    expect(result).toContain('databricks sync');
  });

  it('should include CLI reference with environment variable', () => {
    const result = createWorkspacePushInstruction('/Workspace/test');

    expect(result).toContain('CLI Reference');
    expect(result).toContain('DATABRICKS_WORKSPACE_PATH');
    expect(result).toContain('databricks workspace list "$DATABRICKS_WORKSPACE_PATH"');
    expect(result).toContain(
      'databricks sync --include "*" --exclude .claude/settings.local.json . "$DATABRICKS_WORKSPACE_PATH"'
    );
  });

  it('should include task instructions', () => {
    const result = createWorkspacePushInstruction('/Workspace/test');

    expect(result).toContain('Your task is to complete the request');
    expect(result).toContain('DEVELOP');
    expect(result).toContain('PUSH');
  });
});

describe('buildSystemPromptConfig', () => {
  it('should return base config for empty outcomes', () => {
    const result = buildSystemPromptConfig([]);

    expect(result).toEqual({
      type: 'preset',
      preset: 'claude_code',
    });
  });

  it('should return base config for undefined outcomes', () => {
    const result = buildSystemPromptConfig();

    expect(result).toEqual({
      type: 'preset',
      preset: 'claude_code',
    });
  });

  it('should return config with Workspace instruction for workspace-only outcome', () => {
    const outcomes: SessionOutcome[] = [
      { type: 'databricks_workspace', path: '/Workspace/test', id: 12345 },
    ];

    const result = buildSystemPromptConfig(outcomes);

    expect(result.type).toBe('preset');
    expect(result.preset).toBe('claude_code');
    expect('append' in result).toBe(true);
    if ('append' in result) {
      expect(result.append).toContain('Databricks Workspace Push Requirements');
    }
  });

  it('should use first workspace path when multiple workspaces exist', () => {
    const outcomes: SessionOutcome[] = [
      { type: 'databricks_workspace', path: '/Workspace/first', id: 12345 },
      { type: 'databricks_workspace', path: '/Workspace/second', id: 67890 },
    ];

    const result = buildSystemPromptConfig(outcomes);

    expect('append' in result).toBe(true);
    if ('append' in result) {
      expect(result.append).toContain('/Workspace/first');
    }
  });
});

describe('SystemPromptConfig type', () => {
  it('should match expected structure without append', () => {
    const config: SystemPromptConfig = {
      type: 'preset',
      preset: 'claude_code',
    };

    expect(config.type).toBe('preset');
    expect(config.preset).toBe('claude_code');
  });

  it('should match expected structure with append', () => {
    const config: SystemPromptConfig = {
      type: 'preset',
      preset: 'claude_code',
      append: 'Additional instructions',
    };

    expect(config.type).toBe('preset');
    expect(config.preset).toBe('claude_code');
    expect(config.append).toBe('Additional instructions');
  });
});
