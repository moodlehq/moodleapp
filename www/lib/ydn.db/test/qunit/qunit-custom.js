
var m = location.search.match(/module=(\w+)/);
var test_module = m ? m[1] : null;
m = location.search.match(/filename=(\w+)/);
var filename = m ? m[1] : 'ydn.db-dev.js';
m = location.search.match(/mechanism=(\w+)/);
var mechanisms = m ? [m[1]] : [];
m = location.search.match(/log=(\w+)/);
var log = m ? m[1] : '';

var injectJs = function(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, false);
  xhr.send('');
  console.log('loading ' + url);
  eval(xhr.responseText);
};

injectJs('../../jsc/' + filename);
var reporter = new ydn.testing.Reporter('ydn-db', ydn.db.version);


var options = {mechanisms: mechanisms};
if (log) {
  if (ydn.debug && ydn.debug.log) {
    ydn.debug.log('ydn.db', log);
  } else {
    console.log('no logging facility');
  }
}

// QUnit.config.testTimeout = 2000;
QUnit.config.reorder = false;
// QUnit.config.autostart = false;

// unit test runner must define suite name be for starting a module.



QUnit.testDone(function(result) {
  reporter.addResult(result.module,
      result.name, result.failed, result.passed, result.duration);
});

QUnit.moduleDone(function(result) {
  reporter.endTestSuite(result.name, result);
});

QUnit.done(function() {
  // reporter.report();
});

injectJs('crud.js');
QUnit.init();




