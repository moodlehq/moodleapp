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
 * @fileoverview Cursor stream accept pirmary key and pop reference value to
 * a sink.
 *
 * User: kyawtun
 * Date: 11/11/12
 */

goog.provide('ydn.db.con.IdbCursorStream');
goog.require('goog.log');
goog.require('ydn.db.con.ICursorStream');
goog.require('ydn.db.con.IStorage');



/**
 *
 * @param {!ydn.db.con.IStorage|!IDBTransaction} db
 * @param {string} store_name store name.
 * @param {string|undefined} index_name index name.
 * @param {Function} sink to receive value.
 * @constructor
 * @implements {ydn.db.con.ICursorStream}
 */
ydn.db.con.IdbCursorStream = function(db, store_name, index_name, sink) {
  if ('transaction' in db) {
    this.db_ = /** @type {ydn.db.con.IStorage} */ (db);
    this.idb_ = null;
    this.tx_ = null;
  } else if ('objectStore' in db) { //  IDBTransaction
    var tx = /** @type {IDBTransaction} */ (db);
    this.db_ = null;
    this.idb_ = tx.db;
    this.tx_ = tx;
    if (goog.DEBUG && !this.tx_.db.objectStoreNames.contains(store_name)) {
      throw new ydn.error.ArgumentException('store "' + store_name +
          '" not in transaction.');
    }
  } else {
    throw new ydn.error.ArgumentException('storage instance require.');
  }

  this.store_name_ = store_name;
  this.index_name_ = index_name;
  this.sink_ = sink;
  this.cursor_ = null;
  /**
   *
   * @type {!Array}
   * @private
   */
  this.stack_ = [];
  this.running_ = 0;
  this.on_tx_request_ = false;
};


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.con.IdbCursorStream.prototype.logger =
    goog.log.getLogger('ydn.db.con.IdbCursorStream');


/**
 * @type {ydn.db.con.IStorage}
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.db_;


/**
 * @type {IDBTransaction}
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.tx_;


/**
 * @type {IDBDatabase}
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.idb_;


/**
 *
 * @type {boolean}
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.on_tx_request_ = false;


/**
 * @type {string}
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.store_name_;


/**
 * @type {string|undefined}
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.index_name_;


/**
 * @type {Function}
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.sink_;


/**
 *
 * @return {boolean}
 */
ydn.db.con.IdbCursorStream.prototype.isIndex = function() {
  return goog.isDefAndNotNull(this.index_name_);
};


/**
 * Read cursor.
 * @param {!IDBRequest} req
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.processRequest_ = function(req) {

  // here very careful with circular dependency.
  // req object is own by transaction which in turn own by the browser (global)
  // we don't want to keep reference to req.
  // we keep reference to cursor instead.
  // even if we don't keep the req, this req.onsuccess and req.onerror callbacks
  // are still active when cursor invoke advance method.

  this.running_ ++;
  var me = this;
  req.onsuccess = function(ev) {
    var cursor = ev.target.result;
    if (cursor) {
      if (goog.isFunction(me.sink_)) {
        //console.log(cursor);
        var cursor_value = cursor['value'];
        var value = me.isIndex() ? cursor_value[me.index_name_] : cursor_value;
        me.sink_(cursor.primaryKey, value);
      } else {
        goog.log.warning(me.logger, 'sink gone, dropping value for: ' +
            cursor.primaryKey);
      }
      if (cursor && me.stack_.length > 0) {
        cursor['continue'](me.stack_.shift());
      } else {
        me.running_ --;
        me.clearStack_();
      }
    }
  };
  req.onerror = function(ev) {
    var msg = 'error' in req ?
        req['error'].name + ':' + req['error'].message : '';
    goog.log.warning(me.logger, 'seeking fail. ' + msg);
    me.running_ --;
    me.clearStack_();
  };
};


/**
 * Collect result.
 * @param {Function} callback
 */
ydn.db.con.IdbCursorStream.prototype.onFinish = function(callback) {
  if (this.stack_.length == 0 && this.running_ == 0) {
    callback(); // we have nothing.
  } else {
    this.collector_ = callback;
  }
};


/**
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.createRequest_ = function() {

  if (this.on_tx_request_) {
    return; // else: we should not request more than on transaction request
  }

  var me = this;
  var on_completed = function(type, ev) {
    me.tx_ = null;
    if (type !== ydn.db.base.TxEventTypes.COMPLETE) {
      goog.log.warning(me.logger, ev.name + ':' + ev.message);
    }
    goog.log.finest(me.logger,  me + ' transaction ' + type);
  };

  /**
   *
   * @param {IDBTransaction} tx active tx.
   */
  var doRequest = function(tx) {
    var key = me.stack_.shift();
    goog.log.finest(me.logger,  me + ' transaction started for ' + key);
    var store = tx.objectStore(me.store_name_);
    /**
     * We cannot use index here, because index is useful to loopup from
     * index key to primary key. Here we need to lookup from primary key
     * to index key.
     */
//    if (goog.isString(me.index_name_)) {
//      var indexNames = /** @type {DOMStringList} */ (store['indexNames']);
//      if (goog.DEBUG && !indexNames.contains(me.index_name_)) {
//        throw new ydn.db.InvalidStateError('object store ' + me.store_name_ +
//            ' does not have require index ' + me.index_name_);
//      }
//      var index = store.index(me.index_name_);
//      me.processRequest_(index.openKeyCursor(key));
//    } else {
      // as of v1, ObjectStore do not have openKeyCursor method.
      // filed bug on:
      // http://lists.w3.org/Archives/Public/public-webapps/2012OctDec/0466.html
      me.processRequest_(store.openCursor(key));
    //}
  };

  if (this.tx_) {
    goog.log.finest(me.logger,  me + ' using existing tx.');
    doRequest(this.tx_);
  } else if (this.idb_) {
    goog.log.finest(me.logger,  me + ' creating tx from IDBDatabase.');
    this.tx = this.idb_.transaction([this.store_name_],
        ydn.db.base.TransactionMode.READ_ONLY);
    this.tx.oncomplete = function(event) {
      on_completed(ydn.db.base.TxEventTypes.COMPLETE, event);
    };

    this.tx.onerror = function(event) {
      on_completed(ydn.db.base.TxEventTypes.ERROR, event);
    };

    this.tx.onabort = function(event) {
      on_completed(ydn.db.base.TxEventTypes.ABORT, event);
    };
  } else if (this.db_) {
    goog.log.finest(me.logger,  me + ' creating tx from ydn.db.con.IStorage.');
    this.on_tx_request_ = true;
    this.db_.transaction(function(tx) {
      me.on_tx_request_ = false;
      //console.log(tx)
      doRequest(tx);
    }, [me.store_name_], ydn.db.base.TransactionMode.READ_ONLY, on_completed);
  } else {
    var msg = goog.DEBUG ? 'no way to create a transaction provided.' : '';
    throw new ydn.error.InternalError(msg);
  }

};


/**
 * Clear stack.
 * @private
 */
ydn.db.con.IdbCursorStream.prototype.clearStack_ = function() {
  if (this.cursor_ && this.stack_.length > 0) {
    // we retain only valid request with active cursor.
    this.cursor_['continue'](this.stack_.shift());
  } else {
    if (this.running_ == 0) {
      if (this.collector_) {
        this.collector_();
      }
    }
  }
};


/**
 * Request to seek to a key.
 * @param key
 */
ydn.db.con.IdbCursorStream.prototype.seek = function (key) {
  this.stack_.push(key);

  this.createRequest_();

};

