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
 * @fileoverview Parallel transaction thread.
 *
 * Transaction is created as necessary resulting parallel transactions.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.tr.Parallel');
goog.require('ydn.db.tr.ParallelTxExecutor');
goog.require('ydn.db.tr.Thread');
goog.require('ydn.debug.error.NotSupportedException');



/**
 * Create transaction queue providing methods to run in non-overlapping
 * transactions.
 *
 * @extends {ydn.db.tr.Thread}
 * @param {!ydn.db.tr.Storage} storage base storage.
 * @param {number} ptx_no transaction queue number.
 * @param {ydn.db.tr.Thread.Policy=} opt_policy
 * @param {!Array.<string>=} opt_store_names store names as scope.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode as scope.
 * @param {number=} opt_max_tx_no limit number of transaction created.
 * @constructor
 * @struct
 */
ydn.db.tr.Parallel = function(storage, ptx_no, opt_policy,
                              opt_store_names, opt_mode, opt_max_tx_no) {

  goog.base(this, storage, ptx_no, opt_policy,
      opt_store_names, opt_mode, opt_max_tx_no);

  /**
   *
   * @type {ydn.db.tr.ParallelTxExecutor}
   * @private
   */
  this.pl_tx_ex_ = null;

  /**
   * Transaction object is sed when receiving a request before result df
   * callback and set null after that callback so that it can be aborted
   * in the callback.
   * In general, this tx may be different from running tx.
   * @type {ydn.db.base.Transaction}
   * @protected
   */
  this.p_request_tx = null;


};
goog.inherits(ydn.db.tr.Parallel, ydn.db.tr.Thread);


/**
 * @const
 * @type {boolean}
 */
ydn.db.tr.Parallel.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.tr.Parallel.prototype.logger =
    goog.log.getLogger('ydn.db.tr.Parallel');


/**
 *
 * @return {ydn.db.tr.ParallelTxExecutor}
 */
ydn.db.tr.Parallel.prototype.getPlTx = function() {
  return this.pl_tx_ex_;
};


/**
 *
 * @return {boolean} return true if thread has active transaction.
 */
ydn.db.tr.Parallel.prototype.isActive = function() {
  return !!this.pl_tx_ex_ && this.pl_tx_ex_.isActive();
};


/**
 *
 * @param {!Array.<string>} store_names
 * @param {ydn.db.base.TransactionMode} mode
 * @return {boolean}
 * @protected
 */
ydn.db.tr.Parallel.prototype.sameScope = function(store_names, mode) {
  return this.pl_tx_ex_.sameScope(store_names, mode);
};


/**
 *
 * @param {!Array.<string>} store_names
 * @param {ydn.db.base.TransactionMode} mode
 * @return {boolean}
 * @protected
 */
ydn.db.tr.Parallel.prototype.subScope = function(store_names, mode) {
  return this.pl_tx_ex_.subScope(store_names, mode);
};


/**
 * Abort an active transaction.
 * @throws InvalidStateError if transaction is not active.
 */
ydn.db.tr.Parallel.prototype.abort = function() {
  goog.log.finer(this.logger, this + ': aborting');
  ydn.db.tr.Thread.abort(this.p_request_tx);
};


/**
 * Return cache executor object or create on request. This have to be crated
 * Lazily because, we can initialize it only when transaction object is active.
 * @protected
 * @return {ydn.db.crud.req.IRequestExecutor} get executor.
 */
ydn.db.tr.Parallel.prototype.getExecutor = goog.abstractMethod;


/**
 * @param {!Array.<string>} store_names store names for scope.
 * @param {ydn.db.base.TransactionMode} mode tx mode.
 * @return {boolean} return true if given scope and mode is compatible with
 * active transaction and should be reuse.
 * @protected
 */
ydn.db.tr.Parallel.prototype.reusedTx = function(store_names, mode) {
  if (this.policy == ydn.db.tr.Thread.Policy.MULTI) {
    return this.pl_tx_ex_.subScope(store_names, mode);
  } else if (this.policy == ydn.db.tr.Thread.Policy.REPEAT) {
    return this.pl_tx_ex_.sameScope(store_names, mode);
  } else if (this.policy == ydn.db.tr.Thread.Policy.ALL) {
    return true;
  } else {
    return false; // SINGLE and ATOMIC
  }
};


/**
 * @inheritDoc
 */
ydn.db.tr.Parallel.prototype.processTx = function(callback, store_names,
    opt_mode, on_completed) {

  var label;

  if (this.scope_store_names) {
    store_names = this.scope_store_names;
  }
  if (this.scope_mode) {
    opt_mode = this.scope_mode;
  }

  var mode = goog.isDef(opt_mode) ?
      opt_mode : ydn.db.base.TransactionMode.READ_ONLY;

  var me = this;
  var pl_tx_ex;

  var completed_handler = function(type, event) {
    goog.log.fine(me.logger, label + ' ' + type);
    if (pl_tx_ex) {
      // if transaction_process was not called due to database fail
      pl_tx_ex.onCompleted(type, event);
    }
    me.r_no_ = 0;
  };

  var transaction_process = function(tx) {
    me.tx_no_++;
    pl_tx_ex = new ydn.db.tr.ParallelTxExecutor(
        tx, me.tx_no_, store_names, mode);
    label = me.getLabel();
    goog.log.fine(me.logger, label + ' BEGIN ' +
        ydn.json.stringify(store_names) + ' ' + mode);
    me.pl_tx_ex_ = pl_tx_ex;
    me.pl_tx_ex_.executeTx(callback, on_completed);
  };

  var reused = this.isActive() && this.reusedTx(store_names, mode);
  if (ydn.db.tr.Parallel.DEBUG) {
    var act = this.isActive() ? 'active' : 'inactive';
    goog.global.console.log(this +
        ' ' + this.pl_tx_ex_ +
        (reused ? ' reusing ' + act + ' transaction' :
            ' opening ' + act + ' transaction ') +
        ' for mode:' + mode + ' scopes:' +
        ydn.json.stringify(store_names));
  }

  if (reused) {
    this.pl_tx_ex_.executeTx(callback, on_completed);
  } else {
    if (this.max_tx_no && this.tx_no_ >= this.max_tx_no) {
      throw new ydn.debug.error.InvalidOperationException(
          'Exceed maximum number of transactions of ' + this.max_tx_no);
    }
    this.getStorage().transaction(transaction_process, store_names, mode,
        completed_handler);
  }

};


/**
 * @inheritDoc
 */
ydn.db.tr.Parallel.prototype.request = function(method, store_names, opt_mode,
                                                opt_on_complete) {
  var req = new ydn.db.Request(method);
  var mode = opt_mode || ydn.db.base.TransactionMode.READ_ONLY;
  var me = this;

  if (ydn.db.tr.Parallel.DEBUG) {
    var rdn = 'SN' + Math.random();
    rdn = rdn.replace('.', '');
    goog.global.console.log(this + ' scheduling to execute ' + store_names + ' ' +
        mode + ' ' + rdn);
  }

  /**
   * @param {ydn.db.base.TxEventTypes} t
   * @param {*} e
   */
  var onComplete = function(t, e) {
    req.removeTx();
    if (opt_on_complete) {
      opt_on_complete(t, e);
    }
  };

  this.processTx(function(tx) {
    if (ydn.db.tr.Parallel.DEBUG) {
      goog.global.console.log(me + ' executing ' + rdn);
    }
    me.r_no_++;
    var rq_label = me.getLabel() + 'R' + me.r_no_;
    req.setTx(tx, rq_label);
  }, store_names, mode, onComplete);
  return req;
};


/**
 * @inheritDoc
 */
ydn.db.tr.Parallel.prototype.exec = function(df, callback, store_names, mode,
                                             on_completed) {

  var me = this;
  var rq_label;

  if (ydn.db.tr.Parallel.DEBUG) {
    var rdn = 'SN' + Math.random();
    rdn = rdn.replace('.', '');
    goog.global.console.log(this + ' scheduling to execute ' + store_names + ' ' +
        mode + ' ' + rdn);
  }

  this.processTx(function(tx) {
    if (ydn.db.tr.Parallel.DEBUG) {
      goog.global.console.log(this + ' executing ' + rdn);
    }
    me.r_no_++;
    rq_label = me.getLabel() + 'R' + me.r_no_;
    /**
     *
     * @param {*} result
     * @param {boolean=} is_error
     */
    var resultCallback = function(result, is_error) {
      me.p_request_tx = tx; // so that we can abort it.
      rq_label = me.getLabel() + 'R' + me.r_no_;
      if (is_error) {
        goog.log.finer(me.logger, rq_label + ' ERROR');
        df.errback(result);
      } else {
        goog.log.finer(me.logger, rq_label + ' SUCCESS');
        df.callback(result);
      }
      me.p_request_tx = null;
    };
    goog.log.finer(me.logger, rq_label + ' BEGIN');
    callback(tx, rq_label, resultCallback);
    callback = null;
    goog.log.finer(me.logger, rq_label + ' END');
  }, store_names, mode, on_completed);
};


if (goog.DEBUG) {
  /** @override */
  ydn.db.tr.Parallel.prototype.toString = function() {
    var s = this.p_request_tx ? '*' : '';
    return 'Parallel:' + this.policy + ':' + this.getLabel() + s;
  };
}

