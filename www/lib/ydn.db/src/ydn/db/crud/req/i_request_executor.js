/**
 * @fileoverview Execute data request.
 *
 * Before invoking database request, transaction object (tx) must set
 * and active. Caller must preform setting tx. This class will not check
 * it, but run immediately. Basically thinks this as a static object.
 */


goog.provide('ydn.db.crud.req.IRequestExecutor');
goog.provide('ydn.db.crud.req.ListType');



/**
 * @interface
 */
ydn.db.crud.req.IRequestExecutor = function() {};


/**
 * Delete given key in the object store.
 * Return number of keys deleted.
 * @param {ydn.db.Request} req request.
 * @param {string} store table name.
 * @param {(IDBKey)} id object key to be deleted.
 */
ydn.db.crud.req.IRequestExecutor.prototype.removeById = goog.abstractMethod;


/**
 * Delete given key in the object store.
 * Return number of keys deleted.
 * @param {ydn.db.Request} req request.
 * @param {(!Array.<!ydn.db.Key>)} id object key to be deleted.
 */
ydn.db.crud.req.IRequestExecutor.prototype.removeByKeys =
    goog.abstractMethod;


/**
 * Clear records in the given key range from a store.
 * Return number of keys deleted.
 * @param {ydn.db.Request} req request.
 * @param {string} store table name.
 * @param {IDBKeyRange} key range.
 */
ydn.db.crud.req.IRequestExecutor.prototype.removeByKeyRange =
    goog.abstractMethod;


/**
 * Clear records in the given key range from a store.
 * Return number of keys deleted.
 * @param {ydn.db.Request} req request.
 * @param {string} store table name.
 * @param {string} index name.
 * @param {IDBKeyRange} key range.
 */
ydn.db.crud.req.IRequestExecutor.prototype.removeByIndexKeyRange = goog.abstractMethod;


/**
 * Clear records in the given key range from a store.
 * Return number of keys deleted.
 * @param {ydn.db.Request} req request.
 * @param {string} store table name.
 * @param {IDBKeyRange} key range.
 */
ydn.db.crud.req.IRequestExecutor.prototype.clearByKeyRange =
    goog.abstractMethod;


/**
 * Clear a store or stores.
 * Return number of stores deleted.
 * @param {ydn.db.Request} req request.
 * @param {(!Array.<string>)=} store table name.
 */
ydn.db.crud.req.IRequestExecutor.prototype.clearByStores = goog.abstractMethod;


/**
 * @param {ydn.db.Request} req request.
 * @param {!Array.<string>} table store name.
 */
ydn.db.crud.req.IRequestExecutor.prototype.countStores = goog.abstractMethod;


/**
 * @param {ydn.db.Request} req request.
 * @param {string} table store name.
 * @param {IDBKeyRange} keyRange the key range.
 * @param {(string|undefined)} index name.
 * @param {boolean} unique count unique index key. Note: indexeddb cannot
 * count with unique, while websql can.
 */
ydn.db.crud.req.IRequestExecutor.prototype.countKeyRange = goog.abstractMethod;


/**
 * Return object
 * @param {ydn.db.Request} req request.
 * @param {string} store table name.
 * @param {!IDBKey} id object key to be retrieved, if not
 * provided,
 * all entries in the store will return.
 */
ydn.db.crud.req.IRequestExecutor.prototype.getById = goog.abstractMethod;


/**
 * Execute GET request callback results to df.
 * @param {ydn.db.Request} req request.
 * @param {string} store_name table name.
 * @param {!Array.<!IDBKey>} ids id to get.
 * @throws {ydn.db.InvalidKeyException}
 * @throws {ydn.error.InternalError}
 */
ydn.db.crud.req.IRequestExecutor.prototype.listByIds = goog.abstractMethod;


/**
 * Execute GET request callback results to df.
 * @param {ydn.db.Request} req request.
 * @param {!Array.<!ydn.db.Key>} keys id to get.
 */
ydn.db.crud.req.IRequestExecutor.prototype.listByKeys = goog.abstractMethod;


/**
 * Execute PUT request to the store of given records in delimited text.
 * @param {ydn.db.base.Transaction} tx
 *  @param {string} tx_no transaction number
 * @param {?function(*, boolean=)} df deferred to feed result.
 * @param {string} store_name table name.
 * @param {string} data delimited text to put. one object per line.
 * @param {string} delimiter field delimiter.
 */
ydn.db.crud.req.IRequestExecutor.prototype.putData = goog.abstractMethod;


/**
 * Put objects and return list of key inserted.
 * @param {ydn.db.Request} rq request.
 * @param {boolean} is_replace true if `put`, otherwise `add`.
 * @param {boolean} is_single true if result take only the first result.
 * @param {string} store_name store name.
 * @param {!Array.<!Object>} objs object to put.
 * @param {!Array.<IDBKey>=} opt_keys optional out-of-line keys.
 */
ydn.db.crud.req.IRequestExecutor.prototype.insertObjects = goog.abstractMethod;


/**
 * @param {ydn.db.Request} req request.
 * @param {!Array.<Object>} objs object to put.
 * @param {!Array.<!ydn.db.Key>} keys list of keys.
 */
ydn.db.crud.req.IRequestExecutor.prototype.putByKeys = goog.abstractMethod;


/**
 * Execute GET request callback results to df.
 * @param {ydn.db.Request} req request.
 * @param {ydn.db.base.QueryMethod} type result type.
 * @param {string} store name.
 * @param {string?} index name.
 * @param {IDBKeyRange} key range to get.
 * @param {number} limit the results.
 * @param {number} offset skip first results.
 * @param {boolean} reverse to sort reverse order.
 * @param {boolean} unique unique key.
 * @param {Array.<IDBKey|undefined>=} opt_position last cursor position.
 */
ydn.db.crud.req.IRequestExecutor.prototype.list =
    goog.abstractMethod;

