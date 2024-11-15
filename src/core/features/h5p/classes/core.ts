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

import { Md5 } from 'ts-md5/dist/md5';

import { CoreSites } from '@services/sites';
import { CoreText } from '@singletons/text';
import { CoreUtils } from '@services/utils/utils';
import { CoreH5P } from '@features/h5p/services/h5p';
import { CoreH5PFileStorage } from './file-storage';
import { CoreH5PFramework } from './framework';
import { CoreH5PContentValidator, CoreH5PSemantics } from './content-validator';
import { Translate } from '@singletons';
import { CoreH5PContentBeingSaved } from './storage';
import { CoreH5PLibraryAddTo } from './validator';
import { CorePath } from '@singletons/path';

/**
 * Equivalent to H5P's H5PCore class.
 */
export class CoreH5PCore {

    static readonly API_VERSION = {
        majorVersion: 1,
        minorVersion: 27,
    };

    static readonly STYLES = [
        'styles/h5p.css',
        'styles/h5p-confirmation-dialog.css',
        'styles/h5p-core-button.css',
        'styles/h5p-tooltip.css',
        'styles/h5p-table.css',
    ];

    static readonly SCRIPTS = [
        'js/jquery.js',
        'js/h5p.js',
        'js/h5p-event-dispatcher.js',
        'js/h5p-x-api-event.js',
        'js/h5p-x-api.js',
        'js/h5p-content-type.js',
        'js/h5p-confirmation-dialog.js',
        'js/h5p-action-bar.js',
        'js/request-queue.js',
        'js/h5p-tooltip.js',
    ];

    static readonly ADMIN_SCRIPTS = [
        'js/jquery.js',
        'js/h5p-utils.js',
    ];

    // Disable flags
    static readonly DISABLE_NONE = 0;
    static readonly DISABLE_FRAME = 1;
    static readonly DISABLE_DOWNLOAD = 2;
    static readonly DISABLE_EMBED = 4;
    static readonly DISABLE_COPYRIGHT = 8;
    static readonly DISABLE_ABOUT = 16;

    static readonly DISPLAY_OPTION_FRAME = 'frame';
    static readonly DISPLAY_OPTION_DOWNLOAD = 'export';
    static readonly DISPLAY_OPTION_EMBED = 'embed';
    static readonly DISPLAY_OPTION_COPYRIGHT = 'copyright';
    static readonly DISPLAY_OPTION_ABOUT = 'icon';
    static readonly DISPLAY_OPTION_COPY = 'copy';

    // Map to slugify characters.
    static readonly SLUGIFY_MAP = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        æ: 'ae', ø: 'oe', ö: 'o', ó: 'o', ô: 'o', Ò: 'oe', Õ: 'o', Ý: 'o', ý: 'y', ÿ: 'y', ā: 'y', ă: 'a', ą: 'a', œ: 'a', å: 'a',
        ä: 'a', á: 'a', à: 'a', â: 'a', ã: 'a', ç: 'c', ć: 'c', ĉ: 'c', ċ: 'c', č: 'c', é: 'e', è: 'e', ê: 'e', ë: 'e', í: 'i',
        ì: 'i', î: 'i', ï: 'i', ú: 'u', ñ: 'n', ü: 'u', ù: 'u', û: 'u', ß: 'es', ď: 'd', đ: 'd', ē: 'e', ĕ: 'e', ė: 'e', ę: 'e',
        ě: 'e', ĝ: 'g', ğ: 'g', ġ: 'g', ģ: 'g', ĥ: 'h', ħ: 'h', ĩ: 'i', ī: 'i', ĭ: 'i', į: 'i', ı: 'i', ĳ: 'ij', ĵ: 'j', ķ: 'k',
        ĺ: 'l', ļ: 'l', ľ: 'l', ŀ: 'l', ł: 'l', ń: 'n', ņ: 'n', ň: 'n', ŉ: 'n', ō: 'o', ŏ: 'o', ő: 'o', ŕ: 'r', ŗ: 'r', ř: 'r',
        ś: 's', ŝ: 's', ş: 's', š: 's', ţ: 't', ť: 't', ŧ: 't', ũ: 'u', ū: 'u', ŭ: 'u', ů: 'u', ű: 'u', ų: 'u', ŵ: 'w', ŷ: 'y',
        ź: 'z', ż: 'z', ž: 'z', ſ: 's', ƒ: 'f', ơ: 'o', ư: 'u', ǎ: 'a', ǐ: 'i', ǒ: 'o', ǔ: 'u', ǖ: 'u', ǘ: 'u', ǚ: 'u', ǜ: 'u',
        ǻ: 'a', ǽ: 'ae', ǿ: 'oe',
    };

    aggregateAssets = true;
    h5pFS: CoreH5PFileStorage;

    constructor(public h5pFramework: CoreH5PFramework) {
        this.h5pFS = new CoreH5PFileStorage();
    }

    /**
     * Determine the correct embed type to use.
     *
     * @param contentEmbedType Type of the content.
     * @param libraryEmbedTypes Type of the main library.
     * @returns Either 'div' or 'iframe'.
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
     * Get the hash of a list of dependencies.
     *
     * @param dependencies Dependencies.
     * @returns Hash.
     */
    static getDependenciesHash(dependencies: {[machineName: string]: CoreH5PContentDependencyData}): string {
        // Build hash of dependencies.
        const toHash: string[] = [];

        // Use unique identifier for each library version.
        for (const name in dependencies) {
            const dep = dependencies[name];
            toHash.push(dep.machineName + '-' + dep.majorVersion + '.' + dep.minorVersion + '.' + dep.patchVersion);
        }

        // Sort in case the same dependencies comes in a different order.
        toHash.sort((a, b) => a.localeCompare(b));

        // Calculate hash.
        return Md5.hashAsciiStr(toHash.join(''));
    }

    /**
     * Get core JavaScript files.
     *
     * @returns array The array containg urls of the core JavaScript files:
     */
    static getScripts(): string[] {
        const libUrl = CoreH5P.h5pCore.h5pFS.getCoreH5PPath();
        const urls: string[] = [];

        CoreH5PCore.SCRIPTS.forEach((script) => {
            urls.push(libUrl + script);
        });

        urls.push(CorePath.concatenatePaths(libUrl, 'moodle/js/h5p_overrides.js'));

        return urls;
    }

    /**
     * Parses library data from a string on the form {machineName} {majorVersion}.{minorVersion}.
     *
     * @param libraryString On the form {machineName} {majorVersion}.{minorVersion}
     * @returns Object with keys machineName, majorVersion and minorVersion. Null if string is not parsable.
     */
    static libraryFromString(libraryString: string): CoreH5PLibraryBasicData | null {

        const matches = libraryString.match(/^([\w0-9\-.]{1,255})[- ]([0-9]{1,5})\.([0-9]{1,5})$/i);

        if (matches && matches.length >= 4) {
            return {
                machineName: matches[1],
                majorVersion: Number(matches[2]),
                minorVersion: Number(matches[3]),
            };
        }

        return null;
    }

    /**
     * Writes library data as string on the form {machineName} {majorVersion}.{minorVersion}.
     *
     * @param library Library data.
     * @returns String on the form {machineName} {majorVersion}.{minorVersion}.
     */
    static libraryToString(library: CoreH5PLibraryBasicData | CoreH5PContentMainLibraryData): string {
        const name = 'machineName' in library ? library.machineName : library.name;

        return `${name} ${library.majorVersion}.${library.minorVersion}`;
    }

    /**
     * Get the name of a library's folder name
     *
     * @param library Library data.
     * @returns Folder name.
     */
    static libraryToFolderName(library: CoreH5PLibraryBasicData | CoreH5PContentMainLibraryData): string {
        const name = 'machineName' in library ? library.machineName : library.name;

        // In LMS, a property named patchVersionInFolderName is checked here. This property is only used to retrieve some icons when
        // using the editor, and it isn't stored in DB. The check wasn't included here because the app will never have that prop.

        return `${name}-${library.majorVersion}.${library.minorVersion}`;
    }

    /**
     * Convert strings of text into simple kebab case slugs. Based on H5PCore::slugify.
     *
     * @param input The string to slugify.
     * @returns Slugified text.
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
            newInput = newInput.substring(0, 92);
        }

        // Prevent empty slug
        if (newInput === '') {
            newInput = 'interactive';
        }

        return newInput;
    }

    /**
     * Filter content run parameters and rebuild content dependency cache.
     *
     * @param content Content data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the filtered params, resolved with null if error.
     */
    async filterParameters(content: CoreH5PContentData, siteId?: string): Promise<string | null> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (content.filtered) {
            return content.filtered;
        }

        if (content.library === undefined || content.params === undefined) {
            return null;
        }

        const params = {
            library: CoreH5PCore.libraryToString(content.library),
            params: CoreText.parseJSON(content.params, false),
        };

        if (!params.params) {
            return null;
        }

        try {
            const validator = new CoreH5PContentValidator(siteId);

            // Validate the main library and its dependencies.
            await validator.validateLibrary(params, { options: [params.library] });

            // Handle addons.
            const addons = await this.h5pFramework.loadAddons(siteId);

            // Validate addons.
            for (const i in addons) {
                const addon = addons[i];

                if (addon.addTo?.content?.types?.length) {
                    for (let i = 0; i < addon.addTo.content.types.length; i++) {
                        const type = addon.addTo.content.types[i];
                        let regex = type?.text?.regex;
                        if (regex && regex[0] === '/' && regex.slice(-1) === '/') {
                            // Regex designed for PHP. Remove the starting and ending slashes to convert them to JS format.
                            regex = regex.substring(1, regex.length - 1);
                        }

                        if (regex && this.textAddonMatches(params.params, regex)) {
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
                } catch {
                    // Ignore errors.
                }

                await this.h5pFramework.saveLibraryUsage(content.id, content.dependencies, siteId);

                if (!content.slug) {
                    content.slug = this.generateContentSlug(content);
                }

                // Cache.
                await this.h5pFramework.updateContentFields(content.id, {
                    filtered: paramsStr,
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
     * @returns Promise resolved with the next weight.
     */
    async findLibraryDependencies(
        dependencies: {[key: string]: CoreH5PContentDepsTreeDependency},
        library: CoreH5PLibraryData | CoreH5PLibraryAddonData,
        nextWeight: number = 1,
        editor: boolean = false,
        siteId?: string,
    ): Promise<number> {

        siteId = siteId || CoreSites.getCurrentSiteId();

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
                const dependencyLibrary = await this.loadLibrary(
                    dependency.machineName,
                    dependency.majorVersion,
                    dependency.minorVersion,
                    siteId,
                );

                dependencies[dependencyKey] = {
                    library: dependencyLibrary,
                    type: type,
                };

                // Get all its subdependencies.
                const weight = await this.findLibraryDependencies(
                    dependencies,
                    dependencyLibrary,
                    nextWeight,
                    type === 'editor',
                    siteId,
                );

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
     * @returns Display Options.
     */
    fixDisplayOptions(displayOptions: CoreH5PDisplayOptions, id: number): CoreH5PDisplayOptions {
        displayOptions = displayOptions || {};

        // Never allow downloading in the app.
        displayOptions[CoreH5PCore.DISPLAY_OPTION_DOWNLOAD] = false;

        // Never show the embed option in the app.
        displayOptions[CoreH5PCore.DISPLAY_OPTION_EMBED] = false;

        if (!this.h5pFramework.getOption(CoreH5PCore.DISPLAY_OPTION_FRAME, true)) {
            displayOptions[CoreH5PCore.DISPLAY_OPTION_FRAME] = false;
        } else if (this.h5pFramework.getOption(CoreH5PCore.DISPLAY_OPTION_COPYRIGHT, true) == false) {
            displayOptions[CoreH5PCore.DISPLAY_OPTION_COPYRIGHT] = false;
        }

        displayOptions[CoreH5PCore.DISPLAY_OPTION_COPY] = this.h5pFramework.hasPermission(CoreH5PPermission.COPY_H5P, id);

        return displayOptions;
    }

    /**
     * Parses library data from a string on the form {machineName} {majorVersion}.{minorVersion}.
     *
     * @param content On the form {machineName} {majorVersion}.{minorVersion}
     * @returns Object with keys machineName, majorVersion and minorVersion. Null if string is not parsable.
     */
    generateContentSlug(content: CoreH5PContentData): string {

        let slug = CoreH5PCore.slugify(content.title);
        let available: boolean | null = null;

        while (!available) {
            if (available === false) {
                // If not available, add number suffix.
                const matches = slug.match(/(.+-)([0-9]+)$/);
                if (matches) {
                    slug = matches[1] + (Number(matches[2]) + 1);
                } else {
                    slug += '-2';
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
     * @returns List of urls.
     */
    getAssetsUrls(assets: CoreH5PDependencyAsset[], assetsFolderPath: string = ''): string[] {
        const urls: string[] = [];

        assets.forEach((asset) => {
            let url = asset.path;

            // Add URL prefix if not external.
            if (asset.path.indexOf('://') == -1 && assetsFolderPath) {
                url = CorePath.concatenatePaths(assetsFolderPath, url);
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
     * @returns Promise resolved with the files.
     */
    async getDependenciesFiles(
        dependencies: {[machineName: string]: CoreH5PContentDependencyData},
        folderName: string,
        prefix: string = '',
        siteId?: string,
    ): Promise<CoreH5PDependenciesFiles> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Build files list for assets.
        const files: CoreH5PDependenciesFiles = {
            scripts: [],
            styles: [],
        };

        // Avoid caching empty files.
        if (!Object.keys(dependencies).length) {
            return files;
        }

        let cachedAssetsHash = '';

        if (this.aggregateAssets) {
            // Get aggregated files for assets.
            cachedAssetsHash = CoreH5PCore.getDependenciesHash(dependencies);

            const cachedAssets = await this.h5pFS.getCachedAssets(cachedAssetsHash);

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
     * Get the paths to the content dependencies.
     *
     * @param id The H5P content ID.
     * @param siteId The site ID. If not defined, current site.
     * @returns Promise resolved with an object containing the path of each content dependency.
     */
    async getDependencyRoots(id: number, siteId?: string): Promise<{[libString: string]: string}> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const roots = {};

        const dependencies = await this.h5pFramework.loadContentDependencies(id, undefined, siteId);

        for (const machineName in dependencies) {
            const dependency = dependencies[machineName];
            const folderName = CoreH5PCore.libraryToFolderName(dependency);

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
    protected getDependencyAssets(
        dependency: CoreH5PContentDependencyData,
        type: string,
        assets: CoreH5PDependencyAsset[],
        prefix: string = '',
    ): void {

        // Check if dependency has any files of this type
        if (!dependency[type] || dependency[type][0] === '') {
            return;
        }

        // Check if we should skip CSS.
        if (type === 'preloadedCss' && CoreUtils.isTrueOrOne(dependency.dropCss)) {
            return;
        }

        for (const key in dependency[type]) {
            const file = dependency[type][key];

            assets.push({
                path: prefix + '/' + dependency.path + '/' + (typeof file != 'string' ? file.path : file).trim(),
                version: dependency.version || '',
            });
        }
    }

    /**
     * Convert display options to an object.
     *
     * @param disable Display options as a number.
     * @returns Display options as object.
     */
    getDisplayOptionsAsObject(disable: number): CoreH5PDisplayOptions {
        const displayOptions: CoreH5PDisplayOptions = {};

        // eslint-disable-next-line no-bitwise
        displayOptions[CoreH5PCore.DISPLAY_OPTION_FRAME] = !(disable & CoreH5PCore.DISABLE_FRAME);
        displayOptions[CoreH5PCore.DISPLAY_OPTION_DOWNLOAD] = false; // Never allow downloading in the app.
        displayOptions[CoreH5PCore.DISPLAY_OPTION_EMBED] = false; // Never show the embed option in the app.
        // eslint-disable-next-line no-bitwise
        displayOptions[CoreH5PCore.DISPLAY_OPTION_COPYRIGHT] = !(disable & CoreH5PCore.DISABLE_COPYRIGHT);
        displayOptions[CoreH5PCore.DISPLAY_OPTION_ABOUT] = !!this.h5pFramework.getOption(CoreH5PCore.DISPLAY_OPTION_ABOUT, true);

        return displayOptions;
    }

    /**
     * Determine display option visibility when viewing H5P
     *
     * @param disable The display options as a number.
     * @param id Package ID.
     * @returns Display options as object.
     */
    getDisplayOptionsForView(disable: number, id: number): CoreH5PDisplayOptions {
        return this.fixDisplayOptions(this.getDisplayOptionsAsObject(disable), id);
    }

    /**
     * Provide localization for the Core JS.
     *
     * @returns Object with the translations.
     */
    getLocalization(): CoreH5PLocalization {
        // Some strings weren't included in the app because they were strictly related to the H5P Content Hub.
        return {
            fullscreen: Translate.instant('core.h5p.fullscreen'),
            disableFullscreen: Translate.instant('core.h5p.disablefullscreen'),
            download: Translate.instant('core.h5p.download'),
            copyrights: Translate.instant('core.h5p.copyright'),
            embed: Translate.instant('core.h5p.embed'),
            size: Translate.instant('core.h5p.size'),
            showAdvanced: Translate.instant('core.h5p.showadvanced'),
            hideAdvanced: Translate.instant('core.h5p.hideadvanced'),
            advancedHelp: Translate.instant('core.h5p.resizescript'),
            copyrightInformation: Translate.instant('core.h5p.copyright'),
            close: Translate.instant('core.h5p.close'),
            title: Translate.instant('core.h5p.title'),
            author: Translate.instant('core.h5p.author'),
            year: Translate.instant('core.h5p.year'),
            source: Translate.instant('core.h5p.source'),
            license: Translate.instant('core.h5p.license'),
            thumbnail: Translate.instant('core.h5p.thumbnail'),
            noCopyrights: Translate.instant('core.h5p.nocopyright'),
            reuse: Translate.instant('core.h5p.reuse'),
            reuseContent: Translate.instant('core.h5p.reuseContent'),
            reuseDescription: Translate.instant('core.h5p.reuseDescription'),
            downloadDescription: Translate.instant('core.h5p.downloadtitle'),
            copyrightsDescription: Translate.instant('core.h5p.copyrighttitle'),
            embedDescription: Translate.instant('core.h5p.embedtitle'),
            h5pDescription: Translate.instant('core.h5p.h5ptitle'),
            contentChanged: Translate.instant('core.h5p.contentchanged'),
            startingOver: Translate.instant('core.h5p.startingover'),
            by: Translate.instant('core.h5p.by'),
            showMore: Translate.instant('core.h5p.showmore'),
            showLess: Translate.instant('core.h5p.showless'),
            subLevel: Translate.instant('core.h5p.sublevel'),
            confirmDialogHeader: Translate.instant('core.h5p.confirmdialogheader'),
            confirmDialogBody: Translate.instant('core.h5p.confirmdialogbody'),
            cancelLabel: Translate.instant('core.h5p.cancellabel'),
            confirmLabel: Translate.instant('core.h5p.confirmlabel'),
            licenseU: Translate.instant('core.h5p.undisclosed'),
            licenseCCBY: Translate.instant('core.h5p.ccattribution'),
            licenseCCBYSA: Translate.instant('core.h5p.ccattributionsa'),
            licenseCCBYND: Translate.instant('core.h5p.ccattributionnd'),
            licenseCCBYNC: Translate.instant('core.h5p.ccattributionnc'),
            licenseCCBYNCSA: Translate.instant('core.h5p.ccattributionncsa'),
            licenseCCBYNCND: Translate.instant('core.h5p.ccattributionncnd'),
            licenseCC40: Translate.instant('core.h5p.licenseCC40'),
            licenseCC30: Translate.instant('core.h5p.licenseCC30'),
            licenseCC25: Translate.instant('core.h5p.licenseCC25'),
            licenseCC20: Translate.instant('core.h5p.licenseCC20'),
            licenseCC10: Translate.instant('core.h5p.licenseCC10'),
            licenseGPL: Translate.instant('core.h5p.licenseGPL'),
            licenseV3: Translate.instant('core.h5p.licenseV3'),
            licenseV2: Translate.instant('core.h5p.licenseV2'),
            licenseV1: Translate.instant('core.h5p.licenseV1'),
            licensePD: Translate.instant('core.h5p.pd'),
            licenseCC010: Translate.instant('core.h5p.licenseCC010'),
            licensePDM: Translate.instant('core.h5p.pdm'),
            licenseC: Translate.instant('core.h5p.copyrightstring'),
            contentType: Translate.instant('core.h5p.contenttype'),
            licenseExtras: Translate.instant('core.h5p.licenseextras'),
            changes: Translate.instant('core.h5p.changelog'),
            contentCopied: Translate.instant('core.h5p.contentCopied'),
            connectionLost: Translate.instant('core.h5p.connectionLost'),
            connectionReestablished: Translate.instant('core.h5p.connectionReestablished'),
            resubmitScores: Translate.instant('core.h5p.resubmitScores'),
            offlineDialogHeader: Translate.instant('core.h5p.offlineDialogHeader'),
            offlineDialogBody: Translate.instant('core.h5p.offlineDialogBody'),
            offlineDialogRetryMessage: Translate.instant('core.h5p.offlineDialogRetryMessage'),
            offlineDialogRetryButtonLabel: Translate.instant('core.h5p.offlineDialogRetryButtonLabel'),
            offlineSuccessfulSubmit: Translate.instant('core.h5p.offlineSuccessfulSubmit'),
            mainTitle: Translate.instant('core.h5p.mainTitle'),
            editInfoTitle: Translate.instant('core.h5p.editInfoTitle'),
            cancel: Translate.instant('core.h5p.cancellabel'),
            back: Translate.instant('core.h5p.back'),
            next: Translate.instant('core.h5p.next'),
            reviewInfo: Translate.instant('core.h5p.reviewInfo'),
            share: Translate.instant('core.h5p.share'),
            saveChanges: Translate.instant('core.h5p.saveChanges'),
            requiredInfo: Translate.instant('core.h5p.requiredInfo'),
            optionalInfo: Translate.instant('core.h5p.optionalInfo'),
            reviewAndShare: Translate.instant('core.h5p.reviewAndShare'),
            reviewAndSave: Translate.instant('core.h5p.reviewAndSave'),
            shared: Translate.instant('core.h5p.shared'),
            currentStep: Translate.instant('core.h5p.currentStep'),
            sharingNote: Translate.instant('core.h5p.sharingNote'),
            licenseDescription: Translate.instant('core.h5p.licenseDescription'),
            licenseVersion: Translate.instant('core.h5p.licenseversion'),
            licenseVersionDescription: Translate.instant('core.h5p.licenseVersionDescription'),
            disciplineLabel: Translate.instant('core.h5p.disciplineLabel'),
            disciplineDescription: Translate.instant('core.h5p.disciplineDescription'),
            disciplineLimitReachedMessage: Translate.instant('core.h5p.disciplineLimitReachedMessage'),
            discipline: {
                searchPlaceholder: Translate.instant('core.h5p.discipline:searchPlaceholder'),
                in: Translate.instant('core.h5p.discipline:in'),
                dropdownButton: Translate.instant('core.h5p.discipline:dropdownButton'),
            },
            removeChip: Translate.instant('core.h5p.removeChip'),
            keywordsPlaceholder: Translate.instant('core.h5p.keywordsPlaceholder'),
            keywords: Translate.instant('core.h5p.keywords'),
            keywordsDescription: Translate.instant('core.h5p.keywordsDescription'),
            altText: Translate.instant('core.h5p.altText'),
            reviewMessage: Translate.instant('core.h5p.reviewMessage'),
            subContentWarning: Translate.instant('core.h5p.subContentWarning'),
            disciplines: Translate.instant('core.h5p.disciplines'),
            shortDescription: Translate.instant('core.h5p.shortDescription'),
            longDescription: Translate.instant('core.h5p.longDescription'),
            icon: Translate.instant('core.h5p.icon'),
            screenshots: Translate.instant('core.h5p.screenshots'),
            helpChoosingLicense: Translate.instant('core.h5p.helpChoosingLicense'),
            shareFailed: Translate.instant('core.h5p.shareFailed'),
            editingFailed: Translate.instant('core.h5p.editingFailed'),
            shareTryAgain: Translate.instant('core.h5p.shareTryAgain'),
            pleaseWait: Translate.instant('core.h5p.pleaseWait'),
            language: Translate.instant('core.h5p.language'),
            level: Translate.instant('core.h5p.level'),
            shortDescriptionPlaceholder: Translate.instant('core.h5p.shortDescriptionPlaceholder'),
            longDescriptionPlaceholder: Translate.instant('core.h5p.longDescriptionPlaceholder'),
            description: Translate.instant('core.h5p.description'),
            iconDescription: Translate.instant('core.h5p.iconDescription'),
            screenshotsDescription: Translate.instant('core.h5p.screenshotsDescription'),
            submitted: Translate.instant('core.h5p.submitted'),
            contentLicenseTitle: Translate.instant('core.h5p.contentLicenseTitle'),
            licenseDialogDescription: Translate.instant('core.h5p.licenseDialogDescription'),
            publisherFieldTitle: Translate.instant('core.h5p.publisherFieldTitle'),
            publisherFieldDescription: Translate.instant('core.h5p.publisherFieldDescription'),
            emailAddress: Translate.instant('core.h5p.emailAddress'),
            publisherDescription: Translate.instant('core.h5p.publisherDescription'),
            publisherDescriptionText: Translate.instant('core.h5p.publisherDescriptionText'),
            contactPerson: Translate.instant('core.h5p.contactPerson'),
            phone: Translate.instant('core.h5p.phone'),
            address: Translate.instant('core.h5p.address'),
            city: Translate.instant('core.h5p.city'),
            zip: Translate.instant('core.h5p.zip'),
            country: Translate.instant('core.h5p.country'),
            logoUploadText: Translate.instant('core.h5p.logoUploadText'),
            acceptTerms: Translate.instant('core.h5p.acceptTerms'),
            accountDetailsLinkText: Translate.instant('core.h5p.accountDetailsLinkText'),
            maxLength: Translate.instant('core.h5p.maxLength'),
            keywordExists: Translate.instant('core.h5p.keywordExists'),
            licenseDetails: Translate.instant('core.h5p.licenseDetails'),
            remove: Translate.instant('core.h5p.remove'),
            removeImage: Translate.instant('core.h5p.removeImage'),
            cancelPublishConfirmationDialogTitle: Translate.instant('core.h5p.removeImage'),
            cancelPublishConfirmationDialogDescription: Translate.instant('core.h5p.removeImage'),
            cancelPublishConfirmationDialogCancelButtonText: Translate.instant('core.h5p.removeImage'),
            cancelPublishConfirmationDialogConfirmButtonText: Translate.instant('core.h5p.removeImage'),
            add: Translate.instant('core.h5p.add'),
            age: Translate.instant('core.h5p.age'),
            ageDescription: Translate.instant('core.h5p.ageDescription'),
            invalidAge: Translate.instant('core.h5p.invalidAge'),
            keywordsExits: Translate.instant('core.h5p.keywordsExits'),
            someKeywordsExits: Translate.instant('core.h5p.someKeywordsExits'),
            width: Translate.instant('core.h5p.width'),
            height: Translate.instant('core.h5p.height'),
            rotateLeft: Translate.instant('core.h5p.rotateLeft'),
            rotateRight: Translate.instant('core.h5p.rotateRight'),
            cropImage: Translate.instant('core.h5p.cropImage'),
            confirmCrop: Translate.instant('core.h5p.confirmCrop'),
            cancelCrop: Translate.instant('core.h5p.cancelCrop'),
        };
    }

    /**
     * Load content data from DB.
     *
     * @param id Content ID.
     * @param fileUrl H5P file URL. Required if id is not provided.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the content data.
     */
    async loadContent(id?: number, fileUrl?: string, siteId?: string): Promise<CoreH5PContentData> {
        siteId = siteId || CoreSites.getCurrentSiteId();

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
     * @returns Content dependencies, indexed by machine name.
     */
    loadContentDependencies(
        id: number,
        type?: string,
        siteId?: string,
    ): Promise<{[machineName: string]: CoreH5PContentDependencyData}> {
        return this.h5pFramework.loadContentDependencies(id, type, siteId);
    }

    /**
     * Loads a library and its dependencies.
     *
     * @param machineName The library's machine name.
     * @param majorVersion The library's major version.
     * @param minorVersion The library's minor version.
     * @param siteId The site ID. If not defined, current site.
     * @returns Promise resolved with the library data.
     */
    loadLibrary(machineName: string, majorVersion: number, minorVersion: number, siteId?: string): Promise<CoreH5PLibraryData> {
        return this.h5pFramework.loadLibrary(machineName, majorVersion, minorVersion, siteId);
    }

    /**
     * Check if the current user has permission to update and install new libraries.
     *
     * @returns Whether has permissions.
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
     * @returns Promise resolved with content ID.
     */
    async saveContent(content: CoreH5PContentBeingSaved, folderName: string, fileUrl: string, siteId?: string): Promise<number> {
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
     * @returns The value to use.
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
     * Determine if params contain any match.
     *
     * @param params Parameters.
     * @param pattern Regular expression to identify pattern.
     * @returns True if params matches pattern.
     */
    protected textAddonMatches(params: unknown, pattern: string): boolean {

        if (typeof params == 'string') {
            if (params.match(pattern)) {
                return true;
            }
        } else if (typeof params === 'object') {
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
export enum CoreH5PDisplayOptionBehaviour {
    NEVER_SHOW = 0,
    CONTROLLED_BY_AUTHOR_DEFAULT_ON = 1,
    CONTROLLED_BY_AUTHOR_DEFAULT_OFF = 2,
    ALWAYS_SHOW = 3,
    CONTROLLED_BY_PERMISSIONS = 4,
}

/**
 * Permission constants.
 */
export enum CoreH5PPermission {
    DOWNLOAD_H5P = 0,
    EMBED_H5P = 1,
    CREATE_RESTRICTED = 2,
    UPDATE_LIBRARIES = 3,
    INSTALL_RECOMMENDED = 4,
    COPY_H5P = 8,
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
    disable: number | null; // H5P Button display options.
    folderName: string; // Name of the folder that contains the contents.
    title: string; // Main library's title.
    slug: string; // Lib title and ID slugified.
    filtered: string | null; // Filtered version of json_content.
    libraryMajorVersion: number; // Main library's major version.
    libraryMinorVersion: number; // Main library's minor version.
    metadata: unknown; // Content metadata.
    library: CoreH5PContentMainLibraryData; // Main library data.
    dependencies?: {[key: string]: CoreH5PContentDepsTreeDependency}; // Dependencies. Calculated in filterParameters.
};

/**
 * Data about main library of a content.
 */
export type CoreH5PContentMainLibraryData = {
    id: number; // The id of the library.
    name: string; // The library machine name.
    majorVersion: number; // Major version.
    minorVersion: number; // Minor version.
    embedTypes: string; // List of supported embed types.
    fullscreen: number; // Display fullscreen button.
};

/**
 * Content dependency data.
 */
export type CoreH5PContentDependencyData = CoreH5PLibraryBasicDataWithPatch & {
    libraryId: number; // The id of the library if it is an existing library.
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
export type CoreH5PLibraryData = CoreH5PLibraryBasicDataWithPatch & {
    libraryId: number; // The id of the library.
    title: string; // The human readable name of this library.
    runnable: number; // Can this library be started by the module? I.e. not a dependency.
    fullscreen: number; // Display fullscreen button.
    embedTypes: string; // List of supported embed types.
    preloadedJs?: string; // Comma separated list of scripts to load.
    preloadedCss?: string; // Comma separated list of stylesheets to load.
    dropLibraryCss?: string; // List of libraries that should not have CSS included if this library is used. Comma separated list.
    semantics?: CoreH5PSemantics[]; // The semantics definition. If it's a string, it's in json format.
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
 * Data about a missing library.
 */
export type CoreH5PMissingLibrary = CoreH5PLibraryBasicData & {
    libString: string; // Library that has the dependency.
};

/**
 * Library basic data including patch version.
 */
export type CoreH5PLibraryBasicDataWithPatch = CoreH5PLibraryBasicData & {
    patchVersion: number; // Patch version.
};

/**
 * "Addon" data (library).
 */
export type CoreH5PLibraryAddonData = CoreH5PLibraryBasicDataWithPatch & {
    libraryId: number; // The id of the library.
    preloadedJs?: string; // Comma separated list of scripts to load.
    preloadedCss?: string; // Comma separated list of stylesheets to load.
    addTo?: CoreH5PLibraryAddTo | null; // Plugin configuration data.
};

export type CoreH5PLocalization = Record<string, string | Record<string, string>>;
