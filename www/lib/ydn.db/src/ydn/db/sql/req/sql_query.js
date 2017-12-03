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
 * @fileoverview Query object to feed WebSQL iterator.
 *
 *
 */


goog.provide('ydn.db.sql.req.SqlQuery');
goog.require('ydn.db.sql.req.IterableQuery');
goog.require('goog.functions');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.Where');
goog.require('ydn.error.ArgumentException');



/**
 * Create a SQL query object from a query object.
 *
 * This clone given query object and added iteration functions so that
 * query processor can mutation as part of query optimization processes.
 *
 * @param {string} store store name.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {(ydn.db.KeyRange|ydn.db.IDBKeyRange)=} keyRange configuration in json or native format.
 * @param {boolean=} reverse reverse.
 * @param {boolean=} unique unique.
 * @param {boolean=} key_only true for key only iterator.
 * @param {Function=} filter filter function.
 * @param {Function=} continued continued function.
 * @extends {ydn.db.sql.req.IterableQuery}
 * @constructor
 */
ydn.db.sql.req.SqlQuery = function(store, index, keyRange,
       reverse, unique, key_only, filter, continued) {

  goog.base(this, store, index, keyRange, reverse, unique, key_only,
    filter, continued);

  this.parseRow = ydn.db.sql.req.SqlQuery.prototype.parseRow;
  this.sql = '';
  this.params = [];
};
goog.inherits(ydn.db.sql.req.SqlQuery, ydn.db.sql.req.IterableQuery);



/**
 * @inheritDoc
 */
ydn.db.sql.req.SqlQuery.prototype.toJSON = function() {
  var obj = goog.base(this, 'toJSON');
  obj['sql'] = this.sql;
  obj['params'] = ydn.object.clone(this.params);
  return obj;
};
//
//
//
///**
// * @param {string?} keyPath if index is not defined, keyPath will be used.
// * @param {!Array.<ydn.db.schema.DataType>|ydn.db.schema.DataType|undefined} type data type.
// * @return {{sql: string, params: !Array.<string>}} return equivalent of
// * keyRange
// * to SQL WHERE clause and its parameters.
// */
//ydn.db.sql.req.SqlQuery.prototype.toWhereClause = function(type, keyPath) {
//
//  var idx = this.getIndexName();
//  var index = goog.isDef(idx) ? idx :
//      goog.isDefAndNotNull(keyPath) ? keyPath :
//          ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;
//  var column = goog.string.quote(index);
//
//  var where = new ydn.db.Where(column, keyPath);
//
//  return where.toWhereClause(type);
//};




/**
 * SQL statement for executing.
 * @type {string} sql string.
 */
ydn.db.sql.req.SqlQuery.prototype.sql = '';


/**
 * SQL parameters for executing SQL.
 * @type {!Array.<string>} sql parameters.
 */
ydn.db.sql.req.SqlQuery.prototype.params = [];




/**
 * @override
 */
ydn.db.sql.req.SqlQuery.prototype.toString = function() {
  var idx = goog.isDef(this.getIndexName()) ? ':' + this.getIndexName() : '';
  return 'Cursor:' + this.getStoreName() + idx;
};



/**
 * Parse resulting object of a row into original object as it 'put' into the
 * database.
 * @param {!Object} row row.
 * @param {ydn.db.schema.Store} store store schema.
 * @return {!Object} parse value.
 */
ydn.db.sql.req.SqlQuery.prototype.parseRow = function(row, store) {
  return ydn.db.crud.req.WebSql.parseRow(row, store);
};


/**
 * Return given input row.
 * @final
 * @param {!Object} row row.
 * @param {ydn.db.schema.Store} store store schema.
 * @return {!Object} the first field of object in row value.
 */
ydn.db.sql.req.SqlQuery.parseRowIdentity = function(row, store) {
  return row;
};

//
///**
// * @final
// * @param {string} op
// * @param {number|string} lv
// * @param {number|string} x
// * @return {boolean}
// */
//ydn.db.sql.req.SqlQuery.op_test = function(op, lv, x) {
//  if (op === '=' || op === '==') {
//    return  x == lv;
//  } else if (op === '===') {
//    return  x === lv;
//  } else if (op === '>') {
//    return  x > lv;
//  } else if (op === '>=') {
//    return  x >= lv;
//  } else if (op === '<') {
//    return  x < lv;
//  } else if (op === '<=') {
//    return  x <= lv;
//  } else if (op === '!=') {
//    return  x != lv;
//  } else {
//    throw new Error('Invalid op: ' + op);
//  }
//};


