/**
 * @fileoverview Cursor stream interface.
 *
 * Push key to seek method. This will pop the result to sink function. It
 * is set during initialization.
 *
 * User: kyawtun
 * Date: 11/11/12
 */

goog.provide('ydn.db.con.ICursorStream');



/**
 *
 * @interface
 */
ydn.db.con.ICursorStream = function() {};


/**
 * Request to seek to a key. This will pop the result to sink function. It
 * is set during initialization.
 * @param {*} key
 */
ydn.db.con.ICursorStream.prototype.seek = goog.abstractMethod;


/**
 * Invoke callback when all stack are completely fetched.
 * @param {Function} callback
 */
ydn.db.con.ICursorStream.prototype.onFinish = goog.abstractMethod;