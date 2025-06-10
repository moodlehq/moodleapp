#!/usr/bin/env node

/**
 * Hook to fix iOS build issue with push plugin and custom app names.
 * This replaces "Moodle-Swift.h" with "Aspire School-Swift.h" in EncryptionHandler.m
 */

const fs = require('fs');
const path = require('path');

module.exports = function(context) {
    // Only run for iOS platform
    if (context.opts.platforms.indexOf('ios') < 0) {
        return;
    }

    const platformRoot = path.join(context.opts.projectRoot, 'platforms', 'ios');
    const encryptionHandlerPath = path.join(
        platformRoot, 
        'Aspire School', 
        'Plugins', 
        '@moodlehq', 
        'phonegap-plugin-push', 
        'EncryptionHandler.m'
    );

    // Check if file exists
    if (!fs.existsSync(encryptionHandlerPath)) {
        console.log('EncryptionHandler.m not found, might be using a different path structure');
        return;
    }

    // Read the file
    let content = fs.readFileSync(encryptionHandlerPath, 'utf8');
    
    // Replace Moodle-Swift.h with Aspire School-Swift.h
    const originalImport = '#import "Moodle-Swift.h"';
    const newImport = '#import "Aspire School-Swift.h"';
    
    if (content.includes(originalImport)) {
        content = content.replace(originalImport, newImport);
        fs.writeFileSync(encryptionHandlerPath, content, 'utf8');
        console.log('Fixed iOS push plugin import for Aspire School');
    } else {
        console.log('Import already fixed or has different format');
    }
};