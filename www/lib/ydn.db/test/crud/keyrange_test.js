
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.db.crud.Storage');
goog.require('ydn.debug');


var reachedFinalContinuation, schema, debug_console, db, objs;

var db_name = 'test_kr_6';
var store_name = 'st';

var setUp = function () {
  // ydn.debug.log('ydn.db', 'finest');

  objs = [
    {id: -3, value: 'a0',  remark: 'test ' + Math.random()},
    {id: 0, value: 'a2',  remark: 'test ' + Math.random()},
    {id: 1, value: 'ba',  remark: 'test ' + Math.random()},
    {id: 3, value: 'bc',  remark: 'test ' + Math.random()},
    {id: 10, value: 'c',  remark: 'test ' + Math.random()},
    {id: 11, value: 'c1', remark: 'test ' + Math.random()},
    {id: 20, value: 'ca', remark: 'test ' + Math.random()}
  ];

  db.clear(store_name);
  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + ' ready.');
  });

};


var setUpPage = function () {
  var value_index = new ydn.db.schema.Index('value', ydn.db.schema.DataType.TEXT, true);
  var store_schema = new ydn.db.schema.Store(store_name, 'id', false,
      ydn.db.schema.DataType.INTEGER, [value_index]);
  schema = new ydn.db.schema.Database(undefined, [store_schema]);
  db = new ydn.db.crud.Storage(db_name, schema, options);
};

var tearDown = function() {

  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var tearDownPage = function() {
  ydn.db.deleteDatabase(db.getName(), db.getType());
  db.close();
}


/**
 *
 * @param {ydn.db.KeyRange} key_range
 * @param {*} exp_result
 * @param {boolean=} reverse
 */
var keyRange_test = function (key_range, exp_result, reverse) {

  var done;
  var result;
  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals(JSON.stringify(key_range.toJSON()), exp_result, result);

      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  reverse = !!reverse;
  var req = db.values(store_name, key_range, undefined, undefined, reverse);
  req.addBoth(function (value) {
    //console.log(db + ' fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });

};



var test_integer_only = function () {
  var key_range = ydn.db.KeyRange.only(3);
  keyRange_test(key_range, objs.slice(3, 4));
};


var test_integer_lower_close = function () {
  var key_range = ydn.db.KeyRange.lowerBound(3);
  keyRange_test(key_range, objs.slice(3, objs.length));
};

var test_integer_lower_open = function () {
  var key_range = ydn.db.KeyRange.lowerBound(3, true);
  keyRange_test(key_range, objs.slice(4, objs.length));
};

var test_integer_upper_close = function () {
  var key_range = ydn.db.KeyRange.upperBound(3);
  keyRange_test(key_range, objs.slice(0, 4));
};

var test_integer_upper_open = function () {
  var key_range = ydn.db.KeyRange.upperBound(3, true);
  keyRange_test(key_range, objs.slice(0, 3));
};

var test_integer_close_close = function () {
  var key_range = ydn.db.KeyRange.bound(0, 3);
  keyRange_test(key_range, objs.slice(1, 4));
};

var test_integer_close_close_reverse = function () {
  var key_range = ydn.db.KeyRange.bound(0, 3);
  keyRange_test(key_range, objs.slice(1, 4).reverse(), true);
};

var test_integer_open_close = function () {
  var key_range = ydn.db.KeyRange.bound(0, 3, true);
  keyRange_test(key_range, objs.slice(2, 4));
};

var test_integer_open_open = function () {
  var key_range = ydn.db.KeyRange.bound(0, 3, true, true);
  keyRange_test(key_range, objs.slice(2, 3));
};


//var test_store_string_index_wise_revrse = function () {
//  keyRange_test(null, objs.reverse(), true);
//};



var test_query_start_with = function () {
  var store_name = 'ts1';
  var db_name = 'test_crud_6';

  // NOTE: key also need to be indexed.
  var indexSchema = new ydn.db.schema.Index('value', ydn.db.schema.DataType.NUMERIC, true);
  var stores = [new ydn.db.schema.Store(store_name, 'id', false, ydn.db.schema.DataType.TEXT, [indexSchema])];
  //schema.addStore(new ydn.db.schema.Store(store_name, 'id'));
  var schema = new ydn.db.schema.Database(undefined, stores);
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var objs = [
    {id:'qs1', value:Math.random()},
    {id:'qs2', value:Math.random()},
    {id:'qt', value:Math.random()}
  ];

  var put_value_received;
  var put_done;
  waitForCondition(
    // Condition
    function () {
      return put_done;
    },
    // Continuation
    function () {
      assertArrayEquals('put objs', [objs[0].id, objs[1].id, objs[2].id],
        put_value_received);

      var get_done;
      var get_value_received;
      waitForCondition(
        // Condition
        function () {
          return get_done;
        },
        // Continuation
        function () {
          reachedFinalContinuation = true;
        },
        100, // interval
        1000); // maxTimeout


      var key_range = ydn.db.KeyRange.starts('qs');
      db.values(store_name, key_range).addCallback(function (value) {
        console.log('fetch value: ' + JSON.stringify(value));
        assertEquals('obj length', objs.length - 1, value.length);
        assertObjectEquals('get', objs[0], value[0]);
        assertObjectEquals('get', objs[1], value[1]);

        get_done = true;
      });

    },
    100, // interval
    1000); // maxTimeout

  db.put(store_name, objs).addCallback(function (value) {
    console.log(['receiving value callback.', value]);
    put_value_received = value;
    put_done = true;
  });

};



var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



