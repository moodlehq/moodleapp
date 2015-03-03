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
 * @fileoverview Transaction queue.
 *
 * A transaction is used to crate non-overlapping transaction so that each
 * database methods are atomic and run in order.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.tr.Serial');
goog.require('ydn.db.tr.Mutex');
goog.require('ydn.db.tr.Thread');
goog.require('ydn.debug.error.NotSupportedException');



/**
 * Create transaction queue providing methods to run in non-overlapping
 * transactions.
 *
 * @param {!ydn.db.tr.Storage} storage base storage.
 * @param {number} ptx_no transaction queue number.
 * @param {ydn.db.tr.Thread.Policy=} opt_policy transaction policy.
 * @param {!Array.<string>=} opt_store_names store names as scope.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode as scope.
 * @param {number=} opt_max_tx_no limit number of transaction created.
 * @constructor
 * @extends {ydn.db.tr.Thread}
 * @struct
 */
ydn.db.tr.Serial = function(storage, ptx_no, opt_policy,
                            opt_store_names, opt_mode, opt_max_tx_no) {

  goog.base(this, storage, ptx_no, opt_policy,
      opt_store_names, opt_mode, opt_max_tx_no);

  /**
   * @type {!Array.<{
   *    fnc: Function,
   *    scope: string,
   *    store_names: !Array.<string>,
   *    mode: ydn.db.base.TransactionMode,
   *    oncompleted: function (ydn.db.base.TxEventTypes.<string>, *)
   * }>}
   * @final
   * @private
   */
  this.trQueue_ = [];

  /**
   * @final
   * @type {Array.<Function>}
   * @private
   */
  this.completed_handlers_ = [];

  /**
   * Transaction object is sed when receiving a request before result df
   * callback and set null after that callback so that it can be aborted
   * in the callback.
   * In general, this tx may be different from running tx.
   * @type {ydn.db.base.Transaction}
   * @protected
   */
  this.s_request_tx = null;

  /**
   * One database can have only one transaction.
   * @type {!ydn.db.tr.Mutex}
   * @private
   * @final
   */
  this.mu_tx_ = new ydn.db.tr.Mutex(ptx_no);

  /**
   * @final
   * @private
   */
  this.max_tx_no_ = opt_max_tx_no || 0;
  /**
   * A flag to indicate a transaction has been placed to the storage mechanism.
   * @type {boolean}
   * @private
   */
  this.has_tx_started_ = false;
};
goog.inherits(ydn.db.tr.Serial, ydn.db.tr.Thread);


/**
 * @const
 * @type {boolean}
 */
ydn.db.tr.Serial.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.tr.Serial.prototype.logger =
    goog.log.getLogger('ydn.db.tr.Serial');


/**
 * @protected
 * @return {ydn.db.tr.Mutex} mutex.
 */
ydn.db.tr.Serial.prototype.getMuTx = function() {
  return this.mu_tx_;
};


/**
 * Obtain active consumable transaction object.
 * @return {ydn.db.tr.Mutex} transaction object if active and available.
 */
ydn.db.tr.Serial.prototype.getActiveTx = function() {
  return this.mu_tx_.isActiveAndAvailable() ? this.mu_tx_ : null;
};


/**
 *
 * @return {boolean} true if trnasaction is active and available.
 */
ydn.db.tr.Serial.prototype.isActive = function() {
  return this.mu_tx_.isActiveAndAvailable();
};


/**
 * @param {!Array.<string>} store_names store names for scope.
 * @param {ydn.db.base.TransactionMode} mode tx mode.
 * @return {boolean} return true if given scope and mode is compatible with
 * active transaction and should be reuse.
 * @protected
 */
ydn.db.tr.Serial.prototype.reusedTx = function(store_names, mode) {
  if (this.policy == ydn.db.tr.Thread.Policy.MULTI) {
    return this.mu_tx_.subScope(store_names, mode);
  } else if (this.policy == ydn.db.tr.Thread.Policy.REPEAT) {
    return this.mu_tx_.sameScope(store_names, mode);
  } else if (this.policy == ydn.db.tr.Thread.Policy.ALL) {
    return true;
  } else {
    return false; // SINGLE and ATOMIC
  }
};


/**
 * @return {ydn.db.base.Transaction} active transaction object.
 */
ydn.db.tr.Serial.prototype.getTx = function() {
  return this.mu_tx_.isActiveAndAvailable() ? this.mu_tx_.getTx() : null;
};


/**
 * Transaction is explicitly set not to do next transaction.
 */
ydn.db.tr.Serial.prototype.lock = function() {
  this.mu_tx_.lock();
};


/**
 * @const
 * @type {number} maximun number of transaction queue.
 */
ydn.db.tr.Serial.MAX_QUEUE = 1000;


/**
 * Run the first transaction task in the queue. DB must be ready to do the
 * transaction.
 * @private
 */
ydn.db.tr.Serial.prototype.popTxQueue_ = function() {

  var task = this.trQueue_.shift();
  if (task) {
    if (ydn.db.tr.Serial.DEBUG) {
      goog.log.finest(this.logger, 'pop tx queue[' + this.trQueue_.length + ']');
    }
    this.processTx(task.fnc, task.store_names, task.mode, task.oncompleted);
  }
  //this.last_queue_checkin_ = goog.now();
};


/**
 *
 * @return {Array.<string>}
 */
ydn.db.tr.Serial.prototype.peekScopes = function() {
  if (this.trQueue_.length > 0) {
    return this.trQueue_[0].store_names;
  } else {
    return null;
  }
};


/**
 * @return {ydn.db.base.TransactionMode?} return next transaction mode.
 */
ydn.db.tr.Serial.prototype.peekMode = function() {
  if (this.trQueue_.length > 0) {
    return this.trQueue_[0].mode;
  } else {
    return null;
  }
};


/**
 * Check next transaction.
 * @protected
 * @return {boolean}
 */
ydn.db.tr.Serial.prototype.isNextTxCompatible = function() {
  var scopes = this.peekScopes();
  var mode = this.peekMode();
  if (goog.isDefAndNotNull(scopes) && goog.isDefAndNotNull(mode)) {
    return this.reusedTx(scopes, mode);
  } else {
    return false;
  }
};


/**
 * Push a transaction job to the queue.
 * @param {Function} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TxEventTypes, *)=} opt_on_completed
 * handler.
 * @protected
 */
ydn.db.tr.Serial.prototype.pushTxQueue = function(trFn, store_names,
    opt_mode, opt_on_completed) {
  goog.log.finest(this.logger, 'push tx queue[' + this.trQueue_.length + ']');
  this.trQueue_.push({
    fnc: trFn,
    store_names: store_names,
    mode: opt_mode,
    oncompleted: opt_on_completed
  });

};


/**
 * Abort an active transaction.
 */
ydn.db.tr.Serial.prototype.abort = function() {
  goog.log.finer(this.logger, this + ': aborting');
  ydn.db.tr.Thread.abort(this.s_request_tx);
};


/**
 * Create a new isolated transaction. After creating a transaction, use
 * {@link #getTx} to received an active transaction. If transaction is not
 * active, it return null. In this case a new transaction must re-create.
 * @param {Function} trFn function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TxEventTypes, *)=} opt_on_completed
 * handler.
 */
ydn.db.tr.Serial.prototype.processTx = function(trFn, store_names, opt_mode,
                                                opt_on_completed) {

  var names = goog.isString(store_names) ? [store_names] : store_names;
  if (goog.DEBUG) {
    if (!goog.isArrayLike(names)) { // could be  DOMStringList or Array
      throw new ydn.debug.error.ArgumentException(
          'store names must be an array');
    } else if (names.length == 0) {
      throw new ydn.debug.error.ArgumentException(
          'number of store names must more than 0');
    } else {
      for (var i = 0; i < names.length; i++) {
        if (!goog.isString(names[i])) {
          throw new ydn.debug.error.ArgumentException('store name at ' + i +
              ' must be string but found ' + names[i] +
              ' of type ' + typeof names[i]);
        } else if (this.scope_store_names_) {
          if (!goog.array.contains(this.scope_store_names_, names[i])) {
            throw new ydn.debug.error.ArgumentException('store name "' + i +
                names[i] + '" in scope of ' + this);
          }
        } else {
          // todo: check with auto schema
          /*
          if (!this.getStorage().hasStore(names[i])) {
            throw new ydn.debug.error.ArgumentException('store name "' + i +
                names[i] + '" in the schema.');
          }
          */
        }
      }
    }
  }

  var mode = goog.isDef(opt_mode) ?
      opt_mode : ydn.db.base.TransactionMode.READ_ONLY;

  var me = this;

  if (this.mu_tx_.isActive() || // we are serial, one tx at a time
      // if db is not ready and we already send one tx request, we keep
      // our tx request in our queue
      (!this.getStorage().isReady() && // if not ready
          this.has_tx_started_ // we put only one tx, to prevent overlap.
          )) {
    this.pushTxQueue(trFn, store_names, mode, opt_on_completed);
  } else {
    var label = this.getLabel();
    var transaction_process = function(tx) {
      me.mu_tx_.up(tx, store_names, mode);
      label = me.getLabel();
      goog.log.fine(me.logger, label + ' BEGIN ' +
          ydn.json.stringify(store_names) + ' ' + mode);

      // now execute transaction process
      trFn(me);
      trFn = null;

      me.mu_tx_.out(); // flag transaction callback scope is over.
      // transaction is still active and use in followup request handlers

      while (me.isNextTxCompatible()) {
        var task = me.trQueue_.shift();
        if (task.oncompleted) {
          me.completed_handlers_.push(task.oncompleted);
        }
        goog.log.finest(me.logger, 'pop tx queue' + (me.trQueue_.length + 1) +
            ' reusing T' + me.getTxNo());
        task.fnc();
      }
    };

    var completed_handler = function(type, event) {
      //console.log('transaction_process ' + scope_name + ' completed.');
      goog.log.fine(me.logger, label + ' ' + type);
      me.mu_tx_.down(type, event);
      for (var j = 0; j < me.completed_handlers_.length; j++) {
        var fn = me.completed_handlers_[j];
        fn(type, event);
      }
      me.completed_handlers_.length = 0;
      me.popTxQueue_();
      me.r_no_ = 0;
    };

    if (opt_on_completed) {
      this.completed_handlers_.push(opt_on_completed);
    }

    if (this.max_tx_no_ && this.getTxNo() >= this.max_tx_no_) {
      throw new ydn.debug.error.InvalidOperationException(
          'Exceed maximum number of transactions of ' + this.max_tx_no_);
    }

    this.has_tx_started_ = true;
    this.getStorage().transaction(transaction_process, names, mode,
        completed_handler);
  }

};


/**
 *
 * @return {string} return label.
 */
ydn.db.tr.Serial.prototype.getLabel = function() {
  return this.mu_tx_.getLabel();
};


/**
 * @inheritDoc
 */
ydn.db.tr.Serial.prototype.request = function(method, store_names, opt_mode,
    opt_on_complete) {
  var req = new ydn.db.Request(method);
  var mode = opt_mode || ydn.db.base.TransactionMode.READ_ONLY;
  var me = this;

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

  if (this.mu_tx_.isActiveAndAvailable() && this.reusedTx(store_names, mode)) {
    //console.log(mu_tx.getScope() + ' continuing tx for ' + scope);
    // call within a transaction
    // continue to use existing transaction
    var tx = this.mu_tx_.getTx();
    this.r_no_++;
    req.setTx(tx, this.getLabel() + 'R' + this.r_no_);
    this.completed_handlers_.push(onComplete);
  } else {
    //
    //
    /**
     * create a new transaction and close for invoke in non-transaction context
     * @param {Function} cb callback to process tx.
     */
    var tx_callback = function(cb) {
      //console.log('tx running for ' + scope);
      // me.not_ready_ = true;
      // transaction should be active now
      var tx = me.mu_tx_.getTx();
      me.r_no_++;
      req.setTx(tx, me.getLabel() + 'R' + me.r_no_);
    };
    me.processTx(tx_callback, store_names, mode, onComplete);
  }
  return req;
};


/**
 * @inheritDoc
 */
ydn.db.tr.Serial.prototype.exec = function(df, callback,
    store_names, opt_mode, on_complete) {
  var mode = opt_mode || ydn.db.base.TransactionMode.READ_ONLY;
  var me = this;
  var rq_label;

  if (me.mu_tx_.isActiveAndAvailable() && this.reusedTx(store_names, mode)) {
    //console.log(mu_tx.getScope() + ' continuing tx for ' + scope);
    // call within a transaction
    // continue to use existing transaction
    var tx = me.mu_tx_.getTx();
    /**
     * @param {*} result result.
     * @param {boolean=} opt_is_error true if request has error.
     */
    var resultCallback = function(result, opt_is_error) {
      me.s_request_tx = tx; // so that we can abort it.
      if (opt_is_error) {
        goog.log.finer(me.logger, rq_label + ' ERROR');
        df.errback(result);
      } else {
        goog.log.finer(me.logger, rq_label + ' SUCCESS');
        df.callback(result);
      }
      me.s_request_tx = null;
    };
    me.r_no_++;
    rq_label = me.getLabel() + 'R' + me.r_no_;
    goog.log.finer(me.logger, rq_label + ' BEGIN');
    callback(tx, rq_label, resultCallback);
    goog.log.finer(me.logger, rq_label + ' END');
    callback = null;
  } else {
    //
    //
    /**
     * create a new transaction and close for invoke in non-transaction context
     * @param {Function} cb callback to process tx.
     */
    var tx_callback = function(cb) {
      //console.log('tx running for ' + scope);
      // me.not_ready_ = true;
      // transaction should be active now
      var tx = me.mu_tx_.getTx();
      /**
       * @param {*} result result.
       * @param {boolean=} opt_is_error true if request has error.
       */
      var resultCallback2 = function(result, opt_is_error) {
        me.s_request_tx = tx; // so that we can abort it.
        if (opt_is_error) {
          goog.log.finer(me.logger, rq_label + ' ERROR');
          df.errback(result);
        } else {
          goog.log.finer(me.logger, rq_label + ' SUCCESS');
          df.callback(result);
        }
        me.s_request_tx = null;
      };
      me.r_no_++;
      rq_label = me.getLabel() + 'R' + me.r_no_;
      goog.log.finer(me.logger, rq_label + ' BEGIN');
      callback(tx, rq_label, resultCallback2);
      goog.log.finer(me.logger, rq_label + ' END');
      callback = null; // we don't call again.
    };
    me.processTx(tx_callback, store_names, mode, on_complete);
  }
};


/**
 * @final
 * @return {string} database name.
 */
ydn.db.tr.Serial.prototype.getName = function() {
  return this.getStorage().getName();
};


if (goog.DEBUG) {
  /** @override */
  ydn.db.tr.Serial.prototype.toString = function() {
    var s = !!this.s_request_tx ? '*' : '';
    return 'Serial' + ':' + this.getLabel() + s;
  };
}

