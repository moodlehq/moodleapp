/**
 * @fileoverview Same interface as localStorage, but store in memory.
 */

goog.provide('ydn.db.req.InMemoryStorage');
goog.require('ydn.db.con.simple.IStorageProvider');



/**
 * Implements for storage.
 * http://dev.w3.org/html5/webstorage/#storage-0
 * @implements {Storage}
 * @implements {ydn.db.con.simple.IStorageProvider}
 * @constructor
 */
ydn.db.req.InMemoryStorage = function() {
  this.clear();
};


/**
 * @inheritDoc
 */
ydn.db.req.InMemoryStorage.prototype.connectDb = function(name) {
  return this;
};


/**
 *
 * @param {string} key key.
 * @param {string} value value.
 */
ydn.db.req.InMemoryStorage.prototype.setItem = function(key, value) {
  if (!goog.isDef(this.memoryStorage[key])) {
    this.keys.push(key.toString());
    this.length = this.keys.length;
  }
  this.memoryStorage[key] = value;
};


/**
 *
 * @param {string} key key.
 * @return {string?} value. If not found, null is return.
 */
ydn.db.req.InMemoryStorage.prototype.getItem = function(key) {
  if (!goog.isDef(this.memoryStorage[key])) {
    // window.localStorage return null if the key don't exist.
    return null;
  } else {
    return this.memoryStorage[key];
  }
};


/**
 *
 * @param {string} key key.
 */
ydn.db.req.InMemoryStorage.prototype.removeItem = function(key) {
  delete this.memoryStorage[key];
  goog.array.remove(this.keys, key.toString());
  this.length = this.keys.length;
};


/**
 *
 * @type {number} return the number of key/value pairs currently present in
 * the list associated with the object. null if not found.
 */
ydn.db.req.InMemoryStorage.prototype.length = 0;


/**
 *
 * @param {number} i
 * @return {string?}  return the name of the nth key in the list.
 */
ydn.db.req.InMemoryStorage.prototype.key = function(i) {

  var key = this.keys[i];

  return goog.isDef(key) ? this.memoryStorage[key] : null;
};


/**
 * Clear all cache.
 */
ydn.db.req.InMemoryStorage.prototype.clear = function() {
  this.memoryStorage = {};
  this.keys = [];
  this.length = 0;
};
