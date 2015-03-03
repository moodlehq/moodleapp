
goog.require('ydn.db.algo.NestedLoop');
goog.require('goog.testing.jsunit');
goog.require('ydn.debug');
goog.require('ydn.db.core.Storage');



var reachedFinalContinuation, schema, db, objs, animals;
var store_name = 't1';
var db_name = 'test_iteration_1';

var obj_schema = {
  stores: [
    {
      name: store_name,
      keyPath: 'id',
      type: 'TEXT',
      indexes: [{
        name: 'tag',
        type: 'TEXT',
        multiEntry: true
      }, {
        name: 'value',
        type: 'NUMERIC'
      }, {
        name: 'x',
        type: 'NUMERIC'
      }]
    }
  ]
};

var setUp = function() {

  // ydn.debug.log('ydn.db.crud', 'finest');
  // ydn.debug.log('ydn.db.core', 'finest');
  //ydn.db.core.req.IDBCursor.DEBUG = true;
  //ydn.db.Cursor.DEBUG = true;
  // ydn.db.core.DbOperator.DEBUG = true;

  objs = [
    {id:'qs0', value: 0, x: 1, tag: ['a', 'b']},
    {id:'qs1', value: 1, x: 2, tag: ['a']},
    {id:'at2', value: 2, x: 3, tag: ['a', 'b']},
    {id:'bs1', value: 3, x: 6, tag: ['b']},
    {id:'bs2', value: 4, x: 14, tag: ['a', 'c', 'd']},
    {id:'bs3', value: 5, x: 111, tag: ['c']},
    {id:'st3', value: 6, x: 600}
  ];

  animals = [
    {id: 'rat', color: 'brown', horn: 0, legs: 4},
    {id: 'cow', color: 'spots', horn: 1, legs: 4},
    {id: 'galon', color: 'gold', horn: 1, legs: 2},
    {id: 'snake', color: 'spots', horn: 0, legs: 0},
    {id: 'chicken', color: 'red', horn: 0, legs: 2}
  ];

  reachedFinalContinuation = false;
};

var tearDown = function() {

  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var load_basic = function(opt_db_name) {
  var db_name = opt_db_name || 'iterator-test-' + goog.now();
  var valueIndex = new ydn.db.schema.Index('value', ydn.db.schema.DataType.INTEGER, false, false);
  var xIndex = new ydn.db.schema.Index('x', ydn.db.schema.DataType.NUMERIC, false, false);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
    ydn.db.schema.DataType.TEXT, [valueIndex, xIndex]);

  var colorIndex = new ydn.db.schema.Index('color', ydn.db.schema.DataType.TEXT);
  var hornIndex = new ydn.db.schema.Index('horn', ydn.db.schema.DataType.TEXT);
  var legIndex = new ydn.db.schema.Index('legs', ydn.db.schema.DataType.TEXT);
  var anmialStore = new ydn.db.schema.Store('animals', 'id', false,
    ydn.db.schema.DataType.TEXT, [colorIndex, hornIndex, legIndex]);

  var schema = new ydn.db.schema.Database(undefined, [store_schema, anmialStore]);
  var db = new ydn.db.core.Storage(db_name, schema, options);

  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + 'store: ' + store_name + ' ready.');
  });


  db.put('animals', animals).addCallback(function (value) {
    console.log(db + 'store: animals ready.');
  });
  return db;
};


var load_default = function() {
  var indexSchema = new ydn.db.schema.Index('tag', ydn.db.schema.DataType.TEXT, false, true);
  var valueIndex = new ydn.db.schema.Index('value', ydn.db.schema.DataType.INTEGER, false, false);
  var xIndex = new ydn.db.schema.Index('x', ydn.db.schema.DataType.NUMERIC, false, false);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
    ydn.db.schema.DataType.TEXT, [valueIndex, indexSchema, xIndex]);

  var colorIndex = new ydn.db.schema.Index('color', ydn.db.schema.DataType.TEXT);
  var hornIndex = new ydn.db.schema.Index('horn', ydn.db.schema.DataType.TEXT);
  var legIndex = new ydn.db.schema.Index('legs', ydn.db.schema.DataType.TEXT);
  var anmialStore = new ydn.db.schema.Store('animals', 'id', false,
    ydn.db.schema.DataType.TEXT, [colorIndex, hornIndex, legIndex]);

  schema = new ydn.db.schema.Database(undefined, [store_schema, anmialStore]);
  var db = new ydn.db.core.Storage(db_name, schema, options);

  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + 'store: ' + store_name + ' ready.');
  });


  db.put('animals', animals).addCallback(function (value) {
    console.log(db + 'store: animals ready.');
  });
  return db;
};




var test_map_key_iterator = function() {

  var done;
  var streaming_keys = [];

  // for key iterator, the reference value is sorted primary key.
  var q = new ydn.db.KeyIterator(store_name);
  var actual_keys = objs.map(function(x) {return x.id;});
  actual_keys.sort();
  var db = load_default();
  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('streaming value', actual_keys, streaming_keys);
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout


  var req = db.map(q, function (key) {
    streaming_keys.push(key);
  });
  req.addCallback(function (result) {
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};


var test_map_value_iterator = function() {

  var done;
  var streaming_keys = [];

  // for value iterator, the reference value is record sorted by primary key.
  var actual_keys = objs;
  goog.array.sort(actual_keys, function(a, b) {
    return a.id > b.id ? 1 : -1;
  });
  var q = new ydn.db.ValueIterator(store_name);
  var db = load_basic();
  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('values', actual_keys, streaming_keys);
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout


  var req = db.map(q, function (key) {
    streaming_keys.push(key);
  });
  req.addCallback(function (result) {
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};

var test_map_index_key_iterator = function() {

  var done;
  var streaming_keys = [];

  // for index key iterator, the reference value is index key.
  var q = new ydn.db.IndexIterator(store_name, 'value');
  var actual_keys = objs.map(function(x) {return x.value;});
  var db = load_basic();
  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('streaming value', actual_keys, streaming_keys);
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout


  var req = db.map(q, function (key) {
    streaming_keys.push(key);
  });
  req.addCallback(function (result) {
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};


var test_map_index_value_iterator = function() {

  var done;
  var streaming_keys = [];

  // for index value iterator, the reference value is primary key.
  var actual_keys = objs.map(function(x) {return x.id;});
  var q = new ydn.db.IndexValueIterator(store_name, 'value');
  var db = load_basic();

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('streaming key', actual_keys, streaming_keys);
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


  var req = db.map(q, function (key) {
    streaming_keys.push(key);
  });
  req.addCallback(function (result) {
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};


//
//var test_42_map_skip = function() {
//
//  var done;
//  var streaming_keys = [];
//
//  var actual_index_keys = [0, 4, 5, 6];
//  var q = new ydn.db.IndexIterator(store_name, 'value');
//
//  waitForCondition(
//      // Condition
//      function () {
//        return done;
//      },
//      // Continuation
//      function () {
//        assertArrayEquals('streaming index', actual_index_keys, streaming_keys);
//
//        reachedFinalContinuation = true;
//      },
//      100, // interval
//      1000); // maxTimeout
//
//  var start = 3;
//  db = load_default();
//  var req = db.map(q, function (key) {
//    streaming_keys.push(key);
//    if (key < 3) {
//      return 4;
//    }
//  });
//  req.addCallback(function (result) {
//    done = true;
//  });
//  req.addErrback(function (e) {
//    console.log(e);
//    done = true;
//  });
//};
//
//
//var test_43_map_stop = function() {
//
//  var done;
//  var streaming_keys = [];
//  var streaming_values = [];
//
//  var actual_index_keys = [0, 1, 2, 3];
//  var q = new ydn.db.IndexIterator(store_name, 'value');
//
//  waitForCondition(
//      // Condition
//      function () {
//        return done;
//      },
//      // Continuation
//      function () {
//        assertArrayEquals('streaming index', actual_index_keys, streaming_keys);
//
//        reachedFinalContinuation = true;
//      },
//      100, // interval
//      1000); // maxTimeout
//
//  var start = 3;
//  db = load_default();
//  var req = db.map(q, function (key) {
//    streaming_keys.push(key);
//    if (key >= 3) {
//      return null;
//    }
//  });
//  req.addCallback(function (result) {
//    done = true;
//  });
//  req.addErrback(function (e) {
//    console.log(e);
//    done = true;
//  });
//};



var test_reduce = function() {

  var done, result;

  var sum = objs.reduce(function(p, x) {
    return p + x.value;
  }, 0);

  var q = new ydn.db.Iterator(store_name, 'value');

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertEquals('sum', sum, result);

        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  db = load_default();
  var req = db.reduce(q, function (prev, curr, index) {
    return prev + curr;
  }, 0);
  req.addCallback(function (x) {
    done = true;
    result = x;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};




var _test_join_primary = function() {
  var db_name = 'test_join_primary';
  var data = [
    {id: 0, a: 3, b: 'e'},
    {id: 1, a: 3, b: 'a'},
    {id: 2, a: 2, b: 'b'}, // result
    {id: 3, a: 2, b: 'c'},
    {id: 4, a: 2, b: 'b'}, // result
    {id: 5, a: 1, b: 'b'}
  ];
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      indexes: [{
        name: 'a'
      }, {
        name: 'b'
      }]
    }]
  };
  var db = new ydn.db.core.Storage(db_name, schema, options);
  db.clear('st');
  db.put('st', data);
  var done;
  var keys1 = [];
  var values1 = [];

  waitForCondition(
      function() {
        return done;
      },
      function() {
        assertArrayEquals('keys', [2, 4], keys1);
        assertArrayEquals('values', [data[2], data[4]], values1);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  var iter = new ydn.db.ValueIterator('st');
  iter = iter.join('st', 'a', 2);
  iter = iter.join('st', 'b', 'b');

  var req = db.open(function(cursor) {
    keys1.push(cursor.getPrimaryKey());
    values1.push(cursor.getValue());
  }, iter);
  req.addBoth(function(x) {
    done = true;
  });

};



var _test_join_index = function() {
  var db_name = 'test_join_index';
  var data = [
    {id: 0, a: 3, b: 'b'}, // result 3
    {id: 1, a: 3, b: 'a'},
    {id: 2, a: 2, b: 'b'}, // result 1
    {id: 3, a: 2, b: 'c'},
    {id: 4, a: 1, b: 'b'},
    {id: 5, a: 2, b: 'b'}, // result 2
    {id: 6, a: 4, b: 'b'}
  ];
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      indexes: [{
        name: 'a'
      }, {
        name: 'b'
      }]
    }]
  };

  var iter = ydn.db.IndexValueIterator.where('st', 'a', '>=', 2, '<', 4);
  iter = iter.join('st', 'b', 'b');

  var db = new ydn.db.core.Storage(db_name, schema, options);
  db.clear('st');
  db.put('st', data);
  var done;
  var keys1 = [];
  var values1 = [];

  waitForCondition(
      function() {
        return done;
      },
      function() {
        assertArrayEquals('keys', [['b', 2], ['b', 5], ['b', [3]]], keys1);
        assertArrayEquals('values', [data[2], data[5], data[0]], values1);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout


  var req = db.open(function(cursor) {
    keys1.push(cursor.getPrimaryKey());
    values1.push(cursor.getValue());
  }, iter);
  req.addBoth(function(x) {
    done = true;
  });

};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



