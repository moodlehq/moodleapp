// core service test
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.debug');
goog.require('ydn.db.crud.Storage');


var reachedFinalContinuation, basic_schema;


var setUp = function() {
  ydn.debug.log('ydn.db', 'finest');
};


var tearDown = function() {

};



var test_sync = function() {
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      type: 'TEXT'
    }]
  };
  var db_type = 'indexeddb';
  var db_name = 'test-sync';
  var db = new ydn.db.crud.Storage(db_name, schema);

  var val = {id: 'a', value: Math.random()};

  var done = false;
  var result;

  db.onReady(function() {
    function fn (tdb) {
      var p1 = yield tdb.put('st', val);
      var result = yield tdb.get('st', p1);
      assertObjectEquals('result', val, result);
      console.log('done ', result);
    }
    db.spawn(fn, ['st'], 'readwrite');
  });

};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



