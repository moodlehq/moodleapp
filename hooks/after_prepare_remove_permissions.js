#!/usr/bin/env node

/**
 * Hook to remove READ_MEDIA_IMAGES and READ_MEDIA_VIDEO permissions
 * Required by Google Play Store policies
 */

const fs = require('fs');
const path = require('path');

module.exports = function(context) {
    const platformRoot = path.join(context.opts.projectRoot, 'platforms/android');
    const manifestPath = path.join(platformRoot, 'app/src/main/AndroidManifest.xml');

    if (!fs.existsSync(manifestPath)) {
        console.log('AndroidManifest.xml not found, skipping permission removal');
        return;
    }

    let manifestContent = fs.readFileSync(manifestPath, 'utf8');

    // Remove READ_MEDIA_IMAGES permission
    manifestContent = manifestContent.replace(
        /<uses-permission android:name="android\.permission\.READ_MEDIA_IMAGES"\s*\/>\s*/g,
        ''
    );

    // Remove READ_MEDIA_VIDEO permission
    manifestContent = manifestContent.replace(
        /<uses-permission android:name="android\.permission\.READ_MEDIA_VIDEO"\s*\/>\s*/g,
        ''
    );

    fs.writeFileSync(manifestPath, manifestContent, 'utf8');
    console.log('✓ Removed READ_MEDIA_IMAGES and READ_MEDIA_VIDEO permissions from AndroidManifest.xml');
};
