#!/usr/bin/env node
/**
 * Xcode 26+ requires IPHONEOS_DEPLOYMENT_TARGET >= 12.0 and has issues with
 * Swift explicit modules + older Sodium (swift-sodium) pods.
 *
 * Cordova regenerates Podfile from a template (wiping custom post_install),
 * so this hook re-applies the fix on after_prepare and before_compile.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const MARKER = '# moodle-blsd: xcode26 pods fix';
const POST_INSTALL = `
${MARKER}
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      deployment = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f
      if deployment > 0 && deployment < 13.0
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
      end
      # Xcode 26 explicit modules break EmitSwiftModule for Sodium/Clibsodium.
      config.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
      config.build_settings['ONLY_ACTIVE_ARCH'] = 'YES'
    end
  end

  installer.pods_project.build_configurations.each do |config|
    config.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
    config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
  end
end
`;

function stripCustomPostInstall(contents) {
    // Keep only the Cordova-generated portion (until the first custom marker / post_install).
    const markerIdx = contents.search(/# moodle-blsd:/);
    if (markerIdx !== -1) {
        return contents.slice(0, markerIdx).trimEnd() + '\n';
    }

    const postIdx = contents.search(/\npost_install\s+do\s+\|installer\|/);
    if (postIdx !== -1) {
        return contents.slice(0, postIdx).trimEnd() + '\n';
    }

    return contents.trimEnd() + '\n';
}

function ensurePodfilePatched(projectRoot) {
    const podfilePath = path.join(projectRoot, 'platforms', 'ios', 'Podfile');
    if (!fs.existsSync(podfilePath)) {
        console.log('fix_ios_pods: Podfile not found, skipping');
        return false;
    }

    const original = fs.readFileSync(podfilePath, 'utf8');
    const base = stripCustomPostInstall(original);
    const next = base + POST_INSTALL;

    if (original === next) {
        console.log('fix_ios_pods: Podfile already up to date');
        return false;
    }

    fs.writeFileSync(podfilePath, next);
    console.log('fix_ios_pods: patched Podfile for Xcode 26+');

    const iosDir = path.dirname(podfilePath);
    execSync('pod install', {
        cwd: iosDir,
        stdio: 'inherit',
        env: { ...process.env, COCOAPODS_DISABLE_STATS: 'true' },
    });

    return true;
}

module.exports = function (ctx) {
    const projectRoot = ctx.opts.projectRoot;
    const hasIos = (ctx.opts.platforms || []).includes('ios') ||
        fs.existsSync(path.join(projectRoot, 'platforms', 'ios', 'Podfile'));

    if (!hasIos) {
        return;
    }

    ensurePodfilePatched(projectRoot);
};
