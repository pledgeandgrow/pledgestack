import { writeFileSync, existsSync, cpSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import prompts from 'prompts';

const TEMPLATES = ['default', 'blog', 'api'] as const;
type Template = (typeof TEMPLATES)[number];

interface CreateOptions {
  name: string;
  template: Template;
  installDeps: boolean;
}

export async function createApp(): Promise<void> {
  const response = await prompts([
    {
      type: 'text',
      name: 'name',
      message: 'What is your project named?',
      initial: 'my-pledge-app',
      validate: (val: string) => (val.length > 0 ? true : 'Project name is required'),
    },
    {
      type: 'select',
      name: 'template',
      message: 'Which template would you like to use?',
      choices: [
        { title: 'Default — Starter app with a single page', value: 'default' },
        { title: 'Blog — Blog with static generation and dynamic routes', value: 'blog' },
        { title: 'API — REST API with CRUD routes', value: 'api' },
      ],
      initial: 0,
    },
    {
      type: 'confirm',
      name: 'installDeps',
      message: 'Install dependencies now?',
      initial: true,
    },
  ]);

  const options: CreateOptions = {
    name: response.name,
    template: response.template,
    installDeps: response.installDeps,
  };

  await scaffold(options);
}

async function scaffold(options: CreateOptions): Promise<void> {
  const { name, template, installDeps } = options;
  const targetDir = resolve(process.cwd(), name);

  if (existsSync(targetDir)) {
    console.error(`Directory "${name}" already exists.`);
    process.exit(1);
  }

  console.log(`\nCreating a new PledgeStack app in ${targetDir}\n`);

  const templateDir = getTemplateDir(template);
  cpSync(templateDir, targetDir, { recursive: true });

  writeFileSync(
    join(targetDir, 'package.json'),
    JSON.stringify(generatePackageJson(name), null, 2) + '\n',
  );

  writeFileSync(
    join(targetDir, 'tsconfig.json'),
    JSON.stringify(generateTsConfig(), null, 2) + '\n',
  );

  writeFileSync(
    join(targetDir, '.gitignore'),
    generateGitignore() + '\n',
  );

  if (installDeps) {
    console.log('Installing dependencies...\n');
    try {
      execSync('pnpm install', { cwd: targetDir, stdio: 'inherit' });
    } catch {
      try {
        execSync('npm install', { cwd: targetDir, stdio: 'inherit' });
      } catch {
        console.warn('Failed to install dependencies. Run `pnpm install` manually.');
      }
    }
  }

  console.log(`\nSuccess! Created ${name} at ${targetDir}\n`);
  console.log('Next steps:\n');
  console.log(`  cd ${name}`);
  if (!installDeps) console.log('  pnpm install');
  console.log('  pnpm dev\n');
  console.log('Happy hacking!\n');
}

function getTemplateDir(template: Template): string {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  return join(__dirname, '..', 'templates', template);
}

function generatePackageJson(name: string) {
  return {
    name: name.toLowerCase().replace(/\s+/g, '-'),
    version: '0.0.1',
    private: true,
    type: 'module',
    scripts: {
      dev: 'pledge dev',
      build: 'pledge build',
      start: 'pledge serve',
    },
    dependencies: {
      react: '^19.2.0',
      'react-dom': '^19.2.0',
    },
    devDependencies: {
      pledgepack: '^0.1.1',
      typescript: '^5.7.0',
      '@types/react': '^19.2.0',
      '@types/react-dom': '^19.2.0',
    },
    engines: {
      node: '>=20.0.0',
    },
  };
}

function generateTsConfig() {
  return {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      jsx: 'react-jsx',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      isolatedModules: true,
    },
    include: ['app', 'pledge.config.ts'],
  };
}

function generateGitignore(): string {
  return [
    'node_modules',
    '.pledge',
    'dist',
    '.env',
    '.env.local',
    '*.log',
    '.DS_Store',
  ].join('\n');
}
