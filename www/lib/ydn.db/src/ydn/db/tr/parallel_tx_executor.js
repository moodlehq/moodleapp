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
 * @fileoverview Parallel transaction executor.
 */

goog.provide('ydn.db.tr.ParallelTxExecutor');
goog.require('ydn.debug.error.InternalError');



/**
 *
 * @param {ydn.db.base.Transaction} tx transaction.
 * @param {number} tx_no tx no.
 * @param {Array.<string>} store_names store lists for explicit tx scope.
 * @param {ydn.db.base.TransactionMode?} mode mode for explicit tx scope.
 * @constructor
 * @struct
 */
ydn.db.tr.ParallelTxExecutor = function(tx, tx_no, store_names, mode) {
  this.tx_ = tx;
  this.tx_no_ = tx_no;
  this.scopes_ = goog.array.clone(store_names);
  this.mode_ = mode;
  this.oncompleted_handlers = [];
};


/**
 * @type {ydn.db.base.Transaction}
 * @private
 */
ydn.db.tr.ParallelTxExecutor.prototype.tx_ = null;


/**
 * @type {number}
 * @private
 */
ydn.db.tr.ParallelTxExecutor.prototype.tx_no_;


/**
 * @private
 * @type {Array.<Function>}
 */
ydn.db.tr.ParallelTxExecutor.prototype.oncompleted_handlers;


/**
 * @type {Array.<string>} list of sorted store names as transaction scope
 * @private
 */
ydn.db.tr.ParallelTxExecutor.prototype.scopes_;


/**
 * @type {ydn.db.base.TransactionMode?}
 * @private
 */
ydn.db.tr.ParallelTxExecutor.prototype.mode_;


/**
 *
 * @return {boolean} return true if thread has active transaction.
 */
ydn.db.tr.ParallelTxExecutor.prototype.isActive = function() {
  return !!this.tx_;
};


/**
 *
 * @return {ydn.db.base.Transaction} active transaction object.
 * @protected
 */
ydn.db.tr.ParallelTxExecutor.prototype.getTx = function() {
  return this.tx_;
};


/**
 *
 * @return {number} transaction count.
 */
ydn.db.tr.ParallelTxExecutor.prototype.getTxNo = function() {
  return this.tx_no_;
};


/**
 * Handler on tx completed.
 * @param {ydn.db.base.TxEventTypes} t tx event type.
 * @param {*} e error if it has.
 */
ydn.db.tr.ParallelTxExecutor.prototype.onCompleted = function(t, e) {
  goog.asserts.assert(this.isActive(), this.tx_no_ + ' already completed?');
  for (var i = 0; i < this.oncompleted_handlers.length; i++) {
    this.oncompleted_handlers[i](t, e);
  }
  this.oncompleted_handlers.length = 0;
  this.tx_ = null;
  this.scopes_ = null;
  this.oncompleted_handlers = null;
};


/**
 *
 * @param {Function} on_tx tx function.
 * @param {function(ydn.db.base.TxEventTypes, *)=} opt_on_completed handler.
 */
ydn.db.tr.ParallelTxExecutor.prototype.executeTx = function(on_tx,
                                                            opt_on_completed) {
  if (this.tx_) {
    if (opt_on_completed) {
      this.oncompleted_handlers.push(opt_on_completed);
    }
    on_tx(this.tx_);
  } else {
    throw new ydn.debug.error.InternalError(
        'tx committed on ParallelTxExecutor');
  }
};


/**
 *
 * @param {!Array.<string>} scopes store names as tx scope.
 * @param {ydn.db.base.TransactionMode} mode tx mode.
 * @return {boolean} true if in same scope.
 */
ydn.db.tr.ParallelTxExecutor.prototype.sameScope = function(scopes, mode) {
  if (!this.scopes_ || !this.mode_) {
    return false;
  }
  if (mode != this.mode_) {
    return false;
  }
  if (this.scopes_.length != scopes.length) {
    return false;
  }
  for (var i = 0; i < scopes.length; i++) {
    if (this.scopes_.indexOf(scopes[i]) == -1) {
      return false;
    }
  }
  return true;
};


/**
 *
 * @param {!Array.<string>} store_names store names as tx scope.
 * @param {ydn.db.base.TransactionMode} mode mode tx mode.
 * @return {boolean} true if in sub scope.
 */
ydn.db.tr.ParallelTxExecutor.prototype.subScope = function(store_names, mode) {
  if (!this.scopes_ || !this.mode_) {
    return false;
  }
  if (mode != this.mode_) {
    if (this.mode_ != ydn.db.base.TransactionMode.READ_WRITE ||
        mode != ydn.db.base.TransactionMode.READ_ONLY) {
      return false;
    }
  }
  if (store_names.length > this.scopes_.length) {
    return false;
  }
  for (var i = 0; i < store_names.length; i++) {
    if (this.scopes_.indexOf(store_names[i]) == -1) {
      return false;
    }
  }
  return true;
};


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.tr.ParallelTxExecutor.prototype.toString = function() {
    return 'ParallelTxExecutor: txNo:' + this.tx_no_ + ' mode:' +
        this.mode_ + ' scopes:' + ydn.json.stringify(this.scopes_);
  };
}
