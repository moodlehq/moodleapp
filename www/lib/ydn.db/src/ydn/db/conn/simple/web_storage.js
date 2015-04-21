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
 * @fileoverview Web storage connectors.
 */

goog.provide('ydn.db.con.LocalStorage');
goog.provide('ydn.db.con.SessionStorage');
goog.require('ydn.db.con.SimpleStorage');



/**
 * @extends {ydn.db.con.SimpleStorage}
 * name and keyPath.
 * @constructor
 * @implements {ydn.db.con.simple.IStorageProvider}
 * @struct
 */
ydn.db.con.LocalStorage = function() {
  goog.base(this, this);
};
goog.inherits(ydn.db.con.LocalStorage, ydn.db.con.SimpleStorage);


/**
 * @inheritDoc
 */
ydn.db.con.LocalStorage.prototype.connectDb = function(name) {
  goog.asserts.assertObject(window.localStorage);
  return window.localStorage;
};


/**
 *
 * @return {boolean} true if localStorage is supported.
 */
ydn.db.con.LocalStorage.isSupported = function() {
  return !!window.localStorage;
};


/**
 * @inheritDoc
 */
ydn.db.con.LocalStorage.prototype.getType = function() {
  return ydn.db.base.Mechanisms.LOCAL_STORAGE;
};


/**
 *
 * @param {string} db_name
 * @param {string=} opt_type delete only specific types.
 */
ydn.db.con.LocalStorage.deleteDatabase = function(db_name, opt_type) {
  if (!!opt_type && opt_type != ydn.db.base.Mechanisms.LOCAL_STORAGE) {
    return;
  }
  var db = new ydn.db.con.LocalStorage();
  var schema = new ydn.db.schema.EditableDatabase();
  db.connect(db_name, schema);
  db.getSchema(function(sch) {
    for (var i = 0; i < sch.stores.length; i++) {
      var store = db.getSimpleStore(sch.stores[i].getName());
      store.clear();
    }
  });
};
ydn.db.databaseDeletors.push(ydn.db.con.LocalStorage.deleteDatabase);



/**
 * @extends {ydn.db.con.SimpleStorage}
 * name and keyPath.
 * @constructor
 * @implements {ydn.db.con.simple.IStorageProvider}
 * @struct
 */
ydn.db.con.SessionStorage = function() {
  goog.base(this, this);
};
goog.inherits(ydn.db.con.SessionStorage, ydn.db.con.SimpleStorage);


/**
 * @inheritDoc
 */
ydn.db.con.SessionStorage.prototype.connectDb = function(name) {
  goog.asserts.assertObject(window.sessionStorage);
  return window.sessionStorage;
};


/**
 *
 * @return {boolean} true if localStorage is supported.
 */
ydn.db.con.SessionStorage.isSupported = function() {
  return !!window.sessionStorage;
};


/**
 * @inheritDoc
 */
ydn.db.con.SessionStorage.prototype.getType = function() {
  return ydn.db.base.Mechanisms.SESSION_STORAGE;
};


/**
 *
 * @param {string} db_name
 * @param {string=} opt_type delete only specific types.
 */
ydn.db.con.SessionStorage.deleteDatabase = function(db_name, opt_type) {
  if (!!opt_type && opt_type != ydn.db.base.Mechanisms.SESSION_STORAGE) {
    return;
  }
  var db = new ydn.db.con.SessionStorage();
  var schema = new ydn.db.schema.EditableDatabase();
  db.connect(db_name, schema);
  db.getSchema(function(sch) {
    for (var i = 0; i < sch.stores.length; i++) {
      var store = db.getSimpleStore(sch.stores[i].getName());
      store.clear();
    }
  });
};
ydn.db.databaseDeletors.push(ydn.db.con.SessionStorage.deleteDatabase);


