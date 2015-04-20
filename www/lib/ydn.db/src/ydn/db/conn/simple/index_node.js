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
 * @fileoverview Node for AVL tree to hold key and primary key.
 */


goog.provide('ydn.db.con.simple.Node');



/**
 *
 * @param {!IDBKey} key must be valid IDBKey.
 * @param {IDBKey=} opt_primary_key primary key.
 * @constructor
 */
ydn.db.con.simple.Node = function(key, opt_primary_key) {

  /**
   * @final
   */
  this.key = /** @type  {!IDBKey}  */ (key);
  /**
   * @final
   */
  this.primary_key = opt_primary_key;
};


/**
 * @private
 * @type {!IDBKey}
 */
ydn.db.con.simple.Node.prototype.key;


/**
 * @private
 * @type {IDBKey|undefined}
 */
ydn.db.con.simple.Node.prototype.primary_key;


/**
 * @return {!IDBKey} effective key.
 */
ydn.db.con.simple.Node.prototype.getKey = function() {
  return this.key;
};


/**
 * @return {IDBKey|undefined} primary key.
 */
ydn.db.con.simple.Node.prototype.getPrimaryKey = function() {
  return this.primary_key;
};


if (goog.DEBUG) {
  /**
   * @override
   */
  ydn.db.con.simple.Node.prototype.toString = function() {
    return 'ydn.db.con.simple.Node(' + this.key +
        (goog.isDefAndNotNull(this.primary_key) ? ', ' +
            this.primary_key + ')' : ')');
  };
}


/**
 * Node comparator
 * @param {ydn.db.con.simple.Node} a first node.
 * @param {ydn.db.con.simple.Node} b second node.
 * @return {number} -1 if a < b, 1 if a > b, 0 if a = b.
 */
ydn.db.con.simple.Node.cmp = function(a, b) {
  var cmp = ydn.db.cmp(a.key, b.key);
  if (cmp === 0) {
    if (goog.isDefAndNotNull(a.primary_key)) {
      if (goog.isDefAndNotNull(b.primary_key)) {
        return ydn.db.cmp(a.primary_key, b.primary_key);
      } else {
        return 1;
      }
    } else if (goog.isDefAndNotNull(b.primary_key)) {
      return -1;
    } else {
      return 0;
    }
  } else {
    return cmp;
  }
};
