import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { join } from 'path';
import { PsxDebugConfigurationProvider, PsxDebugAdapterDescriptorFactory } from './debug-adapter';

export function activate(context: vscode.ExtensionContext) {
  // ── Formatting provider for .psx and .ps files ────────────────────────
  const formatProvider = new PsxFormattingProvider();
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      { scheme: 'file', language: 'psx' },
      formatProvider,
    ),
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      { scheme: 'file', language: 'ps' },
      formatProvider,
    ),
  );

  // ── Completion provider for Rust blocks ───────────────────────────────
  const completionProvider = new PsxCompletionProvider();
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { scheme: 'file', language: 'psx' },
      completionProvider,
      '.', ':', '#',
    ),
  );

  // ── Hover provider for Rust types in PSX ──────────────────────────────
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { scheme: 'file', language: 'psx' },
      new PsxHoverProvider(),
    ),
  );

  // ── Commands ─────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('pledgestack.formatFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const edits = await formatProvider.provideDocumentFormattingEdits(editor.document);
      if (edits) {
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(editor.document.uri, edits);
        await vscode.workspace.applyEdit(workspaceEdit);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pledgestack.lintFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      await lintDocument(editor.document);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pledgestack.build', async () => {
      const terminal = vscode.window.createTerminal('PledgeStack Build');
      terminal.show();
      terminal.sendText('pledge build');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pledgestack.securityAudit', async () => {
      const terminal = vscode.window.createTerminal('PSX Security Audit');
      terminal.show();
      terminal.sendText('pledge doctor --production');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pledgestack.bundleAnalyze', async () => {
      const terminal = vscode.window.createTerminal('PSX Bundle Analysis');
      terminal.show();
      terminal.sendText('pledge analyze --suggestions');
    }),
  );

  // ── Format on save ───────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument(async (event: vscode.TextDocumentWillSaveEvent) => {
      const config = vscode.workspace.getConfiguration('pledgestack-psx');
      if (!config.get('formatOnSave')) return;

      const doc = event.document;
      if (doc.languageId !== 'psx' && doc.languageId !== 'ps') return;

      const edits = await formatProvider.provideDocumentFormattingEdits(doc);
      if (edits) {
        event.waitUntil(
          Promise.resolve([
            new vscode.WorkspaceEdit(),
          ]).then(async ([ws]) => {
            ws.set(doc.uri, edits);
            return ws;
          }),
        );
      }
    }),
  );

  // ── Debug provider (#212) ────────────────────────────────────────────
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider(
      'pledgestack',
      new PsxDebugConfigurationProvider(),
    ),
  );
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory(
      'pledgestack',
      new PsxDebugAdapterDescriptorFactory(),
    ),
  );
}

export function deactivate() {}

// ─── Formatting Provider ─────────────────────────────────────────────────

class PsxFormattingProvider implements vscode.DocumentFormattingEditProvider {
  async provideDocumentFormattingEdits(
    document: vscode.TextDocument,
  ): Promise<vscode.TextEdit[] | undefined> {
    const config = vscode.workspace.getConfiguration('pledgestack-psx');
    const edition = config.get<string>('rustEdition') ?? '2021';
    const text = document.getText();

    const ext = document.fileName.endsWith('.ps') ? 'ps' : 'psx';

    if (ext === 'ps') {
      // Format entire file as Rust
      const formatted = await runRustfmt(text, edition);
      if (formatted !== null && formatted !== text) {
        return [vscode.TextEdit.replace(
          new vscode.Range(0, 0, document.lineCount, 0),
          formatted,
        )];
      }
    } else {
      // Format each <rust> block
      const edits: vscode.TextEdit[] = [];
      const blockRegex = /<rust>([\s\S]*?)<\/rust>/g;
      let match: RegExpExecArray | null;

      while ((match = blockRegex.exec(text)) !== null) {
        const startPos = document.positionAt(match.index + 6); // after <rust>
        const endPos = document.positionAt(match.index + match[0].length - 7); // before </rust>
        const rustSource = match[1];

        const formatted = await runRustfmt(rustSource, edition);
        if (formatted !== null && formatted !== rustSource) {
          edits.push(vscode.TextEdit.replace(
            new vscode.Range(startPos, endPos),
            formatted,
          ));
        }
      }

      return edits.length > 0 ? edits : undefined;
    }

    return undefined;
  }
}

async function runRustfmt(source: string, edition: string): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn('rustfmt', ['--emit', 'stdout', '--edition', edition], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    child.on('error', () => resolve(null));
    child.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        resolve(stdout.replace(/\n$/, ''));
      } else {
        resolve(null);
      }
    });

    child.stdin.write(source);
    child.stdin.end();
  });
}

// ─── Completion Provider ─────────────────────────────────────────────────

class PsxCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.CompletionList> {
    const line = document.lineAt(position).text;
    const textBefore = line.slice(0, position.character);

    // Check if we're inside a <rust> block
    const isRustBlock = isInRustBlock(document, position);

    if (isRustBlock) {
      return provideRustCompletions(textBefore);
    }

    // TSX context — provide rust.* completions
    if (textBefore.endsWith('rust.')) {
      return provideRustBridgeCompletions(document);
    }

    return undefined;
  }
}

function isInRustBlock(document: vscode.TextDocument, position: vscode.Position): boolean {
  const text = document.getText();
  const offset = document.offsetAt(position);

  let lastOpen = -1;
  let lastClose = -1;

  const openRegex = /<rust>/g;
  const closeRegex = /<\/rust>/g;

  let match: RegExpExecArray | null;
  while ((match = openRegex.exec(text)) !== null) {
    if (match.index < offset) lastOpen = match.index + 6;
  }
  while ((match = closeRegex.exec(text)) !== null) {
    if (match.index < offset) lastClose = match.index;
  }

  return lastOpen > lastClose;
}

function provideRustCompletions(textBefore: string): vscode.CompletionList {
  const items: vscode.CompletionItem[] = [];

  // Attribute completions after #
  if (textBefore.endsWith('#[')) {
    items.push(
      createCompletion('napi', 'Export function to JavaScript via NAPI', vscode.CompletionItemKind.Snippet),
      createCompletion('test', 'Mark function as a test', vscode.CompletionItemKind.Snippet),
      createCompletion('tokio::test', 'Mark async function as a tokio test', vscode.CompletionItemKind.Snippet),
      createCompletion('derive(Debug, Clone)', 'Derive Debug and Clone traits', vscode.CompletionItemKind.Snippet),
      createCompletion('derive(Serialize, Deserialize)', 'Derive serde traits', vscode.CompletionItemKind.Snippet),
    );
    return new vscode.CompletionList(items, false);
  }

  // Keyword completions
  if (textBefore.endsWith('')) {
    const keywords = [
      'fn', 'struct', 'enum', 'impl', 'trait', 'use', 'mod',
      'match', 'if', 'else', 'for', 'while', 'loop', 'return',
      'async', 'await', 'move', 'let', 'const', 'static',
    ];
    for (const kw of keywords) {
      items.push(createCompletion(kw, '', vscode.CompletionItemKind.Keyword));
    }
  }

  return new vscode.CompletionList(items, false);
}

function provideRustBridgeCompletions(document: vscode.TextDocument): vscode.CompletionList {
  // Parse the document for #[napi] function names
  const text = document.getText();
  const items: vscode.CompletionItem[] = [];

  const napiFnRegex = /#\[napi\]\s*(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match: RegExpExecArray | null;
  while ((match = napiFnRegex.exec(text)) !== null) {
    items.push(createCompletion(match[1], 'Rust NAPI function', vscode.CompletionItemKind.Function));
  }

  return new vscode.CompletionList(items, false);
}

function createCompletion(
  label: string,
  detail: string,
  kind: vscode.CompletionItemKind,
): vscode.CompletionItem {
  const item = new vscode.CompletionItem(label, kind);
  item.detail = detail;
  return item;
}

// ─── Hover Provider ──────────────────────────────────────────────────────

class PsxHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Hover> {
    const range = document.getWordRangeAtPosition(position);
    if (!range) return undefined;

    const word = document.getText(range);

    // If in a Rust block, provide Rust type info
    if (isInRustBlock(document, position)) {
      const rustTypes: Record<string, string> = {
        'String': 'A growable string type, stored as UTF-8 bytes.',
        'Vec': 'A growable array type: Vec<T>',
        'Option': 'An optional value: Option<T> = Some(T) | None',
        'Result': 'A result type: Result<T, E> = Ok(T) | Err(E)',
        'HashMap': 'A hash map: HashMap<K, V>',
        'Box': 'A heap-allocated pointer: Box<T>',
      };

      if (rustTypes[word]) {
        return new vscode.Hover(
          new vscode.MarkdownString(`\`\`\`rust\n${word}\n\`\`\`\n${rustTypes[word]}`),
          range,
        );
      }
    }

    return undefined;
  }
}

// ─── Linting ─────────────────────────────────────────────────────────────

async function lintDocument(document: vscode.TextDocument): Promise<void> {
  const diagnostics: vscode.Diagnostic[] = [];
  const text = document.getText();

  // Simple lint: check for .unwrap() in <rust> blocks
  const blockRegex = /<rust>([\s\S]*?)<\/rust>/g;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(text)) !== null) {
    const blockStart = match.index + 6;
    const rustSource = match[1];
    const lines = rustSource.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//')) continue;

      const unwrapIdx = line.indexOf('.unwrap()');
      if (unwrapIdx !== -1) {
        const startPos = document.positionAt(blockStart + line.indexOf('.unwrap()'));
        const endPos = document.positionAt(blockStart + line.indexOf('.unwrap()') + '.unwrap()'.length);
        diagnostics.push({
          severity: vscode.DiagnosticSeverity.Warning,
          range: new vscode.Range(startPos, endPos),
          message: '.unwrap() can panic — consider using ? operator',
          source: 'pledgestack-psx',
        });
      }
    }
  }

  const collection = vscode.languages.createDiagnosticCollection('pledgestack-psx');
  collection.set(document.uri, diagnostics);
}
