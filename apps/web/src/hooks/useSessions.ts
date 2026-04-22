import { useState, useEffect, useCallback, useRef } from 'react';
import type { SessionResponse } from '@repo/types';
import { sessionService } from '@/services/session.service';

interface UseSessionsReturn {
  sessions: SessionResponse[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateSession: (updatedSession: SessionResponse) => void;
  getSession: (sessionId: string) => SessionResponse | undefined;
}

export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Ref to avoid getSession depending on sessions state
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let allSessions: SessionResponse[] = [];
      let cursor: string | undefined;
      let hasMore = true;
      const maxPages = 50;

      for (let page = 0; page < maxPages && hasMore; page++) {
        const response = await sessionService.getSessions({
          limit: 100,
          after: cursor,
        });
        allSessions = allSessions.concat(response.data);
        hasMore = response.has_more;
        const nextCursor = response.last_id || undefined;
        if (nextCursor === cursor) break;
        cursor = nextCursor;
      }

      setSessions(allSessions);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load sessions'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSession = useCallback((updatedSession: SessionResponse) => {
    setSessions(prevSessions =>
      prevSessions.map(s => (s.id === updatedSession.id ? updatedSession : s))
    );
  }, []);

  const getSession = useCallback(
    (sessionId: string) => sessionsRef.current.find(s => s.id === sessionId),
    []
  );

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    isLoading,
    error,
    refetch: fetchSessions,
    updateSession,
    getSession,
  };
}
