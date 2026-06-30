import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const version = process.env.VERSION;
console.log('Release version: ', version);
if (!version) {
    console.error('No version specified! This script should be run by release-it');
    process.exit(1);
}

const packages = ['react', 'next'];

// Update versions in all package.json files
packages.forEach(pkg => {
  const pkgPath = join(__dirname, '..', 'packages', pkg, 'package.json');
  const json = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  json.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(json, null, 2) + '\n');
  console.log(`Updated ${pkg} package to version ${version}`);
});

// Also update root package.json
const rootPkgPath = join(__dirname, '..', 'package.json');
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
rootPkg.version = version;
fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
console.log(`Updated root package to version ${version}`);
