#!/usr/bin/env node

// Add iOS Transport Security
// v1.0
// Automatically adds NSAppTransportSecurity to the project's plist file with value NSAllowsArbitraryLoads.
// This allows using non-SSL requests in iOS9.

// Global vars.
var fs = require('fs'),
    plist = require('plist'),
    rootdir = process.argv[2],
    plistPath = rootdir + '/platforms/ios/Moodle Mobile/Moodle Mobile-Info.plist';

/*
 * Adds some data to the "Moodle Mobile-Info.plist" file. If the property is already set, it does nothing.
 */
function updateIOSPlist(configItems) {

    if (!configItems) {
        return;
    }

    var infoPlist = plist.parse(fs.readFileSync(plistPath, 'utf-8')),
        tempInfoPlist,
        modified = false;

    if (infoPlist) {
        for (var i = 0; i < configItems.length; i++) {
            var c = configItems[i];
            if (typeof infoPlist[c.parent] == 'undefined') {
                modified = true;
                infoPlist[c.parent] = c.value;
            }
        }

        if (modified) {
            tempInfoPlist = plist.build(infoPlist);
            fs.writeFileSync(plistPath, tempInfoPlist, 'utf-8');
        }
    }
}

// Check if the file exists.
if (fs.existsSync(plistPath)) {
    var configs = [
        {
            parent: 'NSAppTransportSecurity',
            value: {
                'NSAllowsArbitraryLoads': true
            }
        }
    ];
    updateIOSPlist(configs);
}
