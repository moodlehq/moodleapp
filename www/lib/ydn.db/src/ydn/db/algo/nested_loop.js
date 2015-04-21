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
 * @fileoverview Naive Nested Loop Join algorithm.
 *
 * A simple nested-loop join (NLJ) algorithm reads rows from the first table in
 * a loop one at a time, passing each row to a nested loop that processes the
 * next table in the join. This process is repeated as many times as there
 * remain tables to be joined.
 *
 * Ref: http://dev.mysql.com/doc/refman/5.1/en/nested-loop-joins.html
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.algo.NestedLoop');
goog.require('ydn.db.algo.AbstractSolver');



/**
 *
 * @param {(!Array|!{push: Function}|!ydn.db.Streamer)=} out output receiver.
 * @param {number=} opt_limit limit.
 * @constructor
 * @extends {ydn.db.algo.AbstractSolver}
 */
ydn.db.algo.NestedLoop = function(out, opt_limit) {
  goog.base(this, out, opt_limit);
};
goog.inherits(ydn.db.algo.NestedLoop, ydn.db.algo.AbstractSolver);


/**
 * @define {boolean} debug flag.
 */
ydn.db.algo.NestedLoop.DEBUG = false;


/**
 * Index of active iterator.
 * @type {number}
 */
ydn.db.algo.NestedLoop.prototype.current_loop = -1;


/**
 * @inheritDoc
 */
ydn.db.algo.NestedLoop.prototype.begin = function(iterators, callback) {
  // we start with innermost loop.
  this.current_loop = iterators.length - 1;
  return false;
};


/**
 * @inheritDoc
 */
ydn.db.algo.NestedLoop.prototype.solver = function(keys, values) {

  // initialize advancement array
  var advancement = [];

  var all_restarting = true;

  var next = function(idx) {
    if (!goog.isDef(keys[idx])) {
      advancement[idx] = false; // restart
      if (idx - 1 >= 0) {
        next(idx - 1); // increase outer loop one step
      }
    } else {
      all_restarting = false;
      advancement[idx] = true;
    }
  };

  next(keys.length - 1); // increase one step to the innermost loop

  if (ydn.db.algo.NestedLoop.DEBUG) {
    goog.global.console.log([keys, values, advancement]);
  }

  if (all_restarting) {
    advancement = []; // it is over.
  }

  return this.pusher(advancement, keys, values);
};
