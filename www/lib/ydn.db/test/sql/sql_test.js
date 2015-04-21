
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.debug');


var reachedFinalContinuation, schema, db, objs;
var db_name = 'test_sql_1';
var store_name = 'st';

var setUp = function() {

  // ydn.debug.log('ydn.db', 'finest');
  // ydn.db.core.req.SimpleCursor.DEBUG = true;
  //ydn.db.sql.req.WebSql.DEBUG = true;

  var index_x = new ydn.db.schema.Index('x', ydn.db.schema.DataType.NUMERIC, true);
  var indexSchema = new ydn.db.schema.Index('value', ydn.db.schema.DataType.TEXT, true);
  var typeIndex = new ydn.db.schema.Index('type', ydn.db.schema.DataType.TEXT, false);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
    ydn.db.schema.DataType.INTEGER, [index_x, indexSchema, typeIndex]);
  schema = new ydn.db.schema.Database(undefined, [store_schema]);
  db = new ydn.db.sql.Storage(db_name, schema, options);

  objs = [
    {id: 0, x: -1, value: 'ba', type: 'a', remark: 'test ' + Math.random()},
    {id: 1, x: 0, value: 'a2', type: 'a', remark: 'test ' + Math.random()},
    {id: 2, x: 2, value: 'b', type: 'b', remark: 'test ' + Math.random()},
    {id: 3, x: 3, value: 'b1', type: 'b', remark: 'test ' + Math.random()}
  ];

  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
  db.close();
};


var test_select_all = function() {

  var hasEventFired = false;
  var result;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertArrayEquals('all records', objs, result);

        reachedFinalContinuation = true;
      },
      100, // interval
      1000); // maxTimeout

  db.executeSql('SELECT * FROM "st"').addCallback(function (q_result) {
    //console.log(db.explain(q));
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};

var test_select_field = function() {

  var hasEventFired = false;
  var result;
  var actual_result = objs.map(function(x) {return x.value});
  actual_result.sort();

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      result.sort();
      assertArrayEquals('all records', actual_result, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout

  db.executeSql('SELECT value FROM "st"').addCallback(function (q_result) {
    //console.log(db.explain(q));
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};

var test_select_primary_field = function() {

  var hasEventFired = false;
  var result;
  var actual_result =  objs.map(function(x) {return x.id});

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      result.sort();
      assertArrayEquals('all records', actual_result, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout

  db.executeSql('SELECT "id" FROM "st"').addCallback(function (q_result) {
    //console.log(db.explain(q));
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};


var test_select_fields = function() {

  var hasEventFired = false;
  var result;
  var actual_result =  objs.map(function(x) {
    return {id: x.id, value: x.value};
  });

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      result.sort();
      assertArrayEquals('all records', actual_result, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout

  db.executeSql('SELECT id, "value" FROM "st"').addCallback(function (q_result) {
    //console.log(db.explain(q));
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};

var test_select_field_ordered = function() {

  var hasEventFired = false;
  var result;
  var actual_result = objs.map(function(x) {return x.value});
  actual_result.sort();

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertArrayEquals('all records', actual_result, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout

  db.executeSql('SELECT value FROM "st" ORDER BY value').addCallback(function (q_result) {
    //console.log(db.explain(q));
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};

var test_order_by = function() {

  var hasEventFired = false;
  var result;
  var actual_result = objs;
  actual_result.sort(function(a, b) {
    return a.value > b.value ? 1 : -1;
  });

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertArrayEquals('all records', actual_result, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  db.executeSql('SELECT * FROM "st" ORDER BY value').addCallback(function (q_result) {
    //console.log(db.explain(q));
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};

var test_select_field_order_by_other = function() {

  var hasEventFired = false;
  var result;
  var actual_result = objs.map(function(x) {return x.value});
  actual_result.sort(function(a, b) {
    return a.x > b.x ? 1 : -1;
  });

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertArrayEquals('all records', actual_result, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout

  db.executeSql('SELECT value FROM "st" ORDER BY x').addCallback(function (q_result) {
    //console.log(db.explain(q));
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};


var test_limit = function() {

  var hasEventFired = false;
  var result;
  var actual_result = objs.slice(0, 2);

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertArrayEquals('all records', actual_result, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout

  db.executeSql('SELECT * FROM "st" LIMIT 2').addCallback(function (q_result) {
    //console.log(db.explain(q));
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};


var test_limit_offset = function() {

  var hasEventFired = false;
  var result;
  var actual_result = objs.slice(1, 3);

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertArrayEquals('all records', actual_result, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout

  db.executeSql('SELECT * FROM "st" ORDER BY id LIMIT 2 OFFSET 1').addCallback(function (q_result) {
    //console.log(db.explain(q));
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};


var test_where = function() {

  var hasEventFired = false;
  var result;
  var exp_result = objs.slice(1, 3);

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      console.log([exp_result, result]);
      assertArrayEquals('all records', exp_result, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout

  db.executeSql('SELECT * FROM "st" WHERE x >= 0 AND x < 3').addCallback(function (q_result) {
    //console.log(db.explain(q));
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};

var test_count = function() {

  var hasEventFired = false;
  var result;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('all records', 4, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  db.executeSql('SELECT COUNT(*) FROM "st"').addCallback(function (q_result) {
    //console.log(db.explain(q));
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};

var test_count_where = function() {

  var hasEventFired = false;
  var result;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('all records', 2, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  db.executeSql('SELECT COUNT(*) FROM "st" where x > 0 AND x <= 3').addCallback(function (q_result) {
    //console.log(db.explain(q));
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};


var test_sum = function() {

  var hasEventFired = false;
  var result;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('sum', 6, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  db.executeSql('SELECT SUM(id) FROM "st"').addCallback(function (q_result) {
    //console.log(db.explain(q));
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};


var test_sum_where = function() {

  var hasEventFired = false;
  var result;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('sum', 5, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  db.executeSql('SELECT SUM(x) FROM "st" where x > 0 AND x <= 3').addCallback(function (q_result) {
    //console.log(db.explain(q));
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  });

};

var test_max = function() {

  var hasEventFired = false;
  var result;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('sum', 3, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  db.executeSql('SELECT MAX(x) FROM "st"').addCallback(function (q_result) {
    //console.log(db.explain(q));
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};

var test_min = function() {

  var hasEventFired = false;
  var result;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('sum', -1, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  db.executeSql('SELECT MIN(x) FROM "st"').addCallback(function (q_result) {
    //console.log(db.explain(q));
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};

var test_avg = function() {

  var hasEventFired = false;
  var result;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('avg', 1, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  db.executeSql('SELECT AVG(x) FROM "st"').addCallback(function (q_result) {
    //console.log(db.explain(q));
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



