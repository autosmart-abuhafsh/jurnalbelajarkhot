import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const resolvedGasUrl =
    env.VITE_GAS_WEB_APP_URL ||
    env.VITE_GOOGLE_APPS_SCRIPT_URL ||
    env.GAS_WEB_APP_URL ||
    env.GOOGLE_APPS_SCRIPT_URL ||
    env.NEXT_PUBLIC_GAS_WEB_APP_URL ||
    env.NEXT_PUBLIC_GAS_URL ||
    process.env.VITE_GAS_WEB_APP_URL ||
    process.env.GAS_WEB_APP_URL ||
    process.env.GOOGLE_APPS_SCRIPT_URL ||
    '';

  const resolvedSpreadsheetId =
    env.VITE_GAS_SPREADSHEET_ID ||
    env.VITE_SPREADSHEET_ID ||
    env.GAS_SPREADSHEET_ID ||
    env.SPREADSHEET_ID ||
    process.env.VITE_GAS_SPREADSHEET_ID ||
    process.env.GAS_SPREADSHEET_ID ||
    process.env.SPREADSHEET_ID ||
    '';

  return {
    // Relative base './' ensures assets load properly on both root domains (vercel.app)
    // and repository subpaths on GitHub Pages (https://username.github.io/repo-name/)
    base: './',
    define: {
      'import.meta.env.VITE_GAS_WEB_APP_URL': JSON.stringify(resolvedGasUrl),
      'import.meta.env.VITE_GAS_SPREADSHEET_ID': JSON.stringify(resolvedSpreadsheetId),
    },
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

