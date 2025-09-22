#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const execFileAsync = promisify(execFile);

const cwd = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(cwd, '..');

const fixRequested = process.argv.includes('--fix');
if (fixRequested) {
  console.log('[lint] --fix requested: syntax checks run but no automatic fixes are applied.');
}

const targets = [
  'src',
  'test',
  'scripts',
  'oauth.config.js',
];

const files = [];

for (const target of targets) {
  await collect(join(projectRoot, target));
}

if (files.length === 0) {
  console.log('[lint] No JavaScript files discovered.');
  process.exit(0);
}

let failures = 0;
for (const file of files) {
  try {
    await execFileAsync('node', ['--check', file]);
    console.log(`✓ ${file.replace(projectRoot + '/', '')}`);
  } catch (error) {
    failures += 1;
    console.error(`✗ ${file.replace(projectRoot + '/', '')}`);
    if (error.stderr) {
      console.error(error.stderr.trim());
    } else {
      console.error(error);
    }
  }
}

if (failures > 0) {
  console.error(`[lint] ${failures} file(s) failed syntax checks.`);
  process.exit(1);
}

console.log('[lint] All files passed Node syntax validation.');

async function collect(entry) {
  try {
    const stat = await fs.stat(entry);
    if (stat.isDirectory()) {
      const base = entry.replace(projectRoot + '/', '');
      if (['node_modules', 'dist', '.git'].some((skip) => base.split('/').includes(skip))) {
        return;
      }
      const dirents = await fs.readdir(entry, { withFileTypes: true });
      for (const dirent of dirents) {
        await collect(join(entry, dirent.name));
      }
    } else if (stat.isFile()) {
      if (['.js', '.mjs', '.cjs'].includes(extname(entry))) {
        files.push(entry);
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
}
