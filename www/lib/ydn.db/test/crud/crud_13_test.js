
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




var test_add_outofline = function() {
  var db_name = 'test_add' + goog.now();
  var schema = {
    stores: [{
      name: 'st'
    }]
  }
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var fired = [];
  var results = [];
  var keys = ['a', 2];

  waitForCondition(
    // Condition
    function() { return fired[0] && fired[1] && fired[2]; },
    function() {
      assertEquals('add 1', keys[0], results[0]);
      assertEquals('add 1', keys[1], results[1]);
      assertTrue('add 2: Error object', goog.isObject(results[2]));
      assertEquals('add 2: Error', 'ConstraintError', results[2].name);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout


  db.add('st', {value: '1', remark: 'put test'}, keys[0]).addBoth(function(value) {
    //console.log('receiving value callback.');
    results[0] = value;
    fired[0] = true;
  });

  db.add('st', {value: '1', remark: 'put test'}, keys[1]).addBoth(function(value) {
    //console.log('receiving value callback.');
    results[1] = value;
    fired[1] = true;
  });

  db.add('st', {value: '1', remark: 'put test'}, keys[0]).addCallbacks(function(value) {
    fired[2] = true;
  }, function(value) {
    results[2] = value;
    fired[2] = true;
  });
};




var test_clear_by_key_range = function() {
  //ydn.db.con.simple.Store.DEBUG = true;
  var db_name = 'test_43_clear_by_key_range';
  var schema = {
    stores: [{
      name: table_name,
      keyPath: 'id'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  db.clear(table_name);
  db.put(table_name,
    [{id: 1}, {id: 2}, {id: 3}, {id: 4}]
  );

  var done = false;
  var count, countValue, recountValue;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('before clear', 4, count);
      assertEquals('clear result', 1, countValue);
      assertEquals('clear result after reconnection', 1, recountValue);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout

  db.count(table_name).addBoth(function(x) {
    count = x;
  });
  db.clear(table_name, ydn.db.KeyRange.lowerBound(2)).addBoth(function(value) {
    db.count(table_name).addBoth(function(value) {

      countValue = value;

      db.close();
      db = new ydn.db.crud.Storage(db_name, schema, options);
      db.count(table_name).addBoth(function(value) {
        recountValue = value;
        done = true;
      });

    });
  });

};




var test_get_offline = function() {
  var db_name = 'test_22_get_offline';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var key = Math.ceil(Math.random() * 1000);
  var value = {value: 'a' + Math.random()};

  var done = false;
  var result;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('value', value.value, result.value);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout

  db.put(table_name_offline, value, key).addBoth(function(k) {
    db = new ydn.db.crud.Storage(db_name, schema, options);
    db.get(table_name_offline, key).addBoth(function(value) {
      //console.log('receiving value callback.');
      result = value;
      done = true;
    });
  });

  db.close();
};



var tearDownPage = function() {

};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



