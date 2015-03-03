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
 * @fileoverview Cursor.
 */


goog.provide('ydn.db.core.req.AbstractCursor');
goog.require('goog.Disposable');
goog.require('ydn.debug.error.InternalError');



/**
 * Open an index. This will resume depending on the cursor state.
 * @param {ydn.db.base.Transaction} tx tx.
 * @param {string} tx_no tx no.
 * @param {ydn.db.schema.Store} store_schema schema.
 * @param {ydn.db.base.QueryMethod=} opt_mth query method, default to
 * values.
 * @constructor
 * @extends {goog.Disposable}
 * @implements {ydn.db.core.req.ICursor}
 * @struct
 * @suppress {checkStructDictInheritance} suppress closure-library code.
 */
ydn.db.core.req.AbstractCursor = function(tx, tx_no, store_schema, opt_mth) {
  goog.base(this);
  /**
   * @final
   * @protected
   * @type {ydn.db.schema.Store}
   */
  this.store_schema = store_schema;
  /**
   * @final
   * @protected
   */
  this.store_name = store_schema.getName();
  /**
   * @protected
   */
  this.index_name = undefined;
  /**
   * @protected
   */
  this.is_index = false;

  /**
   * @protected
   */
  this.key_range = null;

  this.tx = tx;

  this.tx_no = tx_no;

  this.count_ = 0;
  /**
   * @type {boolean}
   * @private
   */
  this.done_ = false;
  /**
   * @type {boolean}
   * @private
   */
  this.exited_ = false;

  /**
   * @protected
   */
  this.query_method = opt_mth || ydn.db.base.QueryMethod.LIST_VALUE;
  /**
   * @type {IDBKey|undefined}
   * @private
   */
  this.key_ = undefined;
  /**
   * @type {IDBKey|undefined}
   * @private
   */
  this.primary_key_ = undefined;
  /**
   * @type {*}
   * @private
   */
  this.value_ = undefined;

  /**
   * @type {boolean|undefined}
   * @protected
   */
  this.reverse;

  /**
   * @type {boolean|undefined}
   * @protected
   */
  this.unique;

  /**
   * This method is overridden by cursor consumer.
   * @param {IDBKey?=} opt_key effective key.
   */
  this.onNext = function(opt_key) {
    throw new ydn.debug.error.InternalError();
  };

  /**
   * This method is overridden by cursor consumer.
   * @param {Error|SQLError} e error.
   */
  this.onFail = function(e) {
    throw new ydn.debug.error.InternalError();
  };
  /**
   * Invoke when cursor terminate.
   * This method is overridden by iterator.
   * @param {boolean} is_existed existed cursor.
   * @param {IDBKey|undefined} key effective key.
   * @param {IDBKey|undefined} primary_key primary key.
   */
  this.onTerminated = function(is_existed, key, primary_key) {
  };

};
goog.inherits(ydn.db.core.req.AbstractCursor, goog.Disposable);


/**
 * Open an index. This will resume depending on the cursor state.
 * @param {string} store_name the store name to open.
 * @param {!Array.<string>|string|undefined} index_name index name.
 * @param {IDBKeyRange} key_range key range.
 * @param {ydn.db.base.Direction} direction cursor direction.
 * @param {boolean} is_key_cursor mode.
 */
ydn.db.core.req.AbstractCursor.prototype.init = function(store_name,
    index_name, key_range, direction, is_key_cursor) {
  goog.asserts.assert(this.store_name == store_name, 'expect store name of ' +
      this.store_name + ' but ' + store_name + ' found.');

  if (goog.isDef(index_name)) {
    this.index_name = this.store_schema.getIndexName(index_name);
    goog.asserts.assertString(this.index_name, 'index "' +
        index_name + '" not found in store "' + store_name + '"');
  }
  this.is_index = goog.isString(this.index_name);
  this.key_range = key_range || null;
  this.count_ = 0;
  this.done_ = false;
  this.exited_ = false;
  this.reverse = direction == ydn.db.base.Direction.PREV ||
      direction == ydn.db.base.Direction.PREV_UNIQUE;
  this.unique = direction == ydn.db.base.Direction.NEXT_UNIQUE ||
      direction == ydn.db.base.Direction.PREV_UNIQUE;
  this.dir = direction;
  this.is_key_cursor_ = is_key_cursor;
  this.key_ = undefined;
  this.primary_key_ = undefined;
  this.value_ = undefined;
};


/**
 * @protected
 * @type {string|undefined}
 */
ydn.db.core.req.AbstractCursor.prototype.index_name;


/**
 * @protected
 * @type {boolean}
 */
ydn.db.core.req.AbstractCursor.prototype.is_index;


/**
 * @protected
 * @type {string}
 */
ydn.db.core.req.AbstractCursor.prototype.store_name;


/**
 * @protected
 * @type {string}
 */
ydn.db.core.req.AbstractCursor.prototype.dir = '';


/**
 * @protected
 * @type {IDBKeyRange}
 */
ydn.db.core.req.AbstractCursor.prototype.key_range = null;


/**
 * @protected
 * @type {boolean}
 */
ydn.db.core.req.AbstractCursor.prototype.unique = false;


/**
 * @protected
 * @type {boolean}
 */
ydn.db.core.req.AbstractCursor.prototype.reverse = false;


/**
 * @private
 * @type {boolean}
 */
ydn.db.core.req.AbstractCursor.prototype.is_key_cursor_ = true;


/**
 * @protected
 * @type {ydn.db.base.QueryMethod}
 */
ydn.db.core.req.AbstractCursor.prototype.query_method;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.req.AbstractCursor.prototype.logger =
    goog.log.getLogger('ydn.db.core.req.AbstractCursor');


/**
 *
 * @return {boolean} true if transaction is active.
 */
ydn.db.core.req.AbstractCursor.prototype.isActive = function() {
  return !!this.tx;
};


/**
 *
 * @return {boolean} return true if this is an index cursor.
 */
ydn.db.core.req.AbstractCursor.prototype.isIndexCursor = function() {
  return this.is_index;
};


/**
 *
 * @return {boolean} return true if this is an index cursor.
 */
ydn.db.core.req.AbstractCursor.prototype.isPrimaryCursor = function() {
  return !this.is_index;
};


/**
 *
 * @return {boolean} return true if this is an value cursor.
 */
ydn.db.core.req.AbstractCursor.prototype.isValueCursor = function() {
  return !this.is_key_cursor_;
};


/**
 * Callback on request error.
 * @param {Error|SQLError} e error object.
 */
ydn.db.core.req.AbstractCursor.prototype.onError = function(e) {
  this.onFail(e);
  this.finalize_();
  this.done_ = true;
};


/**
 * Move cursor to a given position by primary key.
 *
 * This will iterate the cursor records until the primary key is found without
 * changing index key. If index has change during iteration, this will invoke
 * onNext callback with resulting value. If given primary key is in wrong
 * direction, this will rewind and seek.
 *
 * Return value of:
 *   undefined : will invoke onNext
 *   null      : don't do anything
 *   *         : seek to given primary key value, not invoke onNext.
 *   true      : continue next cursor position, not invoke onNext
 *   false     : restart the cursor, not invoke onNext.
 *
 * @param {IDBKey=} opt_key
 * @param {IDBKey=} opt_primary_key
 * @param {*=} opt_value
 */
ydn.db.core.req.AbstractCursor.prototype.onSuccess = function(
    opt_key, opt_primary_key, opt_value) {
  // console.log(this.count_, opt_key, opt_primary_key, opt_value);
  if (!goog.isDefAndNotNull(opt_key)) {
    goog.log.finer(this.logger, this + ' finished.');
    this.done_ = true;
  }
  this.key_ = opt_key;
  this.primary_key_ = opt_primary_key;
  this.value_ = opt_value;

  this.count_++;
  if (this.done_) {
    goog.log.finest(this.logger, this + ' DONE.');
    this.onNext();
    this.finalize_();
  } else {
    var key_str = this.is_index ?
        this.key_ + ', ' + this.primary_key_ : this.key_;
    goog.log.finest(this.logger, this + ' new cursor position {' + key_str + '}');
    this.onNext(this.key_);
  }
};


/**
 * @inheritDoc
 */
ydn.db.core.req.AbstractCursor.prototype.disposeInternal = function() {
  this.tx = null;
};


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.core.req.AbstractCursor.prototype.toString = function() {
    var index = goog.isDef(this.index_name) ? ':' + this.index_name : '';
    var active = this.tx ? '' : '~';
    return 'Cursor:' + this.store_name +
        index + '[' + active + this.tx_no + ']';
  };
}


/**
 * Copy keys from cursors before browser GC them, as cursor lift-time expires.
 * http://www.w3.org/TR/IndexedDB/#dfn-transaction-lifetime
 * Keys are used to resume cursors position.
 * @private
 */
ydn.db.core.req.AbstractCursor.prototype.finalize_ = function() {
  // IndexedDB will GC array keys, so we clone it.
  if (goog.isDefAndNotNull(this.primary_key_)) {
    this.primary_key_ = ydn.db.Key.clone(this.primary_key_);
  } else {
    this.primary_key_ = undefined;
  }
  if (goog.isDefAndNotNull(this.key_)) {
    this.key_ = ydn.db.Key.clone(this.key_);
  } else {
    this.key_ = undefined;
  }
  this.onTerminated(this.exited_, this.key_, this.primary_key_);
};


/**
 * Make cursor opening request.
 *
 * This will seek to given initial position if given. If only ini_key (primary
 * key) is given, this will rewind, if not found.
 *
 * @param {IDBKey=} opt_ini_key effective key to resume position.
 * @param {IDBKey=} opt_ini_primary_key primary key to resume position.
 */
ydn.db.core.req.AbstractCursor.prototype.openCursor = goog.abstractMethod;


/**
 * @param {ydn.db.base.Transaction} tx tx.
 * @param {string} tx_no tx no.
 * @param {IDBKey=} opt_ini_key effective key to resume position.
 * @param {IDBKey=} opt_ini_primary_key primary key to resume position.
 */
ydn.db.core.req.AbstractCursor.prototype.open = function(tx, tx_no,
    opt_ini_key, opt_ini_primary_key) {
  this.tx = tx;
  this.tx_no = tx_no;
  this.exited_ = false;
  this.done_ = false;
  this.key_ = opt_ini_key;
  this.primary_key_ = opt_ini_primary_key;
  this.openCursor(this.key_, this.primary_key_);
};


/**
 * Resume cursor.
 * @param {ydn.db.base.Transaction} tx tx.
 * @param {string} tx_no tx no.
 * @final
 */
ydn.db.core.req.AbstractCursor.prototype.resume = function(tx, tx_no) {
  if (this.done_) {
    this.open(tx, tx_no);
  } else {
    this.open(tx, tx_no, this.key_, this.primary_key_);
  }
};


/**
 * Exit cursor
 */
ydn.db.core.req.AbstractCursor.prototype.exit = function() {
  this.exited_ = true;
  goog.log.finest(this.logger, this + ': exit');
  this.finalize_();
};


/**
 * @return {number} Number of steps iterated.
 */
ydn.db.core.req.AbstractCursor.prototype.getCount = function() {
  return this.count_;
};


/**
 * @return {IDBKey|undefined} effective key of cursor.
 */
ydn.db.core.req.AbstractCursor.prototype.getKey = function() {
  return this.key_;
};


/**
 * @return {IDBKey|undefined} primary key of cursor.
 */
ydn.db.core.req.AbstractCursor.prototype.getPrimaryKey = function() {
  return this.isIndexCursor() ?
      this.primary_key_ : this.key_;
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {*} value.
 */
ydn.db.core.req.AbstractCursor.prototype.getValue = function(opt_idx) {
  return this.isValueCursor() ?
      this.value_ : this.getPrimaryKey();
};


/**
 *
 * @return {boolean} true if cursor gone.
 */
ydn.db.core.req.AbstractCursor.prototype.hasDone = function() {
  return this.done_;
};


/**
 *
 * @return {boolean} true if iteration is existed.
 */
ydn.db.core.req.AbstractCursor.prototype.isExited = function() {
  return this.exited_;
};


/**
 * Move cursor position to the primary key while remaining on same index key.
 * @param {IDBKey} primary_key primary key position to continue.
 */
ydn.db.core.req.AbstractCursor.prototype.continuePrimaryKey =
    function(primary_key) {};


/**
 * Move cursor position to the effective key.
 * @param {IDBKey=} opt_effective_key effective key position to continue.
 */
ydn.db.core.req.AbstractCursor.prototype.continueEffectiveKey =
    function(opt_effective_key) {};


/**
 * Move cursor position to the effective key.
 * @param {number} number_of_step
 */
ydn.db.core.req.AbstractCursor.prototype.advance = goog.abstractMethod;


/**
 * @return {boolean}
 */
ydn.db.core.req.AbstractCursor.prototype.hasCursor = goog.abstractMethod;


/**
 * @param {!Object} obj record value.
 * @return {!goog.async.Deferred} value.
 */
ydn.db.core.req.AbstractCursor.prototype.update = goog.abstractMethod;


/**
 * Clear record
 * @return {!goog.async.Deferred} value.
 */
ydn.db.core.req.AbstractCursor.prototype.clear = goog.abstractMethod;


/**
 * Restart the cursor. If previous cursor position is given,
 * the position is skip.
 * @param {IDBKey=} effective_key previous position.
 * @param {IDBKey=} primary_key
 * @final
 */
ydn.db.core.req.AbstractCursor.prototype.restart = function(
    effective_key, primary_key) {
  goog.log.finest(this.logger, this + ' restarting');
  this.done_ = false;
  this.exited_ = false;
  this.openCursor(primary_key, effective_key);
};

