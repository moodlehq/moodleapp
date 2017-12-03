
goog.require('goog.debug.Console');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.crud.Storage');
goog.require('ydn.debug');


var reachedFinalContinuation, schema, debug_console, db, objs;

var table_name = 'st_inline';
var table_name_offline = 'st_offline';
var store_name_inline_number = 'st_inline_n';
var load_store_name = 'st_load';


var setUp = function() {

  ydn.json.POLY_FILL = true;
  // ydn.debug.log('ydn.db', 'finest');
  // ydn.db.crud.req.WebSql.DEBUG = true;
  // ydn.debug.log('ydn.db', 'finest');
  // ydn.db.tr.Serial.DEBUG = true;
  //ydn.db.crud.req.IndexedDb.DEBUG = true;
  // ydn.db.con.IndexedDb.DEBUG = true;

  var indexes = [new ydn.db.schema.Index('tag', ydn.db.schema.DataType.TEXT)];
  var stores = [new ydn.db.schema.Store(table_name, 'id'),
    new ydn.db.schema.Store(store_name_inline_number, 'id', false, ydn.db.schema.DataType.NUMERIC, undefined, true),
    new ydn.db.schema.Store(table_name_offline, undefined, false, ydn.db.schema.DataType.NUMERIC),
    new ydn.db.schema.Store(load_store_name, 'id', false, ydn.db.schema.DataType.NUMERIC, indexes)
  ];
  schema = new ydn.db.schema.Database(undefined, stores);

};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var test_put_array_key = function() {
  var db_name = 'test_12_put_array_key';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var arr = [];
  var n = ydn.db.crud.req.IndexedDb.REQ_PER_TX / 2;
  for (var i = 0; i < n; i++) {
    arr.push({id: i, value: 'a' + Math.random()});
  }

  var hasEventFired = false;
  var results;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('length', arr.length, results.length);
      for (var i = 0; i < arr.length; i++) {
        assertEquals('1', arr[i].id, results[i]);
      }

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout


  db.put(table_name, arr).addBoth(function(value) {
    results = value;
    hasEventFired = true;
  });
};



var test_put_array_by_keys = function() {
  var db_name = 'test_crud_13_2';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var arr = [
    new ydn.db.Key(store_name_inline_number, 1),
    new ydn.db.Key(store_name_inline_number, 2),
    new ydn.db.Key(table_name_offline, 3)];
  var values = [
    {id: 1, msg: Math.random()},
    {msg: Math.random()},
    {key: Math.random()}];

  var done = false;
  var results, keys;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertArrayEquals('keys', [1, 2, 3], keys);
      assertArrayEquals('values', values, results);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    3000); // maxTimeout


  db.put(arr, values).addCallbacks(function(value) {
    console.log('receiving value callback: ' + value);
    keys = value;
    db.values(arr).addCallbacks(function(x) {
      console.log(x);
      results = x;
      done = true;
    }, function(e) {
      throw e;
    });
  }, function(e) {
    throw e;
  });
};



var tearDownPage = function() {

};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



