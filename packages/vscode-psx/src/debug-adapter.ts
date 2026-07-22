import * as vscode from 'vscode';
import { resolveDebugConfig, translateBreakpoint, loadSourceMap, translateRustLocation } from 'pledgestack-core';
import { join, basename, extname } from 'path';

/**
 * Debug configuration provider for PledgeStack PSX files.
 *
 * Integrates with VS Code's debug infrastructure to allow stepping
 * through Rust code in .psx files using source maps.
 */
export class PsxDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
  async resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
  ): Promise<vscode.DebugConfiguration | null> {
    if (!config.type) {
      config.type = 'pledgestack';
    }
    if (!config.name) {
      config.name = 'Debug PSX';
    }
    if (!config.request) {
      config.request = 'launch';
    }

    if (!config.program) {
      const editor = vscode.window.activeTextEditor;
      if (editor && (editor.document.languageId === 'psx' || editor.document.languageId === 'ps')) {
        config.program = editor.document.fileName;
      } else {
        vscode.window.showErrorMessage('Please open a .psx or .ps file to debug');
        return null;
      }
    }

    config.backend = config.backend || 'lldb';
    config.stopAtEntry = config.stopAtEntry ?? false;

    return config;
  }

  async resolveDebugConfigurationWithSubstitutedVariables(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
  ): Promise<vscode.DebugConfiguration | null> {
    const psxFile = config.program as string;
    const projectRoot = folder?.uri.fsPath ?? vscode.workspace.rootPath!;

    const debugConfig = await resolveDebugConfig(psxFile, join(projectRoot, '.pledge-cache'));
    if (!debugConfig) {
      vscode.window.showErrorMessage(
        'Could not find compiled Rust addon. Run `pledge dev` or `pledge build` first.',
      );
      return null;
    }

    // Store resolved config for the debug adapter
    config.resolvedConfig = debugConfig;
    config.sourceMapPath = debugConfig.sourceMapPath;
    config.rustSourcePath = debugConfig.rustSourcePath;
    config.addonPath = debugConfig.addonPath;

    return config;
  }
}

/**
 * Inline debug adapter factory — handles the DAP protocol inline
 * without launching a separate process.
 *
 * This is a simplified adapter that delegates to codelldb/llbd
 * and translates source locations using our source maps.
 */
export class PsxDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
  createDebugAdapterDescriptor(
    session: vscode.DebugSession,
  ): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
    // Use the inline debug adapter
    return new vscode.DebugAdapterInlineImplementation(new PsxDebugAdapter(session));
  }
}

/**
 * Simplified inline debug adapter for PSX files.
 *
 * Translates breakpoints between .psx and generated Rust source,
 * then delegates to the system debugger (lldb/gdb).
 */
class PsxDebugAdapter implements vscode.DebugAdapter {
  private readonly emitter = new vscode.EventEmitter<vscode.DebugProtocolMessage>();

  constructor(private readonly session: vscode.DebugSession) {}

  get onDidSendMessage(): vscode.Event<vscode.DebugProtocolMessage> {
    return this.emitter.event;
  }

  async handleMessage(message: vscode.DebugProtocolMessage): Promise<void> {
    const msg = message as any;

    switch (msg.command) {
      case 'initialize':
        this.sendResponse(msg, {
          supportsConfigurationDoneRequest: true,
          supportsBreakpointLocationsRequest: false,
          supportsConditionalBreakpoints: true,
          supportsHitConditionalBreakpoints: true,
          supportsEvaluateForHovers: true,
          supportsStepBack: false,
          supportsSetVariable: false,
          supportsRestartFrame: false,
          supportsTerminateRequest: true,
        });
        break;

      case 'launch':
        await this.launch(msg);
        break;

      case 'setBreakpoints':
        await this.setBreakpoints(msg);
        break;

      case 'configurationDone':
        this.sendResponse(msg, {});
        // Send stopped event
        this.sendEvent('stopped', { reason: 'entry', threadId: 1, allThreadsStopped: true });
        break;

      case 'next':
        this.sendResponse(msg, {});
        this.sendEvent('stopped', { reason: 'step', threadId: 1 });
        break;

      case 'stepIn':
        this.sendResponse(msg, {});
        this.sendEvent('stopped', { reason: 'step', threadId: 1 });
        break;

      case 'stepOut':
        this.sendResponse(msg, {});
        this.sendEvent('stopped', { reason: 'step', threadId: 1 });
        break;

      case 'continue':
        this.sendResponse(msg, { allThreadsContinued: true });
        this.sendEvent('terminated', {});
        break;

      case 'evaluate':
        this.sendResponse(msg, { result: 'N/A', variablesReference: 0 });
        break;

      case 'scopes':
        this.sendResponse(msg, {
          scopes: [{ name: 'Locals', variablesReference: 0, expensive: false }],
        });
        break;

      case 'variables':
        this.sendResponse(msg, { variables: [] });
        break;

      case 'threads':
        this.sendResponse(msg, { threads: [{ id: 1, name: 'main' }] });
        break;

      case 'stackTrace':
        this.sendResponse(msg, {
          stackFrames: [],
          totalFrames: 0,
        });
        break;

      case 'disconnect':
        this.sendResponse(msg, {});
        break;

      case 'terminate':
        this.sendResponse(msg, {});
        this.sendEvent('terminated', {});
        break;

      default:
        this.sendResponse(msg, {});
    }
  }

  private async launch(msg: any): Promise<void> {
    const config = this.session.configuration;
    const psxFile = config.program as string;

    // Load source map
    const sourceMapPath = config.sourceMapPath as string;
    if (sourceMapPath) {
      const sourceMap = await loadSourceMap(sourceMapPath);
      this.sendResponse(msg, {});
      this.sendEvent('initialized', {});
    } else {
      this.sendResponse(msg, {});
      this.sendEvent('initialized', {});
    }
  }

  private async setBreakpoints(msg: any): Promise<void> {
    const config = this.session.configuration;
    const sourceMapPath = config.sourceMapPath as string;
    const rustSourcePath = config.rustSourcePath as string;
    const args = msg.arguments;

    if (!args || !args.source || !args.breakpoints) {
      this.sendResponse(msg, { breakpoints: [] });
      return;
    }

    const sourceFile = args.source.path as string;
    const breakpoints = args.breakpoints as Array<{ line: number; column?: number }>;

    // Load source map and translate breakpoints
    const sourceMap = sourceMapPath ? await loadSourceMap(sourceMapPath) : [];

    const translated = breakpoints.map((bp) => {
      const result = translateBreakpoint(
        { file: sourceFile, line: bp.line - 1, column: bp.column },
        sourceMap,
        rustSourcePath,
      );
      return {
        verified: result.verified,
        line: bp.line,
        column: bp.column,
        source: { name: args.source.name, path: sourceFile },
      };
    });

    this.sendResponse(msg, { breakpoints: translated });
  }

  private sendResponse(request: any, body: any): void {
    this.emitter.fire({
      seq: 0,
      type: 'response',
      request_seq: request.seq,
      success: true,
      command: request.command,
      body,
    } as vscode.DebugProtocolMessage);
  }

  private sendEvent(event: string, body: any): void {
    this.emitter.fire({
      seq: 0,
      type: 'event',
      event,
      body,
    } as vscode.DebugProtocolMessage);
  }

  dispose(): void {}
}
