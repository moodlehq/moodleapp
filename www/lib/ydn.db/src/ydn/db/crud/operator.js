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
* @fileoverview Provide atomic CRUD database operations on a transaction queue.
*
* @author kyawtun@yathit.com (Kyaw Tun)
*/


goog.provide('ydn.db.crud.DbOperator');
goog.require('goog.log');
goog.require('goog.userAgent');
goog.require('ydn.db');
goog.require('ydn.db.Key');
goog.require('ydn.db.Request');
goog.require('ydn.db.crud.IOperator');
goog.require('ydn.db.tr.AtomicSerial');
goog.require('ydn.db.tr.DbOperator');
goog.require('ydn.db.tr.Thread');
goog.require('ydn.debug.error.ArgumentException');
goog.require('ydn.debug.error.NotSupportedException');



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
 * @param {ydn.db.tr.Thread} tx_thread
 * @param {ydn.db.tr.Thread} sync_thread
 * @implements {ydn.db.crud.IOperator}
 * @constructor
 * @extends {ydn.db.tr.DbOperator}
 * @struct
*/
ydn.db.crud.DbOperator = function(storage, schema, tx_thread, sync_thread) {
  goog.base(this, storage, schema, tx_thread, sync_thread);
};
goog.inherits(ydn.db.crud.DbOperator, ydn.db.tr.DbOperator);


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.crud.DbOperator.prototype.logger =
    goog.log.getLogger('ydn.db.crud.DbOperator');


/**
 * @return {ydn.db.crud.req.IRequestExecutor} executor.
 */
ydn.db.crud.DbOperator.prototype.getCrudExecutor = function() {
  return /** @type {ydn.db.crud.req.IRequestExecutor} */ (this.getExecutor());
};


/**
 *
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.count = function(store_name, index_or_keyrange,
                                                 index_key_range, unique) {
  var req;
  var me = this;

  /**
   * @type {!Array.<string>}
   */
  var store_names;

  /**
   * @type {string}
   */
  var index_name;
  /**
   * @type {IDBKeyRange}
   */
  var key_range;

  if (!goog.isDefAndNotNull(store_name)) {
    goog.log.warning(this.logger, 'count method requires store name(s)');
    var stores = this.schema.getStoreNames();
    req = this.tx_thread.request(ydn.db.Request.Method.COUNT, stores);
    req.await(function(cnt, is_error, cb) {
      if (is_error) {
        cb(cnt, true);
        return;
      }
      var total = 0;
      for (var i = 0; i < cnt.length; i++) {
        total += cnt[i];
      }
      cb(total, false);
    }, this);
    req.addTxback(function() {
      //console.log('counting');
      this.getCrudExecutor().countStores(req, store_names);
    }, this);
  } else if (goog.isArray(store_name)) {

    if (goog.isDef(index_key_range) || goog.isDef(index_or_keyrange)) {
      throw new ydn.debug.error.ArgumentException('too many arguments.');
    }

    store_names = store_name;
    for (var i = 0; i < store_names.length; i++) {
      if (!this.schema.hasStore(store_names[i])) {
        throw new ydn.debug.error.ArgumentException('store name "' +
            store_names[i] + '" at ' + i + ' not found.');
      }
    }

    //console.log('waiting to count');
    goog.log.finer(this.logger, 'countStores: ' + ydn.json.stringify(store_names));
    req = this.tx_thread.request(ydn.db.Request.Method.COUNT, store_names);

    req.addTxback(function() {
      //console.log('counting');
      this.getCrudExecutor().countStores(req, store_names);
    }, this);
  } else if (goog.isString(store_name)) {
    var store = this.schema.getStore(store_name);
    if (!store) {
      throw new ydn.debug.error.ArgumentException('store name "' + store_name +
          '" not found.');
    }
    if (goog.DEBUG && goog.isDef(unique) && !goog.isBoolean(unique)) {
      throw new ydn.debug.error.ArgumentException('unique value "' + unique +
          '" must be boolean, but found ' + typeof unique + '.');
    }
    store_names = [store_name];

    if (goog.isString(index_or_keyrange)) {
      // index key range count.
      index_name = index_or_keyrange;

      if (goog.isObject(index_key_range)) {
        if (goog.DEBUG) {
          var msg1 = ydn.db.KeyRange.validate(index_key_range);
          if (msg1) {
            throw new ydn.debug.error.ArgumentException('invalid key range: ' +
                ydn.json.toShortString(index_key_range) + ' ' + msg1);
          }
        }
        key_range = ydn.db.KeyRange.parseIDBKeyRange(index_key_range);
      } else {
        if (goog.DEBUG && goog.isDefAndNotNull(index_key_range)) {
          throw new ydn.debug.error.ArgumentException('invalid key range: ' +
              ydn.json.toShortString(index_key_range) +
              ' of type ' + typeof index_key_range);
        }
        key_range = null;
      }
    } else if (goog.isObject(index_or_keyrange) ||
        !goog.isDefAndNotNull(index_or_keyrange)) {

      if (goog.isObject(index_or_keyrange)) {
        if (goog.DEBUG) {
          var msg = ydn.db.KeyRange.validate(index_or_keyrange);
          if (msg) {
            throw new ydn.debug.error.ArgumentException('invalid key range: ' +
                ydn.json.toShortString(index_or_keyrange) + ' ' + msg);
          }
        }
        key_range = ydn.db.KeyRange.parseIDBKeyRange(index_or_keyrange);
      } else {
        if (goog.isDefAndNotNull(index_or_keyrange)) {
          throw new ydn.debug.error.ArgumentException('key range must be ' +
              ' an object but found ' +
              ydn.json.toShortString(index_or_keyrange) + ' of type ' +
              typeof index_or_keyrange);
        }
        key_range = null;
      }
    } else {
      throw new ydn.debug.error.ArgumentException('invalid second argument ' +
          'for count "' + ydn.json.toShortString(index_key_range) +
          '" of type ' + typeof index_or_keyrange);
    }

    goog.log.finer(this.logger, 'countKeyRange: ' + store_name + ' ' +
        (index_name ? index_name : '') + ydn.json.stringify(key_range));
    req = this.tx_thread.request(ydn.db.Request.Method.COUNT, store_names);
    store.hook(req, arguments);
    req.addTxback(function(tx) {
      this.getCrudExecutor().countKeyRange(req, store_names[0], key_range,
          index_name, !!unique);
    }, this);

  } else {
    throw new ydn.debug.error.ArgumentException(
        'Invalid store name or store names.');
  }

  return req;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.get = function(arg1, arg2) {

  var me = this;
  var req;

  if (arg1 instanceof ydn.db.Key) {
    /**
     * @type {ydn.db.Key}
     */
    var k = arg1;
    var k_store_name = k.getStoreName();
    var store = this.schema.getStore(k_store_name);
    if (!store) {
      if (this.schema.isAutoSchema()) {
        if (this.getStorage().isReady()) {
          return ydn.db.Request.succeed(ydn.db.Request.Method.GET, undefined);
        } else {
          req = new ydn.db.Request(ydn.db.Request.Method.GET);
          this.getStorage().onReady(function() {
            me.get(arg1, arg2).addCallbacks(function(x) {
              req.callback(x);
            }, function(e) {
              req.errback(e);
            });
          });
          return req;
        }
      } else {
        throw new ydn.debug.error.ArgumentException('Store: ' +
            k_store_name + ' not found.');
      }
    }

    var kid = k.getId();
    goog.log.finer(this.logger, 'getByKey: ' + k_store_name + ':' + kid);
    req = this.tx_thread.request(ydn.db.Request.Method.GET_BY_KEY,
        [k_store_name]);
    store.hook(req, arguments, undefined, this);
    req.addTxback(function() {
      this.getCrudExecutor().getById(req, k_store_name, kid);
    }, this);
  } else if (goog.isString(arg1) && goog.isDef(arg2)) {
    var store_name = arg1;
    var store = this.schema.getStore(store_name);
    if (!store) {
      if (this.schema.isAutoSchema()) {
        if (this.getStorage().isReady()) {
          return ydn.db.Request.succeed(ydn.db.Request.Method.GET, undefined);
        } else {
          req = new ydn.db.Request(ydn.db.Request.Method.GET);
          this.getStorage().onReady(function() {
            me.get(arg1, arg2).addCallbacks(function(x) {
              req.callback(x);
            }, function(e) {
              req.errback(e);
            });
          });
          return req;
        }
      } else {
        throw new ydn.debug.error.ArgumentException('Store name "' +
            store_name + '" not found.');
      }
    }
    var id = arg2;
    goog.asserts.assert(ydn.db.Key.isValidKey(id), 'key ' + id + ' of type ' +
        (typeof id) + ' is not a valid key');
    goog.log.finer(this.logger, 'getById: ' + store_name + ':' + id);
    req = this.tx_thread.request(ydn.db.Request.Method.GET, [store_name]);
    store.hook(req, arguments, undefined, this);
    req.addTxback(function() {
      this.getCrudExecutor().getById(req, store_name, /** @type {IDBKey} */ (id));
    }, this);

  } else {
    throw new ydn.debug.error.ArgumentException(
        'get require valid input arguments.');
  }

  return req;
};


/**
 *
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.keys = function(opt_store_name, arg1,
                                                 arg2, arg3, arg4, arg5, arg6) {
  var me = this;

  /**
   * @type {number}
   */
  var limit;
  /**
   * @type {number}
   */
  var offset;
  /**
   * @type {ydn.db.IDBKeyRange}
   */
  var range = null;
  /**
   * @type {boolean}
   */
  var reverse = false;
  /**
   * @type {boolean}
   */
  var unique = false;
  /**
   *
   * @type {string}
   */
  var store_name = /** @type {string} */ (opt_store_name);

  var store = this.schema.getStore(store_name);

  if (goog.DEBUG) {
    if (!goog.isString(store_name)) {
      throw new ydn.debug.error.ArgumentException(
          'store name must be a string, ' +
          'but ' + store_name + ' of type ' + typeof store_name + ' is not.');
    }
    if (!this.schema.isAutoSchema()) {
      if (!store) {
        throw new ydn.debug.error.ArgumentException('store name "' +
            store_name + '" not found.');
      }
      if (goog.isString(arg1)) {
        var index = store.getIndex(arg1);
        if (!index) {
          throw new ydn.debug.error.ArgumentException('index "' + arg1 +
              '" not found in store "' + store_name + '".');
        }
      }
    }
  }

  if (this.schema.isAutoSchema() && !store) {
    return ydn.db.Request.succeed(ydn.db.Request.Method.KEYS, []);
  }

  var req;

  if (goog.isString(arg1)) { // index key range
    var index_name = arg1;
    if (goog.DEBUG) {
      var msg = ydn.db.KeyRange.validate(/** @type {KeyRangeJson} */ (arg2));
      if (msg) {
        throw new ydn.debug.error.ArgumentException('invalid key range: ' +
            arg2 + ' ' + msg);
      }
    }
    range = ydn.db.KeyRange.parseIDBKeyRange(
        /** @type {KeyRangeJson} */ (arg2));

    if (goog.isNumber(arg3)) {
      limit = arg3;
    } else if (!goog.isDef(arg3)) {
      limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
    } else {
      throw new ydn.debug.error.ArgumentException('limit must be a number');
    }
    if (goog.isNumber(arg4)) {
      offset = arg4;
    } else if (!goog.isDef(arg4)) {
      offset = 0;
    } else {
      throw new ydn.debug.error.ArgumentException('offset must be a number');
    }
    if (goog.isDef(arg5)) {
      if (goog.isBoolean(arg5)) {
        reverse = arg5;
      } else {
        throw new ydn.debug.error.ArgumentException(
            'reverse must be a boolean');
      }
    }
    if (goog.isDef(arg6)) {
      if (goog.isBoolean(arg6)) {
        unique = arg6;
      } else {
        throw new ydn.debug.error.ArgumentException(
            'unique must be a boolean');
      }
    }
    goog.log.finer(this.logger, 'keysByIndexKeyRange: ' + store_name);
    req = this.tx_thread.request(ydn.db.Request.Method.KEYS_INDEX,
        [store_name]);
    store.hook(req, arguments);
    req.addTxback(function() {
      this.getCrudExecutor().list(req, ydn.db.base.QueryMethod.LIST_PRIMARY_KEY,
          store_name, index_name, range, limit, offset, reverse, unique);
    }, this);
  } else {
    if (goog.isObject(arg1)) {
      if (goog.DEBUG) {
        var msg = ydn.db.KeyRange.validate(arg1);
        if (msg) {
          throw new ydn.debug.error.ArgumentException('invalid key range: ' +
              ydn.json.toShortString(arg1) + ' ' + msg);
        }
      }
      range = ydn.db.KeyRange.parseIDBKeyRange(arg1);
    } else {
      if (goog.DEBUG && goog.isDefAndNotNull(arg1)) {
        throw new ydn.debug.error.ArgumentException('invalid key range: ' +
            ydn.json.toShortString(arg1) + ' of type ' + typeof arg1);
      }
      range = null;
    }
    if (goog.isNumber(arg2)) {
      limit = arg2;
    } else if (!goog.isDef(arg2)) {
      limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
    } else {
      throw new ydn.debug.error.ArgumentException('limit must be a number');
    }
    if (goog.isNumber(arg3)) {
      offset = arg3;
    } else if (!goog.isDef(arg3)) {
      offset = 0;
    } else {
      throw new ydn.debug.error.ArgumentException('offset must be a number');
    }
    if (goog.isDef(arg4)) {
      if (goog.isBoolean(arg4)) {
        reverse = arg4;
      } else {
        throw new ydn.debug.error.ArgumentException(
            'reverse must be a boolean');
      }
    }
    goog.log.finer(this.logger, 'keysByKeyRange: ' + store_name);
    req = this.tx_thread.request(ydn.db.Request.Method.KEYS, [store_name]);
    store.hook(req, arguments);
    req.addTxback(function() {
      this.getCrudExecutor().list(req, ydn.db.base.QueryMethod.LIST_PRIMARY_KEY,
          store_name, null, range, limit, offset, reverse, false);
    }, this);
  }

  return req;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.values = function(arg0, arg1, arg2, arg3, arg4,
                                                   arg5, arg6) {

  var me = this;
  var req;
  var method = ydn.db.Request.Method.NONE;

  /**
   * @type {number}
   */
  var limit;
  /**
   * @type {number}
   */
  var offset;
  /**
   * @type {boolean}
   */
  var reverse = false;
  /**
   * @type {boolean}
   */
  var unique = false;

  if (goog.isString(arg0)) {
    var store_name = arg0;
    var store = this.schema.getStore(store_name);
    if (!store) {
      if (this.schema.isAutoSchema()) {
        if (this.getStorage().isReady()) {
          return ydn.db.Request.succeed(ydn.db.Request.Method.VALUES, []);
        } else {
          req = new ydn.db.Request(ydn.db.Request.Method.VALUES);
          this.getStorage().onReady(function() {
            me.values(arg0, arg1, arg2, arg3, arg4,
                    arg5).addCallbacks(function(x) {
              req.callback(x);
            }, function(e) {
              req.errback(e);
            })
          });
          return req;
        }
      } else {
        throw new ydn.db.NotFoundError(store_name);
      }
    }

    if (goog.isArray(arg1)) {
      if (goog.DEBUG && (goog.isDef(arg2) || goog.isDef(arg3))) {
        throw new ydn.debug.error.ArgumentException('too many input arguments');
      }
      var ids = arg1;
      goog.log.finer(this.logger, 'listByIds: ' + store_name + ' ' +
          ids.length + ' ids');
      req = this.tx_thread.request(ydn.db.Request.Method.VALUES_IDS,
          [store_name]);
      store.hook(req, arguments, undefined, this);
      req.addTxback(function() {
        this.getCrudExecutor().listByIds(req, store_name, ids);
      }, this);
    } else if (goog.isString(arg1)) { // index name
      var index_name = arg1;
      if (goog.DEBUG) {
        if (!store.hasIndex(index_name)) {
          throw new ydn.debug.error.ArgumentException('index "' +
              index_name + '" not found in store "' + store_name + '"');
        }
        var msg = ydn.db.KeyRange.validate(/** @type {KeyRangeJson} */ (arg2));
        if (msg) {
          throw new ydn.debug.error.ArgumentException('invalid key range: ' +
              arg2 + ' ' + msg);
        }
      }
      var range = ydn.db.KeyRange.parseIDBKeyRange(
          /** @type {KeyRangeJson} */ (arg2));
      if (!goog.isDef(arg3)) {
        limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
      } else if (goog.isNumber(arg3)) {
        limit = arg3;
      } else {
        throw new ydn.debug.error.ArgumentException('limit must be a number.');
      }
      if (!goog.isDef(arg4)) {
        offset = 0;
      } else if (goog.isNumber(arg4)) {
        offset = arg4;
      } else {
        throw new ydn.debug.error.ArgumentException('offset must be a number.');
      }
      if (goog.isBoolean(arg5)) {
        reverse = arg5;
      } else if (goog.isDef(arg5)) {
        throw new ydn.debug.error.ArgumentException(
            'reverse must be a boolean, but ' + arg5);
      }
      if (goog.isDef(arg6)) {
        if (goog.isBoolean(arg6)) {
          unique = arg6;
        } else {
          throw new ydn.debug.error.ArgumentException(
              'unique must be a boolean');
        }
      }
      goog.log.finer(this.logger, 'listByIndexKeyRange: ' + store_name + ':' +
          index_name);
      method = ydn.db.Request.Method.VALUES_INDEX;
      req = this.tx_thread.request(method, [store_name]);
      store.hook(req, arguments);
      req.addTxback(function() {
        this.getCrudExecutor().list(req, ydn.db.base.QueryMethod.LIST_VALUE,
            store_name, index_name, range, limit, offset, reverse, unique);
      }, this);
    } else {
      var range = null;
      if (goog.isObject(arg1)) {
        if (goog.DEBUG) {
          var msg = ydn.db.KeyRange.validate(arg1);
          if (msg) {
            throw new ydn.debug.error.ArgumentException('invalid key range: ' +
                arg1 + ' ' + msg);
          }
        }
        range = ydn.db.KeyRange.parseIDBKeyRange(arg1);
      } else if (goog.DEBUG && goog.isDefAndNotNull(arg1)) {
        throw new ydn.debug.error.ArgumentException('expect key range object,' +
            ' but found "' + ydn.json.toShortString(arg1) + '" of type ' + typeof arg1);
      }
      if (!goog.isDef(arg2)) {
        limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
      } else if (goog.isNumber(arg2)) {
        limit = arg2;
      } else {
        throw new ydn.debug.error.ArgumentException('limit must be a number, ' +
            'but ' + arg2 + ' is ' + typeof arg2);
      }
      if (!goog.isDef(arg3)) {
        offset = 0;
      } else if (goog.isNumber(arg3)) {
        offset = arg3;
      } else {
        throw new ydn.debug.error.ArgumentException(
            'offset must be a number, ' + 'but ' + arg3 + ' is ' + typeof arg3);
      }
      if (goog.isDef(arg4)) {
        if (goog.isBoolean(arg4)) {
          reverse = arg4;
        } else {
          throw new ydn.debug.error.ArgumentException('reverse must be a ' +
              'boolean, but ' + arg4 + ' is ' + typeof arg4);
        }
      }
      goog.log.finer(this.logger, (range ? 'listByKeyRange: ' : 'listByStore: ') +
          store_name);
      method = ydn.db.Request.Method.VALUES;
      req = this.tx_thread.request(method, [store_name]);
      store.hook(req, arguments);
      req.addTxback(function() {
        this.getCrudExecutor().list(req, ydn.db.base.QueryMethod.LIST_VALUE,
            store_name, null, range, limit, offset, reverse, false);
      }, this);
    }
  } else if (goog.isArray(arg0)) {
    if (arg0[0] instanceof ydn.db.Key) {
      var store_names = [];
      /**
       * @type {!Array.<!ydn.db.Key>}
       */
      var keys = /** @type {!Array.<!ydn.db.Key>} */ (arg0);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var i_store_name = key.getStoreName();
        if (!this.schema.hasStore(i_store_name)) {
          if (this.schema.isAutoSchema()) {
            var fail_array = [];
            // I think more efficient than: fail_array.length = keys.length;
            fail_array[keys.length - 1] = undefined;
            return ydn.db.Request.succeed(ydn.db.Request.Method.GET,
                fail_array);
          } else {
            throw new ydn.debug.error.ArgumentException('Store: ' +
                i_store_name + ' not found.');
          }
        }
        if (!goog.array.contains(store_names, i_store_name)) {
          store_names.push(i_store_name);
        }
      }
      goog.log.finer(this.logger, 'listByKeys: ' + ydn.json.stringify(store_names) +
          ' ' + keys.length + ' keys');
      req = this.tx_thread.request(ydn.db.Request.Method.VALUES_KEYS,
          store_names);
      req.addTxback(function() {
        this.getCrudExecutor().listByKeys(req, keys);
      }, this);
    } else {
      throw new ydn.debug.error.ArgumentException('first argument' +
          'must be array of ydn.db.Key, but ' + arg0[0] + ' of ' +
          typeof arg0[0] + ' found.');
    }
  } else {
    throw new ydn.debug.error.ArgumentException('first argument ' + arg0 +
        ' is invalid.');
  }

  return req;
};


/**
 * List
 * @param {ydn.db.base.QueryMethod} type
 * @param {string} store_name
 * @param {string=} opt_index
 * @param {ydn.db.KeyRange|ydn.db.IDBKeyRange=} opt_key_range
 * @param {number=} opt_limit
 * @param {number=} opt_offset
 * @param {boolean=} opt_reverse
 * @param {boolean=} opt_unique
 * @param {Array.<IDBKey|undefined>=} opt_pos last cursor position.
 * @return {!ydn.db.Request}
 */
ydn.db.crud.DbOperator.prototype.list = function(type, store_name, opt_index,
    opt_key_range, opt_limit, opt_offset, opt_reverse, opt_unique, opt_pos) {

  var store = this.schema.getStore(store_name);
  if (!store) {
    if (this.schema.isAutoSchema()) {
      return ydn.db.Request.succeed(ydn.db.Request.Method.GET, []);
    } else {
      throw new ydn.db.NotFoundError(store_name);
    }
  }

  var me = this;
  var req;
  var method = ydn.db.Request.Method.NONE;

  if (goog.DEBUG) {
    if (opt_index && !store.hasIndex(opt_index)) {
      throw new ydn.debug.error.ArgumentException('index "' +
          opt_index + '" not found in store "' + store_name + '"');
    }
    var msg = ydn.db.KeyRange.validate(opt_key_range);
    if (msg) {
      throw new ydn.debug.error.ArgumentException('invalid key range: ' +
          opt_key_range + ' ' + msg);
    }
  }
  var range = ydn.db.KeyRange.parseIDBKeyRange(opt_key_range);
  var limit = ydn.db.base.DEFAULT_RESULT_LIMIT;
  if (goog.isNumber(opt_limit)) {
    limit = opt_limit;
  } else if (goog.isDefAndNotNull(opt_limit)) {
    throw new ydn.debug.error.ArgumentException('limit must be a number but "' +
        opt_limit + '" of type ' + typeof opt_limit + ' found.');
  }
  var offset = 0;
  if (goog.isNumber(opt_offset)) {
    offset = opt_offset;
  } else if (goog.isDefAndNotNull(opt_offset)) {
    throw new ydn.debug.error.ArgumentException('offset must be a number but' +
        ' "' + opt_offset + '" of type ' + typeof opt_offset + ' found.');
  }
  var reverse = false;
  if (goog.isBoolean(opt_reverse)) {
    reverse = opt_reverse;
  } else if (goog.isDefAndNotNull(opt_reverse)) {
    throw new ydn.debug.error.ArgumentException('reverse must be a boolean ' +
        'but "' + opt_reverse + '" of type ' + typeof opt_reverse + ' found.');
  }
  var unique = false;
  if (goog.isBoolean(opt_unique)) {
    unique = opt_unique;
  } else if (goog.isDefAndNotNull(opt_unique)) {
    throw new ydn.debug.error.ArgumentException('unique must be a boolean but' +
        ' "' + opt_unique + '" of type ' + typeof opt_unique + ' found.');
  }
  if (offset && !!opt_pos && goog.isDef(opt_pos[0])) {
    throw new ydn.debug.error.ArgumentException('offset must not given when ' +
        'initial cursor position is defined');
  }
  goog.log.finer(this.logger, type + ': ' + store_name + ':' + opt_index);
  method = ydn.db.Request.Method.VALUES_INDEX;
  req = this.tx_thread.request(method, [store_name]);
  // store.hook(req, arguments);
  req.addTxback(function() {
    this.getCrudExecutor().list(req, type, store_name,
        opt_index || null, range, limit, offset, reverse, unique, opt_pos);
  }, this);

  return req;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.add = function(store_name_or_schema, value,
                                               opt_keys) {

  var store_name = goog.isString(store_name_or_schema) ?
      store_name_or_schema : goog.isObject(store_name_or_schema) ?
      store_name_or_schema['name'] : undefined;
  if (!goog.isString(store_name)) {
    throw new ydn.debug.error.ArgumentException('store name ' + store_name +
        ' must be a string, but ' + typeof store_name);
  }

  var store = this.schema.getStore(store_name);
  if (!store) {
    if (!this.schema.isAutoSchema()) {
      throw new ydn.debug.error.ArgumentException('store name "' + store_name +
          '" not found.');
    }
    var schema = goog.isObject(store_name_or_schema) ?
        store_name_or_schema : {'name': store_name};

    // this is async process, but we don't need to wait for it.
    store = ydn.db.schema.Store.fromJSON(/** @type {!StoreSchema} */ (schema));
    goog.log.finer(this.logger, 'Adding object store: ' + store_name);
    this.addStoreSchema(store);

  } else if (this.schema.isAutoSchema() &&
      goog.isObject(store_name_or_schema)) {
    // if there is changes in schema, change accordingly.
    var new_schema = ydn.db.schema.Store.fromJSON(store_name_or_schema);
    var diff = store.difference(new_schema);
    if (diff) {
      throw new ydn.debug.error.NotSupportedException(diff);
      // this.addStoreSchema(store);
    }
  }

  var req;

  if (!store) {
    throw new ydn.debug.error.ArgumentException('store name "' + store_name +
        '" not found.');
  }
  // https://developer.mozilla.org/en-US/docs/IndexedDB/IDBObjectStore#put
  if ((goog.isString(store.keyPath)) && goog.isDef(opt_keys)) {
    // The object store uses in-line keys or has a key generator, and a key
    // parameter was provided.
    throw new ydn.debug.error.ArgumentException(
        'key must not be provided while the store uses in-line key.');
  //} else if (store.autoIncrement && goog.isDef(opt_keys)) {
    // The object store uses in-line keys or has a key generator, and a key
    // parameter was provided.
  //  throw new ydn.debug.error.ArgumentException('key must not be provided ' +
  //      'while autoIncrement is true.');
  } else if (!store.usedInlineKey() && !store.autoIncrement &&
      !goog.isDef(opt_keys)) {
    // The object store uses out-of-line keys and has no key generator, and no
    // key parameter was provided.
    throw new ydn.debug.error.ArgumentException(
        'out-of-line key must be provided.');
  }

  if (goog.isArray(value)) {
    var objs = value;
    var keys = /** @type {!Array.<(number|string)>|undefined} */ (opt_keys);
    //console.log('waiting to putObjects');
    goog.log.finer(this.logger, 'addObjects: ' + store_name + ' ' + objs.length +
        ' objects');

    for (var i = 0; i < objs.length; i++) {
      store.generateIndex(objs[i]);
    }
    req = this.tx_thread.request(ydn.db.Request.Method.ADDS,
        [store_name], ydn.db.base.TransactionMode.READ_WRITE);
    req.addTxback(function() {
      //console.log('putObjects');
      this.getCrudExecutor().insertObjects(req, false, false, store_name, objs,
          keys);
    }, this);

    if (store.dispatch_events) {
      req.addCallback(function(keys) {
        var event = new ydn.db.events.StoreEvent(ydn.db.events.Types.CREATED,
            this.getStorage(), store.getName(), keys, objs);
        this.getStorage().dispatchDbEvent(event);
      }, this);
    }

  } else if (goog.isObject(value)) {
    var obj = value;
    var key = /** @type {number|string|undefined} */ (opt_keys);
    var label = 'store: ' + store_name + ' key: ' + store.extractKey(obj, key);

    goog.log.finer(this.logger, 'addObject: ' + label);
    store.generateIndex(obj);
    req = this.tx_thread.request(ydn.db.Request.Method.ADD,
        [store_name], ydn.db.base.TransactionMode.READ_WRITE);
    req.addTxback(function() {
      this.getCrudExecutor().insertObjects(req, false, true, store_name, [obj],
          [key]);
    }, this);

    if (store.dispatch_events) {
      req.addCallback(function(key) {
        var event = new ydn.db.events.RecordEvent(ydn.db.events.Types.CREATED,
            this.getStorage(), store.getName(), key, obj);
        this.getStorage().dispatchDbEvent(event);
      }, this);
    }

  } else {
    throw new ydn.debug.error.ArgumentException('record must be an object or ' +
        'array list of objects, but ' + value + ' of type ' + typeof value +
        ' found.');
  }

  return req;
};


/**
 *
 * @param {string|StoreSchema} store_name_schema store name or schema.
 * @return {ydn.db.schema.Store} store.
 * @private
 */
ydn.db.crud.DbOperator.prototype.getStore_ = function(store_name_schema) {

  var store_name = goog.isString(store_name_schema) ?
      store_name_schema : goog.isObject(store_name_schema) ?
      store_name_schema['name'] : undefined;
  if (!goog.isString(store_name)) {
    throw new ydn.debug.error.ArgumentException('store name must be a string');
  }

  var store = this.schema.getStore(store_name);
  if (!store) {
    if (!this.schema.isAutoSchema()) {
      throw new ydn.db.NotFoundError(store_name);
    }
    var schema = goog.isObject(store_name_schema) ?
        store_name_schema : {'name': store_name};

    // this is async process, but we don't need to wait for it.
    store = ydn.db.schema.Store.fromJSON(/** @type {!StoreSchema} */ (schema));
    goog.log.finer(this.logger, 'Adding object store: ' + store_name);
    this.addStoreSchema(store);

  } else if (this.schema.isAutoSchema() && goog.isObject(store_name_schema))
  {
    // if there is changes in schema, change accordingly.
    var new_schema = ydn.db.schema.Store.fromJSON(store_name_schema);
    var diff = store.difference(new_schema);
    if (diff) {
      throw new ydn.debug.error.NotSupportedException(diff);
      // this.addStoreSchema(store);
    }
  }
  if (!store) {
    throw new ydn.db.NotFoundError(store_name);
  }
  return store;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.load = function(store_name_or_schema, data,
                                                 opt_delimiter) {

  var delimiter = opt_delimiter || ',';

  var store = this.getStore_(store_name_or_schema);
  var store_name = store.getName();

  var df =  this.tx_thread.request(ydn.db.Request.Method.LOAD, [store_name]);
  var me = this;

  this.tx_thread.exec(df, function(tx, tx_no, cb) {
    me.getCrudExecutor().putData(tx, tx_no, cb, store_name, data, delimiter);
  }, [store_name], ydn.db.base.TransactionMode.READ_WRITE);
  return df;
};


/**
 * Full text search.
 * @param {ydn.db.schema.fulltext.ResultSet} query
 * @return {!ydn.db.Request}
 */
ydn.db.crud.DbOperator.prototype.search = function(query) {
  var store_names = query.getStoreList();
  goog.log.finest(this.logger, 'query ' + query);
  var req = this.tx_thread.request(ydn.db.Request.Method.SEARCH, store_names,
      ydn.db.base.TransactionMode.READ_ONLY);
  req.addTxback(function() {
    var exe = this.getCrudExecutor();
    // console.log('search ' + query);

    query.nextLookup(function(store_name, index_name, kr, entry) {
      var iReq = req.copy();
      // console.log(store_name, index_name, kr);
      exe.list(iReq, ydn.db.base.QueryMethod.LIST_VALUE, store_name, index_name,
          kr.toIDBKeyRange(), 100, 0, false, false);
      iReq.addBoth(function(x) {
        // console.log(store_name, index_name, kr.lower, x);
        var e = null;
        if (!(x instanceof Array)) {
          e = x;
          x = [];
        }
        var next = query.addResult(this, /** @type {Array} */ (x));
        if (next === true) {
          req.notify(query);
        } else if (next === false) {
          req.callback(query.collect());
        }
        if (e) {
          throw e;
        }
      }, entry);
    });
  }, this);
  return req;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.put = function(arg1, value, opt_keys) {

  var req;
  var me = this;

  if (arg1 instanceof ydn.db.Key) {
    /**
     * @type {!ydn.db.Key}
     */
    var k = arg1;
    var k_s_name = k.getStoreName();
    var k_store = this.schema.getStore(k_s_name);
    if (!k_store) {
      throw new ydn.debug.error.ArgumentException('store "' + k_s_name +
          '" not found.');
    }
    if (k_store.usedInlineKey()) {
      var v_k = k_store.extractKey(value);
      if (goog.isDefAndNotNull(v_k)) {
        if (ydn.db.cmp(v_k, k.getId()) != 0) {
          throw new ydn.debug.error.ArgumentException('Inline key must be ' +
              k + ' but ' + v_k + ' found.');
        }
      } else {
        k_store.setKeyValue(value, k.getId());
      }
      return this.put(k_s_name, value);
    } else {
      return this.put(k_s_name, value, k.getId());
    }
  } else if (goog.isArray(arg1)) { // array of keys
    if (goog.DEBUG && goog.isDef(opt_keys)) {
      throw new ydn.debug.error.ArgumentException('too many arguments');
    }
    var db_keys = /** @type {!Array.<!ydn.db.Key>} */ (arg1);
    if (goog.DEBUG && !goog.isDef(value)) {
      throw new ydn.debug.error.ArgumentException('record values required');
    }
    goog.asserts.assertArray(value, 'record values must also be in an array');
    var values = /** @type {!Array} */ (value);
    goog.asserts.assert(db_keys.length === values.length, 'number of keys ' +
        'and number of object must be same, but found ' + db_keys.length +
        ' vs. ' + values.length);
    var store_names = [];
    for (var i = 0, n = db_keys.length; i < n; i++) {
      var s_name = db_keys[i].getStoreName();
      if (goog.array.indexOf(store_names, s_name) == -1) {
        store_names.push(s_name);
      }
      var store = this.schema.getStore(s_name);
      if (!store) {
        throw new ydn.debug.error.ArgumentException('store "' + s_name +
            '" not found.');
      }
      if (store.usedInlineKey()) {
        store.setKeyValue(values[i], db_keys[i].getId());
      }
    }
    goog.log.finer(this.logger, 'putByKeys: to ' + ydn.json.stringify(store_names) + ' ' +
        values.length + ' objects');

    for (var i = 0; i < values.length; i++) {
      store.generateIndex(values[i]);
    }
    req = this.tx_thread.request(ydn.db.Request.Method.PUT_KEYS, store_names,
        ydn.db.base.TransactionMode.READ_WRITE);
    store.hook(req, arguments);
    req.addTxback(function() {
      me.getCrudExecutor().putByKeys(req, values, db_keys);
    }, this);
  } else if (goog.isString(arg1) || goog.isObject(arg1)) {
    var store = this.getStore_(arg1);
    var st_name = store.getName();

    // https://developer.mozilla.org/en-US/docs/IndexedDB/IDBObjectStore#put
    if (store.usedInlineKey() && goog.isDef(opt_keys)) {
      // The object store uses in-line keys or has a key generator, and a key
      // parameter was provided.
      throw new ydn.debug.error.ArgumentException(
          'key must not be provided while the store uses in-line key.');
    //} else if (store.autoIncrement && goog.isDef(opt_keys)) {
      // The object store uses in-line keys or has a key generator, and a key
      // parameter was provided.
    //  throw new ydn.debug.error.ArgumentException('key must not be provided' +
    //      ' while autoIncrement is true.');
    } else if (!store.usedInlineKey() && !store.autoIncrement &&
        !goog.isDef(opt_keys)) {
      // The object store uses out-of-line keys and has no key generator, and no
      // key parameter was provided.
      throw new ydn.debug.error.ArgumentException(
          'out-of-line key must be provided.');
    }

    if (goog.isArray(value)) {
      var objs = value;
      var keys = /** @type {!Array.<(number|string)>|undefined} */ (opt_keys);
      goog.log.finer(this.logger, 'putObjects: ' + st_name + ' ' +
          objs.length + ' objects');
      for (var i = 0; i < objs.length; i++) {
        store.generateIndex(objs[i]);
      }
      req = this.tx_thread.request(ydn.db.Request.Method.PUTS,
          [st_name], ydn.db.base.TransactionMode.READ_WRITE);
      store.hook(req, arguments);
      req.addTxback(function() {
        //console.log('putObjects');
        this.getCrudExecutor().insertObjects(req, true, false, st_name, objs,
            keys);
      }, this);

      if (store.dispatch_events) {
        req.addCallback(function(keys) {
          var event = new ydn.db.events.StoreEvent(ydn.db.events.Types.UPDATED,
              this.getStorage(), st_name, keys, objs);
          this.getStorage().dispatchDbEvent(event);
        }, this);
      }

    } else if (goog.isObject(value)) {
      var obj = value;
      var key = /** @type {number|string|undefined} */ (opt_keys);
      if (goog.DEBUG) {
        if (goog.isDef(key)) {
          goog.asserts.assert(ydn.db.Key.isValidKey(key), key +
              ' of type ' + (typeof key) + ' is invalid key for ' +
              ydn.json.toShortString(obj));
        } else if (!store.isAutoIncrement() && store.usedInlineKey()) {
          goog.asserts.assert(ydn.db.Key.isValidKey(store.extractKey(obj)),
              'in-line key on ' + store.getKeyPath() + ' must provided in ' +
              ydn.json.toShortString(obj));
        }
      }
      goog.log.finer(this.logger, 'putObject: ' + st_name + ' ' + (goog.isDef(key) ? key : '(without-key)'));
      // note File is also instanceof Blob
      var is_blob = (goog.isDef(goog.global['Blob']) && obj instanceof Blob) &&
          // check for using blob store
          store.isFixed() && !store.usedInlineKey() &&
          store.countIndex() == 0 &&
          // only webkit need to encode blob into dataURL.
          goog.userAgent.WEBKIT;
      if (is_blob) {
        // we cannot invoke request to thread, because encoding is async,
        // we must wait encoding is ready before starting transaction.
        // TODO: this will cause transaction could not be reused.
        req = new ydn.db.Request(ydn.db.Request.Method.PUT);
        var fr = new FileReader();
        fr.onload = function(e) {
          var value = e.target.result;
          var rq = me.tx_thread.request(ydn.db.Request.Method.PUT,
              [st_name], ydn.db.base.TransactionMode.READ_WRITE);
          store.hook(rq, [st_name, obj, key]);
          rq.addTxback(function() {
            me.getCrudExecutor().insertObjects(rq, true, true, st_name, [value],
                [key]);
          }, this);
          rq.addCallbacks(function(x) {
            req.callback(x);
          }, function(e) {
            req.errback(e);
          });
        };
        fr.onerror = function(e) {
          req.errback(e);
        };
        fr.onabort = function(e) {
          req.errback(e);
        };
        fr.readAsDataURL(/** @type {!Blob} */ (obj));
      } else {
        store.generateIndex(obj);
        req = this.tx_thread.request(ydn.db.Request.Method.PUT,
            [st_name], ydn.db.base.TransactionMode.READ_WRITE);
        var args = [st_name, obj, key];
        store.hook(req, args);
        req.addTxback(function() {
          // Note: here we are reading from arguments array, so that if
          // hook manipulate the value, we get updated value.
          // encryption hook manipulate both key and value.
          var keys = goog.isDef(key) ? [args[2]] : undefined;
          me.getCrudExecutor().insertObjects(req, true, true, st_name,
              [args[1]], keys);
        }, this);
      }


      if (store.dispatch_events) {
        req.addCallback(function(key) {
          var event = new ydn.db.events.RecordEvent(ydn.db.events.Types.UPDATED,
              this.getStorage(), st_name, key, obj);
          this.getStorage().dispatchDbEvent(event);
        }, this);
      }

    } else {
      throw new ydn.debug.error.ArgumentException('put record value must be ' +
          'Object or array of Objects');
    }
  } else {
    throw new ydn.debug.error.ArgumentException('the first argument of put ' +
        'must be store name, store schema or array of keys.');
  }

  return req;

};


/**
 * Dump object into the database. Use only by synchronization process when
 * updating from server.
 * This is friendly module use only.
 * @param {string|!Array.<!ydn.db.Key>} store_name store name.
 * @param {!Array.<Object>} objs objects.
 * @param {!Array.<!IDBKey>=} opt_keys keys.
 * @param {boolean=} opt_use_main_thread default is background thread.
 * @param {number=} opt_hook_idx hook index to ignore.
 * @return {!goog.async.Deferred} df return no result.
 */
ydn.db.crud.DbOperator.prototype.dumpInternal = function(store_name, objs,
    opt_keys, opt_use_main_thread, opt_hook_idx) {
  var thread = opt_use_main_thread ? this.tx_thread : this.sync_thread;

  var store_names, db_keys;
  if (goog.isString(store_name)) {
    var store = this.schema.getStore(store_name);
    if (goog.DEBUG) {
      if (store) {
        if (!store.usedInlineKey() && !store.isAutoIncrement() &&
            !goog.isDefAndNotNull(opt_keys)) {
          throw new ydn.debug.error.ArgumentException(
              'key required for store "' + store_name + '"');
        }
      } else {
        throw new ydn.db.NotFoundError(store_name);
      }
    }
    for (var i = 0; i < objs.length; i++) {
      store.generateIndex(objs[i]);
    }
    store_names = [store_name];
  } else {
    goog.asserts.assertArray(store_name, 'store name ' + store_name + ' +' +
        ' must be an array or string, but ' + (typeof store_name));
    db_keys = store_name;
    store_names = [];
    for (var i = 0, n = db_keys.length; i < n; i++) {
      var s_name = db_keys[i].getStoreName();
      var store = this.schema.getStore(s_name);
      if (goog.array.indexOf(store_names, s_name) == -1) {
        store_names.push(s_name);
      }
      if (goog.DEBUG && !store) {
        throw new ydn.db.NotFoundError(s_name);
      }
      store.generateIndex(objs[i]);
    }
  }

  var req;
  if (goog.isString(store_name)) {
    var s_n = store_name;
    var store = this.schema.getStore(s_n);
    req = thread.request(ydn.db.Request.Method.PUTS,
        store_names, ydn.db.base.TransactionMode.READ_WRITE);
    if (opt_hook_idx) {
      store.hook(req, [s_n, objs, opt_keys], opt_hook_idx);
    }
    req.addTxback(function() {
      this.getCrudExecutor().insertObjects(req, true, false, s_n, objs,
          opt_keys);
    }, this);
  } else {
    req = thread.request(ydn.db.Request.Method.PUT_KEYS,
        store_names, ydn.db.base.TransactionMode.READ_WRITE);
    if (opt_hook_idx) {
      for (var i = 0; i < store_names.length; i++) {
        var store = this.schema.getStore(store_names[i]);
        store.hook(req, [objs, db_keys], opt_hook_idx);
      }
    }
    req.addTxback(function() {
      this.getCrudExecutor().putByKeys(req, objs, db_keys);
    }, this);
  }
  return req;
};


/**
 * Remove record by keys.
 * @param {!Array.<!ydn.db.Key>} keys keys.
 * @return {!ydn.db.Request} df.
 */
ydn.db.crud.DbOperator.prototype.removeInternalByKeys = function(keys) {
  var store_names = [];
  for (var i = 0, n = keys.length; i < n; i++) {
    var s_name = keys[i].getStoreName();
    if (goog.array.indexOf(store_names, s_name) == -1) {
      store_names.push(s_name);
    }
    if (goog.DEBUG && !this.schema.hasStore(s_name)) {
      throw new ydn.db.NotFoundError(s_name);
    }
  }
  var me = this;
  var df = this.sync_thread.request(ydn.db.Request.Method.REMOVE_KEYS,
      store_names, ydn.db.base.TransactionMode.READ_WRITE);
  df.addTxback(function() {
    this.getCrudExecutor().removeByKeys(df, keys);
  }, this);
  return df;
};


/**
 * Remove record by keys.
 * @param {string} store_name store_name.
 * @param {IDBKeyRange=} opt_kr key range.
 * @return {!ydn.db.Request} df.
 */
ydn.db.crud.DbOperator.prototype.removeInternal = function(store_name, opt_kr) {

  var df = this.sync_thread.request(ydn.db.Request.Method.REMOVE, [store_name],
      ydn.db.base.TransactionMode.READ_WRITE);
  df.addTxback(function() {
    this.getCrudExecutor().removeByKeyRange(df, store_name, opt_kr || null);
  }, this);
  return df;
};


/**
 * List records from the database. Use only by synchronization process when
 * updating from server.
 * This is friendly module use only.
 * @param {string} store_name store name.
 * @param {?string} index_name index name.
 * @param {IDBKeyRange|ydn.db.KeyRange} key_range key range.
 * @param {boolean} reverse reverse.
 * @param {number} limit limit.
 * @param {number=} opt_offset offset.
 * @return {!goog.async.Deferred} df.
 */
ydn.db.crud.DbOperator.prototype.listInternal = function(store_name, index_name,
    key_range, reverse, limit, opt_offset) {
  limit = limit || ydn.db.base.DEFAULT_RESULT_LIMIT;
  var req;
  var offset = opt_offset || 0;
  if (goog.DEBUG) {
    var store = this.schema.getStore(store_name);
    if (store) {
      if (index_name && !store.hasIndex(index_name)) {
        throw new ydn.db.NotFoundError('index "' + index_name + '" in store "' +
            store_name + '"');
      }
    } else {
      throw new ydn.db.NotFoundError(store_name);
    }
  }

  var kr = ydn.db.KeyRange.parseIDBKeyRange(key_range);
  // todo: unify if
  if (goog.isString(index_name)) {
    var index = index_name;
    req = this.sync_thread.request(ydn.db.Request.Method.VALUES_INDEX,
        [store_name]);
    req.addTxback(function() {
      this.getCrudExecutor().list(req, ydn.db.base.QueryMethod.LIST_VALUE,
          store_name, index, kr, limit, offset, reverse, false);
    }, this);
  } else {
    req = this.sync_thread.request(ydn.db.Request.Method.VALUES,
        [store_name]);
    req.addTxback(function() {
      this.getCrudExecutor().list(req, ydn.db.base.QueryMethod.LIST_VALUE,
          store_name, null, kr, limit, offset, reverse, false);
    }, this);
  }
  return req;
};


/**
 * Retrieve record values from given list of key objects.
 * @param {!Array.<!ydn.db.Key>} keys keys to retrieve.
 * @return {!ydn.db.Request} df.
 */
ydn.db.crud.DbOperator.prototype.valuesInternal = function(keys) {
  var store_names = [];
  var n = keys.length;
  if (n == 0) {
    return ydn.db.Request.succeed(ydn.db.Request.Method.KEYS, []);
  }
  for (var i = 0; i < n; i++) {
    var s_name = keys[i].getStoreName();
    if (goog.array.indexOf(store_names, s_name) == -1) {
      store_names.push(s_name);
    }
    if (goog.DEBUG && !this.schema.hasStore(s_name)) {
      throw new ydn.db.NotFoundError(s_name);
    }
  }
  var me = this;
  var df = this.sync_thread.request(ydn.db.Request.Method.KEYS, store_names);
  df.addTxback(function() {
    me.getCrudExecutor().listByKeys(df, keys);
  }, this);
  return df;
};


/**
 * Count number of records in stores.
 * @param {!Array.<string>} store_names
 * @param {boolean=} opt_use_main_thread default is background thread.
 * @return {!ydn.db.Request}
 */
ydn.db.crud.DbOperator.prototype.countInternal = function(store_names,
                                                          opt_use_main_thread) {
  var thread = opt_use_main_thread ? this.tx_thread : this.sync_thread;
  var req = thread.request(ydn.db.Request.Method.COUNT,
      store_names);
  req.addTxback(function() {
    this.getCrudExecutor().countStores(req, store_names);
  }, this);
  return req;
};


/**
 * List keys from the database. Use only by synchronization process when
 * updating from server.
 * This is friendly module use only.
 * @param {string} store_name store name.
 * @param {?string} index_name index name.
 * @param {?IDBKeyRange} key_range key range.
 * @param {number} limit limit.
 * @param {number} offset limit.
 * @param {boolean} reverse reverse.
 * @param {boolean} unique limit.
 * @return {!ydn.db.Request} df.
 */
ydn.db.crud.DbOperator.prototype.keysInternal = function(store_name, index_name,
    key_range, limit, offset, reverse, unique) {
  var req;
  var me = this;
  limit = limit || ydn.db.base.DEFAULT_RESULT_LIMIT;

  if (goog.DEBUG) {
    var store = this.schema.getStore(store_name);
    if (store) {
      if (index_name && !store.hasIndex(index_name)) {
        throw new ydn.db.NotFoundError('index "' + index_name + '" in store "' +
            store_name + '"');
      }
    } else {
      throw new ydn.db.NotFoundError(store_name);
    }
  }

  if (goog.isString(index_name)) {
    var index = index_name;
    req = this.sync_thread.request(ydn.db.Request.Method.KEYS_INDEX,
        [store_name]);
    req.addTxback(function() {
      this.getCrudExecutor().list(req, ydn.db.base.QueryMethod.LIST_PRIMARY_KEY,
          store_name, index, key_range, limit, offset, reverse, unique);
    }, this);
  } else {
    req = this.sync_thread.request(ydn.db.Request.Method.KEYS,
        [store_name]);
    req.addTxback(function() {
      this.getCrudExecutor().list(req, ydn.db.base.QueryMethod.LIST_PRIMARY_KEY,
          store_name, null, key_range, limit, offset, reverse, unique);
    }, this);
  }
  return req;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.clear = function(arg1, arg2, arg3) {

  if (goog.DEBUG && goog.isDef(arg3)) {
    throw new ydn.debug.error.ArgumentException('too many input arguments');
  }

  var req;
  var me = this;

  if (goog.isString(arg1)) {
    var st_name = arg1;
    var store = this.schema.getStore(st_name);
    if (!store) {
      throw new ydn.debug.error.ArgumentException('store name "' + st_name +
          '" not found.');
    }

    if (goog.isObject(arg2)) {
      var key_range = ydn.db.KeyRange.parseIDBKeyRange(
          /** @type {KeyRangeJson} */ (arg2));
      if (goog.isNull(key_range)) {
        throw new ydn.debug.error.ArgumentException('clear method requires' +
            ' a valid non-null KeyRange object.');
      }
      goog.log.finer(this.logger, 'clearByKeyRange: ' + st_name + ':' +
          ydn.json.stringify(key_range));
      req = this.tx_thread.request(ydn.db.Request.Method.CLEAR, [st_name],
          ydn.db.base.TransactionMode.READ_WRITE);
      store.hook(req, [st_name, key_range]);
      req.addTxback(function() {
        this.getCrudExecutor().clearByKeyRange(req, st_name, key_range);
      }, this);
    } else if (!goog.isDef(arg2)) {
      goog.log.finer(this.logger, 'clearByStore: ' + st_name);
      req = this.tx_thread.request(ydn.db.Request.Method.CLEAR, [st_name],
          ydn.db.base.TransactionMode.READ_WRITE);
      req.addTxback(function() {
        this.getCrudExecutor().clearByStores(req, [st_name]);
      }, this);

    } else {
      throw new ydn.debug.error.ArgumentException('clear method requires' +
          ' a valid KeyRange object as second argument, but found ' + arg2 +
          ' of type ' + typeof arg2);
    }

  } else if (!goog.isDef(arg1) || goog.isArray(arg1) &&
      goog.isString(arg1[0])) {
    var store_names = arg1 || this.schema.getStoreNames();
    goog.log.finer(this.logger, 'clearByStores: ' + ydn.json.stringify(store_names));
    req = this.tx_thread.request(ydn.db.Request.Method.CLEAR, store_names,
        ydn.db.base.TransactionMode.READ_WRITE);
    req.addTxback(function() {
      this.getCrudExecutor().clearByStores(req, store_names);
    }, this);

  } else {
    throw new ydn.debug.error.ArgumentException('first argument "' + arg1 +
        '" is invalid.');
  }

  return req;
};


/**
 * @inheritDoc
 */
ydn.db.crud.DbOperator.prototype.remove = function(arg1, arg2, arg3) {

  var req;

  if (goog.isString(arg1)) {
    /**
     * @type {string}
     */
    var store_name = arg1;
    var store = this.schema.getStore(store_name);
    if (!store) {
      throw new ydn.debug.error.ArgumentException('store name "' + store_name +
          '" not found.');
    }
    if (goog.isDef(arg3)) {
      if (goog.isString(arg2)) {
        var index = store.getIndex(arg2);
        if (!index) {
          throw new ydn.debug.error.ArgumentException('index: ' + arg2 +
              ' not found in ' + store_name);
        }
        if (goog.isObject(arg3) || goog.isNull(arg3)) {
          var key_range = ydn.db.KeyRange.parseIDBKeyRange(
              /** @type {KeyRangeJson} */ (arg3));
          goog.log.finer(this.logger, 'removeByIndexKeyRange: ' + store_name + ':' +
              index.getName() + ' ' + store_name);
          req = this.tx_thread.request(ydn.db.Request.Method.REMOVE_INDEX,
              [store_name], ydn.db.base.TransactionMode.READ_WRITE);
          req.addTxback(function() {
            this.getCrudExecutor().removeByIndexKeyRange(req, store_name,
                index.getName(), key_range);
          }, this);
        } else {
          throw new ydn.debug.error.ArgumentException('key range ' + arg3 +
              ' is invalid type "' + typeof arg3 + '".');
        }
      } else {
        throw new ydn.debug.error.ArgumentException('index name "' + arg2 +
            '" must be a string, but ' + typeof arg2 + ' found.');
      }
    } else {
      if (goog.isString(arg2) || goog.isNumber(arg2) ||
          goog.isArrayLike(arg2) || arg2 instanceof Date) {
        var id = /** @type {IDBKey} */ (arg2);
        goog.log.finer(this.logger, 'removeById: ' + store_name + ':' + id);
        req = this.tx_thread.request(ydn.db.Request.Method.REMOVE_ID,
            [store_name], ydn.db.base.TransactionMode.READ_WRITE);
        var rm_args = [store_name, id];
        store.hook(req, rm_args);
        req.addTxback(function() {
          this.getCrudExecutor().removeById(req, store_name, rm_args[1]);
        }, this);

        if (store.dispatch_events) {
          req.addCallback(function(cnt_deleted) {
            var key = cnt_deleted == 1 ? id : undefined;
            var event = new ydn.db.events.RecordEvent(
                ydn.db.events.Types.DELETED,
                this.getStorage(), store_name, key, undefined);
            this.getStorage().dispatchDbEvent(event);
          }, this);
        }

      } else if (goog.isObject(arg2)) {
        var key_range = ydn.db.KeyRange.parseIDBKeyRange(
            /** @type {KeyRangeJson} */ (arg2));
        goog.log.finer(this.logger, 'removeByKeyRange: ' + store_name + ':' +
            ydn.json.stringify(key_range));
        req = this.tx_thread.request(ydn.db.Request.Method.REMOVE,
            [store_name], ydn.db.base.TransactionMode.READ_WRITE);
        store.hook(req, [store_name, key_range]);
        req.addTxback(function() {
          this.getCrudExecutor().removeByKeyRange(req, store_name, key_range);
        }, this);
        if (store.dispatch_events) {
          req.addCallback(function(n_keys) {
            var keys = []; // todo: get list of keys delted
            keys.length = n_keys;
            var event = new ydn.db.events.StoreEvent(
                ydn.db.events.Types.DELETED,
                this.getStorage(), store_name, keys, undefined);
            this.getStorage().dispatchDbEvent(event);
          }, this);
        }
      } else {
        throw new ydn.debug.error.ArgumentException(
            'Invalid key or key range "' + arg2 + '" of type ' + typeof arg2);
      }
    }
  } else if (arg1 instanceof ydn.db.Key) {
    /**
     * @type {!ydn.db.Key}
     */
    var key = arg1;
    var st_name = key.getStoreName();
    var store = this.schema.getStore(st_name);
    goog.asserts.assert(store, 'store "' + st_name + '" not found.');
    req = this.tx_thread.request(ydn.db.Request.Method.REMOVE_ID,
        [st_name], ydn.db.base.TransactionMode.READ_WRITE);
    var hk_args = [st_name, key.getId()];
    store.hook(req, hk_args);
    req.addTxback(function() {
      this.getCrudExecutor().removeById(req, st_name, hk_args[1]);
    }, this);
  } else if (goog.isArray(arg1)) {
    /**
     * @type {!Array.<!ydn.db.Key>}
     */
    var arr = arg1;
    var store_names = [];
    for (var i = 0, n = arr.length; i < n; i++) {
      if (goog.DEBUG && !(arr[i] instanceof ydn.db.Key)) {
        throw new ydn.debug.error.ArgumentException('key list element at ' + i +
            ' of ' + n + ' must be yn.db.Key, but "' +
            ydn.json.toShortString(arg1[i]) +
            '" (' + goog.typeOf(arg1[i]) + ') ' +
            'is not ydn.db.Key.');
      }
      var st = arr[i].getStoreName();
      if (goog.array.indexOf(store_names, st) == -1) {
        store_names.push(st);
      }
    }
    if (store_names.length < 1) {
      throw new ydn.debug.error.ArgumentException('at least one valid key ' +
          'required in key list "' + ydn.json.toShortString(arg1) + '"');
    }
    req = this.tx_thread.request(ydn.db.Request.Method.REMOVE_KEYS,
        store_names, ydn.db.base.TransactionMode.READ_WRITE);
    req.addTxback(function() {
      this.getCrudExecutor().removeByKeys(req, arr);
    }, this);
  } else {
    throw new ydn.debug.error.ArgumentException('first argument requires ' +
        'store name, key (ydn.db.Key) or list of keys (array) , but "' +
        ydn.json.toShortString(arg1) + '" (' + goog.typeOf(arg1) + ') found.');
  }

  return req;
};


if (goog.DEBUG) {
  /** @override */
  ydn.db.crud.DbOperator.prototype.toString = function() {
    var s = 'DbOperator:' + this.getStorage().getName();
    return s;
  };
}

