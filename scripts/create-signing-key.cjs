const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, X509Certificate } = require('node:crypto');
const { spawnSync } = require('node:child_process');

const root = path.dirname(require.resolve('../package.json'));
const folder = path.join(root, '.signing');
const credentialsPath = path.join(folder, 'credentials.json');
const keystorePath = path.join(folder, 'salon-makas-release.p12');
const keytool = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'keytool.exe' : 'keytool') : 'keytool';
function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { env, encoding: 'utf8', stdio: 'pipe' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || 'Signing tool failed.');
  return result.stdout;
}

fs.mkdirSync(folder, { recursive: true, mode: 0o700 });
if (process.platform === 'win32') {
  const identity = run('whoami.exe', ['/user', '/fo', 'csv', '/nh']);
  const sid = identity.match(/S-1-5-\d+(?:-\d+)+/)?.[0];
  if (!sid) throw new Error('Windows user identity could not be determined.');
  run('icacls.exe', [folder, '/inheritance:r', '/grant:r', `*${sid}:(OI)(CI)F`, '*S-1-5-18:(OI)(CI)F']);
}

const hasCredentials = fs.existsSync(credentialsPath);
const hasKey = fs.existsSync(keystorePath);
if (hasCredentials !== hasKey) throw new Error('Signing setup is incomplete. Existing files were preserved; do not replace the key.');
let credentials;
if (!hasKey) {
  credentials = { keystore: 'salon-makas-release.p12', alias: 'salon-makas-release', password: randomBytes(32).toString('base64url') };
  const env = { ...process.env, SALON_MAKAS_NEW_KEY_PASSWORD: credentials.password };
  run(keytool, ['-genkeypair', '-noprompt', '-storetype', 'PKCS12', '-keystore', keystorePath,
    '-storepass:env', 'SALON_MAKAS_NEW_KEY_PASSWORD', '-keypass:env', 'SALON_MAKAS_NEW_KEY_PASSWORD',
    '-alias', credentials.alias, '-keyalg', 'RSA', '-keysize', '3072', '-sigalg', 'SHA256withRSA',
    '-validity', '36500', '-dname', 'CN=Salon Makas, O=Salon Makas, C=TR'], env);
  fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
} else credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const env = { ...process.env, SALON_MAKAS_NEW_KEY_PASSWORD: credentials.password };
run(keytool, ['-list', '-keystore', keystorePath, '-storepass:env', 'SALON_MAKAS_NEW_KEY_PASSWORD', '-alias', credentials.alias], env);
const certificatePath = path.join(folder, 'salon-makas-certificate.pem');
run(keytool, ['-exportcert', '-rfc', '-keystore', keystorePath, '-storepass:env', 'SALON_MAKAS_NEW_KEY_PASSWORD',
  '-alias', credentials.alias, '-file', certificatePath], env);
const certificate = new X509Certificate(fs.readFileSync(certificatePath));
const info = { alias: credentials.alias, sha256: certificate.fingerprint256, validFrom: certificate.validFrom, validTo: certificate.validTo };
fs.writeFileSync(path.join(folder, 'certificate-info.json'), JSON.stringify(info, null, 2) + '\n');
console.log('Permanent signing key verified. Existing keys are never regenerated.');
console.log(JSON.stringify(info));
