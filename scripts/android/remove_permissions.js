// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Script to remove permissions for APK files. Implementation obtained from:
 * https://stackoverflow.com/a/67530993/5820052
 */
const fs = require('fs/promises');
const xml2js = require('xml2js');

const REMOVE_PERMISSIONS = [
    'android.permission.REQUEST_INSTALL_PACKAGES',
];

module.exports = async function(context) {
    const root = context.opts.projectRoot;
    const manifestPath = root + '/platforms/android/app/src/main/AndroidManifest.xml';

    const manifestXml = await fs.readFile(manifestPath);
    const manifest = await xml2js.parseStringPromise(manifestXml);

    const usesPermissions = manifest.manifest['uses-permission'];
    if (Array.isArray(usesPermissions)) {
        manifest.manifest['uses-permission'] = usesPermissions.filter(usesPermission => {
            const attrs = usesPermission.$ || {};
            const name = attrs['android:name'];

            if (REMOVE_PERMISSIONS.includes(name)) {
                console.log(`Removing permission "${name}" from AndroidManifest.xml`);
                return false;
            } else {
                return true;
            }
        });
    }

    const newManifest = (new xml2js.Builder()).buildObject(manifest);

    await fs.writeFile(manifestPath, newManifest);
}
