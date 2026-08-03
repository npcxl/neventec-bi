import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const pkgPath = path.resolve(process.cwd(), 'package.json');

function readPkg() {
  return JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version?: string };
}

function bumpVersion(version: string) {
  const parts = version.split('.').map((v) => Number.parseInt(v, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return '0.0.1';
  parts[2] += 1;
  return parts.join('.');
}

function getGitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

function getBuildTime() {
  const date = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function versionPlugin(): Plugin {
  return {
    name: 'version-bump-and-write',
    apply: 'build',
    buildStart() {
      const pkg = readPkg();
      const currentVersion = pkg.version ?? '0.0.0';
      const nextVersion = bumpVersion(currentVersion);
      pkg.version = nextVersion;
      fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8');
      this.info(`[version] ${currentVersion} -> ${nextVersion}`);
    },
    closeBundle() {
      const pkg = readPkg();
      const version = pkg.version ?? '0.0.0';
      const outDir = path.resolve(process.cwd(), 'dist');
      fs.mkdirSync(outDir, { recursive: true });
      const payload = {
        version,
        gitHash: getGitHash(),
        buildTime: getBuildTime(),
      };
      fs.writeFileSync(path.join(outDir, 'version.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
      console.log('[version-file]', payload);
    },
  };
}

export default defineConfig({
  plugins: [react(), versionPlugin()],
  server: {
    host: '0.0.0.0',
    port: 9527,
    proxy: {
      '/ehs-api': {
        target: 'https://glsz.s.369zhan.com',
        //rewrite: (path) => path.replace(/^\/ehs-api/, ''),
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
