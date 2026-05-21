import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const version = '0.1.0-beta.0';
const tag = 'beta';
const dryRun = process.argv.includes('--dry-run');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const packages = [
  {
    name: '@supertokens/rownd-react',
    dir: join(rootDir, 'packages', 'react'),
  },
  {
    name: '@supertokens/rownd-nextjs',
    dir: join(rootDir, 'packages', 'next'),
  },
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDir,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !options.allowFailure) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new Error(output || `${command} ${args.join(' ')} failed`);
  }

  return result;
}

function updatePackageJson(path, updates) {
  const packageJson = JSON.parse(readFileSync(path, 'utf8'));
  const updated = { ...packageJson, ...updates };
  writeFileSync(path, `${JSON.stringify(updated, null, 2)}\n`);
}

function npmView(packageName) {
  return run(npmCommand, ['view', `${packageName}@${version}`, 'version'], {
    capture: true,
    allowFailure: true,
  });
}

function isNpmNotFound(result) {
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  return result.status !== 0 && output.includes('E404');
}

function ensureVersionIsUnpublished(packageName) {
  const result = npmView(packageName);

  if (result.status === 0) {
    throw new Error(`${packageName}@${version} already exists on npm`);
  }

  if (!isNpmNotFound(result)) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new Error(output || `Unable to check ${packageName} on npm`);
  }
}

console.log(`Preparing ${version} beta release${dryRun ? ' dry run' : ''}`);

if (dryRun) {
  const whoami = run(npmCommand, ['whoami'], {
    capture: true,
    allowFailure: true,
  });

  if (whoami.status !== 0) {
    console.warn(
      'npm auth not available; real publish will require npm login or NODE_AUTH_TOKEN.'
    );
  }
} else {
  run(npmCommand, ['whoami']);
}

updatePackageJson(join(rootDir, 'package.json'), {
  name: '@supertokens/rownd-react',
  version,
});

for (const pkg of packages) {
  updatePackageJson(join(pkg.dir, 'package.json'), {
    name: pkg.name,
    version,
  });
}

run(npmCommand, ['run', 'lint']);
run(npmCommand, ['test', '--', 'run', '--coverage']);
run(npmCommand, ['run', 'build']);

for (const pkg of packages) {
  ensureVersionIsUnpublished(pkg.name);
  run(npmCommand, ['pack', '--dry-run'], { cwd: pkg.dir });
}

if (dryRun) {
  console.log('Dry run complete. No packages were published.');
  process.exit(0);
}

for (const pkg of packages) {
  run(npmCommand, ['publish', '--access', 'public', '--tag', tag], {
    cwd: pkg.dir,
  });
}

console.log(
  `Published ${packages.map(pkg => `${pkg.name}@${version}`).join(', ')} with npm tag '${tag}'.`
);
