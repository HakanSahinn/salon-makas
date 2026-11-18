const path = require('node:path');
const { spawnSync } = require('node:child_process');
const production = process.argv.includes('--production');
const root = path.dirname(require.resolve('../package.json'));
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (!sdk) throw new Error('ANDROID_HOME must point to the Android SDK.');
const adb = path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
function run(command, args, capture = false) {
  const result = spawnSync(command, args, { cwd: root, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || 'Android command failed.');
  return result.stdout;
}
const devices = run(adb, ['devices'], true).split(/\r?\n/).map(line => /^(\S+)\s+device$/.exec(line.trim())?.[1]).filter(Boolean);
const requested = process.argv.find(arg => arg.startsWith('--device='))?.slice(9);
const serial = requested || (devices.length === 1 ? devices[0] : null);
if (!serial || !devices.includes(serial)) throw new Error('Tek bir cihaz/emülatör açın veya --device=emulator-5554 belirtin.');
const abiList = run(adb, ['-s', serial, 'shell', 'getprop', 'ro.product.cpu.abilist'], true).trim().split(',');
const abi = abiList.find(value => ['arm64-v8a', 'armeabi-v7a', 'x86_64', 'x86'].includes(value));
if (!abi) throw new Error('Unsupported Android processor.');
run(process.execPath, [path.join(root, 'scripts/build-android.cjs'), `--abi=${abi}`, ...(production ? ['--production'] : [])]);
run(adb, ['-s', serial, 'install', '-r', path.join(root, 'dist', `salon-makas-${production ? 'production-' : ''}${abi}.apk`)]);
run(adb, ['-s', serial, 'shell', 'am', 'force-stop', 'com.berber.randevu']);
run(adb, ['-s', serial, 'shell', 'am', 'start', '-n', 'com.berber.randevu/.MainActivity']);
