#!/usr/bin/env node

var exec = require('child_process').exec,
   child;

console.log('Running Gulp tasks. Please wait...');

var gulpCommand = 'gulp default';

child = exec(gulpCommand, function (error, stdout, stderr) {
   if (error !== null) {
     console.log('exec error: ' + error);
   }
});