
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


var test_add_fail = function() {
  var db_name = 'test_add_fail';
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  // ydn.db.crud.req.WebSql.DEBUG = true;
  var hasEventFired = false;
  var put_value, add_ev;
  var key = Math.random();

  waitForCondition(
    // Condition
    function() {
      return hasEventFired;
    },
    // Continuation
    function() {
      assertEquals('add a', key, put_value);
      hasEventFired = false;

      waitForCondition(
        // Condition
        function() {
          return hasEventFired;

        },
        // Continuation
        function() {
          assertNull('add a again', put_value);
          assertNotNull('error event', add_ev);
          if (db.getType() == 'indexeddb') {
            assertEquals('add fail with constrained error', 'ConstraintError', add_ev.name);
          } else if (db.getType() == 'websql') {
            assertEquals('add fail with constrained error', 6, add_ev.code);
          }

          reachedFinalContinuation = true;
          ydn.db.deleteDatabase(db_name, db.getType());
          db.close();

        },
        100, // interval
        1000); // maxTimeout

      db.add(store_name_inline_number, {id: key, value: '2', remark: 'add test'}).addCallback(function(value) {
        //console.log('receiving value callback ' + value);
        put_value = value;
        hasEventFired = true;
      }).addErrback(function(e) {
          put_value = null;
          add_ev = e;
          hasEventFired = true;
          // console.log(e);
        });
    },
    100, // interval
    1000); // maxTimeout


  db.add(store_name_inline_number, {id: key, value: '1', remark: 'add test'}).addBoth(function(value) {
    //console.log('receiving value callback ' + value);
    put_value = value;
    hasEventFired = true;
  });
};


var test_clear_store = function() {
  var db_name = 'test_40_clear_store';
  var schema = {
    stores: [{
      name: table_name,
      keyPath: 'id'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  db.put(table_name,
    [{id: 1}, {id: 2}, {id: 3}]
  );

  var done = false;
  var put_value;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      // clear success do not return any result and hence 'undefined'.
      //console.log('cleared');
      assertEquals('store cleared', 1, put_value);
      assertEquals('count in store', 0, count);
    },
    100, // interval
    1000); // maxTimeout

  // note, without this, preivous put and next clear method will go into
  // same transaction and will cause clearing the database happen
  // before inserting is complete.
  db.count(table_name).addBoth(function(value) {

  });

  var dfl = db.clear(table_name);
  dfl.addBoth(function(value) {
    put_value = value;
    done = true;
  });

  var count, recount;
  var countDone;
  waitForCondition(
    // Condition
    function() { return countDone; },
    // Continuation
    function() {
      assertEquals('count 0 after clear', 0, count);
      assertEquals('recount 0 after clear', 0, recount);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout

  db.count(table_name).addBoth(function(value) {
    count = value;
    db.close();
    db = new ydn.db.crud.Storage(db_name, schema, options);
    db.count(table_name).addBoth(function(value) {
      recount = value;
      countDone = true;
    });
  });

};




var test_list_by_ids = function() {
  var db_name = 'test_crud_23 _2';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var arr = [];
  var n = ydn.db.crud.req.IndexedDb.REQ_PER_TX * 2.5;
  for (var i = 0; i < n; i++) {
    arr.push({id: i, value: 'a' + Math.random()});
  }
  var ids = [2,
    ydn.db.crud.req.IndexedDb.REQ_PER_TX,
      ydn.db.crud.req.IndexedDb.REQ_PER_TX + 1,
      2 * ydn.db.crud.req.IndexedDb.REQ_PER_TX + 1];


  var hasEventFired = false;
  var results;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('length', ids.length, results.length);

      for (var i = 0; i < ids.length; i++) {
        assertObjectEquals('of ' + i, arr[ids[i]], results[i]);
      }

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout


  db.put(table_name, arr).addBoth(function(x) {
    db = new ydn.db.crud.Storage(db_name, schema, options);
    db.values(table_name, ids).addBoth(function(value) {
      //console.log('receiving value callback.');
      results = value;
      hasEventFired = true;
    });
  });

  db.close();
};



var tearDownPage = function() {

};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



