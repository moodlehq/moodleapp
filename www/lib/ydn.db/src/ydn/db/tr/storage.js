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
 * @fileoverview Base database service provider.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.tr.Storage');
goog.require('ydn.db.con.Storage');
goog.require('ydn.db.tr.AtomicParallel');
goog.require('ydn.db.tr.AtomicSerial');
goog.require('ydn.db.tr.DbOperator');
goog.require('ydn.db.tr.Parallel');
goog.require('ydn.db.tr.Serial');



/**
 * Create storage providing method to run in transaction.
 *
 * @param {string=} opt_dbname database name.
 * @param {!ydn.db.schema.Database|DatabaseSchema=} opt_schema database schema
 * or its configuration in JSON format. If not provided, default empty schema
 * is used.
 * schema used in chronical order.
 * @param {!StorageOptions=} opt_options options.
 * @extends {ydn.db.con.Storage}
 * @constructor
 */
ydn.db.tr.Storage = function(opt_dbname, opt_schema, opt_options) {
  goog.base(this, opt_dbname, opt_schema, opt_options);

  this.ptx_no = 0;

  var is_serial = true;
  var req_type = ydn.db.tr.Thread.Policy.SINGLE;
  if (opt_options) {
    if (goog.isDef(opt_options.isSerial)) {
      is_serial = !!opt_options.isSerial;
    }
    if (opt_options.policy) {
      req_type = /** @type {ydn.db.tr.Thread.Policy} */
          (opt_options.policy);
    }
  }

  var tx_thread = this.newTxQueue(req_type, is_serial);

  /**
   * here we must define sync thread first, so that it is ready when
   * executing main thread.
   * This sync thread is used internally.
   * todo: this should belong to db_operator, not storage instance.
   * @final
   */
  this.sync_thread = this.newTxQueue(ydn.db.tr.Thread.Policy.ATOMIC, false);

  /**
   * main thread.
   * @final
   */
  this.db_operator = this.newOperator(tx_thread, this.sync_thread);


};
goog.inherits(ydn.db.tr.Storage, ydn.db.con.Storage);


/**
 * @type {ydn.db.tr.Thread}
 * @protected
 */
ydn.db.tr.Storage.prototype.sync_thread;


/**
 * @type {ydn.db.tr.DbOperator}
 * @protected
 */
ydn.db.tr.Storage.prototype.db_operator;


/**
 *
 * @type {number}
 * @protected
 */
ydn.db.tr.Storage.prototype.ptx_no = 0;


/**
 * Create a new db operator.
 * @param {ydn.db.tr.Thread.Policy?} request_type thread policy. Default is
 * SINGLE.
 * @param {boolean=} opt_is_serial serial request.
 * @param {!Array.<string>=} opt_store_names store names for tx scope.
 * @param {ydn.db.base.StandardTransactionMode=} opt_mode tx mode.
 * @param {number=} opt_max_tx limit number of transaction.
 * @param {boolean=} opt_no_sync no synchronization.
 * @return {ydn.db.tr.DbOperator} db operator.
 * @final
 */
ydn.db.tr.Storage.prototype.branch = function(request_type, opt_is_serial,
    opt_store_names, opt_mode, opt_max_tx, opt_no_sync) {

  request_type = request_type || ydn.db.tr.Thread.Policy.SINGLE;
  var mode;
  if (opt_mode == ydn.db.base.StandardTransactionMode.READ_ONLY) {
    mode = ydn.db.base.TransactionMode.READ_ONLY;
  } else if (opt_mode == ydn.db.base.StandardTransactionMode.READ_WRITE) {
    mode = ydn.db.base.TransactionMode.READ_WRITE;
  }

  var tx_thread = this.newTxQueue(request_type, opt_is_serial,
      opt_store_names, mode, opt_max_tx);
  var sync_thread = opt_no_sync ? null : this.sync_thread;
  return this.newOperator(tx_thread, sync_thread);
};


/**
 * @param {!ydn.db.tr.Thread} tx_thread transaction thread.
 * @param {ydn.db.tr.Thread} sync_thread thread for synchronization.
 * @return {!ydn.db.tr.DbOperator} the db operator.
 * @protected
 */
ydn.db.tr.Storage.prototype.newOperator = function(tx_thread, sync_thread) {
  return new ydn.db.tr.DbOperator(this, this.schema,
      tx_thread, sync_thread);
};


/**
 * Create a new thread queue.
 * @param {ydn.db.tr.Thread.Policy} request_type thread policy.
 * @param {boolean=} opt_is_serial serial request.
 * @param {!Array.<string>=} opt_store_names store names as scope.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode as scope.
 * @param {number=} opt_max_tx limit number of transaction.
 * @return {!ydn.db.tr.Thread} new transactional storage.
*/
ydn.db.tr.Storage.prototype.newTxQueue = function(request_type, opt_is_serial,
    opt_store_names, opt_mode, opt_max_tx) {

  if (opt_is_serial) {
    if (request_type == ydn.db.tr.Thread.Policy.MULTI ||
        request_type == ydn.db.tr.Thread.Policy.REPEAT ||
        request_type == ydn.db.tr.Thread.Policy.ALL ||
        request_type == ydn.db.tr.Thread.Policy.SINGLE) {
      return new ydn.db.tr.Serial(this, this.ptx_no++, request_type,
          opt_store_names, opt_mode, opt_max_tx);
    } else if (request_type == ydn.db.tr.Thread.Policy.ATOMIC) {
      return new ydn.db.tr.AtomicSerial(this, this.ptx_no++);
    } else {
      throw new ydn.debug.error.ArgumentException('Invalid requestType "' +
          request_type + '"');
    }
  } else {
    if (request_type == ydn.db.tr.Thread.Policy.MULTI ||
        request_type == ydn.db.tr.Thread.Policy.REPEAT ||
        request_type == ydn.db.tr.Thread.Policy.ALL ||
        request_type == ydn.db.tr.Thread.Policy.SINGLE) {
      return new ydn.db.tr.Parallel(this, this.ptx_no++, request_type,
          opt_store_names, opt_mode, opt_max_tx);
    } else if (request_type == ydn.db.tr.Thread.Policy.ATOMIC) {
      return new ydn.db.tr.AtomicParallel(this, this.ptx_no++);
    } else {
      throw new ydn.debug.error.ArgumentException('Invalid requestType "' +
          request_type + '"');
    }
  }
};


/**
 * Run a new transaction.
 * @param {function(!ydn.db.tr.DbOperator)} trFn function that invoke in the
 * transaction.
 * @param {Array.<string>=} opt_store_names list of store name involved in the
 * transaction. Default to all store names.
 * @param {ydn.db.base.StandardTransactionMode=} opt_mode mode, default to
 * 'readonly'.
 * @return {!ydn.db.Request}
 * @final
 */
ydn.db.tr.Storage.prototype.run = function(trFn, opt_store_names, opt_mode) {

  if (goog.DEBUG && arguments.length > 3) {
    throw new ydn.debug.error.ArgumentException('too many input arguments, ' +
        'run accept not more than 3 input arguments, but ' +
        arguments.length + ' found.');
  }
  this.ptx_no++;

  var store_names = opt_store_names || this.schema.getStoreNames();

  // NOTE: ydn.db.base.TransactionMode can be number (as in old definition).
  var mode = ydn.db.base.TransactionMode.READ_ONLY;
  if (opt_mode) {
    if (opt_mode == ydn.db.base.StandardTransactionMode.READ_WRITE) {
      mode = ydn.db.base.TransactionMode.READ_WRITE;
    } else if (opt_mode != ydn.db.base.StandardTransactionMode.READ_ONLY) {
      throw new ydn.debug.error.ArgumentException('Invalid transaction mode "' +
          opt_mode + '"');
    }
  }

  var tx_thread = this.newTxQueue(ydn.db.tr.Thread.Policy.ALL, false,
      store_names, mode, 1);
  var db_operator = this.newOperator(tx_thread, this.sync_thread);
  var req = new ydn.db.Request(ydn.db.Request.Method.RUN);
  /**
   * @param {ydn.db.base.TxEventTypes} type
   * @param {*} e
   */
  var onComplete = function(type, e) {
    req.removeTx();
    var success = type === ydn.db.base.TxEventTypes.COMPLETE;
    req.setDbValue(tx_thread.getTxNo(), !success);
  };

  var me = this;
  tx_thread.processTx(function(tx) {
    goog.log.finest(me.logger,  'executing run in transaction on ' + tx_thread);
    req.setTx(tx, tx_thread.getLabel() + 'R0'); // Request 0
    trFn(db_operator);
  }, store_names, mode, onComplete);

  return req;
};


/**
 * Current transaction count. Useful for debugging or performance analysis
 * purpose only.
 * @return {number} transaction number.
 */
ydn.db.tr.Storage.prototype.getTxNo = function() {
  return this.db_operator ? this.db_operator.getTxNo() : NaN;
};
