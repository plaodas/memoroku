const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withMainApplication,
  withProjectBuildGradle,
  withMainActivity,
  withStringsXml,
  withXcodeProject,
} = require('@expo/config-plugins');

const IOS_SOURCE_FILES = ['NativeRecorder.swift', 'BackgroundTasks.swift'];

const SYSTEM_FRAMEWORKS = ['AVFoundation.framework', 'BackgroundTasks.framework'];

function copyTree(from, to) {
  fs.cpSync(from, to, { recursive: true });
}

function withCopiedNativeSources(config) {
  config = withDangerousMod(config, [
    'ios',
    (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const projectName = config.modRequest.projectName ?? 'memoroku';
      const source = path.join(projectRoot, 'plugins', 'native', 'ios');
      copyTree(source, path.join(projectRoot, 'ios', projectName));

      const delegatePath = path.join(projectRoot, 'ios', projectName, 'AppDelegate.swift');
      if (fs.existsSync(delegatePath)) {
        const contents = fs.readFileSync(delegatePath, 'utf8');
        const needle = 'return super.application(application, didFinishLaunchingWithOptions: launchOptions)';
        if (!contents.includes('BackgroundTasks.scheduleCleanup()') && contents.includes(needle)) {
          fs.writeFileSync(
            delegatePath,
            contents.replace(needle, `BackgroundTasks.scheduleCleanup()\n    ${needle}`),
          );
        }
      }

      return config;
    },
  ]);

  return withDangerousMod(config, [
    'android',
    (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const source = path.join(projectRoot, 'plugins', 'native');
      copyTree(
        path.join(source, 'android'),
        path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', 'com', 'memoroku'),
      );
      copyTree(path.join(source, 'res'), path.join(projectRoot, 'android', 'app', 'src', 'main', 'res'));
      return config;
    },
  ]);
}

function readKotlinVersion(projectRoot) {
  const tomlPath = path.join(projectRoot, 'node_modules', 'react-native', 'gradle', 'libs.versions.toml');
  const toml = fs.readFileSync(tomlPath, 'utf8');
  const match = toml.match(/^kotlin\s*=\s*"([^"]+)"/m);
  if (!match) {
    throw new Error('Could not read the Kotlin version from react-native/gradle/libs.versions.toml');
  }
  return match[1];
}

function withComposeClasspath(config) {
  return withProjectBuildGradle(config, (config) => {
    const version = readKotlinVersion(config.modRequest.projectRoot);
    if (!config.modResults.contents.includes('org.jetbrains.kotlin.plugin.compose')) {
      const needle = "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')";
      const composeClasspath = `classpath('org.jetbrains.kotlin.plugin.compose:org.jetbrains.kotlin.plugin.compose.gradle.plugin:${version}')`;
      if (!config.modResults.contents.includes(needle)) {
        throw new Error('Could not find the Kotlin Gradle plugin classpath in android/build.gradle');
      }
      config.modResults.contents = config.modResults.contents.replace(
        needle,
        `${needle}\n        ${composeClasspath}`,
      );
    }
    return config;
  });
}

function withAndroidNativeDeps(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes('org.jetbrains.kotlin.plugin.compose')) {
      contents = contents.replace(
        'apply plugin: "org.jetbrains.kotlin.android"',
        'apply plugin: "org.jetbrains.kotlin.android"\napply plugin: "org.jetbrains.kotlin.plugin.compose"',
      );
    }
    if (!contents.includes('compose true')) {
      contents = contents.replace(
        /android\s*\{/,
        `android {\n    buildFeatures {\n        compose true\n    }`,
      );
    }
    if (!contents.includes('androidx.glance:glance-appwidget')) {
      contents += `
dependencies {
    implementation "androidx.glance:glance-appwidget:1.1.1"
    implementation "androidx.work:work-runtime-ktx:2.10.1"
}
`;
    }
    config.modResults.contents = contents;
    return config;
  });
}

function withCleanupSchedule(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes('BackgroundWorker.schedule(this)')) {
      contents = contents.replace('super.onCreate()', 'super.onCreate()\n    BackgroundWorker.schedule(this)');
    }
    config.modResults.contents = contents;
    return config;
  });
}

function withMemoWidgetReceiver(config) {
  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    application.$['android:usesCleartextTraffic'] = 'true';
    application.receiver = application.receiver ?? [];
    const name = '.widgets.MemoReceiver';
    const exists = application.receiver.some((receiver) => receiver.$['android:name'] === name);
    if (!exists) {
      application.receiver.push({
        $: {
          'android:name': name,
          'android:exported': 'true',
          'android:label': 'Memoroku',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/memo_widget_info',
            },
          },
        ],
      });
    }
    return config;
  });
}

function withRecordShortcut(config) {
  config = withStringsXml(config, (config) => {
    config.modResults = AndroidConfig.Strings.setStringItem(
      [
        {
          $: { name: 'shortcut_record' },
          _: '録音',
        },
      ],
      config.modResults,
    );
    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    const activity = application.activity?.find((item) => item.$['android:name'] === '.MainActivity');
    if (!activity) {
      return config;
    }
    activity['meta-data'] = activity['meta-data'] ?? [];
    const name = 'android.app.shortcuts';
    const exists = activity['meta-data'].some((item) => item.$['android:name'] === name);
    if (!exists) {
      activity['meta-data'].push({
        $: {
          'android:name': name,
          'android:resource': '@xml/shortcuts',
        },
      });
    }
    return config;
  });

  return withMainActivity(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes('RecordingSession.startFromIntent')) {
      return config;
    }
    if (!contents.includes('import android.content.Intent')) {
      contents = contents.replace('import android.os.Build', 'import android.content.Intent\nimport android.os.Build');
    }
    contents = contents.replace(
      'super.onCreate(null)',
      'super.onCreate(null)\n    expo.modules.memorokurecorder.RecordingSession.startFromIntent(this, intent)',
    );
    const hook = `
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    expo.modules.memorokurecorder.RecordingSession.startFromIntent(this, intent)
  }

`;
    contents = contents.replace('  override fun getMainComponentName()', `${hook}  override fun getMainComponentName()`);
    config.modResults.contents = contents;
    return config;
  });
}

function withWidgetDescription(config) {
  return withStringsXml(config, (config) => {
    config.modResults = AndroidConfig.Strings.setStringItem(
      [
        {
          $: { name: 'memo_widget_description' },
          _: 'Latest memoroku memo',
        },
      ],
      config.modResults,
    );
    return config;
  });
}

function omitEmptyProjectValues(project) {
  const objects = project.hash?.project?.objects;
  if (!objects) {
    return;
  }
  for (const section of Object.values(objects)) {
    if (!section || typeof section !== 'object') {
      continue;
    }
    for (const entry of Object.values(section)) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      for (const key of Object.keys(entry)) {
        if (entry[key] === undefined || entry[key] === null) {
          delete entry[key];
        }
      }
    }
  }
}

function fileIsReferenced(project, filePath) {
  const section = project.pbxFileReferenceSection();
  return Object.values(section).some((entry) => {
    if (!entry || typeof entry !== 'object' || !entry.path) {
      return false;
    }
    const value = String(entry.path).replace(/"/g, '');
    return value === filePath || value.endsWith(`/${path.basename(filePath)}`);
  });
}

function withIosNativeSources(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const projectName = config.modRequest.projectName ?? 'memoroku';
    const target = project.getFirstTarget().uuid;
    const groupKey = project.findPBXGroupKey({ name: projectName });

    for (const relativePath of IOS_SOURCE_FILES) {
      const filePath = `${projectName}/${relativePath}`;
      if (!fileIsReferenced(project, filePath)) {
        project.addSourceFile(filePath, { target }, groupKey);
      }
    }

    for (const framework of SYSTEM_FRAMEWORKS) {
      project.addFramework(framework, { target });
    }

    return config;
  });
}

function withOmittedEmptyXcodeValues(config) {
  return withXcodeProject(config, (config) => {
    omitEmptyProjectValues(config.modResults);
    return config;
  });
}

function withMemorokuNative(config) {
  config = withCopiedNativeSources(config);
  config = withComposeClasspath(config);
  config = withAndroidNativeDeps(config);
  config = withCleanupSchedule(config);
  config = withMemoWidgetReceiver(config);
  config = withRecordShortcut(config);
  config = withWidgetDescription(config);
  config = withIosNativeSources(config);
  return config;
}

module.exports = withMemorokuNative;
module.exports.withOmittedEmptyXcodeValues = withOmittedEmptyXcodeValues;
