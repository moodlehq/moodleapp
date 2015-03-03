// Copyright 2012 YDN Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview Performance test runner.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


document.getElementById('version').textContent = ydn.db.version;



/**
 * Performance test runner.
 * @param {ydn.db.Storage} db database.
 * @param {string} title test title.
 * @param {number=} opt_nExp number of experiment. Default to 10.
 * @constructor
 */
var Pref = function(db, title, opt_nExp) {
  this.db = db;
  db.addEventListener('ready', function() {
    document.getElementById('mechanism').textContent = db.getType();
  });
  /**]
   * @type {Array.<Test>}
   * @private
   */
  this.tests_ = [];

  this.threads = [
    db,
    db.branch('atomic', true),
    db.branch('single', true),
    db.branch('multi', true),
    db.branch('atomic', false),
    db.branch('single', false),
    db.branch('multi', false)
  ];
  this.nRepeat = opt_nExp || 10; // number of experiment
  this.title = title;
};



/**
 * Create a test result row.
 * @param {Test} test
 * @param {Element} tbody
 * @constructor
 */
var RowView = function(test, tbody) {

  var tr = document.createElement('TR');
  var webkit = /WebKit/.test(navigator.userAgent);
  // details tag is only supported by webkit browser.
  var disp = webkit ? '' : 'style="display: none;"';
  var init = test.init ? '<p>Initialization function</p><pre>' +
      test.init.toString() + '</pre>' : '';
  tr.innerHTML = '<td><details><summary>' + test.title + '</summary>' +
      '<div ' + disp + '>' + init +
      '<p>Test function</p><pre>' +
      test.test.toString() + '</pre></div></details></td>' +
      '<td></td><td></td><td></td><td></td><td></td><td></td>';
  tbody.appendChild(tr);
  this.results_ = [[], [], [], [], [], [], []];
  this.tx_counts_ = [[], [], [], [], [], [], []];
  this.tr_ = tr;
};


RowView.std = function(mean, items) {
  var deltaSquaredSum = 0;
  for (var i = 0; i < items.length; i++) {
    var delta = items[i] - mean;
    deltaSquaredSum += delta * delta;
  }
  var variance = deltaSquaredSum / (items.length - 1);
  return Math.sqrt(variance);
};


RowView.tDist = function(n) {
  var tDistribution = [NaN, NaN, 12.71, 4.30, 3.18, 2.78, 2.57, 2.45, 2.36,
    2.31, 2.26, 2.23, 2.20];
  return tDistribution[n] || 2.20;
};


/**
 * Add a new test result.
 * @param {number} idx index of thread type.
 * @param {number} op_sec operations per second.
 * @param {number=} opt_tx_count number of transaction counts.
 */
RowView.prototype.addResult = function(idx, op_sec, opt_tx_count) {
  if (idx == 0) {
    return;
  }
  var scores = this.results_[idx];
  var tx_counts = this.tx_counts_[idx];
  var td = this.tr_.children[idx];
  scores.push(op_sec);
  if (opt_tx_count) {
    tx_counts.push(opt_tx_count);
  }
  setTimeout(function() {
    // update in separate thread.
    var total = scores.reduce(function(x, p) {return x + p}, 0);
    var tx_total = tx_counts.reduce(function(x, p) {return x + p}, 0);
    var title = tx_total ? ' title="number of transactions used: ' +
        (tx_total / tx_counts.length) + '"' : '';
    var mean = (total / scores.length);
    var count = scores.length;
    var html = '<span' + title + '>' + (mean | 0) + '</span>';
    if (count > 2) {
      var sqrtCount = Math.sqrt(count);
      var stdDev = RowView.std(mean, scores);
      var stdErr = stdDev / sqrtCount;
      var tDist = RowView.tDist(count);
      // http://stackoverflow.com/questions/4448600
      // http://www.webkit.org/perf/sunspider-0.9.1/sunspider-compare-results.js
      var error = ' ± ' + ((tDist * stdErr / mean) * 100).toFixed(1) + '%';
      html += '<sup>' + error + '</sup>';
    }
    td.innerHTML = html;
  }, 10);
};


/**
 * @param {Object} test test object.
 * @param {Function} onFinished callback on finished the test.
 */
Pref.prototype.runTest = function(test, onFinished) {
  var me = this;
  var view = new RowView(test, this.tbody);
  var onReady = function(data) {
    var runRepeat = function(lap) {
      if (lap == me.nRepeat) {
        onFinished();
        return;
      }
      lap++;
      // run test for each thread.
      var runTest = function(idx) {
        var t1;
        var db = me.threads[idx];
        var onComplete = function(op_sec) {
          var t2 = db.getTxNo();
          var tx_count = t2 - t1;
          view.addResult(idx, op_sec, tx_count);
          idx++;
          if (idx < me.threads.length) {
            runTest(idx);
          } else {
            runRepeat(lap);
          }
        };
        setTimeout(function() {
          // give some time for database to complete previous job.
          t1 = db.getTxNo();
          test.run(db, data, onComplete);
        }, 10);
      };
      runTest(0);
    };
    runRepeat(0);
  };
  if (test.init) {
    test.init(function(data) {
      me.prev_data_ = data;
      onReady(data);
    }, test.nData);
  } else {
    onReady(me.prev_data_);
  }

};


/**
 * Create a test.
 * @param {string} title test title.
 * @param {Function} test test function.
 * @param {Function} init initialization function.
 * @param {number} nExp number of experiment.
 * @param {number=} nOp number of op. Default to 1.
 * @param {number=} nData number of data. Default to nOp.
 * @constructor
 */
Test = function(title, test, init, nExp, nOp, nData) {
  this.title = title;
  this.test = test;
  this.init = init;
  this.nExp = nExp;
  this.nOp = nOp || 1;
  this.nData = nData || nOp;
};


/**
 * Prepare data for test.
 * @param {*} data test group data.
 * @return {*} by default reuse group data.
 */
Test.prototype.prepareData = function(data) {
  return data;
};


Test.prototype.run = function(db, data, onComplete) {
  var d = this.prepareData(data);
  var start = + new Date();
  var nop = this.nOp;
  var on_complete = function() {
    var end = + new Date();
    var elapse = end - start;
    onComplete(1000 * nop / elapse);
  };
  this.test(db, d, on_complete, this.nOp, this.nData);
};


/**
 * @param {string} title test title.
 * @param {Function} test test function.
 * @param {Function} init initialization function.
 * @param {number=} nOp number of op. Default to 1.
 * @param {number=} nData number of data. Default to nOp.
 */
Pref.prototype.addTest = function(title, test, init, nOp, nData) {
  var test = new Test(title, test, init, this.nRepeat, nOp, nData);
  this.tests_.push(test);
  return test;
};


/**
 * To continue testing after this test suite.
 * @param {ydn.db.Storage} db storage instance.
 * @param {string} title title.
 * @param {number=} opt_nExp number of experiment.
 * @return {Pref}
 */
Pref.newPref = function(db, title, nExp) {
  var pref = new Pref(db, title, nExp);
  if (!Pref.prefs_) {
    Pref.prefs_ = [];
  }
  Pref.prefs_.push(pref);
  return pref;
};


Pref.run = function() {
  if (Pref.running_) {
    return;
  }
  Pref.running_ = true;
  var run = function() {
    var pref = Pref.prefs_.shift();
    if (pref) {
      pref.run(function() {
        run();
      })
    } else {
      console.log('All run.')
    }
  };
  setTimeout(function() {
    run();
  }, 1);
};


Pref.prototype.tearDown = function() {
  // clean up.
  ydn.db.deleteDatabase(this.db.getName(), this.db.getType());
  this.db.close();
};


/**
 * @param {Function} cb callback on completing the run.
 */
Pref.prototype.run = function(cb) {
  var test = this.tests_.shift();
  var me = this;
  if (!this.tbody) {
    var table = document.getElementById('result-table');
    var tr = document.createElement('tr');
    tr.innerHTML = '<th colspan=7 class="title">' + (this.title || '') +
        '</th>';
    table.appendChild(tr);
    this.tbody = document.createElement('tbody');
    table.appendChild(this.tbody);
  }
  var onComplete = function() {
    me.run(cb);
  };
  if (test) {
    this.runTest(test, onComplete);
  } else {
    this.tearDown();
    if (cb) {
      cb();
    }
  }
};
