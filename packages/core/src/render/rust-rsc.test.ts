import { describe, it, expect } from 'vitest';
import { isRustRSCSerializerAvailable, analyzeModule } from './rust-rsc';

describe('rust-rsc', () => {
  describe('isRustRSCSerializerAvailable', () => {
    it('returns a boolean without throwing', () => {
      expect(typeof isRustRSCSerializerAvailable()).toBe('boolean');
    });

    it('returns false when native addon is not compiled', () => {
      expect(isRustRSCSerializerAvailable()).toBe(false);
    });
  });

  describe('analyzeModule', () => {
    it('detects "use client" directive', () => {
      const source = `"use client"
import { useState } from "react";
export default function Button() { return null; }`;
      const result = analyzeModule('button.tsx', source);
      expect(result.hasClientComponents).toBe(true);
    });

    it('detects server components (no "use client")', () => {
      const source = `import { db } from "./db";
export default async function Page() { return null; }`;
      const result = analyzeModule('page.tsx', source);
      expect(result.hasClientComponents).toBe(false);
    });

    it('extracts imports', () => {
      const source = `import React from "react";
import { useState } from "react";
import db from "./db";`;
      const result = analyzeModule('test.tsx', source);
      expect(result.imports).toContain('react');
      expect(result.imports).toContain('./db');
    });
  });
});
