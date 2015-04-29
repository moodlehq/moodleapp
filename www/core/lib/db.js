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
 * @ngdoc service
 * @name $mmDB
 * @module mm.core
 * @description
 * This service allows to interact with the local database to store and retrieve data.
 */
.factory('$mmDB', function($q, $log) {

    $log = $log.getInstance('$mmDB');

    var self = {};

    /**
     * Call a DB simple function.
     * @param  {Object}  db      DB to use.
     * @param  {String}  func    Name of the function to call.
     * @return {Promise}         Promise to be resolved when the operation finishes.
     */
    function callDBFunction(db, func) {
        var deferred = $q.defer();

        try {
            if (typeof(db) != 'undefined') {
                db[func].apply(db, Array.prototype.slice.call(arguments, 2)).then(function(result) {
                    if (typeof(result) == 'undefined') {
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

    /**
     * Retrieve the list of entries matching certain conditions.
     * @param  {Object}  db         DB to use.
     * @param  {String}  store      Name of the store to get the entries from.
     * @param  {String}  field_name Name of the field that should match the conditions.
     * @param  {String}  op         First operator symbol. One of '<', '<=', '=', '>', '>=', '^'.
     * @param  {String}  value      Value for the first operator.
     * @param  {String}  op2        Second operator symbol.
     * @param  {String}  value2     Value for the second operator.
     * @return {Promise}            Promise to be resolved when the list is retrieved.
     */
    function callWhere(db, store, field_name, op, value, op2, value2) {
        var deferred = $q.defer();

        try {
            if (typeof(db) != 'undefined') {
                db.from(store).where(field_name, op, value, op2, value2).list().then(function(list) {
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

    /**
     * Retrieve the list of entries where a certain field is equal to a certain value.
     * Important: the field must be an index.
     * @param  {Object}  db         DB to use.
     * @param  {String}  store      Name of the store to get the entries from.
     * @param  {String}  field_name Name of the field to check.
     * @param  {String}  value      Value the field should be equal to.
     * @return {Promise}            Promise to be resolved when the list is retrieved.
     */
    function callWhereEqual(db, store, field_name, value) {
        var deferred = $q.defer();

        try {
            if (typeof(db) != 'undefined') {
                db.from(store).where(field_name, '=', value).list().then(function(list) {
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

    /**
     * Performs an operation with every entry in a certain store.
     * @param  {Object}   db       DB to use.
     * @param  {String}   store    Name of the store to get the entries from.
     * @param  {Function} callback Function to call with each entry.
     * @return {Promise}           Promise to be resolved when the the operation has been applied to all entries.
     */
    function callEach(db, store, callback) {
        var deferred = $q.defer();

        callDBFunction(db, 'values', store, undefined, 99999999).then(function(entries) {
            for (var i = 0; i < entries.length; i++) {
                callback(entries[i]);
            }
            deferred.resolve();
        }, function() {
            deferred.reject();
        });

        return deferred.promise;
    };

    /**
     * Create a new database object.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmDB#getDB
     * @param  {String} name   DB name.
     * @param  {Object} schema DB schema.
     * @return {Object}        DB.
     */
    self.getDB = function(name, schema) {
        var db = new ydn.db.Storage(name, schema);

        return {
            /**
             * Get DB name.
             *
             * @return {String} DB name.
             */
            getName: function() {
                return db.getName();
            },
            /**
             * Get an entry from a store.
             *
             * @param {String} store Name of the store.
             * @param {Mixed}  id    Entry's identifier (primary key / keyPath).
             * @return {Promise}     Promise resolved when the entry is retrieved. Resolve param: DB entry (object).
             */
            get: function(store, id) {
                return callDBFunction(db, 'get', store, id);
            },
            /**
             * Get all the entries from a store.
             *
             * @param {String} store Name of the store.
             * @return {Promise}     Promise resolved when the entries are retrieved. Resolve param: DB entries (array).
             */
            getAll: function(store) {
                return callDBFunction(db, 'values', store, undefined, 99999999);
            },
            /**
             * Count the number of entries in a store.
             *
             * @param {String} store Name of the store.
             * @return {Promise}     Promise resolved when the count is done. Resolve param: number of entries.
             */
            count: function(store) {
                return callDBFunction(db, 'count', store);
            },
            /**
             * Add an entry to a store.
             *
             * @param {String} store Name of the store.
             * @param {Object} value Object to store. Primary key (keyPath) is required.
             * @return {Promise}     Promise resolved when the entry is inserted. Resolve param: new entry's primary key.
             */
            insert: function(store, value) {
                return callDBFunction(db, 'put', store, value);
            },
            /**
             * Removes an entry from a store.
             *
             * @param {String} store Name of the store.
             * @param {Mixed}  id    Entry's identifier (primary key / keyPath).
             * @return {Promise}     Promise resolved when the entry is deleted. Resolve param: number of entries deleted.
             */
            remove: function(store, id) {
                return callDBFunction(db, 'remove', store, id);
            },
            /**
             * Get the entries where a field match certain conditions.
             *
             * @param {String} store      Name of the store.
             * @param {String} field_name Name of the field to match.
             * @param {String} op         First operator to apply to the field. <, <=, =, >, >=, ^ (start with).
             * @param {Mixed}  value      Value to compare using the first operator.
             * @param {String} op2        Second operator to apply to the field. Optional.
             * @param {Mixed}  value2     Value to compare using the second operator. Optional.
             * @return {Promise}          Promise resolved when the entries are retrieved. Resolve param: entries (array).
             */
            where: function(store, field_name, op, value, op2, value2) {
                return callWhere(db, store, field_name, op, value, op2, value2);
            },
            /**
             * Get the entries where a field is equal to a certain value.
             *
             * @param {String} store      Name of the store.
             * @param {String} field_name Name of the field to match.
             * @param {Mixed}  value      Value to compare to the field.
             * @return {Promise}          Promise resolved when the entries are retrieved. Resolve param: entries (array).
             */
            whereEqual: function(store, field_name, value) {
                return callWhereEqual(db, store, field_name, value);
            },
            /**
             * Call a function with each of the entries from a store.
             *
             * @param {String} store      Name of the store.
             * @param {Function} callback Function to call with each entry.
             * @return {Promise}          Promise resolved when the function is called for all entries. No resolve params.
             */
            each: function(store, callback) {
                return callEach(db, store, callback);
            },
            /**
             * Close the database.
             */
            close: function() {
                db.close();
                db = undefined;
            }
        };
    };

    /**
     * Delete a DB.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmDB#deleteDB
     * @param  {String} name   DB name.
     * @return {Promise}       Promise to be resolved when the site DB is deleted.
     */
    self.deleteDB = function(name) {
        return ydn.db.deleteDatabase(name);
    };

    return self;

});
