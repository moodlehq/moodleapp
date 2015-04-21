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
 * @fileoverview Implements request executor with IndexedDB.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.core.req.IndexedDb');
goog.require('ydn.db.algo.AbstractSolver');
goog.require('ydn.db.core.req.IDBCursor');
goog.require('ydn.db.core.req.IRequestExecutor');
goog.require('ydn.db.crud.req.IndexedDb');
goog.require('ydn.error');
goog.require('ydn.json');



/**
 * Create a new IDB request executor.
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.core.req.IRequestExecutor}
 * @extends {ydn.db.crud.req.IndexedDb}
 * @struct
 */
ydn.db.core.req.IndexedDb = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.core.req.IndexedDb, ydn.db.crud.req.IndexedDb);


/**
 *
 * @define {boolean} turn on debug flag to dump object.
 */
ydn.db.core.req.IndexedDb.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.req.IndexedDb.prototype.logger =
    goog.log.getLogger('ydn.db.core.req.IndexedDb');


/**
 * @inheritDoc
 */
ydn.db.core.req.IndexedDb.prototype.getCursor = function(tx, lbl,
                                                         store_name, mth) {
  var store = this.schema.getStore(store_name);
  goog.asserts.assertObject(store, 'store "' + store_name + '" not found.');
  return new ydn.db.core.req.IDBCursor(tx, lbl, store, mth);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.IndexedDb.prototype.getStreamer = function(tx, tx_no,
    store_name, index_name) {
  return new ydn.db.Streamer(tx, store_name, index_name);
};
