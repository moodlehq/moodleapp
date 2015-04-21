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
 * @fileoverview Provide database query operations.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.Storage');
goog.require('ydn.db.core.Storage.inject_executor');
goog.require('ydn.db.sql.Storage');
goog.require('ydn.db.sql.Storage.inject');
goog.require('ydn.db.tr.Storage.inject_db');
goog.require('ydn.db.tr.events');



/**
 * Create a suitable storage mechanism from indexdb, to websql to
 * localStorage.
 *
 * If database name and schema are provided, this will immediately initialize
 * the database and ready to use. However if any of these two are missing,
 * the database is not initialize until they are set by calling
 * {@link #setName} and {@link #setSchema}.
 * @see goog.db Google Closure Library DB module.
 * @param {string=} opt_dbname database name.
 * @param {(ydn.db.schema.Database|!DatabaseSchema)=} opt_schema database
 * schema
 * or its configuration in JSON format. If not provided, default empty schema
 * is used.
 * @param {!StorageOptions=} opt_options options.
 * @extends {ydn.db.sql.Storage}
 * @constructor *
 */
ydn.db.Storage = function(opt_dbname, opt_schema, opt_options) {
  goog.base(this, opt_dbname, opt_schema, opt_options);
};
goog.inherits(ydn.db.Storage, ydn.db.sql.Storage);



