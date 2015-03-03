/**
 * @license Copyright 2012 YDN Authors, Yathit. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");.
 */
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
 * @fileoverview Storage provider.
 *
 * Create and maintain database connection and provide robust transaction
 * objects upon request. Storage mechanism providers implement
 * ydn.db.con.IDatabase interface.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.con.Storage');
goog.require('ydn.db');
goog.require('ydn.db.base');
goog.require('ydn.db.con.IDatabase');
goog.require('ydn.db.con.IStorage');
goog.require('ydn.db.events.StorageEvent');
goog.require('ydn.db.schema.EditableDatabase');
goog.require('ydn.debug.error.ArgumentException');
goog.require('ydn.error.ConstraintError');
goog.require('ydn.object');



/**
 * Create a storage and connect to suitable database connection.
 *
 * The storage is ready to use on created, but transaction requested
 * my buffered until connection is established.
 *
 * If database name is provided, this will immediately initialize
 * the connection. Database name can be set later by using {@link #setName}
 * method.
 *
 * This grantee that the connected database has the similar schema as specified
 * in the input. If dissimilar between the two schema, the version change
 * is issued and alter the schema to match the input schema.
 *
 * @see {@link goog.db} Google Closure Library DB module.
 * @param {string=} opt_dbname database name.
 * @param {ydn.db.schema.Database|DatabaseSchema=} opt_schema database schema
 * or its configuration in JSON format. If not provided, default empty
 * auto-schema is used.
 * @param {!StorageOptions=} opt_options options.
 * @throws {ConstraintError} if fix version is used, but client database
 * schema is dissimilar.
 * @implements {ydn.db.con.IStorage}
 * @constructor
 */
ydn.db.con.Storage = function(opt_dbname, opt_schema, opt_options) {

  var options = opt_options || {};

  if (goog.DEBUG) {
    var fields = ['autoSchema', 'connectionTimeout', 'size', 'mechanisms',
      'policy', 'isSerial', 'Encryption'];
    for (var key in options) {
      if (options.hasOwnProperty(key) &&
          goog.array.indexOf(fields, key) == -1) {
        throw new ydn.debug.error.ArgumentException('Unknown attribute "' +
            key + '" in options.');
      }
    }
    if (options.mechanisms) {
      if (!goog.isArray(options.mechanisms)) {
        throw new ydn.debug.error.ArgumentException('mechanisms attribute ' +
            'must be an array but ' + goog.typeOf(options.mechanisms) +
            ' found.');
      }
      for (var i = 0; i < options.mechanisms.length; i++) {
        if (!goog.array.contains(ydn.db.con.Storage.PREFERENCE,
            options.mechanisms[i])) {
          throw new ydn.debug.error.ArgumentException('Invalid mechanism "' +
              options.mechanisms[i] + '"');
        }
      }
    }
  }

  /**
   * List of preference storage mechanisms to used.
   * @final
   * @type {!Array.<string>}
   */
  this.mechanisms = options.mechanisms || ydn.db.con.Storage.PREFERENCE;

  /**
   * WebSQl database size during initialization.
   * @final
   */
  this.size = options.size;

  /**
   * Timeout for database connection.
   * @type {number}
   * @final
   */
  this.connectionTimeout = goog.isDef(options.connectionTimeout) ?
      options.connectionTimeout :
      ydn.db.con.Storage.DEBUG ?
      1000 : goog.DEBUG ? 3 * 1000 : 60 * 1000;

  /**
   * The database instance.
   * @type {ydn.db.con.IDatabase}
   * @private
   */
  this.db_ = null;

  /**
   * Transaction queue
   * @private
   * @final
   * @type {!Array.<{
   *    fnc: Function,
   *    scopes: Array.<string>,
   *    mode: ydn.db.base.TransactionMode,
   *    oncompleted: function(ydn.db.base.TxEventTypes, *)
   *  }>}
   */
  this.txQueue_ = [];

  this.in_version_change_tx_ = false;

  var schema;
  if (opt_schema instanceof ydn.db.schema.Database) {
    schema = opt_schema;
  } else if (goog.isObject(opt_schema)) {
    /**
     * @type {!DatabaseSchema}
     */
    var schema_json = opt_schema;
    if (options.autoSchema || !goog.isDef(schema_json.stores)) {
      schema = new ydn.db.schema.EditableDatabase(schema_json);
    } else {
      schema = new ydn.db.schema.Database(schema_json);
    }

    var n = schema_json.stores ? schema_json.stores.length : 0;
    for (var i = 0; i < n; i++) {
      var store = schema.getStore(schema_json.stores[i].name);
      if (schema_json.stores[i].Sync) {
        this.addSynchronizer(store, schema_json.stores[i].Sync);
      }
    }
  } else {
    schema = new ydn.db.schema.EditableDatabase();
  }

  var has_valid_encryption = this.setEncryption(options.Encryption);
  /**
   * @final
   * @protected
   * @type {!ydn.db.schema.Database}
   */
  this.schema = schema;
  for (var i = 0; i < this.schema.count(); i++) {
    if (this.schema.store(i).isEncrypted()) {
      if (goog.DEBUG && !has_valid_encryption) {
        throw new Error('encryption option must be defined');
      }
      this.addEncryption(this.schema.store(i));
    }
  }

  if (goog.isDef(opt_dbname)) {
    this.setName(opt_dbname);
  }

  /**
   * Event dipatcher, initialized in ydn.db.tr.events
   * @protected
   */
  this.event_target = null;

  /**
   * On ready handler.
   * @type {goog.async.Deferred}
   * @private
   */
  this.df_on_ready_ = new goog.async.Deferred();
};


/**
 * @protected
 * @define {boolean} turn on debug flag to dump object.
 */
ydn.db.con.Storage.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.con.Storage.prototype.logger =
    goog.log.getLogger('ydn.db.con.Storage');


/**
 * @param {string} store_name
 * @return {boolean}
 */
ydn.db.con.Storage.prototype.hasStore = function(store_name) {
  return this.schema.hasStore(store_name);
};


/**
 * @param {string} store_name
 * @param {string} index_name
 * @return {boolean}
 */
ydn.db.con.Storage.prototype.hasIndex = function(store_name, index_name) {
  var store = this.schema.getStore(store_name);
  return store ? store.hasIndex(index_name) : false;
};


/**
 * Get current schema.
 * @param {function(DatabaseSchema)=} opt_callback schema in database.
 * @return {DatabaseSchema} schema in memory. Null if not connected.
 */
ydn.db.con.Storage.prototype.getSchema = function(opt_callback) {
  if (goog.isDef(opt_callback)) {
    /**
     * @param {ydn.db.schema.Database} schema
     */
    var callback = function(schema) {
      opt_callback(schema.toJSON());
      opt_callback = undefined;
    };
    if (this.db_) {
      this.db_.getSchema(callback);
    } else {
      var me = this;
      goog.asserts.assertFunction(callback, 'schema'); // compiler complained.
      var get_schema = function(tx) {
        me.db_.getSchema(callback, tx);
      };
      this.transaction(get_schema, null, ydn.db.base.TransactionMode.READ_ONLY);
    }
  }
  return this.schema ? /** @type {!DatabaseSchema} */ (this.schema.toJSON()) :
      null;
};


/**
 * Add a store schema to current database schema on auto schema generation
 * mode {@see #auto_schema}.
 * If the store already exist it will be updated as necessary.
 * @param {!StoreSchema|!ydn.db.schema.Store} store_schema store schema.
 * @return {!goog.async.Deferred} promise.
 */
ydn.db.con.Storage.prototype.addStoreSchema = function(store_schema) {

  /**
   *
   * @type {ydn.db.schema.Store}
   */
  var new_store = store_schema instanceof ydn.db.schema.Store ?
      store_schema : ydn.db.schema.Store.fromJSON(store_schema);

  var store_name = store_schema.name;
  var store = this.schema.getStore(store_name);
  if (!new_store.similar(store)) {

    var action = store ? 'update' : 'add';

    if (this.schema instanceof ydn.db.schema.EditableDatabase) {
      // do update
      var schema = /** @type {ydn.db.schema.EditableDatabase} */ (this.schema);
      schema.addStore(new_store);
      if (this.db_) {
        this.db_.close();
        this.db_ = null;
        return this.connectDatabase();
      } else {
        return goog.async.Deferred.succeed(false);
      }
    } else {
      var msg = goog.DEBUG ? 'Cannot ' + action + ' store: ' +
          store_name + '. Not auto schema generation mode.' : '';
      throw new ydn.error.ConstraintError(msg);
    }
  } else {
    return goog.async.Deferred.succeed(false); // no change required
  }
};


/**
 * Set database name. This will initialize the database.
 * @throws {Error} name already defined.
 * @param {string} db_name set database name.
 */
ydn.db.con.Storage.prototype.setName = function(db_name) {
  if (this.db_) {
    throw new ydn.debug.error.InvalidOperationException('Already' +
        ' connected with ' + this.db_name);
  }
  goog.asserts.assertString(db_name, 'database name must be a string' +
      ' but found ' + db_name + ' of type ' + (typeof db_name));

  this.db_name = db_name;
  this.connectDatabase();

};


/**
 * @type {string}
 * @protected
 */
ydn.db.con.Storage.prototype.db_name;


/**
 * @type {number|undefined}
 * @protected
 */
ydn.db.con.Storage.prototype.size;


/**
 * @type {number}
 * @protected
 */
ydn.db.con.Storage.prototype.connectionTimeout;


/**
 * Super class must not mutate schema data.
 * @type {!ydn.db.schema.Database} database schema as requested.
 */
ydn.db.con.Storage.prototype.schema;


/**
 *
 * @return {string} name of database.
 */
ydn.db.con.Storage.prototype.getName = function() {
  return this.db_name;
};


/**
 * Specified storage mechanism ordering.
 * The default represent
 * IndexedDB, WebSql, localStorage and in-memory store.
 * @const
 * @type {!Array.<string>}
 */
ydn.db.con.Storage.PREFERENCE = [
  ydn.db.base.Mechanisms.IDB,
  ydn.db.base.Mechanisms.SQLITE,
  ydn.db.base.Mechanisms.WEBSQL,
  ydn.db.base.Mechanisms.LOCAL_STORAGE,
  ydn.db.base.Mechanisms.SESSION_STORAGE,
  ydn.db.base.Mechanisms.USER_DATA,
  ydn.db.base.Mechanisms.MEMORY_STORAGE];


/**
 * Create database instance.
 * @protected
 * @param {string} db_type database type.
 * @return {ydn.db.con.IDatabase} newly created database instance.
 */
ydn.db.con.Storage.prototype.createDbInstance = function(db_type) {
  // super class will inject db instance.
  return null;
};


/**
 * Initialize suitable database if {@code dbname} and {@code schema} are set,
 * starting in the following order of preference.
 * @protected
 * @return {!goog.async.Deferred} promise.
 */
ydn.db.con.Storage.prototype.connectDatabase = function() {
  // handle version change

  var me = this;

  var df = new goog.async.Deferred();
  var resolve = function(is_connected, ev) {
    if (is_connected) {
      goog.log.finest(me.logger, me + ': ready.');
      me.last_queue_checkin_ = NaN;

      /**
       * Error event received from the database. Bubble up to the application
       * for logging purpose.
       * @param {Error} e event.
       */
      db.onError = function(e) {
        var event = new ydn.db.events.StorageErrorEvent(me, e);
        me.dispatchDbEvent(event);
      };

      /**
       * @param {Error} e event.
       */
      db.onFail = function(e) {
        var event = new ydn.db.events.StorageFailEvent(me, e);
        me.dispatchDbEvent(event);
        me.db_ = null; // database can no longer be used on fail.
      };


      /**
       * @param {Event} e event.
       */
      db.onVersionChange = function(e) {
        me.dispatchDbEvent(e);
      };

      setTimeout(function() {
        // dispatch asynchroniously so that any err on running db request
        // are not caught under deferred object.

        me.dispatchReady(ev);
        me.popTxQueue_();
      }, 10);

      df.callback(ev);
    } else {
      goog.log.warning(me.logger, me + ': database connection fail ' + ev.name);
      setTimeout(function() {
        var event = new ydn.db.events.StorageFailEvent(me, ev);
        me.dispatchReady(event);
        me.purgeTxQueue_(ev);
      }, 10);
      df.errback(ev);
    }
  };

  /**
   * The connected database instance.
   * @type {ydn.db.con.IDatabase}
   */
  var db = null;

  // go according to ordering
  var preference = this.mechanisms;
  for (var i = 0; i < preference.length; i++) {
    var db_type = preference[i].toLowerCase();
    db = this.createDbInstance(db_type);
    if (db) { // run-time detection
      db = this.createDbInstance(db_type);
      break;
    }
  }

  if (goog.isNull(db)) {

    var e = new ydn.error.ConstraintError('No storage mechanism found.');

    var event = new ydn.db.events.StorageFailEvent(this, e);
    resolve(false, event);
  } else {

    this.init(); // let super class to initialize.

    db.connect(this.db_name, this.schema).addCallbacks(function(old_version) {
      this.db_ = db;
      var event = new ydn.db.events.StorageEvent(ydn.db.events.Types.READY,
          this, parseFloat(db.getVersion()), parseFloat(old_version), null);
      resolve(true, event);
    }, function(e) {
      goog.log.warning(this.logger, this + ': opening fail');
      resolve(false, e);
    }, this);
  }

  return df;

};


/**
 *
 * @return {string|undefined} database mechanism type.
 */
ydn.db.con.Storage.prototype.getType = function() {
  if (this.db_) {
    return this.db_.getType();
  } else {
    return undefined;
  }
};


/**
 * Add handler on database ready event.
 * @param {function(this: T, Error?)} cb in case of database fail to open, invoke with
 * the error, otherwise null.
 * @param {T=} opt_scope
 * @template T
 */
ydn.db.con.Storage.prototype.onReady = function(cb, opt_scope) {
  this.df_on_ready_.addBoth(cb, opt_scope);
};


/**
 * Handle ready event by dispatching 'ready' event.
 * @param {ydn.db.events.Event} ev event.
 */
ydn.db.con.Storage.prototype.dispatchReady = function(ev) {
  var me = this;
  // using setTimeout here prevent transaction overlap error.
  setTimeout(function() {
    if (me.schema.isAutoVersion() && me.df_on_ready_.hasFired()) {
      return;
    }
    if (ev instanceof ydn.db.events.StorageErrorEvent) {
      var err = /** @type {ydn.db.events.StorageErrorEvent} */ (ev);
      me.df_on_ready_.errback(err.error);
    } else {
      me.df_on_ready_.callback();
    }
    me.dispatchDbEvent(ev);
  }, 4);

};


/**
 *
 * @return {boolean} true on ready.
 */
ydn.db.con.Storage.prototype.isReady = function() {
  return !!this.db_ && this.db_.isReady();
};


/**
 * Database database is instantiated, but may not ready.
 * Subclass may perform initialization.
 * When ready, deferred call are invoked and transaction queue
 * will run.
 * @protected
 */
ydn.db.con.Storage.prototype.init = function() {
};


/**
 * Close the database.
 */
ydn.db.con.Storage.prototype.close = function() {
  if (this.db_) {
    this.db_.close();
    this.db_ = null;
    goog.log.finest(this.logger, this + ' closed');
  }
};


/**
 * Get nati database instance.
 * @return {*} database instance.
 */
ydn.db.con.Storage.prototype.getDbInstance = function() {
  return this.db_ ? this.db_.getDbInstance() : null;
};


/**
 * @param {IDBDatabase} db
 * @param {string} db_name
 */
ydn.db.con.Storage.prototype.setDbInstance = function(db, db_name) {
  this.db_name = db_name;
  var instance = new ydn.db.con.IndexedDb();
  instance.setDbInstance(db);
  this.db_ = instance;
};


/**
 * @type {number}
 * @private
 */
ydn.db.con.Storage.prototype.last_queue_checkin_ = NaN;


/**
* @const
* @type {number}
*/
ydn.db.con.Storage.QUEUE_LIMIT = 100;


/**
 * Return number elements in tx queue.
 * @return {number}
 */
ydn.db.con.Storage.prototype.countTxQueue = function() {
  return this.txQueue_.length;
};


/**
 * Run the first transaction task in the queue. DB must be ready to do the
 * transaction.
 * @private
 */
ydn.db.con.Storage.prototype.popTxQueue_ = function() {

  var task = this.txQueue_.shift();
  if (task) {
    goog.log.finest(this.logger, 'pop tx queue[' + (this.txQueue_.length + 1) + ']');
    this.transaction(task.fnc, task.scopes, task.mode, task.oncompleted);
  }
  this.last_queue_checkin_ = goog.now();
};


/**
 * Push a transaction job to the queue.
 * @param {Function} trFn function that invoke in the transaction.
 * @param {Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TxEventTypes, *)=} opt_on_completed handler.
 * @private
 */
ydn.db.con.Storage.prototype.pushTxQueue_ = function(trFn, store_names,
    opt_mode, opt_on_completed) {
  goog.log.finest(this.logger, 'push tx queue[' + this.txQueue_.length + ']');
  this.txQueue_.push({
    fnc: trFn,
    scopes: store_names,
    mode: opt_mode,
    oncompleted: opt_on_completed
  });

  if (goog.DEBUG && this.txQueue_.length > ydn.db.con.Storage.QUEUE_LIMIT &&
      (this.txQueue_.length % ydn.db.con.Storage.QUEUE_LIMIT) == 0) {
    goog.log.warning(this.logger, 'Transaction queue stack size is ' +
        this.txQueue_.length +
        '. It is too large, possibility due to incorrect usage.');
  }
};


/**
 * Abort the queuing tasks.
 * @private
 * @param {Error} e error.
 */
ydn.db.con.Storage.prototype.purgeTxQueue_ = function(e) {
  if (this.txQueue_) {
    goog.log.info(this.logger, 'Purging ' + this.txQueue_.length +
        ' transactions request.');
    var task;
    while (task = this.txQueue_.shift()) {
      // task.fnc(null); this will cause error
      if (task.oncompleted) {
        task.oncompleted(ydn.db.base.TxEventTypes.ERROR, e);
      }
    }
  }
};


/**
 * Flag to indicate on version change transaction.
 * @type {boolean}
 * @private
 */
ydn.db.con.Storage.prototype.in_version_change_tx_ = false;


/**
 * Run a transaction.
 *
 * @param {Function} trFn function that invoke in the transaction.
 * @param {Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode=} opt_mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TxEventTypes, *)=} opt_on_completed handler.
 * @final
 */
ydn.db.con.Storage.prototype.transaction = function(trFn, store_names,
    opt_mode, opt_on_completed) {

  var names = store_names;

  if (goog.isString(store_names)) {
    names = [store_names];
  } else if (!goog.isDefAndNotNull(store_names)) {
    names = null;
  } else {
    if (goog.DEBUG) {
      if (!goog.isArrayLike(store_names)) {  // could be  DOMStringList or Array
        throw new ydn.debug.error.ArgumentException(
            'store names must be an array');
      } else if (store_names.length == 0) {
        throw new ydn.debug.error.ArgumentException(
            'number of store names must more than 0');
      } else {
        for (var i = 0; i < store_names.length; i++) {
          if (!goog.isString(store_names[i])) {
            throw new ydn.debug.error.ArgumentException('store name at ' + i +
                ' must be string but found ' + typeof store_names[i]);
          }
        }
      }
    }
  }

  var is_ready = !!this.db_ && this.db_.isReady();
  if (!is_ready || this.in_version_change_tx_) {
    // a "versionchange" transaction is still running, a InvalidStateError
    // exception will be thrown
    this.pushTxQueue_(trFn, names, opt_mode, opt_on_completed);
    return;
  }

  var me = this;

  var mode = goog.isDef(opt_mode) ? opt_mode :
      ydn.db.base.TransactionMode.READ_ONLY;

  if (mode == ydn.db.base.TransactionMode.VERSION_CHANGE) {
    this.in_version_change_tx_ = true;
  }

  var on_complete = function(type, ev) {
    if (goog.isFunction(opt_on_completed)) {
      opt_on_completed(type, ev);
      opt_on_completed = undefined;
    }
    if (mode == ydn.db.base.TransactionMode.VERSION_CHANGE) {
      me.in_version_change_tx_ = false;
    }
    me.popTxQueue_();
  };

  //console.log('core running ' + trFn.name);
  this.db_.doTransaction(function(tx) {
    trFn(tx);
    trFn = null;
  }, names, mode, on_complete);

};


/**
 *
 * @return {boolean} true if auto version mode.
 */
ydn.db.con.Storage.prototype.isAutoVersion = function() {
  return this.schema.isAutoVersion();
};


/**
 *
 * @return {boolean} true if auto schema mode.
 */
ydn.db.con.Storage.prototype.isAutoSchema = function() {
  return this.schema.isAutoSchema();
};


/**
 * ydn.db.sync module will override this method to inject sync functions.
 * @param {ydn.db.schema.Store} store store object.
 * @param {StoreSyncOptionJson} option synchronization options.
 * @protected
 */
ydn.db.con.Storage.prototype.addSynchronizer = function(store, option) {
  goog.log.warning(this.logger, 'Synchronization option for ' + store.getName() +
      ' ignored.');
};


/**
 * ydn.db.sync module will override this method to inject sync functions.
 * @param {ydn.db.schema.Store} store store object.
 * @protected
 */
ydn.db.con.Storage.prototype.addEncryption = function(store) {
  goog.log.warning(this.logger, 'Encryption option for ' + store.getName() +
      ' ignored.');
};


/**
 * @param {Object} encryption secret name.
 * @return {boolean}
 */
ydn.db.con.Storage.prototype.setEncryption = function(encryption) {
  return false;
};


/**
 * ydn.db.sync module will override this method to inject sync functions.
 * @param {!ydn.db.schema.Store} store store object.
 * @param {!ydn.db.schema.fulltext.Catalog} option synchronization options.
 * @protected
 */
ydn.db.con.Storage.prototype.addFullTextIndexer = function(store, option) {
  goog.log.warning(this.logger, 'Full text indexer option for ' + store.getName() +
      ' ignored.');
};


/**
 * For validating user input.
 * @return {!Array.<string>} list of event types.
 */
ydn.db.con.Storage.prototype.getEventTypes = function() {
  return ['created', 'error', 'fail', 'ready', 'deleted', 'updated',
    'versionchange'];
};


/**
 * Dispatch event if installed.
 * @param {goog.events.EventLike} event optional args.
 */
ydn.db.con.Storage.prototype.dispatchDbEvent = function(event) {

};


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.con.Storage.prototype.toString = function() {
    return 'Storage:' + this.db_;
  };
}





