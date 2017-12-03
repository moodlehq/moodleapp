
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.db');
goog.require('ydn.debug');

goog.require('ydn.db.core.Storage');


var reachedFinalContinuation, schema, objs;
var store_name = 't1';
var db_name = 'test_index_2';

var setUp = function () {

  // ydn.debug.log('ydn.db', 'finest');
  // ydn.db.core.req.SimpleStore.DEBUG  = true;
  // ydn.db.con.simple.Store.DEBUG = true;
  // ydn.db.con.WebSql.DEBUG = true;
  // ydn.db.crud.req.WebSql.DEBUG = true;
  //ydn.db.core.req.WebSql.DEBUG = true;
  //ydn.db.core.req.WebsqlCursor.DEBUG = true;
  //ydn.db.Cursor.DEBUG = true;

  reachedFinalContinuation = false;
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};



var load_default_cnt = 0;
var load_default = function(cb) {
  var db_name = 'test-default' + (load_default_cnt++);
  var indexSchema = new ydn.db.schema.Index('value', ydn.db.schema.DataType.TEXT, true);
  var typeIndex = new ydn.db.schema.Index('type', ydn.db.schema.DataType.TEXT, false);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
    ydn.db.schema.DataType.INTEGER, [indexSchema, typeIndex]);
  schema = new ydn.db.schema.Database(undefined, [store_schema]);
  var db = new ydn.db.core.Storage(db_name, schema, options);

  objs = [
    {id: -3, value: 'ba', type: 'a', remark: 'test ' + Math.random()},
    {id: 0, value: 'a2', type: 'a', remark: 'test ' + Math.random()},
    {id: 1, value: 'b', type: 'b', remark: 'test ' + Math.random()},
    {id: 3, value: 'b1', type: 'b', remark: 'test ' + Math.random()},
    {id: 10, value: 'c', type: 'c', remark: 'test ' + Math.random()},
    {id: 11, value: 'a3', type: 'c', remark: 'test ' + Math.random()},
    {id: 20, value: 'ca', type: 'c', remark: 'test ' + Math.random()}
  ];

  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
    cb(db);
  });
  return objs;
};



var test_values_index_resume = function () {

  var done;
  var result1, result2;
  waitForCondition(
      // Condition
      function() {
        return done;
      },
      // Continuation
      function() {
        assertArrayEquals('first iteration', [objs[4], objs[5]], result1);
        assertArrayEquals('second iteration', [objs[6]], result2);

        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  load_default(function(db) {
    var q1 = ydn.db.IndexValueIterator.where(store_name, 'type', '=', 'c');
    db.values(q1, 2).addBoth(function(value) {
      result1 = value;
    });
    db.values(q1, 2).addBoth(function(value) {
      result2 = value;
      done = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    });
  });
};


var test_values_index_resume_reverse = function () {

  var done;
  var result1, result2;
  waitForCondition(
      // Condition
      function() {
        return done;
      },
      // Continuation
      function() {
        assertArrayEquals('first iteration', [objs[6], objs[5]], result1);
        assertArrayEquals('second iteration', [objs[4]], result2);

        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  load_default(function(db) {
    var q1 = ydn.db.IndexValueIterator.where(store_name, 'type', '=', 'c');
    q1 = q1.reverse();
    db.values(q1, 2).addBoth(function(value) {
      result1 = value;
    });
    db.values(q1, 2).addBoth(function(value) {
      result2 = value;
      done = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    });
  });
};



var test_list_index_rev = function () {

  var done, result, objs;


  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', objs.length, result.length);
      assertArrayEquals(objs, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.IndexValueIterator(store_name, 'value', null, true);
  objs = load_default(function (db) {
    db.values(q).addBoth(function (value) {
      //console.log(db + ' fetch value: ' + JSON.stringify(value));
      //console.log(db.explain(q));
      result = value;
      done = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    });
  });
  goog.array.sort(objs, function(a, b) {
    return - goog.array.defaultCompare(a.value, b.value);
  });
};


var test_count_by_index_iterator = function () {

  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('result', 2, result);
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var range = ydn.db.KeyRange.only('a');
  var iter = new ydn.db.IndexIterator(store_name, 'type', range);
  load_default(function (db) {
    db.count(iter).addBoth(function (x) {
      result = x;
      done = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    });
  });
};



var test_date_index = function() {
  var db_name = 'test_date_index';
  var store_name = 's1';
  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      type: 'INTEGER',
      indexes: [{
        name: 'updated',
        type: 'DATE'
      }]
    }]
  };
  var db = new ydn.db.core.Storage(db_name, schema, options);

  var objs = [
    {id: 1, value: Math.random(), updated: new Date( "2013-04-11T13:14:00.000Z")},
    {id: 2, value: Math.random(), updated: new Date( "2013-04-11T13:15:00.000Z")},
    {id: 3, value: Math.random(), updated: new Date( "2013-04-11T13:16:00.000Z")}
  ];

  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });

  var done, result, reverse_result;

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {

        assertArrayEquals('ascending values', objs, result);
        assertArrayEquals('descending values', [objs[2], objs[1], objs[0]], reverse_result);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  db.values(store_name, 'updated', null, 10, 0).addBoth(function (x) {
    result = x;
  });
  db.values(store_name, 'updated', null, 10, 0, true).addBoth(function (x) {
    reverse_result = x;
    done = true;
  });
};





var test_remove_by_index_key_range = function() {

  var hasEventFired = false;
  var countValue;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('2 b', 2, countValue);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var range = ydn.db.KeyRange.bound('b', 'c', false, true);
  load_default(function (db) {
    db.remove(store_name, 'type', range).addBoth(function (value) {
      countValue = value;
      hasEventFired = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    });
  });

};



var test_count_by_iterator = function () {


  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('result', 3, result);
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  //var range = ydn.db.KeyRange.bound(1, 10);
  //var iter = new ydn.db.KeyIterator(store_name, range);
  var iter = ydn.db.KeyIterator.where(store_name, '>=', 1, '<=', 10);
  load_default(function (db) {
    db.count(iter).addBoth(function (x) {
      result = x;
      done = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    });
  });

};


var test_list_by_index = function () {

  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('result', objs.slice(0, 2), result);
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var range = ydn.db.KeyRange.only('a');
  load_default(function (db) {
    db.values(store_name, 'type', range, undefined, undefined).addBoth(function (x) {
      result = x;
      done = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    });
  });

};


var test_values = function() {
  var db_name = 'test_values-2';
  var db;
  var df = new goog.async.Deferred();


  var schema_1 = {
    stores: [
      {
        name: 'sii',
        keyPath: 'id',
        type: 'NUMERIC',
        indexes: [
          {name: 'name', type: 'TEXT'},
          {name: 'value', type: 'NUMERIC'},
          {name: 'tags', type: 'TEXT', multiEntry: true}
        ]
      }

    ]
  };
  var objs = [
    {test: 't' + Math.random(), value: 0, id: 0, name: 'a', tags: ['a', 'b']},
    {test: 't' + Math.random(), value: 2, id: 1, name: 'b', tags: ['x']},
    {test: 't' + Math.random(), value: 4, id: 2, name: 'ba', tags: ['z']},
    {test: 't' + Math.random(), value: 6, id: 3, name: 'bc', tags: ['a', 'd', 'c']},
    {test: 't' + Math.random(), value: 8, id: 4, name: 'bd', tags: ['e', 'c']},
    {test: 't' + Math.random(), value: 10, id: 5, name: 'c', tags: ['b']},
    {test: 't' + Math.random(), value: 12, id: 6, name: 'c', tags: ['a']}
  ];

  // persist store data.
  // we don't want to share this database connection and test database connection.
  (function() {
    var _db = new ydn.db.core.Storage(db_name, schema_1, options);
    _db.clear('sii');
    _db.put('sii', objs);

    _db.count('sii').addBoth(function() {
      df.callback();  // this ensure all transactions are completed
    });
    _db.close();
  })();

  var done, result1, result2, result3, result4, result5, result6, result7, result8;

  waitForCondition(
    function() {
      return done;
    },
    function() {
      assertArrayEquals('closed bound', objs.slice(1, 4), result1);
      assertArrayEquals('closed bound reverse', objs.slice(1, 4).reverse(), result2);
      assertArrayEquals('closed bound limit', objs.slice(1, 2), result3);
      assertArrayEquals('closed bound reverse limit', objs.slice(3, 4), result4);
      assertArrayEquals('lowerBound', objs.slice(2), result5);
      assertArrayEquals('open lowerBound', objs.slice(3), result6);
      assertArrayEquals('upperBound', objs.slice(0, 3), result7);
      assertArrayEquals('open upperBound', objs.slice(0, 2), result8);
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout

  df.addBoth(function() {
    db = new ydn.db.core.Storage(db_name, schema_1, options);
    var key_range = ydn.db.KeyRange.bound(1, 3);
    var q = new ydn.db.ValueIterator('sii', key_range);
    db.values(q).addBoth(function (x) {
      result1 = x;
    });

    key_range = ydn.db.KeyRange.bound(1, 3);
    q = new ydn.db.ValueIterator('sii', key_range, true);
    db.values(q).addBoth(function (x) {
      result2 = x;
    });

    key_range = ydn.db.KeyRange.bound(1, 3);
    q = new ydn.db.ValueIterator('sii', key_range);
    db.values(q, 1).addBoth(function (x) {
      result3 = x;
    });

    key_range = ydn.db.KeyRange.bound(1, 3);
    q = new ydn.db.ValueIterator('sii', key_range, true);
    db.values(q, 1).addBoth(function (x) {
      result4 = x;
    });

    key_range = ydn.db.KeyRange.lowerBound(2);
    q = new ydn.db.ValueIterator('sii', key_range);
    db.values(q).addBoth(function (x) {
      result5 = x;
    });

    key_range = ydn.db.KeyRange.lowerBound(2, true);
    q = new ydn.db.ValueIterator('sii', key_range);
    db.values(q).addBoth(function (x) {
      result6 = x;
    });

    key_range = ydn.db.KeyRange.upperBound(2);
    q = new ydn.db.ValueIterator('sii', key_range);
    db.values(q).addBoth(function (x) {
      result7 = x;
    });

    key_range = ydn.db.KeyRange.upperBound(2, true);
    q = new ydn.db.ValueIterator('sii', key_range);
    db.values(q).addBoth(function (x) {
      result8 = x;
      done = true;
    });
  });

};



var test_values_store_reverse = function () {

  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', objs.length, result.length);
      assertArrayEquals(objs.reverse(), result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.Iterator(store_name, undefined, null, true);
  load_default(function (db) {
    db.values(q).addBoth(function (value) {
      //console.log(db + ' fetch value: ' + JSON.stringify(value));
      result = value;
      done = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    });
  });
};


var test_values_store_range = function () {

  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('result', objs.slice(2, 5), result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  load_default(function (db) {
    db.values(store_name, ydn.db.KeyRange.bound(1, 10)).addBoth(function (value) {
      //console.log(db + ' fetch value: ' + JSON.stringify(value));
      result = value;
      done = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    });
  });
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



