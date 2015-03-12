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

    var self = {};

    /**
     * Call a DB simple function.
     * @param  {Object}  db      DB to use.
     * @param  {String}  func    Name of the function to call.
     * @return {Promise}         Promise to be resolved when the operation finishes.
     */
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

    /**
     * Retrieve the list of entries matching certain conditions.
     * @param  {Object}  db         DB to use.
     * @param  {String}  table      Name of the table to get the entries from.
     * @param  {String}  field_name Name of the field that should match the conditions.
     * @param  {String}  op         First operator symbol. One of '<', '<=', '=', '>', '>=', '^'.
     * @param  {String}  value      Value for the first operator.
     * @param  {String}  op2        Second operator symbol.
     * @param  {String}  value2     Value for the second operator.
     * @return {Promise}            Promise to be resolved when the list is retrieved.
     */
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

    /**
     * Retrieve the list of entries where a certain field is equal to a certain value.
     * Important: the field must be an index.
     * @param  {Object}  db         DB to use.
     * @param  {String}  table      Name of the table to get the entries from.
     * @param  {String}  field_name Name of the field to check.
     * @param  {String}  value      Value the field should be equal to.
     * @return {Promise}            Promise to be resolved when the list is retrieved.
     */
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

    /**
     * Performs an operation with every entry in a certain table.
     * @param  {Object}   db       DB to use.
     * @param  {String}   table    Name of the table to get the entries from.
     * @param  {Function} callback Function to call with each entry.
     * @return {Promise}           Promise to be resolved when the the operation has been applied to all entries.
     */
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

    /**
     * Create a new database object.
     * @param  {String} name   DB name.
     * @param  {Object} schema DB schema.
     * @return {Object}        DB.
     */
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

    /**
     * Delete a DB.
     * @param  {String} name   DB name.
     * @return {Promise}       Promise to be resolved when the site DB is deleted.
     */
    self.deleteDB = function(name) {
        return ydn.db.deleteDatabase(name);
    };

    return self;

});
