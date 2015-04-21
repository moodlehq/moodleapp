
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



var test_remove_by_key_array = function() {
  // ydn.db.crud.req.IndexedDb.DEBUG = true;
  var db_name = 'test_41_remove_by_key_array';
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var ids = [Math.random(), Math.random(), Math.random()];
  var objs = [];
  var keys = [];
  for (var i = 0; i < ids.length; i++) {
    objs[i] = {id: ids[i]};
    keys[i] = new ydn.db.Key('st', ids[i]);
  }

  var done = false;
  var delCount, keys_before, keys_after;

  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        assertEquals('3 keys before', 3, keys_before.length);
        assertEquals('delete count', 3, delCount);
        assertEquals('0 keys after', 0, keys_after.length);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  db.clear('st');
  db.put('st', objs);
  db.keys('st').addBoth(function(x) {
    keys_before = x;
  });
  db.remove(keys).addBoth(function(x) {
    delCount = x;
  });
  db.keys('st').addBoth(function(x) {
    keys_after = x;
    done = true;
  });
};




var test_remove_by_key_range = function() {
  var db_name = 'test_42_remove_by_key_range';


  var db = new ydn.db.crud.Storage(db_name, schema, options);
  db.clear(table_name);
  db.put(table_name,
    [{id: 1}, {id: 2}, {id: 3}, {id: 4}]
  );

  var hasEventFired = false;
  var countValue;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('remove result', 3, countValue);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout

  db.count(table_name); // break tx merge.
  db.remove(table_name, ydn.db.KeyRange.lowerBound(2)).addCallback(function(value) {
    countValue = value;
    hasEventFired = true;
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



var test_remove_by_key = function() {
  var db_name = 'test_remove_by_key';
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var ids = [Math.random(), Math.random(), Math.random()];
  var objs = [];

  for (var i = 0; i < ids.length; i++) {
    objs[i] = {id: ids[i]};
  }

  var done = false;
  var delCount, keys_before, keys_after;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('3 keys before', 3, keys_before.length);
      assertEquals('delete count', 1, delCount);
      assertEquals('2 keys after', 2, keys_after.length);
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout

  db.clear('st').addBoth(function(x) {
    //console.log('cleared');
  });
  db.put('st', objs).addBoth(function(x) {
    // console.log(x);
  });
  db.keys('st').addBoth(function(x) {
    keys_before = x;
  });
  db.remove(new ydn.db.Key('st', ids[1])).addBoth(function(x) {
    delCount = x;
  });
  db.keys('st').addBoth(function(x) {
    keys_after = x;
    done = true;
  });
};



var tearDownPage = function() {

};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



