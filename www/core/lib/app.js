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
 * Factory to provide some global functionalities, like access to the global app database.
 *
 * @module mm.core
 * @ngdoc provider
 * @name $mmApp
 * @description
 * This provider is the interface with the app database. The modules that need to store
 * information here need to register their stores.
 *
 * Example:
 *
 * .config(function($mmAppProvider) {
 *      $mmAppProvider.registerStore({
 *          name: 'settings',
 *          keyPath: 'name'
 *      });
 *  })
 */
.provider('$mmApp', function() {

    /** Define the app storage schema. */
    var DBNAME = 'MoodleMobile',
        dbschema = {
            stores: []
        },
        dboptions = {
            autoSchema: true
        };

    /**
     * Register a store schema.
     *
     * @param  {Object} store The store object definition.
     * @return {Void}
     */
    this.registerStore = function(store) {
        if (typeof(store.name) === 'undefined') {
            console.log('$mmApp: Error: store name is undefined.');
            return;
        } else if (storeExists(store.name)) {
            console.log('$mmApp: Error: store ' + store.name + ' is already defined.');
            return;
        }
        dbschema.stores.push(store);
    };

    /**
     * Register multiple stores at once.
     *
     * @param  {Array} stores Array of store objects.
     * @return {Void}
     */
    this.registerStores = function(stores) {
        var self = this;
        angular.forEach(stores, function(store) {
            self.registerStore(store);
        });
    };

    /**
     * Check if a store is already defined.
     *
     * @param  {String} name The name of the store.
     * @return {Boolean} True when the store was already defined.
     */
    function storeExists(name) {
        var exists = false;
        angular.forEach(dbschema.stores, function(store) {
            if (store.name === name) {
                exists = true;
            }
        });
        return exists;
    }

    this.$get = function($mmDB, $cordovaNetwork, $q) {

        var db = $mmDB.getDB(DBNAME, dbschema, dboptions),
            self = {};

        /**
         * Get the application global database.
         * @return {Object} App's DB.
         */
        self.getDB = function() {
            return db;
        };

        /**
         * Get the database schema.
         *
         * Do not use this method to modify the schema. Use $mmAppProvider#registerStore instead.
         *
         * @return {Object} The schema.
         */
        self.getSchema = function() {
            return dbschema;
        };

        /**
         * Returns whether we are online.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmApp#isOnline
         * @return {Bool} True when we are.
         * @description
         * This methods returns whether the app is online or not.
         * Note that a browser is always considered being online.
         */
        self.isOnline = function() {
            return typeof navigator.connection === 'undefined' || $cordovaNetwork.isOnline();
        };

        /*
         * Check if device uses a limited connection.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmApp#isNetworkAccessLimited
         * @return {Boolean} True if device used a limited connection, false otherwise.
         * @description
         * This method allows for us to first check if cordova is loaded,
         * otherwise exceptions can be thrown when trying on a browser.
         */
        self.isNetworkAccessLimited = function() {
            if (typeof navigator.connection === 'undefined') {
                // Plugin not defined, probably in browser.
                return false;
            }
            var type = $cordovaNetwork.getNetwork();
            var limited = [Connection.CELL_2G, Connection.CELL_3G, Connection.CELL_4G, Connection.CELL];
            return limited.indexOf(type) > -1;
        };

        return self;
    };
});
