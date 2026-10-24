import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve('src');
const layers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];
let failed = false;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(ts|tsx)$/.test(file)) inspect(file);
  }
}

function inspect(file) {
  const from = path.relative(root, file).split(path.sep);
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  for (const node of source.statements) {
    if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node))
      continue;
    const specifier = node.moduleSpecifier;
    if (
      !specifier ||
      !ts.isStringLiteral(specifier) ||
      !specifier.text.startsWith('.')
    )
      continue;
    const target = path.resolve(path.dirname(file), specifier.text);
    const to = path.relative(root, target).split(path.sep);
    const current = layers.indexOf(from[0]);
    const next = layers.indexOf(to[0]);
    if (current < 0 || next < 0) continue;
    const sameSlice =
      from[0] === to[0] &&
      (['app', 'shared'].includes(from[0]) || from[1] === to[1]);
    const invalidDirection = !sameSlice && next <= current;
    const privateImport = !sameSlice && to.length > 2 && to[2] !== 'index';
    if (invalidDirection || privateImport) {
      console.error(
        path.relative(root, file) + ': forbidden import ' + specifier.text,
      );
      failed = true;
    }
  }
}

walk(root);
if (failed) process.exitCode = 1;
else console.log('FSD imports passed.');
