
goog.require('goog.debug.Console');
goog.require('ydn.db.algo.NestedLoop');
goog.require('ydn.db.algo.ZigzagMerge');
goog.require('ydn.db.algo.SortedMerge');
goog.require('goog.testing.jsunit');
goog.require('ydn.debug');
goog.require('ydn.db.core.Storage');



var reachedFinalContinuation;


var setUp = function() {
  // ydn.debug.log('ydn.db.core', 'finest');
  //ydn.db.core.req.WebsqlCursor.DEBUG = true;
  // ydn.db.core.req.IDBCursor.DEBUG = true;
  // ydn.db.core.DbOperator.DEBUG = true;
  //ydn.db.crud.req.IndexedDb.DEBUG = true;
  //ydn.db.con.WebSql.DEBUG = true;
  //ydn.db.core.req.CachedWebsqlCursor.DEBUG = true;

  reachedFinalContinuation = false;
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


/**
 * Query for
 * SELECT id WHERE first = 'B' AND last = 'M'
 */
var test_scan_reference_value = function() {

  var db_name = 'test_algo_scan_3';
  var store_name = 'test_scan_reference_value';
  var objs = [
    {id: 0, first: 'A', last: 'M', age: 20},
    {id: 1, first: 'B', last: 'M', age: 24},
    {id: 2, first: 'B', last: 'L', age: 16},
    {id: 3, first: 'D', last: 'P', age: 49},
    {id: 4, first: 'B', last: 'M', age: 21}
  ];

  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      type: 'INTEGER',
      indexes: [{
        name: 'first',
        keyPath: 'first',
        type: 'TEXT'
      }, {
        name: 'last',
        keyPath: 'last',
        type: 'TEXT'
      }]
    }]
  };
  var db = new ydn.db.core.Storage(db_name, schema, options);

  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + 'store: ' + store_name + ' ready.');
  });


  var done;
  var result_keys = [];
  // sorted by primary key
  var results = [1, 4];

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('result', results, result_keys);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  var q1 = new ydn.db.IndexIterator(store_name, 'first', ydn.db.KeyRange.only('B'));
  var q2 = new ydn.db.IndexIterator(store_name, 'last', ydn.db.KeyRange.only('M'));

  var solver = function(keys, values) {
    console.log(JSON.stringify(keys) + ':' + JSON.stringify(values));
    if (keys.some(function(x) {return !goog.isDefAndNotNull(x)})) {
      return []; // done;
    }
    var a = values[0];
    var b = values[1];
    var cmp = ydn.db.cmp(a, b);
    if (cmp == 0) {
      //console.log('get match at ' + a + ' : ' + values[0]);
      result_keys.push(values[0]);
      return {advance: [1, 1]};
    } else if (cmp == 1) {
      return {'continuePrimary': [undefined, a]};
    } else {
      return {'continuePrimary': [b, undefined]};
    }
  };

  var req = db.scan(solver, [q1, q2]);

  req.addCallback(function (result) {
    //console.log(result);
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};


/**
 * Query for
 * SELECT id WHERE first = 'B' AND last = 'M'
 * using only advance vector
 */
var test_scan_advance = function() {

  var db_name = 'test_scan_advance_1';
  var store_name = 'st';
  var objs = [
    {id: 0, first: 'A', last: 'M', age: 20},
    {id: 1, first: 'B', last: 'M', age: 24},
    {id: 2, first: 'B', last: 'L', age: 16},
    {id: 3, first: 'D', last: 'P', age: 49},
    {id: 4, first: 'B', last: 'M', age: 21}
  ];

  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      type: 'INTEGER',
      indexes: [{
        keyPath: 'first',
        type: 'TEXT'
      }, {
        keyPath: 'last',
        type: 'TEXT'
      }]
    }]
  };
  var db = new ydn.db.core.Storage(db_name, schema, options);

  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    // console.log(db + 'store: ' + store_name + ' ready.');
  });
  db.values(store_name).addCallback(function (value) {
    // console.log(value);
    console.log(db + 'store: ' + store_name + ' has ' + value.length + ' records.');
  });

  var done;
  var result_keys = [];
  // sorted by primary key
  var results = [1, 4];

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('result', results, result_keys);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  var q1 = new ydn.db.IndexIterator(store_name, 'first', ydn.db.KeyRange.only('B'));
  var q2 = new ydn.db.IndexIterator(store_name, 'last', ydn.db.KeyRange.only('M'));

  var solver = function (keys, values) {
    var out;
    // console.log(keys, values);
    if (keys[0] != null) {
      if (values[1] != null && ydn.db.cmp(values[0], values[1]) == 0) {
        result_keys.push(values[0]); // we got the matching primary key.
      }
      if (keys[1] != null) {
        //console.log('advance one step to inner loop')
        out = {advance: [null, 1]}; // iterate on inner loop
      } else {
        //console.log('advance one step to outer loop and restart inner loop')
        out = {
          advance: [1, undefined], // iterate on outer loop
          restart: [undefined, true] // restart on inner loop
        };
      }
    } else {
      //console.log('scanning done')
      out = []; // no more iteration. we are done.
    }

    // console.log(keys+ ' ' + values + ' ' + JSON.stringify(out));
    return out;
  };

  var req = db.scan(solver, [q1, q2]);

  req.addCallback(function (result) {
    //console.log(result);
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};

/**
 * Query for
 * SELECT age WHERE first = 'B' AND last = 'M' ORDER BY age
 */
var test_index_values = function() {

  var db_name = 'test_scan_effective_key_4';
  var store_name = 'st';
  var objs = [
    {id: 0, first: 'A', last: 'M', age: 20},
    {id: 1, first: 'B', last: 'M', age: 24},
    {id: 2, first: 'B', last: 'L', age: 16},
    {id: 3, first: 'D', last: 'P', age: 49},
    {id: 4, first: 'B', last: 'M', age: 21}
  ];

  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      type: 'INTEGER',
      indexes: [
        {
          name: 'first-age',
        keyPath: ['first', 'age']
      }, {
          name: 'last-age',
        keyPath: ['last', 'age']
      }]
    }]
  };
  var db = new ydn.db.core.Storage(db_name, schema, options);
  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    // console.log(db + 'store: ' + store_name + ' ready.');
  });


  var done;
  var result_keys = [];
  // sorted by primary key
  var results = [2, 4, 1];

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('result', results, result_keys);
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout

  var q2 = new ydn.db.IndexIterator(store_name, 'first-age', ydn.db.KeyRange.starts(['B']));

  db.values(q2).addBoth(function (x) {
    result_keys = x;
    done = true;
  });
};


/**
 * Query for
 * SELECT age WHERE first = 'B' AND last = 'M' ORDER BY age
 */
var test_scan_effective_key_dual = function() {

  var db_name = 'test_scan_effective_key_dual';
  var store_name = 'st';
  var objs = [
    {id: 0, first: 'A', last: 'M', age: 20},
    {id: 1, first: 'B', last: 'M', age: 24},
    {id: 2, first: 'B', last: 'L', age: 16},
    {id: 3, first: 'D', last: 'P', age: 49},
    {id: 4, first: 'B', last: 'M', age: 21}
  ];

  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      type: 'INTEGER',
      indexes: [
        {
          name: 'first-age',
          keyPath: ['first', 'age']
        }, {
          name: 'last-age',
          keyPath: ['last', 'age']
        }]
    }]
  };
  var db = new ydn.db.core.Storage(db_name, schema, options);
  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + 'store: ' + store_name + ' ready.');
  });


  var done;
  var result_keys = [];
  // sorted by primary key
  var results = [4, 1];

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('result', results, result_keys);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  var q1 = new ydn.db.IndexIterator(store_name, 'first-age', ydn.db.KeyRange.starts(['B']));
  var q2 = new ydn.db.IndexIterator(store_name, 'last-age', ydn.db.KeyRange.starts(['M']));

  var max = 100;
  var cnt = 0;
  var solver = function (keys, values) {
    var out;
    var some_null = keys.some(function (x) {
      return !goog.isDefAndNotNull(x)
    });
    if (some_null) {
      out = []; // done;
    } else if (cnt++ > max) {
      out = []; // break
    } else {
      var a = keys[0][1];
      var b = keys[1][1];
      var cmp = ydn.db.cmp(a, b);
      if (cmp == 0) {
        //console.log('get match at ' + a + ' : ' + values[0]);
        result_keys.push(values[0]);
        out = [true, true];
      } else if (cmp == 1) {
        var next_pos = [keys[1][0], a];
        out = {'continue': [undefined, next_pos]};
      } else {
        var next_pos = [keys[0][0], b];
        out = {'continue': [next_pos, undefined]};
      }
    }
    console.log(keys + ' ' + values + ' ' + JSON.stringify(out));
    return out;
  };

  var req = db.scan(solver, [q1, q2]);

  req.addCallback(function (result) {
    //console.log(result);
    done = true;
  });
  req.addErrback(function (e) {
    console.log(e);
    done = true;
  });
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



