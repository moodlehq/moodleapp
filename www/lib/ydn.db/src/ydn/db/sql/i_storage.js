/**
 * @fileoverview Interface for executing database request.
 *
 */


goog.provide('ydn.db.sql.IStorage');
goog.require('ydn.db.sql.req.IRequestExecutor');
goog.require('ydn.db.core.IOperator');



/**
 * @extends {ydn.db.core.IOperator}
 * @interface
 */
ydn.db.sql.IStorage = function() {};

//
//
///**
// * @throws {ydn.db.ScopeError}
// * @param {function(!ydn.db.core.req.IRequestExecutor)} callback callback function
// * when request executor is ready.
// * @param {!Array.<string>} store_names store name involved in the transaction.
// * @param {ydn.db.base.TransactionMode} mode mode, default to 'readonly'.
// */
//ydn.db.sql.IStorage.prototype.exec = goog.abstractMethod;


