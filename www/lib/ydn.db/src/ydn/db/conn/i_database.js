/**
 * @fileoverview Interface for database connector.
 */


goog.provide('ydn.db.con.IDatabase');
goog.require('goog.async.Deferred');



/**
 * @interface
 */
ydn.db.con.IDatabase = function() {};


/**
 * Close the connection.
 */
ydn.db.con.IDatabase.prototype.close = function() {};


/**
 * Return readable representation of storage mechanism. It should be all lower
 * case and use in type checking.
 * @return {string} connected database type.
 */
ydn.db.con.IDatabase.prototype.getType = function() {};


/**
 * @return {boolean} ready status.
 */
ydn.db.con.IDatabase.prototype.isReady = function() {};


/**
 * @param {string} name database name.
 * @param {!ydn.db.schema.Database} schema database schema.
 * @return {!goog.async.Deferred} promise on connected.
 */
ydn.db.con.IDatabase.prototype.connect = function(name, schema) {};


/**
 * @return {number|undefined} return current version;
 */
ydn.db.con.IDatabase.prototype.getVersion = goog.abstractMethod;


/**
 * @return {*} underlying database.
 */
ydn.db.con.IDatabase.prototype.getDbInstance = function() {};


/**
 * Perform transaction immediately and invoke transaction_callback with
 * the transaction object.
 * Database adaptor must invoke completed_event_handler
 * when the data is transaction completed.
 * Caller must not invoke this method until transaction completed event is
 * fired.
 * @param {function(ydn.db.base.Transaction)}
  * transaction_callback callback function that invoke in the transaction with
 * transaction instance.
 * @param {Array.<string>} store_names list of store names involved in the
 * transaction.
 * @param {ydn.db.base.TransactionMode} mode mode, default to 'read_write'.
 * @param {function(ydn.db.base.TxEventTypes, *)}
  * completed_event_handler handler for on completed event.
 */
ydn.db.con.IDatabase.prototype.doTransaction = goog.abstractMethod;


/**
 *
 * @param {function(ydn.db.schema.Database)} callback database schema obtained
 * by reflecting connected database.
 * @param {(SQLTransaction|IDBTransaction|Object)=} trans transaction to reuse.
 * @param {(IDBDatabase|Database)=} db database to reuse.
 */
ydn.db.con.IDatabase.prototype.getSchema = goog.abstractMethod;


/**
 * On terminal failure.
 * @type {Function}
 */
ydn.db.con.IDatabase.prototype.onFail = goog.abstractMethod;


/**
 * On terminal failure.
 * @type {Function}
 */
ydn.db.con.IDatabase.prototype.onError = goog.abstractMethod;


/**
 * On terminal failure.
 * @type {Function}
 */
ydn.db.con.IDatabase.prototype.onVersionChange = goog.abstractMethod;

