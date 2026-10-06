import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile('src/scripts/admin.ts', 'utf8');
const parsed = ts.createSourceFile('admin.ts', source, ts.ScriptTarget.ES2022, true);
if (parsed.statements.some(statement => ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement) || ts.isExportAssignment(statement))) {
  throw new Error('El cliente del panel debe permanecer en un único archivo sin importaciones ni exportaciones.');
}
const result = ts.transpileModule(source, {
  fileName: 'admin.ts',
  reportDiagnostics: true,
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
});
const errors = result.diagnostics?.filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error) || [];
if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, {
  getCanonicalFileName: name => name,
  getCurrentDirectory: () => process.cwd(),
  getNewLine: () => '\n',
}));
await writeFile('worker/admin-client.txt', result.outputText);

const stockSource = await readFile('src/scripts/stock-admin.ts', 'utf8');
const stockParsed = ts.createSourceFile('stock-admin.ts', stockSource, ts.ScriptTarget.ES2022, true);
if (stockParsed.statements.some(statement => ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement) || ts.isExportAssignment(statement))) throw new Error('El cliente de stock debe ser autónomo.');
const stockResult = ts.transpileModule(stockSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } });
await writeFile('worker/stock/client.txt', stockResult.outputText);
