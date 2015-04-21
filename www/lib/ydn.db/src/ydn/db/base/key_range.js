/**
 *
 * @fileoverview Wrapper for a IndexedDB key range.
 *
 */


goog.provide('ydn.db.IDBKeyRange');
goog.provide('ydn.db.KeyRange');



/**
 * For those browser that not implemented IDBKeyRange.
 * @param {IDBKey|undefined} lower The value of the lower bound.
 * @param {IDBKey|undefined} upper  The value of the upper bound.
 * @param {boolean=} opt_lowerOpen  If true, the range excludes the lower bound
 * value.
 * @param {boolean=} opt_upperOpen If true, the range excludes the lower bound
 * value.
 * @constructor
 */
ydn.db.KeyRange = function(lower, upper, opt_lowerOpen, opt_upperOpen) {

  // todo: use new @dict type annotation.

  /**
   * @final
   */
  this['lower'] = lower;
  /**
   * @final
   */
  this['upper'] = upper;
  /**
   * @final
   */
  this['lowerOpen'] = !!opt_lowerOpen;
  /**
   * @final
   */
  this['upperOpen'] = !!opt_upperOpen;

  if (goog.DEBUG && goog.isFunction(Object.freeze)) {
    // NOTE: due to performance penalty (in Chrome) of using freeze and
    // hard to debug on different browser we don't want to use freeze
    // this is experimental.
    // http://news.ycombinator.com/item?id=4415981
    Object.freeze(/** @type {!Object} */ (this));
  }
};


/**
 *
 * @type {IDBKey|undefined}
 */
ydn.db.KeyRange.prototype.lower = undefined;


/**
 *
 * @type {IDBKey|undefined}
 */
ydn.db.KeyRange.prototype.upper = undefined;


/**
 *
 * @type {boolean}
 */
ydn.db.KeyRange.prototype.lowerOpen;


/**
 *
 * @type {boolean}
 */
ydn.db.KeyRange.prototype.upperOpen;


/**
 * @override
 * @return {!Object} in JSON format.
 */
ydn.db.KeyRange.prototype.toJSON = function() {
  return ydn.db.KeyRange.toJSON(this);
};


/**
 *
 * @return {IDBKeyRange}
 */
ydn.db.KeyRange.prototype.toIDBKeyRange = function() {
  return ydn.db.KeyRange.parseIDBKeyRange(this);
};


/**
 * Robust efficient cloning.
 * @param {(ydn.db.KeyRange|ydn.db.IDBKeyRange)=} kr key range to be cloned.
 * @return {!ydn.db.KeyRange|undefined} cloned key range.
 */
ydn.db.KeyRange.clone = function(kr) {
  if (goog.isDefAndNotNull(kr)) {
    return new ydn.db.KeyRange(
        /** @type {IDBKey} */ (kr.lower),
        /** @type {IDBKey} */ (kr.upper),
        !!kr.lowerOpen, !!kr.upperOpen);
  } else {
    return undefined;
  }
};


/**
 * Creates a new key range for a single value.
 *
 * @param {IDBKey} value The single value in the range.
 * @return {!ydn.db.KeyRange} The key range.
 * @expose
 */
ydn.db.KeyRange.only = function(value) {
  return new ydn.db.KeyRange(value, value, false, false);
};


/**
 * Creates a key range with upper and lower bounds.
 *
 * @param {IDBKey|undefined} lower The value of the lower bound.
 * @param {IDBKey|undefined} upper The value of the upper bound.
 * @param {boolean=} opt_lowerOpen If true, the range excludes the lower bound
 *     value.
 * @param {boolean=} opt_upperOpen If true, the range excludes the upper bound
 *     value.
 * @return {!ydn.db.KeyRange} The key range.
 * @expose
 */
ydn.db.KeyRange.bound = function(lower, upper,
                                 opt_lowerOpen, opt_upperOpen) {
  return new ydn.db.KeyRange(lower, upper, opt_lowerOpen, opt_upperOpen);
};


/**
 * Creates a key range with a upper bound only, starts at the first record.
 *
 * @param {IDBKey} upper The value of the upper bound.
 * @param {boolean=} opt_upperOpen If true, the range excludes the upper bound
 *     value.
 * @return {!ydn.db.KeyRange} The key range.
 * @expose
 */
ydn.db.KeyRange.upperBound = function(upper, opt_upperOpen) {
  return new ydn.db.KeyRange(undefined, upper, undefined, !!opt_upperOpen);
};


/**
 * Creates a key range with a lower bound only, finishes at the last record.
 *
 * @param {IDBKey} lower The value of the lower bound.
 * @param {boolean=} opt_lowerOpen If true, the range excludes the lower bound
 *     value.
 * @return {!ydn.db.KeyRange} The key range.
 * @expose
 */
ydn.db.KeyRange.lowerBound = function(lower, opt_lowerOpen) {
  return new ydn.db.KeyRange(lower, undefined, !!opt_lowerOpen, undefined);
};


/**
 * Helper method for creating useful KeyRange.
 * @param {IDBKey} value value.
 * @return {!ydn.db.KeyRange} The key range.
 */
ydn.db.KeyRange.starts = function(value) {
  var value_upper;
  if (goog.isArray(value)) {
    value_upper = goog.array.clone(value);
    // Note on ordering: array > string > data > number
    value_upper.push('\uffff');
  } else if (goog.isString(value)) {
    value_upper = value + '\uffff';
  } else if (goog.isNumber(value)) {
    /**
     * Number.EPSILON in ES6.
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/EPSILON
     * @type {number}
     */
    var EPSILON = 2.220460492503130808472633361816E-16;
    value_upper = value + EPSILON;
    value = value - EPSILON;
  } else {
    return ydn.db.KeyRange.only(value);
  }

  return ydn.db.KeyRange.bound(value, value_upper, false, true);
};


/**
 *
 * @param {ydn.db.IDBKeyRange|ydn.db.KeyRange|KeyRangeJson} keyRange
 * IDBKeyRange.
 * @return {!Object} IDBKeyRange in JSON format.
 */
ydn.db.KeyRange.toJSON = function(keyRange) {
  keyRange = keyRange || /** @type {KeyRangeJson} */ ({});
  var out = {
    'lower': keyRange['lower'],
    'upper': keyRange['upper'],
    'lowerOpen': keyRange['lowerOpen'],
    'upperOpen': keyRange['upperOpen']
  };
  return out;
};


/**
 * Read four primitive attributes from the input and return newly created
 * keyRange object.
 * @param {(KeyRangeJson|ydn.db.KeyRange|ydn.db.IDBKeyRange)=} key_range
 * keyRange.
 * @return {ydn.db.KeyRange} equivalent IDBKeyRange. Return null if input
 * is null or undefined.
 */
ydn.db.KeyRange.parseKeyRange = function(key_range) {
  if (!goog.isDefAndNotNull(key_range)) {
    return null;
  }
  if (key_range instanceof ydn.db.KeyRange) {
    return key_range;
  }
  if (goog.isObject(key_range)) {
    return new ydn.db.KeyRange(key_range['lower'], key_range['upper'],
        key_range['lowerOpen'], key_range['upperOpen']);
  } else {
    throw new ydn.debug.error.ArgumentException("Invalid key range: " +
        key_range + ' of type ' + typeof key_range);
  }

};


/**
 * Read four primitive attributes from the input and return newly created
 * keyRange object.
 * @param {(KeyRangeJson|ydn.db.KeyRange|ydn.db.IDBKeyRange|Object)=} opt_key_range
 * keyRange.
 * @return {?IDBKeyRange} equivalent IDBKeyRange. Newly created IDBKeyRange.
 * null if input is null or undefined.
 */
ydn.db.KeyRange.parseIDBKeyRange = function(opt_key_range) {
  if (goog.isDefAndNotNull(opt_key_range)) {
    var key_range = opt_key_range;

    if (goog.isDefAndNotNull(key_range['upper']) && goog.isDefAndNotNull(
        key_range['lower'])) {

      return ydn.db.IDBKeyRange.bound(
          key_range.lower, key_range.upper,
          !!key_range['lowerOpen'], !!key_range['upperOpen']);

    } else if (goog.isDefAndNotNull(key_range.upper)) {
      return ydn.db.IDBKeyRange.upperBound(key_range.upper,
          key_range.upperOpen);
    } else if (goog.isDefAndNotNull(key_range.lower)) {
      return ydn.db.IDBKeyRange.lowerBound(key_range.lower,
          key_range.lowerOpen);
    } else {
      return null;
    }
  } else {
    return null;
  }
};


/**
 *
 * @param {Object|undefined} keyRange
 * @return {string} if not valid key range object, return a message reason.
 */
ydn.db.KeyRange.validate = function(keyRange) {
  if (keyRange instanceof ydn.db.KeyRange) {
    return '';
  } else if (goog.isDefAndNotNull(keyRange)) {
    if (goog.isObject(keyRange)) {
      for (var key in keyRange) {
        if (keyRange.hasOwnProperty(key)) {
          if (!goog.array.contains(['lower', 'upper', 'lowerOpen', 'upperOpen'],
              key)) {
            return 'invalid attribute "' + key + '" in key range object';
          }
        }
      }
      return '';
    } else {
      return 'key range must be an object';
    }
  } else {
    return '';
  }
};


/**
 * AND operation on key range
 * @param {!ydn.db.KeyRange} that
 * @return {!ydn.db.KeyRange} return a new key range of this and that key range.
 */
ydn.db.KeyRange.prototype.and = function(that) {
  var lower = this.lower;
  var upper = this.upper;
  var lowerOpen = this.lowerOpen;
  var upperOpen = this.upperOpen;
  if (goog.isDefAndNotNull(that.lower) &&
      (!goog.isDefAndNotNull(this.lower) || that.lower >= this.lower)) {
    lower = that.lower;
    lowerOpen = that.lowerOpen || this.lowerOpen;
  }
  if (goog.isDefAndNotNull(that.upper) &&
      (!goog.isDefAndNotNull(this.upper) || that.upper <= this.upper)) {
    upper = that.upper;
    upperOpen = that.upperOpen || this.upperOpen;
  }

  return ydn.db.KeyRange.bound(lower, upper, lowerOpen, upperOpen);
};


/**
 * For debug display.
 * @param {ydn.db.KeyRange|IDBKeyRange|undefined} kr
 * @return {string} readable form.
 */
ydn.db.KeyRange.toString = function(kr) {
  if (!kr) {
    return '';
  }
  var str = kr.lowerOpen ? '(' : '[';
  if (goog.isDefAndNotNull(kr.lower)) {
    str += kr.lower + ', ';
  }
  if (goog.isDefAndNotNull(kr.upper)) {
    str += kr.upper;
  }
  str += kr.upperOpen ? ')' : ']';
  return str;
};


/**
 *
 * @param {string} quoted_column_name quoted column name.
 * @param {ydn.db.schema.DataType|undefined} type column type.
 * @param {ydn.db.KeyRange|IDBKeyRange} key_range key range.
 * @param {!Array.<string>} wheres where clauses.
 * @param {!Array.<string>} params SQL params to output by appending.
 */
ydn.db.KeyRange.toSql = function(quoted_column_name, type,
                                 key_range, wheres, params) {

  if (!key_range) {
    return;
  }
  if (!key_range.lowerOpen && !key_range.upperOpen &&
      goog.isDefAndNotNull(key_range.lower) &&
      goog.isDefAndNotNull(key_range.upper) &&
      ydn.db.cmp(key_range.lower, key_range.upper) === 0) {

    wheres.push(quoted_column_name + ' = ?');
    params.push(ydn.db.schema.Index.js2sql(key_range.lower, type));
  } else {

    if (goog.isDefAndNotNull(key_range.lower)) {
      var op = key_range.lowerOpen ? ' > ' : ' >= ';
      wheres.push(quoted_column_name + op + '?');
      params.push(ydn.db.schema.Index.js2sql(key_range.lower, type));
    }
    if (goog.isDefAndNotNull(key_range.upper)) {
      var op = key_range.upperOpen ? ' < ' : ' <= ';
      wheres.push(quoted_column_name + op + '?');
      params.push(ydn.db.schema.Index.js2sql(key_range.upper, type));
    }
  }

};


/**
 *
 * @param {string} op where operator.
 * @param {IDBKey} value rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {IDBKey=} opt_value2 second rvalue to compare.
 * @return {!ydn.db.KeyRange}
 */
ydn.db.KeyRange.where = function(op, value, opt_op2, opt_value2) {
  var upper, lower, upperOpen, lowerOpen;
  if (op == 'starts' || op == '^') {
    goog.asserts.assert(goog.isString(value) || goog.isArray(value),
        'key value of starts with must be an array or a string');
    goog.asserts.assert(!goog.isDef(opt_op2), 'op2 must not be defined');
    goog.asserts.assert(!goog.isDef(opt_value2), 'value2 must not be defined');
    return ydn.db.KeyRange.starts(/** @type {string|!Array} */ (value));
  } else if (op == '<' || op == '<=') {
    upper = value;
    upperOpen = op == '<';
  } else if (op == '>' || op == '>=') {
    lower = value;
    lowerOpen = op == '>';
  } else if (op == '=' || op == '==') {
    lower = value;
    upper = value;
  } else {
    throw new ydn.debug.error.ArgumentException('invalid op: ' + op);
  }
  if (opt_op2 == '<' || opt_op2 == '<=') {
    upper = opt_value2;
    upperOpen = opt_op2 == '<';
  } else if (opt_op2 == '>' || opt_op2 == '>=') {
    lower = opt_value2;
    lowerOpen = opt_op2 == '>';
  } else if (goog.isDef(opt_op2)) {
    throw new ydn.debug.error.ArgumentException('invalid op2: ' + opt_op2);
  }
  return ydn.db.KeyRange.bound(lower, upper, lowerOpen, upperOpen);
};


/**
 *
 * @type {function(new:IDBKeyRange)} The IDBKeyRange interface of the IndexedDB
 * API represents a continuous interval over some data type that is used for
 * keys.
 */
ydn.db.IDBKeyRange = goog.global.IDBKeyRange ||
    goog.global.webkitIDBKeyRange || ydn.db.KeyRange;

