// Copyright 2012 YDN Authors, Yathit. All Rights Reserved.
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
 * @fileoverview A SQL node represent .
 *
 * Analyze SQL statement and extract execution scope.
 */


goog.provide('ydn.db.Sql');
goog.require('goog.functions');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.Where');
goog.require('ydn.db.schema.Database');
goog.require('ydn.db.sql.req.IdbQuery');
goog.require('ydn.error.ArgumentException');
goog.require('ydn.math.Expression');
goog.require('ydn.string');



/**
 * @param {string} sql The sql statement.
 * @constructor
 */
ydn.db.Sql = function(sql) {

  /*
   * A query has the following form:
   *
   * <Query> := SELECT <SelList> FROM <FromList> WHERE <Condition>
   *
   */

  if (!goog.isString(sql)) {
    throw new ydn.error.ArgumentException();
  }

  this.sql_ = sql;

  /**
   *
   * @type {ydn.db.base.TransactionMode}
   * @private
   */
  this.mode_ = ydn.db.base.TransactionMode.READ_WRITE;

  /**
   * @private
   * @type {Array.<string>}
   */
  this.store_names_ = [];

  this.parseBasic_(sql);

  this.last_error_ = '';
  this.has_parsed_ = false;
};


/**
 * @private
 * @type {string} sql statement.
 */
ydn.db.Sql.prototype.sql_ = '';


/**
 * @private
 * @type {string}
 */
ydn.db.Sql.prototype.modifier_;


/**
 * @private
 * @type {string}
 */
ydn.db.Sql.prototype.condition_;


/**
 *
 * @type {string|undefined}
 * @private
 */
ydn.db.Sql.prototype.aggregate_;


/**
 *
 * @type {string|undefined}
 * @private
 */
ydn.db.Sql.prototype.order_;


/**
 *
 * @type {number}
 * @private
 */
ydn.db.Sql.prototype.limit_ = NaN;


/**
 *
 * @type {number}
 * @private
 */
ydn.db.Sql.prototype.offset_ = NaN;


/**
 *
 * @type {boolean}
 * @private
 */
ydn.db.Sql.prototype.reverse_ = false;


/**
 * @type {string}
 * @private
 */
ydn.db.Sql.prototype.selList_;


/**
 *
 * @type {string}
 * @private
 */
ydn.db.Sql.prototype.last_error_ = '';


/**
 *
 * @type {boolean}
 * @private
 */
ydn.db.Sql.prototype.has_parsed_ = false;


/**
 *
 * @param {string} sql
 * @private
 */
ydn.db.Sql.prototype.parseBasic_ = function(sql) {
  var from_parts = sql.split(/\sFROM\s/i);
  if (from_parts.length != 2) {
    // throw new ydn.db.SqlParseError('FROM required.');
    return;
  }
  var pre_from = from_parts[0];
  var post_from = from_parts[1];

  // Parse Pre-FROM
  var pre_from_parts = pre_from.match(
      /\s*?(SELECT|INSERT|UPDATE|DELETE)\s+(.*)/i);
  if (pre_from_parts.length != 3) {
    // throw new ydn.db.SqlParseError('Unable to parse: ' + sql);
    return;
  }

  // action
  this.action_ = pre_from_parts[1].toUpperCase();
  if (this.action_ == 'SELECT') {
    this.mode_ = ydn.db.base.TransactionMode.READ_ONLY;
  } else if (this.action_ == 'INSERT') {
    this.mode_ = ydn.db.base.TransactionMode.READ_WRITE;
  } else if (this.action_ == 'UPDATE') {
    this.mode_ = ydn.db.base.TransactionMode.READ_WRITE;
  } else if (this.action_ == 'DELETE') {
    this.mode_ = ydn.db.base.TransactionMode.READ_WRITE;
  } else {
    return;
  }

  var selList = pre_from_parts[2].trim();

  var agg = selList.match(/^(MIN|MAX|COUNT|AVG|SUM)/i);
  if (agg) {
    this.aggregate_ = agg[0].toUpperCase();
    selList = selList.replace(/^(MIN|MAX|COUNT|AVG|SUM)/i, '').trim();
  } else {
    this.aggregate_ = undefined;
  }
  // remove parentheses if it has
  if (selList.charAt(0) == '(') {
    if (selList.charAt(selList.length - 1) == ')') {
      selList = selList.substring(1, selList.length - 1);
    } else {
      new ydn.db.SqlParseError('missing closing parentheses');
    }
  }
  this.selList_ = selList;

  // collect modifiers
  var mod_idx = post_from.search(/(ORDER BY|LIMIT|OFFSET)/i);
  if (mod_idx > 0) {
    this.modifier_ = post_from.substring(mod_idx);
    post_from = post_from.substring(0, mod_idx);
  } else {
    this.modifier_ = '';
  }

  // collect condition
  var where_idx = post_from.search(/WHERE/i);
  if (where_idx > 0) {
    this.condition_ = post_from.substring(where_idx + 6).trim();
    post_from = post_from.substring(0, where_idx);
  } else {
    this.condition_ = '';
  }

  var stores = post_from.trim().split(',');
  this.store_names_ = stores.map(function(x) {
    x = goog.string.stripQuotes(x, '"');
    x = goog.string.stripQuotes(x, "'");
    return x.trim();
  });

  this.has_parsed_ = true;
};


/**
 * @param {Array=} params SQL parameters.
 * @return {string} empty if successfully parse
 */
ydn.db.Sql.prototype.parse = function(params) {


  if (params) {
    for (var i = 0; i < params.length; i++) {
      this.sql_ = this.sql_.replace('?', params[i]);
    }
    this.parseBasic_(this.sql_);
  }

  this.wheres_ = this.parseConditions();
  if (!this.wheres_) {
    return this.last_error_;
  }

  var start_idx = this.modifier_.length;

  var offset_result = /OFFSET\s+(\d+)/i.exec(this.modifier_);
  if (offset_result) {
    this.offset_ = parseInt(offset_result[1], 10);
    start_idx = this.modifier_.search(/OFFSET/i);
  }
  var limit_result = /LIMIT\s+(\d+)/i.exec(this.modifier_);
  if (limit_result) {
    this.limit_ = parseInt(limit_result[1], 10);
    var idx = this.modifier_.search(/LIMIT/i);
    if (idx < start_idx) {
      start_idx = idx;
    }
  }
  var order_str = this.modifier_.substr(0, start_idx);
  var order_result = /ORDER BY\s+(.+)/i.exec(order_str);
  if (order_result) {
    var order = order_result[1].trim();
    var asc_desc = order.match(/(ASC|DESC)/i);
    if (asc_desc) {
      this.reverse_ = asc_desc[0].toUpperCase() == 'DESC';
      order = order.replace(/\s+(ASC|DESC)/i, '');
    } else {
      this.reverse_ = false;
    }
    this.order_ = goog.string.stripQuotes(
        goog.string.stripQuotes(order, '"'), "'");
    goog.asserts.assert(this.order_.length > 0, 'Invalid order by field');
  } else {
    this.order_ = undefined;
  }

  this.has_parsed_ = true;
  return '';
};



/**
 * Get select field list.
 * @return {Array.<string>} return null if selection is '*'. Field names are
 * trimmed.
 */
ydn.db.Sql.prototype.getSelList = function() {

  if (this.selList_ == '*') {
    return null;
  } else {
    var fields = this.selList_.split(',');
    fields = fields.map(function(s) {
      return goog.string.stripQuotes(s.trim(), '"');
    });
    return fields;
  }
};


/**
 *
 * @return {string}
 */
ydn.db.Sql.prototype.getSql = function() {
  return this.sql_;
};


/**
 * @inheritDoc
 */
ydn.db.Sql.prototype.toJSON = function() {
  return {
    'sql': this.sql_
  };
};


/**
 *
 * @return {!Array.<string>} store name.
 */
ydn.db.Sql.prototype.getStoreNames = function() {
  return goog.array.clone(this.store_names_);
};


/**
 *
 * @return {ydn.db.base.TransactionMode} store name.
 */
ydn.db.Sql.prototype.getMode = function() {
  return this.mode_;
};


/**
 *
 * @return {number}
 */
ydn.db.Sql.prototype.getLimit = function() {
  return this.limit_;
};


/**
 *
 * @return {number}
 */
ydn.db.Sql.prototype.getOffset = function() {
  return this.offset_;
};


/**
 *
 * @return {string|undefined}
 */
ydn.db.Sql.prototype.getOrderBy = function() {
  return this.order_;
};


/**
 *
 * @return {boolean}
 */
ydn.db.Sql.prototype.isReversed = function() {
  return this.reverse_;
};


/**
 * Get condition as array of Where clause.
 * @return {!Array.<ydn.db.Where>}
 */
ydn.db.Sql.prototype.getConditions = function() {
  return this.wheres_;
};


/**
 * Get condition as array of Where clause.
 * @return {Array.<ydn.db.Where>}
 */
ydn.db.Sql.prototype.parseConditions = function() {
  var wheres = [];
  var re_op = /(.+?)(<=|>=|=|>|<)(.+)/i;

  var findIndex = function(field) {
    return goog.array.findIndex(wheres, function(w) {
      return w.getField() == field;
    });
  };

  if (this.condition_.length > 0) {

    var conds = this.condition_.split('AND');
    for (var i = 0; i < conds.length; i++) {
      var cond = conds[i];
      var result = re_op.exec(cond);
      if (result) {
        var field = result[1].trim();
        field = goog.string.stripQuotes(field, '"');
        field = goog.string.stripQuotes(field, "'");
        if (field.length > 0) {
          var value = result[3].trim();
          if (goog.string.startsWith(value, '"')) {
            value = goog.string.stripQuotes(value, '"');
          } else if (goog.string.startsWith(value, "'")) {
            value = goog.string.stripQuotes(value, "'");
          } else {
            value = parseFloat(value);
            //console.log([cond, result[1], result[2], result[3], value]);
          }

          var op = result[2];
          var where = new ydn.db.Where(field, op, value);
          var ex_idx = findIndex(field);
          if (ex_idx >= 0) {
            wheres[ex_idx] = wheres[ex_idx].and(where);
            if (!wheres[ex_idx]) {
              this.last_error_ = 'where clause "' + cond + '" conflict';
              return null;
            }
          } else {
            wheres.push(where);
          }
        } else {
          this.last_error_ = 'Invalid clause "' + cond + '"';
          return null;
        }
      } else {
        this.last_error_ = 'Invalid clause "' + cond + '"';
        return null;
      }
    }
  }
  return wheres;
};


/**
 *
 * @return {string} store name.
 */
ydn.db.Sql.prototype.getAction = function() {
  return this.action_;
};


/**
 * @override
 */
ydn.db.Sql.prototype.toString = function() {
  if (goog.DEBUG) {
    return 'query:' + this.sql_;
  } else {
    return goog.base(this, 'toString');
  }
};


/**
 * @return {string|undefined} return aggregate or undefined.
 */
ydn.db.Sql.prototype.getAggregate = function() {
  return this.aggregate_;
};


