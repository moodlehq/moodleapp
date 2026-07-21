#!/usr/bin/env node
/**
 * Xcode 26+ requires IPHONEOS_DEPLOYMENT_TARGET >= 12.0.
 * CocoaPods like Sodium still ship with 9.0 and can fail SwiftDriver.
 * Append a post_install hook to the Cordova-generated Podfile and reinstall pods.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const MARKER = '# moodle-blsd: xcode26 deployment target fix';
const POST_INSTALL = `
${MARKER}
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      deployment = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f
      if deployment > 0 && deployment < 13.0
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
      end
      if target.name == 'Sodium'
        config.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
      end
    end
  end
end
`;

module.exports = function (ctx) {
    if (!ctx.opts.platforms || !ctx.opts.platforms.includes('ios')) {
        return;
    }

    const podfilePath = path.join(ctx.opts.projectRoot, 'platforms', 'ios', 'Podfile');
    if (!fs.existsSync(podfilePath)) {
        console.log('fix_ios_pods: Podfile not found, skipping');
        return;
    }

    let contents = fs.readFileSync(podfilePath, 'utf8');
    if (contents.includes(MARKER)) {
        console.log('fix_ios_pods: Podfile already patched');
        return;
    }

    // Cordova regenerates Podfile without post_install; append ours.
    contents = contents.trimEnd() + '\n' + POST_INSTALL;
    fs.writeFileSync(podfilePath, contents);
    console.log('fix_ios_pods: patched Podfile for Xcode 26+');

    const iosDir = path.dirname(podfilePath);
    execSync('pod install', { cwd: iosDir, stdio: 'inherit' });
};
