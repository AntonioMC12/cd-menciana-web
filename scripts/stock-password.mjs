import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

async function promptPassword() {
  if (!process.stdin.isTTY) throw new Error('Ejecuta este comando en una terminal interactiva. La contraseña no debe pasarse como argumento.');
  process.stdout.write('Nueva contraseña de stock (mínimo 12 caracteres, entrada oculta): ');
  process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = () => { process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off('data', handler); process.stdout.write('\n'); };
    const handler = data => {
      for (const char of data.toString()) {
        if (char === '\u0003') { finish(); reject(new Error('Cancelado.')); return; }
        if (char === '\r' || char === '\n') { finish(); resolve(value); return; }
        if (char === '\u007f' || char === '\b') value = value.slice(0,-1);
        else if (char >= ' ') value += char;
      }
    };
    process.stdin.on('data', handler);
  });
}
const generated = process.argv.includes('--generate-local');
const local = generated || process.argv.includes('--local');
const password = generated ? randomBytes(24).toString('base64url') : await promptPassword();
if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw new Error('La contraseña debe tener entre 12 y 256 caracteres.');
const salt = randomBytes(32);
const hash = `pbkdf2-sha256$100000$${salt.toString('hex')}$${pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')}`;
await mkdir('tmp',{recursive:true});
if (local) {
  let variables = await readFile('.dev.vars','utf8').catch(()=> 'ENVIRONMENT=local\n');
  if (/^STOCK_PASSWORD_HASH=/m.test(variables)) variables = variables.replace(/^STOCK_PASSWORD_HASH=.*$/m,`STOCK_PASSWORD_HASH="${hash}"`);
  else variables += `\nSTOCK_PASSWORD_HASH="${hash}"\n`;
  if (!/^ENVIRONMENT=/m.test(variables)) variables += 'ENVIRONMENT=local\n';
  await writeFile('.dev.vars',variables,{mode:0o600});
  if (generated) { await writeFile('tmp/stock-local-password.txt',password,{mode:0o600}); console.log('Contraseña de prueba local guardada en tmp/stock-local-password.txt (archivo ignorado por Git).'); }
  console.log('Hash configurado en .dev.vars. No se ha modificado ningún secreto remoto.');
} else {
  await writeFile('tmp/stock-password-hash.txt',hash,{mode:0o600});
  console.log('Hash guardado en tmp/stock-password-hash.txt. Configúralo como secreto STOCK_PASSWORD_HASH mediante entrada desde archivo; después elimina este archivo.');
}
