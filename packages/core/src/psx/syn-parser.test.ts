import { describe, it, expect } from 'vitest';
import { tokenizeRust, parseRustAst } from './syn-parser';

describe('Syn-based Rust Parser', () => {
  describe('tokenizeRust', () => {
    it('tokenizes a simple function', () => {
      const tokens = tokenizeRust('pub fn add(a: i32, b: i32) -> i32 { a + b }');
      expect(tokens.some(t => t.type === 'keyword' && t.value === 'pub')).toBe(true);
      expect(tokens.some(t => t.type === 'keyword' && t.value === 'fn')).toBe(true);
      expect(tokens.some(t => t.type === 'ident' && t.value === 'add')).toBe(true);
    });

    it('tokenizes structs', () => {
      const tokens = tokenizeRust('struct Foo { x: i32 }');
      expect(tokens.some(t => t.type === 'keyword' && t.value === 'struct')).toBe(true);
      expect(tokens.some(t => t.type === 'ident' && t.value === 'Foo')).toBe(true);
    });

    it('tokenizes strings', () => {
      const tokens = tokenizeRust('let s = "hello";');
      expect(tokens.some(t => t.type === 'string' && t.value === '"hello"')).toBe(true);
    });

    it('tokenizes lifetimes', () => {
      const tokens = tokenizeRust("fn foo<'a>(x: &'a str) {}");
      expect(tokens.some(t => t.type === 'lifetime' && t.value === "'a")).toBe(true);
    });

    it('tokenizes numbers', () => {
      const tokens = tokenizeRust('let x = 42;');
      expect(tokens.some(t => t.type === 'number' && t.value === '42')).toBe(true);
    });

    it('handles comments', () => {
      const tokens = tokenizeRust('// comment\nfn test() {}');
      expect(tokens.some(t => t.type === 'keyword' && t.value === 'fn')).toBe(true);
    });
  });

  describe('parseRustAst', () => {
    it('parses a function', () => {
      const result = parseRustAst('pub fn add(a: i32, b: i32) -> i32 { a + b }');
      expect(result.functions.length).toBe(1);
      expect(result.functions[0].name).toBe('add');
      expect(result.functions[0].visibility).toBe('pub');
    });

    it('parses a struct', () => {
      const result = parseRustAst('pub struct User { name: String, age: u32 }');
      expect(result.structs.length).toBe(1);
      expect(result.structs[0].name).toBe('User');
      expect(result.structs[0].fields.length).toBe(2);
    });

    it('parses an enum', () => {
      const result = parseRustAst('enum Color { Red, Green, Blue }');
      expect(result.enums.length).toBe(1);
      expect(result.enums[0].name).toBe('Color');
      expect(result.enums[0].variants.length).toBe(3);
    });

    it('parses use statements', () => {
      const result = parseRustAst('use std::collections::HashMap;');
      expect(result.uses.length).toBe(1);
      expect(result.uses[0].path).toContain('std');
    });

    it('parses async functions', () => {
      const result = parseRustAst('pub async fn fetch() -> String { "hello".to_string() }');
      expect(result.functions.length).toBe(1);
      expect(result.functions[0].isAsync).toBe(true);
    });

    it('parses attributes', () => {
      const result = parseRustAst('#[napi]\npub fn test() -> i32 { 42 }');
      expect(result.functions.length).toBe(1);
      expect(result.functions[0].attributes.length).toBe(1);
      expect(result.functions[0].attributes[0].name).toBe('napi');
    });

    it('parses multiple items', () => {
      const source = `
        pub fn add(a: i32, b: i32) -> i32 { a + b }
        pub struct Point { x: f64, y: f64 }
        enum Direction { Up, Down, Left, Right }
      `;
      const result = parseRustAst(source);
      expect(result.functions.length).toBe(1);
      expect(result.structs.length).toBe(1);
      expect(result.enums.length).toBe(1);
    });
  });
});
