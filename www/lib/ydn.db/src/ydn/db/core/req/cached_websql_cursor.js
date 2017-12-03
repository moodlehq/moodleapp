/**
 * @fileoverview Cursor.
 */


goog.provide('ydn.db.core.req.CachedWebsqlCursor');
goog.require('ydn.db.core.req.AbstractCursor');
goog.require('ydn.db.core.req.ICursor');


// ? it seems release properly at least in chrome.

/**
 * Open an index. This will resume depending on the cursor state.
 * @param {ydn.db.base.Transaction} tx
 * @param {string} tx_no tx no
 * @param {!ydn.db.schema.Store} store_schema schema.
 * @param {ydn.db.base.QueryMethod=} key_query true for keys query
 * method.
 * @extends {ydn.db.core.req.AbstractCursor}
 * @implements {ydn.db.core.req.ICursor}
 * @constructor
 */
ydn.db.core.req.CachedWebsqlCursor = function(tx, tx_no, store_schema, key_query) {

  goog.base(this, tx, tx_no, store_schema, key_query);


  goog.asserts.assert(store_schema);
  this.store_schema_ = store_schema;

  this.cursor_ = null;
  this.current_cursor_index_ = NaN;
  this.has_pending_request = false;

  //this.openCursor(ini_key, ini_index_key);
};
goog.inherits(ydn.db.core.req.CachedWebsqlCursor,
    ydn.db.core.req.AbstractCursor);


/**
 * @define {boolean} debug flag.
 */
ydn.db.core.req.CachedWebsqlCursor.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.logger =
    goog.log.getLogger('ydn.db.core.req.CachedWebsqlCursor');


/**
 *
 * @type {!ydn.db.schema.Store}
 * @private
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.store_schema_;


/**
 *
 * @type {*}
 * @private
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.current_key_ = null;

/**
 *
 * @type {*}
 * @private
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.current_primary_key_ = null;

/**
 *
 * @type {*}
 * @private
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.current_value_ = null;


/**
 * @type {SQLResultSet}
 * @private
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.cursor_ = null;

/**
 *
 * @type {number}
 * @private
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.current_cursor_index_ = NaN;


/**
 * Move cursor to next position.
 * @return {Array} [primary_key, effective_key, reference_value]
 * @private
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.moveNext_ = function() {

  this.current_cursor_index_++;

  return [this.getPrimaryKey(), this.getIndexKey(), this.getValue()];
};

/**
 * Invoke onSuccess handler with next cursor value.
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.invokeNextSuccess_ = function() {

  var current_values = this.moveNext_();

  if (ydn.db.core.req.CachedWebsqlCursor.DEBUG) {
    goog.global.console.log(['onSuccess', this.current_cursor_index_].concat(current_values));
  }

  var primary_key = current_values[0];
  var index_key = current_values[1];
  var value = current_values[2];
  this.onSuccess(primary_key, index_key, value);

};


/**
 * Make cursor opening request.
 *
 * This will seek to given initial position if given. If only ini_key (primary
 * key) is given, this will rewind, if not found.
 *
 * @param {*=} ini_key primary key to resume position.
 * @param {*=} ini_index_key index key to resume position.
 * @param {boolean=} exclusive
 * @private
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.openCursor = function(ini_key, ini_index_key, exclusive) {

  /**
   * @type {ydn.db.core.req.CachedWebsqlCursor}
   */
  var me = this;
  var request;
  var sqls = ['SELECT'];
  var params = [];
  var primary_column_name = this.store_schema_.getSQLKeyColumnName();
  var q_primary_column_name = goog.string.quote(primary_column_name);
  var index = !!this.index_name ?
    this.store_schema_.getIndex(this.index_name) : null;
  var type = index ? index.getType() : this.store_schema_.getType();

  var effective_col_name = index ?
    index.getSQLIndexColumnName() : primary_column_name;
  var q_effective_col_name = goog.string.quote(effective_col_name);

  var order = ' ORDER BY ';

  if (!this.isValueCursor()) {
    if (index) {
      goog.asserts.assertString(effective_col_name);
      sqls.push(goog.string.quote(effective_col_name) + ', ' + q_primary_column_name);
      order += this.reverse ?
        goog.string.quote(effective_col_name) + ' DESC, ' +
          q_primary_column_name + ' DESC ' :
        goog.string.quote(effective_col_name) + ' ASC, ' +
          q_primary_column_name + ' ASC ';
    } else {
      sqls.push(q_primary_column_name);
      order += q_primary_column_name;
      order += this.reverse ? ' DESC' : ' ASC';
    }
  } else {
    sqls.push('*');
    if (index) {
      goog.asserts.assertString(effective_col_name);
      order += this.reverse ?
        goog.string.quote(effective_col_name) + ' DESC, ' +
          q_primary_column_name + ' DESC ' :
        goog.string.quote(effective_col_name) + ' ASC, ' +
          q_primary_column_name + ' ASC ';

    } else {
      order += q_primary_column_name;
      order += this.reverse ? ' DESC' : ' ASC';
    }

  }

  sqls.push('FROM ' + goog.string.quote(this.store_name));

  var wheres = [];
  var is_multi_entry = !!index && index.isMultiEntry();


  var key_range = this.key_range;
  if (goog.isDefAndNotNull(ini_key)) {

    if (!!this.index_name) {
      goog.asserts.assert(goog.isDefAndNotNull(ini_index_key));
      if (goog.isDefAndNotNull(this.key_range)) {
        var cmp = ydn.db.base.indexedDb.cmp(ini_index_key, this.key_range.upper);
        if (cmp == 1 || (cmp == 0 && !this.key_range.upperOpen)) {
          this.onSuccess(undefined, undefined, undefined); // out of range;
          return;
        }
        key_range = ydn.db.IDBKeyRange.bound(ini_index_key,
          this.key_range.upper, false, this.key_range.upperOpen);
      } else {
        key_range = ydn.db.IDBKeyRange.lowerBound(ini_index_key);
      }

      ydn.db.KeyRange.toSql(q_effective_col_name, type,
        key_range, wheres, params);
    } else {
      if (this.reverse) {
        key_range = ydn.db.IDBKeyRange.upperBound(ini_key, !!exclusive);
      } else {
        key_range = ydn.db.IDBKeyRange.lowerBound(ini_key, !!exclusive);
      }
      ydn.db.KeyRange.toSql(q_primary_column_name, this.store_schema_.getType(),
          key_range, wheres, params);
    }
  } else {
    if (!!this.index_name) {
      ydn.db.KeyRange.toSql(q_effective_col_name, type,
          key_range, wheres, params);
    } else {
      ydn.db.KeyRange.toSql(q_primary_column_name, this.store_schema_.getType(),
          key_range, wheres, params);
    }
  }


  if (wheres.length > 0) {
    sqls.push('WHERE ' + wheres.join(' AND '));
  }

  sqls.push(order);

//  if (this.key_only) {
//    sqls.push(' LIMIT ' + 100);
//  } else {
//    sqls.push(' LIMIT ' + 1);
//  }

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var onSuccess = function(transaction, results) {
    if (ydn.db.core.req.CachedWebsqlCursor.DEBUG) {
      goog.global.console.log([sql, results]);
    }
    me.has_pending_request = false;
    me.cursor_ = results;
    me.current_cursor_index_ = 0;
    if (!!me.index_name && goog.isDefAndNotNull(ini_key)) {
      // skip them
      var cmp = ydn.db.cmp(me.getPrimaryKey(), ini_key);
      while (cmp == -1 || (cmp == 0 && exclusive)) {
        me.current_cursor_index_++;
        cmp = ydn.db.cmp(me.getPrimaryKey(), ini_key);
      }
    }
    me.onSuccess(me.getPrimaryKey(), me.getIndexKey(), me.getValue());
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var onError = function(tr, error) {
    if (ydn.db.core.req.CachedWebsqlCursor.DEBUG) {
      goog.global.console.log([sql, tr, error]);
    }
    me.has_pending_request = false;
    goog.log.warning(me.logger, 'get error: ' + error.message);
    me.onError(error);
    return true; // roll back

  };

  var sql = sqls.join(' ');
  var from = '{' + (!!ini_index_key ? ini_index_key + '-' : '') +
      (!!ini_key ? ini_key : '') + '}';

  goog.log.finest(me.logger,  this + ': opened: ' + from + ' SQL: ' +
      sql + ' : ' + ydn.json.stringify(params));
  this.tx.executeSql(sql, params, onSuccess, onError);

};


/**
 * @inheritDoc
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.hasCursor = function() {
  return !!this.cursor_ && this.current_cursor_index_ < this.cursor_.rows.length;
};


/**
 * @return {IDBKey|undefined} get index key.
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.getIndexKey = function() {

  if (this.isIndexCursor()) {
    if (this.current_cursor_index_ < this.cursor_.rows.length) {
      var row = this.cursor_.rows.item(this.current_cursor_index_);
      var index = this.store_schema_.getIndex(
        /** @type {string} */ (this.index_name));
      var type = index.getType();
      return ydn.db.schema.Index.sql2js(row[index.getSQLIndexColumnName()],
        type);
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }

};


/**
 * @return {IDBKey|undefined}
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.getPrimaryKey = function() {
  if (this.current_cursor_index_ < this.cursor_.rows.length) {
    var primary_column_name = this.store_schema_.getSQLKeyColumnName();
    var row = this.cursor_.rows.item(this.current_cursor_index_);
    return ydn.db.schema.Index.sql2js(row[primary_column_name],
        this.store_schema_.getType());
  } else {
    return undefined;
  }
};


ydn.db.core.req.CachedWebsqlCursor.prototype.getEffectiveKey = function() {
  if (this.isIndexCursor()) {
    return this.getIndexKey();
  } else {
    return this.getPrimaryKey();
  }
};


/**
 * This must call only when cursor is active.
 * @return {*} return current primary key.
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.getValue = function() {
  var column_name = this.index_name ?
    this.index_name : this.store_schema_.getSQLKeyColumnName();

  if (this.current_cursor_index_ < this.cursor_.rows.length) {
    if (!this.isValueCursor()) {
      return this.getPrimaryKey();
    } else {
      var row = this.cursor_.rows.item(this.current_cursor_index_);
      return ydn.db.crud.req.WebSql.parseRow(/** @type {!Object} */ (row), this.store_schema_);

    }
  } else {
    return undefined;
  }

};


/**
 * @inheritDoc
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.clear = function() {

  if (!this.hasCursor()) {
    throw new ydn.db.InvalidAccessError();
  }

    var df = new goog.async.Deferred();
    var me = this;
    this.has_pending_request = true;

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var onSuccess = function(transaction, results) {
      if (ydn.db.core.req.CachedWebsqlCursor.DEBUG) {
        goog.global.console.log([sql, results]);
      }
      me.has_pending_request = false;
      df.callback(results.rowsAffected);
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var onError = function(tr, error) {
      if (ydn.db.core.req.CachedWebsqlCursor.DEBUG) {
        goog.global.console.log([sql, tr, error]);
      }
      me.has_pending_request = false;
      goog.log.warning(me.logger, 'get error: ' + error.message);
      df.errback(error);
      return true; // roll back

    };

    var primary_column_name = this.store_schema_.getSQLKeyColumnName();
    var sql = 'DELETE FROM ' + this.store_schema_.getQuotedName() +
        ' WHERE ' + primary_column_name + ' = ?';
    var params = [this.getPrimaryKey()];
    goog.log.finest(me.logger,  this + ': clear "' + sql + '" : ' + ydn.json.stringify(params));
    this.tx.executeSql(sql, params, onSuccess, onError);
    return df;

};

/**
 * @inheritDoc
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.update = function(obj) {

  if (!this.hasCursor()) {
    throw new ydn.db.InvalidAccessError();
  }

    var df = new goog.async.Deferred();
    var me = this;
    this.has_pending_request = true;
    var primary_key = /** @type {!Array|number|string} */(this.getPrimaryKey());

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var onSuccess = function(transaction, results) {
      if (ydn.db.core.req.CachedWebsqlCursor.DEBUG) {
        goog.global.console.log([sql, results]);
      }
      me.has_pending_request = false;
      df.callback(primary_key);
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var onError = function(tr, error) {
      if (ydn.db.core.req.CachedWebsqlCursor.DEBUG) {
        goog.global.console.log([sql, tr, error]);
      }
      me.has_pending_request = false;
      goog.log.warning(me.logger, 'get error: ' + error.message);
      df.errback(error);
      return true; // roll back
    };

    goog.asserts.assertObject(obj);
    var out = me.store_schema_.sqlNamesValues(obj, primary_key);

    var sql = 'REPLACE INTO ' + this.store_schema_.getQuotedName() +
        ' (' + out.columns.join(', ') + ')' +
        ' VALUES (' + out.slots.join(', ') + ')' +
        ' ON CONFLICT FAIL';

    goog.log.finest(me.logger,  this + ': clear "' + sql + '" : ' + ydn.json.stringify(out.values));
    this.tx.executeSql(sql, out.values, onSuccess, onError);
    return df;

};


//
///**
// * Continue to next position.
// * @param {*} next_position next effective key.
// * @override
// */
//ydn.db.core.req.CachedWebsqlCursor.prototype.forward = function (next_position) {
//  //console.log(['forward', this.current_primary_key_, this.current_key_, next_position]);
//  var label = this.store_name + ':' + this.index_name;
//  if (next_position === false) {
//    // restart the iterator
//    goog.log.finest(this.logger, this + ' restarting.');
//    this.openCursor();
//  } else if (this.hasCursor()) {
//    if (goog.isDefAndNotNull(next_position)) {
//      //if (goog.isArray(this.cache_keys_)) {
//      if (next_position === true) {
//        //this.cur['continue']();
//
//        this.invokeNextSuccess_();
//
//      } else {
//        //console.log('continuing to ' + next_position)
//        do {
//          var values = this.moveNext_();
//          var current_primary_key_ = values[0];
//          var current_key_ = values[1];
//          var current_value_ = values[2];
//          if (!goog.isDef(current_key_)) {
//            this.openCursor(null, next_position);
//            return;
//          }
//          if (ydn.db.cmp(current_key_, next_position) == 0) {
//            this.onSuccess(this.current_primary_key_, this.current_key_, this.current_value_);
//            return;
//          }
//        } while (goog.isDefAndNotNull(this.current_primary_key_));
//        this.openCursor(null, next_position);
//      }
////      } else {
////        if (next_position === true) {
////          this.openCursor(this.current_primary_key_, this.current_key_, true);
////        } else {
////          this.openCursor(null, next_position);
////        }
////      }
//    } else {
//      // notify that cursor iteration is finished.
//      this.onSuccess(undefined, undefined, undefined);
//      goog.log.finest(this.logger, this + ' resting.');
//    }
//  } else {
//    throw new ydn.error.InvalidOperationError('Iterator:' + label + ' cursor gone.');
//  }
//};
//
//
///**
// * Continue to next primary key position.
// *
// *
// * This will continue to scan
// * until the key is over the given primary key. If next_primary_key is
// * lower than current position, this will rewind.
// * @param {*} next_primary_key
// * @param {*=} next_index_key
// * @param {boolean=} exclusive
// * @override
// */
//ydn.db.core.req.CachedWebsqlCursor.prototype.seek = function(next_primary_key,
//                                         next_index_key, exclusive) {
//
//  if (exclusive === false) {
//    // restart the iterator
//    goog.log.finest(this.logger, this + ' restarting.');
//    this.openCursor(next_primary_key, next_index_key, true);
//    return;
//  }
//
//  if (!this.hasCursor()) {
//    throw new ydn.db.InternalError(this + ' cursor gone.');
//  }
//
//  if (exclusive === true &&
//      !goog.isDefAndNotNull(next_index_key) && !goog.isDefAndNotNull(next_primary_key)) {
//    this.invokeNextSuccess_();
//  } else {
//    throw new ydn.error.NotImplementedException();
//  }
//};



/**
 * @inheritDoc
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.advance = function(step) {
  if (!this.hasCursor()) {
    throw new ydn.error.InvalidOperationError(this + ' cursor gone.');
  }
  var n = this.cursor_.rows.length;
  this.current_cursor_index_ += step;
  var p_key = this.getPrimaryKey();
  var key = this.getIndexKey();
  var value = this.getValue();
  var me = this;
  setTimeout(function() {
    // we must invoke async just like IndexedDB advance, otherwise
    // run-to-completion logic will not work as expected.
    me.onSuccess(p_key, key, value);
  }, 4);

};


/**
 * @inheritDoc
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.continuePrimaryKey = function(key) {
  if (!this.hasCursor()) {
    throw new ydn.error.InvalidOperationError(this + ' cursor gone.');
  }
  var cmp = ydn.db.cmp(key, this.getPrimaryKey());
  if (cmp == 0 || (cmp == 1 && this.reverse) || (cmp == -1 && !this.reverse)) {
    throw new ydn.error.InvalidOperationError(this + ' wrong direction.');
  }
  var index_position = this.getIndexKey();
  var n = this.cursor_.rows.length;

  for (var i = 0; i < n; i++) {
    if (cmp == 0 || (cmp == 1 && this.reverse) || (cmp == -1 && !this.reverse)) {
      this.onSuccess(this.getPrimaryKey(), this.getIndexKey(), this.getValue());
      return;
    }
    this.current_cursor_index_++;
    if (index_position && index_position != this.getIndexKey()) {
      // index position must not change while continuing primary key
      this.onSuccess(this.getPrimaryKey(), this.getIndexKey(), this.getValue());
      return;
    }
    var eff_key = this.getPrimaryKey();
    cmp = goog.isDefAndNotNull(eff_key) ? ydn.db.cmp(key, eff_key) : 1;
  }
  this.onSuccess(undefined, undefined, undefined);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.CachedWebsqlCursor.prototype.continueEffectiveKey = function(key) {
  if (!this.hasCursor()) {
    throw new ydn.error.InvalidOperationError(this + ' cursor gone.');
  }
  if (!goog.isDefAndNotNull(key)) {
    this.advance(1);
    return;
  }
  var cmp = ydn.db.cmp(key, this.getEffectiveKey());
  if (cmp == 0 || (cmp == 1 && this.reverse) || (cmp == -1 && !this.reverse)) {
    throw new ydn.error.InvalidOperationError(this + ' wrong direction.');
  }
  var n = this.cursor_.rows.length;

  for (var i = 0; i < n; i++) {
    if (cmp == 0 || (cmp == 1 && this.reverse) || (cmp == -1 && !this.reverse)) {
      this.onSuccess(this.getPrimaryKey(), this.getIndexKey(), this.getValue());
      return;
    }
    this.current_cursor_index_++;
    var eff_key = this.getEffectiveKey();
    cmp = goog.isDefAndNotNull(eff_key) ? ydn.db.cmp(key, eff_key) : 1;
  }
  this.onSuccess(undefined, undefined, undefined);
};


