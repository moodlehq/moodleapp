// Copyright 2013 YDN Authors. All Rights Reserved.
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
 * @fileoverview Inverted index.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.schema.fulltext.InvIndex');
goog.require('goog.array');
goog.require('ydn.debug.error.ArgumentException');
goog.require('ydn.json');



/**
 * Primary index for fulltext search index.
 * @param {string} store_name store name of which index reside.
 * @param {string} key_path the index name.
 * @param {number?=} opt_weight index weight. Default to 1.
 * @constructor
 * @struct
 */
ydn.db.schema.fulltext.InvIndex = function(store_name, key_path,
                                           opt_weight) {
  if (goog.DEBUG) {
    if (!store_name || goog.string.isEmpty(store_name)) {
      throw new ydn.debug.error.ArgumentException('store_name must be' +
          ' provided for primary full text index');
    }
    if (!key_path || goog.string.isEmpty(key_path)) {
      throw new ydn.debug.error.ArgumentException('index_name must be' +
          ' provided for primary full text index');
    }
  }
  /**
   * @protected
   * @type {string}
   */
  this.store_name = store_name;
  /**
   * @protected
   * @type {string}
   */
  this.key_path = key_path;
  /**
   * @protected
   * @type {number}
   */
  this.weight = opt_weight || 1.0;
};


/**
 * @return {string}
 */
ydn.db.schema.fulltext.InvIndex.prototype.getStoreName = function() {
  return this.store_name;
};


/**
 * @return {number}
 */
ydn.db.schema.fulltext.InvIndex.prototype.getWeight = function() {
  return this.weight;
};


/**
 * @return {string}
 */
ydn.db.schema.fulltext.InvIndex.prototype.getKeyPath = function() {
  return this.key_path;
};


/**
 * @param {InvIndex} json
 * @return {!ydn.db.schema.fulltext.InvIndex}
 */
ydn.db.schema.fulltext.InvIndex.fromJson = function(json) {
  if (goog.DEBUG) {
    var fields = ['storeName', 'keyPath', 'weight'];
    for (var key in json) {
      if (json.hasOwnProperty(key) && goog.array.indexOf(fields, key) == -1) {
        throw new ydn.debug.error.ArgumentException('Unknown field: ' + key +
            ' in ' + ydn.json.toShortString(json));
      }
    }
  }
  return new ydn.db.schema.fulltext.InvIndex(json.storeName, json.keyPath,
      json.weight);
};

