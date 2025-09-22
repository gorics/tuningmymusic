#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const cwd = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(cwd, '..');
const distDir = join(projectRoot, 'dist');

const entries = [
  'index.html',
  'manifest.webmanifest',
  'oauth.config.js',
  'CNAME',
];

const directories = ['assets', 'src', 'docs', 'data', 'callback'];

await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(distDir, { recursive: true });

for (const entry of entries) {
  await copyIfExists(join(projectRoot, entry), join(distDir, entry));
}

for (const directory of directories) {
  await copyIfExists(join(projectRoot, directory), join(distDir, directory));
}

console.log('[build] Static bundle generated in dist/. Upload its contents to any static host.');

async function copyIfExists(src, dest) {
  try {
    const stat = await fs.stat(src);
    if (stat.isDirectory()) {
      await copyDirectory(src, dest);
    } else if (stat.isFile()) {
      await fs.mkdir(dirname(dest), { recursive: true });
      await fs.copyFile(src, dest);
      console.log(`→ ${relative(dest)}`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
}

async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue;
    await copyIfExists(join(src, entry.name), join(dest, entry.name));
  }
}

function relative(path) {
  return path.replace(projectRoot + '/', '');
}
