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
 * @fileoverview Database index schema.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.schema.DataType');
goog.provide('ydn.db.schema.Index');
goog.require('ydn.db.base');
goog.require('ydn.db.utils');
goog.require('ydn.debug.error.ArgumentException');



/**
 * Schema for index.
 *
 * @param {string|!Array.<string>} keyPath the key path.
 * @param {string|ydn.db.schema.DataType=} opt_type to be determined.
 * @param {boolean=} opt_unique True if the index enforces that there is only
 * one objectfor each unique value it indexes on.
 * @param {boolean=} opt_multi_entry specifies whether the index's multiEntry
 * flag is set.
 * @param {string=} opt_index_name index name.
 * @param {Function=} opt_generator index key generator.
 * @constructor
 * @struct
 */
ydn.db.schema.Index = function(
    keyPath, opt_type, opt_unique, opt_multi_entry, opt_index_name,
    opt_generator) {

  if (!goog.isDef(opt_index_name)) {
    if (goog.isArray(keyPath)) {
      opt_index_name = keyPath.join(', ');
    } else {
      opt_index_name = keyPath;
    }
  }

  if (goog.isDefAndNotNull(keyPath) && !goog.isString(keyPath) &&
      !goog.isArrayLike(keyPath)) {
    throw new ydn.debug.error.ArgumentException('index keyPath for ' +
        opt_index_name +
        ' must be a string or array, but ' + keyPath + ' is ' + typeof keyPath);
  }

  if (goog.DEBUG && goog.isArray(keyPath) && Object.freeze) {
    // NOTE: due to performance penalty (in Chrome) of using freeze and
    // hard to debug on different browser we don't want to use freeze
    // this is experimental.
    // http://news.ycombinator.com/item?id=4415981
    Object.freeze(/** @type {!Object} */ (keyPath));
  }

  if (!goog.isDef(keyPath) && goog.isDef(opt_index_name)) {
    keyPath = opt_index_name;
  }

  /**
   * @final
   */
  this.keyPath = keyPath;
  /**
   * @final
   * @private
   */
  this.is_composite_ = goog.isArrayLike(this.keyPath);

  /**
   * @private
   * @final
   * @type {string}
   */
  this.index_name_ = opt_index_name;
  /**
   * @final
   * @type {ydn.db.schema.DataType|undefined}
   */
  this.type = ydn.db.schema.Index.toType(opt_type);
  if (goog.isDef(opt_type)) {
    if (!goog.isDef(this.type)) {
      throw new ydn.debug.error.ArgumentException('type invalid in index: ' +
          this.index_name_);
    }
    if (goog.isArray(this.keyPath)) {
      throw new ydn.debug.error.ArgumentException(
          'composite key for store "' + this.index_name_ +
          '" must not specified type');
    }
  }
  /**
   * @final
   */
  this.unique = !!opt_unique;

  /**
   * @final
   */
  this.multiEntry = !!opt_multi_entry;
  /**
   * @final
   * @private
   */
  this.keyColumnType_ = goog.isString(this.type) ? this.type :
      ydn.db.schema.DataType.TEXT;
  /**
   * @final
   * @private
   */
  this.index_column_name_ = goog.isString(opt_index_name) ?
      opt_index_name : goog.isArray(keyPath) ?
          this.keyPath.join(',') : keyPath;

  this.index_column_name_quoted_ = goog.string.quote(this.index_column_name_);

  this.key_paths_ = !this.is_composite_ ? this.keyPath.split('.') : null;

  goog.asserts.assert(!goog.isDefAndNotNull(opt_generator) ||
      goog.isFunction(opt_generator), 'index generator must be a function, ' +
      ', but ' + (typeof opt_generator) + ' found.');
  /**
   * @private
   */
  this.index_generator_ = opt_generator || null;
};


/**
 * Extract value of keyPath from a given object.
 * @param {!Object} obj object to extract from.
 * @return {IDBKey|undefined} return key value.
 */
ydn.db.schema.Index.prototype.extractKey = function(obj) {
  if (goog.isDefAndNotNull(obj)) {
    if (goog.isArrayLike(this.keyPath)) {
      var key = [];
      for (var i = 0, n = this.keyPath.length; i < n; i++) {
        var i_key = ydn.db.utils.getValueByKeys(obj, this.keyPath[i]);
        goog.asserts.assert(goog.isDefAndNotNull(i_key),
            ydn.json.toShortString(obj) +
            ' does not issue require composite key value ' + i + ' of ' +
            n + ' on index "' + this.index_name_ + '"');
        key[i] = i_key;
      }
      return key;
    } else {
      return /** @type {IDBKey} */ (ydn.db.utils.getValueByKeys(
          obj, this.keyPath));
    }
  }
};


/**
 * Apply index value to given object according to key path.
 * Index must not be composite nor multiEntry.
 * @param {!Object} obj
 * @param {*} value
 */
ydn.db.schema.Index.prototype.applyValue = function(obj, value) {
  for (var i = 0; i < this.key_paths_.length; i++) {
    if (i == this.key_paths_.length - 1) {
      obj[this.key_paths_[i]] = value;
    } else {

      if (!goog.isObject(obj[this.key_paths_[i]])) {
        obj[this.key_paths_[i]] = {};
      }
    }
  }
};


/**
 * @private
 * @type {ydn.db.schema.DataType}
 */
ydn.db.schema.Index.prototype.keyColumnType_;


/**
 * @type {(string|!Array.<string>)}
 */
ydn.db.schema.Index.prototype.keyPath;


/**
 * Cache result of spliting key path by '.'.
 * @type {Array.<string>}
 * @private
 */
ydn.db.schema.Index.prototype.key_paths_;


/**
 * @type {boolean}
 */
ydn.db.schema.Index.prototype.multiEntry;


/**
 * @type {boolean}
 * @private
 */
ydn.db.schema.Index.prototype.is_composite_;


/**
 * @type {boolean}
 */
ydn.db.schema.Index.prototype.unique;


/**
 * Data type for field in object store. This is required to compatible between
 * IndexedDB and SQLite.
 * SQLite mandate COLUMN field specified data type.
 * IndexedDB allow Array as data type in key, while SQLite is not to use.
 * @see http://www.w3.org/TR/IndexedDB/#key-construct
 * @see http://www.sqlite.org/datatype3.html
 * @see http://www.sqlite.org/lang_expr.html
 * @enum {string}
 */
ydn.db.schema.DataType = {
  BLOB: 'BLOB',
  DATE: 'DATE',
  INTEGER: 'INTEGER', // AUTOINCREMENT is only allowed on an INTEGER
  NUMERIC: 'NUMERIC',
  TEXT: 'TEXT'
};


/**
 * This data type abbreviation is used to prefix value of
 * ydn.db.schema.DataType.ARRAY
 * on storage.
 * @see http://www.sqlite.org/datatype3.html
 * @enum {string}
 */
ydn.db.DataTypeAbbr = {
  DATE: 'd',
  NUMERIC: 'n',
  TEXT: 't',
  BLOB: 'b'
};


/**
 * Seperator char for array
 * @const
 * @type {string}
 */
ydn.db.schema.Index.ARRAY_SEP = String.fromCharCode(0x001F);


/**
 * Convert key value from IndexedDB value to Sqlite for storage.
 * @see #sql2js
 * @param {Array|Date|*} key key.
 * @param {ydn.db.schema.DataType|undefined} type data type.
 * @return {*} string.
 */
ydn.db.schema.Index.js2sql = function(key, type) {
  if (type == ydn.db.schema.DataType.DATE) {
    if (key instanceof Date) {
      return +key;  // date is store as NUMERIC
    } // else ?
  } else if (goog.isDefAndNotNull(type)) {
    return key; // NUMERIC, INTEGER, and BLOB
  } else {
    return ydn.db.utils.encodeKey(key);
  }
};


/**
 * Convert key value from Sqlite value to IndexedDB for storage.
 * @see #js2sql
 * @param {string|number|*} key key.
 * @param {ydn.db.schema.DataType|undefined} type type.
 * @return {IDBKey|undefined} decoded key.
 */
ydn.db.schema.Index.sql2js = function(key, type) {
  if (type == ydn.db.schema.DataType.DATE) {
    return new Date(key); // key is number
  } else if (goog.isDef(type)) {
    return /** @type {number} */ (key);   // NUMERIC, INTEGER, BLOB
  } else {
    return ydn.db.utils.decodeKey(/** @type {string} */ (key));
  }
};


/**
 * @const
 * @type {!Array.<ydn.db.schema.DataType>} column data type.
 */
ydn.db.schema.Index.TYPES = [
  ydn.db.schema.DataType.BLOB,
  ydn.db.schema.DataType.DATE,
  ydn.db.schema.DataType.INTEGER,
  ydn.db.schema.DataType.NUMERIC,
  ydn.db.schema.DataType.TEXT];


/**
 * Return an immutable type.
 * @param {ydn.db.schema.DataType|string=} opt_type data type in string.
 * @return {ydn.db.schema.DataType|undefined}
 * data type.
 */
ydn.db.schema.Index.toType = function(opt_type) {
  if (goog.isString(opt_type)) {
    var idx = goog.array.indexOf(ydn.db.schema.Index.TYPES, opt_type);
    return ydn.db.schema.Index.TYPES[idx]; // undefined OK.
  } else {
    return undefined;
  }

};


/**
 *
 * @param {*} x object to test.
 * @return {ydn.db.DataTypeAbbr} type of object type.
 */
ydn.db.schema.Index.toAbbrType = function(x) {
  if (x instanceof Date) {
    return ydn.db.DataTypeAbbr.DATE;
  } else if (goog.isNumber(x)) {
    return ydn.db.DataTypeAbbr.NUMERIC;
  } else if (goog.isString(x)) {
    return ydn.db.DataTypeAbbr.TEXT;
  } else {
    return ydn.db.DataTypeAbbr.BLOB;
  }
};


/**
 *
 * @param {*} x object to test.
 * @return {ydn.db.DataTypeAbbr} type of object type.
 */
ydn.db.schema.Index.type2AbbrType = function(x) {
  if (x === ydn.db.schema.DataType.DATE) {
    return ydn.db.DataTypeAbbr.DATE;
  } else if (x === ydn.db.schema.DataType.NUMERIC) {
    return ydn.db.DataTypeAbbr.NUMERIC;
  } else if (x === ydn.db.schema.DataType.TEXT) {
    return ydn.db.DataTypeAbbr.TEXT;
  } else {
    return ydn.db.DataTypeAbbr.BLOB;
  }
};


/**
 * Return type.
 * @return {ydn.db.schema.DataType|undefined} data type.
 */
ydn.db.schema.Index.prototype.getType = function() {
  return this.type;
};


/**
 *
 * @return {ydn.db.schema.DataType} get type suitable to use in SQL query
 * construction.
 */
ydn.db.schema.Index.prototype.getSqlType = function() {
  return this.keyColumnType_;
};


/**
 *
 * @return {string} index name.
 */
ydn.db.schema.Index.prototype.getName = function() {
  return this.index_name_;
};


/**
 *
 * @return {boolean} multiEntry or not.
 */
ydn.db.schema.Index.prototype.isMultiEntry = function() {
  return this.multiEntry;
};


/**
 *
 * @return {boolean} composite index or not.
 */
ydn.db.schema.Index.prototype.isComposite = function() {
  return this.is_composite_;
};


/**
 *
 * @return {boolean} unique or not.
 */
ydn.db.schema.Index.prototype.isUnique = function() {
  return this.unique;
};


/**
 * @inheritDoc
 */
ydn.db.schema.Index.prototype.toJSON = function() {
  return {
    'name': this.index_name_,
    'keyPath': this.keyPath,
    'type': this.type,
    'unique': this.unique,
    'multiEntry': this.multiEntry
  };
};


/**
 *
 * @return {!ydn.db.schema.Index} a clone.
 */
ydn.db.schema.Index.prototype.clone = function() {
  var keyPath = goog.isArray(this.keyPath) ?
      goog.array.clone(/** @type {goog.array.ArrayLike} */ (this.keyPath)) :
      this.keyPath;

  return new ydn.db.schema.Index(
      keyPath,
      this.type,
      this.unique,
      this.multiEntry,
      this.index_name_,
      this.index_generator_);
};


/**
 * Compare two keyPath.
 * @see #equals
 * @param {*} keyPath1 key path 1.
 * @param {*} keyPath2 key path 1.
 * @return {string?} description where is different between the two. null
 * indicate similar schema.
 */
ydn.db.schema.Index.compareKeyPath = function(keyPath1, keyPath2) {
  if (!goog.isDefAndNotNull(keyPath1) && !goog.isDefAndNotNull(keyPath2)) {
    return null;
  } else if (!goog.isDefAndNotNull(keyPath1)) {
    return 'newly define ' + keyPath2;
  } else if (!goog.isDefAndNotNull(keyPath2)) {
    return 'keyPath: ' + keyPath1 + ' no longer defined';
  } else if (goog.isArrayLike(keyPath1) && goog.isArrayLike(keyPath2)) {
    return goog.array.equals(/** @type {goog.array.ArrayLike} */ (keyPath1),
        /** @type {goog.array.ArrayLike} */ (keyPath2)) ?
        null : 'expect: ' + keyPath1 + ', but: ' + keyPath2;
  } else if (!ydn.object.equals(keyPath1, keyPath2)) {
    return 'expect: ' + keyPath1 + ', but: ' + keyPath2;
  } else {
    return null;
  }
};


/**
 * Test key path.
 * @param {string|!Array.<string>} key_path key path to be tested.
 * @return {boolean} true if given key path is equal to this key path.
 */
ydn.db.schema.Index.prototype.equalsKeyPath = function(key_path) {
  return !ydn.db.schema.Index.compareKeyPath(this.keyPath, key_path);
};


/**
 * Compare two stores.
 * @see #equals
 * @param {ydn.db.schema.Index} index index schema to test.
 * @return {string} description where is different between the two. Empty string
 * indicate similar schema.
 */
ydn.db.schema.Index.prototype.difference = function(index) {
  if (!index) {
    return 'no index for ' + this.index_name_;
  }
  if (this.index_name_ != index.index_name_) {
    return 'name, expect: ' + this.index_name_ + ', but: ' + index.index_name_;
  }
  var msg = ydn.db.schema.Index.compareKeyPath(this.keyPath, index.keyPath);
  if (msg) {
    return 'keyPath, ' + msg;
  }
  if (goog.isDefAndNotNull(this.unique) &&
      goog.isDefAndNotNull(index.unique) &&
      this.unique != index.unique) {
    return 'unique, expect: ' + this.unique + ', but: ' + index.unique;
  }
  if (goog.isDefAndNotNull(this.multiEntry) &&
      goog.isDefAndNotNull(index.multiEntry) &&
      this.multiEntry != index.multiEntry) {
    return 'multiEntry, expect: ' + this.multiEntry +
        ', but: ' + index.multiEntry;
  }
  if (goog.isDef(this.type) && goog.isDef(index.type) &&
      (goog.isArrayLike(this.type) ? !goog.array.equals(
      /** @type {goog.array.ArrayLike} */ (this.type),
      /** @type {goog.array.ArrayLike} */ (index.type)) :
      this.type != index.type)) {
    return 'data type, expect: ' + this.type + ', but: ' + index.type;
  }
  return '';
};


/**
 * Create a new update index schema with given guided index schema.
 * NOTE: This is used in websql for checking table schema sniffed from the
 * connection is similar to requested table schema. The fact is that
 * some schema information are not able to reconstruct from the connection,
 * these include:
 *   1. composite index: in which a composite index is blown up to multiple
 *     columns. @see ydn.db.con.WebSql.prototype.prepareTableSchema_.
 * @param {ydn.db.schema.Index} that guided index schema.
 * @return {!ydn.db.schema.Index} updated index schema.
 */
ydn.db.schema.Index.prototype.hint = function(that) {
  if (!that) {
    return this;
  }
  goog.asserts.assert(this.index_name_ == that.index_name_, 'index name: ' +
      this.index_name_ + ' != ' + that.index_name_);
  var keyPath = goog.isArray(this.keyPath) ?
      goog.array.clone(/** @type {goog.array.ArrayLike} */ (this.keyPath)) :
      this.keyPath;
  var type = this.type;
  if (!goog.isDef(that.type) && type == 'TEXT') {
    // composite are converted into TEXT
    type = undefined;
  }
  return new ydn.db.schema.Index(keyPath, type, this.unique, this.multiEntry,
      that.index_name_);
};


/**
 *
 * @param {ydn.db.base.Direction|string=} opt_str direction in string format.
 * @return {ydn.db.base.Direction|undefined} equivalent typed direction.
 */
ydn.db.schema.Index.toDir = function(opt_str) {
  var idx = goog.array.indexOf(ydn.db.base.DIRECTIONS, opt_str);
  return ydn.db.base.DIRECTIONS[idx]; // undefined OK.
};


/**
 *
 * @return {(string|!Array.<string>)} keyPath.
 */
ydn.db.schema.Index.prototype.getKeyPath = function() {
  return this.keyPath;
};


/**
 * Return quoted keyPath. In case undefined return default key column.
 * @return {string} return quoted keyPath. If keyPath is array, they are
 * join by ',' and quoted. If keyPath is not define, default sqlite column
 * name is used.
 */
ydn.db.schema.Index.prototype.getSQLIndexColumnName = function() {
  return this.index_column_name_;
};


/**
 * Return quoted keyPath. In case undefined return default key column.
 * @return {string} return quoted keyPath. If keyPath is array, they are
 * join by ',' and quoted. If keyPath is not define, default sqlite column
 * name is used.
 */
ydn.db.schema.Index.prototype.getSQLIndexColumnNameQuoted = function() {
  return this.index_column_name_quoted_;
};


/**
 * @type {string}
 * @private
 */
ydn.db.schema.Index.prototype.index_column_name_;


/**
 * @type {string}
 * @private
 */
ydn.db.schema.Index.prototype.index_column_name_quoted_;


/**
 * @type {Function}
 * @private
 */
ydn.db.schema.Index.prototype.index_generator_;


/**
 * Set a generator function.
 * @param {Function} gen generator function.
 */
ydn.db.schema.Index.prototype.setGenerator = function(gen) {
  goog.asserts.assert(!this.index_generator_, 'index ' + this.index_name_ +
      ' already has a generator');
  this.index_generator_ = gen;
};


/**
 * Add index by generator.
 * @param {Object} obj record value.
 */
ydn.db.schema.Index.prototype.generateIndex = function(obj) {
  if (this.index_generator_) {
    var out = this.index_generator_(obj);
    var type = typeof(out);
    if (type == 'string' || type == 'number' || out instanceof Date ||
        goog.isArray(out)) {
      for (var i = 0; i < this.key_paths_.length - 1; i++) {
        if (!goog.isObject(obj[this.key_paths_[i]])) {
          obj[this.key_paths_[i]] = {};
        }
      }
      obj[this.key_paths_[this.key_paths_.length - 1]] = out;
    }
  }
};


/**
 * @return {boolean} true if index use generator index.
 */
ydn.db.schema.Index.prototype.isGeneratorIndex = function() {
  return !!this.index_generator_;
};


/**
 *
 * @param {!IndexSchema} json object in json format.
 * @return {ydn.db.schema.Index} created from input json string.
 */
ydn.db.schema.Index.fromJSON = function(json) {
  if (goog.DEBUG) {
    var fields = ['name', 'unique', 'type', 'keyPath', 'multiEntry',
      'generator'];
    for (var key in json) {
      if (json.hasOwnProperty(key) && goog.array.indexOf(fields, key) == -1) {
        throw new ydn.debug.error.ArgumentException('Unknown field: ' + key +
            ' in ' + ydn.json.stringify(json));
      }
    }
  }
  return new ydn.db.schema.Index(json.keyPath, json.type, json.unique,
      json.multiEntry, json.name, json.generator);
};


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.schema.Index.prototype.toString = function() {
    var s = this.multiEntry ? 'MultiEntry' : '';
    if (this.key_paths_ && this.key_paths_.length > 1) {
      s += 'Compound';
    }
    return s + 'Index:' + this.index_name_;
  };
}

