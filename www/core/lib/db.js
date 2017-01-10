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

    var self = {},
        dbInstances = {};

    /**
     * Convenient helper to apply an order to a query.
     *
     * @param  {Object}  [query]   A query object.
     * @param  {String}  [order]   The field to order on.
     * @param  {Boolean} [reverse] Whether to reverse the results.
     * @return {Object}  The updated query object (or initial one).
     */
    function applyOrder(query, order, reverse) {
        if (order) {
            query = query.order(order);
            if (reverse) {
                query = query.reverse();
            }
        }
        return query;
    }

    /**
     * Convenient helper to apply a where condition to a query.
     *
     * @param  {Object} [query]   A query object.
     * @param  {Array}  [where]   Array of parameters, in order:
     *                            - The field to filter on
     *                            - The operator: <, <=, =, >, >=, ^ (starts with)
     *                            - The value
     *                            - An additional operator
     *                            - An additional value
     * @return {Object} The updated query object (or initial one).
     */
    function applyWhere(query, where) {
        if (where && where.length > 0) {
            query = query.where.apply(query, where);
        }
        return query;
    }

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
     * Retrieve the count of entries matching certain conditions.
     * @param  {Object}  db         DB to use.
     * @param  {String}  store      Name of the store to get the entries from.
     * @param  {Array}   where      Array of where conditions, see applyWhere.
     * @return {Promise}
     */
    function callCount(db, store, where) {
        var deferred = $q.defer(),
            query;

        try {
            if (typeof(db) != 'undefined') {
                query = db.from(store);
                query = applyWhere(query, where);
                query.count().then(function(count) {
                    deferred.resolve(count);
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
    }

    /**
     * Retrieve the list of entries matching certain conditions.
     *
     * @param  {Object}  db      DB to use.
     * @param  {String}  store   Name of the store to get the entries from.
     * @param  {Array}   where   Array of where conditions, see applyWhere.
     * @param  {Array}   order   The key to order on.
     * @param  {Boolean} reverse Whether to reverse the order.
     * @param  {Number}  limit   The number of result to return.
     * @return {Promise}
     */
    function doQuery(db, store, where, order, reverse, limit) {
        var deferred = $q.defer(),
            query;

        try {
            if (typeof(db) != 'undefined') {
                query = db.from(store);
                query = applyWhere(query, where);
                query = applyOrder(query, order, reverse);
                query.list(limit).then(function(list) {
                    deferred.resolve(list);
                }, function() {
                    deferred.reject();
                });
            } else {
                deferred.reject();
            }
        } catch(ex) {
            $log.error('Error querying ' + store + ' on ' + db.getName() + '. ' + ex.name + ': ' + ex.message);
            deferred.reject();
        }

        return deferred.promise;
    }

    /**
     * Update a list of entries matching conditions.
     *
     * @param  {Object}  db      DB to use.
     * @param  {String}  store   Name of the store to get the entries from.
     * @param  {Object}  values  The values to set.
     * @param  {Array}   where   An array of where() parameters.
     * @return {Promise}
     */
    function doUpdate(db, store, values, where) {
        var deferred = $q.defer(),
            query;

        try {
            if (typeof(db) != 'undefined') {
                query = db.from(store);
                query = applyWhere(query, where);
                query.patch(values).then(function(count) {
                    deferred.resolve(count);
                }, function() {
                    deferred.reject();
                });
            } else {
                deferred.reject();
            }
        } catch(ex) {
            $log.error('Error querying ' + store + ' on ' + db.getName() + '. ' + ex.name + ': ' + ex.message);
            deferred.reject();
        }

        return deferred.promise;
    }

    /**
     * Create a new database object.
     *
     * The database objects are cached statically.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmDB#getDB
     * @param  {String} name    DB name.
     * @param  {Object} schema  DB schema.
     * @param  {Object} options DB options.
     * @return {Object}         DB.
     */
    self.getDB = function(name, schema, options) {
        if (typeof dbInstances[name] === 'undefined') {

            var isSafari = !ionic.Platform.isIOS() && !ionic.Platform.isAndroid() && navigator.userAgent.indexOf('Safari') != -1
                            && navigator.userAgent.indexOf('Chrome') == -1 && navigator.userAgent.indexOf('Firefox') == -1;
            if (typeof IDBObjectStore == 'undefined' || typeof IDBObjectStore.prototype.count == 'undefined' || isSafari) {
                // IndexedDB not implemented or not fully implemented (Galaxy S4 Mini). Use WebSQL.
                if (typeof options.mechanisms == 'undefined') {
                    options.mechanisms = ['websql', 'sqlite', 'localstorage', 'sessionstorage', 'userdata', 'memory'];
                } else {
                    var position = options.mechanisms.indexOf('indexeddb');
                    if (position != -1) {
                        options.mechanisms.splice(position, 1);
                    }
                }
            }

            var db = new ydn.db.Storage(name, schema, options);

            dbInstances[name] = {
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
                 * @param {Array} [where] Array of where conditions, see applyWhere.
                 * @return {Promise}     Promise resolved when the count is done. Resolve param: number of entries.
                 */
                count: function(store, where) {
                    return callCount(db, store, where);
                },
                /**
                 * Add an entry to a store.
                 *
                 * @param {String} store Name of the store.
                 * @param {Object} value Object to store. Primary key (keyPath) is required.
                 * @param {IDbKey} id The key when needed.
                 * @return {Promise}     Promise resolved when the entry is inserted. Resolve param: new entry's primary key.
                 */
                insert: function(store, value, id) {
                    return callDBFunction(db, 'put', store, value, id);
                },
                /**
                 * Add an entry to a store, returning a synchronous value.
                 * Please use this function only if synchronous is a must, you should always use $mmDB#insert.
                 * Take into account that the value will be returned BEFORE the value is actually stored. The value of the
                 * boolean returned only indicates if it has passed the first validation.
                 *
                 * @param {String} store Name of the store.
                 * @param {Object} value Object to store. Primary key (keyPath) is required.
                 * @return {Boolean}     True if data to insert is valid, false otherwise. Returning true doesn't mean that the
                 *                       data has been stored, this function can return true but the insertion can still fail.
                 */
                insertSync: function(store, value) {
                    if (db) {
                        try {
                            db.put(store, value);
                            return true;
                        } catch(ex) {
                            $log.error('Error executing function sync put to DB '+db.getName());
                            $log.error(ex.name+': '+ex.message);
                        }
                    }

                    return false;
                },
                /**
                 * Query the database.
                 *
                 * @param {String} store Name of the store.
                 * @param {Array} [where] Array of where conditions, see applyWhere.
                 * @param {String} [order] The key to sort the results with.
                 * @param {Boolean} [reverse=false] Whether to reverse the results.
                 * @param {Number} [limit] The number of results to return.
                 * @return {Promise} Promise resolved with an array of entries.
                 */
                query: function(store, where, order, reverse, limit) {
                    return doQuery(db, store, where, order, reverse, limit);
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
                 * Removes all entries from a store.
                 *
                 * @param {String} store Name of the store.
                 * @return {Promise}     Promise resolved when the entries are deleted.
                 */
                removeAll: function(store) {
                    return callDBFunction(db, 'clear', store);
                },
                /**
                 * Update records matching.
                 *
                 * @param {String} store Name of the store.
                 * @param {Object} values The values to update.
                 * @param {Array} [where] Array of where conditions, see applyWhere.
                 * @return {Promise}
                 */
                update: function(store, values, where) {
                    return doUpdate(db, store, values, where);
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
                },
                /**
                 * Call a callback once DB is ready.
                 *
                 * @param {Function} cb Callback to call.
                 */
                onReady: function(cb) {
                    db.onReady(cb);
                },
                /**
                 * Get storage type.
                 *
                 * @return {String} Storage type.
                 */
                getType: function() {
                    return db.getType();
                }
            };
        }
        return dbInstances[name];
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
        var deferred = $q.defer();

        function deleteDB() {
            delete dbInstances[name];
            $q.when(ydn.db.deleteDatabase(name)).then(deferred.resolve, deferred.reject);
        }

        if (typeof dbInstances[name] != 'undefined') {
            // We have a DB instance. Wait for it to be ready before deleting the DB.
            dbInstances[name].onReady(deleteDB);
        } else {
            deleteDB();
        }

        return deferred.promise;
    };

    return self;

});
