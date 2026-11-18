const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const project = path.dirname(require.resolve('../package.json'));
const production = process.argv.includes('--production');
const abiOption = process.argv.find(arg => arg.startsWith('--abi='));
const abi = abiOption?.slice(6) || 'arm64-v8a';
const supported = ['arm64-v8a', 'armeabi-v7a', 'x86_64', 'x86', 'universal'];
if (!supported.includes(abi)) throw new Error('Unsupported Android architecture.');
const environment = { ...process.env, CI: '1', SALON_MAKAS_PRODUCTION: production ? '1' : '0' };
const sdk = environment.ANDROID_HOME || environment.ANDROID_SDK_ROOT;
if (!sdk) throw new Error('ANDROID_HOME must point to the Android SDK.');
if (production) {
  const keys = ['SALON_MAKAS_KEYSTORE_PATH', 'SALON_MAKAS_STORE_PASSWORD', 'SALON_MAKAS_KEY_ALIAS', 'SALON_MAKAS_KEY_PASSWORD'];
  const credentialsPath = path.join(project, '.signing', 'credentials.json');
  if (keys.every(key => !environment[key]) && fs.existsSync(credentialsPath)) {
    const local = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    if (typeof local.keystore !== 'string' || path.basename(local.keystore) !== local.keystore
      || typeof local.password !== 'string' || typeof local.alias !== 'string') throw new Error('Local signing credentials are invalid.');
    environment.SALON_MAKAS_KEYSTORE_PATH = path.join(project, '.signing', local.keystore);
    environment.SALON_MAKAS_STORE_PASSWORD = local.password;
    environment.SALON_MAKAS_KEY_ALIAS = local.alias;
    environment.SALON_MAKAS_KEY_PASSWORD = local.password;
  }
  const required = ['SALON_MAKAS_KEYSTORE_PATH', 'SALON_MAKAS_STORE_PASSWORD', 'SALON_MAKAS_KEY_ALIAS', 'SALON_MAKAS_KEY_PASSWORD'];
  if (required.some((key) => !environment[key]) || !fs.existsSync(environment.SALON_MAKAS_KEYSTORE_PATH)) throw new Error('Production signing credentials are missing.');
}
function run(command, args, cwd, shell = false, capture = false) {
  const result = spawnSync(command, args, { cwd, env: environment, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8', shell });
  if (result.error) throw result.error;
  if (result.status !== 0) { if (capture) console.error(result.stderr); process.exit(result.status ?? 1); }
  return result.stdout;
}
const expo = path.join(path.dirname(require.resolve('expo/package.json')), 'bin', 'cli');
const cacheFile = path.join(project, 'node_modules', '.cache', 'salon-native-config.txt');
const fingerprint = require('node:crypto').createHash('sha256')
  .update(fs.readFileSync(path.join(project, 'app.json')))
  .update(fs.readFileSync(path.join(project, 'plugins', 'withAndroidBuild.cjs')))
  .update(JSON.stringify(require('../package.json').dependencies)).digest('hex');
const nativeExists = fs.existsSync(path.join(project, 'android', 'app', 'build.gradle'));
const unchanged = fs.existsSync(cacheFile) && fs.readFileSync(cacheFile, 'utf8') === fingerprint;
if (!process.argv.includes('--skip-prebuild') && (!nativeExists || !unchanged)) {
  run(process.execPath, [expo, 'prebuild', '--platform', 'android', '--no-install'], project);
}
fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
fs.writeFileSync(cacheFile, fingerprint);
const android = path.join(project, 'android');
const windows = process.platform === 'win32';
const architectures = abi === 'universal' ? supported.filter(value => value !== 'universal').join(',') : abi;
run(windows ? 'gradlew.bat' : './gradlew', ['app:assembleRelease', `-PreactNativeArchitectures=${architectures}`, '--console=plain'], android, windows);
const apk = path.join(android, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const buildTools = path.join(sdk, 'build-tools');
const versions = fs.readdirSync(buildTools).filter((name) => /^\d+(\.\d+)+$/.test(name));
versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
if (!versions.length) throw new Error('Android SDK build-tools are missing.');
const signer = path.join(buildTools, versions[0], windows ? 'apksigner.bat' : 'apksigner');
run(windows ? `"${signer}"` : signer, ['verify', '--verbose', apk], project, windows);
const aapt = path.join(buildTools, versions[0], windows ? 'aapt.exe' : 'aapt');
const entries = run(aapt, ['list', apk], project, false, true);
if (!entries.split(/\r?\n/).includes('assets/index.android.bundle')) throw new Error('Offline JavaScript bundle is missing.');
const nativeABIs = [...new Set(entries.split(/\r?\n/).filter(name => name.startsWith('lib/')).map(name => name.split('/')[1]))];
if (abi !== 'universal' && (nativeABIs.length !== 1 || nativeABIs[0] !== abi)) throw new Error('APK contains unexpected processor architectures.');
const output = path.join(project, 'dist', `salon-makas-${production ? 'production-' : ''}${abi}.apk`);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.copyFileSync(apk, output);
if (abi === 'arm64-v8a' && !production) fs.copyFileSync(output, path.join(project, 'dist', 'salon-makas.apk'));
console.log(`Verified offline APK: ${output} (${(fs.statSync(output).size / 1e6).toFixed(2)} MB)`);
