// Copyright 2012 YDN Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview Interface for executing database request.
 */


goog.provide('ydn.db.crud.IOperator');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.crud.req.RequestExecutor');



/**
 * @interface
 */
ydn.db.crud.IOperator = function() {};


/**
 *
 * @param {*|!Array.<string>|string} store_name store name or names.
 * @param {(string|ydn.db.KeyRange|ydn.db.IDBKeyRange)=} opt_key_range_index
 * index name or key range.
 * @param {(ydn.db.KeyRange|ydn.db.IDBKeyRange)=} opt_key_range key range if
 * second argument is an index.
 * @param {boolean=} opt_unique count unique index key.
 * @return {!ydn.db.Request} return object in deferred function.
 */
ydn.db.crud.IOperator.prototype.count = goog.abstractMethod;


/**
 * Return object or objects of given key or keys.
 * @param {(!Object|string|!ydn.db.Key)=} opt_arg1 table name.
 * @param {(!Object|!IDBKey)=} opt_arg2
 * object key to be retrieved, if not provided,
 * all entries in the store will return.
 * @return {!ydn.db.Request} return object in deferred function.
 */
ydn.db.crud.IOperator.prototype.get = goog.abstractMethod;


/**
 * Return object or objects of given key or keys.
 * @param {(*|string|!Array.<!ydn.db.Key>)=} opt_arg1 table name.
 * @param {(string|KeyRangeJson|ydn.db.KeyRange|!Array.<!IDBKey>|number)=} opt_arg2
 * list of primary keys or key range.
 * @param {(number|KeyRangeJson|ydn.db.KeyRange)=} opt_arg3 limit.
 * @param {number=} opt_arg4 offset.
 * @param {(boolean|number)=} opt_unique name.
 * @param {boolean=} opt_arg6 reverse.
 * @param {boolean=} opt_arg7 reverse.
 * @return {!ydn.db.Request} return object in deferred function.
 */
ydn.db.crud.IOperator.prototype.values = goog.abstractMethod;


/**
 * List keys or effective keys.
 * @param {*|string} store_name or iterator.
 * @param {(string|ydn.db.KeyRange|KeyRangeJson|number)=} opt_arg1 key range
 * or index name or limit for iterator.
 * @param {(number|ydn.db.KeyRange|KeyRangeJson)=} opt_arg2 limit or key range.
 * @param {number=} opt_arg3 offset or limit.
 * @param {(boolean|number)=} opt_arg4 reverse or offset.
 * @param {boolean=} opt_arg5 reverse.
 * @param {boolean=} unique limit.
 * @return {!ydn.db.Request} result promise.
 */
ydn.db.crud.IOperator.prototype.keys = goog.abstractMethod;


/**
 * Execute ADD request either storing result to tx or callback to df.
 * @param {string|StoreSchema} store_name_or_schema store name or
 * schema.
 * @param {!Object|!Array.<!Object>} value object to put.
 * @param {*=} opt_keys out-of-line keys.
 * @return {!ydn.db.Request} return newly created keys in promise.
 */
ydn.db.crud.IOperator.prototype.add = goog.abstractMethod;


/**
 * Execute PUT request to the store of given records in delimited text.
 * @param {string} store_name table name.
 * @param {string} data delimited text to put. one object per line.
 * @param {string=} opt_delimiter field delimiter.
 */
ydn.db.crud.IOperator.prototype.load = goog.abstractMethod;


/**
 * Execute PUT request either storing result to tx or callback to df.
 * @param {string|StoreSchema|ydn.db.Key|!Array.<!ydn.db.Key>} arg1 store name
 * or schema, key or array of keys.
 * @param {(!Object|!Array.<!Object>)} value object to put.
 * @param {IDBKey|!Array.<IDBKey>=} opt_keys out-of-line keys.
 * @return {!ydn.db.Request} return newly created keys in promise.
 */
ydn.db.crud.IOperator.prototype.put = goog.abstractMethod;


/**
 * Clear a specific entry from a store or all.
 * @param {(!Array.<string>|string)=} opt_arg1 delete the table as provided
 * otherwise
 * delete all stores.
 * @param {(string|KeyRangeJson|ydn.db.KeyRange|ydn.db.IDBKeyRange)=} opt_arg2
 * delete a specific row.
 * @param {(KeyRangeJson|ydn.db.KeyRange|ydn.db.IDBKeyRange)=} opt_arg3 argument
 * control.
 * @see {@link #remove}
 * @return {!ydn.db.Request} return a deferred function.
 */
ydn.db.crud.IOperator.prototype.clear = goog.abstractMethod;


/**
 * Remove a specific entry from a store or all.
 * @param {string|ydn.db.Key|!Array.<!ydn.db.Key>} store_name store name.
 * @param {(string|number|Date|KeyRangeJson|ydn.db.KeyRange)=} opt_arg2 delete
 * a specific key or
 * key range.
 * @param {(string|number|Date|KeyRangeJson|ydn.db.KeyRange)=} opt_arg3 delete
 * a specific key or
 * key range.
 * @see {@link #remove}
 * @return {!ydn.db.Request} return number of record removed a deferred.
 */
ydn.db.crud.IOperator.prototype.remove = goog.abstractMethod;
