var db_name = 'test_abort_2';

var schema = {
  stores: [
    {
      name: 's1',
      keyPath: 'id',
      type: 'NUMERIC'
    },
    {
      name: 's2',
      keyPath: 'id',
      type: 'NUMERIC'
    },
    {
      name: 's3',
      keyPath: 'id',
      type: 'NUMERIC'
    }
  ]
};
var obj = {
  id: Math.random(),
  value: 'msg' + Math.random()
};
var obj2 = {
  id: Math.random(),
  value: 'msg' + Math.random()
};

var db = new ydn.db.Storage(db_name, schema);
var adb = db.branch('atomic', true); // atomic-serial

var done_count = 0;
var done = function () {
  done_count++;
  if (done_count >= 1) {
    ydn.db.deleteDatabase(db_name, db.getType());
    db.close();
  }
};

var req = db.run(function (tdb) {
  tdb.put('s1', obj).always(function (key) {
    var req_get = tdb.get('s1', obj.id);
    req_get.then(function (result) {
      console.assert(obj.value == result.value, 'store 1 result, expect ' + obj.value + ' but ' + result.value);
      req_get.abort();
    }, function (e) {
      console.assert(false, 'store 1 get not error');
    });
  });

}, ['s1'], 'readwrite');
req.always(function (x) {
  // console.log(x);
  db.get('s1', obj.id).always(function (result) {
    console.assert(result == undefined, 'aborted store 1 done result ' + result);
    done();
  });
});

