/**
 * @fileoverview WHERE clause as keyRange object.
 */


goog.provide('ydn.db.Where');
goog.require('goog.string');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.utils');
goog.require('ydn.debug.error.ArgumentException');



/**
 * For those browser that not implemented IDBKeyRange.
 * @param {string} field index field name to query from.
 * @param {string|KeyRangeJson|ydn.db.KeyRange} op where operator.
 * @param {IDBKey=} opt_value rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {IDBKey=} opt_value2 second rvalue to compare.
 * @constructor
 */
ydn.db.Where = function(field, op, opt_value, opt_op2, opt_value2) {
  /**
   * @final
   * @private
   */
  this.key_range_ = op instanceof ydn.db.KeyRange ?
      op : goog.isString(op) && goog.isDef(opt_value) ?
      ydn.db.KeyRange.where(op, opt_value, opt_op2, opt_value2) :
      ydn.db.KeyRange.parseKeyRange(/** @type {KeyRangeJson} */ (op));
  /**
   * @final
   */
  this.field = field;
};


/**
 *
 * @type {string}
 * @protected
 */
ydn.db.Where.prototype.field = '';


/**
 *
 * @type {ydn.db.KeyRange}
 * @private
 */
ydn.db.Where.prototype.key_range_;


/**
 *
 * @return {string}
 */
ydn.db.Where.prototype.getField = function() {
  return this.field;
};


/**
 *
 * @return {ydn.db.KeyRange}
 */
ydn.db.Where.prototype.getKeyRange = function() {
  return this.key_range_;
};


/**
 * Try to resolve keyRange with starts with keyRange.
 * @param {ydn.db.KeyRange|ydn.db.IDBKeyRange=} keyRange key range to check.
 * @return {boolean} true if given key range can be resolved to starts with
 * keyRange.
 */
ydn.db.Where.resolvedStartsWith = function(keyRange) {
  if (!goog.isDefAndNotNull(keyRange) ||
      !goog.isDefAndNotNull(keyRange.lower) ||
      !goog.isDefAndNotNull(keyRange.upper)) {
    return false;
  }
  if (goog.isArray(keyRange.lower) && goog.isArray(keyRange.upper)) {
    return (keyRange.lower.length == keyRange.upper.length - 1) &&
        keyRange.upper[keyRange.upper.length - 1] == '\uffff' &&
        keyRange.lower.every(function(x, i) {return x == keyRange.upper[i]});
  } else {
    return !keyRange.lowerOpen && !keyRange.upperOpen &&
        keyRange.lower.length == keyRange.upper.length + 1 &&
        keyRange.upper[keyRange.lower.length - 1] == '\uffff';
  }

};


/**
 * Combine another where clause.
 * @param {!ydn.db.Where} that
 * @return {ydn.db.Where} return null if fail.
 */
ydn.db.Where.prototype.and = function(that) {
  if (this.field != that.field) {
    return null;
  }

  var key_range = goog.isDefAndNotNull(this.key_range_) &&
      goog.isDefAndNotNull(that.key_range_) ?
      this.key_range_.and(that.key_range_) : this.key_range_ || that.key_range_;

  return new ydn.db.Where(this.field, key_range);
};



