
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.debug');
goog.require('ydn.db.core.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, debug_console, schema, db, objs;
var store_name = 't1';
var db_name = 'test_cursor_4';

var setUp = function () {
   // ydn.debug.log('ydn.db', 'finest');
  // ydn.db.core.req.IDBCursor.DEBUG = true;
 // ydn.db.core.req.WebsqlCursor.DEBUG = true;
  //ydn.db.con.simple.Store.DEBUG = true;
  //ydn.db.core.DbOperator.DEBUG = true;
  //ydn.db.core.req.SimpleStore.DEBUG = true;
  //ydn.db.core.req.SimpleCursor.DEBUG = true;

  reachedFinalContinuation = false;

};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);

};


var df_cnt = 0;
var load_default = function(cb) {
  var db_name = 'test-df-' + (df_cnt++);
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
    {id: 10, value: 'c1', type: 'c', remark: 'test ' + Math.random()},
    {id: 11, value: 'a3', type: 'c', remark: 'test ' + Math.random()},
    {id: 20, value: 'ca', type: 'c', remark: 'test ' + Math.random()}
  ];

  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });

  if (cb) {
    cb(db);
  }

  return db;
};

var getData = function() {
  var objs = [
        {id:'qs0', value: 0, tag: ['a', 'b']},
        {id:'qs1', value: 1, tag: 'a'},
        {id:'at2', value: 2, tag: ['a', 'b']},
        {id:'bs1', value: 3, tag: 'b'},
        {id:'bs2', value: 4, tag: ['a', 'c', 'd']},
        {id:'bs3', value: 5, tag: ['c']},
        {id:'st3', value: 6}
      ];
  return JSON.parse(JSON.stringify(objs));
};


var df2_cnt = 0;
var load_default2 = function() {

  var db_name = 'index-test2-' + (df2_cnt++);
  var indexSchema = new ydn.db.schema.Index('tag', ydn.db.schema.DataType.TEXT, false, true);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
    ydn.db.schema.DataType.TEXT, [indexSchema]);
  schema = new ydn.db.schema.Database(undefined, [store_schema]);
  var db = new ydn.db.core.Storage(db_name, schema, options);

  var objs = getData();
  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });

  return db;
};



var test_multiEntry = function () {

  var objs = [
    {id: 0, tag: ['a', 'b']},
    {id: 1, tag: ['e']},
    {id: 2, tag: ['a', 'c']},
    {id: 3, tag: []},
    {id: 4, tag: ['c']},
    {id: 5}
  ];
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      indexes: [{
        keyPath: 'tag',
        multiEntry: true
      }]
    }]
  };
  var db = new ydn.db.core.Storage('test-me', schema, options);

  db.put('st', objs).addCallback(function(value) {
    console.log(db + ' ready', value);
  });

  // var tags = ['d', 'b', 'c', 'a', 'e'];
  // var exp_counts = [1, 3, 2, 4, 0];
  var tags = ['a', 'b', 'c', 'd'];
  var expected = [[0, 2], [0], [2, 4], []];
  var results = [];
  var total = tags.length;
  var done = 0;

  waitForCondition(
    // Condition
    function () {
      return done == total;
    },
    // Continuation
    function () {

      for (var i = 0; i < total; i++) {
        assertArrayEquals('for tag: ' + tags[i], expected[i], results[i]);
      }
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout


  var count_for = function (tag_name, idx) {
    var keyRange = ydn.db.KeyRange.only(tag_name);
    var q = new ydn.db.IndexIterator('st', 'tag', keyRange);

    db.values(q).addBoth(function (value) {
      console.log(tag_name + ' ==> ' + JSON.stringify(value));
      results[idx] = value;
      done++;
    });
  };

  for (var i = 0; i < total; i++) {
    count_for(tags[i], i);
  }

};


var test_keysBy_multiEntry_index_KeyIterator = function () {

  if (options.mechanisms[0] == 'websql') {
    // know issue.
    reachedFinalContinuation = true;
    return;
  }

  var db = load_default2();
  var done;
  var result;
  var keys = ['a', 'b', 'c', 'd'];
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertObjectEquals('result', keys, result);
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var q = new ydn.db.IndexIterator(store_name, 'tag', null, false, true);

  db.keys(q).addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });
};



var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



