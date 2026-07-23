import { describe, it, expect } from 'vitest';
import { PsxSourceMapManager, PsxDebugSession, DapProtocolHandler } from './debug-session';

describe('PSX Debug Session', () => {
  describe('PsxSourceMapManager', () => {
    it('maps PSX lines to Rust lines', () => {
      const manager = new PsxSourceMapManager();
      manager.addEntries([
        { psxFile: 'page.psx', psxLine: 10, rustFile: 'page.rs', rustLine: 25 },
      ]);
      const mapped = manager.mapToRust('page.psx', 10);
      expect(mapped?.rustFile).toBe('page.rs');
      expect(mapped?.rustLine).toBe(25);
    });

    it('maps Rust lines back to PSX', () => {
      const manager = new PsxSourceMapManager();
      manager.addEntries([
        { psxFile: 'page.psx', psxLine: 10, rustFile: 'page.rs', rustLine: 25 },
      ]);
      const mapped = manager.mapToPsx('page.rs', 25);
      expect(mapped?.psxFile).toBe('page.psx');
      expect(mapped?.psxLine).toBe(10);
    });

    it('returns undefined for unmapped lines', () => {
      const manager = new PsxSourceMapManager();
      expect(manager.mapToRust('unknown.psx', 1)).toBeUndefined();
    });
  });

  describe('PsxDebugSession', () => {
    it('sets breakpoints with source mapping', () => {
      const session = new PsxDebugSession({
        program: 'test.psx',
        sourceMaps: [
          { psxFile: 'test.psx', psxLine: 5, rustFile: 'test.rs', rustLine: 10 },
        ],
      });
      const breakpoints = session.setBreakpoints('test.psx', [5]);
      expect(breakpoints[0].verified).toBe(true);
      expect(breakpoints[0].rustLine).toBe(10);
    });

    it('marks unmapped breakpoints as unverified', () => {
      const session = new PsxDebugSession({
        program: 'test.psx',
      });
      const breakpoints = session.setBreakpoints('test.psx', [99]);
      expect(breakpoints[0].verified).toBe(false);
    });

    it('initializes with capabilities', () => {
      const session = new PsxDebugSession({ program: 'test.psx' });
      const caps = session.initialize();
      expect(caps.supportsConfigurationDoneRequest).toBe(true);
      expect(caps.supportsEvaluateForHovers).toBe(true);
    });
  });

  describe('DapProtocolHandler', () => {
    it('handles initialize request', async () => {
      const handler = new DapProtocolHandler({ program: 'test.psx' });
      const response = await handler.handleRequest('initialize', {});
      expect(response.supportsConfigurationDoneRequest).toBe(true);
    });

    it('handles setBreakpoints request', async () => {
      const handler = new DapProtocolHandler({
        program: 'test.psx',
        sourceMaps: [
          { psxFile: 'test.psx', psxLine: 5, rustFile: 'test.rs', rustLine: 10 },
        ],
      });
      const response = await handler.handleRequest('setBreakpoints', {
        source: { path: 'test.psx' },
        breakpoints: [{ line: 5 }],
      }) as { breakpoints: Array<{ verified: boolean }> };
      expect(response.breakpoints).toBeDefined();
      expect(response.breakpoints[0].verified).toBe(true);
    });
  });
});
