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
 * @fileoverview Data store in memory.
 */

goog.provide('ydn.db.core.req.SimpleStore');
goog.require('ydn.db.core.req.IRequestExecutor');
goog.require('ydn.db.core.req.SimpleCursor');
goog.require('ydn.db.crud.req.SimpleStore');



/**
 * @extends {ydn.db.crud.req.SimpleStore}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.core.req.IRequestExecutor}
 */
ydn.db.core.req.SimpleStore = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.core.req.SimpleStore, ydn.db.crud.req.SimpleStore);


/**
 * @define {boolean} debug flag.
 */
ydn.db.core.req.SimpleStore.DEBUG = false;


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleStore.prototype.getCursor = function(tx, lbl,
                                                           store_name, mth) {
  var store = this.schema.getStore(store_name);
  goog.asserts.assertObject(store, 'store "' + store_name + '" not found.');
  return new ydn.db.core.req.SimpleCursor(tx, lbl, store, mth);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.SimpleStore.prototype.getStreamer =  function(tx, tx_no,
    store_name, index_name) {
  throw 'not yet';
};


