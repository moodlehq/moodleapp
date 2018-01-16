// (C) Copyright 2015 Martin Dougiamas
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
import { Platform } from 'ionic-angular';
import { Observable } from 'rxjs';
import { InAppBrowser, InAppBrowserObject } from '@ionic-native/in-app-browser';
import { Clipboard } from '@ionic-native/clipboard';
import { CoreAppProvider } from '../app';
import { CoreDomUtilsProvider } from './dom';
import { CoreEventsProvider } from '../events';
import { CoreLoggerProvider } from '../logger';
import { TranslateService } from '@ngx-translate/core';
import { CoreLangProvider } from '../lang';

/**
 * Deferred promise. It's similar to the result of $q.defer() in AngularJS.
 */
export interface PromiseDefer {
    /**
     * The promise.
     * @type {Promise<any>}
     */
    promise?: Promise<any>;

    /**
     * Function to resolve the promise.
     *
     * @param {any} [value] The resolve value.
     */
    resolve?: (value?: any) => void; // Function to resolve the promise.

    /**
     * Function to reject the promise.
     *
     * @param {any} [reason] The reject param.
     */
    reject?: (reason?: any) => void;
}

/*
 * "Utils" service with helper functions.
 */
@Injectable()
export class CoreUtilsProvider {
    protected logger;
    protected iabInstance: InAppBrowserObject;

    constructor(private iab: InAppBrowser, private appProvider: CoreAppProvider, private clipboard: Clipboard,
            private domUtils: CoreDomUtilsProvider, logger: CoreLoggerProvider, private translate: TranslateService,
            private platform: Platform, private langProvider: CoreLangProvider, private eventsProvider: CoreEventsProvider) {
        this.logger = logger.getInstance('CoreUtilsProvider');
    }

    /**
     * Similar to Promise.all, but if a promise fails this function's promise won't be rejected until ALL promises have finished.
     *
     * @param {Promise<any>[]} promises Promises.
     * @return {Promise<any>} Promise resolved if all promises are resolved and rejected if at least 1 promise fails.
     */
    allPromises(promises: Promise<any>[]): Promise<any> {
        if (!promises || !promises.length) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            let count = 0,
                total = promises.length,
                error;

            promises.forEach((promise) => {
                promise.catch((err) => {
                    error = err;
                }).finally(() => {
                    count++;

                    if (count === total) {
                        // All promises have finished, reject/resolve.
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    }
                });
            });
        });
    }

    /**
     * Converts an array of objects to an object, using a property of each entry as the key.
     * E.g. [{id: 10, name: 'A'}, {id: 11, name: 'B'}] => {10: {id: 10, name: 'A'}, 11: {id: 11, name: 'B'}}
     *
     * @param {any[]} array The array to convert.
     * @param {string} propertyName The name of the property to use as the key.
     * @param {any} [result] Object where to put the properties. If not defined, a new object will be created.
     * @return {any} The object.
     */
    arrayToObject(array: any[], propertyName: string, result?: any) : any {
        result = result || {};
        array.forEach((entry) => {
            result[entry[propertyName]] = entry;
        });
        return result;
    }

    /**
     * Compare two objects. This function won't compare functions and proto properties, it's a basic compare.
     * Also, this will only check if itemA's properties are in itemB with same value. This function will still
     * return true if itemB has more properties than itemA.
     *
     * @param {any} itemA First object.
     * @param {any} itemB Second object.
     * @param {number} [maxLevels=0] Number of levels to reach if 2 objects are compared.
     * @param {number} [level=0] Current deep level (when comparing objects).
     * @param {boolean} [undefinedIsNull=true] True if undefined is equal to null. Defaults to true.
     * @return {boolean} Whether both items are equal.
     */
    basicLeftCompare(itemA: any, itemB: any, maxLevels = 0, level = 0, undefinedIsNull = true) : boolean {
        if (typeof itemA == 'function' || typeof itemB == 'function') {
            return true; // Don't compare functions.
        } else if (typeof itemA == 'object' && typeof itemB == 'object') {
            if (level >= maxLevels) {
                return true; // Max deep reached.
            }

            let equal = true;
            for (let name in itemA) {
                let value = itemA[name];
                if (name == '$$hashKey') {
                    // Ignore $$hashKey property since it's a "calculated" property.
                    return;
                }

                if (!this.basicLeftCompare(value, itemB[name], maxLevels, level + 1)) {
                    equal = false;
                }
            }

            return equal;
        } else {
            if (undefinedIsNull && (
                    (typeof itemA == 'undefined' && itemB === null) || (itemA === null && typeof itemB == 'undefined'))) {
                return true;
            }

            // We'll treat "2" and 2 as the same value.
            let floatA = parseFloat(itemA),
                floatB = parseFloat(itemB);

            if (!isNaN(floatA) && !isNaN(floatB)) {
                return floatA == floatB;
            }
            return itemA === itemB;
        }
    }

    /**
     * Blocks leaving a view. This function should be used in views that want to perform a certain action before
     * leaving (usually, ask the user if he wants to leave because some data isn't saved).
     *
     * @param  {Object} scope         View's scope.
     * @param  {Function} canLeaveFn  Function called when the user wants to leave the view. Must return a promise
     *                                resolved if the view should be left, rejected if the user should stay in the view.
     * @param  {Object} [currentView] Current view. Defaults to $ionicHistory.currentView().
     * @return {Object}               Object with:
     *                                       -back: Original back function.
     *                                       -unblock: Function to unblock. It is called automatically when scope is destroyed.
     */
    blockLeaveView = function(scope, canLeaveFn, currentView) {
        // @todo
        // currentView = currentView || $ionicHistory.currentView();

        // var unregisterHardwareBack,
        //     leaving = false,
        //     hasSplitView = $ionicPlatform.isTablet() && $state.current.name.split('.').length == 3,
        //     skipSplitViewLeave = false;

        // // Override Ionic's back button behavior.
        // $rootScope.$ionicGoBack = goBack;

        // // Override Android's back button. We set a priority of 101 to override the "Return to previous view" action.
        // unregisterHardwareBack = $ionicPlatform.registerBackButtonAction(goBack, 101);

        // // Add function to the stack.
        // backFunctionsStack.push(goBack);

        // if (hasSplitView) {
        //     // Block split view.
        //     blockSplitView(true);
        // }

        // scope.$on('$destroy', unblock);

        // return {
        //     back: originalBackFunction,
        //     unblock: unblock
        // };

        // // Function called when the user wants to leave the view.
        // function goBack() {
        //     // Check that we're leaving the current view, since the user can navigate to other views from here.
        //     if ($ionicHistory.currentView() !== currentView) {
        //         // It's another view.
        //         originalBackFunction();
        //         return;
        //     }

        //     if (leaving) {
        //         // Leave view pending, don't call again.
        //         return;
        //     }
        //     leaving = true;

        //     canLeaveFn().then(function() {
        //         // User confirmed to leave or there was no need to confirm, go back.
        //         // Skip next leave view from split view if there's one since we already checked if user can leave.
        //         skipSplitViewLeave = hasSplitView;
        //         originalBackFunction();
        //     }).finally(function() {
        //         leaving = false;
        //     });
        // }

        // // Leaving current view when it's in split view.
        // function leaveViewInSplitView() {
        //     if (skipSplitViewLeave) {
        //         skipSplitViewLeave = false;
        //         return $q.when();
        //     }

        //     return canLeaveFn();
        // }

        // // Restore original back functions.
        // function unblock() {
        //     unregisterHardwareBack();

        //     if (hasSplitView) {
        //         // Unblock split view.
        //         blockSplitView(false);
        //     }

        //     // Remove function from the stack.
        //     var position = backFunctionsStack.indexOf(goBack);
        //     if (position > -1) {
        //         backFunctionsStack.splice(position, 1);
        //     }

        //     // Revert go back only if it hasn't been overridden by another view.
        //     if ($rootScope.$ionicGoBack === goBack) {
        //         if (!backFunctionsStack.length) {
        //             // Shouldn't happen. Reset stack.
        //             backFunctionsStack = [originalBackFunction];
        //             $rootScope.$ionicGoBack = originalBackFunction;
        //         } else {
        //             $rootScope.$ionicGoBack = backFunctionsStack[backFunctionsStack.length - 1];
        //         }
        //     }
        // }

        // // Block or unblock split view.
        // function blockSplitView(block) {
        //     $rootScope.$broadcast(mmCoreSplitViewBlock, {
        //         block: block,
        //         blockFunction: leaveViewInSplitView,
        //         state: currentView.stateName,
        //         stateParams: currentView.stateParams
        //     });
        // }
    }

    /**
     * Close the InAppBrowser window.
     *
     * @param {boolean} [closeAll] Desktop only. True to close all secondary windows, false to close only the "current" one.
     */
    closeInAppBrowser(closeAll?: boolean) : void {
        if (this.iabInstance) {
            this.iabInstance.close();
            if (closeAll && this.appProvider.isDesktop()) {
                require('electron').ipcRenderer.send('closeSecondaryWindows');
            }
        }
    }

    /**
     * Clone a variable. It should be an object, array or primitive type.
     *
     * @param {any} source The variable to clone.
     * @return {any} Cloned variable.
     */
    clone(source: any) : any {
        if (Array.isArray(source)) {
            // Clone the array and all the entries.
            let newArray = [];
            for (let i = 0; i < source.length; i++) {
                newArray[i] = this.clone(source[i]);
            }
            return newArray;
        } else if (typeof source == 'object') {
            // Clone the object and all the subproperties.
            let newObject = {};
            for (let name in source) {
                newObject[name] = this.clone(source[name]);
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
     * @param {any} from Object to copy the properties from.
     * @param {any} to Object where to store the properties.
     * @param {boolean} [clone=true] Whether the properties should be cloned (so they are different instances).
     */
    copyProperties(from: any, to: any, clone = true) : void {
        for (let name in from) {
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
     * @param {string} text Text to be copied
     * @return {Promise<any>} Promise resolved when text is copied.
     */
    copyToClipboard(text: string) : Promise<any> {
        return this.clipboard.copy(text).then(() => {
            // Show toast using ionicLoading.
            return this.domUtils.showToast('core.copiedtoclipboard', true);
        }).catch(() => {
            // Ignore errors.
        });
    }

    /**
     * Empties an array without losing its reference.
     *
     * @param {any[]} array Array to empty.
     */
    emptyArray(array: any[]) : void {
        array.length = 0; // Empty array without losing its reference.
    }

    /**
     * Removes all properties from an object without losing its reference.
     *
     * @param {object} object Object to remove the properties.
     */
    emptyObject(object: object) : void {
        for (let key in object) {
            if (object.hasOwnProperty(key)) {
                delete object[key];
            }
        }
    }

    /**
     * Execute promises one depending on the previous.
     *
     * @param {any[]} orderedPromisesData Data to be executed including the following values:
     *                                 - func: Function to be executed.
     *                                 - context: Context to pass to the function. This allows using "this" inside the function.
     *                                 - params: Array of data to be sent to the function.
     *                                 - blocking: Boolean. If promise should block the following.
     * @return {Promise<any>} Promise resolved when all promises are resolved.
     */
    executeOrderedPromises(orderedPromisesData: any[]) : Promise<any> {
        let promises = [],
            dependency = Promise.resolve();

        // Execute all the processes in order.
        for (let i in orderedPromisesData) {
            let data = orderedPromisesData[i],
                promise;

            // Add the process to the dependency stack.
            promise = dependency.finally(() => {
                let prom;

                try {
                    prom = data.func.apply(data.context, data.params || []);
                } catch (e) {
                    this.logger.error(e.message);
                    return;
                }
                return prom;
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
     * Flatten an object, moving subobjects' properties to the first level using dot notation. E.g.:
     * {a: {b: 1, c: 2}, d: 3} -> {'a.b': 1, 'a.c': 2, d: 3}
     *
     * @param {object} obj Object to flatten.
     * @return {object} Flatten object.
     */
    flattenObject(obj: object) : object {
        let toReturn = {};

        for (let name in obj) {
            if (!obj.hasOwnProperty(name)) continue;

            let value = obj[name];
            if (typeof value == 'object' && !Array.isArray(value)) {
                let flatObject = this.flattenObject(value);
                for (let subName in flatObject) {
                    if (!flatObject.hasOwnProperty(subName)) continue;

                    toReturn[name + '.' + subName] = flatObject[subName];
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
     * @param {string[]} array Array to filter.
     * @param {RegExp} regex RegExp to apply to each string.
     * @return {string[]} Filtered array.
     */
    filterByRegexp(array: string[], regex: RegExp) : string[] {
        if (!array || !array.length) {
            return [];
        }

        return array.filter((entry) => {
            let matches = entry.match(regex);
            return matches && matches.length;
        });
    }

    /**
     * Filter the list of site IDs based on a isEnabled function.
     *
     * @param {string[]} siteIds Site IDs to filter.
     * @param {Function} isEnabledFn Function to call for each site. Must return true or a promise resolved with true if enabled.
     *                    It receives a siteId param and all the params sent to this function after 'checkAll'.
     * @param {boolean} [checkAll] True if it should check all the sites, false if it should check only 1 and treat them all
     *                   depending on this result.
     * @param {any} ...args All the params sent after checkAll will be passed to isEnabledFn.
     * @return {Promise<string[]>} Promise resolved with the list of enabled sites.
     */
    filterEnabledSites(siteIds: string[], isEnabledFn: Function, checkAll?: boolean, ...args) : Promise<string[]> {
        let promises = [],
            enabledSites = [];

        for (let i in siteIds) {
            let siteId = siteIds[i];
            if (checkAll || !promises.length) {
                promises.push(Promise.resolve(isEnabledFn.apply(isEnabledFn, [siteId].concat(args))).then((enabled) => {
                    if (enabled) {
                        enabledSites.push(siteId);
                    }
                }));
            }
        }

        return this.allPromises(promises).catch(() => {
            // Ignore errors.
        }).then(() => {
            if (!checkAll) {
                // Checking 1 was enough, so it will either return all the sites or none.
                return enabledSites.length ? siteIds : [];
            } else {
                return enabledSites;
            }
        });
    }

    /**
     * Given a float, prints it nicely. Localized floats must not be used in calculations!
     * Based on Moodle's format_float.
     *
     * @param {any} float The float to print.
     * @return {string} Locale float.
     */
    formatFloat(float: any) : string {
        if (typeof float == 'undefined') {
            return '';
        }

        let localeSeparator = this.translate.instant('core.decsep');

        // Convert float to string.
        float += '';
        return float.replace('.', localeSeparator);
    }

    /**
     * Returns a tree formatted from a plain list.
     * List has to be sorted by depth to allow this function to work correctly. Errors can be thrown if a child node is
     * processed before a parent node.
     *
     * @param {any[]} list List to format.
     * @param {string} [parentFieldName=parent] Name of the parent field to match with children.
     * @param {string} [idFieldName=id] Name of the children field to match with parent.
     * @param {number} [rootParentId=0] The id of the root.
     * @param {number} [maxDepth=5] Max Depth to convert to tree. Children found will be in the last level of depth.
     * @return {any[]} Array with the formatted tree, children will be on each node under children field.
     */
    formatTree(list: any[], parentFieldName = 'parent', idFieldName = 'id', rootParentId = 0, maxDepth = 5) : any[] {
        let map = {},
            mapDepth = {},
            parent,
            id,
            tree = [];

        list.forEach((node, index) => {
            id = node[idFieldName];
            parent = node[parentFieldName];
            node.children = [];

            // Use map to look-up the parents.
            map[id] = index;
            if (parent != rootParentId) {
                let parentNode = list[map[parent]];
                if (parentNode) {
                    if (mapDepth[parent] == maxDepth) {
                        // Reached max level of depth. Proceed with flat order. Find parent object of the current node.
                        let parentOfParent = parentNode[parentFieldName];
                        if (parentOfParent) {
                            // This element will be the child of the node that is two levels up the hierarchy
                            // (i.e. the child of node.parent.parent).
                            list[map[parentOfParent]].children.push(node);
                            // Assign depth level to the same depth as the parent (i.e. max depth level).
                            mapDepth[id] = mapDepth[parent];
                            // Change the parent to be the one that is two levels up the hierarchy.
                            node.parent = parentOfParent;
                        }
                    } else {
                        parentNode.children.push(node);
                        // Increase the depth level.
                        mapDepth[id] = mapDepth[parent] + 1;
                    }
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
     * @param {string} code Country code (AF, ES, US, ...).
     * @return {string} Country name. If the country is not found, return the country code.
     */
    getCountryName(code: string) : string {
        let countryKey = 'assets.countries.' + code,
            countryName = this.translate.instant(countryKey);

        return countryName !== countryKey ? countryName : code;
    }

    /**
     * Get list of countries with their code and translated name.
     *
     * @return {Promise<any>} Promise resolved with the list of countries.
     */
    getCountryList() : Promise<any> {
        // Get the current language.
        return this.langProvider.getCurrentLanguage().then((lang) => {
            // Get the full list of translations. Create a promise to convert the observable into a promise.
            return new Promise((resolve, reject) => {
                let observer = this.translate.getTranslation(lang).subscribe((table) => {
                    resolve(table);
                    observer.unsubscribe();
                }, (err) => {
                    reject(err);
                    observer.unsubscribe();
                });
            });
        }).then((table) => {
            let countries = {};

            for (let name in table) {
                if (name.indexOf('assets.countries.') === 0) {
                    let code = name.replace('assets.countries.', '');
                    countries[code] = table[name];
                }
            }

            return countries;
        });
    }

    /**
     * Given a list of files, check if there are repeated names.
     *
     * @param {any[]} files List of files.
     * @return {string|boolean} String with error message if repeated, false if no repeated.
     */
    hasRepeatedFilenames(files: any[]) : string|boolean {
        if (!files || !files.length) {
            return false;
        }

        let names = [];

        // Check if there are 2 files with the same name.
        for (let i = 0; i < files.length; i++) {
            let name = files[i].filename || files[i].name;
            if (names.indexOf(name) > -1) {
                return this.translate.instant('core.filenameexist', {$a: name});
            } else {
                names.push(name);
            }
        }

        return false;
    }

    /**
     * Gets the index of the first string that matches a regular expression.
     *
     * @param {string[]} array Array to search.
     * @param {RegExp} regex RegExp to apply to each string.
     * @return {number} Index of the first string that matches the RegExp. -1 if not found.
     */
    indexOfRegexp(array: string[], regex: RegExp) : number {
        if (!array || !array.length) {
            return -1;
        }

        for (let i = 0; i < array.length; i++) {
            let entry = array[i],
                matches = entry.match(regex);

            if (matches && matches.length) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Return true if the param is false (bool), 0 (number) or "0" (string).
     *
     * @param {any} value Value to check.
     * @return {boolean} Whether the value is false, 0 or "0".
     */
    isFalseOrZero(value: any) : boolean {
        return typeof value != 'undefined' && (value === false || value === "false" || parseInt(value, 10) === 0);
    }

    /**
     * Return true if the param is true (bool), 1 (number) or "1" (string).
     *
     * @param {any} value Value to check.
     * @return {boolean} Whether the value is true, 1 or "1".
     */
    isTrueOrOne(value: any) : boolean {
        return typeof value != 'undefined' && (value === true || value === "true" || parseInt(value, 10) === 1);
    }

    /**
     * Given an error returned by a WS call, check if the error is generated by the app or it has been returned by the WebSwervice.
     *
     * @param {string} error Error to check.
     * @return {boolean} Whether the error was returned by the WebService.
     */
    isWebServiceError(error: string) : boolean {
        let localErrors = [
            this.translate.instant('core.wsfunctionnotavailable'),
            this.translate.instant('core.lostconnection'),
            this.translate.instant('core.userdeleted'),
            this.translate.instant('core.unexpectederror'),
            this.translate.instant('core.networkerrormsg'),
            this.translate.instant('core.serverconnection'),
            this.translate.instant('core.errorinvalidresponse'),
            this.translate.instant('core.sitemaintenance'),
            this.translate.instant('core.upgraderunning'),
            this.translate.instant('core.nopasswordchangeforced'),
            this.translate.instant('core.unicodenotsupported')
        ];
        return error && localErrors.indexOf(error) == -1;
    }

    /**
     * Merge two arrays, removing duplicate values.
     *
     * @param {any[]} array1 The first array.
     * @param {any[]} array2 The second array.
     * @param [key] Key of the property that must be unique. If not specified, the whole entry.
     * @return {any[]} Merged array.
     */
    mergeArraysWithoutDuplicates(array1: any[], array2: any[], key?: string) : any[] {
        return this.uniqueArray(array1.concat(array2), key);
    }

    /**
     * Open a file using platform specific method.
     *
     * node-webkit: Using the default application configured.
     * Android: Using the WebIntent plugin.
     * iOs: Using handleDocumentWithURL.
     *
     * @param {string} path The local path of the file to be open.
     * @return {Promise<any>} Promise resolved when done.
     */
    openFile(path: string) : Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.appProvider.isDesktop()) {
                // It's a desktop app, send an event so the file is opened. It has to be done with an event
                // because opening the file from here (renderer process) doesn't focus the opened app.
                // Use sendSync so we can receive the result.
                if (require('electron').ipcRenderer.sendSync('openItem', path)) {
                    resolve();
                } else {
                    reject(this.translate.instant('core.erroropenfilenoapp'));
                }
            } else if ((<any>window).plugins) {
                // @todo
                reject('TODO');

                // var extension = $mmFS.getFileExtension(path),
                //     mimetype = $mmFS.getMimeType(extension);

                // if (ionic.Platform.isAndroid() && window.plugins.webintent) {
                //     var iParams = {
                //         action: "android.intent.action.VIEW",
                //         url: path,
                //         type: mimetype
                //     };

                //     window.plugins.webintent.startActivity(
                //         iParams,
                //         function() {
                //             $log.debug('Intent launched');
                //             deferred.resolve();
                //         },
                //         function() {
                //             $log.debug('Intent launching failed.');
                //             $log.debug('action: ' + iParams.action);
                //             $log.debug('url: ' + iParams.url);
                //             $log.debug('type: ' + iParams.type);

                //             if (!extension || extension.indexOf('/') > -1 || extension.indexOf('\\') > -1) {
                //                 // Extension not found.
                //                 $mmLang.translateAndRejectDeferred(deferred, 'core.erroropenfilenoextension');
                //             } else {
                //                 $mmLang.translateAndRejectDeferred(deferred, 'core.erroropenfilenoapp');
                //             }
                //         }
                //     );

                // } else if (ionic.Platform.isIOS() && typeof handleDocumentWithURL == 'function') {

                //     $mmFS.getBasePath().then(function(fsRoot) {
                //         // Encode/decode the specific file path, note that a path may contain directories
                //         // with white spaces, special characters...
                //         if (path.indexOf(fsRoot > -1)) {
                //             path = path.replace(fsRoot, "");
                //             path = encodeURIComponent($mmText.decodeURIComponent(path));
                //             path = fsRoot + path;
                //         }

                //         handleDocumentWithURL(
                //             function() {
                //                 $log.debug('File opened with handleDocumentWithURL' + path);
                //                 deferred.resolve();
                //             },
                //             function(error) {
                //                 $log.debug('Error opening with handleDocumentWithURL' + path);
                //                 if(error == 53) {
                //                     $log.error('No app that handles this file type.');
                //                 }
                //                 self.openInBrowser(path);
                //                 deferred.resolve();
                //             },
                //             path
                //         );
                //     }, deferred.reject);
                // } else {
                //     // Last try, launch the file with the browser.
                //     this.openInBrowser(path);
                //     resolve();
                // }
            } else {
                // Changing _blank for _system may work in cordova 2.4 and onwards.
                this.logger.log('Opening external file using window.open()');
                window.open(path, '_blank');
                resolve();
            }
        });
    }

    /**
     * Open a URL using InAppBrowser.
     * Do not use for files, refer to {@link openFile}.
     *
     * @param {string} url The URL to open.
     * @param {any} [options] Override default options passed to InAppBrowser.
     * @return {InAppBrowserObject} The opened window.
     */
    openInApp(url: string, options?: any) : InAppBrowserObject {
        if (!url) {
            return;
        }

        options = options || {};

        if (!options.enableViewPortScale) {
            options.enableViewPortScale = 'yes'; // Enable zoom on iOS.
        }

        if (!options.location && this.platform.is('ios') && url.indexOf('file://') === 0) {
            // The URL uses file protocol, don't show it on iOS.
            // In Android we keep it because otherwise we lose the whole toolbar.
            options.location = 'no';
        }

        // Convert the options to a string.
        let optionsArray = [],
            optionsString;
        for (let name in options) {
            optionsArray.push(`${name}=${options[name]}`)
        }
        optionsString = optionsArray.join(',');

        this.iabInstance = this.iab.create(url, '_blank', options);

        if (this.appProvider.isDesktop() || this.appProvider.isMobile()) {
            // Trigger global events when a url is loaded or the window is closed. This is to make it work like in Ionic 1.
            let loadStartSubscription = this.iabInstance.on('loadstart').subscribe((event) => {
                this.eventsProvider.trigger(CoreEventsProvider.IAB_LOAD_START, event);
            });
            let exitSubscription = this.iabInstance.on('exit').subscribe((event) => {
                loadStartSubscription.unsubscribe();
                exitSubscription.unsubscribe();
                this.eventsProvider.trigger(CoreEventsProvider.IAB_EXIT, event);
            });
        }

        return this.iabInstance;
    }

    /**
     * Open a URL using a browser.
     * Do not use for files, refer to {@link openFile}.
     *
     * @param {string} url The URL to open.
     */
    openInBrowser(url: string) : void {
        if (this.appProvider.isDesktop()) {
            // It's a desktop app, use Electron shell library to open the browser.
            let shell = require('electron').shell;
            if (!shell.openExternal(url)) {
                // Open browser failed, open a new window in the app.
                window.open(url, '_system');
            }
        } else {
            window.open(url, '_system');
        }
    }

    /**
     * Open an online file using platform specific method.
     * Specially useful for audio and video since they can be streamed.
     *
     * node-webkit: Using the default application configured.
     * Android: Using the WebIntent plugin.
     * iOS: Using the window.open method (InAppBrowser)
     *      We don't use iOS quickview framework because it doesn't support streaming.
     *
     * @param {string} url The URL of the file.
     * @return {Promise<void>} Promise resolved when opened.
     */
    openOnlineFile(url: string) : Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // @todo
            reject('TODO');
            // if (ionic.Platform.isAndroid() && window.plugins && window.plugins.webintent) {
            //     // In Android we need the mimetype to open it.
            //     var iParams;

            //     self.getMimeTypeFromUrl(url).catch(function() {
            //         // Error getting mimetype, return undefined.
            //     }).then(function(mimetype) {
            //         if (!mimetype) {
            //             // Couldn't retrieve mimetype. Return error.
            //             $mmLang.translateAndRejectDeferred(deferred, 'core.erroropenfilenoextension');
            //             return;
            //         }

            //         iParams = {
            //             action: "android.intent.action.VIEW",
            //             url: url,
            //             type: mimetype
            //         };

            //         window.plugins.webintent.startActivity(
            //             iParams,
            //             function() {
            //                 $log.debug('Intent launched');
            //                 deferred.resolve();
            //             },
            //             function() {
            //                 $log.debug('Intent launching failed.');
            //                 $log.debug('action: ' + iParams.action);
            //                 $log.debug('url: ' + iParams.url);
            //                 $log.debug('type: ' + iParams.type);

            //                 $mmLang.translateAndRejectDeferred(deferred, 'core.erroropenfilenoapp');
            //             }
            //         );
            //     });
            // } else {
            //     this.logger.log('Opening remote file using window.open()');
            //     window.open(url, '_blank');
            //     resolve();
            // }
        });
    }

    /**
     * Converts an object into an array, losing the keys.
     *
     * @param {object} obj Object to convert.
     * @return {any[]} Array with the values of the object but losing the keys.
     */
    objectToArray(obj: object) : any[] {
        return Object.keys(obj).map((key) => {
            return obj[key];
        });
    }

    /**
     * Converts an object into an array of objects, where each entry is an object containing
     * the key and value of the original object.
     * For example, it can convert {size: 2} into [{name: 'size', value: 2}].
     *
     * @param {object} obj Object to convert.
     * @param {string} keyName Name of the properties where to store the keys.
     * @param {string} valueName Name of the properties where to store the values.
     * @param {boolean} [sort] True to sort keys alphabetically, false otherwise.
     * @return {object[]} Array of objects with the name & value of each property.
     */
    objectToArrayOfObjects(obj: object, keyName: string, valueName: string, sort?: boolean) : object[] {
        // Get the entries from an object or primitive value.
        let getEntries = (elKey, value) => {
            if (typeof value == 'object') {
                // It's an object, return at least an entry for each property.
                let keys = Object.keys(value),
                    entries = [];

                keys.forEach((key) => {
                    let newElKey = elKey ? elKey + '[' + key + ']' : key;
                    entries = entries.concat(getEntries(newElKey, value[key]));
                });

                return entries;
            } else {
                // Not an object, return a single entry.
                let entry = {};
                entry[keyName] = elKey;
                entry[valueName] = value;
                return entry;
            }
        };

        if (!obj) {
            return [];
        }

        // "obj" will always be an object, so "entries" will always be an array.
        let entries = <any[]> getEntries('', obj);
        if (sort) {
            return entries.sort((a, b) => {
                return a.name >= b.name ? 1 : -1;
            });
        }
        return entries;
    }

    /**
     * Converts an array of objects into an object with key and value. The opposite of objectToArrayOfObjects.
     * For example, it can convert [{name: 'size', value: 2}] into {size: 2}.
     *
     * @param {object[]} objects List of objects to convert.
     * @param {string} keyName Name of the properties where the keys are stored.
     * @param {string} valueName Name of the properties where the values are stored.
     * @param [keyPrefix] Key prefix if neededs to delete it.
     * @return {object} Object.
     */
    objectToKeyValueMap(objects: object[], keyName: string, valueName: string, keyPrefix?: string) : object {
        let prefixSubstr = keyPrefix ? keyPrefix.length : 0,
            mapped = {};
        objects.forEach((item) => {
            let key = prefixSubstr > 0 ? item[keyName].substr(prefixSubstr) : item[keyName];
            mapped[key] = item[valueName];
        });
        return mapped;
    }

    /**
     * Given an observable, convert it to a Promise that will resolve with the first received value.
     *
     * @param {Observable<any>} obs The observable to convert.
     * @return {Promise<any>} Promise.
     */
    observableToPromise(obs: Observable<any>) : Promise<any> {
        return new Promise((resolve, reject) => {
            let subscription = obs.subscribe((data) => {
                // Data received, unsubscribe.
                subscription.unsubscribe();
                resolve(data);
            }, (error) => {
                // Data received, unsubscribe.
                subscription.unsubscribe();
                reject(error);
            });
        });
    }

    /**
     * Similar to AngularJS $q.defer().
     *
     * @return {PromiseDefer} The deferred promise.
     */
    promiseDefer() : PromiseDefer {
        let deferred: PromiseDefer = {};
        deferred.promise = new Promise((resolve, reject) => {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });
        return deferred;
    }

    /**
     * Given a promise, returns true if it's rejected or false if it's resolved.
     *
     * @param {Promise<any>} promise Promise to check
     * @return {Promise<boolean>} Promise resolved with boolean: true if the promise is rejected or false if it's resolved.
     */
    promiseFails(promise: Promise<any>) : Promise<boolean> {
        return promise.then(() => {
            return false;
        }).catch(() => {
            return true;
        });
    }

    /**
     * Given a promise, returns true if it's resolved or false if it's rejected.
     *
     * @param {Promise<any>} promise Promise to check
     * @return {Promise<boolean>} Promise resolved with boolean: true if the promise it's resolved or false if it's rejected.
     */
    promiseWorks(promise: Promise<any>) : Promise<boolean> {
        return promise.then(() => {
            return true;
        }).catch(() => {
            return false;
        });
    }

    /**
     * Tests to see whether two arrays or objects have the same value at a particular key.
     * Missing values are replaced by '', and the values are compared with ===.
     * Booleans and numbers are cast to string before comparing.
     *
     * @param {any} obj1 The first object or array.
     * @param {any} obj2 The second object or array.
     * @param {string} key Key to check.
     * @return {boolean} Whether the two objects/arrays have the same value (or lack of one) for a given key.
     */
    sameAtKeyMissingIsBlank(obj1: any, obj2: any, key: string) : boolean {
        let value1 = typeof obj1[key] != 'undefined' ? obj1[key] : '',
            value2 = typeof obj2[key] != 'undefined' ? obj2[key] : '';

        if (typeof value1 == 'number' || typeof value1 == 'boolean') {
            value1 = '' + value1;
        }
        if (typeof value2 == 'number' || typeof value2 == 'boolean') {
            value2 = '' + value2;
        }
        return value1 === value2;
    }

    /**
     * Stringify an object, sorting the properties. It doesn't sort arrays, only object properties. E.g.:
     * {b: 2, a: 1} -> '{"a":1,"b":2}'
     *
     * @param {object} obj Object to stringify.
     * @return {string} Stringified object.
     */
    sortAndStringify(obj: object) : string {
        return JSON.stringify(this.sortProperties(obj));
    }

    /**
     * Given an object, sort its properties and the properties of all the nested objects.
     *
     * @param {object} obj The object to sort. If it isn't an object, the original value will be returned.
     * @return {object} Sorted object.
     */
    sortProperties(obj: object) : object {
        if (typeof obj == 'object' && !Array.isArray(obj)) {
            // It's an object, sort it.
            return Object.keys(obj).sort().reduce((accumulator, key) => {
                // Always call sort with the value. If it isn't an object, the original value will be returned.
                accumulator[key] = this.sortProperties(obj[key]);
                return accumulator;
            }, {});
        } else {
            return obj;
        }
    }

    /**
     * Sum the filesizes from a list of files checking if the size will be partial or totally calculated.
     *
     * @param {any[]} files List of files to sum its filesize.
     * @return {{size: number, total: boolean}} File size and a boolean to indicate if it is the total size or only partial.
     */
    sumFileSizes(files: any[]) : {size: number, total: boolean} {
        let result = {
            size: 0,
            total: true
        };

        files.forEach((file) => {
            if (typeof file.filesize == 'undefined') {
                // We don't have the file size, cannot calculate its total size.
                result.total = false;
            } else {
                result.size += file.filesize;
            }
        });

        return result;
    }

    /**
     * Converts locale specific floating point/comma number back to standard PHP float value.
     * Do NOT try to do any math operations before this conversion on any user submitted floats!
     * Based on Moodle's unformat_float function.
     *
     * @param {any} localeFloat Locale aware float representation.
     * @return {any} False if bad format, empty string if empty value or the parsed float if not.
     */
    unformatFloat(localeFloat: any) : any {
        // Bad format on input type number.
        if (typeof localeFloat == "undefined") {
            return false;
        }

        // Empty (but not zero).
        if (localeFloat == null) {
            return '';
        }

        // Convert float to string.
        localeFloat += '';
        localeFloat = localeFloat.trim();

        if (localeFloat == '') {
            return '';
        }

        let localeSeparator = this.translate.instant('core.decsep');

        localeFloat = localeFloat.replace(' ', ''); // No spaces - those might be used as thousand separators.
        localeFloat = localeFloat.replace(localeSeparator, '.');

        localeFloat = parseFloat(localeFloat);
        // Bad format.
        if (isNaN(localeFloat)) {
            return false;
        }
        return localeFloat;
    }

    /**
     * Return an array without duplicate values.
     *
     * @param {any[]} array The array to treat.
     * @param [key] Key of the property that must be unique. If not specified, the whole entry.
     * @return {any[]} Array without duplicate values.
     */
    uniqueArray(array: any[], key?: string) : any[] {
        let filtered = [],
            unique = [],
            len = array.length;

        for (let i = 0; i < len; i++) {
            let entry = array[i],
                value = key ? entry[key] : entry;

            if (unique.indexOf(value) == -1) {
                unique.push(value);
                filtered.push(entry);
            }
        }

        return filtered;
    }
}
