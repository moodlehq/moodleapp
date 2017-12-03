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
 * @fileoverview Data store in memory.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */



goog.provide('ydn.db.crud.req.SimpleStore');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('ydn.db.ConstraintError');
goog.require('ydn.db.con.simple.Store');
goog.require('ydn.db.con.simple.TxStorage');
goog.require('ydn.db.crud.req.IRequestExecutor');
goog.require('ydn.db.crud.req.RequestExecutor');



/**
 * @extends {ydn.db.crud.req.RequestExecutor}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.crud.req.IRequestExecutor}
 * @struct
 */
ydn.db.crud.req.SimpleStore = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.crud.req.SimpleStore, ydn.db.crud.req.RequestExecutor);


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.crud.req.SimpleStore.prototype.logger =
    goog.log.getLogger('ydn.db.crud.req.SimpleStore');


/**
 *
 * @define {boolean} use sync result.
 */
ydn.db.crud.req.SimpleStore.SYNC = true;


/**
 *
 * @type {boolean} debug flag. should always be false.
 */
ydn.db.crud.req.SimpleStore.DEBUG = false;


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.putByKeys = function(req, objs,
                                                           keys) {
  this.insertObjects(req, true, false, null, objs, keys);
};


/**
 * Put objects and return list of key inserted.
 * @param {ydn.db.Request} req request.
 * @param {boolean} is_update true if `put`, otherwise `add`.
 * @param {boolean} single true if result take only the first result.
 * @param {string?} store_name store name.
 * @param {!Array.<!Object>} value object to put.
 * @param {!Array.<IDBKey|ydn.db.Key>=} opt_key optional out-of-line keys.
 */
ydn.db.crud.req.SimpleStore.prototype.insertObjects = function(req,
    is_update, single, store_name, value, opt_key) {

  var label = req.getLabel() + ' ' + (is_update ? 'put' : 'add') +
      'Object' + (single ? '' : 's ' + value.length + ' objects');

  goog.log.finest(this.logger, label);
  var me = this;

  var tx = /** @type {ydn.db.con.simple.TxStorage} */ (req.getTx());
  var on_comp = tx.getStorage(function(storage) {
    var store;
    if (single) {
      goog.asserts.assertString(store_name, 'store name must be provided');
      store = storage.getSimpleStore(store_name);
      var key = /** @type {IDBKey|undefined} */ (opt_key ?
          opt_key[0] : undefined);
      key = store.addRecord(key, value[0], !is_update);
      if (goog.isDefAndNotNull(key)) {
        req.setDbValue(key);
      } else {
        var msg = goog.DEBUG ? ydn.json.toShortString(key) : '';
        var e = new ydn.db.ConstraintError(msg);
        req.setDbValue(e, true);
      }
    } else {
      var st = store_name;
      var arr = [];
      var has_error = false;
      var keys = opt_key || {};
      for (var i = 0; i < value.length; i++) {
        var id;
        if (!store_name) {
          /**
           * @type {ydn.db.Key}
           */
          var db_key = /** @type {ydn.db.Key} */ (opt_key[i]);
          id = db_key.getId();
          st = db_key.getStoreName();
        } else {
          id = keys[i];
        }
        if (!store || store.getName() != st) {
          goog.asserts.assertString(st, 'store name a string, but ' + st);
          store = storage.getSimpleStore(st);
        }
        var result_key = store.addRecord(id, value[i], !is_update);
        if (!goog.isDefAndNotNull(result_key)) {
          has_error = true;
          arr.push(new ydn.db.ConstraintError());
        } else {
          arr.push(result_key);
        }
      }
      req.setDbValue(arr, has_error);
    }
    on_comp();
    on_comp = null;
  }, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.putData = function(tx, tx_no, df,
    store_name, data, delimiter) {
  throw new ydn.debug.error.NotImplementedException('putData');
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.getById = function(req, store_name, id) {
  var onComp = req.getTx().getStorage(function(storage) {
    /**
     * @type  {!ydn.db.con.simple.Store}
     */
    var store = storage.getSimpleStore(store_name);
    var key = store.getRecord(null, id);
    req.setDbValue(key);
    onComp();
    onComp = null;
  }, this);
};


/**
 *
 * @param {ydn.db.Request} req request.
 * @param {string?} store_name table name.
 * @param {!Array.<(IDBKey|!ydn.db.Key)>} ids id to get.
 * @private
 */
ydn.db.crud.req.SimpleStore.prototype.listByIds_ = function(req,
                                                            store_name, ids) {
  var onComp = req.getTx().getStorage(function(storage) {
    var arr = [];
    var has_error = false;
    var st = store_name;
    /**
     * @type  {!ydn.db.con.simple.Store}
     */
    var store;

    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      if (id instanceof ydn.db.Key) {
        /**
         * @type {ydn.db.Key}
         */
        var db_key = id;
        id = db_key.getId();
        st = db_key.getStoreName();
      }
      if (!store || store.getName() != st) {
        store = storage.getSimpleStore(st);
      }
      var value = store.getRecord(null, id);
      // if (!goog.isDefAndNotNull(value)) {
      //  has_error = true;
      // }
      arr[i] = value;
    }

    req.setDbValue(arr, has_error);
    onComp();
    onComp = null;
  }, this);
};


/**
 *
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.listByIds = function(req,
                                                           store_name, ids) {
  this.listByIds_(req, store_name, ids);
};


/**
* @inheritDoc
*/
ydn.db.crud.req.SimpleStore.prototype.listByKeys = function(req, keys) {
  this.listByIds_(req, null, keys);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.removeById = function(req,
                                                            store_name, id) {
  var msg = req.getLabel() + ' removeById ' + store_name + ' ' + id;
  goog.log.finest(this.logger, msg);
  var me = this;
  var onComp = req.getTx().getStorage(function(storage) {
    var store = storage.getSimpleStore(store_name);
    var cnt = store.removeRecord(id);
    goog.log.finer(me.logger, 'success ' + msg + (cnt == 0 ? ' [not found]' : ''));
    req.setDbValue(cnt);
    onComp();
    onComp = null;
  }, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.removeByKeys = function(req, keys) {
  var msg = req.getLabel() + ' removeByKeys ' + keys.length + ' keys';
  goog.log.finest(this.logger, msg);
  var me = this;
  var store;
  var deleted = 0;
  var onComp = req.getTx().getStorage(function(storage) {
    for (var i = 0; i < keys.length; i++) {
      var store_name = keys[i].getStoreName();
      var id = keys[i].getId();
      if (!store || store.getName() != store_name) {
        store = storage.getSimpleStore(store_name);
      }
      deleted += store.removeRecord(id);
    }
    req.setDbValue(deleted);
    onComp();
    onComp = null;
  }, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.clearByKeyRange = function(
    req, store_name, key_range) {
  this.removeByKeyRange(req, store_name, key_range);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.removeByKeyRange = function(
    req, store_name, key_range) {
  var msg = req.getLabel() + ' removeByKeyRange ' +
      (key_range ? ydn.json.stringify(key_range) : '');
  goog.log.finest(this.logger, msg);
  var me = this;
  var onComp = req.getTx().getStorage(function(storage) {
    var store = storage.getSimpleStore(store_name);
    var cnt = store.removeRecords(key_range);
    goog.log.finer(me.logger, msg + ' deleted ' + cnt + ' records.');
    req.setDbValue(cnt);
    onComp();
    onComp = null;
  }, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.removeByIndexKeyRange = function(
    req, store_name, index_name, key_range) {
  var msg = req.getLabel() + ' removeByIndexKeyRange ' +
      (key_range ? ydn.json.stringify(key_range) : '');
  goog.log.finest(this.logger, msg);
  var me = this;
  var onComp = req.getTx().getStorage(function(storage) {
    var store = storage.getSimpleStore(store_name);
    var keys = store.getKeys(index_name, key_range);
    var cnt = keys.length;
    for (var i = 0; i < cnt; i++) {
      store.removeRecord(keys[i]);
    }
    req.setDbValue(cnt);
    onComp();
    onComp = null;
  }, this);
};


/**
 * @inheritDoc
*/
ydn.db.crud.req.SimpleStore.prototype.clearByStores = function(req,
                                                               store_names) {
  var msg = req.getLabel() + ' clearByStores';
  goog.log.finest(this.logger, msg);
  var onComp = req.getTx().getStorage(function(storage) {
    for (var i = 0; i < store_names.length; i++) {
      var store = storage.getSimpleStore(store_names[i]);
      store.clear();
    }
    goog.log.finer(this.logger, 'success ' + msg);
    req.setDbValue(store_names.length);
    onComp();
    onComp = null;
  }, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.countStores = function(req, store_names) {
  var onComp = req.getTx().getStorage(function(storage) {
    var arr = [];
    for (var i = 0; i < store_names.length; i++) {
      var store = storage.getSimpleStore(store_names[i]);
      arr.push(store.countRecords());
    }
    req.setDbValue(arr);
    onComp();
    onComp = null;
  }, this);

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.countKeyRange = function(req,
    store_name, keyRange, index_name) {
  var msg = req.getLabel() + ' count' +
      (goog.isDefAndNotNull(index_name) ? 'Index' : '') +
      (goog.isDefAndNotNull(keyRange) ? 'KeyRange' : 'Store');
  goog.log.finest(this.logger, msg);
  var onComp = req.getTx().getStorage(function(storage) {
    var store = storage.getSimpleStore(store_name);
    var no = store.countRecords(index_name, keyRange);
    goog.log.finer(this.logger, 'success ' + msg);
    req.setDbValue(no);
    onComp();
    onComp = null;
  }, this);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.SimpleStore.prototype.list = function(req, type, store_name,
    index, key_range, limit, offset, reverse, unique, opt_position) {
  var msg = req.getLabel() + ' ' + store_name + ' ' +
      (key_range ? ydn.json.toShortString(key_range) : '');
  goog.log.finest(this.logger, msg);
  var onComp = req.getTx().getStorage(function(storage) {
    var store = storage.getSimpleStore(store_name);
    var results = store.getItems(type, index, key_range,
        reverse, limit, offset, unique, opt_position);
    goog.log.finer(this.logger, msg + ' ' + results.length + ' records found.');
    req.setDbValue(results);
    onComp();
    onComp = null;
  }, this);
};
