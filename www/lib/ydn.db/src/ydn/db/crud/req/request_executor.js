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
 * @fileoverview Execute data request.
 *
 * Before invoking database request, transaction object (tx) must set
 * and active. Caller must preform setting tx. This class will not check
 * it, but run immediately. Basically thinks this as a static object.
 *
 * These classes assume requested store or index are available in the database.
 */


goog.provide('ydn.db.crud.req.RequestExecutor');
goog.require('goog.async.Deferred');
goog.require('goog.log');
goog.require('ydn.db.InternalError');
goog.require('ydn.db.Key');



/**
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @struct
 */
ydn.db.crud.req.RequestExecutor = function(dbname, schema) {
  /**
   * @final
   * @protected
   * @type {string}
   */
  this.dbname = dbname;
  /**
   * @final
   * @protected
   * @type {!ydn.db.schema.Database}
   */
  this.schema = schema;
};


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.crud.req.RequestExecutor.prototype.logger =
    goog.log.getLogger('ydn.db.crud.req.RequestExecuto');


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.crud.req.RequestExecutor.prototype.toString = function() {
    return 'RequestExecutor';
  };
}





