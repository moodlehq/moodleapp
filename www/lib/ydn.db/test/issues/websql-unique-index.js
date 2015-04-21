/**
 * @fileoverview Testing websql unique index.
 */


var db = window.openDatabase('unique-index-test', '', 'test db', 1*1024*1024);
var new_ver = '3';
if (db.version != new_ver) {
  db.changeVersion(db.version, new_ver, function(tx) {
    updateDb(tx);
  }, function(e) {
    console.log('db opening ' + new_ver + ' error ' + e.message);
    return false;
  }, function() {
    console.log('db created ' + new_ver);
  });
} else {
  console.log('db opened ' + db.version);
  db.transaction(function(tx) {
    updateDb(tx);
  }, function(e) {
    console.log('db updating ' + new_ver + ' error ' + e.message);
    return false;
  }, function() {
    console.log('db updated ' + new_ver);
  });
}

function updateDb(tx) {
  var sql = 'CREATE TABLE IF NOT EXISTS  st (id INTEGER PRIMARY KEY, idx INTEGER UNIQUE)';
  tx.executeSql(sql, [], function(tx) {
    console.log('table created ' + sql);
  }, function(e) {
    console.log('executing ' + sql + ' error ' + e.message);
    return true;
  });
}


var doTest1 = function() {
  doTest(true, [1, 1], function(e) {
    console.log(e);
  });
};

var doTest2 = function() {
  doTest(false, [2, 1], function(e) {
    console.log(e);
  });
};


var doTest = function(create, values, cb) {
  var insert_statement = create ? 'INSERT INTO ' : 'INSERT OR REPLACE INTO ';
  var sql = insert_statement + ' st (id, idx) VALUES (?, ?)';
  var lbl = sql + JSON.stringify(values);
  console.log('testing for ' + lbl);
  db.transaction(function(tx) {
    tx.executeSql(sql, values, function(tx, result) {
      console.log(lbl + ' ok, row effected: ' + result.rowsAffected);
    }, function(tx, e) {
      console.log(lbl + ' execute error ' + e.message);
    });
  }, function(e) {
    console.log(lbl + ' tx error ' + e.message);
    cb(e);
  }, function(tx) {
    console.log(lbl + ' committed');
    cb();
  });
};


var deleteDb = function() {
  db.transaction(function(tx) {
    tx.executeSql('DROP TABLE IF EXISTS st');
  }, function(e) {
    throw e;
  }, function() {
    console.log('db deleted');
  });
};
