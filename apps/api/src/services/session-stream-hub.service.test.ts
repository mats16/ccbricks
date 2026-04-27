import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SseWritable } from './session-stream-hub.service.js';

let moduleUnderTest: typeof import('./session-stream-hub.service.js');

function createWritable(): SseWritable & { write: ReturnType<typeof vi.fn> } {
  return {
    write: vi.fn(() => true),
  };
}

describe('SessionStreamHub', () => {
  beforeEach(async () => {
    vi.resetModules();
    moduleUnderTest = await import('./session-stream-hub.service.js');
  });

  describe('encodeSseEvent', () => {
    it('should encode event, id, retry, and JSON data', () => {
      const payload = moduleUnderTest.encodeSseEvent(
        'message',
        { type: 'user', text: 'hello' },
        'event-1',
        1000
      );

      expect(payload).toBe(
        [
          'id: event-1',
          'event: message',
          'retry: 1000',
          'data: {"type":"user","text":"hello"}',
          '',
          '',
        ].join('\n')
      );
    });

    it('should encode events without optional id and retry fields', () => {
      const payload = moduleUnderTest.encodeSseEvent('message', 'line1\nline2');

      expect(payload).toBe(['event: message', 'data: "line1\\nline2"', '', ''].join('\n'));
    });
  });

  describe('sessionStreamHub', () => {
    it('should broadcast to all streams for a session', () => {
      const stream1 = createWritable();
      const stream2 = createWritable();

      moduleUnderTest.sessionStreamHub.addConnection('session-1', 'user-1', stream1);
      moduleUnderTest.sessionStreamHub.addConnection('session-1', 'user-1', stream2);

      moduleUnderTest.sessionStreamHub.send('session-1', {
        type: 'assistant',
        uuid: 'event-1',
        session_id: 'session-1',
      } as never);

      expect(stream1.write).toHaveBeenCalledWith(
        [
          'id: event-1',
          'event: message',
          'data: {"type":"assistant","uuid":"event-1","session_id":"session-1"}',
          '',
          '',
        ].join('\n')
      );
      expect(stream2.write).toHaveBeenCalled();
    });

    it('should cleanup closed streams', () => {
      const stream = createWritable();
      const cleanup = moduleUnderTest.sessionStreamHub.addConnection('session-1', 'user-1', stream);

      expect(moduleUnderTest.sessionStreamHub.getConnectionCount('session-1')).toBe(1);

      cleanup();

      expect(moduleUnderTest.sessionStreamHub.getConnectionCount('session-1')).toBe(0);
    });

    it('should remove streams that throw during write', () => {
      const stream = createWritable();
      stream.write.mockImplementationOnce(() => {
        throw new Error('closed');
      });
      moduleUnderTest.sessionStreamHub.addConnection('session-1', 'user-1', stream);

      moduleUnderTest.sessionStreamHub.send('session-1', { type: 'error' } as never);

      expect(moduleUnderTest.sessionStreamHub.getConnectionCount('session-1')).toBe(0);
    });
  });
});
