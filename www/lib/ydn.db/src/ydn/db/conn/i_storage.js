/**
 * @fileoverview Interface for database service provider.
 */


goog.provide('ydn.db.con.IStorage');
goog.require('goog.async.Deferred');



/**
 * @interface
 */
ydn.db.con.IStorage = function() {};


/**
 * Close the connection.
 */
ydn.db.con.IStorage.prototype.close = goog.abstractMethod;


/**
 * Run a transaction.
 * @param {function((!IDBTransaction|!SQLTransaction|Object))|!Function} trFn
 * function that invoke in the transaction.
 * @param {!Array.<string>} store_names list of keys or
 * store name involved in the transaction.
 * @param {ydn.db.base.TransactionMode=} mode mode, default to 'readonly'.
 * @param {function(ydn.db.base.TxEventTypes, *)=}
  * completed_event_handler handler for completed event.
 */
ydn.db.con.IStorage.prototype.transaction = goog.abstractMethod;




