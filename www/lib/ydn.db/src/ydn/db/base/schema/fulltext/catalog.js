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
 * @fileoverview Fulltext index.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.schema.fulltext.Catalog');
goog.require('goog.array');
goog.require('ydn.db.schema.fulltext.Engine');
goog.require('ydn.db.schema.fulltext.InvIndex');
goog.require('ydn.debug.error.ArgumentException');



/**
 * Catalog of full text search indexes.
 * @param {string} name fulltext search index name.
 * @param {Array.<ydn.db.schema.fulltext.InvIndex>} indexes list of primary
 * index, in which indexes are stored.
 * @param {string=} opt_lang language.
 * @param {Array.<string>=} opt_normalizers list of normalizer.
 * @constructor
 * @struct
 */
ydn.db.schema.fulltext.Catalog = function(name, indexes, opt_lang,
                                          opt_normalizers) {
  /**
   * @protected
   * @type {string}
   */
  this.name = name;
  /**
   * @protected
   * @type {Array.<ydn.db.schema.fulltext.InvIndex>}
   */
  this.indexes = indexes;
  /**
   * @final
   * @type {string}
   */
  this.lang = opt_lang || '';
  if (goog.DEBUG) {
    if (['', 'en', 'fr'].indexOf(this.lang) == -1) {
      throw new ydn.debug.error.ArgumentException('Unsupported lang "' +
          opt_lang + ' for full text search index ' + name);
    }
  }
  /**
   * @final
   * @type {Array.<string>}
   */
  this.normalizers = opt_normalizers || null;
  /**
   * @type {ydn.db.schema.fulltext.Engine}
   */
  this.engine = null;
};


/**
 * Return unique source store name.
 * @return {!Array.<string>}
 */
ydn.db.schema.fulltext.Catalog.prototype.getSourceNames = function() {
  var arr = [];
  for (var i = 0; i < this.indexes.length; i++) {
    var name = this.indexes[i].getStoreName();
    if (arr.indexOf(name) == -1) {
      arr.push(name);
    }
  }
  return arr;
};


/**
 * @return {string} full text index name. This is store name as well.
 */
ydn.db.schema.fulltext.Catalog.prototype.getName = function() {
  return this.name;
};


/**
 * @return {number} number of primary indexes.
 */
ydn.db.schema.fulltext.Catalog.prototype.count = function() {
  return this.indexes.length;
};


/**
 * @param {number} idx index of indexes.
 * @return {ydn.db.schema.fulltext.InvIndex} Index at idx.
 */
ydn.db.schema.fulltext.Catalog.prototype.index = function(idx) {
  return this.indexes[idx];
};


/**
 * @param {string} store_name store name.
 * @param {string} index_name store name.
 * @return {ydn.db.schema.fulltext.InvIndex} Index at idx.
 */
ydn.db.schema.fulltext.Catalog.prototype.getSource = function(store_name,
                                                              index_name) {
  return goog.array.find(this.indexes, function(x) {
    return x.getStoreName() == store_name && x.getKeyPath() == index_name;
  });
};


/**
 * @param {FullTextCatalog} json
 * @return {!ydn.db.schema.fulltext.Catalog}
 */
ydn.db.schema.fulltext.Catalog.fromJson = function(json) {
  if (goog.DEBUG) {
    var fields = ['name', 'sources', 'lang'];
    for (var key in json) {
      if (json.hasOwnProperty(key) && goog.array.indexOf(fields, key) == -1) {
        throw new ydn.debug.error.ArgumentException('Unknown field: ' + key +
            ' in ' + ydn.json.stringify(json));
      }
    }
  }
  if (!goog.isArray(json.sources)) {
    throw new ydn.debug.error.ArgumentException('indexes require for ' +
        'full text search index ' + json.name + ', but ' + json.sources +
        ' of type ' + typeof json.sources + ' found.');
  }
  var indexes = json.sources.map(function(x) {
    return ydn.db.schema.fulltext.InvIndex.fromJson(x);
  });
  return new ydn.db.schema.fulltext.Catalog(json.name, indexes, json.lang);
};

