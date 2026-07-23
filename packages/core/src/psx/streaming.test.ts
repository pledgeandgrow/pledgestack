import { describe, it, expect } from 'vitest';
import { PSXBEncoder, PSXBDecoder, deserializePSXBPayload } from './streaming';

describe('PSX Streaming', () => {
  describe('PSXBEncoder', () => {
    it('encodes data chunks', async () => {
      const encoder = new PSXBEncoder({ module: 'test', function: 'fn' });
      const chunks: Buffer[] = [];

      encoder.on('data', (chunk: Buffer) => chunks.push(chunk));

      encoder.write({ value: 42 });
      encoder.end();

      await new Promise<void>(resolve => encoder.on('end', () => resolve()));

      const total = Buffer.concat(chunks);
      expect(total.length).toBeGreaterThan(0);
    });
  });

  describe('PSXBEncoder + PSXBDecoder roundtrip', () => {
    it('roundtrips data through encoder and decoder', async () => {
      const encoder = new PSXBEncoder({ module: 'test', function: 'fn' });
      const decoder = new PSXBDecoder();
      const received: unknown[] = [];

      decoder.on('data', (chunk) => {
        received.push(chunk);
      });

      encoder.pipe(decoder);
      encoder.write({ message: 'hello' });
      encoder.end();

      await new Promise<void>(resolve => decoder.on('end', () => resolve()));

      expect(received.length).toBeGreaterThanOrEqual(1);
      const first = received[0] as { type: string; module: string };
      expect(first.type).toBe('data');
      expect(first.module).toBe('test');
    });
  });

  describe('deserializePSXBPayload', () => {
    it('deserializes JSON payload', () => {
      const payload = Buffer.from(JSON.stringify({ x: 1 }), 'utf-8');
      const result = deserializePSXBPayload(payload);
      expect(result).toEqual({ x: 1 });
    });

    it('returns null for empty payload', () => {
      expect(deserializePSXBPayload(Buffer.alloc(0))).toBeNull();
    });
  });
});
