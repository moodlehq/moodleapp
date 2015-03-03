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
 * @fileoverview Query helper.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.query.helper');
goog.require('ydn.db.Query');
goog.require('ydn.db.query.ConjQuery');


/**
 * Create AND query.
 * @param {Array.<ydn.db.Query} qs querys
 * @return {*}
 */
ydn.db.query.and = function(qs) {
  var arr = goog.isArray(qs) ? qs : arguments;
  if (goog.DEBUG) {
    for (var i = 0; i < arr.length; i++) {
      var q = arr[i];
      if (!(q instanceof ydn.db.Query)) {
        throw new ydn.debug.error.ArgumentException('Invalid query ' + q +
            ' at ' + i);
      }
    }
  }
  return this.and_(arr);
};


/**
 * Create AND query.
 * @param {Array.<ydn.db.Query} qs
 * @return {ydn.db.query.ConjQuery}
 * @private
 */
ydn.db.query.and_ = function(qs) {
  var q = qs[0];
  return ydn.db.query.ConjQuery();
};

