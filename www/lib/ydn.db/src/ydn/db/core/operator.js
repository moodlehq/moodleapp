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
* @fileoverview Database operator providing index and table scan query.
*
* @author kyawtun@yathit.com (Kyaw Tun)
*/

goog.provide('ydn.db.core.DbOperator');
goog.require('ydn.db.Iterator');
goog.require('ydn.db.algo.AbstractSolver');
goog.require('ydn.db.core.IOperator');
goog.require('ydn.db.core.req.IRequestExecutor');
goog.require('ydn.db.crud.DbOperator');
goog.require('ydn.debug.error.ArgumentException');



/**
 * Construct storage to execute CRUD database operations.
 *
 * Execution database operation is atomic, if a new transaction require,
 * otherwise existing transaction is used and the operation become part of
 * the existing transaction. A new transaction is required if the transaction
 * is not active or locked. Active transaction can be locked by using
 * mutex.
 *
 * @param {!ydn.db.crud.Storage} storage base storage object.
 * @param {!ydn.db.schema.Database} schema schema.
 * @param {ydn.db.tr.Thread} thread execution thread.
 * @param {ydn.db.tr.Thread} sync_thread synchronization thread.
 * @implements {ydn.db.core.IOperator}
 * @constructor
 * @extends {ydn.db.crud.DbOperator}
 * @struct
*/
ydn.db.core.DbOperator = function(storage, schema, thread,
                                  sync_thread) {
  goog.base(this, storage, schema, thread, sync_thread);
};
goog.inherits(ydn.db.core.DbOperator, ydn.db.crud.DbOperator);


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.DbOperator.prototype.logger =
    goog.log.getLogger('ydn.db.core.DbOperator');


/**
 * @define {boolean} debug flag.
 */
ydn.db.core.DbOperator.DEBUG = false;


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.get = function(arg1, arg2) {

  var me = this;
  if (arg1 instanceof ydn.db.Iterator) {
    /**
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;
    var q_store_name = q.getStoreName();
    var store = this.schema.getStore(q_store_name);
    if (!store) {
      throw new ydn.debug.error.ArgumentException('store "' +
          q_store_name + '" not found.');
    }
    var index_name = q.getIndexName();
    if (goog.isDef(index_name) && !store.hasIndex(index_name)) {
      throw new ydn.debug.error.ArgumentException('index "' +
          index_name + '" not found in store "' + q_store_name + '".');
    }
    goog.log.finer(this.logger, 'getByIterator:' + q);
    var df = this.tx_thread.request(ydn.db.Request.Method.GET_ITER,
        [q_store_name]);
    df.addTxback(function() {
      this.iterate(ydn.db.base.QueryMethod.GET, df, q, 1);
    }, this);
    return df;
  } else {
    return goog.base(this, 'get', arg1, arg2);
  }

};


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.keys = function(arg1, arg2, arg3, arg4, arg5,
                                                 arg6, arg7) {

  var me = this;
  if (arg1 instanceof ydn.db.Iterator) {

    /**
     * @type {number}
     */
    var limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
    if (goog.isNumber(arg2)) {
      limit = /** @type {number} */ (arg2);
      if (limit < 1) {
        throw new ydn.debug.error.ArgumentException('limit must be ' +
            'a positive value, but ' + arg2);
      }
    } else if (goog.isDef(arg2)) {
      throw new ydn.debug.error.ArgumentException('limit must be a number, ' +
          ' but ' + arg2);
    }
    if (goog.isDef(arg3)) {
      throw new ydn.debug.error.ArgumentException(
          'offset must not be specified');
    }

    /**
     *
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;

    goog.log.finer(this.logger, 'keysByIterator:' + q);
    var df = this.tx_thread.request(ydn.db.Request.Method.KEYS_ITER,
        [q.getStoreName()]);
    df.addTxback(function() {
      if (q.isIndexIterator()) {
        this.iterate(ydn.db.base.QueryMethod.LIST_KEY, df, q, limit);
      } else {
        this.iterate(ydn.db.base.QueryMethod.LIST_PRIMARY_KEY, df, q, limit);
      }
    }, this);

    return df;
  } else {
    return goog.base(this, 'keys', arg1, arg2, arg3, arg4, arg5, arg6, arg7);
  }

};


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.count = function(arg1, arg2, arg3, arg4) {

  var me = this;
  if (arg1 instanceof ydn.db.Iterator) {
    if (goog.isDef(arg2) || goog.isDef(arg3)) {
      throw new ydn.debug.error.ArgumentException('too many arguments.');
    }

    /**
     *
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;
    goog.log.finer(this.logger, 'countIterator:' + q);
    var df = this.tx_thread.request(ydn.db.Request.Method.COUNT,
        [q.getStoreName()]);
    df.addTxback(function() {
      this.iterate(ydn.db.base.QueryMethod.COUNT, df, q);
    }, this);

    return df;
  } else {
    return goog.base(this, 'count', arg1, arg2, arg3, arg4);
  }

};


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.values = function(arg1, arg2, arg3, arg4,
                                                   arg5, arg6) {

  var me = this;
  if (arg1 instanceof ydn.db.Iterator) {

    /**
     * @type {number}
     */
    var limit;
    if (goog.isNumber(arg2)) {
      limit = /** @type {number} */ (arg2);
      if (limit < 1) {
        throw new ydn.debug.error.ArgumentException('limit must be ' +
            'a positive value, but ' + limit);
      }
    } else if (goog.isDef(arg2)) {
      throw new ydn.debug.error.ArgumentException('limit must be a number, ' +
          'but ' + arg2);
    }
    if (goog.isDef(arg3)) {
      throw new ydn.debug.error.ArgumentException(
          'offset must not be specified');
    }

    /**
     *
     * @type {!ydn.db.Iterator}
     */
    var q = arg1;
    goog.log.finer(this.logger, 'listByIterator:' + q);
    var df = this.tx_thread.request(ydn.db.Request.Method.VALUES_ITER,
        [q.getStoreName()]);
    df.addTxback(function() {
      if (q.isKeyIterator()) {
        this.iterate(ydn.db.base.QueryMethod.LIST_PRIMARY_KEY, df, q, limit);
      } else {
        this.iterate(ydn.db.base.QueryMethod.LIST_VALUE, df, q, limit);
      }
    }, this);

    return df;
  } else {
    return goog.base(this, 'values', arg1, arg2, arg3, arg4, arg5, arg6);
  }

};


/**
 * Cursor scan iteration.
 * @param {!ydn.db.algo.AbstractSolver|function(!Array, !Array): (Array|undefined)} solver
 * solver.
 * @param {!Array.<!ydn.db.Iterator>} iterators the cursor.
 *  @param {ydn.db.base.TransactionMode=} opt_mode mode. Expose for friendly
 *  use. Scanning is always READ_ONLY mode, but query class may need to open
 *  transaction in READ_WRITE mode.
 * @return {!ydn.db.Request} promise on completed.
 */
ydn.db.core.DbOperator.prototype.scan = function(solver, iterators,
                                                 opt_mode) {

  if (goog.DEBUG) {
    if (!goog.isArray(iterators)) {
      throw new ydn.debug.error.ArgumentException('iterators argument must' +
          ' be an array, but ' + iterators + ' of type ' + typeof iterators +
          ' found');
    }
    for (var i = 0; i < iterators.length; i++) {
      var is_iter = iterators[i] instanceof ydn.db.Iterator;
      if (!is_iter) {
        throw new ydn.debug.error.ArgumentException('Iterator at ' + i +
            ' must be cursor range iterator.');
      }
    }
  }

  var tr_mode = opt_mode || ydn.db.base.TransactionMode.READ_ONLY;

  var scopes = [];
  for (var i = 0; i < iterators.length; i++) {
    var stores = iterators[i].stores();
    for (var j = 0; j < stores.length; j++) {
      if (!goog.array.contains(scopes, stores[j])) {
        scopes.push(stores[j]);
      }
    }
  }

  goog.log.finer(this.logger, this + ': scan for ' + iterators.length +
      ' iterators on ' + scopes);

  var me = this;
  var df = this.tx_thread.request(ydn.db.Request.Method.SCAN, scopes);

  this.tx_thread.exec(df, function(tx, tx_no, cb) {

    var lbl = tx_no + ' ' + me + ' scanning';
    goog.log.finest(me.logger,  lbl);
    var done = false;

    var total;
    var idx2iterator = []; // convert main index to iterator index

    var keys = [];
    var values = [];
    /**
     *
     * @type {Array.<!ydn.db.core.req.ICursor>}
     */
    var cursors = [];

    var do_exit = function() {

      for (var k = 0; k < cursors.length; k++) {
        cursors[k].exit();
      }
      done = true;
      goog.array.clear(cursors);
      // console.log('existing');
      goog.log.finer(me.logger, 'success ' + lbl);
      cb(undefined);
    };

    var result_count = 0;
    var streamer_result_count = 0;
    var has_key_count = 0;

    /**
     * All results collected. Now invoke solver and do advancement.
     */
    var on_result_ready = function() {

      // all cursor has results, than sent to join algorithm callback.

      var out;
      if (solver instanceof ydn.db.algo.AbstractSolver) {
        out = solver.solver(keys, values);
      } else {
        out = solver(keys, values);
      }
      if (ydn.db.core.DbOperator.DEBUG) {
        goog.global.console.log(me + ' received result from solver ' +
            out + ' for keys ' + ydn.json.stringify(keys));
      }
      var next_primary_keys = [];
      var next_effective_keys = [];
      var advance = [];
      var restart = [];
      if (goog.isArray(out)) {
        // adv vector is given
        for (var i = 0; i < out.length; i++) {
          if (out[i] === true) {
            advance[i] = 1;
          } else if (out[i] === false) {
            restart[i] = true;
          } else {
            next_effective_keys[i] = out[i];
          }
        }
      } else if (goog.isNull(out)) {
        // all stop
        next_primary_keys = [];
      } else if (!goog.isDef(out)) {
        // all continue;
        next_primary_keys = [];
        for (var i = 0; i < iterators.length; i++) {
          if (goog.isDef(idx2iterator[i])) {
            advance[i] = 1;
          }
        }
      } else if (goog.isObject(out)) {
        if (goog.DEBUG) {
          var valid_att = ['advance', 'continue', 'continuePrimary', 'restart'];
          for (var key in out) {
            if (!goog.array.contains(valid_att, key)) {
              throw new ydn.debug.error.InvalidOperationException(
                  'Unknown attribute "' + key +
                  '" in cursor advancement object');
            }
          }
        }
        next_primary_keys = out['continuePrimary'] || [];
        next_effective_keys = out['continue'] || [];
        advance = out['advance'] || [];
        restart = out['restart'] || [];
      } else {
        throw new ydn.debug.error.InvalidOperationException(
            'scan callback output');
      }
      var move_count = 0;
      result_count = 0;
      for (var i = 0; i < iterators.length; i++) {
        if (goog.isDefAndNotNull(next_primary_keys[i]) ||
            goog.isDef(next_effective_keys[i]) ||
            goog.isDefAndNotNull(restart[i]) ||
            goog.isDefAndNotNull(advance[i])) {
          // by marking non moving iterator first, both async and sync callback
          // work.
        } else {
          // take non advancing iterator as already moved.
          result_count++;
        }
      }
      for (var i = 0; i < iterators.length; i++) {
        if (goog.isDefAndNotNull(next_primary_keys[i]) ||
            goog.isDef(next_effective_keys[i]) ||
            goog.isDefAndNotNull(restart[i]) ||
            goog.isDefAndNotNull(advance[i])) {
          var idx = idx2iterator[i];
          if (!goog.isDef(idx)) {
            throw new ydn.error.InvalidOperationException(i +
                ' is not an iterator.');
          }
          var iterator = iterators[idx];
          var cursor = cursors[i];
          if (goog.DEBUG && !goog.isDefAndNotNull(keys[i])) {
            var at = i + '/' + iterators.length;
            if (goog.isDefAndNotNull(advance[i])) {
              throw new ydn.error.InvalidOperationError(cursor + ' ' + at +
                  ' must not advance ' + advance[i] + ' steps');
            } else if (goog.isDef(next_effective_keys[i])) {
              throw new ydn.error.InvalidOperationError(cursor + ' ' + at +
                  ' must not continue to key ' + next_effective_keys[i]);
            } else if (goog.isDefAndNotNull(next_primary_keys[i])) {
              throw new ydn.error.InvalidOperationError(cursor + ' ' + at +
                  ' must not continue to primary key ' + next_primary_keys[i]);
            }
          }

          keys[i] = undefined;
          values[i] = undefined;

          if (goog.isDefAndNotNull(restart[i])) {
            if (ydn.db.core.DbOperator.DEBUG) {
              goog.global.console.log('cursor ' + cursor + ' of iterator ' +
                  iterator + ': restarting.');
            }
            goog.asserts.assert(restart[i] === true, i +
                ' restart must be true');
            cursor.restart();
          } else if (goog.isDef(next_effective_keys[i])) {
            if (ydn.db.core.DbOperator.DEBUG) {
              goog.global.console.log(iterator + ': continuing to ' +
                  next_effective_keys[i]);
            }
            cursor.continueEffectiveKey(next_effective_keys[i]);
          } else if (goog.isDefAndNotNull(next_primary_keys[i])) {
            if (ydn.db.core.DbOperator.DEBUG) {
              goog.global.console.log(cursor + ': continuing to primary key ' +
                  next_primary_keys[i]);
            }
            cursor.continuePrimaryKey(next_primary_keys[i]);
          } else if (goog.isDefAndNotNull(advance[i])) {
            if (ydn.db.core.DbOperator.DEBUG) {
              goog.global.console.log(iterator + ': advancing ' + advance[i] +
                  ' steps.');
            }
            goog.asserts.assert(advance[i] === 1, i +
                ' advance value must be 1');

            cursor.advance(1);
          } else {
            throw new ydn.error.InternalError(iterator + ': has no action');
          }
          move_count++;
        }
      }
      // console.log(['on_result_ready', move_count, keys, adv]);
      if (move_count == 0) {
        do_exit();
      }

    };

    /**
     * Received iterator result. When all iterators result are collected,
     * begin to send request to collect streamers results.
     * @param {number} i index.
     * @param {IDBKey=} opt_key effective key.
     */
    var on_iterator_next = function(i, opt_key) {
      if (done) {
        if (ydn.db.core.DbOperator.DEBUG) {
          goog.global.console.log('iterator ' + i + ' done');
        }
        // calling next to a terminated iterator
        throw new ydn.error.InternalError();
      }
      result_count++;
      var is_result_ready = result_count === total;
      var idx = idx2iterator[i];
      /**
       * @type {!ydn.db.Iterator}
       */
      var iterator = iterators[idx];
      /**
       * @type {!ydn.db.core.req.ICursor}
       */
      var cursor = cursors[idx];
      var primary_key = cursor.getPrimaryKey();
      var value = cursor.getValue();
      if (ydn.db.core.DbOperator.DEBUG) {
        var key_str = opt_key +
            (goog.isDefAndNotNull(primary_key) ? ', ' + primary_key : '');
        var ready_str = is_result_ready ? ' (all result done)' : '';
        goog.global.console.log(cursor + ' new position ' + key_str + ready_str);
      }

      keys[i] = opt_key;
      if (iterator.isIndexIterator()) {
        if (iterator.isKeyIterator()) {
          values[i] = primary_key;
        } else {
          values[i] = value;
        }
      } else {
        if (iterator.isKeyIterator()) {
          values[i] = opt_key;
        } else {
          values[i] = value;
        }
      }

      if (is_result_ready) { // receive all results
        on_result_ready();
      }

    };

    var on_error = function(e) {
      for (var k = 0; k < cursors.length; k++) {
        cursors[k].exit();
      }
      goog.array.clear(cursors);
      goog.log.finer(me.logger, lbl + ' error');
      cb(e, true);
    };

    var open_iterators = function() {
      var idx = 0;
      for (var i = 0; i < iterators.length; i++) {
        /**
         * @type {!ydn.db.Iterator}
         */
        var iterator = iterators[i];
        var crs = [me.getIndexExecutor().getCursor(tx, tx_no,
            iterator.getStoreName())];
        var cursor = iterator.load(crs);
        cursor.onFail = on_error;
        cursor.onNext = goog.partial(on_iterator_next, idx);
        cursors[i] = cursor;
        idx2iterator[idx] = i;
        idx++;
      }

      total = iterators.length;
    };

    if (solver instanceof ydn.db.algo.AbstractSolver) {
      var wait = solver.begin(tx, iterators, function() {
        open_iterators();
      });
      if (!wait) {
        open_iterators();
      }
    } else {
      open_iterators();
    }

  }, scopes, tr_mode);

  return df;
};


/**
 * @return {ydn.db.core.req.IRequestExecutor} executor.
 */
ydn.db.core.DbOperator.prototype.getIndexExecutor = function() {
  return /** @type {ydn.db.core.req.IRequestExecutor} */ (this.getExecutor());
};


/**
 *
 * @param {function(this: T, !ydn.db.core.req.ICursor)} callback icursor
 * handler.
 * @param {!ydn.db.core.AbstractIterator} iter the cursor.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode.
 * @param {T=} opt_scope optional callback scope.
 * @return {!ydn.db.Request} promise on completed.
 * @template T
 */
ydn.db.core.DbOperator.prototype.open = function(callback, iter, opt_mode,
                                                 opt_scope) {
  if (goog.DEBUG) {
    if (!(iter instanceof ydn.db.Iterator)) {
      throw new ydn.debug.error.ArgumentException(
          'Second argument must be cursor range iterator.');
    }
    var store_names = iter.stores();
    for (var i = 0; i < store_names.length; i++) {
      var store = this.schema.getStore(store_names[i]);
      if (!store) {
        throw new ydn.debug.error.ArgumentException('Store "' +
            store_names[i] + '" not found.');
      }
    }
  }

  var tr_mode = opt_mode || ydn.db.base.TransactionMode.READ_ONLY;

  var me = this;
  var df = this.tx_thread.request(ydn.db.Request.Method.OPEN, iter.stores(),
      tr_mode);
  goog.log.finer(this.logger, 'open:' + tr_mode + ' ' + iter);
  df.addTxback(function(tx) {
    var tx_no = df.getLabel();
    var lbl = tx_no + ' iterating ' + iter;
    goog.log.finer(me.logger, lbl);

    var names = iter.stores();
    var crs = [];
    for (var ni = 0; ni < names.length; ni++) {
      crs[ni] = me.getIndexExecutor().getCursor(tx, tx_no, names[ni]);
    }
    var cursor = iter.load(crs);

    cursor.onFail = function(e) {
      df.setDbValue(e, true);
    };
    /**
     * callback.
     * @param {IDBKey=} opt_key effective key.
     */
    cursor.onNext = function(opt_key) {
      if (goog.isDefAndNotNull(opt_key)) {
        var adv = callback.call(opt_scope, cursor);
        if (adv === true) {
          cursor.restart();
        } else if (goog.isObject(adv)) {
          if (adv['restart'] === true) {
            cursor.restart(adv['continue'], adv['continuePrimary']);
          } else if (goog.isDefAndNotNull(adv['continue'])) {
            cursor.continueEffectiveKey(adv['continue']);
          } else if (goog.isDefAndNotNull(adv['continuePrimary'])) {
            cursor.continuePrimaryKey(adv['continuePrimary']);
          } else {
            cursor.exit();
            df.setDbValue(undefined); // break the loop
          }
        } else if (goog.isNull(adv)) {
          cursor.exit();
          df.setDbValue(undefined);
        } else if (goog.isDefAndNotNull(adv)) {
          cursor.continueEffectiveKey(adv);
        } else {
          cursor.advance(1);
        }
      } else {
        cursor.exit();
        df.setDbValue(undefined);
      }
    };

  }, this);

  return df;

};


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.map = function(iterator, callback) {

  var me = this;
  var stores = iterator.stores();
  for (var store, i = 0; store = stores[i]; i++) {
    if (!store) {
      throw new ydn.debug.error.ArgumentException('Store "' + store +
          '" not found.');
    }
  }
  var df = this.tx_thread.request(ydn.db.Request.Method.MAP, stores);
  goog.log.finest(this.logger, 'map:' + iterator);
  this.tx_thread.exec(df, function(tx, tx_no, cb) {

    var lbl = tx_no + ' iterating ' + iterator;
    goog.log.finest(me.logger,  lbl);

    var names = iterator.stores();
    var crs = [];
    for (var ni = 0; ni < names.length; ni++) {
      crs[ni] = me.getIndexExecutor().getCursor(tx, tx_no, names[ni]);
    }
    var cursor = iterator.load(crs);

    cursor.onFail = function(e) {
      cb(e, false);
    };
    /**
     *
     * @param {IDBKey=} opt_key effective key.
     */
    cursor.onNext = function(opt_key) {
      if (goog.isDefAndNotNull(opt_key)) {
        var key = opt_key;
        var ref;
        if (iterator.isIndexIterator()) {
          if (iterator.isKeyIterator()) {
            ref = key;
          } else {
            ref = cursor.getPrimaryKey();
          }
        } else {
          if (iterator.isKeyIterator()) {
            ref = key;
          } else {
            ref = cursor.getValue();
          }
        }
        callback(ref);
        //console.log(['onNext', key, primaryKey, value, ref, adv]);
        cursor.advance(1);

      } else {
        cb(undefined);
        callback = null;
      }
    };

  }, stores, ydn.db.base.TransactionMode.READ_ONLY);

  return df;
};


/**
 * @inheritDoc
 */
ydn.db.core.DbOperator.prototype.reduce = function(iterator, callback,
                                                   opt_initial) {

  var me = this;
  var stores = iterator.stores();
  for (var store, i = 0; store = stores[i]; i++) {
    if (!store) {
      throw new ydn.debug.error.ArgumentException('Store "' + store +
          '" not found.');
    }
  }
  var df = this.tx_thread.request(ydn.db.Request.Method.REDUCE, stores);

  var previous = goog.isObject(opt_initial) ?
      ydn.object.clone(opt_initial) : opt_initial;
  goog.log.finer(this.logger, 'reduce:' + iterator);
  this.tx_thread.exec(df, function(tx, tx_no, cb) {


    var names = iterator.stores();
    var crs = [];
    for (var ni = 0; ni < names.length; ni++) {
      crs[ni] = me.getIndexExecutor().getCursor(tx, tx_no, names[ni]);
    }
    var cursor = iterator.load(crs);

    /**
     *
     * @param {!Error} e error.
     */
    cursor.onFail = function(e) {
      cb(e, true);
    };
    var index = 0;
    /**
     *
     * @param {IDBKey=} opt_key effective key.
     */
    cursor.onNext = function(opt_key) {
      if (goog.isDefAndNotNull(opt_key)) {
        var current_value;
        if (iterator.isIndexIterator()) {
          if (iterator.isKeyIterator()) {
            current_value = opt_key;
          } else {
            current_value = cursor.getPrimaryKey();
          }
        } else {
          if (iterator.isKeyIterator()) {
            current_value = opt_key;
          } else {
            current_value = cursor.getValue();
          }
        }

        //console.log([previous, current_value, index]);
        previous = callback(previous, current_value, index++);
        cursor.advance(1);
      } else {
        cb(previous);
      }
    };

  }, stores, ydn.db.base.TransactionMode.READ_ONLY);

  return df;
};


/**
 * List record in a store.
 * @param {ydn.db.base.QueryMethod} mth keys method.
 * @param {!ydn.db.Iterator} iter iterator.
 * @param {number=} opt_limit limit.
 * @param {number=} opt_offset limit.
 * @return {!ydn.db.Request} request.
 */
ydn.db.core.DbOperator.prototype.listIter = function(mth, iter,
                                                     opt_limit, opt_offset) {
  var offset = opt_offset || 0;
  var store_name = iter.getStoreName();
  var index_name = iter.getIndexName() || null;
  var limit = opt_limit || ydn.db.base.DEFAULT_RESULT_LIMIT;
  goog.log.finer(this.logger, 'listIter:' + mth + ' ' + iter +
      (opt_limit ? ' limit=' + limit : '') +
      (opt_offset ? ' offset=' + offset : ''));
  var method = ydn.db.Request.Method.VALUES_INDEX;
  var req = this.tx_thread.request(method, [store_name]);
  // store.hook(req, arguments);
  var cursor_position =
      (iter.getState() == ydn.db.Iterator.State.COMPLETED ||
          iter.getState() == ydn.db.Iterator.State.INITIAL) ?
      [] : [iter.getKey(), iter.getPrimaryKey()];
  req.addTxback(function() {
    var e_key = iter.getKey();
    this.getCrudExecutor().list(req, mth, store_name,
        index_name, iter.getKeyRange(), limit,
        offset, iter.isReversed(), iter.isUnique(), cursor_position);
  }, this);
  req.addCallback(function() {
    if (goog.isDefAndNotNull(cursor_position[0])) {
      iter.reset(ydn.db.Iterator.State.RESTING,
          cursor_position[0], cursor_position[1]);
    } else {
      iter.reset();
    }
  });
  return req;
};


/**
 * List record in a store.
 * @param {ydn.db.base.QueryMethod} mth keys method.
 * @param {ydn.db.Request} rq request.
 * @param {!ydn.db.core.AbstractIterator} iter iterator.
 * @param {number=} opt_limit limit.
 * @param {number=} opt_offset limit.
 * @protected
 */
ydn.db.core.DbOperator.prototype.iterate = function(mth, rq, iter,
                                                    opt_limit, opt_offset) {
  var arr = [];

  var tx = rq.getTx();
  var tx_no = rq.getLabel();
  var msg = tx_no + ' ' + mth + 'ByIterator ' + iter;
  if (opt_limit > 0) {
    msg += ' limit ' + opt_limit;
  }
  var me = this;
  goog.log.finer(this.logger, msg);
  var executor = this.getIndexExecutor();
  var cursors = [];
  var store_names = iter.stores();
  for (var i = 0; i < store_names.length; i++) {
    cursors[i] = executor.getCursor(tx, tx_no, store_names[i]);
  }
  var cursor = iter.load(cursors);
  cursor.onFail = function(e) {
    cursor.exit();
    rq.setDbValue(e, true);
  };
  var count = 0;
  var cued = false;
  var displayed = false;
  /**
   * @param {IDBKey=} opt_key
   */
  cursor.onNext = function(opt_key) {
    if (!displayed) {
      goog.log.finest(me.logger,  msg + ' starting');
      displayed = true;
    }
    if (goog.isDefAndNotNull(opt_key)) {
      var primary_key = cursor.getPrimaryKey();
      if (!cued && opt_offset > 0) {
        cursor.advance(opt_offset);
        cued = true;
        return;
      }
      count++;
      if (mth == ydn.db.base.QueryMethod.LIST_KEY) {
        arr.push(opt_key);
      } else if (mth == ydn.db.base.QueryMethod.LIST_PRIMARY_KEY) {
        arr.push(cursor.getPrimaryKey());
      } else if (mth == ydn.db.base.QueryMethod.LIST_KEYS) {
        arr.push([opt_key, cursor.getPrimaryKey()]);
      } else if (mth == ydn.db.base.QueryMethod.COUNT) {
        // no result needed.
      } else {
        // LIST_VALUE
        arr.push(cursor.getValue());
      }
      // console.log(count, cursor);
      if (mth == ydn.db.base.QueryMethod.GET) {
        cursor.exit();
        rq.setDbValue(arr[0]);
      } else if (mth == ydn.db.base.QueryMethod.COUNT ||
          !goog.isDef(opt_limit) || count < opt_limit) {
        cursor.continueEffectiveKey();
      } else {
        goog.log.finer(me.logger, 'success:' + msg + ' yields ' + arr.length +
            ' records');
        cursor.exit();
        rq.setDbValue(arr);
      }
    } else {
      goog.log.finer(me.logger, 'success:' + msg + ' yields ' + arr.length + ' records');
      cursor.exit();
      var result =
          mth == ydn.db.base.QueryMethod.GET ? arr[0] :
              mth == ydn.db.base.QueryMethod.COUNT ? count : arr;
      rq.setDbValue(result);
    }
  };
};



