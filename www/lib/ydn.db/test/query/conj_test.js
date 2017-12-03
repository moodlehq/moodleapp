
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.db.Query');
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


var animals = [
  {id: 0, name: 'worm', color: 'brown', horn: 0, legs: 0},
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
  {id: 12, name: 'human', color: 'pink', horn: 0, legs: 2},
  {id: 13, name: 'leotri', color: 'spots', horn: 2, legs: 3}
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
          keyPath: 'name'
        },
        {
          keyPath: ['horn', 'name']
        }, {
          keyPath: ['legs', 'name']
        }]
    }]
};


var test_logic = function() {
  var db = new ydn.db.core.Storage('test-logic', schema, options);
  var done, result;
  var q1 = db.from('animals').where('color', '=', 'spots');
  var q2 = db.from('animals').where('horn', '=', 2);
  var q = q1.and(q2);
  q = q.select('id');
  var iters = q.getIterators();
  assertEquals('number of iters', 2, iters.length);
  assertFalse('key join', q.isRefJoin());

  reachedFinalContinuation = true;
  ydn.db.deleteDatabase(db.getName(), db.getType());
  db.close();
};


/**
 * Main test function
 * @param {number} rev 1 for reverse queries, 2 for reverse conj query.
 * @param {string=} opt_select index name. Valid value are 'id'
 * and 'name'. If not provided, query will be on record value.
 * @param {number=} opt_num number of query, 2 or 3. default to 2.
 */
var query_test = function(rev, opt_select, opt_num) {

  var db = new ydn.db.core.Storage('test-sorted-merge-' + rev, schema, options);
  db.clear();
  db.put('animals', animals);

  var exp_result = opt_num == 3 ?
      [2, 4, 8] :
      [2, 4, 8, 13];
  if (!opt_select) {
    exp_result = exp_result.map(function(i) {
      return animals[i];
    });
  } else if (opt_select == 'name') {
    exp_result = exp_result.map(function(i) {
      return animals[i].name;
    });
    exp_result.sort();
  }
  var done;
  var result = [];

  waitForCondition(
      // Condition
      function() {
        return done;
      },
      // Continuation
      function() {
        assertArrayEquals('correct result', exp_result, result);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      },
      100, // interval
      1000); // maxTimeout

  var q1 = db.from('animals').where('color', '=', 'spots');
  var q2 = db.from('animals').where('horn', '=', 2);
  var q3 = db.from('animals').where('legs', '=', 4);

  if (rev) {
    exp_result = exp_result.reverse();
  }
  if (rev == 1) {
    q1 = q1.reverse();
    q2 = q2.reverse();
    q3 = q3.reverse();
  }
  var q = q1.and(q2);
  if (opt_num == 3) {
    q = q3.and(q);
  }
  if (opt_select) {
    q = q.select(opt_select);
  }
  if (rev == 2) {
    q = q.reverse();
  }
  var req = q.list();
  req.addBoth(function(x) {
    console.log(x);
    result = x;
    done = true;
  });
};


var test_two_iterator = function() {
  query_test(0, 'id');
};


var test_two_iterator_value = function() {
  query_test(0, undefined);
};

var test_three_iterator = function() {
  query_test(0, 'id', 3);
};


var test_two_iterator_reverse = function() {
  query_test(1, 'id');
};


var test_three_iterator_reverse = function() {
  query_test(1, 'id', 3);
};


var test_three_iterator_value = function() {
  query_test(1, undefined, 3);
};


var test_two_iterator_conj_reverse = function() {
  query_test(2, 'id');
};


var test_zigzag_two_iterator = function() {
  query_test(0, 'name');
};

var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



