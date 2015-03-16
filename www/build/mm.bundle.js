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

angular.module('mm', ['ionic', 'mm.core'])
.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})

angular.module('mm.core', []);

angular.module('mm.core')
.factory('$mmWS', function($http, $q, $log) {
    var self = {};
        self.call = function(method, data, preSets) {
        var deferred = $q.defer(),
            siteurl;
        data = convertValuesToString(data);
        preSets = self.verifyPresets(preSets);
        if (!preSets) {
            deferred.reject("unexpectederror");
            return;
        }
        data.wsfunction = method;
        data.wstoken = preSets.wstoken;
        siteurl = preSets.siteurl + '/webservice/rest/server.php?moodlewsrestformat=json';
        var ajaxData = data;
        $http.post(siteurl, ajaxData).success(function(data) {
            if (!data && !preSets.responseExpected) {
                data = {};
            }
            if (!data) {
                deferred.reject('cannotconnect');
                return;
            }
            if (typeof(data.exception) !== 'undefined') {
                if (data.errorcode == 'invalidtoken' || data.errorcode == 'accessexception') {
                    $log.error("Critical error: " + JSON.stringify(data));
                    deferred.reject('lostconnection');
                    return;
                } else {
                    deferred.reject(data.message);
                    return;
                }
            }
            if (typeof(data.debuginfo) != 'undefined') {
                deferred.reject('Error. ' + data.message);
                return;
            }
            $log.info('WS: Data received from WS ' + typeof(data));
            if (typeof(data) == 'object' && typeof(data.length) != 'undefined') {
                $log.info('WS: Data number of elements '+ data.length);
            }
            deferred.resolve(angular.copy(data));
        }).error(function(data) {
            deferred.reject('cannotconnect');
            return;
        });
        return deferred.promise;
    };
         function verifyPresets(preSets) {
        if (typeof(preSets) === 'undefined' || preSets == null) {
            preSets = {};
        }
        if (typeof(preSets.getFromCache) === 'undefined') {
            preSets.getFromCache = 1;
        }
        if (typeof(preSets.saveToCache) === 'undefined') {
            preSets.saveToCache = 1;
        }
        if (typeof(preSets.sync) === 'undefined') {
            preSets.sync = 0;
        }
        if (typeof(preSets.omitExpires) === 'undefined') {
            preSets.omitExpires = false;
        }
        if (typeof(preSets.wstoken) === 'undefined') {
            return false;
        }
        if (typeof(preSets.siteurl) === 'undefined') {
            return false;
        }
        return preSets;
    };
        function convertValuesToString(data) {
        var result = [];
        if (!angular.isArray(data) && angular.isObject(data)) {
            result = {};
        }
        for (var el in data) {
            if (angular.isObject(data[el])) {
                result[el] = convertValuesToString(data[el]);
            } else {
                result[el] = data[el] + '';
            }
        }
        return result;
    };
    return self;
});
