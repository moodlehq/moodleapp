angular.module('mm.core')

.factory('$mmWS', function($http, $q, $injector) {

    var deprecatedFunctions = {
        "moodle_webservice_get_siteinfo": "core_webservice_get_site_info",
        "moodle_enrol_get_users_courses": "core_enrol_get_users_courses",
        "moodle_notes_create_notes": "core_notes_create_notes",
        "moodle_message_send_instantmessages": "core_message_send_instant_messages",
        "moodle_user_get_users_by_courseid": "core_enrol_get_enrolled_users",
        "moodle_user_get_course_participants_by_id": "core_user_get_course_user_profiles",
    };

    var self = {};

    /**
     * A wrapper function for a moodle WebService call.
     *
     * @param {string} method The WebService method to be called.
     * @param {Object} data Arguments to pass to the method.
     * @param {Object} preSets Extra settings
     *      cache For avoid using caching
     *      sync For indicate that is a call in a sync process
     *      silently For not raising errors.
     */
    self.moodleWSCall = function(method, data, preSets) {

        var deferred = $q.defer();

        data = self.convertValuesToString(data);
        preSets = self.verifyPresets(preSets);

        if(!preSets) {
            deferred.reject("unexpectederror");
            return;
        }

        // TODO: Emulatrd site?

        // Check if is a deprecated function.
        if (typeof deprecatedFunctions[method] != "undefined") {
            if (self.wsAvailable(preSets.wsfunctions, deprecatedFunctions[method])) {
                //MM.log("You are using deprecated Web Services: " + method + " you must replace it with the newer function: " + MM.deprecatedFunctions[method]);
                // Use the non-deprecated function.
                method = deprecatedFunctions[method];
            } else {
                //MM.log("You are using deprecated Web Services. Your remote site seems to be outdated, consider upgrade it to the latest Moodle version.");
            }
        }

        data.wsfunction = method;
        data.wstoken = preSets.wstoken;

        preSets.siteurl += '/webservice/rest/server.php?moodlewsrestformat=json';
        var ajaxData = data;

        // TODO: Sync
        // TODO: Get from cache
        // TODO: Show error if not connected.
        // TODO: Show loading?

        $http.post(preSets.siteurl, ajaxData).success(function(data) {
            // Some moodle web services return null.
            // If the responseExpected value is set then so long as no data
            // is returned, we create a blank object.
            if (!data && !preSets.responseExpected) {
                data = {};
            }

            if (!data) {
                deferred.reject('cannotconnect');
                return;
            }

            if (typeof(data.exception) != 'undefined') {
                // if (!preSets.silently && preSets.showModalLoading) {
                //     MM.closeModalLoading();
                // }
                if (data.errorcode == 'invalidtoken' || data.errorcode == 'accessexception') {

                    deferred.reject('lostconnection');

                    // if (!preSets.silently) {
                    //     MM.popMessage(MM.lang.s("lostconnection"));
                    // }
                    // MM.log("Critical error: " + JSON.stringify(data));

                    // TODO: Send an event to logout the user and refirect to login page
                    return;
                } else {
                    deferred.reject(data.message);
                    return;
                }
            }

            if (typeof(data.debuginfo) != 'undefined') {
                // if (!preSets.silently && preSets.showModalLoading) {
                //     MM.closeModalLoading();
                // }
                deferred.reject('Error. ' + data.message);
                // if (errorCallBack) {
                //     errorCallBack('Error. ' + data.message);
                // } else {
                //     if (!preSets.silently) {
                //         MM.popErrorMessage('Error. ' + data.message);
                //     }
                // }
                return;
            }

            // MM.log('WS: Data received from WS '+ typeof(data));

            // if (typeof(data) == 'object' && typeof(data.length) != 'undefined') {
            //     MM.log('WS: Data number of elements '+ data.length);
            // }

            // if (preSets.saveToCache) {
            //     MM.cache.addWSCall(preSets.siteurl, ajaxData, data);
            // }

            // if (!preSets.silently && preSets.showModalLoading) {
            //     MM.closeModalLoading();
            // }

            // We pass back a clone of the original object, this may
            // prevent errors if in the callback the object is modified.
            deferred.resolve(angular.copy(data));

        }).error(function(data) {
            // MM.closeModalLoading();
            deferred.reject('cannotconnect');

            // var error = MM.lang.s('cannotconnect');
            // if (xhr.status == 404) {
            //     error = MM.lang.s('invalidscheme');
            // }
            // if (!preSets.silently) {
            //     MM.popErrorMessage(error);
            // } else {
            //     MM.log('WS: error on ' + method + ' error: ' + error);
            // }
        });

        return deferred.promise;
    };

    self.verifyPresets = function(preSets) {
        if (typeof(preSets) == 'undefined' || preSets == null) {
            preSets = {};
        }
        if (typeof(preSets.getFromCache) == 'undefined') {
            preSets.getFromCache = 1;
        }
        if (typeof(preSets.saveToCache) == 'undefined') {
            preSets.saveToCache = 1;
        }
        if (typeof(preSets.sync) == 'undefined') {
            preSets.sync = 0;
        }
        if (typeof(preSets.silently) == 'undefined') {
            preSets.silently = false;
        }
        if (typeof(preSets.omitExpires) == 'undefined') {
            preSets.omitExpires = false;
        }

        if (typeof(preSets.wstoken) == 'undefined') {
            return false;
        }

        if (typeof(preSets.siteurl) == 'undefined') {
            return false;
        }

        return preSets;
    };

    /**
     * Converts an objects values to strings where appropriate.
     * Arrays (associative or otherwise) will be maintained.
     *
     * @param {Object} data The data that needs all the non-object values set to strings.
     * @return {Object} The cleaned object, with multilevel array and objects preserved.
     */
    self.convertValuesToString = function(data) {
        var result = [];
        if (!angular.isArray(data) && angular.isObject(data)) {
            result = {};
        }
        for (var el in data) {
            if (angular.isObject(data[el])) {
                result[el] = self.convertValuesToString(data[el]);
            } else {
                result[el] = data[el] + '';
            }
        }
        return result;
    };

    /**
     * Check if a web service is available in the remote Moodle site.
     *
     * @return {bool} True if the web service exists (depends on Moodle version)
     */
    self.wsAvailable = function(functions, wsName) {
        if (!functions) {
            return false;
        }

        for(var i = 0; i < functions.length; i++) {
            var f = functions[i];
            if (f.name == wsName) {
                return true;
            }
        }
        return false;
    };

    return self;

});