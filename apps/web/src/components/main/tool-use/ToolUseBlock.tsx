import type { SDKMessage } from '@repo/types';
import { WriteToolUse } from './WriteToolUse';
import { EditToolUse } from './EditToolUse';
import { ReadToolUse } from './ReadToolUse';
import { TodoWriteToolUse } from './TodoWriteToolUse';
import { AskUserQuestionToolUse } from './AskUserQuestionToolUse';
import { TaskToolUse } from './TaskToolUse';
import { DefaultToolUse } from './DefaultToolUse';
import type { ToolResult } from './types';

interface ToolUseBlockProps {
  toolUseId?: string;
  name: string;
  input: Record<string, unknown>;
  result?: ToolResult;
  childEvents?: SDKMessage[];
  toolResultMap: Map<string, ToolResult>;
}

export function ToolUseBlock({
  toolUseId,
  name,
  input,
  result,
  childEvents,
  toolResultMap,
}: ToolUseBlockProps) {
  switch (name) {
    case 'Write':
      return <WriteToolUse name={name} input={input} result={result} />;

    case 'Edit':
      return <EditToolUse name={name} input={input} result={result} />;

    case 'Read':
      return <ReadToolUse name={name} input={input} result={result} />;

    case 'TodoWrite':
      return <TodoWriteToolUse name={name} input={input} result={result} />;

    case 'AskUserQuestion':
      return (
        <AskUserQuestionToolUse
          name={name}
          input={input}
          result={result}
          toolUseId={toolUseId}
        />
      );

    case 'Task':
      return (
        <TaskToolUse
          name={name}
          input={input}
          result={result}
          childEvents={childEvents}
          toolResultMap={toolResultMap}
        />
      );

    default:
      return <DefaultToolUse name={name} input={input} result={result} />;
  }
}
