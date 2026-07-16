import type { Rule } from 'eslint';
import type { FunctionDeclaration, ArrowFunctionExpression } from 'estree';

const noDefaultExportInPage: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce default export in page.tsx files',
    },
    messages: {
      missingDefault: 'page.tsx must have a default export (the page component)',
    },
    schema: [],
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.endsWith('page.tsx') && !filename.endsWith('page.ts')) return {};

    let hasDefaultExport = false;

    return {
      ExportDefaultDeclaration() {
        hasDefaultExport = true;
      },
      'Program:exit'() {
        if (!hasDefaultExport) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: 'missingDefault',
          });
        }
      },
    };
  },
};

const noDefaultExportInLayout: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce default export in layout.tsx files',
    },
    messages: {
      missingDefault: 'layout.tsx must have a default export (the layout component)',
    },
    schema: [],
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.endsWith('layout.tsx') && !filename.endsWith('layout.ts')) return {};

    let hasDefaultExport = false;

    return {
      ExportDefaultDeclaration() {
        hasDefaultExport = true;
      },
      'Program:exit'() {
        if (!hasDefaultExport) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: 'missingDefault',
          });
        }
      },
    };
  },
};

const noAsyncInClientComponent: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow async client components',
    },
    messages: {
      noAsync: 'Client components cannot be async. Use React hooks for data fetching instead.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.endsWith('page.tsx') && !filename.endsWith('layout.tsx')) return {};

    return {
      'ExportDefaultDeclaration > FunctionDeclaration[async=true]'(node: FunctionDeclaration) {
        context.report({ node, messageId: 'noAsync' });
      },
      'ExportDefaultDeclaration > ArrowFunctionExpression[async=true]'(node: ArrowFunctionExpression) {
        context.report({ node, messageId: 'noAsync' });
      },
    };
  },
};

const noUseClientInServer: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Discourage "use client" in server-only files (layout.tsx, loading.tsx, error.tsx)',
    },
    messages: {
      noUseClient: '"use client" is not needed in {{file}} — this file is always a server component.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.getFilename();
    const serverOnlyFiles = ['loading.tsx', 'error.tsx', 'not-found.tsx', 'head.tsx', 'template.tsx'];
    const basename = filename.split('/').pop() ?? '';
    if (!serverOnlyFiles.includes(basename)) return {};

    return {
      Program(node) {
        const source = context.getSourceCode().getText(node);
        if (source.startsWith('"use client"') || source.startsWith("'use client'")) {
          context.report({ loc: { line: 1, column: 0 }, messageId: 'noUseClient', data: { file: basename } });
        }
      },
    };
  },
};

const plugin = {
  rules: {
    'no-default-export-in-page': noDefaultExportInPage,
    'no-default-export-in-layout': noDefaultExportInLayout,
    'no-async-in-client-component': noAsyncInClientComponent,
    'no-use-client-in-server': noUseClientInServer,
  },
} as const;

export default plugin;
export { plugin as pledgePlugin };
