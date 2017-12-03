/**
 * @fileoverview Provider for WebStorage like storage.
 */


goog.provide('ydn.db.con.simple.IStorageProvider');



/**
 * @interface
 */
ydn.db.con.simple.IStorageProvider = function() {};


/**
 * @param {string} db_name
 * @return {!Storage}
 */
ydn.db.con.simple.IStorageProvider.prototype.connectDb = function (db_name) {};