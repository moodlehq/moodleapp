// core service test
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.async');
goog.require('ydn.debug');
goog.require('ydn.db.crud.Storage');
goog.require('goog.testing.PropertyReplacer');


var reachedFinalContinuation, basic_schema;
var table_name = 't1';
var stubs;

var setUp = function() {
  // ydn.debug.log('ydn.db', 'finest');

};


var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};


var test_basic = function() {
  var schema = {
    stores: [{
      name: table_name,
      keyPath: 'id',
      type: 'TEXT'
    }]
  };
  var db_type = 'indexeddb';
  var options = {mechanisms: [db_type]};
  var db_name = 'test_tr_basic_4';
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var val = {id: 'a', value: Math.random()};

  var t1_fired = false;
  var result;

  waitForCondition(
      // Condition
      function() { return t1_fired; },
      // Continuation
      function() {
        assertEquals('correct obj', val.value, result.value);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      2000); // maxTimeout

  db.onReady(function() {
    db.transaction(function tx_cb1 (tx) {
      console.log('tr start: ' + tx);
      assertEquals('type', db_type, db.getType());

      assertNotUndefined(tx);
      assertNotNull(tx);
      // assertNull(tx.error); // accessing error object will cause tx to commit ?
      console.log(' tx started with ' + db.getType() + ' ' + tx);
      var store = tx.objectStore(table_name);
      var put_req = store.put(val);
      put_req.onsuccess = function(x) {
        console.log(' put ' + x);
        var get_req = store.get(val.id);
        get_req.onsuccess = function(e) {
          console.log(' get ' + e);
          result = e.target.result;
          t1_fired = true;
        };
      };
    }, [table_name], 'readwrite');
  });

};


var thread_test = function(policy, is_serial, exp_tx_no) {
  var options = {
    policy: policy,
    isSerial: is_serial
  };
  var schema = {
    stores: [
      {
        name: 'st'
      }]
  };
  var db = new ydn.db.crud.Storage('test_strict_overflow_serial_thread', schema, options);

  var get_done;
  waitForCondition(
      // Condition
      function() { return get_done; },
      // Continuation
      function() {
        assertArrayEquals('tx no ', exp_tx_no, tx_no);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  var tx_no = [];
  db.onReady(function() {
    for (var i = 1; i <= 3; i++) {
      db.put('st', {foo: 'bar'}, i).addBoth(function(x) {
        tx_no.push(db.getTxNo());
      });
    }
    db.get('st', 1).addBoth(function(x) {
      tx_no.push(db.getTxNo());
      get_done = true;
    });

  });
};

var test_atomic_serial_thread = function() {

  thread_test('atomic', true, [1, 2, 3, 4]);

};


var test_strict_overflow_serial_thread = function() {

  thread_test('repeat', true, [1, 1, 1, 2]);

};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



