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
 * @fileoverview Query object to feed WebSQL iterator.
 *
 *
 */


goog.provide('ydn.db.sql.req.IdbQuery');
goog.require('ydn.db.sql.req.IterableQuery');
goog.require('goog.functions');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.Where');
goog.require('ydn.error.ArgumentException');



/**
 * Create a SQL query object from a query object.
 *
 * This clone given query object and added iteration functions so that
 * query processor can mutation as part of query optimization processes.
 *
 * @param {string} store store name.
 * @param {string=} index store field, where key query is preformed. If not
 * provided, the first index will be used.
 * @param {ydn.db.KeyRange=} keyRange configuration in json or native format.
 * @param {boolean=} reverse reverse.
 * @param {boolean=} unique unique.
 * @param {boolean=} key_only true for key only iterator.
 * @param {Function=} filter filter function.
 * @param {Function=} continued continued function.
 * @extends {ydn.db.sql.req.IterableQuery}
 * @constructor
 */
ydn.db.sql.req.IdbQuery = function(store, index, keyRange,
          reverse, unique, key_only, filter, continued) {

  goog.base(this, store, index, keyRange,  reverse, unique, key_only,
    filter, continued);

};
goog.inherits(ydn.db.sql.req.IdbQuery, ydn.db.sql.req.IterableQuery);


/**
 * @enum {string}
 */
ydn.db.sql.req.IdbQuery.Methods = {
  OPEN: 'op',
  COUNT: 'cn'
};


/**
 *
 * @type {ydn.db.sql.req.IdbQuery.Methods}
 */
ydn.db.sql.req.IdbQuery.prototype.method = ydn.db.sql.req.IdbQuery.Methods.OPEN;




