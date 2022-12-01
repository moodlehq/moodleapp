H5P library
---------------

Changes:

1. The h5p.js file has been modified to make fullscreen work in the Moodle app. In line 34, the code inside the condition document.documentElement.webkitRequestFullScreen has changed, the original code has been commented.
2. The h5p.js file has been modified to simulate a fake full screen in iOS. The H5P file now sends post messages to the app, and also listens to messages sent by the app to enter/exit full screen.
