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

const { writeFile, readdirSync, statSync, readFileSync } = require('fs');

const FONTS_PATH = 'src/assets/fonts';
const ICONS_JSON_FILE_PATH = 'src/assets/fonts/icons.json';

/**
 * Get object with the map of icons for all fonts.
 *
 * @returns Icons map.
 */
function getIconsMap() {
    const config = JSON.parse(readFileSync('moodle.config.json'));
    let icons = {};

    const fonts = readdirSync(FONTS_PATH);
    fonts.forEach(font => {
        const fontPath = `${FONTS_PATH}/${font}`;
        if (statSync(fontPath).isFile()) {
            // Not a font, ignore.
            return;
        }

        icons = {
            ...icons,
            ...getFontIconsMap(config.iconsPrefixes, font, fontPath),
        };
    });

    return icons;
}

/**
 * Get object with the map of icons for a certain font.
 *
 * @param prefixes Prefixes to add to the icons.
 * @param fontName Font name.
 * @param fontPath Font path.
 * @returns Icons map.
 */
function getFontIconsMap(prefixes, fontName, fontPath) {
    const icons = {};
    const fontLibraries = readdirSync(fontPath);

    fontLibraries.forEach(libraryName => {
        const libraryPath = `${fontPath}/${libraryName}`;
        if (statSync(libraryPath).isFile()) {
            // Not a font library, ignore.
            return;
        }

        const libraryPrefixes = prefixes?.[fontName]?.[libraryName];
        if (!libraryPrefixes || !libraryPrefixes.length) {
            console.warn(`WARNING: There is no prefix for the library ${fontName}/${libraryName}. Adding icons without prefix is ` +
                'discouraged, please add a prefix for your library in moodle.config.json file, in the iconsPrefixes property.');
        }

        const libraryIcons = readdirSync(libraryPath);
        libraryIcons.forEach(iconFileName => {
            if (!iconFileName.endsWith('.svg')) {
                // Only accept svg files.
                return;
            }

            if (iconFileName.includes('_')) {
                throw Error(`Icon ${libraryPath}/${iconFileName} has an invalid name, it cannot contain '_'. `
                    + 'Please rename it to use \'-\' instead.');
            }

            const iconName = iconFileName.replace('.svg', '');
            const iconPath = `${libraryPath}/${iconFileName}`.replace('src/', '');

            if (!libraryPrefixes || !libraryPrefixes.length) {
                icons[iconName] = iconPath;
                return;
            }

            libraryPrefixes.forEach(prefix => {
                icons[`${prefix}-${iconName}`] = iconPath;
            });
        });
    });

    return icons;
}

/**
 * Task to build a JSON file with the list of icons to add to Ionicons.
 */
class BuildIconsJsonTask {

    /**
     * Run the task.
     *
     * @param done Function to call when done.
     */
    run(done) {
        const icons = getIconsMap();

        writeFile(ICONS_JSON_FILE_PATH, JSON.stringify(icons), done);
    }

}

module.exports = BuildIconsJsonTask;
