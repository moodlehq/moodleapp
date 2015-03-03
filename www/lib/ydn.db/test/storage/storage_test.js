
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.db.Storage');
goog.require('ydn.testing');
goog.require('ydn.debug');


var reachedFinalContinuation;

var setUp = function() {

  ydn.debug.log('ydn.db', 'finest');
  ydn.db.tr.Parallel.DEBUG = true;

  var table_name = 't1';
  var store = new ydn.db.schema.Store(table_name);
  var basic_schema = new ydn.db.schema.Database(1, [store]);

};

var tearDown = function() {
  //stubs.reset();
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var db_name = 'test1';


var test_1_json_trival_config = function() {

  var db_name = 'todos_test_9';
  var db = new ydn.db.Storage(db_name);

  //db.setItem('some-value', 'ok');

  var hasEventFired = false;
  var key = 'some-value';
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertEquals('put a 1', key, put_value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout

  //db.getItem('some-value')
  db.put('st', {foo: 'bar'}, key).addBoth(function(value) {
    console.log('receiving value callback.' + JSON.stringify(value));
    put_value = value;
    hasEventFired = true;
  });
};




var test_1_json_config_empty_table = function() {
  var store = {name:'todo', keyPath:"timeStamp"};

  var schema_ver1 = {
    stores:[store]
  };

  var db = new ydn.db.Storage('todos_test_2', schema_ver1);

  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertArrayEquals('empry table', [], put_value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  db.values('todo').addCallback(function(value) {
    console.log('receiving value callback.');
    put_value = value;
    hasEventFired = true;
  });
};


var test_1_json_config = function() {
  var store = {name:'todo', keyPath:"timeStamp"};

  var schema_ver1 = {
    version: 2,
    stores:[store]
  };

  var db = new ydn.db.Storage('todos_test_3', schema_ver1);

  var hasEventFired = false;
  var put_value;

  waitForCondition(
      // Condition
      function() { return hasEventFired; },
      // Continuation
      function() {
        assertArrayEquals('put a 1', [], put_value);
        // Remember, the state of this boolean will be tested in tearDown().
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout

  var iter = new ydn.db.ValueIterator('todo');
  db.values(iter).addCallback(function(value) {
    console.log('receiving value callback.' + JSON.stringify(value));
    put_value = value;
    hasEventFired = true;
  });
};

var test_2_json_config_in_out = function() {

	var store_name = 't1';
	var put_obj_dbname = 'testdb3';
  var store = new ydn.db.schema.Store(store_name, 'id');
	var schema = new ydn.db.schema.Database(1, [store]);

	var db = new ydn.db.Storage(put_obj_dbname, schema);

	var key = 'a';
	var put_done = false;
	var put_value = {value: Math.random(), 'remark': 'testing'};
	put_value.id = key;
	var put_value_received;

	waitForCondition(
		// Condition
		function() { return put_done; },
		// Continuation
		function() {
			assertEquals('put a 1', key, put_value_received);
      console.log('put OK.');

      var schema = db.getSchema();
      console.log(schema);
      var db_name = db.getName();
      db.close();
      var db2 = new ydn.db.Storage(db_name, schema);

      var get_done;
      var get_value_received;
      waitForCondition(
        // Condition
        function() { return get_done; },
        // Continuation
        function() {
          assertObjectEquals('get ', put_value, get_value_received);
          reachedFinalContinuation = true;
          ydn.db.deleteDatabase(db2.getName(), db2.getType());
          db2.close();
        },
        100, // interval
        1000); // maxTimeout

      db2.get(store_name, key).addBoth(function(value) {
        console.log('receiving get value callback ' + key + ' = ' + JSON.stringify(value) + ' ' + typeof value);
        get_value_received = value;
        get_done = true;
      });

		},
		100, // interval
		1000); // maxTimeout

	db.put(store_name, put_value).addBoth(function(value) {
		console.log('receiving value callback.');
		put_value_received = value;
		put_done = true;
	});

};

var test_4_lazy_init = function() {
  var db_name = 'test_4_lazy_init';
  var db = new ydn.db.Storage();
  var value =  {foo: 'a1 object'};
  var get_done, result;

  waitForCondition(
      // Condition
      function() { return get_done; },
      // Continuation
      function() {
        assertObjectEquals('get ', value, result);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  db.put('st', value, 'a1');
  db.get('st', 'a1').addBoth(function(x) {
    result = x;
    get_done = true;
  });

  db.setName('lazy-db');
};


var test_run = function () {
  var data = [
    {
      id: 1,
      msg: 'msg' + Math.random()
    }, {
      id: 2,
      msg: 'msg' + Math.random()
    }];

  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  };

  var db_name = 'test-run-1';
  var done, put_result, values_result, count_result, remove_result;

  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        assertArrayEquals('put', [1, 2], put_result);
        assertArrayEquals('values', data, values_result);
        assertEquals('count', 2, count_result);
        assertEquals('remove', 1, remove_result);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  var db = new ydn.db.Storage(db_name, schema);
  db.onReady(function() {
    db.run(function(idb) {
      idb.put('st', data).addBoth(function(x) {
        put_result = x;
      });
      idb.count('st').addBoth(function(x) {
        count_result = x;
      });
      idb.values('st').addBoth(function(x) {
        values_result = x;
      });
      idb.remove('st', 1).addBoth(function(x) {
        remove_result = x;
        done = true;
      });
    }, ['st'], 'readwrite');
  });

};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



