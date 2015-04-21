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
 * @fileoverview IndexedDB request executor.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.crud.req.IndexedDb');
goog.require('goog.async.DeferredList');
goog.require('goog.userAgent');
goog.require('ydn.db.crud.req.IRequestExecutor');
goog.require('ydn.db.crud.req.RequestExecutor');
goog.require('ydn.debug.error.InvalidOperationException');
goog.require('ydn.error');
goog.require('ydn.json');



/**
 * Create a new IDB request executor.
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @extends {ydn.db.crud.req.RequestExecutor}
 * @implements {ydn.db.crud.req.IRequestExecutor}
 * @struct
 */
ydn.db.crud.req.IndexedDb = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.crud.req.IndexedDb, ydn.db.crud.req.RequestExecutor);


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.crud.req.IndexedDb.prototype.logger =
    goog.log.getLogger('ydn.db.crud.req.IndexedDb');


/**
 *
 * @const {boolean} turn on debug flag to dump debug objects.
 */
ydn.db.crud.req.IndexedDb.DEBUG = false; // always false here.


/**
 * Large number of requests can cause memory hog without increasing performance.
 * @const
 * @type {number} Maximum number of requests created per transaction.
 */
ydn.db.crud.req.IndexedDb.REQ_PER_TX = 10;


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.countStores = function(req, stores) {

  var me = this;
  var out = [];

  var count_store = function(i) {
    var table = stores[i];
    var store = req.getTx().objectStore(table);
    var request = store.count();
    request.onsuccess = function(event) {
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        goog.global.console.log(event);
      }
      out[i] = event.target.result;
      i++;
      if (i == stores.length) {
        req.setDbValue(out);
      } else {
        count_store(i);
      }

    };
    request.onerror = function(event) {
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        goog.global.console.log(event);
      }
      event.preventDefault();
      req.setDbValue(request.error, true);
    };
  };

  if (stores.length == 0) {
    req.setDbValue([]);
  } else {
    count_store(0);
  }

};


/**
 * Put objects and return list of key inserted.
 * @param {ydn.db.Request} rq request.
 * @param {boolean} is_replace true if `put`, otherwise `add`.
 * @param {boolean} is_single true if result take only the first result.
 * @param {string} store_name store name.
 * @param {!Array.<!Object>} objs object to put.
 * @param {!Array.<IDBKey>=} opt_keys optional out-of-line keys.
 */
ydn.db.crud.req.IndexedDb.prototype.insertObjects = function(rq, is_replace,
    is_single, store_name, objs, opt_keys) {

  var results = [];
  var result_count = 0;
  var has_error = false;

  var me = this;
  var mth = is_replace ? 'put' : 'add';
  var ob_store = rq.getTx().objectStore(store_name);
  var msg = rq.getLabel() + ' ' + mth + ' ' + objs.length + ' objects' +
      ' to store "' + store_name + '"';
  goog.log.finest(this.logger, msg);

  var put = function(i) {

    if (!goog.isDefAndNotNull(objs[i])) {
      goog.log.finest(me.logger, 'empty object at ' + i + ' of ' + objs.length);
      result_count++;
      if (result_count == objs.length) {
        rq.setDbValue(results, has_error);
      } else {
        var next = i + ydn.db.crud.req.IndexedDb.REQ_PER_TX;
        if (next < objs.length) {
          put(next);
        }
      }
    }

    var request;

    var obj = objs[i];
    if (opt_keys && goog.isDefAndNotNull(opt_keys[i])) {
      if (is_replace) {
        request = ob_store.put(obj, opt_keys[i]);
      } else {
        request = ob_store.add(obj, opt_keys[i]);
      }
    } else {
      if (is_replace) {
        request = ob_store.put(obj);
      } else {
        request = ob_store.add(obj);
      }
    }

    request.onsuccess = function(event) {
      result_count++;
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        goog.global.console.log([store_name, event, i]);
      }
      results[i] = event.target.result;
      if (result_count == objs.length) {
        rq.setDbValue(is_single ? results[0] : results, has_error);
      } else {
        var next = i + ydn.db.crud.req.IndexedDb.REQ_PER_TX;
        if (next < objs.length) {
          put(next);
        }
      }
    };

    request.onerror = function(event) {
      result_count++;
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        goog.global.console.log([store_name, event, i]);
      }
      var error = request.error;
      goog.log.finest(me.logger,  rq.getLabel() + mth + ' request to "' + store_name +
          '" cause ' + error.name + ' for object "' +
          ydn.json.toShortString(objs[i]) + '" at index ' +
          i + ' of ' + objs.length + ' objects.');
      // accessing request.error can cause InvalidStateError,
      // although it is not possible here since request has already done flag.
      // http://www.w3.org/TR/IndexedDB/#widl-IDBRequest-error
      results[i] = error;
      has_error = true;
      event.preventDefault(); // not abort the transaction.
      if (result_count == objs.length) {
        rq.setDbValue(is_single ? results[0] : results, has_error);
      } else {
        var next = i + ydn.db.crud.req.IndexedDb.REQ_PER_TX;
        if (next < objs.length) {
          put(next);
        }
      }
    };

  };

  if (objs.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.crud.req.IndexedDb.REQ_PER_TX &&
        i < objs.length; i++) {
      put(i);
    }
  } else {
    rq.setDbValue([]);
  }
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.putByKeys = function(rq, objs,
                                                         keys) {

  var results = [];
  var result_count = 0;
  var has_error = false;

  var out = function() {
    rq.setDbValue(results, has_error);
  };

  var me = this;

  var msg = rq.getLabel() + ' putByKeys: of ' + objs.length + ' objects';
  goog.log.finest(this.logger, msg);

  var put = function(i) {
    /**
     * @type {!ydn.db.Key}
     */
    var key = keys[i];
    var store_name = key.getStoreName();
    var store = rq.getTx().objectStore(store_name);

    var request;

    if (goog.isNull(store.keyPath)) {
      request = store.put(objs[i], key.getId());
    } else {
      request = store.put(objs[i]);
    }

    request.onsuccess = function(event) {
      result_count++;
      //if (ydn.db.crud.req.IndexedDb.DEBUG) {
      //  goog.global.console.log([store_name, event]);
      //}
      results[i] = event.target.result;
      if (result_count == objs.length) {
        out();
      } else {
        var next = i + ydn.db.crud.req.IndexedDb.REQ_PER_TX;
        if (next < objs.length) {
          put(next);
        }
      }
    };

    request.onerror = function(event) {
      result_count++;
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        goog.global.console.log([store_name, event]);
      }
      var name = event.name;
      if (goog.DEBUG) {
        goog.log.warning(me.logger, 'request result ' + name +
            ' error when put keys to "' + store_name + '" for object "' +
            ydn.json.toShortString(objs[i]) + '" at index ' +
            i + ' of ' + objs.length + ' objects.');
      }
      results[i] = request.error;
      has_error = true;
      event.preventDefault();
      if (result_count == objs.length) {
        out();
      } else {
        var next = i + ydn.db.crud.req.IndexedDb.REQ_PER_TX;
        if (next < objs.length) {
          put(next);
        }
      }
    };

  };

  if (objs.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.crud.req.IndexedDb.REQ_PER_TX &&
        i < objs.length; i++) {
      put(i);
    }
  } else {
    out();
  }
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.putData = function(tx, tx_no, df,
    store_name, data, delimiter) {
  var me = this;
  var store = this.schema.getStore(store_name);
  var objectStore = tx.objectStore(store_name);
  var results = [];
  var prev_pos = data.indexOf('\n');
  var fields = data.substr(0, prev_pos).split(delimiter);
  var types = [];
  for (var j = 0; j < fields.length; j++) {
    var index = store.getIndex(fields[j]);
    if (index) {
      types[j] = index.getType();
    } else if (fields[j] == store.getKeyPath()) {
      types[j] = store.getType();
    }
  }
  prev_pos++;

  var msg = tx_no + ' Loading data ' + ' of ' + fields.length +
      '-fields record to ' + store_name;
  goog.log.finest(this.logger, msg);

  var put = function() {

    var obj = {};
    var next_pos = data.indexOf('\n', prev_pos);
    var done = false;
    var text;
    if (next_pos == -1) {
      done = true;
      text = data.substring(prev_pos);
    } else {
      text = data.substring(prev_pos, next_pos);
      prev_pos = next_pos + 1;
    }

    var values = text.split(delimiter);
    for (var j = 0; j < fields.length; j++) {
      var value = values[j];
      if (types[j]) {
        if (types[j] == ydn.db.schema.DataType.TEXT) {
          value = goog.string.stripQuotes(value, '"');
        } else if (types[j] == ydn.db.schema.DataType.INTEGER) {
          value = parseInt(value, 10);
        } else if (types[j] == ydn.db.schema.DataType.NUMERIC) {
          value = parseFloat(value);
        }
      }
      obj[fields[j]] = value;
    }

    //console.log([text, obj]);

    var request = objectStore.put(obj);

    request.onsuccess = function(event) {

      //if (ydn.db.crud.req.IndexedDb.DEBUG) {
      //  goog.global.console.log([store_name, event]);
      //}
      results.push(event.target.result);
      if (done) {
        df(results);
      } else {
        put();
      }
    };

    request.onerror = function(event) {

      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        goog.global.console.log([store_name, event]);
      }
      if (goog.DEBUG && event.name == 'DataError') {
        // give useful info.
        event = new ydn.db.InvalidKeyException(store + ': ' +
            text.substring(0, 70));
      }
      event.preventDefault();
      df(request.error, true);
      // abort transaction ?
    };

  };

  put();
};


/**
* @inheritDoc
*/
ydn.db.crud.req.IndexedDb.prototype.removeById = function(req,
                                                          store_name, key) {

  var me = this;
  var store = req.getTx().objectStore(store_name);
  var msg = req.getLabel() + ' clearById: ' + store_name + ' ' + key;
  goog.log.finest(this.logger, msg);

  var request = store.openCursor(ydn.db.IDBKeyRange.only(key));
  request.onsuccess = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      goog.global.console.log([store_name, key, event]);
    }
    var cursor = event.target.result;
    if (cursor) {
      var r = cursor['delete']();
      r.onsuccess = function(e) {
        req.setDbValue(1);
      };
      r.onerror = function(e) {
        req.setDbValue(r.error, true);
      };
    } else {
      req.setDbValue(0);
    }

  };
  request.onerror = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      goog.global.console.log([store_name, key, event]);
    }
    event.preventDefault();
    req.setDbValue(request.error, true);
  };

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.removeByKeys = function(req, keys) {

  var me = this;
  var count = 0;
  var store_name, store, key;
  var msg = req.getLabel() + ' removeByKeys: ' + keys.length + ' keys';
  goog.log.finest(this.logger, msg);
  var errors = [];

  var removeAt = function(i) {
    i++;
    if (i >= keys.length) {
      var has_failed = errors.length > 0;
      if (has_failed) {
        req.setDbValue(errors, true);
      } else {
        req.setDbValue(count);
      }
      return;
    }

    if (keys[i].getStoreName() != store_name) {
      store_name = keys[i].getStoreName();
      store = req.getTx().objectStore(store_name);
    }

    var request = store['delete'](keys[i].getId());

    request.onsuccess = function(event) {
      count++;
      removeAt(i);
    };
    request.onerror = function(event) {
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        goog.global.console.log([store_name, key, event]);
      }
      event.preventDefault();
      errors[i] = request.error;
      removeAt(i);
    };
  };

  removeAt(-1);

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.removeByKeyRange = function(
    req, store_name, key_range) {

  var me = this;
  var store = req.getTx().objectStore(store_name);
  var request = store.count(key_range);
  var msg = req.getLabel() + ' clearByKeyRange: ' + store_name + ' ' +
      key_range;
  goog.log.finest(this.logger, msg);
  request.onsuccess = function(event) {
    var n = event.target.result;
    var r = store['delete'](key_range);
    r.onsuccess = function() {
      req.setDbValue(n);
    };
    r.onerror = function(e) {
      req.setDbValue(r.error, true);
    };
  };
  request.onerror = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      goog.global.console.log([store_name, key_range, event]);
    }
    event.preventDefault();
    req.setDbValue(request.error, true);
  };

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.clearByKeyRange = function(
    req, store_name, key_range) {

  var me = this;
  var store = req.getTx().objectStore(store_name);

  var msg = req.getLabel() + ' ' + store_name + ' ' + key_range;
  goog.log.finest(this.logger, msg);

  var r = store['delete'](key_range);
  r.onsuccess = function(event) {
    req.setDbValue(undefined);
  };
  r.onerror = function(event) {
    event.preventDefault();
    req.setDbValue(r.error, true);
  };

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.removeByIndexKeyRange = function(
    req, store_name, index_name, key_range) {

  var me = this;
  var store = req.getTx().objectStore(store_name);
  var index = store.index(index_name);
  var msg = req.getLabel() + ' clearByIndexKeyRange: ' + store_name + ':' +
      index_name + ' ' + key_range;
  goog.log.finest(this.logger, msg);
  var errors = [];
  // var request = index.openKeyCursor(key_range);
  // theoritically key cursor should be able to delete the record, but
  // according to IndexedDB API spec, it is not.
  // if this cursor was created using openKeyCursor a DOMException of type
  // InvalidStateError is thrown.
  var request = index.openCursor(key_range);
  var n = 0;
  request.onsuccess = function(event) {
    var cursor = event.target.result;
    if (cursor) {
      //console.log(cursor);
      var r = cursor['delete']();
      r.onsuccess = function() {
        n++;
        cursor['continue']();
      };
      r.onerror = function(event) {
        errors.push(r.error);
        event.preventDefault();
        cursor['continue']();
      };
    } else {
      var has_failed = errors.length > 0;
      if (has_failed) {
        req.setDbValue(errors, true);
      } else {
        req.setDbValue(n);
      }
    }

  };
  request.onerror = function(event) {
    event.preventDefault();
    req.setDbValue(request.error, true);
  };

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.clearByStores = function(req, store_names) {

  var me = this;
  var n_todo = store_names.length;
  var n_done = 0;
  var msg = req.getLabel() + ' clearByStores: ' + store_names;
  goog.log.finest(this.logger, msg);
  for (var i = 0; i < n_todo; i++) {
    var store_name = store_names[i];
    var store = req.getTx().objectStore(store_name);
    var request = store.clear();
    request.onsuccess = function(event) {
      n_done++;
      // if (ydn.db.crud.req.IndexedDb.DEBUG) {
      //   goog.global.console.log([n_done, event]);
      // }
      if (n_done == n_todo) {
        req.setDbValue(n_done);
      }
    };
    request.onerror = function(event) {
      n_done++;
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        goog.global.console.log([n_done, event]);
      }
      event.preventDefault();
      if (n_done == n_todo) {
        req.setDbValue(request.error, true);
      }
    };
  }
};


/**
* @inheritDoc
*/
ydn.db.crud.req.IndexedDb.prototype.getById = function(req, store_name, id) {

  var me = this;
  var msg = req.getLabel() + store_name + ':' + id;
  goog.log.finest(this.logger, msg);
  var store = req.getTx().objectStore(store_name);

  var request = store.get(id);

  request.onsuccess = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      goog.global.console.log([store_name, id, event]);
    }
    goog.log.finest(me.logger,  req.getLabel() + ' record ' + id +
        (goog.isDefAndNotNull(event.target.result) ? ' ' : ' not ') +
        ' exists.');
    // check for decode blob, since chrome does not support blob
    var BASE64_MARKER = ';base64,';
    var s = event.target.result;
    if (!store.keyPath && store.indexNames.length == 0 &&
        goog.userAgent.WEBKIT && goog.isString(s) &&
        s.indexOf(BASE64_MARKER) >= 0) {
      if (s.charAt(0) == '"' && s.charAt(s.length - 1) == '"') {
        s = s.substr(1, s.length - 2);
      }
      var parts = s.split(BASE64_MARKER);
      var contentType = parts[0].split(':')[1];
      var raw = window.atob(parts[1]);
      var rawLength = raw.length;

      var uInt8Array = new Uint8Array(rawLength);

      for (var i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }

      var blob = new Blob([uInt8Array.buffer], {type: contentType});
      req.setDbValue(blob);
    } else {
      req.setDbValue(event.target.result);
    }
  };

  request.onerror = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      goog.global.console.log([store_name, id, event]);
    }
    //goog.log.warning(me.logger, 'Error retrieving ' + id + ' in ' + store_name + ' ' +
    // event.message);
    event.preventDefault();
    req.setDbValue(request.error, true);
  };
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.listByIds = function(req,
                                                         store_name, ids) {
  var me = this;

  var results = [];
  results.length = ids.length;
  var result_count = 0;
  var store = req.getTx().objectStore(store_name);
  var n = ids.length;
  var msg = req.getLabel() + ' ' + store_name + ':' + n + ' ids';
  goog.log.finest(this.logger, msg);

  var get = function(i) {

    if (!goog.isDefAndNotNull(ids[i])) {
      // should we just throw error ?
      result_count++;
      results[i] = undefined;
      if (result_count == n) {
        req.setDbValue(results);
      } else {
        var next = i + ydn.db.crud.req.IndexedDb.REQ_PER_TX;
        if (next < n) {
          get(next);
        }
      }
    }

    var request;
//    try {
    // console.log(tx_no + ': ' + store_name + ' ' + i + ' ' + ids[i])
    request = store.get(ids[i]);
//    } catch (e) {
//      if (ydn.db.crud.req.IndexedDb.DEBUG) {
//        goog.global.console.log([store_name, i, ids[i], e]);
//        if (e.name == 'DataError') {
//          // http://www.w3.org/TR/IndexedDB/#widl-IDBObjectStore-get-
//          // IDBRequest-any-key
//          throw new ydn.db.InvalidKeyException(ids[i]);
//        } else {
//          throw e;
//        }
//      }
//    }
    request.onsuccess = (function(event) {
      result_count++;
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        goog.global.console.log([store_name, ids, i, event]);
      }
      results[i] = event.target.result;
      if (result_count == n) {
        req.setDbValue(results);
      } else {
        var next = i + ydn.db.crud.req.IndexedDb.REQ_PER_TX;
        if (next < n) {
          get(next);
        }
      }
    });

    request.onerror = function(event) {
      result_count++;
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        goog.global.console.log([store_name, ids, i, event]);
      }
      event.preventDefault();
      req.setDbValue(request.error, true);
    };

  };

  if (n > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.crud.req.IndexedDb.REQ_PER_TX && i < n; i++) {
      get(i);
    }
  } else {
    req.setDbValue([]);
  }
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.listByKeys = function(req, keys) {
  var me = this;

  var results = [];
  results.length = keys.length;
  var result_count = 0;
  var msg = req.getLabel() + ' ' + keys.length + ' ids';
  goog.log.finest(this.logger, msg);

  var getKey = function(i) {
    /**
     * @type {!ydn.db.Key}
     */
    var key = keys[i];
    /**
     * @type {IDBObjectStore}
     */
    var store = req.getTx().objectStore(key.getStoreName());
    var request = store.get(key.getId());

    request.onsuccess = function(event) {
      result_count++;
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        goog.global.console.log(event);
      }
      results[i] = event.target.result;
      if (result_count == keys.length) {
        req.setDbValue(results);
      } else {
        var next = i + ydn.db.crud.req.IndexedDb.REQ_PER_TX;
        if (next < keys.length) {
          getKey(next);
        }
      }
    };

    request.onerror = function(event) {
      result_count++;
      if (ydn.db.crud.req.IndexedDb.DEBUG) {
        goog.global.console.log([keys, event]);
      }
      event.preventDefault();
      req.setDbValue(request.error, true);
    };

  };

  if (keys.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.crud.req.IndexedDb.REQ_PER_TX && i < keys.length;
         i++) {
      getKey(i);
    }
  } else {
    req.setDbValue([]);
  }
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.countKeyRange = function(req,
    table, keyRange, index_name, unique) {

  if (goog.DEBUG && !!index_name && !!unique) {
    throw new ydn.debug.error.InvalidOperationException(
        'unique count not available in IndexedDB');
  }

  var me = this;
  var store = req.getTx().objectStore(table);
  var msg = req.getLabel() + ' ' + table +
      (index_name ? ':' + index_name : '') +
      (keyRange ? ':' + ydn.json.stringify(keyRange) : '');
  goog.log.finest(this.logger, msg);
  var request;
  if (goog.isDefAndNotNull(index_name)) {
    var index = store.index(index_name);
    if (goog.isDefAndNotNull(keyRange)) {
      request = index.count(keyRange);
    } else {
      request = index.count();
    }
  } else {
    if (goog.isDefAndNotNull(keyRange)) {
      request = store.count(keyRange);
    } else {
      request = store.count();
    }
  }

  request.onsuccess = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      goog.global.console.log(event);
    }
    req.setDbValue(event.target.result);
  };
  request.onerror = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      goog.global.console.log(event);
    }
    event.preventDefault();
    req.setDbValue(request.error, true);
  };

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.IndexedDb.prototype.list = function(req, type,
    store_name, index, key_range, limit, offset, reverse, unique,
    opt_position) {
  var results = [];
  var store = req.getTx().objectStore(store_name);
  var dir = ydn.db.base.getDirection(reverse, unique);
  var msg = req.getLabel() + ' ' + type + ' ' + store_name +
      (index ? ':' + index : '') +
      (key_range ? ydn.json.stringify(key_range) : '');
  if (reverse) {
    msg += ' reverse';
  }
  if (unique) {
    msg += ' unique';
  }
  if (!!opt_position && goog.isDef(opt_position[0])) {
    // start position is given, cursor must open after this position.
    var open = index ? !(goog.isDef(opt_position[1])) : true;
    var s_key = /** @type {IDBKey} */ (opt_position[0]);
    var lower = /** @type {IDBKey|undefined} */ (key_range ?
        key_range.lower : undefined);
    var upper = /** @type {IDBKey|undefined} */ (key_range ?
        key_range.upper : undefined);
    var lowerOpen = key_range ? !!key_range.lowerOpen : false;
    var upperOpen = key_range ? !!key_range.upperOpen : false;
    var kr = reverse ?
        new ydn.db.KeyRange(lower, s_key, lowerOpen, open) :
        new ydn.db.KeyRange(s_key, upper, open, upperOpen);
    key_range = kr.toIDBKeyRange();
    msg += ' starting from ' +
        ydn.json.stringify(/** @type {Object} */ (opt_position[0]));
    if (goog.isDef(opt_position[1])) {
      msg += ', ' + ydn.json.stringify(/** @type {Object} */ (opt_position[1]));
    }
  }
  goog.log.finest(this.logger, msg);
  var request;
  if (type == ydn.db.base.QueryMethod.LIST_KEY ||
      type == ydn.db.base.QueryMethod.LIST_PRIMARY_KEY ||
      type == ydn.db.base.QueryMethod.LIST_KEYS) {
    // key query
    if (index) {
      request = store.index(index).openKeyCursor(key_range, dir);
    } else {
      // NOTE: key cursor for object is not available as of IndexedDB API v1.
      request = store.openCursor(key_range, dir);
    }
  } else {
    // value query
    if (index) {
      request = store.index(index).openCursor(key_range, dir);
    } else {
      request = store.openCursor(key_range, dir);
    }
  }

  var cued = false;
  request.onsuccess = function(event) {
    /**
     *
     * @type {IDBCursorWithValue}
     */
    var cursor = event.target.result;
    if (cursor) {
      if (!cued) {
        if (offset > 0) {
          // if offset is defined, position will be ignored.
          cued = true;
          cursor.advance(offset);
          return;
        } else if (!!opt_position && !!index && goog.isDef(opt_position[0])) {
          if (goog.isDef(opt_position[1])) {
            var cmp = ydn.db.base.indexedDb.cmp(cursor.key, opt_position[0]);
            var dir = reverse ? -1 : 1;
            if (cmp == 0) {
              var cmp2 = ydn.db.base.indexedDb.cmp(
                  cursor.primaryKey, opt_position[1]);
              // console.log('continue ' + cmp2 + ' ' +
              //    cursor.key + ', ' + cursor.primaryKey);
              if (cmp2 == 0) {
                cued = true;
                // console.log('cued by primary key');
                cursor['continue'](); // skip current key
                return;
              } else if (cmp2 == dir) {
                // console.log('cued by primary key passed over');
                cued = true;
              } else {
                // console.log('continue cueing');
                cursor['continue']();
                return;
              }
            } else {
              // console.log('cued by key ' + cursor.key + ' passed over');
              cued = true;
            }
          } else {
            // console.log('cued by key passed over without primary key');
            cued = true;
          }
        } else {
          cued = true;
        }
      }
      // push to result list
      if (type == ydn.db.base.QueryMethod.LIST_KEY) {
        results.push(cursor.key);
      } else if (type == ydn.db.base.QueryMethod.LIST_PRIMARY_KEY) {
        results.push(cursor.primaryKey);
      } else if (type ==
          ydn.db.base.QueryMethod.LIST_KEYS) {
        var obj = {};
        if (index) {
          obj[index] = cursor.key;
        }
        if (store.keyPath) {
          obj[store.keyPath] = cursor.primaryKey;
        } else {
          obj[ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME] = cursor.primaryKey;
        }
        results.push(obj);
      } else if (type ==
          ydn.db.base.QueryMethod.LIST_VALUE) {
        results.push(cursor.value);
      } else {
        results.push([cursor.key, cursor.primaryKey, cursor.value]);
      }
      // continue
      if (results.length < limit) {
        cursor['continue']();
      } else {
        if (opt_position) {
          opt_position[0] = ydn.db.Key.clone(cursor.key);
          opt_position[1] =
              ydn.db.Key.clone(/** @type {IDBKey} */ (cursor.primaryKey));
        }
        // console.log(req + ' by limit', results);
        req.setDbValue(results);
      }
    } else {
      if (opt_position) {
        opt_position[0] = undefined;
        opt_position[1] = undefined;
      }
      // console.log(req + ' by cursor', results);
      req.setDbValue(results);
    }
  };
  request.onerror = function(event) {
    if (ydn.db.crud.req.IndexedDb.DEBUG) {
      goog.global.console.log([store_name, event]);
    }
    event.preventDefault();
    req.setDbValue(request.error, true);
  };
};
