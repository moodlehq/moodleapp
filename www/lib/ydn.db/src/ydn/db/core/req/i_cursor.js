/**
 * @fileoverview cursor interface.
 */


goog.provide('ydn.db.core.req.ICursor');
goog.require('goog.disposable.IDisposable');



/**
 * @interface
 * @extends {goog.disposable.IDisposable}
 */
ydn.db.core.req.ICursor = function() {};


/**
 *
 * @param {!Error} error
 */
ydn.db.core.req.ICursor.prototype.onError = goog.abstractMethod;


/**
 * onSuccess handler is called before onNext callback. The purpose of
 * onSuccess handler is apply filter. If filter condition are not meet,
 * onSuccess return next advancement value skipping onNext callback.
 *
 * @param {IDBKey=} primary_key
 * @param {IDBKey=} key
 * @param {*=} value
 * @return {*}
 */
ydn.db.core.req.ICursor.prototype.onSuccess = goog.abstractMethod;


/**
 * Make cursor opening request.
 *
 * This will seek to given initial position if given. If only ini_key (primary
 * key) is given, this will rewind, if not found.
 *
 * @param {IDBKey=} opt_ini_key effective key to resume position.
 * @param {IDBKey=} opt_ini_primary_key primary key to resume position.
 */
ydn.db.core.req.ICursor.prototype.openCursor =
    function(opt_ini_key, opt_ini_primary_key) {};


/**
 * Move cursor position to the primary key while remaining on same index key.
 * @param {IDBKey} primary_key primary key position to continue.
 */
ydn.db.core.req.ICursor.prototype.continuePrimaryKey =
    function(primary_key) {};


/**
 * Move cursor position to the effective key.
 * @param {IDBKey=} opt_effective_key effective key position to continue.
 */
ydn.db.core.req.ICursor.prototype.continueEffectiveKey =
    function(opt_effective_key) {};


/**
 * Move cursor position to the effective key.
 * @param {number} number_of_step
 */
ydn.db.core.req.ICursor.prototype.advance = function(number_of_step) {};


/**
 * Restart the cursor. If previous cursor position is given,
 * the position is skip.
 * @param {IDBKey=} effective_key previous position.
 * @param {IDBKey=} primary_key
 */
ydn.db.core.req.ICursor.prototype.restart =
    function(effective_key, primary_key) {};


/**
 * @return {boolean}
 */
ydn.db.core.req.ICursor.prototype.hasCursor = function() {};


/**
 * @param {!Object} obj record value.
 * @return {!goog.async.Deferred} value.
 */
ydn.db.core.req.ICursor.prototype.update = function(obj) {};


/**
 * Clear record
 * @return {!goog.async.Deferred} value.
 */
ydn.db.core.req.ICursor.prototype.clear = function() {};


/**
 *
 * @return {boolean} return true if this is an index cursor.
 */
ydn.db.core.req.ICursor.prototype.isIndexCursor = function() {};


/**
 *
 * @return {boolean} return true if this is an index cursor.
 * @deprecated use isIndexCursor instead.
 */
ydn.db.core.req.ICursor.prototype.isPrimaryCursor = function() {};


/**
 *
 * @return {boolean} return true if this is an value cursor.
 */
ydn.db.core.req.ICursor.prototype.isValueCursor = function() {};


/**
 * @return {IDBKey|undefined} effective key of cursor.
 */
ydn.db.core.req.ICursor.prototype.getKey = function() {};


/**
 * @return {IDBKey|undefined} primary key of cursor.
 */
ydn.db.core.req.ICursor.prototype.getPrimaryKey = function() {};


/**
 * @param {number=} opt_idx cursor index.
 * @return {*} value.
 */
ydn.db.core.req.ICursor.prototype.getValue = function(opt_idx) {};
