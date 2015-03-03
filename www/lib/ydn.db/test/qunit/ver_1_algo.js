var options = {}; // options = {mechanisms: ['websql']};
if (/log/.test(location.hash)) {
  if (/ui/.test(location.hash)) {
    if (ydn.debug && ydn.debug.log) {
      var div = document.createElement('div');
      document.body.appendChild(div);
      ydn.debug.log('ydn.db', 'finest', div);
    } else {
      console.log('no logging facility');
    }
  } else {
    if (ydn.debug && ydn.debug.log) {
      ydn.debug.log('ydn.db', 'finest');
    } else {
      console.log('no logging facility');
    }
  }
}
if (/websql/.test(location.hash)) {
  options['mechanisms'] = ['websql'];
}


QUnit.config.testTimeout = 2000;


var reporter = new ydn.testing.Reporter('ydn-db', ydn.db.version);

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
var db = new ydn.db.Storage('test_algo_2', schema, options);

var animals = [
  {id: 1, name: 'rat', color: 'brown', horn: 0, legs: 4},
  {id: 2, name: 'leopard', color: 'spots', horn: 2, legs: 4},
  {id: 3, name: 'galon', color: 'gold', horn: 10, legs: 2},
  {id: 4, name: 'cat', color: 'spots', horn: 0, legs: 4},
  {id: 5, name: 'snake', color: 'spots', horn: 0, legs: 0},
  {id: 6, name: 'ox', color: 'black', horn: 2, legs: 4},
  {id: 7, name: 'cow', color: 'spots', horn: 2, legs: 4},
  {id: 8, name: 'chicken', color: 'red', horn: 0, legs: 2}
];
db.clear();
db.put('animals', animals).done(function (value) {
  //console.log(db + 'store: animals ready.');
});
var num_color = animals.reduce(function (p, x) {
  return x.color == 'spots' ? p + 1 : p;
}, 0);
var num_four_legs_ani = animals.reduce(function (p, x) {
  return x.legs == 4 ? p + 1 : p;
}, 0);
var num_two_horn_ani = animals.reduce(function (p, x) {
  return x.horn == 2 ? p + 1 : p;
}, 0);
// here iterator has one more than the result count because, iterator
// stop only after returning null cursor.
var horn_iter_count = num_two_horn_ani + 1;
var color_iter_count = num_color + 1;
var leg_iter_count = num_four_legs_ani + 1;



(function () {
  var test_env = {
    setup: function () {

    },
    teardown: function () {
    }
  };

  module("join", test_env);
  reporter.createTestSuite('algo', 'join');

  asyncTest("NestedLoop", 1, function () {

    var iter_color = ydn.db.IndexIterator.where('animals', 'color', '=', 'spots');
    var iter_horn = ydn.db.IndexIterator.where('animals', 'horn', '=', 2);
    var iter_legs = ydn.db.IndexIterator.where('animals', 'legs', '=', 4);

    var result = [];
    var solver = new ydn.db.algo.NestedLoop(result);
    var req = db.scan(solver, [iter_horn, iter_color, iter_legs]);
    req.always(function() {
      // ['leopard', 'cow']
      deepEqual(result, [2, 7], 'correct result');
      // equal(iter_horn.count(), horn_iter_count, 'horn table scan count');
      // equal(iter_color.count(), color_iter_count * horn_iter_count, 'color table scan count');
      // equal(iter_legs.count(), leg_iter_count * color_iter_count * horn_iter_count, 'legs table scan count');
      start();
    });

  });

  asyncTest("SortedMerge", 1, function () {

    var iter_color = ydn.db.IndexIterator.where('animals', 'color', '=', 'spots');
    var iter_horn = ydn.db.IndexIterator.where('animals', 'horn', '=', 2);
    var iter_legs = ydn.db.IndexIterator.where('animals', 'legs', '=', 4);

    var result = [];
    var solver = new ydn.db.algo.SortedMerge(result);
    var req = db.scan(solver, [iter_horn, iter_color, iter_legs]);
    req.always(function() {
      // ['leopard', 'cow']
      deepEqual(result, [2, 7], 'correct result');
      // ok(iter_horn.count() <= horn_iter_count, 'horn table scan count less than or equal to ' + num_two_horn_ani);
      // ok(iter_color.count() <= color_iter_count , 'color table scan count less than or equal to ' + num_color);
      // ok(iter_legs.count() <= leg_iter_count, 'legs table scan count less than or equal to ' + num_four_legs_ani);
      start();
    });

  });

  asyncTest("ZigzagMerge", 1, function () {

    var iter_horn_name = new ydn.db.IndexIterator('animals', 'horn, name', ydn.db.KeyRange.starts([2]));
    var iter_legs_name = new ydn.db.IndexIterator('animals', 'legs, name', ydn.db.KeyRange.starts([4]));

    var result = [];
    var solver = new ydn.db.algo.ZigzagMerge(result);
    var req = db.scan(solver, [iter_horn_name, iter_legs_name]);
    var exp_result = [7, 2, 6]; // ['cow', 'leopard', 'ox'];
    req.always(function() {
      deepEqual(result, exp_result, 'correct result');
      // ok(iter_horn_name.count() >= exp_result.length, 'horn table scan count larger or equal to ' + exp_result.length);
      // ok(iter_horn_name.count() <= horn_iter_count, 'horn table scan count less than or equal to ' + horn_iter_count);
      // ok(iter_legs_name.count() >= exp_result.length, 'legs table scan count larger or equal to ' + exp_result.length);
      // ok(iter_legs_name.count() <= leg_iter_count, 'legs table scan count less than or equal to ' + leg_iter_count);
      start();
    });

  });

  asyncTest("ZigzagMerge with streamer output", 1, function () {

    var iter_horn_name = new ydn.db.IndexIterator('animals', 'horn, name', ydn.db.KeyRange.starts([2]));
    var iter_legs_name = new ydn.db.IndexIterator('animals', 'legs, name', ydn.db.KeyRange.starts([4]));

    var streamer = new ydn.db.Streamer(db, 'animals', 'name');
    var solver = new ydn.db.algo.ZigzagMerge(streamer);
    var req = db.scan(solver, [iter_horn_name, iter_legs_name]);
    var exp_result = ['cow', 'leopard', 'ox'];
    req.then(function() {
      streamer.collect(function(keys, values) {
        deepEqual(values, exp_result, 'correct result');
        // ok(iter_horn_name.count() >= exp_result.length, 'horn table scan count larger or equal to ' + exp_result.length);
        // ok(iter_legs_name.count() >= exp_result.length, 'legs table scan count larger or equal to ' + exp_result.length);
        start();
      });

    }, function(e) {
      throw e;
    });

  });

})();



QUnit.testDone(function(result) {
  reporter.addResult('algo', result.module,
    result.name, result.failed, result.passed, result.duration);
});

QUnit.moduleDone(function(result) {
  reporter.endTestSuite('algo', result.name,
    {passed: result.passed, failed: result.failed});
});

QUnit.done(function(results) {
  reporter.report();
  ydn.db.deleteDatabase(db.getName(), db.getType());
  db.close();
});

