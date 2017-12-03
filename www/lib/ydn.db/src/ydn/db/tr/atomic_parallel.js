/**
 * @fileoverview Transaction queue.
 *
 * A transaction is used to crate non-overlapping transaction so that each
 * database methods are atomic and run in order.
 */


goog.provide('ydn.db.tr.AtomicParallel');
goog.require('ydn.db.tr.Thread');
goog.require('ydn.db.tr.Parallel');
goog.require('ydn.debug.error.NotSupportedException');



/**
 * Create transaction queue providing methods to run in non-overlapping
 * transactions.
 *
 * @param {!ydn.db.tr.Storage} storage base storage.
 * @param {number} ptx_no transaction queue number.
 * @constructor
 * @extends {ydn.db.tr.Parallel}
 */
ydn.db.tr.AtomicParallel = function(storage, ptx_no) {

  goog.base(this, storage, ptx_no, ydn.db.tr.Thread.Policy.SINGLE);

};
goog.inherits(ydn.db.tr.AtomicParallel, ydn.db.tr.Parallel);


/**
 * @const
 * @type {boolean}
 */
ydn.db.tr.AtomicParallel.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.tr.AtomicParallel.prototype.logger =
    goog.log.getLogger('ydn.db.tr.AtomicParallel');


/**
 * @inheritDoc
 */
ydn.db.tr.AtomicParallel.prototype.reusedTx = function(scopes, mode) {
  return false;
};


/**
 * @inheritDoc
 */
ydn.db.tr.AtomicParallel.prototype.request = function(method, scope, opt_mode) {
  var req_setDbValue, result, is_error;
  var me = this;
  /**
   * @param {ydn.db.base.TxEventTypes} t event type.
   * @param {*} e error.
   */
  var onComplete = function(t, e) {
    // console.log('onComplete', t, result);
    req.removeTx();
    goog.log.finer(me.logger, 'transaction ' + t);
    if (req_setDbValue) {
      if (t != ydn.db.base.TxEventTypes.COMPLETE) {
        is_error = true;
        result = e;
      }
      req_setDbValue(result, is_error);
    } else {
      var err = new ydn.db.TimeoutError();
      req.setDbValue(err, true);
    }
  };
  var req = goog.base(this, 'request', method, scope, opt_mode, onComplete);
  // intersect request result to make atomic
  req.await(function(value, has_error, rtn) {
    // console.log('req success', value);
    is_error = has_error;
    result = value;
    req_setDbValue = rtn;
  });
  return req;
};


/**
 * @inheritDoc
 */
ydn.db.tr.AtomicParallel.prototype.exec = function(df, callback, store_names,
    mode, on_completed) {
  // intersect request result to make atomic
  var result;
  var is_error;
  var cdf = new goog.async.Deferred();
  cdf.addCallbacks(function(x) {
    is_error = false;
    result = x;
  }, function(e) {
    is_error = true;
    result = e;
  });
  var completed_handler = function(t, e) {
    // console.log('completed_handler ' + t + ' ' + e);
    if (t != ydn.db.base.TxEventTypes.COMPLETE) {
      df.errback(e);
    } else if (is_error === true) {
      df.errback(result);
    } else if (is_error === false) {
      df.callback(result);
    } else {
      var err = new ydn.db.TimeoutError();
      df.errback(err);
    }
    if (on_completed) {
      on_completed(t, e);
      on_completed = undefined;
    }
  };
  goog.base(this, 'exec', cdf, callback, store_names, mode,
      completed_handler);
};


if (goog.DEBUG) {
  /** @override */
  ydn.db.tr.AtomicParallel.prototype.toString = function() {
    return 'Atomic' + goog.base(this, 'toString');
  };
}
