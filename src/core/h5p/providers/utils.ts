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

import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreH5PContentDependencyData, CoreH5PDependencyAsset } from './h5p';
import { Md5 } from 'ts-md5/dist/md5';

/**
 * Utils service with helper functions for H5P.
 */
@Injectable()
export class CoreH5PUtilsProvider {

    // Map to slugify characters.
    protected SLUGIFY_MAP = {
        æ: 'ae',
        ø: 'oe',
        ö: 'o',
        ó: 'o',
        ô: 'o',
        Ò: 'oe',
        Õ: 'o',
        Ý: 'o',
        ý: 'y',
        ÿ: 'y',
        ā: 'y',
        ă: 'a',
        ą: 'a',
        œ: 'a',
        å: 'a',
        ä: 'a',
        á: 'a',
        à: 'a',
        â: 'a',
        ã: 'a',
        ç: 'c',
        ć: 'c',
        ĉ: 'c',
        ċ: 'c',
        č: 'c',
        é: 'e',
        è: 'e',
        ê: 'e',
        ë: 'e',
        í: 'i',
        ì: 'i',
        î: 'i',
        ï: 'i',
        ú: 'u',
        ñ: 'n',
        ü: 'u',
        ù: 'u',
        û: 'u',
        ß: 'es',
        ď: 'd',
        đ: 'd',
        ē: 'e',
        ĕ: 'e',
        ė: 'e',
        ę: 'e',
        ě: 'e',
        ĝ: 'g',
        ğ: 'g',
        ġ: 'g',
        ģ: 'g',
        ĥ: 'h',
        ħ: 'h',
        ĩ: 'i',
        ī: 'i',
        ĭ: 'i',
        į: 'i',
        ı: 'i',
        ĳ: 'ij',
        ĵ: 'j',
        ķ: 'k',
        ĺ: 'l',
        ļ: 'l',
        ľ: 'l',
        ŀ: 'l',
        ł: 'l',
        ń: 'n',
        ņ: 'n',
        ň: 'n',
        ŉ: 'n',
        ō: 'o',
        ŏ: 'o',
        ő: 'o',
        ŕ: 'r',
        ŗ: 'r',
        ř: 'r',
        ś: 's',
        ŝ: 's',
        ş: 's',
        š: 's',
        ţ: 't',
        ť: 't',
        ŧ: 't',
        ũ: 'u',
        ū: 'u',
        ŭ: 'u',
        ů: 'u',
        ű: 'u',
        ų: 'u',
        ŵ: 'w',
        ŷ: 'y',
        ź: 'z',
        ż: 'z',
        ž: 'z',
        ſ: 's',
        ƒ: 'f',
        ơ: 'o',
        ư: 'u',
        ǎ: 'a',
        ǐ: 'i',
        ǒ: 'o',
        ǔ: 'u',
        ǖ: 'u',
        ǘ: 'u',
        ǚ: 'u',
        ǜ: 'u',
        ǻ: 'a',
        ǽ: 'ae',
        ǿ: 'oe'
    };

    constructor(private translate: TranslateService,
            private textUtils: CoreTextUtilsProvider) { }

    /**
     * The metadataSettings field in libraryJson uses 1 for true and 0 for false.
     * Here we are converting these to booleans, and also doing JSON encoding.
     *
     * @param metadataSettings Settings.
     * @return Stringified settings.
     */
    boolifyAndEncodeMetadataSettings(metadataSettings: any): string {
        // Convert metadataSettings values to boolean.
        if (typeof metadataSettings.disable != 'undefined') {
            metadataSettings.disable = metadataSettings.disable === 1;
        }
        if (typeof metadataSettings.disableExtraTitleField != 'undefined') {
            metadataSettings.disableExtraTitleField = metadataSettings.disableExtraTitleField === 1;
        }

        return JSON.stringify(metadataSettings);
    }

    /**
     * Determine the correct embed type to use.
     *
     * @param Embed type of the content.
     * @param Embed type of the main library.
     * @return Either 'div' or 'iframe'.
     */
    determineEmbedType(contentEmbedType: string, libraryEmbedTypes: string): string {
        // Detect content embed type.
        let embedType = contentEmbedType.toLowerCase().indexOf('div') != -1 ? 'div' : 'iframe';

        if (libraryEmbedTypes) {
            // Check that embed type is available for library
            const embedTypes = libraryEmbedTypes.toLowerCase();

            if (embedTypes.indexOf(embedType) == -1) {
                // Not available, pick default.
                embedType = embedTypes.indexOf('div') != -1 ? 'div' : 'iframe';
            }
        }

        return embedType;
    }

    /**
     * Combines path with version.
     *
     * @param assets List of assets to get their URLs.
     * @param assetsFolderPath The path of the folder where the assets are.
     * @return List of urls.
     */
    getAssetsUrls(assets: CoreH5PDependencyAsset[], assetsFolderPath: string = ''): string[] {
        const urls = [];

        assets.forEach((asset) => {
            let url = asset.path;

            // Add URL prefix if not external.
            if (asset.path.indexOf('://') == -1 && assetsFolderPath) {
                url = this.textUtils.concatenatePaths(assetsFolderPath, url);
            }

            // Add version if set.
            if (asset.version) {
                url += asset.version;
            }

            urls.push(url);
        });

        return urls;
    }

    /**
     * Get the hash of a list of dependencies.
     *
     * @param dependencies Dependencies.
     * @return Hash.
     */
    getDependenciesHash(dependencies: {[machineName: string]: CoreH5PContentDependencyData}): string {
        // Build hash of dependencies.
        const toHash = [];

        // Use unique identifier for each library version.
        for (const name in dependencies) {
            const dep = dependencies[name];
            toHash.push(dep.machineName + '-' + dep.majorVersion + '.' + dep.minorVersion + '.' + dep.patchVersion);
        }

        // Sort in case the same dependencies comes in a different order.
        toHash.sort((a, b) => {
            return a.localeCompare(b);
        });

        // Calculate hash.
        return <string> Md5.hashAsciiStr(toHash.join(''));
    }

    /**
     * Provide localization for the Core JS.
     *
     * @return Object with the translations.
     */
    getLocalization(): any {
        return {
            fullscreen: this.translate.instant('core.h5p.fullscreen'),
            disableFullscreen: this.translate.instant('core.h5p.disablefullscreen'),
            download: this.translate.instant('core.h5p.download'),
            copyrights: this.translate.instant('core.h5p.copyright'),
            embed: this.translate.instant('core.h5p.embed'),
            size: this.translate.instant('core.h5p.size'),
            showAdvanced: this.translate.instant('core.h5p.showadvanced'),
            hideAdvanced: this.translate.instant('core.h5p.hideadvanced'),
            advancedHelp: this.translate.instant('core.h5p.resizescript'),
            copyrightInformation: this.translate.instant('core.h5p.copyright'),
            close: this.translate.instant('core.h5p.close'),
            title: this.translate.instant('core.h5p.title'),
            author: this.translate.instant('core.h5p.author'),
            year: this.translate.instant('core.h5p.year'),
            source: this.translate.instant('core.h5p.source'),
            license: this.translate.instant('core.h5p.license'),
            thumbnail: this.translate.instant('core.h5p.thumbnail'),
            noCopyrights: this.translate.instant('core.h5p.nocopyright'),
            reuse: this.translate.instant('core.h5p.reuse'),
            reuseContent: this.translate.instant('core.h5p.reuseContent'),
            reuseDescription: this.translate.instant('core.h5p.reuseDescription'),
            downloadDescription: this.translate.instant('core.h5p.downloadtitle'),
            copyrightsDescription: this.translate.instant('core.h5p.copyrighttitle'),
            embedDescription: this.translate.instant('core.h5p.embedtitle'),
            h5pDescription: this.translate.instant('core.h5p.h5ptitle'),
            contentChanged: this.translate.instant('core.h5p.contentchanged'),
            startingOver: this.translate.instant('core.h5p.startingover'),
            by: this.translate.instant('core.h5p.by'),
            showMore: this.translate.instant('core.h5p.showmore'),
            showLess: this.translate.instant('core.h5p.showless'),
            subLevel: this.translate.instant('core.h5p.sublevel'),
            confirmDialogHeader: this.translate.instant('core.h5p.confirmdialogheader'),
            confirmDialogBody: this.translate.instant('core.h5p.confirmdialogbody'),
            cancelLabel: this.translate.instant('core.h5p.cancellabel'),
            confirmLabel: this.translate.instant('core.h5p.confirmlabel'),
            licenseU: this.translate.instant('core.h5p.undisclosed'),
            licenseCCBY: this.translate.instant('core.h5p.ccattribution'),
            licenseCCBYSA: this.translate.instant('core.h5p.ccattributionsa'),
            licenseCCBYND: this.translate.instant('core.h5p.ccattributionnd'),
            licenseCCBYNC: this.translate.instant('core.h5p.ccattributionnc'),
            licenseCCBYNCSA: this.translate.instant('core.h5p.ccattributionncsa'),
            licenseCCBYNCND: this.translate.instant('core.h5p.ccattributionncnd'),
            licenseCC40: this.translate.instant('core.h5p.licenseCC40'),
            licenseCC30: this.translate.instant('core.h5p.licenseCC30'),
            licenseCC25: this.translate.instant('core.h5p.licenseCC25'),
            licenseCC20: this.translate.instant('core.h5p.licenseCC20'),
            licenseCC10: this.translate.instant('core.h5p.licenseCC10'),
            licenseGPL: this.translate.instant('core.h5p.licenseGPL'),
            licenseV3: this.translate.instant('core.h5p.licenseV3'),
            licenseV2: this.translate.instant('core.h5p.licenseV2'),
            licenseV1: this.translate.instant('core.h5p.licenseV1'),
            licensePD: this.translate.instant('core.h5p.pd'),
            licenseCC010: this.translate.instant('core.h5p.licenseCC010'),
            licensePDM: this.translate.instant('core.h5p.pdm'),
            licenseC: this.translate.instant('core.h5p.copyrightstring'),
            contentType: this.translate.instant('core.h5p.contenttype'),
            licenseExtras: this.translate.instant('core.h5p.licenseextras'),
            changes: this.translate.instant('core.h5p.changelog'),
            contentCopied: this.translate.instant('core.h5p.contentCopied'),
            connectionLost: this.translate.instant('core.h5p.connectionLost'),
            connectionReestablished: this.translate.instant('core.h5p.connectionReestablished'),
            resubmitScores: this.translate.instant('core.h5p.resubmitScores'),
            offlineDialogHeader: this.translate.instant('core.h5p.offlineDialogHeader'),
            offlineDialogBody: this.translate.instant('core.h5p.offlineDialogBody'),
            offlineDialogRetryMessage: this.translate.instant('core.h5p.offlineDialogRetryMessage'),
            offlineDialogRetryButtonLabel: this.translate.instant('core.h5p.offlineDialogRetryButtonLabel'),
            offlineSuccessfulSubmit: this.translate.instant('core.h5p.offlineSuccessfulSubmit'),
        };
    }

    /**
     * Parses library data from a string on the form {machineName} {majorVersion}.{minorVersion}.
     *
     * @param libraryString On the form {machineName} {majorVersion}.{minorVersion}
     * @return Object with keys machineName, majorVersion and minorVersion. Null if string is not parsable.
     */
    libraryFromString(libraryString: string): {machineName: string, majorVersion: number, minorVersion: number} {

        const matches = libraryString.match(/^([\w0-9\-\.]{1,255})[\-\ ]([0-9]{1,5})\.([0-9]{1,5})$/i);

        if (matches && matches.length >= 4) {
            return {
                machineName: matches[1],
                majorVersion: Number(matches[2]),
                minorVersion: Number(matches[3])
            };
        }

        return null;
    }

    /**
     * Convert list of library parameter values to csv.
     *
     * @param libraryData Library data as found in library.json files.
     * @param key Key that should be found in libraryData.
     * @param searchParam The library parameter (Default: 'path').
     * @return Library parameter values separated by ', '
     */
    libraryParameterValuesToCsv(libraryData: any, key: string, searchParam: string = 'path'): string {
        if (typeof libraryData[key] != 'undefined') {
            const parameterValues = [];

            libraryData[key].forEach((file) => {
                for (const index in file) {
                    if (index === searchParam) {
                        parameterValues.push(file[index]);
                    }
                }
            });

            return parameterValues.join(',');
        }

        return '';
    }

    /**
     * Convert strings of text into simple kebab case slugs. Based on H5PCore::slugify.
     *
     * @param input The string to slugify.
     * @return Slugified text.
     */
    slugify(input: string): string {
        input = input || '';

        input = input.toLowerCase();

        // Replace common chars.
        let newInput = '';
        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            newInput += this.SLUGIFY_MAP[char] || char;
        }

        // Replace everything else.
        newInput = newInput.replace(/[^a-z0-9]/g, '-');

        // Prevent double hyphen
        newInput = newInput.replace(/-{2,}/g, '-');

        // Prevent hyphen in beginning or end.
        newInput = newInput.replace(/(^-+|-+$)/g, '');

        // Prevent too long slug.
        if (newInput.length > 91) {
            newInput = newInput.substr(0, 92);
        }

        // Prevent empty slug
        if (newInput === '') {
            newInput = 'interactive';
        }

        return newInput;
    }

    /**
     * Determine if params contain any match.
     *
     * @param params Parameters.
     * @param pattern Regular expression to identify pattern.
     * @return True if params matches pattern.
     */
    textAddonMatches(params: any, pattern: string): boolean {

        if (typeof params == 'string') {
            if (params.match(pattern)) {
                return true;
            }
        } else if (typeof params == 'object') {
            for (const key in params) {
                const value = params[key];

                if (this.textAddonMatches(value, pattern)) {
                    return true;
                }
            }
        }

        return false;
    }
}
