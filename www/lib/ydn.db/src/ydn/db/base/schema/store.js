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
 * @fileoverview Represent object store.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.schema.Store');
goog.require('goog.array.ArrayLike');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.Request.Method');
goog.require('ydn.db.schema.Index');



/**
 * Create a store schema.
 * @param {string} name object store name or TABLE name.
 * @param {(Array.<string>|string)=} opt_key_path indexedDB keyPath, like
 * 'feed.id.$t'. A path to extract primary key from record value.
 * @param {boolean=} opt_autoIncrement If true, the object store has a key
 * generator. Defaults to false.
 * @param {string|ydn.db.schema.DataType=} opt_type data type for keyPath. This
 * value is only used by WebSQL for column data type.
 * <code>ydn.db.schema.DataType.INTEGER</code> if opt_autoIncrement is
 * <code>true.</code>
 * @param {!Array.<!ydn.db.schema.Index>=} opt_indexes list of indexes.
 * @param {boolean=} opt_dispatch_events if true, storage instance should
 * dispatch event on record values changes.
 * @param {boolean=} opt_is_fixed fixed store schema. Websql TABLE, has a
 * default column to store JSON stringify data. A fixed store schema TABLE,
 * do not hae that default column.
 * @param {boolean=} opt_encrypted store is encrypted.
 * @constructor
 * @struct
 */
ydn.db.schema.Store = function(name, opt_key_path, opt_autoIncrement, opt_type,
                               opt_indexes, opt_dispatch_events, opt_is_fixed,
                               opt_encrypted) {

  /**
   * @private
   * @final
   * @type {string}
   */
  this.name_ = name;
  if (!goog.isString(this.name_)) {
    throw new ydn.debug.error.ArgumentException('store name must be a string');
  }
  /**
   * @final
   */
  this.keyPath = goog.isDef(opt_key_path) ? opt_key_path : null;
  /**
   * @final
   */
  this.isComposite = goog.isArrayLike(this.keyPath);

  if (!goog.isNull(this.keyPath) &&
      !goog.isString(this.keyPath) && !this.isComposite) {
    throw new ydn.debug.error.ArgumentException(
        'keyPath must be a string or array');
  }

  /**
   * IE10 do not reflect autoIncrement, so that make undefined as an option.
   * @final
   * @type {boolean|undefined}
   */
  this.autoIncrement = opt_autoIncrement;

  var type;
  if (goog.isDefAndNotNull(opt_type)) {
    type = ydn.db.schema.Index.toType(opt_type);
    if (!goog.isDef(type)) {
      throw new ydn.debug.error.ArgumentException('type "' + opt_type +
          '" for primary key in store "' + this.name_ + '" is invalid.');
    }
    if (this.isComposite) {
      throw new ydn.debug.error.ArgumentException(
          'composite key for store "' + this.name_ +
              '" must not specified type');
    }
  }

  /**
   * @final
   */
  this.type = goog.isDefAndNotNull(type) ? type : this.autoIncrement ?
      ydn.db.schema.DataType.INTEGER : undefined;

  /**
   * @final
   */
  this.keyPaths = goog.isString(this.keyPath) ? this.keyPath.split('.') : [];
  /**
   * @final
   */
  this.indexes = opt_indexes || [];
  /**
   * @final
   */
  this.dispatch_events = !!opt_dispatch_events;
  /**
   * @final
   */
  this.fixed = !!opt_is_fixed;
  /**
   * @final
   * @private
   */
  this.keyColumnType_ = goog.isString(this.type) ?
      this.type : ydn.db.schema.DataType.TEXT;
  /**
   * @final
   * @private
   */
  this.primary_column_name_ = goog.isArray(this.keyPath) ?
      this.keyPath.join(',') :
      goog.isString(this.keyPath) ?
          this.keyPath :
          ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;

  /**
   * @final
   * @private
   */
  this.primary_column_name_quoted_ =
      goog.string.quote(this.primary_column_name_);

  /**
   * @final
   * @type {boolean}
   * @private
   */
  this.is_encrypted_ = !!opt_encrypted;
  if (goog.DEBUG && this.is_encrypted_) {
    if (this.keyPath) {
      throw new ydn.debug.error.ArgumentException('encrypted store "' +
          this.name_ + '" must not use inline key');
    }
    if (this.isAutoIncrement()) {
      throw new ydn.debug.error.ArgumentException('encrypted store "' +
          this.name_ + '" must not use key generator');
    }
  }

  /**
   * @final
   * @type {Array.<function(!ydn.db.Request, goog.array.ArrayLike)>} hookers.
   * @private
   */
  this.hooks_ = [];

};


/**
 * @enum {string}
 */
ydn.db.schema.Store.FetchStrategy = {
  LAST_UPDATED: 'last-updated',
  ASCENDING_KEY: 'ascending-key',
  DESCENDING_KEY: 'descending-key'
};


/**
 * @const
 * @type {Array.<ydn.db.schema.Store.FetchStrategy>}
 */
ydn.db.schema.Store.FetchStrategies = [
  ydn.db.schema.Store.FetchStrategy.LAST_UPDATED,
  ydn.db.schema.Store.FetchStrategy.ASCENDING_KEY,
  ydn.db.schema.Store.FetchStrategy.DESCENDING_KEY];


/**
 * @type {boolean}
 * @private
 */
ydn.db.schema.Store.prototype.isComposite;


/**
 * @type {(!Array.<string>|string)?}
 */
ydn.db.schema.Store.prototype.keyPath;


/**
 * @type {boolean|undefined}
 */
ydn.db.schema.Store.prototype.autoIncrement;


/**
 * @type {ydn.db.schema.DataType|undefined} //
 */
ydn.db.schema.Store.prototype.type;


/**
 * @private
 * @type {ydn.db.schema.DataType}
 */
ydn.db.schema.Store.prototype.keyColumnType_;


/**
 * @protected
 * @type {!Array.<string>}
 */
ydn.db.schema.Store.prototype.keyPaths;


/**
 * @type {!Array.<!ydn.db.schema.Index>}
 * @protected
 */
ydn.db.schema.Store.prototype.indexes;


/**
 * @type {boolean}
 */
ydn.db.schema.Store.prototype.dispatch_events = false;


/**
 * A fixed schema cannot store arbitrary data structure. This is used only
 * in WebSQL. A arbitrery data structure require default blob column.
 * @type {boolean}
 */
ydn.db.schema.Store.prototype.fixed = false;


/**
 * @inheritDoc
 */
ydn.db.schema.Store.prototype.toJSON = function() {

  var indexes = [];
  for (var i = 0; i < this.indexes.length; i++) {
    indexes.push(this.indexes[i].toJSON());
  }

  return {
    'name': this.name_,
    'keyPath': this.keyPath,
    'autoIncrement': this.autoIncrement,
    'type': this.type,
    'indexes': indexes
  };
};


/**
 *
 * @param {!StoreSchema} json Restore from json stream.
 * @return {!ydn.db.schema.Store} create new store schema from JSON string.
 */
ydn.db.schema.Store.fromJSON = function(json) {
  if (goog.DEBUG) {
    var fields = ['name', 'keyPath', 'autoIncrement', 'type', 'indexes',
      'dispatchEvents', 'fixed', 'Sync', 'encrypted'];
    for (var key in json) {
      if (json.hasOwnProperty(key) && goog.array.indexOf(fields, key) == -1) {
        throw new ydn.debug.error.ArgumentException('Unknown attribute "' +
            key + '"');
      }
    }
  }
  var indexes = [];
  var indexes_json = json.indexes || [];
  if (goog.isArray(indexes_json)) {
    for (var i = 0; i < indexes_json.length; i++) {
      var index = ydn.db.schema.Index.fromJSON(indexes_json[i]);
      if (goog.isDef(index.keyPath) && index.keyPath === json.keyPath) {
        continue; // key do not need indexing.
      }
      indexes.push(index);
    }
  }
  var type = json.type === 'undefined' || json.type === 'null' ?
      undefined : json.type;
  return new ydn.db.schema.Store(json.name, json.keyPath, json.autoIncrement,
      type, indexes, json.dispatchEvents, json.fixed, json.encrypted);
};


/**
 *
 * @param {!Array} params sql parameter list.
 * @param {ydn.db.base.QueryMethod} method query method.
 * @param {string|undefined} index_column name.
 * @param {IDBKeyRange} key_range to retrieve.
 * @param {boolean} reverse ordering.
 * @param {boolean} unique unique column.
 * @return {string} sql statement.
 */
ydn.db.schema.Store.prototype.toSql = function(params, method, index_column,
    key_range, reverse, unique) {
  var out = this.inSql(params, method, index_column,
      key_range, reverse, unique);
  var sql = '';

  if (method != ydn.db.base.QueryMethod.NONE) {
    sql += 'SELECT ' + out.select;
  }
  sql += ' FROM ' + out.from;
  if (out.where) {
    sql += ' WHERE ' + out.where;
  }
  if (out.group) {
    sql += ' GROUP BY ' + out.group;
  }
  if (out.order) {
    sql += ' ORDER BY ' + out.order;
  }

  return sql;
};


/**
 * @typedef {{
 *   select: string,
 *   from: string,
 *   where: string,
 *   group: string,
 *   order: string
 * }}
 */
ydn.db.schema.Store.SqlParts;


/**
 *
 * @param {!Array} params sql parameter list.
 * @param {ydn.db.base.QueryMethod} method query method.
 * @param {string|undefined} index_column name.
 * @param {ydn.db.KeyRange|IDBKeyRange} key_range to retrieve.
 * @param {boolean} reverse ordering.
 * @param {boolean} unique unique.
 * @return {ydn.db.schema.Store.SqlParts}
 */
ydn.db.schema.Store.prototype.inSql = function(params, method, index_column,
    key_range, reverse, unique) {

  var out = {
    select: '',
    from: '',
    where: '',
    group: '',
    order: ''
  };
  var key_column = this.primary_column_name_;
  var q_key_column = this.primary_column_name_quoted_;
  var index = null;
  if (index_column !== key_column && goog.isString(index_column)) {
    index = this.getIndex(index_column);
  }
  var is_index = !!index;
  var effective_column = index_column || key_column;
  var q_effective_column = goog.string.quote(effective_column);
  var key_path = is_index ? index.getKeyPath() : this.getKeyPath();
  var type = is_index ? index.getType() : this.getType();
  var is_multi_entry = is_index && index.isMultiEntry();

  out.from = this.getQuotedName();
  if (method === ydn.db.base.QueryMethod.COUNT) {
    // primary key is always unqiue.
    out.select = 'COUNT(' + q_key_column + ')';
  } else if (method === ydn.db.base.QueryMethod.LIST_KEYS ||
      method === ydn.db.base.QueryMethod.LIST_KEY ||
      method === ydn.db.base.QueryMethod.LIST_PRIMARY_KEY) {
    out.select = q_key_column;
    if (goog.isDefAndNotNull(index_column) && index_column != key_column) {
      out.select += ', ' + q_effective_column;
    }
  } else {
    out.select = '*';
  }

  var dist = unique ? 'DISTINCT ' : '';

  var wheres = [];

  if (is_multi_entry) {
    var idx_store_name = goog.string.quote(
        ydn.db.base.PREFIX_MULTIENTRY +
        this.getName() + ':' + index.getName());

    if (method === ydn.db.base.QueryMethod.COUNT) {
      out.select = 'COUNT(' + dist +
          idx_store_name + '.' + q_effective_column + ')';
    } else if (method === ydn.db.base.QueryMethod.LIST_KEYS ||
        method === ydn.db.base.QueryMethod.LIST_KEY ||
        method === ydn.db.base.QueryMethod.LIST_PRIMARY_KEY) {
      out.select = 'DISTINCT ' + this.getQuotedName() + '.' + q_key_column +
          ', ' + idx_store_name + '.' + q_effective_column +
          ' AS ' + effective_column;
    } else {
      out.select = 'DISTINCT ' + this.getQuotedName() + '.*' +
          ', ' + idx_store_name + '.' + q_effective_column +
          ' AS ' + effective_column;
    }
    out.from = idx_store_name + ' INNER JOIN ' + this.getQuotedName() +
        ' USING (' + q_key_column + ')';

    var col = idx_store_name + '.' + q_effective_column;
    if (goog.isDefAndNotNull(key_range)) {
      ydn.db.KeyRange.toSql(col, type, key_range, wheres, params);
      if (wheres.length > 0) {
        if (out.where) {
          out.where += ' AND ' + wheres.join(' AND ');
        } else {
          out.where = wheres.join(' AND ');
        }
      }
    }
  } else {
    if (goog.isDefAndNotNull(key_range)) {
      ydn.db.KeyRange.toSql(q_effective_column, type, key_range, wheres,
          params);
      if (wheres.length > 0) {
        if (out.where) {
          out.where += ' AND ' + wheres.join(' AND ');
        } else {
          out.where = wheres.join(' AND ');
        }
      }
    }
  }

  if (is_index && !index.isUnique() && unique) {
    out.group = q_effective_column;
  }

  var dir = reverse ? 'DESC' : 'ASC';
  out.order = q_effective_column + ' ' + dir;
  if (is_index) {
    out.order += ', ' + q_key_column + ' ' + dir;
  }

  return out;
};


/**
 * Continue to given effective key position.
 * @param {ydn.db.base.QueryMethod} method query method.
 * @param {!Array.<string>} params sql params.
 * @param {string?} index_name index name.
 * @param {IDBKeyRange|ydn.db.KeyRange} key_range key range.
 * @param {boolean} reverse ordering.
 * @param {boolean} unique unique.
 * @param {IDBKey} key effective key.
 * @param {boolean} open open bound.
 * @return {string} sql.
 */
ydn.db.schema.Store.prototype.sqlContinueEffectiveKey = function(method,
    params, index_name, key_range, reverse, unique, key, open) {
  var p_sql;
  /** @type {IDBKey} */
  var lower;
  /** @type {IDBKey} */
  var upper;
  var lowerOpen, upperOpen;
  if (goog.isDefAndNotNull(key_range)) {
    lower = /** @type {IDBKey} */ (key_range.lower);
    upper = /** @type {IDBKey} */ (key_range.upper);
    lowerOpen = key_range.lowerOpen;
    upperOpen = key_range.upperOpen;

    if (reverse) {
      if (goog.isDefAndNotNull(upper)) {
        var u_cmp = ydn.db.cmp(key, upper);
        if (u_cmp == -1) {
          upper = key;
          upperOpen = open;
        } else if (u_cmp == 0) {
          upperOpen = open || upperOpen;
        }
      } else {
        upper = key;
        upperOpen = open;
      }
    } else {
      if (goog.isDefAndNotNull(lower)) {
        var l_cmp = ydn.db.cmp(key, lower);
        if (l_cmp == 1) {
          lower = key;
          lowerOpen = open;
        } else if (l_cmp == 0) {
          lowerOpen = open || lowerOpen;
        }
      } else {
        lower = key;
        lowerOpen = open;
      }
    }
  } else {
    if (reverse) {
      upper = key;
      upperOpen = open;
    } else {
      lower = key;
      lowerOpen = open;
    }
  }

  key_range = new ydn.db.KeyRange(lower, upper, !!lowerOpen, !!upperOpen);

  var index = index_name ? this.getIndex(index_name) : null;
  var column = index ? index.getSQLIndexColumnName() :
      this.getSQLKeyColumnName();
  var e_sql = this.inSql(params, method,
      column, key_range, reverse, unique);


  var sql = 'SELECT ' + e_sql.select + ' FROM ' + e_sql.from +
      (e_sql.where ? ' WHERE ' + e_sql.where : '') +
      (e_sql.group ? ' GROUP BY ' + e_sql.group : '') +
      ' ORDER BY ' + e_sql.order;

  if (index) {
    var order = reverse ? 'DESC' : 'ASC';
    sql += ', ' + this.getSQLKeyColumnNameQuoted() + order;
  }

  return sql;
};


/**
 * Continue to given effective key position.
 * @param {ydn.db.base.QueryMethod} method query method.
 * @param {!Array.<string>} params sql params.
 * @param {string} index_name index name.
 * @param {IDBKeyRange|ydn.db.KeyRange} key_range key range.
 * @param {IDBKey} key effective key.
 * @param {boolean} open open.
 * @param {IDBKey} primary_key primary key.
 * @param {boolean} reverse ordering.
 * @param {boolean} unique unique.
 * @return {string} sql.
 */
ydn.db.schema.Store.prototype.sqlContinueIndexEffectiveKey = function(method,
    params, index_name, key_range, key, open, primary_key, reverse, unique) {

  var index = this.getIndex(index_name);
  var index_column = index.getSQLIndexColumnName();
  var q_index_column = index.getSQLIndexColumnNameQuoted();
  var primary_column = this.getSQLKeyColumnName();
  var q_primary_column = this.getSQLKeyColumnNameQuoted();

  var op = reverse ? ' <' : ' >';
  if (open) {
    op += ' ';
  } else {
    op += '= ';
  }
  var encode_key = ydn.db.schema.Index.js2sql(key, index.getType());
  var encode_primary_key = ydn.db.schema.Index.js2sql(primary_key,
      this.getType());

  var e_sql;
  var or = '';
  if (key_range) {
    e_sql = this.inSql(params, method,
        index_column, key_range,
        reverse, unique);
    e_sql.where += ' AND ';

    or = q_index_column + op + '?';
    params.push(encode_key);
  } else {
    key_range = reverse ?
        ydn.db.KeyRange.upperBound(key, true) :
        ydn.db.KeyRange.lowerBound(key, true);
    e_sql = this.inSql(params, method,
        index_column, key_range,
        reverse, unique);
    or = e_sql.where;
    e_sql.where = '';
  }

  e_sql.where += '(' + or + ' OR (' + q_index_column + ' = ? AND ' +
      q_primary_column + op + '?))';
  params.push(encode_key);
  params.push(encode_primary_key);

  return 'SELECT ' + e_sql.select + ' FROM ' + e_sql.from +
      ' WHERE ' + e_sql.where +
      (e_sql.group ? ' GROUP BY ' + e_sql.group : '') +
      ' ORDER BY ' + e_sql.order;
};


/**
 *
 * @return {!ydn.db.schema.Store} clone this database schema.
 */
ydn.db.schema.Store.prototype.clone = function() {
  return ydn.db.schema.Store.fromJSON(
      /** @type {!StoreSchema} */ (this.toJSON()));
};


/**
 *
 * @return {number}
 */
ydn.db.schema.Store.prototype.countIndex = function() {
  return this.indexes.length;
};


/**
 *
 * @param {number} idx index of index.
 * @return {ydn.db.schema.Index}
 */
ydn.db.schema.Store.prototype.index = function(idx) {
  return this.indexes[idx] || null;
};


/**
 *
 * @param {string} name index name.
 * @return {ydn.db.schema.Index} index if found.
 */
ydn.db.schema.Store.prototype.getIndex = function(name) {
  return /** @type {ydn.db.schema.Index} */ (goog.array.find(this.indexes,
      function(x) {
        return x.getName() == name;
      }));
};


/**
 * Query index from index key path.
 * @param {string|!Array.<string>} key_path key path.
 * @return {ydn.db.schema.Index} resulting index.
 */
ydn.db.schema.Store.prototype.getIndexByKeyPath = function(key_path) {
  for (var i = 0; i < this.indexes.length; i++) {
    if (this.indexes[i].equalsKeyPath(key_path)) {
      return this.indexes[i];
    }
  }
  return null;
};


/**
 * @return {boolean} return true if store is fixed.
 */
ydn.db.schema.Store.prototype.isFixed = function() {
  return this.fixed;
};


/**
 * @return {boolean} return true if store is encrypted.
 */
ydn.db.schema.Store.prototype.isEncrypted = function() {
  return this.is_encrypted_;
};


/**
 * @see #hasIndexByKeyPath
 * @param {string} name index name.
 * @return {boolean} return true if name is found in the index or primary
 * keyPath.
 */
ydn.db.schema.Store.prototype.hasIndex = function(name) {
  if (name === this.keyPath) {
    return true;
  }

  return goog.array.some(this.indexes, function(x) {
    return x.getName() == name;
  });
};


/**
 * Check given key_path is equals to store key path.
 * @param {(string|goog.array.ArrayLike)=} opt_key_path
 * @return {boolean}
 */
ydn.db.schema.Store.prototype.isKeyPath = function(opt_key_path) {
  if (goog.isDef(this.keyPath)) {
    if (this.keyPaths.length == 1) {
      return this.keyPath === opt_key_path;
    } else if (goog.isArrayLike(opt_key_path)) {
      return goog.array.equals(this.keyPaths,
          /** @type {goog.array.ArrayLike} */ (opt_key_path));
    } else {
      return false;
    }
  } else {
    return false;
  }
};


/**
 * @see #hasIndex
 * @param {string|!Array.<string>} key_path index key path.
 * @return {boolean} return true if key_path is found in the index including
 * primary keyPath.
 */
ydn.db.schema.Store.prototype.hasIndexByKeyPath = function(key_path) {
  if (this.keyPath &&
      goog.isNull(ydn.db.schema.Index.compareKeyPath(this.keyPath, key_path))) {
    return true;
  }
  return goog.array.some(this.indexes, function(x) {
    return goog.isDefAndNotNull(x.keyPath) &&
        goog.isNull(ydn.db.schema.Index.compareKeyPath(x.keyPath, key_path));
  });
};


/**
 * Return quoted keyPath. In case undefined return default key column.
 * @return {string} return quoted keyPath. If keyPath is array, they are
 * join by ',' and quoted. If keyPath is not define, default sqlite column
 * name is used.
 */
ydn.db.schema.Store.prototype.getSQLKeyColumnNameQuoted = function() {
  return this.primary_column_name_quoted_;
};


/**
 * Return quoted keyPath. In case undefined return default key column.
 * @return {string} return quoted keyPath. If keyPath is array, they are
 * join by ',' and quoted. If keyPath is not define, default sqlite column
 * name is used.
 */
ydn.db.schema.Store.prototype.getSQLKeyColumnName = function() {
  return this.primary_column_name_;
};


/**
 * @type {string}
 * @private
 */
ydn.db.schema.Store.prototype.primary_column_name_;


/**
 * @type {string}
 * @private
 */
ydn.db.schema.Store.prototype.primary_column_name_quoted_;


/**
 *
 * @return {string} return quoted name.
 */
ydn.db.schema.Store.prototype.getQuotedName = function() {
  return goog.string.quote(this.name_);
};


/**
 * @return {Array.<string>} return name of indexed. It is used as column name
 * in WebSql.
 */
ydn.db.schema.Store.prototype.getColumns = function() {
  if (this.columns_ && this.columns_.length != this.indexes.length) {
    /**
     * @private
     * @final
     * @type {Array.<string>}
     */
    this.columns_ = [];
    for (var i = 0; i < this.indexes.length; i++) {
      this.columns_.push(this.indexes[i].getName());
    }
  }
  return this.columns_;
};


/**
 * Update store schema with given guided store schema for
 * indexeddb.
 * these include:
 *   1. blob column data type
 * @param {!ydn.db.schema.Store} that guided store schema.
 */
ydn.db.schema.Store.prototype.hintForIdb = function(that) {
  for (var i = 0; i < that.indexes.length; i++) {
    var index = that.indexes[i];
    if (!this.hasIndex(index.getName()) &&
        index.getType() == ydn.db.schema.DataType.BLOB) {
      var clone = new ydn.db.schema.Index(
          index.getKeyPath(), index.getType(), index.isUnique(),
          index.isMultiEntry(), index.getName());
      this.indexes.push(clone);
    }
  }
};


/**
 * Create a new update store schema with given guided store schema.
 * NOTE: This is used in websql for checking table schema sniffed from the
 * connection is similar to requested table schema. The fact is that
 * some schema information are not able to reconstruct from the connection,
 * these include:
 *   1. composite index: in which a composite index is blown up to multiple
 *     columns. @see ydn.db.con.WebSql.prototype.prepareTableSchema_.
 * @param {ydn.db.schema.Store} that guided store schema.
 * @return {!ydn.db.schema.Store} updated store schema.
 */
ydn.db.schema.Store.prototype.hintForWebSql = function(that) {
  if (!that) {
    return this;
  }
  goog.asserts.assert(this.name_ == that.name_, 'store name: ' +
      this.name_ + ' != ' + that.name_);
  var autoIncrement = this.autoIncrement;
  var keyPath = goog.isArray(this.keyPath) ?
      goog.array.clone(/** @type {goog.array.ArrayLike} */ (this.keyPath)) :
      this.keyPath;
  var type = this.type;
  var indexes = goog.array.map(this.indexes, function(index) {
    return index.clone();
  });
  if (!goog.isDef(that.type) && type == 'TEXT') {
    // composite are converted into TEXT
    type = undefined;
  }
  if (goog.isArray(that.keyPath) && goog.isString(keyPath) &&
      keyPath == that.keyPath.join(',')) {
    keyPath = goog.array.clone(
        /** @type {goog.array.ArrayLike} */ (that.keyPath));
  }

  // update composite index
  for (var i = 0, n = that.indexes.length; i < n; i++) {
    if (that.indexes[i].isComposite()) {
      var name = that.indexes[i].getName();
      for (var j = indexes.length - 1; j >= 0; j--) {
        if (name.indexOf(indexes[j].getName()) >= 0) {
          indexes[j] = that.indexes[i].clone();
          break;
        }
      }
    }
  }

  for (var i = 0; i < indexes.length; i++) {
    var that_index = that.getIndex(indexes[i].getName());
    if (that_index) {
      indexes[i] = indexes[i].hint(that_index);
    }
  }

  return new ydn.db.schema.Store(
      that.name_, keyPath, autoIncrement, type, indexes);
};


/**
 *
 * @return {string} store name.
 */
ydn.db.schema.Store.prototype.getName = function() {
  return this.name_;
};


/**
 *
 * @return {boolean|undefined} autoIncrement.
 */
ydn.db.schema.Store.prototype.isAutoIncrement = function() {
  return this.autoIncrement;
};


/**
 *
 * @return {Array.<string>|string} keyPath.
 */
ydn.db.schema.Store.prototype.getKeyPath = function() {
  return this.keyPath;
};


/**
 *
 * @return {boolean} true if inline key is in used.
 */
ydn.db.schema.Store.prototype.usedInlineKey = function() {
  return !!this.keyPath;
};


/**
 *
 * @return {!Array.<string>} list of index names.
 */
ydn.db.schema.Store.prototype.getIndexNames = function() {
  return this.indexes.map(function(x) {return x.getName();});
};


/**
 *
 * @return {ydn.db.schema.DataType|undefined}
 */
ydn.db.schema.Store.prototype.getType = function() {
  return this.type;
};


/**
 *
 * @return {ydn.db.schema.DataType}
 */
ydn.db.schema.Store.prototype.getSqlType = function() {
  return this.keyColumnType_;
};


/**
 *
 * @return {!Array.<string>} list of index keyPath.
 */
ydn.db.schema.Store.prototype.getIndexKeyPaths = function() {
  return this.indexes.map(function(x) {return x.keyPath;});
};


/**
 *
 * @param {string} name column name or keyPath.
 * @param {ydn.db.schema.DataType=} opt_type optional column data type.
 * @param {boolean=} opt_unique unique.
 * @param {boolean=} opt_multiEntry true for array index to index individual
 * element.
 */
ydn.db.schema.Store.prototype.addIndex = function(name, opt_type, opt_unique,
                                                  opt_multiEntry) {
  this.indexes.push(new ydn.db.schema.Index(name, opt_type, opt_unique,
      opt_multiEntry));
};


/**
 * Extract primary key value of keyPath from a given object.
 * @param {Object} record record value.
 * @param {IDBKey=} opt_key out-of-line key.
 * @return {!IDBKey|undefined} extracted primary key.
 */
ydn.db.schema.Store.prototype.extractKey = function(record, opt_key) {
  if (!record) {
    return undefined;
  }
  if (!this.usedInlineKey() && goog.isDefAndNotNull(opt_key)) {
    return opt_key;
  }
  // http://www.w3.org/TR/IndexedDB/#key-construct
  if (this.isComposite) {
    var arr = [];
    for (var i = 0; i < this.keyPath.length; i++) {
      arr.push(ydn.db.utils.getValueByKeys(record, this.keyPath[i]));
    }
    return arr;
  } else if (this.keyPath) {
    return /** @type {!IDBKey} */ (goog.object.getValueByKeys(
        record, this.keyPaths));
  } else {
    return undefined;
  }
};


/**
 * Extract value of keyPath from a row of SQL results
 * @param {!Object} obj record value.
 * @return {!Array|number|string|undefined} return key value.
 */
ydn.db.schema.Store.prototype.getRowValue = function(obj) {
  if (goog.isDefAndNotNull(this.keyPath)) {
    var value = obj[this.keyPath];
    if (this.type == ydn.db.schema.DataType.DATE) {
      value = Date.parse(value);
    } else if (this.type == ydn.db.schema.DataType.NUMERIC) {
      value = parseFloat(value);
    } else if (this.type == ydn.db.schema.DataType.INTEGER) {
      value = parseInt(value, 10);
    }
    return value;
  } else {
    return undefined;
  }
};


/**
 * Generated a key starting from 0 with increment of 1.
 * NOTE: Use only by simple store.
 * @return {number} generated key.
 */
ydn.db.schema.Store.prototype.generateKey = function() {
  if (!goog.isDef(this.current_key_)) {

    /**
     * @type {number}
     * @private
     */
    this.current_key_ = 0;
  }
  return this.current_key_++;
};


/**
 * Set keyPath field of the object with given value.
 * @see #getKeyValue
 * @param {!Object} obj get key value from its keyPath field.
 * @param {*} value key value to set.
 */
ydn.db.schema.Store.prototype.setKeyValue = function(obj, value) {

  for (var i = 0; i < this.keyPaths.length; i++) {
    var key = this.keyPaths[i];

    if (i == this.keyPaths.length - 1) {
      obj[key] = value;
      return;
    }

    if (!goog.isDef(obj[key])) {
      obj[key] = {};
    }
    obj = obj[key];
  }
};


/**
 * Prepare SQL column name and values.
 * @param {!Object} obj get values of indexed fields.
 * @param {IDBKey=} opt_key optional key.
 * @param {boolean=} opt_exclude_unique_column exclude unique constrained
 * columns.
 * @return {{
 *    columns: Array.<string>,
 *    slots: Array.<string>,
 *    values: Array.<string>,
 *    key: (IDBKey|undefined)
 *  }} return list of values as it appear on the indexed fields.
 */
ydn.db.schema.Store.prototype.sqlNamesValues = function(obj, opt_key,
    opt_exclude_unique_column) {

  // since corretness of the inline, offline, auto are already checked,
  // here we don't check again. this method should not throw error for
  // these reason. If error must be throw it has to be InternalError.

  var values = [];
  var columns = [];

  var key = goog.isDef(opt_key) ? opt_key : this.extractKey(obj);
  if (goog.isDef(key)) {
    columns.push(this.getSQLKeyColumnNameQuoted());
    values.push(ydn.db.schema.Index.js2sql(key, this.getType()));
  }

  for (var i = 0; i < this.indexes.length; i++) {
    var index = this.indexes[i];
    if (index.isMultiEntry() ||
        index.getName() === this.keyPath ||
        index.getName() == ydn.db.base.DEFAULT_BLOB_COLUMN ||
        (!!opt_exclude_unique_column && index.isUnique())) {
      continue;
    }

    var idx_key = index.extractKey(obj);
    if (goog.isDefAndNotNull(idx_key)) {
      values.push(ydn.db.schema.Index.js2sql(idx_key, index.getType()));
      columns.push(index.getSQLIndexColumnNameQuoted());
    }
  }

  if (!this.fixed) {
    values.push(ydn.json.stringify(obj));
    columns.push(ydn.db.base.DEFAULT_BLOB_COLUMN);
  } else if (this.isFixed() && !this.usedInlineKey() &&
      this.countIndex() == 0) {
    // check for blob
    var BASE64_MARKER = ';base64,';
    if (goog.isString(obj) && obj.indexOf(BASE64_MARKER) == -1) {
      values.push(obj);
      columns.push(ydn.db.base.DEFAULT_BLOB_COLUMN);
    } else {
      values.push(ydn.json.stringify(obj));
      columns.push(ydn.db.base.DEFAULT_BLOB_COLUMN);
    }
  }

  var slots = [];
  for (var i = values.length - 1; i >= 0; i--) {
    slots[i] = '?';
  }

  return {
    columns: columns,
    slots: slots,
    values: values,
    key: key
  };
};


/**
 * Compare two stores.
 * @see #similar
 * @param {ydn.db.schema.Store} store store schema to test.
 * @return {boolean} true if store schema is exactly equal to this schema.
 */
ydn.db.schema.Store.prototype.equals = function(store) {
  return this.name_ === store.name_ &&
      ydn.object.equals(this.toJSON(), store.toJSON());
};


/**
 * Compare two stores.
 * @see #equals
 * @param {ydn.db.schema.Store} store
 * @return {string} explination for difference, empty string for similar.
 */
ydn.db.schema.Store.prototype.difference = function(store) {

  if (!store) {
    return 'missing store: ' + this.name_;
  }
  if (this.name_ != store.name_) {
    return 'store name, expect: ' + this.name_ + ', but: ' + store.name_;
  }
  var msg = ydn.db.schema.Index.compareKeyPath(this.keyPath, store.keyPath);
  if (msg) {
    return 'keyPath, ' + msg;
  }
  if (goog.isDef(this.autoIncrement) && goog.isDef(store.autoIncrement) &&
      this.autoIncrement != store.autoIncrement) {
    return 'autoIncrement, expect:  ' + this.autoIncrement + ', but: ' +
        store.autoIncrement;
  }
  if (this.indexes.length != store.indexes.length) {
    return 'indexes length, expect:  ' + this.indexes.length + ', but: ' +
        store.indexes.length;
  }

  if (goog.isDef(this.type) && goog.isDef(store.type) &&
      (goog.isArrayLike(this.type) ? !goog.array.equals(
      /** @type {goog.array.ArrayLike} */ (this.type),
      /** @type {goog.array.ArrayLike} */ (store.type)) :
      this.type != store.type)) {
    return 'data type, expect:  ' + this.type + ', but: ' + store.type;
  }
  for (var i = 0; i < this.indexes.length; i++) {
    var index = store.getIndex(this.indexes[i].getName());
    var index_msg = this.indexes[i].difference(index);
    if (index_msg.length > 0) {
      return 'index "' + this.indexes[i].getName() + '" ' + index_msg;
    }
  }

  return '';
};


/**
 *
 * @param {ydn.db.schema.Store} store schema.
 * @return {boolean} true if given store schema is similar to this.
 */
ydn.db.schema.Store.prototype.similar = function(store) {
  return this.difference(store).length == 0;
};


/**
 * @type {Object.<Function>} index generator function for each index.
 */
ydn.db.schema.Store.prototype.index_generators;


/**
 * Add index by generator.
 * @param {Object} obj record value.
 */
ydn.db.schema.Store.prototype.generateIndex = function(obj) {
  if (!obj) {
    return;
  }
  for (var i = 0; i < this.indexes.length; i++) {
    this.indexes[i].generateIndex(obj);
  }
};


/**
 * @param {function(!ydn.db.Request, goog.array.ArrayLike)} hook database
 * pre-hook function.
 * @return {number} internal hook index.
 */
ydn.db.schema.Store.prototype.addHook = function(hook) {
  this.hooks_.push(hook);
  return this.hooks_.length - 1;
};


/**
 * Invoke hook functions.
 * Database hook to call before persisting into the database.
 * Override this function to attach the hook. The default implementation is
 * immediately invoke the given callback with first variable argument.
 * to preserve database operation order, preHook call is not waited.
 * @param {!ydn.db.Request} df deferred from database operation.
 * @param {goog.array.ArrayLike} args arguments to the db method.
 * @param {number=} opt_hook_idx hook index to ignore.
 * @param {*=} opt_scope
 * @final
 */
ydn.db.schema.Store.prototype.hook = function(df, args, opt_hook_idx,
                                              opt_scope) {
  for (var i = 0; i < this.hooks_.length; i++) {
    if (opt_hook_idx !== i) {
      this.hooks_[i].call(opt_scope, df, args);
    }
  }
};


/**
 * Lookup index from the schema.
 * @param {!Array.<string>|string} index_name_or_key_path index name or
 * key path.
 * @return {string} index name.
 */
ydn.db.schema.Store.prototype.getIndexName = function(index_name_or_key_path) {

  var index;
  var index_name = index_name_or_key_path;
  if (goog.isArray(index_name_or_key_path)) {
    index = this.getIndexByKeyPath(index_name_or_key_path);
    index_name = index_name_or_key_path.join(', ');
  } else {
    index = this.getIndex(index_name_or_key_path);
  }
  if (goog.DEBUG && !index) {
    throw new ydn.debug.error.ArgumentException('require index "' +
        index_name + '" not found in store "' + this.getName() + '"');
  }
  return index.getName();
};


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.schema.Store.prototype.toString = function() {
    return 'Store:' + this.name_ + '[' + this.countIndex() + 'index]';
  };
}

