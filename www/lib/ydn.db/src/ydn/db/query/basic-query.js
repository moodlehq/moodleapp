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
 * @fileoverview Query directly execute on raw cursor.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.query.Base');
goog.require('ydn.db.core.Storage');



/**
 * Query directly execute on raw cursor.
 * @param {ydn.db.core.DbOperator} db
 * @param {ydn.db.schema.Database} schema
 * @param {ydn.db.base.QueryMethod?} type query type. Default to NONE.
 * @constructor
 * @struct
 */
ydn.db.query.Base = function(db, schema, type) {
  /**
   * @final
   * @protected
   * @type {ydn.db.core.DbOperator}
   */
  this.db = db;
  /**
   * @final
   * @protected
   * @type {ydn.db.schema.Database}
   */
  this.schema = schema;
  /**
   * @final
   * @protected
   * @type {ydn.db.base.QueryMethod}
   */
  this.type = type || ydn.db.base.QueryMethod.NONE;
  /**
   * @final
   * @protected
   * @type {Array.<string>}
   */
  this.orders = [];
  /**
   * Cursor position.
   * @type {Array.<IDBKey>} [key, primaryKey]
   * @protected
   */
  this.marker = null;
};


/**
 * @return {!Array.<ydn.db.query.Iterator>}
 */
ydn.db.query.Base.prototype.getIterators = goog.abstractMethod;

