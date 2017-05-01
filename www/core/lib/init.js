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

/**
 * The default priority for init processes.
 * @module mm.core
 * @ngdoc constant
 * @name mmInitDelegateDefaultPriority
 */
.constant('mmInitDelegateDefaultPriority', 100)

/**
 * The maximum priority that an addon can use for init process, anything over that is reserved for core use.
 * @module mm.core
 * @ngdoc constant
 * @name mmInitDelegateMaxAddonPriority
 */
.constant('mmInitDelegateMaxAddonPriority', 599)

/**
 * Provider for initialisation mechanisms.
 *
 * @module mm.core
 * @ngdoc provider
 * @name $mmInitDelegate
 */
.provider('$mmInitDelegate', function(mmInitDelegateDefaultPriority) {
    var initProcesses = {},
        self = {};

    /**
     * Registers an initialisation process.
     *
     * @description
     * Init processes can be used to add initialisation logic to the app. Anything that should
     * block the user interface while some processes are done should be an init process. When defining
     * an init process make sure you do not set a priority higher than mmInitDelegateMaxAddonPriority
     * in your addons. This is to make sure that your process does not happen before some essential
     * other core processes such as the upgrade, and restoring the user session.
     *
     * An init process should never change state or prompt user interaction.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmInitDelegateProvider#registerProcess
     * @param {String} name The name of the process.
     * @param {String|Function} callable The callable of the process. See {@link $mmUtil.resolveObject}.
     *                                   The resolved function will get $injector as first argument.
     * @param {Number} [priority=100] The priority of the process, the highest priority is executed first.
     * @param {Boolean} [blocking=false] Set this to true when this process should be resolved before any following one.
     * @return {Void}
     */
    self.registerProcess = function(name, callable, priority, blocking) {
        priority = typeof priority === 'undefined' ? mmInitDelegateDefaultPriority : priority;

        if (typeof initProcesses[name] !== 'undefined') {
            console.log('$mmInitDelegateProvider: Process \'' + name + '\' already defined.');
            return;
        }

        console.log('$mmInitDelegateProvider: Registered process \'' + name + '\'.');
        initProcesses[name] = {
            blocking: blocking,
            callable: callable,
            name: name,
            priority: priority
        };
    };

    self.$get = function($q, $log, $injector, $mmUtil) {

        $log = $log.getInstance('$mmInitDelegate');

        var self = {},
            readiness;

        /**
         * Convenience function to return a function that executes the process.
         *
         * @param  {Object} data The data of the process.
         * @return {Function}
         */
        function prepareProcess(data) {
            var promise,
                fn;

            $log.debug('Executing init process \'' + data.name + '\'');

            try {
                fn = $mmUtil.resolveObject(data.callable);
            } catch (e) {
                $log.error('Could not resolve object of init process \'' + data.name + '\'. ' + e);
                return;
            }

            try {
                promise = fn($injector);
            } catch (e) {
                $log.error('Error while calling the init process \'' + data.name + '\'. ' + e);
                return;
            }

            return promise;
        }

        /**
         * Executes the registered init processes.
         *
         * Reserved for core use, do not call directly.
         *
         * @module mm.core
         * @ngdoc service
         * @name $mmInitDelegate#executeInitProcesses
         * @protected
         * @return {Void}
         */
        self.executeInitProcesses = function() {
            var ordered = [];

            if (typeof readiness === 'undefined') {
                readiness = $q.defer();
            }

            // Re-ordering by priority.
            angular.forEach(initProcesses, function(data) {
                ordered.push(data);
            });
            ordered.sort(function(a, b) {
                return b.priority - a.priority;
            });

            ordered = ordered.map(function (data) {
                return {
                    func: prepareProcess,
                    params: [data],
                    blocking: !!data.blocking
                };
            });

            // Execute all the processes in order to solve dependencies.
            $mmUtil.executeOrderedPromises(ordered, true).finally(readiness.resolve);
        };

        /**
         * Notifies when the app is ready.
         *
         * This returns a promise that is resolved when the app is initialised.
         *
         * Reserved for core use, do not call directly, use {@link $mmApp.ready} instead.
         *
         * @module mm.core
         * @ngdoc service
         * @name $mmInitDelegate#ready
         * @protected
         * @return {Promise} Resolved when the app is initialised. Never rejected.
         */
        self.ready = function() {
            if (typeof readiness === 'undefined') {
                // Prevent race conditions if this is called before executeInitProcesses.
                readiness = $q.defer();
            }

            return readiness.promise;
        };

        return self;
    };

    return self;
});
