/**
 * @fileoverview JsTestDriver test unit for ydn.store.Storage.
 */

goog.provide('ydn.store.StorageJstest');
goog.require('goog.debug.Console');
goog.require('goog.debug.LogManager');
goog.require('ydn.db.Storage');
goog.require('ydn.db.test');


ydn.store.StorageJstest = AsyncTestCase('StorageJstest');

ydn.store.StorageJstest.prototype.setUp = function() {


};


ydn.store.StorageJstest.prototype.tearDown = function() {

};


/**
 * Test database initialization with auto schema
 * @param queue
 */
ydn.store.StorageJstest.prototype.testAutoSchema = function(queue) {
  var db = new ydn.db.Storage('test-trivial-schema');
  var store_name = 's' + Math.random();
  queue.call('put using trivial schema', function(callbacks) {
    var key = Math.random();
    db.put(store_name, {foo: 'bar'}, key).addBoth(callbacks.add(function(x) {
      assertFalse('not error', x instanceof Error);
      assertEquals('has a key', key, x);
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    }));
  });
};

