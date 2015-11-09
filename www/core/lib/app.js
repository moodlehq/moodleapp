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
.provider('$mmApp', function($stateProvider) {

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

    this.$get = function($mmDB, $cordovaNetwork, $log, $injector, $ionicPlatform) {

        $log = $log.getInstance('$mmApp');

        var db,
            self = {};

        /**
         * Create a new state in the UI-router.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmApp#createState
         * @param {String} name   State name.
         * @param {Object} config State config.
         */
        self.createState = function(name, config) {
            $log.debug('Adding new state: '+name);
            $stateProvider.state(name, config);
        };

        /**
         * Closes the keyboard if plugin is available.
         *
         * @return {Boolean} True if plugin is available, false otherwise.
         */
        self.closeKeyboard = function() {
            if (typeof cordova != 'undefined' && cordova.plugins && cordova.plugins.Keyboard && cordova.plugins.Keyboard.close) {
                cordova.plugins.Keyboard.close();
                return true;
            }
            return false;
        };

        /**
         * Get the application global database.
         * @return {Object} App's DB.
         */
        self.getDB = function() {
            if (typeof db == 'undefined') {
                db = $mmDB.getDB(DBNAME, dbschema, dboptions);
            }

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
         * Core init process for the app.
         *
         * @description
         * This should be the first init process of all, no other process should run until we
         * are certain that the cordova plugins are loaded, which is what $ionicPlatform tells us.
         * There should not be any logic acting on the database here as the upgrade is
         * another process and has not run yet at this point.
         *
         * Keep this fast.
         *
         * Reserved for core use, do not call directly.
         *
         * @module mm.core
         * @ngdoc service
         * @name $mmApp#initProcess
         * @protected
         * @return {Promise}
         */
        self.initProcess = function() {
            return $ionicPlatform.ready();
        };

        /**
         * Checks if the app is running in a real device with cordova-plugin-device installed.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmApp#isDevice
         * @return {Bool} True if device is defined, false otherwise.
         */
        self.isDevice = function() {
            return !!window.device;
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
            var online = typeof navigator.connection === 'undefined' || $cordovaNetwork.isOnline();
            // Double check we are not online because we cannot rely 100% in Cordova APIs.
            if (!online && navigator.onLine) {
                online = true;
            }
            return online;
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

        /**
         * Instantly returns if the app is ready.
         *
         * To be notified when the app is ready, refer to {@link $mmApp#ready}.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmApp#ready
         * @return {Boolean} True when it is, false when not.
         */
        self.isReady = function() {
            var promise = $injector.get('$mmInitDelegate').ready();
            return promise.$$state.status === 1;
        };

        /**
         * Open the keyboard if plugin is available.
         *
         * @return {Boolean} True if plugin is available, false otherwise.
         */
        self.openKeyboard = function() {
            if (typeof cordova != 'undefined' && cordova.plugins && cordova.plugins.Keyboard && cordova.plugins.Keyboard.show) {
                cordova.plugins.Keyboard.show();
                return true;
            }
            return false;
        };

        /**
         * Resolves when the app is ready.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmApp#ready
         * @description
         * This returns a promise that is resolved when the app is initialised.
         *
         * Usage:
         *
         *    $mmApp.ready().then(function() {
         *        // What you want to do.
         *    });
         *
         * @return {Promise} Resolved when the app is initialised. Never rejected.
         */
        self.ready = function() {
            // Injects to prevent circular dependencies.
            return $injector.get('$mmInitDelegate').ready();
        };

        return self;
    };
});
