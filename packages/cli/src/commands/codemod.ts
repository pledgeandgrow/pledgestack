import { readFile, writeFile } from 'node:fs/promises';

export interface CodemodOptions {
  /** Transform name */
  name: string;
  /** File or directory to transform */
  path: string;
  /** Dry run (default: false) */
  dryRun?: boolean;
}

export interface CodemodTransform {
  name: string;
  description: string;
  transform: (source: string, filePath: string) => { code: string; changes: number };
}

const REGISTERED_CODEMODS: CodemodTransform[] = [
  {
    name: 'pledgejs-to-pledgestack',
    description: 'Rename PledgeJS references to PledgeStack',
    transform: (source) => {
      let changes = 0;
      let code = source;
      code = code.replace(/PledgeJS/g, () => { changes++; return 'PledgeStack'; });
      code = code.replace(/pledgejs/g, () => { changes++; return 'pledgestack'; });
      return { code, changes };
    },
  },
  {
    name: 'next-to-pledge',
    description: 'Migrate Next.js imports to PledgeStack',
    transform: (source) => {
      let changes = 0;
      let code = source;
      code = code.replace(/from ['"]next\/navigation['"]/g, (m) => { changes++; return m.replace('next/navigation', 'pledge'); });
      code = code.replace(/from ['"]next\/image['"]/g, (m) => { changes++; return m.replace('next/image', 'pledge/image'); });
      code = code.replace(/from ['"]next\/font['"]/g, (m) => { changes++; return m.replace('next/font', 'pledge/font'); });
      code = code.replace(/from ['"]next\/link['"]/g, (m) => { changes++; return m.replace('next/link', 'pledge/link'); });
      code = code.replace(/from ['"]next\/server['"]/g, (m) => { changes++; return m.replace('next/server', 'pledge/server'); });
      code = code.replace(/from ['"]next\/headers['"]/g, (m) => { changes++; return m.replace('next/headers', 'pledge/headers'); });
      code = code.replace(/from ['"]next\/cookies['"]/g, (m) => { changes++; return m.replace('next/cookies', 'pledge/cookies'); });
      return { code, changes };
    },
  },
  {
    name: 'use-client-to-pledge-client',
    description: 'Convert "use client" to "use pledge:client"',
    transform: (source) => {
      let changes = 0;
      let code = source;
      code = code.replace(/^['"]use client['"]/gm, () => { changes++; return '"use pledge:client"'; });
      return { code, changes };
    },
  },
  {
    name: 'api-routes-to-route-handlers',
    description: 'Convert Next.js API routes to PledgeStack route handlers',
    transform: (source) => {
      let changes = 0;
      let code = source;
      code = code.replace(/export default function handler\(/g, () => { changes++; return 'export function GET('; });
      code = code.replace(/req\.query/g, () => { changes++; return 'req.searchParams'; });
      code = code.replace(/req\.body/g, () => { changes++; return 'await req.json()'; });
      return { code, changes };
    },
  },
];

export function listCodemods(): Array<{ name: string; description: string }> {
  return REGISTERED_CODEMODS.map((c) => ({ name: c.name, description: c.description }));
}

export async function runCodemod(options: CodemodOptions): Promise<{ filesChanged: number; totalChanges: number }> {
  const codemod = REGISTERED_CODEMODS.find((c) => c.name === options.name);
  if (!codemod) {
    throw new Error(`Unknown codemod: ${options.name}. Available: ${REGISTERED_CODEMODS.map((c) => c.name).join(', ')}`);
  }

  const { dryRun = false } = options;
  let filesChanged = 0;
  let totalChanges = 0;

  try {
    const source = await readFile(options.path, 'utf-8');
    const result = codemod.transform(source, options.path);

    if (result.changes > 0) {
      filesChanged++;
      totalChanges += result.changes;

      if (!dryRun) {
        await writeFile(options.path, result.code, 'utf-8');
        console.log(`  ${options.path}: ${result.changes} change(s)`);
      } else {
        console.log(`  [dry-run] ${options.path}: ${result.changes} change(s)`);
      }
    }
  } catch (err) {
    console.error(`  Error processing ${options.path}: ${err}`);
  }

  console.log(`\nCodemod "${options.name}" complete: ${filesChanged} file(s), ${totalChanges} change(s)`);
  return { filesChanged, totalChanges };
}
