/**
 * Created with IntelliJ IDEA.
 * User: kyawtun
 * Date: 22/8/12
 * Time: 10:24 PM
 * To change this template use File | Settings | File Templates.
 */

goog.provide('ydn.db.KeyJstest');
goog.require('goog.debug.Console');
goog.require('goog.debug.LogManager');
goog.require('ydn.db.Key');

ydn.db.KeyJstest = TestCase('ydn.db.KeyJstest');

ydn.db.KeyJstest.prototype.setUp = function() {



};


ydn.db.KeyJstest.prototype.tearDown = function() {

};



ydn.db.KeyJstest.prototype.test_value_json = function() {
  var store = 'store1';
  var id = 'ida';
  var key = new ydn.db.Key(store, id);

  var json = key.toJSON();
  assertEquals('store', store, json.store);
  assertEquals('id', id, json.id);

  var val = key.valueOf();
  var key2 = new ydn.db.Key(val);
  var json2 = key2.toJSON();
  assertEquals('store', store, json2.store);
  assertEquals('id', id, json2.id);

  var key3 = new ydn.db.Key(json);
  var json3 = key2.toJSON();
  assertEquals('store', store, json3.store);
  assertEquals('id', id, json3.id);
};


ydn.db.KeyJstest.prototype.test_parent_key = function() {
  var store1 = 'store1';
  var id1 = 'id1';
  var key1 = new ydn.db.Key(store1, id1);
  var json1 = key1.toJSON();

  var store2 = 'store2';
  var id2 = 'id2';
  var key2 = new ydn.db.Key(store2, id2, key1);
  var json2 = key2.toJSON();

  assertTrue('parent', ydn.object.equals(json1, json2.parent));

  var key22 = new ydn.db.Key(json2);
  var json22 = key22.toJSON();
  assertTrue('parent', ydn.object.equals(json1, json2.parent));
};


