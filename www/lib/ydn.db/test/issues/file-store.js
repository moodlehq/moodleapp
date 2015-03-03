/**
 * Test for Issue 17: multiple concurrent IndexedDB open requests test
 *
 * 1. Before running this test, clear offline data in the browser so that
 * testing db are not already exist.
 * 2. configure firefox to ask the user before letting your domain use offline
 * storage
 */


var div = document.getElementById('console');
var c = new goog.debug.DivConsole(div);
c.setCapturing(true);

goog.log.getLogger('ydn.db').setLevel(goog.debug.Logger.Level.FINE);
goog.log.getLogger('ydn.db.conn').setLevel(
    goog.debug.Logger.Level.FINEST);

// NOTE: size is only used in WebSQL
var options = {
  mechanisms: ['websql', 'indexeddb'] //  'indexeddb'
};


var file_schema = {
  stores: [
    {
      name: 'file',
      type: 'BLOB'
    }
  ]};
db = new ydn.db.Storage('file-test-1', file_schema, options);


/**
 * @param {string} url URL of the file to be retrieved.
 * @param {Function=} callback optional callback.
 */
var saveImage = function(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'blob';
  xhr.addEventListener('load', function() {
    if (xhr.status === 200) {
      console.log('Image retrieved');
      var blob = xhr.response;
      // Put the received blob into IndexedDB
      db.put('file', blob, url).then(function(key) {
          console.log('Save to ', 'file:' + key);
          if (callback) {callback(key);}
        }, function(e) {
          throw e;
        }
      );
    }
  }, false);
  xhr.send();
};


/**
 * @param {string} key the key of the image record.
 */
var showImage = function(key) {
  db.get('file', key).done(function(record) {

    // Get window.URL object
    var URL = window.URL || window.webkitURL;
    // Create ObjectURL
    var imgURL = URL.createObjectURL(record);
    // Set img src to ObjectURL
    var img = document.createElement('img');
    img.setAttribute('name', url);
    img.setAttribute('src', imgURL);
    document.body.appendChild(img);
    // Revoking ObjectURL
    URL.revokeObjectURL(imgURL);
  }, function(e) {
    throw e;
  });
};



var playDeferred = function(wait) {
  console.log('running playDeferred');
  var df1 = new goog.async.Deferred();
  df1.addCallbacks(function(x) {
    console.log('df1 success', x);
  }, function(e) {
    console.log('df1 error', x);
  });
  setTimeout(function() {
    // df1.callback(goog.now());
  }, 100);
  var df2 = new goog.async.Deferred();
  df2.addCallbacks(function(x) {
    console.log('df2 success', x);
  }, function(e) {
    console.log('df2 error', x);
  });
  setTimeout(function() {
    df2.callback(goog.now());
  }, 1000);
  if (wait) {
    df2.awaitDeferred(df1);
  }
};


url = 'http://upload.wikimedia.org/wikipedia/commons/6/6e/HTML5-logo.svg';
saveImage(url, function(key) {
  showImage(key);
});
