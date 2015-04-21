/**
 * @fileoverview basic utilities.
 */

goog.provide('ydn.db.con.simple');


/**
 * Storage key namespace.
 * @const
 * @type {string}  Storage key namespace.
 */
ydn.db.con.simple.NAMESPACE = 'ydn.db';


/**
 *
 * @const
 * @type {string} separator between tokens.
 */
ydn.db.con.simple.SEP = '^|';


/**
 * Use store name and id to form a key to use in setting key to storage.
 * @param {string} db_name database name.
 * @param {string=} opt_store_name table name.
 * @param {string=} opt_index_name table name.
 * @param {IDBKey=} opt_id id.
 * @return {string} canonical key name.
 */
ydn.db.con.simple.makeKey = function(db_name, opt_store_name, opt_index_name,
                                      opt_id) {
  var parts = [ydn.db.con.simple.NAMESPACE, db_name];
  if (goog.isDef(opt_store_name)) {
    parts.push(opt_store_name);
    if (goog.isDef(opt_index_name)) {
      parts.push(opt_index_name);
      if (goog.isDef(opt_id)) {
        parts.push(ydn.db.utils.encodeKey(opt_id));
      }
    }
  }
  return parts.join(ydn.db.con.simple.SEP);
};
