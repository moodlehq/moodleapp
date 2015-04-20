
goog.require('goog.debug.Console');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.db.crud.Storage');
goog.require('ydn.debug');


var reachedFinalContinuation, schema, debug_console, db, objs;

var table_name = 'st_inline';
var table_name_offline = 'st_offline';
var store_name_inline_number = 'st_inline_n';
var load_store_name = 'st_load';


var setUp = function() {

  ydn.json.POLY_FILL = true;
  // ydn.debug.log('ydn.db', 'finest');
  // ydn.db.crud.req.WebSql.DEBUG = true;
  // ydn.debug.log('ydn.db', 'finest');
  // ydn.db.tr.Serial.DEBUG = true;
  //ydn.db.crud.req.IndexedDb.DEBUG = true;
  // ydn.db.con.IndexedDb.DEBUG = true;

};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var _test_load_data = function() {
  var db_name = 'test_load_data';
  if (options.mechanisms != ['indexeddb']) {
    reachedFinalContinuation = true;
    return;
  }

  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var data = [
    {id: 1, tag: 'a', remark: 'put test'},
    {id: 2, tag: 'b', remark: 'put test'}
  ];
  var text = 'id,tag,remark\n1,a,put test\n2,b,put test';

  var hasEventFired = false;
  var keys, result;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertArrayEquals('load text', [1, 2], keys);
      hasEventFired = false;
      waitForCondition(
        // Condition
        function() { return hasEventFired; },
        // Continuation
        function() {
          assertArrayEquals('get data back', data, result);
          reachedFinalContinuation = true;
          ydn.db.deleteDatabase(db_name, db.getType());
          db.close();
        },
        100, // interval
        2000); // maxTimeout

      db.values(load_store_name, keys).addBoth(function(x) {
        result = x;
        hasEventFired = true;
      });
    },
    100, // interval
    2000); // maxTimeout

  db.clear();
  db.load(load_store_name, text).addBoth(function(value) {
    //console.log(value);
    keys = value;
    hasEventFired = true;

  });
};



var test_fetch_keys = function() {
  var store_name = 'st';
  var db_name = 'test_crud_52_4';

  var schema = {
    stores: [{
      name: store_name,
      keyPath: 'id',
      indexes: [{
        name: 'value'
      }]
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var objs = [
    {id: 'qs1', value: Math.random()},
    {id: 'at2', value: Math.random()},
    {id: 'bs2', value: Math.random()},
    {id: 'st', value: Math.random()}
  ];

  var put_value_received, results;
  var put_done, get_done;
  waitForCondition(
      // Condition
      function() {
        return put_done && get_done;
      },
      // Continuation
      function() {


        assertEquals('obj length', keys.length, results.length);
        assertObjectEquals('get 0', objs[1], results[0]);
        assertObjectEquals('get 1', objs[2], results[1]);

        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();

      },
      100, // interval
      2000); // maxTimeout


  db.put(store_name, objs).addBoth(function(value) {
    //console.log(['receiving value callback.', value]);
    put_value_received = value;
    put_done = true;
  });

  var keys = [
    new ydn.db.Key(store_name, objs[1].id),
    new ydn.db.Key(store_name, objs[2].id)];
  db.values(keys).addBoth(function(value) {
    //console.log('fetch value: ' + JSON.stringify(value));
    results = value;

    get_done = true;
  });

};



var test_keys = function() {
  var db_name = 'test_51_keys_1';
  var stores = [new ydn.db.schema.Store(table_name, 'id', false,
    ydn.db.schema.DataType.NUMERIC)];
  var schema = new ydn.db.schema.Database(undefined, stores);
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var keys = [0, 1, 2, 3];
  var data = goog.array.map(keys, function(x) {return {id: x, msg: 'msg' + Math.random()};});
  //var rev_data = ydn.object.clone(data).reverse();


  var whole_done, limit_done, offset_done;
  var whole_result, limit_result, offset_result;

  waitForCondition(
    // Condition
    function() { return whole_done && limit_done && offset_done; },
    // Continuation
    function() {
      assertArrayEquals('whole store', keys, whole_result);
      assertArrayEquals('limit store', keys.slice(0, 3), limit_result);
      assertArrayEquals('offset store', keys.slice(1, 3), offset_result);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout


  db.put(table_name, data);

    db.keys(table_name).addBoth(function(value) {
      //console.log('whole value callback.');
      whole_result = value;
      whole_done = true;
    }).addErrback(function(e) {
        whole_done = true;
        console.log('Error: ' + e);
      });

    db.keys(table_name, null, 3).addBoth(function(value) {
      //console.log('limit value callback.');
      limit_result = value;
      limit_done = true;
    });
    db.keys(table_name, null, 2, 1).addBoth(function(value) {
      //console.log('limit offset value callback.');
      offset_result = value;
      offset_done = true;
    });


};


var test_list = function() {
  var db_name = 'test_crud_26_1';
  var stores = [new ydn.db.schema.Store(table_name, 'id', false,
    ydn.db.schema.DataType.NUMERIC)];
  var schema = new ydn.db.schema.Database(undefined, stores);
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var data = [
    {id: 0, value: 'a' + Math.random()},
    {id: 1, value: 'a' + Math.random()},
    {id: 2, value: 'a' + Math.random()},
    {id: 3, value: 'a' + Math.random()}
  ];
  //var rev_data = ydn.object.clone(data).reverse();


  var whole_done, array_done, limit_done, offset_done;
  var whole_result, array_result, limit_result, offset_result;

  waitForCondition(
    // Condition
    function() { return whole_done && array_done && limit_done && offset_done; },
    // Continuation
    function() {
      assertArrayEquals('whole store', data, whole_result);
      assertArrayEquals('array keys', data.slice(1, 3), array_result);
      assertArrayEquals('limit store', data.slice(0, 3), limit_result);
      assertArrayEquals('offset store', data.slice(1, 3), offset_result);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    1000); // maxTimeout


  db.put(table_name, data).addCallbacks(function(x) {
    db = new ydn.db.crud.Storage(db_name, schema, options);
    db.values(table_name).addCallbacks(function(value) {
      // console.log('receiving value callback.');
      whole_result = value;
      whole_done = true;
    }, function(e) {
      throw e;
    });

    db.values(table_name, [1, 2]).addCallbacks(function(value) {
      //console.log('receiving value callback.');
      array_result = value;
      array_done = true;
    }, function(e) {
      throw e;
    });

    db.values(table_name, null, 3).addCallbacks(function(value) {
      //console.log('receiving value callback.');
      limit_result = value;
      limit_done = true;
    }, function(e) {
      throw e;
    });

    db.values(table_name, null, 2, 1).addCallbacks(function(value) {
      //console.log('receiving value callback.');
      offset_result = value;
      offset_done = true;
    }, function(e) {
      throw e;
    });

  }, function(e) {
    throw e;
  });


};


var test_count_stores = function() {

  var db_name = 'test_32_count_stores';

  var store_inline = 'ts';    // in-line key store
  var store_inline_string = 'tss';    // in-line key store
  var store_outline = 'ts2'; // out-of-line key store
  var store_outline_string = 'ts2s'; // out-of-line key store
  var store_inline_auto = 'ts3'; // in-line key + auto
  var store_outline_auto = 'ts4'; // out-of-line key + auto
  var store_nested_key = 'ts5'; // nested keyPath
  var store_inline_index = 'ts6';    // in-line key store

  var schema_1 = {
    stores: [
      {
        name: store_inline,
        keyPath: 'id',
        type: 'NUMERIC'},
      {
        name: store_inline_string,
        keyPath: 'id',
        type: 'TEXT'},
      {
        name: store_outline,
        type: 'NUMERIC'},
      {
        name: store_outline_string,
        type: 'TEXT'},
      {
        name: store_nested_key,
        keyPath: 'id.$t', // gdata style key.
        type: 'TEXT'}
    ]
  };

  var _db = new ydn.db.crud.Storage(db_name, schema_1, options);
  _db.clear();
  var data = [];
  var data2 = [];
  for (var i = 0; i < 5; i++) {
    data[i] = {id: i, value: 'test' + Math.random()};
  }
  var keys = [];
  for (var i = 0; i < 3; i++) {
    keys[i] = i;
    data2[i] = {type: 'offline', value: 'test' + Math.random()};
  }

  var done = false;
  var count, type;
  _db.put(store_outline, data2, keys);
  _db.put(store_inline, data);
  _db.count(store_inline).addBoth(function() {
    type = _db.getType();
    var db = new ydn.db.crud.Storage(db_name, schema_1, options);

    db.count([store_inline, store_outline]).addBoth(function(value) {
      //console.log('receiving value callback.');
      count = value;
      done = true;
      db.close();
    });
  });
  _db.close();

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('store_inline', 5, count[0]);
      assertEquals('store_outline', 3, count[1]);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, type);
    },
    100, // interval
    2000); // maxTimeout

};



var test_get_inline = function() {
  var db_name = 'test_21_get_inline';
  var schema = {
    stores: [{
      name: table_name,
      keyPath: 'id'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var key = Math.ceil(Math.random() * 10000);
  var value = {id: key, value: 'a' + Math.random()};

  var done = false;
  var result;

  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertObjectEquals('value', value, result);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout


  db.put(table_name, value).addBoth(function(k) {
    // console.log('key: ' + k);
    db = new ydn.db.crud.Storage(db_name, schema, options);
    db.get(table_name, key).addBoth(function(value) {
      // console.log([key, value])
      result = value;
      done = true;
    });
  });

  db.close();

};


var tearDownPage = function() {

};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



