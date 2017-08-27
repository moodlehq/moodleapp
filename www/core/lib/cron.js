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

angular.module('mm.core')

.constant('mmCoreCronInterval', 3600000) // Default interval is 1 hour.
.constant('mmCoreCronMinInterval', 300000) // Minimum interval is 5 minutes.
.constant('mmCoreCronMaxTimeProcess', 120000) // Max time a process can block the queue. Defaults to 2 minutes.
.constant('mmCoreCronStore', 'cron')

.config(function($mmAppProvider, mmCoreCronStore) {
    var stores = [
        {
            name: mmCoreCronStore,
            keyPath: 'id'
        }
    ];
    $mmAppProvider.registerStores(stores);
})

/**
 * Service to handle cron processes. The registered processes will be executed every certain time.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmCronDelegate
 */
.factory('$mmCronDelegate', function($log, $mmConfig, $mmApp, $timeout, $q, $mmUtil, mmCoreCronInterval, mmCoreCronStore,
            mmCoreSettingsSyncOnlyOnWifi, mmCoreCronMinInterval, mmCoreCronMaxTimeProcess) {

    $log = $log.getInstance('$mmCronDelegate');

    var hooks = {},
        self = {},
        queuePromise = $q.when();

    /**
     * Try to execute a hook. It will schedule the next execution once done.
     * If the hook cannot be executed or it fails, it will be re-executed after mmCoreCronMinInterval.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#_executeHook
     * @param  {String} name     Name of the hook.
     * @param  {String} [siteId] Site ID. If not defined, all sites.
     * @return {Promise}         Promise resolved if hook is executed successfully, rejected otherwise.
     * @protected
     */
    self._executeHook = function(name, siteId) {
        if (!hooks[name] || !hooks[name].instance || !angular.isFunction(hooks[name].instance.execute)) {
            // Invalid hook.
            $log.debug('Cannot execute hook because is invalid: ' + name);
            return $q.reject();
        }

        var usesNetwork = self._hookUsesNetwork(name),
            isSync = self._isHookSync(name),
            promise;

        if (usesNetwork && !$mmApp.isOnline()) {
            // Offline, stop executing.
            $log.debug('Cannot execute hook because device is offline: ' + name);
            self._stopHook(name);
            return $q.reject();
        }

        if (isSync) {
            // Check network connection.
            promise = $mmConfig.get(mmCoreSettingsSyncOnlyOnWifi, false).catch(function() {
                return false; // Shouldn't happen.
            }).then(function(syncOnlyOnWifi) {
                return !syncOnlyOnWifi || !$mmApp.isNetworkAccessLimited();
            });
        } else {
            promise = $q.when(true);
        }

        return promise.then(function(execute) {
            if (!execute) {
                // Cannot execute in this network connection, retry soon.
                $log.debug('Cannot execute hook because device is using limited connection: ' + name);
                scheduleNextExecution(name, mmCoreCronMinInterval);
                return $q.reject();
            }

            // Add the execution to the queue.
            queuePromise = queuePromise.catch(function() {
                // Ignore errors in previous hooks.
            }).then(function() {
                return executeHook(name, siteId).then(function() {
                    $log.debug('Execution of hook \'' + name + '\' was a success.');
                    return self._setHookLastExecutionTime(name, new Date().getTime()).then(function() {
                        scheduleNextExecution(name);
                    });
                }, function() {
                    // Hook call failed. Retry soon.
                    $log.debug('Execution of hook \'' + name + '\' failed.');
                    scheduleNextExecution(name, mmCoreCronMinInterval);
                    return $q.reject();
                });
            });

            return queuePromise;
        });
    };

    /**
     * Execute a hook, cancelling the execution if it takes more than mmCoreCronMaxTimeProcess.
     *
     * @param  {String} name     Name of the hook.
     * @param  {String} [siteId] Site ID. If not defined, all sites.
     * @return {Promise}         Promise resolved when the hook finishes or reaches max time, rejected if it fails.
     */
    function executeHook(name, siteId) {
        var deferred = $q.defer(),
            cancelPromise;

        $log.debug('Executing hook: ' + name);
        $q.when(hooks[name].instance.execute(siteId)).then(function() {
            deferred.resolve();
        }).catch(function() {
            deferred.reject();
        }).finally(function() {
            $timeout.cancel(cancelPromise);
        });

        cancelPromise = $timeout(function() {
            // The hook took too long. Resolve because we don't want to retry soon.
            $log.debug('Resolving execution of hook \'' + name + '\' because it took too long.');
            deferred.resolve();
        }, mmCoreCronMaxTimeProcess);

        return deferred.promise;
    }

    /**
     * Force execution of synchronization cron tasks without waiting for the scheduled time.
     * Please notice that some tasks may not be executed depending on the network connection and sync settings.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#forceSyncExecution
     * @param  {String} [siteId] Site ID. If not defined, all sites.
     * @return {Promise}         Promise resolved if all hooks are executed successfully, rejected otherwise.
     */
    self.forceSyncExecution = function(siteId) {
        var promises = [];

        angular.forEach(hooks, function(hook, name) {
            if (self._isHookSync(name)) {
                // Mark the hook as running (it might be running already).
                hook.running = true;

                // Cancel pending timeout.
                $timeout.cancel(hook.timeout);

                // Now force the execution of the hook.
                promises.push(self._executeHook(name, siteId));
            }
        });

        return $mmUtil.allPromises(promises);
    };

    /**
     * Get a hook's interval.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#_getHookInterval
     * @param {String} name Hook's name.
     * @return {String}     Hook's interval.
     * @protected
     */
    self._getHookInterval = function(name) {
        if (!hooks[name] || !hooks[name].instance || !angular.isFunction(hooks[name].instance.getInterval)) {
            // Invalid, return default.
            return mmCoreCronInterval;
        }

        // Don't allow intervals lower than 5 minutes.
        return Math.max(mmCoreCronMinInterval, parseInt(hooks[name].instance.getInterval(), 10));
    };

    /**
     * Get a hook's last execution ID.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#_getHookLastExecutionId
     * @param {String} name Hook's name.
     * @return {String}     Hook's last execution ID.
     * @protected
     */
    self._getHookLastExecutionId = function(name) {
        return 'last_execution_'+name;
    };

    /**
     * Get a hook's last execution time. If not defined, return 0.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#_getHookLastExecutionTime
     * @param {String} name Hook's name.
     * @return {Promise}    Promise resolved with the hook's last execution time.
     * @protected
     */
    self._getHookLastExecutionTime = function(name) {
        var id = self._getHookLastExecutionId(name);
        return $mmApp.getDB().get(mmCoreCronStore, id).then(function(entry) {
            var time = parseInt(entry.value);
            return isNaN(time) ? 0 : time;
        }).catch(function() {
            return 0; // Not set, return 0.
        });
    };

    /**
     * Check if there is any sync hook registered.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#hasSyncHooks
     * @return {Boolean} True if has at least 1 sync hook, false othewise.
     */
    self.hasSyncHooks = function() {
        for (var name in hooks) {
            if (self._isHookSync(name)) {
                return true;
            }
        }
        return false;
    };

    /**
     * Check if a hook uses network. Defaults to true.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#_hookUsesNetwork
     * @param {String} name Hook's name.
     * @return {Boolean}    True if hook uses network or not defined, false otherwise.
     * @protected
     */
    self._hookUsesNetwork = function(name) {
        if (!hooks[name] || !hooks[name].instance || !angular.isFunction(hooks[name].instance.usesNetwork)) {
            // Invalid, return default.
            return true;
        }

        return hooks[name].instance.usesNetwork();
    };

    /**
     * Check if a hook is a sync process. Defaults to true.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#_isHookSync
     * @param {String} name Hook's name.
     * @return {Boolean}    True if hook is a sync process or not defined, false otherwise.
     * @protected
     */
    self._isHookSync = function(name) {
        if (!hooks[name] || !hooks[name].instance || !angular.isFunction(hooks[name].instance.isSync)) {
            // Invalid, return default.
            return true;
        }

        return hooks[name].instance.isSync();
    };

    /**
     * Register a hook to be executed every certain time.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#register
     * @param {String} name                    Hook's name. Must be unique.
     * @param {String|Object|Function} handler Must be resolved to an object defining the following functions. Or to a function
     *                           returning an object defining these functions. See {@link $mmUtil#resolveObject}.
     *                             - getInterval (Number) Returns hook's interval in milliseconds. Defaults to mmCoreCronInterval.
     *                             - usesNetwork (Boolean) Whether the process uses network or not. True if not defined.
     *                             - isSync (Boolean) Whether it's a synchronization process or not. False if not defined.
     *                             - execute(siteId) (Promise) Execute the process. Should return a promise. Receives the ID of the
     *                                 site affected, undefined for all sites. Important: If the promise is rejected then this
     *                                 function will be called again often, it shouldn't be abused.
     */
    self.register = function(name, handler) {
        if (typeof hooks[name] != 'undefined') {
            $log.debug('The cron hook \''+name+'\' is already registered.');
            return;
        }

        $log.debug('Register hook \''+name+'\' in cron.');

        hooks[name] = {
            name: name,
            handler: handler,
            instance: $mmUtil.resolveObject(handler, true),
            running: false
        };

        if (!hooks[name].instance) {
            $log.error('The cron hook \''+name+'\' has an invalid instance, deleting.');
            delete hooks[name];
            return;
        }

        // Start the hook.
        self._startHook(name);
    };

    /**
     * Schedule a next execution for a hook.
     *
     * @param  {String} name Name of the hook.
     * @param  {Number} [time] Time to the next execution. If not supplied it will be calculated using the last execution and
     *                         the hook's interval. This param should be used only if it's really necessary.
     * @return {Void}
     */
    function scheduleNextExecution(name, time) {
        if (!hooks[name]) {
            // Invalid hook.
            return;
        }
        if (hooks[name].timeout && hooks[name].timeout.$$state && hooks[name].timeout.$$state.status === 0) {
            // There's already a pending timeout.
            return;
        }

        var promise;

        time = parseInt(time, 10);

        if (time) {
            promise = $q.when(time);
        } else {
            // Get last execution time to check when do we need to execute it.
            promise = self._getHookLastExecutionTime(name).then(function(lastExecution) {
                var interval = self._getHookInterval(name),
                    nextExecution = lastExecution + interval,
                    now = new Date().getTime();

                return nextExecution - now;
            });
        }

        promise.then(function(nextExecution) {
            $log.debug('Scheduling next execution of hook \'' + name + '\' in: ' + nextExecution + 'ms');
            if (nextExecution < 0) {
                nextExecution = 0; // Big negative numbers aren't executed immediately.
            }

            hooks[name].timeout = $timeout(function() {
                self._executeHook(name);
            }, nextExecution);
        });
    }

    /**
     * Set a hook's last execution time.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#_setHookLastExecutionTime
     * @param {String} name Hook's name.
     * @param {Number} time Time to set.
     * @return {Promise}    Promise resolved when the execution time is saved.
     * @protected
     */
    self._setHookLastExecutionTime = function(name, time) {
        var id = self._getHookLastExecutionId(name),
            entry = {
                id: id,
                value: parseInt(time, 10)
            };

        return $mmApp.getDB().insert(mmCoreCronStore, entry);
    };

    /**
     * Start running periodically the hooks that use network.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#startNetworkHooks
     * @return {Void}
     */
    self.startNetworkHooks = function() {
        angular.forEach(hooks, function(hook) {
            if (self._hookUsesNetwork(hook.name)) {
                self._startHook(hook.name);
            }
        });
    };

    /**
     * Start running a hook periodically.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#_startHook
     * @param  {String} name Name of the hook.
     * @return {Void}
     * @protected
     */
    self._startHook = function(name) {
        if (!hooks[name]) {
            // Invalid hook.
            $log.debug('Cannot start hook \''+name+'\', is invalid.');
            return;
        }

        if (hooks[name].running) {
            $log.debug('Hook \''+name+'\' is already running.');
            return;
        }

        hooks[name].running = true;

        scheduleNextExecution(name);
    };

    /**
     * Stop running a hook periodically.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmCronDelegate#_stopHook
     * @param  {String} name Name of the hook.
     * @return {Void}
     * @protected
     */
    self._stopHook = function(name) {
        if (!hooks[name]) {
            // Invalid hook.
            $log.debug('Cannot stop hook \''+name+'\', is invalid.');
            return;
        }

        if (!hooks[name].running) {
            $log.debug('Cannot stop hook \''+name+'\', it\'s not running.');
            return;
        }

        hooks[name].running = false;
        $timeout.cancel(hooks[name].timeout);
    };

    return self;
})

.run(function($mmEvents, $mmCronDelegate, mmCoreEventOnlineStatusChanged) {
    $mmEvents.on(mmCoreEventOnlineStatusChanged, function(online) {
        if (online) {
            $mmCronDelegate.startNetworkHooks();
        }
    });
});
