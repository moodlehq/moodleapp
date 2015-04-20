/**
 * @fileoverview Interface for index base request.
 *
 */


goog.provide('ydn.db.sql.req.IRequestExecutor');
goog.require('ydn.db.Sql');
goog.require('ydn.db.Streamer');
goog.require('ydn.db.crud.req.IRequestExecutor');




/**
 * @interface
 * @extends {ydn.db.core.req.IRequestExecutor}
 */
ydn.db.sql.req.IRequestExecutor = function() {};


/**
 * Execute SQL statement.
 * @param {ydn.db.Request} rq
 * @param {!ydn.db.Sql} sql  SQL object.
 * @param {!Array} params SQL parameters.
 */
ydn.db.sql.req.IRequestExecutor.prototype.executeSql = goog.abstractMethod;


