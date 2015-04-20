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
 * @fileoverview Sorted merge algorithm.
 *
 * Sorted merge algorithm join reference values of given iterators (and
 * streamers) to matching value by continuing them by highest reference value.
 *
 * http://dev.mysql.com/doc/refman/5.0/en/index-merge-optimization.html
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.algo.SortedMerge');
goog.require('ydn.db');
goog.require('ydn.db.algo.AbstractSolver');



/**
 *
 * @param {(!Array|!{push: Function}|!ydn.db.Streamer)=} opt_out output
 * receiver.
 * @param {number=} opt_limit limit.
 * @constructor
 * @extends {ydn.db.algo.AbstractSolver}
 */
ydn.db.algo.SortedMerge = function(opt_out, opt_limit) {
  goog.base(this, opt_out, opt_limit);

};
goog.inherits(ydn.db.algo.SortedMerge, ydn.db.algo.AbstractSolver);


/**
 * @define {boolean} debug flag.
 */
ydn.db.algo.SortedMerge.DEBUG = false;


/**
 * @inheritDoc
 */
ydn.db.algo.SortedMerge.prototype.solver = function(keys, values) {

  var advancement = [];

  var base_key = values[0];

  if (!goog.isDefAndNotNull(base_key)) {
    if (ydn.db.algo.SortedMerge.DEBUG) {
      goog.global.console.log('SortedMerge: done.');
    }
    return [];
  }
  var all_match = true; // let assume
  var skip = false;     // primary_key must be skip
  var highest_key = base_key;
  var cmps = [];

  for (var i = 1; i < keys.length; i++) {
    if (goog.isDefAndNotNull(values[i])) {
      //console.log([values[0], values[i]])
      var cmp = ydn.db.cmp(base_key, values[i]);
      cmps[i] = cmp;
      if (this.is_reverse) {
        if (cmp == -1) {
          // base key is greater than ith key, so fast forward to ith key.
          all_match = false;
        } else if (cmp == 1) {
          // ith key is greater than base key. we are not going to get it
          all_match = false;
          skip = true; //
          if (ydn.db.cmp(values[i], highest_key) == -1) {
            highest_key = values[i];
          }
        }
      } else {
        if (cmp == 1) {
          // base key is greater than ith key, so fast forward to ith key.
          all_match = false;
        } else if (cmp == -1) {
          // ith key is greater than base key. we are not going to get it
          all_match = false;
          skip = true; //
          if (ydn.db.cmp(values[i], highest_key) == 1) {
            highest_key = values[i];
          }
        }
      }
      //i += this.degrees_[i]; // skip peer iterators.
    } else {
      all_match = false;
      skip = true;
    }
  }

  if (all_match) {
    // we get a match, so looking forward to next key.
    // all other keys are rewind
    for (var j = 0; j < keys.length; j++) {
      if (goog.isDefAndNotNull(values[j])) {
        advancement[j] = true;
      }
    }
  } else if (skip) {
    // all jump to highest key position.
    for (var j = 0; j < keys.length; j++) {
      if (goog.isDefAndNotNull(values[j])) {
        // we need to compare again, because intermediate highest
        // key might get cmp value of 0, but not the highest key
        if (this.is_reverse) {
          if (ydn.db.cmp(highest_key, values[j]) == -1) {
            advancement[j] = highest_key;
          }
        } else {
          if (ydn.db.cmp(highest_key, values[j]) == 1) {
            advancement[j] = highest_key;
          }
        }
      }
    }
  } else {
    // some need to catch up to base key
    var cmp_target = this.is_reverse ? -1 : 1;
    for (var j = 1; j < keys.length; j++) {
      if (cmps[j] === cmp_target) {
        advancement[j] = base_key;
      }
    }
  }

  if (ydn.db.algo.SortedMerge.DEBUG) {
    goog.global.console.log('SortedMerge: match: ' + all_match +
        ', skip: ' + skip +
        ', highest_key: ' + JSON.stringify(highest_key) +
        ', keys: ' + JSON.stringify(keys) +
        ', cmps: ' + JSON.stringify(cmps) +
        ', advancement: ' + JSON.stringify(advancement));
  }

  if (all_match) {
    this.match_count++;
    //console.log(['match key', match_key, JSON.stringify(keys)]);
    if (this.out) {
      this.out.push(highest_key);
    }
    return advancement;
  } else {
    return {'continuePrimary': advancement};
  }
};
