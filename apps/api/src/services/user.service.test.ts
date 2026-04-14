import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getOrCreateUser } from './user.service.js';

vi.mock('./admin.service.js', () => ({
  getDefaultNewUserIsAdmin: vi.fn().mockResolvedValue(true),
}));

describe('user.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create mock Fastify instance
  const createMockFastify = (existingUser: boolean = false): FastifyInstance => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockLimit = vi
      .fn()
      .mockResolvedValue(
        existingUser
          ? [{ id: 'user-123', name: 'Test User', email: 'test@example.com', isAdmin: false }]
          : []
      );

    const mockInsert = vi.fn().mockReturnThis();
    const mockValues = vi.fn().mockReturnThis();
    const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined);

    const mockWithUserContext = vi.fn(
      async (_userId: string, callback: (tx: unknown) => Promise<unknown>) => {
        const mockTx = {
          insert: mockInsert,
          values: mockValues,
          onConflictDoNothing: mockOnConflictDoNothing,
        };

        // Chain methods correctly
        mockInsert.mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoNothing: mockOnConflictDoNothing,
          }),
        });

        return callback(mockTx);
      }
    );

    return {
      db: {
        select: mockSelect,
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: mockLimit,
          }),
        }),
      },
      withUserContext: mockWithUserContext,
    } as unknown as FastifyInstance;
  };

  describe('getOrCreateUser', () => {
    it('should return existing user without creating new one', async () => {
      const fastify = createMockFastify(true);
      const userInfo = { id: 'user-123', name: 'Test User', email: 'test@example.com' };

      const result = await getOrCreateUser(fastify, userInfo);

      expect(result).toEqual({ ...userInfo, is_admin: false });
      expect(fastify.withUserContext).not.toHaveBeenCalled();
    });

    it('should create new user when not exists', async () => {
      const fastify = createMockFastify(false);
      const userInfo = { id: 'new-user-456', name: 'New User', email: 'new@example.com' };

      const result = await getOrCreateUser(fastify, userInfo);

      expect(result).toEqual({ ...userInfo, is_admin: true });
      expect(fastify.withUserContext).toHaveBeenCalledWith('new-user-456', expect.any(Function));
    });

    it('should call withUserContext with the correct userId', async () => {
      const fastify = createMockFastify(false);

      await getOrCreateUser(fastify, { id: 'user-123', name: 'Test', email: 'test@test.com' });

      expect(fastify.withUserContext).toHaveBeenCalledWith('user-123', expect.any(Function));
    });

    it('should insert into users table', async () => {
      let insertCalled = false;

      const mockWithUserContext = vi.fn(
        async (_userId: string, callback: (tx: unknown) => Promise<unknown>) => {
          const mockTx = {
            insert: vi.fn(() => {
              insertCalled = true;
              return {
                values: vi.fn().mockReturnValue({
                  onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
                }),
              };
            }),
          };
          return callback(mockTx);
        }
      );

      const fastify = {
        db: {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        },
        withUserContext: mockWithUserContext,
      } as unknown as FastifyInstance;

      await getOrCreateUser(fastify, { id: 'user-123', name: 'Test', email: 'test@test.com' });

      expect(mockWithUserContext).toHaveBeenCalled();
      expect(insertCalled).toBe(true);
    });

    it('should insert into user_settings table', async () => {
      let insertCount = 0;

      const mockWithUserContext = vi.fn(
        async (_userId: string, callback: (tx: unknown) => Promise<unknown>) => {
          const mockTx = {
            insert: vi.fn(() => {
              insertCount++;
              return {
                values: vi.fn().mockReturnValue({
                  onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
                }),
              };
            }),
          };
          return callback(mockTx);
        }
      );

      const fastify = {
        db: {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        },
        withUserContext: mockWithUserContext,
      } as unknown as FastifyInstance;

      await getOrCreateUser(fastify, { id: 'user-123', name: 'Test', email: 'test@test.com' });

      // Should have 2 insert calls (users and user_settings)
      expect(insertCount).toBe(2);
    });

    it('should use onConflictDoNothing for race condition handling', async () => {
      const onConflictCalls: number[] = [];

      const mockWithUserContext = vi.fn(
        async (_userId: string, callback: (tx: unknown) => Promise<unknown>) => {
          const mockTx = {
            insert: vi.fn(() => ({
              values: vi.fn().mockReturnValue({
                onConflictDoNothing: vi.fn(() => {
                  onConflictCalls.push(1);
                  return Promise.resolve(undefined);
                }),
              }),
            })),
          };
          return callback(mockTx);
        }
      );

      const fastify = {
        db: {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        },
        withUserContext: mockWithUserContext,
      } as unknown as FastifyInstance;

      await getOrCreateUser(fastify, { id: 'user-123', name: 'Test', email: 'test@test.com' });

      // Both inserts should use onConflictDoNothing
      expect(onConflictCalls.length).toBe(2);
    });

    it('should return user info regardless of creation', async () => {
      // Test with existing user
      const existingFastify = createMockFastify(true);
      const userInfo = { id: 'user-123', name: 'Test User', email: 'test@example.com' };

      const existingResult = await getOrCreateUser(existingFastify, userInfo);
      expect(existingResult).toEqual({ ...userInfo, is_admin: false });

      // Test with new user
      const newFastify = createMockFastify(false);
      const newResult = await getOrCreateUser(newFastify, userInfo);
      expect(newResult).toEqual({ ...userInfo, is_admin: true });
    });
  });
});
