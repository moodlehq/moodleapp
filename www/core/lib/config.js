angular.module('mm.core')

.factory('$mmConfig', function($http, $q) {

    var store = window.sessionStorage;
    var self = {};
    self.config = {};

    self.initConfig = function() {

        var deferred = $q.defer();

        if( Object.keys(self.config).length > 0) {
            // Already loaded
            deferred.resolve();
            return deferred.promise;
        }

        $http.get('config.json')
            .then(function(response) {
                self.config = response.data;
                deferred.resolve();
            }, function(response) {
                deferred.reject();
            });

        return deferred.promise;
    };

    self.get = function(name) {
        var value = self.config[name];
        if(typeof(value) == 'undefined' ){
            value = store[name];
            if(typeof(value) == 'undefined' || value == null) {
                return undefined;
            }
            return JSON.parse( value );
        }
        return value;
    };

    self.set = function(name, value) {
        self.config[name] = value;
        store[name] = JSON.stringify(value);
    };

    return self;

});