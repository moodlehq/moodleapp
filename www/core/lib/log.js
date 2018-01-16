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

.constant('mmCoreLogEnabledDefault', false) // Default value for logEnabled.
.constant('mmCoreLogEnabledConfigName', 'debug_enabled')

/**
 * Provider to decorate angular's $log service.
 *
 * @module mm.core
 * @ngdoc provider
 * @name $mmLog
 * @description
 * $mmLogProvider.logDecorator function is designed to decorate '$log'. It should be used like this:
 *     $provide.decorator('$log', ['$delegate', $mmLogProvider.logDecorator]);
 *
 * Decorated $log usage:
 *     $log = $log.getInstance('MyFactory')
 *     $log.debug('My message') -> "dd/mm/aaaa hh:mm:ss MyFactory: My message"
 *
 * To permanently enable/disable logging messages, use:
 *     $mmLog.enabled(true/false)
 */
.provider('$mmLog', function(mmCoreLogEnabledDefault) {

    var isEnabled = mmCoreLogEnabledDefault,
        self = this;

    // Function to pre-capture a logger function.
    function prepareLogFn(logFn, className) {
        className = className || '';
        // Invoke the specified 'logFn' with our new code.
        var enhancedLogFn = function() {
            if (isEnabled) {
                var args = Array.prototype.slice.call(arguments),
                    now  = moment().format('l LTS');

                args[0] = now + ' ' + className + ': ' + args[0]; // Prepend timestamp and className to the original message.
                logFn.apply(null, args);
            }
        };

        // Special, only needed to support angular-mocks expectations.
        enhancedLogFn.logs = [];

        return enhancedLogFn;
    }

    /**
     * Enhances $log service, adding date and component to the logged message, and allowing disable log.
     *
     * @param  {Service} $log Angular's $log service to decorate.
     * @return {Service}      Decorated $log.
     */
    self.logDecorator = function($log) {
        // Copy the original methods.
        var _$log = (function($log) {
            return {
                log   : $log.log,
                info  : $log.info,
                warn  : $log.warn,
                debug : $log.debug,
                error : $log.error
            };
        })($log);

        // Create the getInstance method so services/controllers can configure the className to be shown.
        var getInstance = function(className) {
            return {
                log   : prepareLogFn(_$log.log, className),
                info  : prepareLogFn(_$log.info, className),
                warn  : prepareLogFn(_$log.warn, className),
                debug : prepareLogFn(_$log.debug, className),
                error : prepareLogFn(_$log.error, className)
            };
        };

        // Decorate original $log functions too. This way if a service/controller uses $log without $log.getInstance,
        // it's going to prepend the date and 'Core'.
        $log.log   = prepareLogFn($log.log);
        $log.info  = prepareLogFn($log.info);
        $log.warn  = prepareLogFn($log.warn);
        $log.debug = prepareLogFn($log.debug);
        $log.error = prepareLogFn($log.error);
        $log.getInstance = getInstance;

        return $log;
    };

    this.$get = function($mmConfig, mmCoreLogEnabledDefault, mmCoreLogEnabledConfigName) {
        var self = {};

        /**
         * Initialize logging, enabling/disabling it based on settings and mmCoreLogEnabledDefault.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmLog#init
         */
        self.init = function() {
            $mmConfig.get(mmCoreLogEnabledConfigName).then(function(enabled) {
                isEnabled = enabled;
            }, function() {
                // Not set, use default value.
                isEnabled = mmCoreLogEnabledDefault;
            });
        }

        /**
         * Enable/disable logging in the app.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmLog#enabled
         * @param {Boolean} flag True if log should be enabled, false otherwise.
         */
        self.enabled = function(flag) {
            $mmConfig.set(mmCoreLogEnabledConfigName, flag);
            isEnabled = flag;
        };

        /**
         * Check if app logging is enabled.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmLog#isEnabled
         * @return {Boolean} True if log is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return isEnabled;
        };

        return self;
    };
})

.run(function($mmLog) {
    $mmLog.init();
});
