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
 * @fileoverview Implements ydn.db.io.QueryService with IndexedDB.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.sql.req.IndexedDb');
goog.require('ydn.db.core.req.IndexedDb');
goog.require('ydn.db.sql.req.IRequestExecutor');
goog.require('ydn.db.sql.req.nosql.Node');
goog.require('ydn.db.sql.req.nosql.ReduceNode');



/**
 * Create a new IDB request executor.
 * @param {string} dbname database name.
 * @extends {ydn.db.core.req.IndexedDb}
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.sql.req.IRequestExecutor}
 * @struct
 */
ydn.db.sql.req.IndexedDb = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.sql.req.IndexedDb, ydn.db.core.req.IndexedDb);


/**
 *
 * @const {boolean} turn on debug flag to dump object.
 */
ydn.db.sql.req.IndexedDb.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.sql.req.IndexedDb.prototype.logger =
    goog.log.getLogger('ydn.db.sql.req.IndexedDb');


/**
 * @inheritDoc
 */
ydn.db.sql.req.IndexedDb.prototype.executeSql = function(rq, sql, params) {

  var msg = sql.parse(params);
  if (msg) {
    throw new ydn.db.SqlParseError(msg);
  }
  var store_names = sql.getStoreNames();
  if (store_names.length == 1) {
    var store_schema = this.schema.getStore(store_names[0]);
    if (!store_schema) {
      throw new ydn.db.NotFoundError(store_names[0]);
    }
    var fields = sql.getSelList();
    if (fields) {
      for (var i = 0; i < fields.length; i++) {
        if (!store_schema.hasIndex(fields[i])) {
          throw new ydn.db.NotFoundError('Index "' + fields[i] +
              '" not found in ' + store_names[0]);
        }
      }
    }
    var node;
    if (sql.getAggregate()) {
      node = new ydn.db.sql.req.nosql.ReduceNode(store_schema, sql);
    } else {
      node = new ydn.db.sql.req.nosql.Node(store_schema, sql);
    }

    node.execute(rq, this);
  } else {
    throw new ydn.error.NotSupportedException(sql.getSql());
  }
};

