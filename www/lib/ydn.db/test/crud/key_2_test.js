
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.crud.Storage');
goog.require('ydn.db.schema.DataType');
goog.require('ydn.db');
goog.require('ydn.debug');
goog.require('ydn.testing');


var reachedFinalContinuation, basic_schema;

var string_table = 't1';
var number_table = 't2';
var date_table = 't3';
var array_table = 't4';
var out_of_line_store = 't5';


var setUp = function() {
  // ydn.debug.log('ydn.db.crud.req', 'finest');

  reachedFinalContinuation = false;
};

var tearDown = function() {

  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var getBasicSchema = function () {
  var s1 = new ydn.db.schema.Store(string_table, 'id');
  var s2 = new ydn.db.schema.Store(number_table, 'id', false,
      ydn.db.schema.DataType.NUMERIC);
  var s3 = new ydn.db.schema.Store(date_table, 'id', false,
      ydn.db.schema.DataType.DATE);
  var s4 = new ydn.db.schema.Store(array_table, 'id', false,
      ydn.db.schema.DataType.ARRAY);
  var s5 = new ydn.db.schema.Store(out_of_line_store, undefined,  false);
  basic_schema = new ydn.db.schema.Database(undefined, [s1, s2, s3, s4, s5]);
  return basic_schema;
};



var key_test = function(db, key, table_name, callback) {
  var db_name = 'key-test' + Math.random();
  table_name = table_name || string_table;
  //console.log('testing ' + key + ' on ' + table_name);
  var key_value = 'a' + Math.random();
  var a_done;
  var a_value;
  waitForCondition(
      // Condition
      function() { return a_done; },
      // Continuation
      function() {
        assertEquals('put a', key, a_value);
      },
      100, // interval
      2000); // maxTimeout

  db.put(table_name, {id: key, value: key_value}).addCallback(function(value) {
    //console.log(db + ' receiving put value callback for ' + key + ' = ' + key_value);
    a_value = value;
    a_done = true;
  });

  var b_done;
  var b_value;
  waitForCondition(
      // Condition
      function() { return b_done; },
      // Continuation
      function() {
        assertEquals('get', key_value, b_value.value);

        if (callback) {
          callback(true);
        }
      },
      100, // interval
      5000); // maxTimeout

  db.close();
  db.get(table_name, key).addCallback(function(value) {
    // console.log(db + ' receiving get value callback ' + key + ' = ' + JSON.stringify(value));
    b_value = value;
    b_done = true;
  });
};



var test_13_array_key = function () {
  var store_name = 'st';
  var db_name = 'test_13_array_key';

  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id'
    }]
  };

  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var objs = [
    {id:['a', 'qs0'], value:0, type:'a'},
    {id:['a', 'qs1'], value:1, type:'a'}
  ];

  db.put(store_name, objs).addCallback(function (value) {
    //console.log(db_name + ' ready');
  });

  var done, result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertArrayEquals('result', objs, result);
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    5000); // maxTimeout


  db.values(store_name).addBoth(function (value) {
    // console.log('fetch value: ' + JSON.stringify(value));
    result = value;
    done = true;
  });

};




var test_40_nested_keyPath = function() {
  var store_name = 'ts1';
  var db_name = 'test_key_40_4';
  var store = new ydn.db.schema.Store(store_name, 'id.$t', false, ydn.db.schema.DataType.TEXT);
  var schema = new ydn.db.schema.Database(undefined, [store]);

  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var key = 'a';
  var put_done = false;
  var put_value = {value: Math.random()};
  put_value.id = {$t: key};
  var put_value_received;

  waitForCondition(
    // Condition
    function() { return put_done; },
    // Continuation
    function() {
      assertEquals('put a 1', key, put_value_received);
      // Remember, the state of this boolean will be tested in tearDown().
    },
    100, // interval
    5000); // maxTimeout

  db.put(store_name, put_value).addCallback(function(value) {
    console.log('put: ' + value);
    put_value_received = value;
    put_done = true;
  });

  var get_done;
  var get_value_received;
  waitForCondition(
    // Condition
    function() { return get_done; },
    // Continuation
    function() {
      assertObjectEquals('get', put_value, get_value_received);
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    5000); // maxTimeout


  db.get(store_name, key).addCallback(function(value) {
    console.log('receiving get value callback ' + key + ' = ' + JSON.stringify(value) + ' ' + typeof value);
    get_value_received = value;
    get_done = true;
  });

};


var test_42_autoincreasement_offline = function () {
  var store_name = 'demoOS';
  var db_name = 'test_42_26';
  var schema = {
    stores: [
      {
        name: store_name,
        autoIncrement: true
      }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var objs = [
    {id:'qs0', value:0, type:'a'},
    {id:'qs1', value:1, type:'a'},
    {id:'at2', value:2, type:'b'},
    {id:'bs1', value:3, type:'b'},
    {id:'bs2', value:4, type:'c'},
    {id:'bs3', value:5, type:'c'},
    {id:'st3', value:6, type:'c'}
  ];


  var done, result, put_done, put_result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', objs.length, result.length);
      assertArrayEquals('get back', objs, result);
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    5000); // maxTimeout

  waitForCondition(
    // Condition
    function () {
      return put_done;
    },
    // Continuation
    function () {
      assertEquals('key length', objs.length, put_result.length);
      for (var i = 1; i < objs.length; i++) {
        assertEquals('auto increase at ' + i, put_result[i], put_result[i-1] + 1);
      }

      // retrieve back by those key

      db.values(store_name, put_result).addBoth(function (value) {
        //console.log('fetch value: ' + JSON.stringify(value));
        result = value;
        done = true;
      });
    },

    100, // interval
    2000); // maxTimeout

  db.put(store_name, objs).addCallback(function (value) {
    //console.log(['receiving key from put', value]);
    put_done = true;
    put_result = value
  });
};


var test_43_autoincreasement_inline = function () {
  var store_name = 'demoOS';
  var db_name = 'test_key_43_5';
  var store_schema = new ydn.db.schema.Store(store_name, 'value', true,
      ydn.db.schema.DataType.INTEGER);
  var schema = new ydn.db.schema.Database(undefined, [store_schema]);
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var objs = [
    {id:'qs0', value:0, type:'a'},
    {id:'bs1', type:'b'},
    {id:'bs2', value:4, type:'c'},
    {id:'st3', type:'c'}
  ];

  var done, result, put_done, keys;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('length', objs.length, result.length);
      for (var i = 0; i < objs.length; i++) {
        assertEquals('obj ' + i, objs[i].id, result[i].id);
      }
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
      reachedFinalContinuation = true;
    },
    100, // interval
    5000); // maxTimeout

  waitForCondition(
    // Condition
    function () {
      return put_done;
    },
    // Continuation
    function () {
      assertEquals('key length', objs.length, keys.length);
      for (var i = 0; i < keys.length; i++) {
        assertNotNullNorUndefined('at ' + i, keys[i]);
        if (goog.isDef(objs[i].value)) {
          assertEquals('at ' + i, objs[i].value, keys[i]);
        }
      }

      // retrieve back by those key

      db.values(store_name, keys).addBoth(function (value) {
        //console.log('fetch value: ' + JSON.stringify(value));
        result = value;
        done = true;
      });
    },

    100, // interval
    5000); // maxTimeout


  // last two are given different value
  db.put(store_name, objs).addCallback(function (value) {
    //console.log(['receiving key from put', value]);
    keys = value;
    put_done = true;
  }).addErrback(function(e) {
        console.error(e);
        keys = [];
        put_done = true;
      });
};


var test_composite_primary_key = function () {

  var db_name = 'test_composite_primary_key';
  var schema = {
    stores: [
      {
        name: 'st',
        keyPath: ['id1', 'id2']
      }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  var done, result;

  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        assertObjectEquals('get result', data, result);

        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  var data = {
    id1: 'a',
    id2: 'b',
    value: 'm' + Math.random()
  };
  db.put('st', data);
  db.get('st', ['a', 'b']).addBoth(function (x) {
    result = x;
    done = true;
  });
};



var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



