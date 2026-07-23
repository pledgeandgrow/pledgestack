import { describe, it, expect } from 'vitest';
import {
  auditNapiBindings,
  scanRustSource,
  auditProjectSecurity,
  formatSecurityReport,
} from './security';

describe('PSX Security', () => {
  describe('scanRustSource', () => {
    it('detects unsafe blocks', () => {
      const source = `
        pub fn test() {
            unsafe {
                let ptr = std::ptr::null_mut();
            }
        }
      `;
      const findings = scanRustSource(source, 'test.rs');
      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some(f => f.category === 'unsafe-block')).toBe(true);
    });

    it('detects raw pointers', () => {
      const source = `
        pub fn test() {
            let ptr: *const u8 = std::ptr::null();
        }
      `;
      const findings = scanRustSource(source, 'test.rs');
      expect(findings.some(f => f.category === 'raw-pointer')).toBe(true);
    });

    it('detects unwrap() calls', () => {
      const source = `
        pub fn test() -> i32 {
            Some(42).unwrap()
        }
      `;
      const findings = scanRustSource(source, 'test.rs');
      expect(findings.some(f => f.category === 'unwrap')).toBe(true);
    });

    it('detects expect() calls', () => {
      const source = `
        pub fn test() -> i32 {
            Some(42).expect("failed")
        }
      `;
      const findings = scanRustSource(source, 'test.rs');
      expect(findings.some(f => f.category === 'expect')).toBe(true);
    });

    it('detects FFI extern blocks', () => {
      const source = `
        extern "C" {
            fn external_func(x: i32) -> i32;
        }
      `;
      const findings = scanRustSource(source, 'test.rs');
      expect(findings.some(f => f.category === 'ffi')).toBe(true);
    });

    it('detects subprocess Command usage', () => {
      const source = `
        use std::process::Command;
        pub fn run() {
            Command::new("ls").output().unwrap();
        }
      `;
      const findings = scanRustSource(source, 'test.rs');
      expect(findings.some(f => f.category === 'subprocess')).toBe(true);
    });

    it('detects file system access', () => {
      const source = `
        use std::fs;
        pub fn read() {
            let content = fs::read_to_string("file.txt").unwrap();
        }
      `;
      const findings = scanRustSource(source, 'test.rs');
      expect(findings.some(f => f.category === 'filesystem')).toBe(true);
    });

    it('detects network access', () => {
      const source = `
        use std::net::TcpStream;
        pub fn connect() {
            let stream = TcpStream::connect("127.0.0.1:8080").unwrap();
        }
      `;
      const findings = scanRustSource(source, 'test.rs');
      expect(findings.some(f => f.category === 'network')).toBe(true);
    });

    it('returns empty findings for safe code', () => {
      const source = `
        pub fn add(a: i32, b: i32) -> i32 {
            a + b
        }
      `;
      const findings = scanRustSource(source, 'test.rs');
      expect(findings.length).toBe(0);
    });
  });

  describe('auditNapiBindings', () => {
    it('detects napi functions without proper error handling', () => {
      const source = `
        #[napi]
        pub fn risky() -> i32 {
            Some(42).unwrap()
        }
      `;
      const findings = auditNapiBindings(source, 'napi.rs');
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  describe('formatSecurityReport', () => {
    it('formats a report with findings', () => {
      const report = {
        timestamp: new Date().toISOString(),
        projectRoot: '/test',
        findings: [
          { severity: 'high' as const, category: 'unsafe-block', file: 'test.rs', line: 5, message: 'Unsafe block detected', recommendation: 'Review safety' },
        ],
        summary: { critical: 0, high: 1, medium: 0, low: 0, info: 0, total: 1, filesScanned: 1, passed: false },
        sandboxConfig: { allowFs: true, allowNetwork: true, allowSubprocess: false, allowUnsafe: false, allowedPaths: [], allowedHosts: [], allowedEnvVars: [] },
      };
      const formatted = formatSecurityReport(report);
      expect(formatted).toContain('Security Audit Report');
      expect(formatted).toContain('unsafe-block');
    });
  });
});
