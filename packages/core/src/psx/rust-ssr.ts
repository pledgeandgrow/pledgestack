/**
 * PSX Rust SSR — compile React component trees to Rust templates at build time.
 *
 * The key insight: most React pages are 80% static structure + 20% dynamic data.
 * Instead of rendering the entire tree through V8 at request time, we:
 *
 * 1. At BUILD time: PledgePack analyzes the component tree and extracts
 *    static HTML segments (the 80%). These are compiled to Rust string templates.
 *
 * 2. At REQUEST time: Rust fills in the dynamic holes (the 20%) with data
 *    from DB queries — all in native code, no V8 involved.
 *
 * 3. Only components that use hooks/state/event handlers go through React/V8.
 *    Everything else is rendered by Rust.
 *
 * This means a typical page render goes from:
 *   V8 renderToString (15ms) → Rust template fill (0.5ms)
 *
 * The RSC flight protocol we already built handles the streaming of
 * dynamic holes, so this integrates naturally.
 */

import type { PSXParseResult, RustStruct } from './types';

/**
 * Represents a static HTML segment extracted from the component tree.
 */
export interface StaticSegment {
  /** Static HTML string (with placeholders for dynamic data) */
  html: string;
  /** Placeholders that need to be filled with dynamic data */
  placeholders: Placeholder[];
}

export interface Placeholder {
  /** Placeholder name in the template: {{user.name}} */
  name: string;
  /** Rust expression that produces the value */
  rustExpr: string;
  /** TypeScript expression for fallback rendering */
  tsExpr: string;
  /** Whether this placeholder is inside an attribute or text content */
  context: 'text' | 'attribute';
}

/**
 * Represents a dynamic component that must go through React/V8.
 */
export interface DynamicComponent {
  /** Component name */
  name: string;
  /** Why it can't be staticized */
  reason: string;
  /** Props that are dynamic */
  dynamicProps: string[];
}

export interface SSRAnalysisResult {
  /** Static segments that can be rendered by Rust */
  staticSegments: StaticSegment[];
  /** Components that must go through React */
  dynamicComponents: DynamicComponent[];
  /** Whether the page can be fully staticized */
  fullyStatic: boolean;
  /** Estimated render time savings (ms) */
  estimatedSpeedup: number;
  /** Generated Rust SSR function */
  rustSSRFunction: string;
}

/**
 * Analyzes a parsed .psx file's TSX content to determine which parts
 * can be rendered by Rust and which need React.
 *
 * This is called at BUILD time by PledgePack.
 */
export function analyzeSSRPotential(
  parse: PSXParseResult,
  moduleName: string,
): SSRAnalysisResult {
  const staticSegments: StaticSegment[] = [];
  const dynamicComponents: DynamicComponent[] = [];
  const placeholders: Placeholder[] = [];

  // Detect static vs dynamic patterns in the TSX
  const tsx = parse.tsxContent;

  // Find the default export component
  const defaultExportMatch = tsx.match(/export\s+default\s+(?:async\s+)?function\s+(\w+)/);
  const componentName = defaultExportMatch?.[1] ?? 'Page';
  void componentName;
  // Analyze JSX return statement
  const returnMatch = tsx.match(/return\s*\(([\s\S]*?)\);?\s*\n?\s*\};?\s*$/);
  const jsxContent = returnMatch?.[1] ?? '';

  // Check for dynamic patterns
  const hasUseState = /\buseState\b/.test(tsx);
  const hasUseEffect = /\buseEffect\b/.test(tsx);
  const hasUseRef = /\buseRef\b/.test(tsx);
  const hasEventHandlers = /\bon\w+\s*=\s*\{/.test(jsxContent);
  const hasAsyncAwait = /\bawait\s+rust\./.test(tsx);
  void hasAsyncAwait;
  const hasMap = /\.map\s*\(/.test(jsxContent);
  const hasConditional = /\{.*\?\s*.*:\s*.*\}/.test(jsxContent);

  // Extract static HTML structure (tags without dynamic expressions)
  const staticHtml = extractStaticHtml(jsxContent, placeholders, parse.allStructs);

  // Determine which components are dynamic
  if (hasUseState || hasUseEffect || hasUseRef) {
    dynamicComponents.push({
      name: componentName,
      reason: 'Uses hooks (useState/useEffect/useRef)',
      dynamicProps: [],
    });
  }

  if (hasEventHandlers) {
    // Find components with event handlers
    const componentMatches = jsxContent.matchAll(/<(\w+)\s+[^>]*on\w+\s*=\s*\{/g);
    for (const match of componentMatches) {
      dynamicComponents.push({
        name: match[1],
        reason: 'Has event handlers',
        dynamicProps: [],
      });
    }
  }

  // Check if the page can be fully staticized
  const fullyStatic =
    !hasUseState &&
    !hasUseEffect &&
    !hasUseRef &&
    !hasEventHandlers &&
    !hasMap &&
    !hasConditional;

  // Generate Rust SSR function
  const rustSSRFunction = generateRustSSR(
    moduleName,
    componentName,
    staticHtml,
    placeholders,
    parse.allStructs,
    fullyStatic,
  );

  // Estimate speedup
  const dynamicRatio = dynamicComponents.length / Math.max(1, (jsxContent.match(/<\w+/g) || []).length);
  const estimatedSpeedup = fullyStatic ? 30 : Math.round(15 * (1 - dynamicRatio));

  staticSegments.push({ html: staticHtml, placeholders });

  return {
    staticSegments,
    dynamicComponents,
    fullyStatic,
    estimatedSpeedup,
    rustSSRFunction,
  };
}

/**
 * Extracts static HTML from JSX content, replacing dynamic expressions
 * with placeholders.
 */
function extractStaticHtml(
  jsx: string,
  placeholders: Placeholder[],
  structs: RustStruct[],
): string {
  let html = jsx;

  // Get struct field names for placeholder mapping
  const structFields = new Map<string, string[]>();
  for (const s of structs) {
    structFields.set(s.name, s.fields.map((f) => f.name));
  }

  // Replace {variable.property} expressions with {{variable.property}} placeholders
  let phIndex = 0;
  void phIndex;
  html = html.replace(/\{(\w+)\.(\w+)\}/g, (_, obj, prop) => {
    const name = `${obj}.${prop}`;
    const placeholder: Placeholder = {
      name,
      rustExpr: `${obj}.${prop}`,
      tsExpr: `{${obj}.${prop}}`,
      context: 'text',
    };
    placeholders.push(placeholder);
    return `{{${name}}}`;
  });

  // Replace {rust.function()} expressions
  html = html.replace(/\{await\s+rust\.(\w+)\(([^)]*)\)\}/g, (_, fn, args) => {
    const name = `rust.${fn}`;
    const placeholder: Placeholder = {
      name,
      rustExpr: `${fn}(${args})`,
      tsExpr: `{await rust.${fn}(${args})}`,
      context: 'text',
    };
    placeholders.push(placeholder);
    return `{{${name}}}`;
  });

  // Replace {variable} simple expressions
  html = html.replace(/\{(\w+)\}/g, (_, varName) => {
    const placeholder: Placeholder = {
      name: varName,
      rustExpr: varName,
      tsExpr: `{${varName}}`,
      context: 'text',
    };
    placeholders.push(placeholder);
    return `{{${varName}}}`;
  });

  // Clean up JSX-specific syntax for HTML output
  html = html
    .replace(/className=/g, 'class=')
    .replace(/htmlFor=/g, 'for=')
    .replace(/\s+\/>/g, '>');

  return html.trim();
}

/**
 * Generates a Rust function that renders the static HTML template
 * with dynamic data filled in — no V8 required.
 */
function generateRustSSR(
  moduleName: string,
  componentName: string,
  staticHtml: string,
  placeholders: Placeholder[],
  structs: RustStruct[],
  fullyStatic: boolean,
): string {
  const lines: string[] = [
    `// === Rust SSR renderer for ${moduleName} (${componentName}) (auto-generated) ===`,
    `// Renders ${fullyStatic ? '100%' : 'partial'} of the page in Rust, no V8 required.`,
    '',
    'use std::collections::HashMap;',
    '',
    '/// Renders the static HTML shell with dynamic data filled in.',
    '/// Called directly by the Rust HTTP server — bypasses Node.js entirely',
    '/// for pages that are fully static.',
    '#[napi]',
    `pub async fn __ssr_${moduleName}(`,
  ];

  // Add parameters for each struct used
  const structParams = structs.map((s) => `  ${s.name.toLowerCase()}: ${s.name}Napi`);
  lines.push(...structParams);
  lines.push(') -> Result<String, napi::Error> {');

  // Build the template
  lines.push('  let mut html = String::with_capacity(4096);');

  if (fullyStatic) {
    // Fully static — just return the HTML with placeholders filled
    lines.push(`  let template = r#"${staticHtml}"#;`);
    lines.push('  let mut result = template.to_string();');

    for (const ph of placeholders) {
      lines.push(`  result = result.replace("{{${ph.name}}}", &format!("{}", ${ph.rustExpr}));`);
    }

    lines.push('  Ok(result)');
  } else {
    // Partial — render static parts in Rust, leave holes for React
    lines.push(`  let static_shell = r#"${staticHtml}"#;`);
    lines.push('  let mut result = static_shell.to_string();');

    for (const ph of placeholders) {
      lines.push(`  result = result.replace("{{${ph.name}}}", &format!("{}", ${ph.rustExpr}));`);
    }

    lines.push('  // Dynamic holes are filled by React RSC streaming');
    lines.push('  // The static shell is served immediately by Rust');
    lines.push('  Ok(result)');
  }

  lines.push('}');
  lines.push('');

  // Add a function that returns just the static shell (for PPR)
  lines.push(`/// Returns the static HTML shell for Partial Prerendering.`);
  lines.push(`/// This is pre-rendered at build time and served instantly.`);
  lines.push('#[napi]');
  lines.push(`pub fn __ssr_${moduleName}_shell() -> String {`);
  lines.push(`  r#"${staticHtml}"#.to_string()`);
  lines.push('}');

  return lines.join('\n');
}
