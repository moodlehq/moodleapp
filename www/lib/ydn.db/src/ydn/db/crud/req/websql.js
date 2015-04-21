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
 * @fileoverview WebSQL executor.
 *
 * @see http://www.w3.org/TR/webdatabase/
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.crud.req.WebSql');
goog.require('goog.async.Deferred');
goog.require('goog.log');
goog.require('ydn.db.Where');
goog.require('ydn.db.crud.req.IRequestExecutor');
goog.require('ydn.db.crud.req.RequestExecutor');
goog.require('ydn.json');



/**
 * @extends {ydn.db.crud.req.RequestExecutor}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.crud.req.IRequestExecutor}
 * @struct
 */
ydn.db.crud.req.WebSql = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.crud.req.WebSql, ydn.db.crud.req.RequestExecutor);


/**
 * @const
 * @type {boolean} debug flag.
 */
ydn.db.crud.req.WebSql.DEBUG = false;


/**
 * Maximum number of readonly requests created per transaction.
 * Common implementation in WebSQL library is sending massive requests
 * to the transaction and use setTimeout to prevent breaking the system.
 * To get optimal performance, we send limited number of request per
 * transaction.
 * Sending more request will not help much because JS is just parsing and
 * pushing to result array data which is faster than SQL processing.
 * Smaller number also help SQLite engine to give
 * other transaction to perform parallel requests.
 * @const
 * @type {number} Maximum number of readonly requests created per transaction.
 */
ydn.db.crud.req.WebSql.REQ_PER_TX = 10;


/**
 * Maximum number of read-write requests created per transaction.
 * Since SQLite locks all stores during read write request, it is better
 * to give this number smaller. Larger number will not help to get faster
 * because it bottleneck is in SQL engine, not from JS side.
 * @const
 * @type {number} Maximum number of read-write requests created per transaction.
 */
ydn.db.crud.req.WebSql.RW_REQ_PER_TX = 2;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.crud.req.WebSql.prototype.logger =
    goog.log.getLogger('ydn.db.crud.req.WebSql');


/**
 * Parse resulting object of a row into original object as it 'put' into the
 * database.
 * @final
 * @param {!Object} row row.
 * @param {ydn.db.schema.Store} store store schema.
 * @return {!Object} parse value.
 */
ydn.db.crud.req.WebSql.parseRow = function(row, store) {

  if (store.isFixed() && !store.usedInlineKey() && store.countIndex() == 0 &&
      row[ydn.db.base.DEFAULT_BLOB_COLUMN]) {
    // check for blob or file
    var s = row[ydn.db.base.DEFAULT_BLOB_COLUMN];
    var BASE64_MARKER = ';base64,';
    if (s.indexOf(BASE64_MARKER) == -1) {
      return ydn.json.parse(s);
    } else {
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

      return new Blob([uInt8Array.buffer], {type: contentType});
    }
  }
  var value = row[ydn.db.base.DEFAULT_BLOB_COLUMN] ?
      ydn.json.parse(row[ydn.db.base.DEFAULT_BLOB_COLUMN]) : {};
  if (goog.isDefAndNotNull(store.keyPath)) {
    var key = ydn.db.schema.Index.sql2js(row[store.keyPath], store.getType());
    if (goog.isDefAndNotNull(key)) {
      store.setKeyValue(value, key);
    }
  }

  for (var j = 0; j < store.countIndex(); j++) {
    var index = store.index(j);
    var column_name = index.getSQLIndexColumnName();
    if (column_name == ydn.db.base.DEFAULT_BLOB_COLUMN ||
        index.isComposite() || index.isMultiEntry()) {
      continue;
    }
    if (index.getType() == ydn.db.schema.DataType.DATE ||
        store.isFixed()) { // fixed schema does not stored data in default blob
      // in JSON serialization, date lost type.
      var x = row[column_name];
      var v = ydn.db.schema.Index.sql2js(x, index.getType());
      if (goog.isDef(v)) {
        index.applyValue(value, v);
      }
    }
  }

  return value;
};


/**
 * Extract key from row result.
 * @final
 * @protected
 * @param {ydn.db.schema.Store} table table of concern.
 * @param {!Object} row row.
 * @return {!Object} parse value.
 */
ydn.db.crud.req.WebSql.prototype.getKeyFromRow = function(table, row) {
  return row[table.keyPath || ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME];
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.putByKeys = goog.abstractMethod;


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.putData = function(tx, tx_no, df,
    store_name, data, delimiter) {
  throw new ydn.debug.error.NotImplementedException('putData');
};


/**
 * @param {ydn.db.Request} req tx.
 * @param {boolean} is_replace true if `put`, otherwise `add`.
 * @param {boolean} single false for array input.
 * @param {string} store_name table name.
 * @param {!Array.<!Object>} objects object to put.
 * @param {!Array.<(!Array|string|number)>=} opt_keys optional out-of-line keys.
 * @protected
*/
ydn.db.crud.req.WebSql.prototype.insertObjects = function(
    req, is_replace, single, store_name, objects, opt_keys) {
  var create = !is_replace;
  var table = this.schema.getStore(store_name);

  var insert_statement = create ? 'INSERT INTO ' : 'INSERT OR REPLACE INTO ';

  var tx = req.getTx();
  var me = this;
  var result_keys = [];
  var result_count = 0;
  var msg = req.getLabel() + ' inserting ' + objects.length + ' objects.';
  var has_error = false;

  /**
   * Put and item at i. This ydn.db.con.Storage will invoke callback to df if
   * all objects
   * have been put, otherwise recursive call to itself at next i+1 item.
   * @param {number} i index.
   * @param {SQLTransaction} tx transaction.
   */
  var put = function(i, tx) {

    if (!goog.isDefAndNotNull(objects[i])) {
      goog.log.finest(me.logger,  'empty object at ' + i + ' of ' + objects.length);
      result_count++;
      if (result_count == objects.length) {
        goog.log.finer(me.logger, msg + ' success ' + msg);
        // console.log(msg, result_keys);
        req.setDbValue(result_keys, has_error);
      } else {
        var next = i + ydn.db.crud.req.WebSql.RW_REQ_PER_TX;
        if (next < objects.length) {
          put(next, tx);
        }
      }
    }

    var out;
    if (goog.isDef(opt_keys)) {
      out = table.sqlNamesValues(objects[i], opt_keys[i]);
    } else {
      out = table.sqlNamesValues(objects[i]);
    }

    //console.log([obj, JSON.stringify(obj)]);

    var sql = insert_statement + table.getQuotedName() +
        ' (' + out.columns.join(', ') + ') ' +
        'VALUES (' + out.slots.join(', ') + ');';

    var i_msg = req.getLabel() +
        ' SQL: ' + sql + ' PARAMS: ' + out.values +
        ' REQ: ' + i + ' of ' + objects.length;

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var success_callback = function(transaction, results) {
      result_count++;

      var key = goog.isDef(out.key) ? out.key : results.insertId;
      if (results.rowsAffected < 1) { // catch for no-op
        // assuming index constraint no op
        has_error = true;
        key = new ydn.db.ConstraintError(key + ' no-op');
      }

      /**
       * Insert a row for each multi entry index.
       * @param {ydn.db.schema.Index} index multi entry index.
       * @param {number} value index at.
       */
      var insertMultiEntryIndex = function(index, value) {
        var idx_name = ydn.db.base.PREFIX_MULTIENTRY +
            table.getName() + ':' + index.getName();
        var idx_sql = insert_statement + goog.string.quote(idx_name) + ' (' +
            table.getSQLKeyColumnNameQuoted() + ', ' +
            index.getSQLIndexColumnNameQuoted() + ') VALUES (?, ?)';
        var idx_params = [ydn.db.schema.Index.js2sql(key, table.getType()),
              ydn.db.schema.Index.js2sql(value, index.getType())];

        /**
         * @param {SQLTransaction} tx transaction.
         * @param {SQLResultSet} rs results.
         */
        var idx_success = function(tx, rs) {

        };
        /**
         * @param {SQLTransaction} tr transaction.
         * @param {SQLError} error error.
         * @return {boolean} true to roll back.
         */
        var idx_error = function(tr, error) {
          goog.log.warning(me.logger, 'multiEntry index insert error: ' + error.message);
          return false;
        };

        goog.log.finest(me.logger,  req.getLabel() + ' multiEntry ' + idx_sql +
            ' ' + idx_params);
        tx.executeSql(idx_sql, idx_params, idx_success, idx_error);
      };
      for (var j = 0, nj = table.countIndex(); j < nj; j++) {
        var idx = table.index(j);
        if (idx.isMultiEntry()) {
          var index_values = ydn.db.utils.getValueByKeys(objects[i],
              idx.getKeyPath());
          var n = (!index_values ? 0 : index_values.length) || 0;
          for (var k = 0; k < n; k++) {
            insertMultiEntryIndex(idx, index_values[k]);
          }
        }
      }

      if (single) {
        // console.log(msg, key);
        req.setDbValue(key);
      } else {
        result_keys[i] = key;
        if (result_count == objects.length) {
          // console.log(msg, result_keys);
          req.setDbValue(result_keys, has_error);
        } else {
          var next = i + ydn.db.crud.req.WebSql.RW_REQ_PER_TX;
          if (next < objects.length) {
            put(next, transaction);
          }
        }
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.crud.req.WebSql.DEBUG) {
        goog.global.console.log([sql, out, tr, error]);
      }
      result_count++;
      has_error = true;
      if (error.code == 6) { // constraint failed
        error.name = 'ConstraintError';
      } else {
        goog.log.warning(me.logger, 'error: ' + error.message + ' ' + msg);
      }
      if (single) {
        req.setDbValue(error, true);
      } else {
        result_keys[i] = error;
        if (result_count == objects.length) {
          goog.log.finest(me.logger,  'success ' + msg); // still success message ?
          req.setDbValue(result_keys, has_error);
        } else {
          var next = i + ydn.db.crud.req.WebSql.RW_REQ_PER_TX;
          if (next < objects.length) {
            put(next, tr);
          }
        }
      }
      return false; // continue, not rollback
    };

    // console.log([sql, out.values]);
    goog.log.finest(me.logger,  i_msg);
    if (ydn.db.crud.req.WebSql.DEBUG) {
      goog.global.console.log(sql, out.values);
    }
    tx.executeSql(sql, out.values, success_callback, error_callback);
  };

  if (objects.length > 0) {
    // send parallel requests
    for (var i = 0;
         i < ydn.db.crud.req.WebSql.RW_REQ_PER_TX && i < objects.length; i++) {
      put(i, /** @type {SQLTransaction} */ (tx));
    }
  } else {
    goog.log.finer(this.logger, 'success');
    req.setDbValue([]);
  }
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.putByKeys = function(rq, objs, keys) {

  if (keys.length == 0) {
    rq.setDbValue([]);
    return;
  }

  var tx = rq.getTx();
  var results = [];
  var count = 0;
  var total = 0;
  var me = this;

  /**
   *
   * @param {string} store_name
   * @param {!Array.<number>} idx
   */
  var execute_on_store = function(store_name, idx) {
    var idx_objs = [];
    goog.log.finest(me.logger,  'put ' + idx.length + ' objects to ' + store_name);
    var store = me.schema.getStore(store_name);
    var inline = store.usedInlineKey();
    var idx_keys = inline ? undefined : [];
    for (var i = 0; i < idx.length; i++) {
      idx_objs.push(objs[idx[i]]);
      if (!inline) {
        idx_keys.push(keys[idx[i]].getId());
      }
    }
    var i_rq = rq.copy();
    i_rq.addCallbacks(function(xs) {
      for (var i = 0; i < idx.length; i++) {
        results[idx[i]] = xs[i];
      }
      count++;
      if (count == total) {
        rq.setDbValue(results);
      }
    }, function(e) {
      count++;
      if (count == total) {
        rq.setDbValue(results, true);
      }
    });
    me.insertObjects(i_rq, false, false, store_name, idx_objs,
        idx_keys);

  };

  var store_name = '';
  var store;
  var idx = [];
  var ids = [];
  for (var i = 0; i < keys.length; i++) {
    var name = keys[i].getStoreName();
    var id = keys[i].getId();

    if (name != store_name) {
      total++;
      if (idx.length > 0) {
        execute_on_store(store_name, idx);
      }
      idx = [i];
      ids = [id];
      store_name = name;
    } else {
      idx.push(i);
      ids.push(id);
    }

  }

  if (idx.length > 0) {
    execute_on_store(store_name, idx);
  }

};


/**
*
* @inheritDoc
*/
ydn.db.crud.req.WebSql.prototype.getById = function(req, table_name, id) {

  var tx = req.getTx();
  var table = this.schema.getStore(table_name);
  goog.asserts.assertInstanceof(table, ydn.db.schema.Store, table_name +
      ' not found.');

  var me = this;

  var column_name = table.getSQLKeyColumnNameQuoted();

  var params = [ydn.db.schema.Index.js2sql(id, table.getType())];

  var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
      column_name + ' = ?';

  var msg = req.getLabel() + ' SQL: ' + sql + ' PARAMS: ' + params;

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {

    if (results.rows.length > 0) {
      var row = results.rows.item(0);

      if (goog.isDefAndNotNull(row)) {
        var value = ydn.db.crud.req.WebSql.parseRow(row, table);
        req.setDbValue(value);
      } else {
        goog.log.finer(me.logger, 'success no result: ' + msg);
        req.setDbValue(undefined);
      }
    } else {
      goog.log.finer(me.logger, 'success no result: ' + msg);
      req.setDbValue(undefined);
    }
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.crud.req.WebSql.DEBUG) {
      goog.global.console.log([tr, error]);
    }
    goog.log.warning(me.logger, 'error: ' + msg + ' ' + error.message);
    req.setDbValue(error, true);
    return false;
  };

  //goog.global.console.log(['getById', sql, params]);
  goog.log.finest(this.logger, msg);
  tx.executeSql(sql, params, callback, error_callback);
};


/**
 *
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.listByIds = function(req, table_name, ids) {

  var tx = req.getTx();
  var me = this;
  var objects = [];
  var result_count = 0;

  var table = this.schema.getStore(table_name);

  /**
   * Get fetch the given id of i position and put to results array in
   * i position. If req_done are all true, df will be invoked, if not
   * it recursively call itself to next sequence.
   * @param {number} i the index of ids.
   * @param {SQLTransaction} tx tx.
   */
  var get = function(i, tx) {

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function(transaction, results) {
      result_count++;
      if (results.rows.length > 0) {
        var row = results.rows.item(0);
        if (goog.isDefAndNotNull(row)) {
          objects[i] = ydn.db.crud.req.WebSql.parseRow(row, table);
        }
        // this is get function, we take only one result.
      } else {
        objects[i] = undefined; // not necessary.
      }

      if (result_count == ids.length) {
        req.setDbValue(objects);
      } else {
        var next = i + ydn.db.crud.req.WebSql.REQ_PER_TX;
        if (next < ids.length) {
          get(next, transaction);
        }
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function(tr, error) {
      result_count++;
      if (ydn.db.crud.req.WebSql.DEBUG) {
        goog.global.console.log([tr, error]);
      }
      goog.log.warning(me.logger, 'error: ' + sql + ' ' + error.message);
      // t.abort(); there is no abort
      if (result_count == ids.length) {
        req.setDbValue(objects);
      } else {
        var next = i + ydn.db.crud.req.WebSql.REQ_PER_TX;
        if (next < ids.length) {
          get(next, tr);
        }
      }
      return false;
    };

    var id = ids[i];
    var column_name = table.getSQLKeyColumnNameQuoted();

    var params = [ydn.db.schema.Index.js2sql(id, table.getType())];
    var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
        column_name + ' = ?';
    goog.log.finest(me.logger,  'SQL: ' + sql + ' PARAMS: ' + params);
    tx.executeSql(sql, params, callback, error_callback);
  };

  if (ids.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.crud.req.WebSql.REQ_PER_TX && i < ids.length;
         i++) {
      get(i, /** @type {SQLTransaction} */ (tx));
    }
  } else {
    goog.log.finer(me.logger, 'success');
    req.setDbValue([]);
  }
};


/**
*
* @inheritDoc
*/
ydn.db.crud.req.WebSql.prototype.listByKeys = function(req, keys) {

  var tx = req.getTx();
  var me = this;
  var objects = [];
  var result_count = 0;

  var get = function(i, tx) {
    var key = keys[i];
    var table_name = key.getStoreName();
    var table = me.schema.getStore(table_name);

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function(transaction, results) {
      result_count++;
      if (results.rows.length > 0) {
        var row = results.rows.item(0);
        if (goog.isDefAndNotNull(row)) {
          objects[i] = ydn.db.crud.req.WebSql.parseRow(row, table);
        }
        // this is get function, we take only one result.
      } else {
        objects[i] = undefined; // not necessary.
      }

      if (result_count == keys.length) {
        goog.log.finest(me.logger,  'success ' + sql);
        req.setDbValue(objects);
      } else {
        var next = i + ydn.db.crud.req.WebSql.REQ_PER_TX;
        if (next < keys.length) {
          get(next, transaction);
        }
      }

    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.crud.req.WebSql.DEBUG) {
        goog.global.console.log([tr, error]);
      }
      req.setDbValue(error, true);
      return false;
    };

    var id = key.getNormalizedId();
    var column_name = table.getSQLKeyColumnNameQuoted();

    var params = [ydn.db.schema.Index.js2sql(id, table.getType())];
    var sql = 'SELECT * FROM ' + table.getQuotedName() + ' WHERE ' +
        column_name + ' = ?';
    goog.log.finest(me.logger,  'SQL: ' + sql + ' PARAMS: ' + params);
    tx.executeSql(sql, params, callback, error_callback);

  };

  if (keys.length > 0) {
    // send parallel requests
    for (var i = 0; i < ydn.db.crud.req.WebSql.REQ_PER_TX && i < keys.length;
         i++) {
      get(i, tx);
    }
  } else {
    goog.log.finest(this.logger, 'success');
    req.setDbValue([]);
  }
};


/**
* @inheritDoc
*/
ydn.db.crud.req.WebSql.prototype.clearByStores = function(req, store_names) {

  var tx = req.getTx();
  var me = this;

  var deleteStore = function(i, tx) {

    var store = me.schema.getStore(store_names[i]);

    var sql = 'DELETE FROM  ' + store.getQuotedName();

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function(transaction, results) {
      if (i == store_names.length - 1) {
        goog.log.finest(me.logger,  'success ' + sql);
        req.setDbValue(store_names.length);
      } else {
        deleteStore(i + 1, transaction);
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var errback = function(tr, error) {
      if (ydn.db.crud.req.WebSql.DEBUG) {
        goog.global.console.log([tr, error]);
      }
      req.setDbValue(error, true);
      return false;
    };

    goog.log.finest(me.logger,  'SQL: ' + sql + ' PARAMS: []');
    tx.executeSql(sql, [], callback, errback);

    /**
     *
     * @param {ydn.db.schema.Index} index
     */
    var deleteMultiEntryIndex = function(index) {
      var idx_name = ydn.db.base.PREFIX_MULTIENTRY +
          store.getName() + ':' + index.getName();

      var idx_sql = 'DELETE FROM  ' + goog.string.quote(idx_name);
      goog.log.finest(me.logger,  'SQL: ' + idx_sql);
      tx.executeSql(idx_sql, []);
    };

    for (var j = 0, n = store.countIndex(); j < n; j++) {
      var index = store.index(j);
      if (index.isMultiEntry()) {
        deleteMultiEntryIndex(index);
      }
    }

  };

  if (store_names.length > 0) {
    deleteStore(0, tx);
  } else {
    goog.log.finest(this.logger, 'success');
    req.setDbValue(0);
  }
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.removeByKeys = function(req, keys) {

  var tx = req.getTx();
  var me = this;
  var count = 0;
  var has_failed = false;
  var store_name, store, key;
  var msg = req.getLabel() + ' removeByKeys: ' + keys.length + ' keys';
  goog.log.finest(this.logger, msg);

  var removeAt = function(i) {

    if (i >= keys.length) {
      req.setDbValue(count, has_failed);
      return;
    }

    var store = me.schema.getStore(keys[i].getStoreName());

    var key = ydn.db.schema.Index.js2sql(keys[i].getId(), store.getType());

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var success_callback = function(transaction, results) {
      if (ydn.db.crud.req.WebSql.DEBUG) {
        goog.global.console.log(results);
      }
      count++;
      removeAt(i);
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.crud.req.WebSql.DEBUG) {
        goog.global.console.log([tr, error]);
      }
      goog.log.warning(me.logger, 'error: ' + i_msg + error.message);
      has_failed = true;
      removeAt(i);
      return false;
    };

    var where = ' WHERE ' + store.getSQLKeyColumnNameQuoted() + ' = ?';
    var sql = 'DELETE FROM ' + store.getQuotedName() + where;
    //console.log([sql, out.values])
    var i_msg = req.getLabel() + ' SQL: ' + sql + ' PARAMS: ' + [key];
    if (ydn.db.crud.req.WebSql.DEBUG) {
      goog.global.console.log(i_msg);
    }
    tx.executeSql(sql, [key], success_callback, error_callback);
    i++;

    /**
     *
     * @param {ydn.db.schema.Index} index
     */
    var deleteMultiEntryIndex = function(index) {
      var idx_name = ydn.db.base.PREFIX_MULTIENTRY +
          store.getName() + ':' + index.getName();

      var idx_sql = 'DELETE FROM  ' + goog.string.quote(idx_name) + where;
      goog.log.finest(me.logger,  req.getLabel() + + ' SQL: ' + idx_sql);
      tx.executeSql(idx_sql, [key]);
    };

    for (var j = 0, n = store.countIndex(); j < n; j++) {
      var index = store.index(j);
      if (index.isMultiEntry()) {
        deleteMultiEntryIndex(index);
      }
    }
  };

  removeAt(0);

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.removeById = function(req, table, id) {

  var tx = req.getTx();
  var store = this.schema.getStore(table);
  var key = ydn.db.schema.Index.js2sql(id, store.getType());

  var me = this;

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var success_callback = function(transaction, results) {
    if (ydn.db.crud.req.WebSql.DEBUG) {
      goog.global.console.log(results);
    }
    req.setDbValue(results.rowsAffected);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.crud.req.WebSql.DEBUG) {
      goog.global.console.log([tr, error]);
    }
    req.setDbValue(error, true);
    return false; // not rollback yet.
  };

  var where = ' WHERE ' + store.getSQLKeyColumnNameQuoted() + ' = ?';
  var sql = 'DELETE FROM ' + store.getQuotedName() + where;
  //console.log([sql, out.values])
  var msg = req.getLabel() + ' SQL: ' + sql + ' PARAMS: ' + [key];
  goog.log.finest(this.logger, msg);
  tx.executeSql(sql, [key], success_callback, error_callback);

  /**
   *
   * @param {ydn.db.schema.Index} index
   */
  var deleteMultiEntryIndex = function(index) {
    var idx_name = ydn.db.base.PREFIX_MULTIENTRY +
        store.getName() + ':' + index.getName();

    var idx_sql = 'DELETE FROM  ' + goog.string.quote(idx_name) + where;
    goog.log.finest(me.logger,  req.getLabel() + + ' SQL: ' + idx_sql);
    tx.executeSql(idx_sql, [key]);
  };

  for (var j = 0, n = store.countIndex(); j < n; j++) {
    var index = store.index(j);
    if (index.isMultiEntry()) {
      deleteMultiEntryIndex(index);
    }
  }

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.clearByKeyRange = function(req,
    store_name, key_range) {
  this.clear_by_key_range_(req, store_name, undefined, key_range);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.removeByKeyRange = function(req,
    store_name, key_range) {
  this.clear_by_key_range_(req, store_name, undefined, key_range);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.removeByIndexKeyRange = function(req,
    store_name, index_name, key_range) {
  this.clear_by_key_range_(req, store_name, index_name, key_range);
};


/**
 * Retrieve primary keys or value from a store in a given key range.
 * @param {ydn.db.Request} req request.
 * @param {string} store_name table name.
 * @param {string|undefined} column_name name.
 * @param {IDBKeyRange} key_range to retrieve.
 * @private
 */
ydn.db.crud.req.WebSql.prototype.clear_by_key_range_ = function(req,
    store_name, column_name, key_range) {

  var tx = req.getTx();
  var me = this;
  var arr = [];
  var store = this.schema.getStore(store_name);

  var sql = 'DELETE FROM ' + store.getQuotedName();
  var params = [];
  var where_params = [];
  var where = '';
  if (goog.isDefAndNotNull(key_range)) {
    if (goog.isDef(column_name)) {
      var index = store.getIndex(column_name);
      ydn.db.KeyRange.toSql(index.getSQLIndexColumnNameQuoted(),
          index.getType(), key_range, where_params, params);
    } else {
      ydn.db.KeyRange.toSql(store.getSQLKeyColumnNameQuoted(), store.getType(),
          key_range, where_params, params);
    }
    where = ' WHERE ' + where_params.join(' AND ');
  }
  sql += where;

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    goog.log.finest(me.logger,  'success ' + msg);
    req.setDbValue(results.rowsAffected);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.crud.req.WebSql.DEBUG) {
      goog.global.console.log([tr, error]);
    }
    goog.log.warning(me.logger, 'error: ' + msg + error.message);
    req.setDbValue(error, true);
    return false;
  };

  //console.log([sql, params])
  var msg = req.getLabel() + ' SQL: ' + sql + ' PARAMS: ' + params;
  goog.log.finest(this.logger, msg);
  tx.executeSql(sql, params, callback, error_callback);

  /**
   *
   * @param {ydn.db.schema.Index} index
   */
  var deleteMultiEntryIndex = function(index) {
    var idx_name = ydn.db.base.PREFIX_MULTIENTRY +
        store.getName() + ':' + index.getName();

    var idx_sql = 'DELETE FROM  ' + goog.string.quote(idx_name) + where;
    goog.log.finest(me.logger,  req.getLabel() + + ' SQL: ' + idx_sql);
    tx.executeSql(idx_sql, where_params);
  };

  for (var j = 0, n = store.countIndex(); j < n; j++) {
    var j_index = store.index(j);
    if (j_index.isMultiEntry()) {
      deleteMultiEntryIndex(j_index);
    }
  }
};


/**
 * @inheritDoc
*/
ydn.db.crud.req.WebSql.prototype.countStores = function(req, tables) {

  var tx = req.getTx();
  var me = this;
  var out = [];

  /**
   *
   * @param {number} i
   */
  var count = function(i) {
    var table = tables[i];
    var sql = 'SELECT COUNT(*) FROM ' + goog.string.quote(table);

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var callback = function(transaction, results) {
      var row = results.rows.item(0);
      // console.log(['row ', row  , results]);
      out[i] = parseInt(row['COUNT(*)'], 10);
      i++;
      if (i == tables.length) {
        req.setDbValue(out);
      } else {
        count(i);
      }

    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.crud.req.WebSql.DEBUG) {
        goog.global.console.log([tr, error]);
      }
      req.setDbValue(error, true);
      return false;
    };

    goog.log.finest(me.logger,  'SQL: ' + sql + ' PARAMS: []');
    tx.executeSql(sql, [], callback, error_callback);
  };

  if (tables.length == 0) {
    goog.log.finest(this.logger, 'success');
    req.setDbValue(0);
  } else {
    count(0);
  }

};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.countKeyRange = function(req, table,
    key_range, index_name, unique) {

  var me = this;

  var params = [];

  var store = this.schema.getStore(table);

  var sql = store.toSql(params, ydn.db.base.QueryMethod.COUNT,
      index_name, key_range, false, unique);

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    if (ydn.db.crud.req.WebSql.DEBUG) {
      goog.global.console.log([sql, results]);
    }
    var row = results.rows.item(0);
    // console.log(['row ', row  , results]);
    req.setDbValue(ydn.object.takeFirst(row)); // usually row['COUNT(*)']
    // , but may be  row['COUNT("id")']
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.crud.req.WebSql.DEBUG) {
      goog.global.console.log([sql, error]);
    }
    req.setDbValue(error, true);
    return false;
  };

  var msg = req.getLabel() + ' SQL: ' + sql + ' PARAMS: ' + params;
  goog.log.finest(this.logger, msg);
  req.getTx().executeSql(sql, params, callback, error_callback);
};


/**
 * @inheritDoc
 */
ydn.db.crud.req.WebSql.prototype.list = function(req, mth, store_name,
    index_column, key_range, limit, offset, reverse, distinct, opt_position) {

  var me = this;
  var arr = [];
  var store = this.schema.getStore(store_name);
  var key_column = store.getSQLKeyColumnName();
  var primary_type = store.getType();
  var effective_type = primary_type;
  var index = goog.isDefAndNotNull(index_column) &&
      (index_column !== key_column) ? store.getIndex(index_column) : null;
  var effective_column = index_column || key_column;
  if (index) {
    effective_type = index.getType();
  }
  var params = [];
  var sql;
  if (!!opt_position && goog.isDef(opt_position[0])) {
    var e_key = /** @type {IDBKey} */ (opt_position[0]);
    if (index && goog.isDef(opt_position[1])) {
      var p_key = /** @type {IDBKey} */ (opt_position[1]);
      sql = store.sqlContinueIndexEffectiveKey(mth, params, index.getName(),
          key_range, e_key, true, p_key, reverse, distinct);
    } else {
      sql = store.sqlContinueEffectiveKey(mth, params, index_column,
          key_range, reverse, distinct, e_key, true);
    }
  } else {
    sql = store.toSql(params, mth, effective_column,
        key_range, reverse, distinct);
  }

  if (goog.isNumber(limit)) {
    sql += ' LIMIT ' + limit;
  }
  if (goog.isNumber(offset)) {
    sql += ' OFFSET ' + offset;
  }

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var callback = function(transaction, results) {
    var n = results.rows.length;
    if (ydn.db.crud.req.WebSql.DEBUG) {
      goog.global.console.log(results);
    }
    var row;
    for (var i = 0; i < n; i++) {
      row = results.rows.item(i);
      if (ydn.db.crud.req.WebSql.DEBUG) {
        goog.global.console.log(row);
      }
      if (mth == ydn.db.base.QueryMethod.LIST_PRIMARY_KEY) {
        arr[i] = ydn.db.schema.Index.sql2js(row[key_column], primary_type);
      } else if (mth == ydn.db.base.QueryMethod.LIST_KEY) {
        arr[i] = ydn.db.schema.Index.sql2js(row[effective_column],
            effective_type);
      } else if (mth == ydn.db.base.QueryMethod.LIST_KEYS) {
        arr[i] = [
          ydn.db.schema.Index.sql2js(row[effective_column], effective_type),
          ydn.db.schema.Index.sql2js(row[key_column], primary_type)];
      } else if (goog.isDefAndNotNull(row)) {
        // LIST_VALUE
        arr[i] = ydn.db.crud.req.WebSql.parseRow(row, store);
      }
    }
    goog.log.finer(me.logger, 'success ' + req);
    if (opt_position && row) {
      opt_position[0] = ydn.db.schema.Index.sql2js(row[effective_column],
          effective_type);
      opt_position[1] = ydn.db.schema.Index.sql2js(row[key_column],
          primary_type);
    }
    req.setDbValue(arr);
  };

  var msg = req + ' SQL: ' + sql + ' ;params= ' +
      ydn.json.stringify(params);

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.crud.req.WebSql.DEBUG) {
      goog.global.console.log([tr, error]);
    }
    goog.log.warning(me.logger, 'error: ' + msg + error.message);
    req.setDbValue(error, true);
    return false;
  };

  goog.log.finest(this.logger, msg);
  req.getTx().executeSql(sql, params, callback, error_callback);
};
