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


goog.provide('ydn.db.con.SimpleStorageService');
goog.require('goog.async.Deferred');
goog.require('ydn.db.con.simple.IStorageProvider');
goog.require('ydn.db.con.simple.Store');
goog.require('ydn.db.req.InMemoryStorage');
goog.require('ydn.debug.error.InternalError');



/**
 * @param {!ydn.db.con.simple.IStorageProvider=} opt_provider storage provider.
 * @constructor
 * @struct
 */
ydn.db.con.SimpleStorageService = function(opt_provider) {

  /**
   * @final
   * @private
   */
  this.provider_ = opt_provider || new ydn.db.req.InMemoryStorage();

  /**
   * @protected
   * @type {string}
   */
  this.dbname;

  /**
   * @type {ydn.db.con.simple.IStorageProvider}
   */
  this.provider_;

  /**
   * @type {!Storage}
   */
  this.storage_;

  /**
   * @protected
   * @type {!ydn.db.schema.Database}
   */
  this.schema;

  /**
   * @type {Object.<!ydn.db.con.simple.Store>}
   * @private
   */
  this.simple_stores_ = {};
};


/**
 * Column name of key, if keyPath is not specified.
 * @const {string}
 */
ydn.db.con.SimpleStorageService.DEFAULT_KEY_PATH = '_id_';


/**
 * @param {string} store_name store name.
 * @return {!ydn.db.con.simple.Store} storage object.
 */
ydn.db.con.SimpleStorageService.prototype.getSimpleStore = function(store_name) {
  var store = this.schema.getStore(store_name);
  if (store) {
    if (!this.simple_stores_[store_name]) {
      this.simple_stores_[store_name] =
          new ydn.db.con.simple.Store(this.dbname, this.storage_, store);
    }
  } else {
    throw new ydn.debug.error.InternalError('store name "' + store_name +
        '" not found.');
  }
  return this.simple_stores_[store_name];
};


/**
 *
 * @param {function(ydn.db.schema.Database)} callback database schema obtained
 * by reflecting connected database.
 */
ydn.db.con.SimpleStorageService.prototype.getSchema = function(callback) {
  var me = this;
  setTimeout(function() {
    var db_key = ydn.db.con.simple.makeKey(me.dbname);
    var db_value = me.storage_.getItem(db_key);
    var schema = new ydn.db.schema.Database(db_value);
    callback(schema);
  }, 10);
};
