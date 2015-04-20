
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


var test_01_encode_key = function () {

  var test_key = function (key, type) {
    var encoded = ydn.db.schema.Index.js2sql(key, type);
    var decoded = ydn.db.schema.Index.sql2js(encoded, type);
    if (goog.isArray(key)) {
      assertArrayEquals(type + ':' + JSON.stringify(key), key, decoded);
    } else {
      assertEquals(type + ':' + JSON.stringify(key), key, decoded);
    }

  };

  test_key(0, ydn.db.schema.DataType.NUMERIC);
  test_key(1, ydn.db.schema.DataType.NUMERIC);
  test_key(0);
  test_key(1);
  test_key('abc', ydn.db.schema.DataType.TEXT);
  test_key('abc');
  test_key(['a', 'b'], ['TEXT', 'TEXT']);
  test_key(['a', 'b']);

  reachedFinalContinuation = true;
};

var _test_02_encode_blob = function () {

  var test_key = function (key, type) {
    var encoded = ydn.db.schema.Index.js2sql(key, type);
    var decoded = ydn.db.schema.Index.sql2js(encoded, type);
    if (goog.isArray(key)) {
      assertArrayEquals(type + ':' + JSON.stringify(key), key, decoded);
    } else {
      //console.log(key);
      //console.log(decoded);
      assertEquals(type + ':' + JSON.stringify(key), key, decoded);
    }

  };

  var done;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {

      reachedFinalContinuation = true;
    },
    100, // interval
    5000); // maxTimeout

  var url = 'http://upload.wikimedia.org/wikipedia/commons/6/6e/HTML5-logo.svg';
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.responseType = "blob";
  xhr.addEventListener("load", function () {
    if (xhr.status === 200) {
      //console.log("Image retrieved");
      var blob = xhr.response;
      test_key(blob, ydn.db.schema.DataType.BLOB);
      done = true;
    }
  }, false);
  xhr.send();


};


/**
 */
var test_11_string_keys = function() {
  // ydn.debug.log('ydn.db.crud.req', 'finest');
  var db_name = 'test_11_string_keys';
  var basic_schema = getBasicSchema();
  var db = new ydn.db.crud.Storage(db_name, basic_schema, options);
  var on_completed = function() {
    ydn.db.deleteDatabase(db_name, db.getType());
    db.close();
    reachedFinalContinuation = true;
  };

  key_test(db, 'x');
  //key_test(new Date());  // Date is allow key
  key_test(db, 't@som.com');
  key_test(db, 'http://www.ok.com');
  key_test(db, 'http://www.ok.com/?id=123#ok');
  key_test(db, 'ID: /*!32302 10*/');
  key_test(db, 'x;" DROP TABLE ' + string_table, string_table, on_completed);

};

var test_12_number_keys = function() {

  var db_name = 'test_key_12_3';
  var basic_schema = getBasicSchema();
  var db = new ydn.db.crud.Storage(db_name, basic_schema, options);

  var on_completed = function() {
    ydn.db.deleteDatabase(db_name, db.getType());
    db.close();
    reachedFinalContinuation = true;
  };

  key_test(db, 1, number_table);
  key_test(db, 0, number_table);
  key_test(db, -1, number_table);
  key_test(db, Math.random(), number_table);
  key_test(db, -Math.random(), number_table);
  key_test(db, 1.0, number_table, on_completed);

};



var test_21_out_of_line = function () {
  var db_name = 'test_21_out_of_line';
  var basic_schema = getBasicSchema();
  var db = new ydn.db.crud.Storage(db_name, basic_schema, options);
  var key = Math.random();
  var data = {test: 'some random ' + Math.random(), type: Math.random()};

  var done, result, put_done, put_result;

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    // Continuation
    function () {
      assertEquals('value', data.test, result.test);
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
      assertEquals('key', key, put_result);
      // retrieve back by those key

      db.get(out_of_line_store, put_result).addBoth(function (value) {
        console.log('fetch value: ' + JSON.stringify(value));
        result = value;
        done = true;
      });
    },

    100, // interval
    5000); // maxTimeout

  db.put(out_of_line_store, data, key).addCallback(function (value) {
    //console.log(['receiving key from put', value]);
    put_done = true;
    put_result = value
  });
};


var test_22_out_of_line_array = function () {
  var store_name = 'demoOS';
  var db_name = 'test_22_2';
  var store_schema = new ydn.db.schema.Store(store_name, undefined,  false);
  var schema = new ydn.db.schema.Database(undefined, [store_schema]);
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
  var keys = objs.map(function(x) {return x.id});

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
      assertArrayEquals('get back the keys', keys, put_result);
      // retrieve back by those key

      db.values(store_name, put_result).addBoth(function (value) {
        //console.log('fetch value: ' + JSON.stringify(value));
        result = value;
        done = true;
      });
    },

    100, // interval
    5000); // maxTimeout

  db.put(store_name, objs, keys).addCallback(function (value) {
    //console.log(['receiving key from put', value]);
    put_done = true;
    put_result = value
  });
};



var test_51_autoschema_out_of_line_key = function () {

  var db_name = 'test_51_no_type_key_1';
  var db = new ydn.db.crud.Storage(db_name);
  var key = Math.random();
  var data = {test: 'some random ' + Math.random(), type: Math.random()};

  var done, result, put_done, put_result;

  waitForCondition(
    // Condition
    function () {
      return put_done;
    },
    // Continuation
    function () {
      assertEquals('key', key, put_result);
      // retrieve back by those key

      waitForCondition(
        // Condition
        function () {
          return done;
        },
        // Continuation
        function () {
          assertEquals('value', data.test, result.test);
          ydn.db.deleteDatabase(db_name, db.getType());
          db.close();
          reachedFinalContinuation = true;

        },
        100, // interval
        5000); // maxTimeout

      db.get(out_of_line_store, key).addBoth(function (value) {
        //console.log('fetch value: ' + JSON.stringify(value));
        result = value;
        done = true;

      });
    },

    100, // interval
    5000); // maxTimeout

  db.put(out_of_line_store, data, key).addCallback(function (value) {
    //console.log(['receiving key from put', value]);
    put_done = true;
    put_result = value
  });
};


var test_52_autoschema_in_line_key = function () {

  var db_name = 'test_52_autoschema_in_line_key_1';
  var db = new ydn.db.crud.Storage(db_name);
  var key = Math.random();
  var store = {name: 'st', keyPath: 'id'};
  var data = {id: key, test: 'some random ' + Math.random(), type: Math.random()};

  var done, result, put_done, put_result;

  waitForCondition(
    // Condition
    function () {
      return put_done;
    },
    // Continuation
    function () {
      assertEquals('key', key, put_result);
      // retrieve back by those key

      waitForCondition(
        // Condition
        function () {
          return done;
        },
        // Continuation
        function () {
          assertEquals('value', data.test, result.test);
          ydn.db.deleteDatabase(db_name, db.getType());
          db.close();
          reachedFinalContinuation = true;

        },
        100, // interval
        5000); // maxTimeout

      db.get('st', key).addBoth(function (value) {
        console.log('fetch value: ' + JSON.stringify(value));
        result = value;
        done = true;

      });
    },

    100, // interval
    5000); // maxTimeout

  db.put(store, data).addCallback(function (value) {
    //console.log(['receiving key from put', value]);
    put_done = true;
    put_result = value
  });
};


var test_index_generator = function() {

  var db_name = 'test_index_generator-1';
  var schema = {
    stores: [
      {
        name: 'st',
        keyPath: 'id',
        indexes: [
          {
            name: 'lowerName',
            generator: function(obj) {
              return obj.name.toLowerCase();
            }
          }]
      }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);
  var done, result;

  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        assertObjectEquals('get result', [3, 2, 1], result);

        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  var data = [
    {
      name: 'fa',
      id: 1,
      value: 'm' + Math.random()
    },
    {
      name: 'Da',
      id: 2,
      value: 'm' + Math.random()
    },
    {
      name: 'ba',
      id: 3,
      value: 'm' + Math.random()
    }
  ];
  db.clear('st');
  db.put('st', data);
  db.keys('st', 'lowerName').addBoth(function (x) {
    result = x;
    done = true;
  });
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



