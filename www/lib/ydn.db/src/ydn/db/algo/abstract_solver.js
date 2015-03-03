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
 * @fileoverview Abstract join algorithm.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.algo.AbstractSolver');
goog.require('goog.log');
goog.require('ydn.db');
goog.require('ydn.db.Streamer');



/**
 * Abstract join algorithm.
 * @param {(!Array|!{push: Function}|!ydn.db.Streamer)=} opt_out output
 * receiver.
 * @param {number=} opt_limit limit.
 * to algorithm input and output.
 * @constructor
 */
ydn.db.algo.AbstractSolver = function(opt_out, opt_limit) {
  if (goog.DEBUG && goog.isDefAndNotNull(opt_out) && !('push' in opt_out)) {
    throw new ydn.error.ArgumentException('output receiver object must have ' +
        '"push" method.');
  }
  /**
   * @protected
   * @type {(!Array|!{push: Function}|!ydn.db.Streamer)|null}
   */
  this.out = opt_out || null;
  this.limit = opt_limit;
  this.match_count = 0;
  /**
   * @protected
   * @type {boolean}
   */
  this.is_reverse = false;
  /**
   * For streamer output receiver, if this set true, output both key and
   * reference value.
   * @type {boolean}
   * @protected
   */
  this.is_duplex_output = opt_out instanceof ydn.db.Streamer &&
      !!opt_out.getFieldName();
};


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.algo.AbstractSolver.prototype.logger =
    goog.log.getLogger('ydn.db.algo.AbstractSolver');


/**
 * Invoke before beginning of the iteration process.
 * @param {ydn.db.base.Transaction} tx transaction used in iteration.
 * @param {!Array.<!ydn.db.Iterator>} iterators list of iterators feed to the
 * scanner.
 * @param {!Function} callback on finish callback function.
 * @return {boolean}
 */
ydn.db.algo.AbstractSolver.prototype.begin = function(tx, iterators, callback) {
  this.is_reverse = iterators[0].isReversed();
  if (goog.DEBUG) {
    for (var i = 0; i < iterators.length; i++) {
      if (!(iterators[i] instanceof ydn.db.Iterator)) {
        throw new ydn.debug.error.TypeError('item at iterators ' + i +
            ' is not an iterator.');
      }
      if (i > 0) {
        if (this.is_reverse != iterators[i].isReversed()) {
          var r = this.is_reverse ? 'be reverse' : 'not be reverse';
          throw new ydn.debug.error.TypeError('iterator at ' + i +
              ' must ' + r);
        }
      }
    }
  }
  if (this.out instanceof ydn.db.Streamer) {
    this.out.setTx(tx);
  }
  if (this.is_duplex_output) {
    var iter_index = iterators[0].getIndexKeyPath();
    if (iter_index && iter_index.length > 1) {
      if (iter_index[iter_index.length - 1] != this.out.getFieldName()) {
        throw new ydn.error.InvalidOperationError('Output streamer ' +
            'projection field must be same as postfix field in the iterator');
      }
    } else {
      if (goog.DEBUG) {
        goog.log.warning(this.logger, 'Unable to check correctness of output streamer.');
      }
    }
  }
  var s = '{';
  for (var i = 0; i < iterators.length; i++) {
    if (i > 0) {
      s += ', ';
    }
    s += iterators.toString();
  }
  s += '}';
  if (this.is_reverse) {
    s += ' reverse';
  }
  goog.log.fine(this.logger, this + ' begin ' + s);
  return false;
};


/**
 * Push the result if all keys match. Break the limit if the number of results
 * reach the limit.
 * @param {!Array} advance
 * @param {!Array} keys input values.
 * @param {!Array} values output values.
 * @param {*=} opt_match_key match key.
 * @param {*=} opt_match_value match key.
 * @return {!Object} cursor advancement array.
 * @protected
 */
ydn.db.algo.AbstractSolver.prototype.pusher = function(advance, keys, values,
    opt_match_key, opt_match_value) {

  var matched = goog.isDefAndNotNull(opt_match_key);
  if (!goog.isDef(opt_match_key)) {
    opt_match_key = values[0];
    matched = goog.isDefAndNotNull(opt_match_key);
    for (var i = 1; matched && i < values.length; i++) {
      if (!goog.isDefAndNotNull(values[i]) ||
          ydn.db.cmp(values[i], opt_match_key) != 0) {
        matched = false;
      }
    }
  }

  if (matched) {
    this.match_count++;
    //console.log(['match key', match_key, JSON.stringify(keys)]);
    if (this.out) {
      if (this.is_duplex_output) {
        this.out.push(opt_match_key, opt_match_value);
      } else {
        this.out.push(opt_match_key);
      }
    }
    if (goog.isDef(this.limit) && this.match_count >= this.limit) {
      return [];
    }
  }

  return advance;
};


/**
 *
 * @param {!Array} input input values.
 * @param {!Array} output output values.
 * @return {!Array|!Object} next positions.
 */
ydn.db.algo.AbstractSolver.prototype.solver = function(input, output) {
  return [];
};


/**
 * Invoke at the end of the iteration process.
 * @param {!Function} callback on finish callback function.
 * @return {boolean} true to wait.
 */
ydn.db.algo.AbstractSolver.prototype.finish = function(callback) {
  return false;
};
