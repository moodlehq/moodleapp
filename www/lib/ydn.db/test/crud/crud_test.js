
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


var test_add_inline = function() {
  var db_name = 'test_add' + goog.now();
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  }
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var fired = [];
  var results = [];
  var keys = ['a', 2];

  waitForCondition(
    // Condition
    function() { return fired[0] && fired[1] && fired[2]; },
    // Continuation
    function() {
      assertEquals('add 0', keys[0], results[0]);
      assertEquals('add 1', keys[1], results[1]);
      assertTrue('add 2: Error object', goog.isObject(results[2]));
      assertEquals('add 2: Error', 'ConstraintError', results[2].name);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout


  db.add('st', {id: keys[0], value: '1', remark: 'put test'}).addBoth(function(value) {
    //console.log('receiving value callback.');
    results[0] = value;
    fired[0] = true;

  });

  db.add('st', {id: keys[1], value: '1', remark: 'put test'}).addBoth(function(value) {
    //console.log('receiving value callback.');
    results[1] = value;
    fired[1] = true;
  });

  db.add('st', {id: keys[0], value: '1', remark: 'put test'}).addCallbacks(function(value) {
    fired[2] = true;
  }, function(value) {
    results[2] = value;
    fired[2] = true;
  });
};




var test_put = function() {
  var db_name = 'test_11_put';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var hasEventFired = false;
  var put_value;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('put a', 'a', put_value);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout


  db.put(table_name, {id: 'a', value: '1', remark: 'put test'}).addBoth(function(value) {
    console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  });
};



var test_put_key = function() {
  var db_name = 'test_13_put_key';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var key = new ydn.db.Key(store_name_inline_number, 1);
  var value =
    {id: 1, msg: Math.random()};

  var done = false;
  var results, keys;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('key', 1, keys);
      assertObjectEquals('value', value, results);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout


  db.put(key, value).addBoth(function(x) {
    console.log('receiving value callback.');
    keys = x;
    db.get(key).addBoth(function(x) {
      results = x;
      done = true;
    });
  });
};




var test_count_store = function() {

  var db_name = 'test_31_count_store_2';

  var n = Math.ceil(Math.random() * 10 + 1);
  var arr = [];
  for (var i = 0; i < n; i++) {
    arr[i] = {id: i};
  }

  var store_1 = 'st1';
  var stores = [new ydn.db.schema.Store(store_1, 'id', false,
    ydn.db.schema.DataType.INTEGER)];
  var schema = new ydn.db.schema.Database(1, stores);
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  db.clear(store_1);
  db.put(store_1, arr).addCallback(function(keys) {
    console.log(keys);
  });

  var done = false;
  var count;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('number of record', n, count);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout


  db.count(store_1).addBoth(function(value) {
    //console.log('receiving value callback.');
    count = value;
    done = true;
  });
};



var test_remove_by_id = function() {
  var db_name = 'test_41_remove_by_key';
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  db.clear(table_name);
  db.put(table_name,
    [{id: 1}, {id: 2}, {id: 3}, {id: 4}]
  );

  var hasEventFired = false;
  var delCount, count;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('remove result', 1, delCount);
      assertEquals('count', 3, count);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout

  db.remove(table_name, 1).addBoth(function(value) {

    delCount = value;
    db.count(table_name).addBoth(function(x) {
      count = x;
      hasEventFired = true;
    });
  });

};



var tearDownPage = function() {

};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



