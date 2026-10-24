const {
  withMainApplication,
  withAppDelegate,
  withAppBuildGradle,
  withProjectBuildGradle,
  withAndroidManifest,
  withDangerousMod,
  withPodfile,
  withXcodeProject,
} = require('expo/config-plugins');
module.exports = function withSquare(config) {
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const app = manifest.application[0];
    app.$['android:allowBackup'] = 'false';
    app.$['android:fullBackupContent'] = 'false';
    app.$['android:dataExtractionRules'] = '@xml/pos_data_extraction_rules';
    app.$['tools:replace'] = Array.from(
      new Set(
        (app.$['tools:replace'] ?? '')
          .split(',')
          .filter(Boolean)
          .concat([
            'android:allowBackup',
            'android:fullBackupContent',
            'android:dataExtractionRules',
          ]),
      ),
    ).join(',');
    return mod;
  });
  config = withDangerousMod(config, [
    'android',
    async (mod) => {
      const fs = require('node:fs'),
        path = require('node:path');
      const dir = path.join(
        mod.modRequest.platformProjectRoot,
        'app/src/main/res/xml',
      );
      fs.mkdirSync(dir, { recursive: true });
      const exclusions = [
        'root',
        'file',
        'database',
        'sharedpref',
        'external',
        'device_root',
        'device_file',
        'device_database',
        'device_sharedpref',
      ]
        .map((domain) => `<exclude domain="${domain}" path="."/>`)
        .join('');
      fs.writeFileSync(
        path.join(dir, 'pos_data_extraction_rules.xml'),
        `<?xml version="1.0" encoding="utf-8"?><data-extraction-rules><cloud-backup disableIfNoEncryptionCapabilities="true">${exclusions}</cloud-backup><device-transfer>${exclusions}</device-transfer></data-extraction-rules>`,
      );
      return mod;
    },
  ]);
  config = withProjectBuildGradle(config, (mod) => {
    mod.modResults.contents = mod.modResults.contents.replace(
      /classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin(?::[^'"]+)?['"]\)/,
      "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:2.3.0')",
    );
    return mod;
  });
  const appId = config.extra?.squareApplicationId;
  if (!/^sandbox-[\w-]+$/.test(appId ?? ''))
    throw new Error(
      'Set public SQUARE_MOBILE_APPLICATION_ID to the Square Sandbox application ID before native prebuild',
    );
  config = withMainApplication(config, (mod) => {
    const file = mod.modResults;
    if (file.language !== 'kt')
      throw new Error(
        'Square companion expects the Expo Kotlin application delegate',
      );
    if (file.contents.includes('MobilePaymentsSdk.initialize'))
      file.contents = file.contents.replace(
        /MobilePaymentsSdk\.initialize\("[^"]+", this\)/,
        `MobilePaymentsSdk.initialize("${appId}", this)`,
      );
    else
      file.contents = file.contents.replace(
        'super.onCreate()',
        `super.onCreate()\n    com.squareup.sdk.mobilepayments.MobilePaymentsSdk.initialize("${appId}", this)`,
      );
    return mod;
  });
  config = withAppDelegate(config, (mod) => {
    const file = mod.modResults;
    if (file.language !== 'swift')
      throw new Error('Square companion expects the Expo Swift app delegate');
    if (file.contents.includes('MobilePaymentsSDK.initialize'))
      file.contents = file.contents.replace(
        /MobilePaymentsSDK\.initialize\(applicationLaunchOptions: launchOptions, squareApplicationID: "[^"]+"\)/,
        `MobilePaymentsSDK.initialize(applicationLaunchOptions: launchOptions, squareApplicationID: "${appId}")`,
      );
    else {
      if (
        !file.contents.includes(
          'return super.application(application, didFinishLaunchingWithOptions: launchOptions)',
        )
      )
        throw new Error(
          'Review the Swift application delegate before adding Square initialization',
        );
      file.contents =
        'import SquareMobilePaymentsSDK\n' +
        file.contents.replace(
          'return super.application(application, didFinishLaunchingWithOptions: launchOptions)',
          `MobilePaymentsSDK.initialize(applicationLaunchOptions: launchOptions, squareApplicationID: "${appId}")\n    return super.application(application, didFinishLaunchingWithOptions: launchOptions)`,
        );
    }
    return mod;
  });
  config = withPodfile(config, (mod) => {
    const marker = '# Stage E Square setup ordering';
    if (mod.modResults.contents.includes(marker)) return mod;
    if (/\bpost_integrate\s+do\b/.test(mod.modResults.contents))
      throw new Error(
        'Merge the existing CocoaPods post_integrate hook with Square setup ordering',
      );
    mod.modResults.contents += `\n${marker}\npost_integrate do |installer|\n  installer.aggregate_targets.map(&:user_project).compact.uniq.each do |project|\n    project.native_targets.each do |target|\n      setup = target.shell_script_build_phases.find { |phase| phase.name == 'Square SDK setup' }\n      if setup\n        target.build_phases.delete(setup)\n        target.build_phases << setup\n      end\n    end\n    project.save\n  end\nend\n`;
    return mod;
  });
  config = withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes('Stage F release qualification'))
      mod.modResults.contents += `\n// Stage F release qualification is required before a distributable build.\ngradle.taskGraph.whenReady { graph ->\n  if (graph.allTasks.any { it.name.toLowerCase().contains('release') }) throw new GradleException('Stage F release qualification required')\n}\nandroid { buildTypes { release { minifyEnabled false; shrinkResources false } } }\ndependencies { implementation('com.squareup.sdk:mobile-payments-sdk:2.6.1') }\n`;
    return mod;
  });
  config = withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    if (
      !JSON.stringify(
        project.hash.project.objects.PBXShellScriptBuildPhase ?? {},
      ).includes('Square SDK setup')
    )
      project.addBuildPhase(
        [],
        'PBXShellScriptBuildPhase',
        'Square SDK setup',
        null,
        {
          shellPath: '/bin/sh',
          shellScript:
            'SETUP_SCRIPT="${BUILT_PRODUCTS_DIR}/${FRAMEWORKS_FOLDER_PATH}/SquareMobilePaymentsSDK.framework/setup"\nif [ -f "$SETUP_SCRIPT" ]; then "$SETUP_SCRIPT"; fi\nif [ "$CONFIGURATION" = "Release" ]; then echo "Stage F release qualification required"; exit 1; fi',
        },
      );
    return mod;
  });
  return config;
};
