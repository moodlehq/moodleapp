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
import { InAppBrowserObject, InAppBrowserOptions } from '@awesome-cordova-plugins/in-app-browser';
import { FileEntry } from '@awesome-cordova-plugins/file/ngx';
import { Subscription } from 'rxjs';
import { CoreEvents } from '@singletons/events';
import { CoreFile } from '@services/file';
import { CoreLang } from '@services/lang';
import { CoreWS } from '@services/ws';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreTextUtils } from '@services/utils/text';
import { makeSingleton, Clipboard, InAppBrowser, FileOpener, WebIntent, Translate, NgZone } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreCanceledError } from '@classes/errors/cancelederror';
import { CoreFileEntry } from '@services/file-helper';
import { CoreConstants } from '@/core/constants';
import { CoreWindow } from '@singletons/window';
import { CoreColors } from '@singletons/colors';
import { CorePromisedValue } from '@classes/promised-value';
import { CorePlatform } from '@services/platform';
import { CoreErrorWithOptions } from '@classes/errors/errorwithoptions';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreUrlUtils } from './url';
import { QRScanner } from '@features/native/plugins';
import { CoreArray } from '@singletons/array';

export type TreeNode<T> = T & { children: TreeNode<T>[] };

/*
 * "Utils" service with helper functions.
 */
@Injectable({ providedIn: 'root' })
export class CoreUtilsProvider {

    protected readonly DONT_CLONE = ['[object FileEntry]', '[object DirectoryEntry]', '[object DOMFileSystem]'];

    protected logger: CoreLogger;
    protected iabInstance?: InAppBrowserObject;
    protected uniqueIds: {[name: string]: number} = {};
    protected qrScanData?: {deferred: CorePromisedValue<string>; observable: Subscription};
    protected initialColorSchemeContent = 'light dark';

    constructor() {
        this.logger = CoreLogger.getInstance('CoreUtilsProvider');
    }

    /**
     * Given an error, add an extra warning to the error message and return the new error message.
     *
     * @param error Error object or message.
     * @param defaultError Message to show if the error is not a string.
     * @returns New error message.
     */
    addDataNotDownloadedError(error: Error | string, defaultError?: string): string {
        const errorMessage = CoreTextUtils.getErrorMessageFromError(error) || defaultError || '';

        if (this.isWebServiceError(error)) {
            return errorMessage;
        }

        // Local error. Add an extra warning.
        return errorMessage + '<br><br>' + Translate.instant('core.errorsomedatanotdownloaded');
    }

    /**
     * Similar to Promise.all, but if a promise fails this function's promise won't be rejected until ALL promises have finished.
     *
     * @param promises Promises.
     * @returns Promise resolved if all promises are resolved and rejected if at least 1 promise fails.
     */
    async allPromises(promises: unknown[]): Promise<void> {
        if (!promises || !promises.length) {
            return;
        }

        const getPromiseError = async (promise: unknown): Promise<Error | void> => {
            try {
                await promise;
            } catch (error) {
                return error;
            }
        };

        const errors = await Promise.all(promises.map(getPromiseError));
        const error = errors.find(error => !!error);

        if (error) {
            throw error;
        }
    }

    /**
     * Combination of allPromises and ignoreErrors functions.
     *
     * @param promises Promises.
     * @returns Promise resolved if all promises are resolved and rejected if at least 1 promise fails.
     */
    async allPromisesIgnoringErrors(promises: Promise<unknown>[]): Promise<void> {
        await CoreUtils.ignoreErrors(this.allPromises(promises));
    }

    /**
     * Converts an array of objects to an object, using a property of each entry as the key.
     * It can also be used to convert an array of strings to an object where the keys are the elements of the array.
     * E.g. [{id: 10, name: 'A'}, {id: 11, name: 'B'}] => {10: {id: 10, name: 'A'}, 11: {id: 11, name: 'B'}}
     *
     * @param array The array to convert.
     * @param propertyName The name of the property to use as the key. If not provided, the whole item will be used.
     * @param result Object where to put the properties. If not defined, a new object will be created.
     * @returns The object.
     */
    arrayToObject<T>(
        array: T[] = [],
        propertyName?: string,
        result: Record<string, T> = {},
    ): Record<string, T> {
        for (const entry of array) {
            const key = propertyName ? entry[propertyName] : entry;

            result[key] = entry;
        }

        return result;
    }

    /**
     * Log an unhandled error.
     *
     * @param message Message to contextualize the error.
     * @param error Error to log.
     */
    logUnhandledError(message: string, error: unknown): void {
        this.logger.error(message, error);
    }

    /**
     * Converts an array of objects to an indexed array, using a property of each entry as the key.
     * Every entry will contain an array of the found objects of the property identifier.
     * E.g. [{id: 10, name: 'A'}, {id: 10, name: 'B'}] => {10: [ {id: 10, name: 'A'}, {id: 10, name: 'B'} ] }
     *
     * @param array The array to convert.
     * @param propertyName The name of the property to use as the key. If not provided, the whole item will be used.
     * @param result Object where to put the properties. If not defined, a new object will be created.
     * @returns The object.
     */
    arrayToObjectMultiple<T>(
        array: T[] = [],
        propertyName?: string,
        result: Record<string, T[]> = {},
    ): Record<string, T[]> {
        for (const entry of array) {
            const key = propertyName ? entry[propertyName] : entry;
            if (result[key] === undefined) {
                result[key] = [];
            }

            result[key].push(entry);
        }

        return result;
    }

    /**
     * Compare two objects. This function won't compare functions and proto properties, it's a basic compare.
     * Also, this will only check if itemA's properties are in itemB with same value. This function will still
     * return true if itemB has more properties than itemA.
     *
     * @param itemA First object.
     * @param itemB Second object.
     * @param maxLevels Number of levels to reach if 2 objects are compared.
     * @param level Current deep level (when comparing objects).
     * @param undefinedIsNull True if undefined is equal to null. Defaults to true.
     * @returns Whether both items are equal.
     */
    basicLeftCompare(
        itemA: any, // eslint-disable-line @typescript-eslint/no-explicit-any
        itemB: any, // eslint-disable-line @typescript-eslint/no-explicit-any
        maxLevels: number = 0,
        level: number = 0,
        undefinedIsNull: boolean = true,
    ): boolean {
        if (typeof itemA == 'function' || typeof itemB == 'function') {
            return true; // Don't compare functions.
        } else if (typeof itemA == 'object' && typeof itemB == 'object') {
            if (level >= maxLevels) {
                return true; // Max deep reached.
            }

            let equal = true;
            for (const name in itemA) {
                const value = itemA[name];
                if (name == '$$hashKey') {
                    // Ignore $$hashKey property since it's a "calculated" property.
                    continue;
                }

                if (!this.basicLeftCompare(value, itemB[name], maxLevels, level + 1)) {
                    equal = false;
                }
            }

            return equal;
        } else {
            if (undefinedIsNull && (
                (itemA === undefined && itemB === null) || (itemA === null && itemB === undefined))) {
                return true;
            }

            // We'll treat "2" and 2 as the same value.
            const floatA = parseFloat(itemA);
            const floatB = parseFloat(itemB);

            if (!isNaN(floatA) && !isNaN(floatB)) {
                return floatA == floatB;
            }

            return itemA === itemB;
        }
    }

    /**
     * Check if a URL has a redirect.
     *
     * @param url The URL to check.
     * @returns Promise resolved with boolean_ whether there is a redirect.
     */
    async checkRedirect(url: string): Promise<boolean> {
        if (!window.fetch) {
            // Cannot check if there is a redirect, assume it's false.
            return false;
        }

        const initOptions: RequestInit = { redirect: 'follow' };

        // Some browsers implement fetch but no AbortController.
        const controller = AbortController ? new AbortController() : false;

        if (controller) {
            initOptions.signal = controller.signal;
        }

        try {
            const response = await this.timeoutPromise(window.fetch(url, initOptions), CoreWS.getRequestTimeout());

            return response.redirected;
        } catch (error) {
            if (error.timeout && controller) {
                // Timeout, abort the request.
                controller.abort();
            }

            // There was a timeout, cannot determine if there's a redirect. Assume it's false.
            return false;
        }
    }

    /**
     * Close the InAppBrowser window.
     */
    closeInAppBrowser(): void {
        if (this.iabInstance) {
            this.iabInstance.close();
        }
    }

    /**
     * Get inapp browser instance (if any).
     *
     * @returns IAB instance, undefined if not open.
     */
    getInAppBrowserInstance(): InAppBrowserObject | undefined  {
        return this.iabInstance;
    }

    /**
     * Check if inapp browser is open.
     *
     * @returns Whether it's open.
     */
    isInAppBrowserOpen(): boolean {
        return !!this.iabInstance;
    }

    /**
     * Clone a variable. It should be an object, array or primitive type.
     *
     * @param source The variable to clone.
     * @param level Depth we are right now inside a cloned object. It's used to prevent reaching max call stack size.
     * @returns Cloned variable.
     */
    clone<T>(source: T, level: number = 0): T {
        if (level >= 20) {
            // Max 20 levels.
            this.logger.error('Max depth reached when cloning object.', source);

            return source;
        }

        if (this.valueIsFileEntry(source)) {
            // Don't clone FileEntry. It has a lot of depth and they shouldn't be modified.
            return source;
        } else if (Array.isArray(source)) {
            // Clone the array and all the entries.
            const newArray = [] as unknown as T;
            for (let i = 0; i < source.length; i++) {
                newArray[i] = this.clone(source[i], level + 1);
            }

            return newArray;
        } else if (this.isObject(source)) {
            // Check if the object shouldn't be copied.
            if (source.toString && this.DONT_CLONE.indexOf(source.toString()) != -1) {
                // Object shouldn't be copied, return it as it is.
                return source;
            }

            // Clone the object and all the subproperties.
            const newObject = {} as T;
            for (const name in source) {
                newObject[name] = this.clone(source[name], level + 1);
            }

            return newObject;
        } else {
            // Primitive type or unknown, return it as it is.
            return source;
        }
    }

    /**
     * Copy properties from one object to another.
     *
     * @param from Object to copy the properties from.
     * @param to Object where to store the properties.
     * @param clone Whether the properties should be cloned (so they are different instances).
     * @deprecated since 4.4. Not used anymore.
     */
    copyProperties(from: Record<string, unknown>, to: Record<string, unknown>, clone: boolean = true): void {
        for (const name in from) {
            if (clone) {
                to[name] = this.clone(from[name]);
            } else {
                to[name] = from[name];
            }
        }
    }

    /**
     * Copies a text to clipboard and shows a toast message.
     *
     * @param text Text to be copied
     * @returns Promise resolved when text is copied.
     */
    async copyToClipboard(text: string): Promise<void> {
        try {
            await Clipboard.copy(text);
        } catch {
            // Use HTML Copy command.
            const virtualInput = document.createElement('textarea');
            virtualInput.innerHTML = text;
            virtualInput.select();
            virtualInput.setSelectionRange(0, 99999);
            document.execCommand('copy'); // eslint-disable-line deprecation/deprecation
        }

        // Show toast using ionicLoading.
        CoreDomUtils.showToast('core.copiedtoclipboard', true);
    }

    /**
     * Empties an array without losing its reference.
     *
     * @param array Array to empty.
     * @deprecated since 4.4. Not used anymore.
     */
    emptyArray(array: unknown[]): void {
        array.length = 0; // Empty array without losing its reference.
    }

    /**
     * Removes all properties from an object without losing its reference.
     *
     * @param object Object to remove the properties.
     * @deprecated since 4.4. Not used anymore.
     */
    emptyObject(object: Record<string, unknown>): void {
        for (const key in object) {
            if (Object.prototype.hasOwnProperty.call(object, key)) {
                delete object[key];
            }
        }
    }

    /**
     * Execute promises one depending on the previous.
     *
     * @param orderedPromisesData Data to be executed.
     * @returns Promise resolved when all promises are resolved.
     */
    executeOrderedPromises(orderedPromisesData: OrderedPromiseData[]): Promise<void> {
        const promises: Promise<void>[] = [];
        let dependency = Promise.resolve();

        // Execute all the processes in order.
        for (const i in orderedPromisesData) {
            const data = orderedPromisesData[i];
            // Add the process to the dependency stack.
            const promise = dependency.finally(() => {
                try {
                    return data.function();
                } catch (e) {
                    this.logger.error(e.message);

                    return;
                }
            });
            promises.push(promise);

            // If the new process is blocking, we set it as the dependency.
            if (data.blocking) {
                dependency = promise;
            }
        }

        // Return when all promises are done.
        return this.allPromises(promises);
    }

    /**
     * Flatten an object, moving subobjects' properties to the first level.
     * It supports 2 notations: dot notation and square brackets.
     * E.g.: {a: {b: 1, c: 2}, d: 3} -> {'a.b': 1, 'a.c': 2, d: 3}
     *
     * @param obj Object to flatten.
     * @param useDotNotation Whether to use dot notation '.' or square brackets '['.
     * @returns Flattened object.
     */
    flattenObject(obj: Record<string, unknown>, useDotNotation?: boolean): Record<string, unknown> {
        const toReturn = {};

        for (const name in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, name)) {
                continue;
            }

            const value = obj[name];
            if (typeof value == 'object' && !Array.isArray(value)) {
                const flatObject = this.flattenObject(value as Record<string, unknown>);
                for (const subName in flatObject) {
                    if (!Object.prototype.hasOwnProperty.call(flatObject, subName)) {
                        continue;
                    }

                    const newName = useDotNotation ? name + '.' + subName : name + '[' + subName + ']';
                    toReturn[newName] = flatObject[subName];
                }
            } else {
                toReturn[name] = value;
            }
        }

        return toReturn;
    }

    /**
     * Given an array of strings, return only the ones that match a regular expression.
     *
     * @param array Array to filter.
     * @param regex RegExp to apply to each string.
     * @returns Filtered array.
     * @deprecated since 4.4. Use CoreArray.filterByRegexp instead.
     */
    filterByRegexp(array: string[], regex: RegExp): string[] {
        return CoreArray.filterByRegexp(array, regex);
    }

    /**
     * Filter the list of site IDs based on a isEnabled function.
     *
     * @param siteIds Site IDs to filter.
     * @param isEnabledFn Function to call for each site. It receives a siteId param and all the params sent to this function
     *                    after 'checkAll'.
     * @param checkAll True if it should check all the sites, false if it should check only 1 and treat them all
     *                 depending on this result.
     * @returns Promise resolved with the list of enabled sites.
     */
    async filterEnabledSites<P extends unknown[]>(
        siteIds: string[],
        isEnabledFn: (siteId: string, ...args: P) => boolean | Promise<boolean>,
        checkAll?: boolean,
        ...args: P
    ): Promise<string[]> {
        const promises: Promise<false | number>[] = [];
        const enabledSites: string[] = [];

        for (const i in siteIds) {
            const siteId = siteIds[i];
            const pushIfEnabled = enabled => enabled && enabledSites.push(siteId);
            if (checkAll || !promises.length) {
                promises.push(
                    Promise
                        .resolve(isEnabledFn(siteId, ...args))
                        .then(pushIfEnabled),
                );
            }
        }

        await CoreUtils.ignoreErrors(this.allPromises(promises));

        if (!checkAll) {
            // Checking 1 was enough, so it will either return all the sites or none.
            return enabledSites.length ? siteIds : [];
        } else {
            return enabledSites;
        }
    }

    /**
     * Given a float, prints it nicely. Localized floats must not be used in calculations!
     * Based on Moodle's format_float.
     *
     * @param float The float to print.
     * @returns Locale float.
     */
    formatFloat(float: unknown): string {
        if (float === undefined || float === null || typeof float == 'boolean') {
            return '';
        }

        const localeSeparator = Translate.instant('core.decsep');

        const floatString = String(float);

        return floatString.replace('.', localeSeparator);
    }

    /**
     * Returns a tree formatted from a plain list.
     * List has to be sorted by depth to allow this function to work correctly. Errors can be thrown if a child node is
     * processed before a parent node.
     *
     * @param list List to format.
     * @param parentFieldName Name of the parent field to match with children.
     * @param idFieldName Name of the children field to match with parent.
     * @param rootParentId The id of the root.
     * @param maxDepth Max Depth to convert to tree. Children found will be in the last level of depth.
     * @returns Array with the formatted tree, children will be on each node under children field.
     */
    formatTree<T>(
        list: T[],
        parentFieldName: string = 'parent',
        idFieldName: string = 'id',
        rootParentId: number = 0,
        maxDepth: number = 5,
    ): TreeNode<T>[] {
        const map = {};
        const mapDepth = {};
        const tree: TreeNode<T>[] = [];

        // Create a map first to avoid problems with not sorted.
        list.forEach((node: TreeNode<T>, index): void => {
            const id = node[idFieldName];

            if (id === undefined) {
                this.logger.error(`Node with incorrect ${idFieldName}:${id} found on formatTree`);
            }

            if (node.children === undefined) {
                node.children = [];
            }
            map[id] = index;
        });

        list.forEach((node: TreeNode<T>): void => {
            const id = node[idFieldName];
            const parent = node[parentFieldName];

            if (id === undefined || parent === undefined) {
                this.logger.error(`Node with incorrect ${idFieldName}:${id} or ${parentFieldName}:${parent} found on formatTree`);
            }

            // Use map to look-up the parents.
            if (parent !== rootParentId) {
                const parentNode = list[map[parent]] as TreeNode<T>;
                if (parentNode) {
                    if (mapDepth[parent] == maxDepth) {
                        // Reached max level of depth. Proceed with flat order. Find parent object of the current node.
                        const parentOfParent = parentNode[parentFieldName];
                        if (parentOfParent) {
                            // This element will be the child of the node that is two levels up the hierarchy
                            // (i.e. the child of node.parent.parent).
                            (list[map[parentOfParent]] as TreeNode<T>).children.push(node);
                            // Assign depth level to the same depth as the parent (i.e. max depth level).
                            mapDepth[id] = mapDepth[parent];
                            // Change the parent to be the one that is two levels up the hierarchy.
                            node[parentFieldName] = parentOfParent;
                        } else {
                            this.logger.error(`Node parent of parent:${parentOfParent} not found on formatTree`);
                        }
                    } else {
                        parentNode.children.push(node);
                        // Increase the depth level.
                        mapDepth[id] = mapDepth[parent] + 1;
                    }
                } else {
                    this.logger.error(`Node parent:${parent} not found on formatTree`);
                }
            } else {
                tree.push(node);

                // Root elements are the first elements in the tree structure, therefore have the depth level 1.
                mapDepth[id] = 1;
            }
        });

        return tree;
    }

    /**
     * Get country name based on country code.
     *
     * @param code Country code (AF, ES, US, ...).
     * @returns Country name. If the country is not found, return the country code.
     */
    getCountryName(code: string): string {
        const countryKey = 'assets.countries.' + code;
        const countryName = Translate.instant(countryKey);

        return countryName !== countryKey ? countryName : code;
    }

    /**
     * Get list of countries with their code and translated name.
     *
     * @returns Promise resolved with the list of countries.
     */
    async getCountryList(): Promise<Record<string, string>> {
        // Get the keys of the countries.
        const keys = await this.getCountryKeysList();

        // Now get the code and the translated name.
        const countries: Record<string, string> = {};

        keys.forEach((key) => {
            if (key.indexOf('assets.countries.') === 0) {
                const code = key.replace('assets.countries.', '');
                countries[code] = Translate.instant(key);
            }
        });

        return countries;
    }

    /**
     * Get list of countries with their code and translated name. Sorted by the name of the country.
     *
     * @returns Promise resolved with the list of countries.
     */
    async getCountryListSorted(): Promise<CoreCountry[]> {
        // Get the keys of the countries.
        const countries = await this.getCountryList();

        // Sort translations.
        return Object.keys(countries)
            .sort((a, b) => countries[a].localeCompare(countries[b]))
            .map((code) => ({ code, name: countries[code] }));
    }

    /**
     * Get the list of language keys of the countries.
     *
     * @returns Promise resolved with the countries list. Rejected if not translated.
     */
    protected async getCountryKeysList(): Promise<string[]> {
        // It's possible that the current language isn't translated, so try with default language first.
        const defaultLang = CoreLang.getDefaultLanguage();

        try {
            return await this.getCountryKeysListForLanguage(defaultLang);
        } catch {
            // Not translated, try to use the fallback language.
            const fallbackLang = CoreLang.getFallbackLanguage();

            if (fallbackLang === defaultLang) {
                // Same language, just reject.
                throw new Error('Countries not found.');
            }

            return this.getCountryKeysListForLanguage(fallbackLang);
        }
    }

    /**
     * Get the list of language keys of the countries, based on the translation table for a certain language.
     *
     * @param lang Language to check.
     * @returns Promise resolved with the countries list. Rejected if not translated.
     */
    protected async getCountryKeysListForLanguage(lang: string): Promise<string[]> {
        // Get the translation table for the language.
        const table = await CoreLang.getTranslationTable(lang);

        // Gather all the keys for countries,
        const keys: string[] = [];

        for (const name in table) {
            if (name.indexOf('assets.countries.') === 0) {
                keys.push(name);
            }
        }

        if (keys.length === 0) {
            // Not translated, reject.
            throw new Error('Countries not found.');
        }

        return keys;
    }

    /**
     * Get the mimetype of a file given its URL. It'll try to guess it using the URL, if that fails then it'll
     * perform a HEAD request to get it. It's done in this order because pluginfile.php can return wrong mimetypes.
     * This function is in here instead of MimetypeUtils to prevent circular dependencies.
     *
     * @param url The URL of the file.
     * @returns Promise resolved with the mimetype.
     */
    async getMimeTypeFromUrl(url: string): Promise<string> {
        // First check if it can be guessed from the URL.
        const extension = CoreMimetypeUtils.guessExtensionFromUrl(url);
        const mimetype = extension && CoreMimetypeUtils.getMimeType(extension);

        // Ignore PHP extension for now, it could be serving a file.
        if (mimetype && extension !== 'php') {
            return mimetype;
        }

        // Can't be guessed, get the remote mimetype.
        const remoteMimetype = await CoreWS.getRemoteFileMimeType(url);

        return remoteMimetype || mimetype || '';
    }

    /**
     * Get a unique ID for a certain name.
     *
     * @param name The name to get the ID for.
     * @returns Unique ID.
     */
    getUniqueId(name: string): number {
        if (!this.uniqueIds[name]) {
            this.uniqueIds[name] = 0;
        }

        return ++this.uniqueIds[name];
    }

    /**
     * Check if a file is a FileEntry
     *
     * @param file File.
     * @returns Type guard indicating if the file is a FileEntry.
     */
    isFileEntry(file: CoreFileEntry): file is FileEntry {
        return 'isFile' in file;
    }

    /**
     * Check if an unknown value is a FileEntry.
     *
     * @param file Object to check.
     * @returns Type guard indicating if the file is a FileEntry.
     */
    valueIsFileEntry(file: unknown): file is FileEntry {
        // We cannot use instanceof because FileEntry is a type. Check some of the properties.
        return !!(file && typeof file == 'object' && 'isFile' in file && 'filesystem' in file &&
            'toInternalURL' in file && 'copyTo' in file);
    }

    /**
     * Check if a value is an object.
     *
     * @param object Variable.
     * @returns Type guard indicating if this is an object.
     */
    isObject(object: unknown): object is Record<string, unknown> {
        return typeof object === 'object' && object !== null;
    }

    /**
     * Given a list of files, check if there are repeated names.
     *
     * @param files List of files.
     * @returns String with error message if repeated, false if no repeated.
     */
    hasRepeatedFilenames(files: CoreFileEntry[]): string | false {
        if (!files || !files.length) {
            return false;
        }

        const names: string[] = [];

        // Check if there are 2 files with the same name.
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const name = (this.isFileEntry(file) ? file.name : file.filename) || '';

            if (names.indexOf(name) > -1) {
                return Translate.instant('core.filenameexist', { $a: name });
            }

            names.push(name);
        }

        return false;
    }

    /**
     * Gets the index of the first string that matches a regular expression.
     *
     * @param array Array to search.
     * @param regex RegExp to apply to each string.
     * @returns Index of the first string that matches the RegExp. -1 if not found.
     */
    indexOfRegexp(array: string[], regex: RegExp): number {
        if (!array || !array.length) {
            return -1;
        }

        for (let i = 0; i < array.length; i++) {
            const entry = array[i];
            const matches = entry.match(regex);

            if (matches && matches.length) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Return true if the param is false (bool), 0 (number) or "0" (string).
     *
     * @param value Value to check.
     * @returns Whether the value is false, 0 or "0".
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isFalseOrZero(value: any): boolean {
        return value !== undefined && (value === false || value === 'false' || parseInt(value, 10) === 0);
    }

    /**
     * Return true if the param is true (bool), 1 (number) or "1" (string).
     *
     * @param value Value to check.
     * @returns Whether the value is true, 1 or "1".
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isTrueOrOne(value: any): boolean {
        return value !== undefined && (value === true || value === 'true' || parseInt(value, 10) === 1);
    }

    /**
     * Given an error returned by a WS call, check if the error is generated by the app or it has been returned by the WebService.
     *
     * @param error Error to check.
     * @returns Whether the error was returned by the WebService.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isWebServiceError(error: any): boolean {
        return error && (
            error.warningcode !== undefined ||
            (
                error.errorcode !== undefined && error.errorcode != 'userdeleted' && error.errorcode != 'upgraderunning' &&
                error.errorcode != 'forcepasswordchangenotice' && error.errorcode != 'usernotfullysetup' &&
                error.errorcode != 'sitepolicynotagreed' && error.errorcode != 'sitemaintenance' &&
                error.errorcode != 'wsaccessusersuspended' && error.errorcode != 'wsaccessuserdeleted' &&
                !this.isExpiredTokenError(error)
            ) ||
            error.status && error.status >= 400 // CoreHttpError, assume status 400 and above are like WebService errors.
        );
    }

    /**
     * Given an error returned by a WS call, check if the error is a token expired error.
     *
     * @param error Error to check.
     * @returns Whether the error is a token expired error.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isExpiredTokenError(error: any): boolean {
        return error.errorcode === 'invalidtoken' ||
            (error.errorcode === 'accessexception' && error.message.includes('Invalid token - token expired'));
    }

    /**
     * Given a list (e.g. a,b,c,d,e) this function returns an array of 1->a, 2->b, 3->c etc.
     * Taken from make_menu_from_list on moodlelib.php (not the same but similar).
     *
     * @param list The string to explode into array bits
     * @param defaultLabel Element that will become default option, if not defined, it won't be added.
     * @param separator The separator used within the list string. Default ','.
     * @param defaultValue Element that will become default option value. Default 0.
     * @returns The now assembled array
     */
    makeMenuFromList<T>(
        list: string,
        defaultLabel?: string,
        separator: string = ',',
        defaultValue?: T,
    ): CoreMenuItem<T>[] {
        // Split and format the list.
        const split = list.split(separator).map((label, index) => ({
            label: label.trim(),
            value: index + 1,
        })) as { label: string; value: T | number }[];

        if (defaultLabel) {
            split.unshift({
                label: defaultLabel,
                value: defaultValue || 0,
            });
        }

        return split;
    }

    /**
     * Merge two arrays, removing duplicate values.
     *
     * @param array1 The first array.
     * @param array2 The second array.
     * @param [key] Key of the property that must be unique. If not specified, the whole entry.
     * @returns Merged array.
     */
    mergeArraysWithoutDuplicates<T>(array1: T[], array2: T[], key?: string): T[] {
        return CoreArray.unique(array1.concat(array2), key) as T[];
    }

    /**
     * Check if a value isn't null or undefined.
     *
     * @param value Value to check.
     * @returns True if not null and not undefined.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notNullOrUndefined(value: any): boolean {
        return value !== undefined && value !== null;
    }

    /**
     * Open a file using platform specific method.
     *
     * @param path The local path of the file to be open.
     * @param options Options.
     * @returns Promise resolved when done.
     */
    async openFile(path: string, options: CoreUtilsOpenFileOptions = {}): Promise<void> {
        // Convert the path to a native path if needed.
        path = CoreFile.unconvertFileSrc(path);

        const extension = CoreMimetypeUtils.getFileExtension(path);
        const mimetype = extension && CoreMimetypeUtils.getMimeType(extension);

        if (mimetype == 'text/html' && CorePlatform.isAndroid()) {
            // Open HTML local files in InAppBrowser, in system browser some embedded files aren't loaded.
            this.openInApp(path);

            return;
        } else if (extension === 'apk' && CorePlatform.isAndroid()) {
            const url = await CoreUtils.ignoreErrors(
                CoreFilepool.getFileUrlByPath(CoreSites.getCurrentSiteId(), CoreFile.removeBasePath(path)),
            );

            // @todo MOBILE-4167: Handle urls with expired tokens.

            throw new CoreErrorWithOptions(
                Translate.instant('core.cannotinstallapkinfo'),
                Translate.instant('core.cannotinstallapk'),
                url
                    ? [
                        {
                            text: Translate.instant('core.openinbrowser'),
                            handler: () => this.openInBrowser(url),
                        },
                        {
                            text: Translate.instant('core.cancel'),
                            role: 'cancel',
                        },
                    ]
                    : undefined,
            );
        }

        // Path needs to be decoded, the file won't be opened if the path has %20 instead of spaces and so.
        try {
            path = decodeURIComponent(path);
        } catch (ex) {
            // Error, use the original path.
        }

        const openFile = async (mimetype?: string) => {
            if (this.shouldOpenWithDialog(options)) {
                await FileOpener.showOpenWithDialog(path, mimetype || '');
            } else {
                await FileOpener.open(path, mimetype || '');
            }
        };

        try {
            try {
                await openFile(mimetype);
            } catch (error) {
                if (!extension || !error || Number(error.status) !== 9) {
                    throw error;
                }

                // Cannot open mimetype. Check if there is a deprecated mimetype for the extension.
                const deprecatedMimetype = CoreMimetypeUtils.getDeprecatedMimeType(extension);
                if (!deprecatedMimetype || deprecatedMimetype === mimetype) {
                    throw error;
                }

                await openFile(deprecatedMimetype);
            }
        } catch (error) {
            this.logger.error('Error opening file ' + path + ' with mimetype ' + mimetype);
            this.logger.error('Error: ', JSON.stringify(error));

            if (!extension || extension.indexOf('/') > -1 || extension.indexOf('\\') > -1) {
                // Extension not found.
                throw new Error(Translate.instant('core.erroropenfilenoextension'));
            }

            throw new Error(Translate.instant('core.erroropenfilenoapp'));
        }
    }

    /**
     * Open a URL using InAppBrowser.
     * Do not use for files, refer to {@link CoreUtilsProvider.openFile}.
     *
     * @param url The URL to open.
     * @param options Override default options passed to InAppBrowser.
     * @returns The opened window.
     */
    openInApp(url: string, options?: CoreUtilsOpenInAppOptions): InAppBrowserObject {
        options = options || {};
        options.usewkwebview = 'yes'; // Force WKWebView in iOS.
        options.enableViewPortScale = options.enableViewPortScale ?? 'yes'; // Enable zoom on iOS by default.
        options.allowInlineMediaPlayback = options.allowInlineMediaPlayback ?? 'yes'; // Allow playing inline videos in iOS.

        if (!options.location && CorePlatform.isIOS() && url.indexOf('file://') === 0) {
            // The URL uses file protocol, don't show it on iOS.
            // In Android we keep it because otherwise we lose the whole toolbar.
            options.location = 'no';
        }

        this.setInAppBrowserToolbarColors(options);

        this.iabInstance?.close(); // Close window if there is one already open, only allow one.

        this.iabInstance = InAppBrowser.create(url, '_blank', options);

        if (CorePlatform.isMobile()) {
            const loadStartUrls: string[] = [];

            const loadStartSubscription = this.iabInstance.on('loadstart').subscribe((event) => {
                NgZone.run(() => {
                    // Store the last loaded URLs (max 10).
                    loadStartUrls.push(event.url);
                    if (loadStartUrls.length > 10) {
                        loadStartUrls.shift();
                    }

                    CoreEvents.trigger(CoreEvents.IAB_LOAD_START, event);
                });
            });

            const loadStopSubscription = this.iabInstance.on('loadstop').subscribe((event) => {
                NgZone.run(() => {
                    CoreEvents.trigger(CoreEvents.IAB_LOAD_STOP, event);
                });
            });

            const messageSubscription = this.iabInstance.on('message').subscribe((event) => {
                NgZone.run(() => {
                    CoreEvents.trigger(CoreEvents.IAB_MESSAGE, event.data);
                });
            });

            const exitSubscription = this.iabInstance.on('exit').subscribe((event) => {
                NgZone.run(() => {
                    loadStartSubscription.unsubscribe();
                    loadStopSubscription.unsubscribe();
                    messageSubscription.unsubscribe();
                    exitSubscription.unsubscribe();

                    this.iabInstance = undefined;
                    CoreEvents.trigger(CoreEvents.IAB_EXIT, event);
                });
            });
        }

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.OPEN_LINK,
            link: CoreUrlUtils.unfixPluginfileURL(options.originalUrl ?? url),
        });

        return this.iabInstance;
    }

    /**
     * Given some IAB options, set the toolbar colors properties to the right values.
     *
     * @param options Options to change.
     * @returns Changed options.
     */
    protected setInAppBrowserToolbarColors(options: InAppBrowserOptions): InAppBrowserOptions {
        if (options.toolbarcolor) {
            // Color already set.
            return options;
        }

        // Color not set. Check if it needs to be changed automatically.
        let bgColor: string | undefined;
        let textColor: string | undefined;

        if (CoreConstants.CONFIG.iabToolbarColors === 'auto') {
            bgColor = CoreColors.getToolbarBackgroundColor();
        } else if (CoreConstants.CONFIG.iabToolbarColors && typeof CoreConstants.CONFIG.iabToolbarColors === 'object') {
            bgColor = CoreConstants.CONFIG.iabToolbarColors.background;
            textColor = CoreConstants.CONFIG.iabToolbarColors.text;
        }

        if (!bgColor) {
            // Use default color. In iOS, use black background color since the default is transparent and doesn't look good.
            options.locationcolor = '#000000';

            return options;
        }

        if (!textColor) {
            textColor = CoreColors.isWhiteContrastingBetter(bgColor) ? '#ffffff' : '#000000';
        }

        options.toolbarcolor = bgColor;
        options.closebuttoncolor = textColor;
        options.navigationbuttoncolor = textColor;
        options.locationcolor = bgColor;
        options.locationtextcolor = textColor;

        return options;
    }

    /**
     * Open a URL using a browser.
     * Do not use for files, refer to {@link CoreUtilsProvider.openFile}.
     *
     * @param url The URL to open.
     * @param options Options.
     */
    async openInBrowser(url: string, options: CoreUtilsOpenInBrowserOptions = {}): Promise<void> {
        // eslint-disable-next-line deprecation/deprecation
        const originaUrl = CoreUrlUtils.unfixPluginfileURL(options.originalUrl ?? options.browserWarningUrl ?? url);
        if (options.showBrowserWarning || options.showBrowserWarning === undefined) {
            try {
                await CoreWindow.confirmOpenBrowserIfNeeded(originaUrl);
            } catch {
                return; // Cancelled, stop.
            }
        }

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.OPEN_LINK,
            link: originaUrl,
        });

        window.open(url, '_system');
    }

    /**
     * Open an online file using platform specific method.
     * Specially useful for audio and video since they can be streamed.
     *
     * @param url The URL of the file.
     * @returns Promise resolved when opened.
     */
    async openOnlineFile(url: string): Promise<void> {
        if (CorePlatform.isAndroid()) {
            // In Android we need the mimetype to open it.
            const mimetype = await this.ignoreErrors(this.getMimeTypeFromUrl(url));

            if (!mimetype) {
                // Couldn't retrieve mimetype. Return error.
                throw new Error(Translate.instant('core.erroropenfilenoextension'));
            }

            const options = {
                action: WebIntent.ACTION_VIEW,
                url,
                type: mimetype,
            };

            try {
                await WebIntent.startActivity(options);

                CoreAnalytics.logEvent({
                    type: CoreAnalyticsEventType.OPEN_LINK,
                    link: CoreUrlUtils.unfixPluginfileURL(url),
                });

                return;
            } catch (error) {
                this.logger.error('Error opening online file ' + url + ' with mimetype ' + mimetype);
                this.logger.error('Error: ', JSON.stringify(error));

                throw new Error(Translate.instant('core.erroropenfilenoapp'));
            }
        }

        // In the rest of platforms we need to open them in InAppBrowser.
        this.openInApp(url);
    }

    /**
     * Converts an object into an array, losing the keys.
     *
     * @param obj Object to convert.
     * @returns Array with the values of the object but losing the keys.
     */
    objectToArray<T>(obj: Record<string, T>): T[] {
        return Object.keys(obj).map((key) => obj[key]);
    }

    /**
     * Converts an object into an array of objects, where each entry is an object containing
     * the key and value of the original object.
     * For example, it can convert {size: 2} into [{name: 'size', value: 2}].
     *
     * @param obj Object to convert.
     * @param keyName Name of the properties where to store the keys.
     * @param valueName Name of the properties where to store the values.
     * @param sortByKey True to sort keys alphabetically, false otherwise. Has priority over sortByValue.
     * @param sortByValue True to sort values alphabetically, false otherwise.
     * @returns Array of objects with the name & value of each property.
     */
    objectToArrayOfObjects<
        A extends Record<string,unknown> = Record<string, unknown>,
        O extends Record<string, unknown> = Record<string, unknown>
    >(
        obj: O,
        keyName: string,
        valueName: string,
        sortByKey?: boolean,
        sortByValue?: boolean,
    ): A[] {
        // Get the entries from an object or primitive value.
        const getEntries = (elKey: string, value: unknown): Record<string, unknown>[] | unknown => {
            if (value === undefined || value == null) {
                // Filter undefined and null values.
                return;
            } else if (this.isObject(value)) {
                // It's an object, return at least an entry for each property.
                const keys = Object.keys(value);
                let entries: unknown[] = [];

                keys.forEach((key) => {
                    const newElKey = elKey ? elKey + '[' + key + ']' : key;
                    const subEntries = getEntries(newElKey, value[key]);

                    if (subEntries) {
                        entries = entries.concat(subEntries);
                    }
                });

                return entries;
            } else {
                // Not an object, return a single entry.
                const entry = {};
                entry[keyName] = elKey;
                entry[valueName] = value;

                return entry;
            }
        };

        if (!obj) {
            return [];
        }

        // "obj" will always be an object, so "entries" will always be an array.
        const entries = getEntries('', obj) as A[];
        if (sortByKey || sortByValue) {
            return entries.sort((a, b) => {
                if (sortByKey) {
                    return (a[keyName] as number) >= (b[keyName] as number) ? 1 : -1;
                } else {
                    return (a[valueName] as number) >= (b[valueName] as number) ? 1 : -1;
                }
            });
        }

        return entries;
    }

    /**
     * Converts an array of objects into an object with key and value. The opposite of objectToArrayOfObjects.
     * For example, it can convert [{name: 'size', value: 2}] into {size: 2}.
     *
     * @param objects List of objects to convert.
     * @param keyName Name of the properties where the keys are stored.
     * @param valueName Name of the properties where the values are stored.
     * @param keyPrefix Key prefix if neededs to delete it.
     * @returns Object.
     */
    objectToKeyValueMap<T = unknown>(
        objects: Record<string, unknown>[],
        keyName: string,
        valueName: string,
        keyPrefix?: string,
    ): {[name: string]: T} {
        const prefixSubstr = keyPrefix ? keyPrefix.length : 0;
        const mapped = {};
        objects.forEach((item) => {
            const keyValue = item[keyName] as string;
            const key = prefixSubstr > 0 ? keyValue.substring(prefixSubstr) : keyValue;
            mapped[key] = item[valueName];
        });

        return mapped;
    }

    /**
     * Convert an object to a format of GET param. E.g.: {a: 1, b: 2} -> a=1&b=2
     *
     * @param object Object to convert.
     * @param removeEmpty Whether to remove params whose value is null/undefined.
     * @returns GET params.
     */
    objectToGetParams(object: Record<string, unknown>, removeEmpty: boolean = true): string {
        // First of all, flatten the object so all properties are in the first level.
        const flattened = this.flattenObject(object);
        let result = '';
        let joinChar = '';

        for (const name in flattened) {
            let value = flattened[name];

            if (removeEmpty && (value === null || value === undefined)) {
                continue;
            }

            if (typeof value == 'boolean') {
                value = value ? 1 : 0;
            }

            result += joinChar + name + '=' + value;
            joinChar = '&';
        }

        return result;
    }

    /**
     * Add a prefix to all the keys in an object.
     *
     * @param data Object.
     * @param prefix Prefix to add.
     * @returns Prefixed object.
     */
    prefixKeys(data: Record<string, unknown>, prefix: string): Record<string, unknown> {
        const newObj = {};
        const keys = Object.keys(data);

        keys.forEach((key) => {
            newObj[prefix + key] = data[key];
        });

        return newObj;
    }

    /**
     * Function to enumerate enum keys.
     *
     * @param enumeration Enumeration object.
     * @returns Keys of the enumeration.
     */
    enumKeys<O extends object, K extends keyof O = keyof O>(enumeration: O): K[] {
        return Object.keys(enumeration).filter(k => Number.isNaN(+k)) as K[];
    }

    /**
     * Given a promise, returns true if it's rejected or false if it's resolved.
     *
     * @param promise Promise to check
     * @returns Promise resolved with boolean: true if the promise is rejected or false if it's resolved.
     */
    async promiseFails(promise: Promise<unknown>): Promise<boolean> {
        try {
            await promise;

            return false;
        } catch {
            return true;
        }
    }

    /**
     * Given a promise, returns true if it's resolved or false if it's rejected.
     *
     * @param promise Promise to check
     * @returns Promise resolved with boolean: true if the promise it's resolved or false if it's rejected.
     */
    async promiseWorks(promise: Promise<unknown>): Promise<boolean> {
        try {
            await promise;

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Tests to see whether two arrays or objects have the same value at a particular key.
     * Missing values are replaced by '', and the values are compared with ===.
     * Booleans and numbers are cast to string before comparing.
     *
     * @param obj1 The first object or array.
     * @param obj2 The second object or array.
     * @param key Key to check.
     * @returns Whether the two objects/arrays have the same value (or lack of one) for a given key.
     */
    sameAtKeyMissingIsBlank(
        obj1: Record<string, unknown> | unknown[],
        obj2: Record<string, unknown> | unknown[],
        key: string,
    ): boolean {
        let value1 = obj1[key] !== undefined ? obj1[key] : '';
        let value2 = obj2[key] !== undefined ? obj2[key] : '';

        if (typeof value1 == 'number' || typeof value1 == 'boolean') {
            value1 = '' + value1;
        }
        if (typeof value2 == 'number' || typeof value2 == 'boolean') {
            value2 = '' + value2;
        }

        return value1 === value2;
    }

    /**
     * Stringify an object, sorting the properties. It doesn't sort arrays, only object properties. E.g.:
     * {b: 2, a: 1} -> '{"a":1,"b":2}'
     *
     * @param obj Object to stringify.
     * @returns Stringified object.
     */
    sortAndStringify(obj: Record<string, unknown>): string {
        return JSON.stringify(this.sortProperties(obj));
    }

    /**
     * Given an object, sort its properties and the properties of all the nested objects.
     *
     * @param obj The object to sort. If it isn't an object, the original value will be returned.
     * @returns Sorted object.
     */
    sortProperties<T>(obj: T): T {
        if (obj != null && typeof obj == 'object' && !Array.isArray(obj)) {
            // It's an object, sort it.
            return Object.keys(obj).sort().reduce((accumulator, key) => {
                // Always call sort with the value. If it isn't an object, the original value will be returned.
                accumulator[key] = this.sortProperties(obj[key]);

                return accumulator;
            }, {} as T);
        } else {
            return obj;
        }
    }

    /**
     * Given an object, sort its values. Values need to be primitive values, it cannot have subobjects.
     *
     * @param obj The object to sort. If it isn't an object, the original value will be returned.
     * @returns Sorted object.
     */
    sortValues<T>(obj: T): T {
        if (typeof obj == 'object' && !Array.isArray(obj)) {
            // It's an object, sort it. Convert it to an array to be able to sort it and then convert it back to object.
            const array = this.objectToArrayOfObjects(obj as Record<string, unknown>, 'name', 'value', false, true);

            return this.objectToKeyValueMap(array, 'name', 'value') as unknown as T;
        } else {
            return obj;
        }
    }

    /**
     * Set a timeout to a Promise. If the time passes before the Promise is resolved or rejected, it will be automatically
     * rejected.
     *
     * @param promise The promise to timeout.
     * @param time Number of milliseconds of the timeout.
     * @returns Promise with the timeout.
     */
    timeoutPromise<T>(promise: Promise<T>, time: number): Promise<T> {
        return new Promise((resolve, reject): void => {
            let timedOut = false;
            const resolveBeforeTimeout = (value: T) => {
                if (timedOut) {
                    return;
                }
                resolve(value);
            };
            const timeout = setTimeout(
                () => {
                    reject({ timeout: true });
                    timedOut = true;
                },
                time,
            );

            promise
                .then(resolveBeforeTimeout)
                .catch(reject)
                .finally(() => clearTimeout(timeout));
        });
    }

    /**
     * Converts locale specific floating point/comma number back to a standard float number.
     * Do NOT try to do any math operations before this conversion on any user submitted floats!
     * Based on Moodle's unformat_float function.
     *
     * @param localeFloat Locale aware float representation.
     * @param strict If true, then check the input and return false if it is not a valid number.
     * @returns False if bad format, empty string if empty value or the parsed float if not.
     */
    unformatFloat(localeFloat: string | number | null | undefined, strict?: boolean): false | '' | number {
        // Bad format on input type number.
        if (localeFloat === undefined) {
            return false;
        }

        // Empty (but not zero).
        if (localeFloat == null) {
            return '';
        }

        // Convert float to string.
        localeFloat = String(localeFloat);
        localeFloat = localeFloat.trim();

        if (localeFloat == '') {
            return '';
        }

        localeFloat = localeFloat.replace(' ', ''); // No spaces - those might be used as thousand separators.
        localeFloat = localeFloat.replace(Translate.instant('core.decsep'), '.');

        // Use Number instead of parseFloat because the latter truncates the number when it finds ",", while Number returns NaN.
        // If the number still has "," then it means it's not a valid separator.
        const parsedFloat = Number(localeFloat);

        // Bad format.
        if (strict && (!isFinite(parsedFloat) || isNaN(parsedFloat))) {
            return false;
        }

        return parsedFloat;
    }

    /**
     * Return an array without duplicate values.
     *
     * @param array The array to treat.
     * @param [key] Key of the property that must be unique. If not specified, the whole entry.
     * @returns Array without duplicate values.
     * @deprecated since 4.4. Use CoreArray.unique instead.
     */
    uniqueArray<T>(array: T[], key?: string): T[] {
        return CoreArray.unique(array, key);
    }

    /**
     * Debounce a function so consecutive calls are ignored until a certain time has passed since the last call.
     *
     * @param fn Function to debounce.
     * @param delay Time that must pass until the function is called.
     * @returns Debounced function.
     */
    debounce<T extends unknown[]>(fn: (...args: T) => unknown, delay: number): (...args: T) => void {
        let timeoutID: number;

        const debounced = (...args: T): void => {
            clearTimeout(timeoutID);

            timeoutID = window.setTimeout(() => fn.apply(null, args), delay);
        };

        return debounced;
    }

    /**
     * Throttle a function so consecutive calls are ignored until a certain time has passed since the last executed call.
     *
     * @param fn Function to throttle.
     * @param duration Time that must pass until the function is called.
     * @returns Throttled function.
     */
    throttle<T extends unknown[]>(fn: (...args: T) => unknown, duration: number): (...args: T) => void {
        let shouldWait = false;

        const throttled = (...args: T): void => {
            if (!shouldWait) {
                fn.apply(null, args);

                shouldWait = true;

                setTimeout(() => {
                    shouldWait = false;
                }, duration);
            }
        };

        return throttled;
    }

    /**
     * Check whether the app can scan QR codes.
     *
     * @returns Whether the app can scan QR codes.
     */
    canScanQR(): boolean {
        return CorePlatform.isMobile();
    }

    /**
     * Open a modal to scan a QR code.
     *
     * @param title Title of the modal. Defaults to "QR reader".
     * @returns Promise resolved with the captured text or undefined if cancelled or error.
     */
    async scanQR(title?: string): Promise<string | undefined> {
        const { CoreViewerQRScannerComponent } = await import('@features/viewer/components/qr-scanner/qr-scanner');

        return CoreDomUtils.openModal<string>({
            component: CoreViewerQRScannerComponent,
            cssClass: 'core-modal-fullscreen',
            componentProps: {
                title,
            },
        });
    }

    /**
     * Start scanning for a QR code.
     *
     * @returns Promise resolved with the QR string, rejected if error or cancelled.
     */
    async startScanQR(): Promise<string | undefined> {
        if (!CorePlatform.isMobile()) {
            return Promise.reject('QRScanner isn\'t available in browser.');
        }

        // Ask the user for permission to use the camera.
        // The scan method also does this, but since it returns an Observable we wouldn't be able to detect if the user denied.
        try {
            const status = await QRScanner.prepare();

            if (!status.authorized) {
                // No access to the camera, reject. In android this shouldn't happen, denying access passes through catch.
                throw new Error('The user denied camera access.');
            }

            if (this.qrScanData && this.qrScanData.deferred) {
                // Already scanning.
                return this.qrScanData.deferred;
            }

            // Start scanning.
            this.qrScanData = {
                deferred: new CorePromisedValue(),

                // When text is received, stop scanning and return the text.
                observable: QRScanner.scan().subscribe(text => this.stopScanQR(text, false)),
            };

            // Show the camera.
            try {
                await QRScanner.show();

                document.body.classList.add('core-scanning-qr');

                // Set color-scheme to 'normal', otherwise the camera isn't seen in Android.
                const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
                if (colorSchemeMeta) {
                    this.initialColorSchemeContent = colorSchemeMeta.getAttribute('content') || this.initialColorSchemeContent;
                    colorSchemeMeta.setAttribute('content', 'normal');
                }

                return this.qrScanData.deferred;
            } catch (e) {
                this.stopScanQR(e, true);

                throw e;
            }
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            error.message = error.message || (error as { _message?: string })._message;

            throw error;
        }
    }

    /**
     * Stop scanning for QR code. If no param is provided, the app will consider the user cancelled.
     *
     * @param data If success, the text of the QR code. If error, the error object or message. Undefined for cancelled.
     * @param error True if the data belongs to an error, false otherwise.
     */
    stopScanQR(data?: string | Error, error?: boolean): void {
        if (!this.qrScanData) {
            // Not scanning.
            return;
        }

        // Hide camera preview.
        document.body.classList.remove('core-scanning-qr');

        // Set color-scheme to the initial value.
        document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', this.initialColorSchemeContent);

        QRScanner.hide();
        QRScanner.destroy();

        this.qrScanData.observable.unsubscribe(); // Stop scanning.

        if (error) {
            this.qrScanData.deferred.reject(typeof data === 'string' ? new Error(data) : data);
        } else if (data !== undefined) {
            this.qrScanData.deferred.resolve(data as string);
        } else {
            this.qrScanData.deferred.reject(new CoreCanceledError());
        }

        delete this.qrScanData;
    }

    /**
     * Ignore errors from a promise.
     *
     * @param promise Promise to ignore errors.
     * @param fallback Value to return if the promise is rejected.
     * @returns Promise with ignored errors, resolving to the fallback result if provided.
     */
    async ignoreErrors<Result>(promise?: Promise<Result>): Promise<Result | undefined>;
    async ignoreErrors<Result, Fallback>(promise: Promise<Result>, fallback: Fallback): Promise<Result | Fallback>;
    async ignoreErrors<Result, Fallback>(promise?: Promise<Result>, fallback?: Fallback): Promise<Result | Fallback | undefined> {
        try {
            const result = await promise;

            return result;
        } catch {
            // Ignore errors.
            return fallback;
        }
    }

    /**
     * Wait some time.
     *
     * @param milliseconds Number of milliseconds to wait.
     * @returns Promise resolved after the time has passed.
     */
    wait(milliseconds: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    /**
     * Wait until a given condition is met.
     *
     * @param condition Condition.
     * @returns Cancellable promise.
     */
    waitFor(condition: () => boolean): CoreCancellablePromise<void>;
    waitFor(condition: () => boolean, options: CoreUtilsWaitOptions): CoreCancellablePromise<void>;
    waitFor(condition: () => boolean, interval: number): CoreCancellablePromise<void>;
    waitFor(condition: () => boolean, optionsOrInterval: CoreUtilsWaitOptions | number = {}): CoreCancellablePromise<void> {
        const options = typeof optionsOrInterval === 'number' ? { interval: optionsOrInterval } : optionsOrInterval;

        if (condition()) {
            return CoreCancellablePromise.resolve();
        }

        const startTime = Date.now();
        let intervalId: number | undefined;

        return new CoreCancellablePromise<void>(
            async (resolve) => {
                intervalId = window.setInterval(() => {
                    if (!condition() && (!options.timeout || (Date.now() - startTime < options.timeout))) {
                        return;
                    }

                    resolve();
                    window.clearInterval(intervalId);
                }, options.interval ?? 50);
            },
            () => window.clearInterval(intervalId),
        );
    }

    /**
     * Wait until the next tick.
     *
     * @returns Promise resolved when tick has been done.
     */
    nextTick(): Promise<void> {
        return this.wait(0);
    }

    /**
     * Wait until several next ticks.
     */
    async nextTicks(numTicks = 0): Promise<void> {
        for (let i = 0; i < numTicks; i++) {
            await this.wait(0);
        }
    }

    /**
     * Given some options, check if a file should be opened with showOpenWithDialog.
     *
     * @param options Options.
     * @returns Boolean.
     */
    shouldOpenWithDialog(options: CoreUtilsOpenFileOptions = {}): boolean {
        const openFileAction = options.iOSOpenFileAction ?? CoreConstants.CONFIG.iOSDefaultOpenFileAction;

        return CorePlatform.isIOS() && openFileAction == OpenFileAction.OPEN_WITH;
    }

}

export const CoreUtils = makeSingleton(CoreUtilsProvider);

/**
 * Data for each entry of executeOrderedPromises.
 */
export type OrderedPromiseData = {
    /**
     * Function to execute.
     */
    function: () => Promise<unknown>;

    /**
     * Whether the promise should block the following one.
     */
    blocking?: boolean;
};

/**
 * Data about a country.
 */
export type CoreCountry = {
    code: string;
    name: string;
};

/**
 * Menu item.
 */
export type CoreMenuItem<T = number> = {
    label: string;
    value: T | number;
};

/**
 * Options for opening a file.
 */
export type CoreUtilsOpenFileOptions = {
    iOSOpenFileAction?: OpenFileAction; // Action to do when opening a file.
};

/**
 * Options for opening in browser.
 */
export type CoreUtilsOpenInBrowserOptions = {
    showBrowserWarning?: boolean; // Whether to display a warning before opening in browser. Defaults to true.
    originalUrl?: string; // Original URL to open (in case the URL was treated, e.g. to add a token or an auto-login).
    /**
     * @deprecated since 4.3. Use originalUrl instead.
     */
    browserWarningUrl?: string;
};

/**
 * Options for opening in InAppBrowser.
 */
export type CoreUtilsOpenInAppOptions = InAppBrowserOptions & {
    originalUrl?: string; // Original URL to open (in case the URL was treated, e.g. to add a token or an auto-login).
};

/**
 * Options for waiting.
 */
export type CoreUtilsWaitOptions = {
    interval?: number;
    timeout?: number;
};

/**
 * Possible default picker actions.
 */
export enum OpenFileAction {
    OPEN = 'open',
    OPEN_WITH = 'open-with',
}
