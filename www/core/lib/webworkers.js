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
 * Web workers service.
 * Please read this service description carefully.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmWebWorkers
 * @description
 * This service makes easier to use WebWorkers.
 *
 * $mmWebWorkers#isSupportedByDevice MUST be called before calling $mmWebWorkers#startWorker. Also, if your WebWorker will
 * connect with a Moodle site you need to check $mmWebWorkers#isSupportedInSite too.
 *
 * All WebWorkers will receive a workerId (String). The WebWorker MUST return this parameter in all the postMessage
 * with the name "workerId", otherwise the response won't be treated.
 *
 * If your WebWorker needs to send more than one message back to the caller, those messages need to include a flag
 * named "notify" set to true. If this flag isn't found in the message, it will be treated as a final message and
 * further messages will be ignored. Messages with "notify" flags will be passed to the promise's "notify" method.
 *
 * Example usage:
 *
 * if ($mmWebWorkers.isSupportedByDevice() && $mmWebWorkers.isSupportedInSite(site.getInfo().version)) {
 *     $mmWebWorkers.startWorker(name, path, params).then(function() {
 *         // Final message will be received in here.
 *     }, function() {
 *         // An error occurred.
 *     }, function() {
 *         // Messages with "notify" flag will be received in here.
 *     })
 * }
 *
 * Example worker:
 *
 * self.onmessage = function(e) {
 *     // Do something.
 *     returnParams.workerId = e.data.workerId;
 *     that.postMessage(returnParams);
 * }
 */
.factory('$mmWebWorkers', function($injector, $q, $log, $window, md5) {

    $log = $log.getInstance('$mmWebWorkers');

    var self = {},
        workers = {};

    /**
     * Create a worker.
     *
     * @param  {String} name Name to identify the worker. Must be unique for each worker to create.
     * @param  {String} path The path to the file with the worker's code.
     * @return {Boolean}     True if no exception, false otherwise. Returning true doesn't guarantee that the worker
     *                       is created successfully since the creation is asynchronous.
     */
    function createWorker(name, path) {
        try {
            if (typeof workers[name] == 'undefined') {
                workers[name] = {
                    path: path,
                    worker: new Worker(path)
                };
            } else {
                $log.warn('There\'s already a worker with this name: ' + name);
            }
            return true;
        } catch(ex) {
            return false;
        }
    }

    /**
     * Check if WebWorkers are supported in the current device.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmWebWorkers#isSupportedByDevice
     * @return {Boolean} True if supported, false otherwise.
     */
    self.isSupportedByDevice = function() {
        return !!$window.Worker && !!$window.URL;
    };

    /**
     * Check if WebWorkers are supported in a certain site.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmWebWorkers#isSupportedInSite
     * @param  {Number} [version] The site version. If not defined, current site will be used.
     * @return {Boolean}          True if supported, false otherwise.
     */
    self.isSupportedInSite = function(version) {
        if (!version) {
            // We use injector to keep this service as independent as possible.
            var site = $injector.get('$mmSite');
            if (!site || !site.isLoggedIn()) {
                return false;
            }
            version = site.getInfo().version;
        }

        // WebWorkers needs CORS enabled at the Moodle site, it is supported from 2.8.
        return version >= 2014111000;
    };

    /**
     * Start a worker.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmWebWorkers#startWorker
     * @param  {String} name   Name to identify the worker. Must be unique for each worker to create.
     * @param  {String} path   The path to the file with the worker's code.
     * @param  {Object} params Parameters to send to the worker.
     * @return {Promise}       Promise resolved with the final response and rejected if error. This promise's notify
     *                         method will be called for each notify message we receive from the worker.
     */
    self.startWorker = function(name, path, params) {
        if (typeof workers[name] == 'undefined') {
            // Worker not created yet, create it.
            if (!createWorker(name, path)) {
                return $q.reject();
            }
        } else if (workers[name].path != path) {
            $log.warn('The path of the worker to call doesn\t match the path passed as parameter: ', name, path);
            return $q.reject();
        }

        var deferred = $q.defer(),
            id = md5.createHash(JSON.stringify(params)),
            worker = workers[name].worker;

        // Add listeners.
        worker.addEventListener('message', onMessage, false);
        worker.addEventListener('error', onError, false);

        // Add workerId and send params.
        params.workerId = id;
        worker.postMessage(params);

        return deferred.promise;

        // Treat a message received from the worker.
        function onMessage(e) {
            if (e && e.data) {
                if (e.data.workerId == id) {
                    // Same id as called, it's the response we expected.
                    delete e.data.workerId;

                    if (e.data.notify) {
                        deferred.notify(e.data);
                    } else {
                        // Notify flag not found, it's the final message.
                        worker.removeEventListener('message', onMessage, false);
                        worker.removeEventListener('error', onError, false);
                        deferred.resolve(e.data);
                    }
                }
            } else {
                // No event or data received, reject.
                deferred.reject();
            }
        }

        // Treat an error received from the worker.
        function onError() {
            // An error occurred, we delete the worker since it could be an error while creating it.
            worker.removeEventListener('message', onMessage, false);
            worker.removeEventListener('error', onError, false);
            delete workers[name];
            deferred.reject();
        }
    };

    return self;

});
