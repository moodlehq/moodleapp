/**
 * @fileoverview Interface for executing database request.
 *
 */


goog.provide('ydn.db.core.IOperator');
goog.require('ydn.db.crud.IOperator');



/**
 * @extends {ydn.db.crud.IOperator}
 * @interface
 */
ydn.db.core.IOperator = function() {};


/**
 * Map operation.
 * @param {!ydn.db.Iterator} iterator
 * @param {?function(*): (*|undefined)} callback
 * @return {!goog.async.Deferred} deferred.
 */
ydn.db.core.IOperator.prototype.map = goog.abstractMethod;


/**
 * Reduce operation.
 * @param {!ydn.db.Iterator} iterator iterator.
 * @param {function(*, *, number): *} callback callback.
 * @param {*=} opt_initial initial value.
 * @return {!goog.async.Deferred} deferred.
 */
ydn.db.core.IOperator.prototype.reduce = goog.abstractMethod;




