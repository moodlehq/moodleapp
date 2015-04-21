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
 * @fileoverview Query builder class.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.Query');
goog.require('ydn.db.core.Storage');
goog.require('ydn.db.query.Base');
goog.require('ydn.db.query.ConjQuery');
goog.require('ydn.db.query.Iterator');
goog.require('ydn.debug.error.ArgumentException');



/**
 * Query builder class.
 * @param {ydn.db.core.DbOperator} db
 * @param {ydn.db.schema.Database} schema
 * @param {ydn.db.base.QueryMethod?} type query type. Default to values.
 * @param {ydn.db.query.Iterator} iter index name.
 * @constructor
 * @extends {ydn.db.query.Base}
 * @struct
 */
ydn.db.Query = function(db, schema, type, iter) {
  goog.base(this, db, schema, type);
  /**
   * @final
   * @protected
   * @type {ydn.db.query.Iterator}
   */
  this.iter = iter;

};
goog.inherits(ydn.db.Query, ydn.db.query.Base);


/**
 * @define {boolean} debug flag.
 */
ydn.db.Query.DEBUG = false;


/**
 * @return {!ydn.db.Query}
 */
ydn.db.Query.prototype.copy = function() {
  return new ydn.db.Query(this.db, this.schema, this.type, this.iter.clone());
};


/**
 * @return {!ydn.db.Query} return a new query.
 */
ydn.db.Query.prototype.reverse = function() {
  var iter = this.iter.reverse();
  return new ydn.db.Query(this.db, this.schema, this.type, iter);
};


/**
 * Set unique state of query.
 * @param {boolean} val
 * @return {!ydn.db.Query}
 */
ydn.db.Query.prototype.unique = function(val) {
  if (!goog.isBoolean(val)) {
    throw new ydn.debug.error.ArgumentException('unique value must be' +
        ' a boolean, but ' + typeof val + ' found');
  }
  var iter = this.iter.unique(val);
  return new ydn.db.Query(this.db, this.schema, this.type, iter);
};


/**
 * Specify query order.
 * @param {string|Array.<string>} order
 * @return {!ydn.db.Query} return a new query.
 */
ydn.db.Query.prototype.order = function(order) {
  var orders = goog.isString(order) ? [order] : order;
  var iter = this.iter.clone();
  var msg = iter.setOrder(orders);
  if (msg) {
    throw new Error(msg);
  } else {
    return new ydn.db.Query(this.db, this.schema, this.type, iter);
  }
};


/**
 * Create a new value cursor range iterator using where clause condition.
 * @param {string} index_name index name.
 * @param {string} op where operator.
 * @param {IDBKey} value rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {IDBKey=} opt_value2 second rvalue to compare.
 * @return {!ydn.db.query.Base} return this for chaining.
 */
ydn.db.Query.prototype.where = function(index_name, op, value, opt_op2,
    opt_value2) {
  if (!this.iter.getIndexName() || this.iter.getIndexName() == index_name) {
    if (!this.iter.getIndexName()) {
      var store = this.schema.getStore(this.iter.getStoreName());
      if (!store.hasIndex(index_name)) {
        throw new ydn.debug.error.ArgumentException('index "' + index_name + '" not exists in ' +
            this.iter.getStoreName());
      }
    }
    var iter = this.iter.clone();
    var msg = iter.where(index_name, op, value, opt_op2, opt_value2);
    if (msg) {
      throw new ydn.debug.error.ArgumentException(msg);
    }
    return new ydn.db.Query(this.db, this.schema, this.type, iter);
  } else {
    var kr = ydn.db.KeyRange.where(op, value, opt_op2, opt_value2);
    var iter = new ydn.db.query.Iterator(this.getStore(), kr, this.iter.isReverse(),
        this.iter.isUnique());
    var q = new ydn.db.Query(this.db, this.schema, this.type, iter);
    return this.and(q);
  }
};


/**
 * @return {ydn.db.schema.Store}
 */
ydn.db.Query.prototype.getStore = function() {
  return this.schema.getStore(this.iter.getStoreName());
};


/**
 * Select query result.
 * @param {string|!Array.<string>} field_name_s select field name(s).
 * @return {!ydn.db.Query}
 */
ydn.db.Query.prototype.select = function(field_name_s) {
  var store = this.getStore();
  var fields = goog.isString(field_name_s) ? [field_name_s] : field_name_s;
  var type = this.type;
  var iter = this.iter.clone();
  var index = this.iter.getIndexName();
  if (fields.length == 1) {
    var field = fields[0];
    if (field == ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME ||
        field == store.getKeyPath()) {
      type = ydn.db.base.QueryMethod.LIST_PRIMARY_KEY;
    } else if (!field || field == '*') {
      type = ydn.db.base.QueryMethod.LIST_VALUE;
    } else if (store.hasIndex(field)) {
      var msg = iter.setOrder(fields);
      if (msg) {
        throw new ydn.debug.error.ArgumentException(msg);
      }
      type = ydn.db.base.QueryMethod.LIST_KEY;
    } else {
      throw new ydn.debug.error.ArgumentException('Invalid select "' +
          field + '", index not found in store "' +
          store.getName() + '"');
    }
  } else if (fields.length == 2) {
    if (!index) {
      throw new ydn.debug.error.ArgumentException('Only primary key can be ' +
          'selected for this query.');
    }
    for (var i = 0; i < 2; i++) {
      var is_primary = fields[i] == ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME ||
          store.isKeyPath(fields[i]);
      if (!is_primary) {
        if (fields[i] != index) {
          throw new ydn.debug.error.ArgumentException('select field name ' +
              'must be "' + index + '", but "' + fields[i] + '" found.');
        }
      }
    }
    type = ydn.db.base.QueryMethod.LIST_KEYS;
  } else {
    throw new ydn.debug.error.ArgumentException('Selecting more than 2 field' +
        ' names is not supported, but ' + fields.length + ' fields selected.');
  }

  return new ydn.db.Query(this.db, this.schema, type, iter);
};


/**
 * Execute query and collect as an array. This method forces query execution.
 * @param {number=} opt_limit
 * @return {!ydn.db.Request}
 */
ydn.db.Query.prototype.list = function(opt_limit) {
  var offset = 0;
  var limit = opt_limit || ydn.db.base.DEFAULT_RESULT_LIMIT;
  var mth = ydn.db.base.QueryMethod.LIST_VALUE;
  var iter = this.getIterator();
  if (this.marker && this.marker[0]) {
    // console.log('starting from ' + this.marker[0]);
    iter = iter.resume(this.marker[0], this.marker[1]);
  }
  if (this.type == ydn.db.base.QueryMethod.LIST_PRIMARY_KEY ||
      this.type == ydn.db.base.QueryMethod.LIST_KEYS ||
      this.type == ydn.db.base.QueryMethod.LIST_KEY) {
    mth = this.type;
  }

  var req = this.db.listIter(mth, iter, limit, offset);
  req.addCallback(function(x) {
    if (iter.getState() == ydn.db.Iterator.State.RESTING) {
      // iteration not finished
      // console.log('end in ' + iter.getKey());
      this.marker = [iter.getKey(), iter.getPrimaryKey()];
    }
  }, this);
  return req;
};


/**
 * @inheritDoc
 */
ydn.db.Query.prototype.getIterators = function() {
  return [this.iter.clone()];
};


/**
 * Get iterator.
 * @param {boolean=} opt_key_only return key only iterator.
 * @return {!ydn.db.Iterator}
 */
ydn.db.Query.prototype.getIterator = function(opt_key_only) {
  var is_key_only = !!opt_key_only ||
      (this.type == ydn.db.base.QueryMethod.LIST_PRIMARY_KEY ||
      this.type == ydn.db.base.QueryMethod.LIST_KEYS ||
      this.type == ydn.db.base.QueryMethod.LIST_KEY);
  return this.iter.getIterator(!is_key_only);
};


/**
 * @return {Array.<string>}
 */
ydn.db.Query.prototype.getOrder = function() {
  return this.iter.getPostFix();
};


/**
 * Patch object.
 * @param {!Object|string|!Array.<string>} arg1 Patch object, field name or
 * field names.
 * @param {*=} opt_arg2 field value or field values.
 * @return {!ydn.db.Request}
 */
ydn.db.Query.prototype.patch = function(arg1, opt_arg2) {
  var iter = this.getIterator();
  if (iter.isKeyIterator()) {
    iter = iter.asValueIterator();
  }
  if (goog.DEBUG) {
    if (arguments.length < 1) {
      throw new ydn.debug.error.ArgumentException('too few arguments');
    } else if (arguments.length == 2) {
      if (goog.isString(arg1)) {
        // any value is OK.
      } else if (goog.isArray(arg1)) {
        if (!goog.isArray(opt_arg2)) {
          throw new ydn.debug.error.ArgumentException('an array is expected ' +
              'for second argument but, ' + ydn.json.toShortString(opt_arg2) +
              ' of type ' + typeof opt_arg2 + ' found');
        } else if (arg1.length != opt_arg2.length) {
          throw new ydn.debug.error.ArgumentException('length of two input ' +
              'arguments must be equal but, ' + arg1.length +
              ' and ' + opt_arg2.length + ' found');
        }
      }
    } else if (arguments.length == 1) {
      if (!goog.isObject(arg1)) {
        throw new ydn.debug.error.ArgumentException('an object is expected ' +
            'but, ' + ydn.json.toShortString(arg1) + ' of type ' + typeof arg1 +
            ' found');
      }
    } else {
      throw new ydn.debug.error.ArgumentException('too many arguments');
    }
  }
  var req = this.db.open(function(cursor) {
    var val = /** @type {!Object} */ (cursor.getValue());
    if (goog.isString(arg1)) {
      ydn.db.utils.setValueByKeys(val, arg1, opt_arg2);
    } else if (goog.isArray(arg1)) {
      for (var i = 0; i < arg1.length; i++) {
        ydn.db.utils.setValueByKeys(val, arg1[i], opt_arg2[i]);
      }
    } else if (goog.isObject(arg1)) {
      for (var k in arg1) {
        if (arg1.hasOwnProperty(k)) {
          val[k] = arg1[k];
        }
      }
    }
    req.awaitDeferred(cursor.update(val));
  }, iter, ydn.db.base.TransactionMode.READ_WRITE, this);
  return req;
};


/**
 * Execute query and collect as an array. This method forces query execution.
 * @param {function(this: T, !ydn.db.core.req.ICursor)} cb
 * @param {T=} opt_scope
 * @return {!ydn.db.Request}
 * @template T
 */
ydn.db.Query.prototype.open = function(cb, opt_scope) {
  var req = this.db.open(cb, this.getIterator(),
      ydn.db.base.TransactionMode.READ_WRITE, opt_scope);
  return req;
};


/**
 * Count result of query. This method forces query execution.
 * @return {!ydn.db.Request}
 */
ydn.db.Query.prototype.count = function() {
  var req;
  if (this.iter.usedIndex()) {
    if (this.iter.isUnique()) {
      req = this.db.count(this.iter.getIterator());
    } else {
      req = this.db.count(this.iter.getStoreName(), this.iter.getIndexName(),
          this.iter.getKeyRange());
    }
  } else {
    req = this.db.count(this.iter.getStoreName(), this.iter.getKeyRange());
  }
  return req;
};


/**
 * Count result of query. This method forces query execution.
 * @return {!ydn.db.Request}
 */
ydn.db.Query.prototype.clear = function() {
  var req = this.iter.usedIndex() ?
      this.db.clear(this.iter.getStoreName(), this.iter.getIndexName(),
          this.iter.getKeyRange()) :
      this.db.clear(this.iter.getStoreName(), this.iter.getKeyRange());
  return req;
};


/**
 * Create AND query.
 * @param {ydn.db.query.Base} q
 * @return {!ydn.db.query.ConjQuery}
 */
ydn.db.Query.prototype.and = function(q) {
  var iters = q.getIterators().concat(this.getIterators());
  return new ydn.db.query.ConjQuery(this.db, this.schema, this.type, iters);
};


/**
 * Create a new query.
 * @param {string} store_name
 * @param {string=} opt_op1 where operator.
 * @param {IDBKey=} opt_value1 rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {IDBKey=} opt_value2 second rvalue to compare.
 * @return {!ydn.db.Query}
 */
ydn.db.core.Storage.prototype.from = function(store_name, opt_op1, opt_value1,
                                              opt_op2, opt_value2) {
  if (goog.DEBUG && !goog.isString(store_name)) {
    throw new TypeError('store name "' + store_name + '"');
  }
  if (!this.schema.hasStore(store_name)) {
    throw new ydn.debug.error.ArgumentException('Store "' + store_name +
        '" not found.');
  }
  var range = null;
  if (goog.isDef(opt_op1)) {
    if (!goog.isDef(opt_value1)) {
      throw new ydn.debug.error.ArgumentException('boundary value ' +
          'must be defined.');
    }
    range = ydn.db.KeyRange.where(opt_op1, opt_value1, opt_op2, opt_value2);
  } else if (goog.isDef(opt_op2)) {
    throw new ydn.debug.error.ArgumentException('second boundary must not be' +
        ' defined.');
  }
  var iter = new ydn.db.query.Iterator(this.schema.getStore(store_name), range);
  return new ydn.db.Query(this.getIndexOperator(), this.schema, null, iter);
};


/**
 * Create a new query.
 * @param {string} store_name
 * @param {string=} opt_op1 where operator.
 * @param {IDBKey=} opt_value1 rvalue to compare.
 * @param {string=} opt_op2 second operator.
 * @param {IDBKey=} opt_value2 second rvalue to compare.
 * @return {!ydn.db.Query}
 */
ydn.db.core.DbOperator.prototype.from = function(store_name, opt_op1,
    opt_value1, opt_op2, opt_value2) {
  if (goog.DEBUG && !goog.isString(store_name)) {
    throw new TypeError('store name "' + store_name + '"');
  }
  if (!this.schema.hasStore(store_name)) {
    throw new ydn.debug.error.ArgumentException('Store "' + store_name +
        '" not found.');
  }
  var range = null;
  if (goog.isDef(opt_op1)) {
    if (!goog.isDef(opt_value1)) {
      throw new ydn.debug.error.ArgumentException('boundary value ' +
          'must be defined.');
    }
    range = ydn.db.KeyRange.where(opt_op1, opt_value1, opt_op2, opt_value2);
  } else if (goog.isDef(opt_op2)) {
    throw new ydn.debug.error.ArgumentException('second boundary must not be' +
        ' defined.');
  }
  var iter = new ydn.db.query.Iterator(this.schema.getStore(store_name), range);
  return new ydn.db.Query(this, this.schema, null, iter);
};


