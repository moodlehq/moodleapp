
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.db.Storage');
goog.require('ydn.testing');


var reachedFinalContinuation, stubs;

var setUp = function() {
  var c = new goog.debug.Console();
  c.setCapturing(true);
  goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.FINE);
  //goog.log.getLogger('ydn.gdata.MockServer').setLevel(goog.debug.Logger.Level.FINEST);
  //goog.log.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINEST);

  //stubs = new goog.testing.PropertyReplacer();

  var table_name = 't1';
  var basic_schema = new ydn.db.schema.Database(1, [new ydn.db.schema.Store(table_name)]);

};

var tearDown = function() {
  //stubs.reset();
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var db_name = 'test1';
var tr_db_name = 'test_2_trival_config_' + Math.random();


var test_1_trival_config = function() {



  var db = new ydn.db.Storage(tr_db_name);

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
      },
      100, // interval
      2000); // maxTimeout

  //db.getItem('some-value')
  db.setItem(key, 'ok').addCallback(function(value) {
    console.log('receiving value callback.' + JSON.stringify(value));
    put_value = value;
    hasEventFired = true;
  }).addErrback(function(e) {
      hasEventFired = true;
      put_value = e;
    });
};

var test_2_trival_config_repeat = function() {

  var schema_ver1 = {};
  var db_name = 'test_2_trival_config_1';

  var db = new ydn.db.Storage(tr_db_name);

  //db.setItem('some-value', 'ok');

  var hasEventFired = false;
  var key = 'some-value';
  var put_value;

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      console.log(db.getSchema());
      assertEquals('put a 1', key, put_value);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
    },
    100, // interval
    2000); // maxTimeout

  //db.getItem('some-value')
  db.setItem(key, 'ok').addCallback(function(value) {
    console.log('receiving value callback.' + JSON.stringify(value));
    put_value = value;
    hasEventFired = true;
  }).addErrback(function(e) {
      hasEventFired = true;
      put_value = e;
    });
};




var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



