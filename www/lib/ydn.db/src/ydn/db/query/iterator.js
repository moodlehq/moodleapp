// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview Iterator builder.
 *
 * Provide iterator.
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.query.Iterator');
goog.require('ydn.db.ConstraintError');
goog.require('ydn.db.Iterator');



/**
 * Create an Query Iterator.
 * @param {ydn.db.schema.Store} store store name.
 * @param {ydn.db.KeyRange=} opt_key_range key range.
 * @param {boolean=} opt_reverse reverse.
 * @param {boolean=} opt_unique unique.
 * @constructor
 * @struct
 */
ydn.db.query.Iterator = function(store, opt_key_range, opt_reverse,
                                 opt_unique) {
  /**
   * @protected
   * @type {ydn.db.schema.Store}
   */
  this.store = store;
  /**
   * @protected
   * @type {ydn.db.KeyRange}
   */
  this.key_range = opt_key_range || null;
  /**
   * @type {boolean}
   */
  this.is_reverse = !!opt_reverse;
  /**
   * @type {boolean}
   */
  this.is_unique = !!opt_unique;
  /**
   * @protected
   * @type {Array.<string>}
   */
  this.prefix = [];
  /**
   * Postfix or order.
   * @protected
   * @type {Array.<string>}
   */
  this.postfix = [];
};


/**
 * Set key path prefix.
 * @param {Array.<string>} prefix
 * @return {string?} error message return, if require index not exist.
 */
ydn.db.query.Iterator.prototype.setPrefix = function(prefix) {
  this.prefix = prefix;
  return null; // ok
};


/**
 * Set key path prefix or ordering.
 * @param {Array.<string>} postfix
 * @return {string?} error message return, if require index not exist.
 */
ydn.db.query.Iterator.prototype.setOrder = function(postfix) {
  // remove ordering as in prefix
  var n = postfix.length;
  for (var i = n - 1; i >= 0; i--) {
    if (postfix[i] == this.prefix[this.prefix.length - 1]) {
      postfix = postfix.slice(0, i);
    } else {
      break;
    }
  }
  this.postfix = postfix;
  return null;
};


/**
 * Get iterable iterator.
 * @param {boolean=} opt_value_iterator if true value itrator is return.
 * @return {!ydn.db.Iterator} iterator for this.
 */
ydn.db.query.Iterator.prototype.getIterator = function(opt_value_iterator) {
  if (!this.hasValidIndex()) {
    throw new ydn.db.ConstraintError('Require index "' +
        this.prefix.concat(this.postfix).join(', ') +
        '" not found in store "' + this.store.getName() + '"');
  }
  var iter = new ydn.db.Iterator(this.store.getName(), this.getIndexName(),
      this.key_range, this.is_reverse, this.is_unique, !!opt_value_iterator);
  iter.prefix_index = this.prefix.length;
  return iter;
};


/**
 * @return {string}
 */
ydn.db.query.Iterator.prototype.getStoreName = function() {
  return this.store.getName();
};


/**
 * @return {boolean}
 */
ydn.db.query.Iterator.prototype.hasPrefix = function() {
  return this.prefix.length > 0;
};


/**
 * Clone this.
 * @return {!ydn.db.query.Iterator}
 */
ydn.db.query.Iterator.prototype.clone = function() {
  var iter = new ydn.db.query.Iterator(this.store, this.key_range, this.is_reverse, this.is_unique);
  iter.postfix = this.postfix.slice();
  iter.prefix = this.prefix.slice();
  return iter;
};


/**
 * @return {ydn.db.KeyRange}
 */
ydn.db.query.Iterator.prototype.getKeyRange = function() {
  return this.key_range;
};


/**
 * @return {ydn.db.schema.Index}
 */
ydn.db.query.Iterator.prototype.getIndex = function() {
  var indexes = this.prefix.concat(this.postfix);
  var index = this.store.getIndexByKeyPath(indexes);
  if (index) {
    return index;
  } else if (indexes[indexes.length - 1] == this.store.getKeyPath()) {
    index = this.store.getIndexByKeyPath(indexes.slice(0, indexes.length - 1));
    if (index) {
      return index;
    }
  }
  return null;
};


/**
 * @return {string|undefined}
 */
ydn.db.query.Iterator.prototype.getIndexName = function() {
  var index = this.getIndex();
  return index ? index.getName() : undefined;
};


/**
 * @return {boolean}
 */
ydn.db.query.Iterator.prototype.hasValidIndex = function() {
  if (this.prefix.length == 0 && this.postfix.length == 0) {
    return true;
  }
  if (!this.usedIndex()) {
    return true;
  }
  return !!this.getIndex(); // there must be an index
};


/**
 * @return {!ydn.db.query.Iterator}
 */
ydn.db.query.Iterator.prototype.reverse = function() {
  var iter = this.clone();
  iter.is_reverse = !this.is_reverse;
  return iter;
};


/**
 * @param {boolean} val unique value.
 * @return {!ydn.db.query.Iterator}
 */
ydn.db.query.Iterator.prototype.unique = function(val) {
  var iter = this.clone();
  iter.is_unique = !!val;
  return iter;
};


/**
 * @return {boolean}
 */
ydn.db.query.Iterator.prototype.isUnique = function() {
  return this.is_unique;
};


/**
 * @return {boolean}
 */
ydn.db.query.Iterator.prototype.isReverse = function() {
  return this.is_reverse;
};


/**
 * Test this iterator used index.
 * @return {boolean} True if there is postfix or prefix (different from
 * primary key.
 */
ydn.db.query.Iterator.prototype.usedIndex = function() {
  if (this.prefix.length > 0) {
    return true;
  }
  if (this.postfix.length == 1) {
    return this.postfix[0] != this.store.getKeyPath();
  } else if (this.postfix.length > 1) {
    return true;
  }
  return false;
};


/**
 * Add where clause condition.
 * @param {string|Array.<string>} index_name index name or index key path.
 * @param {string} op where operator.
 * @param {IDBKey} value rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {IDBKey=} opt_value2 second rvalue to compare.
 * @return {string?} return error message.
 */
ydn.db.query.Iterator.prototype.where = function(index_name, op, value, opt_op2,
    opt_value2) {
  var key_range = ydn.db.KeyRange.where(op, value, opt_op2, opt_value2);
  if (this.prefix.length > 0) {
    // only possible with equal key range
    if (this.key_range) {
      if (goog.isDefAndNotNull(this.key_range.lower) &&
          goog.isDefAndNotNull(this.key_range.upper) &&
          ydn.db.cmp(this.key_range.lower, this.key_range.upper) == 0) {
        var lower = goog.isArray(this.key_range.lower) ?
            this.key_range.lower.slice().push(op) : [this.key_range.lower, op];
        var op2 = goog.isDefAndNotNull(opt_op2) ? opt_op2 : '\uffff';
        var upper = goog.isArray(this.key_range.upper) ?
            this.key_range.upper.slice().push(op2) : [this.key_range.upper, op2];
        this.key_range = ydn.db.KeyRange.where(op, lower, op2, upper);
      } else if ((this.prefix.length == 1 && this.prefix[0] == index_name) ||
          goog.isArray(index_name) && goog.array.equals(this.prefix, index_name)) {
        this.key_range = this.key_range.and(key_range);
      } else {
        return 'cannot use where clause with existing filter';
      }
    } else {
      return 'cannot use where clause with existing filter';
    }
  } else {
    this.prefix = goog.isArray(index_name) ? index_name : [index_name];
    if (this.key_range) {
      this.key_range = this.key_range.and(key_range);
    } else {
      this.key_range = key_range;
    }
  }
  return null;
};


/**
 * Get ordering.
 * @return {Array.<string>}
 */
ydn.db.query.Iterator.prototype.getPostFix = function() {
  return this.postfix.slice();
};



