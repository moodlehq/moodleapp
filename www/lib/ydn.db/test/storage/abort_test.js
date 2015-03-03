// core service test
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.debug');
goog.require('ydn.db');
goog.require('ydn.db.crud.Storage');


var reachedFinalContinuation;

var stubs;
var basic_schema = {
  stores: [
    {
      name: 't1',
      keyPath: 'id',
      type: 'TEXT'
    }, {
      name: 't2',
      keyPath: 'id',
      type: 'TEXT'
    }, {
      name: 't3',
      keyPath: 'id',
      type: 'TEXT'
    }]
};


var setUp = function() {
  ydn.debug.log('ydn.db', 'finest');
  // ydn.db.tr.Parallel.DEBUG = true;
  // ydn.db.con.IndexedDb.DEBUG = true;

};


var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var committed_continuous_request_test = function(thread, exp_tx_no) {

  var db_name = 'nested_request_test' + Math.random();
  options.thread = thread;
  var db = new ydn.db.crud.Storage(db_name, basic_schema, options);

  var val = {id: 'a', value: Math.random()};

  var t1_fired = false;
  var result;
  var tx_no = [];

  waitForCondition(
    // Condition
    function() { return t1_fired; },
    // Continuation
    function() {
      assertNotNullNorUndefined('has result', result);
      assertEquals('correct obj', val.value, result.value);
      assertArrayEquals('tx no', exp_tx_no, tx_no);
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout

  db.run(function (tdb) {
    tdb.put(table_name, val);
  }, [table_name], 'readwrite', function (t) {
    db.get(table_name, 'a').addBoth(function (r) {
      tx_no.push(db.getTxNo());
    });
    db.get(table_name, 'a').addBoth(function (x) {
      result = x;
      tx_no.push(db.getTxNo());
      t1_fired = true;
    });
  });


};


var test_abort_repeat_put  = function() {
  var db_name = 'test_abort' + Math.random();
  var opt = ydn.object.clone(options);
  opt.policy = 'repeat';
  var db = new ydn.db.crud.Storage(db_name, basic_schema, opt);

 // ydn.db.crud.req.WebSql.DEBUG = true;

  var adb = db.branch('atomic', true);

  var val = {id: 'a', value: Math.random()};

  var t1_fired, t2_fired;
  var t1_result, t2_result, t1_key;

  waitForCondition(
    // Condition
    function() { return t1_fired && t2_fired},
    // Continuation
    function() {
      assertEquals('t1 key', 'a', t1_key);
      assertUndefined('t1 result', t1_result);
      assertNotNullNorUndefined('t2 result', t2_result);
      assertEquals('correct t2 value', val.value, t2_result.value);
      // assertEquals('correct value for t3', val.value, t3_result.value);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout

  var req1 = db.put('t1', val).addCallback(function (x) {
    console.log('req1 put', x);
    t1_key = x;
    req1.abort();
  });
  db.get('t1', 'a').addBoth(function (x) {
    t1_result = x;
    t1_fired = true;
    console.log('t1 done', x);
  });

  db.put('t2', val);
  db.get('t2', 'a').addBoth(function (x) {
    t2_result = x;
    t2_fired = true;
    console.log('t2 done', x)
  });


};


var test_abort_atomic_put  = function() {
  var db_name = 'test_abort_atomic_put' + Math.random();
  var opt = ydn.object.clone(options);
  opt.policy = 'repeat';
  var db = new ydn.db.crud.Storage(db_name, basic_schema, opt);

  // ydn.db.crud.req.WebSql.DEBUG = true;

  var adb = db.branch('atomic', true);

  var val = {id: 'a', value: Math.random()};

  var t3_fired, t3_result, t3_key;

  waitForCondition(
      // Condition
      function() { return t3_fired; },
      // Continuation
      function() {
        assertEquals('t3 key', 'a', t3_key);
        assertNotNullNorUndefined('t3 result not aborted', t3_result);
        assertEquals('correct t3 value', val.value, t3_result.value);
        // assertEquals('correct value for t3', val.value, t3_result.value);

        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout

  var req2 = adb.put('t3', val).addCallback(function(x) {
    t3_key = x;
    // console.log('t3 put', x);

    assertThrows('must throw InvalidStateError for atomic thread', function() {
      req2.abort();
    });

  });
  db.get('t3', 'a').addBoth(function(x) {
    t3_result = x;
    t3_fired = true;
    // console.log('t3 done', x);
  });

};



var _test_invalid_data  = function() {
  var db_name = 'test_invalid_data' + Math.random();
  options.thread = 'samescope-multirequest-serial';
  var db = new ydn.db.crud.Storage(db_name, basic_schema, options);


  var obj = {id: 'a', value: document.createElement('div')};

  var t1_fired;
  var t1_result, t1_key;

  waitForCondition(
    // Condition
    function() { return t1_fired; },
    // Continuation
    function() {
      assertEquals('t1 key', 'a', t1_key);

      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout

  db.addEventListener('done', function () {

    db.put('t1', obj).addCallback(function (x) {
      t1_key = x;
    });
    db.get('t1', 'a').addBoth(function (x) {
      t1_result = x;
      t1_fired = true;
    });

  });


};


var test_abort_put_data = function() {
  var db_name = 'test_abort' + Math.random();
  options.policy = 'repeat';
  var db = new ydn.db.crud.Storage(db_name, basic_schema, options);


  var keys = ['a', 'b', 'c'];
  var objs = [
    {id: 'a', value: Math.random()},
    {id: 'b', value: Math.random()},
    {id: 'c', value: Math.random()}
  ];

  var t1_fired, t2_fired;
  var t1_count, t2_count;
  var t1_result, t2_result, t1_keys, t2_keys;

  waitForCondition(
      // Condition
      function() {
        return t1_fired && t2_fired;
      },
      // Continuation
      function() {
        assertArrayEquals('t1 keys', t1_keys, keys);
        assertArrayEquals('t2 keys', t1_keys, keys);
        assertUndefined('t1 result', t1_result);
        assertNotNullNorUndefined('has result', t2_result);
        assertEquals('correct value', objs[0].value, t2_result.value);
        assertEquals('t1 count', 0, t1_count);
        assertEquals('t2 count', 3, t2_count);

        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout

  db.addEventListener('ready', function() {

    db.put('t2', objs).addBoth(function(x) {
      t2_keys = x;
    });
    db.get('t2', 'a').addBoth(function(x) {
      t2_result = x;
    });
    db.count('t2').addBoth(function(x) {
      t2_count = x;
      t2_fired = true;
    });

    var req1 = db.put('t1', objs).addCallback(function(x) {
      t1_keys = x;
      req1.abort();
    });
    db.get('t1', 'a').addBoth(function(x) {
      t1_result = x;
    });
    db.count('t1').addBoth(function(x) {
      t1_count = x;
      t1_fired = true;
    });

  });

};



var test_abort_in_run = function() {
  var db_name = 'test_abort_in_run';
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  };
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var obj = {'id': 1, 'msg': 'msg' + Math.random()};

  var done, can_abort, run_result, get1_result, get2_result, get3_result;
  var tint = Math.random();
  var put_tint, get_tint, abort_tint;

  waitForCondition(
      // Condition
      function() {
        return done;
      },
      // Continuation
      function() {
        assertObjectEquals('get1 result', obj, get1_result);
        assertEquals('put tint', tint, put_tint);
        assertEquals('get tint', tint, get_tint);
        assertEquals('abort tint', tint, abort_tint);
        assertTrue('can abort', can_abort);
        assertEquals('AbortError', run_result);
        assertUndefined('get3 result', get3_result);
        assertUndefined('get2 result', get2_result);

        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout

  db.clear();
  var req = db.run(function(tdb) {
    req.tx_.tint = tint;
    var put_req = tdb.put('st', obj).addBoth(function() {
      put_tint = put_req.tx_.tint;
      var get_req = tdb.get('st', 1).addBoth(function(x) {
        get_tint = get_req.tx_.tint;
        get1_result = x;
        can_abort = get_req.canAbort();
        assertTrue('request can be aborted', can_abort);
        if (can_abort) {
          abort_tint = req.tx_.tint;
          req.abort();
        }
      });
    });
  }, ['st'], 'readwrite');
  req.addCallbacks(function(x) {
    run_result = '';
  }, function(e) {
    run_result = 'AbortError';
  });

  db.get('st', 1).addBoth(function(x) {
    get2_result = x;
  });
  setTimeout(function() {
    db.get('st', 1).addBoth(function(x) {
      get3_result = x;
      done = true;
    });
  }, 10);

};




var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



