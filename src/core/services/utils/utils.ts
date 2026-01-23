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
import { InAppBrowserObject } from '@awesome-cordova-plugins/in-app-browser';
import { FileEntry } from '@awesome-cordova-plugins/file/ngx';
import { CoreFileUtils } from '@singletons/file-utils';
import { CoreRedirects } from '@singletons/redirects';
import { CoreMimetype } from '@singletons/mimetype';
import { makeSingleton } from '@singletons';
import { CoreFileEntry } from '@services/file-helper';
import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { CoreArray } from '@singletons/array';
import { CoreText } from '@singletons/text';
import { CoreWait, CoreWaitOptions } from '@singletons/wait';
import { CoreQRScan } from '@services/qrscan';
import { CoreErrorHelper } from '@services/error-helper';
import { CorePromiseUtils, OrderedPromiseData } from '@singletons/promise-utils';
import { CoreOpener, CoreOpenerOpenFileOptions, CoreOpenerOpenInBrowserOptions } from '@singletons/opener';
import { CoreCountries, CoreCountry } from '@singletons/countries';
import { CoreObject } from '@singletons/object';
import { CoreSites } from '@services/sites';
import { CoreMenuItem, CoreUtils as CoreUtilsSingleton, TreeNode } from '@singletons/utils';
import { CoreWSError } from '@classes/errors/wserror';

/**
 * "Utils" service with helper functions.
 *
 * @deprecated since 5.0. See deprecation notice of each for help.
 */
@Injectable({ providedIn: 'root' })
export class CoreUtilsProvider {

    /**
     * Given an error, add an extra warning to the error message and return the new error message.
     *
     * @param error Error object or message.
     * @param defaultError Message to show if the error is not a string.
     * @returns New error message.
     * @deprecated since 5.0. Use CoreErrorHelper.addDataNotDownloadedError instead.
     */
    addDataNotDownloadedError(error: Error | string, defaultError?: string): string {
        return CoreErrorHelper.addDataNotDownloadedError(error, defaultError);
    }

    /**
     * Similar to Promise.all, but if a promise fails this function's promise won't be rejected until ALL promises have finished.
     *
     * @param promises Promises.
     * @deprecated since 5.0. Use CorePromiseUtils.allPromises instead.
     */
    async allPromises(promises: Promise<unknown>[]): Promise<void> {
        await CorePromiseUtils.allPromises(promises);
    }

    /**
     * Combination of allPromises and ignoreErrors functions.
     *
     * @param promises Promises.
     * @deprecated since 5.0. Use CorePromiseUtils.allPromisesIgnoringErrors instead.
     */
    async allPromisesIgnoringErrors(promises: Promise<unknown>[]): Promise<void> {
        await CorePromiseUtils.allPromisesIgnoringErrors(promises);
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
     * @deprecated since 5.0. Use CoreArray.toObject instead.
     */
    arrayToObject<T>(
        array: T[] = [],
        propertyName?: string,
        result: Record<string, T> = {},
    ): Record<string, T> {
        return CoreArray.toObject(array, propertyName, result);
    }

    /**
     * Log an unhandled error.
     *
     * @param message Message to contextualize the error.
     * @param error Error to log.
     * @deprecated since 5.0. Use CoreErrorHelper.logUnhandledError instead.
     */
    logUnhandledError(message: string, error: unknown): void {
        CoreErrorHelper.logUnhandledError(message, error);
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
     * @deprecated since 5.0. Use CoreArray.toObjectMultiple instead.
     */
    arrayToObjectMultiple<T>(
        array: T[] = [],
        propertyName?: string,
        result: Record<string, T[]> = {},
    ): Record<string, T[]> {
        return CoreArray.toObjectMultiple(array, propertyName, result);
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
     * @deprecated since 5.0. Use CoreObject.basicLeftCompare instead.
     */
    basicLeftCompare(
        itemA: any, // eslint-disable-line @typescript-eslint/no-explicit-any
        itemB: any, // eslint-disable-line @typescript-eslint/no-explicit-any
        maxLevels: number = 0,
        level: number = 0,
        undefinedIsNull: boolean = true,
    ): boolean {
        return CoreObject.basicLeftCompare(itemA, itemB, maxLevels, level, undefinedIsNull);
    }

    /**
     * Check if a URL has a redirect.
     *
     * @param url The URL to check.
     * @returns Promise resolved with boolean_ whether there is a redirect.
     * @deprecated since 5.0. Use CoreRedirects.checkRedirect instead.
     */
    async checkRedirect(url: string): Promise<boolean> {
        return CoreRedirects.checkRedirect(url);
    }

    /**
     * Close the InAppBrowser window.
     *
     * @deprecated since 5.0. Use CoreOpener.closeInAppBrowser instead.
     */
    closeInAppBrowser(): void {
        CoreOpener.closeInAppBrowser();
    }

    /**
     * Get inapp browser instance (if any).
     *
     * @returns IAB instance, undefined if not open.
     * @deprecated since 5.0. Use CoreOpener.getInAppBrowserInstance instead.
     */
    getInAppBrowserInstance(): InAppBrowserObject | undefined  {
        return CoreOpener.getInAppBrowserInstance();
    }

    /**
     * Check if inapp browser is open.
     *
     * @returns Whether it's open.
     * @deprecated since 5.0. Use CoreOpener.isInAppBrowserOpen instead.
     */
    isInAppBrowserOpen(): boolean {
        return CoreOpener.isInAppBrowserOpen();
    }

    /**
     * Clone a variable. It should be an object, array or primitive type.
     *
     * @param source The variable to clone.
     * @param level Depth we are right now inside a cloned object. It's used to prevent reaching max call stack size.
     * @returns Cloned variable.
     * @deprecated since 5.0. Use CoreUtils.clone instead.
     */
    clone<T>(source: T, level: number = 0): T {
        return CoreUtilsSingleton.clone(source, level);
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
                to[name] = CoreUtilsSingleton.clone(from[name]);
            } else {
                to[name] = from[name];
            }
        }
    }

    /**
     * Copies a text to clipboard and shows a toast message.
     *
     * @param text Text to be copied
     * @returns Promise resolved when the text is copied.
     *
     * @deprecated since 4.5 Use CoreText.copyToClipboard instead.
     */
    async copyToClipboard(text: string): Promise<void> {
        return CoreText.copyToClipboard(text);
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
     * @deprecated since 5.0 Use CorePromiseUtils.executeOrderedPromises instead.
     */
    async executeOrderedPromises(orderedPromisesData: OrderedPromiseData[]): Promise<void> {
        await CorePromiseUtils.executeOrderedPromises(orderedPromisesData);
    }

    /**
     * Flatten an object, moving subobjects' properties to the first level.
     * It supports 2 notations: dot notation and square brackets.
     * E.g.: {a: {b: 1, c: 2}, d: 3} -> {'a.b': 1, 'a.c': 2, d: 3}
     *
     * @param obj Object to flatten.
     * @param useDotNotation Whether to use dot notation '.' or square brackets '['.
     * @returns Flattened object.
     * @deprecated since 5.0. Use CoreObject.flatten instead.
     */
    flattenObject(obj: Record<string, unknown>, useDotNotation?: boolean): Record<string, unknown> {
        return CoreObject.flatten(obj, useDotNotation);
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
     * @deprecated since 5.0. Use CoreSites.filterEnabledSites instead.
     */
    async filterEnabledSites<P extends unknown[]>(
        siteIds: string[],
        isEnabledFn: (siteId: string, ...args: P) => boolean | Promise<boolean>,
        checkAll?: boolean,
        ...args: P
    ): Promise<string[]> {
        return CoreSites.filterEnabledSites(siteIds, isEnabledFn, checkAll, ...args);
    }

    /**
     * Given a float, prints it nicely. Localized floats must not be used in calculations!
     * Based on Moodle's format_float.
     *
     * @param float The float to print.
     * @returns Locale float.
     * @deprecated since 5.0. Use CoreUtils.formatFloat on singletons instead.
     */
    formatFloat(float: unknown): string {
        return CoreUtilsSingleton.formatFloat(float);
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
     * @deprecated since 5.0. Use CoreUtils.formatTree on singletons instead.
     */
    formatTree<T>(
        list: T[],
        parentFieldName: string = 'parent',
        idFieldName: string = 'id',
        rootParentId: number = 0,
        maxDepth: number = 5,
    ): TreeNode<T>[] {
        return CoreUtilsSingleton.formatTree(list, parentFieldName, idFieldName, rootParentId, maxDepth);
    }

    /**
     * Get country name based on country code.
     *
     * @param code Country code (AF, ES, US, ...).
     * @returns Country name. If the country is not found, return the country code.
     * @deprecated since 5.0. Use CoreCountries.getCountryName instead.
     */
    getCountryName(code: string): string {
        return CoreCountries.getCountryName(code);
    }

    /**
     * Get list of countries with their code and translated name.
     *
     * @returns Promise resolved with the list of countries.
     * @deprecated since 5.0. Use CoreCountries.getCountryList instead.
     */
    async getCountryList(): Promise<Record<string, string>> {
        return CoreCountries.getCountryList();
    }

    /**
     * Get list of countries with their code and translated name. Sorted by the name of the country.
     *
     * @returns Promise resolved with the list of countries.
     * @deprecated since 5.0. Use CoreCountries.getCountryListSorted instead.
     */
    async getCountryListSorted(): Promise<CoreCountry[]> {
        return CoreCountries.getCountryListSorted();
    }

    /**
     * Get the mimetype of a file given its URL. It'll try to guess it using the URL, if that fails then it'll
     * perform a HEAD request to get it. It's done in this order because pluginfile.php can return wrong mimetypes.
     * This function is in here instead of MimetypeUtils to prevent circular dependencies.
     *
     * @param url The URL of the file.
     * @returns Promise resolved with the mimetype.
     * @deprecated since 5.0. Use CoreMimetype.getMimeTypeFromUrl instead.
     */
    async getMimeTypeFromUrl(url: string): Promise<string> {
        return CoreMimetype.getMimeTypeFromUrl(url);
    }

    /**
     * Get a unique ID for a certain name.
     *
     * @param name The name to get the ID for.
     * @returns Unique ID.
     * @deprecated since 5.0. Use CoreUtils.getUniqueId singleton instead.
     */
    getUniqueId(name: string): number {
        return CoreUtilsSingleton.getUniqueId(name);
    }

    /**
     * Check if a file is a FileEntry
     *
     * @param file File.
     * @returns Type guard indicating if the file is a FileEntry.
     * @deprecated since 5.0. Use CoreFile.isFileEntry singleton instead.
     */
    isFileEntry(file: CoreFileEntry): file is FileEntry {
        return CoreFileUtils.isFileEntry(file);
    }

    /**
     * Check if an unknown value is a FileEntry.
     *
     * @param file Object to check.
     * @returns Type guard indicating if the file is a FileEntry.
     * @deprecated since 5.0. Use CoreFile.valueIsFileEntry singleton instead.
     */
    valueIsFileEntry(file: unknown): file is FileEntry {
        return CoreFileUtils.valueIsFileEntry(file);
    }

    /**
     * Check if a value is an object.
     *
     * @param object Variable.
     * @returns Type guard indicating if this is an object.
     * @deprecated since 5.0. Use CoreObject.isObject instead.
     */
    isObject(object: unknown): object is Record<string, unknown> {
        return CoreObject.isObject(object);
    }

    /**
     * Given a list of files, check if there are repeated names.
     *
     * @param files List of files.
     * @returns String with error message if repeated, false if no repeated.
     * @deprecated since 5.0. Use CoreFileUtils.hasRepeatedFilenames instead.
     */
    hasRepeatedFilenames(files: CoreFileEntry[]): string | false {
        return CoreFileUtils.hasRepeatedFilenames(files);
    }

    /**
     * Gets the index of the first string that matches a regular expression.
     *
     * @param array Array to search.
     * @param regex RegExp to apply to each string.
     * @returns Index of the first string that matches the RegExp. -1 if not found.
     * @deprecated since 4.4. Use CoreArray.indexOfRegexp instead.
     */
    indexOfRegexp(array: string[], regex: RegExp): number {
        return CoreArray.indexOfRegexp(array, regex);
    }

    /**
     * Return true if the param is false (bool), 0 (number) or "0" (string).
     *
     * @param value Value to check.
     * @returns Whether the value is false, 0 or "0".
     * @deprecated since 5.0. Use CoreUtils.isFalseOrZero singleton instead.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isFalseOrZero(value: any): boolean {
        return CoreUtilsSingleton.isFalseOrZero(value);
    }

    /**
     * Return true if the param is true (bool), 1 (number) or "1" (string).
     *
     * @param value Value to check.
     * @returns Whether the value is true, 1 or "1".
     * @deprecated since 5.0. Use CoreUtils.isTrueOrOne singleton instead.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isTrueOrOne(value: any): boolean {
        return CoreUtilsSingleton.isTrueOrOne(value);
    }

    /**
     * Given an error returned by a WS call, check if the error is generated by the app or it has been returned by the WebService.
     *
     * @param error Error to check.
     * @returns Whether the error was returned by the WebService.
     * @deprecated since 5.0. Use CoreWSError.isWebServiceError instead.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isWebServiceError(error: any): boolean {
        return CoreWSError.isWebServiceError(error);
    }

    /**
     * Given an error returned by a WS call, check if the error is a token expired error.
     *
     * @param error Error to check.
     * @returns Whether the error is a token expired error.
     * @deprecated since 5.0. Use CoreWSError.isExpiredTokenError instead.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isExpiredTokenError(error: any): boolean {
        return CoreWSError.isExpiredTokenError(error);
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
     * @deprecated since 5.0. Use CoreUtils.makeMenuFromList singleton instead.
     */
    makeMenuFromList<T>(
        list: string,
        defaultLabel?: string,
        separator: string = ',',
        defaultValue?: T,
    ): CoreMenuItem<T>[] {
        return CoreUtilsSingleton.makeMenuFromList(list, defaultLabel, separator, defaultValue);
    }

    /**
     * Merge two arrays, removing duplicate values.
     *
     * @param array1 The first array.
     * @param array2 The second array.
     * @param [key] Key of the property that must be unique. If not specified, the whole entry.
     * @returns Merged array.
     * @deprecated since 5.0. Use CoreArray.mergeWithoutDuplicates instead.
     */
    mergeArraysWithoutDuplicates<T>(array1: T[], array2: T[], key?: string): T[] {
        return CoreArray.mergeWithoutDuplicates(array1, array2, key);
    }

    /**
     * Check if a value isn't null or undefined.
     *
     * @param value Value to check.
     * @returns True if not null and not undefined.
     * @deprecated since 5.0. Will be removed in future versions.
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
     * @deprecated since 5.0. Use CoreOpener.openFile instead.
     */
    async openFile(path: string, options: CoreOpenerOpenFileOptions = {}): Promise<void> {
        await CoreOpener.openFile(path, options);
    }

    /**
     * Open a URL using InAppBrowser.
     * Do not use for files, refer to {@link CoreOpener.openFile}.
     *
     * @param url The URL to open.
     * @param options Override default options passed to InAppBrowser.
     * @returns The opened window.
     *
     * @deprecated since 5.0. Use CoreOpener.openInApp instead.
     */
    openInApp(url: string, options?: CoreOpenerOpenFileOptions): InAppBrowserObject {
        return CoreOpener.openInApp(url, options);
    }

    /**
     * Open a URL using a browser.
     *
     * @param url The URL to open.
     * @param options Options.
     * @deprecated since 5.0. Use CoreOpener.openInBrowser instead.
     */
    async openInBrowser(url: string, options: CoreOpenerOpenInBrowserOptions = {}): Promise<void> {
        await CoreOpener.openInBrowser(url, options);
    }

    /**
     * Open an online file using platform specific method.
     * Specially useful for audio and video since they can be streamed.
     *
     * @param url The URL of the file.
     * @deprecated since 5.0. Use CoreOpener.openOnlineFile instead.
     */
    async openOnlineFile(url: string): Promise<void> {
        await CoreOpener.openOnlineFile(url);
    }

    /**
     * Converts an object into an array, losing the keys.
     *
     * @param obj Object to convert.
     * @returns Array with the values of the object but losing the keys.
     * @deprecated since 5.0. Use CoreObject.toArray instead.
     */
    objectToArray<T>(obj: Record<string, T>): T[] {
        return CoreObject.toArray(obj);
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
     * @deprecated since 5.0. Use CoreObject.toArrayOfObjects instead.
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
        return CoreObject.toArrayOfObjects(obj, keyName, valueName, sortByKey, sortByValue);
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
     * @deprecated since 5.0. Use CoreObject.toKeyValueMap instead.
     */
    objectToKeyValueMap<T = unknown>(
        objects: Record<string, unknown>[],
        keyName: string,
        valueName: string,
        keyPrefix?: string,
    ): {[name: string]: T} {
        return CoreObject.toKeyValueMap(objects, keyName, valueName, keyPrefix);
    }

    /**
     * Convert an object to a format of GET param. E.g.: {a: 1, b: 2} -> a=1&b=2
     *
     * @param object Object to convert.
     * @param removeEmpty Whether to remove params whose value is null/undefined.
     * @returns GET params.
     * @deprecated since 5.0. Use CoreObject.toGetParams instead.
     */
    objectToGetParams(object: Record<string, unknown>, removeEmpty: boolean = true): string {
        return CoreObject.toGetParams(object, removeEmpty);
    }

    /**
     * Add a prefix to all the keys in an object.
     *
     * @param data Object.
     * @param prefix Prefix to add.
     * @returns Prefixed object.
     * @deprecated since 5.0. Use CoreObject.prefixKeys instead.
     */
    prefixKeys(data: Record<string, unknown>, prefix: string): Record<string, unknown> {
        return CoreObject.prefixKeys(data, prefix);
    }

    /**
     * Function to enumerate enum keys.
     *
     * @param enumeration Enumeration object.
     * @returns Keys of the enumeration.
     * @deprecated since 5.0. Use CoreObject.enumKeys instead.
     */
    enumKeys<O extends object, K extends keyof O = keyof O>(enumeration: O): K[] {
        return CoreObject.enumKeys(enumeration);
    }

    /**
     * Given a promise, returns true if it's rejected or false if it's resolved.
     *
     * @param promise Promise to check
     * @returns Promise resolved with boolean: true if the promise is rejected or false if it's resolved.
     * @deprecated since 5.0. Use CorePromiseUtils.promiseFails instead.
     */
    async promiseFails(promise: Promise<unknown>): Promise<boolean> {
        return CorePromiseUtils.promiseFails(promise);
    }

    /**
     * Given a promise, returns true if it's resolved or false if it's rejected.
     *
     * @param promise Promise to check
     * @returns Promise resolved with boolean: true if the promise it's resolved or false if it's rejected.
     * @deprecated since 5.0. Use CorePromiseUtils.promiseWorks instead.
     */
    async promiseWorks(promise: Promise<unknown>): Promise<boolean> {
        return CorePromiseUtils.promiseWorks(promise);
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
     * @deprecated since 5.0. Use CoreObject.sameAtKeyMissingIsBlank instead.
     */
    sameAtKeyMissingIsBlank(
        obj1: Record<string, unknown> | unknown[],
        obj2: Record<string, unknown> | unknown[],
        key: string,
    ): boolean {
        return CoreObject.sameAtKeyMissingIsBlank(obj1, obj2, key);
    }

    /**
     * Stringify an object, sorting the properties. It doesn't sort arrays, only object properties. E.g.:
     * {b: 2, a: 1} -> '{"a":1,"b":2}'
     *
     * @param obj Object to stringify.
     * @returns Stringified object.
     * @deprecated since 5.0. Use CoreObject.sortAndStringify instead.
     */
    sortAndStringify(obj: Record<string, unknown>): string {
        return CoreObject.sortAndStringify(obj);

    }

    /**
     * Given an object, sort its properties and the properties of all the nested objects.
     *
     * @param obj The object to sort. If it isn't an object, the original value will be returned.
     * @returns Sorted object.
     * @deprecated since 5.0. Use CoreObject.sortProperties instead.
     */
    sortProperties<T>(obj: T): T {
        return CoreObject.sortProperties(obj);
    }

    /**
     * Given an object, sort its values. Values need to be primitive values, it cannot have subobjects.
     *
     * @param obj The object to sort. If it isn't an object, the original value will be returned.
     * @returns Sorted object.
     * @deprecated since 5.0. Use CoreObject.sortValues instead.
     */
    sortValues<T>(obj: T): T {
        return CoreObject.sortValues(obj);
    }

    /**
     * Set a timeout to a Promise. If the time passes before the Promise is resolved or rejected, it will be automatically
     * rejected.
     *
     * @param promise The promise to timeout.
     * @param time Number of milliseconds of the timeout.
     * @returns Promise with the timeout.
     * @deprecated since 5.0. Use CorePromiseUtils.timeoutPromise instead.
     */
    timeoutPromise<T>(promise: Promise<T>, time: number): Promise<T> {
        return CorePromiseUtils.timeoutPromise(promise, time);
    }

    /**
     * Converts locale specific floating point/comma number back to a standard float number.
     * Do NOT try to do any math operations before this conversion on any user submitted floats!
     * Based on Moodle's unformat_float function.
     *
     * @param localeFloat Locale aware float representation.
     * @param strict If true, then check the input and return false if it is not a valid number.
     * @returns False if bad format, empty string if empty value or the parsed float if not.
     * @deprecated since 5.0. Use CoreUtils.unformatFloat on singletons instead.
     */
    unformatFloat(localeFloat: string | number | null | undefined, strict?: boolean): false | '' | number {
        return CoreUtilsSingleton.unformatFloat(localeFloat, strict);
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
     * @deprecated since 5.0. Use CoreUtils.debounce on singletons instead.
     */
    debounce<T extends unknown[]>(fn: (...args: T) => unknown, delay: number): (...args: T) => void {
        return CoreUtilsSingleton.debounce(fn, delay);
    }

    /**
     * Throttle a function so consecutive calls are ignored until a certain time has passed since the last executed call.
     *
     * @param fn Function to throttle.
     * @param duration Time that must pass until the function is called.
     * @returns Throttled function.
     * @deprecated since 5.0. Use CoreUtils.throttle on singletons instead.
     */
    throttle<T extends unknown[]>(fn: (...args: T) => unknown, duration: number): (...args: T) => void {
        return CoreUtilsSingleton.throttle(fn, duration);
    }

    /**
     * Check whether the app can scan QR codes.
     *
     * @returns Whether the app can scan QR codes.
     *
     * @deprecated since 4.5. Use CoreQRScan.canScanQR instead.
     */
    canScanQR(): boolean {
        return CoreQRScan.canScanQR();
    }

    /**
     * Open a modal to scan a QR code.
     *
     * @param title Title of the modal. Defaults to "QR reader".
     * @returns Promise resolved with the captured text or undefined if cancelled or error.
     *
     * @deprecated since 4.5. Use CoreQRScan.scanQR instead.
     */
    async scanQR(title?: string): Promise<string | undefined> {
        return CoreQRScan.scanQR(title);
    }

    /**
     * Start scanning for a QR code.
     *
     * @returns Promise resolved with the QR string, rejected if error or cancelled.
     *
     * @deprecated since 4.5. Use CoreQRScan.startScanQR instead.
     */
    async startScanQR(): Promise<string | undefined> {
        return CoreQRScan.startScanQR();
    }

    /**
     * Stop scanning for QR code. If no param is provided, the app will consider the user cancelled.
     *
     * @param data If success, the text of the QR code. If error, the error object or message. Undefined for cancelled.
     * @param error True if the data belongs to an error, false otherwise.
     *
     * @deprecated since 4.5. Use CoreQRScan.stopScanQR instead.
     */
    stopScanQR(data?: string | Error, error?: boolean): void {
        CoreQRScan.stopScanQR(data, error);
    }

    /**
     * Ignore errors from a promise.
     *
     * @param promise Promise to ignore errors.
     * @param fallback Value to return if the promise is rejected.
     * @returns Promise with ignored errors, resolving to the fallback result if provided.
     * @deprecated since 5.0. Use CorePromiseUtils.ignoreErrors instead.
     */
    async ignoreErrors<Result>(promise?: Promise<Result>): Promise<Result | undefined>;
    async ignoreErrors<Result, Fallback>(promise: Promise<Result>, fallback: Fallback): Promise<Result | Fallback>;
    async ignoreErrors<Result, Fallback>(promise?: Promise<Result>, fallback?: Fallback): Promise<Result | Fallback | undefined> {
        if(promise) {
            return CorePromiseUtils.ignoreErrors(promise, fallback);
        }

        return CorePromiseUtils.ignoreErrors(promise);
    }

    /**
     * Wait some time.
     *
     * @param milliseconds Number of milliseconds to wait.
     * @deprecated since 4.5. Use CoreWait.wait instead.
     */
    async wait(milliseconds: number): Promise<void> {
        await CoreWait.wait(milliseconds);
    }

    /**
     * Wait until a given condition is met.
     *
     * @param condition Condition.
     * @returns Cancellable promise.
     * @deprecated since 4.5. Use CoreWait.waitFor instead.
     */
    waitFor(condition: () => boolean): CoreCancellablePromise<void>;
    waitFor(condition: () => boolean, options: CoreWaitOptions): CoreCancellablePromise<void>;
    waitFor(condition: () => boolean, interval: number): CoreCancellablePromise<void>;
    waitFor(condition: () => boolean, optionsOrInterval: CoreWaitOptions | number = {}): CoreCancellablePromise<void> {
        const options = typeof optionsOrInterval === 'number' ? { interval: optionsOrInterval } : optionsOrInterval;

        return CoreWait.waitFor(condition, options);
    }

    /**
     * Wait until the next tick.
     *
     * @deprecated since 4.5. Use CoreWait.nextTick instead.
     */
    async nextTick(): Promise<void> {
        await CoreWait.nextTick();
    }

    /**
     * Wait until several next ticks.
     *
     * @param numTicks Number of ticks to wait.
     * @deprecated since 4.5. Use CoreWait.nextTicks instead.
     */
    async nextTicks(numTicks = 0): Promise<void> {
        await CoreWait.nextTicks(numTicks);
    }

    /**
     * Given some options, check if a file should be opened with showOpenWithDialog.
     *
     * @param options Options.
     * @returns Boolean.
     * @deprecated since 5.0. Use CoreOpener.shouldOpenWithDialog instead.
     */
    shouldOpenWithDialog(options: CoreOpenerOpenFileOptions = {}): boolean {
        return CoreOpener.shouldOpenWithDialog(options);
    }

}
/**
 * @deprecated since 5.0. Use CoreUtils on singleton instead.
 */
// eslint-disable-next-line @typescript-eslint/no-deprecated
export const CoreUtils = makeSingleton(CoreUtilsProvider);
