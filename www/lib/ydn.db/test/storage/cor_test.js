// core service test
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.debug');
goog.require('ydn.db.crud.Storage');


var reachedFinalContinuation, basic_schema;


var setUp = function() {
  ydn.debug.log('ydn.db.tr', 'finest');
  reachedFinalContinuation = false;
};


var tearDown = function() {
  assertTrue('The final continuation was not reached',
      reachedFinalContinuation);
};


var test_basic = function() {
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  };
  var db_name = 'test-basic';
  var db = new ydn.db.crud.Storage(db_name, schema);

  var val = {id: 'a', value: Math.random()};

  var done, tx_no;

  waitForCondition(
      function() { return done; },
      function() {
        assertEquals('number of tx', 1, tx_no);
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout


    var fn = function* (tdb) {
      var p1 = yield tdb.put('st', val);
      var result = yield tdb.get('st', p1);
      assertObjectEquals('result', val, result);
      // console.log('done ', result);
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    };
    db.spawn(fn, ['st'], 'readwrite').addBoth(function(x) {
      tx_no = x;
      done = true;
    });


};


var test_error = function() {
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  };
  var db_name = 'test-error';
  var db = new ydn.db.crud.Storage(db_name, schema);

  var val1 = {id: 'a', value: Math.random()};
  var val2 = {id: 'a', value: Math.random()};

  var done, tx_no;

  waitForCondition(
      function() { return done; },
      function() {
        assertEquals('number of tx', 1, tx_no);
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout

  db.onReady(function() {
    var fn = function* (tdb) {
      var p1 = yield tdb.put('st', val1);
      var p2 = yield tdb.add('st', val2);
      assertTrue('is error', p2 instanceof Error);
      var p3 = yield tdb.get('st', 'a');
      assertObjectEquals('tx still active and value not changed', p3, val1);
      // console.log('done ', p2);
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    };
    db.spawn(fn, ['st'], 'readwrite').addBoth(function(x) {
      tx_no = x;
      done = true;
    });
  });

};


var test_commit = function() {
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  };
  var db_name = 'test-error';
  var db = new ydn.db.crud.Storage(db_name, schema);

  var val1 = {id: 'a', value: Math.random()};

  var done, tx_no;

  waitForCondition(
      function() { return done; },
      function() {
        assertEquals('number of tx', 2, tx_no);
        reachedFinalContinuation = true;
      },
      100, // interval
      2000); // maxTimeout

  db.onReady(function() {
    var fn = function* (tdb) {
      var p1 = yield tdb.put('st', val1);
      tdb.commit();
      var p3 = yield tdb.get('st', 'a');
      assertObjectEquals('updated result', p3, val1);
      // console.log('done ', p2);
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    };
    db.spawn(fn, ['st'], 'readwrite').addBoth(function(x) {
      tx_no = x;
      done = true;
    });
  });

};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



