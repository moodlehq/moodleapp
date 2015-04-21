
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


var test_values_limit = function () {

  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', 3, result.length);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.Iterator(store_name);
  load_default(function (db) {
    db.values(q, 3).addBoth(function (value) {
      //console.log(db + ' fetch value: ' + JSON.stringify(value));
      result = value;
      done = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    });
  });
};


var test_values_resume = function () {

  var done;
  var result1, result2;
  waitForCondition(
      // Condition
      function() {
        return done;
      },
      // Continuation
      function() {
        assertArrayEquals('first iteration', objs.slice(0, 3), result1);
        assertArrayEquals('second iteration', objs.slice(3, 6), result2);

        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  load_default(function (db) {
    var q1 = new ydn.db.Iterator(store_name);
    db.values(q1, 3).addBoth(function(value) {
      result1 = value;
    });
    db.values(q1, 3).addBoth(function(value) {
      result2 = value;
      done = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    });
  });
};



var test_list_index = function () {

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

  var q = new ydn.db.IndexValueIterator(store_name, 'value');
  var objs = load_default(function (db) {
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
    return goog.array.defaultCompare(a.value, b.value);
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

var test_list_index_range = function () {

  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('result', [objs[1], objs[5], objs[2]], result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var range = ydn.db.KeyRange.bound('a', 'b');
  var q = new ydn.db.IndexValueIterator(store_name, 'value', range);
  load_default(function (db) {
    db.values(q).addBoth(function (value) {
      //console.log(db + ' fetch value: ' + JSON.stringify(value));
      //console.log(db.explain(q));
      result = value;
      done = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    });
  });
};


var test_keys_by_index = function () {
  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('result', objs.slice(0, 2).map(function(x) {return x.id}), result);
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var range = ydn.db.KeyRange.only('a');
  load_default(function (db) {
    db.keys(store_name, 'type', range, 100, 0).addBoth(function (x) {
      result = x;
      done = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    });
  });

};



var _test_order = function() {
  var db_name = 'test_order-2';
  var data = [
    {id: 1, a: 3, b: 'a'},
    {id: 2, a: 2, b: 'b'},
    {id: 3, a: 2, b: 'c'},
    {id: 4, a: 2, b: 'b'},
    {id: 5, a: 1, b: 'b'},
    {id: 6, a: 3, b: 'e'}
  ];
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      type: 'INTEGER',
      indexes: [{
        name: 'a',
        type: 'NUMERIC'
      }, {
        name: 'ba',
        keyPath: ['b', 'a']
      }]
    }]
  };
  var db = new ydn.db.core.Storage(db_name, schema, options);
  db.clear('st');
  db.put('st', data);
  var done, keys1, values1;
  var keys2, values2;

  waitForCondition(
      function() {
        return done;
      },
      function() {
        assertArrayEquals('restrict a = 2 keys', [2, 2, 2], keys1);
        assertArrayEquals('restrict a = 2 values', [data[1], data[2], data[3]], values1);
        assertArrayEquals('restrict b keys', [['b', 2], ['b', 2]], keys2);
        assertArrayEquals('restrict b values', [data[1], data[3]], values2);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  var iter = new ydn.db.ValueIterator('st');
  var iter1 = iter.order('a', 2);

  db.keys(iter1).addBoth(function(x) {
    keys1 = x;
  });
  db.values(iter1).addBoth(function(x) {
    values1 = x;
  });

  var iter2 = iter1.order('b', 'b');
  db.keys(iter2).addBoth(function(x) {
    keys2 = x;
  });
  db.values(iter2).addBoth(function(x) {
    values2 = x;
    done = true;
  });

};


var _test_order_index = function() {
  var db_name = 'test_order_index-2';
  var data = [
    {id: 1, a: 3, b: 'a', c: 1},
    {id: 2, a: 2, b: 'b', c: 1},
    {id: 3, a: 2, b: 'c', c: 1},
    {id: 4, a: 2, b: 'b', c: 2},
    {id: 5, a: 1, b: 'b', c: 2},
    {id: 6, a: 3, b: 'e', c: 2}
  ];
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      indexes: [{
        name: 'a'
      }, {
        name: 'ba',
        keyPath: ['b', 'a']
      }, {
        name: 'cba',
        keyPath: ['c', 'b', 'a']
      }]
    }]
  };
  var db = new ydn.db.core.Storage(db_name, schema, options);
  db.clear('st');
  db.put('st', data);
  var done;
  var keys3, values3;
  var keys4, values4;
  var keys5, values5;

  waitForCondition(
      function() {
        return done;
      },
      function() {
        assertArrayEquals('sorted by a keys', exp_keys3, keys3);
        assertArrayEquals('sorted by a values', exp_values3, values3);
        assertArrayEquals('sorted by a, restrict b keys', exp_keys4, keys4);
        assertArrayEquals('sorted by a, restrict b keys', exp_values4, values4);
        assertArrayEquals('sorted by a, restrict b, c keys', [[2, 'b', 1], [2, 'b', 2]], keys5);
        assertArrayEquals('sorted by a, restrict b, c values', [data[4], data[3]], values5);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  var exp_values3 = goog.array.clone(data);
  exp_values3.sort(function(a, b) {
    return a.a == b.a ? 0 : a.a > b.a ? 1 : -1;
  });
  var exp_keys3 = exp_values3.map(function(x) {
    return x.a;
  });
  var iter3 = new ydn.db.IndexValueIterator('st', 'a');
  db.keys(iter3).addBoth(function(x) {
    keys3 = x;
  });
  db.values(iter3).addBoth(function(x) {
    values3 = x;
  });
  var exp_keys4 = exp_values3.filter(function(x) {
    return x.b == 'b';
  }).map(function(x) {
        return [x.b, x.a];
      });
  var exp_values4 = exp_values3.filter(function(x) {
    return x.b == 'b';
  });
  var iter4 = iter3.order('b', 'b');
  db.keys(iter4).addBoth(function(x) {
    keys4 = x;
  });
  db.values(iter4).addBoth(function(x) {
    values4 = x;
  });

  var iter5 = iter4.order('c', 2);
  db.keys(iter5).addBoth(function(x) {
    keys5 = x;
  });
  db.values(iter5).addBoth(function(x) {
    values5 = x;
    done = true;
  });
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



