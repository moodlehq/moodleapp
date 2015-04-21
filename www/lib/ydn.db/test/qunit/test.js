



(function () {


  asyncTest("abort in run", 2, function () {

    var test_env = {
      setup: function () {

      },
      teardown: function () {

      }
    };

    module("transaction,storage", test_env);
    reporter.createTestSuite('transaction');

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
      if (done_count >= 1) {
        start();
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
      }
    };

    var req = db.run(function (tdb) {
      tdb.put('s1', obj).always(function (key) {
        var req_get = tdb.get('s1', obj.id);
        req_get.then(function (result) {
          equal(obj.value, result.value, 'store 1 result');
          req_get.abort();
        }, function (e) {
          ok(false, 'store 1 get not error');
        });
      });

    }, ['s1'], 'readwrite');
    req.always(function (x) {
      // console.log(x);
      db.get('s1', obj.id).always(function (result) {
        equal(undefined, result, 'aborted store 1 done result');
        done();
      });
    });



  });

})();
