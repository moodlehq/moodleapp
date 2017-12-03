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
 * @fileoverview WebSQL database connector.
 *
 * @see http://www.w3.org/TR/webdatabase/
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.con.WebSql');
goog.require('goog.async.Deferred');
goog.require('goog.log');
goog.require('goog.functions');
goog.require('ydn.db.SecurityError');
goog.require('ydn.db.base');
goog.require('ydn.db.con.IDatabase');
goog.require('ydn.debug.error.NotImplementedException');
goog.require('ydn.json');
goog.require('ydn.string');



/**
 * Construct a WebSql database connector.
 * Note: Version is ignored, since it does work well.
 * @param {number=} opt_size estimated database size. Default to 5 MB.
 * @param {ydn.db.base.Mechanisms=} opt_type either WEBSQL or SQLITE
 * @implements {ydn.db.con.IDatabase}
 * @constructor
 * @struct
 */
ydn.db.con.WebSql = function(opt_size, opt_type) {

  // Safari default limit is slightly over 4 MB, so we ask the largest storage
  // size but, still not don't bother to user.
  // Opera don't ask user even request for 1 GB.
  /**
   * @private
   * @final
   * @type {number}
   */
  this.size_ = goog.isDef(opt_size) ? opt_size : 4 * 1024 * 1024; // 5 MB

  this.type_ = opt_type || ydn.db.base.Mechanisms.WEBSQL;
};


/**
 * @inheritDoc
 */
ydn.db.con.WebSql.prototype.connect = function(dbname, schema) {

  var description = dbname;

  /**
   * @type {ydn.db.con.WebSql}
   */
  var me = this;

  var old_version = NaN;
  var init_migrated = false;
  var df = new goog.async.Deferred();

  /**
   *
   * @param {Database} db database.
   * @param {Error=} opt_err error object only in case of error.
   */
  var setDb = function(db, opt_err) {
    if (goog.isDef(opt_err)) {
      me.sql_db_ = null;
      df.errback(opt_err);

    } else {
      me.sql_db_ = db;
      df.callback(parseFloat(old_version));
    }
  };


  /**
   * Migrate from current version to the new version.
   * @private
   * @param {Database} db database.
   * @param {ydn.db.schema.Database} schema  schema.
   * @param {boolean} is_version_change version change or not.
   */
  var doVersionChange_ = function(db, schema, is_version_change) {

    var action = is_version_change ? 'changing version' : 'setting version';

    var current_version = db.version ? parseInt(db.version, 10) : 0;
    var new_version = schema.isAutoVersion() ?
        is_version_change ? isNaN(current_version) ?
            1 : (current_version + 1) : current_version : schema.version;
    goog.log.fine(me.logger, dbname + ': ' + action + ' from ' +
        db.version + ' to ' + new_version);

    var executed = false;
    var updated_count = 0;

    /**
     * SQLTransactionCallback
     * @param {!SQLTransaction} tx transaction object.
     */
    var transaction_callback = function(tx) {
      // sniff current table info in the database.
      me.getSchema(function(existing_schema) {
        executed = true;
        for (var i = 0; i < schema.count(); i++) {
          var counter = function(ok) {
            if (ok) {
              updated_count++;
            }
          };
          var table_info = existing_schema.getStore(schema.store(i).getName());
          // hint to sniffed schema, so that some lost info are recovered.
          var hinted_store_schema = table_info ?
              table_info.hintForWebSql(schema.store(i)) : null;

          me.update_store_with_info_(tx, schema.store(i), counter,
              hinted_store_schema);
        }

        for (var j = 0; j < existing_schema.count(); j++) {
          var info_store = existing_schema.store(j);
          if (!schema.hasStore(info_store.getName())) {
            if (schema instanceof ydn.db.schema.EditableDatabase) {
              var edited_schema = schema;
              edited_schema.addStore(info_store);
            } else {
              var sql = 'DROP TABLE ' + info_store.getQuotedName();
              goog.log.finer(me.logger, sql);
              tx.executeSql(sql, [],
                  function(tr) {
                    // ok
                  }, function(tx, e) {
                    throw e;
                  });
            }
          }
        }

      }, tx, db);
    };

    /**
     * SQLVoidCallback
     */
    var success_callback = function() {
      var has_created = updated_count == schema.stores.length;
      if (!executed) {
        // success callback without actually executing
        goog.log.warning(me.logger, dbname + ': ' + action + ' voided.');
        //if (!me.df_sql_db_.hasFired()) { // FIXME: why need to check ?
        // this checking is necessary when browser prompt user,
        // this migration function run two times: one creating table
        // and one without creating table. How annoying ?
        // testing is in /test/test_multi_storage.html page.
      } else {
        var msg = '.';
        if (updated_count != schema.stores.length) {
          msg = ' but unexpected stores exists.';
        }
        goog.log.finest(me.logger, dbname + ':' + db.version + ' ready' + msg);
        setDb(db);
      }
    };

    /**
     * SQLTransactionErrorCallback
     * @param {SQLError} e error.
     */
    var error_callback = function(e) {
      goog.log.error(me.logger, 'SQLError ' + e + ' ' + e.code + '(' + e.message + ') ' +
          'while changing version from ' + db.version + ' to ' + new_version +
          ' on ' + dbname);
      if (ydn.db.con.WebSql.DEBUG) {
        goog.global.console.log(e);
      }
      throw e;
    };

    // db.transaction(transaction_callback, error_callback, success_callback);
    db.changeVersion(db.version, new_version + '', transaction_callback,
        error_callback, success_callback);

  };

  /**
   * @type {Database}
   */
  var db = null;

  var creationCallback = function(e) {
    var msg = init_migrated ?
        ' and already migrated, but migrating again.' : ', migrating.';
    goog.log.finest(me.logger, 'receiving creation callback ' + msg);

    // the standard state that we should call VERSION_CHANGE request on
    // this callback.
    // http://www.w3.org/TR/webdatabase/#dom-opendatabase
    var use_version_change_request = true;

    //if (!init_migrated) {
    // yeah, to make sure.
    doVersionChange_(db, schema, use_version_change_request);
    //}
  };

  try {
    /**
     * http://www.w3.org/TR/webdatabase/#dom-opendatabase
     *
     * Opening robust web database is tricky. Mainly due to the fact that
     * an empty database is created even if user deny to create the database.
     */
    var version = schema.isAutoVersion() ? '' : schema.version + '';

    // From the W3C description:
    // <snap>
    // If the database version provided is not the empty string, and there is
    // already a database with the given name from the origin origin, but the
    // database has a different version than the version provided, then throw
    // an INVALID_STATE_ERR exception and abort these steps.
    // </snap>
    //
    // Since we have no way of knowing, the database with different version
    // already exist in user browser, opening a version database with specific
    // version is unwise.
    //
    // Interestingly chrome and (Safari on OS X) do not emmit INVALID_STATE_ERR
    // even if the database already exist. It simply invokes creationCallback,
    // as it should.
    //
    // Hence, always open with empty string database version.
    if (this.type_ == ydn.db.base.Mechanisms.SQLITE) {
      // use sqlitePlugin
      if (goog.global['sqlitePlugin']) {
        db = goog.global['sqlitePlugin'].openDatabase(dbname, '', description, this.size_);
        if (!db.readTransaction) {
          db.readTransaction = db.transaction;
        }
        db.changeVersion = function(old_ver, new_ver, transaction_callback, error_callback, success_callback) {
          db.transaction(transaction_callback, error_callback, success_callback);
        };
      } else {
        goog.log.warning(this.logger, 'sqlitePlugin not found.');
        db = null;
        this.last_error_ = new Error('sqlitePlugin not found.');
      }

    } else {
      db = goog.global.openDatabase(dbname, '', description, this.size_);
    }
  } catch (e) {
    if (e.name == 'SECURITY_ERR') {
      goog.log.warning(this.logger, 'SECURITY_ERR for opening ' + dbname);
      db = null; // this will purge the tx queue
      // throw new ydn.db.SecurityError(e);
      // don't throw now, so that web app can handle without using
      // database.
      this.last_error_ = new ydn.db.SecurityError(e);
    } else {
      // this should never happen.
      throw e;
    }
  }

  if (!db) {
    setDb(null, this.last_error_);
  } else {

    // Even if db version are the same, we cannot assume schema are as expected.
    // Sometimes database is just empty with given version.

    // in case previous database fail, but user granted in next refresh.
    // In this case, empty database of the request version exist,
    // but no tables.

    // WebSQL return limbo database connection,
    // if user haven't decieted whether to allow to deny the storage.
    // the limbo database connection do not execute transaction.

    // version change concept in WebSQL is broken.
    // db.transaction request can alter or create table, which suppose to
    // be done only with db.changeVersion request.

    // the approach we taking here is, we still honour visioning of database
    // but, we do not assume, opening right version will have correct
    // schema as expected. If not correct, we will correct to the schema,
    // without increasing database version.

    old_version = db.version || ''; // sqlite does not have version attribute.

    var db_info = 'database ' + dbname +
        (old_version.length == 0 ? '' : ' version ' + db.version);

    if (goog.isDefAndNotNull(schema.version) && schema.version == db.version) {
      goog.log.fine(me.logger, 'Existing ' + db_info + ' opened as requested.');
      setDb(db);
    } else {
      // require upgrade check
      this.getSchema(function(existing_schema) {
        var msg = schema.difference(existing_schema, true, false);
        if (msg) {
          if (old_version == 0) {
            goog.log.fine(me.logger, 'New ' + db_info + ' created.');

            doVersionChange_(db, schema, true);
          } else if (!schema.isAutoVersion()) {
            goog.log.fine(me.logger, 'Existing ' + db_info + ' opened and ' +
                ' schema change to version ' + schema.version + ' for ' + msg);

            doVersionChange_(db, schema, true);
          } else {
            goog.log.fine(me.logger, 'Existing ' + db_info + ' opened and ' +
                'schema change for ' + msg);

            doVersionChange_(db, schema, true);
          }

        } else {
          // same schema.
          goog.log.fine(me.logger, 'Existing ' + db_info + ' with same schema opened.');
          setDb(db);
        }
      }, null, db);
    }

  }

  return df;
};


/**
 * @inheritDoc
 */
ydn.db.con.WebSql.prototype.getType = function() {
  return this.type_;
};


/**
 *
 * @type {Error} error.
 * @private
 */
ydn.db.con.WebSql.prototype.last_error_ = null;


/**
 * @type {Database} database instance.
 * @private
 */
ydn.db.con.WebSql.prototype.sql_db_ = null;


/**
 * @inheritDoc
 */
ydn.db.con.WebSql.prototype.getDbInstance = function() {
  return this.sql_db_ || null;
};


/**
 *
 * @return {boolean} true if supported.
 */
ydn.db.con.WebSql.isSupported = function() {
  return goog.isFunction(goog.global.openDatabase);
};


/**
 *
 * @return {boolean} true if sqlite is supported on cordova enviroment.
 */
ydn.db.con.WebSql.isSqliteSupported = function() {
  return !!goog.global['sqlitePlugin'];
};


/**
 * @const
 * @type {boolean} debug flag.
 */
ydn.db.con.WebSql.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.con.WebSql.prototype.logger =
    goog.log.getLogger('ydn.db.con.WebSql');


/**
 * @inheritDoc
 */
ydn.db.con.WebSql.prototype.onFail = function(e) {};


/**
 * @inheritDoc
 */
ydn.db.con.WebSql.prototype.onError = function(e) {};


/**
 * Initialize variable to the schema and prepare SQL statement for creating
 * the table.
 * @private
 * @param {ydn.db.schema.Store} table table schema.
 * @return {!Array.<string>} SQL statement for creating the table.
 */
ydn.db.con.WebSql.prototype.prepareCreateTable_ = function(table) {


  // prepare schema
  var primary_type = table.getSqlType();

  var insert_statement = 'CREATE TABLE IF NOT EXISTS ';
  var sql = insert_statement + table.getQuotedName() + ' (';

  var q_primary_column = table.getSQLKeyColumnNameQuoted();
  sql += q_primary_column + ' ' + primary_type +
      ' PRIMARY KEY ';

  if (table.autoIncrement) {
    sql += ' AUTOINCREMENT ';
  }


  // table must has a default field to store schemaless fields, unless
  // fixed table schema is used.
  if (!table.isFixed() ||
      // note: when even when using fixed schema, blob data are store in
      // default column when store is out-of-line non-indexing
      (!table.usedInlineKey()) && table.countIndex() == 0) {
    sql += ' ,' + ydn.db.base.DEFAULT_BLOB_COLUMN + ' ' +
        ydn.db.schema.DataType.BLOB;
  }

  var sqls = [];
  var sep = ', ';
  var column_names = [q_primary_column];

  for (var i = 0, n = table.countIndex(); i < n; i++) {
    /**
     * @type {ydn.db.schema.Index}
     */
    var index = table.index(i);
    var unique = '';
    if (index.isMultiEntry()) {
      // create separate table for multiEntry
      var idx_name = ydn.db.base.PREFIX_MULTIENTRY +
          table.getName() + ':' + index.getName();
      var idx_unique = index.isUnique() ? ' UNIQUE ' : '';
      var multi_entry_sql = insert_statement +
          goog.string.quote(idx_name) + ' (' +
          q_primary_column + ' ' + primary_type + ', ' +
          index.getSQLIndexColumnNameQuoted() + ' ' + index.getSqlType() +
          idx_unique + ')';
      sqls.push(multi_entry_sql);
      continue;
    } else if (index.isUnique()) {
      unique = ' UNIQUE ';
    }

    // http://sqlite.org/lang_createindex.html
    // http://www.sqlite.org/lang_createtable.html
    // Indexing just the column seems like counter productive. ?
    /*
     INTEGER PRIMARY KEY columns aside, both UNIQUE and PRIMARY KEY constraints
     are implemented by creating an index in the database (in the same way as a
     "CREATE UNIQUE INDEX" statement would). Such an index is used like any
     other index in the database to optimize queries. As a result, there often
     no advantage (but significant overhead) in creating an index on a set of
     columns that are already collectively subject to a UNIQUE or PRIMARY KEY
     constraint.
     */
    var key_path = index.getKeyPath();
    if (index.type != ydn.db.schema.DataType.BLOB && goog.isString(key_path)) {
      var idx_sql = 'CREATE ' + unique + ' INDEX IF NOT EXISTS ' +
          // table name is suffix to index name to satisfy unique index name
          // requirement within a database.
          goog.string.quote(table.getName() + '-' + index.getName()) +
          ' ON ' + table.getQuotedName() +
          ' (' + index.getSQLIndexColumnNameQuoted() + ')';
      sqls.push(idx_sql);
    }

    var index_key_path = index.getSQLIndexColumnNameQuoted();

    if (column_names.indexOf(index_key_path) == -1) {
      // store keyPath can also be indexed in IndexedDB spec

      sql += sep + index_key_path + ' ' + index.getSqlType() +
          unique;
      column_names.push(index_key_path);
    }

  }

  sql += ')';
  sqls.unshift(sql);

  return sqls;
};


/**
 * @inheritDoc
 */
ydn.db.con.WebSql.prototype.getVersion = function() {
  return this.sql_db_ ? parseFloat(this.sql_db_.version) : undefined;
};


/**
 * @inheritDoc
 */
ydn.db.con.WebSql.prototype.getSchema = function(callback, trans, db) {

  var me = this;
  db = db || this.sql_db_;

  var version = (db && db.version) ?
      parseFloat(db.version) : undefined;
  version = isNaN(version) ? undefined : version;

  /**
   * @final
   * @type {!Array.<ydn.db.schema.Store>}
   */
  var stores = [];

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var success_callback = function(transaction, results) {

    if (!results || !results.rows) {
      return;
    }
    for (var i = 0; i < results.rows.length; i++) {

      var info = /** @type {SqliteTableInfo} */ (results.rows.item(i));
      // console.log(info);

//      name: "st1"
//      rootpage: 5
//      sql: "CREATE TABLE "st1" ("id" TEXT UNIQUE PRIMARY KEY ,
//                                 _default_ undefined )"
//      tbl_name: "st1"
//      type: "table"

//      name: "sqlite_autoindex_st1_1"
//      rootpage: 6
//      sql: null
//      tbl_name: "st1"
//      type: "index"

      if (info.name == '__WebKitDatabaseInfoTable__') {
        continue;
      }
      if (info.name == 'sqlite_sequence') {
        // internal table used by Sqlite
        // http://www.sqlite.org/fileformat2.html#seqtab
        continue;
      }
      if (info.type == 'table') {
        var sql = goog.object.get(info, 'sql');
        goog.log.finest(me.logger,  'Parsing table schema from SQL: ' + sql);
        var str = sql.substr(sql.indexOf('('), sql.lastIndexOf(')'));
        var column_infos = ydn.string.split_comma_seperated(str);

        var store_key_path = undefined;
        var key_type;
        var indexes = [];
        var autoIncrement = false;
        var has_default_blob_column = false;

        for (var j = 0; j < column_infos.length; j++) {

          var fields = ydn.string.split_space_seperated(column_infos[j]);
          var upper_fields = goog.array.map(fields, function(x) {
            return x.toUpperCase();
          });
          var name = goog.string.stripQuotes(fields[0], '"');
          var type = ydn.db.schema.Index.toType(upper_fields[1]);
          // console.log([fields[1], type]);

          if (upper_fields.indexOf('PRIMARY') != -1 &&
              upper_fields.indexOf('KEY') != -1) {
            key_type = type;
            if (goog.isString(name) && !goog.string.isEmpty(name) &&
                name != ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME) {
              // console.log('PRIMARY ' + name + ' on ' + info.name);
              // Array key path is denoted by comma separated list.
              var arr_path = name.split(',');
              store_key_path = name;
              if (arr_path.length > 1) {
                store_key_path = arr_path;
                key_type = undefined;
              }
            }
            if (upper_fields.indexOf('AUTOINCREMENT') != -1) {
              autoIncrement = true;
            }
          } else if (name == ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME) {
            // pass, multi entry store use it as non-unique index key.
          } else if (name == ydn.db.base.DEFAULT_BLOB_COLUMN) {
            has_default_blob_column = true;
          } else {
            var unique = upper_fields[2] == 'UNIQUE';
            if (goog.string.startsWith(name, info.tbl_name + '-')) {
              name = name.substr(info.tbl_name.length + 1);
            }
            var index = new ydn.db.schema.Index(name, type, unique);
            // console.log(index);
            indexes.push(index);
          }
        }

        // multiEntry store, which store in separated table
        if (goog.string.startsWith(info.name,
            ydn.db.base.PREFIX_MULTIENTRY)) {
          var names = info.name.split(':');
          if (names.length >= 3) {
            var st_name = names[1];
            var multi_index = new ydn.db.schema.Index(names[2], type,
                unique, true);
            var ex_index = goog.array.findIndex(indexes, function(x) {
              return x.getName() == names[2];
            });
            if (ex_index >= 0) {
              indexes[ex_index] = multi_index;
            } else {
              indexes.push(multi_index);
            }
            var store_index = goog.array.findIndex(stores, function(x) {
              return x.getName() === st_name;
            });
            if (store_index >= 0) { // main table exist, add this index
              var ex_store = stores[store_index];
              stores[store_index] = new ydn.db.schema.Store(ex_store.getName(),
                  ex_store.getKeyPath(), autoIncrement,
                  key_type, indexes, undefined, !has_default_blob_column);
            } else { // main table don't exist, create a temporary table

              stores.push(new ydn.db.schema.Store(st_name, undefined, false,
                  undefined, [multi_index]));
            }
            goog.log.finest(me.logger,  'multi entry index "' + multi_index.getName() +
                '" found in ' + st_name + (store_index == -1 ? '*' : ''));
          } else {
            goog.log.warning(me.logger, 'Invalid multiEntry store name "' + info.name +
                '"');
          }
        } else {
          var i_store = goog.array.findIndex(stores, function(x) {
            return x.getName() === info.name;
          });
          if (i_store >= 0) {
            var ex_index = stores[i_store].index(0);
            goog.asserts.assertInstanceof(ex_index, ydn.db.schema.Index);
            indexes.push(ex_index);
            stores[i_store] = new ydn.db.schema.Store(info.name, store_key_path,
                autoIncrement, key_type, indexes, undefined,
                !has_default_blob_column);
          } else {
            var store = new ydn.db.schema.Store(info.name, store_key_path,
                autoIncrement, key_type, indexes, undefined,
                !has_default_blob_column);
            stores.push(store);
          }
        }

        //console.log([info, store]);
      }
    }

    var out = new ydn.db.schema.Database(version, stores);
    // console.log(out.toJSON());
    callback(out);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   */
  var error_callback = function(tr, error) {
    if (ydn.db.con.WebSql.DEBUG) {
      goog.global.console.log([tr, error]);
    }
    throw error;
  };

  if (!trans) {

    var tx_error_callback = function(e) {
      goog.log.error(me.logger, 'opening tx: ' + e.message);
      throw e;
    };

    db.readTransaction(function(tx) {
      me.getSchema(callback, tx, db);
    }, tx_error_callback, success_callback);

    return;
  }

  // var sql = 'PRAGMA table_info(' + goog.string.quote(table_name) + ')';
  // Invoking this will result error of:
  //   "could not prepare statement (23 not authorized)"

  var sql = 'SELECT * FROM sqlite_master';

  trans.executeSql(sql, [], success_callback, error_callback);
};


/**
 *
 * @param {SQLTransaction} trans transaction.
 * @param {ydn.db.schema.Store} store_schema schema.
 * @param {function(boolean)} callback callback on finished.
 * @private
 */
ydn.db.con.WebSql.prototype.update_store_ = function(trans, store_schema,
                                                     callback) {
  var me = this;
  this.getSchema(function(table_infos) {
    var table_info = table_infos.getStore(store_schema.getName());
    me.update_store_with_info_(trans, store_schema,
        callback, table_info);
  }, trans);
};


/**
 * Alter or create table with given table schema.
 * @param {SQLTransaction} trans transaction.
 * @param {ydn.db.schema.Store} table_schema table schema to be upgrade.
 * @param {function(boolean)?} callback callback on finished. return true
 * if table is updated.
 * @param {ydn.db.schema.Store|undefined} existing_table_schema table
 * information in the existing database.
 * @private
 */
ydn.db.con.WebSql.prototype.update_store_with_info_ = function(trans,
    table_schema, callback, existing_table_schema) {

  var me = this;

  var count = 0;

  var exe_sql = function(sql) {
    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var success_callback = function(transaction, results) {
      count++;
      if (count == sqls.length) {
        callback(true);
        callback = null; // must call only once.
      }
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     */
    var error_callback = function(tr, error) {
      if (ydn.db.con.WebSql.DEBUG) {
        goog.global.console.log([tr, error]);
      }
      count++;
      if (count == sqls.length) {
        callback(false); // false for no change
        callback = null; // must call only once.
      }
      var msg = goog.DEBUG ? 'SQLError creating table: ' +
          table_schema.getName() + ' ' + error.message + ' for executing "' +
          sql : '"';
      throw new ydn.db.SQLError(error, msg);
    };

    trans.executeSql(sql, [], success_callback, error_callback);
  };

  var sqls = this.prepareCreateTable_(table_schema);

  var action = 'Create';
  if (existing_table_schema) {
    // table already exists.
    var msg = table_schema.difference(existing_table_schema);
    if (msg.length == 0) {
      goog.log.finest(me.logger,  'same table ' + table_schema.getName() + ' exists.');
      callback(true);
      callback = null;
      return;
    } else {
      action = 'Modify';

      // ALTER TABLE cannot run in WebSQL
      goog.log.warning(this.logger,
          'table: ' + table_schema.getName() + ' has changed by ' + msg +
          ' ALTER TABLE cannot run in WebSql, dropping old table.');
      sqls.unshift('DROP TABLE IF EXISTS ' +
          goog.string.quote(table_schema.getName()));
    }
  }

  if (ydn.db.con.WebSql.DEBUG) {
    goog.global.console.log([sqls, existing_table_schema]);
  }

  goog.log.finest(me.logger,  action + ' table: ' + table_schema.getName() + ': ' +
      sqls.join(';'));
  for (var i = 0; i < sqls.length; i++) {
    exe_sql(sqls[i]);
  }

};


/**
 * @inheritDoc
 */
ydn.db.con.WebSql.prototype.isReady = function() {
  return !!this.sql_db_;
};


/**
 * @final
 */
ydn.db.con.WebSql.prototype.close = function() {
  // WebSQl API do not have close method.
  this.sql_db_ = null;
};


/**
 * @inheritDoc
 * @protected
 */
ydn.db.con.WebSql.prototype.doTransaction = function(trFn, scopes, mode,
                                                     completed_event_handler) {

  var me = this;

  /**
   * SQLTransactionCallback
   * @param {!SQLTransaction} tx transaction.
   */
  var transaction_callback = function(tx) {
    trFn(tx);
  };

  /**
   * SQLVoidCallback
   */
  var success_callback = function() {
    completed_event_handler(ydn.db.base.TxEventTypes.COMPLETE,
        {'type': ydn.db.base.TxEventTypes.COMPLETE});
  };

  /**
   * SQLTransactionErrorCallback
   * @param {SQLError} e error.
   */
  var error_callback = function(e) {
    goog.log.finest(me.logger,  me + ': Tx ' + mode + ' request cause error.');
    // NOTE: we have to call ABORT, instead of ERROR, here.
    // IndexedDB API use COMPLETE or ABORT as promise callbacks.
    // ERROR is just an event.
    completed_event_handler(ydn.db.base.TxEventTypes.ABORT, e);
  };

  if (goog.isNull(this.sql_db_)) {
    // this happen on SECURITY_ERR
    trFn(null);
    // NOTE: we have to call ABORT, instead of ERROR, here. See above.
    completed_event_handler(ydn.db.base.TxEventTypes.ABORT,
        this.last_error_);
  }

  if (mode == ydn.db.base.TransactionMode.READ_ONLY) {
    this.sql_db_.readTransaction(transaction_callback,
        error_callback, success_callback);
  } else if (mode == ydn.db.base.TransactionMode.VERSION_CHANGE) {
    var next_version = this.sql_db_.version + 1;
    this.sql_db_.changeVersion(this.sql_db_.version, next_version + '',
        transaction_callback, error_callback, success_callback);
  } else {
    this.sql_db_.transaction(transaction_callback,
        error_callback, success_callback);
  }

};


/**
 *
 * @param {string} db_name database name to be deleted.
 * @param {string=} opt_type delete only specific types.
 */
ydn.db.con.WebSql.deleteDatabase = function(db_name, opt_type) {
  if (!ydn.db.con.WebSql.isSupported() ||
      (!!opt_type && opt_type != ydn.db.base.Mechanisms.WEBSQL)) {
    return;
  }
  // WebSQL API does not expose deleting database.
  // Dropping all tables indeed delete the database.
  var db = new ydn.db.con.WebSql();
  var schema = new ydn.db.schema.EditableDatabase();
  goog.log.finer(db.logger, 'deleting websql database: ' + db_name);
  var df = db.connect(db_name, schema);

  var on_completed = function(t, e) {
    goog.log.info(db.logger, 'all tables in ' + db_name + ' deleted.');
  };

  df.addCallback(function() {

    db.doTransaction(function delete_tables(tx) {

      /**
       * @param {SQLTransaction} transaction transaction.
       * @param {SQLResultSet} results results.
       */
      var success_callback = function(transaction, results) {
        if (!results || !results.rows) {
          return;
        }
        var n = results.rows.length;
        var del = 0;
        for (var i = 0; i < n; i++) {
          var info = /** @type {SqliteTableInfo} */ (results.rows.item(i));
          if (info.name == '__WebKitDatabaseInfoTable__' ||
              info.name == 'sqlite_sequence') {
            continue;
          }
          del++;
          goog.log.finest(db.logger, 'deleting table: ' + info.name);
          tx.executeSql('DROP TABLE ' + info.name);
        }
        goog.log.finer(db.logger, del + ' tables deleted from "' + db_name + '"');
      };

      /**
       * @param {SQLTransaction} tr transaction.
       * @param {SQLError} error error.
       */
      var error_callback = function(tr, error) {
        if (ydn.db.con.WebSql.DEBUG) {
          goog.global.console.log([tr, error]);
        }
        throw error;
      };

      var sql = 'SELECT * FROM sqlite_master WHERE type = "table"';

      tx.executeSql(sql, [], success_callback, error_callback);

    }, [], ydn.db.base.TransactionMode.READ_WRITE, on_completed);

  });
  df.addErrback(function() {
    goog.log.warning(db.logger, 'Connecting ' + db_name + ' failed.');
  });
};
ydn.db.databaseDeletors.push(ydn.db.con.WebSql.deleteDatabase);


/**
 * @inheritDoc
 */
ydn.db.con.WebSql.prototype.onVersionChange = function(e) {};


if (goog.DEBUG) {
  /**
   * @override
   */
  ydn.db.con.WebSql.prototype.toString = function() {
    var s = this.sql_db_ ? ':' + this.sql_db_.version : '';
    return 'WebSql:' + s;
  };
}
