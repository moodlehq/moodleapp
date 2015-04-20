
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

};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};



var test_put_array = function() {
  var db_name = 'test_131';
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  };
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


  db.put('st', arr).addBoth(function(value) {
    //console.log('receiving value callback.');
    results = value;
    hasEventFired = true;
  });
};




var test_put_array_unique_constraint = function() {
  var db_name = 'test_12_put_array_unique_constraint-4';
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      indexes: [
        {
          keyPath: 'type',
          unique: true,
          type: 'INTEGER'
        }]
    }]
  };
  var data1 = [{
    id: 1,
    type: 1,
    value: 'a'
  }, {
    id: 2,
    type: 2,
    value: 'b'
  }];
  var data2 = [{
    id: 1, // void unique constraint
    type: 3,
    value: 'c'
  }, {
    id: 4,
    type: 4,
    value: 'd'
  }];

  // console.log(data);
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var hasEventFired = false;
  var results1, results2, is_success;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('correct length for results1', 2, results1.length);
        assertEquals('correct length for results2', 2, results2.length);
        assertArrayEquals('results1', [1, 2], results1);
        assertEquals('results2 last', 4, results2[1]);
        assertFalse('has error', is_success);
        assertEquals('error record', 'ConstraintError', results2[0].name);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout

  db.clear('st');
  db.add('st', data1).addCallbacks(function(x) {
    // console.log(x);
    results1 = x;
  }, function(value) {
    // console.log(value);
    results1 = value;
  });
  db.add('st', data2).addCallbacks(function(x) {
    // console.log(x);
    is_success = true;
    results2 = x;
    hasEventFired = true;
  }, function(value) {
    // console.log(value);
    is_success = false;
    results2 = value;
    hasEventFired = true;
  });
};



var test_put_array_unique_index_constraint = function() {

  // Chrome bug report
  // https://code.google.com/p/chromium/issues/detail?id=258273

  var db_name = 'test_12_put_array_unique_index_constraint-4';
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      indexes: [
        {
          keyPath: 'type',
          unique: true,
          type: 'INTEGER'
        }]
    }]
  };
  var data1 = [{
    id: 1,
    type: 1,
    value: 'a'
  }, {
    id: 2,
    type: 2,
    value: 'b'
  }];
  var data2 = [{
    id: 3,
    type: 1, // void unique constraint
    value: 'c'
  }, {
    id: 4,
    type: 4,
    value: 'd'
  }];

  // console.log(data);
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var hasEventFired = false;
  var results1, results2, keys, is_success;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        db.getSchema(function(s) {
          console.log(s);
        });
        assertEquals('correct length for results1', 2, results1.length);
        assertEquals('correct length for results2', 2, results2.length);
        assertArrayEquals('results1', [1, 2], results1);
        assertFalse('has error', is_success);
        assertArrayEquals('keys', [1, 2, 4], keys);
        assertEquals('results2 last', 4, results2[1]);
        assertEquals('error record', 'ConstraintError', results2[0].name);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout

  db.clear('st');
  db.put('st', data1).addCallbacks(function(x) {
    // console.log(x);
    results1 = x;
  }, function(value) {
    // console.log(value);
    results1 = value;
  });
  db.put('st', data2).addCallbacks(function(x) {
    console.log(x);
    is_success = true;
    results2 = x;
  }, function(value) {
    console.log(value);
    is_success = false;
    results2 = value;
  });
  db.keys('st').addBoth(function(x) {
    keys = x;
    hasEventFired = true;
  });
};



var _test_put_large_array = function() {
  var db_name = 'test_crud_ 13_2';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var arr = [];
  var n = 1500;
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

        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout


  db.put(table_name, arr).addBoth(function(value) {
    console.log('receiving value callback.');
    results = value;
    hasEventFired = true;
  });
};




var _test_get_large_array = function() {
  var db_name = 'test_crud_23 _2';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var arr = [];
  var ids = [];
  var n = 1500;
  for (var i = 0; i < n; i++) {
    ids[i] = i;
    arr[i] = {id: i, value: 'a' + Math.random()};
  }

  var hasEventFired = false;
  var results;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('length', ids.length, results.length);
        var cids = [0, 500, 1000, 1450];
        for (var i = 0; i < cids.length; i++) {
          var id = cids[i];
          assertEquals('of ' + id, arr[id].value, results[id].value);
        }

        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout

  db.put(table_name, arr);

  db.values(table_name, ids).addBoth(function(value) {
    //console.log('receiving value callback.');
    results = value;
    hasEventFired = true;
  });
};


var test_get_all_no_data = function() {

  var db_name = 'test_get_all_2';
  var table_name = 'no_data_table';

  var stores = [new ydn.db.schema.Store(table_name, 'id')];
  var schema = new ydn.db.schema.Database(1, stores);
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var hasEventFired = false;
  var put_value;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertArrayEquals('get empty table', [], put_value);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout

  db.values(table_name).addBoth(function(value) {
    //console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  });
};


var test_get_none_exist = function() {
  var db_name = 'test_25_get_none_exist';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var hasEventFired = false;
  var put_value;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertUndefined('retriving non existing value', put_value);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout


  db.get(table_name, 'no_data').addBoth(function(value) {
    // console.log(value);
    put_value = value;
    hasEventFired = true;
  });
};


var test_array_key = function() {
  var db_name = 'test_51_array_key_1';

  var stores = [new ydn.db.schema.Store(table_name, 'id')];
  var schema = new ydn.db.schema.Database(undefined, stores);
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var key = ['a', 'b'];

  var key_value = 'a' + Math.random();

  var a_done;
  var a_value;
  waitForCondition(
    // Condition
    function() {
      return a_done;
    },
    // Continuation
    function() {
      assertArrayEquals('put a', key, a_value);

      var b_done;
      var b_value;
      waitForCondition(
        // Condition
        function() {
          return b_done;
        },
        // Continuation
        function() {
          assertEquals('get ' + JSON.stringify(key), key_value, b_value.value);
          reachedFinalContinuation = true;
          ydn.db.deleteDatabase(db_name, db.getType());
          db.close();
        },
        100, // interval
        2000); // maxTimeout


      db.get(table_name, key).addBoth(function(value) {
        //console.log(db + ' receiving get value callback ' + key + ' = ' + value);
        b_value = value;
        b_done = true;
      });
    },
    100, // interval
    1000); // maxTimeout

  db.put(table_name, {id: key, value: key_value}).addBoth(function(value) {
    // console.log(db + ' receiving put value callback for ' + key + ' = ' + key_value);
    a_value = value;
    a_done = true;
  });


};




var test_constrained_error = function() {
  var db_name = 'test_constrained_error' + Math.random();
  var schema = {
    stores: [
      {
        name: 'st',
        keyPath: 'id',
        type: 'TEXT'
      }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  var obj = {id: 1, value: 'v' + Math.random()};

  var done, result, result2;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('key', 1, result);
      assertNotNullNorUndefined('is an error', result2);
      if (options.mechanisms[0] == 'websql') {
        assertEquals('is an ConstraintError', 6, result2.code);
      } else {
        assertEquals('is an ConstraintError', 'ConstraintError', result2.name);
      }

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout

  db.add('st', obj).addBoth(function(k) {
    result = k;
  });
  db.add('st', obj).addBoth(function(x) {
    result2 = x;
    done = true;
  });
};


var tearDownPage = function() {

};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



