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
 * @fileoverview WebSQL query node.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.sql.req.websql.Node');
goog.require('ydn.db.Sql');
goog.require('ydn.db.schema.Store');



/**
 * Create a SQL query object from a query object.
 *
 *
 * @param {!ydn.db.schema.Store} schema store schema.
 * @param {!ydn.db.Sql} sql store name.
 * @constructor
 */
ydn.db.sql.req.websql.Node = function(schema, sql) {

  this.sql = sql;
  this.store_schema_ = schema;
  this.sel_fields_ = sql.getSelList();

};


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.sql.req.websql.Node.prototype.logger =
    goog.log.getLogger('ydn.db.sql.req.websql.Node');


/**
 * @type {!ydn.db.schema.Store}
 * @private
 */
ydn.db.sql.req.websql.Node.prototype.store_schema_;


/**
 * @type {ydn.db.Sql}
 * @protected
 */
ydn.db.sql.req.websql.Node.prototype.sql;


/**
 * @type {Array.<string>}
 * @private
 */
ydn.db.sql.req.websql.Node.prototype.sel_fields_;


/**
 * @inheritDoc
 */
ydn.db.sql.req.websql.Node.prototype.toJSON = function() {
  return {'sql': this.sql.getSql()};
};


/**
 * @override
 */
ydn.db.sql.req.websql.Node.prototype.toString = function() {
  return 'websql.Node:';
};


/**
 *
 * @param {!Object} row
 * @return {*}
 */
ydn.db.sql.req.websql.Node.prototype.parseRow = function(row) {
  if (!this.sel_fields_) {
    return ydn.db.crud.req.WebSql.parseRow(row, this.store_schema_);
  } else if (this.sel_fields_.length == 1) {
    if (goog.isObject(row)) {
      return goog.object.getValueByKeys(row, this.sel_fields_[0]);
    } else {
      return undefined;
    }
  } else {
    var obj = {};
    for (var i = 0; i < this.sel_fields_.length; i++) {
      obj[this.sel_fields_[i]] = goog.object.getValueByKeys(row,
          this.sel_fields_[i]);
    }
    return obj;
  }

};


/**
 * @param {?function(*, boolean=)} df return key in deferred function.
 * @param {SQLTransaction} tx
 * @param {Array} params
 */
ydn.db.sql.req.websql.Node.prototype.execute = function(df, tx, params) {

  var sql_stm = this.sql.getSql();
  var me = this;
  var out = [];

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    var n = results.rows.length;
    for (var i = 0; i < n; i++) {
      var row = results.rows.item(i);
      if (goog.isObject(row)) {
        var value = me.parseRow(row);
        out.push(value);
      } else {
        out.push(value);
      }
    }
    df(out);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.sql.req.WebSql.DEBUG) {
      goog.global.console.log([sql_stm, tr, error]);
    }
    goog.log.warning(me.logger, 'Sqlite error: ' + error.message);
    df(error, true);
    return true; // roll back
  };

  if (ydn.db.sql.req.WebSql.DEBUG) {
    goog.global.console.log(this + ' open SQL: ' + sql_stm + ' PARAMS:' +
        ydn.json.stringify(params));
  }
  tx.executeSql(sql_stm, params, callback, error_callback);

};




