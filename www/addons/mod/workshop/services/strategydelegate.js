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

angular.module('mm.addons.mod_workshop')

/**
 * Delegate to register workshop assessment strategy handlers.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc service
 * @name $mmaModWorkshopAssessmentStrategyDelegate
 * @description
 *
 * Delegate to register workshop assessment strategy handlers.
 * You can use this service to register your own assessment strategy handlers to be used in a workshop.
 *
 * To register a handler:
 *
 * $mmaModWorkshopAssessmentStrategyDelegate.registerHandler('mmaYourAddon', 'pluginType', 'handlerName');
 *
 * Please take into account that this delegate belongs to an addon so it might not be available in custom apps.
 * We recommend using $mmAddonManager to inject this delegate to avoid errors.
 *
 * Example:
 *
 * .run(function($mmAddonManager) {
 *     var $mmaModWorkshopAssessmentStrategyDelegate = $mmAddonManager.get('$mmaModWorkshopAssessmentStrategyDelegate');
 *     if ($mmaModWorkshopAssessmentStrategyDelegate) {
 *         $mmaModWorkshopAssessmentStrategyDelegate.registerHandler('mmaModWorkshopAssessmentStrategyAccumulative', 'accumulative',
 *             '$mmaModWorkshopAssessmentStrategyAccumulativeHandler');
 *      }
 * });
 *
 * @see $mmaModWorkshopAssessmentStrategyDelegate#registerHandler to see the methods your handle needs to implement.
 */
.factory('$mmaModWorkshopAssessmentStrategyDelegate', function($log, $mmSite, $mmUtil, $q) {
    $log = $log.getInstance('$mmaModWorkshopAssessmentStrategyDelegate');

    var handlers = {},
        enabledHandlers = {},
        self = {},
        updatePromises = {},
        lastUpdateHandlersStart;

    /**
     * Get the directive to use for a certain assessment strategy plugin.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopAssessmentStrategyDelegate#getDirectiveForPlugin
     * @param  {String} strategy Assessment strategy name.
     * @return {String}           Directive name. Undefined if no directive found.
     */
    self.getDirectiveForPlugin = function(strategy) {
        var handler = self.getPluginHandler(strategy);
        if (handler && handler.getDirectiveName) {
            return handler.getDirectiveName();
        }
    };

    /**
     * Get the handler for a certain assessment strategy plugin.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopAssessmentStrategyDelegate#getPluginHandler
     * @param  {String} pluginType Type of the plugin.
     * @return {Object}            Handler. Undefined if no handler found for the plugin.
     */
    self.getPluginHandler = function(pluginType) {
        if (typeof enabledHandlers[pluginType] != 'undefined') {
            return enabledHandlers[pluginType];
        }
    };

    /**
     * Check if an assessment strategy plugin is supported.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopAssessmentStrategyDelegate#isPluginSupported
     * @param  {String} pluginType Type of the plugin.
     * @return {Boolean}           True if supported, false otherwise.
     */
    self.isPluginSupported = function(pluginType) {
        return typeof enabledHandlers[pluginType] != 'undefined';
    };

    /**
     * Register an assessment strategy plugin handler. The handler will be used when submitting a workshop assessment.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopAssessmentStrategyDelegate#registerHandler
     * @param {String} addon                   Handler's name.
     * @param {String} pluginType              Type of the plugin the handler supports.
     * @param {String|Object|Function} handler Must be resolved to an object defining the following properties. Or to a function
     *                           returning an object defining these properties. See {@link $mmUtil#resolveObject}.
     *                             - isEnabled (Boolean|Promise) Whether or not the handler is enabled on a site level.
     *                                                           When using a promise, it should return a boolean.
     *                             - getDirectiveName (String) Optional. Returns the name of the directive to render the plugin.
     *                             - hasDataChanged(originalData, inputData) (Boolean) Optional.
     *                                                           Check if the strategy data has changed for this plugin.
     *                             - prepareAssessmentData(inputData, form)  (Promise) Optional.
     *                                                           Prepare plugin data to be sent.
     *                             - getOriginalValues(form, workshopId) (Promise) Prepare original values to be shown and compared
     *                                                           depending on the strategy selected.
     */
    self.registerHandler = function(addon, pluginType, handler) {
        if (typeof handlers[pluginType] !== 'undefined') {
            $log.debug("Addon '" + addon + "' already registered as handler for '" + pluginType + "'");
            return false;
        }
        $log.debug("Registered handler '" + addon + "' for assessment strategy plugin '" + pluginType + "'");
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
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopAssessmentStrategyDelegate#isLastUpdateCall
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
     * Check if the assessment data has changed for a certain submission and workshop for a certain plugin.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopAssessmentStrategyDelegate#hasPluginDataChanged
     * @param  {Object} workshop      Workshop.
     * @param  {Object} originalData  Original data of the form.
     * @param  {Object} inputData     Data entered in the assessment form.
     * @return {Boolean}              True if data has changed, false otherwise.
     */
    self.hasPluginDataChanged = function(workshop, originalData, inputData) {
        var handler = self.getPluginHandler(workshop.strategy);
        if (handler && handler.hasDataChanged) {
            return handler.hasDataChanged(originalData, inputData);
        }
        return false;
    };

    /**
     * Prepare original values to be shown and compared depending on the strategy selected.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopAssessmentStrategyDelegate#getOriginalValues
     * @param  {String} workshopStrategy   Workshop strategy.
     * @param  {Object} form               Original data of the form.
     * @param  {Number} workshopId         Workshop ID.
     * @return {Promise}                   Resolved with original values sorted.
     */
    self.getOriginalValues = function(workshopStrategy, form, workshopId) {
        var handler = self.getPluginHandler(workshopStrategy);
        if (handler && handler.getOriginalValues) {
            return $q.when(handler.getOriginalValues(form, workshopId));
        }
        return $q.when(false);
    };

    /**
     * Prepare assessment data to be sent to the server depending on the strategy selected.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopAssessmentStrategyDelegate#prepareAssessmentData
     * @param {String}  workshopStrategy    Workshop strategy to follow.
     * @param {Object}  inputData           Assessment data.
     * @param {Object}  form                Assessment form data.
     * @return {Promise}                    Promise resolved with the data to be sent. Or rejected with the input errors object.
     */
    self.prepareAssessmentData = function(workshopStrategy, inputData, form) {
        var handler = self.getPluginHandler(workshopStrategy);
        if (handler && handler.prepareAssessmentData) {
            return $q.when(handler.prepareAssessmentData(inputData, form));
        }
        return $q.when(inputData);
    };

    /**
     * Check if a handler is enabled for a certain site and add/remove it to enabledHandlers.
     *
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopAssessmentStrategyDelegate#updateHandler
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
     * @module mm.addons.mod_workshop
     * @ngdoc method
     * @name $mmaModWorkshopAssessmentStrategyDelegate#updateHandlers
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

.run(function($mmEvents, mmCoreEventLogin, mmCoreEventSiteUpdated, $mmaModWorkshopAssessmentStrategyDelegate, mmCoreEventRemoteAddonsLoaded) {
    $mmEvents.on(mmCoreEventLogin, $mmaModWorkshopAssessmentStrategyDelegate.updateHandlers);
    $mmEvents.on(mmCoreEventSiteUpdated, $mmaModWorkshopAssessmentStrategyDelegate.updateHandlers);
    $mmEvents.on(mmCoreEventRemoteAddonsLoaded, $mmaModWorkshopAssessmentStrategyDelegate.updateHandlers);
});
