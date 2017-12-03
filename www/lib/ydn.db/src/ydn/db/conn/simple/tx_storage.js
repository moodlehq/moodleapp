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
 * @fileoverview Transactional simple storage.
 */


goog.provide('ydn.db.con.simple.TxStorage');
goog.require('ydn.db.con.SimpleStorageService');



/**
 *
 * @param {!ydn.db.con.SimpleStorageService} storage parent storage.
 * @param {function(ydn.db.base.TxEventTypes, *)} oncompleted function.
 * @constructor
 * @struct
 */
ydn.db.con.simple.TxStorage = function(storage, oncompleted) {
  /**
   * @private
   * @type {ydn.db.con.SimpleStorageService}
   */
  this.storage_ = storage;
  /**
   * @final
   * @private
   */
  this.on_completed_ = oncompleted;
};


/**
 * @type {function(ydn.db.base.TxEventTypes, *)?}
 * @private
 */
ydn.db.con.simple.TxStorage.prototype.on_completed_;


/**
 * @param {function(this: T, !ydn.db.con.SimpleStorageService)} fnc storage.
 * @param {T} fnc_obj function object handle.
 * @return {Function} on_complete function to invoke after complete.
 * @template T
 */
ydn.db.con.simple.TxStorage.prototype.getStorage = function(
    fnc, fnc_obj) {
  var st = this.storage_;
  goog.asserts.assertObject(st, 'transaction already committed');
  setTimeout(function() {
    fnc.call(fnc_obj, /** @type {!ydn.db.con.SimpleStorageService} */ (st));
  }, 4);

  var me = this;
  var on_complete = function() {
    me.on_completed_(ydn.db.base.TxEventTypes.COMPLETE, null);
    me.on_completed_ = null;
    me.storage_ = null;
  };
  return on_complete;
};

