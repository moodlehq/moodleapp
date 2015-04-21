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
 * @fileoverview Data store in memory.
 */


goog.provide('ydn.db.con.SimpleStorage');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('ydn.db.Key');
goog.require('ydn.db.VersionError');
goog.require('ydn.db.con.IDatabase');
goog.require('ydn.db.con.simple');
goog.require('ydn.db.con.simple.IStorageProvider');
goog.require('ydn.db.con.simple.Store');
goog.require('ydn.db.con.simple.TxStorage');
goog.require('ydn.db.req.InMemoryStorage');
goog.require('ydn.debug.error.InternalError');



/**
 * @implements {ydn.db.con.IDatabase}
 * @param {!ydn.db.con.simple.IStorageProvider=} opt_provider storage provider.
 * @constructor
 * @extends {ydn.db.con.SimpleStorageService}
 * @struct
 */
ydn.db.con.SimpleStorage = function(opt_provider) {
  goog.base(this, opt_provider);

  this.version_ = NaN;

};
goog.inherits(ydn.db.con.SimpleStorage, ydn.db.con.SimpleStorageService);


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.con.SimpleStorage.prototype.logger =
    goog.log.getLogger('ydn.db.con.SimpleStorage');


/**
 * @private
 * @type {number}
 */
ydn.db.con.SimpleStorage.prototype.version_;


/**
 *
 * @return {boolean} true if memory is supported.
 */
ydn.db.con.SimpleStorage.isSupported = function() {
  return true;
};


/**
 *
 * @type {boolean} debug flag. should always be false.
 */
ydn.db.con.SimpleStorage.DEBUG = false;


/**
 * @type {number}
 * @private
 */
ydn.db.con.SimpleStorage.prototype.version_;


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.getVersion = function() {
  return this.version_;
};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.connect = function(dbname, schema) {

  var me = this;
  var df = new goog.async.Deferred();
  /**
   *
   * @param {number} x
   * @param {Error=} opt_err
   */
  var callDf = function(x, opt_err) {
    setTimeout(function() {
      if (opt_err) {
        goog.log.finer(me.logger, me + ' opening fail');
        df.errback(opt_err);
      } else {
        goog.log.finer(me.logger, me + ' version ' + me.getVersion() + ' open');
        df.callback(x);
      }
    }, 10);
  };

  /**
   * @final
   */
  this.storage_ = this.provider_.connectDb(dbname);

  /**
   * @final
   */
  this.dbname = dbname;

  /**
   * @final
   */
  this.schema = schema;

  var db_key = ydn.db.con.simple.makeKey(this.dbname);

  this.version_ = NaN;

  /**
   *
   * @type {DatabaseSchema}
   */
  var ex_schema_json = /** @type {DatabaseSchema} */
      (ydn.json.parse(this.storage_.getItem(db_key)));
  if (goog.isDef(ex_schema_json.version)
      && !goog.isNumber(ex_schema_json.version)) {
    ex_schema_json.version = NaN; // NaN is not serializable.
  }

  if (ex_schema_json) {
    var ex_schema = new ydn.db.schema.Database(ex_schema_json);

    var diff_msg = this.schema.difference(ex_schema, false, false);
    if (diff_msg) {
      if (!this.schema.isAutoVersion() &&
          !isNaN(ex_schema.getVersion()) &&
          this.schema.getVersion() > ex_schema.getVersion()) {
        var msg = goog.DEBUG ? 'existing version ' + ex_schema.getVersion() +
            ' is larger than ' + this.schema.getVersion() : '';
        callDf(NaN, new ydn.db.VersionError(msg));
      } else {
        // upgrade schema
        var v = this.schema.getVersion();
        this.version_ = goog.isDef(v) ? v : (ex_schema.getVersion() + 1);
        for (var i = 0; i < this.schema.count(); i++) {
          var store = this.schema.store(i);
        }
        if (this.schema instanceof ydn.db.schema.EditableDatabase) {
          for (var i = 0; i < ex_schema.count(); i++) {
            var store = ex_schema.store(i);
            goog.asserts.assert(!goog.isNull(store), 'store at ' + i +
                ' is null');
            this.schema.addStore(store);
          }
        }
        var schema_json = this.schema.toJSON();
        schema_json.version = this.version_ || NaN;
        this.storage_.setItem(db_key, ydn.json.stringify(schema_json));
        callDf(ex_schema.getVersion() || NaN);
      }
    } else {
      for (var i = 0; i < this.schema.count(); i++) {
        var store = this.schema.store(i);
      }
      this.version_ = ex_schema.getVersion() || NaN;
      callDf(this.version_);
    }
  } else {
    var json = schema.toJSON();
    this.version_ = 1;
    var old_version = NaN;
    json.version = this.version_;
    this.storage_.setItem(db_key, ydn.json.stringify(json));
    callDf(old_version);
  }

  return df;
};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.isReady = function() {
  return !!this.dbname;
};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.getDbInstance = function() {
  return this.storage_ || null;
};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.onFail = function(e) {};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.onError = function(e) {};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.onVersionChange = function(e) {};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.getType = function() {
  return 'memory';
};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.close = function() {

};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.doTransaction = function(trFn, scopes, mode,
    oncompleted) {
  var tx = new ydn.db.con.simple.TxStorage(this, function(t, e) {
    oncompleted(t, e);
  });
  trFn(tx);
};


if (goog.DEBUG) {
  /**
   * @override
   */
  ydn.db.con.SimpleStorage.prototype.toString = function() {
    var s = this.dbname + ':' + this.version_;
    return 'SimpleStorage:' + this.getType() + ':' + s;
  };
}

