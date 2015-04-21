/**
 * Created with IntelliJ IDEA.
 * User: kyawtun
 * Date: 22/8/12
 * Time: 10:24 PM
 * To change this template use File | Settings | File Templates.
 */

goog.provide('ydn.db.QueryJstest');
goog.require('goog.debug.Console');
goog.require('goog.debug.LogManager');
goog.require('ydn.db.Iterator');

ydn.db.QueryJstest = TestCase('ydn.db.QueryJstest');

ydn.db.QueryJstest.prototype.setUp = function() {



};


ydn.db.QueryJstest.prototype.tearDown = function() {

};


ydn.db.QueryJstest.prototype.test_key_range = function() {
  assertTrue("not implemented test", true);
};

//
//ydn.db.QueryJstest.prototype.test_parent_key = function() {
//  var store1 = 'store1';
//  var id1 = 'id1';
//  var key1 = new ydn.db.Key(store1, id1);
//  var json1 = key1.toJSON();
//
//  var store2 = 'store2';
//  var id2 = 'id2';
//  var key2 = new ydn.db.Key(store2, id2, key1);
//  var json2 = key2.toJSON();
//
//  assertTrue('parent', ydn.object.equals(json1, json2.parent));
//
//  var key22 = new ydn.db.Key(json2);
//  var json22 = key22.toJSON();
//  assertTrue('parent', ydn.object.equals(json1, json2.parent));
//};
//
//
