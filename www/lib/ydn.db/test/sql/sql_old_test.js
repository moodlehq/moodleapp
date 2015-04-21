
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, schema, db, debug_console, objs;
var db_name = 'test_q_19';
var store_name = 'st';



var setUp = function() {
  if (!debug_console) {
    debug_console = new goog.debug.Console();
    debug_console.setCapturing(true);
    goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
    //goog.log.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.log.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINE);
    //goog.log.getLogger('ydn.db.con').setLevel(goog.debug.Logger.Level.FINEST);
    //goog.log.getLogger('ydn.db.req').setLevel(goog.debug.Logger.Level.FINEST);
  }
  //ydn.db.crud.req.IndexedDb.DEBUG = false;

  var indexSchema = new ydn.db.schema.Index('value', ydn.db.schema.DataType.TEXT, true);
  var typeIndex = new ydn.db.schema.Index('type', ydn.db.schema.DataType.TEXT, false);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
    ydn.db.schema.DataType.INTEGER, [indexSchema, typeIndex]);
  schema = new ydn.db.schema.Database(undefined, [store_schema]);
  db = new ydn.db.Storage(db_name, schema, options);

  objs = [
    {id: -3, value: 'ba', type: 'a', remark: 'test ' + Math.random()},
    {id: 0, value: 'a2', type: 'a', remark: 'test ' + Math.random()},
    {id: 1, value: 'b', type: 'b', remark: 'test ' + Math.random()},
    {id: 3, value: 'b1', type: 'b', remark: 'test ' + Math.random()},
    {id: 10, value: 'c', type: 'c', remark: 'test ' + Math.random()},
    {id: 11, value: 'a3', type: 'c', remark: 'test ' + Math.random()},
    {id: 20, value: 'ca', type: 'c', remark: 'test ' + Math.random()}
  ];

  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};




var test_11_cursor_constructor = function() {
  // test query constructor
  var lower = 1;
  var upper = 5;
  var q = new ydn.db.Iterator(store_name, 'next', 'id', lower, upper, false, true);
  assertEquals('store', store_name, q.store_name);
  assertEquals('index', 'id', q.index);
  assertEquals('direction', 'next', q.direction);
  assertNotNull(q.keyRange);
  assertEquals('lower', lower, q.keyRange.lower);
  assertEquals('upper', upper, q.keyRange.upper);
  assertFalse('lowerOpen', q.keyRange.lowerOpen);
  assertTrue('upperOpen', q.keyRange.upperOpen);

  var key_range = new ydn.db.KeyRange(lower, upper, false, true);
  q = new ydn.db.Iterator(store_name, 'next', 'id', key_range);
  assertNotNull(q.keyRange);
  assertEquals('lower', lower, q.keyRange.lower);
  assertEquals('upper', upper, q.keyRange.upper);
  assertFalse('lowerOpen', q.keyRange.lowerOpen);
  assertTrue('upperOpen', q.keyRange.upperOpen);


  q = new ydn.db.Iterator(store_name, 'next', 'id', key_range.toJSON());
  assertNotNull(q.keyRange);
  assertEquals('lower', lower, q.keyRange.lower);
  assertEquals('upper', upper, q.keyRange.upper);
  assertFalse('lowerOpen', q.keyRange.lowerOpen);
  assertTrue('upperOpen', q.keyRange.upperOpen);


  reachedFinalContinuation = true;
};


var test_12_query_where = function() {
  var lower = 1;
  var upper = 5;
  var query = new ydn.db.Sql().from(store_name);
  query = query.where('id', '>', lower);
  var cursor = query.toIdbQuery(schema);
  assertNotNull(cursor.keyRange);
  assertEquals('lower', lower, cursor.keyRange.lower);
  assertUndefined('upper', cursor.keyRange.upper);
  assertTrue('lowerOpen', cursor.keyRange.lowerOpen);

  query = new ydn.db.Sql().from(store_name);
  query = query.where('id', '>=', lower);
  cursor = query.toIdbQuery(schema);
  assertNotNull(cursor.keyRange);
  assertEquals('lower', lower, cursor.keyRange.lower);
  assertUndefined('upper', cursor.keyRange.upper);
  assertFalse('lowerOpen', cursor.keyRange.lowerOpen);

  query = new ydn.db.Sql().from(store_name);
  query = query.where('id', '<', lower);
  cursor = query.toIdbQuery(schema);
  assertNotNull(cursor.keyRange);
  assertEquals('upper', lower, cursor.keyRange.upper);
  assertUndefined('lower', cursor.keyRange.lower);
  assertTrue('upperOpen', cursor.keyRange.upperOpen);

  query = new ydn.db.Sql().from(store_name);
  query = query.where('id', '<=', lower);
  cursor = query.toIdbQuery(schema);
  assertNotNull(cursor.keyRange);
  assertEquals('upper', lower, cursor.keyRange.upper);
  assertUndefined('lower', cursor.keyRange.lower);
  assertFalse('upperOpen', cursor.keyRange.upperOpen);

  query = new ydn.db.Sql().from(store_name);
  query = query.where('id', '=', lower);
  cursor = query.toIdbQuery(schema);
  assertNotNull(cursor.keyRange);
  assertEquals('lower', lower, cursor.keyRange.lower);
  assertEquals('upper', lower, cursor.keyRange.upper);
  assertFalse('lowerOpen', cursor.keyRange.lowerOpen);
  assertFalse('upperOpen', cursor.keyRange.upperOpen);

  reachedFinalContinuation = true;
};

var test_13_query_where = function() {
  var lower = 1;
  var upper = 5;
  var query, cursor;

  query = new ydn.db.Sql().from(store_name);
  query = query.where('id', '>', lower, '<', upper);
  cursor = query.toIdbQuery(schema);
  assertNotNull(cursor.keyRange);
  assertEquals('lower', lower, cursor.keyRange.lower);
  assertEquals('upper', upper, cursor.keyRange.upper);
  assertTrue('lowerOpen', cursor.keyRange.lowerOpen);
  assertTrue('upperOpen', cursor.keyRange.upperOpen);

  query = new ydn.db.Sql().from(store_name);
  query = query.where('id', '>=', lower, '<=', upper);
  cursor = query.toIdbQuery(schema);
  assertNotNull(cursor.keyRange);
  assertEquals('lower', lower, cursor.keyRange.lower);
  assertEquals('upper', upper, cursor.keyRange.upper);
  assertFalse('lowerOpen', cursor.keyRange.lowerOpen);
  assertFalse('upperOpen', cursor.keyRange.upperOpen);

  reachedFinalContinuation = true;
};


var test_2_select = function() {

  var hasEventFired = false;
  var result;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('length', objs.length, result.length);
        for (var i = 0; i < objs.length; i++) {
          assertEquals('value ' + i, objs[i].value, result[i]);
        }
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout

  var q = new ydn.db.Sql().from(store_name);
  q.project('value');
  db.execute(q).addCallback(function (q_result) {
    //console.log(db.explain(q));
    //console.log('receiving query ' + JSON.stringify(q_result));
    result = q_result;
    hasEventFired = true;
  })

};


var test_3_count = function () {

  var hasEventFired = false;
  var put_value;

  waitForCondition(
    // Condition
    function () {
      return hasEventFired;
    },
    // Continuation
    function () {
      assertEquals('select query', objs.length, put_value);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout

  var q = new ydn.db.Sql().from(store_name);
  q.aggregate('COUNT');
  db.execute(q).addCallback(function (q_result) {
    //console.log('receiving query ' + JSON.stringify(q_result));
    //console.log(db.explain(q));
    put_value = q_result;
    hasEventFired = true;
  })

};


var test_4_sum = function() {


  var total = objs.reduce(function(prev, x) {
    return prev + x.id;
  }, 0);

  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('sum query', total, put_value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


    var q = new ydn.db.Sql().from(store_name);
    q.aggregate('sum', 'id');
    db.execute(q).addCallback(function(q_result) {
      //console.log('receiving query ' + JSON.stringify(q_result));
      put_value = q_result;
      hasEventFired = true;
    })

};



var test_4_average = function() {

  var total = objs.reduce(function(prev, x) {
    return prev + x.id;
  }, 0);
  var avg = total / objs.length;

  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertRoughlyEquals('sum query', avg, put_value, 0.001);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout



    var q = new ydn.db.Sql().from(store_name);
    q.aggregate('avg', 'id');
    db.execute(q).addCallback(function(q_result) {
      //console.log('receiving query ' + JSON.stringify(q_result));
      put_value = q_result;
      hasEventFired = true;
    })

};


/**
 *
 * @param {ydn.db.Sql} q
 * @param {Array} exp_result
 */
var where_test = function(q, exp_result) {

  var hasEventFired = false;
  var result;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('length: ' + JSON.stringify(result),
          exp_result.length, result.length);
        assertArrayEquals('when value = 1', exp_result, result);
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


    db.execute(q).addCallback(function(q_result) {
      //console.log('receiving when query ' + JSON.stringify(q_result));
      result = q_result;
      hasEventFired = true;
    })

};


var test_51_where_indexed_eq = function () {

  var q = new ydn.db.Sql().from(store_name);
  var idx = 2;
  q.where('id', '=', objs[idx].id);
  where_test(q, [objs[idx]]);
};

var test_52_where_indexed_gt = function () {

  var q = new ydn.db.Sql().from(store_name);
  var value = 10;
  var result = objs.filter_fn(function(x) {
    return x.id > value;
  });
  q.where('id', '>', value);
  where_test(q, result);
};

var test_53_where_indexed_gt_eq = function () {

  var q = new ydn.db.Sql().from(store_name);
  var value = 10;
  var result = objs.filter_fn(function(x) {
    return x.id >= value;
  });
  q.where('id', '>=', value);
  where_test(q, result);
};

var test_54_where_indexed_lt = function () {

  var q = new ydn.db.Sql().from(store_name);
  var value = 10;
  var result = objs.filter_fn(function(x) {
    return x.id < value;
  });
  q.where('id', '<', value);
  where_test(q, result);
};

var test_55_where_indexed_eq = function () {

  var q = new ydn.db.Sql().from(store_name);
  var value = 10;
  var result = objs.filter_fn(function(x) {
    return x.id == value;
  });
  q.where('id', '=', value);
  where_test(q, result);
};

var test_56_where_indexed_gt_lt = function () {

  var q = new ydn.db.Sql().from(store_name);
  var lower = 1;
  var upper = 10;
  var result = objs.filter_fn(function(x) {
    return x.id >= lower && x.id <= upper;
  });
  q.where('id', '>=', lower, '<=', upper);
  where_test(q, result);
};

var test_57_where_indexed_eq = function () {

  var q = new ydn.db.Sql().from(store_name);
  var value = 10;
  var result = objs.filter_fn(function(x) {
    return x.id >= value && x.id <= value;
  });
  q.where('id', '>=', value, '<=', value);
  where_test(q, result);
};

var test_61_where_eq = function () {

  var q = new ydn.db.Sql().from(store_name);
  var idx = 2;
  var arr = objs.filter_fn(function(x) {
    return x.type == objs[idx].type;
  });
  q.where('type', '=', objs[idx].type);
  where_test(q, arr);
};



var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



