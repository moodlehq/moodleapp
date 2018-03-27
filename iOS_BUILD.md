## iOS build instructions ##
Build fails due to couple of packages
* DocumentHandler
* WebIntent

### Get v3.5.0 ### 
```shell
git clone https://github.com/1hf/moodlemobile2.git
cd moodlemobile2/
git checkout v3.5.0
```

### Install DocumentHandler from source ###
```shell 	
cd .. 
git clone https://github.com/ti8m/DocumentHandler.git
DocumentHandler/
npm install --save-dev plugman
node_modules/.bin/plugman createpackagejson .
cd ../moodlemobile2/
ionic cordova plugin add ../DocumentHandler
```

### Install WebIntent from source ###
```shell
cd ..
git clone https://github.com/Tunts/WebIntent.git
cd WebIntent/
npm install --save-dev plugman
node_modules/.bin/plugman createpackagejson .
cd ..
cd moodlemobile2/
ionic cordova plugin add ../WebIntent
```

### If CocoaPods not set ###
```shell
pod setup
ionic cordova plugin add phonegap-plugin-push
```
### Remove windows related packages ###
```shell
npm remove @nodert-win10/windows.data.xml.dom --save
npm remove electron-windows-notifications --save
```
### Rebuild ###
```shell
ionic cordova platform remove ios
ionic cordova platform add ios
ionic cordova build ios
open platforms/ios/Moodle\ Mobile.xcworkspace/
```
