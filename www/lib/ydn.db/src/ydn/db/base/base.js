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
 * @fileoverview Define base constants.
 *
 */


goog.provide('ydn.db.base');
goog.provide('ydn.db.base.Transaction');
goog.require('goog.async.Deferred');
goog.require('ydn.async.Deferred');


/**
 * When key column is not defined, You can access the ROWID of an SQLite table
 * using one the special column names ROWID, _ROWID_, or OID.
 *
 * http://www.sqlite.org/autoinc.html
 * @const
 * @type {string}
 */
ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME = '_ROWID_';


/**
 * SQLite store serialized object into this default column. This library
 * always create table with this default column of type BLOB.
 * @const
 * @type {string}
 */
ydn.db.base.DEFAULT_BLOB_COLUMN = '_default_';


/**
 * Install event dispatcher.
 * @define {boolean} true for dispatching.
 */
ydn.db.base.DISPATCH_EVENT = false;


/**
 * Default result limit during retrieving records from the database.
 * @const
 * @type {number}
 */
ydn.db.base.DEFAULT_RESULT_LIMIT = 100;


/**
 * Default connection time interval in ms.
 * @define {number} ms.
 */
ydn.db.base.DEFAULT_CONNECTION_TIMEOUT = 30 * 60 * 1000;


/**
 * @enum {string} storage mechanism type.
 */
ydn.db.base.Mechanisms = {
  IDB: 'indexeddb',
  USER_DATA: 'userdata',
  LOCAL_STORAGE: 'localstorage',
  MEMORY_STORAGE: 'memory',
  SESSION_STORAGE: 'sessionstorage',
  SQLITE: 'sqlite',
  WEBSQL: 'websql'
};


/**
 * Event types the Transaction can dispatch. COMPLETE events are dispatched
 * when the transaction is committed. If a transaction is aborted it dispatches
 * both an ABORT event and an ERROR event with the ABORT_ERR code. Error events
 * are dispatched on any error.
 *
 * @see {@link goog.db.Transaction.EventTypes}
 *
 * @enum {string}
 */
ydn.db.base.TxEventTypes = {
  COMPLETE: 'complete',
  ABORT: 'abort',
  ERROR: 'error'
};


/**
 * The three possible transaction modes in standard TransactionMode.
 * @see http://lists.w3.org/Archives/Public/public-webapps/2013JanMar/0615.html
 * @enum {string}
 */
ydn.db.base.StandardTransactionMode = {
  'READ_ONLY': 'readonly',
  'READ_WRITE': 'readwrite',
  'VERSION_CHANGE': 'versionchange'
};


/**
 * Before Chrome 22, IDBTransaction mode are number. New standard change to
 * string. Chrome 22 still follow standard, but weird new constants are
 * taking from the new standard.
 * HACK: The fun fact with current Chrome 22 defines  webkitIDBTransaction as
 * numeric value, but the database engine expect string format and display
 * deprecated warning.
 * For detail discussion see:
 * https://bitbucket.org/ytkyaw/ydn-db/issue/28
 * http://code.google.com/p/chromium/issues/detail?id=155171
 * https://bitbucket.org/ytkyaw/ydn-db/pull-request/8 Old firefox has them too.
 * https://bitbucket.org/ytkyaw/ydn-db/issue/57
 * @const
 * @type {*}
 * @protected
 */
ydn.db.base.IDBTransaction =
    // old Firefox use predefined numeric enum.
    (goog.global.IDBRequest &&
        ('LOADING' in goog.global.IDBRequest)) ?
        goog.global.IDBTransaction :
        // old chrome use predefined enum, it can be string or numeric. ?
        (goog.global.webkitIDBRequest &&
            // old webkit has this const.
            ('LOADING' in goog.global.webkitIDBRequest &&
            // old Chrome define 1 and use;
            // however Android Webkit define 0, but not used
            goog.global.webkitIDBTransaction.READ_WRITE === 1)) ?
            goog.global.webkitIDBTransaction :
            // for all others, assume standard.
            ydn.db.base.StandardTransactionMode;


/**
 * The three possible transaction modes.
 * @see http://www.w3.org/TR/IndexedDB/#idl-def-IDBTransaction
 * @enum {string|number} string in new standard, number in old.
 */
ydn.db.base.TransactionMode = {
  READ_ONLY: ydn.db.base.IDBTransaction.READ_ONLY,
  READ_WRITE: ydn.db.base.IDBTransaction.READ_WRITE,
  VERSION_CHANGE: ydn.db.base.IDBTransaction.VERSION_CHANGE
};


/**
 * @define {boolean} if true, a default key-value text store should be created
 * in the absent of configuration option.
 */
ydn.db.base.ENABLE_DEFAULT_TEXT_STORE = false;


/**
 * @define {boolean} flag to indicate to enable encryption.
 */
ydn.db.base.ENABLE_ENCRYPTION = false;


/**
 * Cursor direction.
 * @link http://www.w3.org/TR/IndexedDB/#dfn-direction
 * @enum {string} Cursor direction.
 */
ydn.db.base.Direction = {
  NEXT: 'next',
  NEXT_UNIQUE: 'nextunique',
  PREV: 'prev',
  PREV_UNIQUE: 'prevunique'
};


/**
 * @const
 * @type {!Array.<ydn.db.base.Direction>} Cursor directions.
 */
ydn.db.base.DIRECTIONS = [
  ydn.db.base.Direction.NEXT,
  ydn.db.base.Direction.NEXT_UNIQUE,
  ydn.db.base.Direction.PREV,
  ydn.db.base.Direction.PREV_UNIQUE
];


/**
 * Convert flag to direction enum.
 * @param {boolean=} opt_reverse true to reverse direction.
 * @param {boolean=} opt_unique true to unique.
 * @return {ydn.db.base.Direction} IndexedDB cursor direction value.
 */
ydn.db.base.getDirection = function(opt_reverse, opt_unique) {
  if (opt_reverse) {
    return opt_unique ? ydn.db.base.Direction.PREV_UNIQUE :
        ydn.db.base.Direction.PREV;
  } else {
    return opt_unique ? ydn.db.base.Direction.NEXT_UNIQUE :
        ydn.db.base.Direction.NEXT;
  }
};


/**
 * @const
 * @type {IDBFactory} IndexedDb.
 */
ydn.db.base.indexedDb = goog.global.indexedDB ||
    goog.global.mozIndexedDB || goog.global.webkitIndexedDB ||
    goog.global.moz_indexedDB ||
    goog.global['msIndexedDB'];


/**
 * @const
 * @type {string} column name prefix for multiEntry index.
 */
ydn.db.base.PREFIX_MULTIENTRY = 'ydn.db.me:';


/**
 * Query method used in sql iterator.
 * @enum {number}
 */
ydn.db.base.QueryMethod = {
  NONE: 0,
  LIST_KEY: 1,
  LIST_PRIMARY_KEY: 2,
  LIST_KEYS: 3,
  LIST_VALUE: 4,
  GET: 5,
  COUNT: 6
};


/**
 * @typedef {(SQLTransaction|IDBTransaction|Object)}
 */
ydn.db.base.Transaction;
