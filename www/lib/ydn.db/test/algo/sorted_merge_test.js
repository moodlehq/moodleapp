
goog.require('goog.debug.Console');
goog.require('ydn.db.algo.NestedLoop');
goog.require('ydn.db.algo.SortedMerge');
goog.require('goog.testing.jsunit');
goog.require('ydn.debug');




var reachedFinalContinuation, debug_console;

var setUp = function() {
  // ydn.debug.log('ydn.db.core.req', 'finest');
  // ydn.debug.log('ydn.db.algo', 'finest');
  // ydn.db.core.DbOperator.DEBUG = true;
  // ydn.db.crud.req.IndexedDb.DEBUG = true;
  // ydn.db.algo.SortedMerge.DEBUG = true;


  reachedFinalContinuation = false;
};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};




var three_iterator = function (rev) {
  var animals = [
    {id: 1, name: 'rat', color: 'brown', horn: 0, legs: 4},
    {id: 2, name: 'leopard', color: 'spots', horn: 2, legs: 4},
    {id: 3, name: 'galon', color: 'gold', horn: 10, legs: 2},
    {id: 4, name: 'tiger', color: 'spots', horn: 2, legs: 4},
    {id: 5, name: 'snake', color: 'spots', horn: 0, legs: 0},
    {id: 6, name: 'rhino', color: 'spots', horn: 1, legs: 4},
    {id: 7, name: 'ox', color: 'black', horn: 2, legs: 4},
    {id: 8, name: 'cow', color: 'spots', horn: 2, legs: 4},
    {id: 9, name: 'chicken', color: 'red', horn: 0, legs: 2},
    {id: 10, name: 'unicon', color: 'pink', horn: 1, legs: 4},
    {id: 11, name: 'cat', color: 'spots', horn: 0, legs: 4},
    {id: 12, name: 'human', color: 'pink', horn: 0, legs: 2}
  ];

  var schema = {
    stores: [
      {
        name: 'animals',
        keyPath: 'id',
        indexes: [
          {
            keyPath: 'color'
          },
          {
            keyPath: 'horn'
          },
          {
            keyPath: 'legs'
          },
          {
            keyPath: ['horn', 'name']
          }, {
            keyPath: ['legs', 'name']
          }]
      }]
  };
  var db = new ydn.db.core.Storage('test-sorted-merge-' + rev, schema, options);
  db.clear();
  db.put('animals', animals);

  var iter_color = ydn.db.IndexIterator.where('animals', 'color', '=', 'spots');
  var iter_horn = ydn.db.IndexIterator.where('animals', 'horn', '=', 2);
  var iter_legs = ydn.db.IndexIterator.where('animals', 'legs', '=', 4);
  var exp_result = [2, 4, 8];
  if (rev) {
    iter_color = iter_color.reverse();
    iter_horn = iter_horn.reverse();
    iter_legs = iter_legs.reverse();
    exp_result = exp_result.reverse();
  }

  var done;
  var result = [];

  waitForCondition(
      // Condition
      function () {
        return done;
      },
      // Continuation
      function () {
        assertArrayEquals('correct result', exp_result, result);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  var solver = new ydn.db.algo.SortedMerge(result);
  var req = db.scan(solver, [iter_horn, iter_color, iter_legs]);
  req.addBoth(function() {
    done = true;
  });
};


var test_three_iterator = function() {
  three_iterator(false);
};


var test_three_iterator_reverse = function() {
  three_iterator(true);
};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



