/**
 * @fileoverview Exports for ydn-db CRUD module.
 *
 */


goog.provide('ydn.db.Storage');
goog.require('ydn.db.con.exports');
goog.require('ydn.db.crud.Storage');
goog.require('ydn.db.crud.exports');



/**
 * Create a suitable storage mechanism from indexdb, to websql to
 * localStorage.
 *
 * If database name and schema are provided, this will immediately initialize
 * the database and ready to use. However if any of these two are missing,
 * the database is not initialize until they are set by calling
 * {@link #setName} and {@link #setSchema}.
 * @see goog.db Google Closure Library DB module.
 * @param {string=} opt_dbname database name.
 * @param {(ydn.db.schema.Database|!DatabaseSchema)=} opt_schema database
 * schema
 * or its configuration in JSON format. If not provided, default empty schema
 * is used.
 * @param {!StorageOptions=} opt_options options.
 * @extends {ydn.db.crud.Storage}
 * @constructor *
 */
ydn.db.Storage = function(opt_dbname, opt_schema, opt_options) {
  goog.base(this, opt_dbname, opt_schema, opt_options);

};
goog.inherits(ydn.db.Storage, ydn.db.crud.Storage);


goog.exportSymbol('ydn.db.Storage', ydn.db.Storage);

