

(function () {
  var db;
  var db_name_event = "test-transaction-1";
  var store_inline = "ts";    // in-line key store
  var store_outline = "ts2"; // out-of-line key store


  var events_schema = {
    stores: [
      {
        name: store_inline,
        keyPath: 'id',
        dispatchEvents: true,
        type: 'NUMERIC'},
      {
        name: store_outline,
        dispatchEvents: true,
        type: 'NUMERIC'}
    ]};

  var test_env = {
    setup: function () {

    },
    teardown: function () {

    }
  };

  module("transaction,run", test_env);
  reporter.createTestSuite('transaction', 'run');
  asyncTest("all requests in one transaction", 4, function () {

    var db_name = 'test_run_1';

    var db = new ydn.db.Storage(db_name, events_schema);

    var req = db.run(function(tdb) {
      var key1 = Math.ceil(Math.random() * 100000);
      var obj = {test: 'first value', id: key1};

      tdb.add(store_inline, obj).always(function(x) {
        equal(key1, x, 'add key');
      });
      var key = Math.ceil(Math.random() * 100000);
      var data = { test: "random value", name: "name " + key, id: key };
      tdb.put(store_inline, data).always(function(x) {
        equal(key, x, 'put key');
      });
      tdb.values(store_inline, [key1, key]).always(function(x) {
        deepEqual([obj, data], x, 'get objects');
      });
      tdb.clear(store_inline).always(function(x) {
        equal(1, x, 'clear');
      });
    }, null, 'readwrite');
    req.always(function(cnt) {
      start();
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
    });

  });

  asyncTest('request after run', 2, function () {

    var db_name = 'test_run_2';
    var schema = {
      stores: [
        {
          name: 'st',
          keyPath: 'id',
          indexes: [{
            name: 'name'
          }]
        }]
    };
    var db = new ydn.db.Storage(db_name, schema);

    var val = Math.random();
    var req = db.run(function(tdb) {
      var data = {name: 'a', value: val, id: 1};
      tdb.put('st', data);
    }, ['st'], 'readwrite');
    req.always(function(cnt) {
      db.values('st', 'name', ydn.db.KeyRange.only('a')).always(function(arr) {
        equal(arr.length, 1, 'correct result');
        equal(arr[0].value, val, 'correct value');
        start();
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      });
    });

  });

})();


(function () {
  var db;
  var db_name_event = "test-transaction-2";
  var store_inline = "ts";    // in-line key store
  var store_outline = "ts2"; // out-of-line key store


  var events_schema = {
    stores: [
      {
        name: store_inline,
        keyPath: 'id',
        dispatchEvents: true,
        type: 'NUMERIC'},
      {
        name: store_outline,
        dispatchEvents: true,
        type: 'NUMERIC'}
    ]};

  var test_env = {
    setup: function () {

    },
    teardown: function () {

    }
  };

  module("transaction,abort", test_env);
  reporter.createTestSuite('transaction', 'abort');
  asyncTest("abort a put operation request method", 7, function () {

    var db_name = 'test_abort_1';
    var st1 = 's' + Math.random();
    var st2 = 's' + Math.random();
    var st3 = 's' + Math.random();

    var schema = {
      stores: [
        {
          name: st1,
          keyPath: 'id',
          type: 'NUMERIC'
        }, {
          name: st2,
          keyPath: 'id',
          type: 'NUMERIC'
        }, {
          name: st3,
          keyPath: 'id',
          type: 'NUMERIC'
        }]
    };
    var obj = {
      id: Math.random(),
      value: 'msg' + Math.random()
    };

    var db = new ydn.db.Storage(db_name, schema);
    var adb = db.branch('atomic', true); // atomic-serial

    var done_count = 0;
    var done = function() {
      done_count++;
      if (done_count >= 3) {
        start();
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
      }
    };

    var req1 = db.put(st1, obj).always(function (key) {
      equal(obj.id, key, 'aborted store key');
      req1.abort();
    });
    db.get(st1, obj.id).always(function (result) {
      equal(undefined, result, 'aborted store result');
      done();
    });

    db.put(st2, obj).always(function (key) {
      equal(obj.id, key, 'store 2 key');
    });
    db.get(st2, obj.id).always(function (result) {
      equal(obj.value, result.value, 'store 2 result');
      done();
    });

    var req3 = adb.put(st3, obj).always(function (key) {
      equal(obj.id, key, 'atomic store key');
      throws (function () { // this is an assertion too
        req3.abort();
      }, undefined, 'atomic tx cannot be aborted');
    });

    adb.get(st3, obj.id).always(function (result) {
      equal(obj.value, result.value, 'atomic store result');
      done();
    });

  });


  asyncTest("abort in run", 4, function () {

    var db_name = 'test_abort_2';

    var schema = {
      stores: [
        {
          name: 's1',
          keyPath: 'id',
          type: 'NUMERIC'
        }, {
          name: 's2',
          keyPath: 'id',
          type: 'NUMERIC'
        }, {
          name: 's3',
          keyPath: 'id',
          type: 'NUMERIC'
        }]
    };
    var obj = {
      id: Math.random(),
      value: 'msg' + Math.random()
    };
    var obj2 = {
      id: Math.random(),
      value: 'msg' + Math.random()
    };

    var db = new ydn.db.Storage(db_name, schema);
    var adb = db.branch('atomic', true); // atomic-serial

    var done_count = 0;
    var done = function() {
      done_count++;
      if (done_count >= 2) {
        start();
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
      }
    };

    var req = db.run(function (tdb) {
      tdb.put('s1', obj).always(function (key) {
        tdb.get('s1', obj.id).then(function (result) {
          equal(obj.value, result.value, 'store 1 result');
          req.abort();
        }, function (e) {
          ok(false, 'store 1 get not error');
        });
      });

    }, ['s1'], 'readwrite');
    req.always(function (x) {
      // console.log(x);
      db.get('s1', obj.id).always(function (result) {
        equal(result, undefined, 'aborted store 1 done result');
        done();
      });
    });

    db.run(function (tdb) {
      tdb.put('s2', obj).always(function (key) {
        tdb.get('s2', obj.id).always(function (result) {
          equal(obj.value, result.value, 'store 2 result');
        });
      });

    }, ['s2'], 'readwrite').always(function (t, e) {
          db.get('s2', obj.id).always(function (result) {
            equal(obj.value, result.value, 'store 2 done result');
            done();
          });
        });

  });

})();


