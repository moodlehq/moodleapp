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

angular.module('mm.addons.pushnotifications')

/**
 * Delegate to register notification processors (message/output) for notification preferences.
 *
 * @module mm.addons.pushnotifications
 * @ngdoc service
 * @name $mmaPushNotificationsPreferencesDelegate
 * @description
 *
 * Delegate to register notification preferences handlers.
 * These handlers are used to configure extra settings not returned by core_message_get_user_notification_preferences.
 *
 * To register a preference handler:
 *
 * $mmaPushNotificationsPreferencesDelegate.registerHandler('mmaYourAddon', 'processorName', 'handlerName');
 *
 * Please take into account that this delegate belongs to an addon so it might not be available in custom apps.
 * We recommend using $mmAddonManager to inject this delegate to avoid errors.
 *
 * Example:
 *
 * .run(function($mmAddonManager) {
 *     var $mmaPushNotificationsPreferencesDelegate = $mmAddonManager.get('$mmaPushNotificationsPreferencesDelegate');
 *     if ($mmaPushNotificationsPreferencesDelegate) {
 *         $mmaPushNotificationsPreferencesDelegate.registerHandler('mmaMessagesAirnotifier', 'airnotifier',
 *                                 '$mmaMessagesAirnotifierHandler');
 *      }
 * });
 *
 * @see $mmaPushNotificationsPreferencesDelegate#registerHandler to see the methods your handle needs to implement.
 */
.factory('$mmaPushNotificationsPreferencesDelegate', function($q, $log, $mmSite, $mmUtil) {
    var handlers = {},
        enabledHandlers = {},
        self = {},
        updatePromises = {},
        lastUpdateHandlersStart;

    $log = $log.getInstance('$mmaPushNotificationsPreferencesDelegate');

    /**
     * Check if a processor has a preference handler enabled for the current site.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotificationsPreferencesDelegate#hasPreferenceHandler
     * @param  {String} processorName The name of the processor. E.g. 'airnotifier'.
     * @return {Boolean}             Whether the processor has a preference handler.
     */
    self.hasPreferenceHandler = function(processorName) {
        return typeof enabledHandlers[processorName] !== 'undefined';
    };

    /**
     * Check if a time belongs to the last update handlers call.
     * This is to handle the cases where updatePreferenceHandlers don't finish in the same order as they're called.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotificationsPreferencesDelegate#isLastUpdateCall
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
     * Open the preferences view for a certain handler.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotificationsPreferencesDelegate#openPreferencesViewFor
     * @param  {Object} processor The processor object.
     * @return {Void}
     */
    self.openPreferencesViewFor = function(processor) {
        if (self.hasPreferenceHandler(processor.name)) {
            enabledHandlers[processor.name].openPreferencesView(processor);
        }
    };

    /**
     * Register a preference handler.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotificationsPreferencesDelegate#registerPreferenceHandler
     * @param {String} addon           The addon's name (mmaMessageAirnotifier, mmaMessageEmail, ...)
     * @param {String} processorName   The name of the processor. E.g. 'airnotifier'.
     * @param {String|Object|Function} handler Must be resolved to an object defining the following functions. Or to a function
     *                           returning an object defining these functions. See {@link $mmUtil#resolveObject}.
     *                             - isEnabled (Boolean|Promise) Whether or not the handler is enabled on a site level.
     *                             - openPreferencesView(processor) Should open the view to configure extra preferences.
     */
    self.registerHandler = function(addon, processorName, handler) {
        if (typeof handlers[processorName] !== 'undefined') {
            $log.debug("Addon '" + handlers[processorName].addon + "' already registered as handler for '" + processorName + "'");
            return false;
        }
        $log.debug("Registered addon '" + addon + "' as preference handler.");
        handlers[processorName] = {
            addon: addon,
            handler: handler,
            instance: undefined
        };

        // Handlers are registered in the "run" phase, it can happen that a handler is registered after updateHandlers
        // has been executed. If the user is logged in we'll run updateHandler to be sure it has been executed for this site.
        if ($mmSite.isLoggedIn()) {
            self.updatePreferenceHandler(processorName, handlers[processorName]);
        }
    };

    /**
     * Update the enabled handlers for the current site.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotificationsPreferencesDelegate#updatePreferenceHandler
     * @param  {String} processorName The name of the processor. E.g. 'airnotifier'.
     * @param  {Object} handlerInfo   The handler details.
     * @param  {Number} time          Time this update process started.
     * @return {Promise}              Resolved when done.
     * @protected
     */
    self.updatePreferenceHandler = function(processorName, handlerInfo, time) {
        var promise,
            deleted = false,
            siteId = $mmSite.getId();

        if (updatePromises[siteId] && updatePromises[siteId][processorName]) {
            // There's already an update ongoing for this processor, return the promise.
            return updatePromises[siteId][processorName];
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
            if (self.isLastUpdateCall(time) && $mmSite.isLoggedIn() && $mmSite.getId() === siteId) {
                if (enabled) {
                    enabledHandlers[processorName] = handlerInfo.instance;
                } else {
                    delete enabledHandlers[processorName];
                }
            }
        }).finally(function() {
            // Update finished, delete the promise.
            delete updatePromises[siteId][processorName];
            deleted = true;
        });

        if (!deleted) { // In case promise was finished immediately.
            updatePromises[siteId][processorName] = promise;
        }
        return promise;
    };

    /**
     * Update the handlers for the current site.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc method
     * @name $mmaPushNotificationsPreferencesDelegate#updatePreferenceHandlers
     * @return {Promise} Resolved when done.
     * @protected
     */
    self.updatePreferenceHandlers = function() {
        var promises = [],
            now = new Date().getTime();

        $log.debug('Updating preferences handlers for current site.');

        lastUpdateHandlersStart = now;

        // Loop over all the preferences handlers.
        angular.forEach(handlers, function(handlerInfo, processorName) {
            promises.push(self.updatePreferenceHandler(processorName, handlerInfo, now));
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

.run(function($mmEvents, mmCoreEventLogin, mmCoreEventSiteUpdated, mmCoreEventRemoteAddonsLoaded,
            $mmaPushNotificationsPreferencesDelegate) {
    $mmEvents.on(mmCoreEventLogin, $mmaPushNotificationsPreferencesDelegate.updatePreferenceHandlers);
    $mmEvents.on(mmCoreEventSiteUpdated, $mmaPushNotificationsPreferencesDelegate.updatePreferenceHandlers);
    $mmEvents.on(mmCoreEventRemoteAddonsLoaded, $mmaPushNotificationsPreferencesDelegate.updatePreferenceHandlers);
});
