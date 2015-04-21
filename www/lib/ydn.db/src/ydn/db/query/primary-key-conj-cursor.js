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
 * @fileoverview Primary key conjunction cursor.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.query.PKeyCursor');
goog.require('ydn.db.query.ConjunctionCursor');



/**
 * Primary key conjunction cursor.
 * @param {Array.<ydn.db.core.req.ICursor>} cursors cursors.
 * @param {ydn.db.query.PKeyCursor=} opt_prev_cursor previous cursor, to resume cursor
 * location.
 * @param {IDBKey=} opt_key start position.
 * @param {IDBKey=} opt_primary_key start position.
 * @constructor
 * @extends {ydn.db.query.ConjunctionCursor}
 * @struct
 */
ydn.db.query.PKeyCursor = function(cursors, opt_prev_cursor, opt_key,
                                   opt_primary_key) {
  goog.base(this, cursors, opt_prev_cursor, opt_key, opt_primary_key);
};
goog.inherits(ydn.db.query.PKeyCursor, ydn.db.query.ConjunctionCursor);


/**
 *
 * @define {boolean} debug flag.
 */
ydn.db.query.PKeyCursor.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.query.PKeyCursor.prototype.logger =
    goog.log.getLogger('ydn.db.query.PKeyCursor');


/**
 * Open cursors for joining primary keys.
 * Base cursor is primary cursor, meaning that its effective key is primary.
 * Other cursors may not may not be primary cursor. In any case, we will join
 * primary key instead.
 * The algorithm is sorted merge join, except different primary key retrieval.
 * @private
 */
ydn.db.query.PKeyCursor.prototype.openPrimaryKeyMerge_ = function() {
  var total = this.cursors_.length;
  var result_count = 0;
  var primary_keys = [];
  var me = this;
  var listenCursor = function(i_cursor) {
    /**
     * @type {ydn.db.core.req.ICursor}
     */
    var cursor = me.cursors_[i_cursor];
    /**
     * On success handler.
     * @param {IDBKey=} opt_key effective key.
     * @param {IDBKey=} opt_p_key primary key.
     * @param {*=} opt_value reference value.
     * @this {ydn.db.core.req.ICursor}
     */
    cursor.onSuccess = function(opt_key, opt_p_key, opt_value) {
      result_count++;
      if (ydn.db.query.PKeyCursor.DEBUG) {
        window.console.log(me + ' receiving result "' + opt_key + '" from ' +
            i_cursor + ' of ' + result_count + '/' + total + ' ' + cursor);
      }
      //console.log([result_count, opt_key, opt_p_key]);
      if (!goog.isDefAndNotNull(opt_key)) {
        goog.log.finest(me.logger,  'cursor ' + cursor + ' finished.');
        me.done_ = true;
      }
      me.keys_[i_cursor] = opt_key;
      me.primary_keys_[i_cursor] = opt_p_key;
      me.values_[i_cursor] = opt_value;
      if (!cursor.isIndexCursor()) {
        primary_keys[i_cursor] = opt_key;
      } else {
        primary_keys[i_cursor] = opt_p_key;
      }
      if (result_count == total) {
        // all cursor results are ready
        result_count = 0;
        if (me.done_) {
          me.count_++;
          goog.log.finest(me.logger,  me + ' DONE.');
          me.onNext();
          me.finalize_();
        } else {
          // to get successful step, all primary key must be same.
          var max_key = primary_keys.reduce(function(p, c) {
            if (goog.isNull(p)) {
              return c;
            } else {
              return ydn.db.cmp(c, p) == 1 ? c : p;
            }
          }, null);
          if (ydn.db.cmp(max_key, primary_keys[0]) == 0) {
            // all keys are equal, hence we get matching key result.
            var key_str = goog.isDefAndNotNull(me.primary_keys_[0]) ?
                me.keys_[0] + ', ' + me.primary_keys_[0] : me.keys_[0];
            goog.log.finest(me.logger,  me + ' new cursor position {' + key_str + '}');
            me.onNext(me.keys_[0]);
          } else {
            // request behind cursor to max key position.
            for (var i = 0; i < total; i++) {
              if (ydn.db.cmp(primary_keys[i], max_key) == -1) {
                var cur = me.cursors_[i];
                if (!cur.isIndexCursor()) {
                  cur.continueEffectiveKey(max_key);
                } else {
                  cur.continuePrimaryKey(max_key);
                }
              } else {
                result_count++;
              }
            }
          }
        }
        goog.array.clear(primary_keys);
      }
    };
    /**
     * On error handler.
     * @param {!Error} e error.
     * @this {ydn.db.core.req.ICursor}
     */
    cursor.onError = function(e) {
      me.onFail(e);
      me.finalize_();
      me.done_ = true;
      result_count = 0;
    };

    // if there is previous position, the cursor must advance over previous
    // position.
    var pk_str = goog.isDefAndNotNull(me.primary_keys_[i_cursor]) ?
        ', ' + me.primary_keys_[i_cursor] : '';
    pk_str = goog.isDefAndNotNull(me.keys_[i_cursor]) ? ' resume from {' +
        me.keys_[i_cursor] + pk_str + '}' : '';
    goog.log.finest(me.logger,  cursor + pk_str + ' opening');
    cursor.openCursor(me.keys_[i_cursor], me.primary_keys_[i_cursor]);
  };
  for (var i = 0; i < total; i++) {
    listenCursor(i);
  }
};


/**
 * Move cursor position to the primary key while remaining on same index key.
 * @param {IDBKey} key primary key position to continue.
 */
ydn.db.query.PKeyCursor.prototype.continuePrimaryKey = function(key) {
  // console.log(this + ' continuePrimaryKey ' + key)
  this.cursors_[0].continuePrimaryKey(key);
};


/**
 * Move cursor position to the effective key.
 * @param {IDBKey=} opt_key effective key position to continue.
 */
ydn.db.query.PKeyCursor.prototype.continueEffectiveKey = function(opt_key) {
  this.cursors_[0].continueEffectiveKey(opt_key);
};


/**
 * Move cursor position to the effective key.
 * @param {number} n number of steps.
 */
ydn.db.query.PKeyCursor.prototype.advance = function(n) {
  for (var i = 0; i < this.cursors_.length; i++) {
    this.cursors_[i].advance(n);
  }
};


/**
 * @param {!Object} obj record value.
 * @param {number=} opt_idx cursor index.
 * @return {!goog.async.Deferred} value.
 */
ydn.db.query.PKeyCursor.prototype.update = function(obj, opt_idx) {
  var index = opt_idx || 0;
  return this.cursors_[index].update(obj);
};


/**
 * @param {number=} opt_idx cursor index.
 * @return {!goog.async.Deferred} value.
 */
ydn.db.query.PKeyCursor.prototype.clear = function(opt_idx) {
  var index = opt_idx || 0;
  return this.cursors_[index].clear();
};


/**
 *
 * @return {boolean} true if cursor gone.
 */
ydn.db.query.PKeyCursor.prototype.hasDone = function() {
  return this.done_;
};


/**
 *
 * @return {boolean} true if iteration is existed.
 */
ydn.db.query.PKeyCursor.prototype.isExited = function() {
  return this.exited_;
};


/**
 * Exit cursor
 */
ydn.db.query.PKeyCursor.prototype.exit = function() {
  this.exited_ = true;
  goog.log.finest(this.logger, this + ': exit');
  this.finalize_();
  this.dispose_();
};

