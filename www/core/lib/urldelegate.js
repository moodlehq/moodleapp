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
 * Service to handle custom URLs schemes. Notifies all the observers when the app is invoked with a custom URL.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmURLDelegate
 */
.factory('$mmURLDelegate', function($log) {

    $log = $log.getInstance('$mmURLDelegate');

    var observers = {},
        self = {},
        lastUrls = {};

    /**
     * Register an observer to be notified when the app is launched via custom URL scheme.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmURLDelegate#register
     * @param {String} name       Observer's name. Must be unique.
     * @param {Function} callback Function to call with the URLs received by the app. This function should check if the URL
     *                            is the one expected by the observer and return true if it is, return false otherwise.
     */
    self.register = function(name, callback) {
        $log.debug("Register observer '"+name+"' for custom URL.");
        observers[name] = callback;
    };

    /**
     * Notify all observers.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmURLDelegate#notify
     * @param {String} url URL to notify to the observers.
     */
    self.notify = function(url) {
        var treated = false; // Once an observer accepts a URL (return true) we stop notifying.

        // First check that the URL hasn't been treated some instants. This is because sometimes this is called more than once.
        if (lastUrls[url] && Date.now() - lastUrls[url] < 3000) {
            // Function called more than once, stop.
            return;
        }

        lastUrls[url] = Date.now();

        angular.forEach(observers, function(callback) {
            if (!treated && typeof(callback) === 'function') {
                treated = callback(url);
            }
        });
    };

    return self;
})

.run(function($mmURLDelegate, $log) {
    window.handleOpenURL = function(url) {
        $log.debug('App launched by URL. ' + url);
        $mmURLDelegate.notify(url);
    };
});
