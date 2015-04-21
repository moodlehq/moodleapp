/**
 * @fileoverview JsTestDriver test unit for ydn.store.Storage.
 */

goog.provide('ydn.store.IndexedDbJstest');
goog.require('goog.debug.Console');
goog.require('goog.debug.LogManager');
goog.require('ydn.db.Storage');
goog.require('ydn.db.test');


ydn.store.IndexedDbJstest = AsyncTestCase('IndexedDbJstest');

ydn.store.IndexedDbJstest.prototype.setUp = function() {

  this.dbname = 'test_2';

};


ydn.store.IndexedDbJstest.prototype.tearDown = function() {

};

ydn.store.IndexedDbJstest.prototype.test_special_key = function(queue) {
  var db = new ydn.db.Storage(this.dbname, ydn.db.test.getSchema());
  ydn.db.test.special_keys_test(queue, db);
};

ydn.store.IndexedDbJstest.prototype.test_put_get_object = function(queue) {
  var db = new ydn.db.Storage(this.dbname, ydn.db.test.getSchema());
  ydn.db.test.clear_tests(queue, db);
};

ydn.store.IndexedDbJstest.prototype.test_put_get_object = function(queue) {
  var db = new ydn.db.Storage(this.dbname, ydn.db.test.getSchema());
  ydn.db.test.run_put_get_tests(queue, db);
};

ydn.store.IndexedDbJstest.prototype.test_empty_store_get = function(queue) {
  var db = new ydn.db.Storage(this.dbname, ydn.db.test.getSchema());
  ydn.db.test.empty_store_get_test(queue, db);
};

ydn.store.IndexedDbJstest.prototype.test_nested_key_path = function(queue) {
  var db = new ydn.db.Storage('nested_key_path', ydn.db.test.get_nested_key_path_schema());
  ydn.db.test.nested_key_path(queue, db);
};




