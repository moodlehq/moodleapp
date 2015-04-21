/**
 * @fileoverview Mutable database schema.
 */


goog.provide('ydn.db.schema.EditableDatabase');
goog.require('ydn.db.schema.Database');



/**
 *
 * @param {DatabaseSchema|number|string=} opt_version version, if string,
 * it must be parse to int.
 * @param {!Array.<!ydn.db.schema.Store>=} opt_stores store schemas.
 * @constructor
 * @extends {ydn.db.schema.Database}
 */
ydn.db.schema.EditableDatabase = function(opt_version, opt_stores) {
  goog.base(this, opt_version, opt_stores);
};
goog.inherits(ydn.db.schema.EditableDatabase, ydn.db.schema.Database);


/**
 * @override
 */
ydn.db.schema.EditableDatabase.prototype.isAutoSchema = function() {
  return true;
};


/**
 *
 * @param {!ydn.db.schema.Store} table store.
 */
ydn.db.schema.EditableDatabase.prototype.addStore = function(table) {
  this.stores.push(table);
};
