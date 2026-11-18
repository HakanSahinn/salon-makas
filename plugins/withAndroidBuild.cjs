const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

const marker = '// Salon Makas build settings';
const settings = `
${marker}
androidComponents.finalizeDsl { config ->
    config.defaultConfig.externalNativeBuild.cmake.arguments.add('-DCMAKE_OBJECT_PATH_MAX=245')
}
if (System.getenv('SALON_MAKAS_PRODUCTION') == '1') {
    def required = ['SALON_MAKAS_KEYSTORE_PATH', 'SALON_MAKAS_STORE_PASSWORD', 'SALON_MAKAS_KEY_ALIAS', 'SALON_MAKAS_KEY_PASSWORD']
    if (required.any { !System.getenv(it) }) {
        throw new GradleException('Salon Makas production signing environment is incomplete.')
    }
    android.signingConfigs.create('salonMakasRelease') {
        storeFile file(System.getenv('SALON_MAKAS_KEYSTORE_PATH'))
        storePassword System.getenv('SALON_MAKAS_STORE_PASSWORD')
        keyAlias System.getenv('SALON_MAKAS_KEY_ALIAS')
        keyPassword System.getenv('SALON_MAKAS_KEY_PASSWORD')
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.salonMakasRelease
}
`;

module.exports = function withAndroidBuild(config) {
  config = withGradleProperties(config, (result) => {
    for (const key of ['android.enableMinifyInReleaseBuilds', 'android.enableShrinkResourcesInReleaseBuilds']) {
      result.modResults = result.modResults.filter(item => item.key !== key);
      result.modResults.push({ type: 'property', key, value: 'true' });
    }
    return result;
  });
  return withAppBuildGradle(config, (result) => {
    const original = result.modResults.contents;
    result.modResults.contents = original.split(marker)[0].trimEnd() + '\n' + settings;
    return result;
  });
};
