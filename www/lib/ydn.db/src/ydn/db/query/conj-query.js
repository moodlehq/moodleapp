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
 * @fileoverview Conjunction query, or query with multiple AND iterators.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.query.ConjQuery');
goog.require('ydn.db.algo.SortedMerge');
goog.require('ydn.db.algo.ZigzagMerge');
goog.require('ydn.db.core.Storage');
goog.require('ydn.db.query.Iterator');



/**
 * Conjunction query.
 * @param {ydn.db.core.DbOperator} db
 * @param {ydn.db.schema.Database} schema
 * @param {ydn.db.base.QueryMethod} type query type.
 * @param {!Array.<!ydn.db.query.Iterator>} iters
 * @param {boolean=} opt_ref_join By default key of iterators are
 * joined. Set true to join on reference value.
 * @constructor
 * @extends {ydn.db.query.Base}
 * @struct
 */
ydn.db.query.ConjQuery = function(db, schema, type, iters, opt_ref_join) {
  goog.base(this, db, schema, type);
  /**
   * @final
   * @protected
   * @type {!Array.<!ydn.db.query.Iterator>}
   */
  this.iters = iters;
};
goog.inherits(ydn.db.query.ConjQuery, ydn.db.query.Base);


/**
 * @define {boolean} debug flag.
 */
ydn.db.query.ConjQuery.DEBUG = false;


/**
 * Execute query and collect as an array. This method forces query execution.
 * @param {function(this: T, !ydn.db.core.req.ICursor)} cb
 * @param {T=} opt_scope
 * @return {!ydn.db.Request}
 * @template T
 */
ydn.db.query.ConjQuery.prototype.open = function(cb, opt_scope) {
  var req;
  var out = {
    'push': function(key) {

    }
  };
  var solver = this.isRefJoin() ? new ydn.db.algo.ZigzagMerge(out) :
      new ydn.db.algo.SortedMerge(out);
  req = this.db.scan(solver, this.getIterableIterators(),
      ydn.db.base.TransactionMode.READ_WRITE);
  return req;
};


/**
 * Get iterable iterator.
 * @return {!Array.<!ydn.db.Iterator>}
 */
ydn.db.query.ConjQuery.prototype.getIterableIterators = function() {
  var iters = [];
  for (var i = 0; i < this.iters.length; i++) {
    iters[i] = this.iters[i].getIterator();
  }
  return iters;
};


/**
 * @return {boolean}
 */
ydn.db.query.ConjQuery.prototype.isRefJoin = function() {
  for (var i = 0; i < this.iters.length; i++) {
    if (this.iters[i].hasPrefix()) {
      return true;
    }
  }
  return false;
};


/**
 * Execute query and collect as an array. This method forces query execution.
 * @param {number} limit
 * @return {!ydn.db.Request}
 */
ydn.db.query.ConjQuery.prototype.list = function(limit) {
  // console.log(this.iterator.getState(), this.iterator.getKey());
  var out = this.type == ydn.db.base.QueryMethod.LIST_PRIMARY_KEY ? [] :
      new ydn.db.Streamer(null, this.iters[0].getStoreName());

  var solver = this.isRefJoin() ?
      new ydn.db.algo.ZigzagMerge(out) :
      new ydn.db.algo.SortedMerge(out);
  var req = this.db.scan(solver, this.getIterableIterators(),
      ydn.db.base.TransactionMode.READ_WRITE);
  var ans = req.copy();
  req.addCallbacks(function() {
    if (this.type == ydn.db.base.QueryMethod.LIST_PRIMARY_KEY) {
      ans.callback(out);
    } else {
      // wait for data collection to finished.
      out.done().addBoth(function(x) {
        ans.callback(x);
      });
    }
  }, function(e) {
    ans.errback(e);
  }, this);
  return ans;
};


/**
 * @inheritDoc
 */
ydn.db.query.ConjQuery.prototype.getIterators = function() {
  return this.iters.slice();
};


/**
 * Select query result.
 * @param {string|!Array.<string>} field_name_s select field name(s).
 * @return {!ydn.db.query.ConjQuery}
 */
ydn.db.query.ConjQuery.prototype.select = function(field_name_s) {
  throw new Error('not impl')
};


/**
 * @return {!ydn.db.query.ConjQuery} return a new query.
 */
ydn.db.query.ConjQuery.prototype.reverse = function() {
  var iters = this.iters.map(function(iter) {
    return iter.reverse();
  });
  return new ydn.db.query.ConjQuery(this.db, this.schema, this.type, iters);
};




