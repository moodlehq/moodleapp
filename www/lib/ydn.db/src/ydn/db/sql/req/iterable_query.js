// Copyright 2012 YDN Authors. All Rights Reserved.
//
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
 * @fileoverview Query object to feed WebSQL iterator.
 *
 *
 */


goog.provide('ydn.db.sql.req.IterableQuery');
goog.require('ydn.db.Iterator');
goog.require('goog.functions');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.Where');
goog.require('ydn.error.ArgumentException');



/**
 * Create a SQL query object from a query object.
 *
 * This clone given query object and added iteration functions so that
 * query processor can mutation as part of query optimization processes.
 *
 * @param {string} store store name.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {(ydn.db.KeyRange|ydn.db.IDBKeyRange)=} keyRange configuration in json or native format.
 * @param {boolean=} reverse reverse.
 * @param {boolean=} unique unique.
 * @param {boolean=} key_only true for key only iterator.
 * @param {Function=} filter filter function.
 * @param {Function=} continued continued function.
 * @extends {ydn.db.Iterator}
 * @constructor
 */
ydn.db.sql.req.IterableQuery = function(store, index, keyRange, reverse,
      unique, key_only, filter, continued) {

  goog.base(this, store, index, keyRange, reverse, unique, key_only);

  // set all null so that no surprise from inherit prototype
  this.initial = null;
  this.map = null;
  this.reduce = null;
  this.finalize = null;

  this.filter_fn = filter || null;
  this.continued = continued || null;

};
goog.inherits(ydn.db.sql.req.IterableQuery, ydn.db.Iterator);



/**
 * @inheritDoc
 */
ydn.db.sql.req.IterableQuery.prototype.toJSON = function() {
  var obj = goog.base(this, 'toJSON');
  obj['initial'] = this.initial ? this.initial.toString() : null;
  obj['map'] = this.map ? this.map.toString() : null;
  obj['reduce'] = this.reduce ? this.reduce.toString() : null;
  obj['finalize'] = this.finalize ? this.finalize.toString() : null;
  return obj;
};


/**
 * @type {?function(): *}
 */
ydn.db.sql.req.IterableQuery.prototype.initial = null;


/**
 * @type {?function(*): *}
 */
ydn.db.sql.req.IterableQuery.prototype.map = null;

/**
 * Reduce is execute after map.
 * @type {?function(*, *, number): *}
 * function(previousValue, currentValue, index)
 */
ydn.db.sql.req.IterableQuery.prototype.reduce = null;


/**
 * @type {?function(*): *}
 */
ydn.db.sql.req.IterableQuery.prototype.finalize = null;


/**
 * @override
 */
ydn.db.sql.req.IterableQuery.prototype.toString = function() {
  var idx = goog.isDef(this.getIndexName()) ? ':' + this.getIndexName() : '';
  return 'Cursor:' + this.getStoreName() + idx;
};


/**
 * Process where instruction into filter iteration method.
 * @param {!ydn.db.Where} where where.
 */
ydn.db.sql.req.IterableQuery.prototype.processWhereAsFilter = function(where) {

  var prev_filter = goog.functions.TRUE;
  if (goog.isFunction(this.filter_fn)) {
    prev_filter = this.filter_fn;
  }

  this.filter_fn = function(obj) {
    var value = obj[where.getField()];
    var ok1 = true;
    var key_range = where.getKeyRange();
    if (key_range) {
      if (goog.isDefAndNotNull(key_range.lower)) {
        ok1 = key_range.lowerOpen ? value < key_range.lower :
          value <= key_range.lower;
      }
      var ok2 = true;
      if (goog.isDefAndNotNull(key_range.upper)) {
        ok2 = key_range.upperOpen ? value > key_range.upper :
          value >= key_range.upper;
      }
    }

    return prev_filter(obj) && ok1 && ok2;
  };

  //console.log([where, this.filter.toString()]);

};




