

goog.require('goog.testing.jsunit');
goog.require('ydn.debug');
goog.require('ydn.db.core.Storage');



var reachedFinalContinuation, db;

var store_name = 'st';
var objs = [
  {id:'qs0', value: 0, x: 1, tag: ['a', 'b']},
  {id:'qs1', value: 1, x: 2, tag: ['a']},
  {id:'at2', value: 2, x: 3, tag: ['a', 'b']},
  {id:'bs1', value: 3, x: 6, tag: ['b']},
  {id:'bs2', value: 4, x: 14, tag: ['a', 'c', 'd']},
  {id:'bs3', value: 5, x: 111, tag: ['c']},
  {id:'st3', value: 6, x: 600}
];

var setUpPage = function() {
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  }
  var db_name = 'streamer-test';
  db = new ydn.db.core.Storage(db_name, schema, options);

  db.put(store_name, objs).addCallback(function (value) {
    console.log(db + 'store: ' + store_name + ' ready.');
  });

}

var setUp = function() {

  reachedFinalContinuation = false;
};


var tearDown = function() {

  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var test_streamer_sink = function() {

  var done;
  var result = [];

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    function () {
      assertArrayEquals('result', [objs[1], objs[4]], result);
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var streamer = new ydn.db.Streamer(db, store_name);
  streamer.setSink(function(key, value) {
    result.push(value);
    if (result.length == 2) {
      done = true;
    }
  });

  db.onReady(function() {  // to make sure
    streamer.push(objs[1].id);
    streamer.push(objs[4].id);
  });

};


var test_streamer_collect_index = function() {

  var done, result;
  var exp_result = [objs[1].x, objs[4].x];

  waitForCondition(
    // Condition
    function () {
      return done;
    },
    function () {
      assertArrayEquals('result', exp_result, result);
      reachedFinalContinuation = true;
    },
    100, // interval
    1000); // maxTimeout

  var streamer = new ydn.db.Streamer(db, store_name, 'x');

  db.onReady(function() {  // to make sure
    streamer.push(objs[1].id);
    streamer.push(objs[4].id);
    streamer.collect(function(keys, x) {
      result = x;
      done = true;
    });
  });

};


tearDownPage = function() {
  ydn.db.deleteDatabase(db.getName(), db.getType());
  db.close();
}


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);

