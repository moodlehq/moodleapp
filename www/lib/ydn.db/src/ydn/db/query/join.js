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
 * @fileoverview Join data.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.query.EquiJoin');



/**
 * Join operation.
 * @param {string} store_name store name to join.
 * @param {string=} opt_field_name restriction feild name.
 * @param {IDBKey=} opt_value restriction field value.
 * @constructor
 * @struct
 */
ydn.db.query.EquiJoin = function(store_name, opt_field_name, opt_value) {
  /**
   * @final
   */
  this.store_name = store_name;
  /**
   * @final
   */
  this.field_name = opt_field_name;
  /**
   * @final
   */
  this.value = opt_value;
};


/**
 * @type {string}
 */
ydn.db.query.EquiJoin.store_name;


/**
 * @type {string|undefined}
 */
ydn.db.query.EquiJoin.field_name;


/**
 * @type {IDBKey|undefined}
 */
ydn.db.query.EquiJoin.value;
