import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusDot } from './BaseToolUse';
import { CollapsibleContent } from '../CollapsibleContent';
import { useAskUserQuestion } from '@/contexts/AskUserQuestionContext';
import type { BaseToolUseProps } from './types';

interface QuestionOption {
  label: string;
  description?: string;
}

interface Question {
  question: string;
  header: string;
  multiSelect?: boolean;
  options?: QuestionOption[];
}

interface AskUserQuestionInput {
  questions?: Question[];
  question?: string;
}

interface AskUserQuestionToolUseProps extends BaseToolUseProps {
  toolUseId?: string;
}

/**
 * tool_result テキストから回答をパース
 * 形式: User has answered your questions: "header1"="label1", "header2"="label2". ...
 */
function parseAnswersFromResult(content: string): Record<string, string> {
  const answers: Record<string, string> = {};
  const regex = /"([^"]+)"="([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    answers[match[1]] = match[2];
  }
  return answers;
}

export function AskUserQuestionToolUse({ input, result, toolUseId }: AskUserQuestionToolUseProps) {
  const { t } = useTranslation();
  const typedInput = input as unknown as AskUserQuestionInput;
  const { pendingQuestions, submitAnswer } = useAskUserQuestion();

  const isRunning = !result;
  const isSuccess = result && !result.isError;
  const isError = result?.isError;

  const questions = typedInput.questions;
  const hasTabbed = questions && questions.length > 0;

  // この tool_use_id が pending（ユーザーの回答待ち）かどうか
  const isPending = toolUseId ? pendingQuestions.has(toolUseId) : false;

  // 結果がある場合、回答をパースして初期選択状態に反映
  const answeredSelections = result && !result.isError
    ? parseAnswersFromResult(result.content)
    : undefined;

  const handleSubmit = useCallback(
    (answers: Record<string, string | string[]>) => {
      if (toolUseId) {
        submitAnswer(toolUseId, answers);
      }
    },
    [toolUseId, submitAnswer],
  );

  return (
    <div className="py-1">
      <div className="flex items-start gap-1">
        <StatusDot isRunning={isRunning} isSuccess={!!isSuccess} isError={!!isError} className="mt-1.5" />
        <span className="font-bold text-sm flex-shrink-0">{t('tools.askUserQuestion')}</span>
      </div>

      {hasTabbed ? (
        <TabbedQuestions
          questions={questions}
          isPending={isPending}
          answeredSelections={answeredSelections}
          onSubmit={handleSubmit}
        />
      ) : typedInput.question ? (
        <div className="mt-2 ml-5 text-sm text-muted-foreground">{typedInput.question}</div>
      ) : null}

      {result && result.isError && (
        <CollapsibleContent content={result.content} isError={result.isError} />
      )}
    </div>
  );
}

interface TabbedQuestionsProps {
  questions: Question[];
  isPending: boolean;
  /** 回答済みの場合、パース結果を渡す（header → label） */
  answeredSelections?: Record<string, string>;
  onSubmit: (answers: Record<string, string | string[]>) => void;
}

function TabbedQuestions({ questions, isPending, answeredSelections, onSubmit }: TabbedQuestionsProps) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);

  // 各質問の選択状態: header → selected label(s)
  const [selections, setSelections] = useState<Record<string, string | string[]>>(() => {
    const initial: Record<string, string | string[]> = {};
    for (const q of questions) {
      if (answeredSelections?.[q.header]) {
        const val = answeredSelections[q.header];
        initial[q.header] = q.multiSelect ? val.split(',') : val;
      } else {
        initial[q.header] = q.multiSelect ? [] : '';
      }
    }
    return initial;
  });

  const isLastTab = activeIndex === questions.length - 1;
  const isFirstTab = activeIndex === 0;
  const activeQuestion = questions[activeIndex];

  const goNext = () => {
    if (!isLastTab) setActiveIndex(activeIndex + 1);
  };

  const goPrev = () => {
    if (!isFirstTab) setActiveIndex(activeIndex - 1);
  };

  const handleSelect = (header: string, label: string, multiSelect: boolean) => {
    setSelections((prev) => {
      if (multiSelect) {
        const current = (prev[header] as string[]) ?? [];
        const next = current.includes(label)
          ? current.filter((l) => l !== label)
          : [...current, label];
        return { ...prev, [header]: next };
      }
      return { ...prev, [header]: label };
    });
  };

  // 全質問で少なくとも1つ選択されているか
  const allAnswered = questions.every((q) => {
    const sel = selections[q.header];
    if (q.multiSelect) return (sel as string[]).length > 0;
    return (sel as string) !== '';
  });

  const handleSubmit = () => {
    if (allAnswered) {
      onSubmit(selections);
    }
  };

  return (
    <div className="mt-2 ml-5">
      <QuestionPanel
        question={activeQuestion}
        stepLabel={questions.length > 1
          ? t('tools.askQuestionStep', { current: activeIndex + 1, total: questions.length })
          : undefined}
        selection={selections[activeQuestion.header]}
        isPending={isPending}
        onSelect={(label) =>
          handleSelect(activeQuestion.header, label, activeQuestion.multiSelect ?? false)
        }
      />

      {questions.length > 1 && (
        <div className="flex items-center justify-end mt-3">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={goPrev}
              disabled={isFirstTab}
              className={cn(
                'text-xs px-2.5 py-1 rounded-md border border-border transition-colors',
                isFirstTab
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {t('tools.askQuestionPrev')}
            </button>
            {isLastTab && isPending ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!allAnswered}
                className={cn(
                  'text-xs px-3 py-1 rounded-md transition-colors font-medium',
                  allAnswered
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed',
                )}
              >
                {t('tools.askQuestionSubmit')}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={isLastTab}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md border border-border transition-colors',
                  isLastTab
                    ? 'text-muted-foreground/40 cursor-not-allowed'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {t('tools.askQuestionNext')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface QuestionPanelProps {
  question: Question;
  stepLabel?: string;
  selection: string | string[];
  isPending: boolean;
  onSelect: (label: string) => void;
}

function QuestionPanel({ question, stepLabel, selection, isPending, onSelect }: QuestionPanelProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{question.question}</p>
        {stepLabel && (
          <span className="text-xs text-muted-foreground flex-shrink-0">{stepLabel}</span>
        )}
      </div>
      {question.options && question.options.length > 0 && (
        <div className="space-y-1.5">
          {question.options.map((option) => {
            const isSelected = question.multiSelect
              ? (selection as string[]).includes(option.label)
              : selection === option.label;
            return (
              <OptionCard
                key={option.label}
                option={option}
                isMultiSelect={question.multiSelect ?? false}
                isSelected={isSelected}
                isPending={isPending}
                onSelect={() => onSelect(option.label)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface OptionCardProps {
  option: QuestionOption;
  isMultiSelect: boolean;
  isSelected: boolean;
  isPending: boolean;
  onSelect: () => void;
}

function OptionCard({ option, isMultiSelect, isSelected, isPending, onSelect }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={isPending ? onSelect : undefined}
      disabled={!isPending}
      className={cn(
        'flex items-start gap-2.5 rounded-md border p-2.5 w-full text-left transition-colors',
        isPending && 'cursor-pointer hover:bg-accent/50',
        !isPending && 'cursor-default',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card',
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {isMultiSelect ? (
          <div
            className={cn(
              'h-3.5 w-3.5 rounded-sm border flex items-center justify-center',
              isSelected
                ? 'border-primary bg-primary'
                : 'border-muted-foreground/40',
            )}
          >
            {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
          </div>
        ) : (
          <div
            className={cn(
              'h-3.5 w-3.5 rounded-full border flex items-center justify-center',
              isSelected
                ? 'border-primary'
                : 'border-muted-foreground/40',
            )}
          >
            {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium leading-tight">{option.label}</div>
        {option.description && (
          <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {option.description}
          </div>
        )}
      </div>
    </button>
  );
}
