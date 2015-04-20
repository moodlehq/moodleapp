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
 * @fileoverview Execute aggregate query.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.sql.req.nosql.ReduceNode');
goog.require('ydn.db.sql.req.nosql.Node');
goog.require('ydn.object');



/**
 *
 * @param {!ydn.db.schema.Store} schema store schema.
 * @param {!ydn.db.Sql} sql store name.
 * @extends {ydn.db.sql.req.nosql.Node}
 * @constructor
 * @struct
 */
ydn.db.sql.req.nosql.ReduceNode = function(schema, sql) {
  goog.base(this, schema, sql);
};
goog.inherits(ydn.db.sql.req.nosql.ReduceNode, ydn.db.sql.req.nosql.Node);


/**
 * @param {ydn.db.Request} rq transaction object.
 * @param {ydn.db.core.req.IRequestExecutor} req request executor.
 */
ydn.db.sql.req.nosql.ReduceNode.prototype.execute = function(rq, req) {

  var me = this;
  var out;

  var store_name = this.sql.getStoreNames()[0];
  var wheres = this.sql.getConditions();
  /**
   *
   * @type {IDBKeyRange}
   */
  var key_range = null;
  var reverse = this.sql.isReversed();
  if (wheres.length == 0) {
    key_range = null;
  } else if (wheres.length == 1) {
    key_range = ydn.db.KeyRange.parseIDBKeyRange(wheres[0].getKeyRange());
  } else {
    throw new ydn.debug.error.NotSupportedException('too many conditions.');
  }

  var aggregate = this.sql.getAggregate();
  var index_name = wheres.length > 0 ? wheres[0].getField() : undefined;

  var msg = rq.getLabel() + ' executing ' + aggregate + ' on ' + store_name;
  if (index_name) {
    msg += ':' + index_name;
  }
  msg += ' ' + ydn.db.KeyRange.toString(key_range);
  goog.log.finer(this.logger, msg);

  if (aggregate == 'COUNT') {
    if (key_range) {
      req.countKeyRange(rq, store_name, key_range,
          index_name, false);
    } else {
      req.countKeyRange(rq, store_name, null, undefined, false);
    }
  } else {
    var reduce;
    var fields = this.sql.getSelList();
    if (!fields || fields.length == 0) {
      throw new ydn.error.InvalidOperationError(
          'field name require for reduce operation: ' + aggregate);
    }
    var field_name = fields[0];
    if (aggregate == 'MIN') {
      reduce = ydn.db.sql.req.nosql.ReduceNode.reduceMin(field_name);
    } else if (aggregate == 'MAX') {
      reduce = ydn.db.sql.req.nosql.ReduceNode.reduceMax(field_name);
    } else if (aggregate == 'AVG') {
      out = 0;
      reduce = ydn.db.sql.req.nosql.ReduceNode.reduceAverage(field_name);
    } else if (aggregate == 'SUM') {
      out = 0;
      reduce = ydn.db.sql.req.nosql.ReduceNode.reduceSum(field_name);
    } else {
      throw new ydn.error.NotSupportedException(aggregate);
    }

    // TODO: optimization
    // if (this.store_schema.hasIndex(field_name)) {

    var iter;

    if (goog.isDef(index_name)) {
      iter = new ydn.db.IndexValueIterator(store_name, index_name,
          key_range);
    } else {
      iter = new ydn.db.ValueIterator(store_name, key_range);
    }

    var cur = req.getCursor(rq.getTx(), rq.getLabel(), store_name,
        ydn.db.base.QueryMethod.LIST_VALUE);
    var cursor = iter.load([cur]);

    /**
     *
     * @param {!Error} e
     */
    cursor.onFail = function(e) {
      rq.setDbValue(e, true);
    };
    var i = 0;
    /**
     *
     * @param {IDBKey=} opt_key
     */
    cursor.onNext = function(opt_key) {
      if (goog.isDefAndNotNull(opt_key)) {
        var value = iter.isKeyIterator() ?
            cursor.getPrimaryKey() : cursor.getValue();
        out = reduce(value, out, i);
        cursor.advance(1);
        i++;
      } else {
        rq.setDbValue(out);
      }
    };
  }


};


/**
 * Return reduce iteration function for AVERAGE
 * @param {string} field name.
 * @return {Function} average.
 */
ydn.db.sql.req.nosql.ReduceNode.reduceAverage = function(field) {
  return function(curr, prev, i) {
    if (!goog.isDef(prev)) {
      prev = 0;
    }
    return (prev * i + curr[field]) / (i + 1);
  };
};


/**
 * Return reduce iteration function for SUM
 * @param {string} field field name.
 * @return {Function} sum.
 */
ydn.db.sql.req.nosql.ReduceNode.reduceSum = function(field) {
  return function(curr, prev, i) {
    return prev + curr[field];
  };
};


/**
 * Return reduce iteration function for MIN
 * @param {string} field name.
 * @return {Function} min.
 */
ydn.db.sql.req.nosql.ReduceNode.reduceMin = function(field) {
  return function(curr, prev, i) {
    var x = curr[field];
    if (!goog.isDef(prev)) {
      return x;
    }
    return prev < x ? prev : x;
  };
};


/**
 * Return reduce iteration function for MAX
 * @param {string} field name.
 * @return {Function} max.
 */
ydn.db.sql.req.nosql.ReduceNode.reduceMax = function(field) {
  return function(curr, prev, i) {
    var x = curr[field];
    if (!goog.isDef(prev)) {
      return x;
    }
    return prev > x ? prev : x;
  };
};

