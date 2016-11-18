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

angular.module('mm.addons.mod_assign')

/**
 * Delegate to register assign feedback handlers.
 *
 * @module mm.addons.mod_assign
 * @ngdoc service
 * @name $mmaModAssignFeedbackDelegate
 * @description
 *
 * Delegate to register assign feedback handlers.
 * You can use this service to register your own feedback handlers to be used in an assign.
 *
 * To register a handler:
 *
 * $mmaModAssignFeedbackDelegate.registerHandler('mmaYourAddon', 'pluginType', 'handlerName');
 *
 * Please take into account that this delegate belongs to an addon so it might not be available in custom apps.
 * We recommend using $mmAddonManager to inject this delegate to avoid errors.
 *
 * Example:
 *
 * .run(function($mmAddonManager) {
 *     var $mmaModAssignFeedbackDelegate = $mmAddonManager.get('$mmaModAssignFeedbackDelegate');
 *     if ($mmaModAssignFeedbackDelegate) {
 *         $mmaModAssignFeedbackDelegate.registerHandler('mmaModAssignFeedbackFile', 'file', '$mmaModAssignFeedbackFileHandler');
 *      }
 * });
 *
 * @see $mmaModAssignFeedbackDelegate#registerHandler to see the methods your handle needs to implement.
 */
.factory('$mmaModAssignFeedbackDelegate', function($log, $mmSite, $mmUtil, $q, $translate) {
    $log = $log.getInstance('$mmaModAssignFeedbackDelegate');

    var handlers = {},
        enabledHandlers = {},
        self = {},
        updatePromises = {},
        lastUpdateHandlersStart;

    /**
     * Get the directive to use for a certain feedback plugin.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignFeedbackDelegate#getDirectiveForPlugin
     * @param  {Object} plugin Plugin to get the directive for.
     * @return {String}        Directive name. Undefined if no directive found.
     */
    self.getDirectiveForPlugin = function(plugin) {
        var handler = self.getPluginHandler(plugin.type);
        if (handler && handler.getDirectiveName) {
            return handler.getDirectiveName(plugin);
        }
    };

    /**
     * Get a readable name to use for a certain feedback plugin.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignFeedbackDelegate#getPluginName
     * @param  {Object} plugin Plugin to get the directive for.
     * @return {String}        Human readable name. Undefined if no directive, translation or name found.
     */
    self.getPluginName = function(plugin) {
        var handler = self.getPluginHandler(plugin.type);
        if (handler && handler.getPluginName) {
            return handler.getPluginName(plugin);
        }

        // Fallback to translated string.
        var translationId = 'mma.mod_assign_feedback_' + plugin.type + '.pluginname',
            translation = $translate.instant(translationId);
        if (translationId != translation) {
            return translation;
        }

        // Fallback to WS string.
        if (plugin.name) {
            return plugin.name;
        }
    };

    /**
     * Get the handler for a certain feedback plugin.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignFeedbackDelegate#getPluginHandler
     * @param  {String} pluginType Type of the plugin.
     * @return {Object}            Handler. Undefined if no handler found for the plugin.
     */
    self.getPluginHandler = function(pluginType) {
        if (typeof enabledHandlers[pluginType] != 'undefined') {
            return enabledHandlers[pluginType];
        }
    };

    /**
     * Check if the feedback data has changed for a certain plugin.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignFeedbackDelegate#hasPluginDataChanged
     * @param  {Object} assign     Assignment.
     * @param  {Object} plugin     Plugin.
     * @param  {Object} inputData  Data entered in the submission form.
     * @return {Promise}           Promise resolved with true if data has changed, resolved with false otherwise.
     */
    self.hasPluginDataChanged = function(assign, plugin, inputData) {
        var handler = self.getPluginHandler(plugin.type);
        if (handler && handler.hasDataChanged) {
            return $q.when(handler.hasDataChanged(assign, plugin, inputData));
        }
        return $q.when(false);
    };

    /**
     * Prepare and return the data to submit for a certain feedback plugin.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignFeedbackDelegate#preparePluginFeedbackData
     * @param  {Number} assignId     Assignment ID.
     * @param  {Number} userId       User ID.
     * @param  {Object} plugin       Plugin to get the data for.
     * @param  {Object} pluginData   Object where to add the plugin data.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved when data has been gathered.
     */
    self.preparePluginFeedbackData = function(assignId, userId, plugin, pluginData, siteId) {
        var handler = self.getPluginHandler(plugin.type);
        if (handler && handler.prepareFeedbackData) {
            return $q.when(handler.prepareFeedbackData(assignId, userId, pluginData, siteId));
        }
        return $q.when();
    };

    /**
     * Get feedback data in the input data to save as draft.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignFeedbackDelegate#getFeedbackDataToDraft
     * @param  {Object} plugin     Plugin to get the data for.
     * @param  {Object} inputData  Data entered in the feedback form.
     * @return {Promise}           Promise resolved when data has been gathered.
     */
    self.getFeedbackDataToDraft = function(plugin, inputData) {
        var handler = self.getPluginHandler(plugin.type);
        if (handler && handler.getFeedbackDataToDraft) {
            return $q.when(handler.getFeedbackDataToDraft(plugin, inputData));
        }
        return $q.when();
    };

    /**
     * Save data to submit for a certain feedback plugin.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignFeedbackDelegate#saveFeedbackDraft
     * @param  {Number} assignId        Assignment Id.
     * @param  {Number} userId          User Id.
     * @param  {Object} plugin          Plugin to get the data for.
     * @param  {Object} inputData       Data entered in the feedback form.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved when data has been saved.
     */
    self.saveFeedbackDraft = function(assignId, userId, plugin, inputData, siteId) {
        var handler = self.getPluginHandler(plugin.type);
        if (handler && handler.saveDraft) {
            return $q.when(handler.saveDraft(assignId, userId, inputData, siteId));
        }
        return $q.when();
    };

    /**
     * Discard draft data to submit for a certain feedback plugin.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignFeedbackDelegate#discardPluginFeedbackData
     * @param  {Number} assignId        Assignment Id.
     * @param  {Number} userId          User Id.
     * @param  {Object} plugin          Plugin to get the data for.
     * @param  {Object} inputData       Data entered in the feedback form.
     * @param  {String} [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved when data has been saved.
     */
    self.discardPluginFeedbackData = function(assignId, userId, plugin, siteId) {
        var handler = self.getPluginHandler(plugin.type);
        if (handler && handler.discardDraft) {
            return $q.when(handler.discardDraft(assignId, userId, siteId));
        }
        return $q.when();
    };

    /**
     * Get files used by this plugin.
     * The files returned by this function will be prefetched when the user prefetches the assign.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignFeedbackDelegate#getPluginFiles
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Data returned by $mmaModAssign#getSubmissionStatus.
     * @param  {Object} plugin     Plugin.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved with the files.
     */
    self.getPluginFiles = function(assign, submission, plugin, siteId) {
        siteId = siteId || $mmSite.getId();

        var handler = self.getPluginHandler(plugin.type);
        if (handler && handler.getPluginFiles) {
            return $q.when(handler.getPluginFiles(assign, submission, plugin, siteId));
        }
        return $q.when([]);
    };

    /**
     * Check if a time belongs to the last update handlers call.
     * This is to handle the cases where updateHandlers don't finish in the same order as they're called.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignFeedbackDelegate#isLastUpdateCall
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
     * Check if a feedback plugin is supported.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignFeedbackDelegate#isPluginSupported
     * @param  {String} pluginType Type of the plugin.
     * @return {Boolean}           True if supported, false otherwise.
     */
    self.isPluginSupported = function(pluginType) {
        return typeof enabledHandlers[pluginType] != 'undefined';
    };

    /**
     * Check if a feedback plugin is supported for edit.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignFeedbackDelegate#isPluginSupportedForEdit
     * @param  {String} pluginType Type of the plugin.
     * @return {Boolean}           True if supported, false otherwise.
     */
    self.isPluginSupportedForEdit = function(pluginType) {
        var handler = self.getPluginHandler(pluginType);
        if (handler && handler.isEnabledForEdit) {
            return handler.isEnabledForEdit();
        }
        return false;
    };

    /**
     * Prefetch any required data for a feedback plugin.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignFeedbackDelegate#prefetch
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Data returned by $mmaModAssign#getSubmissionStatus.
     * @param  {Object} plugin     Plugin.
     * @param  {String} [siteId]   Site ID. If not defined, current site.
     * @return {Promise}           Promise resolved when data has been prefetched.
     */
    self.prefetch = function(assign, submission, plugin, siteId) {
        siteId = siteId || $mmSite.getId();

        var handler = self.getPluginHandler(plugin.type);
        if (handler && handler.prefetch) {
            return $q.when(handler.prefetch(assign, submission, plugin, siteId));
        }
        return $q.when();
    };

    /**
     * Register a feedback plugin handler. The handler will be used when submitting an assign.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignFeedbackDelegate#registerHandler
     * @param {String} addon                   Handler's name.
     * @param {String} pluginType              Type of the plugin the handler supports.
     * @param {String|Object|Function} handler Must be resolved to an object defining the following properties. Or to a function
     *                           returning an object defining these properties. See {@link $mmUtil#resolveObject}.
     *                             - isEnabled (Boolean|Promise) Whether or not the handler is enabled on a site level.
     *                                                           When using a promise, it should return a boolean.
     *                             - isEnabledForEdit (Boolean|Promise) Whether or not the handler is enabled for edit on a site
     *                                                           level. When using a promise, it should return a boolean.
     *                             - getDirectiveName() (String) Optional. Returns the name of the directive to render the plugin.
     *                             - prepareFeedbackData(assignId, userId, pluginData, siteId). Optional.
     *                                                           Should prepare and add to pluginData the data to send to server
     *                                                           based in the draft data saved.
     *                             - getFeedbackDataToDraft(plugin, inputData) Optional.
     *                                                           Get feedback data base in the input data to save as draft.
     *                             - hasDataChanged(assign, plugin, inputData) (Promise|Boolean) Optional.
     *                                                           Check if the feedback data has changed for this plugin.
     *                             - getDraft(assignId, userId, siteId) (Object|Boolean) Optional.
     *                                                           Return the draft saved data of the feedback plugin.
     *                             - discardDraft(assignId, userId, siteId) Optional.
     *                                                           Discard the draft data of the feedback plugin.
     *                             - saveDraft(assignId, userId, plugin, data, siteId) Optional.
     *                                                           Save draft data of the feedback plugin.
     *                             - getPluginName(plugin). Optional. Should return a human readable String. If not present, default
     *                                                           translation will be applied, if translation not found, optional
     *                                                           name will be used.
     */
    self.registerHandler = function(addon, pluginType, handler) {
        if (typeof handlers[pluginType] !== 'undefined') {
            $log.debug("Addon '" + addon + "' already registered as handler for '" + pluginType + "'");
            return false;
        }
        $log.debug("Registered handler '" + addon + "' for feedback plugin '" + pluginType + "'");
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
     * Check if a handler is enabled for a certain site and add/remove it to enabledHandlers.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignFeedbackDelegate#updateHandler
     * @param {String} pluginType   The type of the plugin this handler handles.
     * @param {Object} handlerInfo  The handler details.
     * @param  {Number} time        Time this update process started.
     * @return {Promise}            Resolved when done.
     * @protected
     */
    self.updateHandler = function(pluginType, handlerInfo, time) {
        var promise,
            deleted = false,
            siteId = $mmSite.getId();

        if (updatePromises[siteId] && updatePromises[siteId][pluginType]) {
            // There's already an update ongoing for this package, return the promise.
            return updatePromises[siteId][pluginType];
        } else if (!updatePromises[siteId]) {
            updatePromises[siteId] = {};
        }

        if (typeof handlerInfo.instance === 'undefined') {
            handlerInfo.instance = $mmUtil.resolveObject(handlerInfo.handler, true);
        }

        if (!$mmSite.isLoggedIn()) {
            promise = $q.reject();
        } else {
            promise = $q.when(handlerInfo.instance.isEnabled());
        }

        // Checks if the handler is enabled.
        promise = promise.catch(function() {
            return false;
        }).then(function(enabled) {
            // Verify that this call is the last one that was started.
            // Check that site hasn't changed since the check started.
            if (self.isLastUpdateCall(time) && $mmSite.isLoggedIn() && $mmSite.getId() === siteId) {
                if (enabled) {
                    enabledHandlers[pluginType] = handlerInfo.instance;
                } else {
                    delete enabledHandlers[pluginType];
                }
            }
        }).finally(function() {
            // Update finished, delete the promise.
            delete updatePromises[siteId][pluginType];
            deleted = true;
        });

        if (!deleted) { // In case promise was finished immediately.
            updatePromises[siteId][pluginType] = promise;
        }
        return promise;
    };

    /**
     * Update the enabled handlers for the current site.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignFeedbackDelegate#updateHandlers
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

.run(function($mmEvents, mmCoreEventLogin, mmCoreEventSiteUpdated, $mmaModAssignFeedbackDelegate, mmCoreEventRemoteAddonsLoaded) {
    $mmEvents.on(mmCoreEventLogin, $mmaModAssignFeedbackDelegate.updateHandlers);
    $mmEvents.on(mmCoreEventSiteUpdated, $mmaModAssignFeedbackDelegate.updateHandlers);
    $mmEvents.on(mmCoreEventRemoteAddonsLoaded, $mmaModAssignFeedbackDelegate.updateHandlers);
});
