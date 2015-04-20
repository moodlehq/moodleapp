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
 * @fileoverview Web storage connectors.
 */

goog.provide('ydn.db.con.simple.UserData');
goog.require('goog.storage.mechanism.IEUserData');
goog.require('ydn.db.base');
goog.require('ydn.db.con.SimpleStorage');
goog.require('ydn.db.con.simple.IStorageProvider');



/**
 * @extends {ydn.db.con.SimpleStorage}
 * name and keyPath.
 * @constructor
 * @implements {ydn.db.con.simple.IStorageProvider}
 * @struct
 */
ydn.db.con.simple.UserData = function() {
  goog.base(this, this);
};
goog.inherits(ydn.db.con.simple.UserData, ydn.db.con.SimpleStorage);


/**
 * @type {string} key for goog.storage.mechanism.IEUserData
 * @const
 */
ydn.db.con.simple.UserData.KEY = 'ydn.db';


/**
 *
 * @return {boolean} true if localStorage is supported.
 */
ydn.db.con.simple.UserData.isSupported = function() {
  var d = new goog.storage.mechanism.IEUserData('ydn.db');
  return d.isAvailable();
};


/**
 * @inheritDoc
 */
ydn.db.con.simple.UserData.prototype.connectDb = function(db_name) {
  var x = new ydn.db.con.simple.UserData.Storage(db_name);
  return /** @type {!Storage} */ (x);
};


/**
 * @inheritDoc
 */
ydn.db.con.simple.UserData.prototype.getType = function() {
  return ydn.db.base.Mechanisms.USER_DATA;
};


/**
 *
 * @param {string} db_name
 */
ydn.db.con.simple.UserData.deleteDatabase = function(db_name) {
  var db = new ydn.db.con.simple.UserData();
  var schema = new ydn.db.schema.EditableDatabase();
  db.connect(db_name, schema);
  db.getSchema(function(sch) {
    for (var i = 0; i < sch.stores.length; i++) {
      var store = db.getSimpleStore(sch.stores[i].getName());
      store.clear();
    }
  });

};



/**
 * Wrapper for IEUserData.
 * @param {string} db_name
 * @constructor
 * @implements {Storage}
 */
ydn.db.con.simple.UserData.Storage = function(db_name) {
  /**
   * @final
   * @private
   */
  this.storage_ = new goog.storage.mechanism.IEUserData(db_name);
  this.length = this.keys().length;
};


/**
 * Number of keys.
 * @type {number}
 */
ydn.db.con.simple.UserData.Storage.prototype.length = 0;


/**
 * @type {goog.storage.mechanism.IEUserData}
 * @private
 */
ydn.db.con.simple.UserData.Storage.prototype.storage_;


/**
 * @type {Array.<string>}
 * @private
 */
ydn.db.con.simple.UserData.Storage.prototype.keys_;


/**
 * Clear all data.
 */
ydn.db.con.simple.UserData.Storage.prototype.clear = function() {
  this.storage_.clear();
  this.keys_ = [];
};


/**
 * Cache keys.
 * @protected
 * @return {Array.<string>}
 */
ydn.db.con.simple.UserData.Storage.prototype.keys = function() {
  if (!this.keys_) {
    this.keys_ = [];
    goog.iter.forEach(this.storage_, function(k) {
      this.keys_.push(k);
    }, this);
  }
  return this.keys_;
};


/**
 * @param {number} idx
 * @return {string}  the name of the nth key in the list.
 */
ydn.db.con.simple.UserData.Storage.prototype.key = function(idx) {
  return this.keys()[idx];
};


/**
 *
 * @param {string} key key.
 * @param {string} value value.
 */
ydn.db.con.simple.UserData.Storage.prototype.setItem = function(key, value) {
  if (this.keys_) {
    this.keys_.push(key);
  }
  this.storage_.set(key, value);
};


/**
 *
 * @param {string} key key.
 * @return {string?} value. If not found, null is return.
 */
ydn.db.con.simple.UserData.Storage.prototype.getItem = function(key) {
  var value = this.storage_.get(key);
  if (goog.isDef(value)) {
    return value;
  } else {
    return null;
  }
};


/**
 *
 * @param {string} key key.
 */
ydn.db.con.simple.UserData.Storage.prototype.removeItem = function(key) {
  this.keys_ = null;
  this.storage_.remove(key);
};
