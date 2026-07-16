#!/usr/bin/env node
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    port: { type: 'string', short: 'p' },
    hostname: { type: 'string', short: 'H' },
    template: { type: 'string', short: 't' },
    verbose: { type: 'boolean', short: 'v' },
    help: { type: 'boolean', short: 'h' },
  },
});

const command = positionals[0];

async function main() {
  if (values.help || !command) {
    printHelp();
    process.exit(0);
  }

  const opts = {
    port: values.port ? parseInt(values.port, 10) : undefined,
    hostname: values.hostname,
  };

  switch (command) {
    case 'dev': {
      const { devCommand } = await import('./commands/dev');
      await devCommand(opts);
      break;
    }
    case 'build': {
      const { buildCommand } = await import('./commands/build');
      await buildCommand();
      break;
    }
    case 'start': {
      const { startCommand } = await import('./commands/start');
      await startCommand(opts);
      break;
    }
    case 'create': {
      const { createCommand } = await import('./commands/create');
      const projectName = positionals[1];
      if (!projectName) {
        console.error('Error: Project name is required');
        console.error('Usage: pledge create <project-name>');
        process.exit(1);
      }
      await createCommand(projectName, {
        template: values.template as 'default' | 'blank' | 'blog' | 'dashboard' | undefined,
      });
      break;
    }
    case 'info': {
      const { infoCommand } = await import('./commands/info');
      await infoCommand({ verbose: values.verbose });
      break;
    }
    case 'doctor': {
      const { doctorCommand } = await import('./commands/doctor');
      const { loadConfig } = await import('./config-loader');
      const config = await loadConfig();
      await doctorCommand(config);
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
  PledgeStack — A full-stack React framework

  Usage:
    pledge <command> [options]

  Commands:
    dev      Start the development server
    build    Build for production
    start    Start the production server
    create   Scaffold a new PledgeStack project
    info     Print project diagnostics
    doctor   Diagnose and fix common issues

  Options:
    -p, --port <number>      Server port (default: 3000)
    -H, --hostname <string>  Server hostname (default: localhost)
    -t, --template <name>    Project template (default, blank, blog)
    -v, --verbose            Show detailed output
    -h, --help               Show this help message

  Examples:
    pledge dev
    pledge dev --port 8080
    pledge build
    pledge start
    pledge create my-app
    pledge create my-blog --template blog
    pledge info --verbose
    pledge doctor
  `);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
