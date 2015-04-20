/**
 * @fileoverview Cursor stream accept key and pop to a sink callback.
 *
 * User: kyawtun
 * Date: 11/11/12
 */

goog.provide('ydn.db.Streamer');
goog.require('ydn.db.Iterator');
goog.require('ydn.db.con.IStorage');
goog.require('ydn.db.con.IdbCursorStream');
goog.require('ydn.debug.error.ArgumentException');



/**
 *
 * @param {ydn.db.con.IStorage|ydn.db.base.Transaction} storage storage connector.
 * @param {string} store_name store name.
 * @param {string=} opt_field_name projection field name.
 * @constructor
 */
ydn.db.Streamer = function(storage, store_name, opt_field_name) {

  if (storage && storage instanceof ydn.db.con.Storage) {
    this.db_ = /** @type {ydn.db.con.IStorage} */ (storage);
  } else if (storage && storage.db) {
    var tx = /** @type {!IDBTransaction} */ (storage);
    this.db_ = null;
    this.setTx(tx);
  }

  if (!goog.isString(store_name)) {
    throw new ydn.debug.error.ArgumentException('a store name required.');
  }
  this.store_name_ = store_name;
  if (goog.isDef(opt_field_name) && !goog.isString(opt_field_name)) {
    throw new ydn.debug.error.ArgumentException('projection index name must be' +
        ' a string.');
  }
  this.index_name_ = opt_field_name;

  this.cursor_ = null;
  /**
   * @private
   * @type {Array}
   */
  this.stack_key_ = [];
  /**
   * @private
   * @type {Array}
   */
  this.stack_value_ = [];
  this.is_collecting_ = false;
};


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.Streamer.prototype.logger =
    goog.log.getLogger('ydn.db.Streamer');


/**
 *
 * @type {ydn.db.con.IStorage}
 * @private
 */
ydn.db.Streamer.prototype.db_ = null;


/**
 *
 * @type {boolean}
 * @private
 */
ydn.db.Streamer.prototype.key_only_ = true;


/**
 *
 * @type {ydn.db.con.Storage}
 * @private
 */
ydn.db.Streamer.prototype.storage_ = null;


/**
 * @type {string}
 * @private
 */
ydn.db.Streamer.prototype.store_name_;


/**
 * @type {string|undefined}
 * @private
 */
ydn.db.Streamer.prototype.index_name_;


/**
 *
 * @type {(function(*, *, Function): boolean)?}
 * @private
 */
ydn.db.Streamer.prototype.sink_ = null;


/**
 *
 * @return {string|undefined}
 */
ydn.db.Streamer.prototype.getFieldName = function() {
  return this.index_name_;
};


/**
 *
 * @type {ydn.db.con.ICursorStream}
 * @private
 */
ydn.db.Streamer.prototype.cursor_ = null;


/**
 *
 * @return {boolean}
 */
ydn.db.Streamer.prototype.isKeyIterator = function() {
  return this.key_only_;
};


/**
 *
 * @param {function(*, *, Function): boolean} sink
 */
ydn.db.Streamer.prototype.setSink = function(sink) {
  this.sink_ = sink;
};


/**
 *
 * @param {ydn.db.base.Transaction} tx
 * transaction.
 */
ydn.db.Streamer.prototype.setTx = function(tx) {
  if (tx.db) {
    var idb_tx = /** @type {!IDBTransaction} */ (tx);
    this.cursor_ = new ydn.db.con.IdbCursorStream(idb_tx,
        this.store_name_, this.index_name_, goog.bind(this.collector_, this));
  } else {
    throw new ydn.debug.error.ArgumentException(
        'Invalid IndexedDB Transaction.');
  }

};


/**
 * Push the result because a result is ready. This will push until stack
 * is empty.
 * @private
 */
ydn.db.Streamer.prototype.push_ = function() {
  var on_queue = this.stack_value_.length > 0;
  if (on_queue && !this.is_collecting_ && goog.isFunction(this.sink_)) {

    var me = this;
    var waiter = function() {
      me.push_();
    };
    var key = this.stack_key_.shift();
    var value = this.stack_value_.shift();
    on_queue = this.stack_value_.length > 0;
    var to_wait = this.sink_(key, value, on_queue ? waiter : null);
    if (on_queue && !to_wait) {
      this.push_();
    }
  }

};


/**
 *
 * @type {boolean} Flag to indicate collection.
 * @private
 */
ydn.db.Streamer.prototype.is_collecting_ = false;


/**
 * Collect results.
 * During collecting results, sink will not pop to the result. Pushing is
 * disable.
 * @param {Function} callback a callback function to receive the result array.
 * @throws ydn.ArgumentException if sink function is set.
 */
ydn.db.Streamer.prototype.collect = function(callback) {
  if (this.cursor_) {
    this.is_collecting_ = true;
    var me = this;
    this.cursor_.onFinish(function on_finish(e) {
      callback(me.stack_key_, me.stack_value_);
      me.stack_key_ = [];
      me.stack_value_ = [];
      me.is_collecting_ = false;
    });
  } else {
    // throw new ydn.error.InvalidOperationError('Not collected.');
    // goog.log.warning(this.logger, 'Not collected yet.');
    callback(this.stack_key_, this.stack_value_);
    this.stack_key_ = [];
    this.stack_value_ = [];
  }

};


/**
 * Callback on finished.
 * @return {!goog.async.Deferred}
 */
ydn.db.Streamer.prototype.done = function() {
  if (this.cursor_) {
    var df = new goog.async.Deferred();
    var me = this;
    this.cursor_.onFinish(function on_finish(e) {
      df.callback(me.stack_value_);
    });
    return df;
  } else {
    return goog.async.Deferred.succeed(this.stack_value_);
  }
};


/**
 * Collect value from cursor stream.
 * @param {*} key
 * @param {*} value
 * @private
 */
ydn.db.Streamer.prototype.collector_ = function(key, value) {
  this.stack_key_.push(key);
  this.stack_value_.push(value);
  this.push_();
};


/**
 * Push a key.
 * @param {*} key key to seek the value.
 * @param {*=} value if already got the value.
 * @throws {ydn.error.InvalidOperationError}
 */
ydn.db.Streamer.prototype.push = function(key, value) {
  if (this.is_collecting_) {
    var msg = goog.DEBUG ? 'push not allowed after a collection is started' : '';
    throw new ydn.error.InvalidOperationError(msg);
  }
  if (arguments.length >= 2) {
    this.collector_(key, value);
  } else {
    // we have to create cursor_ object lazily because, at the time of
    // instantiation, database may not have connected yet.
    if (!this.cursor_) {
      if (!this.db_) {
        throw new ydn.error.InvalidOperationError(
            'Database connection is not setup.');
      }
      var type = this.db_.getType();
      if (!type) {
        throw new ydn.error.InvalidOperationError(
            'Database is not connected.');
      } else if (type === ydn.db.base.Mechanisms.IDB) {
        this.cursor_ = new ydn.db.con.IdbCursorStream(this.db_,
            this.store_name_, this.index_name_,
            goog.bind(this.collector_, this));
      } else {
        throw new ydn.error.NotImplementedException(type);
      }
    }

    this.cursor_.seek(key);
  }
};


/**
 * Extract key from the parent iterator and push.
 * @param key
 * @param value
 */
ydn.db.Streamer.prototype.pull = function(key, value) {

  if (!goog.isDef(this.foreign_key_index_name_)) {
    this.push(key);
  } else if (this.key_only_) {
    this.push(value); // index key
  } else {
    if (goog.isDefAndNotNull(value)) {
      this.push(value[this.foreign_key_index_name_]);
    } else {
      this.push(undefined, undefined);
    }

  }
};


/**
 * @type {string}
 * @private
 */
ydn.db.Streamer.prototype.foreign_key_store_name_;


/**
 * @type {string|undefined}
 * @private
 */
ydn.db.Streamer.prototype.foreign_key_index_name_;


/**
 *
 * @param {string} store_name
 * @param {string=} index_name
 */
ydn.db.Streamer.prototype.setRelation = function(store_name, index_name) {
  this.foreign_key_store_name_ = store_name;
  this.foreign_key_index_name_ = index_name;
};


/**
 * Both of them may be undefined.
 * @return {!Array.<string>} return store_name and index_name.
 */
ydn.db.Streamer.prototype.getRelation = function() {
  return [this.foreign_key_store_name_, this.foreign_key_index_name_];
};


/**
 *
 * @return {string} return store name.
 */
ydn.db.Streamer.prototype.getStoreName = function() {
  return this.store_name_;
};


/**
 *
 * @return {string|undefined} return store name.
 */
ydn.db.Streamer.prototype.getIndexName = function() {
  return this.index_name_;
};


if (goog.DEBUG) {
  /**
   * @override
   */
  ydn.db.Streamer.prototype.toString = function() {
    return 'Streamer:' + this.store_name_ + (this.index_name_ || '');
  };
}

