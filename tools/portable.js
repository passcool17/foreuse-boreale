/**
 * Fichier HTML unique, ouvrable par double-clic (file://).
 * Les modules ES sont bloqués par le navigateur dans ce cas.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outJs = path.join(root, 'dist-portable.js');
const built = spawnSync('npx', [
  '--yes', 'esbuild@0.24.2',
  path.join(root, 'src/game/main.js'),
  '--bundle', '--format=iife', '--platform=browser', '--target=es2020',
  `--outfile=${outJs}`,
], { cwd: root, stdio: 'inherit' });
if (built.status !== 0) process.exit(built.status || 1);

const css = fs.readFileSync(path.join(root, 'src/game/ui.css'), 'utf8');
const phaser = fs.readFileSync(path.join(root, 'vendor/phaser.min.js'), 'utf8');
const game = fs.readFileSync(outJs, 'utf8');
fs.rmSync(outJs, { force: true });

const guard = (code) => code.replace(/<\/script/gi, '<\\/script');

const html = `<!DOCTYPE html>
<html lang="fr-CA">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <meta name="theme-color" content="#101614">
  <title>Foreuse Boréale</title>
  <style>
${css}
  </style>
</head>
<body>
  <div id="jeu"></div>
  <div id="ui"></div>
  <p id="chargement">Chargement de la foreuse…</p>
  <script>
    window.setTimeout(function () {
      if (window.__FB_BOOT) return;
      var el = document.getElementById('chargement');
      if (!el) return;
      el.className = 'echec';
      el.textContent = 'Le jeu n’a pas démarré. L’aperçu du zip ou du clavardage ne lance pas les scripts. Enregistre ce fichier, puis ouvre-le depuis le dossier Téléchargements.';
    }, 1500);
  </script>
  <script>${guard(phaser)}</script>
  <script>${guard(game)}</script>
</body>
</html>
`;

const dest = path.join(root, 'Foreuse-Boreale.html');
fs.writeFileSync(dest, html);
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
const pages = path.join(root, 'docs', 'index.html');
fs.writeFileSync(pages, html);
console.log('écrit', dest, fs.statSync(dest).size);
console.log('écrit', pages, fs.statSync(pages).size);
