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

angular.module('mm.addons.mod_data')

/**
 * Delegate to register database fields handlers.
 *
 * @module mm.addons.mod_data
 * @ngdoc service
 * @name $mmaModDataFieldsDelegate
 * @description
 *
 * Delegate to register database fields handlers.
 * You can use this service to register your own fields handlers to be used in a database.
 *
 * To register a handler:
 *
 * $mmaModDataFieldsDelegate.registerHandler('mmaYourAddon', 'pluginType', 'handlerName');
 *
 * Please take into account that this delegate belongs to an addon so it might not be available in custom apps.
 * We recommend using $mmAddonManager to inject this delegate to avoid errors.
 *
 * Example:
 *
 * .run(function($mmAddonManager) {
 *     var $mmaModDataFieldsDelegate = $mmAddonManager.get('$mmaModDataFieldsDelegate');
 *     if ($mmaModDataFieldsDelegate) {
 *         $mmaModDataFieldsDelegate.registerHandler('mmaModDataFieldText', 'text', '$mmaModDataFieldTextHandler');
 *     }
 * });
 *
 * @see $mmaModDataFieldsDelegate#registerHandler to see the methods your handle needs to implement.
 */
.factory('$mmaModDataFieldsDelegate', function($log, $mmSite, $mmUtil, $q) {
    $log = $log.getInstance('$mmaModDataFieldsDelegate');

    var handlers = {},
        enabledHandlers = {},
        self = {},
        lastUpdateHandlersStart;

    /**
     * Get the handler for a certain field plugin.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataFieldsDelegate#getPluginHandler
     * @param  {String} pluginType Type of the plugin.
     * @return {Object}            Handler. Undefined if no handler found for the plugin.
     */
    self.getPluginHandler = function(pluginType) {
        if (typeof enabledHandlers[pluginType] != 'undefined') {
            return enabledHandlers[pluginType];
        }
    };

    /**
     * Get database data in the input data to search.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataFieldsDelegate#getFieldSearchData
     * @param  {Object} field      Defines the field to be rendered.
     * @param  {Object} inputData  Data entered in the search form.
     * @return {Array}             Name and data field.
     */
    self.getFieldSearchData = function(field, inputData) {
        var handler = self.getPluginHandler(field.type);
        if (handler && handler.getFieldSearchData) {
            return handler.getFieldSearchData(field, inputData);
        }
        return false;
    };

    /**
     * Get database data in the input data to add or update entry.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataFieldsDelegate#getFieldEditData
     * @param  {Object} field               Defines the field to be rendered.
     * @param  {Object} inputData           Data entered in the search form.
     * @param  {Object} originalFieldData   Original field entered data.
     * @return {Array}                      Name and data field.
     */
    self.getFieldEditData = function(field, inputData, originalFieldData) {
        var handler = self.getPluginHandler(field.type);
        if (handler && handler.getFieldEditData) {
            return handler.getFieldEditData(field, inputData, originalFieldData);
        }
        return false;
    };

    /**
     * Get database data in the input files to add or update entry.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataFieldsDelegate#getFieldEditFiles
     * @param  {Object} field               Defines the field to be rendered.
     * @param  {Object} inputData           Data entered in the search form.
     * @param  {Object} originalFieldData   Original field entered data.
     * @return {Array}                      Name and data field.
     */
    self.getFieldEditFiles = function(field, inputData, originalFieldData) {
        var handler = self.getPluginHandler(field.type);
        if (handler && handler.getFieldEditFiles) {
            return handler.getFieldEditFiles(field, inputData, originalFieldData);
        }
        return [];
    };

    /**
     * Check if field type manage files or not.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataFieldsDelegate#hasFiles
     * @param  {Object} field  Defines the field to be checked.
     * @return {Boolean}       If the field type manages files.
     */
    self.hasFiles = function(field) {
        var handler = self.getPluginHandler(field.type);
        return handler && handler.getFieldEditFiles;
    };

    /**
     * Check if the data has changed for a certain field.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataFieldsDelegate#hasFieldDataChanged
     * @param  {Object} field               Defines the field to be rendered.
     * @param  {Object} inputData           Data entered in the search form.
     * @param  {Object} originalFieldData   Original field entered data.
     * @return {Promise}                    Promise rejected if has changed, resolved if no changes.
     */
    self.hasFieldDataChanged = function(field, inputData, originalFieldData) {
        var handler = self.getPluginHandler(field.type);
        if (handler && handler.hasFieldDataChanged) {
            return $q.when(handler.hasFieldDataChanged(field, inputData, originalFieldData)).then(function(result) {
                return result ? $q.reject() : $q.when();
            });
        }
        return $q.when();
    };

    /**
     * Check and get field requeriments.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataFieldsDelegate#getFieldsNotification
     * @param  {Object} field               Defines the field to be rendered.
     * @param  {Object} inputData           Data entered in the edit form.
     * @return {String}                     String with the notification or false.
     */
    self.getFieldsNotifications = function(field, inputData) {
        var handler = self.getPluginHandler(field.type);
        if (handler && handler.getFieldsNotifications) {
            return handler.getFieldsNotifications(field, inputData);
        }
        return false;
    };

    /**
     * Override field content data with offline submission.
     *
     * @param  {Object} field               Defines the field to be rendered.
     * @param  {Object} originalContent     Original data to be overriden.
     * @param  {Array}  offlineContent      Array with all the offline data to override.
     * @param  {Array}  offlineFiles        Array with all the offline files in the field.
     * @return {Object}                     Data overriden
     */
    self.overrideData = function(field, originalContent, offlineContent, offlineFiles) {
        var handler = self.getPluginHandler(field.type);
        if (handler && handler.overrideData && offlineContent) {
            return handler.overrideData(originalContent || {}, offlineContent, offlineFiles);
        }
        return originalContent;
    };

    /**
     * Get the directive to use for a certain database plugin.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataFieldsDelegate#getDirectiveForPlugin
     * @param  {Object} field  Defines the field to be rendered.
     * @return {String}        Directive name. Undefined if no directive found.
     */
    self.getDirectiveForPlugin = function(field) {
        var handler = self.getPluginHandler(field.type);
        if (handler) {
            if (handler.getDirectiveName) {
                return handler.getDirectiveName(field);
            }

            // Fallback.
            return 'mma-mod-data-field-' + field.type;
        }
    };

    /**
     * Check if a field plugin is supported.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataFieldsDelegate#isPluginSupported
     * @param  {String} pluginType Type of the plugin.
     * @return {Boolean}           True if supported, false otherwise.
     */
    self.isPluginSupported = function(pluginType) {
        return typeof enabledHandlers[pluginType] != 'undefined';
    };


    /**
     * Register a field plugin handler.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataFieldsDelegate#registerHandler
     * @param {String} addon                   Handler's name.
     * @param {String} pluginType              Type of the plugin the handler supports.
     * @param {String|Object|Function} handler Must be resolved to an object defining the following properties. Or to a function
     *                           returning an object defining these properties. See {@link $mmUtil#resolveObject}.
     *                             - getFieldSearchData(field, inputData) Optional.
     *                                                           Should return name and data entered to the field.
     *                             - getFieldEditData(field, inputData, originalFieldData) Optional.
     *                                                           Should return fieldid and data entered to the field in a promise
     *                                                           or array.
     *                             - hasFieldDataChanged(field, inputData, originalFieldData) Optional.
     *                                                           Should return if field has been changed by the user.
     *                             - getFieldEditFiles(field, inputData, originalFieldData) Optional.
     *                                                           Should return an array of files stored in temp store.
     *                             - getFieldsNotifications(field, inputData) Optional.
     *                                                           Should return an array of notifications before sending data.
     *                             - overrideData(originalContent, offlineContent, offlineFiles) Optional.
     *                                                            Should return an object with the overriden content from offline
     *                                                            submission.
     */
    self.registerHandler = function(addon, pluginType, handler) {
        if (typeof handlers[pluginType] !== 'undefined') {
            $log.debug("Addon '" + addon + "' already registered as handler for '" + pluginType + "'");
            return false;
        }
        $log.debug("Registered handler '" + addon + "' for field plugin '" + pluginType + "'");
        handlers[pluginType] = {
            addon: addon,
            instance: undefined,
            handler: handler
        };

        // Handlers are registered in the "run" phase, it can happen that a handler is registered after updateHandlers
        // has been executed. If the user is logged in we'll run updateHandler to be sure it has been executed for this site.
        if ($mmSite.isLoggedIn()) {
            self.updateHandler(pluginType, handlers[pluginType]);
        }
    };

    /**
     * Check if a time belongs to the last update handlers call.
     * This is to handle the cases where updateHandlers don't finish in the same order as they're called.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataFieldsDelegate#isLastUpdateCall
     * @param  {Number}  time Time to check.
     * @return {Boolean}      True if equal, false otherwise.
     */
    self.isLastUpdateCall = function(time) {
        if (!lastUpdateHandlersStart) {
            return true;
        }
        return time == lastUpdateHandlersStart;
    };


    /**
     * Check if a handler is enabled for a certain site and add/remove it to enabledHandlers.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataFieldsDelegate#updateHandler
     * @param {String} pluginType   The type of the plugin this handler handles.
     * @param {Object} handlerInfo  The handler details.
     * @param  {Number} time        Time this update process started.
     * @return {Promise}            Resolved when done.
     * @protected
     */
    self.updateHandler = function(pluginType, handlerInfo, time) {
        var siteId = $mmSite.getId();


        if (typeof handlerInfo.instance === 'undefined') {
            handlerInfo.instance = $mmUtil.resolveObject(handlerInfo.handler, true);
        }

        // Checks if site is enabled.
        var enabled = $mmSite.isLoggedIn();

        // Verify that this call is the last one that was started.
        // Check that site hasn't changed since the check started.
        if (self.isLastUpdateCall(time) && $mmSite.getId() === siteId) {
            if (enabled) {
                enabledHandlers[pluginType] = handlerInfo.instance;
            } else {
                delete enabledHandlers[pluginType];
            }
        }
    };

    /**
     * Update the enabled handlers for the current site.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataFieldsDelegate#updateHandlers
     * @return {Promise} Resolved when done.
     * @protected
     */
    self.updateHandlers = function() {
        var promises = [],
            now = new Date().getTime();

        $log.debug('Updating handlers for current site.');

        lastUpdateHandlersStart = now;

        // Loop over all the handlers.
        angular.forEach(handlers, function(handlerInfo, pluginType) {
            promises.push(self.updateHandler(pluginType, handlerInfo, now));
        });

        return $q.all(promises).then(function() {
            return true;
        }, function() {
            // Never reject.
            return true;
        });
    };

    return self;
})

.run(function($mmEvents, mmCoreEventLogin, mmCoreEventSiteUpdated, $mmaModDataFieldsDelegate, mmCoreEventRemoteAddonsLoaded) {
    $mmEvents.on(mmCoreEventLogin, $mmaModDataFieldsDelegate.updateHandlers);
    $mmEvents.on(mmCoreEventSiteUpdated, $mmaModDataFieldsDelegate.updateHandlers);
    $mmEvents.on(mmCoreEventRemoteAddonsLoaded, $mmaModDataFieldsDelegate.updateHandlers);
});
