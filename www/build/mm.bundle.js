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
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})

angular.module('mm.core', []);

angular.module('mm.core')
.provider('$mmApp', function() {
        var DBNAME = 'MoodleMobile',
        dboptions = {
            autoSchema: true
        },
        dbschema = {
            stores: []
        };
        this.registerStore = function(store) {
        if (typeof(store.name) === 'undefined') {
            console.log('$mmApp: Error: store name is undefined.');
            return;
        } else if (storeExists(store.name)) {
            console.log('$mmApp: Error: store ' + store.name + ' is already defined.');
            return;
        }
        dbschema.stores.push(store);
    }
        this.registerStores = function(stores) {
        var self = this;
        angular.forEach(stores, function(store) {
            self.registerStore(store);
        })
    }
        function storeExists(name) {
        var exists = false;
        angular.forEach(dbschema.stores, function(store) {
            if (store.name === name) {
                exists = true;
            }
        });
        return exists;
    }
    this.$get = function($mmDB) {
        var db = $mmDB.getDB(DBNAME, dbschema, dboptions),
            self = {};
                self.getDB = function() {
            return db;
        };
                self.getSchema = function() {
            return dbschema;
        }
        return self;
    }
});

angular.module('mm.core')
.constant('mmConfigStore', 'config')
.config(function($mmAppProvider, mmConfigStore) {
    var stores = [
        {
            name: mmConfigStore,
            keyPath: 'name'
        }
    ];
    $mmAppProvider.registerStores(stores);
})
.factory('$mmConfig', function($http, $q, $mmApp, mmConfigStore) {
    var self = {
        config: {}
    };
    self.initConfig = function() {
        var deferred = $q.defer();
        if( Object.keys(self.config).length > 0) {
            deferred.resolve();
            return deferred.promise;
        }
        $http.get('config.json').then(function(response) {
            var data = response.data;
            for(var name in data) {
                self.set(name, data[name]);
            }
            deferred.resolve();
        }, deferred.reject);
        return deferred.promise;
    };
    self.get = function(name) {
        var deferred = $q.defer();
        var value = self.config[name];
        if (typeof(value) == 'undefined' ){
            $mmApp.getDB().get(mmConfigStore, name).then(deferred.resolve, deferred.reject);
        }
        else {
            deferred.resolve(value);
        }
        return deferred.promise;
    };
    self.set = function(name, value) {
        self.config[name] = value;
        $mmApp.getDB().insert(mmConfigStore, {name: name, value: value});
    };
    return self;
});

angular.module('mm.core')
.factory('$mmDB', function($q, $log) {
    var self = {};
        function callDBFunction(db, func) {
        var deferred = $q.defer();
        try{
            if(typeof(db) != 'undefined') {
                db[func].apply(db, Array.prototype.slice.call(arguments, 2)).then(function(result) {
                    if(typeof(result) == 'undefined') {
                        deferred.reject();
                    } else {
                        deferred.resolve(result);
                    }
                });
            } else {
                deferred.reject();
            }
        } catch(ex) {
            $log.error('Error executing function '+func+' to DB '+db.getName());
            $log.error(ex.name+': '+ex.message);
            deferred.reject();
        }
        return deferred.promise;
    }
        function callWhere(db, table, field_name, op, value, op2, value2) {
        var deferred = $q.defer();
        try{
            if(typeof(db) != 'undefined') {
                db.from(table).where(field_name, op, value, op2, value2).list().then(function(list) {
                    deferred.resolve(list);
                }, function() {
                    deferred.reject();
                });
            } else {
                deferred.reject();
            }
        } catch(ex) {
            $log.error('Error querying db '+db.getName()+'. '+ex.name+': '+ex.message);
            deferred.reject();
        }
        return deferred.promise;
    }
        function callWhereEqual(db, table, field_name, value) {
        var deferred = $q.defer();
        try{
            if(typeof(db) != 'undefined') {
                db.from(table).where(field_name, '=', value).list().then(function(list) {
                    deferred.resolve(list);
                }, function() {
                    deferred.reject();
                });
            } else {
                deferred.reject();
            }
        } catch(ex) {
            $log.error('Error getting where equal from db '+db.getName()+'. '+ex.name+': '+ex.message);
            deferred.reject();
        }
        return deferred.promise;
    }
        function callEach(db, table, callback) {
        var deferred = $q.defer();
        callDBFunction(db, 'values', table, undefined, 99999999).then(function(entries) {
            for(var i = 0; i < entries.length; i++) {
                callback(entries[i]);
            }
            deferred.resolve();
        }, function() {
            deferred.reject();
        });
        return deferred.promise;
    };
        self.getDB = function(name, schema) {
        var db = new ydn.db.Storage(name, schema);
        return {
            getName: function() {
                return db.getName();
            },
            get: function(table, id) {
                return callDBFunction(db, 'get', table, id);
            },
            getAll: function(table) {
                return callDBFunction(db, 'values', table, undefined, 99999999);
            },
            count: function(table) {
                return callDBFunction(db, 'count', table);
            },
            insert: function(table, value) {
                return callDBFunction(db, 'put', table, value);
            },
            remove: function(table, id) {
                return callDBFunction(db, 'remove', table, id);
            },
            where: function(table, field_name, op, value, op2, value2) {
                return callWhere(db, table, field_name, op, value, op2, value2);
            },
            whereEqual: function(table, field_name, value) {
                return callWhereEqual(db, table, field_name, value);
            },
            each: function(table, callback) {
                return callEach(db, table, callback);
            },
            close: function() {
                db.close();
                db = undefined;
            }
        };
    };
        self.deleteDB = function(name) {
        return ydn.db.deleteDatabase(name);
    };
    return self;
});
