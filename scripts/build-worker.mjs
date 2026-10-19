import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
import { build } from 'esbuild';

// Bundle the editor and shared HTML sanitizer into one standalone browser script.
const result = await build({ entryPoints: ['src/scripts/admin.ts'], bundle: true, format: 'iife', platform: 'browser', target: 'es2022', write: false, minify: true });
await writeFile('worker/admin-client.txt', result.outputFiles[0].text);

const stockSource = await readFile('src/scripts/stock-admin.ts', 'utf8');
const stockParsed = ts.createSourceFile('stock-admin.ts', stockSource, ts.ScriptTarget.ES2022, true);
if (stockParsed.statements.some(statement => ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement) || ts.isExportAssignment(statement))) throw new Error('El cliente de stock debe ser autónomo.');
const stockResult = ts.transpileModule(stockSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } });
await writeFile('worker/stock/client.txt', stockResult.outputText);
