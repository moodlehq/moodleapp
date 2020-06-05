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

import { CoreSites } from '@providers/sites';
import { CoreTextUtils } from '@providers/utils/text';
import { CoreUtils } from '@providers/utils/utils';
import { CoreH5P } from '../providers/h5p';
import { CoreH5PFileStorage } from './file-storage';
import { CoreH5PFramework } from './framework';
import { CoreH5PContentValidator } from './content-validator';
import { Md5 } from 'ts-md5/dist/md5';
import { Translate } from '@singletons/core.singletons';

/**
 * Equivalent to H5P's H5PCore class.
 */
export class CoreH5PCore {

    static STYLES = [
        'styles/h5p.css',
        'styles/h5p-confirmation-dialog.css',
        'styles/h5p-core-button.css'
    ];
    static SCRIPTS = [
        'js/jquery.js',
        'js/h5p.js',
        'js/h5p-event-dispatcher.js',
        'js/h5p-x-api-event.js',
        'js/h5p-x-api.js',
        'js/h5p-content-type.js',
        'js/h5p-confirmation-dialog.js',
        'js/h5p-action-bar.js',
        'js/request-queue.js',
    ];
    static ADMIN_SCRIPTS = [
        'js/jquery.js',
        'js/h5p-utils.js',
    ];

    // Disable flags
    static DISABLE_NONE = 0;
    static DISABLE_FRAME = 1;
    static DISABLE_DOWNLOAD = 2;
    static DISABLE_EMBED = 4;
    static DISABLE_COPYRIGHT = 8;
    static DISABLE_ABOUT = 16;

    static DISPLAY_OPTION_FRAME = 'frame';
    static DISPLAY_OPTION_DOWNLOAD = 'export';
    static DISPLAY_OPTION_EMBED = 'embed';
    static DISPLAY_OPTION_COPYRIGHT = 'copyright';
    static DISPLAY_OPTION_ABOUT = 'icon';
    static DISPLAY_OPTION_COPY = 'copy';

    // Map to slugify characters.
    static SLUGIFY_MAP = {
        æ: 'ae', ø: 'oe', ö: 'o', ó: 'o', ô: 'o', Ò: 'oe', Õ: 'o', Ý: 'o', ý: 'y', ÿ: 'y', ā: 'y', ă: 'a', ą: 'a', œ: 'a', å: 'a',
        ä: 'a', á: 'a', à: 'a', â: 'a', ã: 'a', ç: 'c', ć: 'c', ĉ: 'c', ċ: 'c', č: 'c', é: 'e', è: 'e', ê: 'e', ë: 'e', í: 'i',
        ì: 'i', î: 'i', ï: 'i', ú: 'u', ñ: 'n', ü: 'u', ù: 'u', û: 'u', ß: 'es', ď: 'd', đ: 'd', ē: 'e', ĕ: 'e', ė: 'e', ę: 'e',
        ě: 'e', ĝ: 'g', ğ: 'g', ġ: 'g', ģ: 'g', ĥ: 'h', ħ: 'h', ĩ: 'i', ī: 'i', ĭ: 'i', į: 'i', ı: 'i', ĳ: 'ij', ĵ: 'j', ķ: 'k',
        ĺ: 'l', ļ: 'l', ľ: 'l', ŀ: 'l', ł: 'l', ń: 'n', ņ: 'n', ň: 'n', ŉ: 'n', ō: 'o', ŏ: 'o', ő: 'o', ŕ: 'r', ŗ: 'r', ř: 'r',
        ś: 's', ŝ: 's', ş: 's', š: 's', ţ: 't', ť: 't', ŧ: 't', ũ: 'u', ū: 'u', ŭ: 'u', ů: 'u', ű: 'u', ų: 'u', ŵ: 'w', ŷ: 'y',
        ź: 'z', ż: 'z', ž: 'z', ſ: 's', ƒ: 'f', ơ: 'o', ư: 'u', ǎ: 'a', ǐ: 'i', ǒ: 'o', ǔ: 'u', ǖ: 'u', ǘ: 'u', ǚ: 'u', ǜ: 'u',
        ǻ: 'a', ǽ: 'ae', ǿ: 'oe'
    };

    aggregateAssets = true;

    h5pFS: CoreH5PFileStorage;

    constructor(public h5pFramework: CoreH5PFramework) {
        this.h5pFS = new CoreH5PFileStorage();
    }

    /**
     * Determine the correct embed type to use.
     *
     * @param Embed type of the content.
     * @param Embed type of the main library.
     * @return Either 'div' or 'iframe'.
     */
    static determineEmbedType(contentEmbedType: string, libraryEmbedTypes: string): string {
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
     * Filter content run parameters and rebuild content dependency cache.
     *
     * @param content Content data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the filtered params, resolved with null if error.
     */
    async filterParameters(content: CoreH5PContentData, siteId?: string): Promise<string> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        if (content.filtered) {
            return content.filtered;
        }

        if (typeof content.library == 'undefined' || typeof content.params == 'undefined') {
            return null;
        }

        const params = {
            library: CoreH5PCore.libraryToString(content.library),
            params: CoreTextUtils.instance.parseJSON(content.params, false),
        };

        if (!params.params) {
            return null;
        }

        try {
            const validator = new CoreH5PContentValidator(siteId);

            // Validate the main library and its dependencies.
            await validator.validateLibrary(params, {options: [params.library]});

            // Handle addons.
            const addons = await this.h5pFramework.loadAddons(siteId);

            // Validate addons.
            for (const i in addons) {
                const addon = addons[i];
                const addTo = addon.addTo;

                if (addTo && addTo.content && addTo.content.types && addTo.content.types.length) {
                    for (let i = 0; i < addTo.content.types.length; i++) {
                        const type = addTo.content.types[i];

                        if (type && type.text && type.text.regex && this.textAddonMatches(params.params, type.text.regex)) {

                            await validator.addon(addon);

                            // An addon shall only be added once.
                            break;
                        }
                    }
                }
            }

            // Update content dependencies.
            content.dependencies = validator.getDependencies();

            const paramsStr = JSON.stringify(params.params);

            // Sometimes the parameters are filtered before content has been created
            if (content.id) {
                // Update library usage.
                try {
                    await this.h5pFramework.deleteLibraryUsage(content.id, siteId);
                } catch (error) {
                    // Ignore errors.
                }

                await this.h5pFramework.saveLibraryUsage(content.id, content.dependencies, siteId);

                if (!content.slug) {
                    content.slug = this.generateContentSlug(content);
                }

                // Cache.
                await this.h5pFramework.updateContentFields(content.id, {
                    filtered: paramsStr,
                    slug: content.slug,
                }, siteId);
            }

            return paramsStr;
        } catch (error) {
            return null;
        }
    }

    /**
     * Recursive. Goes through the dependency tree for the given library and
     * adds all the dependencies to the given array in a flat format.
     *
     * @param dependencies Object where to save the dependencies.
     * @param library The library to find all dependencies for.
     * @param nextWeight An integer determining the order of the libraries when they are loaded.
     * @param editor Used internally to force all preloaded sub dependencies of an editor dependency to be editor dependencies.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the next weight.
     */
    async findLibraryDependencies(dependencies: {[key: string]: CoreH5PContentDepsTreeDependency},
            library: CoreH5PLibraryData | CoreH5PLibraryAddonData, nextWeight: number = 1, editor: boolean = false,
            siteId?: string): Promise<number> {

        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        const types = ['dynamic', 'preloaded', 'editor'];

        for (const i in types) {

            let type = types[i];
            const property = type + 'Dependencies';

            if (!library[property]) {
                continue; // Skip, no such dependencies.
            }

            if (type === 'preloaded' && editor) {
                // All preloaded dependencies of an editor library is set to editor.
                type = 'editor';
            }

            for (const j in library[property]) {

                const dependency: CoreH5PLibraryBasicData = library[property][j];

                const dependencyKey = type + '-' + dependency.machineName;
                if (dependencies[dependencyKey]) {
                    continue; // Skip, already have this.
                }

                // Get the dependency library data and its subdependencies.
                const dependencyLibrary = await this.loadLibrary(dependency.machineName, dependency.majorVersion,
                        dependency.minorVersion, siteId);

                dependencies[dependencyKey] = {
                    library: dependencyLibrary,
                    type: type
                };

                // Get all its subdependencies.
                const weight = await this.findLibraryDependencies(dependencies, dependencyLibrary, nextWeight, type === 'editor',
                        siteId);

                nextWeight = weight;
                dependencies[dependencyKey].weight = nextWeight++;
            }
        }

        return nextWeight;
    }

    /**
     * Validate and fix display options, updating them if needed.
     *
     * @param displayOptions The display options to validate.
     * @param id Package ID.
     */
    fixDisplayOptions(displayOptions: CoreH5PDisplayOptions, id: number): CoreH5PDisplayOptions {

        // Never allow downloading in the app.
        displayOptions[CoreH5PCore.DISPLAY_OPTION_DOWNLOAD] = false;

        // Embed - force setting it if always on or always off. In web, this is done when storing in DB.
        const embed = this.h5pFramework.getOption(CoreH5PCore.DISPLAY_OPTION_EMBED, CoreH5PDisplayOptionBehaviour.ALWAYS_SHOW);
        if (embed == CoreH5PDisplayOptionBehaviour.ALWAYS_SHOW || embed == CoreH5PDisplayOptionBehaviour.NEVER_SHOW) {
            displayOptions[CoreH5PCore.DISPLAY_OPTION_EMBED] = (embed == CoreH5PDisplayOptionBehaviour.ALWAYS_SHOW);
        }

        if (!this.h5pFramework.getOption(CoreH5PCore.DISPLAY_OPTION_FRAME, true)) {
            displayOptions[CoreH5PCore.DISPLAY_OPTION_FRAME] = false;
        } else {
            displayOptions[CoreH5PCore.DISPLAY_OPTION_EMBED] = this.setDisplayOptionOverrides(
                    CoreH5PCore.DISPLAY_OPTION_EMBED, CoreH5PPermission.EMBED_H5P, id,
                    displayOptions[CoreH5PCore.DISPLAY_OPTION_EMBED]);

            if (this.h5pFramework.getOption(CoreH5PCore.DISPLAY_OPTION_COPYRIGHT, true) == false) {
                displayOptions[CoreH5PCore.DISPLAY_OPTION_COPYRIGHT] = false;
            }
        }

        displayOptions[CoreH5PCore.DISPLAY_OPTION_COPY] = this.h5pFramework.hasPermission(CoreH5PPermission.COPY_H5P, id);

        return displayOptions;
    }

    /**
     * Parses library data from a string on the form {machineName} {majorVersion}.{minorVersion}.
     *
     * @param libraryString On the form {machineName} {majorVersion}.{minorVersion}
     * @return Object with keys machineName, majorVersion and minorVersion. Null if string is not parsable.
     */
    generateContentSlug(content: CoreH5PContentData): string {

        let slug = CoreH5PCore.slugify(content.title);
        let available: boolean = null;

        while (!available) {
            if (available === false) {
                // If not available, add number suffix.
                const matches = slug.match(/(.+-)([0-9]+)$/);
                if (matches) {
                    slug = matches[1] + (Number(matches[2]) + 1);
                } else {
                    slug +=  '-2';
                }
            }

            available = this.h5pFramework.isContentSlugAvailable(slug);
        }

        return slug;
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
                url = CoreTextUtils.instance.concatenatePaths(assetsFolderPath, url);
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
     * Return file paths for all dependencies files.
     *
     * @param dependencies The dependencies to get the files.
     * @param folderName Name of the folder of the content.
     * @param prefix Make paths relative to another dir.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the files.
     */
    async getDependenciesFiles(dependencies: {[machineName: string]: CoreH5PContentDependencyData}, folderName: string,
            prefix: string = '', siteId?: string): Promise<CoreH5PDependenciesFiles> {

        // Build files list for assets.
        const files: CoreH5PDependenciesFiles = {
            scripts: [],
            styles: [],
        };

        // Avoid caching empty files.
        if (!Object.keys(dependencies).length) {
            return files;
        }

        let cachedAssetsHash: string;
        let cachedAssets: {scripts?: CoreH5PDependencyAsset[], styles?: CoreH5PDependencyAsset[]};

        if (this.aggregateAssets) {
            // Get aggregated files for assets.
            cachedAssetsHash = CoreH5PCore.getDependenciesHash(dependencies);

            cachedAssets = await this.h5pFS.getCachedAssets(cachedAssetsHash);

            if (cachedAssets) {
                // Cached assets found, return them.
                return Object.assign(files, cachedAssets);
            }
        }

        // No cached assets, use content dependencies.
        for (const key in dependencies) {
            const dependency = dependencies[key];

            if (!dependency.path) {
                dependency.path = this.h5pFS.getDependencyPath(dependency);
                dependency.preloadedJs = (<string> dependency.preloadedJs).split(',');
                dependency.preloadedCss = (<string> dependency.preloadedCss).split(',');
            }

            dependency.version = '?ver=' + dependency.majorVersion + '.' + dependency.minorVersion + '.' + dependency.patchVersion;

            this.getDependencyAssets(dependency, 'preloadedJs', files.scripts, prefix);
            this.getDependencyAssets(dependency, 'preloadedCss', files.styles, prefix);
        }

        if (this.aggregateAssets) {
            // Aggregate and store assets.
            await this.h5pFS.cacheAssets(files, cachedAssetsHash, folderName, siteId);

            // Keep track of which libraries have been cached in case they are updated.
            await this.h5pFramework.saveCachedAssets(cachedAssetsHash, dependencies, folderName, siteId);
        }

        return files;
    }

    /**
     * Get the hash of a list of dependencies.
     *
     * @param dependencies Dependencies.
     * @return Hash.
     */
    static getDependenciesHash(dependencies: {[machineName: string]: CoreH5PContentDependencyData}): string {
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
     * Get the paths to the content dependencies.
     *
     * @param id The H5P content ID.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with an object containing the path of each content dependency.
     */
    async getDependencyRoots(id: number, siteId?: string): Promise<{[libString: string]: string}> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        const roots = {};

        const dependencies = await this.h5pFramework.loadContentDependencies(id, undefined, siteId);

        for (const machineName in dependencies) {
            const dependency = dependencies[machineName];
            const folderName = CoreH5PCore.libraryToString(dependency, true);

            roots[folderName] = this.h5pFS.getLibraryFolderPath(dependency, siteId, folderName);
        }

        return roots;
    }

    /**
     * Get all dependency assets of the given type.
     *
     * @param dependency The dependency.
     * @param type Type of assets to get.
     * @param assets Array where to store the assets.
     * @param prefix Make paths relative to another dir.
     */
    protected getDependencyAssets(dependency: CoreH5PContentDependencyData, type: string, assets: CoreH5PDependencyAsset[],
            prefix: string = ''): void {

        // Check if dependency has any files of this type
        if (!dependency[type] || dependency[type][0] === '') {
            return;
        }

        // Check if we should skip CSS.
        if (type === 'preloadedCss' && CoreUtils.instance.isTrueOrOne(dependency.dropCss)) {
            return;
        }

        for (const key in dependency[type]) {
            const file = dependency[type][key];

            assets.push({
                path: prefix + '/' + dependency.path + '/' + (typeof file != 'string' ? file.path : file).trim(),
                version: dependency.version
            });
        }
    }

    /**
     * Convert display options to an object.
     *
     * @param disable Display options as a number.
     * @return Display options as object.
     */
    getDisplayOptionsAsObject(disable: number): CoreH5PDisplayOptions {
        const displayOptions: CoreH5PDisplayOptions = {};

        // tslint:disable: no-bitwise
        displayOptions[CoreH5PCore.DISPLAY_OPTION_FRAME] = !(disable & CoreH5PCore.DISABLE_FRAME);
        displayOptions[CoreH5PCore.DISPLAY_OPTION_DOWNLOAD] = !(disable & CoreH5PCore.DISABLE_DOWNLOAD);
        displayOptions[CoreH5PCore.DISPLAY_OPTION_EMBED] = !(disable & CoreH5PCore.DISABLE_EMBED);
        displayOptions[CoreH5PCore.DISPLAY_OPTION_COPYRIGHT] = !(disable & CoreH5PCore.DISABLE_COPYRIGHT);
        displayOptions[CoreH5PCore.DISPLAY_OPTION_ABOUT] = !!this.h5pFramework.getOption(CoreH5PCore.DISPLAY_OPTION_ABOUT, true);

        return displayOptions;
    }

    /**
     * Determine display option visibility when viewing H5P
     *
     * @param disable The display options as a number.
     * @param id Package ID.
     * @return Display options as object.
     */
    getDisplayOptionsForView(disable: number, id: number): CoreH5PDisplayOptions {
        return this.fixDisplayOptions(this.getDisplayOptionsAsObject(disable), id);
    }

    /**
     * Provide localization for the Core JS.
     *
     * @return Object with the translations.
     */
    getLocalization(): {[name: string]: string} {
        return {
            fullscreen: Translate.instance.instant('core.h5p.fullscreen'),
            disableFullscreen: Translate.instance.instant('core.h5p.disablefullscreen'),
            download: Translate.instance.instant('core.h5p.download'),
            copyrights: Translate.instance.instant('core.h5p.copyright'),
            embed: Translate.instance.instant('core.h5p.embed'),
            size: Translate.instance.instant('core.h5p.size'),
            showAdvanced: Translate.instance.instant('core.h5p.showadvanced'),
            hideAdvanced: Translate.instance.instant('core.h5p.hideadvanced'),
            advancedHelp: Translate.instance.instant('core.h5p.resizescript'),
            copyrightInformation: Translate.instance.instant('core.h5p.copyright'),
            close: Translate.instance.instant('core.h5p.close'),
            title: Translate.instance.instant('core.h5p.title'),
            author: Translate.instance.instant('core.h5p.author'),
            year: Translate.instance.instant('core.h5p.year'),
            source: Translate.instance.instant('core.h5p.source'),
            license: Translate.instance.instant('core.h5p.license'),
            thumbnail: Translate.instance.instant('core.h5p.thumbnail'),
            noCopyrights: Translate.instance.instant('core.h5p.nocopyright'),
            reuse: Translate.instance.instant('core.h5p.reuse'),
            reuseContent: Translate.instance.instant('core.h5p.reuseContent'),
            reuseDescription: Translate.instance.instant('core.h5p.reuseDescription'),
            downloadDescription: Translate.instance.instant('core.h5p.downloadtitle'),
            copyrightsDescription: Translate.instance.instant('core.h5p.copyrighttitle'),
            embedDescription: Translate.instance.instant('core.h5p.embedtitle'),
            h5pDescription: Translate.instance.instant('core.h5p.h5ptitle'),
            contentChanged: Translate.instance.instant('core.h5p.contentchanged'),
            startingOver: Translate.instance.instant('core.h5p.startingover'),
            by: Translate.instance.instant('core.h5p.by'),
            showMore: Translate.instance.instant('core.h5p.showmore'),
            showLess: Translate.instance.instant('core.h5p.showless'),
            subLevel: Translate.instance.instant('core.h5p.sublevel'),
            confirmDialogHeader: Translate.instance.instant('core.h5p.confirmdialogheader'),
            confirmDialogBody: Translate.instance.instant('core.h5p.confirmdialogbody'),
            cancelLabel: Translate.instance.instant('core.h5p.cancellabel'),
            confirmLabel: Translate.instance.instant('core.h5p.confirmlabel'),
            licenseU: Translate.instance.instant('core.h5p.undisclosed'),
            licenseCCBY: Translate.instance.instant('core.h5p.ccattribution'),
            licenseCCBYSA: Translate.instance.instant('core.h5p.ccattributionsa'),
            licenseCCBYND: Translate.instance.instant('core.h5p.ccattributionnd'),
            licenseCCBYNC: Translate.instance.instant('core.h5p.ccattributionnc'),
            licenseCCBYNCSA: Translate.instance.instant('core.h5p.ccattributionncsa'),
            licenseCCBYNCND: Translate.instance.instant('core.h5p.ccattributionncnd'),
            licenseCC40: Translate.instance.instant('core.h5p.licenseCC40'),
            licenseCC30: Translate.instance.instant('core.h5p.licenseCC30'),
            licenseCC25: Translate.instance.instant('core.h5p.licenseCC25'),
            licenseCC20: Translate.instance.instant('core.h5p.licenseCC20'),
            licenseCC10: Translate.instance.instant('core.h5p.licenseCC10'),
            licenseGPL: Translate.instance.instant('core.h5p.licenseGPL'),
            licenseV3: Translate.instance.instant('core.h5p.licenseV3'),
            licenseV2: Translate.instance.instant('core.h5p.licenseV2'),
            licenseV1: Translate.instance.instant('core.h5p.licenseV1'),
            licensePD: Translate.instance.instant('core.h5p.pd'),
            licenseCC010: Translate.instance.instant('core.h5p.licenseCC010'),
            licensePDM: Translate.instance.instant('core.h5p.pdm'),
            licenseC: Translate.instance.instant('core.h5p.copyrightstring'),
            contentType: Translate.instance.instant('core.h5p.contenttype'),
            licenseExtras: Translate.instance.instant('core.h5p.licenseextras'),
            changes: Translate.instance.instant('core.h5p.changelog'),
            contentCopied: Translate.instance.instant('core.h5p.contentCopied'),
            connectionLost: Translate.instance.instant('core.h5p.connectionLost'),
            connectionReestablished: Translate.instance.instant('core.h5p.connectionReestablished'),
            resubmitScores: Translate.instance.instant('core.h5p.resubmitScores'),
            offlineDialogHeader: Translate.instance.instant('core.h5p.offlineDialogHeader'),
            offlineDialogBody: Translate.instance.instant('core.h5p.offlineDialogBody'),
            offlineDialogRetryMessage: Translate.instance.instant('core.h5p.offlineDialogRetryMessage'),
            offlineDialogRetryButtonLabel: Translate.instance.instant('core.h5p.offlineDialogRetryButtonLabel'),
            offlineSuccessfulSubmit: Translate.instance.instant('core.h5p.offlineSuccessfulSubmit'),
        };
    }

    /**
     * Get core JavaScript files.
     *
     * @return array The array containg urls of the core JavaScript files:
     */
    static getScripts(): string[] {
        const libUrl = CoreH5P.instance.h5pCore.h5pFS.getCoreH5PPath();
        const urls = [];

        CoreH5PCore.SCRIPTS.forEach((script) => {
            urls.push(libUrl + script);
        });

        urls.push(CoreTextUtils.instance.concatenatePaths(libUrl, 'moodle/js/h5p_overrides.js'));

        return urls;
    }

    /**
     * Parses library data from a string on the form {machineName} {majorVersion}.{minorVersion}.
     *
     * @param libraryString On the form {machineName} {majorVersion}.{minorVersion}
     * @return Object with keys machineName, majorVersion and minorVersion. Null if string is not parsable.
     */
    static libraryFromString(libraryString: string): {machineName: string, majorVersion: number, minorVersion: number} {

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
     * Writes library data as string on the form {machineName} {majorVersion}.{minorVersion}.
     *
     * @param libraryData Library data.
     * @param folderName Use hyphen instead of space in returned string.
     * @return String on the form {machineName} {majorVersion}.{minorVersion}.
     */
    static libraryToString(libraryData: any, folderName?: boolean): string {
        return (libraryData.machineName ? libraryData.machineName : libraryData.name) + (folderName ? '-' : ' ') +
                libraryData.majorVersion + '.' + libraryData.minorVersion;
    }

    /**
     * Load content data from DB.
     *
     * @param id Content ID.
     * @param fileUrl H5P file URL. Required if id is not provided.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the content data.
     */
    async loadContent(id?: number, fileUrl?: string, siteId?: string): Promise<CoreH5PContentData> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        const content = await this.h5pFramework.loadContent(id, fileUrl, siteId);

        // Validate metadata.
        const validator = new CoreH5PContentValidator(siteId);

        content.metadata = await validator.validateMetadata(content.metadata);

        return {
            id: content.id,
            params: content.params,
            embedType: content.embedType,
            disable: content.disable,
            folderName: content.folderName,
            title: content.title,
            slug: content.slug,
            filtered: content.filtered,
            libraryMajorVersion: content.libraryMajorVersion,
            libraryMinorVersion: content.libraryMinorVersion,
            metadata: content.metadata,
            library: {
                id: content.libraryId,
                name: content.libraryName,
                majorVersion: content.libraryMajorVersion,
                minorVersion: content.libraryMinorVersion,
                embedTypes: content.libraryEmbedTypes,
                fullscreen: content.libraryFullscreen,
            },
        };
    }

    /**
     * Load dependencies for the given content of the given type.
     *
     * @param id Content ID.
     * @param type The dependency type.
     * @return Content dependencies, indexed by machine name.
     */
    loadContentDependencies(id: number, type?: string, siteId?: string)
            : Promise<{[machineName: string]: CoreH5PContentDependencyData}> {

        return this.h5pFramework.loadContentDependencies(id, type, siteId);
    }

    /**
     * Loads a library and its dependencies.
     *
     * @param machineName The library's machine name.
     * @param majorVersion The library's major version.
     * @param minorVersion The library's minor version.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved with the library data.
     */
    loadLibrary(machineName: string, majorVersion: number, minorVersion: number, siteId?: string): Promise<CoreH5PLibraryData> {
        return this.h5pFramework.loadLibrary(machineName, majorVersion, minorVersion, siteId);
    }

    /**
     * Check if the current user has permission to update and install new libraries.
     *
     * @return Whether has permissions.
     */
    mayUpdateLibraries(): boolean {
        // In the app the installation only affects current user, so the user always has permissions.
        return true;
    }

    /**
     * Save content data in DB and clear cache.
     *
     * @param content Content to save.
     * @param folderName The name of the folder that contains the H5P.
     * @param fileUrl The online URL of the package.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with content ID.
     */
    async saveContent(content: any, folderName: string, fileUrl: string, siteId?: string): Promise<number> {

        content.id = await this.h5pFramework.updateContent(content, folderName, fileUrl, siteId);

        // Some user data for content has to be reset when the content changes.
        await this.h5pFramework.resetContentUserData(content.id, siteId);

        return content.id;
    }

    /**
     * Helper function used to figure out embed and download behaviour.
     *
     * @param optionName The option name.
     * @param permission The permission.
     * @param id The package ID.
     * @param value Default value.
     * @return The value to use.
     */
    setDisplayOptionOverrides(optionName: string, permission: number, id: number, value: boolean): boolean {
        const behaviour = this.h5pFramework.getOption(optionName, CoreH5PDisplayOptionBehaviour.ALWAYS_SHOW);

        // If never show globally, force hide
        if (behaviour == CoreH5PDisplayOptionBehaviour.NEVER_SHOW) {
            value = false;
        } else if (behaviour == CoreH5PDisplayOptionBehaviour.ALWAYS_SHOW) {
            // If always show or permissions say so, force show
            value = true;
        } else if (behaviour == CoreH5PDisplayOptionBehaviour.CONTROLLED_BY_PERMISSIONS) {
            value = this.h5pFramework.hasPermission(permission, id);
        }

        return value;
    }

    /**
     * Convert strings of text into simple kebab case slugs. Based on H5PCore::slugify.
     *
     * @param input The string to slugify.
     * @return Slugified text.
     */
    static slugify(input: string): string {
        input = input || '';

        input = input.toLowerCase();

        // Replace common chars.
        let newInput = '';
        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            newInput += CoreH5PCore.SLUGIFY_MAP[char] || char;
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
    protected textAddonMatches(params: any, pattern: string): boolean {

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

/**
 * Display options behaviour constants.
 */
export class CoreH5PDisplayOptionBehaviour {
    static NEVER_SHOW = 0;
    static CONTROLLED_BY_AUTHOR_DEFAULT_ON = 1;
    static CONTROLLED_BY_AUTHOR_DEFAULT_OFF = 2;
    static ALWAYS_SHOW = 3;
    static CONTROLLED_BY_PERMISSIONS = 4;
}

/**
 * Permission constants.
 */
export class CoreH5PPermission {
    static DOWNLOAD_H5P = 0;
    static EMBED_H5P = 1;
    static CREATE_RESTRICTED = 2;
    static UPDATE_LIBRARIES = 3;
    static INSTALL_RECOMMENDED = 4;
    static COPY_H5P = 4;
}

/**
 * Display options as object.
 */
export type CoreH5PDisplayOptions = {
    frame?: boolean;
    export?: boolean;
    embed?: boolean;
    copyright?: boolean;
    icon?: boolean;
    copy?: boolean;
};

/**
 * Dependency asset.
 */
export type CoreH5PDependencyAsset = {
    path: string; // Path to the asset.
    version: string; // Dependency version.
};

/**
 * Dependencies files.
 */
export type CoreH5PDependenciesFiles = {
    scripts: CoreH5PDependencyAsset[]; // JS scripts.
    styles: CoreH5PDependencyAsset[]; // CSS files.
};

/**
 * Content data, including main library data.
 */
export type CoreH5PContentData = {
    id: number; // The id of the content.
    params: string; // The content in json format.
    embedType: string; // Embed type to use.
    disable: number; // H5P Button display options.
    folderName: string; // Name of the folder that contains the contents.
    title: string; // Main library's title.
    slug: string; // Lib title and ID slugified.
    filtered: string; // Filtered version of json_content.
    libraryMajorVersion: number; // Main library's major version.
    libraryMinorVersion: number; // Main library's minor version.
    metadata: any; // Content metadata.
    library: { // Main library data.
        id: number; // The id of the library.
        name: string; // The library machine name.
        majorVersion: number; // Major version.
        minorVersion: number; // Minor version.
        embedTypes: string; // List of supported embed types.
        fullscreen: number; // Display fullscreen button.
    };
    dependencies?: {[key: string]: CoreH5PContentDepsTreeDependency}; // Dependencies. Calculated in filterParameters.
};

/**
 * Content dependency data.
 */
export type CoreH5PContentDependencyData = {
    libraryId: number; // The id of the library if it is an existing library.
    machineName: string; // The library machineName.
    majorVersion: number; // The The library's majorVersion.
    minorVersion: number; // The The library's minorVersion.
    patchVersion: number; // The The library's patchVersion.
    preloadedJs?: string | string[]; // Comma separated string with js file paths. If already parsed, list of paths.
    preloadedCss?: string | string[]; // Comma separated string with css file paths. If already parsed, list of paths.
    dropCss?: string; // CSV of machine names.
    dependencyType: string; // The dependency type.
    path?: string; // Path to the dependency. Calculated in getDependenciesFiles.
    version?: string; // Version of the dependency. Calculated in getDependenciesFiles.
};

/**
 * Data for each content dependency in the dependency tree.
 */
export type CoreH5PContentDepsTreeDependency = {
    library: CoreH5PLibraryData | CoreH5PLibraryAddonData; // Library data.
    type: string; // Dependency type.
    weight?: number; // An integer determining the order of the libraries when they are loaded.
};

/**
 * Library data.
 */
export type CoreH5PLibraryData = {
    libraryId: number; // The id of the library.
    title: string; // The human readable name of this library.
    machineName: string; // The library machine name.
    majorVersion: number; // Major version.
    minorVersion: number; // Minor version.
    patchVersion: number; // Patch version.
    runnable: number; // Can this library be started by the module? I.e. not a dependency.
    fullscreen: number; // Display fullscreen button.
    embedTypes: string; // List of supported embed types.
    preloadedJs?: string; // Comma separated list of scripts to load.
    preloadedCss?: string; // Comma separated list of stylesheets to load.
    dropLibraryCss?: string; // List of libraries that should not have CSS included if this library is used. Comma separated list.
    semantics?: any; // The semantics definition. If it's a string, it's in json format.
    preloadedDependencies: CoreH5PLibraryBasicData[]; // Dependencies.
    dynamicDependencies: CoreH5PLibraryBasicData[]; // Dependencies.
    editorDependencies: CoreH5PLibraryBasicData[]; // Dependencies.
};

/**
 * Library basic data.
 */
export type CoreH5PLibraryBasicData = {
    machineName: string; // The library machine name.
    majorVersion: number; // Major version.
    minorVersion: number; // Minor version.
};

/**
 * "Addon" data (library).
 */
export type CoreH5PLibraryAddonData = {
    libraryId: number; // The id of the library.
    machineName: string; // The library machine name.
    majorVersion: number; // Major version.
    minorVersion: number; // Minor version.
    patchVersion: number; // Patch version.
    preloadedJs?: string; // Comma separated list of scripts to load.
    preloadedCss?: string; // Comma separated list of stylesheets to load.
    addTo?: any; // Plugin configuration data.
};
