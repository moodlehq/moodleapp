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
 * @fileoverview Abstract iterator.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.core.AbstractIterator');
goog.require('ydn.db.core.req.AbstractCursor');



/**
 * Abstract iterator.
 * @constructor
 * @struct
 */
ydn.db.core.AbstractIterator = function() {

};


/**
 * Load cursors.
 * @param {Array.<ydn.db.core.req.AbstractCursor>} cursor
 * @return {!ydn.db.core.req.ICursor} cursor
 */
ydn.db.core.AbstractIterator.prototype.load = goog.abstractMethod;


/**
 *
 * @return {!Array.<string>} return list of store name used for this iterator.
 */
ydn.db.core.AbstractIterator.prototype.stores = goog.abstractMethod;
