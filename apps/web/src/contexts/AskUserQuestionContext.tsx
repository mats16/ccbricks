import { createContext, useContext, type ReactNode } from 'react';

interface AskUserQuestionContextValue {
  pendingQuestions: Map<string, Record<string, unknown>>;
  submitAnswer: (toolUseId: string, answers: Record<string, string | string[]>) => void;
}

const AskUserQuestionContext = createContext<AskUserQuestionContextValue | null>(null);

interface AskUserQuestionProviderProps {
  value: AskUserQuestionContextValue;
  children: ReactNode;
}

export function AskUserQuestionProvider({ value, children }: AskUserQuestionProviderProps) {
  return (
    <AskUserQuestionContext.Provider value={value}>
      {children}
    </AskUserQuestionContext.Provider>
  );
}

export function useAskUserQuestion(): AskUserQuestionContextValue {
  const ctx = useContext(AskUserQuestionContext);
  if (!ctx) {
    throw new Error('useAskUserQuestion must be used within AskUserQuestionProvider');
  }
  return ctx;
}
