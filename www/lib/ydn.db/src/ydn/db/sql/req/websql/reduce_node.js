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
 * @fileoverview About this file.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.sql.req.websql.ReduceNode');
goog.require('ydn.db.sql.req.websql.Node');
goog.require('ydn.object');



/**
 *
 * @param {!ydn.db.schema.Store} schema store schema.
 * @param {!ydn.db.Sql} sql store name.
 * @extends {ydn.db.sql.req.websql.Node}
 * @constructor
 */
ydn.db.sql.req.websql.ReduceNode = function(schema, sql) {
  goog.base(this, schema, sql);
};
goog.inherits(ydn.db.sql.req.websql.ReduceNode, ydn.db.sql.req.websql.Node);


/**
 * @param {?function(*, boolean=)} df key in deferred function.
 * @param {SQLTransaction} tx
 * @param {Array} params
 * @override
 */
ydn.db.sql.req.websql.ReduceNode.prototype.execute = function(df, tx, params) {

  var sql_stm = this.sql.getSql();
  var me = this;
  var out = [];

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    var n = results.rows.length;
    if (n == 1) {
      var value = ydn.object.takeFirst(results.rows.item(0));
      df(value);
    } else if (n == 0) {
      df(undefined);
    } else {
      throw new ydn.db.InternalError();
    }

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




