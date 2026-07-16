import * as vscode from 'vscode';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

export function activate(context: vscode.ExtensionContext) {
  // Command: Create Page
  context.subscriptions.push(
    vscode.commands.registerCommand('pledgestack.createPage', async (uri?: vscode.Uri) => {
      const dir = uri ? uri.fsPath : getCurrentDir();
      const name = await vscode.window.showInputBox({
        prompt: 'Page name (e.g. about, blog/[slug])',
        placeHolder: 'about',
      });
      if (!name) return;

      const filePath = join(dir, ...name.split('/'), 'page.tsx');
      ensureDir(dirname(filePath));

      const componentName = name.split('/').pop()!.replace(/[^a-zA-Z0-9]/g, '') || 'Page';
      const content = `export default function ${capitalize(componentName)}Page() {
  return (
    <div>
      <h1>${capitalize(componentName)}</h1>
    </div>
  );
}
`;
      writeFileSync(filePath, content, 'utf-8');
      await openFile(filePath);
    }),
  );

  // Command: Create Layout
  context.subscriptions.push(
    vscode.commands.registerCommand('pledgestack.createLayout', async (uri?: vscode.Uri) => {
      const dir = uri ? uri.fsPath : getCurrentDir();
      const filePath = join(dir, 'layout.tsx');
      ensureDir(dirname(filePath));

      const content = `import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div>
      {children}
    </div>
  );
}
`;
      writeFileSync(filePath, content, 'utf-8');
      await openFile(filePath);
    }),
  );

  // Command: Create API Route
  context.subscriptions.push(
    vscode.commands.registerCommand('pledgestack.createRoute', async (uri?: vscode.Uri) => {
      const dir = uri ? uri.fsPath : getCurrentDir();
      const name = await vscode.window.showInputBox({
        prompt: 'Route path (e.g. api/users)',
        placeHolder: 'api/users',
      });
      if (!name) return;

      const filePath = join(dir, ...name.split('/'), 'route.ts');
      ensureDir(dirname(filePath));

      const content = `export async function GET(req: Request): Promise<Response> {
  return Response.json({ message: 'OK' });
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.json();
  return Response.json({ received: true });
}
`;
      writeFileSync(filePath, content, 'utf-8');
      await openFile(filePath);
    }),
  );

  // Command: Create Server Action
  context.subscriptions.push(
    vscode.commands.registerCommand('pledgestack.createServerAction', async (uri?: vscode.Uri) => {
      const dir = uri ? uri.fsPath : getCurrentDir();
      const name = await vscode.window.showInputBox({
        prompt: 'Action name (e.g. submitForm)',
        placeHolder: 'submitForm',
      });
      if (!name) return;

      const filePath = join(dir, 'actions.ts');
      const content = `import { serverAction } from 'pledgestack-server';

export const ${name} = serverAction(async (data: unknown) => {
  // Server-only code here
  return { success: true };
});
`;
      writeFileSync(filePath, content, 'utf-8');
      await openFile(filePath);
    }),
  );

  // IntelliSense: Completion provider for PledgeStack conventions
  const config = vscode.workspace.getConfiguration('pledgestack');
  if (config.get('enableIntelliSense', true)) {
    context.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        { scheme: 'file', language: 'typescriptreact' },
        {
          provideCompletionItems(document, position) {
            const linePrefix = document.lineAt(position).text.substring(0, position.character);
            if (!linePrefix.includes('pledge') && !linePrefix.includes('strategy')) return [];

            const items: vscode.CompletionItem[] = [
              createCompletion('pledge', 'pledge(Component, { strategy: ... })', 'Wrap component for client hydration'),
              createCompletion('serverAction', 'serverAction(async (args) => { ... })', 'Create a server action'),
            ];

            if (linePrefix.includes('strategy')) {
              items.push(
                createCompletion("'load'", "strategy: 'load'", 'Hydrate immediately'),
                createCompletion("'visible'", "strategy: 'visible'", 'Hydrate when visible'),
                createCompletion("'idle'", "strategy: 'idle'", 'Hydrate on idle'),
                createCompletion("'only'", "strategy: 'only'", 'Client-only, skip SSR'),
                createCompletion("'media'", "strategy: 'media'", 'Hydrate on media query match'),
              );
            }

            return items;
          },
        },
        ':',
        "'",
        '"',
      ),
    );
  }
}

export function deactivate() {}

function getCurrentDir(): string {
  const ws = vscode.workspace.workspaceFolders;
  return ws && ws.length > 0 ? ws[0].uri.fsPath : process.cwd();
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

async function openFile(path: string): Promise<void> {
  const doc = await vscode.workspace.openTextDocument(path);
  await vscode.window.showTextDocument(doc);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function createCompletion(label: string, snippet: string, detail: string): vscode.CompletionItem {
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Function);
  item.insertText = new vscode.SnippetString(snippet);
  item.detail = detail;
  return item;
}
