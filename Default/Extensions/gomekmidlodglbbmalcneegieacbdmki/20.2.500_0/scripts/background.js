!function(e){
var t={}
function n(i){
if(t[i]){
return t[i].exports
}
var a=t[i]={
i:i,
l:!1,
exports:{}
}
return e[i].call(a.exports,a,a.exports,n),a.l=!0,a.exports
}
n.m=e,n.c=t,n.d=function(e,t,i){
n.o(e,t)||Object.defineProperty(e,t,{
enumerable:!0,
get:i
})
},n.r=function(e){
"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{
value:"Module"
}),Object.defineProperty(e,"__esModule",{
value:!0
})
},n.t=function(e,t){
if(1&t&&(e=n(e)),8&t){
return e
}
if(4&t&&"object"==typeof e&&e&&e.__esModule){
return e
}
var i=Object.create(null)
if(n.r(i),Object.defineProperty(i,"default",{
enumerable:!0,
value:e
}),2&t&&"string"!=typeof e){
for(var a in e){
n.d(i,a,function(t){
return e[t]
}.bind(null,a))
}
}
return i
},n.n=function(e){
var t=e&&e.__esModule?function(){
return e.default
}:function(){
return e
}
return n.d(t,"a",t),t
},n.o=function(e,t){
return Object.prototype.hasOwnProperty.call(e,t)
},n.p="",n(n.s=48)
}([function(e,t,n){
"use strict"
e.exports=n(34)
},function(e,t,n){
"use strict"
var i=n(8),a="object"==typeof self&&self&&self.Object===Object&&self,o=i.a||a||Function("return this")()
t.a=o
},function(e,t,n){
"use strict"
;(function(e){
var i=n(8),a="object"==typeof exports&&exports&&!exports.nodeType&&exports,o=a&&"object"==typeof e&&e&&!e.nodeType&&e,r=o&&o.exports===a&&i.a.process,s=function(){
try{
var e=o&&o.require&&o.require("util").types
return e||r&&r.binding&&r.binding("util")
}catch(e){}
}()
t.a=s
}).call(this,n(9)(e))
},function(e,t,n){
"use strict"
var i=t
function a(e,t,n){
for(var i=Object.keys(t),a=0;a<i.length;++a){
void 0!==e[i[a]]&&n||(e[i[a]]=t[i[a]])
}
return e
}
function o(e){
function t(e,n){
if(!(this instanceof t)){
return new t(e,n)
}
Object.defineProperty(this,"message",{
get:function(){
return e
}
}),Error.captureStackTrace?Error.captureStackTrace(this,t):Object.defineProperty(this,"stack",{
value:(new Error).stack||""
}),n&&a(this,n)
}
return(t.prototype=Object.create(Error.prototype)).constructor=t,Object.defineProperty(t.prototype,"name",{
get:function(){
return e
}
}),t.prototype.toString=function(){
return this.name+": "+this.message
},t
}
i.asPromise=n(35),i.base64=n(36),i.EventEmitter=n(37),i.float=n(38),i.inquire=n(39),
i.utf8=n(40),
i.pool=n(41),i.LongBits=n(42),i.global="undefined"!=typeof window&&window||"undefined"!=typeof global&&global||"undefined"!=typeof self&&self||this,
i.emptyArray=Object.freeze?Object.freeze([]):[],
i.emptyObject=Object.freeze?Object.freeze({}):{},
i.isNode=Boolean(i.global.process&&i.global.process.versions&&i.global.process.versions.node),
i.isInteger=Number.isInteger||function(e){
return"number"==typeof e&&isFinite(e)&&Math.floor(e)===e
},i.isString=function(e){
return"string"==typeof e||e instanceof String
},i.isObject=function(e){
return e&&"object"==typeof e
},i.isset=i.isSet=function(e,t){
var n=e[t]
return!(null==n||!e.hasOwnProperty(t))&&("object"!=typeof n||(Array.isArray(n)?n.length:Object.keys(n).length)>0)
},
i.Buffer=function(){
try{
var e=i.inquire("buffer").Buffer
return e.prototype.utf8Write?e:null
}catch(e){
return null
}
}(),i._Buffer_from=null,i._Buffer_allocUnsafe=null,i.newBuffer=function(e){
return"number"==typeof e?i.Buffer?i._Buffer_allocUnsafe(e):new i.Array(e):i.Buffer?i._Buffer_from(e):"undefined"==typeof Uint8Array?e:new Uint8Array(e)
},
i.Array="undefined"!=typeof Uint8Array?Uint8Array:Array,i.Long=i.global.dcodeIO&&i.global.dcodeIO.Long||i.global.Long||i.inquire("long"),
i.key2Re=/^true|false|0|1$/,
i.key32Re=/^-?(?:0|[1-9][0-9]*)$/,i.key64Re=/^(?:[\\x00-\\xff]{8}|-?(?:0|[1-9][0-9]*))$/,
i.longToHash=function(e){
return e?i.LongBits.from(e).toHash():i.LongBits.zeroHash
},i.longFromHash=function(e,t){
var n=i.LongBits.fromHash(e)
return i.Long?i.Long.fromBits(n.lo,n.hi,t):n.toNumber(Boolean(t))
},i.merge=a,i.lcFirst=function(e){
return e.charAt(0).toLowerCase()+e.substring(1)
},i.newError=o,i.ProtocolError=o("ProtocolError"),
i.oneOfGetter=function(e){
for(var t={},n=0;n<e.length;++n){
t[e[n]]=1
}
return function(){
for(var e=Object.keys(this),n=e.length-1;n>-1;--n){
if(1===t[e[n]]&&void 0!==this[e[n]]&&null!==this[e[n]]){
return e[n]
}
}
}
},i.oneOfSetter=function(e){
return function(t){
for(var n=0;n<e.length;++n){
e[n]!==t&&delete this[e[n]]
}
}
},i.toJSONOptions={
longs:String,
enums:String,
bytes:String,
json:!0
},i._configure=function(){
var e=i.Buffer
e?(i._Buffer_from=e.from!==Uint8Array.from&&e.from||function(t,n){
return new e(t,n)
},i._Buffer_allocUnsafe=e.allocUnsafe||function(t){
return new e(t)
}):i._Buffer_from=i._Buffer_allocUnsafe=null
}
},function(e,t,n){
"use strict"
;(function(e){
var i=n(1),a=n(13),o="object"==typeof exports&&exports&&!exports.nodeType&&exports,r=o&&"object"==typeof e&&e&&!e.nodeType&&e,s=r&&r.exports===o?i.a.Buffer:void 0,u=(s?s.isBuffer:void 0)||a.a
t.a=u
}).call(this,n(9)(e))
},,function(e,t){},function(e,t,n){
"use strict"
var i=n(23),a={}
a.rules=n(25).map((function(e){
return{
rule:e,
suffix:e.replace(/^(\*\.|\!)/,""),
punySuffix:-1,
wildcard:"*"===e.charAt(0),
exception:"!"===e.charAt(0)
}
})),a.endsWith=function(e,t){
return-1!==e.indexOf(t,e.length-t.length)
},a.findRule=function(e){
var t=i.toASCII(e)
return a.rules.reduce((function(e,n){
return-1===n.punySuffix&&(n.punySuffix=i.toASCII(n.suffix)),
a.endsWith(t,"."+n.punySuffix)||t===n.punySuffix?n:e
}),null)
},t.errorCodes={
DOMAIN_TOO_SHORT:"Domain name too short.",
DOMAIN_TOO_LONG:"Domain name too long. It should be no more than 255 chars.",
LABEL_STARTS_WITH_DASH:"Domain name label can not start with a dash.",
LABEL_ENDS_WITH_DASH:"Domain name label can not end with a dash.",
LABEL_TOO_LONG:"Domain name label should be at most 63 chars long.",
LABEL_TOO_SHORT:"Domain name label should be at least 1 character long.",
LABEL_INVALID_CHARS:"Domain name label can only contain alphanumeric characters or dashes."
},
a.validate=function(e){
var t=i.toASCII(e)
if(t.length<1){
return"DOMAIN_TOO_SHORT"
}
if(t.length>255){
return"DOMAIN_TOO_LONG"
}
for(var n,a=t.split("."),o=0;o<a.length;++o){
if(!(n=a[o]).length){
return"LABEL_TOO_SHORT"
}
if(n.length>63){
return"LABEL_TOO_LONG"
}
if("-"===n.charAt(0)){
return"LABEL_STARTS_WITH_DASH"
}
if("-"===n.charAt(n.length-1)){
return"LABEL_ENDS_WITH_DASH"
}
if(!/^[a-z0-9\-]+$/.test(n)){
return"LABEL_INVALID_CHARS"
}
}
},t.parse=function(e){
if("string"!=typeof e){
throw new TypeError("Domain name must be a string.")
}
var n=e.slice(0).toLowerCase()
"."===n.charAt(n.length-1)&&(n=n.slice(0,n.length-1))
var o=a.validate(n)
if(o){
return{
input:e,
error:{
message:t.errorCodes[o],
code:o
}
}
}
var r={
input:e,
tld:null,
sld:null,
domain:null,
subdomain:null,
listed:!1
},s=n.split(".")
if("local"===s[s.length-1]){
return r
}
var u=function(){
return/xn--/.test(n)?(r.domain&&(r.domain=i.toASCII(r.domain)),
r.subdomain&&(r.subdomain=i.toASCII(r.subdomain)),
r):r
},l=a.findRule(n)
if(!l){
return s.length<2?r:(r.tld=s.pop(),r.sld=s.pop(),r.domain=[r.sld,r.tld].join("."),
s.length&&(r.subdomain=s.pop()),
u())
}
r.listed=!0
var c=l.suffix.split("."),p=s.slice(0,s.length-c.length)
return l.exception&&p.push(c.shift()),r.tld=c.join("."),p.length?(l.wildcard&&(c.unshift(p.pop()),
r.tld=c.join(".")),
p.length?(r.sld=p.pop(),r.domain=[r.sld,r.tld].join("."),p.length&&(r.subdomain=p.join(".")),
u()):u()):u()
},t.get=function(e){
return e&&t.parse(e).domain||null
},t.isValid=function(e){
var n=t.parse(e)
return Boolean(n.domain&&n.listed)
}
},function(e,t,n){
"use strict"
var i="object"==typeof global&&global&&global.Object===Object&&global
t.a=i
},function(e,t){
e.exports=function(e){
if(!e.webpackPolyfill){
var t=Object.create(e)
t.children||(t.children=[]),Object.defineProperty(t,"loaded",{
enumerable:!0,
get:function(){
return t.l
}
}),Object.defineProperty(t,"id",{
enumerable:!0,
get:function(){
return t.i
}
}),Object.defineProperty(t,"exports",{
enumerable:!0
}),t.webpackPolyfill=1
}
return t
}
},function(e,t){
var n,i,a=e.exports={}
function o(){
throw new Error("setTimeout has not been defined")
}
function r(){
throw new Error("clearTimeout has not been defined")
}
function s(e){
if(n===setTimeout){
return setTimeout(e,0)
}
if((n===o||!n)&&setTimeout){
return n=setTimeout,setTimeout(e,0)
}
try{
return n(e,0)
}catch(t){
try{
return n.call(null,e,0)
}catch(t){
return n.call(this,e,0)
}
}
}
!function(){
try{
n="function"==typeof setTimeout?setTimeout:o
}catch(e){
n=o
}
try{
i="function"==typeof clearTimeout?clearTimeout:r
}catch(e){
i=r
}
}()
var u,l=[],c=!1,p=-1
function m(){
c&&u&&(c=!1,u.length?l=u.concat(l):p=-1,l.length&&d())
}
function d(){
if(!c){
var e=s(m)
c=!0
for(var t=l.length;t;){
for(u=l,l=[];++p<t;){
u&&u[p].run()
}
p=-1,t=l.length
}
u=null,c=!1,function(e){
if(i===clearTimeout){
return clearTimeout(e)
}
if((i===r||!i)&&clearTimeout){
return i=clearTimeout,clearTimeout(e)
}
try{
i(e)
}catch(t){
try{
return i.call(null,e)
}catch(t){
return i.call(this,e)
}
}
}(e)
}
}
function h(e,t){
this.fun=e,this.array=t
}
function g(){}
a.nextTick=function(e){
var t=new Array(arguments.length-1)
if(arguments.length>1){
for(var n=1;n<arguments.length;n++){
t[n-1]=arguments[n]
}
}
l.push(new h(e,t)),1!==l.length||c||s(d)
},h.prototype.run=function(){
this.fun.apply(null,this.array)
},a.title="browser",a.browser=!0,a.env={},a.argv=[],
a.version="",a.versions={},a.on=g,
a.addListener=g,a.once=g,a.off=g,a.removeListener=g,
a.removeAllListeners=g,a.emit=g,
a.prependListener=g,a.prependOnceListener=g,a.listeners=function(e){
return[]
},a.binding=function(e){
throw new Error("process.binding is not supported")
},a.cwd=function(){
return"/"
},a.chdir=function(e){
throw new Error("process.chdir is not supported")
},a.umask=function(){
return 0
}
},function(e,t,n){
"use strict"
e.exports=p
var i,a=n(3),o=a.LongBits,r=a.base64,s=a.utf8
function u(e,t,n){
this.fn=e,this.len=t,this.next=void 0,this.val=n
}
function l(){}
function c(e){
this.head=e.head,this.tail=e.tail,this.len=e.len,this.next=e.states
}
function p(){
this.len=0,this.head=new u(l,0,0),this.tail=this.head,this.states=null
}
var m=function(){
return a.Buffer?function(){
return(p.create=function(){
return new i
})()
}:function(){
return new p
}
}
function d(e,t,n){
t[n]=255&e
}
function h(e,t){
this.len=e,this.next=void 0,this.val=t
}
function g(e,t,n){
for(;e.hi;){
t[n++]=127&e.lo|128,e.lo=(e.lo>>>7|e.hi<<25)>>>0,e.hi>>>=7
}
for(;e.lo>127;){
t[n++]=127&e.lo|128,e.lo=e.lo>>>7
}
t[n++]=e.lo
}
function f(e,t,n){
t[n]=255&e,t[n+1]=e>>>8&255,t[n+2]=e>>>16&255,t[n+3]=e>>>24
}
p.create=m(),p.alloc=function(e){
return new a.Array(e)
},a.Array!==Array&&(p.alloc=a.pool(p.alloc,a.Array.prototype.subarray)),
p.prototype._push=function(e,t,n){
return this.tail=this.tail.next=new u(e,t,n),this.len+=t,
this
},h.prototype=Object.create(u.prototype),h.prototype.fn=function(e,t,n){
for(;e>127;){
t[n++]=127&e|128,e>>>=7
}
t[n]=e
},p.prototype.uint32=function(e){
return this.len+=(this.tail=this.tail.next=new h((e>>>=0)<128?1:e<16384?2:e<2097152?3:e<268435456?4:5,e)).len,
this
},p.prototype.int32=function(e){
return e<0?this._push(g,10,o.fromNumber(e)):this.uint32(e)
},p.prototype.sint32=function(e){
return this.uint32((e<<1^e>>31)>>>0)
},p.prototype.uint64=function(e){
var t=o.from(e)
return this._push(g,t.length(),t)
},p.prototype.int64=p.prototype.uint64,p.prototype.sint64=function(e){
var t=o.from(e).zzEncode()
return this._push(g,t.length(),t)
},p.prototype.bool=function(e){
return this._push(d,1,e?1:0)
},p.prototype.fixed32=function(e){
return this._push(f,4,e>>>0)
},p.prototype.sfixed32=p.prototype.fixed32,p.prototype.fixed64=function(e){
var t=o.from(e)
return this._push(f,4,t.lo)._push(f,4,t.hi)
},p.prototype.sfixed64=p.prototype.fixed64,
p.prototype.float=function(e){
return this._push(a.float.writeFloatLE,4,e)
},p.prototype.double=function(e){
return this._push(a.float.writeDoubleLE,8,e)
}
var b=a.Array.prototype.set?function(e,t,n){
t.set(e,n)
}:function(e,t,n){
for(var i=0;i<e.length;++i){
t[n+i]=e[i]
}
}
p.prototype.bytes=function(e){
var t=e.length>>>0
if(!t){
return this._push(d,1,0)
}
if(a.isString(e)){
var n=p.alloc(t=r.length(e))
r.decode(e,n,0),e=n
}
return this.uint32(t)._push(b,t,e)
},p.prototype.string=function(e){
var t=s.length(e)
return t?this.uint32(t)._push(s.write,t,e):this._push(d,1,0)
},p.prototype.fork=function(){
return this.states=new c(this),this.head=this.tail=new u(l,0,0),
this.len=0,this
},p.prototype.reset=function(){
return this.states?(this.head=this.states.head,this.tail=this.states.tail,
this.len=this.states.len,
this.states=this.states.next):(this.head=this.tail=new u(l,0,0),
this.len=0),this
},p.prototype.ldelim=function(){
var e=this.head,t=this.tail,n=this.len
return this.reset().uint32(n),n&&(this.tail.next=e.next,this.tail=t,this.len+=n),
this
},p.prototype.finish=function(){
for(var e=this.head.next,t=this.constructor.alloc(this.len),n=0;e;){
e.fn(e.val,t,n),
n+=e.len,e=e.next
}
return t
},p._configure=function(e){
i=e,p.create=m(),i._configure()
}
},function(e,t,n){
"use strict"
e.exports=u
var i,a=n(3),o=a.LongBits,r=a.utf8
function s(e,t){
return RangeError("index out of range: "+e.pos+" + "+(t||1)+" > "+e.len)
}
function u(e){
this.buf=e,this.pos=0,this.len=e.length
}
var l,c="undefined"!=typeof Uint8Array?function(e){
if(e instanceof Uint8Array||Array.isArray(e)){
return new u(e)
}
throw Error("illegal buffer")
}:function(e){
if(Array.isArray(e)){
return new u(e)
}
throw Error("illegal buffer")
},p=function(){
return a.Buffer?function(e){
return(u.create=function(e){
return a.Buffer.isBuffer(e)?new i(e):c(e)
})(e)
}:c
}
function m(){
var e=new o(0,0),t=0
if(!(this.len-this.pos>4)){
for(;t<3;++t){
if(this.pos>=this.len){
throw s(this)
}
if(e.lo=(e.lo|(127&this.buf[this.pos])<<7*t)>>>0,this.buf[this.pos++]<128){
return e
}
}
return e.lo=(e.lo|(127&this.buf[this.pos++])<<7*t)>>>0,e
}
for(;t<4;++t){
if(e.lo=(e.lo|(127&this.buf[this.pos])<<7*t)>>>0,this.buf[this.pos++]<128){
return e
}
}
if(e.lo=(e.lo|(127&this.buf[this.pos])<<28)>>>0,e.hi=(e.hi|(127&this.buf[this.pos])>>4)>>>0,
this.buf[this.pos++]<128){
return e
}
if(t=0,this.len-this.pos>4){
for(;t<5;++t){
if(e.hi=(e.hi|(127&this.buf[this.pos])<<7*t+3)>>>0,this.buf[this.pos++]<128){
return e
}
}
}else{
for(;t<5;++t){
if(this.pos>=this.len){
throw s(this)
}
if(e.hi=(e.hi|(127&this.buf[this.pos])<<7*t+3)>>>0,this.buf[this.pos++]<128){
return e
}
}
}
throw Error("invalid varint encoding")
}
function d(e,t){
return(e[t-4]|e[t-3]<<8|e[t-2]<<16|e[t-1]<<24)>>>0
}
function h(){
if(this.pos+8>this.len){
throw s(this,8)
}
return new o(d(this.buf,this.pos+=4),d(this.buf,this.pos+=4))
}
u.create=p(),u.prototype._slice=a.Array.prototype.subarray||a.Array.prototype.slice,
u.prototype.uint32=(l=4294967295,
function(){
if(l=(127&this.buf[this.pos])>>>0,this.buf[this.pos++]<128){
return l
}
if(l=(l|(127&this.buf[this.pos])<<7)>>>0,this.buf[this.pos++]<128){
return l
}
if(l=(l|(127&this.buf[this.pos])<<14)>>>0,this.buf[this.pos++]<128){
return l
}
if(l=(l|(127&this.buf[this.pos])<<21)>>>0,this.buf[this.pos++]<128){
return l
}
if(l=(l|(15&this.buf[this.pos])<<28)>>>0,this.buf[this.pos++]<128){
return l
}
if((this.pos+=5)>this.len){
throw this.pos=this.len,s(this,10)
}
return l
}),u.prototype.int32=function(){
return 0|this.uint32()
},u.prototype.sint32=function(){
var e=this.uint32()
return e>>>1^-(1&e)|0
},u.prototype.bool=function(){
return 0!==this.uint32()
},u.prototype.fixed32=function(){
if(this.pos+4>this.len){
throw s(this,4)
}
return d(this.buf,this.pos+=4)
},u.prototype.sfixed32=function(){
if(this.pos+4>this.len){
throw s(this,4)
}
return 0|d(this.buf,this.pos+=4)
},u.prototype.float=function(){
if(this.pos+4>this.len){
throw s(this,4)
}
var e=a.float.readFloatLE(this.buf,this.pos)
return this.pos+=4,e
},u.prototype.double=function(){
if(this.pos+8>this.len){
throw s(this,4)
}
var e=a.float.readDoubleLE(this.buf,this.pos)
return this.pos+=8,e
},u.prototype.bytes=function(){
var e=this.uint32(),t=this.pos,n=this.pos+e
if(n>this.len){
throw s(this,e)
}
return this.pos+=e,Array.isArray(this.buf)?this.buf.slice(t,n):t===n?new this.buf.constructor(0):this._slice.call(this.buf,t,n)
},
u.prototype.string=function(){
var e=this.bytes()
return r.read(e,0,e.length)
},u.prototype.skip=function(e){
if("number"==typeof e){
if(this.pos+e>this.len){
throw s(this,e)
}
this.pos+=e
}else{
do{
if(this.pos>=this.len){
throw s(this)
}
}while(128&this.buf[this.pos++])
}
return this
},u.prototype.skipType=function(e){
switch(e){
case 0:
this.skip()
break
case 1:
this.skip(8)
break
case 2:
this.skip(this.uint32())
break
case 3:
for(;4!=(e=7&this.uint32());){
this.skipType(e)
}
break
case 5:
this.skip(4)
break
default:
throw Error("invalid wire type "+e+" at offset "+this.pos)
}
return this
},u._configure=function(e){
i=e,u.create=p(),i._configure()
var t=a.Long?"toLong":"toNumber"
a.merge(u.prototype,{
int64:function(){
return m.call(this)[t](!1)
},
uint64:function(){
return m.call(this)[t](!0)
},
sint64:function(){
return m.call(this).zzDecode()[t](!1)
},
fixed64:function(){
return h.call(this)[t](!0)
},
sfixed64:function(){
return h.call(this)[t](!1)
}
})
}
},function(e,t,n){
"use strict"
t.a=function(){
return!1
}
},function(e,t,n){
(function(i){
var a
!function(o){
var r=Array.isArray?Array.isArray:function(e){
return"[object Array]"===Object.prototype.toString.call(e)
}
function s(){
this._events={},this._conf&&u.call(this,this._conf)
}
function u(e){
e?(this._conf=e,e.delimiter&&(this.delimiter=e.delimiter),this._maxListeners=void 0!==e.maxListeners?e.maxListeners:10,
e.wildcard&&(this.wildcard=e.wildcard),
e.newListener&&(this._newListener=e.newListener),
e.removeListener&&(this._removeListener=e.removeListener),
e.verboseMemoryLeak&&(this.verboseMemoryLeak=e.verboseMemoryLeak),
this.wildcard&&(this.listenerTree={})):this._maxListeners=10
}
function l(e,t){
var n="(node) warning: possible EventEmitter memory leak detected. "+e+" listeners added. Use emitter.setMaxListeners() to increase limit."
if(this.verboseMemoryLeak&&(n+=" Event name: "+t+"."),void 0!==i&&i.emitWarning){
var a=new Error(n)
a.name="MaxListenersExceededWarning",a.emitter=this,a.count=e,i.emitWarning(a)
}else{
console.trace
}
}
function c(e){
this._events={},this._newListener=!1,this._removeListener=!1,this.verboseMemoryLeak=!1,
u.call(this,e)
}
function p(e,t,n,i){
if(!n){
return[]
}
var a,o,r,s,u,l,c,m=[],d=t.length,h=t[i],g=t[i+1]
if(i===d&&n._listeners){
if("function"==typeof n._listeners){
return e&&e.push(n._listeners),[n]
}
for(a=0,o=n._listeners.length;a<o;a++){
e&&e.push(n._listeners[a])
}
return[n]
}
if("*"===h||"**"===h||n[h]){
if("*"===h){
for(r in n){
"_listeners"!==r&&n.hasOwnProperty(r)&&(m=m.concat(p(e,t,n[r],i+1)))
}
return m
}
if("**"===h){
for(r in(c=i+1===d||i+2===d&&"*"===g)&&n._listeners&&(m=m.concat(p(e,t,n,d))),
n){
"_listeners"!==r&&n.hasOwnProperty(r)&&("*"===r||"**"===r?(n[r]._listeners&&!c&&(m=m.concat(p(e,t,n[r],d))),
m=m.concat(p(e,t,n[r],i))):m=r===g?m.concat(p(e,t,n[r],i+2)):m.concat(p(e,t,n[r],i)))
}
return m
}
m=m.concat(p(e,t,n[h],i+1))
}
if((s=n["*"])&&p(e,t,s,i+1),u=n["**"]){
if(i<d){
for(r in u._listeners&&p(e,t,u,d),u){
"_listeners"!==r&&u.hasOwnProperty(r)&&(r===g?p(e,t,u[r],i+2):r===h?p(e,t,u[r],i+1):((l={})[r]=u[r],
p(e,t,{
"**":l
},i+1)))
}
}else{
u._listeners?p(e,t,u,d):u["*"]&&u["*"]._listeners&&p(e,t,u["*"],d)
}
}
return m
}
function m(e,t){
for(var n=0,i=(e="string"==typeof e?e.split(this.delimiter):e.slice()).length;n+1<i;n++){
if("**"===e[n]&&"**"===e[n+1]){
return
}
}
for(var a=this.listenerTree,o=e.shift();void 0!==o;){
if(a[o]||(a[o]={}),a=a[o],0===e.length){
return a._listeners?("function"==typeof a._listeners&&(a._listeners=[a._listeners]),
a._listeners.push(t),
!a._listeners.warned&&this._maxListeners>0&&a._listeners.length>this._maxListeners&&(a._listeners.warned=!0,
l.call(this,a._listeners.length,o))):a._listeners=t,
!0
}
o=e.shift()
}
return!0
}
c.EventEmitter2=c,c.prototype.delimiter=".",c.prototype.setMaxListeners=function(e){
void 0!==e&&(this._maxListeners=e,
this._conf||(this._conf={}),this._conf.maxListeners=e)
},c.prototype.event="",c.prototype.once=function(e,t){
return this._once(e,t,!1)
},c.prototype.prependOnceListener=function(e,t){
return this._once(e,t,!0)
},c.prototype._once=function(e,t,n){
return this._many(e,1,t,n),this
},c.prototype.many=function(e,t,n){
return this._many(e,t,n,!1)
},c.prototype.prependMany=function(e,t,n){
return this._many(e,t,n,!0)
},c.prototype._many=function(e,t,n,i){
var a=this
if("function"!=typeof n){
throw new Error("many only accepts instances of Function")
}
function o(){
return 0==--t&&a.off(e,o),n.apply(this,arguments)
}
return o._origin=n,this._on(e,o,i),a
},c.prototype.emit=function(){
this._events||s.call(this)
var e=arguments[0]
if("newListener"===e&&!this._newListener&&!this._events.newListener){
return!1
}
var t,n,i,a,o,r=arguments.length
if(this._all&&this._all.length){
if(o=this._all.slice(),r>3){
for(t=new Array(r),a=0;a<r;a++){
t[a]=arguments[a]
}
}
for(i=0,n=o.length;i<n;i++){
switch(this.event=e,r){
case 1:
o[i].call(this,e)
break
case 2:
o[i].call(this,e,arguments[1])
break
case 3:
o[i].call(this,e,arguments[1],arguments[2])
break
default:
o[i].apply(this,t)
}
}
}
if(this.wildcard){
o=[]
var u="string"==typeof e?e.split(this.delimiter):e.slice()
p.call(this,o,u,this.listenerTree,0)
}else{
if("function"==typeof(o=this._events[e])){
switch(this.event=e,r){
case 1:
o.call(this)
break
case 2:
o.call(this,arguments[1])
break
case 3:
o.call(this,arguments[1],arguments[2])
break
default:
for(t=new Array(r-1),a=1;a<r;a++){
t[a-1]=arguments[a]
}
o.apply(this,t)
}
return!0
}
o&&(o=o.slice())
}
if(o&&o.length){
if(r>3){
for(t=new Array(r-1),a=1;a<r;a++){
t[a-1]=arguments[a]
}
}
for(i=0,n=o.length;i<n;i++){
switch(this.event=e,r){
case 1:
o[i].call(this)
break
case 2:
o[i].call(this,arguments[1])
break
case 3:
o[i].call(this,arguments[1],arguments[2])
break
default:
o[i].apply(this,t)
}
}
return!0
}
if(!this._all&&"error"===e){
throw arguments[1]instanceof Error?arguments[1]:new Error("Uncaught, unspecified 'error' event.")
}
return!!this._all
},c.prototype.emitAsync=function(){
this._events||s.call(this)
var e=arguments[0]
if("newListener"===e&&!this._newListener&&!this._events.newListener){
return Promise.resolve([!1])
}
var t,n,i,a,o,r=[],u=arguments.length
if(this._all){
if(u>3){
for(t=new Array(u),a=1;a<u;a++){
t[a]=arguments[a]
}
}
for(i=0,n=this._all.length;i<n;i++){
switch(this.event=e,u){
case 1:
r.push(this._all[i].call(this,e))
break
case 2:
r.push(this._all[i].call(this,e,arguments[1]))
break
case 3:
r.push(this._all[i].call(this,e,arguments[1],arguments[2]))
break
default:
r.push(this._all[i].apply(this,t))
}
}
}
if(this.wildcard){
o=[]
var l="string"==typeof e?e.split(this.delimiter):e.slice()
p.call(this,o,l,this.listenerTree,0)
}else{
o=this._events[e]
}
if("function"==typeof o){
switch(this.event=e,u){
case 1:
r.push(o.call(this))
break
case 2:
r.push(o.call(this,arguments[1]))
break
case 3:
r.push(o.call(this,arguments[1],arguments[2]))
break
default:
for(t=new Array(u-1),a=1;a<u;a++){
t[a-1]=arguments[a]
}
r.push(o.apply(this,t))
}
}else if(o&&o.length){
if(o=o.slice(),u>3){
for(t=new Array(u-1),a=1;a<u;a++){
t[a-1]=arguments[a]
}
}
for(i=0,n=o.length;i<n;i++){
switch(this.event=e,u){
case 1:
r.push(o[i].call(this))
break
case 2:
r.push(o[i].call(this,arguments[1]))
break
case 3:
r.push(o[i].call(this,arguments[1],arguments[2]))
break
default:
r.push(o[i].apply(this,t))
}
}
}else if(!this._all&&"error"===e){
return arguments[1]instanceof Error?Promise.reject(arguments[1]):Promise.reject("Uncaught, unspecified 'error' event.")
}
return Promise.all(r)
},c.prototype.on=function(e,t){
return this._on(e,t,!1)
},c.prototype.prependListener=function(e,t){
return this._on(e,t,!0)
},c.prototype.onAny=function(e){
return this._onAny(e,!1)
},c.prototype.prependAny=function(e){
return this._onAny(e,!0)
},c.prototype.addListener=c.prototype.on,c.prototype._onAny=function(e,t){
if("function"!=typeof e){
throw new Error("onAny only accepts instances of Function")
}
return this._all||(this._all=[]),t?this._all.unshift(e):this._all.push(e),this
},
c.prototype._on=function(e,t,n){
if("function"==typeof e){
return this._onAny(e,t),this
}
if("function"!=typeof t){
throw new Error("on only accepts instances of Function")
}
return this._events||s.call(this),this._newListener&&this.emit("newListener",e,t),
this.wildcard?(m.call(this,e,t),
this):(this._events[e]?("function"==typeof this._events[e]&&(this._events[e]=[this._events[e]]),
n?this._events[e].unshift(t):this._events[e].push(t),
!this._events[e].warned&&this._maxListeners>0&&this._events[e].length>this._maxListeners&&(this._events[e].warned=!0,
l.call(this,this._events[e].length,e))):this._events[e]=t,
this)
},c.prototype.off=function(e,t){
if("function"!=typeof t){
throw new Error("removeListener only takes instances of Function")
}
var n,i=[]
if(this.wildcard){
var a="string"==typeof e?e.split(this.delimiter):e.slice()
i=p.call(this,null,a,this.listenerTree,0)
}else{
if(!this._events[e]){
return this
}
n=this._events[e],i.push({
_listeners:n
})
}
for(var o=0;o<i.length;o++){
var s=i[o]
if(n=s._listeners,r(n)){
for(var u=-1,l=0,c=n.length;l<c;l++){
if(n[l]===t||n[l].listener&&n[l].listener===t||n[l]._origin&&n[l]._origin===t){
u=l
break
}
}
if(u<0){
continue
}
return this.wildcard?s._listeners.splice(u,1):this._events[e].splice(u,1),0===n.length&&(this.wildcard?delete s._listeners:delete this._events[e]),
this._removeListener&&this.emit("removeListener",e,t),
this
}
(n===t||n.listener&&n.listener===t||n._origin&&n._origin===t)&&(this.wildcard?delete s._listeners:delete this._events[e],
this._removeListener&&this.emit("removeListener",e,t))
}
return function e(t){
if(void 0!==t){
var n=Object.keys(t)
for(var i in n){
var a=n[i],o=t[a]
o instanceof Function||"object"!=typeof o||null===o||(Object.keys(o).length>0&&e(t[a]),
0===Object.keys(o).length&&delete t[a])
}
}
}(this.listenerTree),this
},c.prototype.offAny=function(e){
var t,n=0,i=0
if(e&&this._all&&this._all.length>0){
for(n=0,i=(t=this._all).length;n<i;n++){
if(e===t[n]){
return t.splice(n,1),this._removeListener&&this.emit("removeListenerAny",e),
this
}
}
}else{
if(t=this._all,this._removeListener){
for(n=0,i=t.length;n<i;n++){
this.emit("removeListenerAny",t[n])
}
}
this._all=[]
}
return this
},c.prototype.removeListener=c.prototype.off,c.prototype.removeAllListeners=function(e){
if(void 0===e){
return!this._events||s.call(this),this
}
if(this.wildcard){
for(var t="string"==typeof e?e.split(this.delimiter):e.slice(),n=p.call(this,null,t,this.listenerTree,0),i=0;i<n.length;i++){
n[i]._listeners=null
}
}else{
this._events&&(this._events[e]=null)
}
return this
},c.prototype.listeners=function(e){
if(this.wildcard){
var t=[],n="string"==typeof e?e.split(this.delimiter):e.slice()
return p.call(this,t,n,this.listenerTree,0),t
}
return this._events||s.call(this),this._events[e]||(this._events[e]=[]),r(this._events[e])||(this._events[e]=[this._events[e]]),
this._events[e]
},c.prototype.eventNames=function(){
return Object.keys(this._events)
},c.prototype.listenerCount=function(e){
return this.listeners(e).length
},c.prototype.listenersAny=function(){
return this._all?this._all:[]
},void 0===(a=function(){
return c
}.call(t,n,t,e))||(e.exports=a)
}()
}).call(this,n(10))
},function(e){
e.exports=JSON.parse('[{"id":39,"name":"Google+","category":11,"pattern":"apis\\\\.google\\\\.com\\\\/(\\\\_\\\\/[+]1\\\\/fastbutton|js\\\\/plusone\\\\.js)|plusone\\\\.google\\\\.com\\\\/\\\\_\\\\/[+]1\\\\/fastbutton","domains":["google.com"]},{"id":110,"name":"Linkedin","category":13,"pattern":"platform\\\\.linkedin\\\\.com\\\\/in\\\\.js|platform\\\\.linkedin\\\\.com\\\\/js\\\\/(nonSecureAnonymousFramework|secureAnonymousFramework)|www\\\\.linkedin\\\\.com\\\\/countserv\\\\/count\\\\/share","domains":["linkedin.com"]},{"id":135,"name":"Disqus","category":13,"pattern":"mediacdn\\\\.disqus\\\\.com|disqus\\\\.com\\\\/(api|forums|embed)","domains":["disqus.com"]},{"id":400,"name":"Pinterest","category":13,"pattern":"assets\\\\.pinterest\\\\.com\\\\/js\\\\/pinit\\\\.js|\\\\.pinterest\\\\.com\\\\/images\\\\/(pidgets|(pinext|pinterest\\\\-button|follow\\\\-on\\\\-pinterest\\\\-button|(big|small)\\\\-p\\\\-button)\\\\.png|bm\\\\/button\\\\.png|about\\\\/buttons\\\\/(pinterest\\\\-button|follow\\\\-me\\\\-on\\\\-pinterest\\\\-button|(big|small)\\\\-p\\\\-button)\\\\.png)|(widgets|api)\\\\.pinterest\\\\.com(\\\\/v1\\\\/urls\\\\/count\\\\.json|\\\\/v3\\\\/pidgets\\\\/log\\\\/)","domains":["pinterest.com"]},{"id":703,"name":"Facebook","category":13,"pattern":"((badge|connect|api|graph)\\\\.facebook\\\\.(com|net))|(facebook\\\\.(com|net)\\\\/(badge|plugins|widgets|([a-z]+\\\\/u\\\\.php)))","domains":["facebook.com","facebook.net"]},{"id":704,"name":"Twitter","category":13,"pattern":"platform\\\\.twitter\\\\.com\\\\/widgets|r\\\\.twimg\\\\.com\\\\/jot|p\\\\.twitter\\\\.com\\\\/(f|t)\\\\.gif|twitter\\\\.com\\\\/javascripts\\\\/[0-9a-z]+\\\\.js|(cdn|urls)\\\\.api\\\\.twitter\\\\.com\\\\/.*\\\\/(count|show)\\\\.json","domains":["twitter.com","twimg.com"]},{"id":705,"name":"Doubleclick","category":3,"pattern":"([0-9a-z]+\\\\.)?([0-9a-z]|-|_)+\\\\.doubleclick\\\\.net|(([0-9a-z]|-)+\\\\.)?([0-9a-z]|-|_)+\\\\.2mdn\\\\.net","domains":["doubleclick.net","2mdn.net"]},{"id":706,"name":"Google Analytics","category":1,"pattern":"([0-9a-z]+\\\\.)?google-analytics\\\\.com(?!\\\\/cx)","domains":["google-analytics.com"]},{"id":707,"name":"Appnexus","category":3,"domains":["adnxs.com"]},{"id":708,"name":"Quantcast","category":3,"domains":["quantserve.com"]},{"id":710,"name":"Google Static","category":1,"pattern":"([0-9a-z]+\\\\.)?metric\\\\.gstatic\\\\.com","domains":["gstatic.com"]},{"id":711,"name":"Scorecard Research","category":1,"domains":["scorecardresearch.com"]},{"id":712,"name":"AddThis","category":11,"domains":["addthis.com"]},{"id":714,"name":"Google Adsense","category":5,"pattern":"([0-9a-z]+\\\\.)?googleadservices\\\\.com|([0-9a-z]+\\\\.)?([0-9a-z]|-|_)+\\\\.googlesyndication\\\\.com","domains":["googleadservices.com","googlesyndication.com"]},{"id":715,"name":"ShareThis","category":11,"domains":["sharethis.com"]},{"id":716,"name":"Yahoo Ad YieldManager","category":5,"domains":["yieldmanager.com"]},{"id":717,"name":"Rubicon","category":3,"domains":["rubiconproject.com"]},{"id":718,"name":"Turn","category":3,"domains":["turn.com"]},{"id":719,"name":"BlueKai","category":4,"domains":["bluekai.com"]},{"id":720,"name":"Invite Media by Google","category":4,"pattern":"(([0-9a-z]|-|_)+\\\\.)?(([0-9a-z]|-|_)+\\\\.)?([0-9a-z]|-|_)+\\\\.invitemedia\\\\.com","domains":["invitemedia.com"]},{"id":721,"name":"Google Admeld","category":4,"domains":["admeld.com"]},{"id":722,"name":"Twitter Counter","category":4,"pattern":"(cdn|button)\\\\.twittercounter\\\\.com","domains":["twittercounter.com"]},{"id":723,"name":"OpenX","category":5,"domains":["openx.com"]},{"id":724,"name":"Criteo","category":5,"pattern":"([0-9a-z]+\\\\.)?([0-9a-z]+\\\\.)?[0-9a-z]+\\\\.criteo\\\\.(com|net)","domains":["criteo.com","criteo.net"]},{"id":725,"name":"PubMatic","category":5,"domains":["pubmatic.com"]},{"id":726,"name":"CNZZ","category":1,"domains":["cnzz.com","cnzz.net"]},{"id":727,"name":"StatCounter","category":1,"domains":["statcounter.com"]},{"id":728,"name":"Chartbeat","category":1,"domains":["chartbeat.com","chartbeat.net"]},{"id":729,"name":"Google GPT","category":3,"pattern":"\\\\.googletagservices\\\\.com\\\\/tag\\\\/js\\\\/(.+)\\\\.js","domains":["googletagservices.com"]},{"id":730,"name":"Atlas Advertiser Suite","category":5,"domains":["atdmt.com"]},{"id":731,"name":"Simplicity Marketing Ltd","category":5,"domains":["flashtalking.com"]},{"id":732,"name":"AdTech AOL ","category":5,"domains":["adtech.de","adtechus.com"]},{"id":733,"name":"Gemius SA","category":3,"domains":["gemius.pl"]},{"id":734,"name":"Mediamind DG","category":5,"pattern":"([0-9a-z]+\\\\.)?([0-9a-z]+\\\\.)?[0-9a-z]+\\\\.serving\\\\-sys\\\\.com","domains":["serving-sys.com"]},{"id":735,"name":"MediaMath","category":3,"pattern":"([0-9a-z]+\\\\.)?([0-9a-z]+\\\\.)?[0-9a-z]+\\\\.mathtag\\\\.com","domains":["mathtag.com"]},{"id":736,"name":"ExoClick","category":5,"domains":["exoclick.com"]},{"id":737,"name":"PulsePoint","category":5,"domains":["contextweb.com"]},{"id":738,"name":"Tribal Fusion, Inc.","category":5,"domains":["tribalfusion.com"]},{"id":739,"name":"Brightcove, Inc","category":3,"pattern":"([a-z0-9]+\\\\.)brightcove\\\\.com\\\\/1pix\\\\.gif|metrics\\\\.brightcove\\\\.com\\\\/tracker","domains":["brightcove.com"]},{"id":740,"name":"Tynt by 33across.com","category":3,"domains":["tynt.com"]},{"id":741,"name":"AdRoll","category":5,"domains":["adroll.com"]},{"id":742,"name":"Zedo, Inc.","category":5,"domains":["zedo.com"]},{"id":743,"name":"Smart AdServer","category":5,"domains":["smartadserver.com"]},{"id":744,"name":"Zanox Ltd","category":5,"domains":["zanox.com"]},{"id":745,"name":"BuySellAds.com","category":5,"domains":["buysellads.com"]},{"id":746,"name":"Media Innovation Group","category":5,"domains":["mookie1.com"]},{"id":747,"name":"Vibrant Media","category":5,"domains":["intellitxt.com"]},{"id":748,"name":"PlugRush","category":4,"domains":["plugrush.com"]},{"id":749,"name":"eXelate","category":4,"domains":["exelator.com"]},{"id":751,"name":"AudienceScience Inc.","category":3,"domains":["revsci.net","wunderloop.net"]},{"id":752,"name":"AdScale","category":5,"domains":["adscale.de"]},{"id":753,"name":"Nielsen","category":3,"domains":["imrworldwide.com"]},{"id":754,"name":"Lotame","category":3,"domains":["crwdcntrl.net"]},{"id":755,"name":"whos.amung.us Inc.","category":1,"domains":["amung.us"]},{"id":756,"name":"Mediaplex","category":1,"domains":["mediaplex.com"]},{"id":758,"name":"2o7.net","category":1,"pattern":"[0-9a-z]+\\\\.122\\\\.2o7\\\\.net|[0-9a-z]+\\\\.112\\\\.2o7\\\\.net","domains":["2o7.net"]},{"id":759,"name":"Improve Digital","category":3,"domains":["360yield.com"]},{"id":760,"name":"Histats","category":1,"domains":["histats.com"]},{"id":761,"name":"Say Media","category":5,"domains":["saymedia.com"]},{"id":762,"name":"INFOnline GmbH","category":1,"domains":["ivwbox.de"]},{"id":763,"name":"Adobe AudienceManager","category":3,"domains":["demdex.net"]},{"id":764,"name":"Advertising.com","category":5,"domains":["advertising.com"]},{"id":765,"name":"DataXu, Inc.","category":5,"domains":["w55c.net"]},{"id":766,"name":"Datalogix","category":5,"domains":["nexac.com"]},{"id":767,"name":"AdOcean","category":3,"domains":["adocean.pl"]},{"id":768,"name":"Advanced Store","category":5,"domains":["ad4mat.de"]},{"id":769,"name":"Effective Measure","category":1,"domains":["effectivemeasure.net"]},{"id":770,"name":"TRUSTe","category":3,"pattern":"([a-z0-9]\\\\.)?choices\\\\.truste\\\\.com\\\\/(get|ca)","domains":["truste.com"]},{"id":771,"name":"JuicyAds","category":5,"domains":["juicyads.com"]},{"id":772,"name":"Heias AdServing Tech.","category":5,"pattern":"([a-z0-9]\\\\.)?ads\\\\.heias\\\\.com|cdn-([a-z0-9]|-)+\\\\.heias\\\\.com","domains":["heias.com"]},{"id":773,"name":"Redvertisment","category":5,"pattern":"([0-9a-z]+\\\\.)?hal9000\\\\.redintelligence\\\\.net","domains":["redintelligence.net"]},{"id":774,"name":"Rocket Fuel Inc.","category":3,"pattern":"(a|p|([0-9])p)\\\\.rfihub\\\\.com","domains":["rfihub.com"]},{"id":775,"name":"Caraytech","category":5,"domains":["e-planning.net"]},{"id":776,"name":"Tumblr","category":11,"pattern":"platform\\\\.tumblr\\\\.com\\\\/v[0-9]\\\\/(share([0-9a-z]|-|_)?|follow([0-9a-z]|-|_)?)","domains":["tumblr.com"]},{"id":777,"name":"Internet BillBoard","category":5,"domains":["ibillboard.com","bbelements.com"]},{"id":778,"name":"Optimizely","category":1,"pattern":"cdn([0-9]?)\\\\.optimizely\\\\.com\\\\/(js|img)","domains":["optimizely.com"]},{"id":779,"name":"Omniture","category":1,"domains":["omtrdc.net"]},{"id":780,"name":"Rambler Media","category":1,"pattern":"counter\\\\.rambler\\\\.ru\\\\/top100([0-9a-z]|-|_)?","domains":["rambler.ru"]},{"id":781,"name":"AdFox","category":5,"domains":["adfox.ru"]},{"id":782,"name":"Mail.Ru Group","category":1,"pattern":"[0-9a-z]+\\\\.mail\\\\.ru\\\\/(counter[0-9a-z]?|share[0-9a-z]?)|cdn\\\\.connect\\\\.mail\\\\.ru\\\\/js\\\\/(loader\\\\.js|share\\\\/[0-9]+\\\\/share\\\\.js)","domains":["mail.ru"]},{"id":783,"name":"XiTi By AT Internet","category":1,"domains":["xiti.com"]},{"id":784,"name":"Chango","category":5,"domains":["chango.com"]},{"id":785,"name":"New Relic","category":1,"pattern":"beacon-[0-9]\\\\.newrelic\\\\.com","domains":["newrelic.com"]},{"id":786,"name":"AudienceRate Ltd","category":4,"domains":["12mlbe.com"]},{"id":787,"name":"Casale Media","category":5,"pattern":"(as|ip|js|r|[0-9a-z]+)\\\\.casalemedia\\\\.com","domains":["casalemedia.com"]},{"id":788,"name":"LiveRamp, Inc.","category":3,"domains":["rlcdn.com"]},{"id":789,"name":"Neustar AdAdvisor","category":3,"domains":["adadvisor.net"]},{"id":790,"name":"Direct/Advert","category":5,"domains":["directadvert.ru"]},{"id":791,"name":"SiteScout","category":5,"domains":["sitescout.com"]},{"id":792,"name":"Google GTM","category":1,"pattern":"[0-9a-z]+\\\\.googletagmanager\\\\.com\\\\/gtm\\\\.js","domains":["googletagmanager.com"]},{"id":793,"name":"ValueClick Media","category":5,"pattern":"[0-9a-z]+\\\\.fastclick\\\\.net|[0-9a-z]+\\\\.apmebf\\\\.com|[0-9a-z]+\\\\.yceml\\\\.net","domains":["fastclick.net","apmebf.com","yceml.net"]},{"id":794,"name":"Simpli.fi","category":3,"domains":["simpli.fi"]},{"id":795,"name":"The Trade Desk","category":5,"domains":["adsrvr.org"]},{"id":796,"name":"Adobe Typekit","category":0,"pattern":"([a-z0-9].\\\\+)p\\\\.typekit\\\\.net\\\\/p\\\\.gif","domains":["typekit.net"]},{"id":797,"name":"Alexa","category":1,"pattern":"(xsltcache|xslt)\\\\.alexa\\\\.com\\\\/site_stats\\\\/(gif|js)\\\\/.*","domains":["alexa.com"]},{"id":798,"name":"24/7 Real Media","category":3,"domains":["247realmedia.com"]},{"id":799,"name":"EroAdvertising","category":5,"pattern":"(([a-z0-9]\\\\.)|data\\\\-)ero\\\\-advertising\\\\.com","domains":["ero-advertising.com","data-ero-advertising.com"]},{"id":800,"name":"News Distribution Network","category":5,"domains":["newsinc.com"]},{"id":801,"name":"TNS Gallup Media","category":3,"domains":["tns-counter.ru"]},{"id":802,"name":"Bizo Bizographic","category":5,"domains":["bizographics.com"]},{"id":803,"name":"Burst Media","category":5,"domains":["burstnet.com"]},{"id":804,"name":"[x+1]","category":3,"pattern":"([0-9a-z]+)\\\\.xp1\\\\.ru4\\\\.com","domains":["ru4.com"]},{"id":805,"name":"Dstillery","category":3,"domains":["media6degrees.com"]},{"id":806,"name":"Telemetry","category":5,"pattern":"([0-9a-z]+)\\\\.telemetryverification\\\\.net","domains":["telemetryverification.net"]},{"id":807,"name":"RadiumOne","category":13,"domains":["po.st","gwallet.com"]},{"id":808,"name":"AdPepper Media","category":5,"domains":["emediate.eu"]},{"id":809,"name":"TLVMedia","category":5,"domains":["tlvmedia.com"]},{"id":810,"name":"Feedjit","category":1,"domains":["feedjit.com"]},{"id":811,"name":"MicroAd","category":5,"domains":["microad.jp"]},{"id":812,"name":"Adform","category":5,"domains":["adform.net","adformdsp.net"]},{"id":813,"name":"AdRiver","category":5,"domains":["adriver.ru"]},{"id":814,"name":"Lijit Networks","category":5,"domains":["lijit.com"]},{"id":815,"name":"ADITION","category":5,"domains":["adition.com"]},{"id":816,"name":"Ligatus","category":3,"domains":["ligatus.com"]},{"id":817,"name":"Digilant","category":5,"domains":["wtp101.com"]},{"id":818,"name":"SpotXchange","category":5,"domains":["spotxchange.com"]},{"id":819,"name":"Tradedoubler","category":5,"domains":["tradedoubler.com"]},{"id":820,"name":"i-mobile Co.","category":5,"domains":["i-mobile.co.jp"]},{"id":821,"name":"Admeta","category":5,"domains":["atemda.com"]},{"id":822,"name":"Adconion Media Group","category":5,"domains":["amgdgt.com"]},{"id":823,"name":"Acxiom Corporation","category":4,"pattern":"p?\\\\.acxiom\\\\-online\\\\.com","domains":["acxiom-online.com"]},{"id":824,"name":"Krux","category":1,"domains":["krxd.net"]},{"id":825,"name":"Sociomantic Labs","category":5,"domains":["sociomantic.com"]},{"id":826,"name":"Federated Media Publishing","category":5,"domains":["fmpub.net"]},{"id":827,"name":"Weborama","category":4,"domains":["weborama.fr"]},{"id":828,"name":"nonstopConsulting","category":4,"pattern":"(a|banner|dynpng)\\\\.nonstoppartner\\\\.net","domains":["nonstoppartner.net"]},{"id":829,"name":"Contentspread","category":3,"domains":["contentspread.net"]},{"id":830,"name":"DoubleVerify","category":5,"domains":["doubleverify.com"]},{"id":831,"name":"Adzerk","category":5,"domains":["adzerk.net"]},{"id":832,"name":"AdSpirit","category":5,"domains":["adspirit.de"]},{"id":833,"name":"Specific Media","category":5,"domains":["specificclick.net"]},{"id":834,"name":"AdXpansion","category":5,"domains":["adxpansion.com"]},{"id":835,"name":"OwnerIQ","category":5,"domains":["owneriq.net"]},{"id":836,"name":"CPMStar","category":5,"domains":["cpmstar.com"]},{"id":837,"name":"Adlabs Media Network","category":3,"domains":["luxup.ru"]},{"id":838,"name":"Webtrends","category":1,"pattern":"statse\\\\.webtrendslive\\\\.com","domains":["webtrendslive.com"]},{"id":839,"name":"AOL Time Warner","category":5,"domains":["atwola.com"]},{"id":840,"name":"Brandscreen","category":5,"domains":["rtbidder.net"]},{"id":841,"name":"Media.net","category":5,"domains":["media.net"]},{"id":842,"name":"Active Performance","category":5,"domains":["active-srv02.de"]},{"id":843,"name":"Experian Marketing Services","category":5,"domains":["audienceiq.com"]},{"id":844,"name":"Coremetrics","category":1,"domains":["coremetrics.com"]},{"id":845,"name":"Dotomi","category":5,"domains":["dotomi.com"]},{"id":846,"name":"Chitika","category":5,"domains":["chitika.net"]},{"id":847,"name":"TownNews.com","category":3,"pattern":"(stats|adimages|adsys)\\\\.townnews\\\\.com","domains":["townnews.com"]},{"id":848,"name":"StumbleUpon","category":13,"pattern":"(www|badge|platform)\\\\.stumbleupon\\\\.com","domains":["stumbleupon.com"]},{"id":849,"name":"Triggit","category":5,"domains":["triggit.com"]},{"id":850,"name":"Site Meter","category":1,"domains":["sitemeter.com"]},{"id":851,"name":"ClixSense","category":3,"domains":["adhitzads.com"]},{"id":852,"name":"Google Feedburner","category":13,"domains":["feedburner.com"]},{"id":853,"name":"Aggregate Knowledge","category":5,"domains":["agkn.com"]},{"id":854,"name":"Matomy Media Group","category":5,"domains":["xtendmedia.com"]},{"id":855,"name":"LiveRail","category":5,"domains":["liverail.com"]},{"id":856,"name":"Adify","category":5,"domains":["afy11.net"]},{"id":857,"name":"Adverticum","category":5,"domains":["adverticum.net"]},{"id":858,"name":"AWeber","category":0,"domains":["aweber.com"]},{"id":859,"name":"Connexity","category":3,"domains":["connexity.net"]},{"id":860,"name":"Collective","category":5,"domains":["collective-media.net"]},{"id":861,"name":"Tremor Video","category":5,"domains":["scanscout.com"]},{"id":862,"name":"Tealium","category":5,"pattern":"tags\\\\.tiqcdn\\\\.com","domains":["tiqcdn.com"]},{"id":863,"name":"Adap.tv","category":5,"domains":["adap.tv"]},{"id":864,"name":"DMG","category":5,"domains":["z5x.net"]},{"id":865,"name":"nugg.ad","category":5,"domains":["nuggad.net"]},{"id":866,"name":"KISSmetrics","category":1,"domains":["kissmetrics.com"]},{"id":867,"name":"Hatena","category":11,"pattern":"([0-9a-z]+\\\\.)?b\\\\.st\\\\-hatena\\\\.com","domains":["st-hatena.com"]},{"id":868,"name":"Clicky","category":1,"domains":["getclicky.com"]},{"id":869,"name":"Target Performance","category":5,"domains":["ad-srv.net"]},{"id":870,"name":"myThings","category":5,"domains":["mythings.com"]},{"id":871,"name":"Cedexis","category":1,"pattern":"[0-9a-z]+\\\\.cedexis\\\\-radar\\\\.net|(radar|probes)\\\\.cedexis\\\\.com","domains":["cedexis-radar.net","cedexis.com"]},{"id":872,"name":"CastAClip","category":5,"domains":["castaclip.net"]},{"id":873,"name":"Twenty Four Interactive","category":5,"domains":["adaos-ads.net"]},{"id":874,"name":"Cross Pixel","category":4,"domains":["crsspxl.com"]},{"id":875,"name":"D.A.Consortium","category":5,"domains":["impact-ad.jp"]},{"id":876,"name":"Tanx","category":5,"domains":["tanx.com"]},{"id":877,"name":"51.La","category":1,"domains":["51.la"]},{"id":878,"name":"Expedia","category":5,"pattern":"ads\\\\.expedia\\\\.com","domains":["expedia.com"]},{"id":879,"name":"Skimlinks","category":5,"domains":["skimresources.com"]},{"id":880,"name":"ClickTale","category":1,"domains":["clicktale.net"]},{"id":881,"name":"Sina Weibo","category":13,"pattern":"api\\\\.weibo\\\\.com\\\\/.*\\\\/(shorten|counts)\\\\.json|(widget|service)\\\\.weibo\\\\.com","domains":["weibo.com"]},{"id":882,"name":"Yieldlab","category":5,"domains":["yieldlab.net"]},{"id":883,"name":"Exponential Interactive","category":5,"domains":["exponential.com"]},{"id":884,"name":"Outbrain","category":2,"domains":["outbrain.com"]},{"id":885,"name":"Navegg","category":4,"domains":["navdmp.com"]},{"id":886,"name":"AudienceTV","category":5,"pattern":"([a-z0-9]+\\\\.)hiro\\\\.tv|synd\\\\.travelplus\\\\.tv","domains":["hiro.tv","travelplus.tv"]},{"id":887,"name":"YuMe, Inc.","category":5,"domains":["crowdscience.com"]},{"id":888,"name":"LinkWithin","category":13,"domains":["linkwithin.com"]},{"id":889,"name":"YD World","category":5,"domains":["254a.com"]},{"id":890,"name":"QQ Widgets","category":13,"pattern":"pub\\\\.idqqimg\\\\.com|[0-9a-z]+\\\\.gtimg\\\\.com","domains":["idqqimg.com","gtimg.com"]},{"id":891,"name":"Affilinet","category":5,"domains":["webmasterplan.com"]},{"id":892,"name":"UserVoice","category":13,"pattern":"(widget|cdn)\\\\.uservoice\\\\.com|by\\\\.uservoice\\\\.com\\\\/.*\\\\/track\\\\.js","domains":["uservoice.com"]},{"id":893,"name":"Brandwire","category":5,"domains":["teleskipp.de"]},{"id":894,"name":"Visual Website Optimizer","category":2,"pattern":"[0-9a-z]+\\\\.visualwebsiteoptimizer\\\\.com","domains":["visualwebsiteoptimizer.com"]},{"id":895,"name":"TeaserNet","category":5,"domains":["miokoo.com"]},{"id":896,"name":"99Widgets","category":13,"domains":["99widgets.com"]},{"id":897,"name":"AdJug","category":5,"domains":["adjug.com"]},{"id":898,"name":"OpenStat","category":1,"domains":["openstat.net"]},{"id":899,"name":"Eloqua","category":4,"domains":["eloqua.com"]},{"id":900,"name":"Accuen","category":5,"domains":["p-td.com"]},{"id":901,"name":"Technorati Media","category":5,"domains":["technoratimedia.com"]},{"id":902,"name":"Forumotion","category":2,"domains":["all-up.com"]},{"id":903,"name":"Switch Concepts","category":5,"domains":["switchadhub.com"]},{"id":904,"name":"Truehits.net","category":1,"domains":["truehits.in.th"]},{"id":905,"name":"Begun","category":5,"domains":["begun.ru"]},{"id":906,"name":"Yahoo BlueLithium","category":4,"domains":["bluelithium.com"]},{"id":907,"name":"Future","category":5,"domains":["futurecdn.net"]},{"id":908,"name":"R7","category":3,"pattern":"parceiro\\\\.log\\\\.r7\\\\.com","domains":["r7.com"]},{"id":909,"name":"eBay Affiliate","category":3,"pattern":"(rover|stats)\\\\.ebay\\\\.com","domains":["ebay.com"]},{"id":910,"name":"Commission Junction","category":5,"domains":["kdukvh.com"]},{"id":911,"name":"Olark","category":2,"domains":["olark.com"]},{"id":912,"name":"MadAds Media","category":5,"domains":["madadsmedia.com"]},{"id":913,"name":"Videology","category":5,"domains":["lucidmedia.com","tidaltv.com"]},{"id":914,"name":"Adorika Media Ltd","category":5,"domains":["adorika.net"]},{"id":915,"name":"Amazon Affiliate","category":5,"pattern":"(wms|ws|www)\\\\.assoc\\\\-amazon\\\\.com","domains":["assoc-amazon.com"]},{"id":916,"name":"i2i.jp","category":1,"domains":["i2i.jp"]},{"id":917,"name":"Visual Revenue - Outbrain","category":1,"pattern":"(a|t|p)\\\\.visualrevenue\\\\.com","domains":["visualrevenue.com"]},{"id":918,"name":"Ebay Enterprise","category":5,"domains":["fetchback.com"]},{"id":919,"name":"Ebuzzing","category":5,"domains":["ebuzzing.com"]},{"id":920,"name":"Mixpanel","category":1,"domains":["mixpanel.com"]},{"id":921,"name":"OLX","category":5,"domains":["olx-st.com"]},{"id":922,"name":"AdvertStream","category":5,"domains":["advertstream.com"]},{"id":923,"name":"BuzzFeed Widgets","category":13,"pattern":"ct\\\\.buzzfeed\\\\.com\\\\/wd\\\\/UserWidget|buzzbox\\\\.buzzfeed\\\\.com\\\\/wd\\\\/BuzzBox","domains":["buzzfeed.com"]},{"id":924,"name":"Netmining","category":5,"domains":["netmng.com"]},{"id":925,"name":"United Internet Media","category":4,"domains":["uicdn.net"]},{"id":926,"name":"Clicksor","category":5,"domains":["clicksor.com"]},{"id":927,"name":"BidVertiser","category":5,"pattern":"(bdv|cdn)\\\\.bidvertiser\\\\.com","domains":["bidvertiser.com"]}]')
},function(e,t,n){
"use strict"
;(function(e){
var i=n(1),a="object"==typeof exports&&exports&&!exports.nodeType&&exports,o=a&&"object"==typeof e&&e&&!e.nodeType&&e,r=o&&o.exports===a?i.a.Buffer:void 0,s=r?r.allocUnsafe:void 0
t.a=function(e,t){
if(t){
return e.slice()
}
var n=e.length,i=s?s(n):new e.constructor(n)
return e.copy(i),i
}
}).call(this,n(9)(e))
},function(e){
e.exports=JSON.parse('["100x100banco.com","1822direkt.de","53.com","77bank.co.jp","a-bank.jp","aacreditunion.org","abanca.com","abbl.com","abcbrasil.com.br","abccapitalbank.co.ug","abchina.com","abcthebank.com","abgsc.com","abl.com","ablv.com","abnamro.com","abnamro.nl","abr.ru","abs.ch","absa.africa","absa.co.ug","absa.co.za","absabank.co.ke","absabank.mu","absolutbank.ru","acb.com.vn","acbbank.co.tz","accessbank.az","accessbank.com.lr","accessbankplc.com","acledabank.com.kh","acrevis.ch","adabank.com.tr","adambank.com","adb.org","adbc.com.cn","adbl.gov.np","adcb.com","addiko-fbih.ba","addiko.com","adelaidebank.com.au","adia.ae","adib.ae","adityabirla.com","advansbanktanzania.com","advansgroup.com","aegon.hu","aeoncredit.com.my","afdb.org","afrasiabank.com","africanbank.co.za","afrilandfirstbank.com","afundacion.org","agbank.az","agribank.com.vn","agricbank.com","ahli.com","ahlibank.com.qa","ahliunited.com","aib.af","aib.ie","aibgb.co.uk","aibni.co.uk","aiib.org","aikbanka.rs","airbank.cz","aircel.com","airtel.com","akb.ch","akbank.com","akbars.ru","akcentacz.cz","akita-bank.co.jp","akrbank.com","aktia.fi","al-bank.dk","alahli.com","alandsbanken.ax","alandsbanken.fi","alaskausa.org","albaraka.com","albaraka.com.tr","aldermore.co.uk","alfabank.ru","aliorbank.pl","alliantcreditunion.org","allianz.bg","allianz.com","allianz.de","allianz.pl","almbrand.dk","alpenbank.com","alpha.gr","alphabank.bg","alphabank.com.mk","alphabank.ro","alpharheintalbank.ch","alpinvest.com","alrayanbank.co.uk","altabanka.rs","alterna.ca","alternabank.ca","alternatifbank.com.tr","amanabank.lk","amanahbank.gov.ph","ambank.amonline.com.my","amenbank.com.tn","ameriabank.am","americafirst.com","americanexpress.com","ametro.gr","aminib.com","amp.com.au","amx.am","anadolubank.com.tr","anb.com","andbank.com","andhrabank.in","anpost.com","antonveneta.it","antwerpdiamondbank.com","anz.co.nz","anz.com","anz.com.au","aozorabank.co.jp","apobank.de","appkb.ch","apsbank.com.mt","arabbank.ch","arabbank.com","arabbank.com.au","arbuthnotlatham.co.uk","ardshinbank.am","argenta.be","argentina.citibank.com","arionbanki.is","arkada.ua","armswissbank.am","army.gr","artesa.cz","artsakhbank.am","asb.co.nz","aschheim.de","askaribank.com","asnbank.nl","atabank.com","atb.com","atbank.eu","atlasmarazambia.com","atombank.co.uk","atticabank.gr","attijariwafabank.com","aub.com.ph","auswidebank.com.au","autobank.at","aval.ua","avanza.se","avvillas.com.co","awashbank.com","awcp.gi","awsg.at","axa.ch","axa.cz","axa.fr","axabank.be","axisbank.co.in","axisbank.com","axosbank.com","azaniabank.co.tz","azizibank.com","b2bbank.com","baaderbank.de","bacb.bg","baccredomatic.com","bafamsa.com","baloise.ch","balticway.net","banamex.com","banca-romaneasca.ro","bancabc.com","bancacambiano.it","bancacrs.it","bancadiasti.it","bancaditalia.it","bancaferoviara.ro","bancafinnat.it","bancagenerali.com","bancagenerali.it","bancaifis.it","bancaimi.com","bancaintermobiliare.com","bancaintesa.it","bancaintesa.rs","bancamarch.es","bancamediolanum.it","bancaribe.com.ve","bancasantangelo.com","bancastato.ch","bancatransilvania.ro","bancentral.gov.do","banco.bradesco","banco.itau.cl","bancoagrario.gov.co","bancoagricola.com","bancoamazonia.com.br","bancoazteca.com.mx","bancoazteca.com.sv","bancobai.ao","bancobcr.com","bancobmg.com.br","bancobpi.pt","bancobpm.it","bancobv.com.br","bancocaroni.com.ve","bancochile.cl","bancociudad.com.ar","bancocredicoop.coop","bancodebogota.com","bancodeoccidente.com.co","bancodesio.it","bancodevenezuela.com","bancoeconomico.ao","bancoedwards.cl","bancoestado.cl","bancoex.gob.ve","bancoexterior.com","bancofibra.com.br","bancohipotecario.com.sv","bancointer.com.br","bancoinvest.pt","bancomediolanum.es","bancomercantil.com","bancomercedes-benz.com.br","bancomext.com","bancomoc.mz","bancomontepio.pt","banconal.com.pa","bancooccidente.com.co","bancopan.com.br","bancopatagonia.com.ar","bancoplaza.com","bancoposta.it","bancoppel.com","bancoprocredit.com.ec","bancoprovincia.com.ar","bancoreal.com.br","bancoripley.com","bancosantafe.com.ar","bancosantander.es","bancosardegna.it","bancounion.com.bo","bancsabadell.com","bandhanbank.com","banesco.com","banespa.com.br","banestes.com.br","bangkokbank.com","bank-abc.com","bank-banque-canada.ca","bank-day.ir","bank-of-africa.net","bank-of-algeria.dz","bank.gov.ua","bank.lv","bank.marksandspencer.com","bank.sbi","bank2.no","bankalfalah.com","bankalhabib.com","bankandclients.com","bankasya.com.tr","bankaudigroup.com","bankaust.com.au","bankaustria.at","bankcom.com.ph","bankcomm.com","bankeki.ch","banken.gl","bankfab.com","bankgaborone.co.bw","bankgantrisch.ch","bankhapoalim.com","bankia.com","bankimthal.clientis.ch","bankinter.com","bankinter.pt","bankislam.biz","bankislami.com.pk","bankleumi.co.il","bankmandiri.co.id","bankmaspion.co.id","bankmellat.ir","bankmillennium.pl","bankmuamalat.co.id","bankmuscat.com","banknordik.com","banknorwegian.no","banknorwegian.se","bankoberaargau.clientis.ch","bankofalbania.org","bankofamerica.com","bankofbaroda.in","bankofbaroda.ug","bankofbarodauk.com","bankofbeijing.com.cn","bankofbeirut.com","bankofbotswana.bw","bankofchina.com","bankofcyprus.com","bankofdl.com","bankofengland.co.uk","bankofflorida.com","bankofgeorgia.ge","bankofgeorgiagroup.com","bankofgreece.gr","bankofindia.co.in","bankofindia.uk.com","bankofireland.com","bankofirelanduk.com","bankofjordan.com","bankofkhartoum.com","bankofmaharashtra.in","bankofmakati.com.ph","bankofmaldives.com.mv","bankofmelbourne.com.au","bankofscotland.co.uk","bankofscotland.de","bankofsouthsudan.org","bankone.mu","bankotsar.co.il","bankpng.gov.pg","bankrespublika.az","banksa.com.au","banksepah.ir","bankslm.ch","banktencate.com","bankthalwil.ch","bankthur.clientis.ch","bankwest.com.au","bankwindhoek.com.na","bankzweiplus.ch","banorte.com","banque-centrale.dj","banque-centrale.mg","banque-comores.km","banque-france.fr","banqueatlantique.net","banquecramer.ch","banquedeluxembourg.com","banquehavilland.com","banquemisr.com","banquepopulaire.fr","banquezitouna.com","banregio.com","banrep.gov.co","banrisul.com.br","bansi.com.mx","banxico.org.mx","bapr.it","barclays.co.uk","baumann-banquiers.ch","bawagpsk.com","bayernlb.de","baysideschoolgibraltar.gi","bb.com.br","bb.com.mx","bb.org.bd","bbg.co.uk","bbkonline.com","bbobank.ch","bbr.bg","bbsfbank.com","bbt.com","bbva.ch","bbva.com","bbva.com.ar","bbva.com.co","bbva.es","bbva.mx","bbva.pe","bbva.pt","bca.co.id","bca.cv","bcb.bm","bcb.gob.bo","bcb.gov.br","bcc.cd","bccr.fi.cr","bce.fin.ec","bceao.int","bcee.lu","bcentral.cl","bcf.ch","bcge.ch","bch.hn","bci.cl","bcj.ch","bcl.lu","bcm.mr","bcn.ch","bcn.gob.ni","bcp.com.bo","bcr.gob.sv","bcr.md","bcr.ro","bcra.gov.ar","bcrg-guinee.org","bcrp.gob.pe","bcstp.st","bct.gov.tn","bcu.gub.uy","bcv.ch","bcv.cv","bcv.org.ve","bcvs.ch","bdc.ca","bdc.com.eg","bde.es","bdl.gov.lb","bdo.com.ph","bdonetworkbank.com.ph","beac.int","becu.org","bekb.ch","belapb.by","belarusbank.by","belfius.be","belinvestbank.by","belizebank.com","bendigoadelaide.com.au","bendigobank.com.au","beobank.be","berenberg.de","bergos-berenberg.ch","bes.es","bes.pt","bethpagefcu.com","bexi.co.id","beyondbank.com.au","bfc.com.ve","bforbank.com","bfs.es","bgk.pl","bgzbnpparibas.pl","bhf-bank.ch","bhu.net","bi.cv","bi.go.id","bi.is","bibanca.it","bicbanco.com.br","bidv.com.vn","bidvestbank.co.za","bielefeld.de","bienebank.clientis.ch","bigbank.ee","bil.com","bim.ir","bin-bank.com","binck.com","birminghammidshires.co.uk","bisa.com","bisb.com","biverbanca.it","bk.mufg.jp","bk.rw","bkam.ma","bkb.ch","bki.ir","blanchelande.co.uk","blkb.ch","blombank.com","blomretail.com","blueshorefinancial.com","bmcebank.ma","bmci.ma","bmi.ir","bmn.es","bmo.com","bmoharris.com","bmsc.com.bo","bmwbank.de","bna.ao","bna.com.ar","bnb.bg","bnb.com.bo","bnb.gov.br","bnbank.no","bnc.com.ve","bncr.fi.cr","bnda-mali.com","bnf.bank","bngbank.nl","bni.co.id","bni.co.mz","bnl.it","bnm.md","bnpparibas.ca","bnpparibas.com.br","bnpparibas.hu","bnpparibas.pl","bnpparibasfortis.com","bnr.ro","bnr.rw","bnymellon.com","bnz.co.nz","boakenya.com","boamerrouge.com","boauganda.com","boc.cn","bochk.com","bochum.de","bod.com.ve","boe.gov.er","bog.gov.gh","boi.org.il","boj.or.jp","boj.org.jm","bok.or.kr","bom.mu","bon.com.na","bonhote.ch","bookdepository.com","bop.com.pk","boq.com.au","bordier.com","bosbank.pl","bosc.cn","bot.com.tw","bot.go.tz","bot.or.th","bou.or.ug","boursorama.com","bov.com","boz.zm","bpc.ao","bper.it","bpf.it","bph.pl","bpi.com.ph","bpi.ir","bpinet.pt","bplazio.it","bportugal.pt","bpp.it","bppb.it","bpr.rw","bps-sberbank.by","brac.net","bracbank.com","brb.bi","brb.com.br","brci.ro","brd.ro","brd.rw","brde.com.br","bred.fr","bregdeti.gov.al","bri.co.id","brou.com.uy","bsb.bw","bsbrodnica.pl","bsi.ir","bsi.si","bsicbank.com","bsl.gov.sl","bsm.sm","bsnl.co.in","bso.com.sy","bsp.com.pg","bsp.com.sb","bsp.gov.ph","bspb.ru","bstdb.org","bta.kz","btgpactual.com","btn.co.id","btv-bank.ch","budapestbank.hu","buffalocommercialbank.com","bundesbank.de","bunq.com","burjbankltd.com","busanbank.co.kr","business.hsbc.pl","business24.cz","bvb.ro","bvr.de","byblosbank.com","ca-cib.com","ca-nextbank.ch","cab.jo","cafonline.org","cahoot.com","caisse-epargne.fr","caixa.cv","caixa.gov.br","caixabank.com","caixabank.es","cajamar.es","cajasur.es","calbank.net","camellia.plc.uk","canadiabank.com.kh","canarabank.com","capitalmarkets.bmo.com","capitalone.com","capitecbank.co.za","cargillsbank.com","carnegie.se","cartabcc.it","catalunyacaixa.com","caterallen.co.uk","cathaybk.com.tw","cavmont.com.zm","cb.is","cba.am","cba.co.tz","cbagroup.com","cbar.az","cbbh.ba","cbcg.me","cbd.ae","cbe.org.eg","cbg.gm","cbhb.com.cn","cbi.iq","cbi.ir","cbj.gov.jo","cbk.gov.kw","cbl.gov.ly","cbl.org.lr","cbn.gov.ng","cbonline.co.uk","cbq.qa","cbs-bank.sy","cbs.gov.ws","cbs.sc","cbsl.gov.lk","cbt.clientis.ch","cbvs.sr","cbzbank.co.zw","ccb.com","ccbank.bg","ccbank.co.uk","cdb.com.cn","cdb.com.cy","cdgcapital.ma","cdh-malawi.com","cdic.ca","cdp.it","cebbank.com","cec.ro","cefcu.com","cen.ch","centenarybank.co.ug","centralbank.cy","centralbank.go.ke","centralbank.gov.so","centralbank.ie","centralbank.org.bb","centralbank.org.bz","centralbank.org.ls","centralbank.org.sz","centralbankbahamas.com","centralbankmalta.org","centralbankofindia.co.in","centralbankoflibya.org","cetelem.hu","cgbchina.com.cn","cgd.pt","chambank.com","chase.com","chasebankkenya.co.ke","chebanca.it","cheltglos.co.uk","chiantibanca.it","chibakogyo-bank.co.jp","chinabank.ph","chronopay.com","cib.co.ug","cib.com.cn","cib.hu","cibc.com","cibconline.cibc.com","cibeg.com","cic.ch","cic.fr","cimb.com","cimbanque.com","cimbclicks.com.my","cimbniaga.co.id","citadele.ee","citadele.lt","citadele.lv","citi.com","citibank.co.in","citibank.co.uk","citibank.com","citibank.com.au","citibank.com.br","citibank.com.my","citibank.com.sg","citibank.com.ve","citibank.cz","citibank.hu","citibank.pl","citicbank.com","citigroup.com","citystatesavings.com","cityunionbank.com","civibank.it","civilbank.com.np","clarienbank.com","clearstream.com","closebrothers.com","cmb.mc","cmbc.com.cn","cmbchina.com","cmss.cz","cnb.cz","co-opbank.co.ke","co-operativebank.co.nz","co-operativebank.co.uk","coastcapitalsavings.com","cogebanque.co.rw","coinmama.com","combank.lk","combanketh.et","comdirect.de","comercial.creditandorragroup.ad","comerica.com","commbank.com.au","commerzbank.com","commerzbank.cz","commerzbank.de","commerzbank.hu","commerzbank.sk","communityfirst.com.au","compartamos.com","consolidated-bank.com","contact-sys.com","coop.ch","cooppank.ee","corner.ch","corpbanca.cl","corpbank.com","corporacionbi.com","coutts.com","coventrybuildingsociety.co.uk","coxandkings.com","cpbebank.com","crbra.it","crdbbank.co.tz","credem.it","credit-agricole.com","credit-agricole.fr","credit-agricole.it","credit-agricole.pl","credit-agricole.ro","credit-cooperatif.coop","credit-du-nord.fr","credit-suisse.com","creditagricole.rs","creditas.cz","crediteurope.ch","crediteurope.ro","creditmutuel.fr","creditoagricola.pt","cresco.no","creval.it","crsaluzzo.it","crystalinnovative.com","csas.cz","csob.cz","csob.sk","ctbcbank.com","ctbcbankusa.com","ctfs.com","ctznbank.com","cultura.no","cwb.com","cwbank.com","dab-bank.de","danamon.co.id","danskebank.co.uk","danskebank.com","danskebank.ee","danskebank.fi","danskebank.lt","danskebank.no","danskebank.se","darasalaambank.com","davivienda.com","davivienda.com.sv","db.com","dbank.bg","dbe.com.et","dbj.jp","dbp.ph","dbs.com","dbs.com.sg","dbsa.org","dbsbank.in","dcb.co.tz","dcbank.ca","dcu.org","defencebank.com.au","degiro.cz","degiro.nl","degussa-bank.de","deka.de","dekabank.az","deltacommunitycu.com","denizbank.com","depfa.com","desjardins.com","deutsche-bank.de","deutsche-bank.pt","devbank.com","devolksbank.nl","dexia-crediop.it","dexia.com","dfcc.lk","dfcugroup.com","dhanbank.com","dhbbank.com","dib.ae","digital.bankaust.com.au","digital.ulsterbank.co.uk","digital.ulsterbank.ie","direktnabanka.rs","discountbank.co.il","dkb.de","dnb.nl","dnb.no","dominickco.ch","donner-reuschel.de","dsb.sr","dsbbank.nl","dskbank.bg","dskdirect.bg","dtbafrica.com","duesseldorf.de","duncanlawrie.com","dutchbanglabank.com","dvbbank.com","dyerandblair.com","dzbank-derivate.de","dzbank.com","e-gulfbank.com","eabr.org","eastwestbanker.com","easybank.at","eb.clientis.ch","ebcfx.com","eblf.com","ebrd.com","ebs.ie","ecobank.com","edbi.ir","edekabank.de","edena.bankofbaroda.in","edmond-de-rothschild.com","eek.ch","efgbank.com","efginternational.com","eik.fo","eika.no","emiratesislamic.ae","emiratesnbd.com","en.swissquote.com","enbank.ir","enpara.com","envisionfinancial.ca","eq.fi","equabank.cz","equabanking.cz","equifax.ca","equitablebank.ca","equitablepcib.com","equitygroupholdings.com","ere.gov.al","erstebank.hu","erstebank.rs","erstegroup.com","eschborn.de","esl.org","etrade.com","euralius.eu","eurobank.gr","eurobank.rs","eurobic.pt","europa.eu","everestbankltd.com","evocabank.am","exim.go.th","eximb.com","eximbank-ug.com","eximbank.co.tz","eximbank.com.tw","eximbank.gov.cn","eximbank.ro","eximbanka.sk","eximbankbd.com","expobank.cz","expobank.ru","expressbank.bg","familybank.co.ke","farmersbank.ca","faulukenya.com","faysalbank.com","fbc.co.zw","fbme.com","fbsw.com","fcabankgroup.com","fcmb.com","fcmbank.com.mt","fdh.co.mw","federalbank.co.in","ffaprivatebank.com","ffbla.bank","fiarebancaetica.coop","fibabanka.com.tr","fibank.bg","fibi.co.il","fidelitybank.ng","fiditoscana.it","finca.org","finca.ug","finecobank.com","fio.cz","fio.sk","firstalliancebankzambia.com","firstbanknigeria.com","firstcalgary.com","firstcapitalbank.co.bw","firstcapitalbank.co.mw","firstcitizenstt.com","firstcommunitybank.co.ke","firstintlbank.com","firstnationsbank.com","firstrand.co.za","firstsomalibank.com","fmo.nl","fnb.co.za","fnbc.ca","fonbank.com.tr","forex.se","fortis.com","fortuneo.fr","frankfurter-bankgesellschaft.com","frankfurter-sparkasse.de","free-kassa.ru","friedrichshafen.de","frieslandbank.nl","fubon.com","fwbl.com.pk","garantibbva.com.tr","garantibbva.ro","gazprombank.com","gazprombank.ru","gbc.gi","gbkr.si","gcbbank.com.gh","gecapital.com","gefa-bank.de","generalbank.ca","getin.pl","getinbank.pl","ghbank.co.th","ghbi.ir","gib.com","gibintbank.gi","gibraltarfa.com","gibtele.com","gkb.ch","glitnirbank.com","glkb.ch","globalbanklr.com","gls.de","gnb.pl","gnbsudameris.com.co","gob.mx","gobanking.ch","golden1.com","goldmansachs.com","gov.gg","gov.ru","gov.uk","gov.vu","gra.gi","grameen.com","granitbank.hu","greater.com.au","grindrodbank.co.za","group.bnpparibas","group.pictet","groupebgfibank.com","groupebpce.com","grupbancsabadell.com","grupobancolombia.com","gruppobancasella.it","gruppocarige.it","gruppoesperia.it","gruppomps.it","gsb.or.th","gtbank.co.ke","gtbank.co.rw","gtbank.co.ug","gtbank.com","guardian-bank.com","gulfafricanbank.com","gutabank.ru","gutmann.at","gutzwiller.ch","habibbank.com","habibmetro.com","halifax.co.uk","halkbank.com.tr","halykbank.kz","hanafn.com:8002","handelsbanken.com","handelsbanken.fi","handelsbanken.se","hangseng.com","hanseaticbank.de","hauck-aufhaeuser.com","hbfc.com.pk","hbl.com","hbng.com","hcob-bank.de","hdfcbank.com","heartland.co.nz","helaba.com","hellenicbank.com","hellenicparliament.gr","hellobank.cz","hellobank.fr","hellobank.it","heritage.com.au","herringbank.com","heta-asset-resolution.com","himalayanbank.com","hindujabank.com","hipotecario.com.ar","hkbea.co.uk","hkbea.com","hlb.com.my","hnb.hr","hnb.net","hoaresbank.co.uk","hodgebank.co.uk","hokkaidobank.co.jp","hokkokubank.co.jp","hokugin.co.jp","hokutobank.co.jp","holliswealth.com","home.barclays","home.saxo","homebank.ro","homecapital.com","homecredit.ru","housing.co.ke","housingfinance.co.ug","hpb.hr","hrbcb.com.cn","hsb.no","hsbc.bm","hsbc.ca","hsbc.co.uk","hsbc.com","hsbc.com.ar","hsbc.com.au","hsbc.com.br","hsbc.com.hk","hsbc.com.mt","hsbc.com.mx","hsbc.com.tr","hsbc.de","hsbc.fr","hsbc.lk","hsbc.pl","hsh.com.al","humebank.com.au","huntington.com","husbanken.no","hxb.com.cn","hypo.fi","hypobank.at","hyponoe.at","hypotirol.com","hypovbg.at","hypovereinsbank.de","iabank.bg","ibank.bg","ibank.co.th","ibar.az","ibb-ag.com","ibercaja.es","ibk.co.kr","ibq.com.qa","ibrc.ie","ibsbank.so","icabanken.se","icbc.com.cn","icbc.com.tr","icbk.ca","icicibank.ca","icicibank.co.uk","icicibank.com","idbibank.in","idea-bank.ro","ideabank.by","ideabank.pl","idfcfirstbank.com","if.com","iggroup.com","iiabank.com.jo","iigcapital.com","ikanobank.se","ikb.de","ikp.al","ilbank.gov.tr","imb.com.au","imbank.com","imf.org","imperialbankgroup.com","inbank.it","inbursa.com","inbursa.com.mx","ind.millenniumbcp.pt","indian-bank.com","indianbank.in","indusind.com","inecobank.am","info.agribank.com","ing.be","ing.com","ing.com.au","ing.cz","ing.de","ing.es","ing.fr","ing.it","ing.nl","ing.pl","ing.ro","ingbank.pl","ingwb.com","intellectmoney.ru","interactivebrokers.co.uk","interactivebrokers.com","interbank.pe","interbankbdi.com","intesasanpaolo.com","intesasanpaolobank.ro","intesasanpaolobank.si","investec.com","investrustbank.com","iobnet.co.in","iombank.com","ior.va","irfis.it","isbank.com.tr","islandsavings.ca","islandsbanki.is","italy.ca-indosuez.com","itau.com","itau.com.ar","itau.com.br","ivbb.ir","ivorybankss.com","iwatebank.co.jp","iwbank.it","izb.co.zm","jaizbankplc.com","jak.se","jamiiborabank.co.ke","jb.com.bd","jbic.go.jp","jerseyfsc.org","jfc.go.jp","jio.com","jkb.com","jkbank.com","jkbank.in","jkbank.net","jkbankonline.com","jp-bank.japanpost.jp","jpmorganchase.com","jsafra.com","jsafrasarasin.ch","jsbl.com","jtbank.cz","jtfg.com","jubmes.rs","jugobankajugbanka.rs","juliusbaer.com","jyskebank.com","kam.lt","kapitalbank.az","karafarinbank.ir","karnatakabank.com","kasikornbank.com","kaupthing.com","kb.com.mk","kb.cz","kbc.com","kbc.ie","kbstar.com","kcbbankgroup.com","kcbgroup.com","kdb.co.kr","kdbbank.eu","kebhana.com","kempen.com","kentreliance.co.uk","kesh.al","key.com","keystonebankng.com","keytradebank.be","kfh.com","kfw.de","kh.hu","khushhalibank.com.pk","kiatnakin.co.th","kib.com.kw","kiel.de","kinecta.org","kingdom.bank","kiwibank.co.nz","kktcmerkezbankasi.org","kleinwortbenson.com","kleinworthambros.com","klikbca.com","klp.no","klsh.org.al","kocbank.com.tr","kombank.com","kombank.me","kotak.com","kpa.al","kpk.al","kredobank.com.ua","krentschker.at","krishibank.org.bd","krungsri.com","krungthai.com","kumaribank.com","kutxabank.com","kutxabank.es","kvb.co.in","kwftbank.com","kyotobank.co.jp","labanquepostale.fr","lahitapiola.fi","lamarehigh.com","landbank.co.za","landbank.com","landbank.com.tw","landkredittbank.no","landoltetcie.ch","landsbanki.is","landsbankinn.is","landtag.li","lansforsakringar.se","laurentianbank.ca","laxmibank.com","lazard.com","lb.lt","lbb.de","lbbw-schweiz.ch","lbbw.de","lcl.fr","leedsbuildingsociety.co.uk","leumi.co.il","lgt.com","lhv.ee","liberbank.es","libertybank.ge","librabank.ro","libro.ca","lienhardt.ch","lkb.lv","llb.li","lloydsbank.com","lloydsbankinggroup.com","lockobank.ru","lombardmalta.com","lombardodier.com","lukb.ch","luminor.ee","luminor.lt","luno.com","lvbank.com","machbank.com","macquarie.com","macro.com.ar","maerki-baumann.ch","magnetbank.hu","maib.md","manulifebank.ca","marfininvestmentgroup.com","marginalen.se","marksandspencer.com","martinmaurel.com","mashreqbank.com","maubank.mu","maybank.co.id","maybank.com","maybank2u.com.my","mbank.cz","mbank.pl","mbank.sk","mcb.com.pk","mcb.mu","mcbgroup.com","mebank.com.au","mebkenya.com","medbank.lt","mediobanca.com","medirect.com.mt","meezanbank.com","megabank.com.tw","megabanknepal.com","mendesgans.com","mercantilbanco.com","mercantildobrasil.com.br","mercantilsuiza.com","mercedes-benz-bank.de","merckfinck.de","meridiancu.ca","merkur-privatbank.de","merrill.com","metbank.co.zw","metrobank.com.ph","metrobankonline.co.uk","metzler.com","michinokubank.co.jp","middleeastbank.ir","migrosbank.ch","milleis.fr","millenniumbcp.pt","minbank.ru","mirabaud.com","mizrahi-tefahot.co.il","mizuho-fg.com","mizuhobank.com","mizuhocbk.com","mkb.hu","mkb.ru","mkbbank.hu","mkombozibank.com","ml.com","mmbank.ru","mmwarburg.de","mnb.hu","mobiasbanca.md","mod.uk","monese.com","moneta.cz","money.yandex.ru","monzo.com","morabanc.ad","morganstanley.com","moriental.co.ke","mps.it","mtb.com","mtbank.by","mtnl.in","mtnldelhi.in","mtnlmumbai.in","mts.rs","mufg.jp","multiva.com.mx","municipalbank.bg","my.ukrsibbank.com","mybancaria.ch","myumbbank.com","n26.com","nab.ch","nab.com.au","nabilbank.com","nainitalbank.co.in","nandp.co.uk","naspa.de","natbank.co.mw","national-bank.de","nationalbank.co.ke","nationstrust.com","nationwide.co.uk","natwest.com","navyfederal.org","nbb.be","nbbl.com.np","nbbonline.com","nbc.ca","nbctz.com","nbdominica.com","nbe.com.eg","nbebank.com","nbg.gov.ge","nbg.gr","nbk.com","nbp.com.pk","nbp.pl","nbrm.mk","nbs.mw","nbs.rs","nbs.sk","nbs.ws","nbv.vu","ncbagroup.com","ncsecu.org","nedbank.co.za","nemeabank.com","nepalbank.com.np","nepalsbi.com.np","netbank.de","netbank.hu","new-creditmutuel.com","new.siemens.com","nexi.it","nextpay.ru","nib-ghana.com","nib.int","nibc.com","nibl.com.np","nibpk.com","nkb.ch","nlb.rs","nlbgroup.si","nmb.com.np","nmbbank.co.tz","nmbbanknepal.com","nn.nl","noorbank.com","nordea.ch","nordea.com","nordea.dk","nordea.fi","nordea.no","nordea.pl","nordea.se","nordlb.com","nordnet.no","norges-bank.no","norisbank.de","northernrock.co.uk","northerntrust.com","novobanco.pt","nrb.org.np","nrwbank.com","nsandi.com","nsb.lk","ntrs.com","nubank.com.br","nuernberg.de","nurolbank.com.tr","nwbbank.com","obcindia.co.in","oberbank.at","oberbank.cz","oberuzwil.clientis.ch","ocb.com.vn","ocbc.com","ocbcnisp.com","oddo-bhf.com","oekb.at","oenb.at","oest.no","okinawakouko.go.jp","oldmutual.com","onba.ch","oneacrefund.org","online.citi.com","onlinesbi.com","onlinesbiglobal.com","onpay.ru","op.fi","openbank.es","oppenheim.de","opportunitybank.co.ug","optimabank.gr","orient-bank.com","orointbank.net","osfi-bsif.gc.ca","oshee.al","ost.al","otpbank.hu","otpbank.ro","otpbank.ru","otpbanka.rs","otpbanka.sk","otpsrbija.rs","ourladyofeurope.net","overseasfilipinobank.gov.ph","owkb.ch","pabcbank.com","palatine.fr","panorama.gi","paragonbankinggroup.co.uk","paramountbank.co.ke","paretobank.no","paritetbank.by","parlament.al","parsian-bank.ir","pashabank.ge","pashtanybank.com.af","patelco.org","patriabank.ro","payanyway.ru","payonlinesystem.ru","paypal.com","pbc.gov.cn","pbcom.com.ph","pbebank.com","pbihag.ch","pbs.si","pbz.hr","pcfinancial.ca","pedestal.bank","pekao.com.pl","penfed.org","peoples.com","peopleschoicecu.com.au","peoplestrust.com","permanenttsbgroup.ie","personal.natwest.com","personal.rbs.co.uk","pfandbriefbank.com","philtrustbank.com","pichincha.com","pin.gov.gr","pinbank.ua","pine.com","piraeusbank.gr","piraeusbank.rs","pkobp.pl","pnb.com.ph","pnbbanka.eu","pnbindia.in","pnbint.com","pnc.com","pocztowy.pl","polarisbanklimited.com","police.gi","popolarebari.it","poppankki.fi","popso.it","popular.com","popularbank.com","porschebank.ro","posb.com.sg","post.gi","post.lu","postashqiptare.al","postbank.bg","postbank.co.ug","postbank.de","poste.dz","poste.it","posted.co.rs","posteitaliane.it","postoffice.co.uk","postoffice.co.za","postovabanka.sk","postovnisporitelna.cz","pp.gov.al","ppcbank.com.kh","ppfbanka.cz","prabhubank.com","pravex.com","pridemicrofinance.co.ug","primabanka.sk","primebank.co.ke","primebank.com.bd","primebank.com.np","primorska.hr","primorsky.ru","priorbank.by","privatbank.ua","privatbanka.sk","probank.gr","procreditbank.bg","procreditbank.ro","procreditbank.rs","promerica.com.sv","providusbank.com","provincial.com","prudential.com","prudentialbank.com.gh","psbank.com.ph","psbank.ru","psbindia.com","psecu.com","pumb.ua","qcb.gov.qa","qdb.qa","qib.com.qa","qiwi.com","qnb.com","qnbfinansbank.com","quickborn.de","quintet.com","quiubi.it","rabobank.co.nz","rabobank.com","rabobank.com.au","rabobank.nl","racq.com.au","rafidain-bank.gov.iq","rahnbodmer.ch","raiffeisen.at","raiffeisen.ch","raiffeisen.hu","raiffeisen.it","raiffeisen.lu","raiffeisen.ro","raiffeisen.ru","raiffeisenbank.rs","raiffeisenonline.ro","rakbank.ae","raphaelsbank.com","rasheedbank.gov.iq","rawbank.com","rb-krumbach.de","rb.cz","rba.gov.au","rbb.bg","rbb.com.np","rbc.com","rbcroyalbank.com","rbf.gov.fj","rbfcu.org","rbinternational.com","rbinternational.com.pl","rbk.money","rblbank.com","rbm.ch","rbm.mw","rbnz.govt.nz","rbs.co.uk","rbs.com","rbsinternational.com","rbv.rs","rbz.co.zw","rcbc.com","rcbcy.com","rcibs.com","rda.gop.pk","refah-bank.ir","regiobank.ch","regions.com","reichmuthco.ch","reisebank.de","reliancebankltd.com","rencap.com","republicghana.com","republictt.com","resbank.co.za","reservebank.to","resona-gr.co.jp","resursbank.se","revolut.com","reyl.com","rhbgroup.com","rietumu.com","ro.idea-bank.ro","robeco.nl","robinsonsbank.com.ph","robokassa.com","rogers.com","rogersbank.com","rokelbank.sl","rosbank.ru","rosenergobank.ru","rothschildandco.com","rsb.ru","rshb.ru","rsts.cz","rupalibank.org","ruralvia.com","ruru.ru","s-pankki.fi","saalesparkasse.de","saastopankki.fi","safra.com.br","safraprivate.com.br","saharabank.com.ly","sainsburys.co.uk","sainsburysbank.co.uk","salaamsombank.com","samba.com","sampath.lk","sanimabank.com","santander.cl","santander.co.uk","santander.com","santander.com.ar","santander.com.br","santander.com.co","santander.com.mx","santander.de","santander.pl","santander.pt","santanderconsumer.pl","saraswatbank.com","sasfin.com","sb.lt","sb24.ir","sbank.ir","sbanken.no","sberbank.at","sberbank.com","sberbank.hu","sberbank.rs","sberbank.ru","sberbank.sk","sberbankcz.cz","sbi.co.in","sbiuk.com","sbm.no","sbmbank.co.ke","sbmgroup.mu","sbp.org.pk","sbsbank.co.nz","sbsibank.by","sbv.gov.vn","sc.com","scania.com","scb.co.th","schoolsfirstfcu.org","schroders.com","schwab.com","scotiabank.com","scotiabank.com.mx","scotiabank.com.sv","scotiabankchile.cl","scotiabankcolpatria.com","scotskirkgibraltar.com","sdb.com.cn","sdb.lk","sdccu.com","seb.ee","seb.lt","seb.lv","seb.no","seb.se","sebgroup.com","secure.cbonline.co.uk","secure.ybonline.co.uk","securetrustbank.com","securitybank.com","sedlabanki.is","sekerbank.com.tr","sella.it","servis24.cz","sevenbank.co.jp","seylan.lk","sgeb.bg","shawbrook.co.uk","shengjingbank.com.cn","shinhan.ca","shinhan.com","shinseibank.com","shkb.ch","shonai.co.jp","sib.ae","sibesbank.ru","sicredi.com.br","siddharthabank.com","sidianbank.co.ke","silkbank.com","simplii.com","sindhbankltd.com","sinopac.com","six-group.com","skandia.se","skipton.co.uk","sks.clientis.ch","slb.ch","slfrutigen.ch","sls-direkt.de","slsp.sk","smbc.co.jp","smebank.com.my","smfg.co.jp","smile.co.uk","smth.jp","snb.ch","snci.lu","snoras.com","snsbank.nl","sobaco-incore.com","societegenerale.com","societegenerale.com.gh","societegenerale.fr","societegenerale.rs","sofisadireto.com.br","sofitasa.com","sogehomebank.com","solarisbank.com","sonalibank.com.bd","sonybank.net","sopronbank.hu","sor.no","spaengler.at","sparda.de","sparebank1.no","sparhafen.ch","sparkasse-bayreuth.de","sparkasse-bgl.de","sparkasse-darmstadt.de","sparkasse-dielsdorf.ch","sparkasse-siegen.de","sparkasse-spree-neisse.de","sparkasse.at","sparkasse.it","sparkasse.si","spc.clientis.ch","spdb.com.cn","spirebank.co.ke","spk-aoe-mue.de","spk-ro-aib.de","spk-vorpommern.de","spks.dk","spv.no","srpskabanka.rs","ssfcu.org","stanbicbank.co.ke","stanbicbank.co.ug","stanbicbank.com.gh","stanbicibtc.com","standard.com","standardbank.co.za","standardbank.com","standardchartered.com","starlingbank.com","starone.org","stasy.gr","statestreet.com","stb.com.mk","sterling.ng","stewardbank.co.zw","stgeorge.com.au","storebrand.com","storebrand.no","stppcons.com","stuttgart.de","suedwestbank.de","summitbank.com.pk","suncoastfcu.org","suncorpbank.com.au","suncorpgroup.com.au","sunrisebank.com.np","suntrust.com","suntrustng.com","suomenpankki.fi","svb.com","svyaznoybank.ru","swedbank.com","swedbank.ee","swedbank.lt","swedbank.se","swift.com","swissquote.ch","swissregiobank.ch","sydbank.com","sydneymutual.bank","sygmabank.pl","syndicatebank.in","syzgroup.com","szkb.ch","taishinbank.com.tw","takarek.hu","takarekbank.hu","takasbank.com.tr","tandem.co.uk","tangerine.ca","tapiola.fi","targobank.de","tata.com","tatrabanka.sk","tb.by","tbcbank.ge","tbibank.bg","tcb-bank.com.tw","td.com","tdbank.com","tdcanadatrust.com","teacherscreditunion.com.au","teachersfcu.or","teb.com.tr","tekstilbank.com.tr","telebank.ru","telenorbanka.rs","tescobank.com","teximbank.bg","tgh.na","thanachartbank.co.th","thecontinentalbank.com","thetopchance.com","tib.co.tz","tisco.co.th","tkb.ch","tmb.cd","tmb.in","tmbank.com.au","tmbbank.com","tmsf.org.tr","tnbl.co.ke","tohobank.co.jp","tohoku-bank.co.jp","touchbank.com","tr.mufg.jp","transunion.ca","travelexbank.com.br","trinitybank.cz","triodos.com","triodos.es","trobank.com","trust.ru","trustbank.by","tsb.co.nz","tsb.co.uk","tsbbank.co.nz","tskb.com.tr","turkishbank.com","turkticaretbankasi.com.tr","uala.com.ar","ubagroup.com","ubank.co.za","ubank.com.au","ubauganda.com","ubb.bg","ubibanca.com","ubibanca.it","ubldigital.com","ubot.com.tw","ubp.com","ubs.com","ucobank.com","ucpb.com","udbl.co.ug","ugafode.co.ug","ugbbh.com","uk.virginmoney.com","ukar.co.uk","ukb.ch","ulsterbank.ie","umweltbank.de","uni.ca","uniastrum.ru","unibanco.com.br","unibank.az","unicajabanco.es","unicredit.it","unicredit.ro","unicreditbanca.it","unicreditbank.cz","unicreditbank.hu","unicreditbank.rs","unicreditbank.ru","unicreditbank.sk","unicreditbulbank.bg","unicreditcorporate.it","unigib.edu.gi","unionb.com","unionbank.bg","unionbank.co.il","unionbankng.com","unionbankofindia.co.in","unionbankph.com","unionefiduciaria.it","unionnet.unionbank.ba","unistream.ru","unitedbank.co.in","unity.co.uk","unitybankng.com","unterschleissheim.de","uob.com.sg","uobgroup.com","uobkayhian.com","uralsib.ru","urbanbank.info","urkb.ch","urwegobank.com","us.hsbc.com","usbank.com","utb.sl","vakifbank.com.tr","valiant.ch","vancity.com","vancitycommunityinvestmentbank.ca","vanlanschot.nl","vanlanschotkempen.com","varengold.de","vekselbanken.no","vem-aktienbank.de","venetobanca.ro","venezolano.com","verdibanken.no","versabank.com","versobank.com","viabcp.com","victoriabank.co.ke","vietinbank.vn","vijayabankonline.in","virginmoney.com","virginmoneyukplc.com","vistabank.ro","vkb-bank.at","voban.co.rs","volksbank-allgaeu-oberschwaben.de","volksbank-fntt.de","volksbank-freiburg.de","volksbank-stuttgart.de","volksbank-ulm-biberach.de","volksbank.at","volksbank.it","volksbank.ro","volkswagenbank.de","vontobel.com","vostbank.ru","vpbank.com","vrbank-rv-wgt.de","vtb-bank.by","vtb.com","vtbcapital.com","vub.sk","vwfs.com.br","vystarcu.org","vzdepotbank.ch","walletone.com","walserprivatbank.com","wearebo.co.uk","weatherbys.co.uk","web.boc.lk","webank.it","webebank.ebb-bg.com","webkincstar.allamkincstar.gov.hu","webmoney.ru","wegagenbanksc.com","wegelin.ch","wellsfargo.com","wemabank.com","wesleyan.co.uk","westernunion.com","westpac.co.nz","westpac.com.au","widiba.it","wir.ch","wirecard.com","wolfenbuettel.de","wooribank.com","worldbank.org","wpcu.coop","wuestenrot.cz","wuppertal.de","ww1.alwatany.net","ww1.bancofederal.com","ww1.realbank.com.ph","ww3.bancochile.cl","ww5.pbzltd.com","wwsparbank.se","www2.firstdirect.com","xn--80ab5c.xn--80ao21a","xn--90ab5f.xn--p1ai","ya.no","yamagatabank.co.jp","yapikredi.com.tr","ybonline.co.uk","ybs.co.uk","yesbank.in","z-payment.ru","zaba.hr","zagbank.ca","zanaco.co.zm","zenith-bank.co.uk","zenithbank.com","zionsbank.com","ziraat.com.tr","ziraatbank.com.tr","ziraatkatilim.com.tr","zjtlcb.com","zkb.ch","zonky.cz","zrb.clientis.ch","ztbl.com.pk","zugerkb.ch"]')
},function(e,t,n){
"use strict"
const i=n(26),a=n(27),o=n(28),{browserNameToEnum:r,platformNameToEnum:s,cpuToEnum:u}=n(29)
class l extends i{
constructor(e,t,n){
super(),this._localStorage=n.localStorage||localStorage,this._retries=0,
this._url=e,
this._adapter=t,this._options=n,this._flushInterval=null,this._eventsCache={},
this._storageKey=n.storageKey||"records",
this._sessionId=n.session_id||l.createSessionId(),
this._errorState=0,this._abTests=[],
this.send=o.bind(this),this._loadEvents().then(e=>{
const t=Object.keys(this._eventsCache).length>0
;[...Object.keys(e),...Object.keys(this._eventsCache)].forEach(t=>this._eventsCache[t]=[...e[t]||[],...this._eventsCache[t]||[]]),
t&&this._localStorage.setItem(this._storageKey,JSON.stringify(this._eventsCache)),
this.flush(),
this._flushInterval=setInterval(()=>{
this.flush()
},n.batchTimeoutMs||5e3),this.emit(l.Event.INITIALIZED)
})
}
updateIdentity(e){
return this._updateOptions("identity",e)
}
updateProduct(e){
return this._updateOptions("product",e)
}
updatePlatform(e){
return this._updateOptions("platform",e)
}
updateGeo(e){
return this._updateOptions("geo",e)
}
updateInstallation(e){
return this._updateOptions("installation",e)
}
updateLicense(e){
return this._updateOptions("license",e)
}
updateShepherd(e){
return this._updateOptions("shepherd",e)
}
updateExtensionProduct(e){
return this._updateOptions("extensionProduct",e)
}
updateExtensionProductIdentity(e){
return this._updateOptions("extensionProductIdentity",e)
}
updateCampaign(e){
return this._updateOptions("campaign",e)
}
updateSettings(e){
return this._updateOptions("settings",e)
}
get hasPendingEvents(){
return Object.keys(this._eventsCache).some(e=>0!==this._eventsCache[e].length)
}
static createSessionId(){
return function(e){
var t=""
for(;e-- >0;){
t+=Math.floor(16*Math.random()).toString(16)
}
return t
}(24)
}
setSessionId(e){
return this._sessionId=e,this
}
setErrorState(e){
return this._errorState=e,this
}
setHTTPErrorState(e){
let t=e
return 0==e?t=-1:e<400&&(t=0),this.setErrorState(t),this
}
setABTest(e,t){
let n=this._abTests.find((function(t){
return t.test_id===e
}))
return n?n.test_group_id=t:(this._abTests.push({
test_id:e,
test_group_id:t
}),this._abTests.sort((function(e,t){
return e.test_id<t.test_id?-1:e.test_id>t.test_id?1:0
}))),this
}
setABTests(e){
if(!Array.isArray(e)||e.some(e=>"string"!=typeof e.test_id||"string"!=typeof e.test_group_id)){
throw new Error("Invalid parameter:",JSON.stringify(e,null,2))
}
return this._abTests=e,this._abTests.sort((function(e,t){
return e.test_id<t.test_id?-1:e.test_id>t.test_id?1:0
})),this
}
sendEvent(e){
const t=p(Object.assign({},e))
if(t.event&&void 0!==t.event.type){
if([1,2,6,11].includes(t.event.type)){
try{
fetch(this._url,this._adapter({
record:[this._updateRecord(t)],
common:{
send_time:Date.now()
}
}))
}catch(e){}
}else{
this._eventsCache[t.event.type]||(this._eventsCache[t.event.type]=[]),this._eventsCache[t.event.type].push(t),
this._flushInterval&&this._localStorage.setItem(this._storageKey,JSON.stringify(this._eventsCache)),
this._eventsCache[t.event.type].length<(this._options.batchSizeLimit||500)||this.flush({
type:t.event.type
})
}
}
}
flush(e){
if(e&&void 0!==e.type&&0==this._eventsCache[e.type].length||!this.hasPendingEvents){
return Promise.resolve(null)
}
if(e&&e.doNotVerify){
if(void 0!==e.type){
let t=Object.assign({},this._eventsCache)
delete t[e.type],this._localStorage.setItem(this._storageKey,JSON.stringify(t))
}else{
this._localStorage.setItem(this._storageKey,"{}")
}
}
const t=e&&"undefined"!==e.type?[e.type]:Object.keys(this._eventsCache)
return Promise.all(t.map(e=>{
try{
let t={
record:this._eventsCache[e].map(this._updateRecord.bind(this)),
common:{
send_time:Date.now()
}
}
const n=this._adapter(t)
return fetch(this._url,n).then(t=>t.status>=400&&t.status<500||++this._retries>=(this._options.maxRetries||3)?(this._clearEvents(e),
t.text().then(e=>"Data rejected: "+t.status+" "+t.statusText+"\n"+e)):t.status>=500?"Burger failure: "+t.status+" "+t.statusText:(this._clearEvents(e),
this.emit(l.Event.FLUSHED),
null)).catch(e=>this._options.ignoreNetworkErrors?(this._retries=0,
null):e)
}catch(t){
return this._clearEvents(e),Promise.resolve(t)
}
})).then(e=>{
if(1==e.length){
return e[0]
}
const t=e.filter(e=>null!==e)
return t.length>0?t.join(", "):null
})
}
_updateOptions(e,t){
for(var n in t){
void 0===t[n]?this._options[e]&&delete this._options[e][n]:(this._options[e]||(this._options[e]={}),
this._options[e][n]=t[n])
}
return this
}
_updateRecord(e){
if(this._options.identity&&(e.identity=this._options.identity),
this._options.product&&(e.product=this._options.product),
this._options.platform&&(e.platform=this._options.platform,
void 0!==e.platform.os&&"number"!=typeof e.platform.os&&(e.platform.os=s(e.platform.os)),
void 0!==e.platform.architecture&&"number"!=typeof e.platform.architecture&&(e.platform.architecture=u(e.platform.architecture))),
this._options.license&&(e.license=this._options.license),
this._options.installation&&(e.installation=this._options.installation),
this._options.shepherd&&(e.shepherd=this._options.shepherd),
this._options.geo&&(e.geo=this._options.geo),
"undefined"!=typeof navigator&&navigator.userAgent){
let t=a(navigator.userAgent)
e.browser={
type:r(t.browser.name),
version:t.browser.version
},navigator.language&&(e.browser.lang=navigator.language)
}
if("undefined"!=typeof navigator&&(c(e,{
platform:{}
}),c(e.platform,{
os:s(navigator.platform),
time_zone:-(new Date).getTimezoneOffset()
}),navigator.userAgent)){
let t=a(navigator.userAgent)
c(e.platform,{
version:t.os.version,
architecture:u(t.cpu.architecture)
}),"Chromium OS"===t.os.name&&(e.platform.os=6,
5==e.platform.architecture&&(-1!=navigator.userAgent.indexOf("x86_64")?e.platform.architecture=2:-1!=navigator.userAgent.indexOf("x86")?e.platform.architecture=1:-1!=navigator.userAgent.indexOf("armv")&&(e.platform.architecture=4)))
}
return this._options.campaign&&(e.campaign=this._options.campaign),this._options.settings&&(e.settings=this._options.settings),
e
}
_loadEvents(){
return Promise.resolve(this._localStorage.getItem(this._storageKey)).then(e=>e?JSON.parse(e):{}).then(e=>Array.isArray(e)||"object"!=typeof e?{}:e).catch(()=>(this._localStorage.setItem(this._storageKey,"{}"),
{}))
}
_clearEvents(e){
this._retries=0,void 0===e?this._eventsCache={}:delete this._eventsCache[e],
this._localStorage.setItem(this._storageKey,JSON.stringify(this._eventsCache))
}
}
function c(e,t){
for(let n in t){
void 0===e[n]&&(e[n]=t[n])
}
return e
}
function p(e){
if("object"==typeof e&&null!==e){
if(Array.isArray(e)){
e=e.map(p)
}else{
for(var t in e){
e[t]=p(e[t])
}
}
return e
}
return"string"==typeof e?e.replace(/[\r\n]+/g," "):e
}
l.Event={
INITIALIZED:"initialized",
FLUSHED:"flushed"
},e.exports=l
},function(e,t,n){
"use strict"
const i={
InstallEnvelope:1,
HeartbeatEnvelope:2,
UpdateEnvelope:4,
ActivityEnvelope:5,
PreferencesEnvelope:6,
IssueEnvelope:9,
NPSSurveyEnvelope:11,
AOSWebshieldScanningEnvelope:41,
MaliciousURLEnvelope:46,
VoteEnvelope:47,
CommonActivityEnvelope:48
},a=Object.keys(i).reduce((function(e,t){
return e[i[t]]=t,e
}),{})
e.exports={
create:function(e){
return function(t){
const n=t.record[0].event.type,i=e[a[n]]
let o=t.record.slice().map(e=>Object.assign({},e))
const r=i.$type.getChild("record").resolvedType
return o.forEach((function(e){
for(let t in e){
r.getChild(t)||delete e[t]
}
})),{
method:"POST",
headers:{
"Content-Type":"application/octet-stream"
},
body:new i(Object.assign({},t,{
record:o
})).encodeAB()
}
}
}
}
},function(e,t,n){
e.exports=n(30).newBuilder({}).import({
package:null,
syntax:"proto2",
options:{
java_outer_classname:"VPNConnectionEnvelopeProto"
},
messages:[{
name:"Browser",
syntax:"proto2",
fields:[{
rule:"optional",
type:"BrowserType",
name:"type",
id:1
},{
rule:"optional",
type:"string",
name:"version",
id:2
},{
rule:"optional",
type:"string",
name:"lang",
id:3
}]
},{
name:"EnvelopeCommon",
syntax:"proto2",
fields:[{
rule:"optional",
type:"int64",
name:"send_time",
id:1
},{
rule:"optional",
type:"bool",
name:"no_geo",
id:2
}]
},{
name:"Event",
syntax:"proto2",
fields:[{
rule:"optional",
type:"int32",
name:"type",
id:1
},{
rule:"optional",
type:"int32",
name:"subtype",
id:2
},{
rule:"optional",
type:"int64",
name:"time",
id:3
},{
rule:"optional",
type:"int64",
name:"reception_time",
id:4
},{
rule:"optional",
type:"string",
name:"request_id",
id:5
}]
},{
name:"Geo",
syntax:"proto2",
fields:[{
rule:"optional",
type:"bytes",
name:"ip",
id:1
},{
rule:"optional",
type:"string",
name:"country",
id:2
},{
rule:"optional",
type:"string",
name:"region",
id:3
},{
rule:"optional",
type:"string",
name:"city",
id:4
},{
rule:"optional",
type:"double",
name:"latitude",
id:5
},{
rule:"optional",
type:"double",
name:"longitude",
id:6
},{
rule:"optional",
type:"string",
name:"isp",
id:7
},{
rule:"optional",
type:"int64",
name:"asn",
id:8
}]
},{
name:"Identity",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"guid",
id:1
},{
rule:"optional",
type:"string",
name:"hwid",
id:2
},{
rule:"optional",
type:"string",
name:"uuid",
id:3
}]
},{
name:"Installation",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"aiid",
id:1
},{
rule:"optional",
type:"int64",
name:"time",
id:2
},{
rule:"optional",
type:"SetupAction",
name:"action",
id:3
}]
},{
name:"License",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"wallet_key",
id:1
},{
rule:"optional",
type:"string",
name:"container_id",
id:2
},{
rule:"optional",
type:"LicenseEdition",
name:"edition",
id:3
},{
rule:"optional",
type:"ModeType",
name:"type",
id:4
},{
rule:"optional",
type:"bool",
name:"subscription_mode",
id:5
},{
rule:"optional",
type:"string",
name:"schema_id",
id:6
},{
rule:"optional",
type:"int64",
name:"issued",
id:7
},{
rule:"optional",
type:"int64",
name:"activation",
id:8
},{
rule:"optional",
type:"int64",
name:"valid_thru",
id:9
},{
rule:"optional",
type:"int32",
name:"count",
id:10
},{
rule:"optional",
type:"int32",
name:"count_device",
id:11
}]
},{
name:"Platform",
syntax:"proto2",
fields:[{
rule:"optional",
type:"OperatingSystem",
name:"os",
id:1
},{
rule:"optional",
type:"string",
name:"version",
id:2
},{
rule:"optional",
type:"string",
name:"build",
id:3
},{
rule:"optional",
type:"int32",
name:"ubr",
id:4
},{
rule:"optional",
type:"Architecture",
name:"architecture",
id:5
},{
rule:"optional",
type:"string",
name:"score",
id:6
},{
rule:"optional",
type:"string",
name:"lang",
id:7
},{
rule:"optional",
type:"sint32",
name:"time_zone",
id:8
}]
},{
name:"Product",
syntax:"proto2",
fields:[{
rule:"optional",
type:"int32",
name:"id",
id:1
},{
rule:"optional",
type:"int32",
name:"edition",
id:2
},{
rule:"optional",
type:"ModeType",
name:"mode",
id:3
},{
rule:"optional",
type:"StateType",
name:"state",
id:4
},{
rule:"optional",
type:"string",
name:"lang",
id:5
},{
rule:"optional",
type:"string",
name:"version_app",
id:6
},{
rule:"optional",
type:"string",
name:"version_gui",
id:7
},{
rule:"optional",
type:"int32",
name:"build",
id:8
},{
rule:"optional",
type:"string",
name:"partner_id",
id:9
}]
},{
name:"Shepherd",
syntax:"proto2",
fields:[{
rule:"optional",
type:"int64",
name:"id",
id:1
},{
rule:"optional",
type:"string",
name:"name",
id:2
},{
rule:"optional",
type:"int64",
name:"version",
id:3
}]
},{
name:"Campaign",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"string",
name:"test",
id:1
}]
},{
name:"Settings",
syntax:"proto2",
fields:[{
rule:"optional",
type:"SettingsConsent",
name:"consent",
id:1
},{
rule:"optional",
type:"int32",
name:"eula",
id:2
},{
rule:"optional",
type:"int32",
name:"eula_version",
id:3
}]
},{
name:"SettingsConsent",
syntax:"proto2",
fields:[{
rule:"optional",
type:"bool",
name:"product_marketing",
id:1
},{
rule:"optional",
type:"bool",
name:"product_development",
id:2
},{
rule:"optional",
type:"bool",
name:"third_party_apps",
id:3
},{
rule:"optional",
type:"bool",
name:"third_party_analytics",
id:4
}]
},{
name:"CommonActivity",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"category",
id:1
},{
rule:"optional",
type:"string",
name:"action",
id:2
},{
rule:"optional",
type:"string",
name:"label",
id:3
},{
rule:"optional",
type:"int32",
name:"value",
id:4
},{
rule:"optional",
type:"string",
name:"f1",
id:11
},{
rule:"optional",
type:"string",
name:"f2",
id:12
},{
rule:"optional",
type:"string",
name:"f3",
id:13
}]
},{
name:"CommonActivityEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"CommonActivityRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"CommonActivityRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"License",
name:"license",
id:7
},{
rule:"optional",
type:"Shepherd",
name:"shepherd",
id:8
},{
rule:"optional",
type:"Browser",
name:"browser",
id:10
},{
rule:"optional",
type:"Campaign",
name:"campaign",
id:11
},{
rule:"optional",
type:"Settings",
name:"settings",
id:12
},{
rule:"optional",
type:"CommonActivity",
name:"activity",
id:1e3
}]
},{
name:"ABTest",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"string",
name:"test",
id:3
}]
},{
name:"Order",
syntax:"proto2",
fields:[{
rule:"optional",
type:"int64",
name:"unique_id",
id:1
},{
rule:"optional",
type:"int32",
name:"ordering",
id:2
}]
},{
name:"InternalEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"InternalRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"InternalRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"License",
name:"license",
id:7
},{
rule:"optional",
type:"Shepherd",
name:"shepherd",
id:8
},{
rule:"optional",
type:"Order",
name:"order",
id:9
},{
rule:"optional",
type:"Browser",
name:"browser",
id:10
},{
rule:"optional",
type:"ABTest",
name:"ab_test",
id:11
}]
},{
name:"TestEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"TestRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"TestRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"string",
name:"test_id",
id:1e3
}]
},{
name:"Activity",
syntax:"proto2",
fields:[{
rule:"optional",
type:"ActivityCommon",
name:"common",
id:1
},{
rule:"optional",
type:"ActivityObject",
name:"object",
id:2
},{
rule:"optional",
type:"ActivityTime",
name:"time",
id:3
},{
rule:"optional",
type:"ActivityScope",
name:"scope",
id:4
},{
rule:"optional",
type:"ActivityCustom",
name:"custom",
id:5
}]
},{
name:"ActivityCommon",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"session_id",
id:1
},{
rule:"optional",
type:"string",
name:"test_id",
id:2
},{
rule:"optional",
type:"string",
name:"test_group_id",
id:3
},{
rule:"optional",
type:"int32",
name:"error_state",
id:4
}]
},{
name:"ActivityObject",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"category",
id:1
},{
rule:"optional",
type:"string",
name:"action",
id:2
},{
rule:"optional",
type:"string",
name:"label",
id:3
},{
rule:"optional",
type:"string",
name:"view",
id:4
}]
},{
name:"ActivityTime",
syntax:"proto2",
fields:[{
rule:"optional",
type:"int64",
name:"request",
id:1
},{
rule:"optional",
type:"int64",
name:"response",
id:2
},{
rule:"optional",
type:"int64",
name:"render",
id:3
}]
},{
name:"ActivityScope",
syntax:"proto2",
fields:[{
rule:"optional",
type:"int64",
name:"hit",
id:1
},{
rule:"optional",
type:"int64",
name:"session",
id:2
},{
rule:"optional",
type:"int64",
name:"user_level",
id:3
}]
},{
name:"ActivityCustom",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"a1",
id:1
},{
rule:"optional",
type:"string",
name:"a2",
id:2
},{
rule:"optional",
type:"string",
name:"a3",
id:3
},{
rule:"optional",
type:"string",
name:"a4",
id:4
},{
rule:"optional",
type:"string",
name:"a5",
id:5
},{
rule:"optional",
type:"string",
name:"a6",
id:6
},{
rule:"optional",
type:"string",
name:"a7",
id:7
},{
rule:"optional",
type:"string",
name:"a8",
id:8
},{
rule:"optional",
type:"string",
name:"a9",
id:9
},{
rule:"optional",
type:"string",
name:"a10",
id:10
},{
rule:"optional",
type:"string",
name:"f1",
id:11
},{
rule:"optional",
type:"string",
name:"f2",
id:12
},{
rule:"optional",
type:"string",
name:"f3",
id:13
},{
rule:"optional",
type:"string",
name:"f4",
id:14
},{
rule:"optional",
type:"string",
name:"f5",
id:15
},{
rule:"optional",
type:"string",
name:"f6",
id:16
},{
rule:"optional",
type:"string",
name:"f7",
id:17
},{
rule:"optional",
type:"string",
name:"f8",
id:18
},{
rule:"optional",
type:"string",
name:"f9",
id:19
},{
rule:"optional",
type:"string",
name:"f10",
id:20
}]
},{
name:"ActivityEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"ActivityRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"ActivityRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"License",
name:"license",
id:7
},{
rule:"optional",
type:"Shepherd",
name:"shepherd",
id:8
},{
rule:"optional",
type:"Browser",
name:"browser",
id:10
},{
rule:"optional",
type:"Campaign",
name:"campaign",
id:11
},{
rule:"optional",
type:"Settings",
name:"settings",
id:12
},{
rule:"optional",
type:"Activity",
name:"activity",
id:1e3
}]
},{
name:"Heartbeat",
syntax:"proto2",
fields:[{
rule:"optional",
type:"int64",
name:"uptime",
id:1
},{
rule:"optional",
type:"HeartbeatAV",
name:"av",
id:2
},{
rule:"optional",
type:"HeartbeatVPN",
name:"vpn",
id:3
}]
},{
name:"HeartbeatAV",
syntax:"proto2",
fields:[{
rule:"optional",
type:"HeartbeatWinAV",
name:"windows",
id:1
}]
},{
name:"HeartbeatWinAV",
syntax:"proto2",
fields:[{
rule:"optional",
type:"WinAVGSMainStatus",
name:"gs_main_status",
id:1
}]
},{
name:"HeartbeatVPN",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"vpn_name",
id:1
},{
rule:"optional",
type:"int32",
name:"connections_succeeded",
id:2
},{
rule:"optional",
type:"int32",
name:"connections_failed",
id:3
}]
},{
name:"HeartbeatEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"HeartbeatRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"HeartbeatRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"License",
name:"license",
id:7
},{
rule:"optional",
type:"Shepherd",
name:"shepherd",
id:8
},{
rule:"optional",
type:"Browser",
name:"browser",
id:10
},{
rule:"optional",
type:"Campaign",
name:"campaign",
id:11
},{
rule:"optional",
type:"Settings",
name:"settings",
id:12
},{
rule:"optional",
type:"Heartbeat",
name:"heartbeat",
id:1e3
}]
},{
name:"Install",
syntax:"proto2",
fields:[{
rule:"optional",
type:"SetupAction",
name:"operation",
id:1
},{
rule:"optional",
type:"InstallError",
name:"error",
id:2
}]
},{
name:"InstallError",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"code",
id:1
},{
rule:"optional",
type:"string",
name:"msg",
id:2
}]
},{
name:"InstallEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"InstallRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"InstallRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"License",
name:"license",
id:7
},{
rule:"optional",
type:"Shepherd",
name:"shepherd",
id:8
},{
rule:"optional",
type:"Browser",
name:"browser",
id:9
},{
rule:"optional",
type:"Campaign",
name:"campaign",
id:10
},{
rule:"optional",
type:"Settings",
name:"settings",
id:11
},{
rule:"optional",
type:"Install",
name:"install",
id:1e3
}]
},{
name:"Issue",
syntax:"proto2",
fields:[{
rule:"optional",
type:"IssueCategory",
name:"category",
id:1
},{
rule:"optional",
type:"IssueSource",
name:"source",
id:2
},{
rule:"optional",
type:"IssueObject",
name:"error",
id:3
}]
},{
name:"IssueObject",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"code",
id:1
},{
rule:"optional",
type:"string",
name:"subcode",
id:2
},{
rule:"optional",
type:"IssueSeverity",
name:"severity",
id:3
},{
rule:"optional",
type:"string",
name:"message",
id:4
},{
rule:"optional",
type:"string",
name:"log",
id:5
}]
},{
name:"IssueEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"IssueRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"IssueRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"License",
name:"license",
id:7
},{
rule:"optional",
type:"Shepherd",
name:"shepherd",
id:8
},{
rule:"optional",
type:"Browser",
name:"browser",
id:10
},{
rule:"optional",
type:"Campaign",
name:"campaign",
id:11
},{
rule:"optional",
type:"Settings",
name:"settings",
id:12
},{
rule:"optional",
type:"Issue",
name:"issue",
id:1e3
}]
},{
name:"Licensing",
syntax:"proto2",
fields:[{
rule:"optional",
type:"LicensingOperation",
name:"operation",
id:1
},{
rule:"optional",
type:"LicensingType",
name:"type",
id:2
},{
rule:"optional",
type:"LicensingInitiated",
name:"initiated",
id:3
},{
rule:"optional",
type:"License",
name:"new_license",
id:4
},{
rule:"optional",
type:"LicensingError",
name:"error",
id:6
}]
},{
name:"LicensingError",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"code",
id:1
},{
rule:"optional",
type:"string",
name:"msg",
id:2
}]
},{
name:"LicensingEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"LicensingRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"LicensingRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"License",
name:"license",
id:7
},{
rule:"optional",
type:"Shepherd",
name:"shepherd",
id:8
},{
rule:"optional",
type:"Browser",
name:"browser",
id:10
},{
rule:"optional",
type:"Campaign",
name:"campaign",
id:11
},{
rule:"optional",
type:"Settings",
name:"settings",
id:12
},{
rule:"optional",
type:"Licensing",
name:"licensing",
id:1e3
}]
},{
name:"NPSSurvey",
syntax:"proto2",
fields:[{
rule:"optional",
type:"uint32",
name:"score",
id:1
},{
rule:"optional",
type:"string",
name:"textFeedback",
id:2
}]
},{
name:"NPSSurveyEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"NPSSurveyRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"NPSSurveyRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"License",
name:"license",
id:7
},{
rule:"optional",
type:"Shepherd",
name:"shepherd",
id:8
},{
rule:"optional",
type:"Browser",
name:"browser",
id:10
},{
rule:"optional",
type:"Campaign",
name:"campaign",
id:11
},{
rule:"optional",
type:"Settings",
name:"settings",
id:12
},{
rule:"optional",
type:"NPSSurvey",
name:"nps_survey",
id:1e3
}]
},{
name:"Preferences",
syntax:"proto2",
fields:[{
rule:"optional",
type:"PreferencesProduct",
name:"config",
id:2
},{
rule:"optional",
type:"int64",
name:"previous_time",
id:3
}]
},{
name:"PreferencesProduct",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"PreferencesProductFeature",
name:"configuration",
id:1
}]
},{
name:"PreferencesProductFeature",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"category",
id:1
},{
rule:"optional",
type:"string",
name:"name",
id:2
},{
rule:"optional",
type:"string",
name:"state",
id:3
}]
},{
name:"PreferencesEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"PreferencesRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"PreferencesRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"License",
name:"license",
id:7
},{
rule:"optional",
type:"Shepherd",
name:"shepherd",
id:8
},{
rule:"optional",
type:"Browser",
name:"browser",
id:10
},{
rule:"optional",
type:"Campaign",
name:"campaign",
id:11
},{
rule:"optional",
type:"Settings",
name:"settings",
id:12
},{
rule:"optional",
type:"Preferences",
name:"preferences",
id:1e3
}]
},{
name:"Uninstall",
syntax:"proto2",
fields:[{
rule:"optional",
type:"UninstallOperation",
name:"operation",
id:1
},{
rule:"optional",
type:"UninstallError",
name:"error",
id:2
}]
},{
name:"UninstallError",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"code",
id:1
},{
rule:"optional",
type:"string",
name:"msg",
id:2
}]
},{
name:"UninstallEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"UninstallRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"UninstallRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"License",
name:"license",
id:7
},{
rule:"optional",
type:"Shepherd",
name:"shepherd",
id:8
},{
rule:"optional",
type:"Browser",
name:"browser",
id:9
},{
rule:"optional",
type:"Campaign",
name:"campaign",
id:11
},{
rule:"optional",
type:"Settings",
name:"settings",
id:12
},{
rule:"optional",
type:"Uninstall",
name:"uninstall",
id:1e3
}]
},{
name:"Update",
syntax:"proto2",
fields:[{
rule:"optional",
type:"UpdateAction",
name:"action",
id:1
},{
rule:"optional",
type:"UpdateComponent",
name:"component",
id:2
},{
rule:"optional",
type:"UpdateType",
name:"type",
id:3
},{
rule:"optional",
type:"UpdateTime",
name:"time",
id:4
},{
rule:"optional",
type:"UpdateTargetVersion",
name:"version",
id:5
},{
rule:"optional",
type:"UpdateProductSetting",
name:"setting",
id:6
},{
rule:"optional",
type:"UpdateError",
name:"error",
id:7
}]
},{
name:"UpdateTime",
syntax:"proto2",
fields:[{
rule:"optional",
type:"int64",
name:"previous",
id:1
},{
rule:"optional",
type:"int64",
name:"starts",
id:2
},{
rule:"optional",
type:"int64",
name:"ends",
id:3
}]
},{
name:"UpdateProductSetting",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"program",
id:1
},{
rule:"optional",
type:"string",
name:"source",
id:2
},{
rule:"optional",
type:"string",
name:"svc_state",
id:3
}]
},{
name:"UpdateTargetVersion",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"version_app",
id:1
},{
rule:"optional",
type:"string",
name:"version_gui",
id:2
},{
rule:"optional",
type:"int32",
name:"build",
id:3
},{
rule:"optional",
type:"string",
name:"version_setup",
id:4
},{
rule:"optional",
type:"int32",
name:"microupdate_id",
id:5
}]
},{
name:"UpdateError",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"code",
id:1
},{
rule:"optional",
type:"string",
name:"msg",
id:2
}]
},{
name:"UpdateEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"UpdateRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"UpdateRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"License",
name:"license",
id:7
},{
rule:"optional",
type:"Shepherd",
name:"shepherd",
id:8
},{
rule:"optional",
type:"Browser",
name:"browser",
id:9
},{
rule:"optional",
type:"Update",
name:"updates",
id:1e3
}]
},{
name:"AOSWebshieldScanning",
syntax:"proto2",
fields:[{
rule:"optional",
type:"sint64",
name:"caller_id",
id:1
},{
rule:"optional",
type:"int64",
name:"webshield_setting",
id:2
},{
rule:"optional",
type:"string",
name:"request_domain",
id:3
},{
rule:"optional",
type:"AOSRequestDurations",
name:"request_durations",
id:4
},{
rule:"optional",
type:"AOSProductAV",
name:"product_av",
id:5
}]
},{
name:"AOSProductAV",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Identity",
name:"identity",
id:1
},{
rule:"optional",
type:"Product",
name:"product",
id:2
}]
},{
name:"AOSRequestDurations",
syntax:"proto2",
fields:[{
rule:"optional",
type:"int32",
name:"headers_received",
id:1
},{
rule:"optional",
type:"int32",
name:"response_started",
id:2
},{
rule:"optional",
type:"int32",
name:"request_completed",
id:3
},{
rule:"optional",
type:"int32",
name:"dom_loaded",
id:4
},{
rule:"optional",
type:"int32",
name:"page_loaded",
id:5
}]
},{
name:"AOSWebshieldScanningEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"AOSWebshieldScanningRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"AOSWebshieldScanningRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Browser",
name:"browser",
id:6
},{
rule:"optional",
type:"AOSWebshieldScanning",
name:"aos_webshield_scanning",
id:1e3
}]
},{
name:"BatterySaverStats",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"laptop_vendor",
id:1
},{
rule:"optional",
type:"string",
name:"cpu_model",
id:2
},{
rule:"optional",
type:"int32",
name:"brightness",
id:3
},{
rule:"optional",
type:"int32",
name:"wifi_status",
id:4
},{
rule:"optional",
type:"int32",
name:"bluetooth_status",
id:5
},{
rule:"optional",
type:"int32",
name:"active_profile",
id:6
},{
rule:"optional",
type:"int32",
name:"automode_ac",
id:7
},{
rule:"optional",
type:"int32",
name:"automode_dc",
id:8
},{
rule:"optional",
type:"int32",
name:"remaining_time",
id:9
},{
rule:"optional",
type:"string",
name:"average_battery_life",
id:10
},{
rule:"repeated",
type:"BatteryInfo",
name:"info",
id:11
}]
},{
name:"BatteryInfo",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"battery_id",
id:7
},{
rule:"optional",
type:"int32",
name:"rate",
id:2
},{
rule:"optional",
type:"int32",
name:"designed_capacity",
id:3
},{
rule:"optional",
type:"int32",
name:"full_charged_capacity",
id:4
},{
rule:"optional",
type:"int32",
name:"capacity",
id:5
},{
rule:"optional",
type:"int32",
name:"state",
id:6
}]
},{
name:"BatterySaverEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"BatterySaverRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"BatterySaverRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"License",
name:"license",
id:7
},{
rule:"optional",
type:"Shepherd",
name:"shepherd",
id:8
},{
rule:"optional",
type:"BatterySaverStats",
name:"battery_saver",
id:1e3
}]
},{
name:"BreachGuardDbrs",
syntax:"proto2",
fields:[{
rule:"optional",
type:"bool",
name:"all_scenarios_run",
id:1
},{
rule:"optional",
type:"uint32",
name:"successfull_scenarios",
id:2
},{
rule:"optional",
type:"uint32",
name:"failed_scenarios",
id:3
},{
rule:"optional",
type:"uint32",
name:"not_run_scenarios",
id:4
},{
rule:"optional",
type:"int64",
name:"time_last_all_scenarios_run",
id:5
},{
rule:"optional",
type:"uint32",
name:"total_scenarios",
id:6
}]
},{
name:"BreachGuardDbrsEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"BreachGuardDbrsRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"BreachGuardDbrsRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"License",
name:"license",
id:7
},{
rule:"optional",
type:"Shepherd",
name:"shepherd",
id:8
},{
rule:"optional",
type:"BreachGuardDbrs",
name:"breach_guard_dbrs",
id:1e3
}]
},{
name:"BreachGuardDbrsFail",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"scenario_id",
id:1
},{
rule:"optional",
type:"string",
name:"scenario_version",
id:2
},{
rule:"optional",
type:"uint32",
name:"scenario_step",
id:3
},{
rule:"optional",
type:"string",
name:"scenario_err_msg",
id:4
}]
},{
name:"BreachGuardDbrsFailEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"BreachGuardDbrsFailRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"BreachGuardDbrsFailRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"License",
name:"license",
id:7
},{
rule:"optional",
type:"Shepherd",
name:"shepherd",
id:8
},{
rule:"optional",
type:"BreachGuardDbrsFail",
name:"breach_guard_dbrs_fail",
id:1e3
}]
},{
name:"BreachGuardDwm",
syntax:"proto2",
fields:[{
rule:"optional",
type:"uint32",
name:"unverified_emails",
id:1
},{
rule:"optional",
type:"uint32",
name:"verified_emails",
id:2
},{
rule:"optional",
type:"uint32",
name:"subscribed_emails",
id:3
},{
rule:"optional",
type:"uint32",
name:"unresolved_breaches",
id:4
},{
rule:"optional",
type:"uint32",
name:"resolved_breaches",
id:5
},{
rule:"optional",
type:"uint32",
name:"searches",
id:6
},{
rule:"optional",
type:"uint32",
name:"searche_unique_emails",
id:7
},{
rule:"optional",
type:"uint32",
name:"onboarding_breaches",
id:8
}]
},{
name:"BreachGuardDwmEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"BreachGuardDwmRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"BreachGuardDwmRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"License",
name:"license",
id:7
},{
rule:"optional",
type:"Shepherd",
name:"shepherd",
id:8
},{
rule:"optional",
type:"BreachGuardDwm",
name:"breach_guard_dwm",
id:1e3
}]
},{
name:"ConnectivityChecker",
syntax:"proto2",
fields:[{
rule:"optional",
type:"int64",
name:"event_time",
id:1
},{
rule:"optional",
type:"int32",
name:"service_id",
id:2
},{
rule:"optional",
type:"int32",
name:"status_code",
id:3
},{
rule:"optional",
type:"int32",
name:"error_code",
id:4
},{
rule:"optional",
type:"int32",
name:"vpn",
id:5
},{
rule:"optional",
type:"int32",
name:"wifi",
id:6
},{
rule:"optional",
type:"int32",
name:"ipv4",
id:7
},{
rule:"optional",
type:"int32",
name:"ipv6",
id:8
},{
rule:"optional",
type:"int32",
name:"count",
id:9
}]
},{
name:"ConnectivityCheckerEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"ConnectivityCheckerRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"ConnectivityCheckerRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"License",
name:"license",
id:7
},{
rule:"optional",
type:"Shepherd",
name:"shepherd",
id:8
},{
rule:"optional",
type:"ConnectivityChecker",
name:"connectivity_checker",
id:1e3
}]
},{
name:"MaliciousContent",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"url",
id:1
}]
},{
name:"MaliciousURLEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"MaliciousURLRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"MaliciousURLRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Browser",
name:"browser",
id:6
},{
rule:"optional",
type:"MaliciousContent",
name:"malicious",
id:1e3
}]
},{
name:"Setup",
syntax:"proto2",
fields:[{
rule:"optional",
type:"SetupCommon",
name:"common",
id:1
},{
rule:"optional",
type:"SetupProductConfig",
name:"product",
id:3
},{
rule:"optional",
type:"SetupMain",
name:"config",
id:4
},{
rule:"optional",
type:"SetupSystem",
name:"system",
id:5
},{
rule:"optional",
type:"SetupUI",
name:"ui",
id:6
},{
rule:"optional",
type:"SetupFinishState",
name:"finish_state",
id:7
}]
},{
name:"SetupCommon",
syntax:"proto2",
fields:[{
rule:"optional",
type:"SetupOperation",
name:"operation",
id:1
},{
rule:"optional",
type:"string",
name:"session_id",
id:2
},{
rule:"optional",
type:"string",
name:"stage",
id:3
},{
rule:"optional",
type:"string",
name:"title",
id:4
}]
},{
name:"SetupFinishState",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"reboot",
id:1
},{
rule:"optional",
type:"string",
name:"ret_code",
id:2
}]
},{
name:"SetupMain",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"SetupProductConfig",
name:"configuration",
id:1
},{
rule:"repeated",
type:"SetupMainProducts",
name:"main_products",
id:2
},{
rule:"optional",
type:"string",
name:"master_icarus_ver",
id:3
},{
rule:"optional",
type:"bool",
name:"manual_update",
id:4
},{
rule:"optional",
type:"string",
name:"sfx_ver",
id:5
}]
},{
name:"SetupProductConfig",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"channel",
id:1
},{
rule:"optional",
type:"string",
name:"local_product_ver",
id:3
},{
rule:"optional",
type:"SetupOperation",
name:"operation",
id:4
},{
rule:"optional",
type:"string",
name:"remote_icarus_ver",
id:6
},{
rule:"optional",
type:"string",
name:"remote_product_ver",
id:7
},{
rule:"optional",
type:"bool",
name:"executing",
id:8
},{
rule:"optional",
type:"string",
name:"local_icarus_ver",
id:10
},{
rule:"optional",
type:"string",
name:"bundle_guid",
id:11
},{
rule:"optional",
type:"string",
name:"guid",
id:12
},{
rule:"optional",
type:"string",
name:"overlay_channel",
id:13
},{
rule:"optional",
type:"int64",
name:"overlay_expiration",
id:14
},{
rule:"optional",
type:"string",
name:"name",
id:15
}]
},{
name:"SetupMainProducts",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"channel",
id:1
},{
rule:"optional",
type:"string",
name:"product",
id:2
}]
},{
name:"SetupSystem",
syntax:"proto2",
fields:[{
rule:"optional",
type:"int32",
name:"memory",
id:1
},{
rule:"optional",
type:"int32",
name:"processors",
id:2
},{
rule:"optional",
type:"bool",
name:"workstation",
id:3
},{
rule:"optional",
type:"SetupSystemHdd",
name:"hdd",
id:4
}]
},{
name:"SetupSystemHdd",
syntax:"proto2",
fields:[{
rule:"optional",
type:"int32",
name:"available",
id:1
},{
rule:"optional",
type:"string",
name:"company_path",
id:2
}]
},{
name:"SetupUI",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"category",
id:1
},{
rule:"optional",
type:"string",
name:"action",
id:2
},{
rule:"optional",
type:"string",
name:"label",
id:3
},{
rule:"optional",
type:"string",
name:"view",
id:4
}]
},{
name:"SetupEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"SetupRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"SetupRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"Setup",
name:"setup",
id:1e3
}]
},{
name:"VoteRequest",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"url",
id:1
},{
rule:"optional",
type:"int32",
name:"rating",
id:2
}]
},{
name:"VoteEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"VoteRecord",
name:"record",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"VoteRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"License",
name:"license",
id:7
},{
rule:"optional",
type:"Shepherd",
name:"shepherd",
id:8
},{
rule:"optional",
type:"Browser",
name:"browser",
id:10
},{
rule:"optional",
type:"Campaign",
name:"campaign",
id:11
},{
rule:"optional",
type:"Settings",
name:"settings",
id:12
},{
rule:"optional",
type:"VoteRequest",
name:"vote",
id:1e3
}]
},{
name:"VPNConnection",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"vpn_name",
id:1
},{
rule:"optional",
type:"VPNSourceType",
name:"source",
id:2
},{
rule:"optional",
type:"VPNTechnology",
name:"vpn_technology",
id:3
},{
rule:"optional",
type:"VPNError",
name:"error",
id:4
},{
rule:"optional",
type:"VPNInfo",
name:"vpn_info",
id:5
},{
rule:"optional",
type:"VPNSessionInfo",
name:"vpn_session_info",
id:6
},{
rule:"optional",
type:"VPNMobileParams",
name:"vpn_mobile_params",
id:7
},{
rule:"optional",
type:"VPNOpenVpnClient",
name:"vpn_openvpn",
id:8
}]
},{
name:"VPNOpenVpnClient",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"build_version",
id:1
},{
rule:"optional",
type:"VPNOpenVpnClientConnectionMethod",
name:"connection_method",
id:2
}]
},{
name:"VPNError",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"code",
id:1
},{
rule:"optional",
type:"string",
name:"subcode",
id:2
},{
rule:"optional",
type:"VPNErrorSeverity",
name:"severity",
id:3
},{
rule:"optional",
type:"string",
name:"description",
id:4
},{
rule:"optional",
type:"string",
name:"log",
id:5
},{
rule:"optional",
type:"string",
name:"service_endpoint",
id:6
}]
},{
name:"VPNInfo",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"server_address",
id:1
},{
rule:"optional",
type:"bytes",
name:"server_ip_address",
id:2
},{
rule:"optional",
type:"int64",
name:"latency_avast",
id:3
},{
rule:"optional",
type:"int64",
name:"latency_server",
id:4
},{
rule:"optional",
type:"int32",
name:"event_duration",
id:7
},{
rule:"optional",
type:"double",
name:"packet_loss",
id:8
},{
rule:"optional",
type:"VPNOptimalLocation",
name:"optimal_locations",
id:9
},{
rule:"optional",
type:"VPNSettingsConnection",
name:"settings",
id:10
},{
rule:"optional",
type:"VPNReconnection",
name:"reconnection",
id:11
}]
},{
name:"VPNOptimalLocation",
syntax:"proto2",
fields:[{
rule:"optional",
type:"VPNOptimalLocationType",
name:"type",
id:1
},{
rule:"optional",
type:"int32",
name:"remaining_ttl",
id:2
},{
rule:"optional",
type:"int32",
name:"request_duration",
id:3
}]
},{
name:"VPNReconnection",
syntax:"proto2",
fields:[{
rule:"optional",
type:"int32",
name:"attempt",
id:1
},{
rule:"optional",
type:"VPNReconnectionEventSource",
name:"source",
id:2
}]
},{
name:"VPNSettingsConnection",
syntax:"proto2",
fields:[{
rule:"optional",
type:"bool",
name:"autoconnect",
id:1
},{
rule:"optional",
type:"bool",
name:"killswitch",
id:2
},{
rule:"optional",
type:"int32",
name:"ipperiod",
id:3
}]
},{
name:"VPNMobileParams",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"carrier_name",
id:1
},{
rule:"optional",
type:"string",
name:"iso_country_code",
id:2
},{
rule:"optional",
type:"string",
name:"mnc",
id:3
},{
rule:"repeated",
type:"VPNNetworkInterfaceType",
name:"network_interface_stack",
id:4
},{
rule:"optional",
type:"VPNRadioTechnologyType",
name:"radio_technology",
id:5
},{
rule:"optional",
type:"uint32",
name:"reachability_flags",
id:6
}]
},{
name:"VPNSessionInfo",
syntax:"proto2",
fields:[{
rule:"optional",
type:"string",
name:"session_id",
id:1
},{
rule:"optional",
type:"uint64",
name:"startTimestamp",
id:2
},{
rule:"optional",
type:"uint64",
name:"endTimestamp",
id:3
},{
rule:"optional",
type:"uint64",
name:"clientDownloadBytes",
id:4
},{
rule:"optional",
type:"uint64",
name:"clientUploadBytes",
id:5
}]
},{
name:"VPNConnectionEnvelope",
syntax:"proto2",
fields:[{
rule:"repeated",
type:"VPNConnectionRecord",
name:"event",
id:1
},{
rule:"optional",
type:"EnvelopeCommon",
name:"common",
id:2
}]
},{
name:"VPNConnectionRecord",
syntax:"proto2",
fields:[{
rule:"optional",
type:"Event",
name:"event",
id:1
},{
rule:"optional",
type:"Identity",
name:"identity",
id:2
},{
rule:"optional",
type:"Product",
name:"product",
id:3
},{
rule:"optional",
type:"Platform",
name:"platform",
id:4
},{
rule:"optional",
type:"Geo",
name:"geo",
id:5
},{
rule:"optional",
type:"Installation",
name:"installation",
id:6
},{
rule:"optional",
type:"License",
name:"license",
id:7
},{
rule:"optional",
type:"Shepherd",
name:"shepherd",
id:8
},{
rule:"optional",
type:"Browser",
name:"browser",
id:10
},{
rule:"optional",
type:"VPNConnection",
name:"vpn_connection",
id:1e3
}]
}],
enums:[{
name:"BrowserType",
syntax:"proto2",
values:[{
name:"OTHER_BROWSER",
id:1
},{
name:"AVAST_SECURE_BROWSER",
id:2
},{
name:"CHROME",
id:3
},{
name:"FIREFOX",
id:4
},{
name:"SAFARI",
id:5
},{
name:"MICROSOFTEDGE",
id:6
},{
name:"OPERA",
id:7
},{
name:"IE",
id:8
},{
name:"PALE_MOON",
id:9
},{
name:"NETSCAPE",
id:10
},{
name:"UC",
id:11
},{
name:"YAB",
id:12
},{
name:"COC_COC",
id:13
},{
name:"CHROMIUM",
id:14
},{
name:"VIVALDI",
id:15
}]
},{
name:"SetupAction",
syntax:"proto2",
values:[{
name:"INSTALL",
id:1
},{
name:"REINSTALL",
id:2
},{
name:"REPAIR",
id:3
},{
name:"UPGRADE",
id:4
},{
name:"MIGRATION",
id:5
},{
name:"UNINSTALL",
id:6
},{
name:"CHANGE",
id:7
},{
name:"CHECKFORUPDATES",
id:8
},{
name:"COMPLETEOPERATION",
id:9
},{
name:"OTHER",
id:10
}]
},{
name:"LicenseEdition",
syntax:"proto2",
values:[{
name:"AV_FREE",
id:1
},{
name:"AV_PRO",
id:2
},{
name:"AV_AIS",
id:3
},{
name:"AV_APR",
id:4
},{
name:"AV_BUSINESS",
id:5
},{
name:"AV_VPN",
id:6
},{
name:"GF_SRV",
id:7
},{
name:"AV_PSW",
id:8
},{
name:"AV_PAP",
id:9
},{
name:"AV_PSM",
id:10
},{
name:"AV_ASH",
id:12
},{
name:"AV_SOHO",
id:13
},{
name:"AV_AVG_PRO",
id:14
},{
name:"AV_AVG_FREE",
id:15
},{
name:"AV_AVG_BUSINESS",
id:16
},{
name:"PCT_AVG_PRO",
id:17
},{
name:"AVG_VPN",
id:18
},{
name:"HMA_VPN_CONSUMER",
id:19
},{
name:"HMA_VPN_TRIAL",
id:20
},{
name:"HMA_VPN_BUSINESS",
id:21
},{
name:"GF_V2",
id:22
},{
name:"BS_AVAST",
id:23
},{
name:"BS_AVG",
id:24
},{
name:"DU_AVAST",
id:25
},{
name:"DU_AVG",
id:26
}]
},{
name:"ModeType",
syntax:"proto2",
values:[{
name:"NO_LICENSE",
id:1
},{
name:"FREE",
id:2
},{
name:"TRIAL",
id:3
},{
name:"PAID",
id:4
},{
name:"OEM",
id:5
},{
name:"PRE_AUTH_TRIAL",
id:6
},{
name:"BETA",
id:7
},{
name:"FREEMIUM",
id:8
},{
name:"TRIAL_HARDCODED",
id:9
}]
},{
name:"StateType",
syntax:"proto2",
values:[{
name:"ACTIVE",
id:1
},{
name:"EXPIRED",
id:2
}]
},{
name:"OperatingSystem",
syntax:"proto2",
values:[{
name:"WINDOWS",
id:1
},{
name:"OSX",
id:2
},{
name:"IOS",
id:3
},{
name:"LINUX",
id:4
},{
name:"ANDROID",
id:5
},{
name:"CHROMEOS",
id:6
}]
},{
name:"Architecture",
syntax:"proto2",
values:[{
name:"X86",
id:1
},{
name:"X64",
id:2
},{
name:"ARM",
id:3
},{
name:"ARM64",
id:4
},{
name:"MIPS",
id:5
}]
},{
name:"WinAVGSMainStatus",
syntax:"proto2",
values:[{
name:"NULL",
id:0
},{
name:"GREEN",
id:1
},{
name:"YELLOW",
id:2
},{
name:"RED",
id:3
}]
},{
name:"IssueCategory",
syntax:"proto2",
values:[{
name:"DEBUG",
id:1
},{
name:"CRASH",
id:2
},{
name:"ERROR_FAULT",
id:3
},{
name:"FAILURE",
id:4
},{
name:"WARNING",
id:5
}]
},{
name:"IssueSource",
syntax:"proto2",
values:[{
name:"USER",
id:1
},{
name:"SYSTEM",
id:2
},{
name:"CLIENT",
id:3
},{
name:"SERVICE",
id:4
},{
name:"BACKEND",
id:5
}]
},{
name:"IssueSeverity",
syntax:"proto2",
values:[{
name:"TRIVIAL",
id:1
},{
name:"LOW",
id:2
},{
name:"HIGH",
id:3
},{
name:"CRITICAL",
id:4
},{
name:"BLOCKER",
id:5
}]
},{
name:"LicensingOperation",
syntax:"proto2",
values:[{
name:"NOTACTIVATED",
id:1
},{
name:"NA_FREE",
id:2
},{
name:"FREE_FREE",
id:3
},{
name:"FREE_TRIAL",
id:4
},{
name:"FREE_PAID",
id:5
},{
name:"NA_TRIAL",
id:6
},{
name:"TRIAL_TRIAL",
id:8
},{
name:"TRIAL_FREE",
id:9
},{
name:"TRIAL_PAID",
id:10
},{
name:"NA_PAID",
id:11
},{
name:"PAID_PAID",
id:12
},{
name:"PAID_FREE",
id:13
},{
name:"PAID_TRIAL",
id:14
}]
},{
name:"LicensingType",
syntax:"proto2",
values:[{
name:"UNKNOWN_LICENSE_TYPE_ON_CLIENT",
id:0
},{
name:"WALLET_KEY_LICENSE_TYPE",
id:1
},{
name:"S_TYPE",
id:2
},{
name:"C_TYPE",
id:3
},{
name:"FILE_LEGACY",
id:4
},{
name:"FILE_ALPHA",
id:5
},{
name:"AVG",
id:6
},{
name:"EMS_TYPE",
id:7
}]
},{
name:"LicensingInitiated",
syntax:"proto2",
values:[{
name:"UNKNOWN_ORIGIN",
id:0
},{
name:"MANUAL",
id:1
},{
name:"CART",
id:2
},{
name:"LOCAL_WK",
id:3
},{
name:"ALD_GET_UNATTENDED_TRIAL",
id:4
},{
name:"ALD_ACCEPT_TRIAL",
id:5
},{
name:"ALD_DISCOVER_WK",
id:6
},{
name:"ALD_SWITCH_TO_FREE",
id:7
},{
name:"INSTALLER",
id:8
},{
name:"WEBSHIELD",
id:9
},{
name:"MYAVAST",
id:10
},{
name:"SUBSCRIPTION_PAGE",
id:11
},{
name:"CONFLICT",
id:12
},{
name:"MIGRATIONALPHA",
id:13
}]
},{
name:"UninstallOperation",
syntax:"proto2",
values:[{
name:"USERSTARTED",
id:1
},{
name:"UNINSTALLED",
id:2
}]
},{
name:"UpdateAction",
syntax:"proto2",
values:[{
name:"DOWNLOADING_SUCCESS",
id:1
},{
name:"DOWNLOADING_FAILED",
id:2
},{
name:"UPDATING_SUCCESS",
id:3
},{
name:"UPDATING_FAILED",
id:4
}]
},{
name:"UpdateComponent",
syntax:"proto2",
values:[{
name:"PROGRAM",
id:1
},{
name:"SETUP",
id:2
},{
name:"VPS",
id:3
}]
},{
name:"UpdateType",
syntax:"proto2",
values:[{
name:"NORMAL",
id:1
},{
name:"MICRO",
id:2
},{
name:"EMERGENCY",
id:3
}]
},{
name:"SetupOperation",
syntax:"proto2",
values:[{
name:"unknown",
id:0
},{
name:"install",
id:1
},{
name:"uninstall",
id:2
},{
name:"repair",
id:3
},{
name:"update",
id:4
},{
name:"change",
id:5
},{
name:"checkforupdates",
id:6
},{
name:"completeoperation",
id:7
}]
},{
name:"VPNSourceType",
syntax:"proto2",
values:[{
name:"USERS",
id:1
},{
name:"SYSTEMS",
id:2
},{
name:"CLIENTS",
id:3
},{
name:"EXTENSIONS",
id:4
}]
},{
name:"VPNTechnology",
syntax:"proto2",
values:[{
name:"OpenVPN",
id:1
},{
name:"IPsec_IKEv1_cert",
id:2
},{
name:"IPsec_IKEv2_PSK",
id:3
}]
},{
name:"VPNOpenVpnClientConnectionMethod",
syntax:"proto2",
values:[{
name:"Adaptive",
id:1
},{
name:"IPAPI",
id:2
},{
name:"Dynamic",
id:3
},{
name:"Netsh",
id:4
},{
name:"Manual",
id:5
}]
},{
name:"VPNErrorSeverity",
syntax:"proto2",
values:[{
name:"Blocker",
id:1
},{
name:"Warning",
id:2
}]
},{
name:"VPNOptimalLocationType",
syntax:"proto2",
values:[{
name:"DNS",
id:1
},{
name:"HTTPDNSProxy",
id:2
}]
},{
name:"VPNReconnectionEventSource",
syntax:"proto2",
values:[{
name:"Other",
id:0
},{
name:"User",
id:1
},{
name:"IpShuffle",
id:2
},{
name:"AutoConnect",
id:3
},{
name:"InternetReconnected",
id:4
}]
},{
name:"VPNNetworkInterfaceType",
syntax:"proto2",
values:[{
name:"CELLULAR",
id:1
},{
name:"WIFI",
id:2
},{
name:"TUNNEL",
id:3
},{
name:"WIMAX",
id:4
},{
name:"ETHERNET",
id:5
},{
name:"BLUETOOTH",
id:6
},{
name:"DUMMY",
id:7
},{
name:"MOBILE_DUN",
id:8
},{
name:"MOBILE_HIPRI",
id:9
},{
name:"MOBILE_MMS",
id:10
},{
name:"MOBILE_SUPL",
id:11
}]
},{
name:"VPNRadioTechnologyType",
syntax:"proto2",
values:[{
name:"GPRS",
id:1
},{
name:"EDGE",
id:2
},{
name:"CDMA",
id:3
},{
name:"CDMA1X",
id:4
},{
name:"WCDMA",
id:5
},{
name:"IDEN",
id:6
},{
name:"HSDPA",
id:7
},{
name:"HSUPA",
id:8
},{
name:"CDMAEVDOREV0",
id:9
},{
name:"CDMAEVDOREVA",
id:10
},{
name:"CDMAEVDOREVB",
id:11
},{
name:"EHRPD",
id:12
},{
name:"HSPA",
id:13
},{
name:"HSPAP",
id:14
},{
name:"UMTS",
id:15
},{
name:"LTE",
id:16
},{
name:"UNKNOWN",
id:17
}]
}],
isNamespace:!0
}).build()
},function(e){
e.exports=JSON.parse('{"ar":{"background.icon.unknown":"{0} - موقع غير معروف","background.icon.safe":"{0} - هذا الموقع آمن","background.icon.bad":"{0} - قد يكون هذا الموقع غير موثوق","background.icon.unsafe":"{0} - قد يكون هذا الموقع غير آمن","background.icon.nps":"هل أنت راضٍ عن {0}؟ يمكنك إجراء استطلاعٍ قصير"},"be":{"background.icon.unknown":"{0}: невядомы сайт","background.icon.safe":"{0}: гэты вэб-сайт бяспечны","background.icon.bad":"{0}: гэты сайт можа быць небяспечным","background.icon.unsafe":"{0}: гэты вэб-сайт небяспечны","background.icon.nps":"Вы задаволены {0}? Прайдзіце кароткае апытанне"},"bg":{"background.icon.unknown":"{0} – Неизвестен сайт","background.icon.safe":"{0} – Уеб сайтът е безопасен","background.icon.bad":"{0} – Сайтът може да не е благонадежден","background.icon.unsafe":"{0} – Уеб сайтът не е безопасен","background.icon.nps":"Доволни ли сте от {0}? Попълнете една бърза анкета"},"bn":{"background.icon.unknown":"{0} - অজানা সাইট","background.icon.safe":"{0}- এই ওয়েবসাইটটি নিরাপদ","background.icon.bad":"{0}- এই সাইটটি বিশ্বাসযোগ্য নয়","background.icon.unsafe":"{0}- এই ওয়েবসাইটটি নিরাপদ নয়","background.icon.nps":" আপনি কি {0} সম্পর্কে খুশি? দ্রুত একটি সার্ভে করে দেখুন"},"ca":{"background.icon.unknown":"{0}: Lloc desconegut.","background.icon.safe":"{0}: Aquest lloc web és segur.","background.icon.bad":"{0}: Aquest lloc pot ser no fiable.","background.icon.unsafe":"{0}: Aquest lloc web no és segur.","background.icon.nps":"Esteu satisfet amb l\'{0}? Responeu una enquesta ràpida"},"cs":{"background.icon.unknown":"{0} – neznámá stránka","background.icon.safe":"{0} – tato stránka je bezpečná","background.icon.bad":"{0} – tato stránka může být nedůvěryhodná","background.icon.unsafe":"{0} – tato stránka je nebezpečná","background.icon.nps":"Vyhovuje vám {0}? Zúčastněte se krátkého průzkumu!"},"da":{"background.icon.unknown":"{0} – ukendt websted","background.icon.safe":"{0} – dette websted er sikkert","background.icon.bad":"{0} – dette websted kan være upålideligt","background.icon.unsafe":"{0} – dette websted er ikke sikkert","background.icon.nps":"Er du glad for {0}? Tag en hurtig spørgeundersøgelse"},"de":{"background.icon.unknown":"{0} - Unbekannte Webseite","background.icon.safe":"{0} - Diese Webseite ist sicher","background.icon.bad":"{0} - Diese Webseite ist möglichweise nicht vertrauenswürdig","background.icon.unsafe":"{0} - Diese Webseite ist nicht sicher","background.icon.nps":"Sind Sie mit Ihrem {0} zufrieden? Nehmen Sie an einer schnellen Umfrage teil"},"el":{"background.icon.unknown":"{0} - Άγνωστος ιστότοπος","background.icon.safe":"{0} - Αυτός ο ιστότοπος είναι ασφαλής","background.icon.bad":"{0} - Αυτός ο ιστότοπος μπορεί να είναι αναξιόπιστος","background.icon.unsafe":"{0} - Αυτός ο ιστότοπος δεν είναι ασφαλής","background.icon.nps":"Είστε ευχαριστημένοι από το {0}; Απαντήστε σε μια γρήγορη έρευνα"},"en":{"background.icon.unknown":"{0} - Unknown site","background.icon.safe":"{0} - This website is safe","background.icon.bad":"{0} - This site may be untrustworthy","background.icon.unsafe":"{0} - This website is unsafe","background.icon.nps":"Are you happy with {0}? Take a quick survey"},"es":{"background.icon.unknown":"{0}: Sitio desconocido","background.icon.safe":"{0}: Este sitio web es seguro.","background.icon.bad":"{0}: Este sitio puede ser poco fiable.","background.icon.unsafe":"{0}: Este sitio web no es seguro.","background.icon.nps":"¿Está satisfecho con {0}? Conteste a una breve encuesta"},"et":{"background.icon.unknown":"{0} - Tundmatu leht","background.icon.safe":"{0} - See veebileht on turvaline","background.icon.bad":"{0} - See leht võib olla ebausaldusväärne","background.icon.unsafe":"{0} - See veebileht ei ole turvaline","background.icon.nps":"Kas sa oled rahul {0}? Vasta lühikesele küsitlusele"},"fa":{"background.icon.unknown":"{0} - سایت ناشناخته","background.icon.safe":"{0} - این وب‌سایت امن است","background.icon.bad":"{0} - این سایت ممکن است نامعتبر باشد","background.icon.unsafe":"{0} - این وب‌سایت ناامن است","background.icon.nps":"آیا از {0} راضی هستید؟ در یک نظرسنجی سریع شرکت کنید"},"fi":{"background.icon.unknown":"{0} - tuntematon sivusto","background.icon.safe":"{0} - Tämä sivusto on turvallinen","background.icon.bad":"{0} - sivusto voi olla epäluotettava","background.icon.unsafe":"{0} - Tämä sivusto ei ole turvallinen","background.icon.nps":"Onko {0} sellainen kuin toivotkin? Vastaa lyhyeen kyselyyn"},"fr":{"background.icon.unknown":"{0} - Site inconnu","background.icon.safe":"{0} - Ce site Web est sûr","background.icon.bad":"{0} - Ce site peut être indigne de confiance","background.icon.unsafe":"{0} - Ce site Web n\'est pas sûr","background.icon.nps":"Êtes-vous satisfait des services d\'{0}? Répondez à notre petit sondage"},"he":{"background.icon.unknown":"{0} - אתר לא מוכר","background.icon.safe":"{0} - האתר הזה בטוח","background.icon.bad":"{0} - ייתכן שהאתר הזה לא בטוח","background.icon.unsafe":"{0} - האתר הזה לא בטוח","background.icon.nps":"אתה מרוצה מ-{0}? השתתף בסקר מהיר"},"hi":{"background.icon.unknown":"{0} - अज्ञात साइट","background.icon.safe":"{0} - यह वेबसाइट सुरक्षित है","background.icon.bad":"{0} - यह साइट अविश्वसनीय हो सकती है","background.icon.unsafe":"{0} - यह वेबसाइट असुरक्षित है","background.icon.nps":"क्या आप {0} से खुश हैं? जल्दी से एक सर्वेक्षण लें"},"hr":{"background.icon.unknown":"{0} – nepoznato web-mjesto","background.icon.safe":"{0} – ovo je web-mjesto sigurno","background.icon.bad":"{0} –ovo web-mjesto možda nije pouzdano","background.icon.unsafe":"{0} – ovo web-mjesto nije sigurno","background.icon.nps":"Jeste li zadovoljni s proizvodom {0}? Ispunite kratku anketu"},"hu":{"background.icon.unknown":"{0} – Ismeretlen webhely","background.icon.safe":"{0} – Ez a webhely biztonságos","background.icon.bad":"{0} – Előfordulhat, hogy ez a webhely nem megbízható","background.icon.unsafe":"{0} – Ez a webhely nem biztonságos","background.icon.nps":"Elégedett az {0} termékeivel? Töltsön ki egy rövid kérdőívet"},"id":{"background.icon.unknown":"{0} - Situs tidak diketahui","background.icon.safe":"{0} - Situs web ini aman","background.icon.bad":"{0} - Situs ini mungkin tidak dapat dipercaya","background.icon.unsafe":"{0} - Situs web ini tidak aman","background.icon.nps":"Anda puas dengan {0}? Ikuti survei singkatnya"},"it":{"background.icon.unknown":"{0} - Sito sconosciuto","background.icon.safe":"{0} - Questo sito è sicuro","background.icon.bad":"{0} - Questo sito potrebbe non essere affidabile","background.icon.unsafe":"{0} - Questo sito non è sicuro","background.icon.nps":"Sei soddisfatto di {0}? Rispondi a un rapido sondaggio"},"ja":{"background.icon.unknown":"{0} - 不明なサイト","background.icon.safe":"{0} - このウェブサイトは安全です","background.icon.bad":"{0} - このサイトは信頼できない可能性があります","background.icon.unsafe":"{0} - このウェブサイトは安全ではありません","background.icon.nps":"{0}にご満足いただいていますか？ 簡単なアンケートにご協力ください"},"ko":{"background.icon.unknown":"{0} - 알 수 없는 사이트","background.icon.safe":"{0} - 이 웹사이트는 안전함","background.icon.bad":"{0} - 이 사이트는 신뢰할 수 없음","background.icon.unsafe":"{0} - 이 웹사이트는 안전하지 않음","background.icon.nps":"{0}에 만족하십니까? 간단한 설문조사에 참여해주십시오."},"lt":{"background.icon.unknown":"{0} – Nežinoma interneto svetainė","background.icon.safe":"{0} – Ši interneto svetainė yra saugi","background.icon.bad":"{0} – Ši interneto svetainė gali būti nepatikima","background.icon.unsafe":"{0} – Ši interneto svetainė yra nesaugi","background.icon.nps":"Ar esate patenkinti {0}? Atlikite greitą apklausą"},"lv":{"background.icon.unknown":"{0} - nezināma vietne","background.icon.safe":"{0} - šī vietne ir droša","background.icon.bad":"{0} - šī vietne, iespējams, ir neuzticama","background.icon.unsafe":"{0} - šī vietne nav droša","background.icon.nps":"Vai {0} jūs apmierina? Veiciet īsu aptauju"},"ms":{"background.icon.unknown":"{0} – Tapak tidak diketahui","background.icon.safe":"{0} – Tapak web ini selamat","background.icon.bad":"{0} – Tapak web ini mungkin tidak boleh dipercayai","background.icon.unsafe":"{0} – Tapak web ini tidak selamat","background.icon.nps":"Adakah anda gembira dengan {0}? Jawab tinjauan pantas"},"nb":{"background.icon.unknown":"{0} – ukjent nettsted","background.icon.safe":"{0} – dette nettstedet er trygt","background.icon.bad":"{0} – dette nettstedet kan være upålitelig","background.icon.unsafe":"{0} – dette nettstedet er usikkert","background.icon.nps":"Er du fornøyd med {0}? Svar på noen kjappe spørsmål."},"nl":{"background.icon.unknown":"{0} - Onbekende website","background.icon.safe":"{0} - Deze website is veilig","background.icon.bad":"{0} - Deze website is mogelijk onbetrouwbaar","background.icon.unsafe":"{0} - Deze website is niet veilig","background.icon.nps":"Bent u tevreden over {0}? Doe mee aan een korte enquête"},"pl":{"background.icon.unknown":"{0} — Nieznana witryna","background.icon.safe":"{0} — Ta witryna jest bezpieczna","background.icon.bad":"{0} — Ta witryna może być niegodna zaufania","background.icon.unsafe":"{0} — Ta witryna jest niebezpieczna","background.icon.nps":"Czy usługi {0} Ci odpowiadają? Wypełnij krótką ankietę"},"pt_BR":{"background.icon.unknown":"{0} - Site desconhecido","background.icon.safe":"{0} - Este site é seguro","background.icon.bad":"{0} - Este site pode não ser confiável","background.icon.unsafe":"{0} - Este site não é seguro","background.icon.nps":"Está satisfeito com o {0}? Responda a uma breve pesquisa"},"pt_PT":{"background.icon.unknown":"{0} - Site desconhecido","background.icon.safe":"{0} - Este site é seguro","background.icon.bad":"{0} - Este site pode não ser fidedigno","background.icon.unsafe":"{0} - Este site não é seguro","background.icon.nps":"Está satisfeito com a {0}? Responda a um breve inquérito"},"ro":{"background.icon.unknown":"{0} - Site necunoscut","background.icon.safe":"{0} - Acest site Web este sigur","background.icon.bad":"{0} - Acest site nu este demn de încredere","background.icon.unsafe":"{0} - Acest site Web nu este sigur","background.icon.nps":"Sunteți mulțumiți de {0}? Participați la un scurt sondaj"},"ru":{"background.icon.unknown":"{0}: неизвестный сайт","background.icon.safe":"{0}: этот сайт безопасен","background.icon.bad":"{0}: этот сайт может быть ненадежным","background.icon.unsafe":"{0}: этот сайт небезопасен","background.icon.nps":"Вы довольны {0}? Пройдите краткий опрос"},"sk":{"background.icon.unknown":"{0} – neznáma stránka","background.icon.safe":"{0} – táto stránka je bezpečná","background.icon.bad":"{0} – táto stránka môže byť nedôveryhodná","background.icon.unsafe":"{0} – táto stránka je nebezpečná","background.icon.nps":"Vyhovuje vám {0}? Zúčastnite sa krátkeho prieskumu"},"sl":{"background.icon.unknown":"{0} – neznano spletno mesto","background.icon.safe":"{0} – to spletno mesto je varno","background.icon.bad":"{0} – to spletno mesto morda ni zaupanja vredno","background.icon.unsafe":"{0} – to spletno mesto ni varno","background.icon.nps":"Kako vam je všeč {0}? Izpolnite kratko anketo."},"sr":{"background.icon.unknown":"{0} – Nepoznata lokacija","background.icon.safe":"{0} – Ova veb lokacija je bezbedna","background.icon.bad":"{0} – Ova lokacija možda nije pouzdana","background.icon.unsafe":"{0} – Ova veb lokacija nije bezbedna","background.icon.nps":"Da li ste zadovoljni {0} programima? Popunite kratku anketu"},"sv":{"background.icon.unknown":"{0} – okänd webbplats","background.icon.safe":"{0} – webbplatsen är säker","background.icon.bad":"{0} – webbplatsen kan vara opålitlig","background.icon.unsafe":"{0} – webbplatsen är osäker","background.icon.nps":"Är du nöjd med {0}? Besvara enkäten"},"tr":{"background.icon.unknown":"{0} - Bilinmeyen site","background.icon.safe":"{0} - Bu web sitesi güvenli","background.icon.bad":"{0} - Bu site güvenilir olmayabilir","background.icon.unsafe":"{0} - Bu web sitesi güvenli değil","background.icon.nps":"{0} kullanmaktan memnun musunuz? Kısa bir ankete katılın"},"uk":{"background.icon.unknown":"{0}: невідомий веб-сайт","background.icon.safe":"{0}: цей веб-сайт безпечний","background.icon.bad":"{0}: цей веб-сайт може бути ненадійним","background.icon.unsafe":"{0}: цей веб-сайт ненадійний","background.icon.nps":"Ви задоволені {0}? Пройдіть коротке опитування"},"ur":{"background.icon.unknown":"{0} - نامعلوم سائٹ","background.icon.safe":"{0} - یہ ویب سائٹ محفوظ ہے۔","background.icon.bad":"{0} - یہ سائٹ غیر معتبر ہو سکتی ہے","background.icon.unsafe":"{0} - یہ ویب سائٹ غیر محفوظ ہے۔","background.icon.nps":"کیا آپ {0} سے خوش ہیں؟ ایک فوری سروے لیں"},"vi":{"background.icon.unknown":"{0} - Trang không xác định","background.icon.safe":"{0} - Trang web này an toàn","background.icon.bad":"{0} - Trang web này có thể không đáng tin","background.icon.unsafe":"{0} - Trang web này không an toàn","background.icon.nps":"Bạn có hài lòng với {0} không? Hãy tham gia khảo sát nhanh"},"zh_CN":{"background.icon.unknown":"{0} -未知站点","background.icon.safe":"{0} -此网站是安全的","background.icon.bad":"{0} -此网站可能不可信","background.icon.unsafe":"{0} -此网站不安全","background.icon.nps":"您对 {0} 满意吗？完成一项快速调查"},"zh_TW":{"background.icon.unknown":"{0} - 未知的網站","background.icon.safe":"{0} - 這個網站很安全","background.icon.bad":"{0} - 這個網站可能不值得信賴","background.icon.unsafe":"{0} - 這個網站不安全","background.icon.nps":"您對 {0} 感到滿意嗎？請填寫一份簡短的問卷"}}')
},function(e,t){
e.exports={
ar:function(e){
return Number(0==e?0:1==e?1:2==e?2:e%100>=3&&e%100<=10?3:e%100>=11&&e%100<=99?4:5)
},
be:function(e){
return Number(e%10==1&&e%100!=11?0:e%10>=2&&e%10<=4&&(e%100<12||e%100>14)?1:e%10==0||e%10>=5&&e%10<=9||e%100>=11&&e%100<=14?2:3)
},
bg:function(e){
return Number(1!=e)
},
bn:function(e){
return Number(1!=e)
},
ca:function(e){
return Number(1!=e)
},
cs:function(e){
return Number(1==e?0:e>=2&&e<=4?1:3)
},
da:function(e){
return Number(1!=e)
},
de:function(e){
return Number(1!=e)
},
el:function(e){
return Number(1!=e)
},
en:function(e){
return Number(1!=e)
},
es:function(e){
return Number(1!=e)
},
et:function(e){
return Number(1!=e)
},
fa:function(e){
return Number(1!=e)
},
fi:function(e){
return Number(1!=e)
},
fr:function(e){
return Number(e>1)
},
he:function(e){
return Number(e%100==1?0:e%100==2?1:e%100==3||e%100==4?2:3)
},
hi:function(e){
return Number(1!=e)
},
hr:function(e){
return Number(e%10==1&&e%100!=11?0:e%10>=2&&e%10<=4&&(e%100<10||e%100>=20)?1:2)
},
hu:function(e){
return Number(1!=e)
},
id:function(e){
return Number(0)
},
it:function(e){
return Number(1!=e)
},
ja:function(e){
return Number(0)
},
ko:function(e){
return Number(0)
},
lt:function(e){
return Number(e%10==1&&(e%100>19||e%100<11)?0:e%10>=2&&e%10<=9&&(e%100>19||e%100<11)?1:e%1!=0?2:3)
},
lv:function(e){
return Number(0==e?0:e%10==1&&e%100!=11?1:2)
},
ms:function(e){
return Number(0)
},
nb:function(e){
return Number(1!=e)
},
nl:function(e){
return Number(1!=e)
},
pl:function(e){
return Number(1==e?0:e%10>=2&&e%10<=4&&(e%100<12||e%100>14)?1:1!=e&&e%10>=0&&e%10<=1||e%10>=5&&e%10<=9||e%100>=12&&e%100<=14?2:3)
},
pt_BR:function(e){
return Number(1!=e)
},
pt_PT:function(e){
return Number(1!=e)
},
ro:function(e){
return Number(1==e?0:0==e||e%100>0&&e%100<20?1:2)
},
ru:function(e){
return Number(e%10==1&&e%100!=11?0:e%10>=2&&e%10<=4&&(e%100<12||e%100>14)?1:e%10==0||e%10>=5&&e%10<=9||e%100>=11&&e%100<=14?2:3)
},
sk:function(e){
return Number(1==e?0:e>=2&&e<=4?1:3)
},
sl:function(e){
return Number(e%100==1?1:e%100==2?2:e%100==3||e%100==4?3:0)
},
sr:function(e){
return Number(e%10==1&&e%100!=11?0:e%10>=2&&e%10<=4&&(e%100<10||e%100>=20)?1:2)
},
sv:function(e){
return Number(1!=e)
},
tr:function(e){
return Number(1!=e)
},
uk:function(e){
return Number(e%10==1&&e%100!=11?0:e%10>=2&&e%10<=4&&(e%100<12||e%100>14)?1:e%10==0||e%10>=5&&e%10<=9||e%100>=11&&e%100<=14?2:3)
},
ur:function(e){
return Number(1!=e)
},
vi:function(e){
return Number(0)
},
zh_CN:function(e){
return Number(0)
},
zh_TW:function(e){
return Number(0)
}
}
},function(e,t,n){
(function(e){
var i
!function(a){
t&&t.nodeType,e&&e.nodeType
var o="object"==typeof global&&global
o.global!==o&&o.window!==o&&o.self
var r,s=2147483647,u=/^xn--/,l=/[^\x20-\x7E]/,c=/[\x2E\u3002\uFF0E\uFF61]/g,p={
overflow:"Overflow: input needs wider integers to process",
"not-basic":"Illegal input >= 0x80 (not a basic code point)",
"invalid-input":"Invalid input"
},m=Math.floor,d=String.fromCharCode
function h(e){
throw new RangeError(p[e])
}
function g(e,t){
for(var n=e.length,i=[];n--;){
i[n]=t(e[n])
}
return i
}
function f(e,t){
var n=e.split("@"),i=""
return n.length>1&&(i=n[0]+"@",e=n[1]),i+g((e=e.replace(c,".")).split("."),t).join(".")
}
function b(e){
for(var t,n,i=[],a=0,o=e.length;a<o;){
(t=e.charCodeAt(a++))>=55296&&t<=56319&&a<o?56320==(64512&(n=e.charCodeAt(a++)))?i.push(((1023&t)<<10)+(1023&n)+65536):(i.push(t),
a--):i.push(t)
}
return i
}
function y(e){
return g(e,(function(e){
var t=""
return e>65535&&(t+=d((e-=65536)>>>10&1023|55296),e=56320|1023&e),t+=d(e)
})).join("")
}
function k(e,t){
return e+22+75*(e<26)-((0!=t)<<5)
}
function v(e,t,n){
var i=0
for(e=n?m(e/700):e>>1,e+=m(e/t);e>455;i+=36){
e=m(e/35)
}
return m(i+36*e/(e+38))
}
function w(e){
var t,n,i,a,o,r,u,l,c,p,d,g=[],f=e.length,b=0,k=128,w=72
for((n=e.lastIndexOf("-"))<0&&(n=0),i=0;i<n;++i){
e.charCodeAt(i)>=128&&h("not-basic"),
g.push(e.charCodeAt(i))
}
for(a=n>0?n+1:0;a<f;){
for(o=b,r=1,u=36;a>=f&&h("invalid-input"),((l=(d=e.charCodeAt(a++))-48<10?d-22:d-65<26?d-65:d-97<26?d-97:36)>=36||l>m((s-b)/r))&&h("overflow"),
b+=l*r,
!(l<(c=u<=w?1:u>=w+26?26:u-w));u+=36){
r>m(s/(p=36-c))&&h("overflow"),r*=p
}
w=v(b-o,t=g.length+1,0==o),m(b/t)>s-k&&h("overflow"),k+=m(b/t),b%=t,g.splice(b++,0,k)
}
return y(g)
}
function j(e){
var t,n,i,a,o,r,u,l,c,p,g,f,y,w,j,E=[]
for(f=(e=b(e)).length,t=128,n=0,o=72,r=0;r<f;++r){
(g=e[r])<128&&E.push(d(g))
}
for(i=a=E.length,a&&E.push("-");i<f;){
for(u=s,r=0;r<f;++r){
(g=e[r])>=t&&g<u&&(u=g)
}
for(u-t>m((s-n)/(y=i+1))&&h("overflow"),n+=(u-t)*y,t=u,r=0;r<f;++r){
if((g=e[r])<t&&++n>s&&h("overflow"),
g==t){
for(l=n,c=36;!(l<(p=c<=o?1:c>=o+26?26:c-o));c+=36){
j=l-p,w=36-p,E.push(d(k(p+j%w,0))),
l=m(j/w)
}
E.push(d(k(l,0))),o=v(n,y,i==a),n=0,++i
}
}
++n,++t
}
return E.join("")
}
r={
version:"1.4.1",
ucs2:{
decode:b,
encode:y
},
decode:w,
encode:j,
toASCII:function(e){
return f(e,(function(e){
return l.test(e)?"xn--"+j(e):e
}))
},
toUnicode:function(e){
return f(e,(function(e){
return u.test(e)?w(e.slice(4).toLowerCase()):e
}))
}
},void 0===(i=function(){
return r
}.call(t,n,t,e))||(e.exports=i)
}()
}).call(this,n(24)(e))
},function(e,t){
e.exports=function(e){
return e.webpackPolyfill||(e.deprecate=function(){},e.paths=[],
e.children||(e.children=[]),
Object.defineProperty(e,"loaded",{
enumerable:!0,
get:function(){
return e.l
}
}),Object.defineProperty(e,"id",{
enumerable:!0,
get:function(){
return e.i
}
}),e.webpackPolyfill=1),e
}
},function(e){
e.exports=JSON.parse('["ac","com.ac","edu.ac","gov.ac","net.ac","mil.ac","org.ac","ad","nom.ad","ae","co.ae","net.ae","org.ae","sch.ae","ac.ae","gov.ae","mil.ae","aero","accident-investigation.aero","accident-prevention.aero","aerobatic.aero","aeroclub.aero","aerodrome.aero","agents.aero","aircraft.aero","airline.aero","airport.aero","air-surveillance.aero","airtraffic.aero","air-traffic-control.aero","ambulance.aero","amusement.aero","association.aero","author.aero","ballooning.aero","broker.aero","caa.aero","cargo.aero","catering.aero","certification.aero","championship.aero","charter.aero","civilaviation.aero","club.aero","conference.aero","consultant.aero","consulting.aero","control.aero","council.aero","crew.aero","design.aero","dgca.aero","educator.aero","emergency.aero","engine.aero","engineer.aero","entertainment.aero","equipment.aero","exchange.aero","express.aero","federation.aero","flight.aero","fuel.aero","gliding.aero","government.aero","groundhandling.aero","group.aero","hanggliding.aero","homebuilt.aero","insurance.aero","journal.aero","journalist.aero","leasing.aero","logistics.aero","magazine.aero","maintenance.aero","media.aero","microlight.aero","modelling.aero","navigation.aero","parachuting.aero","paragliding.aero","passenger-association.aero","pilot.aero","press.aero","production.aero","recreation.aero","repbody.aero","res.aero","research.aero","rotorcraft.aero","safety.aero","scientist.aero","services.aero","show.aero","skydiving.aero","software.aero","student.aero","trader.aero","trading.aero","trainer.aero","union.aero","workinggroup.aero","works.aero","af","gov.af","com.af","org.af","net.af","edu.af","ag","com.ag","org.ag","net.ag","co.ag","nom.ag","ai","off.ai","com.ai","net.ai","org.ai","al","com.al","edu.al","gov.al","mil.al","net.al","org.al","am","co.am","com.am","commune.am","net.am","org.am","ao","ed.ao","gv.ao","og.ao","co.ao","pb.ao","it.ao","aq","ar","com.ar","edu.ar","gob.ar","gov.ar","int.ar","mil.ar","musica.ar","net.ar","org.ar","tur.ar","arpa","e164.arpa","in-addr.arpa","ip6.arpa","iris.arpa","uri.arpa","urn.arpa","as","gov.as","asia","at","ac.at","co.at","gv.at","or.at","sth.ac.at","au","com.au","net.au","org.au","edu.au","gov.au","asn.au","id.au","info.au","conf.au","oz.au","act.au","nsw.au","nt.au","qld.au","sa.au","tas.au","vic.au","wa.au","act.edu.au","catholic.edu.au","nsw.edu.au","nt.edu.au","qld.edu.au","sa.edu.au","tas.edu.au","vic.edu.au","wa.edu.au","qld.gov.au","sa.gov.au","tas.gov.au","vic.gov.au","wa.gov.au","education.tas.edu.au","schools.nsw.edu.au","aw","com.aw","ax","az","com.az","net.az","int.az","gov.az","org.az","edu.az","info.az","pp.az","mil.az","name.az","pro.az","biz.az","ba","com.ba","edu.ba","gov.ba","mil.ba","net.ba","org.ba","bb","biz.bb","co.bb","com.bb","edu.bb","gov.bb","info.bb","net.bb","org.bb","store.bb","tv.bb","*.bd","be","ac.be","bf","gov.bf","bg","a.bg","b.bg","c.bg","d.bg","e.bg","f.bg","g.bg","h.bg","i.bg","j.bg","k.bg","l.bg","m.bg","n.bg","o.bg","p.bg","q.bg","r.bg","s.bg","t.bg","u.bg","v.bg","w.bg","x.bg","y.bg","z.bg","0.bg","1.bg","2.bg","3.bg","4.bg","5.bg","6.bg","7.bg","8.bg","9.bg","bh","com.bh","edu.bh","net.bh","org.bh","gov.bh","bi","co.bi","com.bi","edu.bi","or.bi","org.bi","biz","bj","asso.bj","barreau.bj","gouv.bj","bm","com.bm","edu.bm","gov.bm","net.bm","org.bm","bn","com.bn","edu.bn","gov.bn","net.bn","org.bn","bo","com.bo","edu.bo","gob.bo","int.bo","org.bo","net.bo","mil.bo","tv.bo","web.bo","academia.bo","agro.bo","arte.bo","blog.bo","bolivia.bo","ciencia.bo","cooperativa.bo","democracia.bo","deporte.bo","ecologia.bo","economia.bo","empresa.bo","indigena.bo","industria.bo","info.bo","medicina.bo","movimiento.bo","musica.bo","natural.bo","nombre.bo","noticias.bo","patria.bo","politica.bo","profesional.bo","plurinacional.bo","pueblo.bo","revista.bo","salud.bo","tecnologia.bo","tksat.bo","transporte.bo","wiki.bo","br","9guacu.br","abc.br","adm.br","adv.br","agr.br","aju.br","am.br","anani.br","aparecida.br","arq.br","art.br","ato.br","b.br","barueri.br","belem.br","bhz.br","bio.br","blog.br","bmd.br","boavista.br","bsb.br","campinagrande.br","campinas.br","caxias.br","cim.br","cng.br","cnt.br","com.br","contagem.br","coop.br","cri.br","cuiaba.br","curitiba.br","def.br","ecn.br","eco.br","edu.br","emp.br","eng.br","esp.br","etc.br","eti.br","far.br","feira.br","flog.br","floripa.br","fm.br","fnd.br","fortal.br","fot.br","foz.br","fst.br","g12.br","ggf.br","goiania.br","gov.br","ac.gov.br","al.gov.br","am.gov.br","ap.gov.br","ba.gov.br","ce.gov.br","df.gov.br","es.gov.br","go.gov.br","ma.gov.br","mg.gov.br","ms.gov.br","mt.gov.br","pa.gov.br","pb.gov.br","pe.gov.br","pi.gov.br","pr.gov.br","rj.gov.br","rn.gov.br","ro.gov.br","rr.gov.br","rs.gov.br","sc.gov.br","se.gov.br","sp.gov.br","to.gov.br","gru.br","imb.br","ind.br","inf.br","jab.br","jampa.br","jdf.br","joinville.br","jor.br","jus.br","leg.br","lel.br","londrina.br","macapa.br","maceio.br","manaus.br","maringa.br","mat.br","med.br","mil.br","morena.br","mp.br","mus.br","natal.br","net.br","niteroi.br","*.nom.br","not.br","ntr.br","odo.br","ong.br","org.br","osasco.br","palmas.br","poa.br","ppg.br","pro.br","psc.br","psi.br","pvh.br","qsl.br","radio.br","rec.br","recife.br","ribeirao.br","rio.br","riobranco.br","riopreto.br","salvador.br","sampa.br","santamaria.br","santoandre.br","saobernardo.br","saogonca.br","sjc.br","slg.br","slz.br","sorocaba.br","srv.br","taxi.br","tc.br","teo.br","the.br","tmp.br","trd.br","tur.br","tv.br","udi.br","vet.br","vix.br","vlog.br","wiki.br","zlg.br","bs","com.bs","net.bs","org.bs","edu.bs","gov.bs","bt","com.bt","edu.bt","gov.bt","net.bt","org.bt","bv","bw","co.bw","org.bw","by","gov.by","mil.by","com.by","of.by","bz","com.bz","net.bz","org.bz","edu.bz","gov.bz","ca","ab.ca","bc.ca","mb.ca","nb.ca","nf.ca","nl.ca","ns.ca","nt.ca","nu.ca","on.ca","pe.ca","qc.ca","sk.ca","yk.ca","gc.ca","cat","cc","cd","gov.cd","cf","cg","ch","ci","org.ci","or.ci","com.ci","co.ci","edu.ci","ed.ci","ac.ci","net.ci","go.ci","asso.ci","aéroport.ci","int.ci","presse.ci","md.ci","gouv.ci","*.ck","!www.ck","cl","aprendemas.cl","co.cl","gob.cl","gov.cl","mil.cl","cm","co.cm","com.cm","gov.cm","net.cm","cn","ac.cn","com.cn","edu.cn","gov.cn","net.cn","org.cn","mil.cn","公司.cn","网络.cn","網絡.cn","ah.cn","bj.cn","cq.cn","fj.cn","gd.cn","gs.cn","gz.cn","gx.cn","ha.cn","hb.cn","he.cn","hi.cn","hl.cn","hn.cn","jl.cn","js.cn","jx.cn","ln.cn","nm.cn","nx.cn","qh.cn","sc.cn","sd.cn","sh.cn","sn.cn","sx.cn","tj.cn","xj.cn","xz.cn","yn.cn","zj.cn","hk.cn","mo.cn","tw.cn","co","arts.co","com.co","edu.co","firm.co","gov.co","info.co","int.co","mil.co","net.co","nom.co","org.co","rec.co","web.co","com","coop","cr","ac.cr","co.cr","ed.cr","fi.cr","go.cr","or.cr","sa.cr","cu","com.cu","edu.cu","org.cu","net.cu","gov.cu","inf.cu","cv","cw","com.cw","edu.cw","net.cw","org.cw","cx","gov.cx","cy","ac.cy","biz.cy","com.cy","ekloges.cy","gov.cy","ltd.cy","name.cy","net.cy","org.cy","parliament.cy","press.cy","pro.cy","tm.cy","cz","de","dj","dk","dm","com.dm","net.dm","org.dm","edu.dm","gov.dm","do","art.do","com.do","edu.do","gob.do","gov.do","mil.do","net.do","org.do","sld.do","web.do","dz","com.dz","org.dz","net.dz","gov.dz","edu.dz","asso.dz","pol.dz","art.dz","ec","com.ec","info.ec","net.ec","fin.ec","k12.ec","med.ec","pro.ec","org.ec","edu.ec","gov.ec","gob.ec","mil.ec","edu","ee","edu.ee","gov.ee","riik.ee","lib.ee","med.ee","com.ee","pri.ee","aip.ee","org.ee","fie.ee","eg","com.eg","edu.eg","eun.eg","gov.eg","mil.eg","name.eg","net.eg","org.eg","sci.eg","*.er","es","com.es","nom.es","org.es","gob.es","edu.es","et","com.et","gov.et","org.et","edu.et","biz.et","name.et","info.et","net.et","eu","fi","aland.fi","fj","ac.fj","biz.fj","com.fj","gov.fj","info.fj","mil.fj","name.fj","net.fj","org.fj","pro.fj","*.fk","fm","fo","fr","asso.fr","com.fr","gouv.fr","nom.fr","prd.fr","tm.fr","aeroport.fr","avocat.fr","avoues.fr","cci.fr","chambagri.fr","chirurgiens-dentistes.fr","experts-comptables.fr","geometre-expert.fr","greta.fr","huissier-justice.fr","medecin.fr","notaires.fr","pharmacien.fr","port.fr","veterinaire.fr","ga","gb","gd","ge","com.ge","edu.ge","gov.ge","org.ge","mil.ge","net.ge","pvt.ge","gf","gg","co.gg","net.gg","org.gg","gh","com.gh","edu.gh","gov.gh","org.gh","mil.gh","gi","com.gi","ltd.gi","gov.gi","mod.gi","edu.gi","org.gi","gl","co.gl","com.gl","edu.gl","net.gl","org.gl","gm","gn","ac.gn","com.gn","edu.gn","gov.gn","org.gn","net.gn","gov","gp","com.gp","net.gp","mobi.gp","edu.gp","org.gp","asso.gp","gq","gr","com.gr","edu.gr","net.gr","org.gr","gov.gr","gs","gt","com.gt","edu.gt","gob.gt","ind.gt","mil.gt","net.gt","org.gt","gu","com.gu","edu.gu","gov.gu","guam.gu","info.gu","net.gu","org.gu","web.gu","gw","gy","co.gy","com.gy","edu.gy","gov.gy","net.gy","org.gy","hk","com.hk","edu.hk","gov.hk","idv.hk","net.hk","org.hk","公司.hk","教育.hk","敎育.hk","政府.hk","個人.hk","个人.hk","箇人.hk","網络.hk","网络.hk","组織.hk","網絡.hk","网絡.hk","组织.hk","組織.hk","組织.hk","hm","hn","com.hn","edu.hn","org.hn","net.hn","mil.hn","gob.hn","hr","iz.hr","from.hr","name.hr","com.hr","ht","com.ht","shop.ht","firm.ht","info.ht","adult.ht","net.ht","pro.ht","org.ht","med.ht","art.ht","coop.ht","pol.ht","asso.ht","edu.ht","rel.ht","gouv.ht","perso.ht","hu","co.hu","info.hu","org.hu","priv.hu","sport.hu","tm.hu","2000.hu","agrar.hu","bolt.hu","casino.hu","city.hu","erotica.hu","erotika.hu","film.hu","forum.hu","games.hu","hotel.hu","ingatlan.hu","jogasz.hu","konyvelo.hu","lakas.hu","media.hu","news.hu","reklam.hu","sex.hu","shop.hu","suli.hu","szex.hu","tozsde.hu","utazas.hu","video.hu","id","ac.id","biz.id","co.id","desa.id","go.id","mil.id","my.id","net.id","or.id","ponpes.id","sch.id","web.id","ie","gov.ie","il","ac.il","co.il","gov.il","idf.il","k12.il","muni.il","net.il","org.il","im","ac.im","co.im","com.im","ltd.co.im","net.im","org.im","plc.co.im","tt.im","tv.im","in","co.in","firm.in","net.in","org.in","gen.in","ind.in","nic.in","ac.in","edu.in","res.in","gov.in","mil.in","info","int","eu.int","io","com.io","iq","gov.iq","edu.iq","mil.iq","com.iq","org.iq","net.iq","ir","ac.ir","co.ir","gov.ir","id.ir","net.ir","org.ir","sch.ir","ایران.ir","ايران.ir","is","net.is","com.is","edu.is","gov.is","org.is","int.is","it","gov.it","edu.it","abr.it","abruzzo.it","aosta-valley.it","aostavalley.it","bas.it","basilicata.it","cal.it","calabria.it","cam.it","campania.it","emilia-romagna.it","emiliaromagna.it","emr.it","friuli-v-giulia.it","friuli-ve-giulia.it","friuli-vegiulia.it","friuli-venezia-giulia.it","friuli-veneziagiulia.it","friuli-vgiulia.it","friuliv-giulia.it","friulive-giulia.it","friulivegiulia.it","friulivenezia-giulia.it","friuliveneziagiulia.it","friulivgiulia.it","fvg.it","laz.it","lazio.it","lig.it","liguria.it","lom.it","lombardia.it","lombardy.it","lucania.it","mar.it","marche.it","mol.it","molise.it","piedmont.it","piemonte.it","pmn.it","pug.it","puglia.it","sar.it","sardegna.it","sardinia.it","sic.it","sicilia.it","sicily.it","taa.it","tos.it","toscana.it","trentin-sud-tirol.it","trentin-süd-tirol.it","trentin-sudtirol.it","trentin-südtirol.it","trentin-sued-tirol.it","trentin-suedtirol.it","trentino-a-adige.it","trentino-aadige.it","trentino-alto-adige.it","trentino-altoadige.it","trentino-s-tirol.it","trentino-stirol.it","trentino-sud-tirol.it","trentino-süd-tirol.it","trentino-sudtirol.it","trentino-südtirol.it","trentino-sued-tirol.it","trentino-suedtirol.it","trentino.it","trentinoa-adige.it","trentinoaadige.it","trentinoalto-adige.it","trentinoaltoadige.it","trentinos-tirol.it","trentinostirol.it","trentinosud-tirol.it","trentinosüd-tirol.it","trentinosudtirol.it","trentinosüdtirol.it","trentinosued-tirol.it","trentinosuedtirol.it","trentinsud-tirol.it","trentinsüd-tirol.it","trentinsudtirol.it","trentinsüdtirol.it","trentinsued-tirol.it","trentinsuedtirol.it","tuscany.it","umb.it","umbria.it","val-d-aosta.it","val-daosta.it","vald-aosta.it","valdaosta.it","valle-aosta.it","valle-d-aosta.it","valle-daosta.it","valleaosta.it","valled-aosta.it","valledaosta.it","vallee-aoste.it","vallée-aoste.it","vallee-d-aoste.it","vallée-d-aoste.it","valleeaoste.it","valléeaoste.it","valleedaoste.it","valléedaoste.it","vao.it","vda.it","ven.it","veneto.it","ag.it","agrigento.it","al.it","alessandria.it","alto-adige.it","altoadige.it","an.it","ancona.it","andria-barletta-trani.it","andria-trani-barletta.it","andriabarlettatrani.it","andriatranibarletta.it","ao.it","aosta.it","aoste.it","ap.it","aq.it","aquila.it","ar.it","arezzo.it","ascoli-piceno.it","ascolipiceno.it","asti.it","at.it","av.it","avellino.it","ba.it","balsan-sudtirol.it","balsan-südtirol.it","balsan-suedtirol.it","balsan.it","bari.it","barletta-trani-andria.it","barlettatraniandria.it","belluno.it","benevento.it","bergamo.it","bg.it","bi.it","biella.it","bl.it","bn.it","bo.it","bologna.it","bolzano-altoadige.it","bolzano.it","bozen-sudtirol.it","bozen-südtirol.it","bozen-suedtirol.it","bozen.it","br.it","brescia.it","brindisi.it","bs.it","bt.it","bulsan-sudtirol.it","bulsan-südtirol.it","bulsan-suedtirol.it","bulsan.it","bz.it","ca.it","cagliari.it","caltanissetta.it","campidano-medio.it","campidanomedio.it","campobasso.it","carbonia-iglesias.it","carboniaiglesias.it","carrara-massa.it","carraramassa.it","caserta.it","catania.it","catanzaro.it","cb.it","ce.it","cesena-forli.it","cesena-forlì.it","cesenaforli.it","cesenaforlì.it","ch.it","chieti.it","ci.it","cl.it","cn.it","co.it","como.it","cosenza.it","cr.it","cremona.it","crotone.it","cs.it","ct.it","cuneo.it","cz.it","dell-ogliastra.it","dellogliastra.it","en.it","enna.it","fc.it","fe.it","fermo.it","ferrara.it","fg.it","fi.it","firenze.it","florence.it","fm.it","foggia.it","forli-cesena.it","forlì-cesena.it","forlicesena.it","forlìcesena.it","fr.it","frosinone.it","ge.it","genoa.it","genova.it","go.it","gorizia.it","gr.it","grosseto.it","iglesias-carbonia.it","iglesiascarbonia.it","im.it","imperia.it","is.it","isernia.it","kr.it","la-spezia.it","laquila.it","laspezia.it","latina.it","lc.it","le.it","lecce.it","lecco.it","li.it","livorno.it","lo.it","lodi.it","lt.it","lu.it","lucca.it","macerata.it","mantova.it","massa-carrara.it","massacarrara.it","matera.it","mb.it","mc.it","me.it","medio-campidano.it","mediocampidano.it","messina.it","mi.it","milan.it","milano.it","mn.it","mo.it","modena.it","monza-brianza.it","monza-e-della-brianza.it","monza.it","monzabrianza.it","monzaebrianza.it","monzaedellabrianza.it","ms.it","mt.it","na.it","naples.it","napoli.it","no.it","novara.it","nu.it","nuoro.it","og.it","ogliastra.it","olbia-tempio.it","olbiatempio.it","or.it","oristano.it","ot.it","pa.it","padova.it","padua.it","palermo.it","parma.it","pavia.it","pc.it","pd.it","pe.it","perugia.it","pesaro-urbino.it","pesarourbino.it","pescara.it","pg.it","pi.it","piacenza.it","pisa.it","pistoia.it","pn.it","po.it","pordenone.it","potenza.it","pr.it","prato.it","pt.it","pu.it","pv.it","pz.it","ra.it","ragusa.it","ravenna.it","rc.it","re.it","reggio-calabria.it","reggio-emilia.it","reggiocalabria.it","reggioemilia.it","rg.it","ri.it","rieti.it","rimini.it","rm.it","rn.it","ro.it","roma.it","rome.it","rovigo.it","sa.it","salerno.it","sassari.it","savona.it","si.it","siena.it","siracusa.it","so.it","sondrio.it","sp.it","sr.it","ss.it","suedtirol.it","südtirol.it","sv.it","ta.it","taranto.it","te.it","tempio-olbia.it","tempioolbia.it","teramo.it","terni.it","tn.it","to.it","torino.it","tp.it","tr.it","trani-andria-barletta.it","trani-barletta-andria.it","traniandriabarletta.it","tranibarlettaandria.it","trapani.it","trento.it","treviso.it","trieste.it","ts.it","turin.it","tv.it","ud.it","udine.it","urbino-pesaro.it","urbinopesaro.it","va.it","varese.it","vb.it","vc.it","ve.it","venezia.it","venice.it","verbania.it","vercelli.it","verona.it","vi.it","vibo-valentia.it","vibovalentia.it","vicenza.it","viterbo.it","vr.it","vs.it","vt.it","vv.it","je","co.je","net.je","org.je","*.jm","jo","com.jo","org.jo","net.jo","edu.jo","sch.jo","gov.jo","mil.jo","name.jo","jobs","jp","ac.jp","ad.jp","co.jp","ed.jp","go.jp","gr.jp","lg.jp","ne.jp","or.jp","aichi.jp","akita.jp","aomori.jp","chiba.jp","ehime.jp","fukui.jp","fukuoka.jp","fukushima.jp","gifu.jp","gunma.jp","hiroshima.jp","hokkaido.jp","hyogo.jp","ibaraki.jp","ishikawa.jp","iwate.jp","kagawa.jp","kagoshima.jp","kanagawa.jp","kochi.jp","kumamoto.jp","kyoto.jp","mie.jp","miyagi.jp","miyazaki.jp","nagano.jp","nagasaki.jp","nara.jp","niigata.jp","oita.jp","okayama.jp","okinawa.jp","osaka.jp","saga.jp","saitama.jp","shiga.jp","shimane.jp","shizuoka.jp","tochigi.jp","tokushima.jp","tokyo.jp","tottori.jp","toyama.jp","wakayama.jp","yamagata.jp","yamaguchi.jp","yamanashi.jp","栃木.jp","愛知.jp","愛媛.jp","兵庫.jp","熊本.jp","茨城.jp","北海道.jp","千葉.jp","和歌山.jp","長崎.jp","長野.jp","新潟.jp","青森.jp","静岡.jp","東京.jp","石川.jp","埼玉.jp","三重.jp","京都.jp","佐賀.jp","大分.jp","大阪.jp","奈良.jp","宮城.jp","宮崎.jp","富山.jp","山口.jp","山形.jp","山梨.jp","岩手.jp","岐阜.jp","岡山.jp","島根.jp","広島.jp","徳島.jp","沖縄.jp","滋賀.jp","神奈川.jp","福井.jp","福岡.jp","福島.jp","秋田.jp","群馬.jp","香川.jp","高知.jp","鳥取.jp","鹿児島.jp","*.kawasaki.jp","*.kitakyushu.jp","*.kobe.jp","*.nagoya.jp","*.sapporo.jp","*.sendai.jp","*.yokohama.jp","!city.kawasaki.jp","!city.kitakyushu.jp","!city.kobe.jp","!city.nagoya.jp","!city.sapporo.jp","!city.sendai.jp","!city.yokohama.jp","aisai.aichi.jp","ama.aichi.jp","anjo.aichi.jp","asuke.aichi.jp","chiryu.aichi.jp","chita.aichi.jp","fuso.aichi.jp","gamagori.aichi.jp","handa.aichi.jp","hazu.aichi.jp","hekinan.aichi.jp","higashiura.aichi.jp","ichinomiya.aichi.jp","inazawa.aichi.jp","inuyama.aichi.jp","isshiki.aichi.jp","iwakura.aichi.jp","kanie.aichi.jp","kariya.aichi.jp","kasugai.aichi.jp","kira.aichi.jp","kiyosu.aichi.jp","komaki.aichi.jp","konan.aichi.jp","kota.aichi.jp","mihama.aichi.jp","miyoshi.aichi.jp","nishio.aichi.jp","nisshin.aichi.jp","obu.aichi.jp","oguchi.aichi.jp","oharu.aichi.jp","okazaki.aichi.jp","owariasahi.aichi.jp","seto.aichi.jp","shikatsu.aichi.jp","shinshiro.aichi.jp","shitara.aichi.jp","tahara.aichi.jp","takahama.aichi.jp","tobishima.aichi.jp","toei.aichi.jp","togo.aichi.jp","tokai.aichi.jp","tokoname.aichi.jp","toyoake.aichi.jp","toyohashi.aichi.jp","toyokawa.aichi.jp","toyone.aichi.jp","toyota.aichi.jp","tsushima.aichi.jp","yatomi.aichi.jp","akita.akita.jp","daisen.akita.jp","fujisato.akita.jp","gojome.akita.jp","hachirogata.akita.jp","happou.akita.jp","higashinaruse.akita.jp","honjo.akita.jp","honjyo.akita.jp","ikawa.akita.jp","kamikoani.akita.jp","kamioka.akita.jp","katagami.akita.jp","kazuno.akita.jp","kitaakita.akita.jp","kosaka.akita.jp","kyowa.akita.jp","misato.akita.jp","mitane.akita.jp","moriyoshi.akita.jp","nikaho.akita.jp","noshiro.akita.jp","odate.akita.jp","oga.akita.jp","ogata.akita.jp","semboku.akita.jp","yokote.akita.jp","yurihonjo.akita.jp","aomori.aomori.jp","gonohe.aomori.jp","hachinohe.aomori.jp","hashikami.aomori.jp","hiranai.aomori.jp","hirosaki.aomori.jp","itayanagi.aomori.jp","kuroishi.aomori.jp","misawa.aomori.jp","mutsu.aomori.jp","nakadomari.aomori.jp","noheji.aomori.jp","oirase.aomori.jp","owani.aomori.jp","rokunohe.aomori.jp","sannohe.aomori.jp","shichinohe.aomori.jp","shingo.aomori.jp","takko.aomori.jp","towada.aomori.jp","tsugaru.aomori.jp","tsuruta.aomori.jp","abiko.chiba.jp","asahi.chiba.jp","chonan.chiba.jp","chosei.chiba.jp","choshi.chiba.jp","chuo.chiba.jp","funabashi.chiba.jp","futtsu.chiba.jp","hanamigawa.chiba.jp","ichihara.chiba.jp","ichikawa.chiba.jp","ichinomiya.chiba.jp","inzai.chiba.jp","isumi.chiba.jp","kamagaya.chiba.jp","kamogawa.chiba.jp","kashiwa.chiba.jp","katori.chiba.jp","katsuura.chiba.jp","kimitsu.chiba.jp","kisarazu.chiba.jp","kozaki.chiba.jp","kujukuri.chiba.jp","kyonan.chiba.jp","matsudo.chiba.jp","midori.chiba.jp","mihama.chiba.jp","minamiboso.chiba.jp","mobara.chiba.jp","mutsuzawa.chiba.jp","nagara.chiba.jp","nagareyama.chiba.jp","narashino.chiba.jp","narita.chiba.jp","noda.chiba.jp","oamishirasato.chiba.jp","omigawa.chiba.jp","onjuku.chiba.jp","otaki.chiba.jp","sakae.chiba.jp","sakura.chiba.jp","shimofusa.chiba.jp","shirako.chiba.jp","shiroi.chiba.jp","shisui.chiba.jp","sodegaura.chiba.jp","sosa.chiba.jp","tako.chiba.jp","tateyama.chiba.jp","togane.chiba.jp","tohnosho.chiba.jp","tomisato.chiba.jp","urayasu.chiba.jp","yachimata.chiba.jp","yachiyo.chiba.jp","yokaichiba.chiba.jp","yokoshibahikari.chiba.jp","yotsukaido.chiba.jp","ainan.ehime.jp","honai.ehime.jp","ikata.ehime.jp","imabari.ehime.jp","iyo.ehime.jp","kamijima.ehime.jp","kihoku.ehime.jp","kumakogen.ehime.jp","masaki.ehime.jp","matsuno.ehime.jp","matsuyama.ehime.jp","namikata.ehime.jp","niihama.ehime.jp","ozu.ehime.jp","saijo.ehime.jp","seiyo.ehime.jp","shikokuchuo.ehime.jp","tobe.ehime.jp","toon.ehime.jp","uchiko.ehime.jp","uwajima.ehime.jp","yawatahama.ehime.jp","echizen.fukui.jp","eiheiji.fukui.jp","fukui.fukui.jp","ikeda.fukui.jp","katsuyama.fukui.jp","mihama.fukui.jp","minamiechizen.fukui.jp","obama.fukui.jp","ohi.fukui.jp","ono.fukui.jp","sabae.fukui.jp","sakai.fukui.jp","takahama.fukui.jp","tsuruga.fukui.jp","wakasa.fukui.jp","ashiya.fukuoka.jp","buzen.fukuoka.jp","chikugo.fukuoka.jp","chikuho.fukuoka.jp","chikujo.fukuoka.jp","chikushino.fukuoka.jp","chikuzen.fukuoka.jp","chuo.fukuoka.jp","dazaifu.fukuoka.jp","fukuchi.fukuoka.jp","hakata.fukuoka.jp","higashi.fukuoka.jp","hirokawa.fukuoka.jp","hisayama.fukuoka.jp","iizuka.fukuoka.jp","inatsuki.fukuoka.jp","kaho.fukuoka.jp","kasuga.fukuoka.jp","kasuya.fukuoka.jp","kawara.fukuoka.jp","keisen.fukuoka.jp","koga.fukuoka.jp","kurate.fukuoka.jp","kurogi.fukuoka.jp","kurume.fukuoka.jp","minami.fukuoka.jp","miyako.fukuoka.jp","miyama.fukuoka.jp","miyawaka.fukuoka.jp","mizumaki.fukuoka.jp","munakata.fukuoka.jp","nakagawa.fukuoka.jp","nakama.fukuoka.jp","nishi.fukuoka.jp","nogata.fukuoka.jp","ogori.fukuoka.jp","okagaki.fukuoka.jp","okawa.fukuoka.jp","oki.fukuoka.jp","omuta.fukuoka.jp","onga.fukuoka.jp","onojo.fukuoka.jp","oto.fukuoka.jp","saigawa.fukuoka.jp","sasaguri.fukuoka.jp","shingu.fukuoka.jp","shinyoshitomi.fukuoka.jp","shonai.fukuoka.jp","soeda.fukuoka.jp","sue.fukuoka.jp","tachiarai.fukuoka.jp","tagawa.fukuoka.jp","takata.fukuoka.jp","toho.fukuoka.jp","toyotsu.fukuoka.jp","tsuiki.fukuoka.jp","ukiha.fukuoka.jp","umi.fukuoka.jp","usui.fukuoka.jp","yamada.fukuoka.jp","yame.fukuoka.jp","yanagawa.fukuoka.jp","yukuhashi.fukuoka.jp","aizubange.fukushima.jp","aizumisato.fukushima.jp","aizuwakamatsu.fukushima.jp","asakawa.fukushima.jp","bandai.fukushima.jp","date.fukushima.jp","fukushima.fukushima.jp","furudono.fukushima.jp","futaba.fukushima.jp","hanawa.fukushima.jp","higashi.fukushima.jp","hirata.fukushima.jp","hirono.fukushima.jp","iitate.fukushima.jp","inawashiro.fukushima.jp","ishikawa.fukushima.jp","iwaki.fukushima.jp","izumizaki.fukushima.jp","kagamiishi.fukushima.jp","kaneyama.fukushima.jp","kawamata.fukushima.jp","kitakata.fukushima.jp","kitashiobara.fukushima.jp","koori.fukushima.jp","koriyama.fukushima.jp","kunimi.fukushima.jp","miharu.fukushima.jp","mishima.fukushima.jp","namie.fukushima.jp","nango.fukushima.jp","nishiaizu.fukushima.jp","nishigo.fukushima.jp","okuma.fukushima.jp","omotego.fukushima.jp","ono.fukushima.jp","otama.fukushima.jp","samegawa.fukushima.jp","shimogo.fukushima.jp","shirakawa.fukushima.jp","showa.fukushima.jp","soma.fukushima.jp","sukagawa.fukushima.jp","taishin.fukushima.jp","tamakawa.fukushima.jp","tanagura.fukushima.jp","tenei.fukushima.jp","yabuki.fukushima.jp","yamato.fukushima.jp","yamatsuri.fukushima.jp","yanaizu.fukushima.jp","yugawa.fukushima.jp","anpachi.gifu.jp","ena.gifu.jp","gifu.gifu.jp","ginan.gifu.jp","godo.gifu.jp","gujo.gifu.jp","hashima.gifu.jp","hichiso.gifu.jp","hida.gifu.jp","higashishirakawa.gifu.jp","ibigawa.gifu.jp","ikeda.gifu.jp","kakamigahara.gifu.jp","kani.gifu.jp","kasahara.gifu.jp","kasamatsu.gifu.jp","kawaue.gifu.jp","kitagata.gifu.jp","mino.gifu.jp","minokamo.gifu.jp","mitake.gifu.jp","mizunami.gifu.jp","motosu.gifu.jp","nakatsugawa.gifu.jp","ogaki.gifu.jp","sakahogi.gifu.jp","seki.gifu.jp","sekigahara.gifu.jp","shirakawa.gifu.jp","tajimi.gifu.jp","takayama.gifu.jp","tarui.gifu.jp","toki.gifu.jp","tomika.gifu.jp","wanouchi.gifu.jp","yamagata.gifu.jp","yaotsu.gifu.jp","yoro.gifu.jp","annaka.gunma.jp","chiyoda.gunma.jp","fujioka.gunma.jp","higashiagatsuma.gunma.jp","isesaki.gunma.jp","itakura.gunma.jp","kanna.gunma.jp","kanra.gunma.jp","katashina.gunma.jp","kawaba.gunma.jp","kiryu.gunma.jp","kusatsu.gunma.jp","maebashi.gunma.jp","meiwa.gunma.jp","midori.gunma.jp","minakami.gunma.jp","naganohara.gunma.jp","nakanojo.gunma.jp","nanmoku.gunma.jp","numata.gunma.jp","oizumi.gunma.jp","ora.gunma.jp","ota.gunma.jp","shibukawa.gunma.jp","shimonita.gunma.jp","shinto.gunma.jp","showa.gunma.jp","takasaki.gunma.jp","takayama.gunma.jp","tamamura.gunma.jp","tatebayashi.gunma.jp","tomioka.gunma.jp","tsukiyono.gunma.jp","tsumagoi.gunma.jp","ueno.gunma.jp","yoshioka.gunma.jp","asaminami.hiroshima.jp","daiwa.hiroshima.jp","etajima.hiroshima.jp","fuchu.hiroshima.jp","fukuyama.hiroshima.jp","hatsukaichi.hiroshima.jp","higashihiroshima.hiroshima.jp","hongo.hiroshima.jp","jinsekikogen.hiroshima.jp","kaita.hiroshima.jp","kui.hiroshima.jp","kumano.hiroshima.jp","kure.hiroshima.jp","mihara.hiroshima.jp","miyoshi.hiroshima.jp","naka.hiroshima.jp","onomichi.hiroshima.jp","osakikamijima.hiroshima.jp","otake.hiroshima.jp","saka.hiroshima.jp","sera.hiroshima.jp","seranishi.hiroshima.jp","shinichi.hiroshima.jp","shobara.hiroshima.jp","takehara.hiroshima.jp","abashiri.hokkaido.jp","abira.hokkaido.jp","aibetsu.hokkaido.jp","akabira.hokkaido.jp","akkeshi.hokkaido.jp","asahikawa.hokkaido.jp","ashibetsu.hokkaido.jp","ashoro.hokkaido.jp","assabu.hokkaido.jp","atsuma.hokkaido.jp","bibai.hokkaido.jp","biei.hokkaido.jp","bifuka.hokkaido.jp","bihoro.hokkaido.jp","biratori.hokkaido.jp","chippubetsu.hokkaido.jp","chitose.hokkaido.jp","date.hokkaido.jp","ebetsu.hokkaido.jp","embetsu.hokkaido.jp","eniwa.hokkaido.jp","erimo.hokkaido.jp","esan.hokkaido.jp","esashi.hokkaido.jp","fukagawa.hokkaido.jp","fukushima.hokkaido.jp","furano.hokkaido.jp","furubira.hokkaido.jp","haboro.hokkaido.jp","hakodate.hokkaido.jp","hamatonbetsu.hokkaido.jp","hidaka.hokkaido.jp","higashikagura.hokkaido.jp","higashikawa.hokkaido.jp","hiroo.hokkaido.jp","hokuryu.hokkaido.jp","hokuto.hokkaido.jp","honbetsu.hokkaido.jp","horokanai.hokkaido.jp","horonobe.hokkaido.jp","ikeda.hokkaido.jp","imakane.hokkaido.jp","ishikari.hokkaido.jp","iwamizawa.hokkaido.jp","iwanai.hokkaido.jp","kamifurano.hokkaido.jp","kamikawa.hokkaido.jp","kamishihoro.hokkaido.jp","kamisunagawa.hokkaido.jp","kamoenai.hokkaido.jp","kayabe.hokkaido.jp","kembuchi.hokkaido.jp","kikonai.hokkaido.jp","kimobetsu.hokkaido.jp","kitahiroshima.hokkaido.jp","kitami.hokkaido.jp","kiyosato.hokkaido.jp","koshimizu.hokkaido.jp","kunneppu.hokkaido.jp","kuriyama.hokkaido.jp","kuromatsunai.hokkaido.jp","kushiro.hokkaido.jp","kutchan.hokkaido.jp","kyowa.hokkaido.jp","mashike.hokkaido.jp","matsumae.hokkaido.jp","mikasa.hokkaido.jp","minamifurano.hokkaido.jp","mombetsu.hokkaido.jp","moseushi.hokkaido.jp","mukawa.hokkaido.jp","muroran.hokkaido.jp","naie.hokkaido.jp","nakagawa.hokkaido.jp","nakasatsunai.hokkaido.jp","nakatombetsu.hokkaido.jp","nanae.hokkaido.jp","nanporo.hokkaido.jp","nayoro.hokkaido.jp","nemuro.hokkaido.jp","niikappu.hokkaido.jp","niki.hokkaido.jp","nishiokoppe.hokkaido.jp","noboribetsu.hokkaido.jp","numata.hokkaido.jp","obihiro.hokkaido.jp","obira.hokkaido.jp","oketo.hokkaido.jp","okoppe.hokkaido.jp","otaru.hokkaido.jp","otobe.hokkaido.jp","otofuke.hokkaido.jp","otoineppu.hokkaido.jp","oumu.hokkaido.jp","ozora.hokkaido.jp","pippu.hokkaido.jp","rankoshi.hokkaido.jp","rebun.hokkaido.jp","rikubetsu.hokkaido.jp","rishiri.hokkaido.jp","rishirifuji.hokkaido.jp","saroma.hokkaido.jp","sarufutsu.hokkaido.jp","shakotan.hokkaido.jp","shari.hokkaido.jp","shibecha.hokkaido.jp","shibetsu.hokkaido.jp","shikabe.hokkaido.jp","shikaoi.hokkaido.jp","shimamaki.hokkaido.jp","shimizu.hokkaido.jp","shimokawa.hokkaido.jp","shinshinotsu.hokkaido.jp","shintoku.hokkaido.jp","shiranuka.hokkaido.jp","shiraoi.hokkaido.jp","shiriuchi.hokkaido.jp","sobetsu.hokkaido.jp","sunagawa.hokkaido.jp","taiki.hokkaido.jp","takasu.hokkaido.jp","takikawa.hokkaido.jp","takinoue.hokkaido.jp","teshikaga.hokkaido.jp","tobetsu.hokkaido.jp","tohma.hokkaido.jp","tomakomai.hokkaido.jp","tomari.hokkaido.jp","toya.hokkaido.jp","toyako.hokkaido.jp","toyotomi.hokkaido.jp","toyoura.hokkaido.jp","tsubetsu.hokkaido.jp","tsukigata.hokkaido.jp","urakawa.hokkaido.jp","urausu.hokkaido.jp","uryu.hokkaido.jp","utashinai.hokkaido.jp","wakkanai.hokkaido.jp","wassamu.hokkaido.jp","yakumo.hokkaido.jp","yoichi.hokkaido.jp","aioi.hyogo.jp","akashi.hyogo.jp","ako.hyogo.jp","amagasaki.hyogo.jp","aogaki.hyogo.jp","asago.hyogo.jp","ashiya.hyogo.jp","awaji.hyogo.jp","fukusaki.hyogo.jp","goshiki.hyogo.jp","harima.hyogo.jp","himeji.hyogo.jp","ichikawa.hyogo.jp","inagawa.hyogo.jp","itami.hyogo.jp","kakogawa.hyogo.jp","kamigori.hyogo.jp","kamikawa.hyogo.jp","kasai.hyogo.jp","kasuga.hyogo.jp","kawanishi.hyogo.jp","miki.hyogo.jp","minamiawaji.hyogo.jp","nishinomiya.hyogo.jp","nishiwaki.hyogo.jp","ono.hyogo.jp","sanda.hyogo.jp","sannan.hyogo.jp","sasayama.hyogo.jp","sayo.hyogo.jp","shingu.hyogo.jp","shinonsen.hyogo.jp","shiso.hyogo.jp","sumoto.hyogo.jp","taishi.hyogo.jp","taka.hyogo.jp","takarazuka.hyogo.jp","takasago.hyogo.jp","takino.hyogo.jp","tamba.hyogo.jp","tatsuno.hyogo.jp","toyooka.hyogo.jp","yabu.hyogo.jp","yashiro.hyogo.jp","yoka.hyogo.jp","yokawa.hyogo.jp","ami.ibaraki.jp","asahi.ibaraki.jp","bando.ibaraki.jp","chikusei.ibaraki.jp","daigo.ibaraki.jp","fujishiro.ibaraki.jp","hitachi.ibaraki.jp","hitachinaka.ibaraki.jp","hitachiomiya.ibaraki.jp","hitachiota.ibaraki.jp","ibaraki.ibaraki.jp","ina.ibaraki.jp","inashiki.ibaraki.jp","itako.ibaraki.jp","iwama.ibaraki.jp","joso.ibaraki.jp","kamisu.ibaraki.jp","kasama.ibaraki.jp","kashima.ibaraki.jp","kasumigaura.ibaraki.jp","koga.ibaraki.jp","miho.ibaraki.jp","mito.ibaraki.jp","moriya.ibaraki.jp","naka.ibaraki.jp","namegata.ibaraki.jp","oarai.ibaraki.jp","ogawa.ibaraki.jp","omitama.ibaraki.jp","ryugasaki.ibaraki.jp","sakai.ibaraki.jp","sakuragawa.ibaraki.jp","shimodate.ibaraki.jp","shimotsuma.ibaraki.jp","shirosato.ibaraki.jp","sowa.ibaraki.jp","suifu.ibaraki.jp","takahagi.ibaraki.jp","tamatsukuri.ibaraki.jp","tokai.ibaraki.jp","tomobe.ibaraki.jp","tone.ibaraki.jp","toride.ibaraki.jp","tsuchiura.ibaraki.jp","tsukuba.ibaraki.jp","uchihara.ibaraki.jp","ushiku.ibaraki.jp","yachiyo.ibaraki.jp","yamagata.ibaraki.jp","yawara.ibaraki.jp","yuki.ibaraki.jp","anamizu.ishikawa.jp","hakui.ishikawa.jp","hakusan.ishikawa.jp","kaga.ishikawa.jp","kahoku.ishikawa.jp","kanazawa.ishikawa.jp","kawakita.ishikawa.jp","komatsu.ishikawa.jp","nakanoto.ishikawa.jp","nanao.ishikawa.jp","nomi.ishikawa.jp","nonoichi.ishikawa.jp","noto.ishikawa.jp","shika.ishikawa.jp","suzu.ishikawa.jp","tsubata.ishikawa.jp","tsurugi.ishikawa.jp","uchinada.ishikawa.jp","wajima.ishikawa.jp","fudai.iwate.jp","fujisawa.iwate.jp","hanamaki.iwate.jp","hiraizumi.iwate.jp","hirono.iwate.jp","ichinohe.iwate.jp","ichinoseki.iwate.jp","iwaizumi.iwate.jp","iwate.iwate.jp","joboji.iwate.jp","kamaishi.iwate.jp","kanegasaki.iwate.jp","karumai.iwate.jp","kawai.iwate.jp","kitakami.iwate.jp","kuji.iwate.jp","kunohe.iwate.jp","kuzumaki.iwate.jp","miyako.iwate.jp","mizusawa.iwate.jp","morioka.iwate.jp","ninohe.iwate.jp","noda.iwate.jp","ofunato.iwate.jp","oshu.iwate.jp","otsuchi.iwate.jp","rikuzentakata.iwate.jp","shiwa.iwate.jp","shizukuishi.iwate.jp","sumita.iwate.jp","tanohata.iwate.jp","tono.iwate.jp","yahaba.iwate.jp","yamada.iwate.jp","ayagawa.kagawa.jp","higashikagawa.kagawa.jp","kanonji.kagawa.jp","kotohira.kagawa.jp","manno.kagawa.jp","marugame.kagawa.jp","mitoyo.kagawa.jp","naoshima.kagawa.jp","sanuki.kagawa.jp","tadotsu.kagawa.jp","takamatsu.kagawa.jp","tonosho.kagawa.jp","uchinomi.kagawa.jp","utazu.kagawa.jp","zentsuji.kagawa.jp","akune.kagoshima.jp","amami.kagoshima.jp","hioki.kagoshima.jp","isa.kagoshima.jp","isen.kagoshima.jp","izumi.kagoshima.jp","kagoshima.kagoshima.jp","kanoya.kagoshima.jp","kawanabe.kagoshima.jp","kinko.kagoshima.jp","kouyama.kagoshima.jp","makurazaki.kagoshima.jp","matsumoto.kagoshima.jp","minamitane.kagoshima.jp","nakatane.kagoshima.jp","nishinoomote.kagoshima.jp","satsumasendai.kagoshima.jp","soo.kagoshima.jp","tarumizu.kagoshima.jp","yusui.kagoshima.jp","aikawa.kanagawa.jp","atsugi.kanagawa.jp","ayase.kanagawa.jp","chigasaki.kanagawa.jp","ebina.kanagawa.jp","fujisawa.kanagawa.jp","hadano.kanagawa.jp","hakone.kanagawa.jp","hiratsuka.kanagawa.jp","isehara.kanagawa.jp","kaisei.kanagawa.jp","kamakura.kanagawa.jp","kiyokawa.kanagawa.jp","matsuda.kanagawa.jp","minamiashigara.kanagawa.jp","miura.kanagawa.jp","nakai.kanagawa.jp","ninomiya.kanagawa.jp","odawara.kanagawa.jp","oi.kanagawa.jp","oiso.kanagawa.jp","sagamihara.kanagawa.jp","samukawa.kanagawa.jp","tsukui.kanagawa.jp","yamakita.kanagawa.jp","yamato.kanagawa.jp","yokosuka.kanagawa.jp","yugawara.kanagawa.jp","zama.kanagawa.jp","zushi.kanagawa.jp","aki.kochi.jp","geisei.kochi.jp","hidaka.kochi.jp","higashitsuno.kochi.jp","ino.kochi.jp","kagami.kochi.jp","kami.kochi.jp","kitagawa.kochi.jp","kochi.kochi.jp","mihara.kochi.jp","motoyama.kochi.jp","muroto.kochi.jp","nahari.kochi.jp","nakamura.kochi.jp","nankoku.kochi.jp","nishitosa.kochi.jp","niyodogawa.kochi.jp","ochi.kochi.jp","okawa.kochi.jp","otoyo.kochi.jp","otsuki.kochi.jp","sakawa.kochi.jp","sukumo.kochi.jp","susaki.kochi.jp","tosa.kochi.jp","tosashimizu.kochi.jp","toyo.kochi.jp","tsuno.kochi.jp","umaji.kochi.jp","yasuda.kochi.jp","yusuhara.kochi.jp","amakusa.kumamoto.jp","arao.kumamoto.jp","aso.kumamoto.jp","choyo.kumamoto.jp","gyokuto.kumamoto.jp","kamiamakusa.kumamoto.jp","kikuchi.kumamoto.jp","kumamoto.kumamoto.jp","mashiki.kumamoto.jp","mifune.kumamoto.jp","minamata.kumamoto.jp","minamioguni.kumamoto.jp","nagasu.kumamoto.jp","nishihara.kumamoto.jp","oguni.kumamoto.jp","ozu.kumamoto.jp","sumoto.kumamoto.jp","takamori.kumamoto.jp","uki.kumamoto.jp","uto.kumamoto.jp","yamaga.kumamoto.jp","yamato.kumamoto.jp","yatsushiro.kumamoto.jp","ayabe.kyoto.jp","fukuchiyama.kyoto.jp","higashiyama.kyoto.jp","ide.kyoto.jp","ine.kyoto.jp","joyo.kyoto.jp","kameoka.kyoto.jp","kamo.kyoto.jp","kita.kyoto.jp","kizu.kyoto.jp","kumiyama.kyoto.jp","kyotamba.kyoto.jp","kyotanabe.kyoto.jp","kyotango.kyoto.jp","maizuru.kyoto.jp","minami.kyoto.jp","minamiyamashiro.kyoto.jp","miyazu.kyoto.jp","muko.kyoto.jp","nagaokakyo.kyoto.jp","nakagyo.kyoto.jp","nantan.kyoto.jp","oyamazaki.kyoto.jp","sakyo.kyoto.jp","seika.kyoto.jp","tanabe.kyoto.jp","uji.kyoto.jp","ujitawara.kyoto.jp","wazuka.kyoto.jp","yamashina.kyoto.jp","yawata.kyoto.jp","asahi.mie.jp","inabe.mie.jp","ise.mie.jp","kameyama.mie.jp","kawagoe.mie.jp","kiho.mie.jp","kisosaki.mie.jp","kiwa.mie.jp","komono.mie.jp","kumano.mie.jp","kuwana.mie.jp","matsusaka.mie.jp","meiwa.mie.jp","mihama.mie.jp","minamiise.mie.jp","misugi.mie.jp","miyama.mie.jp","nabari.mie.jp","shima.mie.jp","suzuka.mie.jp","tado.mie.jp","taiki.mie.jp","taki.mie.jp","tamaki.mie.jp","toba.mie.jp","tsu.mie.jp","udono.mie.jp","ureshino.mie.jp","watarai.mie.jp","yokkaichi.mie.jp","furukawa.miyagi.jp","higashimatsushima.miyagi.jp","ishinomaki.miyagi.jp","iwanuma.miyagi.jp","kakuda.miyagi.jp","kami.miyagi.jp","kawasaki.miyagi.jp","marumori.miyagi.jp","matsushima.miyagi.jp","minamisanriku.miyagi.jp","misato.miyagi.jp","murata.miyagi.jp","natori.miyagi.jp","ogawara.miyagi.jp","ohira.miyagi.jp","onagawa.miyagi.jp","osaki.miyagi.jp","rifu.miyagi.jp","semine.miyagi.jp","shibata.miyagi.jp","shichikashuku.miyagi.jp","shikama.miyagi.jp","shiogama.miyagi.jp","shiroishi.miyagi.jp","tagajo.miyagi.jp","taiwa.miyagi.jp","tome.miyagi.jp","tomiya.miyagi.jp","wakuya.miyagi.jp","watari.miyagi.jp","yamamoto.miyagi.jp","zao.miyagi.jp","aya.miyazaki.jp","ebino.miyazaki.jp","gokase.miyazaki.jp","hyuga.miyazaki.jp","kadogawa.miyazaki.jp","kawaminami.miyazaki.jp","kijo.miyazaki.jp","kitagawa.miyazaki.jp","kitakata.miyazaki.jp","kitaura.miyazaki.jp","kobayashi.miyazaki.jp","kunitomi.miyazaki.jp","kushima.miyazaki.jp","mimata.miyazaki.jp","miyakonojo.miyazaki.jp","miyazaki.miyazaki.jp","morotsuka.miyazaki.jp","nichinan.miyazaki.jp","nishimera.miyazaki.jp","nobeoka.miyazaki.jp","saito.miyazaki.jp","shiiba.miyazaki.jp","shintomi.miyazaki.jp","takaharu.miyazaki.jp","takanabe.miyazaki.jp","takazaki.miyazaki.jp","tsuno.miyazaki.jp","achi.nagano.jp","agematsu.nagano.jp","anan.nagano.jp","aoki.nagano.jp","asahi.nagano.jp","azumino.nagano.jp","chikuhoku.nagano.jp","chikuma.nagano.jp","chino.nagano.jp","fujimi.nagano.jp","hakuba.nagano.jp","hara.nagano.jp","hiraya.nagano.jp","iida.nagano.jp","iijima.nagano.jp","iiyama.nagano.jp","iizuna.nagano.jp","ikeda.nagano.jp","ikusaka.nagano.jp","ina.nagano.jp","karuizawa.nagano.jp","kawakami.nagano.jp","kiso.nagano.jp","kisofukushima.nagano.jp","kitaaiki.nagano.jp","komagane.nagano.jp","komoro.nagano.jp","matsukawa.nagano.jp","matsumoto.nagano.jp","miasa.nagano.jp","minamiaiki.nagano.jp","minamimaki.nagano.jp","minamiminowa.nagano.jp","minowa.nagano.jp","miyada.nagano.jp","miyota.nagano.jp","mochizuki.nagano.jp","nagano.nagano.jp","nagawa.nagano.jp","nagiso.nagano.jp","nakagawa.nagano.jp","nakano.nagano.jp","nozawaonsen.nagano.jp","obuse.nagano.jp","ogawa.nagano.jp","okaya.nagano.jp","omachi.nagano.jp","omi.nagano.jp","ookuwa.nagano.jp","ooshika.nagano.jp","otaki.nagano.jp","otari.nagano.jp","sakae.nagano.jp","sakaki.nagano.jp","saku.nagano.jp","sakuho.nagano.jp","shimosuwa.nagano.jp","shinanomachi.nagano.jp","shiojiri.nagano.jp","suwa.nagano.jp","suzaka.nagano.jp","takagi.nagano.jp","takamori.nagano.jp","takayama.nagano.jp","tateshina.nagano.jp","tatsuno.nagano.jp","togakushi.nagano.jp","togura.nagano.jp","tomi.nagano.jp","ueda.nagano.jp","wada.nagano.jp","yamagata.nagano.jp","yamanouchi.nagano.jp","yasaka.nagano.jp","yasuoka.nagano.jp","chijiwa.nagasaki.jp","futsu.nagasaki.jp","goto.nagasaki.jp","hasami.nagasaki.jp","hirado.nagasaki.jp","iki.nagasaki.jp","isahaya.nagasaki.jp","kawatana.nagasaki.jp","kuchinotsu.nagasaki.jp","matsuura.nagasaki.jp","nagasaki.nagasaki.jp","obama.nagasaki.jp","omura.nagasaki.jp","oseto.nagasaki.jp","saikai.nagasaki.jp","sasebo.nagasaki.jp","seihi.nagasaki.jp","shimabara.nagasaki.jp","shinkamigoto.nagasaki.jp","togitsu.nagasaki.jp","tsushima.nagasaki.jp","unzen.nagasaki.jp","ando.nara.jp","gose.nara.jp","heguri.nara.jp","higashiyoshino.nara.jp","ikaruga.nara.jp","ikoma.nara.jp","kamikitayama.nara.jp","kanmaki.nara.jp","kashiba.nara.jp","kashihara.nara.jp","katsuragi.nara.jp","kawai.nara.jp","kawakami.nara.jp","kawanishi.nara.jp","koryo.nara.jp","kurotaki.nara.jp","mitsue.nara.jp","miyake.nara.jp","nara.nara.jp","nosegawa.nara.jp","oji.nara.jp","ouda.nara.jp","oyodo.nara.jp","sakurai.nara.jp","sango.nara.jp","shimoichi.nara.jp","shimokitayama.nara.jp","shinjo.nara.jp","soni.nara.jp","takatori.nara.jp","tawaramoto.nara.jp","tenkawa.nara.jp","tenri.nara.jp","uda.nara.jp","yamatokoriyama.nara.jp","yamatotakada.nara.jp","yamazoe.nara.jp","yoshino.nara.jp","aga.niigata.jp","agano.niigata.jp","gosen.niigata.jp","itoigawa.niigata.jp","izumozaki.niigata.jp","joetsu.niigata.jp","kamo.niigata.jp","kariwa.niigata.jp","kashiwazaki.niigata.jp","minamiuonuma.niigata.jp","mitsuke.niigata.jp","muika.niigata.jp","murakami.niigata.jp","myoko.niigata.jp","nagaoka.niigata.jp","niigata.niigata.jp","ojiya.niigata.jp","omi.niigata.jp","sado.niigata.jp","sanjo.niigata.jp","seiro.niigata.jp","seirou.niigata.jp","sekikawa.niigata.jp","shibata.niigata.jp","tagami.niigata.jp","tainai.niigata.jp","tochio.niigata.jp","tokamachi.niigata.jp","tsubame.niigata.jp","tsunan.niigata.jp","uonuma.niigata.jp","yahiko.niigata.jp","yoita.niigata.jp","yuzawa.niigata.jp","beppu.oita.jp","bungoono.oita.jp","bungotakada.oita.jp","hasama.oita.jp","hiji.oita.jp","himeshima.oita.jp","hita.oita.jp","kamitsue.oita.jp","kokonoe.oita.jp","kuju.oita.jp","kunisaki.oita.jp","kusu.oita.jp","oita.oita.jp","saiki.oita.jp","taketa.oita.jp","tsukumi.oita.jp","usa.oita.jp","usuki.oita.jp","yufu.oita.jp","akaiwa.okayama.jp","asakuchi.okayama.jp","bizen.okayama.jp","hayashima.okayama.jp","ibara.okayama.jp","kagamino.okayama.jp","kasaoka.okayama.jp","kibichuo.okayama.jp","kumenan.okayama.jp","kurashiki.okayama.jp","maniwa.okayama.jp","misaki.okayama.jp","nagi.okayama.jp","niimi.okayama.jp","nishiawakura.okayama.jp","okayama.okayama.jp","satosho.okayama.jp","setouchi.okayama.jp","shinjo.okayama.jp","shoo.okayama.jp","soja.okayama.jp","takahashi.okayama.jp","tamano.okayama.jp","tsuyama.okayama.jp","wake.okayama.jp","yakage.okayama.jp","aguni.okinawa.jp","ginowan.okinawa.jp","ginoza.okinawa.jp","gushikami.okinawa.jp","haebaru.okinawa.jp","higashi.okinawa.jp","hirara.okinawa.jp","iheya.okinawa.jp","ishigaki.okinawa.jp","ishikawa.okinawa.jp","itoman.okinawa.jp","izena.okinawa.jp","kadena.okinawa.jp","kin.okinawa.jp","kitadaito.okinawa.jp","kitanakagusuku.okinawa.jp","kumejima.okinawa.jp","kunigami.okinawa.jp","minamidaito.okinawa.jp","motobu.okinawa.jp","nago.okinawa.jp","naha.okinawa.jp","nakagusuku.okinawa.jp","nakijin.okinawa.jp","nanjo.okinawa.jp","nishihara.okinawa.jp","ogimi.okinawa.jp","okinawa.okinawa.jp","onna.okinawa.jp","shimoji.okinawa.jp","taketomi.okinawa.jp","tarama.okinawa.jp","tokashiki.okinawa.jp","tomigusuku.okinawa.jp","tonaki.okinawa.jp","urasoe.okinawa.jp","uruma.okinawa.jp","yaese.okinawa.jp","yomitan.okinawa.jp","yonabaru.okinawa.jp","yonaguni.okinawa.jp","zamami.okinawa.jp","abeno.osaka.jp","chihayaakasaka.osaka.jp","chuo.osaka.jp","daito.osaka.jp","fujiidera.osaka.jp","habikino.osaka.jp","hannan.osaka.jp","higashiosaka.osaka.jp","higashisumiyoshi.osaka.jp","higashiyodogawa.osaka.jp","hirakata.osaka.jp","ibaraki.osaka.jp","ikeda.osaka.jp","izumi.osaka.jp","izumiotsu.osaka.jp","izumisano.osaka.jp","kadoma.osaka.jp","kaizuka.osaka.jp","kanan.osaka.jp","kashiwara.osaka.jp","katano.osaka.jp","kawachinagano.osaka.jp","kishiwada.osaka.jp","kita.osaka.jp","kumatori.osaka.jp","matsubara.osaka.jp","minato.osaka.jp","minoh.osaka.jp","misaki.osaka.jp","moriguchi.osaka.jp","neyagawa.osaka.jp","nishi.osaka.jp","nose.osaka.jp","osakasayama.osaka.jp","sakai.osaka.jp","sayama.osaka.jp","sennan.osaka.jp","settsu.osaka.jp","shijonawate.osaka.jp","shimamoto.osaka.jp","suita.osaka.jp","tadaoka.osaka.jp","taishi.osaka.jp","tajiri.osaka.jp","takaishi.osaka.jp","takatsuki.osaka.jp","tondabayashi.osaka.jp","toyonaka.osaka.jp","toyono.osaka.jp","yao.osaka.jp","ariake.saga.jp","arita.saga.jp","fukudomi.saga.jp","genkai.saga.jp","hamatama.saga.jp","hizen.saga.jp","imari.saga.jp","kamimine.saga.jp","kanzaki.saga.jp","karatsu.saga.jp","kashima.saga.jp","kitagata.saga.jp","kitahata.saga.jp","kiyama.saga.jp","kouhoku.saga.jp","kyuragi.saga.jp","nishiarita.saga.jp","ogi.saga.jp","omachi.saga.jp","ouchi.saga.jp","saga.saga.jp","shiroishi.saga.jp","taku.saga.jp","tara.saga.jp","tosu.saga.jp","yoshinogari.saga.jp","arakawa.saitama.jp","asaka.saitama.jp","chichibu.saitama.jp","fujimi.saitama.jp","fujimino.saitama.jp","fukaya.saitama.jp","hanno.saitama.jp","hanyu.saitama.jp","hasuda.saitama.jp","hatogaya.saitama.jp","hatoyama.saitama.jp","hidaka.saitama.jp","higashichichibu.saitama.jp","higashimatsuyama.saitama.jp","honjo.saitama.jp","ina.saitama.jp","iruma.saitama.jp","iwatsuki.saitama.jp","kamiizumi.saitama.jp","kamikawa.saitama.jp","kamisato.saitama.jp","kasukabe.saitama.jp","kawagoe.saitama.jp","kawaguchi.saitama.jp","kawajima.saitama.jp","kazo.saitama.jp","kitamoto.saitama.jp","koshigaya.saitama.jp","kounosu.saitama.jp","kuki.saitama.jp","kumagaya.saitama.jp","matsubushi.saitama.jp","minano.saitama.jp","misato.saitama.jp","miyashiro.saitama.jp","miyoshi.saitama.jp","moroyama.saitama.jp","nagatoro.saitama.jp","namegawa.saitama.jp","niiza.saitama.jp","ogano.saitama.jp","ogawa.saitama.jp","ogose.saitama.jp","okegawa.saitama.jp","omiya.saitama.jp","otaki.saitama.jp","ranzan.saitama.jp","ryokami.saitama.jp","saitama.saitama.jp","sakado.saitama.jp","satte.saitama.jp","sayama.saitama.jp","shiki.saitama.jp","shiraoka.saitama.jp","soka.saitama.jp","sugito.saitama.jp","toda.saitama.jp","tokigawa.saitama.jp","tokorozawa.saitama.jp","tsurugashima.saitama.jp","urawa.saitama.jp","warabi.saitama.jp","yashio.saitama.jp","yokoze.saitama.jp","yono.saitama.jp","yorii.saitama.jp","yoshida.saitama.jp","yoshikawa.saitama.jp","yoshimi.saitama.jp","aisho.shiga.jp","gamo.shiga.jp","higashiomi.shiga.jp","hikone.shiga.jp","koka.shiga.jp","konan.shiga.jp","kosei.shiga.jp","koto.shiga.jp","kusatsu.shiga.jp","maibara.shiga.jp","moriyama.shiga.jp","nagahama.shiga.jp","nishiazai.shiga.jp","notogawa.shiga.jp","omihachiman.shiga.jp","otsu.shiga.jp","ritto.shiga.jp","ryuoh.shiga.jp","takashima.shiga.jp","takatsuki.shiga.jp","torahime.shiga.jp","toyosato.shiga.jp","yasu.shiga.jp","akagi.shimane.jp","ama.shimane.jp","gotsu.shimane.jp","hamada.shimane.jp","higashiizumo.shimane.jp","hikawa.shimane.jp","hikimi.shimane.jp","izumo.shimane.jp","kakinoki.shimane.jp","masuda.shimane.jp","matsue.shimane.jp","misato.shimane.jp","nishinoshima.shimane.jp","ohda.shimane.jp","okinoshima.shimane.jp","okuizumo.shimane.jp","shimane.shimane.jp","tamayu.shimane.jp","tsuwano.shimane.jp","unnan.shimane.jp","yakumo.shimane.jp","yasugi.shimane.jp","yatsuka.shimane.jp","arai.shizuoka.jp","atami.shizuoka.jp","fuji.shizuoka.jp","fujieda.shizuoka.jp","fujikawa.shizuoka.jp","fujinomiya.shizuoka.jp","fukuroi.shizuoka.jp","gotemba.shizuoka.jp","haibara.shizuoka.jp","hamamatsu.shizuoka.jp","higashiizu.shizuoka.jp","ito.shizuoka.jp","iwata.shizuoka.jp","izu.shizuoka.jp","izunokuni.shizuoka.jp","kakegawa.shizuoka.jp","kannami.shizuoka.jp","kawanehon.shizuoka.jp","kawazu.shizuoka.jp","kikugawa.shizuoka.jp","kosai.shizuoka.jp","makinohara.shizuoka.jp","matsuzaki.shizuoka.jp","minamiizu.shizuoka.jp","mishima.shizuoka.jp","morimachi.shizuoka.jp","nishiizu.shizuoka.jp","numazu.shizuoka.jp","omaezaki.shizuoka.jp","shimada.shizuoka.jp","shimizu.shizuoka.jp","shimoda.shizuoka.jp","shizuoka.shizuoka.jp","susono.shizuoka.jp","yaizu.shizuoka.jp","yoshida.shizuoka.jp","ashikaga.tochigi.jp","bato.tochigi.jp","haga.tochigi.jp","ichikai.tochigi.jp","iwafune.tochigi.jp","kaminokawa.tochigi.jp","kanuma.tochigi.jp","karasuyama.tochigi.jp","kuroiso.tochigi.jp","mashiko.tochigi.jp","mibu.tochigi.jp","moka.tochigi.jp","motegi.tochigi.jp","nasu.tochigi.jp","nasushiobara.tochigi.jp","nikko.tochigi.jp","nishikata.tochigi.jp","nogi.tochigi.jp","ohira.tochigi.jp","ohtawara.tochigi.jp","oyama.tochigi.jp","sakura.tochigi.jp","sano.tochigi.jp","shimotsuke.tochigi.jp","shioya.tochigi.jp","takanezawa.tochigi.jp","tochigi.tochigi.jp","tsuga.tochigi.jp","ujiie.tochigi.jp","utsunomiya.tochigi.jp","yaita.tochigi.jp","aizumi.tokushima.jp","anan.tokushima.jp","ichiba.tokushima.jp","itano.tokushima.jp","kainan.tokushima.jp","komatsushima.tokushima.jp","matsushige.tokushima.jp","mima.tokushima.jp","minami.tokushima.jp","miyoshi.tokushima.jp","mugi.tokushima.jp","nakagawa.tokushima.jp","naruto.tokushima.jp","sanagochi.tokushima.jp","shishikui.tokushima.jp","tokushima.tokushima.jp","wajiki.tokushima.jp","adachi.tokyo.jp","akiruno.tokyo.jp","akishima.tokyo.jp","aogashima.tokyo.jp","arakawa.tokyo.jp","bunkyo.tokyo.jp","chiyoda.tokyo.jp","chofu.tokyo.jp","chuo.tokyo.jp","edogawa.tokyo.jp","fuchu.tokyo.jp","fussa.tokyo.jp","hachijo.tokyo.jp","hachioji.tokyo.jp","hamura.tokyo.jp","higashikurume.tokyo.jp","higashimurayama.tokyo.jp","higashiyamato.tokyo.jp","hino.tokyo.jp","hinode.tokyo.jp","hinohara.tokyo.jp","inagi.tokyo.jp","itabashi.tokyo.jp","katsushika.tokyo.jp","kita.tokyo.jp","kiyose.tokyo.jp","kodaira.tokyo.jp","koganei.tokyo.jp","kokubunji.tokyo.jp","komae.tokyo.jp","koto.tokyo.jp","kouzushima.tokyo.jp","kunitachi.tokyo.jp","machida.tokyo.jp","meguro.tokyo.jp","minato.tokyo.jp","mitaka.tokyo.jp","mizuho.tokyo.jp","musashimurayama.tokyo.jp","musashino.tokyo.jp","nakano.tokyo.jp","nerima.tokyo.jp","ogasawara.tokyo.jp","okutama.tokyo.jp","ome.tokyo.jp","oshima.tokyo.jp","ota.tokyo.jp","setagaya.tokyo.jp","shibuya.tokyo.jp","shinagawa.tokyo.jp","shinjuku.tokyo.jp","suginami.tokyo.jp","sumida.tokyo.jp","tachikawa.tokyo.jp","taito.tokyo.jp","tama.tokyo.jp","toshima.tokyo.jp","chizu.tottori.jp","hino.tottori.jp","kawahara.tottori.jp","koge.tottori.jp","kotoura.tottori.jp","misasa.tottori.jp","nanbu.tottori.jp","nichinan.tottori.jp","sakaiminato.tottori.jp","tottori.tottori.jp","wakasa.tottori.jp","yazu.tottori.jp","yonago.tottori.jp","asahi.toyama.jp","fuchu.toyama.jp","fukumitsu.toyama.jp","funahashi.toyama.jp","himi.toyama.jp","imizu.toyama.jp","inami.toyama.jp","johana.toyama.jp","kamiichi.toyama.jp","kurobe.toyama.jp","nakaniikawa.toyama.jp","namerikawa.toyama.jp","nanto.toyama.jp","nyuzen.toyama.jp","oyabe.toyama.jp","taira.toyama.jp","takaoka.toyama.jp","tateyama.toyama.jp","toga.toyama.jp","tonami.toyama.jp","toyama.toyama.jp","unazuki.toyama.jp","uozu.toyama.jp","yamada.toyama.jp","arida.wakayama.jp","aridagawa.wakayama.jp","gobo.wakayama.jp","hashimoto.wakayama.jp","hidaka.wakayama.jp","hirogawa.wakayama.jp","inami.wakayama.jp","iwade.wakayama.jp","kainan.wakayama.jp","kamitonda.wakayama.jp","katsuragi.wakayama.jp","kimino.wakayama.jp","kinokawa.wakayama.jp","kitayama.wakayama.jp","koya.wakayama.jp","koza.wakayama.jp","kozagawa.wakayama.jp","kudoyama.wakayama.jp","kushimoto.wakayama.jp","mihama.wakayama.jp","misato.wakayama.jp","nachikatsuura.wakayama.jp","shingu.wakayama.jp","shirahama.wakayama.jp","taiji.wakayama.jp","tanabe.wakayama.jp","wakayama.wakayama.jp","yuasa.wakayama.jp","yura.wakayama.jp","asahi.yamagata.jp","funagata.yamagata.jp","higashine.yamagata.jp","iide.yamagata.jp","kahoku.yamagata.jp","kaminoyama.yamagata.jp","kaneyama.yamagata.jp","kawanishi.yamagata.jp","mamurogawa.yamagata.jp","mikawa.yamagata.jp","murayama.yamagata.jp","nagai.yamagata.jp","nakayama.yamagata.jp","nanyo.yamagata.jp","nishikawa.yamagata.jp","obanazawa.yamagata.jp","oe.yamagata.jp","oguni.yamagata.jp","ohkura.yamagata.jp","oishida.yamagata.jp","sagae.yamagata.jp","sakata.yamagata.jp","sakegawa.yamagata.jp","shinjo.yamagata.jp","shirataka.yamagata.jp","shonai.yamagata.jp","takahata.yamagata.jp","tendo.yamagata.jp","tozawa.yamagata.jp","tsuruoka.yamagata.jp","yamagata.yamagata.jp","yamanobe.yamagata.jp","yonezawa.yamagata.jp","yuza.yamagata.jp","abu.yamaguchi.jp","hagi.yamaguchi.jp","hikari.yamaguchi.jp","hofu.yamaguchi.jp","iwakuni.yamaguchi.jp","kudamatsu.yamaguchi.jp","mitou.yamaguchi.jp","nagato.yamaguchi.jp","oshima.yamaguchi.jp","shimonoseki.yamaguchi.jp","shunan.yamaguchi.jp","tabuse.yamaguchi.jp","tokuyama.yamaguchi.jp","toyota.yamaguchi.jp","ube.yamaguchi.jp","yuu.yamaguchi.jp","chuo.yamanashi.jp","doshi.yamanashi.jp","fuefuki.yamanashi.jp","fujikawa.yamanashi.jp","fujikawaguchiko.yamanashi.jp","fujiyoshida.yamanashi.jp","hayakawa.yamanashi.jp","hokuto.yamanashi.jp","ichikawamisato.yamanashi.jp","kai.yamanashi.jp","kofu.yamanashi.jp","koshu.yamanashi.jp","kosuge.yamanashi.jp","minami-alps.yamanashi.jp","minobu.yamanashi.jp","nakamichi.yamanashi.jp","nanbu.yamanashi.jp","narusawa.yamanashi.jp","nirasaki.yamanashi.jp","nishikatsura.yamanashi.jp","oshino.yamanashi.jp","otsuki.yamanashi.jp","showa.yamanashi.jp","tabayama.yamanashi.jp","tsuru.yamanashi.jp","uenohara.yamanashi.jp","yamanakako.yamanashi.jp","yamanashi.yamanashi.jp","ke","ac.ke","co.ke","go.ke","info.ke","me.ke","mobi.ke","ne.ke","or.ke","sc.ke","kg","org.kg","net.kg","com.kg","edu.kg","gov.kg","mil.kg","*.kh","ki","edu.ki","biz.ki","net.ki","org.ki","gov.ki","info.ki","com.ki","km","org.km","nom.km","gov.km","prd.km","tm.km","edu.km","mil.km","ass.km","com.km","coop.km","asso.km","presse.km","medecin.km","notaires.km","pharmaciens.km","veterinaire.km","gouv.km","kn","net.kn","org.kn","edu.kn","gov.kn","kp","com.kp","edu.kp","gov.kp","org.kp","rep.kp","tra.kp","kr","ac.kr","co.kr","es.kr","go.kr","hs.kr","kg.kr","mil.kr","ms.kr","ne.kr","or.kr","pe.kr","re.kr","sc.kr","busan.kr","chungbuk.kr","chungnam.kr","daegu.kr","daejeon.kr","gangwon.kr","gwangju.kr","gyeongbuk.kr","gyeonggi.kr","gyeongnam.kr","incheon.kr","jeju.kr","jeonbuk.kr","jeonnam.kr","seoul.kr","ulsan.kr","kw","com.kw","edu.kw","emb.kw","gov.kw","ind.kw","net.kw","org.kw","ky","edu.ky","gov.ky","com.ky","org.ky","net.ky","kz","org.kz","edu.kz","net.kz","gov.kz","mil.kz","com.kz","la","int.la","net.la","info.la","edu.la","gov.la","per.la","com.la","org.la","lb","com.lb","edu.lb","gov.lb","net.lb","org.lb","lc","com.lc","net.lc","co.lc","org.lc","edu.lc","gov.lc","li","lk","gov.lk","sch.lk","net.lk","int.lk","com.lk","org.lk","edu.lk","ngo.lk","soc.lk","web.lk","ltd.lk","assn.lk","grp.lk","hotel.lk","ac.lk","lr","com.lr","edu.lr","gov.lr","org.lr","net.lr","ls","ac.ls","biz.ls","co.ls","edu.ls","gov.ls","info.ls","net.ls","org.ls","sc.ls","lt","gov.lt","lu","lv","com.lv","edu.lv","gov.lv","org.lv","mil.lv","id.lv","net.lv","asn.lv","conf.lv","ly","com.ly","net.ly","gov.ly","plc.ly","edu.ly","sch.ly","med.ly","org.ly","id.ly","ma","co.ma","net.ma","gov.ma","org.ma","ac.ma","press.ma","mc","tm.mc","asso.mc","md","me","co.me","net.me","org.me","edu.me","ac.me","gov.me","its.me","priv.me","mg","org.mg","nom.mg","gov.mg","prd.mg","tm.mg","edu.mg","mil.mg","com.mg","co.mg","mh","mil","mk","com.mk","org.mk","net.mk","edu.mk","gov.mk","inf.mk","name.mk","ml","com.ml","edu.ml","gouv.ml","gov.ml","net.ml","org.ml","presse.ml","*.mm","mn","gov.mn","edu.mn","org.mn","mo","com.mo","net.mo","org.mo","edu.mo","gov.mo","mobi","mp","mq","mr","gov.mr","ms","com.ms","edu.ms","gov.ms","net.ms","org.ms","mt","com.mt","edu.mt","net.mt","org.mt","mu","com.mu","net.mu","org.mu","gov.mu","ac.mu","co.mu","or.mu","museum","academy.museum","agriculture.museum","air.museum","airguard.museum","alabama.museum","alaska.museum","amber.museum","ambulance.museum","american.museum","americana.museum","americanantiques.museum","americanart.museum","amsterdam.museum","and.museum","annefrank.museum","anthro.museum","anthropology.museum","antiques.museum","aquarium.museum","arboretum.museum","archaeological.museum","archaeology.museum","architecture.museum","art.museum","artanddesign.museum","artcenter.museum","artdeco.museum","arteducation.museum","artgallery.museum","arts.museum","artsandcrafts.museum","asmatart.museum","assassination.museum","assisi.museum","association.museum","astronomy.museum","atlanta.museum","austin.museum","australia.museum","automotive.museum","aviation.museum","axis.museum","badajoz.museum","baghdad.museum","bahn.museum","bale.museum","baltimore.museum","barcelona.museum","baseball.museum","basel.museum","baths.museum","bauern.museum","beauxarts.museum","beeldengeluid.museum","bellevue.museum","bergbau.museum","berkeley.museum","berlin.museum","bern.museum","bible.museum","bilbao.museum","bill.museum","birdart.museum","birthplace.museum","bonn.museum","boston.museum","botanical.museum","botanicalgarden.museum","botanicgarden.museum","botany.museum","brandywinevalley.museum","brasil.museum","bristol.museum","british.museum","britishcolumbia.museum","broadcast.museum","brunel.museum","brussel.museum","brussels.museum","bruxelles.museum","building.museum","burghof.museum","bus.museum","bushey.museum","cadaques.museum","california.museum","cambridge.museum","can.museum","canada.museum","capebreton.museum","carrier.museum","cartoonart.museum","casadelamoneda.museum","castle.museum","castres.museum","celtic.museum","center.museum","chattanooga.museum","cheltenham.museum","chesapeakebay.museum","chicago.museum","children.museum","childrens.museum","childrensgarden.museum","chiropractic.museum","chocolate.museum","christiansburg.museum","cincinnati.museum","cinema.museum","circus.museum","civilisation.museum","civilization.museum","civilwar.museum","clinton.museum","clock.museum","coal.museum","coastaldefence.museum","cody.museum","coldwar.museum","collection.museum","colonialwilliamsburg.museum","coloradoplateau.museum","columbia.museum","columbus.museum","communication.museum","communications.museum","community.museum","computer.museum","computerhistory.museum","comunicações.museum","contemporary.museum","contemporaryart.museum","convent.museum","copenhagen.museum","corporation.museum","correios-e-telecomunicações.museum","corvette.museum","costume.museum","countryestate.museum","county.museum","crafts.museum","cranbrook.museum","creation.museum","cultural.museum","culturalcenter.museum","culture.museum","cyber.museum","cymru.museum","dali.museum","dallas.museum","database.museum","ddr.museum","decorativearts.museum","delaware.museum","delmenhorst.museum","denmark.museum","depot.museum","design.museum","detroit.museum","dinosaur.museum","discovery.museum","dolls.museum","donostia.museum","durham.museum","eastafrica.museum","eastcoast.museum","education.museum","educational.museum","egyptian.museum","eisenbahn.museum","elburg.museum","elvendrell.museum","embroidery.museum","encyclopedic.museum","england.museum","entomology.museum","environment.museum","environmentalconservation.museum","epilepsy.museum","essex.museum","estate.museum","ethnology.museum","exeter.museum","exhibition.museum","family.museum","farm.museum","farmequipment.museum","farmers.museum","farmstead.museum","field.museum","figueres.museum","filatelia.museum","film.museum","fineart.museum","finearts.museum","finland.museum","flanders.museum","florida.museum","force.museum","fortmissoula.museum","fortworth.museum","foundation.museum","francaise.museum","frankfurt.museum","franziskaner.museum","freemasonry.museum","freiburg.museum","fribourg.museum","frog.museum","fundacio.museum","furniture.museum","gallery.museum","garden.museum","gateway.museum","geelvinck.museum","gemological.museum","geology.museum","georgia.museum","giessen.museum","glas.museum","glass.museum","gorge.museum","grandrapids.museum","graz.museum","guernsey.museum","halloffame.museum","hamburg.museum","handson.museum","harvestcelebration.museum","hawaii.museum","health.museum","heimatunduhren.museum","hellas.museum","helsinki.museum","hembygdsforbund.museum","heritage.museum","histoire.museum","historical.museum","historicalsociety.museum","historichouses.museum","historisch.museum","historisches.museum","history.museum","historyofscience.museum","horology.museum","house.museum","humanities.museum","illustration.museum","imageandsound.museum","indian.museum","indiana.museum","indianapolis.museum","indianmarket.museum","intelligence.museum","interactive.museum","iraq.museum","iron.museum","isleofman.museum","jamison.museum","jefferson.museum","jerusalem.museum","jewelry.museum","jewish.museum","jewishart.museum","jfk.museum","journalism.museum","judaica.museum","judygarland.museum","juedisches.museum","juif.museum","karate.museum","karikatur.museum","kids.museum","koebenhavn.museum","koeln.museum","kunst.museum","kunstsammlung.museum","kunstunddesign.museum","labor.museum","labour.museum","lajolla.museum","lancashire.museum","landes.museum","lans.museum","läns.museum","larsson.museum","lewismiller.museum","lincoln.museum","linz.museum","living.museum","livinghistory.museum","localhistory.museum","london.museum","losangeles.museum","louvre.museum","loyalist.museum","lucerne.museum","luxembourg.museum","luzern.museum","mad.museum","madrid.museum","mallorca.museum","manchester.museum","mansion.museum","mansions.museum","manx.museum","marburg.museum","maritime.museum","maritimo.museum","maryland.museum","marylhurst.museum","media.museum","medical.museum","medizinhistorisches.museum","meeres.museum","memorial.museum","mesaverde.museum","michigan.museum","midatlantic.museum","military.museum","mill.museum","miners.museum","mining.museum","minnesota.museum","missile.museum","missoula.museum","modern.museum","moma.museum","money.museum","monmouth.museum","monticello.museum","montreal.museum","moscow.museum","motorcycle.museum","muenchen.museum","muenster.museum","mulhouse.museum","muncie.museum","museet.museum","museumcenter.museum","museumvereniging.museum","music.museum","national.museum","nationalfirearms.museum","nationalheritage.museum","nativeamerican.museum","naturalhistory.museum","naturalhistorymuseum.museum","naturalsciences.museum","nature.museum","naturhistorisches.museum","natuurwetenschappen.museum","naumburg.museum","naval.museum","nebraska.museum","neues.museum","newhampshire.museum","newjersey.museum","newmexico.museum","newport.museum","newspaper.museum","newyork.museum","niepce.museum","norfolk.museum","north.museum","nrw.museum","nyc.museum","nyny.museum","oceanographic.museum","oceanographique.museum","omaha.museum","online.museum","ontario.museum","openair.museum","oregon.museum","oregontrail.museum","otago.museum","oxford.museum","pacific.museum","paderborn.museum","palace.museum","paleo.museum","palmsprings.museum","panama.museum","paris.museum","pasadena.museum","pharmacy.museum","philadelphia.museum","philadelphiaarea.museum","philately.museum","phoenix.museum","photography.museum","pilots.museum","pittsburgh.museum","planetarium.museum","plantation.museum","plants.museum","plaza.museum","portal.museum","portland.museum","portlligat.museum","posts-and-telecommunications.museum","preservation.museum","presidio.museum","press.museum","project.museum","public.museum","pubol.museum","quebec.museum","railroad.museum","railway.museum","research.museum","resistance.museum","riodejaneiro.museum","rochester.museum","rockart.museum","roma.museum","russia.museum","saintlouis.museum","salem.museum","salvadordali.museum","salzburg.museum","sandiego.museum","sanfrancisco.museum","santabarbara.museum","santacruz.museum","santafe.museum","saskatchewan.museum","satx.museum","savannahga.museum","schlesisches.museum","schoenbrunn.museum","schokoladen.museum","school.museum","schweiz.museum","science.museum","scienceandhistory.museum","scienceandindustry.museum","sciencecenter.museum","sciencecenters.museum","science-fiction.museum","sciencehistory.museum","sciences.museum","sciencesnaturelles.museum","scotland.museum","seaport.museum","settlement.museum","settlers.museum","shell.museum","sherbrooke.museum","sibenik.museum","silk.museum","ski.museum","skole.museum","society.museum","sologne.museum","soundandvision.museum","southcarolina.museum","southwest.museum","space.museum","spy.museum","square.museum","stadt.museum","stalbans.museum","starnberg.museum","state.museum","stateofdelaware.museum","station.museum","steam.museum","steiermark.museum","stjohn.museum","stockholm.museum","stpetersburg.museum","stuttgart.museum","suisse.museum","surgeonshall.museum","surrey.museum","svizzera.museum","sweden.museum","sydney.museum","tank.museum","tcm.museum","technology.museum","telekommunikation.museum","television.museum","texas.museum","textile.museum","theater.museum","time.museum","timekeeping.museum","topology.museum","torino.museum","touch.museum","town.museum","transport.museum","tree.museum","trolley.museum","trust.museum","trustee.museum","uhren.museum","ulm.museum","undersea.museum","university.museum","usa.museum","usantiques.museum","usarts.museum","uscountryestate.museum","usculture.museum","usdecorativearts.museum","usgarden.museum","ushistory.museum","ushuaia.museum","uslivinghistory.museum","utah.museum","uvic.museum","valley.museum","vantaa.museum","versailles.museum","viking.museum","village.museum","virginia.museum","virtual.museum","virtuel.museum","vlaanderen.museum","volkenkunde.museum","wales.museum","wallonie.museum","war.museum","washingtondc.museum","watchandclock.museum","watch-and-clock.museum","western.museum","westfalen.museum","whaling.museum","wildlife.museum","williamsburg.museum","windmill.museum","workshop.museum","york.museum","yorkshire.museum","yosemite.museum","youth.museum","zoological.museum","zoology.museum","ירושלים.museum","иком.museum","mv","aero.mv","biz.mv","com.mv","coop.mv","edu.mv","gov.mv","info.mv","int.mv","mil.mv","museum.mv","name.mv","net.mv","org.mv","pro.mv","mw","ac.mw","biz.mw","co.mw","com.mw","coop.mw","edu.mw","gov.mw","int.mw","museum.mw","net.mw","org.mw","mx","com.mx","org.mx","gob.mx","edu.mx","net.mx","my","com.my","net.my","org.my","gov.my","edu.my","mil.my","name.my","mz","ac.mz","adv.mz","co.mz","edu.mz","gov.mz","mil.mz","net.mz","org.mz","na","info.na","pro.na","name.na","school.na","or.na","dr.na","us.na","mx.na","ca.na","in.na","cc.na","tv.na","ws.na","mobi.na","co.na","com.na","org.na","name","nc","asso.nc","nom.nc","ne","net","nf","com.nf","net.nf","per.nf","rec.nf","web.nf","arts.nf","firm.nf","info.nf","other.nf","store.nf","ng","com.ng","edu.ng","gov.ng","i.ng","mil.ng","mobi.ng","name.ng","net.ng","org.ng","sch.ng","ni","ac.ni","biz.ni","co.ni","com.ni","edu.ni","gob.ni","in.ni","info.ni","int.ni","mil.ni","net.ni","nom.ni","org.ni","web.ni","nl","no","fhs.no","vgs.no","fylkesbibl.no","folkebibl.no","museum.no","idrett.no","priv.no","mil.no","stat.no","dep.no","kommune.no","herad.no","aa.no","ah.no","bu.no","fm.no","hl.no","hm.no","jan-mayen.no","mr.no","nl.no","nt.no","of.no","ol.no","oslo.no","rl.no","sf.no","st.no","svalbard.no","tm.no","tr.no","va.no","vf.no","gs.aa.no","gs.ah.no","gs.bu.no","gs.fm.no","gs.hl.no","gs.hm.no","gs.jan-mayen.no","gs.mr.no","gs.nl.no","gs.nt.no","gs.of.no","gs.ol.no","gs.oslo.no","gs.rl.no","gs.sf.no","gs.st.no","gs.svalbard.no","gs.tm.no","gs.tr.no","gs.va.no","gs.vf.no","akrehamn.no","åkrehamn.no","algard.no","ålgård.no","arna.no","brumunddal.no","bryne.no","bronnoysund.no","brønnøysund.no","drobak.no","drøbak.no","egersund.no","fetsund.no","floro.no","florø.no","fredrikstad.no","hokksund.no","honefoss.no","hønefoss.no","jessheim.no","jorpeland.no","jørpeland.no","kirkenes.no","kopervik.no","krokstadelva.no","langevag.no","langevåg.no","leirvik.no","mjondalen.no","mjøndalen.no","mo-i-rana.no","mosjoen.no","mosjøen.no","nesoddtangen.no","orkanger.no","osoyro.no","osøyro.no","raholt.no","råholt.no","sandnessjoen.no","sandnessjøen.no","skedsmokorset.no","slattum.no","spjelkavik.no","stathelle.no","stavern.no","stjordalshalsen.no","stjørdalshalsen.no","tananger.no","tranby.no","vossevangen.no","afjord.no","åfjord.no","agdenes.no","al.no","ål.no","alesund.no","ålesund.no","alstahaug.no","alta.no","áltá.no","alaheadju.no","álaheadju.no","alvdal.no","amli.no","åmli.no","amot.no","åmot.no","andebu.no","andoy.no","andøy.no","andasuolo.no","ardal.no","årdal.no","aremark.no","arendal.no","ås.no","aseral.no","åseral.no","asker.no","askim.no","askvoll.no","askoy.no","askøy.no","asnes.no","åsnes.no","audnedaln.no","aukra.no","aure.no","aurland.no","aurskog-holand.no","aurskog-høland.no","austevoll.no","austrheim.no","averoy.no","averøy.no","balestrand.no","ballangen.no","balat.no","bálát.no","balsfjord.no","bahccavuotna.no","báhccavuotna.no","bamble.no","bardu.no","beardu.no","beiarn.no","bajddar.no","bájddar.no","baidar.no","báidár.no","berg.no","bergen.no","berlevag.no","berlevåg.no","bearalvahki.no","bearalváhki.no","bindal.no","birkenes.no","bjarkoy.no","bjarkøy.no","bjerkreim.no","bjugn.no","bodo.no","bodø.no","badaddja.no","bådåddjå.no","budejju.no","bokn.no","bremanger.no","bronnoy.no","brønnøy.no","bygland.no","bykle.no","barum.no","bærum.no","bo.telemark.no","bø.telemark.no","bo.nordland.no","bø.nordland.no","bievat.no","bievát.no","bomlo.no","bømlo.no","batsfjord.no","båtsfjord.no","bahcavuotna.no","báhcavuotna.no","dovre.no","drammen.no","drangedal.no","dyroy.no","dyrøy.no","donna.no","dønna.no","eid.no","eidfjord.no","eidsberg.no","eidskog.no","eidsvoll.no","eigersund.no","elverum.no","enebakk.no","engerdal.no","etne.no","etnedal.no","evenes.no","evenassi.no","evenášši.no","evje-og-hornnes.no","farsund.no","fauske.no","fuossko.no","fuoisku.no","fedje.no","fet.no","finnoy.no","finnøy.no","fitjar.no","fjaler.no","fjell.no","flakstad.no","flatanger.no","flekkefjord.no","flesberg.no","flora.no","fla.no","flå.no","folldal.no","forsand.no","fosnes.no","frei.no","frogn.no","froland.no","frosta.no","frana.no","fræna.no","froya.no","frøya.no","fusa.no","fyresdal.no","forde.no","førde.no","gamvik.no","gangaviika.no","gáŋgaviika.no","gaular.no","gausdal.no","gildeskal.no","gildeskål.no","giske.no","gjemnes.no","gjerdrum.no","gjerstad.no","gjesdal.no","gjovik.no","gjøvik.no","gloppen.no","gol.no","gran.no","grane.no","granvin.no","gratangen.no","grimstad.no","grong.no","kraanghke.no","kråanghke.no","grue.no","gulen.no","hadsel.no","halden.no","halsa.no","hamar.no","hamaroy.no","habmer.no","hábmer.no","hapmir.no","hápmir.no","hammerfest.no","hammarfeasta.no","hámmárfeasta.no","haram.no","hareid.no","harstad.no","hasvik.no","aknoluokta.no","ákŋoluokta.no","hattfjelldal.no","aarborte.no","haugesund.no","hemne.no","hemnes.no","hemsedal.no","heroy.more-og-romsdal.no","herøy.møre-og-romsdal.no","heroy.nordland.no","herøy.nordland.no","hitra.no","hjartdal.no","hjelmeland.no","hobol.no","hobøl.no","hof.no","hol.no","hole.no","holmestrand.no","holtalen.no","holtålen.no","hornindal.no","horten.no","hurdal.no","hurum.no","hvaler.no","hyllestad.no","hagebostad.no","hægebostad.no","hoyanger.no","høyanger.no","hoylandet.no","høylandet.no","ha.no","hå.no","ibestad.no","inderoy.no","inderøy.no","iveland.no","jevnaker.no","jondal.no","jolster.no","jølster.no","karasjok.no","karasjohka.no","kárášjohka.no","karlsoy.no","galsa.no","gálsá.no","karmoy.no","karmøy.no","kautokeino.no","guovdageaidnu.no","klepp.no","klabu.no","klæbu.no","kongsberg.no","kongsvinger.no","kragero.no","kragerø.no","kristiansand.no","kristiansund.no","krodsherad.no","krødsherad.no","kvalsund.no","rahkkeravju.no","ráhkkerávju.no","kvam.no","kvinesdal.no","kvinnherad.no","kviteseid.no","kvitsoy.no","kvitsøy.no","kvafjord.no","kvæfjord.no","giehtavuoatna.no","kvanangen.no","kvænangen.no","navuotna.no","návuotna.no","kafjord.no","kåfjord.no","gaivuotna.no","gáivuotna.no","larvik.no","lavangen.no","lavagis.no","loabat.no","loabát.no","lebesby.no","davvesiida.no","leikanger.no","leirfjord.no","leka.no","leksvik.no","lenvik.no","leangaviika.no","leaŋgaviika.no","lesja.no","levanger.no","lier.no","lierne.no","lillehammer.no","lillesand.no","lindesnes.no","lindas.no","lindås.no","lom.no","loppa.no","lahppi.no","láhppi.no","lund.no","lunner.no","luroy.no","lurøy.no","luster.no","lyngdal.no","lyngen.no","ivgu.no","lardal.no","lerdal.no","lærdal.no","lodingen.no","lødingen.no","lorenskog.no","lørenskog.no","loten.no","løten.no","malvik.no","masoy.no","måsøy.no","muosat.no","muosát.no","mandal.no","marker.no","marnardal.no","masfjorden.no","meland.no","meldal.no","melhus.no","meloy.no","meløy.no","meraker.no","meråker.no","moareke.no","moåreke.no","midsund.no","midtre-gauldal.no","modalen.no","modum.no","molde.no","moskenes.no","moss.no","mosvik.no","malselv.no","målselv.no","malatvuopmi.no","málatvuopmi.no","namdalseid.no","aejrie.no","namsos.no","namsskogan.no","naamesjevuemie.no","nååmesjevuemie.no","laakesvuemie.no","nannestad.no","narvik.no","narviika.no","naustdal.no","nedre-eiker.no","nes.akershus.no","nes.buskerud.no","nesna.no","nesodden.no","nesseby.no","unjarga.no","unjárga.no","nesset.no","nissedal.no","nittedal.no","nord-aurdal.no","nord-fron.no","nord-odal.no","norddal.no","nordkapp.no","davvenjarga.no","davvenjárga.no","nordre-land.no","nordreisa.no","raisa.no","ráisa.no","nore-og-uvdal.no","notodden.no","naroy.no","nærøy.no","notteroy.no","nøtterøy.no","odda.no","oksnes.no","øksnes.no","oppdal.no","oppegard.no","oppegård.no","orkdal.no","orland.no","ørland.no","orskog.no","ørskog.no","orsta.no","ørsta.no","os.hedmark.no","os.hordaland.no","osen.no","osteroy.no","osterøy.no","ostre-toten.no","østre-toten.no","overhalla.no","ovre-eiker.no","øvre-eiker.no","oyer.no","øyer.no","oygarden.no","øygarden.no","oystre-slidre.no","øystre-slidre.no","porsanger.no","porsangu.no","porsáŋgu.no","porsgrunn.no","radoy.no","radøy.no","rakkestad.no","rana.no","ruovat.no","randaberg.no","rauma.no","rendalen.no","rennebu.no","rennesoy.no","rennesøy.no","rindal.no","ringebu.no","ringerike.no","ringsaker.no","rissa.no","risor.no","risør.no","roan.no","rollag.no","rygge.no","ralingen.no","rælingen.no","rodoy.no","rødøy.no","romskog.no","rømskog.no","roros.no","røros.no","rost.no","røst.no","royken.no","røyken.no","royrvik.no","røyrvik.no","rade.no","råde.no","salangen.no","siellak.no","saltdal.no","salat.no","sálát.no","sálat.no","samnanger.no","sande.more-og-romsdal.no","sande.møre-og-romsdal.no","sande.vestfold.no","sandefjord.no","sandnes.no","sandoy.no","sandøy.no","sarpsborg.no","sauda.no","sauherad.no","sel.no","selbu.no","selje.no","seljord.no","sigdal.no","siljan.no","sirdal.no","skaun.no","skedsmo.no","ski.no","skien.no","skiptvet.no","skjervoy.no","skjervøy.no","skierva.no","skiervá.no","skjak.no","skjåk.no","skodje.no","skanland.no","skånland.no","skanit.no","skánit.no","smola.no","smøla.no","snillfjord.no","snasa.no","snåsa.no","snoasa.no","snaase.no","snåase.no","sogndal.no","sokndal.no","sola.no","solund.no","songdalen.no","sortland.no","spydeberg.no","stange.no","stavanger.no","steigen.no","steinkjer.no","stjordal.no","stjørdal.no","stokke.no","stor-elvdal.no","stord.no","stordal.no","storfjord.no","omasvuotna.no","strand.no","stranda.no","stryn.no","sula.no","suldal.no","sund.no","sunndal.no","surnadal.no","sveio.no","svelvik.no","sykkylven.no","sogne.no","søgne.no","somna.no","sømna.no","sondre-land.no","søndre-land.no","sor-aurdal.no","sør-aurdal.no","sor-fron.no","sør-fron.no","sor-odal.no","sør-odal.no","sor-varanger.no","sør-varanger.no","matta-varjjat.no","mátta-várjjat.no","sorfold.no","sørfold.no","sorreisa.no","sørreisa.no","sorum.no","sørum.no","tana.no","deatnu.no","time.no","tingvoll.no","tinn.no","tjeldsund.no","dielddanuorri.no","tjome.no","tjøme.no","tokke.no","tolga.no","torsken.no","tranoy.no","tranøy.no","tromso.no","tromsø.no","tromsa.no","romsa.no","trondheim.no","troandin.no","trysil.no","trana.no","træna.no","trogstad.no","trøgstad.no","tvedestrand.no","tydal.no","tynset.no","tysfjord.no","divtasvuodna.no","divttasvuotna.no","tysnes.no","tysvar.no","tysvær.no","tonsberg.no","tønsberg.no","ullensaker.no","ullensvang.no","ulvik.no","utsira.no","vadso.no","vadsø.no","cahcesuolo.no","čáhcesuolo.no","vaksdal.no","valle.no","vang.no","vanylven.no","vardo.no","vardø.no","varggat.no","várggát.no","vefsn.no","vaapste.no","vega.no","vegarshei.no","vegårshei.no","vennesla.no","verdal.no","verran.no","vestby.no","vestnes.no","vestre-slidre.no","vestre-toten.no","vestvagoy.no","vestvågøy.no","vevelstad.no","vik.no","vikna.no","vindafjord.no","volda.no","voss.no","varoy.no","værøy.no","vagan.no","vågan.no","voagat.no","vagsoy.no","vågsøy.no","vaga.no","vågå.no","valer.ostfold.no","våler.østfold.no","valer.hedmark.no","våler.hedmark.no","*.np","nr","biz.nr","info.nr","gov.nr","edu.nr","org.nr","net.nr","com.nr","nu","nz","ac.nz","co.nz","cri.nz","geek.nz","gen.nz","govt.nz","health.nz","iwi.nz","kiwi.nz","maori.nz","mil.nz","māori.nz","net.nz","org.nz","parliament.nz","school.nz","om","co.om","com.om","edu.om","gov.om","med.om","museum.om","net.om","org.om","pro.om","onion","org","pa","ac.pa","gob.pa","com.pa","org.pa","sld.pa","edu.pa","net.pa","ing.pa","abo.pa","med.pa","nom.pa","pe","edu.pe","gob.pe","nom.pe","mil.pe","org.pe","com.pe","net.pe","pf","com.pf","org.pf","edu.pf","*.pg","ph","com.ph","net.ph","org.ph","gov.ph","edu.ph","ngo.ph","mil.ph","i.ph","pk","com.pk","net.pk","edu.pk","org.pk","fam.pk","biz.pk","web.pk","gov.pk","gob.pk","gok.pk","gon.pk","gop.pk","gos.pk","info.pk","pl","com.pl","net.pl","org.pl","aid.pl","agro.pl","atm.pl","auto.pl","biz.pl","edu.pl","gmina.pl","gsm.pl","info.pl","mail.pl","miasta.pl","media.pl","mil.pl","nieruchomosci.pl","nom.pl","pc.pl","powiat.pl","priv.pl","realestate.pl","rel.pl","sex.pl","shop.pl","sklep.pl","sos.pl","szkola.pl","targi.pl","tm.pl","tourism.pl","travel.pl","turystyka.pl","gov.pl","ap.gov.pl","ic.gov.pl","is.gov.pl","us.gov.pl","kmpsp.gov.pl","kppsp.gov.pl","kwpsp.gov.pl","psp.gov.pl","wskr.gov.pl","kwp.gov.pl","mw.gov.pl","ug.gov.pl","um.gov.pl","umig.gov.pl","ugim.gov.pl","upow.gov.pl","uw.gov.pl","starostwo.gov.pl","pa.gov.pl","po.gov.pl","psse.gov.pl","pup.gov.pl","rzgw.gov.pl","sa.gov.pl","so.gov.pl","sr.gov.pl","wsa.gov.pl","sko.gov.pl","uzs.gov.pl","wiih.gov.pl","winb.gov.pl","pinb.gov.pl","wios.gov.pl","witd.gov.pl","wzmiuw.gov.pl","piw.gov.pl","wiw.gov.pl","griw.gov.pl","wif.gov.pl","oum.gov.pl","sdn.gov.pl","zp.gov.pl","uppo.gov.pl","mup.gov.pl","wuoz.gov.pl","konsulat.gov.pl","oirm.gov.pl","augustow.pl","babia-gora.pl","bedzin.pl","beskidy.pl","bialowieza.pl","bialystok.pl","bielawa.pl","bieszczady.pl","boleslawiec.pl","bydgoszcz.pl","bytom.pl","cieszyn.pl","czeladz.pl","czest.pl","dlugoleka.pl","elblag.pl","elk.pl","glogow.pl","gniezno.pl","gorlice.pl","grajewo.pl","ilawa.pl","jaworzno.pl","jelenia-gora.pl","jgora.pl","kalisz.pl","kazimierz-dolny.pl","karpacz.pl","kartuzy.pl","kaszuby.pl","katowice.pl","kepno.pl","ketrzyn.pl","klodzko.pl","kobierzyce.pl","kolobrzeg.pl","konin.pl","konskowola.pl","kutno.pl","lapy.pl","lebork.pl","legnica.pl","lezajsk.pl","limanowa.pl","lomza.pl","lowicz.pl","lubin.pl","lukow.pl","malbork.pl","malopolska.pl","mazowsze.pl","mazury.pl","mielec.pl","mielno.pl","mragowo.pl","naklo.pl","nowaruda.pl","nysa.pl","olawa.pl","olecko.pl","olkusz.pl","olsztyn.pl","opoczno.pl","opole.pl","ostroda.pl","ostroleka.pl","ostrowiec.pl","ostrowwlkp.pl","pila.pl","pisz.pl","podhale.pl","podlasie.pl","polkowice.pl","pomorze.pl","pomorskie.pl","prochowice.pl","pruszkow.pl","przeworsk.pl","pulawy.pl","radom.pl","rawa-maz.pl","rybnik.pl","rzeszow.pl","sanok.pl","sejny.pl","slask.pl","slupsk.pl","sosnowiec.pl","stalowa-wola.pl","skoczow.pl","starachowice.pl","stargard.pl","suwalki.pl","swidnica.pl","swiebodzin.pl","swinoujscie.pl","szczecin.pl","szczytno.pl","tarnobrzeg.pl","tgory.pl","turek.pl","tychy.pl","ustka.pl","walbrzych.pl","warmia.pl","warszawa.pl","waw.pl","wegrow.pl","wielun.pl","wlocl.pl","wloclawek.pl","wodzislaw.pl","wolomin.pl","wroclaw.pl","zachpomor.pl","zagan.pl","zarow.pl","zgora.pl","zgorzelec.pl","pm","pn","gov.pn","co.pn","org.pn","edu.pn","net.pn","post","pr","com.pr","net.pr","org.pr","gov.pr","edu.pr","isla.pr","pro.pr","biz.pr","info.pr","name.pr","est.pr","prof.pr","ac.pr","pro","aaa.pro","aca.pro","acct.pro","avocat.pro","bar.pro","cpa.pro","eng.pro","jur.pro","law.pro","med.pro","recht.pro","ps","edu.ps","gov.ps","sec.ps","plo.ps","com.ps","org.ps","net.ps","pt","net.pt","gov.pt","org.pt","edu.pt","int.pt","publ.pt","com.pt","nome.pt","pw","co.pw","ne.pw","or.pw","ed.pw","go.pw","belau.pw","py","com.py","coop.py","edu.py","gov.py","mil.py","net.py","org.py","qa","com.qa","edu.qa","gov.qa","mil.qa","name.qa","net.qa","org.qa","sch.qa","re","asso.re","com.re","nom.re","ro","arts.ro","com.ro","firm.ro","info.ro","nom.ro","nt.ro","org.ro","rec.ro","store.ro","tm.ro","www.ro","rs","ac.rs","co.rs","edu.rs","gov.rs","in.rs","org.rs","ru","rw","ac.rw","co.rw","coop.rw","gov.rw","mil.rw","net.rw","org.rw","sa","com.sa","net.sa","org.sa","gov.sa","med.sa","pub.sa","edu.sa","sch.sa","sb","com.sb","edu.sb","gov.sb","net.sb","org.sb","sc","com.sc","gov.sc","net.sc","org.sc","edu.sc","sd","com.sd","net.sd","org.sd","edu.sd","med.sd","tv.sd","gov.sd","info.sd","se","a.se","ac.se","b.se","bd.se","brand.se","c.se","d.se","e.se","f.se","fh.se","fhsk.se","fhv.se","g.se","h.se","i.se","k.se","komforb.se","kommunalforbund.se","komvux.se","l.se","lanbib.se","m.se","n.se","naturbruksgymn.se","o.se","org.se","p.se","parti.se","pp.se","press.se","r.se","s.se","t.se","tm.se","u.se","w.se","x.se","y.se","z.se","sg","com.sg","net.sg","org.sg","gov.sg","edu.sg","per.sg","sh","com.sh","net.sh","gov.sh","org.sh","mil.sh","si","sj","sk","sl","com.sl","net.sl","edu.sl","gov.sl","org.sl","sm","sn","art.sn","com.sn","edu.sn","gouv.sn","org.sn","perso.sn","univ.sn","so","com.so","edu.so","gov.so","me.so","net.so","org.so","sr","ss","biz.ss","com.ss","edu.ss","gov.ss","net.ss","org.ss","st","co.st","com.st","consulado.st","edu.st","embaixada.st","gov.st","mil.st","net.st","org.st","principe.st","saotome.st","store.st","su","sv","com.sv","edu.sv","gob.sv","org.sv","red.sv","sx","gov.sx","sy","edu.sy","gov.sy","net.sy","mil.sy","com.sy","org.sy","sz","co.sz","ac.sz","org.sz","tc","td","tel","tf","tg","th","ac.th","co.th","go.th","in.th","mi.th","net.th","or.th","tj","ac.tj","biz.tj","co.tj","com.tj","edu.tj","go.tj","gov.tj","int.tj","mil.tj","name.tj","net.tj","nic.tj","org.tj","test.tj","web.tj","tk","tl","gov.tl","tm","com.tm","co.tm","org.tm","net.tm","nom.tm","gov.tm","mil.tm","edu.tm","tn","com.tn","ens.tn","fin.tn","gov.tn","ind.tn","intl.tn","nat.tn","net.tn","org.tn","info.tn","perso.tn","tourism.tn","edunet.tn","rnrt.tn","rns.tn","rnu.tn","mincom.tn","agrinet.tn","defense.tn","turen.tn","to","com.to","gov.to","net.to","org.to","edu.to","mil.to","tr","av.tr","bbs.tr","bel.tr","biz.tr","com.tr","dr.tr","edu.tr","gen.tr","gov.tr","info.tr","mil.tr","k12.tr","kep.tr","name.tr","net.tr","org.tr","pol.tr","tel.tr","tsk.tr","tv.tr","web.tr","nc.tr","gov.nc.tr","tt","co.tt","com.tt","org.tt","net.tt","biz.tt","info.tt","pro.tt","int.tt","coop.tt","jobs.tt","mobi.tt","travel.tt","museum.tt","aero.tt","name.tt","gov.tt","edu.tt","tv","tw","edu.tw","gov.tw","mil.tw","com.tw","net.tw","org.tw","idv.tw","game.tw","ebiz.tw","club.tw","網路.tw","組織.tw","商業.tw","tz","ac.tz","co.tz","go.tz","hotel.tz","info.tz","me.tz","mil.tz","mobi.tz","ne.tz","or.tz","sc.tz","tv.tz","ua","com.ua","edu.ua","gov.ua","in.ua","net.ua","org.ua","cherkassy.ua","cherkasy.ua","chernigov.ua","chernihiv.ua","chernivtsi.ua","chernovtsy.ua","ck.ua","cn.ua","cr.ua","crimea.ua","cv.ua","dn.ua","dnepropetrovsk.ua","dnipropetrovsk.ua","dominic.ua","donetsk.ua","dp.ua","if.ua","ivano-frankivsk.ua","kh.ua","kharkiv.ua","kharkov.ua","kherson.ua","khmelnitskiy.ua","khmelnytskyi.ua","kiev.ua","kirovograd.ua","km.ua","kr.ua","krym.ua","ks.ua","kv.ua","kyiv.ua","lg.ua","lt.ua","lugansk.ua","lutsk.ua","lv.ua","lviv.ua","mk.ua","mykolaiv.ua","nikolaev.ua","od.ua","odesa.ua","odessa.ua","pl.ua","poltava.ua","rivne.ua","rovno.ua","rv.ua","sb.ua","sebastopol.ua","sevastopol.ua","sm.ua","sumy.ua","te.ua","ternopil.ua","uz.ua","uzhgorod.ua","vinnica.ua","vinnytsia.ua","vn.ua","volyn.ua","yalta.ua","zaporizhzhe.ua","zaporizhzhia.ua","zhitomir.ua","zhytomyr.ua","zp.ua","zt.ua","ug","co.ug","or.ug","ac.ug","sc.ug","go.ug","ne.ug","com.ug","org.ug","uk","ac.uk","co.uk","gov.uk","ltd.uk","me.uk","net.uk","nhs.uk","org.uk","plc.uk","police.uk","*.sch.uk","us","dni.us","fed.us","isa.us","kids.us","nsn.us","ak.us","al.us","ar.us","as.us","az.us","ca.us","co.us","ct.us","dc.us","de.us","fl.us","ga.us","gu.us","hi.us","ia.us","id.us","il.us","in.us","ks.us","ky.us","la.us","ma.us","md.us","me.us","mi.us","mn.us","mo.us","ms.us","mt.us","nc.us","nd.us","ne.us","nh.us","nj.us","nm.us","nv.us","ny.us","oh.us","ok.us","or.us","pa.us","pr.us","ri.us","sc.us","sd.us","tn.us","tx.us","ut.us","vi.us","vt.us","va.us","wa.us","wi.us","wv.us","wy.us","k12.ak.us","k12.al.us","k12.ar.us","k12.as.us","k12.az.us","k12.ca.us","k12.co.us","k12.ct.us","k12.dc.us","k12.de.us","k12.fl.us","k12.ga.us","k12.gu.us","k12.ia.us","k12.id.us","k12.il.us","k12.in.us","k12.ks.us","k12.ky.us","k12.la.us","k12.ma.us","k12.md.us","k12.me.us","k12.mi.us","k12.mn.us","k12.mo.us","k12.ms.us","k12.mt.us","k12.nc.us","k12.ne.us","k12.nh.us","k12.nj.us","k12.nm.us","k12.nv.us","k12.ny.us","k12.oh.us","k12.ok.us","k12.or.us","k12.pa.us","k12.pr.us","k12.sc.us","k12.tn.us","k12.tx.us","k12.ut.us","k12.vi.us","k12.vt.us","k12.va.us","k12.wa.us","k12.wi.us","k12.wy.us","cc.ak.us","cc.al.us","cc.ar.us","cc.as.us","cc.az.us","cc.ca.us","cc.co.us","cc.ct.us","cc.dc.us","cc.de.us","cc.fl.us","cc.ga.us","cc.gu.us","cc.hi.us","cc.ia.us","cc.id.us","cc.il.us","cc.in.us","cc.ks.us","cc.ky.us","cc.la.us","cc.ma.us","cc.md.us","cc.me.us","cc.mi.us","cc.mn.us","cc.mo.us","cc.ms.us","cc.mt.us","cc.nc.us","cc.nd.us","cc.ne.us","cc.nh.us","cc.nj.us","cc.nm.us","cc.nv.us","cc.ny.us","cc.oh.us","cc.ok.us","cc.or.us","cc.pa.us","cc.pr.us","cc.ri.us","cc.sc.us","cc.sd.us","cc.tn.us","cc.tx.us","cc.ut.us","cc.vi.us","cc.vt.us","cc.va.us","cc.wa.us","cc.wi.us","cc.wv.us","cc.wy.us","lib.ak.us","lib.al.us","lib.ar.us","lib.as.us","lib.az.us","lib.ca.us","lib.co.us","lib.ct.us","lib.dc.us","lib.fl.us","lib.ga.us","lib.gu.us","lib.hi.us","lib.ia.us","lib.id.us","lib.il.us","lib.in.us","lib.ks.us","lib.ky.us","lib.la.us","lib.ma.us","lib.md.us","lib.me.us","lib.mi.us","lib.mn.us","lib.mo.us","lib.ms.us","lib.mt.us","lib.nc.us","lib.nd.us","lib.ne.us","lib.nh.us","lib.nj.us","lib.nm.us","lib.nv.us","lib.ny.us","lib.oh.us","lib.ok.us","lib.or.us","lib.pa.us","lib.pr.us","lib.ri.us","lib.sc.us","lib.sd.us","lib.tn.us","lib.tx.us","lib.ut.us","lib.vi.us","lib.vt.us","lib.va.us","lib.wa.us","lib.wi.us","lib.wy.us","pvt.k12.ma.us","chtr.k12.ma.us","paroch.k12.ma.us","ann-arbor.mi.us","cog.mi.us","dst.mi.us","eaton.mi.us","gen.mi.us","mus.mi.us","tec.mi.us","washtenaw.mi.us","uy","com.uy","edu.uy","gub.uy","mil.uy","net.uy","org.uy","uz","co.uz","com.uz","net.uz","org.uz","va","vc","com.vc","net.vc","org.vc","gov.vc","mil.vc","edu.vc","ve","arts.ve","co.ve","com.ve","e12.ve","edu.ve","firm.ve","gob.ve","gov.ve","info.ve","int.ve","mil.ve","net.ve","org.ve","rec.ve","store.ve","tec.ve","web.ve","vg","vi","co.vi","com.vi","k12.vi","net.vi","org.vi","vn","com.vn","net.vn","org.vn","edu.vn","gov.vn","int.vn","ac.vn","biz.vn","info.vn","name.vn","pro.vn","health.vn","vu","com.vu","edu.vu","net.vu","org.vu","wf","ws","com.ws","net.ws","org.ws","gov.ws","edu.ws","yt","امارات","հայ","বাংলা","бг","бел","中国","中國","الجزائر","مصر","ею","ευ","موريتانيا","გე","ελ","香港","公司.香港","教育.香港","政府.香港","個人.香港","網絡.香港","組織.香港","ಭಾರತ","ଭାରତ","ভাৰত","भारतम्","भारोत","ڀارت","ഭാരതം","भारत","بارت","بھارت","భారత్","ભારત","ਭਾਰਤ","ভারত","இந்தியா","ایران","ايران","عراق","الاردن","한국","қаз","ලංකා","இலங்கை","المغرب","мкд","мон","澳門","澳门","مليسيا","عمان","پاکستان","پاكستان","فلسطين","срб","пр.срб","орг.срб","обр.срб","од.срб","упр.срб","ак.срб","рф","قطر","السعودية","السعودیة","السعودیۃ","السعوديه","سودان","新加坡","சிங்கப்பூர்","سورية","سوريا","ไทย","ศึกษา.ไทย","ธุรกิจ.ไทย","รัฐบาล.ไทย","ทหาร.ไทย","เน็ต.ไทย","องค์กร.ไทย","تونس","台灣","台湾","臺灣","укр","اليمن","xxx","*.ye","ac.za","agric.za","alt.za","co.za","edu.za","gov.za","grondar.za","law.za","mil.za","net.za","ngo.za","nic.za","nis.za","nom.za","org.za","school.za","tm.za","web.za","zm","ac.zm","biz.zm","co.zm","com.zm","edu.zm","gov.zm","info.zm","mil.zm","net.zm","org.zm","sch.zm","zw","ac.zw","co.zw","gov.zw","mil.zw","org.zw","aaa","aarp","abarth","abb","abbott","abbvie","abc","able","abogado","abudhabi","academy","accenture","accountant","accountants","aco","actor","adac","ads","adult","aeg","aetna","afamilycompany","afl","africa","agakhan","agency","aig","aigo","airbus","airforce","airtel","akdn","alfaromeo","alibaba","alipay","allfinanz","allstate","ally","alsace","alstom","amazon","americanexpress","americanfamily","amex","amfam","amica","amsterdam","analytics","android","anquan","anz","aol","apartments","app","apple","aquarelle","arab","aramco","archi","army","art","arte","asda","associates","athleta","attorney","auction","audi","audible","audio","auspost","author","auto","autos","avianca","aws","axa","azure","baby","baidu","banamex","bananarepublic","band","bank","bar","barcelona","barclaycard","barclays","barefoot","bargains","baseball","basketball","bauhaus","bayern","bbc","bbt","bbva","bcg","bcn","beats","beauty","beer","bentley","berlin","best","bestbuy","bet","bharti","bible","bid","bike","bing","bingo","bio","black","blackfriday","blockbuster","blog","bloomberg","blue","bms","bmw","bnpparibas","boats","boehringer","bofa","bom","bond","boo","book","booking","bosch","bostik","boston","bot","boutique","box","bradesco","bridgestone","broadway","broker","brother","brussels","budapest","bugatti","build","builders","business","buy","buzz","bzh","cab","cafe","cal","call","calvinklein","cam","camera","camp","cancerresearch","canon","capetown","capital","capitalone","car","caravan","cards","care","career","careers","cars","casa","case","caseih","cash","casino","catering","catholic","cba","cbn","cbre","cbs","ceb","center","ceo","cern","cfa","cfd","chanel","channel","charity","chase","chat","cheap","chintai","christmas","chrome","church","cipriani","circle","cisco","citadel","citi","citic","city","cityeats","claims","cleaning","click","clinic","clinique","clothing","cloud","club","clubmed","coach","codes","coffee","college","cologne","comcast","commbank","community","company","compare","computer","comsec","condos","construction","consulting","contact","contractors","cooking","cookingchannel","cool","corsica","country","coupon","coupons","courses","cpa","credit","creditcard","creditunion","cricket","crown","crs","cruise","cruises","csc","cuisinella","cymru","cyou","dabur","dad","dance","data","date","dating","datsun","day","dclk","dds","deal","dealer","deals","degree","delivery","dell","deloitte","delta","democrat","dental","dentist","desi","design","dev","dhl","diamonds","diet","digital","direct","directory","discount","discover","dish","diy","dnp","docs","doctor","dog","domains","dot","download","drive","dtv","dubai","duck","dunlop","dupont","durban","dvag","dvr","earth","eat","eco","edeka","education","email","emerck","energy","engineer","engineering","enterprises","epson","equipment","ericsson","erni","esq","estate","esurance","etisalat","eurovision","eus","events","exchange","expert","exposed","express","extraspace","fage","fail","fairwinds","faith","family","fan","fans","farm","farmers","fashion","fast","fedex","feedback","ferrari","ferrero","fiat","fidelity","fido","film","final","finance","financial","fire","firestone","firmdale","fish","fishing","fit","fitness","flickr","flights","flir","florist","flowers","fly","foo","food","foodnetwork","football","ford","forex","forsale","forum","foundation","fox","free","fresenius","frl","frogans","frontdoor","frontier","ftr","fujitsu","fujixerox","fun","fund","furniture","futbol","fyi","gal","gallery","gallo","gallup","game","games","gap","garden","gay","gbiz","gdn","gea","gent","genting","george","ggee","gift","gifts","gives","giving","glade","glass","gle","global","globo","gmail","gmbh","gmo","gmx","godaddy","gold","goldpoint","golf","goo","goodyear","goog","google","gop","got","grainger","graphics","gratis","green","gripe","grocery","group","guardian","gucci","guge","guide","guitars","guru","hair","hamburg","hangout","haus","hbo","hdfc","hdfcbank","health","healthcare","help","helsinki","here","hermes","hgtv","hiphop","hisamitsu","hitachi","hiv","hkt","hockey","holdings","holiday","homedepot","homegoods","homes","homesense","honda","horse","hospital","host","hosting","hot","hoteles","hotels","hotmail","house","how","hsbc","hughes","hyatt","hyundai","ibm","icbc","ice","icu","ieee","ifm","ikano","imamat","imdb","immo","immobilien","inc","industries","infiniti","ing","ink","institute","insurance","insure","intel","international","intuit","investments","ipiranga","irish","ismaili","ist","istanbul","itau","itv","iveco","jaguar","java","jcb","jcp","jeep","jetzt","jewelry","jio","jll","jmp","jnj","joburg","jot","joy","jpmorgan","jprs","juegos","juniper","kaufen","kddi","kerryhotels","kerrylogistics","kerryproperties","kfh","kia","kim","kinder","kindle","kitchen","kiwi","koeln","komatsu","kosher","kpmg","kpn","krd","kred","kuokgroup","kyoto","lacaixa","lamborghini","lamer","lancaster","lancia","land","landrover","lanxess","lasalle","lat","latino","latrobe","law","lawyer","lds","lease","leclerc","lefrak","legal","lego","lexus","lgbt","lidl","life","lifeinsurance","lifestyle","lighting","like","lilly","limited","limo","lincoln","linde","link","lipsy","live","living","lixil","llc","llp","loan","loans","locker","locus","loft","lol","london","lotte","lotto","love","lpl","lplfinancial","ltd","ltda","lundbeck","lupin","luxe","luxury","macys","madrid","maif","maison","makeup","man","management","mango","map","market","marketing","markets","marriott","marshalls","maserati","mattel","mba","mckinsey","med","media","meet","melbourne","meme","memorial","men","menu","merckmsd","metlife","miami","microsoft","mini","mint","mit","mitsubishi","mlb","mls","mma","mobile","moda","moe","moi","mom","monash","money","monster","mormon","mortgage","moscow","moto","motorcycles","mov","movie","msd","mtn","mtr","mutual","nab","nagoya","nationwide","natura","navy","nba","nec","netbank","netflix","network","neustar","new","newholland","news","next","nextdirect","nexus","nfl","ngo","nhk","nico","nike","nikon","ninja","nissan","nissay","nokia","northwesternmutual","norton","now","nowruz","nowtv","nra","nrw","ntt","nyc","obi","observer","off","office","okinawa","olayan","olayangroup","oldnavy","ollo","omega","one","ong","onl","online","onyourside","ooo","open","oracle","orange","organic","origins","osaka","otsuka","ott","ovh","page","panasonic","paris","pars","partners","parts","party","passagens","pay","pccw","pet","pfizer","pharmacy","phd","philips","phone","photo","photography","photos","physio","pics","pictet","pictures","pid","pin","ping","pink","pioneer","pizza","place","play","playstation","plumbing","plus","pnc","pohl","poker","politie","porn","pramerica","praxi","press","prime","prod","productions","prof","progressive","promo","properties","property","protection","pru","prudential","pub","pwc","qpon","quebec","quest","qvc","racing","radio","raid","read","realestate","realtor","realty","recipes","red","redstone","redumbrella","rehab","reise","reisen","reit","reliance","ren","rent","rentals","repair","report","republican","rest","restaurant","review","reviews","rexroth","rich","richardli","ricoh","rightathome","ril","rio","rip","rmit","rocher","rocks","rodeo","rogers","room","rsvp","rugby","ruhr","run","rwe","ryukyu","saarland","safe","safety","sakura","sale","salon","samsclub","samsung","sandvik","sandvikcoromant","sanofi","sap","sarl","sas","save","saxo","sbi","sbs","sca","scb","schaeffler","schmidt","scholarships","school","schule","schwarz","science","scjohnson","scor","scot","search","seat","secure","security","seek","select","sener","services","ses","seven","sew","sex","sexy","sfr","shangrila","sharp","shaw","shell","shia","shiksha","shoes","shop","shopping","shouji","show","showtime","shriram","silk","sina","singles","site","ski","skin","sky","skype","sling","smart","smile","sncf","soccer","social","softbank","software","sohu","solar","solutions","song","sony","soy","spa","space","sport","spot","spreadbetting","srl","stada","staples","star","statebank","statefarm","stc","stcgroup","stockholm","storage","store","stream","studio","study","style","sucks","supplies","supply","support","surf","surgery","suzuki","swatch","swiftcover","swiss","sydney","symantec","systems","tab","taipei","talk","taobao","target","tatamotors","tatar","tattoo","tax","taxi","tci","tdk","team","tech","technology","temasek","tennis","teva","thd","theater","theatre","tiaa","tickets","tienda","tiffany","tips","tires","tirol","tjmaxx","tjx","tkmaxx","tmall","today","tokyo","tools","top","toray","toshiba","total","tours","town","toyota","toys","trade","trading","training","travel","travelchannel","travelers","travelersinsurance","trust","trv","tube","tui","tunes","tushu","tvs","ubank","ubs","unicom","university","uno","uol","ups","vacations","vana","vanguard","vegas","ventures","verisign","versicherung","vet","viajes","video","vig","viking","villas","vin","vip","virgin","visa","vision","viva","vivo","vlaanderen","vodka","volkswagen","volvo","vote","voting","voto","voyage","vuelos","wales","walmart","walter","wang","wanggou","watch","watches","weather","weatherchannel","webcam","weber","website","wed","wedding","weibo","weir","whoswho","wien","wiki","williamhill","win","windows","wine","winners","wme","wolterskluwer","woodside","work","works","world","wow","wtc","wtf","xbox","xerox","xfinity","xihuan","xin","कॉम","セール","佛山","慈善","集团","在线","大众汽车","点看","คอม","八卦","موقع","公益","公司","香格里拉","网站","移动","我爱你","москва","католик","онлайн","сайт","联通","קום","时尚","微博","淡马锡","ファッション","орг","नेट","ストア","アマゾン","삼성","商标","商店","商城","дети","ポイント","新闻","家電","كوم","中文网","中信","娱乐","谷歌","電訊盈科","购物","クラウド","通販","网店","संगठन","餐厅","网络","ком","亚马逊","诺基亚","食品","飞利浦","手表","手机","ارامكو","العليان","اتصالات","بازار","ابوظبي","كاثوليك","همراه","닷컴","政府","شبكة","بيتك","عرب","机构","组织机构","健康","招聘","рус","珠宝","大拿","みんな","グーグル","世界","書籍","网址","닷넷","コム","天主教","游戏","vermögensberater","vermögensberatung","企业","信息","嘉里大酒店","嘉里","广东","政务","xyz","yachts","yahoo","yamaxun","yandex","yodobashi","yoga","yokohama","you","youtube","yun","zappos","zara","zero","zip","zone","zuerich","cc.ua","inf.ua","ltd.ua","adobeaemcloud.com","adobeaemcloud.net","*.dev.adobeaemcloud.com","beep.pl","barsy.ca","*.compute.estate","*.alces.network","altervista.org","alwaysdata.net","cloudfront.net","*.compute.amazonaws.com","*.compute-1.amazonaws.com","*.compute.amazonaws.com.cn","us-east-1.amazonaws.com","cn-north-1.eb.amazonaws.com.cn","cn-northwest-1.eb.amazonaws.com.cn","elasticbeanstalk.com","ap-northeast-1.elasticbeanstalk.com","ap-northeast-2.elasticbeanstalk.com","ap-northeast-3.elasticbeanstalk.com","ap-south-1.elasticbeanstalk.com","ap-southeast-1.elasticbeanstalk.com","ap-southeast-2.elasticbeanstalk.com","ca-central-1.elasticbeanstalk.com","eu-central-1.elasticbeanstalk.com","eu-west-1.elasticbeanstalk.com","eu-west-2.elasticbeanstalk.com","eu-west-3.elasticbeanstalk.com","sa-east-1.elasticbeanstalk.com","us-east-1.elasticbeanstalk.com","us-east-2.elasticbeanstalk.com","us-gov-west-1.elasticbeanstalk.com","us-west-1.elasticbeanstalk.com","us-west-2.elasticbeanstalk.com","*.elb.amazonaws.com","*.elb.amazonaws.com.cn","s3.amazonaws.com","s3-ap-northeast-1.amazonaws.com","s3-ap-northeast-2.amazonaws.com","s3-ap-south-1.amazonaws.com","s3-ap-southeast-1.amazonaws.com","s3-ap-southeast-2.amazonaws.com","s3-ca-central-1.amazonaws.com","s3-eu-central-1.amazonaws.com","s3-eu-west-1.amazonaws.com","s3-eu-west-2.amazonaws.com","s3-eu-west-3.amazonaws.com","s3-external-1.amazonaws.com","s3-fips-us-gov-west-1.amazonaws.com","s3-sa-east-1.amazonaws.com","s3-us-gov-west-1.amazonaws.com","s3-us-east-2.amazonaws.com","s3-us-west-1.amazonaws.com","s3-us-west-2.amazonaws.com","s3.ap-northeast-2.amazonaws.com","s3.ap-south-1.amazonaws.com","s3.cn-north-1.amazonaws.com.cn","s3.ca-central-1.amazonaws.com","s3.eu-central-1.amazonaws.com","s3.eu-west-2.amazonaws.com","s3.eu-west-3.amazonaws.com","s3.us-east-2.amazonaws.com","s3.dualstack.ap-northeast-1.amazonaws.com","s3.dualstack.ap-northeast-2.amazonaws.com","s3.dualstack.ap-south-1.amazonaws.com","s3.dualstack.ap-southeast-1.amazonaws.com","s3.dualstack.ap-southeast-2.amazonaws.com","s3.dualstack.ca-central-1.amazonaws.com","s3.dualstack.eu-central-1.amazonaws.com","s3.dualstack.eu-west-1.amazonaws.com","s3.dualstack.eu-west-2.amazonaws.com","s3.dualstack.eu-west-3.amazonaws.com","s3.dualstack.sa-east-1.amazonaws.com","s3.dualstack.us-east-1.amazonaws.com","s3.dualstack.us-east-2.amazonaws.com","s3-website-us-east-1.amazonaws.com","s3-website-us-west-1.amazonaws.com","s3-website-us-west-2.amazonaws.com","s3-website-ap-northeast-1.amazonaws.com","s3-website-ap-southeast-1.amazonaws.com","s3-website-ap-southeast-2.amazonaws.com","s3-website-eu-west-1.amazonaws.com","s3-website-sa-east-1.amazonaws.com","s3-website.ap-northeast-2.amazonaws.com","s3-website.ap-south-1.amazonaws.com","s3-website.ca-central-1.amazonaws.com","s3-website.eu-central-1.amazonaws.com","s3-website.eu-west-2.amazonaws.com","s3-website.eu-west-3.amazonaws.com","s3-website.us-east-2.amazonaws.com","amsw.nl","t3l3p0rt.net","tele.amune.org","apigee.io","on-aptible.com","user.aseinet.ne.jp","gv.vc","d.gv.vc","user.party.eus","pimienta.org","poivron.org","potager.org","sweetpepper.org","myasustor.com","myfritz.net","*.awdev.ca","*.advisor.ws","b-data.io","backplaneapp.io","balena-devices.com","app.banzaicloud.io","betainabox.com","bnr.la","blackbaudcdn.net","boomla.net","boxfuse.io","square7.ch","bplaced.com","bplaced.de","square7.de","bplaced.net","square7.net","browsersafetymark.io","uk0.bigv.io","dh.bytemark.co.uk","vm.bytemark.co.uk","mycd.eu","carrd.co","crd.co","uwu.ai","ae.org","ar.com","br.com","cn.com","com.de","com.se","de.com","eu.com","gb.com","gb.net","hu.com","hu.net","jp.net","jpn.com","kr.com","mex.com","no.com","qc.com","ru.com","sa.com","se.net","uk.com","uk.net","us.com","uy.com","za.bz","za.com","africa.com","gr.com","in.net","us.org","co.com","c.la","certmgr.org","xenapponazure.com","discourse.group","discourse.team","virtueeldomein.nl","cleverapps.io","*.lcl.dev","*.stg.dev","clic2000.net","c66.me","cloud66.ws","cloud66.zone","jdevcloud.com","wpdevcloud.com","cloudaccess.host","freesite.host","cloudaccess.net","cloudcontrolled.com","cloudcontrolapp.com","cloudera.site","trycloudflare.com","workers.dev","wnext.app","co.ca","*.otap.co","co.cz","c.cdn77.org","cdn77-ssl.net","r.cdn77.net","rsc.cdn77.org","ssl.origin.cdn77-secure.org","cloudns.asia","cloudns.biz","cloudns.club","cloudns.cc","cloudns.eu","cloudns.in","cloudns.info","cloudns.org","cloudns.pro","cloudns.pw","cloudns.us","cloudeity.net","cnpy.gdn","co.nl","co.no","webhosting.be","hosting-cluster.nl","ac.ru","edu.ru","gov.ru","int.ru","mil.ru","test.ru","dyn.cosidns.de","dynamisches-dns.de","dnsupdater.de","internet-dns.de","l-o-g-i-n.de","dynamic-dns.info","feste-ip.net","knx-server.net","static-access.net","realm.cz","*.cryptonomic.net","cupcake.is","curv.dev","*.customer-oci.com","*.oci.customer-oci.com","*.ocp.customer-oci.com","*.ocs.customer-oci.com","cyon.link","cyon.site","daplie.me","localhost.daplie.me","dattolocal.com","dattorelay.com","dattoweb.com","mydatto.com","dattolocal.net","mydatto.net","biz.dk","co.dk","firm.dk","reg.dk","store.dk","dyndns.dappnode.io","*.dapps.earth","*.bzz.dapps.earth","builtwithdark.com","edgestack.me","debian.net","dedyn.io","dnshome.de","online.th","shop.th","drayddns.com","dreamhosters.com","mydrobo.com","drud.io","drud.us","duckdns.org","dy.fi","tunk.org","dyndns-at-home.com","dyndns-at-work.com","dyndns-blog.com","dyndns-free.com","dyndns-home.com","dyndns-ip.com","dyndns-mail.com","dyndns-office.com","dyndns-pics.com","dyndns-remote.com","dyndns-server.com","dyndns-web.com","dyndns-wiki.com","dyndns-work.com","dyndns.biz","dyndns.info","dyndns.org","dyndns.tv","at-band-camp.net","ath.cx","barrel-of-knowledge.info","barrell-of-knowledge.info","better-than.tv","blogdns.com","blogdns.net","blogdns.org","blogsite.org","boldlygoingnowhere.org","broke-it.net","buyshouses.net","cechire.com","dnsalias.com","dnsalias.net","dnsalias.org","dnsdojo.com","dnsdojo.net","dnsdojo.org","does-it.net","doesntexist.com","doesntexist.org","dontexist.com","dontexist.net","dontexist.org","doomdns.com","doomdns.org","dvrdns.org","dyn-o-saur.com","dynalias.com","dynalias.net","dynalias.org","dynathome.net","dyndns.ws","endofinternet.net","endofinternet.org","endoftheinternet.org","est-a-la-maison.com","est-a-la-masion.com","est-le-patron.com","est-mon-blogueur.com","for-better.biz","for-more.biz","for-our.info","for-some.biz","for-the.biz","forgot.her.name","forgot.his.name","from-ak.com","from-al.com","from-ar.com","from-az.net","from-ca.com","from-co.net","from-ct.com","from-dc.com","from-de.com","from-fl.com","from-ga.com","from-hi.com","from-ia.com","from-id.com","from-il.com","from-in.com","from-ks.com","from-ky.com","from-la.net","from-ma.com","from-md.com","from-me.org","from-mi.com","from-mn.com","from-mo.com","from-ms.com","from-mt.com","from-nc.com","from-nd.com","from-ne.com","from-nh.com","from-nj.com","from-nm.com","from-nv.com","from-ny.net","from-oh.com","from-ok.com","from-or.com","from-pa.com","from-pr.com","from-ri.com","from-sc.com","from-sd.com","from-tn.com","from-tx.com","from-ut.com","from-va.com","from-vt.com","from-wa.com","from-wi.com","from-wv.com","from-wy.com","ftpaccess.cc","fuettertdasnetz.de","game-host.org","game-server.cc","getmyip.com","gets-it.net","go.dyndns.org","gotdns.com","gotdns.org","groks-the.info","groks-this.info","ham-radio-op.net","here-for-more.info","hobby-site.com","hobby-site.org","home.dyndns.org","homedns.org","homeftp.net","homeftp.org","homeip.net","homelinux.com","homelinux.net","homelinux.org","homeunix.com","homeunix.net","homeunix.org","iamallama.com","in-the-band.net","is-a-anarchist.com","is-a-blogger.com","is-a-bookkeeper.com","is-a-bruinsfan.org","is-a-bulls-fan.com","is-a-candidate.org","is-a-caterer.com","is-a-celticsfan.org","is-a-chef.com","is-a-chef.net","is-a-chef.org","is-a-conservative.com","is-a-cpa.com","is-a-cubicle-slave.com","is-a-democrat.com","is-a-designer.com","is-a-doctor.com","is-a-financialadvisor.com","is-a-geek.com","is-a-geek.net","is-a-geek.org","is-a-green.com","is-a-guru.com","is-a-hard-worker.com","is-a-hunter.com","is-a-knight.org","is-a-landscaper.com","is-a-lawyer.com","is-a-liberal.com","is-a-libertarian.com","is-a-linux-user.org","is-a-llama.com","is-a-musician.com","is-a-nascarfan.com","is-a-nurse.com","is-a-painter.com","is-a-patsfan.org","is-a-personaltrainer.com","is-a-photographer.com","is-a-player.com","is-a-republican.com","is-a-rockstar.com","is-a-socialist.com","is-a-soxfan.org","is-a-student.com","is-a-teacher.com","is-a-techie.com","is-a-therapist.com","is-an-accountant.com","is-an-actor.com","is-an-actress.com","is-an-anarchist.com","is-an-artist.com","is-an-engineer.com","is-an-entertainer.com","is-by.us","is-certified.com","is-found.org","is-gone.com","is-into-anime.com","is-into-cars.com","is-into-cartoons.com","is-into-games.com","is-leet.com","is-lost.org","is-not-certified.com","is-saved.org","is-slick.com","is-uberleet.com","is-very-bad.org","is-very-evil.org","is-very-good.org","is-very-nice.org","is-very-sweet.org","is-with-theband.com","isa-geek.com","isa-geek.net","isa-geek.org","isa-hockeynut.com","issmarterthanyou.com","isteingeek.de","istmein.de","kicks-ass.net","kicks-ass.org","knowsitall.info","land-4-sale.us","lebtimnetz.de","leitungsen.de","likes-pie.com","likescandy.com","merseine.nu","mine.nu","misconfused.org","mypets.ws","myphotos.cc","neat-url.com","office-on-the.net","on-the-web.tv","podzone.net","podzone.org","readmyblog.org","saves-the-whales.com","scrapper-site.net","scrapping.cc","selfip.biz","selfip.com","selfip.info","selfip.net","selfip.org","sells-for-less.com","sells-for-u.com","sells-it.net","sellsyourhome.org","servebbs.com","servebbs.net","servebbs.org","serveftp.net","serveftp.org","servegame.org","shacknet.nu","simple-url.com","space-to-rent.com","stuff-4-sale.org","stuff-4-sale.us","teaches-yoga.com","thruhere.net","traeumtgerade.de","webhop.biz","webhop.info","webhop.net","webhop.org","worse-than.tv","writesthisblog.com","ddnss.de","dyn.ddnss.de","dyndns.ddnss.de","dyndns1.de","dyn-ip24.de","home-webserver.de","dyn.home-webserver.de","myhome-server.de","ddnss.org","definima.net","definima.io","bci.dnstrace.pro","ddnsfree.com","ddnsgeek.com","giize.com","gleeze.com","kozow.com","loseyourip.com","ooguy.com","theworkpc.com","casacam.net","dynu.net","accesscam.org","camdvr.org","freeddns.org","mywire.org","webredirect.org","myddns.rocks","blogsite.xyz","dynv6.net","e4.cz","en-root.fr","mytuleap.com","onred.one","staging.onred.one","enonic.io","customer.enonic.io","eu.org","al.eu.org","asso.eu.org","at.eu.org","au.eu.org","be.eu.org","bg.eu.org","ca.eu.org","cd.eu.org","ch.eu.org","cn.eu.org","cy.eu.org","cz.eu.org","de.eu.org","dk.eu.org","edu.eu.org","ee.eu.org","es.eu.org","fi.eu.org","fr.eu.org","gr.eu.org","hr.eu.org","hu.eu.org","ie.eu.org","il.eu.org","in.eu.org","int.eu.org","is.eu.org","it.eu.org","jp.eu.org","kr.eu.org","lt.eu.org","lu.eu.org","lv.eu.org","mc.eu.org","me.eu.org","mk.eu.org","mt.eu.org","my.eu.org","net.eu.org","ng.eu.org","nl.eu.org","no.eu.org","nz.eu.org","paris.eu.org","pl.eu.org","pt.eu.org","q-a.eu.org","ro.eu.org","ru.eu.org","se.eu.org","si.eu.org","sk.eu.org","tr.eu.org","uk.eu.org","us.eu.org","eu-1.evennode.com","eu-2.evennode.com","eu-3.evennode.com","eu-4.evennode.com","us-1.evennode.com","us-2.evennode.com","us-3.evennode.com","us-4.evennode.com","twmail.cc","twmail.net","twmail.org","mymailer.com.tw","url.tw","onfabrica.com","apps.fbsbx.com","ru.net","adygeya.ru","bashkiria.ru","bir.ru","cbg.ru","com.ru","dagestan.ru","grozny.ru","kalmykia.ru","kustanai.ru","marine.ru","mordovia.ru","msk.ru","mytis.ru","nalchik.ru","nov.ru","pyatigorsk.ru","spb.ru","vladikavkaz.ru","vladimir.ru","abkhazia.su","adygeya.su","aktyubinsk.su","arkhangelsk.su","armenia.su","ashgabad.su","azerbaijan.su","balashov.su","bashkiria.su","bryansk.su","bukhara.su","chimkent.su","dagestan.su","east-kazakhstan.su","exnet.su","georgia.su","grozny.su","ivanovo.su","jambyl.su","kalmykia.su","kaluga.su","karacol.su","karaganda.su","karelia.su","khakassia.su","krasnodar.su","kurgan.su","kustanai.su","lenug.su","mangyshlak.su","mordovia.su","msk.su","murmansk.su","nalchik.su","navoi.su","north-kazakhstan.su","nov.su","obninsk.su","penza.su","pokrovsk.su","sochi.su","spb.su","tashkent.su","termez.su","togliatti.su","troitsk.su","tselinograd.su","tula.su","tuva.su","vladikavkaz.su","vladimir.su","vologda.su","channelsdvr.net","u.channelsdvr.net","fastly-terrarium.com","fastlylb.net","map.fastlylb.net","freetls.fastly.net","map.fastly.net","a.prod.fastly.net","global.prod.fastly.net","a.ssl.fastly.net","b.ssl.fastly.net","global.ssl.fastly.net","fastpanel.direct","fastvps-server.com","myfast.space","myfast.host","fastvps.site","fastvps.host","fhapp.xyz","fedorainfracloud.org","fedorapeople.org","cloud.fedoraproject.org","app.os.fedoraproject.org","app.os.stg.fedoraproject.org","conn.uk","copro.uk","couk.me","ukco.me","mydobiss.com","filegear.me","filegear-au.me","filegear-de.me","filegear-gb.me","filegear-ie.me","filegear-jp.me","filegear-sg.me","firebaseapp.com","flynnhosting.net","0e.vc","freebox-os.com","freeboxos.com","fbx-os.fr","fbxos.fr","freebox-os.fr","freeboxos.fr","freedesktop.org","*.futurecms.at","*.ex.futurecms.at","*.in.futurecms.at","futurehosting.at","futuremailing.at","*.ex.ortsinfo.at","*.kunden.ortsinfo.at","*.statics.cloud","service.gov.uk","gehirn.ne.jp","usercontent.jp","gentapps.com","lab.ms","github.io","githubusercontent.com","gitlab.io","glitch.me","lolipop.io","cloudapps.digital","london.cloudapps.digital","homeoffice.gov.uk","ro.im","shop.ro","goip.de","run.app","a.run.app","web.app","*.0emm.com","appspot.com","*.r.appspot.com","blogspot.ae","blogspot.al","blogspot.am","blogspot.ba","blogspot.be","blogspot.bg","blogspot.bj","blogspot.ca","blogspot.cf","blogspot.ch","blogspot.cl","blogspot.co.at","blogspot.co.id","blogspot.co.il","blogspot.co.ke","blogspot.co.nz","blogspot.co.uk","blogspot.co.za","blogspot.com","blogspot.com.ar","blogspot.com.au","blogspot.com.br","blogspot.com.by","blogspot.com.co","blogspot.com.cy","blogspot.com.ee","blogspot.com.eg","blogspot.com.es","blogspot.com.mt","blogspot.com.ng","blogspot.com.tr","blogspot.com.uy","blogspot.cv","blogspot.cz","blogspot.de","blogspot.dk","blogspot.fi","blogspot.fr","blogspot.gr","blogspot.hk","blogspot.hr","blogspot.hu","blogspot.ie","blogspot.in","blogspot.is","blogspot.it","blogspot.jp","blogspot.kr","blogspot.li","blogspot.lt","blogspot.lu","blogspot.md","blogspot.mk","blogspot.mr","blogspot.mx","blogspot.my","blogspot.nl","blogspot.no","blogspot.pe","blogspot.pt","blogspot.qa","blogspot.re","blogspot.ro","blogspot.rs","blogspot.ru","blogspot.se","blogspot.sg","blogspot.si","blogspot.sk","blogspot.sn","blogspot.td","blogspot.tw","blogspot.ug","blogspot.vn","cloudfunctions.net","cloud.goog","codespot.com","googleapis.com","googlecode.com","pagespeedmobilizer.com","publishproxy.com","withgoogle.com","withyoutube.com","graphox.us","awsmppl.com","fin.ci","free.hr","caa.li","ua.rs","conf.se","hs.zone","hs.run","hashbang.sh","hasura.app","hasura-app.io","hepforge.org","herokuapp.com","herokussl.com","myravendb.com","ravendb.community","ravendb.me","development.run","ravendb.run","bpl.biz","orx.biz","ng.city","biz.gl","ng.ink","col.ng","firm.ng","gen.ng","ltd.ng","ngo.ng","ng.school","sch.so","häkkinen.fi","*.moonscale.io","moonscale.net","iki.fi","dyn-berlin.de","in-berlin.de","in-brb.de","in-butter.de","in-dsl.de","in-dsl.net","in-dsl.org","in-vpn.de","in-vpn.net","in-vpn.org","biz.at","info.at","info.cx","ac.leg.br","al.leg.br","am.leg.br","ap.leg.br","ba.leg.br","ce.leg.br","df.leg.br","es.leg.br","go.leg.br","ma.leg.br","mg.leg.br","ms.leg.br","mt.leg.br","pa.leg.br","pb.leg.br","pe.leg.br","pi.leg.br","pr.leg.br","rj.leg.br","rn.leg.br","ro.leg.br","rr.leg.br","rs.leg.br","sc.leg.br","se.leg.br","sp.leg.br","to.leg.br","pixolino.com","ipifony.net","mein-iserv.de","schulserver.de","test-iserv.de","iserv.dev","iobb.net","myjino.ru","*.hosting.myjino.ru","*.landing.myjino.ru","*.spectrum.myjino.ru","*.vps.myjino.ru","*.triton.zone","*.cns.joyent.com","js.org","kaas.gg","khplay.nl","keymachine.de","kinghost.net","uni5.net","knightpoint.systems","oya.to","co.krd","edu.krd","git-repos.de","lcube-server.de","svn-repos.de","leadpages.co","lpages.co","lpusercontent.com","lelux.site","co.business","co.education","co.events","co.financial","co.network","co.place","co.technology","app.lmpm.com","linkitools.space","linkyard.cloud","linkyard-cloud.ch","members.linode.com","nodebalancer.linode.com","we.bs","loginline.app","loginline.dev","loginline.io","loginline.services","loginline.site","krasnik.pl","leczna.pl","lubartow.pl","lublin.pl","poniatowa.pl","swidnik.pl","uklugs.org","glug.org.uk","lug.org.uk","lugs.org.uk","barsy.bg","barsy.co.uk","barsyonline.co.uk","barsycenter.com","barsyonline.com","barsy.club","barsy.de","barsy.eu","barsy.in","barsy.info","barsy.io","barsy.me","barsy.menu","barsy.mobi","barsy.net","barsy.online","barsy.org","barsy.pro","barsy.pub","barsy.shop","barsy.site","barsy.support","barsy.uk","*.magentosite.cloud","mayfirst.info","mayfirst.org","hb.cldmail.ru","miniserver.com","memset.net","cloud.metacentrum.cz","custom.metacentrum.cz","flt.cloud.muni.cz","usr.cloud.muni.cz","meteorapp.com","eu.meteorapp.com","co.pl","*.azurecontainer.io","azurewebsites.net","azure-mobile.net","cloudapp.net","mozilla-iot.org","bmoattachments.org","net.ru","org.ru","pp.ru","ui.nabu.casa","pony.club","of.fashion","on.fashion","of.football","in.london","of.london","for.men","and.mom","for.mom","for.one","for.sale","of.work","to.work","nctu.me","bitballoon.com","netlify.app","netlify.com","4u.com","ngrok.io","nh-serv.co.uk","nfshost.com","dnsking.ch","mypi.co","n4t.co","001www.com","ddnslive.com","myiphost.com","forumz.info","16-b.it","32-b.it","64-b.it","soundcast.me","tcp4.me","dnsup.net","hicam.net","now-dns.net","ownip.net","vpndns.net","dynserv.org","now-dns.org","x443.pw","now-dns.top","ntdll.top","freeddns.us","crafting.xyz","zapto.xyz","nsupdate.info","nerdpol.ovh","blogsyte.com","brasilia.me","cable-modem.org","ciscofreak.com","collegefan.org","couchpotatofries.org","damnserver.com","ddns.me","ditchyourip.com","dnsfor.me","dnsiskinky.com","dvrcam.info","dynns.com","eating-organic.net","fantasyleague.cc","geekgalaxy.com","golffan.us","health-carereform.com","homesecuritymac.com","homesecuritypc.com","hopto.me","ilovecollege.info","loginto.me","mlbfan.org","mmafan.biz","myactivedirectory.com","mydissent.net","myeffect.net","mymediapc.net","mypsx.net","mysecuritycamera.com","mysecuritycamera.net","mysecuritycamera.org","net-freaks.com","nflfan.org","nhlfan.net","no-ip.ca","no-ip.co.uk","no-ip.net","noip.us","onthewifi.com","pgafan.net","point2this.com","pointto.us","privatizehealthinsurance.net","quicksytes.com","read-books.org","securitytactics.com","serveexchange.com","servehumour.com","servep2p.com","servesarcasm.com","stufftoread.com","ufcfan.org","unusualperson.com","workisboring.com","3utilities.com","bounceme.net","ddns.net","ddnsking.com","gotdns.ch","hopto.org","myftp.biz","myftp.org","myvnc.com","no-ip.biz","no-ip.info","no-ip.org","noip.me","redirectme.net","servebeer.com","serveblog.net","servecounterstrike.com","serveftp.com","servegame.com","servehalflife.com","servehttp.com","serveirc.com","serveminecraft.net","servemp3.com","servepics.com","servequake.com","sytes.net","webhop.me","zapto.org","stage.nodeart.io","nodum.co","nodum.io","pcloud.host","nyc.mn","nom.ae","nom.af","nom.ai","nom.al","nym.by","nom.bz","nym.bz","nom.cl","nym.ec","nom.gd","nom.ge","nom.gl","nym.gr","nom.gt","nym.gy","nym.hk","nom.hn","nym.ie","nom.im","nom.ke","nym.kz","nym.la","nym.lc","nom.li","nym.li","nym.lt","nym.lu","nom.lv","nym.me","nom.mk","nym.mn","nym.mx","nom.nu","nym.nz","nym.pe","nym.pt","nom.pw","nom.qa","nym.ro","nom.rs","nom.si","nym.sk","nom.st","nym.su","nym.sx","nom.tj","nym.tw","nom.ug","nom.uy","nom.vc","nom.vg","static.observableusercontent.com","cya.gg","cloudycluster.net","nid.io","opencraft.hosting","operaunite.com","skygearapp.com","outsystemscloud.com","ownprovider.com","own.pm","ox.rs","oy.lc","pgfog.com","pagefrontapp.com","art.pl","gliwice.pl","krakow.pl","poznan.pl","wroc.pl","zakopane.pl","pantheonsite.io","gotpantheon.com","mypep.link","perspecta.cloud","on-web.fr","*.platform.sh","*.platformsh.site","platter-app.com","platter-app.dev","platterp.us","dyn53.io","co.bn","xen.prgmr.com","priv.at","prvcy.page","*.dweb.link","protonet.io","chirurgiens-dentistes-en-france.fr","byen.site","pubtls.org","qualifioapp.com","qbuser.com","instantcloud.cn","ras.ru","qa2.com","qcx.io","*.sys.qcx.io","dev-myqnapcloud.com","alpha-myqnapcloud.com","myqnapcloud.com","*.quipelements.com","vapor.cloud","vaporcloud.io","rackmaze.com","rackmaze.net","*.on-k3s.io","*.on-rancher.cloud","*.on-rio.io","readthedocs.io","rhcloud.com","app.render.com","onrender.com","repl.co","repl.run","resindevice.io","devices.resinstaging.io","hzc.io","wellbeingzone.eu","ptplus.fit","wellbeingzone.co.uk","git-pages.rit.edu","sandcats.io","logoip.de","logoip.com","schokokeks.net","gov.scot","scrysec.com","firewall-gateway.com","firewall-gateway.de","my-gateway.de","my-router.de","spdns.de","spdns.eu","firewall-gateway.net","my-firewall.org","myfirewall.org","spdns.org","senseering.net","biz.ua","co.ua","pp.ua","shiftedit.io","myshopblocks.com","shopitsite.com","shopware.store","mo-siemens.io","1kapp.com","appchizi.com","applinzi.com","sinaapp.com","vipsinaapp.com","siteleaf.net","bounty-full.com","alpha.bounty-full.com","beta.bounty-full.com","stackhero-network.com","static.land","dev.static.land","sites.static.land","playstation-cloud.com","apps.lair.io","*.stolos.io","spacekit.io","customer.speedpartner.de","api.stdlib.com","storj.farm","utwente.io","soc.srcf.net","user.srcf.net","temp-dns.com","applicationcloud.io","scapp.io","*.s5y.io","*.sensiosite.cloud","syncloud.it","diskstation.me","dscloud.biz","dscloud.me","dscloud.mobi","dsmynas.com","dsmynas.net","dsmynas.org","familyds.com","familyds.net","familyds.org","i234.me","myds.me","synology.me","vpnplus.to","direct.quickconnect.to","taifun-dns.de","gda.pl","gdansk.pl","gdynia.pl","med.pl","sopot.pl","edugit.org","telebit.app","telebit.io","*.telebit.xyz","gwiddle.co.uk","thingdustdata.com","cust.dev.thingdust.io","cust.disrec.thingdust.io","cust.prod.thingdust.io","cust.testing.thingdust.io","arvo.network","azimuth.network","bloxcms.com","townnews-staging.com","12hp.at","2ix.at","4lima.at","lima-city.at","12hp.ch","2ix.ch","4lima.ch","lima-city.ch","trafficplex.cloud","de.cool","12hp.de","2ix.de","4lima.de","lima-city.de","1337.pictures","clan.rip","lima-city.rocks","webspace.rocks","lima.zone","*.transurl.be","*.transurl.eu","*.transurl.nl","tuxfamily.org","dd-dns.de","diskstation.eu","diskstation.org","dray-dns.de","draydns.de","dyn-vpn.de","dynvpn.de","mein-vigor.de","my-vigor.de","my-wan.de","syno-ds.de","synology-diskstation.de","synology-ds.de","uber.space","*.uberspace.de","hk.com","hk.org","ltd.hk","inc.hk","virtualuser.de","virtual-user.de","urown.cloud","dnsupdate.info","lib.de.us","2038.io","router.management","v-info.info","voorloper.cloud","v.ua","wafflecell.com","*.webhare.dev","wedeploy.io","wedeploy.me","wedeploy.sh","remotewd.com","wmflabs.org","toolforge.org","wmcloud.org","panel.gg","daemon.panel.gg","myforum.community","community-pro.de","diskussionsbereich.de","community-pro.net","meinforum.net","half.host","xnbay.com","u2.xnbay.com","u2-local.xnbay.com","cistron.nl","demon.nl","xs4all.space","yandexcloud.net","storage.yandexcloud.net","website.yandexcloud.net","official.academy","yolasite.com","ybo.faith","yombo.me","homelink.one","ybo.party","ybo.review","ybo.science","ybo.trade","nohost.me","noho.st","za.net","za.org","now.sh","bss.design","basicserver.io","virtualserver.io","enterprisecloud.nu","mintere.site"]')
},function(e,t,n){
"use strict"
var i,a="object"==typeof Reflect?Reflect:null,o=a&&"function"==typeof a.apply?a.apply:function(e,t,n){
return Function.prototype.apply.call(e,t,n)
}
i=a&&"function"==typeof a.ownKeys?a.ownKeys:Object.getOwnPropertySymbols?function(e){
return Object.getOwnPropertyNames(e).concat(Object.getOwnPropertySymbols(e))
}:function(e){
return Object.getOwnPropertyNames(e)
}
var r=Number.isNaN||function(e){
return e!=e
}
function s(){
s.init.call(this)
}
e.exports=s,s.EventEmitter=s,s.prototype._events=void 0,s.prototype._eventsCount=0,
s.prototype._maxListeners=void 0
var u=10
function l(e){
if("function"!=typeof e){
throw new TypeError('The "listener" argument must be of type Function. Received type '+typeof e)
}
}
function c(e){
return void 0===e._maxListeners?s.defaultMaxListeners:e._maxListeners
}
function p(e,t,n,i){
var a,o,r
if(l(n),void 0===(o=e._events)?(o=e._events=Object.create(null),e._eventsCount=0):(void 0!==o.newListener&&(e.emit("newListener",t,n.listener?n.listener:n),
o=e._events),
r=o[t]),void 0===r){
r=o[t]=n,++e._eventsCount
}else if("function"==typeof r?r=o[t]=i?[n,r]:[r,n]:i?r.unshift(n):r.push(n),
(a=c(e))>0&&r.length>a&&!r.warned){
r.warned=!0
var s=new Error("Possible EventEmitter memory leak detected. "+r.length+" "+String(t)+" listeners added. Use emitter.setMaxListeners() to increase limit")
s.name="MaxListenersExceededWarning",s.emitter=e,s.type=t,s.count=r.length,console&&console.warn
}
return e
}
function m(){
if(!this.fired){
return this.target.removeListener(this.type,this.wrapFn),this.fired=!0,
0===arguments.length?this.listener.call(this.target):this.listener.apply(this.target,arguments)
}
}
function d(e,t,n){
var i={
fired:!1,
wrapFn:void 0,
target:e,
type:t,
listener:n
},a=m.bind(i)
return a.listener=n,i.wrapFn=a,a
}
function h(e,t,n){
var i=e._events
if(void 0===i){
return[]
}
var a=i[t]
return void 0===a?[]:"function"==typeof a?n?[a.listener||a]:[a]:n?function(e){
for(var t=new Array(e.length),n=0;n<t.length;++n){
t[n]=e[n].listener||e[n]
}
return t
}(a):f(a,a.length)
}
function g(e){
var t=this._events
if(void 0!==t){
var n=t[e]
if("function"==typeof n){
return 1
}
if(void 0!==n){
return n.length
}
}
return 0
}
function f(e,t){
for(var n=new Array(t),i=0;i<t;++i){
n[i]=e[i]
}
return n
}
Object.defineProperty(s,"defaultMaxListeners",{
enumerable:!0,
get:function(){
return u
},
set:function(e){
if("number"!=typeof e||e<0||r(e)){
throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received '+e+".")
}
u=e
}
}),s.init=function(){
void 0!==this._events&&this._events!==Object.getPrototypeOf(this)._events||(this._events=Object.create(null),
this._eventsCount=0),
this._maxListeners=this._maxListeners||void 0
},s.prototype.setMaxListeners=function(e){
if("number"!=typeof e||e<0||r(e)){
throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received '+e+".")
}
return this._maxListeners=e,this
},s.prototype.getMaxListeners=function(){
return c(this)
},s.prototype.emit=function(e){
for(var t=[],n=1;n<arguments.length;n++){
t.push(arguments[n])
}
var i="error"===e,a=this._events
if(void 0!==a){
i=i&&void 0===a.error
}else if(!i){
return!1
}
if(i){
var r
if(t.length>0&&(r=t[0]),r instanceof Error){
throw r
}
var s=new Error("Unhandled error."+(r?" ("+r.message+")":""))
throw s.context=r,s
}
var u=a[e]
if(void 0===u){
return!1
}
if("function"==typeof u){
o(u,this,t)
}else{
var l=u.length,c=f(u,l)
for(n=0;n<l;++n){
o(c[n],this,t)
}
}
return!0
},s.prototype.addListener=function(e,t){
return p(this,e,t,!1)
},s.prototype.on=s.prototype.addListener,s.prototype.prependListener=function(e,t){
return p(this,e,t,!0)
},s.prototype.once=function(e,t){
return l(t),this.on(e,d(this,e,t)),this
},s.prototype.prependOnceListener=function(e,t){
return l(t),this.prependListener(e,d(this,e,t)),
this
},s.prototype.removeListener=function(e,t){
var n,i,a,o,r
if(l(t),void 0===(i=this._events)){
return this
}
if(void 0===(n=i[e])){
return this
}
if(n===t||n.listener===t){
0==--this._eventsCount?this._events=Object.create(null):(delete i[e],
i.removeListener&&this.emit("removeListener",e,n.listener||t))
}else if("function"!=typeof n){
for(a=-1,o=n.length-1;o>=0;o--){
if(n[o]===t||n[o].listener===t){
r=n[o].listener,a=o
break
}
}
if(a<0){
return this
}
0===a?n.shift():function(e,t){
for(;t+1<e.length;t++){
e[t]=e[t+1]
}
e.pop()
}(n,a),1===n.length&&(i[e]=n[0]),void 0!==i.removeListener&&this.emit("removeListener",e,r||t)
}
return this
},s.prototype.off=s.prototype.removeListener,s.prototype.removeAllListeners=function(e){
var t,n,i
if(void 0===(n=this._events)){
return this
}
if(void 0===n.removeListener){
return 0===arguments.length?(this._events=Object.create(null),
this._eventsCount=0):void 0!==n[e]&&(0==--this._eventsCount?this._events=Object.create(null):delete n[e]),
this
}
if(0===arguments.length){
var a,o=Object.keys(n)
for(i=0;i<o.length;++i){
"removeListener"!==(a=o[i])&&this.removeAllListeners(a)
}
return this.removeAllListeners("removeListener"),this._events=Object.create(null),
this._eventsCount=0,
this
}
if("function"==typeof(t=n[e])){
this.removeListener(e,t)
}else if(void 0!==t){
for(i=t.length-1;i>=0;i--){
this.removeListener(e,t[i])
}
}
return this
},s.prototype.listeners=function(e){
return h(this,e,!0)
},s.prototype.rawListeners=function(e){
return h(this,e,!1)
},s.listenerCount=function(e,t){
return"function"==typeof e.listenerCount?e.listenerCount(t):g.call(e,t)
},s.prototype.listenerCount=g,
s.prototype.eventNames=function(){
return this._eventsCount>0?i(this._events):[]
}
},function(e,t,n){
var i
!function(a,o){
"use strict"
var r="model",s="name",u="type",l="vendor",c="version",p="mobile",m="tablet",d="smarttv",h={
extend:function(e,t){
var n={}
for(var i in e){
t[i]&&t[i].length%2==0?n[i]=t[i].concat(e[i]):n[i]=e[i]
}
return n
},
has:function(e,t){
return"string"==typeof e&&-1!==t.toLowerCase().indexOf(e.toLowerCase())
},
lowerize:function(e){
return e.toLowerCase()
},
major:function(e){
return"string"==typeof e?e.replace(/[^\d\.]/g,"").split(".")[0]:void 0
},
trim:function(e){
return e.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,"")
}
},g={
rgx:function(e,t){
for(var n,i,a,o,r,s,u=0;u<t.length&&!r;){
var l=t[u],c=t[u+1]
for(n=i=0;n<l.length&&!r;){
if(r=l[n++].exec(e)){
for(a=0;a<c.length;a++){
s=r[++i],"object"==typeof(o=c[a])&&o.length>0?2==o.length?"function"==typeof o[1]?this[o[0]]=o[1].call(this,s):this[o[0]]=o[1]:3==o.length?"function"!=typeof o[1]||o[1].exec&&o[1].test?this[o[0]]=s?s.replace(o[1],o[2]):void 0:this[o[0]]=s?o[1].call(this,s,o[2]):void 0:4==o.length&&(this[o[0]]=s?o[3].call(this,s.replace(o[1],o[2])):void 0):this[o]=s||void 0
}
}
}
u+=2
}
},
str:function(e,t){
for(var n in t){
if("object"==typeof t[n]&&t[n].length>0){
for(var i=0;i<t[n].length;i++){
if(h.has(t[n][i],e)){
return"?"===n?void 0:n
}
}
}else if(h.has(t[n],e)){
return"?"===n?void 0:n
}
}
return e
}
},f={
browser:{
oldsafari:{
version:{
"1.0":"/8",
1.2:"/1",
1.3:"/3",
"2.0":"/412",
"2.0.2":"/416",
"2.0.3":"/417",
"2.0.4":"/419",
"?":"/"
}
}
},
device:{
amazon:{
model:{
"Fire Phone":["SD","KF"]
}
},
sprint:{
model:{
"Evo Shift 4G":"7373KT"
},
vendor:{
HTC:"APA",
Sprint:"Sprint"
}
}
},
os:{
windows:{
version:{
ME:"4.90",
"NT 3.11":"NT3.51",
"NT 4.0":"NT4.0",
2e3:"NT 5.0",
XP:["NT 5.1","NT 5.2"],
Vista:"NT 6.0",
7:"NT 6.1",
8:"NT 6.2",
8.1:"NT 6.3",
10:["NT 6.4","NT 10.0"],
RT:"ARM"
}
}
}
},b={
browser:[[/(opera\smini)\/([\w\.-]+)/i,/(opera\s[mobiletab]+).+version\/([\w\.-]+)/i,/(opera).+version\/([\w\.]+)/i,/(opera)[\/\s]+([\w\.]+)/i],[s,c],[/(opios)[\/\s]+([\w\.]+)/i],[[s,"Opera Mini"],c],[/\s(opr)\/([\w\.]+)/i],[[s,"Opera"],c],[/(kindle)\/([\w\.]+)/i,/(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?([\w\.]*)/i,/(avant\s|iemobile|slim)(?:browser)?[\/\s]?([\w\.]*)/i,/(bidubrowser|baidubrowser)[\/\s]?([\w\.]+)/i,/(?:ms|\()(ie)\s([\w\.]+)/i,/(rekonq)\/([\w\.]*)/i,/(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi|iridium|phantomjs|bowser|quark|qupzilla|falkon)\/([\w\.-]+)/i],[s,c],[/(konqueror)\/([\w\.]+)/i],[[s,"Konqueror"],c],[/(trident).+rv[:\s]([\w\.]+).+like\sgecko/i],[[s,"IE"],c],[/(edge|edgios|edga|edg)\/((\d+)?[\w\.]+)/i],[[s,"Edge"],c],[/(yabrowser)\/([\w\.]+)/i],[[s,"Yandex"],c],[/(Avast)\/([\w\.]+)/i],[[s,"Avast Secure Browser"],c],[/(AVG)\/([\w\.]+)/i],[[s,"AVG Secure Browser"],c],[/(puffin)\/([\w\.]+)/i],[[s,"Puffin"],c],[/(focus)\/([\w\.]+)/i],[[s,"Firefox Focus"],c],[/(opt)\/([\w\.]+)/i],[[s,"Opera Touch"],c],[/((?:[\s\/])uc?\s?browser|(?:juc.+)ucweb)[\/\s]?([\w\.]+)/i],[[s,"UCBrowser"],c],[/(comodo_dragon)\/([\w\.]+)/i],[[s,/_/g," "],c],[/(windowswechat qbcore)\/([\w\.]+)/i],[[s,"WeChat(Win) Desktop"],c],[/(micromessenger)\/([\w\.]+)/i],[[s,"WeChat"],c],[/(brave)\/([\w\.]+)/i],[[s,"Brave"],c],[/(qqbrowserlite)\/([\w\.]+)/i],[s,c],[/(QQ)\/([\d\.]+)/i],[s,c],[/m?(qqbrowser)[\/\s]?([\w\.]+)/i],[s,c],[/(baiduboxapp)[\/\s]?([\w\.]+)/i],[s,c],[/(2345Explorer)[\/\s]?([\w\.]+)/i],[s,c],[/(MetaSr)[\/\s]?([\w\.]+)/i],[s],[/(LBBROWSER)/i],[s],[/xiaomi\/miuibrowser\/([\w\.]+)/i],[c,[s,"MIUI Browser"]],[/;fbav\/([\w\.]+);/i],[c,[s,"Facebook"]],[/safari\s(line)\/([\w\.]+)/i,/android.+(line)\/([\w\.]+)\/iab/i],[s,c],[/headlesschrome(?:\/([\w\.]+)|\s)/i],[c,[s,"Chrome Headless"]],[/\swv\).+(chrome)\/([\w\.]+)/i],[[s,/(.+)/,"$1 WebView"],c],[/((?:oculus|samsung)browser)\/([\w\.]+)/i],[[s,/(.+(?:g|us))(.+)/,"$1 $2"],c],[/android.+version\/([\w\.]+)\s+(?:mobile\s?safari|safari)*/i],[c,[s,"Android Browser"]],[/(sailfishbrowser)\/([\w\.]+)/i],[[s,"Sailfish Browser"],c],[/(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?([\w\.]+)/i],[s,c],[/(dolfin)\/([\w\.]+)/i],[[s,"Dolphin"],c],[/(qihu|qhbrowser|qihoobrowser|360browser)/i],[[s,"360 Browser"]],[/((?:android.+)crmo|crios)\/([\w\.]+)/i],[[s,"Chrome"],c],[/(coast)\/([\w\.]+)/i],[[s,"Opera Coast"],c],[/fxios\/([\w\.-]+)/i],[c,[s,"Firefox"]],[/version\/([\w\.]+).+?mobile\/\w+\s(safari)/i],[c,[s,"Mobile Safari"]],[/version\/([\w\.]+).+?(mobile\s?safari|safari)/i],[c,s],[/webkit.+?(gsa)\/([\w\.]+).+?(mobile\s?safari|safari)(\/[\w\.]+)/i],[[s,"GSA"],c],[/webkit.+?(mobile\s?safari|safari)(\/[\w\.]+)/i],[s,[c,g.str,f.browser.oldsafari.version]],[/(webkit|khtml)\/([\w\.]+)/i],[s,c],[/(navigator|netscape)\/([\w\.-]+)/i],[[s,"Netscape"],c],[/(swiftfox)/i,/(icedragon|iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo|conkeror)[\/\s]?([\w\.\+]+)/i,/(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([\w\.-]+)$/i,/(mozilla)\/([\w\.]+).+rv\:.+gecko\/\d+/i,/(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir)[\/\s]?([\w\.]+)/i,/(links)\s\(([\w\.]+)/i,/(gobrowser)\/?([\w\.]*)/i,/(ice\s?browser)\/v?([\w\._]+)/i,/(mosaic)[\/\s]([\w\.]+)/i],[s,c]],
cpu:[[/(?:(amd|x(?:(?:86|64)[_-])?|wow|win)64)[;\)]/i],[["architecture","amd64"]],[/(ia32(?=;))/i],[["architecture",h.lowerize]],[/((?:i[346]|x)86)[;\)]/i],[["architecture","ia32"]],[/windows\s(ce|mobile);\sppc;/i],[["architecture","arm"]],[/((?:ppc|powerpc)(?:64)?)(?:\smac|;|\))/i],[["architecture",/ower/,"",h.lowerize]],[/(sun4\w)[;\)]/i],[["architecture","sparc"]],[/((?:avr32|ia64(?=;))|68k(?=\))|arm(?:64|(?=v\d+[;l]))|(?=atmel\s)avr|(?:irix|mips|sparc)(?:64)?(?=;)|pa-risc)/i],[["architecture",h.lowerize]]],
device:[[/\((ipad|playbook);[\w\s\),;-]+(rim|apple)/i],[r,l,[u,m]],[/applecoremedia\/[\w\.]+ \((ipad)/],[r,[l,"Apple"],[u,m]],[/(apple\s{0,1}tv)/i],[[r,"Apple TV"],[l,"Apple"],[u,d]],[/(archos)\s(gamepad2?)/i,/(hp).+(touchpad)/i,/(hp).+(tablet)/i,/(kindle)\/([\w\.]+)/i,/\s(nook)[\w\s]+build\/(\w+)/i,/(dell)\s(strea[kpr\s\d]*[\dko])/i],[l,r,[u,m]],[/(kf[A-z]+)\sbuild\/.+silk\//i],[r,[l,"Amazon"],[u,m]],[/(sd|kf)[0349hijorstuw]+\sbuild\/.+silk\//i],[[r,g.str,f.device.amazon.model],[l,"Amazon"],[u,p]],[/android.+aft([bms])\sbuild/i],[r,[l,"Amazon"],[u,d]],[/\((ip[honed|\s\w*]+);.+(apple)/i],[r,l,[u,p]],[/\((ip[honed|\s\w*]+);/i],[r,[l,"Apple"],[u,p]],[/(blackberry)[\s-]?(\w+)/i,/(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron)[\s_-]?([\w-]*)/i,/(hp)\s([\w\s]+\w)/i,/(asus)-?(\w+)/i],[l,r,[u,p]],[/\(bb10;\s(\w+)/i],[r,[l,"BlackBerry"],[u,p]],[/android.+(transfo[prime\s]{4,10}\s\w+|eeepc|slider\s\w+|nexus 7|padfone|p00c)/i],[r,[l,"Asus"],[u,m]],[/(sony)\s(tablet\s[ps])\sbuild\//i,/(sony)?(?:sgp.+)\sbuild\//i],[[l,"Sony"],[r,"Xperia Tablet"],[u,m]],[/android.+\s([c-g]\d{4}|so[-l]\w+)(?=\sbuild\/|\).+chrome\/(?![1-6]{0,1}\d\.))/i],[r,[l,"Sony"],[u,p]],[/\s(ouya)\s/i,/(nintendo)\s([wids3u]+)/i],[l,r,[u,"console"]],[/android.+;\s(shield)\sbuild/i],[r,[l,"Nvidia"],[u,"console"]],[/(playstation\s[34portablevi]+)/i],[r,[l,"Sony"],[u,"console"]],[/(sprint\s(\w+))/i],[[l,g.str,f.device.sprint.vendor],[r,g.str,f.device.sprint.model],[u,p]],[/(htc)[;_\s-]+([\w\s]+(?=\)|\sbuild)|\w+)/i,/(zte)-(\w*)/i,/(alcatel|geeksphone|nexian|panasonic|(?=;\s)sony)[_\s-]?([\w-]*)/i],[l,[r,/_/g," "],[u,p]],[/(nexus\s9)/i],[r,[l,"HTC"],[u,m]],[/d\/huawei([\w\s-]+)[;\)]/i,/(nexus\s6p|vog-l29|ane-lx1|eml-l29)/i],[r,[l,"Huawei"],[u,p]],[/android.+(bah2?-a?[lw]\d{2})/i],[r,[l,"Huawei"],[u,m]],[/(microsoft);\s(lumia[\s\w]+)/i],[l,r,[u,p]],[/[\s\(;](xbox(?:\sone)?)[\s\);]/i],[r,[l,"Microsoft"],[u,"console"]],[/(kin\.[onetw]{3})/i],[[r,/\./g," "],[l,"Microsoft"],[u,p]],[/\s(milestone|droid(?:[2-4x]|\s(?:bionic|x2|pro|razr))?:?(\s4g)?)[\w\s]+build\//i,/mot[\s-]?(\w*)/i,/(XT\d{3,4}) build\//i,/(nexus\s6)/i],[r,[l,"Motorola"],[u,p]],[/android.+\s(mz60\d|xoom[\s2]{0,2})\sbuild\//i],[r,[l,"Motorola"],[u,m]],[/hbbtv\/\d+\.\d+\.\d+\s+\([\w\s]*;\s*(\w[^;]*);([^;]*)/i],[[l,h.trim],[r,h.trim],[u,d]],[/hbbtv.+maple;(\d+)/i],[[r,/^/,"SmartTV"],[l,"Samsung"],[u,d]],[/\(dtv[\);].+(aquos)/i],[r,[l,"Sharp"],[u,d]],[/android.+((sch-i[89]0\d|shw-m380s|gt-p\d{4}|gt-n\d+|sgh-t8[56]9|nexus 10))/i,/((SM-T\w+))/i],[[l,"Samsung"],r,[u,m]],[/smart-tv.+(samsung)/i],[l,[u,d],r],[/((s[cgp]h-\w+|gt-\w+|galaxy\snexus|sm-\w[\w\d]+))/i,/(sam[sung]*)[\s-]*(\w+-?[\w-]*)/i,/sec-((sgh\w+))/i],[[l,"Samsung"],r,[u,p]],[/sie-(\w*)/i],[r,[l,"Siemens"],[u,p]],[/(maemo|nokia).*(n900|lumia\s\d+)/i,/(nokia)[\s_-]?([\w-]*)/i],[[l,"Nokia"],r,[u,p]],[/android[x\d\.\s;]+\s([ab][1-7]\-?[0178a]\d\d?)/i],[r,[l,"Acer"],[u,m]],[/android.+([vl]k\-?\d{3})\s+build/i],[r,[l,"LG"],[u,m]],[/android\s3\.[\s\w;-]{10}(lg?)-([06cv9]{3,4})/i],[[l,"LG"],r,[u,m]],[/(lg) netcast\.tv/i],[l,r,[u,d]],[/(nexus\s[45])/i,/lg[e;\s\/-]+(\w*)/i,/android.+lg(\-?[\d\w]+)\s+build/i],[r,[l,"LG"],[u,p]],[/(lenovo)\s?(s(?:5000|6000)(?:[\w-]+)|tab(?:[\s\w]+))/i],[l,r,[u,m]],[/android.+(ideatab[a-z0-9\-\s]+)/i],[r,[l,"Lenovo"],[u,m]],[/(lenovo)[_\s-]?([\w-]+)/i],[l,r,[u,p]],[/linux;.+((jolla));/i],[l,r,[u,p]],[/((pebble))app\/[\d\.]+\s/i],[l,r,[u,"wearable"]],[/android.+;\s(oppo)\s?([\w\s]+)\sbuild/i],[l,r,[u,p]],[/crkey/i],[[r,"Chromecast"],[l,"Google"],[u,d]],[/android.+;\s(glass)\s\d/i],[r,[l,"Google"],[u,"wearable"]],[/android.+;\s(pixel c)[\s)]/i],[r,[l,"Google"],[u,m]],[/android.+;\s(pixel( [23])?( xl)?)[\s)]/i],[r,[l,"Google"],[u,p]],[/android.+;\s(\w+)\s+build\/hm\1/i,/android.+(hm[\s\-_]*note?[\s_]*(?:\d\w)?)\s+build/i,/android.+(mi[\s\-_]*(?:a\d|one|one[\s_]plus|note lte)?[\s_]*(?:\d?\w?)[\s_]*(?:plus)?)\s+build/i,/android.+(redmi[\s\-_]*(?:note)?(?:[\s_]*[\w\s]+))\s+build/i],[[r,/_/g," "],[l,"Xiaomi"],[u,p]],[/android.+(mi[\s\-_]*(?:pad)(?:[\s_]*[\w\s]+))\s+build/i],[[r,/_/g," "],[l,"Xiaomi"],[u,m]],[/android.+;\s(m[1-5]\snote)\sbuild/i],[r,[l,"Meizu"],[u,p]],[/(mz)-([\w-]{2,})/i],[[l,"Meizu"],r,[u,p]],[/android.+a000(1)\s+build/i,/android.+oneplus\s(a\d{4})[\s)]/i],[r,[l,"OnePlus"],[u,p]],[/android.+[;\/]\s*(RCT[\d\w]+)\s+build/i],[r,[l,"RCA"],[u,m]],[/android.+[;\/\s]+(Venue[\d\s]{2,7})\s+build/i],[r,[l,"Dell"],[u,m]],[/android.+[;\/]\s*(Q[T|M][\d\w]+)\s+build/i],[r,[l,"Verizon"],[u,m]],[/android.+[;\/]\s+(Barnes[&\s]+Noble\s+|BN[RT])(V?.*)\s+build/i],[[l,"Barnes & Noble"],r,[u,m]],[/android.+[;\/]\s+(TM\d{3}.*\b)\s+build/i],[r,[l,"NuVision"],[u,m]],[/android.+;\s(k88)\sbuild/i],[r,[l,"ZTE"],[u,m]],[/android.+[;\/]\s*(gen\d{3})\s+build.*49h/i],[r,[l,"Swiss"],[u,p]],[/android.+[;\/]\s*(zur\d{3})\s+build/i],[r,[l,"Swiss"],[u,m]],[/android.+[;\/]\s*((Zeki)?TB.*\b)\s+build/i],[r,[l,"Zeki"],[u,m]],[/(android).+[;\/]\s+([YR]\d{2})\s+build/i,/android.+[;\/]\s+(Dragon[\-\s]+Touch\s+|DT)(\w{5})\sbuild/i],[[l,"Dragon Touch"],r,[u,m]],[/android.+[;\/]\s*(NS-?\w{0,9})\sbuild/i],[r,[l,"Insignia"],[u,m]],[/android.+[;\/]\s*((NX|Next)-?\w{0,9})\s+build/i],[r,[l,"NextBook"],[u,m]],[/android.+[;\/]\s*(Xtreme\_)?(V(1[045]|2[015]|30|40|60|7[05]|90))\s+build/i],[[l,"Voice"],r,[u,p]],[/android.+[;\/]\s*(LVTEL\-)?(V1[12])\s+build/i],[[l,"LvTel"],r,[u,p]],[/android.+;\s(PH-1)\s/i],[r,[l,"Essential"],[u,p]],[/android.+[;\/]\s*(V(100MD|700NA|7011|917G).*\b)\s+build/i],[r,[l,"Envizen"],[u,m]],[/android.+[;\/]\s*(Le[\s\-]+Pan)[\s\-]+(\w{1,9})\s+build/i],[l,r,[u,m]],[/android.+[;\/]\s*(Trio[\s\-]*.*)\s+build/i],[r,[l,"MachSpeed"],[u,m]],[/android.+[;\/]\s*(Trinity)[\-\s]*(T\d{3})\s+build/i],[l,r,[u,m]],[/android.+[;\/]\s*TU_(1491)\s+build/i],[r,[l,"Rotor"],[u,m]],[/android.+(KS(.+))\s+build/i],[r,[l,"Amazon"],[u,m]],[/android.+(Gigaset)[\s\-]+(Q\w{1,9})\s+build/i],[l,r,[u,m]],[/\s(tablet|tab)[;\/]/i,/\s(mobile)(?:[;\/]|\ssafari)/i],[[u,h.lowerize],l,r],[/[\s\/\(](smart-?tv)[;\)]/i],[[u,d]],[/(android[\w\.\s\-]{0,9});.+build/i],[r,[l,"Generic"]]],
engine:[[/windows.+\sedge\/([\w\.]+)/i],[c,[s,"EdgeHTML"]],[/webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i],[c,[s,"Blink"]],[/(presto)\/([\w\.]+)/i,/(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna)\/([\w\.]+)/i,/(khtml|tasman|links)[\/\s]\(?([\w\.]+)/i,/(icab)[\/\s]([23]\.[\d\.]+)/i],[s,c],[/rv\:([\w\.]{1,9}).+(gecko)/i],[c,s]],
os:[[/microsoft\s(windows)\s(vista|xp)/i],[s,c],[/(windows)\snt\s6\.2;\s(arm)/i,/(windows\sphone(?:\sos)*)[\s\/]?([\d\.\s\w]*)/i,/(windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i],[s,[c,g.str,f.os.windows.version]],[/(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i],[[s,"Windows"],[c,g.str,f.os.windows.version]],[/\((bb)(10);/i],[[s,"BlackBerry"],c],[/(blackberry)\w*\/?([\w\.]*)/i,/(tizen|kaios)[\/\s]([\w\.]+)/i,/(android|webos|palm\sos|qnx|bada|rim\stablet\sos|meego|sailfish|contiki)[\/\s-]?([\w\.]*)/i],[s,c],[/(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]*)/i],[[s,"Symbian"],c],[/\((series40);/i],[s],[/mozilla.+\(mobile;.+gecko.+firefox/i],[[s,"Firefox OS"],c],[/(nintendo|playstation)\s([wids34portablevu]+)/i,/(mint)[\/\s\(]?(\w*)/i,/(mageia|vectorlinux)[;\s]/i,/(joli|[kxln]?ubuntu|debian|suse|opensuse|gentoo|(?=\s)arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk|linpus)[\/\s-]?(?!chrom)([\w\.-]*)/i,/(hurd|linux)\s?([\w\.]*)/i,/(gnu)\s?([\w\.]*)/i],[s,c],[/(cros)\s[\w]+\s([\w\.]+\w)/i],[[s,"Chromium OS"],c],[/(sunos)\s?([\w\.\d]*)/i],[[s,"Solaris"],c],[/\s([frentopc-]{0,4}bsd|dragonfly)\s?([\w\.]*)/i],[s,c],[/(haiku)\s(\w+)/i],[s,c],[/cfnetwork\/.+darwin/i,/ip[honead]{2,4}(?:.*os\s([\w]+)\slike\smac|;\sopera)/i],[[c,/_/g,"."],[s,"iOS"]],[/(mac\sos\sx)\s?([\w\s\.]*)/i,/(macintosh|mac(?=_powerpc)\s)/i],[[s,"Mac OS"],[c,/_/g,"."]],[/((?:open)?solaris)[\/\s-]?([\w\.]*)/i,/(aix)\s((\d)(?=\.|\)|\s)[\w\.])*/i,/(plan\s9|minix|beos|os\/2|amigaos|morphos|risc\sos|openvms|fuchsia)/i,/(unix)\s?([\w\.]*)/i],[s,c]]
},y=function(e,t){
if("object"==typeof e&&(t=e,e=void 0),!(this instanceof y)){
return new y(e,t).getResult()
}
var n=e||(a&&a.navigator&&a.navigator.userAgent?a.navigator.userAgent:""),i=t?h.extend(b,t):b
return this.getBrowser=function(){
var e={
name:void 0,
version:void 0
}
return g.rgx.call(e,n,i.browser),e.major=h.major(e.version),e
},this.getCPU=function(){
var e={
architecture:void 0
}
return g.rgx.call(e,n,i.cpu),e
},this.getDevice=function(){
var e={
vendor:void 0,
model:void 0,
type:void 0
}
return g.rgx.call(e,n,i.device),e
},this.getEngine=function(){
var e={
name:void 0,
version:void 0
}
return g.rgx.call(e,n,i.engine),e
},this.getOS=function(){
var e={
name:void 0,
version:void 0
}
return g.rgx.call(e,n,i.os),e
},this.getResult=function(){
return{
ua:this.getUA(),
browser:this.getBrowser(),
engine:this.getEngine(),
os:this.getOS(),
device:this.getDevice(),
cpu:this.getCPU()
}
},this.getUA=function(){
return n
},this.setUA=function(e){
return n=e,this
},this
}
y.VERSION="0.7.21",y.BROWSER={
NAME:s,
MAJOR:"major",
VERSION:c
},y.CPU={
ARCHITECTURE:"architecture"
},y.DEVICE={
MODEL:r,
VENDOR:l,
TYPE:u,
CONSOLE:"console",
MOBILE:p,
SMARTTV:d,
TABLET:m,
WEARABLE:"wearable",
EMBEDDED:"embedded"
},y.ENGINE={
NAME:s,
VERSION:c
},y.OS={
NAME:s,
VERSION:c
},void 0!==t?(void 0!==e&&e.exports&&(t=e.exports=y),t.UAParser=y):void 0===(i=function(){
return y
}.call(t,n,t,e))||(e.exports=i)
var k=a&&(a.jQuery||a.Zepto)
if(k&&!k.ua){
var v=new y
k.ua=v.getResult(),k.ua.get=function(){
return v.getUA()
},k.ua.set=function(e){
v.setUA(e)
var t=v.getResult()
for(var n in t){
k.ua[n]=t[n]
}
}
}
}("object"==typeof window?window:this)
},function(e,t){
const n={
_activity(e,t){
let n=Object.assign({
common:{
session_id:this._sessionId,
test_id:this._abTests.map((function(e){
return e.test_id
})).join(","),
test_group_id:this._abTests.map((function(e){
return e.test_group_id
})).join(","),
error_state:this._errorState
}
},t)
const i={
type:5,
subtype:e,
time:Date.now()
}
this.sendEvent({
event:i,
activity:n
})
},
activity:{
click:1,
view:2,
ipm:3,
auto:10
},
commonActivity(e){
let t=Object.assign({},e)
const n={
type:48,
subtype:1,
time:Date.now()
}
this.sendEvent({
event:n,
activity:t
})
},
heartbeat(e){
let t={
uptime:e
}
const n={
type:2,
subtype:1,
time:Date.now()
}
this.sendEvent({
event:n,
heartbeat:t
})
},
install(e){
let t={
operation:e||1
}
const n={
type:1,
subtype:t.operation,
time:Date.now()
}
this.sendEvent({
event:n,
install:t
})
},
aosWebshieldScanning(e){
let t=Object.assign({
caller_id:this._options.caller_id,
product_av:{
identity:this._options.extensionProductIdentity,
product:this._options.extensionProduct
}
},e)
const n={
type:41,
subtype:1,
time:Date.now()
}
this.sendEvent({
event:n,
aos_webshield_scanning:t
})
},
update(e={}){
const t=e.action||3,n=Date.now(),i=Object.assign({
action:t,
component:1,
type:1,
time:{
ends:n
}
},e),a={
type:4,
subtype:t,
time:n
}
this.sendEvent({
event:a,
updates:i
})
},
preferences(e=[]){
const t={
config:{
configuration:e
}
},n={
type:6,
subtype:1,
time:Date.now()
}
this.sendEvent({
event:n,
preferences:t
})
},
maliciousUrl(e){
const t={
type:46,
subtype:1,
time:Date.now()
}
this.sendEvent({
event:t,
malicious:{
url:e
}
})
},
npsScore(e){
if(e<0||e>10){
return
}
const t={
type:11,
subtype:1,
time:Date.now()
}
this.sendEvent({
event:t,
nps_survey:{
score:e
}
})
},
npsFeedback(e,t){
if(!(e<0||e>10)){
try{
const n={
type:11,
subtype:2,
time:Date.now()
},i=t.replace(/<\/?[^>]+(>|$)/g,"")
this.sendEvent({
event:n,
nps_survey:{
score:e,
textFeedback:i
}
})
}catch(e){}
}
},
vote(e,t){
const n={
type:47,
subtype:1,
time:Date.now()
}
this.sendEvent({
event:n,
vote:{
url:e,
rating:t
}
})
},
_issue(e,t,n){
let i={
category:e,
source:void 0!==n?n:3,
error:Object.assign(t)
}
const a={
type:9,
subtype:e,
time:Date.now()
}
this.sendEvent({
event:a,
issue:i
})
},
issue:{
debug:1,
crash:2,
error:3,
failure:4,
warning:5
}
}
e.exports={
bind:function(e){
let t={}
for(let i in n){
if(i.startsWith("_")||"function"!=typeof n[i]){
if("object"==typeof n[i]){
t[i]={}
for(let a in n[i]){
t[i][a]=n["_"+i].bind(e,n[i][a])
}
}
}else{
t[i]=n[i].bind(e)
}
}
return t
}
}
},function(e,t,n){
"use strict"
e.exports={
browserNameToEnum:function(e){
return"avast secure browser"===(e=e.toLowerCase())||"avg secure browser"===e?2:e.includes("chrome")?3:e.includes("firefox")?4:e.includes("safari")?5:e.includes("edge")?6:e.includes("opera")?7:"ie"===e?8:"ucbrowser"===e?11:"yandex"===e?12:"coc coc"===e?13:"chromium"===e?14:"vivaldi"===e?15:1
},
platformNameToEnum:function(e){
return e?e.startsWith("Win")?1:e.startsWith("Mac")?2:e.startsWith("iP")?3:e.toLowerCase().startsWith("android")?5:e.toLowerCase().startsWith("chromium os")?6:4:5
},
cpuToEnum:function(e){
return"arm"===e?3:"arm64"===e?4:"amd64"===e||"ia64"===e?2:"ia32"===e?1:5
}
}
},function(e,t,n){
(function(i){
var a,o,r
o=[n(31)],void 0===(r="function"==typeof(a=function(e,t){
"use strict"
var a,o={}
return o.ByteBuffer=e,o.Long=e.Long||null,o.VERSION="5.0.3",o.WIRE_TYPES={},o.WIRE_TYPES.VARINT=0,
o.WIRE_TYPES.BITS64=1,
o.WIRE_TYPES.LDELIM=2,o.WIRE_TYPES.STARTGROUP=3,o.WIRE_TYPES.ENDGROUP=4,
o.WIRE_TYPES.BITS32=5,
o.PACKABLE_WIRE_TYPES=[o.WIRE_TYPES.VARINT,o.WIRE_TYPES.BITS64,o.WIRE_TYPES.BITS32],
o.TYPES={
int32:{
name:"int32",
wireType:o.WIRE_TYPES.VARINT,
defaultValue:0
},
uint32:{
name:"uint32",
wireType:o.WIRE_TYPES.VARINT,
defaultValue:0
},
sint32:{
name:"sint32",
wireType:o.WIRE_TYPES.VARINT,
defaultValue:0
},
int64:{
name:"int64",
wireType:o.WIRE_TYPES.VARINT,
defaultValue:o.Long?o.Long.ZERO:void 0
},
uint64:{
name:"uint64",
wireType:o.WIRE_TYPES.VARINT,
defaultValue:o.Long?o.Long.UZERO:void 0
},
sint64:{
name:"sint64",
wireType:o.WIRE_TYPES.VARINT,
defaultValue:o.Long?o.Long.ZERO:void 0
},
bool:{
name:"bool",
wireType:o.WIRE_TYPES.VARINT,
defaultValue:!1
},
double:{
name:"double",
wireType:o.WIRE_TYPES.BITS64,
defaultValue:0
},
string:{
name:"string",
wireType:o.WIRE_TYPES.LDELIM,
defaultValue:""
},
bytes:{
name:"bytes",
wireType:o.WIRE_TYPES.LDELIM,
defaultValue:null
},
fixed32:{
name:"fixed32",
wireType:o.WIRE_TYPES.BITS32,
defaultValue:0
},
sfixed32:{
name:"sfixed32",
wireType:o.WIRE_TYPES.BITS32,
defaultValue:0
},
fixed64:{
name:"fixed64",
wireType:o.WIRE_TYPES.BITS64,
defaultValue:o.Long?o.Long.UZERO:void 0
},
sfixed64:{
name:"sfixed64",
wireType:o.WIRE_TYPES.BITS64,
defaultValue:o.Long?o.Long.ZERO:void 0
},
float:{
name:"float",
wireType:o.WIRE_TYPES.BITS32,
defaultValue:0
},
enum:{
name:"enum",
wireType:o.WIRE_TYPES.VARINT,
defaultValue:0
},
message:{
name:"message",
wireType:o.WIRE_TYPES.LDELIM,
defaultValue:null
},
group:{
name:"group",
wireType:o.WIRE_TYPES.STARTGROUP,
defaultValue:null
}
},o.MAP_KEY_TYPES=[o.TYPES.int32,o.TYPES.sint32,o.TYPES.sfixed32,o.TYPES.uint32,o.TYPES.fixed32,o.TYPES.int64,o.TYPES.sint64,o.TYPES.sfixed64,o.TYPES.uint64,o.TYPES.fixed64,o.TYPES.bool,o.TYPES.string,o.TYPES.bytes],
o.ID_MIN=1,
o.ID_MAX=536870911,o.convertFieldsToCamelCase=!1,o.populateAccessors=!0,
o.populateDefaults=!0,
o.Util=((a={}).IS_NODE=!("object"!=typeof i||i+""!="[object process]"||i.browser),
a.XHR=function(){
for(var e=[function(){
return new XMLHttpRequest
},function(){
return new ActiveXObject("Msxml2.XMLHTTP")
},function(){
return new ActiveXObject("Msxml3.XMLHTTP")
},function(){
return new ActiveXObject("Microsoft.XMLHTTP")
}],t=null,n=0;n<e.length;n++){
try{
t=e[n]()
}catch(e){
continue
}
break
}
if(!t){
throw Error("XMLHttpRequest is not supported")
}
return t
},a.fetch=function(e,t){
if(t&&"function"!=typeof t&&(t=null),a.IS_NODE){
var i=n(33)
if(t){
i.readFile(e,(function(e,n){
t(e?null:""+n)
}))
}else{
try{
return i.readFileSync(e)
}catch(e){
return null
}
}
}else{
var o=a.XHR()
if(o.open("GET",e,!!t),o.setRequestHeader("Accept","text/plain"),"function"==typeof o.overrideMimeType&&o.overrideMimeType("text/plain"),
!t){
return o.send(null),200==o.status||0==o.status&&"string"==typeof o.responseText?o.responseText:null
}
if(o.onreadystatechange=function(){
4==o.readyState&&(200==o.status||0==o.status&&"string"==typeof o.responseText?t(o.responseText):t(null))
},
4==o.readyState){
return
}
o.send(null)
}
},a.toCamelCase=function(e){
return e.replace(/_([a-zA-Z])/g,(function(e,t){
return t.toUpperCase()
}))
},a),o.Lang={
DELIM:/[\s\{\}=;:\[\],'"\(\)<>]/g,
RULE:/^(?:required|optional|repeated|map)$/,
TYPE:/^(?:double|float|int32|uint32|sint32|int64|uint64|sint64|fixed32|sfixed32|fixed64|sfixed64|bool|string|bytes)$/,
NAME:/^[a-zA-Z_][a-zA-Z_0-9]*$/,
TYPEDEF:/^[a-zA-Z][a-zA-Z_0-9]*$/,
TYPEREF:/^(?:\.?[a-zA-Z_][a-zA-Z_0-9]*)(?:\.[a-zA-Z_][a-zA-Z_0-9]*)*$/,
FQTYPEREF:/^(?:\.[a-zA-Z_][a-zA-Z_0-9]*)+$/,
NUMBER:/^-?(?:[1-9][0-9]*|0|0[xX][0-9a-fA-F]+|0[0-7]+|([0-9]*(\.[0-9]*)?([Ee][+-]?[0-9]+)?)|inf|nan)$/,
NUMBER_DEC:/^(?:[1-9][0-9]*|0)$/,
NUMBER_HEX:/^0[xX][0-9a-fA-F]+$/,
NUMBER_OCT:/^0[0-7]+$/,
NUMBER_FLT:/^([0-9]*(\.[0-9]*)?([Ee][+-]?[0-9]+)?|inf|nan)$/,
BOOL:/^(?:true|false)$/i,
ID:/^(?:[1-9][0-9]*|0|0[xX][0-9a-fA-F]+|0[0-7]+)$/,
NEGID:/^\-?(?:[1-9][0-9]*|0|0[xX][0-9a-fA-F]+|0[0-7]+)$/,
WHITESPACE:/\s/,
STRING:/(?:"([^"\\]*(?:\\.[^"\\]*)*)")|(?:'([^'\\]*(?:\\.[^'\\]*)*)')/g,
STRING_DQ:/(?:"([^"\\]*(?:\\.[^"\\]*)*)")/g,
STRING_SQ:/(?:'([^'\\]*(?:\\.[^'\\]*)*)')/g
},o.DotProto=function(e,t){
var n={},i=function(e){
this.source=e+"",this.index=0,this.line=1,this.stack=[],this._stringOpen=null
},a=i.prototype
a._readString=function(){
var e='"'===this._stringOpen?t.STRING_DQ:t.STRING_SQ
e.lastIndex=this.index-1
var n=e.exec(this.source)
if(!n){
throw Error("unterminated string")
}
return this.index=e.lastIndex,this.stack.push(this._stringOpen),this._stringOpen=null,
n[1]
},a.next=function(){
if(this.stack.length>0){
return this.stack.shift()
}
if(this.index>=this.source.length){
return null
}
if(null!==this._stringOpen){
return this._readString()
}
var e,n,i
do{
for(e=!1;t.WHITESPACE.test(i=this.source.charAt(this.index));){
if("\n"===i&&++this.line,
++this.index===this.source.length){
return null
}
}
if("/"===this.source.charAt(this.index)){
if(++this.index,"/"===this.source.charAt(this.index)){
for(;"\n"!==this.source.charAt(++this.index);){
if(this.index==this.source.length){
return null
}
}
++this.index,++this.line,e=!0
}else{
if("*"!==(i=this.source.charAt(this.index))){
return"/"
}
do{
if("\n"===i&&++this.line,++this.index===this.source.length){
return null
}
n=i,i=this.source.charAt(this.index)
}while("*"!==n||"/"!==i)
;++this.index,e=!0
}
}
}while(e)
if(this.index===this.source.length){
return null
}
var a=this.index
if(t.DELIM.lastIndex=0,!t.DELIM.test(this.source.charAt(a++))){
for(;a<this.source.length&&!t.DELIM.test(this.source.charAt(a));){
++a
}
}
var o=this.source.substring(this.index,this.index=a)
return'"'!==o&&"'"!==o||(this._stringOpen=o),o
},a.peek=function(){
if(0===this.stack.length){
var e=this.next()
if(null===e){
return null
}
this.stack.push(e)
}
return this.stack[0]
},a.skip=function(e){
var t=this.next()
if(t!==e){
throw Error("illegal '"+t+"', '"+e+"' expected")
}
},a.omit=function(e){
return this.peek()===e&&(this.next(),!0)
},a.toString=function(){
return"Tokenizer ("+this.index+"/"+this.source.length+" at line "+this.line+")"
},
n.Tokenizer=i
var o=function(e){
this.tn=new i(e),this.proto3=!1
},r=o.prototype
function s(e,n){
var i=-1,a=1
if("-"==e.charAt(0)&&(a=-1,e=e.substring(1)),t.NUMBER_DEC.test(e)){
i=parseInt(e)
}else if(t.NUMBER_HEX.test(e)){
i=parseInt(e.substring(2),16)
}else{
if(!t.NUMBER_OCT.test(e)){
throw Error("illegal id value: "+(a<0?"-":"")+e)
}
i=parseInt(e.substring(1),8)
}
if(i=a*i|0,!n&&i<0){
throw Error("illegal id value: "+(a<0?"-":"")+e)
}
return i
}
function u(e){
var n=1
if("-"==e.charAt(0)&&(n=-1,e=e.substring(1)),t.NUMBER_DEC.test(e)){
return n*parseInt(e,10)
}
if(t.NUMBER_HEX.test(e)){
return n*parseInt(e.substring(2),16)
}
if(t.NUMBER_OCT.test(e)){
return n*parseInt(e.substring(1),8)
}
if("inf"===e){
return n*(1/0)
}
if("nan"===e){
return NaN
}
if(t.NUMBER_FLT.test(e)){
return n*parseFloat(e)
}
throw Error("illegal number value: "+(n<0?"-":"")+e)
}
function l(e,t,n){
void 0===e[t]?e[t]=n:(Array.isArray(e[t])||(e[t]=[e[t]]),e[t].push(n))
}
return r.parse=function(){
var e,n,i={
name:"[ROOT]",
package:null,
messages:[],
enums:[],
imports:[],
options:{},
services:[]
},a=!0
try{
for(;e=this.tn.next();){
switch(e){
case"package":
if(!a||null!==i.package){
throw Error("unexpected 'package'")
}
if(e=this.tn.next(),!t.TYPEREF.test(e)){
throw Error("illegal package name: "+e)
}
this.tn.skip(";"),i.package=e
break
case"import":
if(!a){
throw Error("unexpected 'import'")
}
("public"===(e=this.tn.peek())||(n="weak"===e))&&this.tn.next(),e=this._readString(),
this.tn.skip(";"),
n||i.imports.push(e)
break
case"syntax":
if(!a){
throw Error("unexpected 'syntax'")
}
this.tn.skip("="),"proto3"===(i.syntax=this._readString())&&(this.proto3=!0),this.tn.skip(";")
break
case"message":
this._parseMessage(i,null),a=!1
break
case"enum":
this._parseEnum(i),a=!1
break
case"option":
this._parseOption(i)
break
case"service":
this._parseService(i)
break
case"extend":
this._parseExtend(i)
break
default:
throw Error("unexpected '"+e+"'")
}
}
}catch(e){
throw e.message="Parse error at line "+this.tn.line+": "+e.message,e
}
return delete i.name,i
},o.parse=function(e){
return new o(e).parse()
},r._readString=function(){
var e,t,n=""
do{
if("'"!==(t=this.tn.next())&&'"'!==t){
throw Error("illegal string delimiter: "+t)
}
n+=this.tn.next(),this.tn.skip(t),e=this.tn.peek()
}while('"'===e||'"'===e)
return n
},r._readValue=function(e){
var n=this.tn.peek()
if('"'===n||"'"===n){
return this._readString()
}
if(this.tn.next(),t.NUMBER.test(n)){
return u(n)
}
if(t.BOOL.test(n)){
return"true"===n.toLowerCase()
}
if(e&&t.TYPEREF.test(n)){
return n
}
throw Error("illegal value: "+n)
},r._parseOption=function(e,n){
var i=this.tn.next(),a=!1
if("("===i&&(a=!0,i=this.tn.next()),!t.TYPEREF.test(i)){
throw Error("illegal option name: "+i)
}
var o=i
a&&(this.tn.skip(")"),o="("+o+")",i=this.tn.peek(),t.FQTYPEREF.test(i)&&(o+=i,this.tn.next())),
this.tn.skip("="),
this._parseOptionValue(e,o),n||this.tn.skip(";")
},r._parseOptionValue=function(e,n){
var i=this.tn.peek()
if("{"!==i){
l(e.options,n,this._readValue(!0))
}else{
for(this.tn.skip("{");"}"!==(i=this.tn.next());){
if(!t.NAME.test(i)){
throw Error("illegal option name: "+n+"."+i)
}
this.tn.omit(":")?l(e.options,n+"."+i,this._readValue(!0)):this._parseOptionValue(e,n+"."+i)
}
}
},r._parseService=function(e){
var n=this.tn.next()
if(!t.NAME.test(n)){
throw Error("illegal service name at line "+this.tn.line+": "+n)
}
var i={
name:n,
rpc:{},
options:{}
}
for(this.tn.skip("{");"}"!==(n=this.tn.next());){
if("option"===n){
this._parseOption(i)
}else{
if("rpc"!==n){
throw Error("illegal service token: "+n)
}
this._parseServiceRPC(i)
}
}
this.tn.omit(";"),e.services.push(i)
},r._parseServiceRPC=function(e){
var n=this.tn.next()
if(!t.NAME.test(n)){
throw Error("illegal rpc service method name: "+n)
}
var i=n,a={
request:null,
response:null,
request_stream:!1,
response_stream:!1,
options:{}
}
if(this.tn.skip("("),"stream"===(n=this.tn.next()).toLowerCase()&&(a.request_stream=!0,
n=this.tn.next()),
!t.TYPEREF.test(n)){
throw Error("illegal rpc service request type: "+n)
}
if(a.request=n,this.tn.skip(")"),"returns"!==(n=this.tn.next()).toLowerCase()){
throw Error("illegal rpc service request type delimiter: "+n)
}
if(this.tn.skip("("),"stream"===(n=this.tn.next()).toLowerCase()&&(a.response_stream=!0,
n=this.tn.next()),
a.response=n,this.tn.skip(")"),"{"===(n=this.tn.peek())){
for(this.tn.next();"}"!==(n=this.tn.next());){
if("option"!==n){
throw Error("illegal rpc service token: "+n)
}
this._parseOption(a)
}
this.tn.omit(";")
}else{
this.tn.skip(";")
}
void 0===e.rpc&&(e.rpc={}),e.rpc[i]=a
},r._parseMessage=function(e,n){
var i=!!n,a=this.tn.next(),o={
name:"",
fields:[],
enums:[],
messages:[],
options:{},
services:[],
oneofs:{}
}
if(!t.NAME.test(a)){
throw Error("illegal "+(i?"group":"message")+" name: "+a)
}
for(o.name=a,i&&(this.tn.skip("="),n.id=s(this.tn.next()),o.isGroup=!0),"["===(a=this.tn.peek())&&n&&this._parseFieldOptions(n),
this.tn.skip("{");"}"!==(a=this.tn.next());){
if(t.RULE.test(a)){
this._parseMessageField(o,a)
}else if("oneof"===a){
this._parseMessageOneOf(o)
}else if("enum"===a){
this._parseEnum(o)
}else if("message"===a){
this._parseMessage(o)
}else if("option"===a){
this._parseOption(o)
}else if("service"===a){
this._parseService(o)
}else if("extensions"===a){
o.hasOwnProperty("extensions")?o.extensions=o.extensions.concat(this._parseExtensionRanges()):o.extensions=this._parseExtensionRanges()
}else if("reserved"===a){
this._parseIgnored()
}else if("extend"===a){
this._parseExtend(o)
}else{
if(!t.TYPEREF.test(a)){
throw Error("illegal message token: "+a)
}
if(!this.proto3){
throw Error("illegal field rule: "+a)
}
this._parseMessageField(o,"optional",a)
}
}
return this.tn.omit(";"),e.messages.push(o),o
},r._parseIgnored=function(){
for(;";"!==this.tn.peek();){
this.tn.next()
}
this.tn.skip(";")
},r._parseMessageField=function(e,n,i){
if(!t.RULE.test(n)){
throw Error("illegal message field rule: "+n)
}
var a,o={
rule:n,
type:"",
name:"",
options:{},
id:0
}
if("map"===n){
if(i){
throw Error("illegal type: "+i)
}
if(this.tn.skip("<"),a=this.tn.next(),!t.TYPE.test(a)&&!t.TYPEREF.test(a)){
throw Error("illegal message field type: "+a)
}
if(o.keytype=a,this.tn.skip(","),a=this.tn.next(),!t.TYPE.test(a)&&!t.TYPEREF.test(a)){
throw Error("illegal message field: "+a)
}
if(o.type=a,this.tn.skip(">"),a=this.tn.next(),!t.NAME.test(a)){
throw Error("illegal message field name: "+a)
}
o.name=a,this.tn.skip("="),o.id=s(this.tn.next()),"["===(a=this.tn.peek())&&this._parseFieldOptions(o),
this.tn.skip(";")
}else if("group"===(i=void 0!==i?i:this.tn.next())){
var r=this._parseMessage(e,o)
if(!/^[A-Z]/.test(r.name)){
throw Error("illegal group name: "+r.name)
}
o.type=r.name,o.name=r.name.toLowerCase(),this.tn.omit(";")
}else{
if(!t.TYPE.test(i)&&!t.TYPEREF.test(i)){
throw Error("illegal message field type: "+i)
}
if(o.type=i,a=this.tn.next(),!t.NAME.test(a)){
throw Error("illegal message field name: "+a)
}
o.name=a,this.tn.skip("="),o.id=s(this.tn.next()),"["===(a=this.tn.peek())&&this._parseFieldOptions(o),
this.tn.skip(";")
}
return e.fields.push(o),o
},r._parseMessageOneOf=function(e){
var n=this.tn.next()
if(!t.NAME.test(n)){
throw Error("illegal oneof name: "+n)
}
var i,a=n,o=[]
for(this.tn.skip("{");"}"!==(n=this.tn.next());){
(i=this._parseMessageField(e,"optional",n)).oneof=a,
o.push(i.id)
}
this.tn.omit(";"),e.oneofs[a]=o
},r._parseFieldOptions=function(e){
this.tn.skip("[")
for(var t=!0;"]"!==this.tn.peek();){
t||this.tn.skip(","),this._parseOption(e,!0),
t=!1
}
this.tn.next()
},r._parseEnum=function(e){
var n={
name:"",
values:[],
options:{}
},i=this.tn.next()
if(!t.NAME.test(i)){
throw Error("illegal name: "+i)
}
for(n.name=i,this.tn.skip("{");"}"!==(i=this.tn.next());){
if("option"===i){
this._parseOption(n)
}else{
if(!t.NAME.test(i)){
throw Error("illegal name: "+i)
}
this.tn.skip("=")
var a={
name:i,
id:s(this.tn.next(),!0)
}
"["===(i=this.tn.peek())&&this._parseFieldOptions({
options:{}
}),this.tn.skip(";"),n.values.push(a)
}
}
this.tn.omit(";"),e.enums.push(n)
},r._parseExtensionRanges=function(){
var t,n,i,a=[]
do{
for(n=[];;){
switch(t=this.tn.next()){
case"min":
i=e.ID_MIN
break
case"max":
i=e.ID_MAX
break
default:
i=u(t)
}
if(n.push(i),2===n.length){
break
}
if("to"!==this.tn.peek()){
n.push(i)
break
}
this.tn.next()
}
a.push(n)
}while(this.tn.omit(","))
return this.tn.skip(";"),a
},r._parseExtend=function(e){
var n=this.tn.next()
if(!t.TYPEREF.test(n)){
throw Error("illegal extend reference: "+n)
}
var i={
ref:n,
fields:[]
}
for(this.tn.skip("{");"}"!==(n=this.tn.next());){
if(t.RULE.test(n)){
this._parseMessageField(i,n)
}else{
if(!t.TYPEREF.test(n)){
throw Error("illegal extend token: "+n)
}
if(!this.proto3){
throw Error("illegal field rule: "+n)
}
this._parseMessageField(i,"optional",n)
}
}
return this.tn.omit(";"),e.messages.push(i),i
},r.toString=function(){
return"Parser at line "+this.tn.line
},n.Parser=o,n
}(o,o.Lang),o.Reflect=function(t){
var n={},i=function(e,t,n){
this.builder=e,this.parent=t,this.name=n,this.className
},a=i.prototype
a.fqn=function(){
for(var e=this.name,t=this;null!=(t=t.parent);){
e=t.name+"."+e
}
return e
},a.toString=function(e){
return(e?this.className+" ":"")+this.fqn()
},a.build=function(){
throw Error(this.toString(!0)+" cannot be built directly")
},n.T=i
var o=function(e,t,n,a,o){
i.call(this,e,t,n),this.className="Namespace",this.children=[],
this.options=a||{},
this.syntax=o||"proto2"
},r=o.prototype=Object.create(i.prototype)
r.getChildren=function(e){
if(null==(e=e||null)){
return this.children.slice()
}
for(var t=[],n=0,i=this.children.length;n<i;++n){
this.children[n]instanceof e&&t.push(this.children[n])
}
return t
},r.addChild=function(e){
var t
if(t=this.getChild(e.name)){
if(t instanceof c.Field&&t.name!==t.originalName&&null===this.getChild(t.originalName)){
t.name=t.originalName
}else{
if(!(e instanceof c.Field&&e.name!==e.originalName&&null===this.getChild(e.originalName))){
throw Error("Duplicate name in namespace "+this.toString(!0)+": "+e.name)
}
e.name=e.originalName
}
}
this.children.push(e)
},r.getChild=function(e){
for(var t="number"==typeof e?"id":"name",n=0,i=this.children.length;n<i;++n){
if(this.children[n][t]===e){
return this.children[n]
}
}
return null
},r.resolve=function(e,t){
var i,a="string"==typeof e?e.split("."):e,o=this,r=0
if(""===a[r]){
for(;null!==o.parent;){
o=o.parent
}
r++
}
do{
do{
if(!(o instanceof n.Namespace)){
o=null
break
}
if(!(i=o.getChild(a[r]))||!(i instanceof n.T)||t&&!(i instanceof n.Namespace)){
o=null
break
}
o=i,r++
}while(r<a.length)
if(null!=o){
break
}
if(null!==this.parent){
return this.parent.resolve(e,t)
}
}while(null!=o)
return o
},r.qn=function(e){
var t=[],i=e
do{
t.unshift(i.name),i=i.parent
}while(null!==i)
for(var a=1;a<=t.length;a++){
var o=t.slice(t.length-a)
if(e===this.resolve(o,e instanceof n.Namespace)){
return o.join(".")
}
}
return e.fqn()
},r.build=function(){
for(var e,t={},n=this.children,i=0,a=n.length;i<a;++i){
(e=n[i])instanceof o&&(t[e.name]=e.build())
}
return Object.defineProperty&&Object.defineProperty(t,"$options",{
value:this.buildOpt()
}),t
},r.buildOpt=function(){
for(var e={},t=Object.keys(this.options),n=0,i=t.length;n<i;++n){
var a=t[n],o=this.options[t[n]]
e[a]=o
}
return e
},r.getOption=function(e){
return void 0===e?this.options:void 0!==this.options[e]?this.options[e]:null
},n.Namespace=o
var s=function(e,n,i,a,o){
if(this.type=e,this.resolvedType=n,this.isMapKey=i,this.syntax=a,
this.name=o,i&&t.MAP_KEY_TYPES.indexOf(e)<0){
throw Error("Invalid map key type: "+e.name)
}
},u=s.prototype
function l(e,n){
if(e&&"number"==typeof e.low&&"number"==typeof e.high&&"boolean"==typeof e.unsigned&&e.low==e.low&&e.high==e.high){
return new t.Long(e.low,e.high,void 0===n?e.unsigned:n)
}
if("string"==typeof e){
return t.Long.fromString(e,n||!1,10)
}
if("number"==typeof e){
return t.Long.fromNumber(e,n||!1)
}
throw Error("not convertible to Long")
}
s.defaultFieldValue=function(n){
if("string"==typeof n&&(n=t.TYPES[n]),void 0===n.defaultValue){
throw Error("default value for type "+n.name+" is not supported")
}
return n==t.TYPES.bytes?new e(0):n.defaultValue
},u.toString=function(){
return(this.name||"")+(this.isMapKey?"map":"value")+" element"
},u.verifyValue=function(n){
var i=this
function a(e,t){
throw Error("Illegal value for "+i.toString(!0)+" of type "+i.type.name+": "+e+" ("+t+")")
}
switch(this.type){
case t.TYPES.int32:
case t.TYPES.sint32:
case t.TYPES.sfixed32:
return("number"!=typeof n||n==n&&n%1!=0)&&a(typeof n,"not an integer"),
n>4294967295?0|n:n
case t.TYPES.uint32:
case t.TYPES.fixed32:
return("number"!=typeof n||n==n&&n%1!=0)&&a(typeof n,"not an integer"),
n<0?n>>>0:n
case t.TYPES.int64:
case t.TYPES.sint64:
case t.TYPES.sfixed64:
if(t.Long){
try{
return l(n,!1)
}catch(e){
a(typeof n,e.message)
}
}else{
a(typeof n,"requires Long.js")
}
case t.TYPES.uint64:
case t.TYPES.fixed64:
if(t.Long){
try{
return l(n,!0)
}catch(e){
a(typeof n,e.message)
}
}else{
a(typeof n,"requires Long.js")
}
case t.TYPES.bool:
return"boolean"!=typeof n&&a(typeof n,"not a boolean"),n
case t.TYPES.float:
case t.TYPES.double:
return"number"!=typeof n&&a(typeof n,"not a number"),n
case t.TYPES.string:
return"string"==typeof n||n&&n instanceof String||a(typeof n,"not a string"),
""+n
case t.TYPES.bytes:
return e.isByteBuffer(n)?n:e.wrap(n,"base64")
case t.TYPES.enum:
var o=this.resolvedType.getChildren(t.Reflect.Enum.Value)
for(s=0;s<o.length;s++){
if(o[s].name==n){
return o[s].id
}
if(o[s].id==n){
return o[s].id
}
}
if("proto3"===this.syntax){
return("number"!=typeof n||n==n&&n%1!=0)&&a(typeof n,"not an integer"),
(n>4294967295||n<0)&&a(typeof n,"not in range for uint32"),
n
}
a(n,"not a valid enum value")
case t.TYPES.group:
case t.TYPES.message:
if(n&&"object"==typeof n||a(typeof n,"object expected"),n instanceof this.resolvedType.clazz){
return n
}
if(n instanceof t.Builder.Message){
var r={}
for(var s in n){
n.hasOwnProperty(s)&&(r[s]=n[s])
}
n=r
}
return new this.resolvedType.clazz(n)
}
throw Error("[INTERNAL] Illegal value for "+this.toString(!0)+": "+n+" (undefined type "+this.type+")")
},
u.calculateLength=function(n,i){
if(null===i){
return 0
}
var a
switch(this.type){
case t.TYPES.int32:
return i<0?e.calculateVarint64(i):e.calculateVarint32(i)
case t.TYPES.uint32:
return e.calculateVarint32(i)
case t.TYPES.sint32:
return e.calculateVarint32(e.zigZagEncode32(i))
case t.TYPES.fixed32:
case t.TYPES.sfixed32:
case t.TYPES.float:
return 4
case t.TYPES.int64:
case t.TYPES.uint64:
return e.calculateVarint64(i)
case t.TYPES.sint64:
return e.calculateVarint64(e.zigZagEncode64(i))
case t.TYPES.fixed64:
case t.TYPES.sfixed64:
return 8
case t.TYPES.bool:
return 1
case t.TYPES.enum:
return e.calculateVarint32(i)
case t.TYPES.double:
return 8
case t.TYPES.string:
return a=e.calculateUTF8Bytes(i),e.calculateVarint32(a)+a
case t.TYPES.bytes:
if(i.remaining()<0){
throw Error("Illegal value for "+this.toString(!0)+": "+i.remaining()+" bytes remaining")
}
return e.calculateVarint32(i.remaining())+i.remaining()
case t.TYPES.message:
return a=this.resolvedType.calculate(i),e.calculateVarint32(a)+a
case t.TYPES.group:
return(a=this.resolvedType.calculate(i))+e.calculateVarint32(n<<3|t.WIRE_TYPES.ENDGROUP)
}
throw Error("[INTERNAL] Illegal value to encode in "+this.toString(!0)+": "+i+" (unknown type)")
},
u.encodeValue=function(n,i,a){
if(null===i){
return a
}
switch(this.type){
case t.TYPES.int32:
i<0?a.writeVarint64(i):a.writeVarint32(i)
break
case t.TYPES.uint32:
a.writeVarint32(i)
break
case t.TYPES.sint32:
a.writeVarint32ZigZag(i)
break
case t.TYPES.fixed32:
a.writeUint32(i)
break
case t.TYPES.sfixed32:
a.writeInt32(i)
break
case t.TYPES.int64:
case t.TYPES.uint64:
a.writeVarint64(i)
break
case t.TYPES.sint64:
a.writeVarint64ZigZag(i)
break
case t.TYPES.fixed64:
a.writeUint64(i)
break
case t.TYPES.sfixed64:
a.writeInt64(i)
break
case t.TYPES.bool:
"string"==typeof i?a.writeVarint32("false"===i.toLowerCase()?0:!!i):a.writeVarint32(i?1:0)
break
case t.TYPES.enum:
a.writeVarint32(i)
break
case t.TYPES.float:
a.writeFloat32(i)
break
case t.TYPES.double:
a.writeFloat64(i)
break
case t.TYPES.string:
a.writeVString(i)
break
case t.TYPES.bytes:
if(i.remaining()<0){
throw Error("Illegal value for "+this.toString(!0)+": "+i.remaining()+" bytes remaining")
}
var o=i.offset
a.writeVarint32(i.remaining()),a.append(i),i.offset=o
break
case t.TYPES.message:
var r=(new e).LE()
this.resolvedType.encode(i,r),a.writeVarint32(r.offset),a.append(r.flip())
break
case t.TYPES.group:
this.resolvedType.encode(i,a),a.writeVarint32(n<<3|t.WIRE_TYPES.ENDGROUP)
break
default:
throw Error("[INTERNAL] Illegal value to encode in "+this.toString(!0)+": "+i+" (unknown type)")
}
return a
},u.decode=function(e,n,i){
if(n!=this.type.wireType){
throw Error("Unexpected wire type for element")
}
var a,o
switch(this.type){
case t.TYPES.int32:
return 0|e.readVarint32()
case t.TYPES.uint32:
return e.readVarint32()>>>0
case t.TYPES.sint32:
return 0|e.readVarint32ZigZag()
case t.TYPES.fixed32:
return e.readUint32()>>>0
case t.TYPES.sfixed32:
return 0|e.readInt32()
case t.TYPES.int64:
return e.readVarint64()
case t.TYPES.uint64:
return e.readVarint64().toUnsigned()
case t.TYPES.sint64:
return e.readVarint64ZigZag()
case t.TYPES.fixed64:
return e.readUint64()
case t.TYPES.sfixed64:
return e.readInt64()
case t.TYPES.bool:
return!!e.readVarint32()
case t.TYPES.enum:
return e.readVarint32()
case t.TYPES.float:
return e.readFloat()
case t.TYPES.double:
return e.readDouble()
case t.TYPES.string:
return e.readVString()
case t.TYPES.bytes:
if(o=e.readVarint32(),e.remaining()<o){
throw Error("Illegal number of bytes for "+this.toString(!0)+": "+o+" required but got only "+e.remaining())
}
return(a=e.clone()).limit=a.offset+o,e.offset+=o,a
case t.TYPES.message:
return o=e.readVarint32(),this.resolvedType.decode(e,o)
case t.TYPES.group:
return this.resolvedType.decode(e,-1,i)
}
throw Error("[INTERNAL] Illegal decode type")
},u.valueFromString=function(n){
if(!this.isMapKey){
throw Error("valueFromString() called on non-map-key element")
}
switch(this.type){
case t.TYPES.int32:
case t.TYPES.sint32:
case t.TYPES.sfixed32:
case t.TYPES.uint32:
case t.TYPES.fixed32:
return this.verifyValue(parseInt(n))
case t.TYPES.int64:
case t.TYPES.sint64:
case t.TYPES.sfixed64:
case t.TYPES.uint64:
case t.TYPES.fixed64:
return this.verifyValue(n)
case t.TYPES.bool:
return"true"===n
case t.TYPES.string:
return this.verifyValue(n)
case t.TYPES.bytes:
return e.fromBinary(n)
}
},u.valueToString=function(e){
if(!this.isMapKey){
throw Error("valueToString() called on non-map-key element")
}
return this.type===t.TYPES.bytes?e.toString("binary"):e.toString()
},n.Element=s
var c=function(e,t,n,i,a,r){
o.call(this,e,t,n,i,r),this.className="Message",this.extensions=void 0,
this.clazz=null,
this.isGroup=!!a,this._fields=null,this._fieldsById=null,this._fieldsByName=null
},p=c.prototype=Object.create(o.prototype)
function m(e,n){
var i=n.readVarint32(),a=7&i,o=i>>>3
switch(a){
case t.WIRE_TYPES.VARINT:
do{
i=n.readUint8()
}while(128==(128&i))
break
case t.WIRE_TYPES.BITS64:
n.offset+=8
break
case t.WIRE_TYPES.LDELIM:
i=n.readVarint32(),n.offset+=i
break
case t.WIRE_TYPES.STARTGROUP:
m(o,n)
break
case t.WIRE_TYPES.ENDGROUP:
if(o===e){
return!1
}
throw Error("Illegal GROUPEND after unknown group: "+o+" ("+e+" expected)")
case t.WIRE_TYPES.BITS32:
n.offset+=4
break
default:
throw Error("Illegal wire type in unknown group "+e+": "+a)
}
return!0
}
p.build=function(n){
if(this.clazz&&!n){
return this.clazz
}
var i=function(t,n){
var i=n.getChildren(t.Reflect.Message.Field),a=n.getChildren(t.Reflect.Message.OneOf),o=function(r,s){
t.Builder.Message.call(this)
for(var u=0,l=a.length;u<l;++u){
this[a[u].name]=null
}
for(u=0,l=i.length;u<l;++u){
var c=i[u]
this[c.name]=c.repeated?[]:c.map?new t.Map(c):null,!c.required&&"proto3"!==n.syntax||null===c.defaultValue||(this[c.name]=c.defaultValue)
}
var p
if(arguments.length>0){
if(1!==arguments.length||null===r||"object"!=typeof r||!("function"!=typeof r.encode||r instanceof o)||Array.isArray(r)||r instanceof t.Map||e.isByteBuffer(r)||r instanceof ArrayBuffer||t.Long&&r instanceof t.Long){
for(u=0,
l=arguments.length;u<l;++u){
void 0!==(p=arguments[u])&&this.$set(i[u].name,p)
}
}else{
this.$set(r)
}
}
},r=o.prototype=Object.create(t.Builder.Message.prototype)
r.add=function(e,i,a){
var o=n._fieldsByName[e]
if(!a){
if(!o){
throw Error(this+"#"+e+" is undefined")
}
if(!(o instanceof t.Reflect.Message.Field)){
throw Error(this+"#"+e+" is not a field: "+o.toString(!0))
}
if(!o.repeated){
throw Error(this+"#"+e+" is not a repeated field")
}
i=o.verifyValue(i,!0)
}
return null===this[e]&&(this[e]=[]),this[e].push(i),this
},r.$add=r.add,r.set=function(e,i,a){
if(e&&"object"==typeof e){
for(var o in a=i,e){
e.hasOwnProperty(o)&&void 0!==(i=e[o])&&void 0===n._oneofsByName[o]&&this.$set(o,i,a)
}
return this
}
var r=n._fieldsByName[e]
if(a){
this[e]=i
}else{
if(!r){
throw Error(this+"#"+e+" is not a field: undefined")
}
if(!(r instanceof t.Reflect.Message.Field)){
throw Error(this+"#"+e+" is not a field: "+r.toString(!0))
}
this[r.name]=i=r.verifyValue(i)
}
if(r&&r.oneof){
var s=this[r.oneof.name]
null!==i?(null!==s&&s!==r.name&&(this[s]=null),this[r.oneof.name]=r.name):s===e&&(this[r.oneof.name]=null)
}
return this
},r.$set=r.set,r.get=function(e,i){
if(i){
return this[e]
}
var a=n._fieldsByName[e]
if(!(a&&a instanceof t.Reflect.Message.Field)){
throw Error(this+"#"+e+" is not a field: undefined")
}
if(!(a instanceof t.Reflect.Message.Field)){
throw Error(this+"#"+e+" is not a field: "+a.toString(!0))
}
return this[a.name]
},r.$get=r.get
for(var s=0;s<i.length;s++){
var u=i[s]
u instanceof t.Reflect.Message.ExtensionField||n.builder.options.populateAccessors&&function(e){
var t=e.originalName.replace(/(_[a-zA-Z])/g,(function(e){
return e.toUpperCase().replace("_","")
}))
t=t.substring(0,1).toUpperCase()+t.substring(1)
var i=e.originalName.replace(/([A-Z])/g,(function(e){
return"_"+e
})),a=function(t,n){
return this[e.name]=n?t:e.verifyValue(t),this
},o=function(){
return this[e.name]
}
null===n.getChild("set"+t)&&(r["set"+t]=a),null===n.getChild("set_"+i)&&(r["set_"+i]=a),
null===n.getChild("get"+t)&&(r["get"+t]=o),
null===n.getChild("get_"+i)&&(r["get_"+i]=o)
}(u)
}
function l(n,i,a,o){
if(null===n||"object"!=typeof n){
if(o&&o instanceof t.Reflect.Enum){
var r=t.Reflect.Enum.getName(o.object,n)
if(null!==r){
return r
}
}
return n
}
if(e.isByteBuffer(n)){
return i?n.toBase64():n.toBuffer()
}
if(t.Long.isLong(n)){
return a?n.toString():t.Long.fromValue(n)
}
var s
if(Array.isArray(n)){
return s=[],n.forEach((function(e,t){
s[t]=l(e,i,a,o)
})),s
}
if(s={},n instanceof t.Map){
for(var u=n.entries(),c=u.next();!c.done;c=u.next()){
s[n.keyElem.valueToString(c.value[0])]=l(c.value[1],i,a,n.valueElem.resolvedType)
}
return s
}
var p=n.$type,m=void 0
for(var d in n){
n.hasOwnProperty(d)&&(p&&(m=p.getChild(d))?s[d]=l(n[d],i,a,m.resolvedType):s[d]=l(n[d],i,a))
}
return s
}
return r.encode=function(t,i){
"boolean"==typeof t&&(i=t,t=void 0)
var a=!1
t||(t=new e,a=!0)
var o=t.littleEndian
try{
return n.encode(this,t.LE(),i),(a?t.flip():t).LE(o)
}catch(e){
throw t.LE(o),e
}
},o.encode=function(e,t,n){
return new o(e).encode(t,n)
},r.calculate=function(){
return n.calculate(this)
},r.encodeDelimited=function(t,i){
var a=!1
t||(t=new e,a=!0)
var o=(new e).LE()
return n.encode(this,o,i).flip(),t.writeVarint32(o.remaining()),t.append(o),a?t.flip():t
},
r.encodeAB=function(){
try{
return this.encode().toArrayBuffer()
}catch(e){
throw e.encoded&&(e.encoded=e.encoded.toArrayBuffer()),e
}
},r.toArrayBuffer=r.encodeAB,r.encodeNB=function(){
try{
return this.encode().toBuffer()
}catch(e){
throw e.encoded&&(e.encoded=e.encoded.toBuffer()),e
}
},r.toBuffer=r.encodeNB,r.encode64=function(){
try{
return this.encode().toBase64()
}catch(e){
throw e.encoded&&(e.encoded=e.encoded.toBase64()),e
}
},r.toBase64=r.encode64,r.encodeHex=function(){
try{
return this.encode().toHex()
}catch(e){
throw e.encoded&&(e.encoded=e.encoded.toHex()),e
}
},r.toHex=r.encodeHex,r.toRaw=function(e,t){
return l(this,!!e,!!t,this.$type)
},r.encodeJSON=function(){
return JSON.stringify(l(this,!0,!0,this.$type))
},o.decode=function(t,i,a){
"string"==typeof i&&(a=i,i=-1),"string"==typeof t?t=e.wrap(t,a||"base64"):e.isByteBuffer(t)||(t=e.wrap(t))
var o=t.littleEndian
try{
var r=n.decode(t.LE(),i)
return t.LE(o),r
}catch(e){
throw t.LE(o),e
}
},o.decodeDelimited=function(t,i){
if("string"==typeof t?t=e.wrap(t,i||"base64"):e.isByteBuffer(t)||(t=e.wrap(t)),
t.remaining()<1){
return null
}
var a=t.offset,o=t.readVarint32()
if(t.remaining()<o){
return t.offset=a,null
}
try{
var r=n.decode(t.slice(t.offset,t.offset+o).LE())
return t.offset+=o,r
}catch(e){
throw t.offset+=o,e
}
},o.decode64=function(e){
return o.decode(e,"base64")
},o.decodeHex=function(e){
return o.decode(e,"hex")
},o.decodeJSON=function(e){
return new o(JSON.parse(e))
},r.toString=function(){
return n.toString()
},Object.defineProperty&&(Object.defineProperty(o,"$options",{
value:n.buildOpt()
}),Object.defineProperty(r,"$options",{
value:o.$options
}),Object.defineProperty(o,"$type",{
value:n
}),Object.defineProperty(r,"$type",{
value:n
})),o
}(t,this)
this._fields=[],this._fieldsById={},this._fieldsByName={},this._oneofsByName={}
for(var a,o=0,r=this.children.length;o<r;o++){
if((a=this.children[o])instanceof f||a instanceof c||a instanceof k){
if(i.hasOwnProperty(a.name)){
throw Error("Illegal reflect child of "+this.toString(!0)+": "+a.toString(!0)+" cannot override static property '"+a.name+"'")
}
i[a.name]=a.build()
}else if(a instanceof c.Field){
a.build(),this._fields.push(a),this._fieldsById[a.id]=a,
this._fieldsByName[a.name]=a
}else if(a instanceof c.OneOf){
this._oneofsByName[a.name]=a
}else if(!(a instanceof c.OneOf||a instanceof y)){
throw Error("Illegal reflect child of "+this.toString(!0)+": "+this.children[o].toString(!0))
}
}
return this.clazz=i
},p.encode=function(e,t,n){
for(var i,a,o=null,r=0,s=this._fields.length;r<s;++r){
a=e[(i=this._fields[r]).name],
i.required&&null===a?null===o&&(o=i):i.encode(n?a:i.verifyValue(a),t,e)
}
if(null!==o){
var u=Error("Missing at least one required field for "+this.toString(!0)+": "+o)
throw u.encoded=t,u
}
return t
},p.calculate=function(e){
for(var t,n,i=0,a=0,o=this._fields.length;a<o;++a){
if(n=e[(t=this._fields[a]).name],
t.required&&null===n){
throw Error("Missing at least one required field for "+this.toString(!0)+": "+t)
}
i+=t.calculate(n,e)
}
return i
},p.decode=function(e,n,i){
"number"!=typeof n&&(n=-1)
for(var a,o,r,s,u=e.offset,l=new this.clazz;e.offset<u+n||-1===n&&e.remaining()>0;){
if(r=(a=e.readVarint32())>>>3,
(o=7&a)===t.WIRE_TYPES.ENDGROUP){
if(r!==i){
throw Error("Illegal group end indicator for "+this.toString(!0)+": "+r+" ("+(i?i+" expected":"not a group")+")")
}
break
}
if(s=this._fieldsById[r]){
if(s.repeated&&!s.options.packed){
l[s.name].push(s.decode(o,e))
}else if(s.map){
var c=s.decode(o,e)
l[s.name].set(c[0],c[1])
}else if(l[s.name]=s.decode(o,e),s.oneof){
var p=l[s.oneof.name]
null!==p&&p!==s.name&&(l[p]=null),l[s.oneof.name]=s.name
}
}else{
switch(o){
case t.WIRE_TYPES.VARINT:
e.readVarint32()
break
case t.WIRE_TYPES.BITS32:
e.offset+=4
break
case t.WIRE_TYPES.BITS64:
e.offset+=8
break
case t.WIRE_TYPES.LDELIM:
var d=e.readVarint32()
e.offset+=d
break
case t.WIRE_TYPES.STARTGROUP:
for(;m(r,e);){}
break
default:
throw Error("Illegal wire type for unknown field "+r+" in "+this.toString(!0)+"#decode: "+o)
}
}
}
for(var h=0,g=this._fields.length;h<g;++h){
if(null===l[(s=this._fields[h]).name]){
if("proto3"===this.syntax){
l[s.name]=s.defaultValue
}else{
if(s.required){
var f=Error("Missing at least one required field for "+this.toString(!0)+": "+s.name)
throw f.decoded=l,f
}
t.populateDefaults&&null!==s.defaultValue&&(l[s.name]=s.defaultValue)
}
}
}
return l
},n.Message=c
var d=function(e,n,a,o,r,s,u,l,p,m){
i.call(this,e,n,s),this.className="Message.Field",
this.required="required"===a,this.repeated="repeated"===a,
this.map="map"===a,this.keyType=o||null,
this.type=r,this.resolvedType=null,this.id=u,
this.options=l||{},this.defaultValue=null,
this.oneof=p||null,this.syntax=m||"proto2",
this.originalName=this.name,this.element=null,
this.keyElement=null,!this.builder.options.convertFieldsToCamelCase||this instanceof c.ExtensionField||(this.name=t.Util.toCamelCase(this.name))
},h=d.prototype=Object.create(i.prototype)
h.build=function(){
this.element=new s(this.type,this.resolvedType,!1,this.syntax,this.name),
this.map&&(this.keyElement=new s(this.keyType,void 0,!0,this.syntax,this.name)),
"proto3"!==this.syntax||this.repeated||this.map?void 0!==this.options.default&&(this.defaultValue=this.verifyValue(this.options.default)):this.defaultValue=s.defaultFieldValue(this.type)
},
h.verifyValue=function(e,n){
n=n||!1
var i,a=this
function o(e,t){
throw Error("Illegal value for "+a.toString(!0)+" of type "+a.type.name+": "+e+" ("+t+")")
}
if(null===e){
return this.required&&o(typeof e,"required"),"proto3"===this.syntax&&this.type!==t.TYPES.message&&o(typeof e,"proto3 field without field presence cannot be null"),
null
}
if(this.repeated&&!n){
Array.isArray(e)||(e=[e])
var r=[]
for(i=0;i<e.length;i++){
r.push(this.element.verifyValue(e[i]))
}
return r
}
return this.map&&!n?e instanceof t.Map?e:(e instanceof Object||o(typeof e,"expected ProtoBuf.Map or raw object for map field"),
new t.Map(this,e)):(!this.repeated&&Array.isArray(e)&&o(typeof e,"no array expected"),
this.element.verifyValue(e))
},h.hasWirePresence=function(e,n){
if("proto3"!==this.syntax){
return null!==e
}
if(this.oneof&&n[this.oneof.name]===this.name){
return!0
}
switch(this.type){
case t.TYPES.int32:
case t.TYPES.sint32:
case t.TYPES.sfixed32:
case t.TYPES.uint32:
case t.TYPES.fixed32:
return 0!==e
case t.TYPES.int64:
case t.TYPES.sint64:
case t.TYPES.sfixed64:
case t.TYPES.uint64:
case t.TYPES.fixed64:
return 0!==e.low||0!==e.high
case t.TYPES.bool:
return e
case t.TYPES.float:
case t.TYPES.double:
return 0!==e
case t.TYPES.string:
return e.length>0
case t.TYPES.bytes:
return e.remaining()>0
case t.TYPES.enum:
return 0!==e
case t.TYPES.message:
return null!==e
default:
return!0
}
},h.encode=function(n,i,a){
if(null===this.type||"object"!=typeof this.type){
throw Error("[INTERNAL] Unresolved type in "+this.toString(!0)+": "+this.type)
}
if(null===n||this.repeated&&0==n.length){
return i
}
try{
var o
if(this.repeated){
if(this.options.packed&&t.PACKABLE_WIRE_TYPES.indexOf(this.type.wireType)>=0){
i.writeVarint32(this.id<<3|t.WIRE_TYPES.LDELIM),
i.ensureCapacity(i.offset+=1)
var r=i.offset
for(o=0;o<n.length;o++){
this.element.encodeValue(this.id,n[o],i)
}
var s=i.offset-r,u=e.calculateVarint32(s)
if(u>1){
var l=i.slice(r,i.offset)
r+=u-1,i.offset=r,i.append(l)
}
i.writeVarint32(s,r-u)
}else{
for(o=0;o<n.length;o++){
i.writeVarint32(this.id<<3|this.type.wireType),this.element.encodeValue(this.id,n[o],i)
}
}
}else{
this.map?n.forEach((function(n,a,o){
var r=e.calculateVarint32(8|this.keyType.wireType)+this.keyElement.calculateLength(1,a)+e.calculateVarint32(16|this.type.wireType)+this.element.calculateLength(2,n)
i.writeVarint32(this.id<<3|t.WIRE_TYPES.LDELIM),i.writeVarint32(r),i.writeVarint32(8|this.keyType.wireType),
this.keyElement.encodeValue(1,a,i),
i.writeVarint32(16|this.type.wireType),this.element.encodeValue(2,n,i)
}),this):this.hasWirePresence(n,a)&&(i.writeVarint32(this.id<<3|this.type.wireType),
this.element.encodeValue(this.id,n,i))
}
}catch(e){
throw Error("Illegal value for "+this.toString(!0)+": "+n+" ("+e+")")
}
return i
},h.calculate=function(n,i){
if(n=this.verifyValue(n),null===this.type||"object"!=typeof this.type){
throw Error("[INTERNAL] Unresolved type in "+this.toString(!0)+": "+this.type)
}
if(null===n||this.repeated&&0==n.length){
return 0
}
var a=0
try{
var o,r
if(this.repeated){
if(this.options.packed&&t.PACKABLE_WIRE_TYPES.indexOf(this.type.wireType)>=0){
for(a+=e.calculateVarint32(this.id<<3|t.WIRE_TYPES.LDELIM),
r=0,o=0;o<n.length;o++){
r+=this.element.calculateLength(this.id,n[o])
}
a+=e.calculateVarint32(r),a+=r
}else{
for(o=0;o<n.length;o++){
a+=e.calculateVarint32(this.id<<3|this.type.wireType),a+=this.element.calculateLength(this.id,n[o])
}
}
}else{
this.map?n.forEach((function(n,i,o){
var r=e.calculateVarint32(8|this.keyType.wireType)+this.keyElement.calculateLength(1,i)+e.calculateVarint32(16|this.type.wireType)+this.element.calculateLength(2,n)
a+=e.calculateVarint32(this.id<<3|t.WIRE_TYPES.LDELIM),a+=e.calculateVarint32(r),
a+=r
}),this):this.hasWirePresence(n,i)&&(a+=e.calculateVarint32(this.id<<3|this.type.wireType),
a+=this.element.calculateLength(this.id,n))
}
}catch(e){
throw Error("Illegal value for "+this.toString(!0)+": "+n+" ("+e+")")
}
return a
},h.decode=function(e,n,i){
var a,o
if(!(!this.map&&e==this.type.wireType||!i&&this.repeated&&this.options.packed&&e==t.WIRE_TYPES.LDELIM||this.map&&e==t.WIRE_TYPES.LDELIM)){
throw Error("Illegal wire type for field "+this.toString(!0)+": "+e+" ("+this.type.wireType+" expected)")
}
if(e==t.WIRE_TYPES.LDELIM&&this.repeated&&this.options.packed&&t.PACKABLE_WIRE_TYPES.indexOf(this.type.wireType)>=0&&!i){
o=n.readVarint32(),
o=n.offset+o
for(var r=[];n.offset<o;){
r.push(this.decode(this.type.wireType,n,!0))
}
return r
}
if(this.map){
var u=s.defaultFieldValue(this.keyType)
if(a=s.defaultFieldValue(this.type),o=n.readVarint32(),n.remaining()<o){
throw Error("Illegal number of bytes for "+this.toString(!0)+": "+o+" required but got only "+n.remaining())
}
var l=n.clone()
for(l.limit=l.offset+o,n.offset+=o;l.remaining()>0;){
var c=l.readVarint32()
e=7&c
var p=c>>>3
if(1===p){
u=this.keyElement.decode(l,e,p)
}else{
if(2!==p){
throw Error("Unexpected tag in map field key/value submessage")
}
a=this.element.decode(l,e,p)
}
}
return[u,a]
}
return this.element.decode(n,e,this.id)
},n.Message.Field=d
var g=function(e,t,n,i,a,o,r){
d.call(this,e,t,n,null,i,a,o,r),this.extension
}
g.prototype=Object.create(d.prototype),n.Message.ExtensionField=g,n.Message.OneOf=function(e,t,n){
i.call(this,e,t,n),
this.fields=[]
}
var f=function(e,t,n,i,a){
o.call(this,e,t,n,i,a),this.className="Enum",this.object=null
}
f.getName=function(e,t){
for(var n,i=Object.keys(e),a=0;a<i.length;++a){
if(e[n=i[a]]===t){
return n
}
}
return null
},(f.prototype=Object.create(o.prototype)).build=function(e){
if(this.object&&!e){
return this.object
}
for(var n=new t.Builder.Enum,i=this.getChildren(f.Value),a=0,o=i.length;a<o;++a){
n[i[a].name]=i[a].id
}
return Object.defineProperty&&Object.defineProperty(n,"$options",{
value:this.buildOpt(),
enumerable:!1
}),this.object=n
},n.Enum=f
var b=function(e,t,n,a){
i.call(this,e,t,n),this.className="Enum.Value",this.id=a
}
b.prototype=Object.create(i.prototype),n.Enum.Value=b
var y=function(e,t,n,a){
i.call(this,e,t,n),this.field=a
}
y.prototype=Object.create(i.prototype),n.Extension=y
var k=function(e,t,n,i){
o.call(this,e,t,n,i),this.className="Service",this.clazz=null
}
;(k.prototype=Object.create(o.prototype)).build=function(n){
return this.clazz&&!n?this.clazz:this.clazz=function(t,n){
for(var i=function(e){
t.Builder.Service.call(this),this.rpcImpl=e||function(e,t,n){
setTimeout(n.bind(this,Error("Not implemented, see: https://github.com/dcodeIO/ProtoBuf.js/wiki/Services")),0)
}
},a=i.prototype=Object.create(t.Builder.Service.prototype),o=n.getChildren(t.Reflect.Service.RPCMethod),r=0;r<o.length;r++){
!function(t){
a[t.name]=function(i,a){
try{
try{
i=t.resolvedRequestType.clazz.decode(e.wrap(i))
}catch(e){
if(!(e instanceof TypeError)){
throw e
}
}
if(null===i||"object"!=typeof i){
throw Error("Illegal arguments")
}
i instanceof t.resolvedRequestType.clazz||(i=new t.resolvedRequestType.clazz(i)),
this.rpcImpl(t.fqn(),i,(function(e,i){
if(e){
a(e)
}else{
null===i&&(i="")
try{
i=t.resolvedResponseType.clazz.decode(i)
}catch(e){}
i&&i instanceof t.resolvedResponseType.clazz?a(null,i):a(Error("Illegal response type received in service method "+n.name+"#"+t.name))
}
}))
}catch(e){
setTimeout(a.bind(this,e),0)
}
},i[t.name]=function(e,n,a){
new i(e)[t.name](n,a)
},Object.defineProperty&&(Object.defineProperty(i[t.name],"$options",{
value:t.buildOpt()
}),Object.defineProperty(a[t.name],"$options",{
value:i[t.name].$options
}))
}(o[r])
}
return Object.defineProperty&&(Object.defineProperty(i,"$options",{
value:n.buildOpt()
}),Object.defineProperty(a,"$options",{
value:i.$options
}),Object.defineProperty(i,"$type",{
value:n
}),Object.defineProperty(a,"$type",{
value:n
})),i
}(t,this)
},n.Service=k
var v=function(e,t,n,a){
i.call(this,e,t,n),this.className="Service.Method",this.options=a||{}
}
;(v.prototype=Object.create(i.prototype)).buildOpt=r.buildOpt,n.Service.Method=v
var w=function(e,t,n,i,a,o,r,s){
v.call(this,e,t,n,s),this.className="Service.RPCMethod",
this.requestName=i,this.responseName=a,
this.requestStream=o,this.responseStream=r,
this.resolvedRequestType=null,this.resolvedResponseType=null
}
return w.prototype=Object.create(v.prototype),n.Service.RPCMethod=w,n
}(o),o.Builder=function(e,t,i){
var a=function(e){
this.ns=new i.Namespace(this,null,""),this.ptr=this.ns,this.resolved=!1,
this.result=null,
this.files={},this.importRoot=null,this.options=e||{}
},o=a.prototype
return a.isMessage=function(e){
return"string"==typeof e.name&&void 0===e.values&&void 0===e.rpc
},a.isMessageField=function(e){
return"string"==typeof e.rule&&"string"==typeof e.name&&"string"==typeof e.type&&void 0!==e.id
},
a.isEnum=function(e){
return"string"==typeof e.name&&!(void 0===e.values||!Array.isArray(e.values)||0===e.values.length)
},
a.isService=function(e){
return!("string"!=typeof e.name||"object"!=typeof e.rpc||!e.rpc)
},a.isExtend=function(e){
return"string"==typeof e.ref
},o.reset=function(){
return this.ptr=this.ns,this
},o.define=function(e){
if("string"!=typeof e||!t.TYPEREF.test(e)){
throw Error("illegal namespace: "+e)
}
return e.split(".").forEach((function(e){
var t=this.ptr.getChild(e)
null===t&&this.ptr.addChild(t=new i.Namespace(this,this.ptr,e)),this.ptr=t
}),this),
this
},o.create=function(t){
if(!t){
return this
}
if(Array.isArray(t)){
if(0===t.length){
return this
}
t=t.slice()
}else{
t=[t]
}
for(var n=[t];n.length>0;){
if(t=n.pop(),!Array.isArray(t)){
throw Error("not a valid namespace: "+JSON.stringify(t))
}
for(;t.length>0;){
var o=t.shift()
if(a.isMessage(o)){
var r=new i.Message(this,this.ptr,o.name,o.options,o.isGroup,o.syntax),s={}
o.oneofs&&Object.keys(o.oneofs).forEach((function(e){
r.addChild(s[e]=new i.Message.OneOf(this,r,e))
}),this),o.fields&&o.fields.forEach((function(e){
if(null!==r.getChild(0|e.id)){
throw Error("duplicate or invalid field id in "+r.name+": "+e.id)
}
if(e.options&&"object"!=typeof e.options){
throw Error("illegal field options in "+r.name+"#"+e.name)
}
var t=null
if("string"==typeof e.oneof&&!(t=s[e.oneof])){
throw Error("illegal oneof in "+r.name+"#"+e.name+": "+e.oneof)
}
e=new i.Message.Field(this,r,e.rule,e.keytype,e.type,e.name,e.id,e.options,t,o.syntax),
t&&t.fields.push(e),
r.addChild(e)
}),this)
var u=[]
if(o.enums&&o.enums.forEach((function(e){
u.push(e)
})),o.messages&&o.messages.forEach((function(e){
u.push(e)
})),o.services&&o.services.forEach((function(e){
u.push(e)
})),o.extensions&&("number"==typeof o.extensions[0]?r.extensions=[o.extensions]:r.extensions=o.extensions),
this.ptr.addChild(r),
u.length>0){
n.push(t),t=u,u=null,this.ptr=r,r=null
continue
}
u=null
}else if(a.isEnum(o)){
r=new i.Enum(this,this.ptr,o.name,o.options,o.syntax),o.values.forEach((function(e){
r.addChild(new i.Enum.Value(this,r,e.name,e.id))
}),this),this.ptr.addChild(r)
}else if(a.isService(o)){
r=new i.Service(this,this.ptr,o.name,o.options),Object.keys(o.rpc).forEach((function(e){
var t=o.rpc[e]
r.addChild(new i.Service.RPCMethod(this,r,e,t.request,t.response,!!t.request_stream,!!t.response_stream,t.options))
}),this),
this.ptr.addChild(r)
}else{
if(!a.isExtend(o)){
throw Error("not a valid definition: "+JSON.stringify(o))
}
if(r=this.ptr.resolve(o.ref,!0)){
o.fields.forEach((function(t){
if(null!==r.getChild(0|t.id)){
throw Error("duplicate extended field id in "+r.name+": "+t.id)
}
if(r.extensions){
var n=!1
if(r.extensions.forEach((function(e){
t.id>=e[0]&&t.id<=e[1]&&(n=!0)
})),!n){
throw Error("illegal extended field id in "+r.name+": "+t.id+" (not within valid ranges)")
}
}
var a=t.name
this.options.convertFieldsToCamelCase&&(a=e.Util.toCamelCase(a))
var o=new i.Message.ExtensionField(this,r,t.rule,t.type,this.ptr.fqn()+"."+a,t.id,t.options),s=new i.Extension(this,this.ptr,t.name,o)
o.extension=s,this.ptr.addChild(s),r.addChild(o)
}),this)
}else if(!/\.?google\.protobuf\./.test(o.ref)){
throw Error("extended message "+o.ref+" is not defined")
}
}
o=null,r=null
}
t=null,this.ptr=this.ptr.parent
}
return this.resolved=!1,this.result=null,this
},o.import=function(t,i){
var a="/"
if("string"==typeof i){
if(e.Util.IS_NODE&&(i=n(6).resolve(i)),!0===this.files[i]){
return this.reset()
}
this.files[i]=!0
}else if("object"==typeof i){
var o,r=i.root
if(e.Util.IS_NODE&&(r=n(6).resolve(r)),(r.indexOf("\\")>=0||i.file.indexOf("\\")>=0)&&(a="\\"),
o=e.Util.IS_NODE?n(6).join(r,i.file):r+a+i.file,
!0===this.files[o]){
return this.reset()
}
this.files[o]=!0
}
if(t.imports&&t.imports.length>0){
var s,u=!1
"object"==typeof i?(this.importRoot=i.root,u=!0,s=this.importRoot,i=i.file,(s.indexOf("\\")>=0||i.indexOf("\\")>=0)&&(a="\\")):"string"==typeof i?this.importRoot?s=this.importRoot:i.indexOf("/")>=0?""===(s=i.replace(/\/[^\/]*$/,""))&&(s="/"):i.indexOf("\\")>=0?(s=i.replace(/\\[^\\]*$/,""),
a="\\"):s=".":s=null
for(var l=0;l<t.imports.length;l++){
if("string"==typeof t.imports[l]){
if(!s){
throw Error("cannot determine import root")
}
var c=t.imports[l]
if("google/protobuf/descriptor.proto"===c){
continue
}
if(c=e.Util.IS_NODE?n(6).join(s,c):s+a+c,!0===this.files[c]){
continue
}
/\.proto$/i.test(c)&&!e.DotProto&&(c=c.replace(/\.proto$/,".json"))
var p=e.Util.fetch(c)
if(null===p){
throw Error("failed to import '"+c+"' in '"+i+"': file not found")
}
/\.json$/i.test(c)?this.import(JSON.parse(p+""),c):this.import(e.DotProto.Parser.parse(p),c)
}else{
i?/\.(\w+)$/.test(i)?this.import(t.imports[l],i.replace(/^(.+)\.(\w+)$/,(function(e,t,n){
return t+"_import"+l+"."+n
}))):this.import(t.imports[l],i+"_import"+l):this.import(t.imports[l])
}
}
u&&(this.importRoot=null)
}
t.package&&this.define(t.package),t.syntax&&function e(t){
t.messages&&t.messages.forEach((function(n){
n.syntax=t.syntax,e(n)
})),t.enums&&t.enums.forEach((function(e){
e.syntax=t.syntax
}))
}(t)
var m=this.ptr
return t.options&&Object.keys(t.options).forEach((function(e){
m.options[e]=t.options[e]
})),t.messages&&(this.create(t.messages),this.ptr=m),t.enums&&(this.create(t.enums),
this.ptr=m),
t.services&&(this.create(t.services),this.ptr=m),t.extends&&this.create(t.extends),
this.reset()
},o.resolveAll=function(){
var n
if(null==this.ptr||"object"==typeof this.ptr.type){
return this
}
if(this.ptr instanceof i.Namespace){
this.ptr.children.forEach((function(e){
this.ptr=e,this.resolveAll()
}),this)
}else if(this.ptr instanceof i.Message.Field){
if(t.TYPE.test(this.ptr.type)){
this.ptr.type=e.TYPES[this.ptr.type]
}else{
if(!t.TYPEREF.test(this.ptr.type)){
throw Error("illegal type reference in "+this.ptr.toString(!0)+": "+this.ptr.type)
}
if(!(n=(this.ptr instanceof i.Message.ExtensionField?this.ptr.extension.parent:this.ptr.parent).resolve(this.ptr.type,!0))){
throw Error("unresolvable type reference in "+this.ptr.toString(!0)+": "+this.ptr.type)
}
if(this.ptr.resolvedType=n,n instanceof i.Enum){
if(this.ptr.type=e.TYPES.enum,"proto3"===this.ptr.syntax&&"proto3"!==n.syntax){
throw Error("proto3 message cannot reference proto2 enum")
}
}else{
if(!(n instanceof i.Message)){
throw Error("illegal type reference in "+this.ptr.toString(!0)+": "+this.ptr.type)
}
this.ptr.type=n.isGroup?e.TYPES.group:e.TYPES.message
}
}
if(this.ptr.map){
if(!t.TYPE.test(this.ptr.keyType)){
throw Error("illegal key type for map field in "+this.ptr.toString(!0)+": "+this.ptr.keyType)
}
this.ptr.keyType=e.TYPES[this.ptr.keyType]
}
"proto3"===this.ptr.syntax&&this.ptr.repeated&&void 0===this.ptr.options.packed&&-1!==e.PACKABLE_WIRE_TYPES.indexOf(this.ptr.type.wireType)&&(this.ptr.options.packed=!0)
}else if(this.ptr instanceof e.Reflect.Service.Method){
if(!(this.ptr instanceof e.Reflect.Service.RPCMethod)){
throw Error("illegal service type in "+this.ptr.toString(!0))
}
if(!((n=this.ptr.parent.resolve(this.ptr.requestName,!0))&&n instanceof e.Reflect.Message)){
throw Error("Illegal type reference in "+this.ptr.toString(!0)+": "+this.ptr.requestName)
}
if(this.ptr.resolvedRequestType=n,!((n=this.ptr.parent.resolve(this.ptr.responseName,!0))&&n instanceof e.Reflect.Message)){
throw Error("Illegal type reference in "+this.ptr.toString(!0)+": "+this.ptr.responseName)
}
this.ptr.resolvedResponseType=n
}else if(!(this.ptr instanceof e.Reflect.Message.OneOf||this.ptr instanceof e.Reflect.Extension||this.ptr instanceof e.Reflect.Enum.Value)){
throw Error("illegal object in namespace: "+typeof this.ptr+": "+this.ptr)
}
return this.reset()
},o.build=function(e){
if(this.reset(),this.resolved||(this.resolveAll(),this.resolved=!0,
this.result=null),
null===this.result&&(this.result=this.ns.build()),!e){
return this.result
}
for(var t="string"==typeof e?e.split("."):e,n=this.result,i=0;i<t.length;i++){
if(!n[t[i]]){
n=null
break
}
n=n[t[i]]
}
return n
},o.lookup=function(e,t){
return e?this.ns.resolve(e,t):this.ns
},o.toString=function(){
return"Builder"
},a.Message=function(){},a.Enum=function(){},a.Service=function(){},
a
}(o,o.Lang,o.Reflect),o.Map=function(e,t){
var n=function(e,n){
if(!e.map){
throw Error("field is not a map")
}
if(this.field=e,this.keyElem=new t.Element(e.keyType,null,!0,e.syntax),this.valueElem=new t.Element(e.type,e.resolvedType,!1,e.syntax),
this.map={},
Object.defineProperty(this,"size",{
get:function(){
return Object.keys(this.map).length
}
}),n){
for(var i=Object.keys(n),a=0;a<i.length;a++){
var o=this.keyElem.valueFromString(i[a]),r=this.valueElem.verifyValue(n[i[a]])
this.map[this.keyElem.valueToString(o)]={
key:o,
value:r
}
}
}
},i=n.prototype
function a(e){
var t=0
return{
next:function(){
return t<e.length?{
done:!1,
value:e[t++]
}:{
done:!0
}
}
}
}
return i.clear=function(){
this.map={}
},i.delete=function(e){
var t=this.keyElem.valueToString(this.keyElem.verifyValue(e)),n=t in this.map
return delete this.map[t],n
},i.entries=function(){
for(var e,t=[],n=Object.keys(this.map),i=0;i<n.length;i++){
t.push([(e=this.map[n[i]]).key,e.value])
}
return a(t)
},i.keys=function(){
for(var e=[],t=Object.keys(this.map),n=0;n<t.length;n++){
e.push(this.map[t[n]].key)
}
return a(e)
},i.values=function(){
for(var e=[],t=Object.keys(this.map),n=0;n<t.length;n++){
e.push(this.map[t[n]].value)
}
return a(e)
},i.forEach=function(e,t){
for(var n,i=Object.keys(this.map),a=0;a<i.length;a++){
e.call(t,(n=this.map[i[a]]).value,n.key,this)
}
},i.set=function(e,t){
var n=this.keyElem.verifyValue(e),i=this.valueElem.verifyValue(t)
return this.map[this.keyElem.valueToString(n)]={
key:n,
value:i
},this
},i.get=function(e){
var t=this.keyElem.valueToString(this.keyElem.verifyValue(e))
if(t in this.map){
return this.map[t].value
}
},i.has=function(e){
return this.keyElem.valueToString(this.keyElem.verifyValue(e))in this.map
},n
}(0,o.Reflect),o.loadProto=function(e,t,n){
return("string"==typeof t||t&&"string"==typeof t.file&&"string"==typeof t.root)&&(n=t,
t=void 0),
o.loadJson(o.DotProto.Parser.parse(e),t,n)
},o.protoFromString=o.loadProto,o.loadProtoFile=function(e,t,n){
if(t&&"object"==typeof t?(n=t,
t=null):t&&"function"==typeof t||(t=null),t){
return o.Util.fetch("string"==typeof e?e:e.root+"/"+e.file,(function(i){
if(null!==i){
try{
t(null,o.loadProto(i,n,e))
}catch(e){
t(e)
}
}else{
t(Error("Failed to fetch file"))
}
}))
}
var i=o.Util.fetch("object"==typeof e?e.root+"/"+e.file:e)
return null===i?null:o.loadProto(i,n,e)
},o.protoFromFile=o.loadProtoFile,o.newBuilder=function(e){
return void 0===(e=e||{}).convertFieldsToCamelCase&&(e.convertFieldsToCamelCase=o.convertFieldsToCamelCase),
void 0===e.populateAccessors&&(e.populateAccessors=o.populateAccessors),
new o.Builder(e)
},o.loadJson=function(e,t,n){
return("string"==typeof t||t&&"string"==typeof t.file&&"string"==typeof t.root)&&(n=t,
t=null),
t&&"object"==typeof t||(t=o.newBuilder()),"string"==typeof e&&(e=JSON.parse(e)),
t.import(e,n),
t.resolveAll(),t
},o.loadJsonFile=function(e,t,n){
if(t&&"object"==typeof t?(n=t,t=null):t&&"function"==typeof t||(t=null),
t){
return o.Util.fetch("string"==typeof e?e:e.root+"/"+e.file,(function(i){
if(null!==i){
try{
t(null,o.loadJson(JSON.parse(i),n,e))
}catch(e){
t(e)
}
}else{
t(Error("Failed to fetch file"))
}
}))
}
var i=o.Util.fetch("object"==typeof e?e.root+"/"+e.file:e)
return null===i?null:o.loadJson(JSON.parse(i),n,e)
},o
})?a.apply(t,o):a)||(e.exports=r)
}).call(this,n(10))
},function(e,t,n){
var i,a,o
a=[n(32)],void 0===(o="function"==typeof(i=function(e){
"use strict"
var t=function(e,n,a){
if(void 0===e&&(e=t.DEFAULT_CAPACITY),void 0===n&&(n=t.DEFAULT_ENDIAN),
void 0===a&&(a=t.DEFAULT_NOASSERT),
!a){
if((e|=0)<0){
throw RangeError("Illegal capacity")
}
n=!!n,a=!!a
}
this.buffer=0===e?i:new ArrayBuffer(e),this.view=0===e?null:new Uint8Array(this.buffer),
this.offset=0,
this.markedOffset=-1,this.limit=e,this.littleEndian=n,this.noAssert=a
}
t.VERSION="5.0.1",t.LITTLE_ENDIAN=!0,t.BIG_ENDIAN=!1,t.DEFAULT_CAPACITY=16,t.DEFAULT_ENDIAN=t.BIG_ENDIAN,
t.DEFAULT_NOASSERT=!1,
t.Long=e||null
var n=t.prototype
n.__isByteBuffer__,Object.defineProperty(n,"__isByteBuffer__",{
value:!0,
enumerable:!1,
configurable:!1
})
var i=new ArrayBuffer(0),a=String.fromCharCode
function o(e){
var t=0
return function(){
return t<e.length?e.charCodeAt(t++):null
}
}
function r(){
var e=[],t=[]
return function(){
if(0===arguments.length){
return t.join("")+a.apply(String,e)
}
e.length+arguments.length>1024&&(t.push(a.apply(String,e)),e.length=0),Array.prototype.push.apply(e,arguments)
}
}
function s(e,t,n,i,a){
var o,r,s=8*a-i-1,u=(1<<s)-1,l=u>>1,c=-7,p=n?a-1:0,m=n?-1:1,d=e[t+p]
for(p+=m,o=d&(1<<-c)-1,d>>=-c,c+=s;c>0;o=256*o+e[t+p],p+=m,c-=8){}
for(r=o&(1<<-c)-1,
o>>=-c,c+=i;c>0;r=256*r+e[t+p],p+=m,c-=8){}
if(0===o){
o=1-l
}else{
if(o===u){
return r?NaN:1/0*(d?-1:1)
}
r+=Math.pow(2,i),o-=l
}
return(d?-1:1)*r*Math.pow(2,o-i)
}
function u(e,t,n,i,a,o){
var r,s,u,l=8*o-a-1,c=(1<<l)-1,p=c>>1,m=23===a?Math.pow(2,-24)-Math.pow(2,-77):0,d=i?0:o-1,h=i?1:-1,g=t<0||0===t&&1/t<0?1:0
for(t=Math.abs(t),isNaN(t)||t===1/0?(s=isNaN(t)?1:0,r=c):(r=Math.floor(Math.log(t)/Math.LN2),
t*(u=Math.pow(2,-r))<1&&(r--,
u*=2),(t+=r+p>=1?m/u:m*Math.pow(2,1-p))*u>=2&&(r++,
u/=2),r+p>=c?(s=0,r=c):r+p>=1?(s=(t*u-1)*Math.pow(2,a),
r+=p):(s=t*Math.pow(2,p-1)*Math.pow(2,a),
r=0));a>=8;e[n+d]=255&s,d+=h,s/=256,a-=8){}
for(r=r<<a|s,l+=a;l>0;e[n+d]=255&r,d+=h,
r/=256,l-=8){}
e[n+d-h]|=128*g
}
t.accessor=function(){
return Uint8Array
},t.allocate=function(e,n,i){
return new t(e,n,i)
},t.concat=function(e,n,i,a){
"boolean"!=typeof n&&"string"==typeof n||(a=i,i=n,n=void 0)
for(var o,r=0,s=0,u=e.length;s<u;++s){
t.isByteBuffer(e[s])||(e[s]=t.wrap(e[s],n)),
(o=e[s].limit-e[s].offset)>0&&(r+=o)
}
if(0===r){
return new t(0,i,a)
}
var l,c=new t(r,i,a)
for(s=0;s<u;){
(o=(l=e[s++]).limit-l.offset)<=0||(c.view.set(l.view.subarray(l.offset,l.limit),c.offset),
c.offset+=o)
}
return c.limit=c.offset,c.offset=0,c
},t.isByteBuffer=function(e){
return!0===(e&&e.__isByteBuffer__)
},t.type=function(){
return ArrayBuffer
},t.wrap=function(e,i,a,o){
if("string"!=typeof i&&(o=a,a=i,i=void 0),"string"==typeof e){
switch(void 0===i&&(i="utf8"),
i){
case"base64":
return t.fromBase64(e,a)
case"hex":
return t.fromHex(e,a)
case"binary":
return t.fromBinary(e,a)
case"utf8":
return t.fromUTF8(e,a)
case"debug":
return t.fromDebug(e,a)
default:
throw Error("Unsupported encoding: "+i)
}
}
if(null===e||"object"!=typeof e){
throw TypeError("Illegal buffer")
}
var r
if(t.isByteBuffer(e)){
return(r=n.clone.call(e)).markedOffset=-1,r
}
if(e instanceof Uint8Array){
r=new t(0,a,o),e.length>0&&(r.buffer=e.buffer,r.offset=e.byteOffset,
r.limit=e.byteOffset+e.byteLength,
r.view=new Uint8Array(e.buffer))
}else if(e instanceof ArrayBuffer){
r=new t(0,a,o),e.byteLength>0&&(r.buffer=e,r.offset=0,
r.limit=e.byteLength,r.view=e.byteLength>0?new Uint8Array(e):null)
}else{
if("[object Array]"!==Object.prototype.toString.call(e)){
throw TypeError("Illegal buffer")
}
(r=new t(e.length,a,o)).limit=e.length
for(var s=0;s<e.length;++s){
r.view[s]=e[s]
}
}
return r
},n.writeBitSet=function(e,t){
var n=void 0===t
if(n&&(t=this.offset),!this.noAssert){
if(!(e instanceof Array)){
throw TypeError("Illegal BitSet: Not an array")
}
if("number"!=typeof t||t%1!=0){
throw TypeError("Illegal offset: "+t+" (not an integer)")
}
if((t>>>=0)<0||t+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+t+" (+0) <= "+this.buffer.byteLength)
}
}
var i,a=t,o=e.length,r=o>>3,s=0
for(t+=this.writeVarint32(o,t);r--;){
i=1&!!e[s++]|(1&!!e[s++])<<1|(1&!!e[s++])<<2|(1&!!e[s++])<<3|(1&!!e[s++])<<4|(1&!!e[s++])<<5|(1&!!e[s++])<<6|(1&!!e[s++])<<7,
this.writeByte(i,t++)
}
if(s<o){
var u=0
for(i=0;s<o;){
i|=(1&!!e[s++])<<u++
}
this.writeByte(i,t++)
}
return n?(this.offset=t,this):t-a
},n.readBitSet=function(e){
var t=void 0===e
t&&(e=this.offset)
var n,i=this.readVarint32(e),a=i.value,o=a>>3,r=0,s=[]
for(e+=i.length;o--;){
n=this.readByte(e++),s[r++]=!!(1&n),s[r++]=!!(2&n),s[r++]=!!(4&n),
s[r++]=!!(8&n),
s[r++]=!!(16&n),s[r++]=!!(32&n),s[r++]=!!(64&n),s[r++]=!!(128&n)
}
if(r<a){
var u=0
for(n=this.readByte(e++);r<a;){
s[r++]=!!(n>>u++&1)
}
}
return t&&(this.offset=e),s
},n.readBytes=function(e,t){
var n=void 0===t
if(n&&(t=this.offset),!this.noAssert){
if("number"!=typeof t||t%1!=0){
throw TypeError("Illegal offset: "+t+" (not an integer)")
}
if((t>>>=0)<0||t+e>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+t+" (+"+e+") <= "+this.buffer.byteLength)
}
}
var i=this.slice(t,t+e)
return n&&(this.offset+=e),i
},n.writeBytes=n.append,n.writeInt8=function(e,t){
var n=void 0===t
if(n&&(t=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal value: "+e+" (not an integer)")
}
if(e|=0,"number"!=typeof t||t%1!=0){
throw TypeError("Illegal offset: "+t+" (not an integer)")
}
if((t>>>=0)<0||t+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+t+" (+0) <= "+this.buffer.byteLength)
}
}
t+=1
var i=this.buffer.byteLength
return t>i&&this.resize((i*=2)>t?i:t),t-=1,this.view[t]=e,n&&(this.offset+=1),this
},
n.writeByte=n.writeInt8,n.readInt8=function(e){
var t=void 0===e
if(t&&(e=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal offset: "+e+" (not an integer)")
}
if((e>>>=0)<0||e+1>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+e+" (+1) <= "+this.buffer.byteLength)
}
}
var n=this.view[e]
return 128==(128&n)&&(n=-(255-n+1)),t&&(this.offset+=1),n
},n.readByte=n.readInt8,
n.writeUint8=function(e,t){
var n=void 0===t
if(n&&(t=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal value: "+e+" (not an integer)")
}
if(e>>>=0,"number"!=typeof t||t%1!=0){
throw TypeError("Illegal offset: "+t+" (not an integer)")
}
if((t>>>=0)<0||t+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+t+" (+0) <= "+this.buffer.byteLength)
}
}
t+=1
var i=this.buffer.byteLength
return t>i&&this.resize((i*=2)>t?i:t),t-=1,this.view[t]=e,n&&(this.offset+=1),this
},
n.writeUInt8=n.writeUint8,n.readUint8=function(e){
var t=void 0===e
if(t&&(e=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal offset: "+e+" (not an integer)")
}
if((e>>>=0)<0||e+1>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+e+" (+1) <= "+this.buffer.byteLength)
}
}
var n=this.view[e]
return t&&(this.offset+=1),n
},n.readUInt8=n.readUint8,n.writeInt16=function(e,t){
var n=void 0===t
if(n&&(t=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal value: "+e+" (not an integer)")
}
if(e|=0,"number"!=typeof t||t%1!=0){
throw TypeError("Illegal offset: "+t+" (not an integer)")
}
if((t>>>=0)<0||t+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+t+" (+0) <= "+this.buffer.byteLength)
}
}
t+=2
var i=this.buffer.byteLength
return t>i&&this.resize((i*=2)>t?i:t),t-=2,this.littleEndian?(this.view[t+1]=(65280&e)>>>8,
this.view[t]=255&e):(this.view[t]=(65280&e)>>>8,
this.view[t+1]=255&e),n&&(this.offset+=2),
this
},n.writeShort=n.writeInt16,n.readInt16=function(e){
var t=void 0===e
if(t&&(e=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal offset: "+e+" (not an integer)")
}
if((e>>>=0)<0||e+2>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+e+" (+2) <= "+this.buffer.byteLength)
}
}
var n=0
return this.littleEndian?(n=this.view[e],n|=this.view[e+1]<<8):(n=this.view[e]<<8,
n|=this.view[e+1]),
32768==(32768&n)&&(n=-(65535-n+1)),t&&(this.offset+=2),n
},n.readShort=n.readInt16,
n.writeUint16=function(e,t){
var n=void 0===t
if(n&&(t=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal value: "+e+" (not an integer)")
}
if(e>>>=0,"number"!=typeof t||t%1!=0){
throw TypeError("Illegal offset: "+t+" (not an integer)")
}
if((t>>>=0)<0||t+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+t+" (+0) <= "+this.buffer.byteLength)
}
}
t+=2
var i=this.buffer.byteLength
return t>i&&this.resize((i*=2)>t?i:t),t-=2,this.littleEndian?(this.view[t+1]=(65280&e)>>>8,
this.view[t]=255&e):(this.view[t]=(65280&e)>>>8,
this.view[t+1]=255&e),n&&(this.offset+=2),
this
},n.writeUInt16=n.writeUint16,n.readUint16=function(e){
var t=void 0===e
if(t&&(e=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal offset: "+e+" (not an integer)")
}
if((e>>>=0)<0||e+2>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+e+" (+2) <= "+this.buffer.byteLength)
}
}
var n=0
return this.littleEndian?(n=this.view[e],n|=this.view[e+1]<<8):(n=this.view[e]<<8,
n|=this.view[e+1]),
t&&(this.offset+=2),n
},n.readUInt16=n.readUint16,n.writeInt32=function(e,t){
var n=void 0===t
if(n&&(t=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal value: "+e+" (not an integer)")
}
if(e|=0,"number"!=typeof t||t%1!=0){
throw TypeError("Illegal offset: "+t+" (not an integer)")
}
if((t>>>=0)<0||t+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+t+" (+0) <= "+this.buffer.byteLength)
}
}
t+=4
var i=this.buffer.byteLength
return t>i&&this.resize((i*=2)>t?i:t),t-=4,this.littleEndian?(this.view[t+3]=e>>>24&255,
this.view[t+2]=e>>>16&255,
this.view[t+1]=e>>>8&255,this.view[t]=255&e):(this.view[t]=e>>>24&255,
this.view[t+1]=e>>>16&255,
this.view[t+2]=e>>>8&255,this.view[t+3]=255&e),n&&(this.offset+=4),
this
},n.writeInt=n.writeInt32,n.readInt32=function(e){
var t=void 0===e
if(t&&(e=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal offset: "+e+" (not an integer)")
}
if((e>>>=0)<0||e+4>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+e+" (+4) <= "+this.buffer.byteLength)
}
}
var n=0
return this.littleEndian?(n=this.view[e+2]<<16,n|=this.view[e+1]<<8,n|=this.view[e],
n+=this.view[e+3]<<24>>>0):(n=this.view[e+1]<<16,
n|=this.view[e+2]<<8,n|=this.view[e+3],
n+=this.view[e]<<24>>>0),n|=0,t&&(this.offset+=4),
n
},n.readInt=n.readInt32,n.writeUint32=function(e,t){
var n=void 0===t
if(n&&(t=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal value: "+e+" (not an integer)")
}
if(e>>>=0,"number"!=typeof t||t%1!=0){
throw TypeError("Illegal offset: "+t+" (not an integer)")
}
if((t>>>=0)<0||t+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+t+" (+0) <= "+this.buffer.byteLength)
}
}
t+=4
var i=this.buffer.byteLength
return t>i&&this.resize((i*=2)>t?i:t),t-=4,this.littleEndian?(this.view[t+3]=e>>>24&255,
this.view[t+2]=e>>>16&255,
this.view[t+1]=e>>>8&255,this.view[t]=255&e):(this.view[t]=e>>>24&255,
this.view[t+1]=e>>>16&255,
this.view[t+2]=e>>>8&255,this.view[t+3]=255&e),n&&(this.offset+=4),
this
},n.writeUInt32=n.writeUint32,n.readUint32=function(e){
var t=void 0===e
if(t&&(e=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal offset: "+e+" (not an integer)")
}
if((e>>>=0)<0||e+4>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+e+" (+4) <= "+this.buffer.byteLength)
}
}
var n=0
return this.littleEndian?(n=this.view[e+2]<<16,n|=this.view[e+1]<<8,n|=this.view[e],
n+=this.view[e+3]<<24>>>0):(n=this.view[e+1]<<16,
n|=this.view[e+2]<<8,n|=this.view[e+3],
n+=this.view[e]<<24>>>0),t&&(this.offset+=4),
n
},n.readUInt32=n.readUint32,e&&(n.writeInt64=function(t,n){
var i=void 0===n
if(i&&(n=this.offset),!this.noAssert){
if("number"==typeof t){
t=e.fromNumber(t)
}else if("string"==typeof t){
t=e.fromString(t)
}else if(!(t&&t instanceof e)){
throw TypeError("Illegal value: "+t+" (not an integer or Long)")
}
if("number"!=typeof n||n%1!=0){
throw TypeError("Illegal offset: "+n+" (not an integer)")
}
if((n>>>=0)<0||n+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+n+" (+0) <= "+this.buffer.byteLength)
}
}
"number"==typeof t?t=e.fromNumber(t):"string"==typeof t&&(t=e.fromString(t)),n+=8
var a=this.buffer.byteLength
n>a&&this.resize((a*=2)>n?a:n),n-=8
var o=t.low,r=t.high
return this.littleEndian?(this.view[n+3]=o>>>24&255,this.view[n+2]=o>>>16&255,this.view[n+1]=o>>>8&255,
this.view[n]=255&o,
n+=4,this.view[n+3]=r>>>24&255,this.view[n+2]=r>>>16&255,this.view[n+1]=r>>>8&255,
this.view[n]=255&r):(this.view[n]=r>>>24&255,
this.view[n+1]=r>>>16&255,this.view[n+2]=r>>>8&255,
this.view[n+3]=255&r,n+=4,this.view[n]=o>>>24&255,
this.view[n+1]=o>>>16&255,this.view[n+2]=o>>>8&255,
this.view[n+3]=255&o),i&&(this.offset+=8),
this
},n.writeLong=n.writeInt64,n.readInt64=function(t){
var n=void 0===t
if(n&&(t=this.offset),!this.noAssert){
if("number"!=typeof t||t%1!=0){
throw TypeError("Illegal offset: "+t+" (not an integer)")
}
if((t>>>=0)<0||t+8>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+t+" (+8) <= "+this.buffer.byteLength)
}
}
var i=0,a=0
this.littleEndian?(i=this.view[t+2]<<16,i|=this.view[t+1]<<8,i|=this.view[t],i+=this.view[t+3]<<24>>>0,
t+=4,
a=this.view[t+2]<<16,a|=this.view[t+1]<<8,a|=this.view[t],a+=this.view[t+3]<<24>>>0):(a=this.view[t+1]<<16,
a|=this.view[t+2]<<8,
a|=this.view[t+3],a+=this.view[t]<<24>>>0,t+=4,i=this.view[t+1]<<16,
i|=this.view[t+2]<<8,
i|=this.view[t+3],i+=this.view[t]<<24>>>0)
var o=new e(i,a,!1)
return n&&(this.offset+=8),o
},n.readLong=n.readInt64,n.writeUint64=function(t,n){
var i=void 0===n
if(i&&(n=this.offset),!this.noAssert){
if("number"==typeof t){
t=e.fromNumber(t)
}else if("string"==typeof t){
t=e.fromString(t)
}else if(!(t&&t instanceof e)){
throw TypeError("Illegal value: "+t+" (not an integer or Long)")
}
if("number"!=typeof n||n%1!=0){
throw TypeError("Illegal offset: "+n+" (not an integer)")
}
if((n>>>=0)<0||n+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+n+" (+0) <= "+this.buffer.byteLength)
}
}
"number"==typeof t?t=e.fromNumber(t):"string"==typeof t&&(t=e.fromString(t)),n+=8
var a=this.buffer.byteLength
n>a&&this.resize((a*=2)>n?a:n),n-=8
var o=t.low,r=t.high
return this.littleEndian?(this.view[n+3]=o>>>24&255,this.view[n+2]=o>>>16&255,this.view[n+1]=o>>>8&255,
this.view[n]=255&o,
n+=4,this.view[n+3]=r>>>24&255,this.view[n+2]=r>>>16&255,this.view[n+1]=r>>>8&255,
this.view[n]=255&r):(this.view[n]=r>>>24&255,
this.view[n+1]=r>>>16&255,this.view[n+2]=r>>>8&255,
this.view[n+3]=255&r,n+=4,this.view[n]=o>>>24&255,
this.view[n+1]=o>>>16&255,this.view[n+2]=o>>>8&255,
this.view[n+3]=255&o),i&&(this.offset+=8),
this
},n.writeUInt64=n.writeUint64,n.readUint64=function(t){
var n=void 0===t
if(n&&(t=this.offset),!this.noAssert){
if("number"!=typeof t||t%1!=0){
throw TypeError("Illegal offset: "+t+" (not an integer)")
}
if((t>>>=0)<0||t+8>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+t+" (+8) <= "+this.buffer.byteLength)
}
}
var i=0,a=0
this.littleEndian?(i=this.view[t+2]<<16,i|=this.view[t+1]<<8,i|=this.view[t],i+=this.view[t+3]<<24>>>0,
t+=4,
a=this.view[t+2]<<16,a|=this.view[t+1]<<8,a|=this.view[t],a+=this.view[t+3]<<24>>>0):(a=this.view[t+1]<<16,
a|=this.view[t+2]<<8,
a|=this.view[t+3],a+=this.view[t]<<24>>>0,t+=4,i=this.view[t+1]<<16,
i|=this.view[t+2]<<8,
i|=this.view[t+3],i+=this.view[t]<<24>>>0)
var o=new e(i,a,!0)
return n&&(this.offset+=8),o
},n.readUInt64=n.readUint64),n.writeFloat32=function(e,t){
var n=void 0===t
if(n&&(t=this.offset),!this.noAssert){
if("number"!=typeof e){
throw TypeError("Illegal value: "+e+" (not a number)")
}
if("number"!=typeof t||t%1!=0){
throw TypeError("Illegal offset: "+t+" (not an integer)")
}
if((t>>>=0)<0||t+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+t+" (+0) <= "+this.buffer.byteLength)
}
}
t+=4
var i=this.buffer.byteLength
return t>i&&this.resize((i*=2)>t?i:t),t-=4,u(this.view,e,t,this.littleEndian,23,4),
n&&(this.offset+=4),
this
},n.writeFloat=n.writeFloat32,n.readFloat32=function(e){
var t=void 0===e
if(t&&(e=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal offset: "+e+" (not an integer)")
}
if((e>>>=0)<0||e+4>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+e+" (+4) <= "+this.buffer.byteLength)
}
}
var n=s(this.view,e,this.littleEndian,23,4)
return t&&(this.offset+=4),n
},n.readFloat=n.readFloat32,n.writeFloat64=function(e,t){
var n=void 0===t
if(n&&(t=this.offset),!this.noAssert){
if("number"!=typeof e){
throw TypeError("Illegal value: "+e+" (not a number)")
}
if("number"!=typeof t||t%1!=0){
throw TypeError("Illegal offset: "+t+" (not an integer)")
}
if((t>>>=0)<0||t+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+t+" (+0) <= "+this.buffer.byteLength)
}
}
t+=8
var i=this.buffer.byteLength
return t>i&&this.resize((i*=2)>t?i:t),t-=8,u(this.view,e,t,this.littleEndian,52,8),
n&&(this.offset+=8),
this
},n.writeDouble=n.writeFloat64,n.readFloat64=function(e){
var t=void 0===e
if(t&&(e=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal offset: "+e+" (not an integer)")
}
if((e>>>=0)<0||e+8>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+e+" (+8) <= "+this.buffer.byteLength)
}
}
var n=s(this.view,e,this.littleEndian,52,8)
return t&&(this.offset+=8),n
},n.readDouble=n.readFloat64,t.MAX_VARINT32_BYTES=5,
t.calculateVarint32=function(e){
return(e>>>=0)<128?1:e<16384?2:e<1<<21?3:e<1<<28?4:5
},t.zigZagEncode32=function(e){
return((e|=0)<<1^e>>31)>>>0
},t.zigZagDecode32=function(e){
return e>>>1^-(1&e)|0
},n.writeVarint32=function(e,n){
var i=void 0===n
if(i&&(n=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal value: "+e+" (not an integer)")
}
if(e|=0,"number"!=typeof n||n%1!=0){
throw TypeError("Illegal offset: "+n+" (not an integer)")
}
if((n>>>=0)<0||n+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+n+" (+0) <= "+this.buffer.byteLength)
}
}
var a,o=t.calculateVarint32(e)
n+=o
var r=this.buffer.byteLength
for(n>r&&this.resize((r*=2)>n?r:n),n-=o,e>>>=0;e>=128;){
a=127&e|128,this.view[n++]=a,
e>>>=7
}
return this.view[n++]=e,i?(this.offset=n,this):o
},n.writeVarint32ZigZag=function(e,n){
return this.writeVarint32(t.zigZagEncode32(e),n)
},n.readVarint32=function(e){
var t=void 0===e
if(t&&(e=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal offset: "+e+" (not an integer)")
}
if((e>>>=0)<0||e+1>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+e+" (+1) <= "+this.buffer.byteLength)
}
}
var n,i=0,a=0
do{
if(!this.noAssert&&e>this.limit){
var o=Error("Truncated")
throw o.truncated=!0,o
}
n=this.view[e++],i<5&&(a|=(127&n)<<7*i),++i
}while(0!=(128&n))
return a|=0,t?(this.offset=e,a):{
value:a,
length:i
}
},n.readVarint32ZigZag=function(e){
var n=this.readVarint32(e)
return"object"==typeof n?n.value=t.zigZagDecode32(n.value):n=t.zigZagDecode32(n),
n
},e&&(t.MAX_VARINT64_BYTES=10,t.calculateVarint64=function(t){
"number"==typeof t?t=e.fromNumber(t):"string"==typeof t&&(t=e.fromString(t))
var n=t.toInt()>>>0,i=t.shiftRightUnsigned(28).toInt()>>>0,a=t.shiftRightUnsigned(56).toInt()>>>0
return 0==a?0==i?n<16384?n<128?1:2:n<1<<21?3:4:i<16384?i<128?5:6:i<1<<21?7:8:a<128?9:10
},
t.zigZagEncode64=function(t){
return"number"==typeof t?t=e.fromNumber(t,!1):"string"==typeof t?t=e.fromString(t,!1):!1!==t.unsigned&&(t=t.toSigned()),
t.shiftLeft(1).xor(t.shiftRight(63)).toUnsigned()
},t.zigZagDecode64=function(t){
return"number"==typeof t?t=e.fromNumber(t,!1):"string"==typeof t?t=e.fromString(t,!1):!1!==t.unsigned&&(t=t.toSigned()),
t.shiftRightUnsigned(1).xor(t.and(e.ONE).toSigned().negate()).toSigned()
},n.writeVarint64=function(n,i){
var a=void 0===i
if(a&&(i=this.offset),!this.noAssert){
if("number"==typeof n){
n=e.fromNumber(n)
}else if("string"==typeof n){
n=e.fromString(n)
}else if(!(n&&n instanceof e)){
throw TypeError("Illegal value: "+n+" (not an integer or Long)")
}
if("number"!=typeof i||i%1!=0){
throw TypeError("Illegal offset: "+i+" (not an integer)")
}
if((i>>>=0)<0||i+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+i+" (+0) <= "+this.buffer.byteLength)
}
}
"number"==typeof n?n=e.fromNumber(n,!1):"string"==typeof n?n=e.fromString(n,!1):!1!==n.unsigned&&(n=n.toSigned())
var o=t.calculateVarint64(n),r=n.toInt()>>>0,s=n.shiftRightUnsigned(28).toInt()>>>0,u=n.shiftRightUnsigned(56).toInt()>>>0
i+=o
var l=this.buffer.byteLength
switch(i>l&&this.resize((l*=2)>i?l:i),i-=o,o){
case 10:
this.view[i+9]=u>>>7&1
case 9:
this.view[i+8]=9!==o?128|u:127&u
case 8:
this.view[i+7]=8!==o?s>>>21|128:s>>>21&127
case 7:
this.view[i+6]=7!==o?s>>>14|128:s>>>14&127
case 6:
this.view[i+5]=6!==o?s>>>7|128:s>>>7&127
case 5:
this.view[i+4]=5!==o?128|s:127&s
case 4:
this.view[i+3]=4!==o?r>>>21|128:r>>>21&127
case 3:
this.view[i+2]=3!==o?r>>>14|128:r>>>14&127
case 2:
this.view[i+1]=2!==o?r>>>7|128:r>>>7&127
case 1:
this.view[i]=1!==o?128|r:127&r
}
return a?(this.offset+=o,this):o
},n.writeVarint64ZigZag=function(e,n){
return this.writeVarint64(t.zigZagEncode64(e),n)
},n.readVarint64=function(t){
var n=void 0===t
if(n&&(t=this.offset),!this.noAssert){
if("number"!=typeof t||t%1!=0){
throw TypeError("Illegal offset: "+t+" (not an integer)")
}
if((t>>>=0)<0||t+1>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+t+" (+1) <= "+this.buffer.byteLength)
}
}
var i=t,a=0,o=0,r=0,s=0
if(a=127&(s=this.view[t++]),128&s&&(a|=(127&(s=this.view[t++]))<<7,(128&s||this.noAssert&&void 0===s)&&(a|=(127&(s=this.view[t++]))<<14,
(128&s||this.noAssert&&void 0===s)&&(a|=(127&(s=this.view[t++]))<<21,
(128&s||this.noAssert&&void 0===s)&&(o=127&(s=this.view[t++]),
(128&s||this.noAssert&&void 0===s)&&(o|=(127&(s=this.view[t++]))<<7,
(128&s||this.noAssert&&void 0===s)&&(o|=(127&(s=this.view[t++]))<<14,
(128&s||this.noAssert&&void 0===s)&&(o|=(127&(s=this.view[t++]))<<21,
(128&s||this.noAssert&&void 0===s)&&(r=127&(s=this.view[t++]),
(128&s||this.noAssert&&void 0===s)&&(r|=(127&(s=this.view[t++]))<<7,
128&s||this.noAssert&&void 0===s)))))))))){
throw Error("Buffer overrun")
}
var u=e.fromBits(a|o<<28,o>>>4|r<<24,!1)
return n?(this.offset=t,u):{
value:u,
length:t-i
}
},n.readVarint64ZigZag=function(n){
var i=this.readVarint64(n)
return i&&i.value instanceof e?i.value=t.zigZagDecode64(i.value):i=t.zigZagDecode64(i),
i
}),n.writeCString=function(e,t){
var n=void 0===t
n&&(t=this.offset)
var i,a=e.length
if(!this.noAssert){
if("string"!=typeof e){
throw TypeError("Illegal str: Not a string")
}
for(i=0;i<a;++i){
if(0===e.charCodeAt(i)){
throw RangeError("Illegal str: Contains NULL-characters")
}
}
if("number"!=typeof t||t%1!=0){
throw TypeError("Illegal offset: "+t+" (not an integer)")
}
if((t>>>=0)<0||t+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+t+" (+0) <= "+this.buffer.byteLength)
}
}
a=c.calculateUTF16asUTF8(o(e))[1],t+=a+1
var r=this.buffer.byteLength
return t>r&&this.resize((r*=2)>t?r:t),t-=a+1,c.encodeUTF16toUTF8(o(e),function(e){
this.view[t++]=e
}.bind(this)),this.view[t++]=0,n?(this.offset=t,this):a
},n.readCString=function(e){
var t=void 0===e
if(t&&(e=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal offset: "+e+" (not an integer)")
}
if((e>>>=0)<0||e+1>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+e+" (+1) <= "+this.buffer.byteLength)
}
}
var n,i=e,a=-1
return c.decodeUTF8toUTF16(function(){
if(0===a){
return null
}
if(e>=this.limit){
throw RangeError("Illegal range: Truncated data, "+e+" < "+this.limit)
}
return 0===(a=this.view[e++])?null:a
}.bind(this),n=r(),!0),t?(this.offset=e,n()):{
string:n(),
length:e-i
}
},n.writeIString=function(e,t){
var n=void 0===t
if(n&&(t=this.offset),!this.noAssert){
if("string"!=typeof e){
throw TypeError("Illegal str: Not a string")
}
if("number"!=typeof t||t%1!=0){
throw TypeError("Illegal offset: "+t+" (not an integer)")
}
if((t>>>=0)<0||t+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+t+" (+0) <= "+this.buffer.byteLength)
}
}
var i,a=t
i=c.calculateUTF16asUTF8(o(e),this.noAssert)[1],t+=4+i
var r=this.buffer.byteLength
if(t>r&&this.resize((r*=2)>t?r:t),t-=4+i,this.littleEndian?(this.view[t+3]=i>>>24&255,
this.view[t+2]=i>>>16&255,
this.view[t+1]=i>>>8&255,this.view[t]=255&i):(this.view[t]=i>>>24&255,
this.view[t+1]=i>>>16&255,
this.view[t+2]=i>>>8&255,this.view[t+3]=255&i),t+=4,c.encodeUTF16toUTF8(o(e),function(e){
this.view[t++]=e
}.bind(this)),t!==a+4+i){
throw RangeError("Illegal range: Truncated data, "+t+" == "+(t+4+i))
}
return n?(this.offset=t,this):t-a
},n.readIString=function(e){
var n=void 0===e
if(n&&(e=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal offset: "+e+" (not an integer)")
}
if((e>>>=0)<0||e+4>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+e+" (+4) <= "+this.buffer.byteLength)
}
}
var i=e,a=this.readUint32(e),o=this.readUTF8String(a,t.METRICS_BYTES,e+=4)
return e+=o.length,n?(this.offset=e,o.string):{
string:o.string,
length:e-i
}
},t.METRICS_CHARS="c",t.METRICS_BYTES="b",n.writeUTF8String=function(e,t){
var n,i=void 0===t
if(i&&(t=this.offset),!this.noAssert){
if("number"!=typeof t||t%1!=0){
throw TypeError("Illegal offset: "+t+" (not an integer)")
}
if((t>>>=0)<0||t+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+t+" (+0) <= "+this.buffer.byteLength)
}
}
var a=t
n=c.calculateUTF16asUTF8(o(e))[1],t+=n
var r=this.buffer.byteLength
return t>r&&this.resize((r*=2)>t?r:t),t-=n,c.encodeUTF16toUTF8(o(e),function(e){
this.view[t++]=e
}.bind(this)),i?(this.offset=t,this):t-a
},n.writeString=n.writeUTF8String,t.calculateUTF8Chars=function(e){
return c.calculateUTF16asUTF8(o(e))[0]
},t.calculateUTF8Bytes=function(e){
return c.calculateUTF16asUTF8(o(e))[1]
},t.calculateString=t.calculateUTF8Bytes,n.readUTF8String=function(e,n,i){
"number"==typeof n&&(i=n,
n=void 0)
var a=void 0===i
if(a&&(i=this.offset),void 0===n&&(n=t.METRICS_CHARS),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal length: "+e+" (not an integer)")
}
if(e|=0,"number"!=typeof i||i%1!=0){
throw TypeError("Illegal offset: "+i+" (not an integer)")
}
if((i>>>=0)<0||i+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+i+" (+0) <= "+this.buffer.byteLength)
}
}
var o,s=0,u=i
if(n===t.METRICS_CHARS){
if(o=r(),c.decodeUTF8(function(){
return s<e&&i<this.limit?this.view[i++]:null
}.bind(this),(function(e){
++s,c.UTF8toUTF16(e,o)
})),s!==e){
throw RangeError("Illegal range: Truncated data, "+s+" == "+e)
}
return a?(this.offset=i,o()):{
string:o(),
length:i-u
}
}
if(n===t.METRICS_BYTES){
if(!this.noAssert){
if("number"!=typeof i||i%1!=0){
throw TypeError("Illegal offset: "+i+" (not an integer)")
}
if((i>>>=0)<0||i+e>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+i+" (+"+e+") <= "+this.buffer.byteLength)
}
}
var l=i+e
if(c.decodeUTF8toUTF16(function(){
return i<l?this.view[i++]:null
}.bind(this),o=r(),this.noAssert),i!==l){
throw RangeError("Illegal range: Truncated data, "+i+" == "+l)
}
return a?(this.offset=i,o()):{
string:o(),
length:i-u
}
}
throw TypeError("Unsupported metrics: "+n)
},n.readString=n.readUTF8String,n.writeVString=function(e,n){
var i=void 0===n
if(i&&(n=this.offset),!this.noAssert){
if("string"!=typeof e){
throw TypeError("Illegal str: Not a string")
}
if("number"!=typeof n||n%1!=0){
throw TypeError("Illegal offset: "+n+" (not an integer)")
}
if((n>>>=0)<0||n+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+n+" (+0) <= "+this.buffer.byteLength)
}
}
var a,r,s=n
a=c.calculateUTF16asUTF8(o(e),this.noAssert)[1],r=t.calculateVarint32(a),n+=r+a
var u=this.buffer.byteLength
if(n>u&&this.resize((u*=2)>n?u:n),n-=r+a,n+=this.writeVarint32(a,n),c.encodeUTF16toUTF8(o(e),function(e){
this.view[n++]=e
}.bind(this)),n!==s+a+r){
throw RangeError("Illegal range: Truncated data, "+n+" == "+(n+a+r))
}
return i?(this.offset=n,this):n-s
},n.readVString=function(e){
var n=void 0===e
if(n&&(e=this.offset),!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal offset: "+e+" (not an integer)")
}
if((e>>>=0)<0||e+1>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+e+" (+1) <= "+this.buffer.byteLength)
}
}
var i=e,a=this.readVarint32(e),o=this.readUTF8String(a.value,t.METRICS_BYTES,e+=a.length)
return e+=o.length,n?(this.offset=e,o.string):{
string:o.string,
length:e-i
}
},n.append=function(e,n,i){
"number"!=typeof n&&"string"==typeof n||(i=n,n=void 0)
var a=void 0===i
if(a&&(i=this.offset),!this.noAssert){
if("number"!=typeof i||i%1!=0){
throw TypeError("Illegal offset: "+i+" (not an integer)")
}
if((i>>>=0)<0||i+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+i+" (+0) <= "+this.buffer.byteLength)
}
}
e instanceof t||(e=t.wrap(e,n))
var o=e.limit-e.offset
if(o<=0){
return this
}
i+=o
var r=this.buffer.byteLength
return i>r&&this.resize((r*=2)>i?r:i),i-=o,this.view.set(e.view.subarray(e.offset,e.limit),i),
e.offset+=o,
a&&(this.offset+=o),this
},n.appendTo=function(e,t){
return e.append(this,t),this
},n.assert=function(e){
return this.noAssert=!e,this
},n.capacity=function(){
return this.buffer.byteLength
},n.clear=function(){
return this.offset=0,this.limit=this.buffer.byteLength,this.markedOffset=-1,
this
},n.clone=function(e){
var n=new t(0,this.littleEndian,this.noAssert)
return e?(n.buffer=new ArrayBuffer(this.buffer.byteLength),n.view=new Uint8Array(n.buffer)):(n.buffer=this.buffer,
n.view=this.view),
n.offset=this.offset,n.markedOffset=this.markedOffset,n.limit=this.limit,
n
},n.compact=function(e,t){
if(void 0===e&&(e=this.offset),void 0===t&&(t=this.limit),
!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal begin: Not an integer")
}
if(e>>>=0,"number"!=typeof t||t%1!=0){
throw TypeError("Illegal end: Not an integer")
}
if(t>>>=0,e<0||e>t||t>this.buffer.byteLength){
throw RangeError("Illegal range: 0 <= "+e+" <= "+t+" <= "+this.buffer.byteLength)
}
}
if(0===e&&t===this.buffer.byteLength){
return this
}
var n=t-e
if(0===n){
return this.buffer=i,this.view=null,this.markedOffset>=0&&(this.markedOffset-=e),
this.offset=0,
this.limit=0,this
}
var a=new ArrayBuffer(n),o=new Uint8Array(a)
return o.set(this.view.subarray(e,t)),this.buffer=a,this.view=o,this.markedOffset>=0&&(this.markedOffset-=e),
this.offset=0,
this.limit=n,this
},n.copy=function(e,n){
if(void 0===e&&(e=this.offset),void 0===n&&(n=this.limit),
!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal begin: Not an integer")
}
if(e>>>=0,"number"!=typeof n||n%1!=0){
throw TypeError("Illegal end: Not an integer")
}
if(n>>>=0,e<0||e>n||n>this.buffer.byteLength){
throw RangeError("Illegal range: 0 <= "+e+" <= "+n+" <= "+this.buffer.byteLength)
}
}
if(e===n){
return new t(0,this.littleEndian,this.noAssert)
}
var i=n-e,a=new t(i,this.littleEndian,this.noAssert)
return a.offset=0,a.limit=i,a.markedOffset>=0&&(a.markedOffset-=e),this.copyTo(a,0,e,n),
a
},n.copyTo=function(e,n,i,a){
var o,r
if(!this.noAssert&&!t.isByteBuffer(e)){
throw TypeError("Illegal target: Not a ByteBuffer")
}
if(n=(r=void 0===n)?e.offset:0|n,i=(o=void 0===i)?this.offset:0|i,a=void 0===a?this.limit:0|a,
n<0||n>e.buffer.byteLength){
throw RangeError("Illegal target range: 0 <= "+n+" <= "+e.buffer.byteLength)
}
if(i<0||a>this.buffer.byteLength){
throw RangeError("Illegal source range: 0 <= "+i+" <= "+this.buffer.byteLength)
}
var s=a-i
return 0===s?e:(e.ensureCapacity(n+s),e.view.set(this.view.subarray(i,a),n),o&&(this.offset+=s),
r&&(e.offset+=s),
this)
},n.ensureCapacity=function(e){
var t=this.buffer.byteLength
return t<e?this.resize((t*=2)>e?t:e):this
},n.fill=function(e,t,n){
var i=void 0===t
if(i&&(t=this.offset),"string"==typeof e&&e.length>0&&(e=e.charCodeAt(0)),void 0===t&&(t=this.offset),
void 0===n&&(n=this.limit),
!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal value: "+e+" (not an integer)")
}
if(e|=0,"number"!=typeof t||t%1!=0){
throw TypeError("Illegal begin: Not an integer")
}
if(t>>>=0,"number"!=typeof n||n%1!=0){
throw TypeError("Illegal end: Not an integer")
}
if(n>>>=0,t<0||t>n||n>this.buffer.byteLength){
throw RangeError("Illegal range: 0 <= "+t+" <= "+n+" <= "+this.buffer.byteLength)
}
}
if(t>=n){
return this
}
for(;t<n;){
this.view[t++]=e
}
return i&&(this.offset=t),this
},n.flip=function(){
return this.limit=this.offset,this.offset=0,this
},n.mark=function(e){
if(e=void 0===e?this.offset:e,!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal offset: "+e+" (not an integer)")
}
if((e>>>=0)<0||e+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+e+" (+0) <= "+this.buffer.byteLength)
}
}
return this.markedOffset=e,this
},n.order=function(e){
if(!this.noAssert&&"boolean"!=typeof e){
throw TypeError("Illegal littleEndian: Not a boolean")
}
return this.littleEndian=!!e,this
},n.LE=function(e){
return this.littleEndian=void 0===e||!!e,this
},n.BE=function(e){
return this.littleEndian=void 0!==e&&!e,this
},n.prepend=function(e,n,i){
"number"!=typeof n&&"string"==typeof n||(i=n,n=void 0)
var a=void 0===i
if(a&&(i=this.offset),!this.noAssert){
if("number"!=typeof i||i%1!=0){
throw TypeError("Illegal offset: "+i+" (not an integer)")
}
if((i>>>=0)<0||i+0>this.buffer.byteLength){
throw RangeError("Illegal offset: 0 <= "+i+" (+0) <= "+this.buffer.byteLength)
}
}
e instanceof t||(e=t.wrap(e,n))
var o=e.limit-e.offset
if(o<=0){
return this
}
var r=o-i
if(r>0){
var s=new ArrayBuffer(this.buffer.byteLength+r),u=new Uint8Array(s)
u.set(this.view.subarray(i,this.buffer.byteLength),o),this.buffer=s,this.view=u,
this.offset+=r,
this.markedOffset>=0&&(this.markedOffset+=r),this.limit+=r,i+=r
}else{
new Uint8Array(this.buffer)
}
return this.view.set(e.view.subarray(e.offset,e.limit),i-o),e.offset=e.limit,a&&(this.offset-=o),
this
},n.prependTo=function(e,t){
return e.prepend(this,t),this
},n.printDebug=function(e){
"function"!=typeof e&&(e=void 0),e(this.toString()+"\n-------------------------------------------------------------------\n"+this.toDebug(!0))
},
n.remaining=function(){
return this.limit-this.offset
},n.reset=function(){
return this.markedOffset>=0?(this.offset=this.markedOffset,
this.markedOffset=-1):this.offset=0,
this
},n.resize=function(e){
if(!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal capacity: "+e+" (not an integer)")
}
if((e|=0)<0){
throw RangeError("Illegal capacity: 0 <= "+e)
}
}
if(this.buffer.byteLength<e){
var t=new ArrayBuffer(e),n=new Uint8Array(t)
n.set(this.view),this.buffer=t,this.view=n
}
return this
},n.reverse=function(e,t){
if(void 0===e&&(e=this.offset),void 0===t&&(t=this.limit),
!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal begin: Not an integer")
}
if(e>>>=0,"number"!=typeof t||t%1!=0){
throw TypeError("Illegal end: Not an integer")
}
if(t>>>=0,e<0||e>t||t>this.buffer.byteLength){
throw RangeError("Illegal range: 0 <= "+e+" <= "+t+" <= "+this.buffer.byteLength)
}
}
return e===t||Array.prototype.reverse.call(this.view.subarray(e,t)),this
},n.skip=function(e){
if(!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal length: "+e+" (not an integer)")
}
e|=0
}
var t=this.offset+e
if(!this.noAssert&&(t<0||t>this.buffer.byteLength)){
throw RangeError("Illegal length: 0 <= "+this.offset+" + "+e+" <= "+this.buffer.byteLength)
}
return this.offset=t,this
},n.slice=function(e,t){
if(void 0===e&&(e=this.offset),void 0===t&&(t=this.limit),
!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal begin: Not an integer")
}
if(e>>>=0,"number"!=typeof t||t%1!=0){
throw TypeError("Illegal end: Not an integer")
}
if(t>>>=0,e<0||e>t||t>this.buffer.byteLength){
throw RangeError("Illegal range: 0 <= "+e+" <= "+t+" <= "+this.buffer.byteLength)
}
}
var n=this.clone()
return n.offset=e,n.limit=t,n
},n.toBuffer=function(e){
var t=this.offset,n=this.limit
if(!this.noAssert){
if("number"!=typeof t||t%1!=0){
throw TypeError("Illegal offset: Not an integer")
}
if(t>>>=0,"number"!=typeof n||n%1!=0){
throw TypeError("Illegal limit: Not an integer")
}
if(n>>>=0,t<0||t>n||n>this.buffer.byteLength){
throw RangeError("Illegal range: 0 <= "+t+" <= "+n+" <= "+this.buffer.byteLength)
}
}
if(!e&&0===t&&n===this.buffer.byteLength){
return this.buffer
}
if(t===n){
return i
}
var a=new ArrayBuffer(n-t)
return new Uint8Array(a).set(new Uint8Array(this.buffer).subarray(t,n),0),a
},n.toArrayBuffer=n.toBuffer,
n.toString=function(e,t,n){
if(void 0===e){
return"ByteBufferAB(offset="+this.offset+",markedOffset="+this.markedOffset+",limit="+this.limit+",capacity="+this.capacity()+")"
}
switch("number"==typeof e&&(n=t=e="utf8"),e){
case"utf8":
return this.toUTF8(t,n)
case"base64":
return this.toBase64(t,n)
case"hex":
return this.toHex(t,n)
case"binary":
return this.toBinary(t,n)
case"debug":
return this.toDebug()
case"columns":
return this.toColumns()
default:
throw Error("Unsupported encoding: "+e)
}
}
var l=function(){
for(var e={},t=[65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,48,49,50,51,52,53,54,55,56,57,43,47],n=[],i=0,a=t.length;i<a;++i){
n[t[i]]=i
}
return e.encode=function(e,n){
for(var i,a;null!==(i=e());){
n(t[i>>2&63]),a=(3&i)<<4,null!==(i=e())?(n(t[63&((a|=i>>4&15)|i>>4&15)]),
a=(15&i)<<2,
null!==(i=e())?(n(t[63&(a|i>>6&3)]),n(t[63&i])):(n(t[63&a]),n(61))):(n(t[63&a]),
n(61),
n(61))
}
},e.decode=function(e,t){
var i,a,o
function r(e){
throw Error("Illegal character code: "+e)
}
for(;null!==(i=e());){
if(void 0===(a=n[i])&&r(i),null!==(i=e())&&(void 0===(o=n[i])&&r(i),
t(a<<2>>>0|(48&o)>>4),
null!==(i=e()))){
if(void 0===(a=n[i])){
if(61===i){
break
}
r(i)
}
if(t((15&o)<<4>>>0|(60&a)>>2),null!==(i=e())){
if(void 0===(o=n[i])){
if(61===i){
break
}
r(i)
}
t((3&a)<<6>>>0|o)
}
}
}
},e.test=function(e){
return/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(e)
},
e
}()
n.toBase64=function(e,t){
if(void 0===e&&(e=this.offset),void 0===t&&(t=this.limit),
t|=0,(e|=0)<0||t>this.capacity||e>t){
throw RangeError("begin, end")
}
var n
return l.encode(function(){
return e<t?this.view[e++]:null
}.bind(this),n=r()),n()
},t.fromBase64=function(e,n){
if("string"!=typeof e){
throw TypeError("str")
}
var i=new t(e.length/4*3,n),a=0
return l.decode(o(e),(function(e){
i.view[a++]=e
})),i.limit=a,i
},t.btoa=function(e){
return t.fromBinary(e).toBase64()
},t.atob=function(e){
return t.fromBase64(e).toBinary()
},n.toBinary=function(e,t){
if(void 0===e&&(e=this.offset),void 0===t&&(t=this.limit),
t|=0,(e|=0)<0||t>this.capacity()||e>t){
throw RangeError("begin, end")
}
if(e===t){
return""
}
for(var n=[],i=[];e<t;){
n.push(this.view[e++]),n.length>=1024&&(i.push(String.fromCharCode.apply(String,n)),
n=[])
}
return i.join("")+String.fromCharCode.apply(String,n)
},t.fromBinary=function(e,n){
if("string"!=typeof e){
throw TypeError("str")
}
for(var i,a=0,o=e.length,r=new t(o,n);a<o;){
if((i=e.charCodeAt(a))>255){
throw RangeError("illegal char code: "+i)
}
r.view[a++]=i
}
return r.limit=o,r
},n.toDebug=function(e){
for(var t,n=-1,i=this.buffer.byteLength,a="",o="",r="";n<i;){
if(-1!==n&&(a+=(t=this.view[n])<16?"0"+t.toString(16).toUpperCase():t.toString(16).toUpperCase(),
e&&(o+=t>32&&t<127?String.fromCharCode(t):".")),
++n,e&&n>0&&n%16==0&&n!==i){
for(;a.length<51;){
a+=" "
}
r+=a+o+"\n",a=o=""
}
n===this.offset&&n===this.limit?a+=n===this.markedOffset?"!":"|":n===this.offset?a+=n===this.markedOffset?"[":"<":n===this.limit?a+=n===this.markedOffset?"]":">":a+=n===this.markedOffset?"'":e||0!==n&&n!==i?" ":""
}
if(e&&" "!==a){
for(;a.length<51;){
a+=" "
}
r+=a+o+"\n"
}
return e?r:a
},t.fromDebug=function(e,n,i){
for(var a,o,r=e.length,s=new t((r+1)/3|0,n,i),u=0,l=0,c=!1,p=!1,m=!1,d=!1,h=!1;u<r;){
switch(a=e.charAt(u++)){
case"!":
if(!i){
if(p||m||d){
h=!0
break
}
p=m=d=!0
}
s.offset=s.markedOffset=s.limit=l,c=!1
break
case"|":
if(!i){
if(p||d){
h=!0
break
}
p=d=!0
}
s.offset=s.limit=l,c=!1
break
case"[":
if(!i){
if(p||m){
h=!0
break
}
p=m=!0
}
s.offset=s.markedOffset=l,c=!1
break
case"<":
if(!i){
if(p){
h=!0
break
}
p=!0
}
s.offset=l,c=!1
break
case"]":
if(!i){
if(d||m){
h=!0
break
}
d=m=!0
}
s.limit=s.markedOffset=l,c=!1
break
case">":
if(!i){
if(d){
h=!0
break
}
d=!0
}
s.limit=l,c=!1
break
case"'":
if(!i){
if(m){
h=!0
break
}
m=!0
}
s.markedOffset=l,c=!1
break
case" ":
c=!1
break
default:
if(!i&&c){
h=!0
break
}
if(o=parseInt(a+e.charAt(u++),16),!i&&(isNaN(o)||o<0||o>255)){
throw TypeError("Illegal str: Not a debug encoded string")
}
s.view[l++]=o,c=!0
}
if(h){
throw TypeError("Illegal str: Invalid symbol at "+u)
}
}
if(!i){
if(!p||!d){
throw TypeError("Illegal str: Missing offset or limit")
}
if(l<s.buffer.byteLength){
throw TypeError("Illegal str: Not a debug encoded string (is it hex?) "+l+" < "+r)
}
}
return s
},n.toHex=function(e,t){
if(e=void 0===e?this.offset:e,t=void 0===t?this.limit:t,
!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal begin: Not an integer")
}
if(e>>>=0,"number"!=typeof t||t%1!=0){
throw TypeError("Illegal end: Not an integer")
}
if(t>>>=0,e<0||e>t||t>this.buffer.byteLength){
throw RangeError("Illegal range: 0 <= "+e+" <= "+t+" <= "+this.buffer.byteLength)
}
}
for(var n,i=new Array(t-e);e<t;){
(n=this.view[e++])<16?i.push("0",n.toString(16)):i.push(n.toString(16))
}
return i.join("")
},t.fromHex=function(e,n,i){
if(!i){
if("string"!=typeof e){
throw TypeError("Illegal str: Not a string")
}
if(e.length%2!=0){
throw TypeError("Illegal str: Length not a multiple of 2")
}
}
for(var a,o=e.length,r=new t(o/2|0,n),s=0,u=0;s<o;s+=2){
if(a=parseInt(e.substring(s,s+2),16),
!i&&(!isFinite(a)||a<0||a>255)){
throw TypeError("Illegal str: Contains non-hex characters")
}
r.view[u++]=a
}
return r.limit=u,r
}
var c=function(){
var e={
MAX_CODEPOINT:1114111,
encodeUTF8:function(e,t){
var n=null
for("number"==typeof e&&(n=e,e=function(){
return null
});null!==n||null!==(n=e());){
n<128?t(127&n):n<2048?(t(n>>6&31|192),t(63&n|128)):n<65536?(t(n>>12&15|224),
t(n>>6&63|128),
t(63&n|128)):(t(n>>18&7|240),t(n>>12&63|128),t(n>>6&63|128),t(63&n|128)),
n=null
}
},
decodeUTF8:function(e,t){
for(var n,i,a,o,r=function(e){
e=e.slice(0,e.indexOf(null))
var t=Error(e.toString())
throw t.name="TruncatedError",t.bytes=e,t
};null!==(n=e());){
if(0==(128&n)){
t(n)
}else if(192==(224&n)){
null===(i=e())&&r([n,i]),t((31&n)<<6|63&i)
}else if(224==(240&n)){
(null===(i=e())||null===(a=e()))&&r([n,i,a]),t((15&n)<<12|(63&i)<<6|63&a)
}else{
if(240!=(248&n)){
throw RangeError("Illegal starting byte: "+n)
}
(null===(i=e())||null===(a=e())||null===(o=e()))&&r([n,i,a,o]),t((7&n)<<18|(63&i)<<12|(63&a)<<6|63&o)
}
}
},
UTF16toUTF8:function(e,t){
for(var n,i=null;null!==(n=null!==i?i:e());){
n>=55296&&n<=57343&&null!==(i=e())&&i>=56320&&i<=57343?(t(1024*(n-55296)+i-56320+65536),
i=null):t(n)
}
null!==i&&t(i)
},
UTF8toUTF16:function(e,t){
var n=null
for("number"==typeof e&&(n=e,e=function(){
return null
});null!==n||null!==(n=e());){
n<=65535?t(n):(t(55296+((n-=65536)>>10)),t(n%1024+56320)),
n=null
}
},
encodeUTF16toUTF8:function(t,n){
e.UTF16toUTF8(t,(function(t){
e.encodeUTF8(t,n)
}))
},
decodeUTF8toUTF16:function(t,n){
e.decodeUTF8(t,(function(t){
e.UTF8toUTF16(t,n)
}))
},
calculateCodePoint:function(e){
return e<128?1:e<2048?2:e<65536?3:4
},
calculateUTF8:function(e){
for(var t,n=0;null!==(t=e());){
n+=t<128?1:t<2048?2:t<65536?3:4
}
return n
},
calculateUTF16asUTF8:function(t){
var n=0,i=0
return e.UTF16toUTF8(t,(function(e){
++n,i+=e<128?1:e<2048?2:e<65536?3:4
})),[n,i]
}
}
return e
}()
return n.toUTF8=function(e,t){
if(void 0===e&&(e=this.offset),void 0===t&&(t=this.limit),
!this.noAssert){
if("number"!=typeof e||e%1!=0){
throw TypeError("Illegal begin: Not an integer")
}
if(e>>>=0,"number"!=typeof t||t%1!=0){
throw TypeError("Illegal end: Not an integer")
}
if(t>>>=0,e<0||e>t||t>this.buffer.byteLength){
throw RangeError("Illegal range: 0 <= "+e+" <= "+t+" <= "+this.buffer.byteLength)
}
}
var n
try{
c.decodeUTF8toUTF16(function(){
return e<t?this.view[e++]:null
}.bind(this),n=r())
}catch(n){
if(e!==t){
throw RangeError("Illegal range: Truncated data, "+e+" != "+t)
}
}
return n()
},t.fromUTF8=function(e,n,i){
if(!i&&"string"!=typeof e){
throw TypeError("Illegal str: Not a string")
}
var a=new t(c.calculateUTF16asUTF8(o(e),!0)[1],n,i),r=0
return c.encodeUTF16toUTF8(o(e),(function(e){
a.view[r++]=e
})),a.limit=r,a
},t
})?i.apply(t,a):i)||(e.exports=o)
},function(e,t,n){
var i,a,o
a=[],void 0===(o="function"==typeof(i=function(){
"use strict"
function e(e,t,n){
this.low=0|e,this.high=0|t,this.unsigned=!!n
}
function t(e){
return!0===(e&&e.__isLong__)
}
e.prototype.__isLong__,Object.defineProperty(e.prototype,"__isLong__",{
value:!0,
enumerable:!1,
configurable:!1
}),e.isLong=t
var n={},i={}
function a(e,t){
var a,o,s
return t?(s=0<=(e>>>=0)&&e<256)&&(o=i[e])?o:(a=r(e,(0|e)<0?-1:0,!0),s&&(i[e]=a),
a):(s=-128<=(e|=0)&&e<128)&&(o=n[e])?o:(a=r(e,e<0?-1:0,!1),
s&&(n[e]=a),a)
}
function o(e,t){
if(isNaN(e)||!isFinite(e)){
return t?g:h
}
if(t){
if(e<0){
return g
}
if(e>=p){
return v
}
}else{
if(e<=-m){
return w
}
if(e+1>=m){
return k
}
}
return e<0?o(-e,t).neg():r(e%c|0,e/c|0,t)
}
function r(t,n,i){
return new e(t,n,i)
}
e.fromInt=a,e.fromNumber=o,e.fromBits=r
var s=Math.pow
function u(e,t,n){
if(0===e.length){
throw Error("empty string")
}
if("NaN"===e||"Infinity"===e||"+Infinity"===e||"-Infinity"===e){
return h
}
if("number"==typeof t?(n=t,t=!1):t=!!t,(n=n||10)<2||36<n){
throw RangeError("radix")
}
var i
if((i=e.indexOf("-"))>0){
throw Error("interior hyphen")
}
if(0===i){
return u(e.substring(1),t,n).neg()
}
for(var a=o(s(n,8)),r=h,l=0;l<e.length;l+=8){
var c=Math.min(8,e.length-l),p=parseInt(e.substring(l,l+c),n)
if(c<8){
var m=o(s(n,c))
r=r.mul(m).add(o(p))
}else{
r=(r=r.mul(a)).add(o(p))
}
}
return r.unsigned=t,r
}
function l(t){
return t instanceof e?t:"number"==typeof t?o(t):"string"==typeof t?u(t):r(t.low,t.high,t.unsigned)
}
e.fromString=u,e.fromValue=l
var c=4294967296,p=c*c,m=p/2,d=a(1<<24),h=a(0)
e.ZERO=h
var g=a(0,!0)
e.UZERO=g
var f=a(1)
e.ONE=f
var b=a(1,!0)
e.UONE=b
var y=a(-1)
e.NEG_ONE=y
var k=r(-1,2147483647,!1)
e.MAX_VALUE=k
var v=r(-1,-1,!0)
e.MAX_UNSIGNED_VALUE=v
var w=r(0,-2147483648,!1)
e.MIN_VALUE=w
var j=e.prototype
return j.toInt=function(){
return this.unsigned?this.low>>>0:this.low
},j.toNumber=function(){
return this.unsigned?(this.high>>>0)*c+(this.low>>>0):this.high*c+(this.low>>>0)
},
j.toString=function(e){
if((e=e||10)<2||36<e){
throw RangeError("radix")
}
if(this.isZero()){
return"0"
}
if(this.isNegative()){
if(this.eq(w)){
var t=o(e),n=this.div(t),i=n.mul(t).sub(this)
return n.toString(e)+i.toInt().toString(e)
}
return"-"+this.neg().toString(e)
}
for(var a=o(s(e,6),this.unsigned),r=this,u="";;){
var l=r.div(a),c=(r.sub(l.mul(a)).toInt()>>>0).toString(e)
if((r=l).isZero()){
return c+u
}
for(;c.length<6;){
c="0"+c
}
u=""+c+u
}
},j.getHighBits=function(){
return this.high
},j.getHighBitsUnsigned=function(){
return this.high>>>0
},j.getLowBits=function(){
return this.low
},j.getLowBitsUnsigned=function(){
return this.low>>>0
},j.getNumBitsAbs=function(){
if(this.isNegative()){
return this.eq(w)?64:this.neg().getNumBitsAbs()
}
for(var e=0!=this.high?this.high:this.low,t=31;t>0&&0==(e&1<<t);t--){}
return 0!=this.high?t+33:t+1
},j.isZero=function(){
return 0===this.high&&0===this.low
},j.isNegative=function(){
return!this.unsigned&&this.high<0
},j.isPositive=function(){
return this.unsigned||this.high>=0
},j.isOdd=function(){
return 1==(1&this.low)
},j.isEven=function(){
return 0==(1&this.low)
},j.equals=function(e){
return t(e)||(e=l(e)),(this.unsigned===e.unsigned||this.high>>>31!=1||e.high>>>31!=1)&&this.high===e.high&&this.low===e.low
},
j.eq=j.equals,j.notEquals=function(e){
return!this.eq(e)
},j.neq=j.notEquals,j.lessThan=function(e){
return this.comp(e)<0
},j.lt=j.lessThan,j.lessThanOrEqual=function(e){
return this.comp(e)<=0
},j.lte=j.lessThanOrEqual,j.greaterThan=function(e){
return this.comp(e)>0
},j.gt=j.greaterThan,j.greaterThanOrEqual=function(e){
return this.comp(e)>=0
},j.gte=j.greaterThanOrEqual,j.compare=function(e){
if(t(e)||(e=l(e)),this.eq(e)){
return 0
}
var n=this.isNegative(),i=e.isNegative()
return n&&!i?-1:!n&&i?1:this.unsigned?e.high>>>0>this.high>>>0||e.high===this.high&&e.low>>>0>this.low>>>0?-1:1:this.sub(e).isNegative()?-1:1
},
j.comp=j.compare,j.negate=function(){
return!this.unsigned&&this.eq(w)?w:this.not().add(f)
},j.neg=j.negate,j.add=function(e){
t(e)||(e=l(e))
var n=this.high>>>16,i=65535&this.high,a=this.low>>>16,o=65535&this.low,s=e.high>>>16,u=65535&e.high,c=e.low>>>16,p=0,m=0,d=0,h=0
return d+=(h+=o+(65535&e.low))>>>16,m+=(d+=a+c)>>>16,p+=(m+=i+u)>>>16,p+=n+s,r((d&=65535)<<16|(h&=65535),(p&=65535)<<16|(m&=65535),this.unsigned)
},
j.subtract=function(e){
return t(e)||(e=l(e)),this.add(e.neg())
},j.sub=j.subtract,j.multiply=function(e){
if(this.isZero()){
return h
}
if(t(e)||(e=l(e)),e.isZero()){
return h
}
if(this.eq(w)){
return e.isOdd()?w:h
}
if(e.eq(w)){
return this.isOdd()?w:h
}
if(this.isNegative()){
return e.isNegative()?this.neg().mul(e.neg()):this.neg().mul(e).neg()
}
if(e.isNegative()){
return this.mul(e.neg()).neg()
}
if(this.lt(d)&&e.lt(d)){
return o(this.toNumber()*e.toNumber(),this.unsigned)
}
var n=this.high>>>16,i=65535&this.high,a=this.low>>>16,s=65535&this.low,u=e.high>>>16,c=65535&e.high,p=e.low>>>16,m=65535&e.low,g=0,f=0,b=0,y=0
return b+=(y+=s*m)>>>16,f+=(b+=a*m)>>>16,b&=65535,f+=(b+=s*p)>>>16,g+=(f+=i*m)>>>16,
f&=65535,
g+=(f+=a*p)>>>16,f&=65535,g+=(f+=s*c)>>>16,g+=n*m+i*p+a*c+s*u,r((b&=65535)<<16|(y&=65535),(g&=65535)<<16|(f&=65535),this.unsigned)
},
j.mul=j.multiply,j.divide=function(e){
if(t(e)||(e=l(e)),e.isZero()){
throw Error("division by zero")
}
if(this.isZero()){
return this.unsigned?g:h
}
var n,i,a
if(this.unsigned){
if(e.unsigned||(e=e.toUnsigned()),e.gt(this)){
return g
}
if(e.gt(this.shru(1))){
return b
}
a=g
}else{
if(this.eq(w)){
return e.eq(f)||e.eq(y)?w:e.eq(w)?f:(n=this.shr(1).div(e).shl(1)).eq(h)?e.isNegative()?f:y:(i=this.sub(e.mul(n)),
a=n.add(i.div(e)))
}
if(e.eq(w)){
return this.unsigned?g:h
}
if(this.isNegative()){
return e.isNegative()?this.neg().div(e.neg()):this.neg().div(e).neg()
}
if(e.isNegative()){
return this.div(e.neg()).neg()
}
a=h
}
for(i=this;i.gte(e);){
n=Math.max(1,Math.floor(i.toNumber()/e.toNumber()))
for(var r=Math.ceil(Math.log(n)/Math.LN2),u=r<=48?1:s(2,r-48),c=o(n),p=c.mul(e);p.isNegative()||p.gt(i);){
p=(c=o(n-=u,this.unsigned)).mul(e)
}
c.isZero()&&(c=f),a=a.add(c),i=i.sub(p)
}
return a
},j.div=j.divide,j.modulo=function(e){
return t(e)||(e=l(e)),this.sub(this.div(e).mul(e))
},j.mod=j.modulo,j.not=function(){
return r(~this.low,~this.high,this.unsigned)
},j.and=function(e){
return t(e)||(e=l(e)),r(this.low&e.low,this.high&e.high,this.unsigned)
},j.or=function(e){
return t(e)||(e=l(e)),r(this.low|e.low,this.high|e.high,this.unsigned)
},j.xor=function(e){
return t(e)||(e=l(e)),r(this.low^e.low,this.high^e.high,this.unsigned)
},j.shiftLeft=function(e){
return t(e)&&(e=e.toInt()),0==(e&=63)?this:e<32?r(this.low<<e,this.high<<e|this.low>>>32-e,this.unsigned):r(0,this.low<<e-32,this.unsigned)
},
j.shl=j.shiftLeft,j.shiftRight=function(e){
return t(e)&&(e=e.toInt()),0==(e&=63)?this:e<32?r(this.low>>>e|this.high<<32-e,this.high>>e,this.unsigned):r(this.high>>e-32,this.high>=0?0:-1,this.unsigned)
},
j.shr=j.shiftRight,j.shiftRightUnsigned=function(e){
if(t(e)&&(e=e.toInt()),0==(e&=63)){
return this
}
var n=this.high
return e<32?r(this.low>>>e|n<<32-e,n>>>e,this.unsigned):r(32===e?n:n>>>e-32,0,this.unsigned)
},
j.shru=j.shiftRightUnsigned,j.toSigned=function(){
return this.unsigned?r(this.low,this.high,!1):this
},j.toUnsigned=function(){
return this.unsigned?this:r(this.low,this.high,!0)
},j.toBytes=function(e){
return e?this.toBytesLE():this.toBytesBE()
},j.toBytesLE=function(){
var e=this.high,t=this.low
return[255&t,t>>>8&255,t>>>16&255,t>>>24&255,255&e,e>>>8&255,e>>>16&255,e>>>24&255]
},
j.toBytesBE=function(){
var e=this.high,t=this.low
return[e>>>24&255,e>>>16&255,e>>>8&255,255&e,t>>>24&255,t>>>16&255,t>>>8&255,255&t]
},
e
})?i.apply(t,a):i)||(e.exports=o)
},function(e,t){},function(e,t,n){
"use strict"
var i=t
function a(){
i.util._configure(),i.Writer._configure(i.BufferWriter),i.Reader._configure(i.BufferReader)
}
i.build="minimal",i.Writer=n(11),i.BufferWriter=n(43),i.Reader=n(12),i.BufferReader=n(44),
i.util=n(3),
i.rpc=n(45),i.roots=n(47),i.configure=a,a()
},function(e,t,n){
"use strict"
e.exports=function(e,t){
var n=new Array(arguments.length-1),i=0,a=2,o=!0
for(;a<arguments.length;){
n[i++]=arguments[a++]
}
return new Promise((function(a,r){
n[i]=function(e){
if(o){
if(o=!1,e){
r(e)
}else{
for(var t=new Array(arguments.length-1),n=0;n<t.length;){
t[n++]=arguments[n]
}
a.apply(null,t)
}
}
}
try{
e.apply(t||null,n)
}catch(e){
o&&(o=!1,r(e))
}
}))
}
},function(e,t,n){
"use strict"
var i=t
i.length=function(e){
var t=e.length
if(!t){
return 0
}
for(var n=0;--t%4>1&&"="===e.charAt(t);){
++n
}
return Math.ceil(3*e.length)/4-n
}
for(var a=new Array(64),o=new Array(123),r=0;r<64;){
o[a[r]=r<26?r+65:r<52?r+71:r<62?r-4:r-59|43]=r++
}
i.encode=function(e,t,n){
for(var i,o=null,r=[],s=0,u=0;t<n;){
var l=e[t++]
switch(u){
case 0:
r[s++]=a[l>>2],i=(3&l)<<4,u=1
break
case 1:
r[s++]=a[i|l>>4],i=(15&l)<<2,u=2
break
case 2:
r[s++]=a[i|l>>6],r[s++]=a[63&l],u=0
}
s>8191&&((o||(o=[])).push(String.fromCharCode.apply(String,r)),s=0)
}
return u&&(r[s++]=a[i],r[s++]=61,1===u&&(r[s++]=61)),o?(s&&o.push(String.fromCharCode.apply(String,r.slice(0,s))),
o.join("")):String.fromCharCode.apply(String,r.slice(0,s))
}
i.decode=function(e,t,n){
for(var i,a=n,r=0,s=0;s<e.length;){
var u=e.charCodeAt(s++)
if(61===u&&r>1){
break
}
if(void 0===(u=o[u])){
throw Error("invalid encoding")
}
switch(r){
case 0:
i=u,r=1
break
case 1:
t[n++]=i<<2|(48&u)>>4,i=u,r=2
break
case 2:
t[n++]=(15&i)<<4|(60&u)>>2,i=u,r=3
break
case 3:
t[n++]=(3&i)<<6|u,r=0
}
}
if(1===r){
throw Error("invalid encoding")
}
return n-a
},i.test=function(e){
return/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(e)
}
},function(e,t,n){
"use strict"
function i(){
this._listeners={}
}
e.exports=i,i.prototype.on=function(e,t,n){
return(this._listeners[e]||(this._listeners[e]=[])).push({
fn:t,
ctx:n||this
}),this
},i.prototype.off=function(e,t){
if(void 0===e){
this._listeners={}
}else if(void 0===t){
this._listeners[e]=[]
}else{
for(var n=this._listeners[e],i=0;i<n.length;){
n[i].fn===t?n.splice(i,1):++i
}
}
return this
},i.prototype.emit=function(e){
var t=this._listeners[e]
if(t){
for(var n=[],i=1;i<arguments.length;){
n.push(arguments[i++])
}
for(i=0;i<t.length;){
t[i].fn.apply(t[i++].ctx,n)
}
}
return this
}
},function(e,t,n){
"use strict"
function i(e){
return"undefined"!=typeof Float32Array?function(){
var t=new Float32Array([-0]),n=new Uint8Array(t.buffer),i=128===n[3]
function a(e,i,a){
t[0]=e,i[a]=n[0],i[a+1]=n[1],i[a+2]=n[2],i[a+3]=n[3]
}
function o(e,i,a){
t[0]=e,i[a]=n[3],i[a+1]=n[2],i[a+2]=n[1],i[a+3]=n[0]
}
function r(e,i){
return n[0]=e[i],n[1]=e[i+1],n[2]=e[i+2],n[3]=e[i+3],t[0]
}
function s(e,i){
return n[3]=e[i],n[2]=e[i+1],n[1]=e[i+2],n[0]=e[i+3],t[0]
}
e.writeFloatLE=i?a:o,e.writeFloatBE=i?o:a,e.readFloatLE=i?r:s,e.readFloatBE=i?s:r
}():function(){
function t(e,t,n,i){
var a=t<0?1:0
if(a&&(t=-t),0===t){
e(1/t>0?0:2147483648,n,i)
}else if(isNaN(t)){
e(2143289344,n,i)
}else if(t>34028234663852886e22){
e((a<<31|2139095040)>>>0,n,i)
}else if(t<11754943508222875e-54){
e((a<<31|Math.round(t/1401298464324817e-60))>>>0,n,i)
}else{
var o=Math.floor(Math.log(t)/Math.LN2)
e((a<<31|o+127<<23|8388607&Math.round(t*Math.pow(2,-o)*8388608))>>>0,n,i)
}
}
function n(e,t,n){
var i=e(t,n),a=2*(i>>31)+1,o=i>>>23&255,r=8388607&i
return 255===o?r?NaN:a*(1/0):0===o?1401298464324817e-60*a*r:a*Math.pow(2,o-150)*(r+8388608)
}
e.writeFloatLE=t.bind(null,a),e.writeFloatBE=t.bind(null,o),e.readFloatLE=n.bind(null,r),
e.readFloatBE=n.bind(null,s)
}(),"undefined"!=typeof Float64Array?function(){
var t=new Float64Array([-0]),n=new Uint8Array(t.buffer),i=128===n[7]
function a(e,i,a){
t[0]=e,i[a]=n[0],i[a+1]=n[1],i[a+2]=n[2],i[a+3]=n[3],i[a+4]=n[4],
i[a+5]=n[5],i[a+6]=n[6],
i[a+7]=n[7]
}
function o(e,i,a){
t[0]=e,i[a]=n[7],i[a+1]=n[6],i[a+2]=n[5],i[a+3]=n[4],i[a+4]=n[3],
i[a+5]=n[2],i[a+6]=n[1],
i[a+7]=n[0]
}
function r(e,i){
return n[0]=e[i],n[1]=e[i+1],n[2]=e[i+2],n[3]=e[i+3],n[4]=e[i+4],
n[5]=e[i+5],n[6]=e[i+6],
n[7]=e[i+7],t[0]
}
function s(e,i){
return n[7]=e[i],n[6]=e[i+1],n[5]=e[i+2],n[4]=e[i+3],n[3]=e[i+4],
n[2]=e[i+5],n[1]=e[i+6],
n[0]=e[i+7],t[0]
}
e.writeDoubleLE=i?a:o,e.writeDoubleBE=i?o:a,e.readDoubleLE=i?r:s,e.readDoubleBE=i?s:r
}():function(){
function t(e,t,n,i,a,o){
var r=i<0?1:0
if(r&&(i=-i),0===i){
e(0,a,o+t),e(1/i>0?0:2147483648,a,o+n)
}else if(isNaN(i)){
e(0,a,o+t),e(2146959360,a,o+n)
}else if(i>17976931348623157e292){
e(0,a,o+t),e((r<<31|2146435072)>>>0,a,o+n)
}else{
var s
if(i<22250738585072014e-324){
e((s=i/5e-324)>>>0,a,o+t),e((r<<31|s/4294967296)>>>0,a,o+n)
}else{
var u=Math.floor(Math.log(i)/Math.LN2)
1024===u&&(u=1023),e(4503599627370496*(s=i*Math.pow(2,-u))>>>0,a,o+t),e((r<<31|u+1023<<20|1048576*s&1048575)>>>0,a,o+n)
}
}
}
function n(e,t,n,i,a){
var o=e(i,a+t),r=e(i,a+n),s=2*(r>>31)+1,u=r>>>20&2047,l=4294967296*(1048575&r)+o
return 2047===u?l?NaN:s*(1/0):0===u?5e-324*s*l:s*Math.pow(2,u-1075)*(l+4503599627370496)
}
e.writeDoubleLE=t.bind(null,a,0,4),e.writeDoubleBE=t.bind(null,o,4,0),e.readDoubleLE=n.bind(null,r,0,4),
e.readDoubleBE=n.bind(null,s,4,0)
}(),e
}
function a(e,t,n){
t[n]=255&e,t[n+1]=e>>>8&255,t[n+2]=e>>>16&255,t[n+3]=e>>>24
}
function o(e,t,n){
t[n]=e>>>24,t[n+1]=e>>>16&255,t[n+2]=e>>>8&255,t[n+3]=255&e
}
function r(e,t){
return(e[t]|e[t+1]<<8|e[t+2]<<16|e[t+3]<<24)>>>0
}
function s(e,t){
return(e[t]<<24|e[t+1]<<16|e[t+2]<<8|e[t+3])>>>0
}
e.exports=i(i)
},function(module,exports,__webpack_require__){
"use strict"
function inquire(moduleName){
try{
var mod=eval("quire".replace(/^/,"re"))(moduleName)
if(mod&&(mod.length||Object.keys(mod).length)){
return mod
}
}catch(e){}
return null
}
module.exports=inquire
},function(e,t,n){
"use strict"
var i=t
i.length=function(e){
for(var t=0,n=0,i=0;i<e.length;++i){
(n=e.charCodeAt(i))<128?t+=1:n<2048?t+=2:55296==(64512&n)&&56320==(64512&e.charCodeAt(i+1))?(++i,
t+=4):t+=3
}
return t
},i.read=function(e,t,n){
if(n-t<1){
return""
}
for(var i,a=null,o=[],r=0;t<n;){
(i=e[t++])<128?o[r++]=i:i>191&&i<224?o[r++]=(31&i)<<6|63&e[t++]:i>239&&i<365?(i=((7&i)<<18|(63&e[t++])<<12|(63&e[t++])<<6|63&e[t++])-65536,
o[r++]=55296+(i>>10),
o[r++]=56320+(1023&i)):o[r++]=(15&i)<<12|(63&e[t++])<<6|63&e[t++],
r>8191&&((a||(a=[])).push(String.fromCharCode.apply(String,o)),
r=0)
}
return a?(r&&a.push(String.fromCharCode.apply(String,o.slice(0,r))),a.join("")):String.fromCharCode.apply(String,o.slice(0,r))
},
i.write=function(e,t,n){
for(var i,a,o=n,r=0;r<e.length;++r){
(i=e.charCodeAt(r))<128?t[n++]=i:i<2048?(t[n++]=i>>6|192,
t[n++]=63&i|128):55296==(64512&i)&&56320==(64512&(a=e.charCodeAt(r+1)))?(i=65536+((1023&i)<<10)+(1023&a),
++r,
t[n++]=i>>18|240,t[n++]=i>>12&63|128,t[n++]=i>>6&63|128,t[n++]=63&i|128):(t[n++]=i>>12|224,
t[n++]=i>>6&63|128,
t[n++]=63&i|128)
}
return n-o
}
},function(e,t,n){
"use strict"
e.exports=function(e,t,n){
var i=n||8192,a=i>>>1,o=null,r=i
return function(n){
if(n<1||n>a){
return e(n)
}
r+n>i&&(o=e(i),r=0)
var s=t.call(o,r,r+=n)
return 7&r&&(r=1+(7|r)),s
}
}
},function(e,t,n){
"use strict"
e.exports=a
var i=n(3)
function a(e,t){
this.lo=e>>>0,this.hi=t>>>0
}
var o=a.zero=new a(0,0)
o.toNumber=function(){
return 0
},o.zzEncode=o.zzDecode=function(){
return this
},o.length=function(){
return 1
}
var r=a.zeroHash="\0\0\0\0\0\0\0\0"
a.fromNumber=function(e){
if(0===e){
return o
}
var t=e<0
t&&(e=-e)
var n=e>>>0,i=(e-n)/4294967296>>>0
return t&&(i=~i>>>0,n=~n>>>0,++n>4294967295&&(n=0,++i>4294967295&&(i=0))),new a(n,i)
},
a.from=function(e){
if("number"==typeof e){
return a.fromNumber(e)
}
if(i.isString(e)){
if(!i.Long){
return a.fromNumber(parseInt(e,10))
}
e=i.Long.fromString(e)
}
return e.low||e.high?new a(e.low>>>0,e.high>>>0):o
},a.prototype.toNumber=function(e){
if(!e&&this.hi>>>31){
var t=1+~this.lo>>>0,n=~this.hi>>>0
return t||(n=n+1>>>0),-(t+4294967296*n)
}
return this.lo+4294967296*this.hi
},a.prototype.toLong=function(e){
return i.Long?new i.Long(0|this.lo,0|this.hi,Boolean(e)):{
low:0|this.lo,
high:0|this.hi,
unsigned:Boolean(e)
}
}
var s=String.prototype.charCodeAt
a.fromHash=function(e){
return e===r?o:new a((s.call(e,0)|s.call(e,1)<<8|s.call(e,2)<<16|s.call(e,3)<<24)>>>0,(s.call(e,4)|s.call(e,5)<<8|s.call(e,6)<<16|s.call(e,7)<<24)>>>0)
},
a.prototype.toHash=function(){
return String.fromCharCode(255&this.lo,this.lo>>>8&255,this.lo>>>16&255,this.lo>>>24,255&this.hi,this.hi>>>8&255,this.hi>>>16&255,this.hi>>>24)
},
a.prototype.zzEncode=function(){
var e=this.hi>>31
return this.hi=((this.hi<<1|this.lo>>>31)^e)>>>0,this.lo=(this.lo<<1^e)>>>0,this
},
a.prototype.zzDecode=function(){
var e=-(1&this.lo)
return this.lo=((this.lo>>>1|this.hi<<31)^e)>>>0,this.hi=(this.hi>>>1^e)>>>0,this
},
a.prototype.length=function(){
var e=this.lo,t=(this.lo>>>28|this.hi<<4)>>>0,n=this.hi>>>24
return 0===n?0===t?e<16384?e<128?1:2:e<2097152?3:4:t<16384?t<128?5:6:t<2097152?7:8:n<128?9:10
}
},function(e,t,n){
"use strict"
e.exports=o
var i=n(11)
;(o.prototype=Object.create(i.prototype)).constructor=o
var a=n(3)
function o(){
i.call(this)
}
function r(e,t,n){
e.length<40?a.utf8.write(e,t,n):t.utf8Write?t.utf8Write(e,n):t.write(e,n)
}
o._configure=function(){
o.alloc=a._Buffer_allocUnsafe,o.writeBytesBuffer=a.Buffer&&a.Buffer.prototype instanceof Uint8Array&&"set"===a.Buffer.prototype.set.name?function(e,t,n){
t.set(e,n)
}:function(e,t,n){
if(e.copy){
e.copy(t,n,0,e.length)
}else{
for(var i=0;i<e.length;){
t[n++]=e[i++]
}
}
}
},o.prototype.bytes=function(e){
a.isString(e)&&(e=a._Buffer_from(e,"base64"))
var t=e.length>>>0
return this.uint32(t),t&&this._push(o.writeBytesBuffer,t,e),this
},o.prototype.string=function(e){
var t=a.Buffer.byteLength(e)
return this.uint32(t),t&&this._push(r,t,e),this
},o._configure()
},function(e,t,n){
"use strict"
e.exports=o
var i=n(12)
;(o.prototype=Object.create(i.prototype)).constructor=o
var a=n(3)
function o(e){
i.call(this,e)
}
o._configure=function(){
a.Buffer&&(o.prototype._slice=a.Buffer.prototype.slice)
},o.prototype.string=function(){
var e=this.uint32()
return this.buf.utf8Slice?this.buf.utf8Slice(this.pos,this.pos=Math.min(this.pos+e,this.len)):this.buf.toString("utf-8",this.pos,this.pos=Math.min(this.pos+e,this.len))
},
o._configure()
},function(e,t,n){
"use strict"
t.Service=n(46)
},function(e,t,n){
"use strict"
e.exports=a
var i=n(3)
function a(e,t,n){
if("function"!=typeof e){
throw TypeError("rpcImpl must be a function")
}
i.EventEmitter.call(this),this.rpcImpl=e,this.requestDelimited=Boolean(t),this.responseDelimited=Boolean(n)
}
(a.prototype=Object.create(i.EventEmitter.prototype)).constructor=a,a.prototype.rpcCall=function e(t,n,a,o,r){
if(!o){
throw TypeError("request must be specified")
}
var s=this
if(!r){
return i.asPromise(e,s,t,n,a,o)
}
if(s.rpcImpl){
try{
return s.rpcImpl(t,n[s.requestDelimited?"encodeDelimited":"encode"](o).finish(),(function(e,n){
if(e){
return s.emit("error",e,t),r(e)
}
if(null!==n){
if(!(n instanceof a)){
try{
n=a[s.responseDelimited?"decodeDelimited":"decode"](n)
}catch(e){
return s.emit("error",e,t),r(e)
}
}
return s.emit("data",n,t),r(null,n)
}
s.end(!0)
}))
}catch(e){
return s.emit("error",e,t),void setTimeout((function(){
r(e)
}),0)
}
}else{
setTimeout((function(){
r(Error("already ended"))
}),0)
}
},a.prototype.end=function(e){
return this.rpcImpl&&(e||this.rpcImpl(null,null,null),
this.rpcImpl=null,this.emit("end").off()),
this
}
},function(e,t,n){
"use strict"
e.exports={}
},function(e,t,n){
"use strict"
n.r(t)
var i=n(1),a=i.a.Symbol,o=Object.prototype,r=o.hasOwnProperty,s=o.toString,u=a?a.toStringTag:void 0
var l=function(e){
var t=r.call(e,u),n=e[u]
try{
e[u]=void 0
var i=!0
}catch(e){}
var a=s.call(e)
return i&&(t?e[u]=n:delete e[u]),a
},c=Object.prototype.toString
var p=function(e){
return c.call(e)
},m=a?a.toStringTag:void 0
var d=function(e){
return null==e?void 0===e?"[object Undefined]":"[object Null]":m&&m in Object(e)?l(e):p(e)
}
var h=function(e){
var t=typeof e
return null!=e&&("object"==t||"function"==t)
}
var g,f=function(e){
if(!h(e)){
return!1
}
var t=d(e)
return"[object Function]"==t||"[object GeneratorFunction]"==t||"[object AsyncFunction]"==t||"[object Proxy]"==t
},b=i.a["__core-js_shared__"],y=(g=/[^.]+$/.exec(b&&b.keys&&b.keys.IE_PROTO||""))?"Symbol(src)_1."+g:""
var k=function(e){
return!!y&&y in e
},v=Function.prototype.toString
var w=function(e){
if(null!=e){
try{
return v.call(e)
}catch(e){}
try{
return e+""
}catch(e){}
}
return""
},j=/^\[object .+?Constructor\]$/,E=Function.prototype,A=Object.prototype,S=E.toString,O=A.hasOwnProperty,_=RegExp("^"+S.call(O).replace(/[\\^$.*+?()[\]{}|]/g,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$")
var T=function(e){
return!(!h(e)||k(e))&&(f(e)?_:j).test(w(e))
}
var I=function(e,t){
return null==e?void 0:e[t]
}
var R=function(e,t){
var n=I(e,t)
return T(n)?n:void 0
},C=function(){
try{
var e=R(Object,"defineProperty")
return e({},"",{}),e
}catch(e){}
}()
var x=function(e,t,n){
"__proto__"==t&&C?C(e,t,{
configurable:!0,
enumerable:!0,
value:n,
writable:!0
}):e[t]=n
}
var N=function(e,t){
return e===t||e!=e&&t!=t
},P=Object.prototype.hasOwnProperty
var L=function(e,t,n){
var i=e[t]
P.call(e,t)&&N(i,n)&&(void 0!==n||t in e)||x(e,t,n)
}
var z=function(e,t,n,i){
var a=!n
n||(n={})
for(var o=-1,r=t.length;++o<r;){
var s=t[o],u=i?i(n[s],e[s],s,n,e):void 0
void 0===u&&(u=e[s]),a?x(n,s,u):L(n,s,u)
}
return n
}
var D=function(e){
return e
}
var B=function(e,t,n){
switch(n.length){
case 0:
return e.call(t)
case 1:
return e.call(t,n[0])
case 2:
return e.call(t,n[0],n[1])
case 3:
return e.call(t,n[0],n[1],n[2])
}
return e.apply(t,n)
},U=Math.max
var W=function(e,t,n){
return t=U(void 0===t?e.length-1:t,0),function(){
for(var i=arguments,a=-1,o=U(i.length-t,0),r=Array(o);++a<o;){
r[a]=i[t+a]
}
a=-1
for(var s=Array(t+1);++a<t;){
s[a]=i[a]
}
return s[t]=n(r),B(e,this,s)
}
}
var V=function(e){
return function(){
return e
}
},M=C?function(e,t){
return C(e,"toString",{
configurable:!0,
enumerable:!1,
value:V(t),
writable:!0
})
}:D,F=Date.now
var q=function(e){
var t=0,n=0
return function(){
var i=F(),a=16-(i-n)
if(n=i,a>0){
if(++t>=800){
return arguments[0]
}
}else{
t=0
}
return e.apply(void 0,arguments)
}
}(M)
var G=function(e,t){
return q(W(e,t,D),e+"")
}
var H=function(e){
return"number"==typeof e&&e>-1&&e%1==0&&e<=9007199254740991
}
var Y=function(e){
return null!=e&&H(e.length)&&!f(e)
},K=/^(?:0|[1-9]\d*)$/
var J=function(e,t){
var n=typeof e
return!!(t=null==t?9007199254740991:t)&&("number"==n||"symbol"!=n&&K.test(e))&&e>-1&&e%1==0&&e<t
}
var Z=function(e,t,n){
if(!h(n)){
return!1
}
var i=typeof t
return!!("number"==i?Y(n)&&J(t,n.length):"string"==i&&t in n)&&N(n[t],e)
}
var X=function(e){
return G((function(t,n){
var i=-1,a=n.length,o=a>1?n[a-1]:void 0,r=a>2?n[2]:void 0
for(o=e.length>3&&"function"==typeof o?(a--,o):void 0,r&&Z(n[0],n[1],r)&&(o=a<3?void 0:o,
a=1),
t=Object(t);++i<a;){
var s=n[i]
s&&e(t,s,i,o)
}
return t
}))
},$=Object.prototype
var Q=function(e){
var t=e&&e.constructor
return e===("function"==typeof t&&t.prototype||$)
}
var ee=function(e,t){
for(var n=-1,i=Array(e);++n<e;){
i[n]=t(n)
}
return i
}
var te=function(e){
return null!=e&&"object"==typeof e
}
var ne=function(e){
return te(e)&&"[object Arguments]"==d(e)
},ie=Object.prototype,ae=ie.hasOwnProperty,oe=ie.propertyIsEnumerable,re=ne(function(){
return arguments
}())?ne:function(e){
return te(e)&&ae.call(e,"callee")&&!oe.call(e,"callee")
},se=Array.isArray,ue=n(4),le={}
le["[object Float32Array]"]=le["[object Float64Array]"]=le["[object Int8Array]"]=le["[object Int16Array]"]=le["[object Int32Array]"]=le["[object Uint8Array]"]=le["[object Uint8ClampedArray]"]=le["[object Uint16Array]"]=le["[object Uint32Array]"]=!0,
le["[object Arguments]"]=le["[object Array]"]=le["[object ArrayBuffer]"]=le["[object Boolean]"]=le["[object DataView]"]=le["[object Date]"]=le["[object Error]"]=le["[object Function]"]=le["[object Map]"]=le["[object Number]"]=le["[object Object]"]=le["[object RegExp]"]=le["[object Set]"]=le["[object String]"]=le["[object WeakMap]"]=!1
var ce=function(e){
return te(e)&&H(e.length)&&!!le[d(e)]
}
var pe=function(e){
return function(t){
return e(t)
}
},me=n(2),de=me.a&&me.a.isTypedArray,he=de?pe(de):ce,ge=Object.prototype.hasOwnProperty
var fe=function(e,t){
var n=se(e),i=!n&&re(e),a=!n&&!i&&Object(ue.a)(e),o=!n&&!i&&!a&&he(e),r=n||i||a||o,s=r?ee(e.length,String):[],u=s.length
for(var l in e){
!t&&!ge.call(e,l)||r&&("length"==l||a&&("offset"==l||"parent"==l)||o&&("buffer"==l||"byteLength"==l||"byteOffset"==l)||J(l,u))||s.push(l)
}
return s
}
var be=function(e,t){
return function(n){
return e(t(n))
}
},ye=be(Object.keys,Object),ke=Object.prototype.hasOwnProperty
var ve=function(e){
if(!Q(e)){
return ye(e)
}
var t=[]
for(var n in Object(e)){
ke.call(e,n)&&"constructor"!=n&&t.push(n)
}
return t
}
var we=function(e){
return Y(e)?fe(e):ve(e)
},je=Object.prototype.hasOwnProperty,Ee=X((function(e,t){
if(Q(t)||Y(t)){
z(t,we(t),e)
}else{
for(var n in t){
je.call(t,n)&&L(e,n,t[n])
}
}
}))
class Ae{
constructor(e,t,n,i){
this.AvastWRC=e,this.url=t,this.defaults={
ajax:null,
rating:-1,
weight:-1,
flagmask:null,
flags:{
shopping:null,
social:null,
news:null,
it:null,
corporate:null,
pornography:null,
violence:null,
gambling:null,
drugs:null,
illegal:null,
others:null
},
phishing:null,
phishingDomain:null,
is_typo:!1,
block:-1,
ttl:3600,
ttl_multi:3600,
ttl_phishing:3600,
rating_level:0
},n.webrep?(this.values=Ee({},this.defaults,{
ajax:n.ajax
},n.phishing,n.webrep,n.blocker,n.typo),i?this.values.ttl_multi=n.webrep.ttl:this.values.ttl=n.webrep.ttl,
n.phishing&&(this.values.ttl_phishing=n.phishing.ttl),
n.webrep.hasOwnProperty("rating_level")&&n.webrep.rating_level&&(this.values.rating_level=n.webrep.rating_level)):this.values=Ee({},this.defaults,n),
this.values.expireTime=this.values.phishing>1||1==this.values.block||this.values.phishingDomain>1&&0==this.values.rating_level?this.setExpireTime(this.values.ttl_phishing):this.setExpireTime(this.values.ttl),
this.values.expireTimeMulti=this.setExpireTime(this.values.ttl_multi),
this.save()
}
save(){
this.AvastWRC.Cache.set(this.url,this)
}
clearProperty(e){
this.values[e]&&(this.values[e]=this.defaults[e])
}
setExpireTime(e){
let t=this.AvastWRC
return void 0===e&&(e=this.AvastWRC.DEFAULTS.TTL),this.AvastWRC.Utils.dateFormat(new Date((new Date).valueOf()+1e3*e),t.TTL_DATE_FORMAT)
}
getExpireTime(){
return this.values.expireTime
}
getExpireTimeMulti(){
return this.values.expireTimeMulti
}
getAll(){
return Ee({},this.values)
}
getPhishing(){
return this.values.phishing
}
getPhishingDomain(){
return this.values.phishingDomain
}
getBlocker(){
return this.values.block
}
getRating(){
return this.values.rating
}
getRatingCategory(){
const e=this.AvastWRC,t=this.getRating()
return this.isPhishing()||this.isMalware()?e.RATING_BAD:t<0?e.RATING_NONE:t<=e.RATING_THRESHOLD_AVERAGE?e.RATING_AVERAGE:e.RATING_GOOD
}
isMalware(){
return this.getBlocker()>0
}
isPhishing(){
return this.getPhishing()>1
}
}
class Se{
constructor(e){
this.AvastWRC=e,this.cache={}
}
get(e){
return this.cache[e]?this.cache[e]:this.cache[this.AvastWRC.Utils.getDomain(e)]?this.cache[this.AvastWRC.Utils.getDomain(e)]:void 0
}
set(e,t){
this.cache[e]=t
const n=this.AvastWRC.Utils.getDomain(e)
this.cache[n]=t
}
}
class Oe{
constructor(){
this.reqCache={}
}
set(e,t,n){
var i=this.reqCache[e]
i?i[t]=n:((i={})[t]=n,this.reqCache[e]=i)
}
get(e,t){
var n=null,i=this.reqCache[e]
return i&&(n=i[t]),n
}
drop(e){
this.reqCache[e]&&delete this.reqCache[e]
}
tabIds(){
return Object.keys(this.reqCache)
}
}
class _e{
constructor(){
this.queue={}
}
set(e,t){
var n=this.queue[e]
n?n.push(t):((n=[]).push(t),this.queue[e]=n)
}
get(e){
var t=null,n=this.queue[e]
return n&&(t=n.pop()),t
}
drop(e){
this.queue[e]&&delete this.queue[e]
}
}
class Te{
constructor(){
this.browser="",this.version="",this.OS="",this.OSVersion="",this.dataBrowser=[{
string:navigator.userAgent,
subString:"Edge",
identity:"MS_EDGE"
},{
string:navigator.userAgent,
subString:"Edg/",
identity:"CHROMIUMEDGE"
},{
string:navigator.userAgent,
subString:"OPR",
identity:"OPERA"
},{
string:navigator.userAgent,
subString:"Avast",
identity:"AVAST"
},{
string:navigator.userAgent,
subString:"Chrome",
identity:"CHROME"
},{
string:navigator.vendor,
subString:"Apple",
identity:"SAFARI",
versionSearch:"Version"
},{
string:navigator.userAgent,
subString:"Firefox",
identity:"FIREFOX"
}],this.dataOS=[{
string:navigator.platform,
subString:"Win",
identity:"Windows"
},{
string:navigator.platform,
subString:"Mac",
identity:"Mac"
},{
string:navigator.userAgent,
subString:"iPhone",
identity:"iPhone/iPod"
},{
string:navigator.platform,
subString:"Linux",
identity:"Linux"
}],this.dataOSVersion=[{
string:navigator.userAgent,
subString:"Windows 10.0",
identity:"10.0 (Windows 10.0)"
},{
string:navigator.userAgent,
subString:"Windows NT 10.0",
identity:"10.0 (Windows NT 10.0)"
},{
string:navigator.userAgent,
subString:"Windows 8.1",
identity:"6.3 (Windows 8.1)"
},{
string:navigator.userAgent,
subString:"Windows NT 6.3",
identity:"6.3 (Windows NT 6.3)"
},{
string:navigator.userAgent,
subString:"Windows 8",
identity:"6.2 (Windows 8)"
},{
string:navigator.userAgent,
subString:"Windows NT 6.2",
identity:"6.2 (Windows NT 6.2)"
},{
string:navigator.userAgent,
subString:"Windows 7",
identity:"6.1 (Windows 7)"
},{
string:navigator.userAgent,
subString:"Windows NT 6.1",
identity:"6.1 (Windows NT 6.1)"
},{
string:navigator.userAgent,
subString:"Windows NT 6.0",
identity:"6.0 (Windows NT 6.0)"
},{
string:navigator.userAgent,
subString:"Windows NT 5.2",
identity:"5.2 (Windows NT 5.2)"
},{
string:navigator.userAgent,
subString:"Windows NT 5.1",
identity:"5.1 (Windows NT 5.1)"
},{
string:navigator.userAgent,
subString:"Windows XP",
identity:"5.1 (Windows XP)"
},{
string:navigator.userAgent,
subString:"Windows NT 5.0",
identity:"5.0 (Windows NT 5.0)"
},{
string:navigator.userAgent,
subString:"Windows 2000",
identity:"5.0 (Windows 2000)"
},{
string:navigator.userAgent,
subString:"Win 9x 4.90",
identity:"4.90 (Win 9x 4.90)"
},{
string:navigator.userAgent,
subString:"Windows ME",
identity:"4.90 (Windows ME)"
},{
string:navigator.userAgent,
subString:"Windows 98",
identity:"4.10 (Windows 98)"
},{
string:navigator.userAgent,
subString:"Win98",
identity:"4.10 (Win98)"
},{
string:navigator.userAgent,
subString:"Windows 95",
identity:"4.03 (Windows 95)"
},{
string:navigator.userAgent,
subString:"Win95",
identity:"4.03 (Win95)"
},{
string:navigator.userAgent,
subString:"Windows_95",
identity:"4.03 (Windows_95)"
},{
string:navigator.userAgent,
subString:"Windows NT 4.0",
identity:"4.0 (Windows NT 4.0)"
},{
string:navigator.userAgent,
subString:"WinNT4.0",
identity:"4.0 (WinNT4.0)"
},{
string:navigator.userAgent,
subString:"WinNT",
identity:"4.0 (WinNT)"
},{
string:navigator.userAgent,
subString:"Windows NT",
identity:"4.0 (Windows NT)"
},{
string:navigator.userAgent,
subString:"Win16",
identity:"3.11 (Win16)"
},{
string:navigator.userAgent,
subString:"Intel Mac OS X 10_13",
identity:"10.13 (macOS High Sierra)"
},{
string:navigator.userAgent,
subString:"Intel Mac OS X 10_12",
identity:"10.12 (macOS Sierra)"
},{
string:navigator.userAgent,
subString:"Intel Mac OS X 10_11",
identity:"10.11 (macOS El Capitan)"
},{
string:navigator.userAgent,
subString:"Intel Mac OS X 10_10",
identity:"10.10 (macOS Yosemite)"
},{
string:navigator.userAgent,
subString:"Intel Mac OS X 10_9",
identity:"10.9 (macOS Mavericks)"
}]
}
get(e){
if("browser"===e){
return""===this.browser&&(this.browser=this.searchString(this.dataBrowser)||"An unknown browser"),
this.browser
}
if("version"===e){
return""===this.version&&(this.version=this.searchVersion(this.dataBrowser)||"an unknown version"),
this.version
}
if("OS"===e){
return""===this.OS&&(this.OS=this.searchString(this.dataOS)||"an unknown OS"),
this.OS
}
if("OSVersion"===e){
return""===this.OSVersion&&(this.OSVersion=this.searchString(this.dataOSVersion)||"0.0 an unknown OS Version"),
this.OSVersion
}
if("OSType"===e){
switch(this.get("OS")){
case"Windows":
return"WIN"
case"Mac":
return"MAC"
case"iPhone/iPad":
return"IOS"
case"Linux":
return-1!==navigator.userAgent.indexOf("Android")?"ANDROID":"LINUX"
default:
return""
}
}else if("OSBuild"===e){
const e=this.get("OSVersion").match(/^[0-9.]+/)
return e?e[0]+".0":""
}
return"not found"
}
searchString(e){
for(let t=0;t<e.length;t++){
const n=e[t].string
if(n&&-1!==n.indexOf(e[t].subString)){
return e[t].identity
}
}
}
searchVersion(e){
for(let t=0;t<e.length;t++){
const n=e[t].string,i=new RegExp("("+e[t].subString+")/?\\s*([\\d\\.]+)","i"),a=n.match(i)||[]
if(3===a.length){
return a[2]
}
}
return!1
}
}
class Ie{
constructor(e){
this.AvastWRC=e,this.throttle=this.AvastWRC.throttle,this.dateFormat=function(){
var e=/d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,t=/\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,n=/[^-+\dA-Z]/g,i=function(e,t){
for(e=String(e),
t=t||2;e.length<t;){
e="0"+e
}
return e
}
return function(a,o,r){
var s=this.dateFormat
if(1!=arguments.length||"[object String]"!=Object.prototype.toString.call(a)||/\d/.test(a)||(o=a,
a=void 0),
a=a?new Date(a):new Date,isNaN(a)){
throw SyntaxError("invalid date")
}
"UTC:"==(o=String(s.masks[o]||o||s.masks.default)).slice(0,4)&&(o=o.slice(4),r=!0)
var u=r?"getUTC":"get",l=a[u+"Date"](),c=a[u+"Day"](),p=a[u+"Month"](),m=a[u+"FullYear"](),d=a[u+"Hours"](),h=a[u+"Minutes"](),g=a[u+"Seconds"](),f=a[u+"Milliseconds"](),b=r?0:a.getTimezoneOffset(),y={
d:l,
dd:i(l),
ddd:s.i18n.dayNames[c],
dddd:s.i18n.dayNames[c+7],
m:p+1,
mm:i(p+1),
mmm:s.i18n.monthNames[p],
mmmm:s.i18n.monthNames[p+12],
yy:String(m).slice(2),
yyyy:m,
h:d%12||12,
hh:i(d%12||12),
H:d,
HH:i(d),
M:h,
MM:i(h),
s:g,
ss:i(g),
l:i(f,3),
L:i(f>99?Math.round(f/10):f),
t:d<12?"a":"p",
tt:d<12?"am":"pm",
T:d<12?"A":"P",
TT:d<12?"AM":"PM",
Z:r?"UTC":(String(a).match(t)||[""]).pop().replace(n,""),
o:(b>0?"-":"+")+i(100*Math.floor(Math.abs(b)/60)+Math.abs(b)%60,4),
S:["th","st","nd","rd"][l%10>3?0:(l%100-l%10!=10)*l%10]
}
return o.replace(e,(function(e){
return e in y?y[e]:e.slice(1,e.length-1)
}))
}.bind(this)
}.bind(this)(),this.dateFormat.masks={
default:"ddd mmm dd yyyy HH:MM:ss",
shortDate:"m/d/yy",
mediumDate:"mmm d, yyyy",
longDate:"mmmm d, yyyy",
fullDate:"dddd, mmmm d, yyyy",
shortTime:"h:MM TT",
mediumTime:"h:MM:ss TT",
longTime:"h:MM:ss TT Z",
isoDate:"yyyy-mm-dd",
isoTime:"HH:MM:ss",
isoDateTime:"yyyy-mm-dd'T'HH:MM:ss",
isoUtcDateTime:"UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
},this.dateFormat.i18n={
dayNames:["Sun","Mon","Tue","Wed","Thu","Fri","Sat","Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
monthNames:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","January","February","March","April","May","June","July","August","September","October","November","December"]
}
}
getProperties(){
var e=0,t=void 0
if(arguments.length>0){
for(t=arguments[e++];t&&e<arguments.length;){
t=t[arguments[e++]]
}
}
return t
}
setProperties(){
var e=arguments.length
if(e>2){
for(var t=arguments[0],n=1;n<e-2;n++){
t[arguments[n]]||(t[arguments[n]]={}),t=t[arguments[n]]
}
t[arguments[e-2]]=arguments[e-1]
}
}
resolveLocalMock(e){
for(var t=this.AvastWRC.DEFAULTS.DNT_MOCKS_RULES,n=0;n<t.length;n++){
if(RegExp(t[n].pattern).test(e)){
return t[n].mock
}
}
return null
}
getDomain(e){
if(void 0===e||null==e){
return null
}
const t=this.getUrlTarget(e)
t&&(e="http://"+t)
const n=e.match(new RegExp("^(ftp|http|https)://(w+:{0,1}w*@)?(www.)?([a-z0-9-.]+[a-z]{2,6})(:[0-9]+)?(.*)?$"))
return n&&n.length>4?n[4]:null
}
getUrlTarget(e){
var t=this.getUrlVars(e)
for(var n in t){
if(t.hasOwnProperty(n)){
try{
var i=/((https?\:\/\/(www\.)?|www\.)(([\w|\-]+\.)+(\w+)))([\/#\?].*)?/,a=decodeURIComponent(t[n]),o=a.match(i)
if(o){
return o[2]+o[4]
}
if(o=atob(a).match(i)){
return o[2]+o[4]
}
}catch(e){}
}
}
return null
}
getUrlVars(e){
const t={}
return void 0===e||null==e||e.replace(/[?&]+([^=&]+)=([^&]*)/gi,(function(e,n,i){
t[n]=i
})),t
}
getBrowserInfo(){
let e=new Te
return{
osVersion:e.get("OSVersion"),
os:e.get("OS"),
getBrowser:function(){
return e.get("browser")
},
getBrowserVersion:function(){
return e.get("version")
},
getBrowserVersionMajor:function(){
let t=e.get("version").split(".")
return t.length>=1?t[0]:0
},
getOS:function(){
return e.get("OS")
},
getOSVersion:function(){
return e.get("OSVersion")
},
getOSType:function(){
return e.get("OSType")
},
getOSBuild:function(){
return e.get("OSBuild")
},
isWindows:function(){
return null!==this.os&&/Windows/.test(this.os)
},
isFirefox:function(){
return"FIREFOX"===e.get("browser")
},
isChrome:function(){
return"CHROME"===e.get("browser")
},
isEdge:function(){
return"MS_EDGE"===e.get("browser")
},
isOpera:function(){
return"OPERA"===e.get("browser")
},
isSafari:function(){
return"SAFARI"===e.get("browser")
},
isAvast:function(){
return"AVAST"===e.get("browser")
}
}
}
getRandomUID(){
const e="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",t="0123456789abcdef"
let n=0,i=""
for(let a=0;a<e.length;a++){
"-"!==e[a]&&"4"!==e[a]&&(n=16*Math.random()|0),"x"===e[a]?i+=t[n]:"y"===e[a]?(n&=3,
n|=8,
i+=t[n]):i+=e[a]
}
return i
}
}
class Re{
constructor(e){
this.AvastWRC=e,this.CHECK_LOCAL_PORT=5e5,this.webshieldProperties=["avcfg://WebShield/Common/ProviderEnabled","avcfg://WebShield/Common/TemporaryDisabled","avcfg://WebShield/WebScanner/HttpsScanning","avcfg://WebShield/WebScanner/WebScanning","avcfg://WebShield/WebScanner/ScriptScaning","avcfg://WebShield/WebScanner/URLBlocking","avcfg://settings/Common/HardenedMode","avcfg://WebShield/Common/TaskSensitivity"]
}
connect(){
return this.AvastWRC.CONFIG.LOCAL_ENABLED?new Promise(e=>{
this.findActiveAvastPort().then(t=>{
this.AvastWRC.Query.CONST.LOCAL_PORT=t.port,
this.AvastWRC.Query.CONST.LOCAL_TIMESTAMP=1*new Date,
this.AvastWRC.bal.emitEvent("local.init"),
this.retrieveGuid(),this.retrieveVersions(),
this.retrieveWebshieldSettings(),e({
localPort:t.port,
avastEdition:t.edition
})
}).catch(()=>{
this.AvastWRC.CONFIG.WEBSHIELD=null,e({
localPort:null,
avastEdition:null
})
}),setInterval(this.recheckAvastPort.bind(this),this.CHECK_LOCAL_PORT)
}):Promise.resolve({
localPort:null,
avastEdition:null
})
}
findActiveAvastPort(){
return new Promise((e,t)=>{
const n=this.AvastWRC.Query.CONST.LOCAL_PORTS.map(e=>this.connectAvastCheck(e))
Promise.allSettled(n).then(n=>{
const i=n.find(e=>"fulfilled"===e.status)
i?e(i.value):t(new Error("No open port found"))
})
})
}
recheckAvastPort(){
const e=this.AvastWRC.Query.CONST.LOCAL_PORT
;(e?this.connectAvastCheck(e):this.findActiveAvastPort()).then(e=>{
this.AvastWRC.Query.CONST.LOCAL_PORT=e.port,
this.AvastWRC.Query.CONST.LOCAL_TIMESTAMP=1*new Date,
this.retrieveVersions(),this.retrieveWebshieldSettings()
}).catch(()=>{
this.AvastWRC.Query.CONST.LOCAL_PORT=null,this.AvastWRC.Query.CONST.LOCAL_TIMESTAMP=1*new Date,
this.AvastWRC.CONFIG.WEBSHIELD=null
})
}
_mapWebshieldResults(e){
return{
ProviderEnabled:e[0],
TemporaryDisabled:e[1],
HttpsScanning:e[2],
WebScanning:e[3],
ScriptScanning:e[4],
URLBlocking:e[5],
HardenedMode:e[6],
TaskSensitivity:e[7],
PassiveMode:e[8],
RestartNeeded:e[9]
}
}
retrieveWebshieldSettingsV1(){
this.getProperties(this.webshieldProperties).then(e=>{
let t=null
e&&e.length===this.webshieldProperties.length&&(t=this._mapWebshieldResults(e)),
this.AvastWRC.CONFIG.WEBSHIELD=t
}).catch(()=>{
this.AvastWRC.CONFIG.WEBSHIELD=null
})
}
retrieveWebshieldSettingsV2(){
const e=Array.from(this.webshieldProperties)
e.push("avprop://Common/PassiveMode/Enabled"),e.push("avprop://Common/RestartNeeded/Value"),
this.getProperties(e).then(t=>{
let n=null
t&&t.length===e.length?(n=this._mapWebshieldResults(t),this.AvastWRC.CONFIG.WEBSHIELD=n):this.retrieveWebshieldSettingsV1()
}).catch(()=>{
this.AvastWRC.CONFIG.WEBSHIELD=null
})
}
retrieveWebshieldSettings(){
this.retrieveWebshieldSettingsV2()
}
retrieveGuid(){
this.getGuid().then(e=>{
this.AvastWRC.bal.emitEvent("local.paired",e[0],e[2])
})
}
retrieveVersions(){
this.getVersions().then(e=>{
3===e.length&&this.AvastWRC.bal.emitEvent("local.versions",e[0],e[1],e[2])
}).catch(()=>{})
}
connectAvastCheck(e){
return this.AvastWRC.CONFIG.LOCAL_ENABLED?new Promise((t,n)=>{
new this.AvastWRC.Query.Avast(this.AvastWRC,{
type:"ACKNOWLEDGEMENT",
server:"http://localhost:"+e+"/command",
callback:i=>{
i.result&&i.result[0]===this.AvastWRC.DEFAULTS.BRAND_NAME&&i.result.length>2?(this.AvastWRC.Query.CONST.LOCAL_TOKEN=i.result[3]||null,
t({
port:e,
edition:0
})):n(new Error("Not connected to "+this.AvastWRC.DEFAULTS.BRAND_NAME))
},
error:e=>n(new Error(e))
})
}):Promise.reject()
}
getGuid(){
return this.AvastWRC.CONFIG.LOCAL_ENABLED?new Promise((e,t)=>{
new this.AvastWRC.Query.Avast(this.AvastWRC,{
type:"GET_GUIDS",
callback:t=>e(t.result),
error:e=>t(new Error(e))
})
}):Promise.reject()
}
getVersions(){
return this.AvastWRC.CONFIG.LOCAL_ENABLED?new Promise((e,t)=>{
new this.AvastWRC.Query.Avast(this.AvastWRC,{
type:"GET_VERSIONS",
callback:t=>e(t.result),
error:e=>t(new Error(e))
})
}):Promise.reject()
}
getProperties(e){
return this.AvastWRC.CONFIG.LOCAL_ENABLED?new Promise((t,n)=>{
new this.AvastWRC.Query.Avast(this.AvastWRC,{
type:"GET_PROPERTIES",
params:e,
callback:e=>t(e.result),
error:e=>{
403===e.status&&(this.AvastWRC.Query.CONST.LOCAL_TOKEN=null,this.findActiveAvastPort()),
n()
}
})
}):Promise.reject()
}
isSecureBrowserAvailable(){
return this.AvastWRC.CONFIG.LOCAL_ENABLED?new Promise((e,t)=>{
new this.AvastWRC.Query.Avast(this.AvastWRC,{
type:"IS_SAFEZONE_AVAILABLE",
callback:t=>e(t),
error:e=>t(e)
})
}):Promise.reject()
}
switchToSecureBrowser(e){
if(!this.AvastWRC.CONFIG.LOCAL_ENABLED){
return!1
}
new this.AvastWRC.Query.Avast(this.AvastWRC,{
type:"SWITCH_TO_SAFEZONE",
value:e
})
}
}
var Ce=n(14),xe=n.n(Ce),Ne=n(7),Pe=n.n(Ne)
class Le{
constructor(e){
this.AvastWRC=e
}
commonMessageHubAos(e,t,n){
if(void 0!==n){
switch(e){
case"tabInitialized":
this.AvastWRC.initedTabs[n.id]=t.session,this.AvastWRC.bs.messageTab(n,{
message:"tabInitAccepted"
}),this.AvastWRC.bs.flushTabMessages(n)
break
case"unload":
this.AvastWRC.initedTabs[n.id]===t.session&&(this.AvastWRC.initedTabs[n.id]=!1)
break
case"messageBoxFeedback":
switch(t.type){
case"phishing":
case"malware":
this.AvastWRC.bs.tabRedirect(n,t.safety_url)
}
break
case"afterInstallAction":
this.AvastWRC.bal.settingFeatureSet("urlConsent",t.urlConsent,t.clickSource),
!0===t.urlConsent&&(this.AvastWRC.bal.emitEvent("control.setIcon",void 0,"common/ui/icons/icon-unknown.png"),
this.AvastWRC.bs.messageTab(n,{
message:"openSidebar",
data:{
openSettings:!0
}
}))
break
case"closeTab":
this.AvastWRC.bs.closeTab(n)
break
case"openStore":
this.AvastWRC.bs.openStore(n)
break
default:
this.AvastWRC.bal.emitEvent("message."+e,t,n)
}
}
}
getSafePageUrl(){
return this.AvastWRC.PHISHING_REDIRECT
}
tabPhishing(e,t,n){
t.isPhishing()?(this.showPhishingPage(n.id),this.AvastWRC.bal.emitEvent("track.phishing.open")):t.isMalware()&&(this.showMalwarePage(n.id),
this.AvastWRC.bal.emitEvent("track.malware.open"))
}
showPhishingPage(e){
this._showMaliciousPage("phishing",e)
}
showMalwarePage(e){
this._showMaliciousPage("malware",e)
}
_showMaliciousPage(e,t){
const n={
type:e,
safety_url:this.getSafePageUrl(),
brandName:this.AvastWRC.DEFAULTS.BRAND_NAME
},i={
url:this.AvastWRC.bs.getLocalResourceURL("common/messagebox.html?data="+btoa(JSON.stringify(n)))
}
this.AvastWRC.Utils.getBrowserInfo().isFirefox()&&(i.loadReplace=!0),this.AvastWRC.bs.tabUpdate(t,i)
}
registerModuleListeners(e){
e.on("local.paired",(e,t)=>{
""!==e&&(this.AvastWRC.CONFIG.GUID=e),""!==t&&(this.AvastWRC.CONFIG.HWID=t)
const n={
guid:this.AvastWRC.CONFIG.GUID,
plg_guid:this.AvastWRC.CONFIG.PLG_GUID,
hwid:this.AvastWRC.CONFIG.HWID
}
this.AvastWRC.AvastConfig.set(n)
}),e.on("local.versions",(e,t,n)=>{
""!==e&&(this.AvastWRC.CONFIG.AV_VERSION=e),""!==t&&(this.AvastWRC.CONFIG.OS_VERSION=t),
""!==n&&(this.AvastWRC.CONFIG.OS=n)
}),e.on("urlInfo.response",this.tabPhishing.bind(this)),
e.on("shepherd.updated",e=>{
if(!e){
return
}
const t=e.surveys&&e.surveys.uninstall||{},{browserLang:n,browserLang2:i}=this.AvastWRC.localization.getLanguages(),a=t[n]||t[i]||""
if(this.AvastWRC.bal.setUninstallURL(a),e.webrep&&void 0!==e.webrep.thresholdAverage&&(this.AvastWRC.RATING_THRESHOLD_AVERAGE=e.webrep.thresholdAverage),
e.feedback){
const t=e.feedback.url||{}
this.AvastWRC.CONFIG.FEEDBACK_URL=t[n]||t[i]||"",this.AvastWRC.CONFIG.FEEDBACK_RESET=1e3*e.feedback.resetTime||0
}else{
this.AvastWRC.CONFIG.FEEDBACK_URL=null,this.AvastWRC.CONFIG.FEEDBACK_RESET=0
}
})
}
getModuleDefaultSettings(){
return{
safeZone:{
declined:{}
},
features:{
phishing:!0,
dnt:!0,
dntBadge:!0,
dntAutoBlock:!1,
dntSocial:!1,
dntAdTracking:!1,
dntWebAnalytics:!1,
dntOthers:!1,
secureBrowser:!0,
communityIQ:!1,
serp:!0,
serpPopup:!0,
productAnalysis:!0,
urlConsent:!0
},
ui:{
feedbackClickedTime:null
}
}
}
}
var ze=function(e){
return function(t,n,i){
for(var a=-1,o=Object(t),r=i(t),s=r.length;s--;){
var u=r[e?s:++a]
if(!1===n(o[u],u,o)){
break
}
}
return t
}
}()
var De=function(e){
return"function"==typeof e?e:D
}
var Be=function(e){
var t=[]
if(null!=e){
for(var n in Object(e)){
t.push(n)
}
}
return t
},Ue=Object.prototype.hasOwnProperty
var We=function(e){
if(!h(e)){
return Be(e)
}
var t=Q(e),n=[]
for(var i in e){
("constructor"!=i||!t&&Ue.call(e,i))&&n.push(i)
}
return n
}
var Ve=function(e){
return Y(e)?fe(e,!0):We(e)
}
var Me=function(e,t){
return null==e?e:ze(e,De(t),Ve)
}
var Fe=function(e,t){
for(var n=-1,i=null==e?0:e.length;++n<i&&!1!==t(e[n],n,e);){}
return e
}
var qe=function(e,t){
return function(n,i){
if(null==n){
return n
}
if(!Y(n)){
return e(n,i)
}
for(var a=n.length,o=t?a:-1,r=Object(n);(t?o--:++o<a)&&!1!==i(r[o],o,r);){}
return n
}
}((function(e,t){
return e&&ze(e,t,we)
}))
var Ge=function(e,t){
return(se(e)?Fe:qe)(e,De(t))
}
var He=function(){
this.__data__=[],this.size=0
}
var Ye=function(e,t){
for(var n=e.length;n--;){
if(N(e[n][0],t)){
return n
}
}
return-1
},Ke=Array.prototype.splice
var Je=function(e){
var t=this.__data__,n=Ye(t,e)
return!(n<0)&&(n==t.length-1?t.pop():Ke.call(t,n,1),--this.size,!0)
}
var Ze=function(e){
var t=this.__data__,n=Ye(t,e)
return n<0?void 0:t[n][1]
}
var Xe=function(e){
return Ye(this.__data__,e)>-1
}
var $e=function(e,t){
var n=this.__data__,i=Ye(n,e)
return i<0?(++this.size,n.push([e,t])):n[i][1]=t,this
}
function Qe(e){
var t=-1,n=null==e?0:e.length
for(this.clear();++t<n;){
var i=e[t]
this.set(i[0],i[1])
}
}
Qe.prototype.clear=He,Qe.prototype.delete=Je,Qe.prototype.get=Ze,Qe.prototype.has=Xe,
Qe.prototype.set=$e
var et=Qe
var tt=function(){
this.__data__=new et,this.size=0
}
var nt=function(e){
var t=this.__data__,n=t.delete(e)
return this.size=t.size,n
}
var it=function(e){
return this.__data__.get(e)
}
var at=function(e){
return this.__data__.has(e)
},ot=R(i.a,"Map"),rt=R(Object,"create")
var st=function(){
this.__data__=rt?rt(null):{},this.size=0
}
var ut=function(e){
var t=this.has(e)&&delete this.__data__[e]
return this.size-=t?1:0,t
},lt=Object.prototype.hasOwnProperty
var ct=function(e){
var t=this.__data__
if(rt){
var n=t[e]
return"__lodash_hash_undefined__"===n?void 0:n
}
return lt.call(t,e)?t[e]:void 0
},pt=Object.prototype.hasOwnProperty
var mt=function(e){
var t=this.__data__
return rt?void 0!==t[e]:pt.call(t,e)
}
var dt=function(e,t){
var n=this.__data__
return this.size+=this.has(e)?0:1,n[e]=rt&&void 0===t?"__lodash_hash_undefined__":t,
this
}
function ht(e){
var t=-1,n=null==e?0:e.length
for(this.clear();++t<n;){
var i=e[t]
this.set(i[0],i[1])
}
}
ht.prototype.clear=st,ht.prototype.delete=ut,ht.prototype.get=ct,ht.prototype.has=mt,
ht.prototype.set=dt
var gt=ht
var ft=function(){
this.size=0,this.__data__={
hash:new gt,
map:new(ot||et),
string:new gt
}
}
var bt=function(e){
var t=typeof e
return"string"==t||"number"==t||"symbol"==t||"boolean"==t?"__proto__"!==e:null===e
}
var yt=function(e,t){
var n=e.__data__
return bt(t)?n["string"==typeof t?"string":"hash"]:n.map
}
var kt=function(e){
var t=yt(this,e).delete(e)
return this.size-=t?1:0,t
}
var vt=function(e){
return yt(this,e).get(e)
}
var wt=function(e){
return yt(this,e).has(e)
}
var jt=function(e,t){
var n=yt(this,e),i=n.size
return n.set(e,t),this.size+=n.size==i?0:1,this
}
function Et(e){
var t=-1,n=null==e?0:e.length
for(this.clear();++t<n;){
var i=e[t]
this.set(i[0],i[1])
}
}
Et.prototype.clear=ft,Et.prototype.delete=kt,Et.prototype.get=vt,Et.prototype.has=wt,
Et.prototype.set=jt
var At=Et
var St=function(e,t){
var n=this.__data__
if(n instanceof et){
var i=n.__data__
if(!ot||i.length<199){
return i.push([e,t]),this.size=++n.size,this
}
n=this.__data__=new At(i)
}
return n.set(e,t),this.size=n.size,this
}
function Ot(e){
var t=this.__data__=new et(e)
this.size=t.size
}
Ot.prototype.clear=tt,Ot.prototype.delete=nt,Ot.prototype.get=it,Ot.prototype.has=at,
Ot.prototype.set=St
var _t=Ot
var Tt=function(e){
return this.__data__.set(e,"__lodash_hash_undefined__"),this
}
var It=function(e){
return this.__data__.has(e)
}
function Rt(e){
var t=-1,n=null==e?0:e.length
for(this.__data__=new At;++t<n;){
this.add(e[t])
}
}
Rt.prototype.add=Rt.prototype.push=Tt,Rt.prototype.has=It
var Ct=Rt
var xt=function(e,t){
for(var n=-1,i=null==e?0:e.length;++n<i;){
if(t(e[n],n,e)){
return!0
}
}
return!1
}
var Nt=function(e,t){
return e.has(t)
}
var Pt=function(e,t,n,i,a,o){
var r=1&n,s=e.length,u=t.length
if(s!=u&&!(r&&u>s)){
return!1
}
var l=o.get(e)
if(l&&o.get(t)){
return l==t
}
var c=-1,p=!0,m=2&n?new Ct:void 0
for(o.set(e,t),o.set(t,e);++c<s;){
var d=e[c],h=t[c]
if(i){
var g=r?i(h,d,c,t,e,o):i(d,h,c,e,t,o)
}
if(void 0!==g){
if(g){
continue
}
p=!1
break
}
if(m){
if(!xt(t,(function(e,t){
if(!Nt(m,t)&&(d===e||a(d,e,n,i,o))){
return m.push(t)
}
}))){
p=!1
break
}
}else if(d!==h&&!a(d,h,n,i,o)){
p=!1
break
}
}
return o.delete(e),o.delete(t),p
},Lt=i.a.Uint8Array
var zt=function(e){
var t=-1,n=Array(e.size)
return e.forEach((function(e,i){
n[++t]=[i,e]
})),n
}
var Dt=function(e){
var t=-1,n=Array(e.size)
return e.forEach((function(e){
n[++t]=e
})),n
},Bt=a?a.prototype:void 0,Ut=Bt?Bt.valueOf:void 0
var Wt=function(e,t,n,i,a,o,r){
switch(n){
case"[object DataView]":
if(e.byteLength!=t.byteLength||e.byteOffset!=t.byteOffset){
return!1
}
e=e.buffer,t=t.buffer
case"[object ArrayBuffer]":
return!(e.byteLength!=t.byteLength||!o(new Lt(e),new Lt(t)))
case"[object Boolean]":
case"[object Date]":
case"[object Number]":
return N(+e,+t)
case"[object Error]":
return e.name==t.name&&e.message==t.message
case"[object RegExp]":
case"[object String]":
return e==t+""
case"[object Map]":
var s=zt
case"[object Set]":
var u=1&i
if(s||(s=Dt),e.size!=t.size&&!u){
return!1
}
var l=r.get(e)
if(l){
return l==t
}
i|=2,r.set(e,t)
var c=Pt(s(e),s(t),i,a,o,r)
return r.delete(e),c
case"[object Symbol]":
if(Ut){
return Ut.call(e)==Ut.call(t)
}
}
return!1
}
var Vt=function(e,t){
for(var n=-1,i=t.length,a=e.length;++n<i;){
e[a+n]=t[n]
}
return e
}
var Mt=function(e,t,n){
var i=t(e)
return se(e)?i:Vt(i,n(e))
}
var Ft=function(e,t){
for(var n=-1,i=null==e?0:e.length,a=0,o=[];++n<i;){
var r=e[n]
t(r,n,e)&&(o[a++]=r)
}
return o
}
var qt=function(){
return[]
},Gt=Object.prototype.propertyIsEnumerable,Ht=Object.getOwnPropertySymbols,Yt=Ht?function(e){
return null==e?[]:(e=Object(e),
Ft(Ht(e),(function(t){
return Gt.call(e,t)
})))
}:qt
var Kt=function(e){
return Mt(e,we,Yt)
},Jt=Object.prototype.hasOwnProperty
var Zt=function(e,t,n,i,a,o){
var r=1&n,s=Kt(e),u=s.length
if(u!=Kt(t).length&&!r){
return!1
}
for(var l=u;l--;){
var c=s[l]
if(!(r?c in t:Jt.call(t,c))){
return!1
}
}
var p=o.get(e)
if(p&&o.get(t)){
return p==t
}
var m=!0
o.set(e,t),o.set(t,e)
for(var d=r;++l<u;){
var h=e[c=s[l]],g=t[c]
if(i){
var f=r?i(g,h,c,t,e,o):i(h,g,c,e,t,o)
}
if(!(void 0===f?h===g||a(h,g,n,i,o):f)){
m=!1
break
}
d||(d="constructor"==c)
}
if(m&&!d){
var b=e.constructor,y=t.constructor
b==y||!("constructor"in e)||!("constructor"in t)||"function"==typeof b&&b instanceof b&&"function"==typeof y&&y instanceof y||(m=!1)
}
return o.delete(e),o.delete(t),m
},Xt=R(i.a,"DataView"),$t=R(i.a,"Promise"),Qt=R(i.a,"Set"),en=R(i.a,"WeakMap"),tn=w(Xt),nn=w(ot),an=w($t),on=w(Qt),rn=w(en),sn=d
;(Xt&&"[object DataView]"!=sn(new Xt(new ArrayBuffer(1)))||ot&&"[object Map]"!=sn(new ot)||$t&&"[object Promise]"!=sn($t.resolve())||Qt&&"[object Set]"!=sn(new Qt)||en&&"[object WeakMap]"!=sn(new en))&&(sn=function(e){
var t=d(e),n="[object Object]"==t?e.constructor:void 0,i=n?w(n):""
if(i){
switch(i){
case tn:
return"[object DataView]"
case nn:
return"[object Map]"
case an:
return"[object Promise]"
case on:
return"[object Set]"
case rn:
return"[object WeakMap]"
}
}
return t
})
var un=sn,ln=Object.prototype.hasOwnProperty
var cn=function(e,t,n,i,a,o){
var r=se(e),s=se(t),u=r?"[object Array]":un(e),l=s?"[object Array]":un(t),c="[object Object]"==(u="[object Arguments]"==u?"[object Object]":u),p="[object Object]"==(l="[object Arguments]"==l?"[object Object]":l),m=u==l
if(m&&Object(ue.a)(e)){
if(!Object(ue.a)(t)){
return!1
}
r=!0,c=!1
}
if(m&&!c){
return o||(o=new _t),r||he(e)?Pt(e,t,n,i,a,o):Wt(e,t,u,n,i,a,o)
}
if(!(1&n)){
var d=c&&ln.call(e,"__wrapped__"),h=p&&ln.call(t,"__wrapped__")
if(d||h){
var g=d?e.value():e,f=h?t.value():t
return o||(o=new _t),a(g,f,n,i,o)
}
}
return!!m&&(o||(o=new _t),Zt(e,t,n,i,a,o))
}
var pn=function e(t,n,i,a,o){
return t===n||(null==t||null==n||!te(t)&&!te(n)?t!=t&&n!=n:cn(t,n,i,a,e,o))
}
var mn=function(e,t,n,i){
var a=n.length,o=a,r=!i
if(null==e){
return!o
}
for(e=Object(e);a--;){
var s=n[a]
if(r&&s[2]?s[1]!==e[s[0]]:!(s[0]in e)){
return!1
}
}
for(;++a<o;){
var u=(s=n[a])[0],l=e[u],c=s[1]
if(r&&s[2]){
if(void 0===l&&!(u in e)){
return!1
}
}else{
var p=new _t
if(i){
var m=i(l,c,u,e,t,p)
}
if(!(void 0===m?pn(c,l,3,i,p):m)){
return!1
}
}
}
return!0
}
var dn=function(e){
return e==e&&!h(e)
}
var hn=function(e){
for(var t=we(e),n=t.length;n--;){
var i=t[n],a=e[i]
t[n]=[i,a,dn(a)]
}
return t
}
var gn=function(e,t){
return function(n){
return null!=n&&(n[e]===t&&(void 0!==t||e in Object(n)))
}
}
var fn=function(e){
var t=hn(e)
return 1==t.length&&t[0][2]?gn(t[0][0],t[0][1]):function(n){
return n===e||mn(n,e,t)
}
}
var bn=function(e){
return"symbol"==typeof e||te(e)&&"[object Symbol]"==d(e)
},yn=/\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,kn=/^\w*$/
var vn=function(e,t){
if(se(e)){
return!1
}
var n=typeof e
return!("number"!=n&&"symbol"!=n&&"boolean"!=n&&null!=e&&!bn(e))||(kn.test(e)||!yn.test(e)||null!=t&&e in Object(t))
}
function wn(e,t){
if("function"!=typeof e||null!=t&&"function"!=typeof t){
throw new TypeError("Expected a function")
}
var n=function(){
var i=arguments,a=t?t.apply(this,i):i[0],o=n.cache
if(o.has(a)){
return o.get(a)
}
var r=e.apply(this,i)
return n.cache=o.set(a,r)||o,r
}
return n.cache=new(wn.Cache||At),n
}
wn.Cache=At
var jn=wn
var En=/[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g,An=/\\(\\)?/g,Sn=function(e){
var t=jn(e,(function(e){
return 500===n.size&&n.clear(),e
})),n=t.cache
return t
}((function(e){
var t=[]
return 46===e.charCodeAt(0)&&t.push(""),e.replace(En,(function(e,n,i,a){
t.push(i?a.replace(An,"$1"):n||e)
})),t
}))
var On=function(e,t){
for(var n=-1,i=null==e?0:e.length,a=Array(i);++n<i;){
a[n]=t(e[n],n,e)
}
return a
},_n=a?a.prototype:void 0,Tn=_n?_n.toString:void 0
var In=function e(t){
if("string"==typeof t){
return t
}
if(se(t)){
return On(t,e)+""
}
if(bn(t)){
return Tn?Tn.call(t):""
}
var n=t+""
return"0"==n&&1/t==-1/0?"-0":n
}
var Rn=function(e){
return null==e?"":In(e)
}
var Cn=function(e,t){
return se(e)?e:vn(e,t)?[e]:Sn(Rn(e))
}
var xn=function(e){
if("string"==typeof e||bn(e)){
return e
}
var t=e+""
return"0"==t&&1/e==-1/0?"-0":t
}
var Nn=function(e,t){
for(var n=0,i=(t=Cn(t,e)).length;null!=e&&n<i;){
e=e[xn(t[n++])]
}
return n&&n==i?e:void 0
}
var Pn=function(e,t,n){
var i=null==e?void 0:Nn(e,t)
return void 0===i?n:i
}
var Ln=function(e,t){
return null!=e&&t in Object(e)
}
var zn=function(e,t,n){
for(var i=-1,a=(t=Cn(t,e)).length,o=!1;++i<a;){
var r=xn(t[i])
if(!(o=null!=e&&n(e,r))){
break
}
e=e[r]
}
return o||++i!=a?o:!!(a=null==e?0:e.length)&&H(a)&&J(r,a)&&(se(e)||re(e))
}
var Dn=function(e,t){
return null!=e&&zn(e,t,Ln)
}
var Bn=function(e,t){
return vn(e)&&dn(t)?gn(xn(e),t):function(n){
var i=Pn(n,e)
return void 0===i&&i===t?Dn(n,e):pn(t,i,3)
}
}
var Un=function(e){
return function(t){
return null==t?void 0:t[e]
}
}
var Wn=function(e){
return function(t){
return Nn(t,e)
}
}
var Vn=function(e){
return vn(e)?Un(xn(e)):Wn(e)
}
var Mn=function(e){
return"function"==typeof e?e:null==e?D:"object"==typeof e?se(e)?Bn(e[0],e[1]):fn(e):Vn(e)
}
var Fn=function(e){
return function(t,n,i){
var a=Object(t)
if(!Y(t)){
var o=Mn(n,3)
t=we(t),n=function(e){
return o(a[e],e,a)
}
}
var r=e(t,n,i)
return r>-1?a[o?t[r]:r]:void 0
}
}
var qn=function(e,t,n,i){
for(var a=e.length,o=n+(i?1:-1);i?o--:++o<a;){
if(t(e[o],o,e)){
return o
}
}
return-1
},Gn=/^\s+|\s+$/g,Hn=/^[-+]0x[0-9a-f]+$/i,Yn=/^0b[01]+$/i,Kn=/^0o[0-7]+$/i,Jn=parseInt
var Zn=function(e){
if("number"==typeof e){
return e
}
if(bn(e)){
return NaN
}
if(h(e)){
var t="function"==typeof e.valueOf?e.valueOf():e
e=h(t)?t+"":t
}
if("string"!=typeof e){
return 0===e?e:+e
}
e=e.replace(Gn,"")
var n=Yn.test(e)
return n||Kn.test(e)?Jn(e.slice(2),n?2:8):Hn.test(e)?NaN:+e
}
var Xn=function(e){
return e?(e=Zn(e))===1/0||e===-1/0?17976931348623157e292*(e<0?-1:1):e==e?e:0:0===e?e:0
}
var $n=function(e){
var t=Xn(e),n=t%1
return t==t?n?t-n:t:0
},Qn=Math.max
var ei=Fn((function(e,t,n){
var i=null==e?0:e.length
if(!i){
return-1
}
var a=null==n?0:$n(n)
return a<0&&(a=Qn(i+a,0)),qn(e,Mn(t,3),a)
})),ti=Array.prototype.reverse
var ni=function(e){
return null==e?e:ti.call(e)
},ii=n(15)
class ai{
constructor(e){
this.AvastWRC=e,this.bal=e.bal,this.SUPPORTED_TRACKER_TYPES=["Others","WebAnalytics","AdTracking","Social"],
this.domainTrackers={},
this.patternTrackers=[],this.trkrType=this.SUPPORTED_TRACKER_TYPES
}
isBlocked(e,t,n){
let i=this.blockList.get()
return!1!==this.AvastWRC.bal.settings.get().features.dnt&&(!0===this.AvastWRC.bal.settings.get().features.dntAutoBlock||(!0===i.categories[n]||!0===i.trackers[t]))
}
resetModuleSettings(e=!1){
let t=this.AvastWRC.bal.settings.get(),n=this.blockList.get()
n.categories.Others=t.features.dntOthers,n.categories.WebAnalytics=t.features.dntWebAnalytics,
n.categories.AdTracking=t.features.dntAdTracking,
n.categories.Social=t.features.dntSocial,
e?(n.trackers=this.trackersBeforeReset,
this.trackersBeforeReset={}):(this.trackersBeforeReset=JSON.parse(JSON.stringify(n.trackers)),
n.trackers={}),
this.updateAllTabs(),this.blockList.set(n)
}
resetModuleSettingsUndo(){
this.resetModuleSettings(!0)
}
setDntFeatures(e,t,n){
let i=this.AvastWRC.bal.settings.get(),a=i.features,o={
Others:"dntOthers",
WebAnalytics:"dntWebAnalytics",
AdTracking:"dntAdTracking",
Social:"dntSocial"
}
for(let e in o){
let t=o[e]
n[e]!==a[t]&&(a[t]=n[e],this.bal.featureSettingChanged(t,!a[t],a[t]))
}
null!==e&&e!==a.dnt&&(a.dnt=e,this.bal.featureSettingChanged("dnt",!e,e)),a.dntAutoBlock=t,
i.features=a,
this.AvastWRC.bal.settings.set(i)
}
init(e){
return this.bal=e,e.hookOnFeatureChange("dntBadge",e=>{
this.updateAllTabs()
}),e.hookOnFeatureChange("dntAutoBlock",e=>{
this.updateAllTabs()
}),e.hookOnFeatureChange("dntSocial",e=>{
this.updateAllTabs()
}),e.hookOnFeatureChange("dntAdTracking",e=>{
this.updateAllTabs()
}),e.hookOnFeatureChange("dntWebAnalytics",e=>{
this.updateAllTabs()
}),e.hookOnFeatureChange("dntOthers",e=>{
this.updateAllTabs()
}),new Promise(e=>{
const t=[new Promise(e=>{
this.AvastWRC.getStorage("trackers",t=>{
this.trackers=this.bal.troughStorage("trackers",t||{}),
e()
})
}),new Promise(e=>{
this.AvastWRC.getStorage("whiteList",t=>{
this.whiteList=this.bal.troughStorage("whiteList",t||{}),
e()
})
}),new Promise(e=>{
this.AvastWRC.getStorage("blockList",t=>{
this.blockList=this.bal.troughStorage("blockList",t||{}),
e()
})
})]
Promise.all(t).then(()=>{
var t=this.AvastWRC.bal.storage.get("trackers")
t&&(this.trackers.set(t),this.AvastWRC.bal.storage.delete("trackers"))
var n=this.AvastWRC.bal.storage.get("whiteList")
n&&(this.whiteList.set(n),this.AvastWRC.bal.storage.delete("whiteList"))
let i=this.trackers.get()
this.trackersByCategory=this.trackersToCategories(i)
var a=this.AvastWRC.bal.settings.get(),o=this.blockList.get()
void 0===o.categories&&(o.categories={}),o.categories.Others=a.features.dntOthers,
o.categories.WebAnalytics=a.features.dntWebAnalytics,
o.categories.AdTracking=a.features.dntAdTracking,
o.categories.Social=a.features.dntSocial,
void 0===o.trackers&&(o.trackers={})
var r=this.whiteList.get()
if(r&&r.trk){
for(let e in r.trk){
for(let t in r.trk[e]){
r.trk[e][t]&&(o.trackers[t]=!0)
}
}
for(let e in r){
"trk"!==e&&delete r[e]
}
r=null,this.whiteList.set(r)
}
this.blockList.set(o)
let s=this.trackers.get()
s&&0!==Object.keys(s).length?this.updateDetectionRules(s):this.reloadLocalDntRules(),
e()
})
})
}
reloadLocalDntRules(){
this.trackers.set({}),this.addDNTrules(ii)
}
registerModuleListeners(e){
e.on("request.dnt_enable",e=>{
e||this.bal.emitEvent("request.dnt.block",null)
var t=this.AvastWRC.bal.settings.get()
t.features.dnt=e,this.AvastWRC.bal.settings.set(t)
}),e.on("request.dntWhitelist",(e,t,n,i)=>{
let a=this.blockList.get()
if(e){
if(a.categories[e]=i,!i){
let t=this.trackersByCategory[e]
for(let e in t){
let n=t[e]
!0===a.trackers[n]&&delete a.trackers[n]
}
}
}else{
let e=t
Array.isArray(e)||(e=[t])
for(let t in e){
let n=e[t]
i?a.trackers[n]=!0:delete a.trackers[n]
}
}
this.blockList.set(a),this.setDntFeatures(!0,!1,a.categories),this.bal.emitEvent("dnt.changed")
}),
e.on("request.dnt.activate",()=>{
let e=this.blockList.get()
for(let t in this.trkrType){
e.categories[this.trkrType[t]]=!0
}
e.trackers={},this.blockList.set(e),this.setDntFeatures(!0,!0,e.categories),this.bal.emitEvent("dnt.changed")
}),
e.on("request.dnt.block",()=>{
let e=this.blockList.get()
for(let t in this.trkrType){
e.categories[this.trkrType[t]]=!1
}
this.blockList.set(e),this.setDntFeatures(!0,!1,e.categories),this.bal.emitEvent("dnt.changed")
}),
e.on("shepherd.updated",e=>{
e&&e.DNT&&this.addDNTrules(e.DNT.trackers)
})
}
getCategory(e){
switch(e){
case 0:
return"Others"
case 1:
return"WebAnalytics"
case 2:
return"Others"
case 3:
case 4:
case 5:
return"AdTracking"
case 11:
case 12:
case 13:
return"Social"
default:
return"Others"
}
}
addDNTrules(e){
if(!e){
return
}
let t=this.trackers.get()||{}
for(let n=0;n<e.length;n+=1){
let i=e[n]
i.name?(i.category=this.getCategory(i.category),t[i.id]=i):delete t[i.id]
}
this.trackers.set(t),this.updateDetectionRules(t),this.trackersByCategory=this.trackersToCategories(t)
}
trackersToCategories(e){
let t={}
for(let n in e){
let i=e[n],a=i.category
t[a]||(t[a]=[]),t[a].push(i.id)
}
return t
}
updateDetectionRules(e){
var t={},n=[]
Me(e,e=>{
if(e&&e.name){
var i=e.domains
i&&i.length>0?Ge(i,(function(n){
var i=t[n]
i||(i={
domainTracker:null,
patternTrackers:[]
},t[n]=i),e.pattern&&e.pattern.length>0?i.patternTrackers.push(e):i.domainTracker=e
})):e.pattern&&e.pattern.length>0&&n.push(e),
-1===this.trkrType.indexOf(e.category)&&this.trkrType.push(e.category)
}
}),this.domainTrackers=t,this.patternTrackers=n
}
initTab(e){
var t={}
for(var n in this.trkrType){
t[this.trkrType[n]]=[]
}
this.AvastWRC.TabReqCache.set(e,"dntTrackers",t),this.AvastWRC.bal.emitEvent("badgeInfoUpdated",e,null,this.computeTotal.bind(this))
}
updateAllTabs(){
this.AvastWRC.bs.getTabs(e=>{
for(let t=0;t<e.length;t+=1){
let n=e[t]
if(this.AvastWRC.bs.checkExtensionUrl(n.url)){
continue
}
let i=n.id,a=this.AvastWRC.bs.getHostInTab(i)
this.AvastWRC.bal.emitEvent("badgeInfoUpdated",i,a,this.computeTotal.bind(this))
}
})
}
getTab(e){
return this.AvastWRC.TabReqCache.get(e,"dntTrackers")||this.initTab(e),
this.AvastWRC.TabReqCache.get(e,"dntTrackers")
}
resetAllTabs(){
let e=this.AvastWRC.TabReqCache.tabIds()
for(let t=0;t<e.length;t+=1){
this.initTab(e[t])
}
}
callRegExp(e,t){
return RegExp(e.pattern).test(t)
}
isTracking(e,t,n){
var i=!1,a="object"==typeof n?n.id:n
e=e.toLowerCase()
var o=this.AvastWRC.bal.getHostFromUrl(e)
if(o&&o!==t){
var r=null,s=this.domainTrackers[this.AvastWRC.bal.getDomainFromHost(o)]
if(s&&((r=ei(s.patternTrackers,t=>this.callRegExp(t,e)))||(r=s.domainTracker)),r||(r=ei(this.patternTrackers,t=>this.callRegExp(t,e))),
r){
let e=this.getTab(a)
e&&!e[r.category].includes(r.id)&&(e[r.category].push(r.id),this.AvastWRC.bal.emitEvent("badgeInfoUpdated",n,t,this.computeTotal.bind(this)),
this.AvastWRC.bal.emitEvent("message.panelAction",{
data:{
type:"panelUpdate"
}
},{
id:n
})),i=this.isBlocked(t,r.id,r.category)
}
}
return i
}
getUIData(e,t){
let n=this.getTab(e),i=this.trackers.get(),a=this.blockList.get(),o=this.AvastWRC.bal.settings.get().features,r=o.dntAutoBlock
t||(t=""),t=t.replace("www.","")
let s=[],u=this.trkrType,l={
actives:0,
total:0
}
for(let e=0;e<u.length;e+=1){
let r=u[e],c=0,p=[]
for(let e=0;e<n[r].length;e+=1){
let o=n[r][e],s=this.isBlocked(t,o,r)
s&&(c+=1),p.push({
id:o,
name:i[o].name,
active:s||a.categories[r],
disabled:a.categories[r],
type:r
})
}
let m=n[r].length,d=0,h=0,g=this.trackersByCategory[r]
for(let e in g){
let t=g[e]
h+=1,a.trackers[t]&&(d+=1)
}
s.push({
type:r,
type_desc_key:"dnt"+r+"Networks",
activeTrackers:c,
active:a.categories[r],
totalTrackers:m,
trackers:p,
featureEnabled:o["dnt"+r],
allAllowed:!a.categories[r]&&0===d&&h>0,
allBlocked:(a.categories[r]||d===h)&&h>0,
someBlocked:!a.categories[r]&&d>0&&d<h
}),l.actives+=c,l.total+=m
}
return{
tabId:e,
host:t,
enabled:o.dnt,
active:r,
stat:l,
groups:ni(s)
}
}
computeTotal(e,t){
const n=this.AvastWRC.DEFAULTS.RATING_COLOR[this.AvastWRC.DEFAULTS.BRAND]
if(-1==e||!t){
return{
text:"0",
color:n[0]
}
}
let i=this.getTab(e),a=this.trkrType,o=0,r=0
for(let e=0;e<a.length;e+=1){
let n=a[e]
o+=i[n].length
for(let e=0;e<i[n].length;e+=1){
let a=i[n][e]
this.isBlocked(t,a,n)||(r+=1)
}
}
let s=n[0]
return o>0&&(s=0===r?n[1]:r<o?n[2]:n[3]),{
text:o.toString(),
color:s
}
}
}
class oi{
constructor(e){
this.AvastWRC=e
}
registerModuleListeners(e){
e.on("message.checkLinks",this.onCheckLinks.bind(this))
}
onCheckLinks(e,t){
const n=e.urls,i=[],a=this._getSerpRules(t.url)
if(a.urlExtractor){
for(let e=0;e<n.length;e++){
let t=n[e],o=decodeURIComponent(t).match(a.urlExtractor)
if(null!=o&&o.length>1){
let t=o[1]
void 0===i[t]&&(i[t]=[]),i[t].push(n[e]),n[e]=t
}
}
}
this.AvastWRC.get(n,e=>{
for(let t=0;t<e.length;t++){
if(i[e[t].url]){
let n=i[e[t].url].shift()
n&&(e[t].url=n)
}
}
this.AvastWRC.bs.messageTab(t,{
message:"checkLinksResult",
data:{
result:e.map((function(e){
return{
url:e.url,
rating:e.getRatingCategory()
}
})),
showPopup:this.AvastWRC.CONFIG.ENABLE_SERP_POPUP,
rules:a
}
})
})
}
_getStyle(e){
return[["wrcx",0],["wrc0",0],["wrc1",1],["wrc2",2],["wrc3",3]].map(t=>e.style.replace(/WRCN/g,t[0])).join("\n")
}
_getContainer(e){
return e.container
}
_getSerpRules(e){
if(!this.AvastWRC.Shepherd){
return!1
}
let t=this.AvastWRC.Shepherd.getSerpRule(e)
return!(!t||0===Object.keys(t).length)&&t
}
checkSearch(e){
if(!this.AvastWRC.CONFIG.URL_CONSENT){
return
}
let t=this._getSerpRules(e.url)
if(!t){
return
}
let n=this._getStyle(t),i=this._getContainer(t)
this.AvastWRC.bs.messageTab(e,{
message:"parseLinks",
data:{
style:n,
container:i,
serpRules:t
}
})
}
}
class ri{
constructor(e,t){
this.AvastWRC=e,this.sender=t,this.options={},this.score=-1,this.isBadgeAnimating=!1,
this.uiData={
isOn:!1,
styleEnum:Object.freeze({
topCard:1,
bottomCard:2,
none:100
}),
style:-1
}
}
getUiData(){
return this.uiData
}
getNpsStorage(){
return this.AvastWRC.getStorageAsync("nps")
}
setNpsStorage(e){
this.AvastWRC.setStorage("nps",e)
}
_init({animateBadge:e,isOn:t,msIntervalFromInstall:n}){
t?this.getNpsStorage().then(t=>{
const n=Date.now()
n>t.nextShow?(n>t.animateBadge&&e&&(this.isBadgeAnimating=!0,this.AvastWRC.bal.emitEvent("control.animateBadge")),
this.uiData.isOn=!0,
this.uiData.style=t.style===this.uiData.styleEnum.none?this.uiData.styleEnum.topCard:t.style):this.uiData.isOn=!1
}).catch(this._setDefaultNpsStorage.bind(this,n)):this.uiData.isOn=!1
}
_setDefaultNpsStorage(e){
const t=1*new Date(this.AvastWRC.CONFIG.INSTALL_DATE)
let n
n=Date.now()-e<t?t+e:this.getNearestAnniversary(),this.setNpsStorage({
animateBadge:n,
lastSend:null,
nextShow:n,
style:this.uiData.styleEnum.topCard
})
}
initFromShep(e){
this.options={
animateBadge:!e.hasOwnProperty("animateBadge")||e.animateBadge,
isOn:!e.hasOwnProperty("isOn")||e.isOn,
msIntervalFromInstall:e.hasOwnProperty("intervalFromInstall")?864e5*e.intervalFromInstall:5184e6,
msSendingInterval:e.hasOwnProperty("sendingInterval")?864e5*e.sendingInterval:31536e6
},
this._init(this.options)
}
openNps(){
const e=this.uiData.style===this.uiData.styleEnum.topCard?"top":"bottom"
this.AvastWRC.bal.emitEvent("track.nps.cardClick",e),this.AvastWRC.bs.openNpsPage(),
this.setBottomStyle()
}
setBottomStyle(){
this.uiData.style=this.uiData.styleEnum.bottomCard,this.getNpsStorage().then(e=>{
e.style=this.uiData.style,
this.setNpsStorage(e)
})
}
closeCard(){
this.uiData.style=this.uiData.styleEnum.none,this.getNpsStorage().then(e=>{
const t=Date.now()+this.options.msSendingInterval
e.style=this.uiData.style,e.nextShow=t,e.animateBadge=t,this.setNpsStorage(e)
})
}
sendScore(e={}){
this.getNpsStorage().then(t=>{
const n=Date.now(),i=n>t.nextShow
if(this.closeCard(),i&&e.score>=0&&e.score<=10){
const i=n+this.options.msSendingInterval
this.sender.npsScore(e.score),this.score=e.score,t.lastSend=n,t.nextShow=i,t.animateBadge=i,
this.setNpsStorage(t)
}
})
}
sendFeedback(e={}){
this.getNpsStorage().then(t=>{
e.feedbackText&&this.sender.npsFeedback(this.score,e.feedbackText)
})
}
uiOpened(){
this.isBadgeAnimating&&(this.isBadgeAnimating=!1,this.getNpsStorage().then(e=>{
e.animateBadge=864e13,
this.AvastWRC.bal.emitEvent("control.stopAnimateBadge"),this.setNpsStorage(e)
}))
}
getNearestAnniversary(){
const e=new Date(this.AvastWRC.CONFIG.INSTALL_DATE),t=new Date
do{
e.setFullYear(e.getFullYear()+1)
}while(t>e)
return 1*e
}
registerModuleListeners(e){
e.on("shepherd.updated",e=>{
const t=e&&e.NPS||{}
this.initFromShep(t)
}),e.on("nps.takeSurveyNow",this.openNps.bind(this)),e.on("nps.takeSurveyLater",()=>{
this.AvastWRC.bal.emitEvent("track.nps.cardClick","later"),
this.setBottomStyle()
}),e.on("nps.close",()=>{
this.AvastWRC.bal.emitEvent("track.nps.cardClick","close"),
this.closeCard()
}),e.on("message.npsScore",this.sendScore.bind(this)),e.on("message.npsFeedback",this.sendFeedback.bind(this)),
e.on("message.sidebarShow",this.uiOpened.bind(this))
}
_log(){
this.getNpsStorage().then(e=>{})
}
}
var si=function(e,t){
return e&&z(t,we(t),e)
}
var ui=function(e,t){
return e&&z(t,Ve(t),e)
},li=n(16)
var ci=function(e,t){
var n=-1,i=e.length
for(t||(t=Array(i));++n<i;){
t[n]=e[n]
}
return t
}
var pi=function(e,t){
return z(e,Yt(e),t)
},mi=be(Object.getPrototypeOf,Object),di=Object.getOwnPropertySymbols?function(e){
for(var t=[];e;){
Vt(t,Yt(e)),e=mi(e)
}
return t
}:qt
var hi=function(e,t){
return z(e,di(e),t)
}
var gi=function(e){
return Mt(e,Ve,di)
},fi=Object.prototype.hasOwnProperty
var bi=function(e){
var t=e.length,n=new e.constructor(t)
return t&&"string"==typeof e[0]&&fi.call(e,"index")&&(n.index=e.index,n.input=e.input),
n
}
var yi=function(e){
var t=new e.constructor(e.byteLength)
return new Lt(t).set(new Lt(e)),t
}
var ki=function(e,t){
var n=t?yi(e.buffer):e.buffer
return new e.constructor(n,e.byteOffset,e.byteLength)
},vi=/\w*$/
var wi=function(e){
var t=new e.constructor(e.source,vi.exec(e))
return t.lastIndex=e.lastIndex,t
},ji=a?a.prototype:void 0,Ei=ji?ji.valueOf:void 0
var Ai=function(e){
return Ei?Object(Ei.call(e)):{}
}
var Si=function(e,t){
var n=t?yi(e.buffer):e.buffer
return new e.constructor(n,e.byteOffset,e.length)
}
var Oi=function(e,t,n){
var i=e.constructor
switch(t){
case"[object ArrayBuffer]":
return yi(e)
case"[object Boolean]":
case"[object Date]":
return new i(+e)
case"[object DataView]":
return ki(e,n)
case"[object Float32Array]":
case"[object Float64Array]":
case"[object Int8Array]":
case"[object Int16Array]":
case"[object Int32Array]":
case"[object Uint8Array]":
case"[object Uint8ClampedArray]":
case"[object Uint16Array]":
case"[object Uint32Array]":
return Si(e,n)
case"[object Map]":
return new i
case"[object Number]":
case"[object String]":
return new i(e)
case"[object RegExp]":
return wi(e)
case"[object Set]":
return new i
case"[object Symbol]":
return Ai(e)
}
},_i=Object.create,Ti=function(){
function e(){}
return function(t){
if(!h(t)){
return{}
}
if(_i){
return _i(t)
}
e.prototype=t
var n=new e
return e.prototype=void 0,n
}
}()
var Ii=function(e){
return"function"!=typeof e.constructor||Q(e)?{}:Ti(mi(e))
}
var Ri=function(e){
return te(e)&&"[object Map]"==un(e)
},Ci=me.a&&me.a.isMap,xi=Ci?pe(Ci):Ri
var Ni=function(e){
return te(e)&&"[object Set]"==un(e)
},Pi=me.a&&me.a.isSet,Li=Pi?pe(Pi):Ni,zi={}
zi["[object Arguments]"]=zi["[object Array]"]=zi["[object ArrayBuffer]"]=zi["[object DataView]"]=zi["[object Boolean]"]=zi["[object Date]"]=zi["[object Float32Array]"]=zi["[object Float64Array]"]=zi["[object Int8Array]"]=zi["[object Int16Array]"]=zi["[object Int32Array]"]=zi["[object Map]"]=zi["[object Number]"]=zi["[object Object]"]=zi["[object RegExp]"]=zi["[object Set]"]=zi["[object String]"]=zi["[object Symbol]"]=zi["[object Uint8Array]"]=zi["[object Uint8ClampedArray]"]=zi["[object Uint16Array]"]=zi["[object Uint32Array]"]=!0,
zi["[object Error]"]=zi["[object Function]"]=zi["[object WeakMap]"]=!1
var Di=function e(t,n,i,a,o,r){
var s,u=1&n,l=2&n,c=4&n
if(i&&(s=o?i(t,a,o,r):i(t)),void 0!==s){
return s
}
if(!h(t)){
return t
}
var p=se(t)
if(p){
if(s=bi(t),!u){
return ci(t,s)
}
}else{
var m=un(t),d="[object Function]"==m||"[object GeneratorFunction]"==m
if(Object(ue.a)(t)){
return Object(li.a)(t,u)
}
if("[object Object]"==m||"[object Arguments]"==m||d&&!o){
if(s=l||d?{}:Ii(t),!u){
return l?hi(t,ui(s,t)):pi(t,si(s,t))
}
}else{
if(!zi[m]){
return o?t:{}
}
s=Oi(t,m,u)
}
}
r||(r=new _t)
var g=r.get(t)
if(g){
return g
}
r.set(t,s),Li(t)?t.forEach((function(a){
s.add(e(a,n,i,a,t,r))
})):xi(t)&&t.forEach((function(a,o){
s.set(o,e(a,n,i,o,t,r))
}))
var f=c?l?gi:Kt:l?keysIn:we,b=p?void 0:f(t)
return Fe(b||t,(function(a,o){
b&&(a=t[o=a]),L(s,o,e(a,n,i,o,t,r))
})),s
}
var Bi=function(e){
return Di(e,5)
}
var Ui=X((function(e,t){
z(t,Ve(t),e)
}))
class Wi{
constructor(e){
this.AvastWRC=e,this.options={},this.request=null,this.headers={}
}
init(){
this.headers=Ui({},this.AvastWRC.Query.CONST.HEADERS,this.headers),this.message(),
this.options.go&&this.post()
}
set(e,t){
return this.options[e]=t,this
}
get(e){
return this.options[e]
}
post(){
if(-1!==this.options.server.indexOf(":null")){
return this
}
var e=this.getBuffer(this.request),t=this,n=new XMLHttpRequest
for(var i in n.open(this.options.method.toUpperCase(),this.options.server,!0),n.responseType="arraybuffer",
n.withCredentials=!0,
n.timeout=this.options.timeout||0,this.headers){
n.setRequestHeader(i,this.headers[i])
}
return n.onload=function(e){
var i=0
if(void 0!==e.srcElement?i=e.srcElement.status:void 0!==e.target&&(i=e.target.status),
403===i&&t.error(n),
400===i){
String.fromCharCode.apply(String,new Uint8Array(n.response))
}
t.callback(n.response)
},n.onerror=function(){
t.error(n)
},n.ontimeout=function(){
t.error(n)
},n.send(e),this
}
message(){}
getBuffer(e){}
callback(e){}
error(e){
this.options.error&&this.options.error(e)
}
encodeUTF8(e){
let t,n,i,a,o,r=e.length,s=[]
for(let u=0;u<r;u++){
t=e.charCodeAt(u),0==(65408&t)?s.push(t):(55296==(64512&t)&&(n=e.charCodeAt(u+1),
56320==(64512&n)&&(t=65536+((1023&t)<<10|1023&n),
u++)),i=255&t,a=65280&t,o=16711680&t,
t<=2047?(s.push(192|a>>6|i>>6),s.push(128|63&i)):t<=65535?(s.push(224|a>>12),
s.push(128|a>>6&63|i>>6),
s.push(128|63&i)):t<=1114111?(s.push(240|o>>18),s.push(128|o>>12&63|a>>12),
s.push(128|a>>6&63|i>>6),
s.push(128|63&i)):s.push("?".charCodeAt(0)))
}
return s
}
decodeUTF8(e){
if(!e){
return""
}
let t,n,i,a,o=e.length,r=""
for(let s=0;s<o;s++){
if(t=e[s],0==(128&t)){}else if(240==(248&t)){
if(n=e[s+1],i=e[s+2],a=e[s+3],128!=(192&n)||128!=(192&i)||128!=(192&a)){
continue
}
t=(7&t)<<18|(63&n)<<12|(63&i)<<6|63&a,s+=3
}else if(224==(240&t)){
if(n=e[s+1],i=e[s+2],128!=(192&n)||128!=(192&i)){
continue
}
t=(15&t)<<12|(63&n)<<6|63&i,s+=2
}else{
if(192!=(224&t)){
continue
}
if(n=e[s+1],128!=(192&n)){
continue
}
t=(31&t)<<6|63&n,s+=1
}
t<=65535?r+=String.fromCharCode(t):t>65535&&t<=1114111&&(t-=65536,r+=String.fromCharCode(55296|t>>10)+String.fromCharCode(56320|1023&t))
}
return r
}
}
class Vi extends Wi{
constructor(e,t){
super(e),this.options=Ui({
url:null,
type:"GET_PROPERTIES",
property:"",
value:"",
server:"http://localhost:"+this.AvastWRC.Query.CONST.LOCAL_PORT+"/command",
method:"post",
callback:()=>{},
timeout:0,
go:!0
},t),this.AvastWRC.Query.CONST.LOCAL_TOKEN&&(this.headers=Ui({
"X-AVAST-APP-ID":this.AvastWRC.Query.CONST.LOCAL_TOKEN
},this.headers)),this.AvastWRC.Utils.getBrowserInfo().isEdge()&&(this.options.timeout=1),
this.request=null,
this.response=null,this.proto=this.AvastWRC.proto.AV,this.init()
}
getBuffer(e){
return this.proto.LocalServerCommandRequest.encode(e).finish()
}
callback(e){
const t=this.proto.LocalServerCommandResponse.decode(new Uint8Array(e)),n={
result:[],
error:this.decodeUTF8(t.error)
}
for(let e=0;e<t.result.length;e+=1){
n.result.push(this.decodeUTF8(t.result[e]))
}
this.options.callback(n),this.completed=!0
}
fixPropertyName(e){
return e.startsWith("avcfg://")||e.startsWith("avprop://")||(e="avcfg://settings/Common/"+e),
e
}
message(){
const e=this.proto,t=this.AvastWRC.Utils.getBrowserInfo()
let n
switch(this.request=e.LocalServerCommandRequest.create(),this.request.type=e.CommandType[this.options.type],
this.request.browser=e.BrowserType[t.getBrowser()],
this.options.type){
case"ACKNOWLEDGEMENT":
this.request.params.push(this.encodeUTF8(this.AvastWRC.CONFIG.VERSION))
break
case"GET_PROPERTY":
n=this.fixPropertyName(this.options.property),this.request.params.push(this.encodeUTF8(n))
break
case"SET_PROPERTY":
n=this.fixPropertyName(this.options.property),this.request.params.push(this.encodeUTF8(n)),
this.request.params.push(this.encodeUTF8(this.options.value))
break
case"GET_PROPERTIES":
for(let e=0;e<this.options.params.length;e+=1){
n=this.fixPropertyName(this.options.params[e]),
this.request.params.push(this.encodeUTF8(n))
}
break
case"SET_PROPERTIES":
for(let e=0;e<this.options.params.length;e+=1){
n=this.fixPropertyName(this.options.params[e]),
this.request.params.push(this.encodeUTF8(n+"="+this.options.values[e]))
}
break
case"IS_BANKING_SITE":
case"IS_SAFEZONE_CUSTOM_SITE":
case"SITECORRECT":
case"SWITCH_TO_SAFEZONE":
this.request.params.push(this.encodeUTF8(this.options.value))
}
return this
}
}
class Mi extends Wi{
constructor(e,t){
super(e),this.AvastWRC.CONFIG.URL_CONSENT&&(this.options=Object.assign({
urls:null,
server:this.AvastWRC.Query.CONST.SERVER+":"+this.AvastWRC.Query.CONST.PORT+"/"+this.AvastWRC.Query.CONST.URLINFO_V5,
method:"post",
callback:()=>{},
go:!0
},t),this.request=null,this.response=null,this.proto=this.AvastWRC.proto.UrlInfo,
this.init())
}
getBuffer(e){
return this.proto.UrlInfoRequest.encode(e).finish()
}
callback(e){
const t=this.proto.UrlInfoResponse.decode(new Uint8Array(e)),n=1===t.urlInfo.length,i=[]
for(let e=0;e<t.urlInfo.length;e+=1){
i.push(new this.AvastWRC.WRCUrlInfo(this.AvastWRC,this.options.urls[e],t.urlInfo[e],!n))
}
this.options.callback(i)
}
messageClientMinimal(){
const e=this.proto.Client.create()
return e.browserExtInfo=this.proto.BrowserExtInfo.create(),e.browserExtInfo.extensionVersion=this.AvastWRC.CONFIG.EXT_VER,
e
}
message(){
return this.request=this.proto.UrlInfoRequest.create(),this.request.callerId=this.AvastWRC.CONFIG.CALLERID,
this.request.dnl=!0,
this.request.client=this.messageClientMinimal(),this.options.urls.forEach(e=>this.request.uri.push(e)),
this
}
}
const Fi=n(7)
class qi{
constructor(e){
this.execute=e
}
enable(){
return this.execute("browserAction","enable",...arguments)
}
disable(){
return this.execute("browserAction","disable",...arguments)
}
setTitle(){
return this.execute("browserAction","setTitle",...arguments)
}
setIcon(){
return this.execute("browserAction","setIcon",...arguments)
}
setBadgeText(){
return this.execute("browserAction","setBadgeText",...arguments)
}
setBadgeTextColor(){
return this.execute("browserAction","setBadgeTextColor",...arguments)
}
setBadgeBackgroundColor(){
return this.execute("browserAction","setBadgeBackgroundColor",...arguments)
}
get onClicked(){
return{
addListener:this.execute.bind(this,"browserAction.onClicked","addListener"),
hasListener:this.execute.bind(this,"browserAction.onClicked","hasListener"),
removeListener:this.execute.bind(this,"browserAction.onClicked","removeListener")
}
}
}
class Gi{
constructor(e){
this.execute=e
}
getURL(){
return this.execute("extension","getURL",...arguments)
}
}
class Hi{
constructor(e){
this.execute=e
}
get lastError(){
return this.execute("runtime","lastError")
}
get onInstalled(){
return{
addListener:this.execute.bind(this,"runtime.onInstalled","addListener"),
hasListener:this.execute.bind(this,"runtime.onInstalled","hasListener"),
removeListener:this.execute.bind(this,"runtime.onInstalled","removeListener")
}
}
get onMessage(){
return{
addListener:this.execute.bind(this,"runtime.onMessage","addListener"),
hasListener:this.execute.bind(this,"runtime.onMessage","hasListener"),
removeListener:this.execute.bind(this,"runtime.onMessage","removeListener")
}
}
sendMessage(){
return this.execute("runtime","sendMessage",...arguments)
}
setUninstallURL(){
return this.execute("runtime","setUninstallURL",...arguments)
}
getManifest(){
return this.execute("runtime","getManifest",...arguments)
}
}
class Yi{
constructor(e){
this.execute=e
}
getUILanguage(){
return this.execute("i18n","getUILanguage")
}
getMessage(){
return this.execute("i18n","getMessage",...arguments)
}
}
class Ki{
constructor(e){
this.execute=e
}
get local(){
return{
get:this.execute.bind(this,"storage.local","get"),
set:this.execute.bind(this,"storage.local","set"),
remove:this.execute.bind(this,"storage.local","remove"),
clear:this.execute.bind(this,"storage.local","clear"),
getBytesInUse:this.execute.bind(this,"storage.local","getBytesInUse")
}
}
}
class Ji{
constructor(e){
this.execute=e
}
sendMessage(){
return this.execute("tabs","sendMessage",...arguments)
}
create(){
return this.execute("tabs","create",...arguments)
}
get(){
return this.execute("tabs","get",...arguments)
}
query(){
return this.execute("tabs","query",...arguments)
}
remove(){
return this.execute("tabs","remove",...arguments)
}
update(){
return this.execute("tabs","update",...arguments)
}
get onActivated(){
return{
addListener:this.execute.bind(this,"tabs.onActivated","addListener"),
hasListener:this.execute.bind(this,"tabs.onActivated","hasListener"),
removeListener:this.execute.bind(this,"tabs.onActivated","removeListener")
}
}
get onUpdated(){
return{
addListener:this.execute.bind(this,"tabs.onUpdated","addListener"),
hasListener:this.execute.bind(this,"tabs.onUpdated","hasListener"),
removeListener:this.execute.bind(this,"tabs.onUpdated","removeListener")
}
}
get onCreated(){
return{
addListener:this.execute.bind(this,"tabs.onCreated","addListener"),
hasListener:this.execute.bind(this,"tabs.onCreated","hasListener"),
removeListener:this.execute.bind(this,"tabs.onCreated","removeListener")
}
}
get onRemoved(){
return{
addListener:this.execute.bind(this,"tabs.onRemoved","addListener"),
hasListener:this.execute.bind(this,"tabs.onRemoved","hasListener"),
removeListener:this.execute.bind(this,"tabs.onRemoved","removeListener")
}
}
}
class Zi{
constructor(e){
this.execute=e
}
get onCommitted(){
return{
addListener:this.execute.bind(this,"webNavigation.onCommitted","addListener"),
hasListener:this.execute.bind(this,"webNavigation.onCommitted","hasListener"),
removeListener:this.execute.bind(this,"webNavigation.onCommitted","removeListener")
}
}
get onHistoryStateUpdated(){
return{
addListener:this.execute.bind(this,"webNavigation.onHistoryStateUpdated","addListener"),
hasListener:this.execute.bind(this,"webNavigation.onHistoryStateUpdated","hasListener"),
removeListener:this.execute.bind(this,"webNavigation.onHistoryStateUpdated","removeListener")
}
}
get onReferenceFragmentUpdated(){
return{
addListener:this.execute.bind(this,"webNavigation.onReferenceFragmentUpdated","addListener"),
hasListener:this.execute.bind(this,"webNavigation.onReferenceFragmentUpdated","hasListener"),
removeListener:this.execute.bind(this,"webNavigation.onReferenceFragmentUpdated","removeListener")
}
}
get onBeforeNavigate(){
return{
addListener:this.execute.bind(this,"webNavigation.onBeforeNavigate","addListener"),
hasListener:this.execute.bind(this,"webNavigation.onBeforeNavigate","hasListener"),
removeListener:this.execute.bind(this,"webNavigation.onBeforeNavigate","removeListener")
}
}
get onDOMContentLoaded(){
return{
addListener:this.execute.bind(this,"webNavigation.onDOMContentLoaded","addListener"),
hasListener:this.execute.bind(this,"webNavigation.onDOMContentLoaded","hasListener"),
removeListener:this.execute.bind(this,"webNavigation.onDOMContentLoaded","removeListener")
}
}
get onCompleted(){
return{
addListener:this.execute.bind(this,"webNavigation.onCompleted","addListener"),
hasListener:this.execute.bind(this,"webNavigation.onCompleted","hasListener"),
removeListener:this.execute.bind(this,"webNavigation.onCompleted","removeListener")
}
}
get onErrorOccurred(){
return{
addListener:this.execute.bind(this,"webNavigation.onErrorOccurred","addListener"),
hasListener:this.execute.bind(this,"webNavigation.onErrorOccurred","hasListener"),
removeListener:this.execute.bind(this,"webNavigation.onErrorOccurred","removeListener")
}
}
}
class Xi{
constructor(e){
this.execute=e
}
get onBeforeRequest(){
return{
addListener:this.execute.bind(this,"webRequest.onBeforeRequest","addListener"),
hasListener:this.execute.bind(this,"webRequest.onBeforeRequest","hasListener"),
removeListener:this.execute.bind(this,"webRequest.onBeforeRequest","removeListener")
}
}
get onBeforeRedirect(){
return{
addListener:this.execute.bind(this,"webRequest.onBeforeRedirect","addListener"),
hasListener:this.execute.bind(this,"webRequest.onBeforeRedirect","hasListener"),
removeListener:this.execute.bind(this,"webRequest.onBeforeRedirect","removeListener")
}
}
get onSendHeaders(){
return{
addListener:this.execute.bind(this,"webRequest.onSendHeaders","addListener"),
hasListener:this.execute.bind(this,"webRequest.onSendHeaders","hasListener"),
removeListener:this.execute.bind(this,"webRequest.onSendHeaders","removeListener")
}
}
get onHeadersReceived(){
return{
addListener:this.execute.bind(this,"webRequest.onHeadersReceived","addListener"),
hasListener:this.execute.bind(this,"webRequest.onHeadersReceived","hasListener"),
removeListener:this.execute.bind(this,"webRequest.onHeadersReceived","removeListener")
}
}
get onResponseStarted(){
return{
addListener:this.execute.bind(this,"webRequest.onResponseStarted","addListener"),
hasListener:this.execute.bind(this,"webRequest.onResponseStarted","hasListener"),
removeListener:this.execute.bind(this,"webRequest.onResponseStarted","removeListener")
}
}
get onCompleted(){
return{
addListener:this.execute.bind(this,"webRequest.onCompleted","addListener"),
hasListener:this.execute.bind(this,"webRequest.onCompleted","hasListener"),
removeListener:this.execute.bind(this,"webRequest.onCompleted","removeListener")
}
}
get onErrorOccurred(){
return{
addListener:this.execute.bind(this,"webRequest.onErrorOccurred","addListener"),
hasListener:this.execute.bind(this,"webRequest.onErrorOccurred","hasListener"),
removeListener:this.execute.bind(this,"webRequest.onErrorOccurred","removeListener")
}
}
}
class $i{
constructor(e,t){
this.AvastWRC=e,this.Api=this.AvastWRC.Api,this._bal=this.AvastWRC.bal,
this.panelbl=this.AvastWRC.panelbl,
this.tabId=t.tabId,this.url=t.url,this.host=e.bal.getHostFromUrl(t.url),
this.data={}
}
init(){
this.prepareData(),this.initPanel()
}
prepareData(){
this.data={
URL_CONSENT:this.AvastWRC.CONFIG.URL_CONSENT,
brandName:this.AvastWRC.DEFAULTS.BRAND_NAME,
isBeta:this.AvastWRC.DEFAULTS.IS_BETA,
uiAction:{
showVoteThanks:!1,
closeDetails:!1,
showDefault:!1
},
nps:{
isOn:!1
},
feedback:{},
settings:[],
web:{},
security:{},
vote:{},
privacy:{}
},this.prepareDataSettings(),this.prepareDataNps(),this.prepareDataWeb(),
this.prepareDataSecurity(),
this.prepareDataPrivacy(),this.prepareDataVote(),this.prepareDataFeedback()
}
prepareDataNps(){
const e=this.AvastWRC.bal.NPS.getUiData()
e.isOn?this.data.nps=Object.assign({},e):this.data.nps={
isOn:!1
}
}
prepareDataSettings(){
const e=this.AvastWRC.bal.settings.get().features,t=this.AvastWRC.Utils.getBrowserInfo(),n=t.isSafari(),i=t.isFirefox(),a="AVG"===this.AvastWRC.DEFAULTS.BRAND_NAME,o=this.AvastWRC.bal.secureBrowser.isAvailable&&this.AvastWRC.Query.CONST.LOCAL_PORT
this.data.settings=[{
categoryId:"security",
items:[{
id:"serp",
nls:"serp",
value:e.serp,
enabled:!0,
subitems:[{
id:"serpPopup",
nls:"serpPopup",
value:e.serpPopup,
enabled:e.serp
}]
},{
id:"secureBrowser",
nls:"secureBrowser."+this.AvastWRC.DEFAULTS.BRAND_NAME,
value:o&&e.secureBrowser,
enabled:o,
hide:n||a
}]
},{
categoryId:"privacy",
items:[{
id:"dntBadge",
nls:"dntBadge",
value:e.dntBadge,
enabled:!0,
hide:n
},{
id:"dntAutoBlock",
nls:"dntAutoBlock",
value:e.dntAutoBlock,
enabled:!0,
hide:n,
subitems:[{
id:"dntSocial",
nls:"dntSocial",
noTitle:!0,
value:e.dntSocial,
enabled:!e.dntAutoBlock,
hide:n
},{
id:"dntAdTracking",
nls:"dntAdTracking",
noTitle:!0,
value:e.dntAdTracking,
enabled:!e.dntAutoBlock,
hide:n
},{
id:"dntWebAnalytics",
nls:"dntWebAnalytics",
noTitle:!0,
value:e.dntWebAnalytics,
enabled:!e.dntAutoBlock,
hide:n
},{
id:"dntOthers",
nls:"dntOthers",
noTitle:!0,
value:e.dntOthers,
enabled:!e.dntAutoBlock,
hide:n
}]
},{
id:"productAnalysis",
nls:"productAnalysis",
noDesc:!0,
value:e.productAnalysis,
enabled:!0,
tooltip:i?"setting.productAnalysis.tooltip":null
}]
}]
}
prepareDataWeb(){
const e=this.AvastWRC.bal.DNT.getUIData(this.tabId,this.host)
this.data.web={
name:e.host
}
}
prepareDataSecurity(){
const e={
status:{
safe:!1,
bad:!1,
unsafe:!1,
unknown:!1
},
phishing:!1,
malware:!1,
safetyUrl:""
},t=this.url
if(this.AvastWRC.bs.checkExtensionUrl(this.url)){
const t=this.AvastWRC.bs.getMessageFromExtensionUrl(this.url)
let n=this.AvastWRC.bs.getDataFromExtensionUrl(this.url)
n&&"messagebox.html"===t&&("phishing"===n.type?(e.status.unsafe=!0,e.phishing=!0,
e.safetyUrl=n.safety_url):"malware"===n.type?(e.status.unsafe=!0,
e.malware=!0,e.safetyUrl=n.safety_url):e.status.unknown=!0)
}else{
const n=this.AvastWRC.Cache.get(t)
if(n&&n.values){
switch(n.getRatingCategory()){
case this.AvastWRC.RATING_NONE:
e.status.unknown=!0
break
case this.AvastWRC.RATING_GOOD:
e.status.safe=!0
break
case this.AvastWRC.RATING_AVERAGE:
e.status.bad=!0
break
case this.AvastWRC.RATING_BAD:
e.status.unsafe=!0
}
e.phishing=n.isPhishing(),e.malware=n.isMalware()
}else{
e.status.unknown=!0
}
e.safetyUrl=this.AvastWRC.bal.aos.getSafePageUrl()||this.AvastWRC.PHISHING_REDIRECT
}
this.data.security=e
}
prepareDataPrivacy(){
const e=this.AvastWRC.bal.DNT.getUIData(this.tabId,this.host),t={
status:{
on:e.stat.actives===e.stat.total,
some:e.stat.actives>0&&e.stat.actives<e.stat.total,
off:0===e.stat.actives&&e.stat.total>0
},
trackersFound:e.stat.total,
trackersBlocked:e.stat.actives,
autoBlock:e.active,
groups:[]
}
for(let n=0;n<e.groups.length;n+=1){
const i=e.groups[n],a=[]
for(let e=0;e<i.trackers.length;e+=1){
let t=i.trackers[e],n={
id:t.id,
name:t.name,
blocked:t.active
}
a.push(n)
}
const o={
id:i.type,
blocked:i.active,
status:{
on:i.activeTrackers===i.totalTrackers,
some:i.activeTrackers>0&&i.activeTrackers<i.totalTrackers,
off:0===i.activeTrackers&&i.totalTrackers>0
},
trackersFound:i.totalTrackers,
trackersBlocked:i.activeTrackers,
trackers:a
}
t.groups.push(o)
}
this.data.privacy=t
}
prepareDataVote(){
const e=this.AvastWRC.Voting.get(this.url),t={
status:{
unrated:!1,
trusted:!1,
untrusted:!1
},
showThanks:!1,
categories:[]
}
e===this.AvastWRC.DEFAULTS.VOTING.POSITIVE?t.status.trusted=!0:e===this.AvastWRC.DEFAULTS.VOTING.NEGATIVE?t.status.untrusted=!0:t.status.unrated=!0,
this.data.vote=t
}
prepareDataFeedback(){
if(!this.AvastWRC.CONFIG.FEEDBACK_URL){
return
}
let e="card"
this.AvastWRC.CONFIG.FEEDBACK_RESET<this.AvastWRC.CONFIG.FEEDBACK_CLICKED&&(e="link"),
this.data.feedback={
style:e
}
}
tabSendMessage(e){
this.AvastWRC.bs.messageTab({
id:this.tabId
},e)
}
messageHandler(e,t){
let n
switch(e){
case"panelOpening":
n=this.panelOpening()
break
case"panelClosing":
n=this.panelClosing()
break
case"panelUpdate":
n=!0
break
case"viewOpen":
n=this.viewOpen()
break
case"viewClose":
n=this.viewClose()
break
case"ratePositive":
n=this.ratePositive()
break
case"rateNegative":
n=this.rateNegative(t.categories)
break
case"rateRevert":
n=this.rateRevert()
break
case"trackerBlock":
n=this.trackerBlock(t.trackerId,t.trackerGroup,t.trackerName)
break
case"trackerUnblock":
n=this.trackerUnblock(t.trackerId,t.trackerGroup,t.trackerName)
break
case"trackerGroupBlock":
n=this.trackerGroupBlock(t.groupId)
break
case"trackerGroupUnblock":
n=this.trackerGroupUnblock(t.groupId)
break
case"settingFeatureSet":
n=this.AvastWRC.bal.settingFeatureSet(t.feature,t.value,t.trackCategory)
break
case"trackSettingsOpened":
n=this.trackSettingsOpened()
break
case"settingSave":
n=this.settingSave()
break
case"settingReset":
n=this.settingReset()
break
case"settingResetUndo":
n=this.settingResetUndo()
break
case"openFeedback":
n=this.openFeedback(t.style)
break
case"takeSurveyNow":
n=this.takeSurveyNow()
break
case"takeSurveyLater":
n=this.takeSurveyLater()
break
case"npsClose":
n=this.npsClose()
break
case"afterInstallAction":
this.AvastWRC.CONFIG.URL_CONSENT=t.urlConsent,localStorage.setItem("URL_CONSENT",""+t.urlConsent),
this.AvastWRC.bal.settingFeatureSet("urlConsent",t.urlConsent,t.clickSource),
!0===t.urlConsent&&this.AvastWRC.bal.emitEvent("control.setIcon",void 0,"common/ui/icons/icon-unknown.png")
}
void 0===n&&(n=!0),n&&(this.prepareData(),this.viewUpdate())
}
initPanel(){
this.tabSendMessage({
data:{
data:this.data,
isSafari:this.AvastWRC.Utils.getBrowserInfo().isSafari()
},
message:"initPanel"
})
}
panelOpening(){
return this.prepareData(),this.data.uiAction.showDefault=!0,this.viewUpdate(),
!1
}
panelClosing(){
return this.prepareData(),this.data.uiAction.closeDetails=!0,this.viewUpdate(),
!1
}
viewOpen(){
return this.tabSendMessage({
message:"openSidebar"
}),!1
}
viewClose(e){
return void 0===e&&(e=!1),this.tabSendMessage({
message:"closeSidebar",
data:{
immediately:e
}
}),!1
}
viewUpdate(){
this.tabSendMessage({
message:"updatePanel",
data:{
data:this.data
}
})
}
ratePositive(){
return this._bal.emitEvent("rated.positive",this.url),this.prepareData(),
this.data.uiAction.showVoteThanks=!0,
this.viewUpdate(),!1
}
rateNegative(){
return this._bal.emitEvent("rated.negative",this.url),this.prepareData(),
this.data.uiAction.showVoteThanks=!0,
this.viewUpdate(),!1
}
rateRevert(){
return this._bal.emitEvent("rated.remove",this.url),this.prepareData(),
this.viewUpdate(),
!1
}
trackSettingsOpened(){
return this._bal.emitEvent("track.settingsOpened"),!0
}
trackerBlock(e,t,n){
return this._bal.emitEvent("track.dntTracker",t,n,!0),this._bal.emitEvent("request.dntWhitelist",void 0,e,this.host,!0),
!0
}
trackerUnblock(e,t,n){
return this._bal.emitEvent("track.dntTracker",t,n,!1),this._bal.emitEvent("request.dntWhitelist",void 0,e,this.host,!1),
!0
}
trackerGroupBlock(e){
return this._bal.emitEvent("track.dntGroup",e,!0),this._bal.emitEvent("request.dntWhitelist",e,null,this.host,!0),
!0
}
trackerGroupUnblock(e){
return this._bal.emitEvent("track.dntGroup",e,!1),this._bal.emitEvent("request.dntWhitelist",e,null,this.host,!1),
!0
}
settingSave(){
return this.prepareData(),this.data.uiAction.showDefault=!0,this.viewUpdate(),
!1
}
settingReset(){
return this.AvastWRC.bal.settingReset(),!0
}
settingResetUndo(){
return this.AvastWRC.bal.settingResetUndo(),!0
}
openFeedback(e){
return this.AvastWRC.bal.openFeedback(e),!0
}
takeSurveyNow(){
return this._bal.emitEvent("nps.takeSurveyNow"),!0
}
takeSurveyLater(){
return this._bal.emitEvent("nps.takeSurveyLater"),!0
}
npsClose(){
return this._bal.emitEvent("nps.close"),!1
}
}
var Qi=n(17)
var ea=n(18),ta=n.n(ea),na=n(19),ia=n.n(na),aa=n(20),oa=n.n(aa)
const ra=n(7)
var sa=n(0)
const ua=sa.Reader,la=sa.Writer,ca=sa.util,pa=sa.roots.default||(sa.roots.default={}),ma=(pa.com=(()=>{
const e={}
return e.avast=function(){
const e={}
return e.cloud=function(){
const e={}
return e.webrep=function(){
const e={}
return e.proto=function(){
const e={}
return e.DomainInfoRequest=function(){
function e(e){
if(this.domain=[],e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.domain=ca.emptyArray,e.prototype.callerId=ca.Long?ca.Long.fromBits(0,0,!1):0,
e.prototype.apikey=ca.newBuffer([]),
e.prototype.identity=null,e.create=function(t){
return new e(t)
},e.encode=function(e,t){
if(t||(t=la.create()),null!=e.domain&&e.domain.length){
for(let n=0;n<e.domain.length;++n){
t.uint32(10).string(e.domain[n])
}
}
return null!=e.callerId&&e.hasOwnProperty("callerId")&&t.uint32(16).sint64(e.callerId),
null!=e.apikey&&e.hasOwnProperty("apikey")&&t.uint32(26).bytes(e.apikey),
null!=e.identity&&e.hasOwnProperty("identity")&&pa.com.avast.cloud.webrep.proto.AvastIdentity.encode(e.identity,t.uint32(34).fork()).ldelim(),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.DomainInfoRequest
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.domain&&i.domain.length||(i.domain=[]),i.domain.push(e.string())
break
case 2:
i.callerId=e.sint64()
break
case 3:
i.apikey=e.bytes()
break
case 4:
i.identity=pa.com.avast.cloud.webrep.proto.AvastIdentity.decode(e,e.uint32())
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.domain&&e.hasOwnProperty("domain")){
if(!Array.isArray(e.domain)){
return"domain: array expected"
}
for(let t=0;t<e.domain.length;++t){
if(!ca.isString(e.domain[t])){
return"domain: string[] expected"
}
}
}
if(null!=e.callerId&&e.hasOwnProperty("callerId")&&!(ca.isInteger(e.callerId)||e.callerId&&ca.isInteger(e.callerId.low)&&ca.isInteger(e.callerId.high))){
return"callerId: integer|Long expected"
}
if(null!=e.apikey&&e.hasOwnProperty("apikey")&&!(e.apikey&&"number"==typeof e.apikey.length||ca.isString(e.apikey))){
return"apikey: buffer expected"
}
if(null!=e.identity&&e.hasOwnProperty("identity")){
let t=pa.com.avast.cloud.webrep.proto.AvastIdentity.verify(e.identity)
if(t){
return"identity."+t
}
}
return null
},e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.DomainInfoRequest){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.DomainInfoRequest
if(e.domain){
if(!Array.isArray(e.domain)){
throw TypeError(".com.avast.cloud.webrep.proto.DomainInfoRequest.domain: array expected")
}
t.domain=[]
for(let n=0;n<e.domain.length;++n){
t.domain[n]=String(e.domain[n])
}
}
if(null!=e.callerId&&(ca.Long?(t.callerId=ca.Long.fromValue(e.callerId)).unsigned=!1:"string"==typeof e.callerId?t.callerId=parseInt(e.callerId,10):"number"==typeof e.callerId?t.callerId=e.callerId:"object"==typeof e.callerId&&(t.callerId=new ca.LongBits(e.callerId.low>>>0,e.callerId.high>>>0).toNumber())),
null!=e.apikey&&("string"==typeof e.apikey?ca.base64.decode(e.apikey,t.apikey=ca.newBuffer(ca.base64.length(e.apikey)),0):e.apikey.length&&(t.apikey=e.apikey)),
null!=e.identity){
if("object"!=typeof e.identity){
throw TypeError(".com.avast.cloud.webrep.proto.DomainInfoRequest.identity: object expected")
}
t.identity=pa.com.avast.cloud.webrep.proto.AvastIdentity.fromObject(e.identity)
}
return t
},e.toObject=function(e,t){
t||(t={})
let n={}
if((t.arrays||t.defaults)&&(n.domain=[]),t.defaults){
if(ca.Long){
let e=new ca.Long(0,0,!1)
n.callerId=t.longs===String?e.toString():t.longs===Number?e.toNumber():e
}else{
n.callerId=t.longs===String?"0":0
}
t.bytes===String?n.apikey="":(n.apikey=[],t.bytes!==Array&&(n.apikey=ca.newBuffer(n.apikey))),
n.identity=null
}
if(e.domain&&e.domain.length){
n.domain=[]
for(let t=0;t<e.domain.length;++t){
n.domain[t]=e.domain[t]
}
}
return null!=e.callerId&&e.hasOwnProperty("callerId")&&("number"==typeof e.callerId?n.callerId=t.longs===String?String(e.callerId):e.callerId:n.callerId=t.longs===String?ca.Long.prototype.toString.call(e.callerId):t.longs===Number?new ca.LongBits(e.callerId.low>>>0,e.callerId.high>>>0).toNumber():e.callerId),
null!=e.apikey&&e.hasOwnProperty("apikey")&&(n.apikey=t.bytes===String?ca.base64.encode(e.apikey,0,e.apikey.length):t.bytes===Array?Array.prototype.slice.call(e.apikey):e.apikey),
null!=e.identity&&e.hasOwnProperty("identity")&&(n.identity=pa.com.avast.cloud.webrep.proto.AvastIdentity.toObject(e.identity,t)),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.DomainInfoResponse=function(){
function e(e){
if(this.domainInfo=[],e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.domainInfo=ca.emptyArray,e.create=function(t){
return new e(t)
},e.encode=function(e,t){
if(t||(t=la.create()),null!=e.domainInfo&&e.domainInfo.length){
for(let n=0;n<e.domainInfo.length;++n){
pa.com.avast.cloud.webrep.proto.DomainInfoResponse.DomainInfo.encode(e.domainInfo[n],t.uint32(10).fork()).ldelim()
}
}
return t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.DomainInfoResponse
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.domainInfo&&i.domainInfo.length||(i.domainInfo=[]),i.domainInfo.push(pa.com.avast.cloud.webrep.proto.DomainInfoResponse.DomainInfo.decode(e,e.uint32()))
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.domainInfo&&e.hasOwnProperty("domainInfo")){
if(!Array.isArray(e.domainInfo)){
return"domainInfo: array expected"
}
for(let t=0;t<e.domainInfo.length;++t){
let n=pa.com.avast.cloud.webrep.proto.DomainInfoResponse.DomainInfo.verify(e.domainInfo[t])
if(n){
return"domainInfo."+n
}
}
}
return null
},e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.DomainInfoResponse){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.DomainInfoResponse
if(e.domainInfo){
if(!Array.isArray(e.domainInfo)){
throw TypeError(".com.avast.cloud.webrep.proto.DomainInfoResponse.domainInfo: array expected")
}
t.domainInfo=[]
for(let n=0;n<e.domainInfo.length;++n){
if("object"!=typeof e.domainInfo[n]){
throw TypeError(".com.avast.cloud.webrep.proto.DomainInfoResponse.domainInfo: object expected")
}
t.domainInfo[n]=pa.com.avast.cloud.webrep.proto.DomainInfoResponse.DomainInfo.fromObject(e.domainInfo[n])
}
}
return t
},e.toObject=function(e,t){
t||(t={})
let n={}
if((t.arrays||t.defaults)&&(n.domainInfo=[]),e.domainInfo&&e.domainInfo.length){
n.domainInfo=[]
for(let i=0;i<e.domainInfo.length;++i){
n.domainInfo[i]=pa.com.avast.cloud.webrep.proto.DomainInfoResponse.DomainInfo.toObject(e.domainInfo[i],t)
}
}
return n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e.DomainInfo=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.domain="",e.prototype.clean=!1,e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.domain&&e.hasOwnProperty("domain")&&t.uint32(10).string(e.domain),
null!=e.clean&&e.hasOwnProperty("clean")&&t.uint32(16).bool(e.clean),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.DomainInfoResponse.DomainInfo
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.domain=e.string()
break
case 2:
i.clean=e.bool()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
return"object"!=typeof e||null===e?"object expected":null!=e.domain&&e.hasOwnProperty("domain")&&!ca.isString(e.domain)?"domain: string expected":null!=e.clean&&e.hasOwnProperty("clean")&&"boolean"!=typeof e.clean?"clean: boolean expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.DomainInfoResponse.DomainInfo){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.DomainInfoResponse.DomainInfo
return null!=e.domain&&(t.domain=String(e.domain)),null!=e.clean&&(t.clean=Boolean(e.clean)),
t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(n.domain="",n.clean=!1),null!=e.domain&&e.hasOwnProperty("domain")&&(n.domain=e.domain),
null!=e.clean&&e.hasOwnProperty("clean")&&(n.clean=e.clean),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e
}(),e.UrlInfoRequest=function(){
function e(e){
if(this.uri=[],this.customKeyValue=[],e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.uri=ca.emptyArray,e.prototype.callerId=ca.Long?ca.Long.fromBits(0,0,!1):0,
e.prototype.locale="",
e.prototype.apikey=ca.newBuffer([]),e.prototype.identity=null,
e.prototype.visited=!1,
e.prototype.updateRequest=null,e.prototype.requestedServices=0,
e.prototype.customKeyValue=ca.emptyArray,
e.prototype.referer="",e.prototype.windowNum=0,
e.prototype.tabNum=0,e.prototype.windowEvent=0,
e.prototype.origin=0,e.prototype.dnl=!1,
e.prototype.reserved=ca.newBuffer([]),e.prototype.safeShop=ca.Long?ca.Long.fromBits(0,0,!1):0,
e.prototype.client=null,
e.prototype.originHash=0,e.prototype.lastOrigin=null,e.prototype.clientTimestamp=ca.Long?ca.Long.fromBits(0,0,!1):0,
e.prototype.refererDetails=null,
e.prototype.initiating_user_action=0,e.prototype.served_from_cache=!1,
e.create=function(t){
return new e(t)
},e.encode=function(e,t){
if(t||(t=la.create()),null!=e.uri&&e.uri.length){
for(let n=0;n<e.uri.length;++n){
t.uint32(10).string(e.uri[n])
}
}
if(null!=e.callerId&&e.hasOwnProperty("callerId")&&t.uint32(16).sint64(e.callerId),
null!=e.locale&&e.hasOwnProperty("locale")&&t.uint32(26).string(e.locale),
null!=e.apikey&&e.hasOwnProperty("apikey")&&t.uint32(34).bytes(e.apikey),
null!=e.identity&&e.hasOwnProperty("identity")&&pa.com.avast.cloud.webrep.proto.Identity.encode(e.identity,t.uint32(42).fork()).ldelim(),
null!=e.visited&&e.hasOwnProperty("visited")&&t.uint32(48).bool(e.visited),
null!=e.updateRequest&&e.hasOwnProperty("updateRequest")&&pa.com.avast.cloud.webrep.proto.UpdateRequest.encode(e.updateRequest,t.uint32(58).fork()).ldelim(),
null!=e.requestedServices&&e.hasOwnProperty("requestedServices")&&t.uint32(64).sint32(e.requestedServices),
null!=e.customKeyValue&&e.customKeyValue.length){
for(let n=0;n<e.customKeyValue.length;++n){
pa.com.avast.cloud.webrep.proto.KeyValue.encode(e.customKeyValue[n],t.uint32(74).fork()).ldelim()
}
}
return null!=e.referer&&e.hasOwnProperty("referer")&&t.uint32(82).string(e.referer),
null!=e.windowNum&&e.hasOwnProperty("windowNum")&&t.uint32(88).sint32(e.windowNum),
null!=e.tabNum&&e.hasOwnProperty("tabNum")&&t.uint32(96).sint32(e.tabNum),
null!=e.windowEvent&&e.hasOwnProperty("windowEvent")&&t.uint32(104).int32(e.windowEvent),
null!=e.origin&&e.hasOwnProperty("origin")&&t.uint32(112).int32(e.origin),
null!=e.dnl&&e.hasOwnProperty("dnl")&&t.uint32(120).bool(e.dnl),
null!=e.reserved&&e.hasOwnProperty("reserved")&&t.uint32(130).bytes(e.reserved),
null!=e.safeShop&&e.hasOwnProperty("safeShop")&&t.uint32(136).int64(e.safeShop),
null!=e.client&&e.hasOwnProperty("client")&&pa.com.avast.cloud.webrep.proto.Client.encode(e.client,t.uint32(146).fork()).ldelim(),
null!=e.originHash&&e.hasOwnProperty("originHash")&&t.uint32(152).int32(e.originHash),
null!=e.lastOrigin&&e.hasOwnProperty("lastOrigin")&&pa.com.avast.cloud.webrep.proto.Origin.encode(e.lastOrigin,t.uint32(162).fork()).ldelim(),
null!=e.clientTimestamp&&e.hasOwnProperty("clientTimestamp")&&t.uint32(168).int64(e.clientTimestamp),
null!=e.refererDetails&&e.hasOwnProperty("refererDetails")&&pa.com.avast.cloud.webrep.proto.RefererDetails.encode(e.refererDetails,t.uint32(178).fork()).ldelim(),
null!=e.initiating_user_action&&e.hasOwnProperty("initiating_user_action")&&t.uint32(184).int32(e.initiating_user_action),
null!=e.served_from_cache&&e.hasOwnProperty("served_from_cache")&&t.uint32(192).bool(e.served_from_cache),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.UrlInfoRequest
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.uri&&i.uri.length||(i.uri=[]),i.uri.push(e.string())
break
case 2:
i.callerId=e.sint64()
break
case 3:
i.locale=e.string()
break
case 4:
i.apikey=e.bytes()
break
case 5:
i.identity=pa.com.avast.cloud.webrep.proto.Identity.decode(e,e.uint32())
break
case 6:
i.visited=e.bool()
break
case 7:
i.updateRequest=pa.com.avast.cloud.webrep.proto.UpdateRequest.decode(e,e.uint32())
break
case 8:
i.requestedServices=e.sint32()
break
case 9:
i.customKeyValue&&i.customKeyValue.length||(i.customKeyValue=[]),i.customKeyValue.push(pa.com.avast.cloud.webrep.proto.KeyValue.decode(e,e.uint32()))
break
case 10:
i.referer=e.string()
break
case 11:
i.windowNum=e.sint32()
break
case 12:
i.tabNum=e.sint32()
break
case 13:
i.windowEvent=e.int32()
break
case 14:
i.origin=e.int32()
break
case 15:
i.dnl=e.bool()
break
case 16:
i.reserved=e.bytes()
break
case 17:
i.safeShop=e.int64()
break
case 18:
i.client=pa.com.avast.cloud.webrep.proto.Client.decode(e,e.uint32())
break
case 19:
i.originHash=e.int32()
break
case 20:
i.lastOrigin=pa.com.avast.cloud.webrep.proto.Origin.decode(e,e.uint32())
break
case 21:
i.clientTimestamp=e.int64()
break
case 22:
i.refererDetails=pa.com.avast.cloud.webrep.proto.RefererDetails.decode(e,e.uint32())
break
case 23:
i.initiating_user_action=e.int32()
break
case 24:
i.served_from_cache=e.bool()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.uri&&e.hasOwnProperty("uri")){
if(!Array.isArray(e.uri)){
return"uri: array expected"
}
for(let t=0;t<e.uri.length;++t){
if(!ca.isString(e.uri[t])){
return"uri: string[] expected"
}
}
}
if(null!=e.callerId&&e.hasOwnProperty("callerId")&&!(ca.isInteger(e.callerId)||e.callerId&&ca.isInteger(e.callerId.low)&&ca.isInteger(e.callerId.high))){
return"callerId: integer|Long expected"
}
if(null!=e.locale&&e.hasOwnProperty("locale")&&!ca.isString(e.locale)){
return"locale: string expected"
}
if(null!=e.apikey&&e.hasOwnProperty("apikey")&&!(e.apikey&&"number"==typeof e.apikey.length||ca.isString(e.apikey))){
return"apikey: buffer expected"
}
if(null!=e.identity&&e.hasOwnProperty("identity")){
let t=pa.com.avast.cloud.webrep.proto.Identity.verify(e.identity)
if(t){
return"identity."+t
}
}
if(null!=e.visited&&e.hasOwnProperty("visited")&&"boolean"!=typeof e.visited){
return"visited: boolean expected"
}
if(null!=e.updateRequest&&e.hasOwnProperty("updateRequest")){
let t=pa.com.avast.cloud.webrep.proto.UpdateRequest.verify(e.updateRequest)
if(t){
return"updateRequest."+t
}
}
if(null!=e.requestedServices&&e.hasOwnProperty("requestedServices")&&!ca.isInteger(e.requestedServices)){
return"requestedServices: integer expected"
}
if(null!=e.customKeyValue&&e.hasOwnProperty("customKeyValue")){
if(!Array.isArray(e.customKeyValue)){
return"customKeyValue: array expected"
}
for(let t=0;t<e.customKeyValue.length;++t){
let n=pa.com.avast.cloud.webrep.proto.KeyValue.verify(e.customKeyValue[t])
if(n){
return"customKeyValue."+n
}
}
}
if(null!=e.referer&&e.hasOwnProperty("referer")&&!ca.isString(e.referer)){
return"referer: string expected"
}
if(null!=e.windowNum&&e.hasOwnProperty("windowNum")&&!ca.isInteger(e.windowNum)){
return"windowNum: integer expected"
}
if(null!=e.tabNum&&e.hasOwnProperty("tabNum")&&!ca.isInteger(e.tabNum)){
return"tabNum: integer expected"
}
if(null!=e.windowEvent&&e.hasOwnProperty("windowEvent")){
switch(e.windowEvent){
default:
return"windowEvent: enum value expected"
case 0:
case 1:
case 2:
case 3:
case 4:
case 5:
case 6:
case 7:
case 8:
case 9:
}
}
if(null!=e.origin&&e.hasOwnProperty("origin")){
switch(e.origin){
default:
return"origin: enum value expected"
case 0:
case 1:
case 2:
case 3:
case 4:
case 5:
case 6:
case 7:
case 8:
case 9:
case 10:
case 11:
case 12:
case 13:
case 14:
case 15:
case 16:
case 9999:
}
}
if(null!=e.dnl&&e.hasOwnProperty("dnl")&&"boolean"!=typeof e.dnl){
return"dnl: boolean expected"
}
if(null!=e.reserved&&e.hasOwnProperty("reserved")&&!(e.reserved&&"number"==typeof e.reserved.length||ca.isString(e.reserved))){
return"reserved: buffer expected"
}
if(null!=e.safeShop&&e.hasOwnProperty("safeShop")&&!(ca.isInteger(e.safeShop)||e.safeShop&&ca.isInteger(e.safeShop.low)&&ca.isInteger(e.safeShop.high))){
return"safeShop: integer|Long expected"
}
if(null!=e.client&&e.hasOwnProperty("client")){
let t=pa.com.avast.cloud.webrep.proto.Client.verify(e.client)
if(t){
return"client."+t
}
}
if(null!=e.originHash&&e.hasOwnProperty("originHash")&&!ca.isInteger(e.originHash)){
return"originHash: integer expected"
}
if(null!=e.lastOrigin&&e.hasOwnProperty("lastOrigin")){
let t=pa.com.avast.cloud.webrep.proto.Origin.verify(e.lastOrigin)
if(t){
return"lastOrigin."+t
}
}
if(null!=e.clientTimestamp&&e.hasOwnProperty("clientTimestamp")&&!(ca.isInteger(e.clientTimestamp)||e.clientTimestamp&&ca.isInteger(e.clientTimestamp.low)&&ca.isInteger(e.clientTimestamp.high))){
return"clientTimestamp: integer|Long expected"
}
if(null!=e.refererDetails&&e.hasOwnProperty("refererDetails")){
let t=pa.com.avast.cloud.webrep.proto.RefererDetails.verify(e.refererDetails)
if(t){
return"refererDetails."+t
}
}
if(null!=e.initiating_user_action&&e.hasOwnProperty("initiating_user_action")){
switch(e.initiating_user_action){
default:
return"initiating_user_action: enum value expected"
case 0:
case 1:
case 2:
case 3:
case 4:
case 5:
case 6:
case 7:
case 8:
case 9:
case 10:
case 11:
case 12:
case 13:
case 14:
case 15:
case 16:
case 9999:
}
}
return null!=e.served_from_cache&&e.hasOwnProperty("served_from_cache")&&"boolean"!=typeof e.served_from_cache?"served_from_cache: boolean expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.UrlInfoRequest){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.UrlInfoRequest
if(e.uri){
if(!Array.isArray(e.uri)){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfoRequest.uri: array expected")
}
t.uri=[]
for(let n=0;n<e.uri.length;++n){
t.uri[n]=String(e.uri[n])
}
}
if(null!=e.callerId&&(ca.Long?(t.callerId=ca.Long.fromValue(e.callerId)).unsigned=!1:"string"==typeof e.callerId?t.callerId=parseInt(e.callerId,10):"number"==typeof e.callerId?t.callerId=e.callerId:"object"==typeof e.callerId&&(t.callerId=new ca.LongBits(e.callerId.low>>>0,e.callerId.high>>>0).toNumber())),
null!=e.locale&&(t.locale=String(e.locale)),
null!=e.apikey&&("string"==typeof e.apikey?ca.base64.decode(e.apikey,t.apikey=ca.newBuffer(ca.base64.length(e.apikey)),0):e.apikey.length&&(t.apikey=e.apikey)),
null!=e.identity){
if("object"!=typeof e.identity){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfoRequest.identity: object expected")
}
t.identity=pa.com.avast.cloud.webrep.proto.Identity.fromObject(e.identity)
}
if(null!=e.visited&&(t.visited=Boolean(e.visited)),null!=e.updateRequest){
if("object"!=typeof e.updateRequest){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfoRequest.updateRequest: object expected")
}
t.updateRequest=pa.com.avast.cloud.webrep.proto.UpdateRequest.fromObject(e.updateRequest)
}
if(null!=e.requestedServices&&(t.requestedServices=0|e.requestedServices),e.customKeyValue){
if(!Array.isArray(e.customKeyValue)){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfoRequest.customKeyValue: array expected")
}
t.customKeyValue=[]
for(let n=0;n<e.customKeyValue.length;++n){
if("object"!=typeof e.customKeyValue[n]){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfoRequest.customKeyValue: object expected")
}
t.customKeyValue[n]=pa.com.avast.cloud.webrep.proto.KeyValue.fromObject(e.customKeyValue[n])
}
}
switch(null!=e.referer&&(t.referer=String(e.referer)),null!=e.windowNum&&(t.windowNum=0|e.windowNum),
null!=e.tabNum&&(t.tabNum=0|e.tabNum),
e.windowEvent){
case"CLICK":
case 0:
t.windowEvent=0
break
case"FRESHOPEN":
case 1:
t.windowEvent=1
break
case"REOPEN":
case 2:
t.windowEvent=2
break
case"TABFOCUS":
case 3:
t.windowEvent=3
break
case"SERVER_REDIRECT":
case 4:
t.windowEvent=4
break
case"AJAX":
case 5:
t.windowEvent=5
break
case"TABCLOSE":
case 6:
t.windowEvent=6
break
case"WINDOWCLOSE":
case 7:
t.windowEvent=7
break
case"SERP":
case 8:
t.windowEvent=8
break
case"WEBSHIELD":
case 9:
t.windowEvent=9
}
switch(e.origin){
case"LINK":
case 0:
t.origin=0
break
case"ADDRESSBAR":
case 1:
t.origin=1
break
case"BOOKMARK":
case 2:
t.origin=2
break
case"SEARCHWINDOW":
case 3:
t.origin=3
break
case"JAVASCRIPT":
case 4:
t.origin=4
break
case"REDIRECT":
case 5:
t.origin=5
break
case"HOMEPAGE":
case 6:
t.origin=6
break
case"RELOAD":
case 7:
t.origin=7
break
case"STEPBACK":
case 8:
t.origin=8
break
case"SMS_KNOW_CONTACT":
case 9:
t.origin=9
break
case"SMS_UNKNOWN_CONTACT":
case 10:
t.origin=10
break
case"SMS_UNDEFINED_CONTACT":
case 11:
t.origin=11
break
case"FORM":
case 12:
t.origin=12
break
case"APPLICATION":
case 13:
t.origin=13
break
case"SESSION_RESTORE":
case 14:
t.origin=14
break
case"ANCHOR":
case 15:
t.origin=15
break
case"HISTORY_STATE":
case 16:
t.origin=16
break
case"OTHER":
case 9999:
t.origin=9999
}
if(null!=e.dnl&&(t.dnl=Boolean(e.dnl)),null!=e.reserved&&("string"==typeof e.reserved?ca.base64.decode(e.reserved,t.reserved=ca.newBuffer(ca.base64.length(e.reserved)),0):e.reserved.length&&(t.reserved=e.reserved)),
null!=e.safeShop&&(ca.Long?(t.safeShop=ca.Long.fromValue(e.safeShop)).unsigned=!1:"string"==typeof e.safeShop?t.safeShop=parseInt(e.safeShop,10):"number"==typeof e.safeShop?t.safeShop=e.safeShop:"object"==typeof e.safeShop&&(t.safeShop=new ca.LongBits(e.safeShop.low>>>0,e.safeShop.high>>>0).toNumber())),
null!=e.client){
if("object"!=typeof e.client){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfoRequest.client: object expected")
}
t.client=pa.com.avast.cloud.webrep.proto.Client.fromObject(e.client)
}
if(null!=e.originHash&&(t.originHash=0|e.originHash),null!=e.lastOrigin){
if("object"!=typeof e.lastOrigin){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfoRequest.lastOrigin: object expected")
}
t.lastOrigin=pa.com.avast.cloud.webrep.proto.Origin.fromObject(e.lastOrigin)
}
if(null!=e.clientTimestamp&&(ca.Long?(t.clientTimestamp=ca.Long.fromValue(e.clientTimestamp)).unsigned=!1:"string"==typeof e.clientTimestamp?t.clientTimestamp=parseInt(e.clientTimestamp,10):"number"==typeof e.clientTimestamp?t.clientTimestamp=e.clientTimestamp:"object"==typeof e.clientTimestamp&&(t.clientTimestamp=new ca.LongBits(e.clientTimestamp.low>>>0,e.clientTimestamp.high>>>0).toNumber())),
null!=e.refererDetails){
if("object"!=typeof e.refererDetails){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfoRequest.refererDetails: object expected")
}
t.refererDetails=pa.com.avast.cloud.webrep.proto.RefererDetails.fromObject(e.refererDetails)
}
switch(e.initiating_user_action){
case"LINK":
case 0:
t.initiating_user_action=0
break
case"ADDRESSBAR":
case 1:
t.initiating_user_action=1
break
case"BOOKMARK":
case 2:
t.initiating_user_action=2
break
case"SEARCHWINDOW":
case 3:
t.initiating_user_action=3
break
case"JAVASCRIPT":
case 4:
t.initiating_user_action=4
break
case"REDIRECT":
case 5:
t.initiating_user_action=5
break
case"HOMEPAGE":
case 6:
t.initiating_user_action=6
break
case"RELOAD":
case 7:
t.initiating_user_action=7
break
case"STEPBACK":
case 8:
t.initiating_user_action=8
break
case"SMS_KNOW_CONTACT":
case 9:
t.initiating_user_action=9
break
case"SMS_UNKNOWN_CONTACT":
case 10:
t.initiating_user_action=10
break
case"SMS_UNDEFINED_CONTACT":
case 11:
t.initiating_user_action=11
break
case"FORM":
case 12:
t.initiating_user_action=12
break
case"APPLICATION":
case 13:
t.initiating_user_action=13
break
case"SESSION_RESTORE":
case 14:
t.initiating_user_action=14
break
case"ANCHOR":
case 15:
t.initiating_user_action=15
break
case"HISTORY_STATE":
case 16:
t.initiating_user_action=16
break
case"OTHER":
case 9999:
t.initiating_user_action=9999
}
return null!=e.served_from_cache&&(t.served_from_cache=Boolean(e.served_from_cache)),
t
},e.toObject=function(e,t){
t||(t={})
let n={}
if((t.arrays||t.defaults)&&(n.uri=[],n.customKeyValue=[]),t.defaults){
if(ca.Long){
let e=new ca.Long(0,0,!1)
n.callerId=t.longs===String?e.toString():t.longs===Number?e.toNumber():e
}else{
n.callerId=t.longs===String?"0":0
}
if(n.locale="",t.bytes===String?n.apikey="":(n.apikey=[],t.bytes!==Array&&(n.apikey=ca.newBuffer(n.apikey))),
n.identity=null,
n.visited=!1,n.updateRequest=null,n.requestedServices=0,n.referer="",
n.windowNum=0,
n.tabNum=0,n.windowEvent=t.enums===String?"CLICK":0,n.origin=t.enums===String?"LINK":0,
n.dnl=!1,
t.bytes===String?n.reserved="":(n.reserved=[],t.bytes!==Array&&(n.reserved=ca.newBuffer(n.reserved))),
ca.Long){
let e=new ca.Long(0,0,!1)
n.safeShop=t.longs===String?e.toString():t.longs===Number?e.toNumber():e
}else{
n.safeShop=t.longs===String?"0":0
}
if(n.client=null,n.originHash=0,n.lastOrigin=null,ca.Long){
let e=new ca.Long(0,0,!1)
n.clientTimestamp=t.longs===String?e.toString():t.longs===Number?e.toNumber():e
}else{
n.clientTimestamp=t.longs===String?"0":0
}
n.refererDetails=null,n.initiating_user_action=t.enums===String?"LINK":0,n.served_from_cache=!1
}
if(e.uri&&e.uri.length){
n.uri=[]
for(let t=0;t<e.uri.length;++t){
n.uri[t]=e.uri[t]
}
}
if(null!=e.callerId&&e.hasOwnProperty("callerId")&&("number"==typeof e.callerId?n.callerId=t.longs===String?String(e.callerId):e.callerId:n.callerId=t.longs===String?ca.Long.prototype.toString.call(e.callerId):t.longs===Number?new ca.LongBits(e.callerId.low>>>0,e.callerId.high>>>0).toNumber():e.callerId),
null!=e.locale&&e.hasOwnProperty("locale")&&(n.locale=e.locale),
null!=e.apikey&&e.hasOwnProperty("apikey")&&(n.apikey=t.bytes===String?ca.base64.encode(e.apikey,0,e.apikey.length):t.bytes===Array?Array.prototype.slice.call(e.apikey):e.apikey),
null!=e.identity&&e.hasOwnProperty("identity")&&(n.identity=pa.com.avast.cloud.webrep.proto.Identity.toObject(e.identity,t)),
null!=e.visited&&e.hasOwnProperty("visited")&&(n.visited=e.visited),
null!=e.updateRequest&&e.hasOwnProperty("updateRequest")&&(n.updateRequest=pa.com.avast.cloud.webrep.proto.UpdateRequest.toObject(e.updateRequest,t)),
null!=e.requestedServices&&e.hasOwnProperty("requestedServices")&&(n.requestedServices=e.requestedServices),
e.customKeyValue&&e.customKeyValue.length){
n.customKeyValue=[]
for(let i=0;i<e.customKeyValue.length;++i){
n.customKeyValue[i]=pa.com.avast.cloud.webrep.proto.KeyValue.toObject(e.customKeyValue[i],t)
}
}
return null!=e.referer&&e.hasOwnProperty("referer")&&(n.referer=e.referer),null!=e.windowNum&&e.hasOwnProperty("windowNum")&&(n.windowNum=e.windowNum),
null!=e.tabNum&&e.hasOwnProperty("tabNum")&&(n.tabNum=e.tabNum),
null!=e.windowEvent&&e.hasOwnProperty("windowEvent")&&(n.windowEvent=t.enums===String?pa.com.avast.cloud.webrep.proto.EventType[e.windowEvent]:e.windowEvent),
null!=e.origin&&e.hasOwnProperty("origin")&&(n.origin=t.enums===String?pa.com.avast.cloud.webrep.proto.OriginType[e.origin]:e.origin),
null!=e.dnl&&e.hasOwnProperty("dnl")&&(n.dnl=e.dnl),
null!=e.reserved&&e.hasOwnProperty("reserved")&&(n.reserved=t.bytes===String?ca.base64.encode(e.reserved,0,e.reserved.length):t.bytes===Array?Array.prototype.slice.call(e.reserved):e.reserved),
null!=e.safeShop&&e.hasOwnProperty("safeShop")&&("number"==typeof e.safeShop?n.safeShop=t.longs===String?String(e.safeShop):e.safeShop:n.safeShop=t.longs===String?ca.Long.prototype.toString.call(e.safeShop):t.longs===Number?new ca.LongBits(e.safeShop.low>>>0,e.safeShop.high>>>0).toNumber():e.safeShop),
null!=e.client&&e.hasOwnProperty("client")&&(n.client=pa.com.avast.cloud.webrep.proto.Client.toObject(e.client,t)),
null!=e.originHash&&e.hasOwnProperty("originHash")&&(n.originHash=e.originHash),
null!=e.lastOrigin&&e.hasOwnProperty("lastOrigin")&&(n.lastOrigin=pa.com.avast.cloud.webrep.proto.Origin.toObject(e.lastOrigin,t)),
null!=e.clientTimestamp&&e.hasOwnProperty("clientTimestamp")&&("number"==typeof e.clientTimestamp?n.clientTimestamp=t.longs===String?String(e.clientTimestamp):e.clientTimestamp:n.clientTimestamp=t.longs===String?ca.Long.prototype.toString.call(e.clientTimestamp):t.longs===Number?new ca.LongBits(e.clientTimestamp.low>>>0,e.clientTimestamp.high>>>0).toNumber():e.clientTimestamp),
null!=e.refererDetails&&e.hasOwnProperty("refererDetails")&&(n.refererDetails=pa.com.avast.cloud.webrep.proto.RefererDetails.toObject(e.refererDetails,t)),
null!=e.initiating_user_action&&e.hasOwnProperty("initiating_user_action")&&(n.initiating_user_action=t.enums===String?pa.com.avast.cloud.webrep.proto.OriginType[e.initiating_user_action]:e.initiating_user_action),
null!=e.served_from_cache&&e.hasOwnProperty("served_from_cache")&&(n.served_from_cache=e.served_from_cache),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.UrlInfo=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.webrep=null,e.prototype.phishing=null,e.prototype.blocker=null,
e.prototype.typo=null,
e.prototype.safeshop=null,e.prototype.categories=null,e.prototype.ajax=null,
e.prototype.iot_botnet=null,
e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.webrep&&e.hasOwnProperty("webrep")&&pa.com.avast.cloud.webrep.proto.Webrep.encode(e.webrep,t.uint32(10).fork()).ldelim(),
null!=e.phishing&&e.hasOwnProperty("phishing")&&pa.com.avast.cloud.webrep.proto.Phishing.encode(e.phishing,t.uint32(18).fork()).ldelim(),
null!=e.blocker&&e.hasOwnProperty("blocker")&&pa.com.avast.cloud.webrep.proto.Blocker.encode(e.blocker,t.uint32(26).fork()).ldelim(),
null!=e.typo&&e.hasOwnProperty("typo")&&pa.com.avast.cloud.webrep.proto.Typo.encode(e.typo,t.uint32(34).fork()).ldelim(),
null!=e.safeshop&&e.hasOwnProperty("safeshop")&&pa.com.avast.cloud.webrep.proto.SafeShop.encode(e.safeshop,t.uint32(42).fork()).ldelim(),
null!=e.categories&&e.hasOwnProperty("categories")&&pa.com.avast.cloud.webrep.proto.Categories.encode(e.categories,t.uint32(50).fork()).ldelim(),
null!=e.ajax&&e.hasOwnProperty("ajax")&&pa.com.avast.cloud.webrep.proto.Ajax.encode(e.ajax,t.uint32(58).fork()).ldelim(),
null!=e.iot_botnet&&e.hasOwnProperty("iot_botnet")&&pa.com.avast.cloud.webrep.proto.IotBotnet.encode(e.iot_botnet,t.uint32(66).fork()).ldelim(),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.UrlInfo
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.webrep=pa.com.avast.cloud.webrep.proto.Webrep.decode(e,e.uint32())
break
case 2:
i.phishing=pa.com.avast.cloud.webrep.proto.Phishing.decode(e,e.uint32())
break
case 3:
i.blocker=pa.com.avast.cloud.webrep.proto.Blocker.decode(e,e.uint32())
break
case 4:
i.typo=pa.com.avast.cloud.webrep.proto.Typo.decode(e,e.uint32())
break
case 5:
i.safeshop=pa.com.avast.cloud.webrep.proto.SafeShop.decode(e,e.uint32())
break
case 6:
i.categories=pa.com.avast.cloud.webrep.proto.Categories.decode(e,e.uint32())
break
case 7:
i.ajax=pa.com.avast.cloud.webrep.proto.Ajax.decode(e,e.uint32())
break
case 8:
i.iot_botnet=pa.com.avast.cloud.webrep.proto.IotBotnet.decode(e,e.uint32())
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.webrep&&e.hasOwnProperty("webrep")){
let t=pa.com.avast.cloud.webrep.proto.Webrep.verify(e.webrep)
if(t){
return"webrep."+t
}
}
if(null!=e.phishing&&e.hasOwnProperty("phishing")){
let t=pa.com.avast.cloud.webrep.proto.Phishing.verify(e.phishing)
if(t){
return"phishing."+t
}
}
if(null!=e.blocker&&e.hasOwnProperty("blocker")){
let t=pa.com.avast.cloud.webrep.proto.Blocker.verify(e.blocker)
if(t){
return"blocker."+t
}
}
if(null!=e.typo&&e.hasOwnProperty("typo")){
let t=pa.com.avast.cloud.webrep.proto.Typo.verify(e.typo)
if(t){
return"typo."+t
}
}
if(null!=e.safeshop&&e.hasOwnProperty("safeshop")){
let t=pa.com.avast.cloud.webrep.proto.SafeShop.verify(e.safeshop)
if(t){
return"safeshop."+t
}
}
if(null!=e.categories&&e.hasOwnProperty("categories")){
let t=pa.com.avast.cloud.webrep.proto.Categories.verify(e.categories)
if(t){
return"categories."+t
}
}
if(null!=e.ajax&&e.hasOwnProperty("ajax")){
let t=pa.com.avast.cloud.webrep.proto.Ajax.verify(e.ajax)
if(t){
return"ajax."+t
}
}
if(null!=e.iot_botnet&&e.hasOwnProperty("iot_botnet")){
let t=pa.com.avast.cloud.webrep.proto.IotBotnet.verify(e.iot_botnet)
if(t){
return"iot_botnet."+t
}
}
return null
},e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.UrlInfo){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.UrlInfo
if(null!=e.webrep){
if("object"!=typeof e.webrep){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfo.webrep: object expected")
}
t.webrep=pa.com.avast.cloud.webrep.proto.Webrep.fromObject(e.webrep)
}
if(null!=e.phishing){
if("object"!=typeof e.phishing){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfo.phishing: object expected")
}
t.phishing=pa.com.avast.cloud.webrep.proto.Phishing.fromObject(e.phishing)
}
if(null!=e.blocker){
if("object"!=typeof e.blocker){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfo.blocker: object expected")
}
t.blocker=pa.com.avast.cloud.webrep.proto.Blocker.fromObject(e.blocker)
}
if(null!=e.typo){
if("object"!=typeof e.typo){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfo.typo: object expected")
}
t.typo=pa.com.avast.cloud.webrep.proto.Typo.fromObject(e.typo)
}
if(null!=e.safeshop){
if("object"!=typeof e.safeshop){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfo.safeshop: object expected")
}
t.safeshop=pa.com.avast.cloud.webrep.proto.SafeShop.fromObject(e.safeshop)
}
if(null!=e.categories){
if("object"!=typeof e.categories){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfo.categories: object expected")
}
t.categories=pa.com.avast.cloud.webrep.proto.Categories.fromObject(e.categories)
}
if(null!=e.ajax){
if("object"!=typeof e.ajax){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfo.ajax: object expected")
}
t.ajax=pa.com.avast.cloud.webrep.proto.Ajax.fromObject(e.ajax)
}
if(null!=e.iot_botnet){
if("object"!=typeof e.iot_botnet){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfo.iot_botnet: object expected")
}
t.iot_botnet=pa.com.avast.cloud.webrep.proto.IotBotnet.fromObject(e.iot_botnet)
}
return t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(n.webrep=null,n.phishing=null,n.blocker=null,n.typo=null,n.safeshop=null,
n.categories=null,
n.ajax=null,n.iot_botnet=null),null!=e.webrep&&e.hasOwnProperty("webrep")&&(n.webrep=pa.com.avast.cloud.webrep.proto.Webrep.toObject(e.webrep,t)),
null!=e.phishing&&e.hasOwnProperty("phishing")&&(n.phishing=pa.com.avast.cloud.webrep.proto.Phishing.toObject(e.phishing,t)),
null!=e.blocker&&e.hasOwnProperty("blocker")&&(n.blocker=pa.com.avast.cloud.webrep.proto.Blocker.toObject(e.blocker,t)),
null!=e.typo&&e.hasOwnProperty("typo")&&(n.typo=pa.com.avast.cloud.webrep.proto.Typo.toObject(e.typo,t)),
null!=e.safeshop&&e.hasOwnProperty("safeshop")&&(n.safeshop=pa.com.avast.cloud.webrep.proto.SafeShop.toObject(e.safeshop,t)),
null!=e.categories&&e.hasOwnProperty("categories")&&(n.categories=pa.com.avast.cloud.webrep.proto.Categories.toObject(e.categories,t)),
null!=e.ajax&&e.hasOwnProperty("ajax")&&(n.ajax=pa.com.avast.cloud.webrep.proto.Ajax.toObject(e.ajax,t)),
null!=e.iot_botnet&&e.hasOwnProperty("iot_botnet")&&(n.iot_botnet=pa.com.avast.cloud.webrep.proto.IotBotnet.toObject(e.iot_botnet,t)),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.UrlInfoResponse=function(){
function e(e){
if(this.urlInfo=[],e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.urlInfo=ca.emptyArray,e.prototype.updateResponse=null,e.create=function(t){
return new e(t)
},e.encode=function(e,t){
if(t||(t=la.create()),null!=e.urlInfo&&e.urlInfo.length){
for(let n=0;n<e.urlInfo.length;++n){
pa.com.avast.cloud.webrep.proto.UrlInfo.encode(e.urlInfo[n],t.uint32(10).fork()).ldelim()
}
}
return null!=e.updateResponse&&e.hasOwnProperty("updateResponse")&&pa.com.avast.cloud.webrep.proto.UpdateResponse.encode(e.updateResponse,t.uint32(18).fork()).ldelim(),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.UrlInfoResponse
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.urlInfo&&i.urlInfo.length||(i.urlInfo=[]),i.urlInfo.push(pa.com.avast.cloud.webrep.proto.UrlInfo.decode(e,e.uint32()))
break
case 2:
i.updateResponse=pa.com.avast.cloud.webrep.proto.UpdateResponse.decode(e,e.uint32())
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.urlInfo&&e.hasOwnProperty("urlInfo")){
if(!Array.isArray(e.urlInfo)){
return"urlInfo: array expected"
}
for(let t=0;t<e.urlInfo.length;++t){
let n=pa.com.avast.cloud.webrep.proto.UrlInfo.verify(e.urlInfo[t])
if(n){
return"urlInfo."+n
}
}
}
if(null!=e.updateResponse&&e.hasOwnProperty("updateResponse")){
let t=pa.com.avast.cloud.webrep.proto.UpdateResponse.verify(e.updateResponse)
if(t){
return"updateResponse."+t
}
}
return null
},e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.UrlInfoResponse){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.UrlInfoResponse
if(e.urlInfo){
if(!Array.isArray(e.urlInfo)){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfoResponse.urlInfo: array expected")
}
t.urlInfo=[]
for(let n=0;n<e.urlInfo.length;++n){
if("object"!=typeof e.urlInfo[n]){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfoResponse.urlInfo: object expected")
}
t.urlInfo[n]=pa.com.avast.cloud.webrep.proto.UrlInfo.fromObject(e.urlInfo[n])
}
}
if(null!=e.updateResponse){
if("object"!=typeof e.updateResponse){
throw TypeError(".com.avast.cloud.webrep.proto.UrlInfoResponse.updateResponse: object expected")
}
t.updateResponse=pa.com.avast.cloud.webrep.proto.UpdateResponse.fromObject(e.updateResponse)
}
return t
},e.toObject=function(e,t){
t||(t={})
let n={}
if((t.arrays||t.defaults)&&(n.urlInfo=[]),t.defaults&&(n.updateResponse=null),e.urlInfo&&e.urlInfo.length){
n.urlInfo=[]
for(let i=0;i<e.urlInfo.length;++i){
n.urlInfo[i]=pa.com.avast.cloud.webrep.proto.UrlInfo.toObject(e.urlInfo[i],t)
}
}
return null!=e.updateResponse&&e.hasOwnProperty("updateResponse")&&(n.updateResponse=pa.com.avast.cloud.webrep.proto.UpdateResponse.toObject(e.updateResponse,t)),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.Webrep=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.rating=0,e.prototype.weight=0,e.prototype.ttl=0,e.prototype.flags=ca.Long?ca.Long.fromBits(0,0,!1):0,
e.prototype.rating_level=1,
e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.rating&&e.hasOwnProperty("rating")&&t.uint32(8).sint32(e.rating),
null!=e.weight&&e.hasOwnProperty("weight")&&t.uint32(16).sint32(e.weight),
null!=e.ttl&&e.hasOwnProperty("ttl")&&t.uint32(24).sint32(e.ttl),
null!=e.flags&&e.hasOwnProperty("flags")&&t.uint32(32).int64(e.flags),
null!=e.rating_level&&e.hasOwnProperty("rating_level")&&t.uint32(40).int32(e.rating_level),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.Webrep
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.rating=e.sint32()
break
case 2:
i.weight=e.sint32()
break
case 3:
i.ttl=e.sint32()
break
case 4:
i.flags=e.int64()
break
case 5:
i.rating_level=e.int32()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.rating&&e.hasOwnProperty("rating")&&!ca.isInteger(e.rating)){
return"rating: integer expected"
}
if(null!=e.weight&&e.hasOwnProperty("weight")&&!ca.isInteger(e.weight)){
return"weight: integer expected"
}
if(null!=e.ttl&&e.hasOwnProperty("ttl")&&!ca.isInteger(e.ttl)){
return"ttl: integer expected"
}
if(null!=e.flags&&e.hasOwnProperty("flags")&&!(ca.isInteger(e.flags)||e.flags&&ca.isInteger(e.flags.low)&&ca.isInteger(e.flags.high))){
return"flags: integer|Long expected"
}
if(null!=e.rating_level&&e.hasOwnProperty("rating_level")){
switch(e.rating_level){
default:
return"rating_level: enum value expected"
case 1:
case 2:
}
}
return null
},e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.Webrep){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.Webrep
switch(null!=e.rating&&(t.rating=0|e.rating),null!=e.weight&&(t.weight=0|e.weight),
null!=e.ttl&&(t.ttl=0|e.ttl),
null!=e.flags&&(ca.Long?(t.flags=ca.Long.fromValue(e.flags)).unsigned=!1:"string"==typeof e.flags?t.flags=parseInt(e.flags,10):"number"==typeof e.flags?t.flags=e.flags:"object"==typeof e.flags&&(t.flags=new ca.LongBits(e.flags.low>>>0,e.flags.high>>>0).toNumber())),
e.rating_level){
case"GOOD":
case 1:
t.rating_level=1
break
case"AVERAGE":
case 2:
t.rating_level=2
}
return t
},e.toObject=function(e,t){
t||(t={})
let n={}
if(t.defaults){
if(n.rating=0,n.weight=0,n.ttl=0,ca.Long){
let e=new ca.Long(0,0,!1)
n.flags=t.longs===String?e.toString():t.longs===Number?e.toNumber():e
}else{
n.flags=t.longs===String?"0":0
}
n.rating_level=t.enums===String?"GOOD":1
}
return null!=e.rating&&e.hasOwnProperty("rating")&&(n.rating=e.rating),null!=e.weight&&e.hasOwnProperty("weight")&&(n.weight=e.weight),
null!=e.ttl&&e.hasOwnProperty("ttl")&&(n.ttl=e.ttl),
null!=e.flags&&e.hasOwnProperty("flags")&&("number"==typeof e.flags?n.flags=t.longs===String?String(e.flags):e.flags:n.flags=t.longs===String?ca.Long.prototype.toString.call(e.flags):t.longs===Number?new ca.LongBits(e.flags.low>>>0,e.flags.high>>>0).toNumber():e.flags),
null!=e.rating_level&&e.hasOwnProperty("rating_level")&&(n.rating_level=t.enums===String?pa.com.avast.cloud.webrep.proto.Webrep.RatingLevel[e.rating_level]:e.rating_level),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e.RatingLevel=function(){
const e={},t=Object.create(e)
return t[e[1]="GOOD"]=1,t[e[2]="AVERAGE"]=2,t
}(),e
}(),e.Phishing=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.phishing=0,e.prototype.phishingDomain=0,e.prototype.ttl=0,e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.phishing&&e.hasOwnProperty("phishing")&&t.uint32(8).sint32(e.phishing),
null!=e.phishingDomain&&e.hasOwnProperty("phishingDomain")&&t.uint32(16).sint32(e.phishingDomain),
null!=e.ttl&&e.hasOwnProperty("ttl")&&t.uint32(24).sint32(e.ttl),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.Phishing
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.phishing=e.sint32()
break
case 2:
i.phishingDomain=e.sint32()
break
case 3:
i.ttl=e.sint32()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
return"object"!=typeof e||null===e?"object expected":null!=e.phishing&&e.hasOwnProperty("phishing")&&!ca.isInteger(e.phishing)?"phishing: integer expected":null!=e.phishingDomain&&e.hasOwnProperty("phishingDomain")&&!ca.isInteger(e.phishingDomain)?"phishingDomain: integer expected":null!=e.ttl&&e.hasOwnProperty("ttl")&&!ca.isInteger(e.ttl)?"ttl: integer expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.Phishing){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.Phishing
return null!=e.phishing&&(t.phishing=0|e.phishing),null!=e.phishingDomain&&(t.phishingDomain=0|e.phishingDomain),
null!=e.ttl&&(t.ttl=0|e.ttl),
t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(n.phishing=0,n.phishingDomain=0,n.ttl=0),null!=e.phishing&&e.hasOwnProperty("phishing")&&(n.phishing=e.phishing),
null!=e.phishingDomain&&e.hasOwnProperty("phishingDomain")&&(n.phishingDomain=e.phishingDomain),
null!=e.ttl&&e.hasOwnProperty("ttl")&&(n.ttl=e.ttl),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.Typo=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.url_to="",e.prototype.brand_domain="",e.prototype.urlInfo=null,
e.prototype.is_typo=!1,
e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.url_to&&e.hasOwnProperty("url_to")&&t.uint32(10).string(e.url_to),
null!=e.brand_domain&&e.hasOwnProperty("brand_domain")&&t.uint32(18).string(e.brand_domain),
null!=e.urlInfo&&e.hasOwnProperty("urlInfo")&&pa.com.avast.cloud.webrep.proto.UrlInfo.encode(e.urlInfo,t.uint32(26).fork()).ldelim(),
null!=e.is_typo&&e.hasOwnProperty("is_typo")&&t.uint32(32).bool(e.is_typo),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.Typo
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.url_to=e.string()
break
case 2:
i.brand_domain=e.string()
break
case 3:
i.urlInfo=pa.com.avast.cloud.webrep.proto.UrlInfo.decode(e,e.uint32())
break
case 4:
i.is_typo=e.bool()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.url_to&&e.hasOwnProperty("url_to")&&!ca.isString(e.url_to)){
return"url_to: string expected"
}
if(null!=e.brand_domain&&e.hasOwnProperty("brand_domain")&&!ca.isString(e.brand_domain)){
return"brand_domain: string expected"
}
if(null!=e.urlInfo&&e.hasOwnProperty("urlInfo")){
let t=pa.com.avast.cloud.webrep.proto.UrlInfo.verify(e.urlInfo)
if(t){
return"urlInfo."+t
}
}
return null!=e.is_typo&&e.hasOwnProperty("is_typo")&&"boolean"!=typeof e.is_typo?"is_typo: boolean expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.Typo){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.Typo
if(null!=e.url_to&&(t.url_to=String(e.url_to)),null!=e.brand_domain&&(t.brand_domain=String(e.brand_domain)),
null!=e.urlInfo){
if("object"!=typeof e.urlInfo){
throw TypeError(".com.avast.cloud.webrep.proto.Typo.urlInfo: object expected")
}
t.urlInfo=pa.com.avast.cloud.webrep.proto.UrlInfo.fromObject(e.urlInfo)
}
return null!=e.is_typo&&(t.is_typo=Boolean(e.is_typo)),t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(n.url_to="",n.brand_domain="",n.urlInfo=null,n.is_typo=!1),null!=e.url_to&&e.hasOwnProperty("url_to")&&(n.url_to=e.url_to),
null!=e.brand_domain&&e.hasOwnProperty("brand_domain")&&(n.brand_domain=e.brand_domain),
null!=e.urlInfo&&e.hasOwnProperty("urlInfo")&&(n.urlInfo=pa.com.avast.cloud.webrep.proto.UrlInfo.toObject(e.urlInfo,t)),
null!=e.is_typo&&e.hasOwnProperty("is_typo")&&(n.is_typo=e.is_typo),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.Blocker=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.block=ca.Long?ca.Long.fromBits(0,0,!1):0,e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.block&&e.hasOwnProperty("block")&&t.uint32(8).sint64(e.block),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.Blocker
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.block=e.sint64()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
return"object"!=typeof e||null===e?"object expected":null!=e.block&&e.hasOwnProperty("block")&&!(ca.isInteger(e.block)||e.block&&ca.isInteger(e.block.low)&&ca.isInteger(e.block.high))?"block: integer|Long expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.Blocker){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.Blocker
return null!=e.block&&(ca.Long?(t.block=ca.Long.fromValue(e.block)).unsigned=!1:"string"==typeof e.block?t.block=parseInt(e.block,10):"number"==typeof e.block?t.block=e.block:"object"==typeof e.block&&(t.block=new ca.LongBits(e.block.low>>>0,e.block.high>>>0).toNumber())),
t
},e.toObject=function(e,t){
t||(t={})
let n={}
if(t.defaults){
if(ca.Long){
let e=new ca.Long(0,0,!1)
n.block=t.longs===String?e.toString():t.longs===Number?e.toNumber():e
}else{
n.block=t.longs===String?"0":0
}
}
return null!=e.block&&e.hasOwnProperty("block")&&("number"==typeof e.block?n.block=t.longs===String?String(e.block):e.block:n.block=t.longs===String?ca.Long.prototype.toString.call(e.block):t.longs===Number?new ca.LongBits(e.block.low>>>0,e.block.high>>>0).toNumber():e.block),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.IotBotnet=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.block=ca.Long?ca.Long.fromBits(0,0,!1):0,e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.block&&e.hasOwnProperty("block")&&t.uint32(8).sint64(e.block),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.IotBotnet
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.block=e.sint64()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
return"object"!=typeof e||null===e?"object expected":null!=e.block&&e.hasOwnProperty("block")&&!(ca.isInteger(e.block)||e.block&&ca.isInteger(e.block.low)&&ca.isInteger(e.block.high))?"block: integer|Long expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.IotBotnet){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.IotBotnet
return null!=e.block&&(ca.Long?(t.block=ca.Long.fromValue(e.block)).unsigned=!1:"string"==typeof e.block?t.block=parseInt(e.block,10):"number"==typeof e.block?t.block=e.block:"object"==typeof e.block&&(t.block=new ca.LongBits(e.block.low>>>0,e.block.high>>>0).toNumber())),
t
},e.toObject=function(e,t){
t||(t={})
let n={}
if(t.defaults){
if(ca.Long){
let e=new ca.Long(0,0,!1)
n.block=t.longs===String?e.toString():t.longs===Number?e.toNumber():e
}else{
n.block=t.longs===String?"0":0
}
}
return null!=e.block&&e.hasOwnProperty("block")&&("number"==typeof e.block?n.block=t.longs===String?String(e.block):e.block:n.block=t.longs===String?ca.Long.prototype.toString.call(e.block):t.longs===Number?new ca.LongBits(e.block.low>>>0,e.block.high>>>0).toNumber():e.block),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.SafeShop=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.timestamp=ca.Long?ca.Long.fromBits(0,0,!1):0,e.prototype.regex="",
e.prototype.selector="",
e.prototype.match=!1,e.prototype.is_fake=!1,e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.timestamp&&e.hasOwnProperty("timestamp")&&t.uint32(8).int64(e.timestamp),
null!=e.regex&&e.hasOwnProperty("regex")&&t.uint32(18).string(e.regex),
null!=e.selector&&e.hasOwnProperty("selector")&&t.uint32(26).string(e.selector),
null!=e.match&&e.hasOwnProperty("match")&&t.uint32(32).bool(e.match),
null!=e.is_fake&&e.hasOwnProperty("is_fake")&&t.uint32(40).bool(e.is_fake),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.SafeShop
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.timestamp=e.int64()
break
case 2:
i.regex=e.string()
break
case 3:
i.selector=e.string()
break
case 4:
i.match=e.bool()
break
case 5:
i.is_fake=e.bool()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
return"object"!=typeof e||null===e?"object expected":null!=e.timestamp&&e.hasOwnProperty("timestamp")&&!(ca.isInteger(e.timestamp)||e.timestamp&&ca.isInteger(e.timestamp.low)&&ca.isInteger(e.timestamp.high))?"timestamp: integer|Long expected":null!=e.regex&&e.hasOwnProperty("regex")&&!ca.isString(e.regex)?"regex: string expected":null!=e.selector&&e.hasOwnProperty("selector")&&!ca.isString(e.selector)?"selector: string expected":null!=e.match&&e.hasOwnProperty("match")&&"boolean"!=typeof e.match?"match: boolean expected":null!=e.is_fake&&e.hasOwnProperty("is_fake")&&"boolean"!=typeof e.is_fake?"is_fake: boolean expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.SafeShop){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.SafeShop
return null!=e.timestamp&&(ca.Long?(t.timestamp=ca.Long.fromValue(e.timestamp)).unsigned=!1:"string"==typeof e.timestamp?t.timestamp=parseInt(e.timestamp,10):"number"==typeof e.timestamp?t.timestamp=e.timestamp:"object"==typeof e.timestamp&&(t.timestamp=new ca.LongBits(e.timestamp.low>>>0,e.timestamp.high>>>0).toNumber())),
null!=e.regex&&(t.regex=String(e.regex)),
null!=e.selector&&(t.selector=String(e.selector)),
null!=e.match&&(t.match=Boolean(e.match)),
null!=e.is_fake&&(t.is_fake=Boolean(e.is_fake)),
t
},e.toObject=function(e,t){
t||(t={})
let n={}
if(t.defaults){
if(ca.Long){
let e=new ca.Long(0,0,!1)
n.timestamp=t.longs===String?e.toString():t.longs===Number?e.toNumber():e
}else{
n.timestamp=t.longs===String?"0":0
}
n.regex="",n.selector="",n.match=!1,n.is_fake=!1
}
return null!=e.timestamp&&e.hasOwnProperty("timestamp")&&("number"==typeof e.timestamp?n.timestamp=t.longs===String?String(e.timestamp):e.timestamp:n.timestamp=t.longs===String?ca.Long.prototype.toString.call(e.timestamp):t.longs===Number?new ca.LongBits(e.timestamp.low>>>0,e.timestamp.high>>>0).toNumber():e.timestamp),
null!=e.regex&&e.hasOwnProperty("regex")&&(n.regex=e.regex),
null!=e.selector&&e.hasOwnProperty("selector")&&(n.selector=e.selector),
null!=e.match&&e.hasOwnProperty("match")&&(n.match=e.match),
null!=e.is_fake&&e.hasOwnProperty("is_fake")&&(n.is_fake=e.is_fake),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.Identity=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.guid=ca.newBuffer([]),e.prototype.uuid=ca.newBuffer([]),e.prototype.token=ca.newBuffer([]),
e.prototype.auid=ca.newBuffer([]),
e.prototype.browserType=0,e.prototype.token_verified=0,
e.prototype.ip_address=ca.newBuffer([]),
e.prototype.userid=ca.newBuffer([]),e.prototype.product=ca.newBuffer([]),
e.prototype.version=ca.newBuffer([]),
e.prototype.hwid=ca.newBuffer([]),e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.guid&&e.hasOwnProperty("guid")&&t.uint32(10).bytes(e.guid),
null!=e.uuid&&e.hasOwnProperty("uuid")&&t.uint32(18).bytes(e.uuid),
null!=e.token&&e.hasOwnProperty("token")&&t.uint32(26).bytes(e.token),
null!=e.auid&&e.hasOwnProperty("auid")&&t.uint32(34).bytes(e.auid),
null!=e.browserType&&e.hasOwnProperty("browserType")&&t.uint32(40).int32(e.browserType),
null!=e.token_verified&&e.hasOwnProperty("token_verified")&&t.uint32(48).sint32(e.token_verified),
null!=e.ip_address&&e.hasOwnProperty("ip_address")&&t.uint32(58).bytes(e.ip_address),
null!=e.userid&&e.hasOwnProperty("userid")&&t.uint32(66).bytes(e.userid),
null!=e.product&&e.hasOwnProperty("product")&&t.uint32(74).bytes(e.product),
null!=e.version&&e.hasOwnProperty("version")&&t.uint32(82).bytes(e.version),
null!=e.hwid&&e.hasOwnProperty("hwid")&&t.uint32(90).bytes(e.hwid),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.Identity
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.guid=e.bytes()
break
case 2:
i.uuid=e.bytes()
break
case 3:
i.token=e.bytes()
break
case 4:
i.auid=e.bytes()
break
case 5:
i.browserType=e.int32()
break
case 6:
i.token_verified=e.sint32()
break
case 7:
i.ip_address=e.bytes()
break
case 8:
i.userid=e.bytes()
break
case 9:
i.product=e.bytes()
break
case 10:
i.version=e.bytes()
break
case 11:
i.hwid=e.bytes()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.guid&&e.hasOwnProperty("guid")&&!(e.guid&&"number"==typeof e.guid.length||ca.isString(e.guid))){
return"guid: buffer expected"
}
if(null!=e.uuid&&e.hasOwnProperty("uuid")&&!(e.uuid&&"number"==typeof e.uuid.length||ca.isString(e.uuid))){
return"uuid: buffer expected"
}
if(null!=e.token&&e.hasOwnProperty("token")&&!(e.token&&"number"==typeof e.token.length||ca.isString(e.token))){
return"token: buffer expected"
}
if(null!=e.auid&&e.hasOwnProperty("auid")&&!(e.auid&&"number"==typeof e.auid.length||ca.isString(e.auid))){
return"auid: buffer expected"
}
if(null!=e.browserType&&e.hasOwnProperty("browserType")){
switch(e.browserType){
default:
return"browserType: enum value expected"
case 0:
case 1:
case 2:
case 3:
case 4:
case 5:
case 6:
}
}
return null!=e.token_verified&&e.hasOwnProperty("token_verified")&&!ca.isInteger(e.token_verified)?"token_verified: integer expected":null!=e.ip_address&&e.hasOwnProperty("ip_address")&&!(e.ip_address&&"number"==typeof e.ip_address.length||ca.isString(e.ip_address))?"ip_address: buffer expected":null!=e.userid&&e.hasOwnProperty("userid")&&!(e.userid&&"number"==typeof e.userid.length||ca.isString(e.userid))?"userid: buffer expected":null!=e.product&&e.hasOwnProperty("product")&&!(e.product&&"number"==typeof e.product.length||ca.isString(e.product))?"product: buffer expected":null!=e.version&&e.hasOwnProperty("version")&&!(e.version&&"number"==typeof e.version.length||ca.isString(e.version))?"version: buffer expected":null!=e.hwid&&e.hasOwnProperty("hwid")&&!(e.hwid&&"number"==typeof e.hwid.length||ca.isString(e.hwid))?"hwid: buffer expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.Identity){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.Identity
switch(null!=e.guid&&("string"==typeof e.guid?ca.base64.decode(e.guid,t.guid=ca.newBuffer(ca.base64.length(e.guid)),0):e.guid.length&&(t.guid=e.guid)),
null!=e.uuid&&("string"==typeof e.uuid?ca.base64.decode(e.uuid,t.uuid=ca.newBuffer(ca.base64.length(e.uuid)),0):e.uuid.length&&(t.uuid=e.uuid)),
null!=e.token&&("string"==typeof e.token?ca.base64.decode(e.token,t.token=ca.newBuffer(ca.base64.length(e.token)),0):e.token.length&&(t.token=e.token)),
null!=e.auid&&("string"==typeof e.auid?ca.base64.decode(e.auid,t.auid=ca.newBuffer(ca.base64.length(e.auid)),0):e.auid.length&&(t.auid=e.auid)),
e.browserType){
case"CHROME":
case 0:
t.browserType=0
break
case"FIREFOX":
case 1:
t.browserType=1
break
case"IE":
case 2:
t.browserType=2
break
case"OPERA":
case 3:
t.browserType=3
break
case"SAFAR":
case 4:
t.browserType=4
break
case"PRODUCTS":
case 5:
t.browserType=5
break
case"VIDEO":
case 6:
t.browserType=6
}
return null!=e.token_verified&&(t.token_verified=0|e.token_verified),null!=e.ip_address&&("string"==typeof e.ip_address?ca.base64.decode(e.ip_address,t.ip_address=ca.newBuffer(ca.base64.length(e.ip_address)),0):e.ip_address.length&&(t.ip_address=e.ip_address)),
null!=e.userid&&("string"==typeof e.userid?ca.base64.decode(e.userid,t.userid=ca.newBuffer(ca.base64.length(e.userid)),0):e.userid.length&&(t.userid=e.userid)),
null!=e.product&&("string"==typeof e.product?ca.base64.decode(e.product,t.product=ca.newBuffer(ca.base64.length(e.product)),0):e.product.length&&(t.product=e.product)),
null!=e.version&&("string"==typeof e.version?ca.base64.decode(e.version,t.version=ca.newBuffer(ca.base64.length(e.version)),0):e.version.length&&(t.version=e.version)),
null!=e.hwid&&("string"==typeof e.hwid?ca.base64.decode(e.hwid,t.hwid=ca.newBuffer(ca.base64.length(e.hwid)),0):e.hwid.length&&(t.hwid=e.hwid)),
t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(t.bytes===String?n.guid="":(n.guid=[],t.bytes!==Array&&(n.guid=ca.newBuffer(n.guid))),
t.bytes===String?n.uuid="":(n.uuid=[],
t.bytes!==Array&&(n.uuid=ca.newBuffer(n.uuid))),
t.bytes===String?n.token="":(n.token=[],
t.bytes!==Array&&(n.token=ca.newBuffer(n.token))),
t.bytes===String?n.auid="":(n.auid=[],
t.bytes!==Array&&(n.auid=ca.newBuffer(n.auid))),
n.browserType=t.enums===String?"CHROME":0,
n.token_verified=0,t.bytes===String?n.ip_address="":(n.ip_address=[],
t.bytes!==Array&&(n.ip_address=ca.newBuffer(n.ip_address))),
t.bytes===String?n.userid="":(n.userid=[],
t.bytes!==Array&&(n.userid=ca.newBuffer(n.userid))),
t.bytes===String?n.product="":(n.product=[],
t.bytes!==Array&&(n.product=ca.newBuffer(n.product))),
t.bytes===String?n.version="":(n.version=[],
t.bytes!==Array&&(n.version=ca.newBuffer(n.version))),
t.bytes===String?n.hwid="":(n.hwid=[],
t.bytes!==Array&&(n.hwid=ca.newBuffer(n.hwid)))),
null!=e.guid&&e.hasOwnProperty("guid")&&(n.guid=t.bytes===String?ca.base64.encode(e.guid,0,e.guid.length):t.bytes===Array?Array.prototype.slice.call(e.guid):e.guid),
null!=e.uuid&&e.hasOwnProperty("uuid")&&(n.uuid=t.bytes===String?ca.base64.encode(e.uuid,0,e.uuid.length):t.bytes===Array?Array.prototype.slice.call(e.uuid):e.uuid),
null!=e.token&&e.hasOwnProperty("token")&&(n.token=t.bytes===String?ca.base64.encode(e.token,0,e.token.length):t.bytes===Array?Array.prototype.slice.call(e.token):e.token),
null!=e.auid&&e.hasOwnProperty("auid")&&(n.auid=t.bytes===String?ca.base64.encode(e.auid,0,e.auid.length):t.bytes===Array?Array.prototype.slice.call(e.auid):e.auid),
null!=e.browserType&&e.hasOwnProperty("browserType")&&(n.browserType=t.enums===String?pa.com.avast.cloud.webrep.proto.Identity.BrowserType[e.browserType]:e.browserType),
null!=e.token_verified&&e.hasOwnProperty("token_verified")&&(n.token_verified=e.token_verified),
null!=e.ip_address&&e.hasOwnProperty("ip_address")&&(n.ip_address=t.bytes===String?ca.base64.encode(e.ip_address,0,e.ip_address.length):t.bytes===Array?Array.prototype.slice.call(e.ip_address):e.ip_address),
null!=e.userid&&e.hasOwnProperty("userid")&&(n.userid=t.bytes===String?ca.base64.encode(e.userid,0,e.userid.length):t.bytes===Array?Array.prototype.slice.call(e.userid):e.userid),
null!=e.product&&e.hasOwnProperty("product")&&(n.product=t.bytes===String?ca.base64.encode(e.product,0,e.product.length):t.bytes===Array?Array.prototype.slice.call(e.product):e.product),
null!=e.version&&e.hasOwnProperty("version")&&(n.version=t.bytes===String?ca.base64.encode(e.version,0,e.version.length):t.bytes===Array?Array.prototype.slice.call(e.version):e.version),
null!=e.hwid&&e.hasOwnProperty("hwid")&&(n.hwid=t.bytes===String?ca.base64.encode(e.hwid,0,e.hwid.length):t.bytes===Array?Array.prototype.slice.call(e.hwid):e.hwid),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e.BrowserType=function(){
const e={},t=Object.create(e)
return t[e[0]="CHROME"]=0,t[e[1]="FIREFOX"]=1,t[e[2]="IE"]=2,t[e[3]="OPERA"]=3,t[e[4]="SAFAR"]=4,
t[e[5]="PRODUCTS"]=5,
t[e[6]="VIDEO"]=6,t
}(),e
}(),e.KeyValue=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.key="",e.prototype.value="",e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.key&&e.hasOwnProperty("key")&&t.uint32(10).string(e.key),
null!=e.value&&e.hasOwnProperty("value")&&t.uint32(18).string(e.value),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.KeyValue
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.key=e.string()
break
case 2:
i.value=e.string()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
return"object"!=typeof e||null===e?"object expected":null!=e.key&&e.hasOwnProperty("key")&&!ca.isString(e.key)?"key: string expected":null!=e.value&&e.hasOwnProperty("value")&&!ca.isString(e.value)?"value: string expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.KeyValue){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.KeyValue
return null!=e.key&&(t.key=String(e.key)),null!=e.value&&(t.value=String(e.value)),
t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(n.key="",n.value=""),null!=e.key&&e.hasOwnProperty("key")&&(n.key=e.key),
null!=e.value&&e.hasOwnProperty("value")&&(n.value=e.value),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.Origin=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.origin=0,e.prototype.hash=0,e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.origin&&e.hasOwnProperty("origin")&&t.uint32(8).int32(e.origin),
null!=e.hash&&e.hasOwnProperty("hash")&&t.uint32(16).int32(e.hash),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.Origin
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.origin=e.int32()
break
case 2:
i.hash=e.int32()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.origin&&e.hasOwnProperty("origin")){
switch(e.origin){
default:
return"origin: enum value expected"
case 0:
case 1:
case 2:
case 3:
case 4:
case 5:
case 6:
case 7:
case 8:
case 9:
case 10:
case 11:
case 12:
case 13:
case 14:
case 15:
case 16:
case 9999:
}
}
return null!=e.hash&&e.hasOwnProperty("hash")&&!ca.isInteger(e.hash)?"hash: integer expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.Origin){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.Origin
switch(e.origin){
case"LINK":
case 0:
t.origin=0
break
case"ADDRESSBAR":
case 1:
t.origin=1
break
case"BOOKMARK":
case 2:
t.origin=2
break
case"SEARCHWINDOW":
case 3:
t.origin=3
break
case"JAVASCRIPT":
case 4:
t.origin=4
break
case"REDIRECT":
case 5:
t.origin=5
break
case"HOMEPAGE":
case 6:
t.origin=6
break
case"RELOAD":
case 7:
t.origin=7
break
case"STEPBACK":
case 8:
t.origin=8
break
case"SMS_KNOW_CONTACT":
case 9:
t.origin=9
break
case"SMS_UNKNOWN_CONTACT":
case 10:
t.origin=10
break
case"SMS_UNDEFINED_CONTACT":
case 11:
t.origin=11
break
case"FORM":
case 12:
t.origin=12
break
case"APPLICATION":
case 13:
t.origin=13
break
case"SESSION_RESTORE":
case 14:
t.origin=14
break
case"ANCHOR":
case 15:
t.origin=15
break
case"HISTORY_STATE":
case 16:
t.origin=16
break
case"OTHER":
case 9999:
t.origin=9999
}
return null!=e.hash&&(t.hash=0|e.hash),t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(n.origin=t.enums===String?"LINK":0,n.hash=0),null!=e.origin&&e.hasOwnProperty("origin")&&(n.origin=t.enums===String?pa.com.avast.cloud.webrep.proto.OriginType[e.origin]:e.origin),
null!=e.hash&&e.hasOwnProperty("hash")&&(n.hash=e.hash),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.OriginType=function(){
const e={},t=Object.create(e)
return t[e[0]="LINK"]=0,t[e[1]="ADDRESSBAR"]=1,t[e[2]="BOOKMARK"]=2,t[e[3]="SEARCHWINDOW"]=3,
t[e[4]="JAVASCRIPT"]=4,
t[e[5]="REDIRECT"]=5,t[e[6]="HOMEPAGE"]=6,t[e[7]="RELOAD"]=7,
t[e[8]="STEPBACK"]=8,
t[e[9]="SMS_KNOW_CONTACT"]=9,t[e[10]="SMS_UNKNOWN_CONTACT"]=10,
t[e[11]="SMS_UNDEFINED_CONTACT"]=11,
t[e[12]="FORM"]=12,t[e[13]="APPLICATION"]=13,
t[e[14]="SESSION_RESTORE"]=14,t[e[15]="ANCHOR"]=15,
t[e[16]="HISTORY_STATE"]=16,t[e[9999]="OTHER"]=9999,
t
}(),e.EventType=function(){
const e={},t=Object.create(e)
return t[e[0]="CLICK"]=0,t[e[1]="FRESHOPEN"]=1,t[e[2]="REOPEN"]=2,t[e[3]="TABFOCUS"]=3,
t[e[4]="SERVER_REDIRECT"]=4,
t[e[5]="AJAX"]=5,t[e[6]="TABCLOSE"]=6,t[e[7]="WINDOWCLOSE"]=7,
t[e[8]="SERP"]=8,t[e[9]="WEBSHIELD"]=9,
t
}(),e.Client=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.id=null,e.prototype.type=1,e.prototype.browserExtInfo=null,e.prototype.messageClientInfo=null,
e.prototype.browserCleanUpInfo=null,
e.prototype.amsInfo=null,e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.id&&e.hasOwnProperty("id")&&pa.com.avast.cloud.webrep.proto.AvastIdentity.encode(e.id,t.uint32(10).fork()).ldelim(),
null!=e.type&&e.hasOwnProperty("type")&&t.uint32(16).int32(e.type),
null!=e.browserExtInfo&&e.hasOwnProperty("browserExtInfo")&&pa.com.avast.cloud.webrep.proto.BrowserExtInfo.encode(e.browserExtInfo,t.uint32(26).fork()).ldelim(),
null!=e.messageClientInfo&&e.hasOwnProperty("messageClientInfo")&&pa.com.avast.cloud.webrep.proto.MessageClientInfo.encode(e.messageClientInfo,t.uint32(34).fork()).ldelim(),
null!=e.browserCleanUpInfo&&e.hasOwnProperty("browserCleanUpInfo")&&pa.com.avast.cloud.webrep.proto.BrowserCleanUpInfo.encode(e.browserCleanUpInfo,t.uint32(42).fork()).ldelim(),
null!=e.amsInfo&&e.hasOwnProperty("amsInfo")&&pa.com.avast.cloud.webrep.proto.AvastMobileSecurityInfo.encode(e.amsInfo,t.uint32(50).fork()).ldelim(),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.Client
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.id=pa.com.avast.cloud.webrep.proto.AvastIdentity.decode(e,e.uint32())
break
case 2:
i.type=e.int32()
break
case 3:
i.browserExtInfo=pa.com.avast.cloud.webrep.proto.BrowserExtInfo.decode(e,e.uint32())
break
case 4:
i.messageClientInfo=pa.com.avast.cloud.webrep.proto.MessageClientInfo.decode(e,e.uint32())
break
case 5:
i.browserCleanUpInfo=pa.com.avast.cloud.webrep.proto.BrowserCleanUpInfo.decode(e,e.uint32())
break
case 6:
i.amsInfo=pa.com.avast.cloud.webrep.proto.AvastMobileSecurityInfo.decode(e,e.uint32())
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.id&&e.hasOwnProperty("id")){
let t=pa.com.avast.cloud.webrep.proto.AvastIdentity.verify(e.id)
if(t){
return"id."+t
}
}
if(null!=e.type&&e.hasOwnProperty("type")){
switch(e.type){
default:
return"type: enum value expected"
case 1:
case 2:
case 3:
case 4:
case 5:
case 6:
case 7:
case 8:
}
}
if(null!=e.browserExtInfo&&e.hasOwnProperty("browserExtInfo")){
let t=pa.com.avast.cloud.webrep.proto.BrowserExtInfo.verify(e.browserExtInfo)
if(t){
return"browserExtInfo."+t
}
}
if(null!=e.messageClientInfo&&e.hasOwnProperty("messageClientInfo")){
let t=pa.com.avast.cloud.webrep.proto.MessageClientInfo.verify(e.messageClientInfo)
if(t){
return"messageClientInfo."+t
}
}
if(null!=e.browserCleanUpInfo&&e.hasOwnProperty("browserCleanUpInfo")){
let t=pa.com.avast.cloud.webrep.proto.BrowserCleanUpInfo.verify(e.browserCleanUpInfo)
if(t){
return"browserCleanUpInfo."+t
}
}
if(null!=e.amsInfo&&e.hasOwnProperty("amsInfo")){
let t=pa.com.avast.cloud.webrep.proto.AvastMobileSecurityInfo.verify(e.amsInfo)
if(t){
return"amsInfo."+t
}
}
return null
},e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.Client){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.Client
if(null!=e.id){
if("object"!=typeof e.id){
throw TypeError(".com.avast.cloud.webrep.proto.Client.id: object expected")
}
t.id=pa.com.avast.cloud.webrep.proto.AvastIdentity.fromObject(e.id)
}
switch(e.type){
case"TEST":
case 1:
t.type=1
break
case"AVAST":
case 2:
t.type=2
break
case"BROWSER_EXT":
case 3:
t.type=3
break
case"MESSAGE":
case 4:
t.type=4
break
case"PARTNER":
case 5:
t.type=5
break
case"WEBSITE":
case 6:
t.type=6
break
case"BROWSER_CLEANUP":
case 7:
t.type=7
break
case"BACKEND":
case 8:
t.type=8
}
if(null!=e.browserExtInfo){
if("object"!=typeof e.browserExtInfo){
throw TypeError(".com.avast.cloud.webrep.proto.Client.browserExtInfo: object expected")
}
t.browserExtInfo=pa.com.avast.cloud.webrep.proto.BrowserExtInfo.fromObject(e.browserExtInfo)
}
if(null!=e.messageClientInfo){
if("object"!=typeof e.messageClientInfo){
throw TypeError(".com.avast.cloud.webrep.proto.Client.messageClientInfo: object expected")
}
t.messageClientInfo=pa.com.avast.cloud.webrep.proto.MessageClientInfo.fromObject(e.messageClientInfo)
}
if(null!=e.browserCleanUpInfo){
if("object"!=typeof e.browserCleanUpInfo){
throw TypeError(".com.avast.cloud.webrep.proto.Client.browserCleanUpInfo: object expected")
}
t.browserCleanUpInfo=pa.com.avast.cloud.webrep.proto.BrowserCleanUpInfo.fromObject(e.browserCleanUpInfo)
}
if(null!=e.amsInfo){
if("object"!=typeof e.amsInfo){
throw TypeError(".com.avast.cloud.webrep.proto.Client.amsInfo: object expected")
}
t.amsInfo=pa.com.avast.cloud.webrep.proto.AvastMobileSecurityInfo.fromObject(e.amsInfo)
}
return t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(n.id=null,n.type=t.enums===String?"TEST":1,n.browserExtInfo=null,
n.messageClientInfo=null,
n.browserCleanUpInfo=null,n.amsInfo=null),null!=e.id&&e.hasOwnProperty("id")&&(n.id=pa.com.avast.cloud.webrep.proto.AvastIdentity.toObject(e.id,t)),
null!=e.type&&e.hasOwnProperty("type")&&(n.type=t.enums===String?pa.com.avast.cloud.webrep.proto.Client.CType[e.type]:e.type),
null!=e.browserExtInfo&&e.hasOwnProperty("browserExtInfo")&&(n.browserExtInfo=pa.com.avast.cloud.webrep.proto.BrowserExtInfo.toObject(e.browserExtInfo,t)),
null!=e.messageClientInfo&&e.hasOwnProperty("messageClientInfo")&&(n.messageClientInfo=pa.com.avast.cloud.webrep.proto.MessageClientInfo.toObject(e.messageClientInfo,t)),
null!=e.browserCleanUpInfo&&e.hasOwnProperty("browserCleanUpInfo")&&(n.browserCleanUpInfo=pa.com.avast.cloud.webrep.proto.BrowserCleanUpInfo.toObject(e.browserCleanUpInfo,t)),
null!=e.amsInfo&&e.hasOwnProperty("amsInfo")&&(n.amsInfo=pa.com.avast.cloud.webrep.proto.AvastMobileSecurityInfo.toObject(e.amsInfo,t)),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e.CType=function(){
const e={},t=Object.create(e)
return t[e[1]="TEST"]=1,t[e[2]="AVAST"]=2,t[e[3]="BROWSER_EXT"]=3,t[e[4]="MESSAGE"]=4,
t[e[5]="PARTNER"]=5,
t[e[6]="WEBSITE"]=6,t[e[7]="BROWSER_CLEANUP"]=7,t[e[8]="BACKEND"]=8,
t
}(),e
}(),e.AvastIdentity=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.guid=ca.newBuffer([]),e.prototype.uuid=ca.newBuffer([]),e.prototype.token=ca.newBuffer([]),
e.prototype.auid=ca.newBuffer([]),
e.prototype.userid=ca.newBuffer([]),e.prototype.hwid=ca.newBuffer([]),
e.prototype.android_advertisement_id=ca.newBuffer([]),
e.prototype.plugin_guid=ca.newBuffer([]),
e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.guid&&e.hasOwnProperty("guid")&&t.uint32(10).bytes(e.guid),
null!=e.uuid&&e.hasOwnProperty("uuid")&&t.uint32(18).bytes(e.uuid),
null!=e.token&&e.hasOwnProperty("token")&&t.uint32(26).bytes(e.token),
null!=e.auid&&e.hasOwnProperty("auid")&&t.uint32(34).bytes(e.auid),
null!=e.userid&&e.hasOwnProperty("userid")&&t.uint32(42).bytes(e.userid),
null!=e.hwid&&e.hasOwnProperty("hwid")&&t.uint32(50).bytes(e.hwid),
null!=e.android_advertisement_id&&e.hasOwnProperty("android_advertisement_id")&&t.uint32(58).bytes(e.android_advertisement_id),
null!=e.plugin_guid&&e.hasOwnProperty("plugin_guid")&&t.uint32(66).bytes(e.plugin_guid),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.AvastIdentity
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.guid=e.bytes()
break
case 2:
i.uuid=e.bytes()
break
case 3:
i.token=e.bytes()
break
case 4:
i.auid=e.bytes()
break
case 5:
i.userid=e.bytes()
break
case 6:
i.hwid=e.bytes()
break
case 7:
i.android_advertisement_id=e.bytes()
break
case 8:
i.plugin_guid=e.bytes()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
return"object"!=typeof e||null===e?"object expected":null!=e.guid&&e.hasOwnProperty("guid")&&!(e.guid&&"number"==typeof e.guid.length||ca.isString(e.guid))?"guid: buffer expected":null!=e.uuid&&e.hasOwnProperty("uuid")&&!(e.uuid&&"number"==typeof e.uuid.length||ca.isString(e.uuid))?"uuid: buffer expected":null!=e.token&&e.hasOwnProperty("token")&&!(e.token&&"number"==typeof e.token.length||ca.isString(e.token))?"token: buffer expected":null!=e.auid&&e.hasOwnProperty("auid")&&!(e.auid&&"number"==typeof e.auid.length||ca.isString(e.auid))?"auid: buffer expected":null!=e.userid&&e.hasOwnProperty("userid")&&!(e.userid&&"number"==typeof e.userid.length||ca.isString(e.userid))?"userid: buffer expected":null!=e.hwid&&e.hasOwnProperty("hwid")&&!(e.hwid&&"number"==typeof e.hwid.length||ca.isString(e.hwid))?"hwid: buffer expected":null!=e.android_advertisement_id&&e.hasOwnProperty("android_advertisement_id")&&!(e.android_advertisement_id&&"number"==typeof e.android_advertisement_id.length||ca.isString(e.android_advertisement_id))?"android_advertisement_id: buffer expected":null!=e.plugin_guid&&e.hasOwnProperty("plugin_guid")&&!(e.plugin_guid&&"number"==typeof e.plugin_guid.length||ca.isString(e.plugin_guid))?"plugin_guid: buffer expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.AvastIdentity){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.AvastIdentity
return null!=e.guid&&("string"==typeof e.guid?ca.base64.decode(e.guid,t.guid=ca.newBuffer(ca.base64.length(e.guid)),0):e.guid.length&&(t.guid=e.guid)),
null!=e.uuid&&("string"==typeof e.uuid?ca.base64.decode(e.uuid,t.uuid=ca.newBuffer(ca.base64.length(e.uuid)),0):e.uuid.length&&(t.uuid=e.uuid)),
null!=e.token&&("string"==typeof e.token?ca.base64.decode(e.token,t.token=ca.newBuffer(ca.base64.length(e.token)),0):e.token.length&&(t.token=e.token)),
null!=e.auid&&("string"==typeof e.auid?ca.base64.decode(e.auid,t.auid=ca.newBuffer(ca.base64.length(e.auid)),0):e.auid.length&&(t.auid=e.auid)),
null!=e.userid&&("string"==typeof e.userid?ca.base64.decode(e.userid,t.userid=ca.newBuffer(ca.base64.length(e.userid)),0):e.userid.length&&(t.userid=e.userid)),
null!=e.hwid&&("string"==typeof e.hwid?ca.base64.decode(e.hwid,t.hwid=ca.newBuffer(ca.base64.length(e.hwid)),0):e.hwid.length&&(t.hwid=e.hwid)),
null!=e.android_advertisement_id&&("string"==typeof e.android_advertisement_id?ca.base64.decode(e.android_advertisement_id,t.android_advertisement_id=ca.newBuffer(ca.base64.length(e.android_advertisement_id)),0):e.android_advertisement_id.length&&(t.android_advertisement_id=e.android_advertisement_id)),
null!=e.plugin_guid&&("string"==typeof e.plugin_guid?ca.base64.decode(e.plugin_guid,t.plugin_guid=ca.newBuffer(ca.base64.length(e.plugin_guid)),0):e.plugin_guid.length&&(t.plugin_guid=e.plugin_guid)),
t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(t.bytes===String?n.guid="":(n.guid=[],t.bytes!==Array&&(n.guid=ca.newBuffer(n.guid))),
t.bytes===String?n.uuid="":(n.uuid=[],
t.bytes!==Array&&(n.uuid=ca.newBuffer(n.uuid))),
t.bytes===String?n.token="":(n.token=[],
t.bytes!==Array&&(n.token=ca.newBuffer(n.token))),
t.bytes===String?n.auid="":(n.auid=[],
t.bytes!==Array&&(n.auid=ca.newBuffer(n.auid))),
t.bytes===String?n.userid="":(n.userid=[],
t.bytes!==Array&&(n.userid=ca.newBuffer(n.userid))),
t.bytes===String?n.hwid="":(n.hwid=[],
t.bytes!==Array&&(n.hwid=ca.newBuffer(n.hwid))),
t.bytes===String?n.android_advertisement_id="":(n.android_advertisement_id=[],
t.bytes!==Array&&(n.android_advertisement_id=ca.newBuffer(n.android_advertisement_id))),
t.bytes===String?n.plugin_guid="":(n.plugin_guid=[],
t.bytes!==Array&&(n.plugin_guid=ca.newBuffer(n.plugin_guid)))),
null!=e.guid&&e.hasOwnProperty("guid")&&(n.guid=t.bytes===String?ca.base64.encode(e.guid,0,e.guid.length):t.bytes===Array?Array.prototype.slice.call(e.guid):e.guid),
null!=e.uuid&&e.hasOwnProperty("uuid")&&(n.uuid=t.bytes===String?ca.base64.encode(e.uuid,0,e.uuid.length):t.bytes===Array?Array.prototype.slice.call(e.uuid):e.uuid),
null!=e.token&&e.hasOwnProperty("token")&&(n.token=t.bytes===String?ca.base64.encode(e.token,0,e.token.length):t.bytes===Array?Array.prototype.slice.call(e.token):e.token),
null!=e.auid&&e.hasOwnProperty("auid")&&(n.auid=t.bytes===String?ca.base64.encode(e.auid,0,e.auid.length):t.bytes===Array?Array.prototype.slice.call(e.auid):e.auid),
null!=e.userid&&e.hasOwnProperty("userid")&&(n.userid=t.bytes===String?ca.base64.encode(e.userid,0,e.userid.length):t.bytes===Array?Array.prototype.slice.call(e.userid):e.userid),
null!=e.hwid&&e.hasOwnProperty("hwid")&&(n.hwid=t.bytes===String?ca.base64.encode(e.hwid,0,e.hwid.length):t.bytes===Array?Array.prototype.slice.call(e.hwid):e.hwid),
null!=e.android_advertisement_id&&e.hasOwnProperty("android_advertisement_id")&&(n.android_advertisement_id=t.bytes===String?ca.base64.encode(e.android_advertisement_id,0,e.android_advertisement_id.length):t.bytes===Array?Array.prototype.slice.call(e.android_advertisement_id):e.android_advertisement_id),
null!=e.plugin_guid&&e.hasOwnProperty("plugin_guid")&&(n.plugin_guid=t.bytes===String?ca.base64.encode(e.plugin_guid,0,e.plugin_guid.length):t.bytes===Array?Array.prototype.slice.call(e.plugin_guid):e.plugin_guid),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.BrowserExtInfo=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.extensionType=1,e.prototype.extensionVersion=0,e.prototype.browserType=0,
e.prototype.browserVersion="",
e.prototype.os=1,e.prototype.osVersion="",e.prototype.dataVersion=0,
e.prototype.avVersion="",
e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.extensionType&&e.hasOwnProperty("extensionType")&&t.uint32(8).int32(e.extensionType),
null!=e.extensionVersion&&e.hasOwnProperty("extensionVersion")&&t.uint32(16).sint32(e.extensionVersion),
null!=e.browserType&&e.hasOwnProperty("browserType")&&t.uint32(24).int32(e.browserType),
null!=e.browserVersion&&e.hasOwnProperty("browserVersion")&&t.uint32(34).string(e.browserVersion),
null!=e.os&&e.hasOwnProperty("os")&&t.uint32(40).int32(e.os),
null!=e.osVersion&&e.hasOwnProperty("osVersion")&&t.uint32(50).string(e.osVersion),
null!=e.dataVersion&&e.hasOwnProperty("dataVersion")&&t.uint32(56).sint32(e.dataVersion),
null!=e.avVersion&&e.hasOwnProperty("avVersion")&&t.uint32(66).string(e.avVersion),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.BrowserExtInfo
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.extensionType=e.int32()
break
case 2:
i.extensionVersion=e.sint32()
break
case 3:
i.browserType=e.int32()
break
case 4:
i.browserVersion=e.string()
break
case 5:
i.os=e.int32()
break
case 6:
i.osVersion=e.string()
break
case 7:
i.dataVersion=e.sint32()
break
case 8:
i.avVersion=e.string()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.extensionType&&e.hasOwnProperty("extensionType")){
switch(e.extensionType){
default:
return"extensionType: enum value expected"
case 1:
case 2:
case 3:
case 4:
case 5:
case 6:
}
}
if(null!=e.extensionVersion&&e.hasOwnProperty("extensionVersion")&&!ca.isInteger(e.extensionVersion)){
return"extensionVersion: integer expected"
}
if(null!=e.browserType&&e.hasOwnProperty("browserType")){
switch(e.browserType){
default:
return"browserType: enum value expected"
case 0:
case 1:
case 2:
case 3:
case 4:
case 5:
case 6:
case 7:
case 8:
case 9:
case 10:
case 11:
case 12:
case 13:
case 14:
case 15:
case 16:
case 17:
case 18:
case 19:
case 20:
case 21:
}
}
if(null!=e.browserVersion&&e.hasOwnProperty("browserVersion")&&!ca.isString(e.browserVersion)){
return"browserVersion: string expected"
}
if(null!=e.os&&e.hasOwnProperty("os")){
switch(e.os){
default:
return"os: enum value expected"
case 1:
case 2:
case 3:
case 4:
case 5:
}
}
return null!=e.osVersion&&e.hasOwnProperty("osVersion")&&!ca.isString(e.osVersion)?"osVersion: string expected":null!=e.dataVersion&&e.hasOwnProperty("dataVersion")&&!ca.isInteger(e.dataVersion)?"dataVersion: integer expected":null!=e.avVersion&&e.hasOwnProperty("avVersion")&&!ca.isString(e.avVersion)?"avVersion: string expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.BrowserExtInfo){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.BrowserExtInfo
switch(e.extensionType){
case"AOS":
case 1:
t.extensionType=1
break
case"SP":
case 2:
t.extensionType=2
break
case"AOSP":
case 3:
t.extensionType=3
break
case"ABOS":
case 4:
t.extensionType=4
break
case"SPAP":
case 5:
t.extensionType=5
break
case"AOS_SZ":
case 6:
t.extensionType=6
}
switch(null!=e.extensionVersion&&(t.extensionVersion=0|e.extensionVersion),e.browserType){
case"CHROME":
case 0:
t.browserType=0
break
case"FIREFOX":
case 1:
t.browserType=1
break
case"IE":
case 2:
t.browserType=2
break
case"OPERA":
case 3:
t.browserType=3
break
case"SAFAR":
case 4:
t.browserType=4
break
case"PRODUCTS":
case 5:
t.browserType=5
break
case"VIDEO":
case 6:
t.browserType=6
break
case"STOCK":
case 7:
t.browserType=7
break
case"STOCK_JB":
case 8:
t.browserType=8
break
case"DOLPHIN_MINI":
case 9:
t.browserType=9
break
case"DOLPHIN":
case 10:
t.browserType=10
break
case"SILK":
case 11:
t.browserType=11
break
case"BOAT_MINI":
case 12:
t.browserType=12
break
case"BOAT":
case 13:
t.browserType=13
break
case"CHROME_M":
case 14:
t.browserType=14
break
case"MS_EDGE":
case 15:
t.browserType=15
break
case"SAFEZONE":
case 16:
t.browserType=16
break
case"DOLPHIN_TUNNY":
case 17:
t.browserType=17
break
case"OPERA_MINI":
case 18:
t.browserType=18
break
case"UC_BROWSER":
case 19:
t.browserType=19
break
case"SBROWSER":
case 20:
t.browserType=20
break
case"AVG_SECURE_SEARCH":
case 21:
t.browserType=21
}
switch(null!=e.browserVersion&&(t.browserVersion=String(e.browserVersion)),e.os){
case"WIN":
case 1:
t.os=1
break
case"MAC":
case 2:
t.os=2
break
case"LINUX":
case 3:
t.os=3
break
case"ANDROID":
case 4:
t.os=4
break
case"IOS":
case 5:
t.os=5
}
return null!=e.osVersion&&(t.osVersion=String(e.osVersion)),null!=e.dataVersion&&(t.dataVersion=0|e.dataVersion),
null!=e.avVersion&&(t.avVersion=String(e.avVersion)),
t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(n.extensionType=t.enums===String?"AOS":1,n.extensionVersion=0,
n.browserType=t.enums===String?"CHROME":0,
n.browserVersion="",n.os=t.enums===String?"WIN":1,
n.osVersion="",n.dataVersion=0,
n.avVersion=""),null!=e.extensionType&&e.hasOwnProperty("extensionType")&&(n.extensionType=t.enums===String?pa.com.avast.cloud.webrep.proto.ExtensionType[e.extensionType]:e.extensionType),
null!=e.extensionVersion&&e.hasOwnProperty("extensionVersion")&&(n.extensionVersion=e.extensionVersion),
null!=e.browserType&&e.hasOwnProperty("browserType")&&(n.browserType=t.enums===String?pa.com.avast.cloud.webrep.proto.BrowserType[e.browserType]:e.browserType),
null!=e.browserVersion&&e.hasOwnProperty("browserVersion")&&(n.browserVersion=e.browserVersion),
null!=e.os&&e.hasOwnProperty("os")&&(n.os=t.enums===String?pa.com.avast.cloud.webrep.proto.OS[e.os]:e.os),
null!=e.osVersion&&e.hasOwnProperty("osVersion")&&(n.osVersion=e.osVersion),
null!=e.dataVersion&&e.hasOwnProperty("dataVersion")&&(n.dataVersion=e.dataVersion),
null!=e.avVersion&&e.hasOwnProperty("avVersion")&&(n.avVersion=e.avVersion),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.MessageClientInfo=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.os=1,e.prototype.osVersion="",e.prototype.dataVersion=0,e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.os&&e.hasOwnProperty("os")&&t.uint32(8).int32(e.os),
null!=e.osVersion&&e.hasOwnProperty("osVersion")&&t.uint32(18).string(e.osVersion),
null!=e.dataVersion&&e.hasOwnProperty("dataVersion")&&t.uint32(24).sint32(e.dataVersion),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.MessageClientInfo
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.os=e.int32()
break
case 2:
i.osVersion=e.string()
break
case 3:
i.dataVersion=e.sint32()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.os&&e.hasOwnProperty("os")){
switch(e.os){
default:
return"os: enum value expected"
case 1:
case 2:
case 3:
case 4:
case 5:
}
}
return null!=e.osVersion&&e.hasOwnProperty("osVersion")&&!ca.isString(e.osVersion)?"osVersion: string expected":null!=e.dataVersion&&e.hasOwnProperty("dataVersion")&&!ca.isInteger(e.dataVersion)?"dataVersion: integer expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.MessageClientInfo){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.MessageClientInfo
switch(e.os){
case"WIN":
case 1:
t.os=1
break
case"MAC":
case 2:
t.os=2
break
case"LINUX":
case 3:
t.os=3
break
case"ANDROID":
case 4:
t.os=4
break
case"IOS":
case 5:
t.os=5
}
return null!=e.osVersion&&(t.osVersion=String(e.osVersion)),null!=e.dataVersion&&(t.dataVersion=0|e.dataVersion),
t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(n.os=t.enums===String?"WIN":1,n.osVersion="",n.dataVersion=0),
null!=e.os&&e.hasOwnProperty("os")&&(n.os=t.enums===String?pa.com.avast.cloud.webrep.proto.OS[e.os]:e.os),
null!=e.osVersion&&e.hasOwnProperty("osVersion")&&(n.osVersion=e.osVersion),
null!=e.dataVersion&&e.hasOwnProperty("dataVersion")&&(n.dataVersion=e.dataVersion),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.BrowserCleanUpInfo=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.productLanguage="",e.prototype.osLanguage="",e.prototype.os=1,
e.prototype.osDetail="",
e.prototype.location="",e.prototype.productType=0,e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.productLanguage&&e.hasOwnProperty("productLanguage")&&t.uint32(10).string(e.productLanguage),
null!=e.osLanguage&&e.hasOwnProperty("osLanguage")&&t.uint32(18).string(e.osLanguage),
null!=e.os&&e.hasOwnProperty("os")&&t.uint32(24).int32(e.os),
null!=e.osDetail&&e.hasOwnProperty("osDetail")&&t.uint32(34).string(e.osDetail),
null!=e.location&&e.hasOwnProperty("location")&&t.uint32(42).string(e.location),
null!=e.productType&&e.hasOwnProperty("productType")&&t.uint32(48).int32(e.productType),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.BrowserCleanUpInfo
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.productLanguage=e.string()
break
case 2:
i.osLanguage=e.string()
break
case 3:
i.os=e.int32()
break
case 4:
i.osDetail=e.string()
break
case 5:
i.location=e.string()
break
case 6:
i.productType=e.int32()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.productLanguage&&e.hasOwnProperty("productLanguage")&&!ca.isString(e.productLanguage)){
return"productLanguage: string expected"
}
if(null!=e.osLanguage&&e.hasOwnProperty("osLanguage")&&!ca.isString(e.osLanguage)){
return"osLanguage: string expected"
}
if(null!=e.os&&e.hasOwnProperty("os")){
switch(e.os){
default:
return"os: enum value expected"
case 1:
case 2:
case 3:
case 4:
case 5:
}
}
return null!=e.osDetail&&e.hasOwnProperty("osDetail")&&!ca.isString(e.osDetail)?"osDetail: string expected":null!=e.location&&e.hasOwnProperty("location")&&!ca.isString(e.location)?"location: string expected":null!=e.productType&&e.hasOwnProperty("productType")&&!ca.isInteger(e.productType)?"productType: integer expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.BrowserCleanUpInfo){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.BrowserCleanUpInfo
switch(null!=e.productLanguage&&(t.productLanguage=String(e.productLanguage)),null!=e.osLanguage&&(t.osLanguage=String(e.osLanguage)),
e.os){
case"WIN":
case 1:
t.os=1
break
case"MAC":
case 2:
t.os=2
break
case"LINUX":
case 3:
t.os=3
break
case"ANDROID":
case 4:
t.os=4
break
case"IOS":
case 5:
t.os=5
}
return null!=e.osDetail&&(t.osDetail=String(e.osDetail)),null!=e.location&&(t.location=String(e.location)),
null!=e.productType&&(t.productType=0|e.productType),
t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(n.productLanguage="",n.osLanguage="",n.os=t.enums===String?"WIN":1,
n.osDetail="",
n.location="",n.productType=0),null!=e.productLanguage&&e.hasOwnProperty("productLanguage")&&(n.productLanguage=e.productLanguage),
null!=e.osLanguage&&e.hasOwnProperty("osLanguage")&&(n.osLanguage=e.osLanguage),
null!=e.os&&e.hasOwnProperty("os")&&(n.os=t.enums===String?pa.com.avast.cloud.webrep.proto.OS[e.os]:e.os),
null!=e.osDetail&&e.hasOwnProperty("osDetail")&&(n.osDetail=e.osDetail),
null!=e.location&&e.hasOwnProperty("location")&&(n.location=e.location),
null!=e.productType&&e.hasOwnProperty("productType")&&(n.productType=e.productType),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.AvastMobileSecurityInfo=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.versionCode=ca.Long?ca.Long.fromBits(0,0,!1):0,e.prototype.versionName="",
e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.versionCode&&e.hasOwnProperty("versionCode")&&t.uint32(8).int64(e.versionCode),
null!=e.versionName&&e.hasOwnProperty("versionName")&&t.uint32(18).string(e.versionName),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.AvastMobileSecurityInfo
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.versionCode=e.int64()
break
case 2:
i.versionName=e.string()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
return"object"!=typeof e||null===e?"object expected":null!=e.versionCode&&e.hasOwnProperty("versionCode")&&!(ca.isInteger(e.versionCode)||e.versionCode&&ca.isInteger(e.versionCode.low)&&ca.isInteger(e.versionCode.high))?"versionCode: integer|Long expected":null!=e.versionName&&e.hasOwnProperty("versionName")&&!ca.isString(e.versionName)?"versionName: string expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.AvastMobileSecurityInfo){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.AvastMobileSecurityInfo
return null!=e.versionCode&&(ca.Long?(t.versionCode=ca.Long.fromValue(e.versionCode)).unsigned=!1:"string"==typeof e.versionCode?t.versionCode=parseInt(e.versionCode,10):"number"==typeof e.versionCode?t.versionCode=e.versionCode:"object"==typeof e.versionCode&&(t.versionCode=new ca.LongBits(e.versionCode.low>>>0,e.versionCode.high>>>0).toNumber())),
null!=e.versionName&&(t.versionName=String(e.versionName)),
t
},e.toObject=function(e,t){
t||(t={})
let n={}
if(t.defaults){
if(ca.Long){
let e=new ca.Long(0,0,!1)
n.versionCode=t.longs===String?e.toString():t.longs===Number?e.toNumber():e
}else{
n.versionCode=t.longs===String?"0":0
}
n.versionName=""
}
return null!=e.versionCode&&e.hasOwnProperty("versionCode")&&("number"==typeof e.versionCode?n.versionCode=t.longs===String?String(e.versionCode):e.versionCode:n.versionCode=t.longs===String?ca.Long.prototype.toString.call(e.versionCode):t.longs===Number?new ca.LongBits(e.versionCode.low>>>0,e.versionCode.high>>>0).toNumber():e.versionCode),
null!=e.versionName&&e.hasOwnProperty("versionName")&&(n.versionName=e.versionName),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.Categories=function(){
function e(e){
if(this.matches=[],e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.matches=ca.emptyArray,e.create=function(t){
return new e(t)
},e.encode=function(e,t){
if(t||(t=la.create()),null!=e.matches&&e.matches.length){
for(let n=0;n<e.matches.length;++n){
pa.com.avast.cloud.webrep.proto.CategoryMatch.encode(e.matches[n],t.uint32(10).fork()).ldelim()
}
}
return t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.Categories
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.matches&&i.matches.length||(i.matches=[]),i.matches.push(pa.com.avast.cloud.webrep.proto.CategoryMatch.decode(e,e.uint32()))
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.matches&&e.hasOwnProperty("matches")){
if(!Array.isArray(e.matches)){
return"matches: array expected"
}
for(let t=0;t<e.matches.length;++t){
let n=pa.com.avast.cloud.webrep.proto.CategoryMatch.verify(e.matches[t])
if(n){
return"matches."+n
}
}
}
return null
},e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.Categories){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.Categories
if(e.matches){
if(!Array.isArray(e.matches)){
throw TypeError(".com.avast.cloud.webrep.proto.Categories.matches: array expected")
}
t.matches=[]
for(let n=0;n<e.matches.length;++n){
if("object"!=typeof e.matches[n]){
throw TypeError(".com.avast.cloud.webrep.proto.Categories.matches: object expected")
}
t.matches[n]=pa.com.avast.cloud.webrep.proto.CategoryMatch.fromObject(e.matches[n])
}
}
return t
},e.toObject=function(e,t){
t||(t={})
let n={}
if((t.arrays||t.defaults)&&(n.matches=[]),e.matches&&e.matches.length){
n.matches=[]
for(let i=0;i<e.matches.length;++i){
n.matches[i]=pa.com.avast.cloud.webrep.proto.CategoryMatch.toObject(e.matches[i],t)
}
}
return n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.Ajax=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.collect=!1,e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.collect&&e.hasOwnProperty("collect")&&t.uint32(8).bool(e.collect),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.Ajax
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.collect=e.bool()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
return"object"!=typeof e||null===e?"object expected":null!=e.collect&&e.hasOwnProperty("collect")&&"boolean"!=typeof e.collect?"collect: boolean expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.Ajax){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.Ajax
return null!=e.collect&&(t.collect=Boolean(e.collect)),t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(n.collect=!1),null!=e.collect&&e.hasOwnProperty("collect")&&(n.collect=e.collect),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.CategoryMatch=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.type=0,e.prototype.category=1,e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.type&&e.hasOwnProperty("type")&&t.uint32(8).int32(e.type),
null!=e.category&&e.hasOwnProperty("category")&&t.uint32(16).int32(e.category),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.CategoryMatch
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.type=e.int32()
break
case 2:
i.category=e.int32()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.type&&e.hasOwnProperty("type")){
switch(e.type){
default:
return"type: enum value expected"
case 0:
}
}
if(null!=e.category&&e.hasOwnProperty("category")){
switch(e.category){
default:
return"category: enum value expected"
case 1:
case 2:
case 3:
case 4:
case 5:
case 6:
case 7:
case 8:
case 9:
}
}
return null
},e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.CategoryMatch){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.CategoryMatch
switch(e.type){
case"DOMAIN":
case 0:
t.type=0
}
switch(e.category){
case"PORNOGRAPHY":
case 1:
t.category=1
break
case"BANKING":
case 2:
t.category=2
break
case"SHOPPING":
case 3:
t.category=3
break
case"SOCIAL":
case 4:
t.category=4
break
case"VIOLENCE":
case 5:
t.category=5
break
case"GAMBLING":
case 6:
t.category=6
break
case"DRUGS":
case 7:
t.category=7
break
case"ILLEGAL":
case 8:
t.category=8
break
case"DATING":
case 9:
t.category=9
}
return t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(n.type=t.enums===String?"DOMAIN":0,n.category=t.enums===String?"PORNOGRAPHY":1),
null!=e.type&&e.hasOwnProperty("type")&&(n.type=t.enums===String?pa.com.avast.cloud.webrep.proto.CategoryMatchType[e.type]:e.type),
null!=e.category&&e.hasOwnProperty("category")&&(n.category=t.enums===String?pa.com.avast.cloud.webrep.proto.Category[e.category]:e.category),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.CategoryMatchType=function(){
const e={},t=Object.create(e)
return t[e[0]="DOMAIN"]=0,t
}(),e.Category=function(){
const e={},t=Object.create(e)
return t[e[1]="PORNOGRAPHY"]=1,t[e[2]="BANKING"]=2,t[e[3]="SHOPPING"]=3,t[e[4]="SOCIAL"]=4,
t[e[5]="VIOLENCE"]=5,
t[e[6]="GAMBLING"]=6,t[e[7]="DRUGS"]=7,t[e[8]="ILLEGAL"]=8,
t[e[9]="DATING"]=9,t
}(),e.BrowserType=function(){
const e={},t=Object.create(e)
return t[e[0]="CHROME"]=0,t[e[1]="FIREFOX"]=1,t[e[2]="IE"]=2,t[e[3]="OPERA"]=3,t[e[4]="SAFAR"]=4,
t[e[5]="PRODUCTS"]=5,
t[e[6]="VIDEO"]=6,t[e[7]="STOCK"]=7,t[e[8]="STOCK_JB"]=8,t[e[9]="DOLPHIN_MINI"]=9,
t[e[10]="DOLPHIN"]=10,
t[e[11]="SILK"]=11,t[e[12]="BOAT_MINI"]=12,t[e[13]="BOAT"]=13,
t[e[14]="CHROME_M"]=14,
t[e[15]="MS_EDGE"]=15,t[e[16]="SAFEZONE"]=16,t[e[17]="DOLPHIN_TUNNY"]=17,
t[e[18]="OPERA_MINI"]=18,
t[e[19]="UC_BROWSER"]=19,t[e[20]="SBROWSER"]=20,t[e[21]="AVG_SECURE_SEARCH"]=21,
t
}(),e.OS=function(){
const e={},t=Object.create(e)
return t[e[1]="WIN"]=1,t[e[2]="MAC"]=2,t[e[3]="LINUX"]=3,t[e[4]="ANDROID"]=4,t[e[5]="IOS"]=5,
t
}(),e.ExtensionType=function(){
const e={},t=Object.create(e)
return t[e[1]="AOS"]=1,t[e[2]="SP"]=2,t[e[3]="AOSP"]=3,t[e[4]="ABOS"]=4,t[e[5]="SPAP"]=5,
t[e[6]="AOS_SZ"]=6,
t
}(),e.RefererDetails=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.fakeReferer="",e.prototype.windowNum=0,e.prototype.tabNum=0,
e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.fakeReferer&&e.hasOwnProperty("fakeReferer")&&t.uint32(10).string(e.fakeReferer),
null!=e.windowNum&&e.hasOwnProperty("windowNum")&&t.uint32(16).sint32(e.windowNum),
null!=e.tabNum&&e.hasOwnProperty("tabNum")&&t.uint32(24).sint32(e.tabNum),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.RefererDetails
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.fakeReferer=e.string()
break
case 2:
i.windowNum=e.sint32()
break
case 3:
i.tabNum=e.sint32()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
return"object"!=typeof e||null===e?"object expected":null!=e.fakeReferer&&e.hasOwnProperty("fakeReferer")&&!ca.isString(e.fakeReferer)?"fakeReferer: string expected":null!=e.windowNum&&e.hasOwnProperty("windowNum")&&!ca.isInteger(e.windowNum)?"windowNum: integer expected":null!=e.tabNum&&e.hasOwnProperty("tabNum")&&!ca.isInteger(e.tabNum)?"tabNum: integer expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.RefererDetails){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.RefererDetails
return null!=e.fakeReferer&&(t.fakeReferer=String(e.fakeReferer)),null!=e.windowNum&&(t.windowNum=0|e.windowNum),
null!=e.tabNum&&(t.tabNum=0|e.tabNum),
t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(n.fakeReferer="",n.windowNum=0,n.tabNum=0),null!=e.fakeReferer&&e.hasOwnProperty("fakeReferer")&&(n.fakeReferer=e.fakeReferer),
null!=e.windowNum&&e.hasOwnProperty("windowNum")&&(n.windowNum=e.windowNum),
null!=e.tabNum&&e.hasOwnProperty("tabNum")&&(n.tabNum=e.tabNum),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.UpdateRequest=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.pluginType="",e.prototype.pluginVersion="",e.prototype.rulesVersion="",
e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.pluginType&&e.hasOwnProperty("pluginType")&&t.uint32(10).string(e.pluginType),
null!=e.pluginVersion&&e.hasOwnProperty("pluginVersion")&&t.uint32(18).string(e.pluginVersion),
null!=e.rulesVersion&&e.hasOwnProperty("rulesVersion")&&t.uint32(26).string(e.rulesVersion),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.UpdateRequest
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.pluginType=e.string()
break
case 2:
i.pluginVersion=e.string()
break
case 3:
i.rulesVersion=e.string()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
return"object"!=typeof e||null===e?"object expected":null!=e.pluginType&&e.hasOwnProperty("pluginType")&&!ca.isString(e.pluginType)?"pluginType: string expected":null!=e.pluginVersion&&e.hasOwnProperty("pluginVersion")&&!ca.isString(e.pluginVersion)?"pluginVersion: string expected":null!=e.rulesVersion&&e.hasOwnProperty("rulesVersion")&&!ca.isString(e.rulesVersion)?"rulesVersion: string expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.UpdateRequest){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.UpdateRequest
return null!=e.pluginType&&(t.pluginType=String(e.pluginType)),null!=e.pluginVersion&&(t.pluginVersion=String(e.pluginVersion)),
null!=e.rulesVersion&&(t.rulesVersion=String(e.rulesVersion)),
t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(n.pluginType="",n.pluginVersion="",n.rulesVersion=""),null!=e.pluginType&&e.hasOwnProperty("pluginType")&&(n.pluginType=e.pluginType),
null!=e.pluginVersion&&e.hasOwnProperty("pluginVersion")&&(n.pluginVersion=e.pluginVersion),
null!=e.rulesVersion&&e.hasOwnProperty("rulesVersion")&&(n.rulesVersion=e.rulesVersion),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.UpdateResponse=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.pluginUpdate=null,e.prototype.rulesUpdate=null,e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.pluginUpdate&&e.hasOwnProperty("pluginUpdate")&&pa.com.avast.cloud.webrep.proto.PluginUpdate.encode(e.pluginUpdate,t.uint32(10).fork()).ldelim(),
null!=e.rulesUpdate&&e.hasOwnProperty("rulesUpdate")&&pa.com.avast.cloud.webrep.proto.RulesUpdate.encode(e.rulesUpdate,t.uint32(18).fork()).ldelim(),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.UpdateResponse
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.pluginUpdate=pa.com.avast.cloud.webrep.proto.PluginUpdate.decode(e,e.uint32())
break
case 2:
i.rulesUpdate=pa.com.avast.cloud.webrep.proto.RulesUpdate.decode(e,e.uint32())
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.pluginUpdate&&e.hasOwnProperty("pluginUpdate")){
let t=pa.com.avast.cloud.webrep.proto.PluginUpdate.verify(e.pluginUpdate)
if(t){
return"pluginUpdate."+t
}
}
if(null!=e.rulesUpdate&&e.hasOwnProperty("rulesUpdate")){
let t=pa.com.avast.cloud.webrep.proto.RulesUpdate.verify(e.rulesUpdate)
if(t){
return"rulesUpdate."+t
}
}
return null
},e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.UpdateResponse){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.UpdateResponse
if(null!=e.pluginUpdate){
if("object"!=typeof e.pluginUpdate){
throw TypeError(".com.avast.cloud.webrep.proto.UpdateResponse.pluginUpdate: object expected")
}
t.pluginUpdate=pa.com.avast.cloud.webrep.proto.PluginUpdate.fromObject(e.pluginUpdate)
}
if(null!=e.rulesUpdate){
if("object"!=typeof e.rulesUpdate){
throw TypeError(".com.avast.cloud.webrep.proto.UpdateResponse.rulesUpdate: object expected")
}
t.rulesUpdate=pa.com.avast.cloud.webrep.proto.RulesUpdate.fromObject(e.rulesUpdate)
}
return t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(n.pluginUpdate=null,n.rulesUpdate=null),null!=e.pluginUpdate&&e.hasOwnProperty("pluginUpdate")&&(n.pluginUpdate=pa.com.avast.cloud.webrep.proto.PluginUpdate.toObject(e.pluginUpdate,t)),
null!=e.rulesUpdate&&e.hasOwnProperty("rulesUpdate")&&(n.rulesUpdate=pa.com.avast.cloud.webrep.proto.RulesUpdate.toObject(e.rulesUpdate,t)),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.PluginUpdate=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.plyginType="",e.prototype.version="",e.prototype.releaseNotes="",
e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.plyginType&&e.hasOwnProperty("plyginType")&&t.uint32(10).string(e.plyginType),
null!=e.version&&e.hasOwnProperty("version")&&t.uint32(18).string(e.version),
null!=e.releaseNotes&&e.hasOwnProperty("releaseNotes")&&t.uint32(26).string(e.releaseNotes),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.PluginUpdate
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.plyginType=e.string()
break
case 2:
i.version=e.string()
break
case 3:
i.releaseNotes=e.string()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
return"object"!=typeof e||null===e?"object expected":null!=e.plyginType&&e.hasOwnProperty("plyginType")&&!ca.isString(e.plyginType)?"plyginType: string expected":null!=e.version&&e.hasOwnProperty("version")&&!ca.isString(e.version)?"version: string expected":null!=e.releaseNotes&&e.hasOwnProperty("releaseNotes")&&!ca.isString(e.releaseNotes)?"releaseNotes: string expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.PluginUpdate){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.PluginUpdate
return null!=e.plyginType&&(t.plyginType=String(e.plyginType)),null!=e.version&&(t.version=String(e.version)),
null!=e.releaseNotes&&(t.releaseNotes=String(e.releaseNotes)),
t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(n.plyginType="",n.version="",n.releaseNotes=""),null!=e.plyginType&&e.hasOwnProperty("plyginType")&&(n.plyginType=e.plyginType),
null!=e.version&&e.hasOwnProperty("version")&&(n.version=e.version),
null!=e.releaseNotes&&e.hasOwnProperty("releaseNotes")&&(n.releaseNotes=e.releaseNotes),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.RulesUpdate=function(){
function e(e){
if(this.rules=[],e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.version="",e.prototype.rules=ca.emptyArray,e.create=function(t){
return new e(t)
},e.encode=function(e,t){
if(t||(t=la.create()),null!=e.version&&e.hasOwnProperty("version")&&t.uint32(10).string(e.version),
null!=e.rules&&e.rules.length){
for(let n=0;n<e.rules.length;++n){
pa.com.avast.cloud.webrep.proto.Rule.encode(e.rules[n],t.uint32(18).fork()).ldelim()
}
}
return t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.RulesUpdate
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.version=e.string()
break
case 2:
i.rules&&i.rules.length||(i.rules=[]),i.rules.push(pa.com.avast.cloud.webrep.proto.Rule.decode(e,e.uint32()))
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.version&&e.hasOwnProperty("version")&&!ca.isString(e.version)){
return"version: string expected"
}
if(null!=e.rules&&e.hasOwnProperty("rules")){
if(!Array.isArray(e.rules)){
return"rules: array expected"
}
for(let t=0;t<e.rules.length;++t){
let n=pa.com.avast.cloud.webrep.proto.Rule.verify(e.rules[t])
if(n){
return"rules."+n
}
}
}
return null
},e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.RulesUpdate){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.RulesUpdate
if(null!=e.version&&(t.version=String(e.version)),e.rules){
if(!Array.isArray(e.rules)){
throw TypeError(".com.avast.cloud.webrep.proto.RulesUpdate.rules: array expected")
}
t.rules=[]
for(let n=0;n<e.rules.length;++n){
if("object"!=typeof e.rules[n]){
throw TypeError(".com.avast.cloud.webrep.proto.RulesUpdate.rules: object expected")
}
t.rules[n]=pa.com.avast.cloud.webrep.proto.Rule.fromObject(e.rules[n])
}
}
return t
},e.toObject=function(e,t){
t||(t={})
let n={}
if((t.arrays||t.defaults)&&(n.rules=[]),t.defaults&&(n.version=""),null!=e.version&&e.hasOwnProperty("version")&&(n.version=e.version),
e.rules&&e.rules.length){
n.rules=[]
for(let i=0;i<e.rules.length;++i){
n.rules[i]=pa.com.avast.cloud.webrep.proto.Rule.toObject(e.rules[i],t)
}
}
return n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e.Rule=function(){
function e(e){
if(e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.domain="",e.prototype.url="",e.prototype.ignore="",e.prototype.style="",
e.create=function(t){
return new e(t)
},e.encode=function(e,t){
return t||(t=la.create()),null!=e.domain&&e.hasOwnProperty("domain")&&t.uint32(10).string(e.domain),
null!=e.url&&e.hasOwnProperty("url")&&t.uint32(18).string(e.url),
null!=e.ignore&&e.hasOwnProperty("ignore")&&t.uint32(26).string(e.ignore),
null!=e.style&&e.hasOwnProperty("style")&&t.uint32(34).string(e.style),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ua||(e=ua.create(e))
let n=void 0===t?e.len:e.pos+t,i=new pa.com.avast.cloud.webrep.proto.Rule
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.domain=e.string()
break
case 2:
i.url=e.string()
break
case 3:
i.ignore=e.string()
break
case 4:
i.style=e.string()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ua||(e=new ua(e)),this.decode(e,e.uint32())
},e.verify=function(e){
return"object"!=typeof e||null===e?"object expected":null!=e.domain&&e.hasOwnProperty("domain")&&!ca.isString(e.domain)?"domain: string expected":null!=e.url&&e.hasOwnProperty("url")&&!ca.isString(e.url)?"url: string expected":null!=e.ignore&&e.hasOwnProperty("ignore")&&!ca.isString(e.ignore)?"ignore: string expected":null!=e.style&&e.hasOwnProperty("style")&&!ca.isString(e.style)?"style: string expected":null
},
e.fromObject=function(e){
if(e instanceof pa.com.avast.cloud.webrep.proto.Rule){
return e
}
let t=new pa.com.avast.cloud.webrep.proto.Rule
return null!=e.domain&&(t.domain=String(e.domain)),null!=e.url&&(t.url=String(e.url)),
null!=e.ignore&&(t.ignore=String(e.ignore)),
null!=e.style&&(t.style=String(e.style)),
t
},e.toObject=function(e,t){
t||(t={})
let n={}
return t.defaults&&(n.domain="",n.url="",n.ignore="",n.style=""),null!=e.domain&&e.hasOwnProperty("domain")&&(n.domain=e.domain),
null!=e.url&&e.hasOwnProperty("url")&&(n.url=e.url),
null!=e.ignore&&e.hasOwnProperty("ignore")&&(n.ignore=e.ignore),
null!=e.style&&e.hasOwnProperty("style")&&(n.style=e.style),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
}(),e
}(),e
}(),e
}(),e
}(),e
})(),sa.Reader),da=sa.Writer,ha=sa.util,ga=sa.roots.default||(sa.roots.default={})
ga.BrowserType=function(){
const e={},t=Object.create(e)
return t[e[0]="INVALID"]=0,t[e[1]="IE"]=1,t[e[2]="FIREFOX"]=2,t[e[3]="CHROME"]=3,
t[e[4]="OPERA"]=4,
t[e[5]="SAFARI"]=5,t[e[6]="EDGE"]=6,t[e[7]="CHROMIUMEDGE"]=7,t
}(),ga.CommandType=function(){
const e={},t=Object.create(e)
return t[e[1]="ACKNOWLEDGEMENT"]=1,t[e[6]="IS_SAFEZONE_AVAILABLE"]=6,t[e[7]="SWITCH_TO_SAFEZONE"]=7,
t[e[10]="GET_GUIDS"]=10,
t[e[11]="GET_PROPERTIES"]=11,t[e[12]="IS_BANKING_SITE"]=12,
t[e[13]="IS_SAFEZONE_CUSTOM_SITE"]=13,
t[e[14]="SET_PROPERTIES"]=14,t[e[15]="GET_VERSIONS"]=15,
t[e[16]="GET_BCU_DISTRIBUTION_ID"]=16,
t
}()
ga.LocalServerCommandRequest=(()=>{
function e(e){
if(this.params=[],e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.type=1,e.prototype.params=ha.emptyArray,e.prototype.browser=0,
e.create=function(t){
return new e(t)
},e.encode=function(e,t){
if(t||(t=da.create()),null!=e.type&&e.hasOwnProperty("type")&&t.uint32(8).int32(e.type),
null!=e.params&&e.params.length){
for(let n=0;n<e.params.length;++n){
t.uint32(18).bytes(e.params[n])
}
}
return null!=e.browser&&e.hasOwnProperty("browser")&&t.uint32(24).int32(e.browser),
t
},e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ma||(e=ma.create(e))
let n=void 0===t?e.len:e.pos+t,i=new ga.LocalServerCommandRequest
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.type=e.int32()
break
case 2:
i.params&&i.params.length||(i.params=[]),i.params.push(e.bytes())
break
case 3:
i.browser=e.int32()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ma||(e=new ma(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.type&&e.hasOwnProperty("type")){
switch(e.type){
default:
return"type: enum value expected"
case 1:
case 6:
case 7:
case 10:
case 11:
case 12:
case 13:
case 14:
case 15:
case 16:
}
}
if(null!=e.params&&e.hasOwnProperty("params")){
if(!Array.isArray(e.params)){
return"params: array expected"
}
for(let t=0;t<e.params.length;++t){
if(!(e.params[t]&&"number"==typeof e.params[t].length||ha.isString(e.params[t]))){
return"params: buffer[] expected"
}
}
}
if(null!=e.browser&&e.hasOwnProperty("browser")){
switch(e.browser){
default:
return"browser: enum value expected"
case 0:
case 1:
case 2:
case 3:
case 4:
case 5:
}
}
return null
},e.fromObject=function(e){
if(e instanceof ga.LocalServerCommandRequest){
return e
}
let t=new ga.LocalServerCommandRequest
switch(e.type){
case"ACKNOWLEDGEMENT":
case 1:
t.type=1
break
case"IS_SAFEZONE_AVAILABLE":
case 6:
t.type=6
break
case"SWITCH_TO_SAFEZONE":
case 7:
t.type=7
break
case"GET_GUIDS":
case 10:
t.type=10
break
case"GET_PROPERTIES":
case 11:
t.type=11
break
case"IS_BANKING_SITE":
case 12:
t.type=12
break
case"IS_SAFEZONE_CUSTOM_SITE":
case 13:
t.type=13
break
case"SET_PROPERTIES":
case 14:
t.type=14
break
case"GET_VERSIONS":
case 15:
t.type=15
break
case"GET_BCU_DISTRIBUTION_ID":
case 16:
t.type=16
}
if(e.params){
if(!Array.isArray(e.params)){
throw TypeError(".LocalServerCommandRequest.params: array expected")
}
t.params=[]
for(let n=0;n<e.params.length;++n){
"string"==typeof e.params[n]?ha.base64.decode(e.params[n],t.params[n]=ha.newBuffer(ha.base64.length(e.params[n])),0):e.params[n].length&&(t.params[n]=e.params[n])
}
}
switch(e.browser){
case"INVALID":
case 0:
t.browser=0
break
case"IE":
case 1:
t.browser=1
break
case"FIREFOX":
case 2:
t.browser=2
break
case"CHROME":
case 3:
t.browser=3
break
case"OPERA":
case 4:
t.browser=4
break
case"SAFARI":
case 5:
t.browser=5
}
return t
},e.toObject=function(e,t){
t||(t={})
let n={}
if((t.arrays||t.defaults)&&(n.params=[]),t.defaults&&(n.type=t.enums===String?"ACKNOWLEDGEMENT":1,
n.browser=t.enums===String?"INVALID":0),
null!=e.type&&e.hasOwnProperty("type")&&(n.type=t.enums===String?ga.CommandType[e.type]:e.type),
e.params&&e.params.length){
n.params=[]
for(let i=0;i<e.params.length;++i){
n.params[i]=t.bytes===String?ha.base64.encode(e.params[i],0,e.params[i].length):t.bytes===Array?Array.prototype.slice.call(e.params[i]):e.params[i]
}
}
return null!=e.browser&&e.hasOwnProperty("browser")&&(n.browser=t.enums===String?ga.BrowserType[e.browser]:e.browser),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
})(),ga.LocalServerCommandResponse=(()=>{
function e(e){
if(this.result=[],e){
for(let t=Object.keys(e),n=0;n<t.length;++n){
null!=e[t[n]]&&(this[t[n]]=e[t[n]])
}
}
}
return e.prototype.result=ha.emptyArray,e.prototype.error=ha.newBuffer([]),e.create=function(t){
return new e(t)
},e.encode=function(e,t){
if(t||(t=da.create()),null!=e.result&&e.result.length){
for(let n=0;n<e.result.length;++n){
t.uint32(10).bytes(e.result[n])
}
}
return null!=e.error&&e.hasOwnProperty("error")&&t.uint32(18).bytes(e.error),t
},
e.encodeDelimited=function(e,t){
return this.encode(e,t).ldelim()
},e.decode=function(e,t){
e instanceof ma||(e=ma.create(e))
let n=void 0===t?e.len:e.pos+t,i=new ga.LocalServerCommandResponse
for(;e.pos<n;){
let t=e.uint32()
switch(t>>>3){
case 1:
i.result&&i.result.length||(i.result=[]),i.result.push(e.bytes())
break
case 2:
i.error=e.bytes()
break
default:
e.skipType(7&t)
}
}
return i
},e.decodeDelimited=function(e){
return e instanceof ma||(e=new ma(e)),this.decode(e,e.uint32())
},e.verify=function(e){
if("object"!=typeof e||null===e){
return"object expected"
}
if(null!=e.result&&e.hasOwnProperty("result")){
if(!Array.isArray(e.result)){
return"result: array expected"
}
for(let t=0;t<e.result.length;++t){
if(!(e.result[t]&&"number"==typeof e.result[t].length||ha.isString(e.result[t]))){
return"result: buffer[] expected"
}
}
}
return null!=e.error&&e.hasOwnProperty("error")&&!(e.error&&"number"==typeof e.error.length||ha.isString(e.error))?"error: buffer expected":null
},
e.fromObject=function(e){
if(e instanceof ga.LocalServerCommandResponse){
return e
}
let t=new ga.LocalServerCommandResponse
if(e.result){
if(!Array.isArray(e.result)){
throw TypeError(".LocalServerCommandResponse.result: array expected")
}
t.result=[]
for(let n=0;n<e.result.length;++n){
"string"==typeof e.result[n]?ha.base64.decode(e.result[n],t.result[n]=ha.newBuffer(ha.base64.length(e.result[n])),0):e.result[n].length&&(t.result[n]=e.result[n])
}
}
return null!=e.error&&("string"==typeof e.error?ha.base64.decode(e.error,t.error=ha.newBuffer(ha.base64.length(e.error)),0):e.error.length&&(t.error=e.error)),
t
},e.toObject=function(e,t){
t||(t={})
let n={}
if((t.arrays||t.defaults)&&(n.result=[]),t.defaults&&(t.bytes===String?n.error="":(n.error=[],
t.bytes!==Array&&(n.error=ha.newBuffer(n.error)))),
e.result&&e.result.length){
n.result=[]
for(let i=0;i<e.result.length;++i){
n.result[i]=t.bytes===String?ha.base64.encode(e.result[i],0,e.result[i].length):t.bytes===Array?Array.prototype.slice.call(e.result[i]):e.result[i]
}
}
return null!=e.error&&e.hasOwnProperty("error")&&(n.error=t.bytes===String?ha.base64.encode(e.error,0,e.error.length):t.bytes===Array?Array.prototype.slice.call(e.error):e.error),
n
},e.prototype.toJSON=function(){
return this.constructor.toObject(this,sa.util.toJSONOptions)
},e
})()
var fa=n(21),ba=n(22),ya=n.n(ba)
"object"==typeof window.browser&&(window.chrome=window.browser)
const ka=new class{
constructor(e){
const t=function(){
const t=[...arguments],n=Pn(e,t.shift())||{},i=n[t.shift()]
return"function"==typeof i?i.apply(n,t):i
}
this.browserAction=new qi(t),this.extension=new Gi(t),this.i18n=new Yi(t),this.runtime=new Hi(t),
this.storage=new Ki(t),
this.tabs=new Ji(t),this.webNavigation=new Zi(t),this.webRequest=new Xi(t)
}
}(chrome),va=new class extends class{
constructor(){
this.RATING_NONE=0,this.RATING_GOOD=1,this.RATING_AVERAGE=2,this.RATING_BAD=3,
this.EXT_TYPE_AOS=1,
this.EXT_TYPE_AOS_SZ=6,this.browserVersion=0,this.initedTabs={},
this.AvastConfig={
get:function(e){
function t(e){
return!/[A-Fa-f0-9]{64}/.test(e)&&/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/.test(e)
}
this.getStorage(this.AvastConfig.config.localStorageKeyName,(function(n){
let i=JSON.parse(n)
for(let e in i){
i[e]&&t(i[e])&&(i[e]=window.atob(i[e]))
}
e(i?JSON.stringify(i):i)
}))
}.bind(this),
set:function(e){
let t=JSON.parse(JSON.stringify(e))
for(let n in e){
t[n]&&(t[n]=window.btoa(e[n]))
}
this.setStorage(this.AvastConfig.config.localStorageKeyName,JSON.stringify(t))
}.bind(this),
config:{
localStorageKeyName:"AvastConfig"
}
}
}
init(e){
return this.CONFIG.CALLERID=e,this.CONFIG.LOCAL_ENABLED=this.Utils.getBrowserInfo().isWindows(),
this.CONFIG.VERSION=this.bs.getVersion(),
this.CONFIG.OS_VERSION=this.Utils.getBrowserInfo().getOSBuild(),
this.CONFIG.OS=this.Utils.getBrowserInfo().getOSType(),
this
}
getBrowserVersion(){
let e=0
const t=this.Utils.getBrowserInfo().getBrowserVersion().match(/(\d)+/)
return"object"==typeof t&&null!=t&&t.length>0&&(e=parseInt(t[0])),e
}
getWindowStorage(e){
return 0===this.browserVersion&&(this.browserVersion=this.getBrowserVersion()),
this.Utils.getBrowserInfo().isFirefox()&&this.browserVersion<48||"undefined"==typeof localStorage?this.bs.getLocalStorage().getItem(storage):localStorage[e]
}
getStorage(e,t){
if(0===this.browserVersion&&(this.browserVersion=this.getBrowserVersion()),
!this.Utils.getBrowserInfo().isSafari()){
return this.bs.getLocalStorage(e,t)
}
{
const n=localStorage.getItem(e)
t("string"==typeof n?JSON.parse(n):n)
}
}
getStorageAsync(e){
return new Promise((t,n)=>{
this.getStorage(e,e=>{
if(!e){
return n()
}
t(e)
})
})
}
setStorage(e,t){
0===this.browserVersion&&(this.browserVersion=this.getBrowserVersion()),
this.Utils.getBrowserInfo().isSafari()?localStorage.setItem(e,JSON.stringify(t)):this.bs.setLocalStorage(e,t)
}
getUrlInfo(e,t){
if(!e){
return
}
const n=e.filter(t=>this.bs.checkUrl(t)||e.length>1)
new this.Query.UrlInfo(this,{
urls:n,
callback:t
})
}
}{
constructor(e){
super(),this.Api=e
const t=((this.Api.runtime.getManifest()||{}).name||"").indexOf("BETA")>-1
this.RATING_THRESHOLD_AVERAGE=66,this.TTL_DATE_FORMAT="yyyymmddHHMMss",this.DEFAULTS={
LOG:!0,
USER:null,
THROTTLE:250,
TTL:3600,
CACHE:{
DOMAIN:"urlinfo",
WARNING:"warning",
URIS:"urlinfo-details",
RULES:"avastwrc_rules"
},
IGNORE_TABS:["^secure://","^chrome:\\/\\/","^chrome-extension:","^moz-extension:","^ms-browser-extension:","^chrome-devtools:\\/\\/","^https:\\/\\/chrome\\.google\\.com\\/webstore","^about:","^view-source:","^file:\\/\\/","^http(s)?:\\/\\/([\\w|\\d]+:[\\w|\\d]+@)?localhost","^data:text\\/html"],
DNT_MOCKS_RULES:[{
pattern:"google-analytics\\.com\\/(ga\\.js)",
mock:"ga.js"
},{
pattern:"\\/(omniture|mbox|hbx|omniunih)(.*)?\\.js",
mock:"omniture.js"
},{
pattern:"adnxs\\.com",
mock:"empty.js"
},{
pattern:"gpt.js$",
mock:"gpt.js"
},{
pattern:"\\.googletagservices\\.com\\/tag\\/js\\/(.+)\\.js",
mock:"gpt.js"
}],
BURGER:{
production:"https://analytics.ff.avast.com/v4/receive/gpb",
stage:"https://analytics-stage.ff.avast.com/v4/receive/gpb"
},
SHEPHERD:{
production:"https://shepherd.ff.avast.com/?",
stage:"https://shepherd-preview.ff.avast.com/?"
},
IS_BETA:t,
SHEPHERD_ID:46,
VOTING:{
POSITIVE:100,
NEGATIVE:0
},
RATING_COLOR:{
AVAST:["#767683","#0CB754","#F1C80B","#F5203E"],
AVG:["#767683","#4C8","#FA2","#E46"]
},
STORE_URL:'https://chrome.google.com/webstore/detail/avast-online-security/gomekmidlodglbbmalcneegieacbdmki?utm_source=extension&utm_medium=nps&utm_campaign=AOS '
},this.CONFIG={
ENABLE_SERP:!0,
ENABLE_SERP_POPUP:!0,
URL_CONSENT:null,
PRODUCT_ANALYSIS:!0,
VERSION:8,
GUID:null,
HWID:null,
LOCAL_ENABLED:!0,
CALLERID:1e4,
EXT_TYPE:1,
EXT_VER:0,
DATA_VER:0,
EDITION:0,
BRANDING_TYPE:0,
WEBSHIELD:null,
BRAND:"",
AV_VERSION:"0",
OS:"",
OS_VERSION:"0",
FEEDBACK_URL:null,
FEEDBACK_RESET:0,
FEEDBACK_CLICKED:0,
INSTALL_DATE:0
},this.get=this.throttle(this.getUrlInfo,this.DEFAULTS.THROTTLE),this.Browser={},
this.WRCUrlInfo=Ae,
this.Utils=new Ie(this),this.Cache=new Se(this),this.TabReqCache=new Oe,
this.Queue=new _e,
this.local=new Re(this)
}
throttle(e,t){
var n,i,a,o,r=0,s=function(){
r=new Date,a=null,o=e.apply(n,i)
}
return function(){
var u=new Date,l=t-(u-r)
return n=this,i=arguments,l<=0?(clearTimeout(a),a=null,r=u,o=e.apply(n,i)):a||(a=setTimeout(s,l)),
o
}
}
}(ka)
va.DEFAULTS.BRAND="AVAST",va.DEFAULTS.BRAND_NAME="Avast",va.DEFAULTS.PHISHING_REDIRECT="https://www.avast.com?utm_source=OnlineSecurity&utm_medium=redirect&utm_campaign=avast",
va.PHISHING_REDIRECT=va.DEFAULTS.PHISHING_REDIRECT,
va.AVAST_UPGRADE_PAGE_URL="http://aos.avast.com/upgrade/",
va.proto={
UrlInfo:pa.com.avast.cloud.webrep.proto,
AV:ga
}
const wa=new class extends class{
init(){}
sendHB(){}
sendWebshield(e,t,n,i,a,o,r){}
install(e=1){}
productUpdate(){}
preferences(e){}
click(e,t,n){}
view(e,t){}
vote(e,t){}
npsScore(e){}
npsFeedback(e,t){}
log(e,t){}
}{
constructor(e){
super(),this.AvastWRC=e,this.Api=this.AvastWRC.Api
}
init(){
const e=ia.a.create(Object.assign({},oa.a)),t=this._getBurgerOptions(),n=this._getBurgerServer()
this.client=new ta.a(n,e,t)
}
_getBurgerServer(){
return this.AvastWRC.DEFAULTS.BURGER.production
}
_getBurgerOptions(){
const e=this._getIds(),t=this._getExtensionProductIdentity(),n=navigator&&navigator.language||"",i=this._getVersionApp()
return{
batchTimeoutMs:18e5,
localStorage:localStorage,
identity:e,
product:{
id:146,
lang:n,
version_app:i
},
license:{
type:"NO_LICENSE"
},
extensionProductIdentity:t,
extensionProduct:{
version_app:this.AvastWRC.CONFIG.AV_VERSION
},
platform:{
build:this._getOSbuild()+""
},
caller_id:this.AvastWRC.CONFIG.CALLERID
}
}
_getVersionApp(){
const e=this.AvastWRC.CONFIG.VERSION.split(".")
return e.length=3,e.join(".")
}
_getIds(){
return{
guid:this.AvastWRC.CONFIG.PLG_GUID,
hwid:this.AvastWRC.CONFIG.HWID
}
}
_getExtensionProductIdentity(){
return{
guid:this.AvastWRC.CONFIG.GUID,
hwid:this.AvastWRC.CONFIG.HWID
}
}
_getOSbuild(){
let e="string"==typeof this.AvastWRC.CONFIG.OS_VERSION&&this.AvastWRC.CONFIG.OS_VERSION.match(/^([0-9]+).([0-9]+).([0-9]+)$/)
return e?parseInt(e[3]):null
}
_updateClient(){
const e=this._getIds(),t=this._getExtensionProductIdentity()
this.client.updateIdentity(e).updatePlatform({
build:this._getOSbuild()+""
}).updateProduct({
version_app:this._getVersionApp()
}).updateExtensionProduct({
version_app:this.AvastWRC.CONFIG.AV_VERSION
}).updateExtensionProductIdentity(t)
}
sendHB(){
const e=performance&&performance.now()||-1
this._updateClient(),this.client.send.heartbeat(e),this.log("❤️ Sending heartbeat")
}
sendWebshield(e,t,n,i,a,o,r){
this._updateClient(),this.client.send.aosWebshieldScanning({
webshield_setting:e,
request_domain:t,
request_durations:{
headers_received:n,
response_started:i,
request_completed:a,
dom_loaded:o,
page_loaded:r
}
}),this.log("webshield data:",[e,t,n,i,a,o,r])
}
install(e=1){
this._updateClient(),this.client.send.install(e),this.log("Install Event sent, new version:",this.AvastWRC.CONFIG.VERSION)
}
productUpdate(){
const e=this.Api.runtime.getManifest().version
this._updateClient(),this.client.send.update({
version:{
version_app:e
}
}),this.log("Update Event sent, version_app:",e)
}
preferences(e){
this._updateClient(),this.client.send.preferences(e),this.log("Preferences Sent",e)
}
click(e,t,n){
this.AvastWRC.CONFIG.PRODUCT_ANALYSIS&&(this._updateClient(),this.client.send.activity.click({
object:{
category:e,
action:t,
label:n
}
}),this.log("Activity click","Category: "+e+", Action: "+t+", Label: "+n))
}
view(e,t){
this.AvastWRC.CONFIG.PRODUCT_ANALYSIS&&(this._updateClient(),this.client.send.activity.view({
object:{
view:e,
label:t
}
}),this.log("Activity view:",e+(t?" ,label: "+t:"")))
}
vote(e,t){
this._updateClient()
const n=e.split("?")[0]
this.client.send.vote(n,t),this.log("Vote sent","Rating: "+t+", url: "+n)
}
npsScore(e){
this.AvastWRC.CONFIG.PRODUCT_ANALYSIS&&(this._updateClient(),this.client.send.npsScore(e),
this.log("NPS Score sent",e))
}
npsFeedback(e,t){
this.AvastWRC.CONFIG.PRODUCT_ANALYSIS&&(this._updateClient(),this.client.send.npsFeedback(e,t),
this.log("NPS feedback sent"))
}
log(e,t=""){}
}(va)
va.bal=new class{
constructor(e,t={}){
this.AvastWRC=e,this.Api=this.AvastWRC.Api,this.sender=t,this.settings=null,
this.defaultSettings=null,
this.settingsBeforeReset=null,this._settingsReadyResolve=()=>{},
this._settingsReadyPromise=new Promise(e=>this._settingsReadyResolve=e),
this._bal_modules=[],
this._core_modules=[],this._ee=new xe.a({
wildcard:!0,
delimiter:"."
}),this.storage={
add:function(e,t){
return localStorage.setItem(e,JSON.stringify(t)),t
},
get:function(e){
var t=localStorage.getItem(e)
try{
return JSON.parse(t)
}catch(e){
return{}
}
},
delete:function(e){
delete localStorage[e]
}
},this.aos=new Le(this.AvastWRC),this.DNT=new ai(this.AvastWRC),this.search=new oi(this.AvastWRC),
this.NPS=new ri(this.AvastWRC,this.sender),
this.Api.runtime.onInstalled.addListener(this._onInstalledListener.bind(this))
}
_onInstalledListener(e={}){
const t="install"===e.reason,n="update"===e.reason
this._settingsReadyPromise.then(this._displayConsentDialog.bind(this,e)),setTimeout(()=>{
const i=this.AvastWRC.bs.getVersion()
t?(this.sender.install(),this.sendPreferencesOnce()):n&&e.previousVersion!==i&&(this.sender.productUpdate(),
this.DNT.reloadLocalDntRules(),
this.AvastWRC.CONFIG.VERSION=i,this.sendPreferencesOnce())
},5e3)
}
_displayConsentDialog(e,t){
const n="install"===e.reason,i="update"===e.reason,a=this.AvastWRC.Utils.getBrowserInfo().isFirefox(),o=i&&!1===t.features.urlConsent
a&&(n||o)&&this.AvastWRC.bs.openAfterInstallPage(),!1===this.AvastWRC.CONFIG.URL_CONSENT&&this.Api.browserAction.setIcon({
path:"common/ui/icons/icon-danger.png"
}),localStorage.removeItem("URL_CONSENT")
}
sendPreferencesOnce(){
this.AvastWRC.getStorageAsync("preferencesSent").catch(()=>{
this.emitEvent("track.currentPreferences"),
this.AvastWRC.setStorage("preferencesSent",1)
})
}
registerModule(e){
this._core_modules.push(e)
}
emitEvent(){
this._ee.emit.apply(this._ee,arguments)
}
init(e){
const t=this.getDefaultSettings()
return this.settings=this.troughStorage("settings",t),this.initConfig(),this.initInstallDate(),
this.initEdition(e).then(this.initModuleSettings.bind(this)).then(this.initModules.bind(this)).then(this.AvastWRC.local.connect.bind(this.AvastWRC.local)).catch(e=>{}),
this
}
initEdition(e){
return this.AvastWRC.CONFIG.EDITION=0,this.AvastWRC.CONFIG.FEATURES=e,
this.AvastWRC.CONFIG.CALLERID=e.callerId,
this.AvastWRC.CONFIG.EXT_TYPE=e.extType,
this.AvastWRC.CONFIG.EXT_VER=e.extVer,Promise.resolve()
}
initConfig(){
this.AvastWRC.AvastConfig.get(e=>{
if("string"!=typeof e&&(e=this.AvastWRC.getWindowStorage("AvastConfig")),
"string"==typeof e){
const t=JSON.parse(e)
if(t){
this.AvastWRC.CONFIG.GUID=t.guid,this.AvastWRC.CONFIG.HWID=t.hwid,t.plg_guid?this.AvastWRC.CONFIG.PLG_GUID=t.plg_guid:null!=t.guid&&null!=t.hwid?this.AvastWRC.CONFIG.PLG_GUID=this.AvastWRC.Utils.getRandomUID():null!=t.guid&&null==t.hwid&&(this.AvastWRC.CONFIG.PLG_GUID=t.guid,
this.AvastWRC.CONFIG.GUID=null)
const e={
guid:this.AvastWRC.CONFIG.GUID,
plg_guid:this.AvastWRC.CONFIG.PLG_GUID,
hwid:this.AvastWRC.CONFIG.HWID
}
this.AvastWRC.AvastConfig.set(e)
}
}else{
this.AvastWRC.CONFIG.PLG_GUID=this.AvastWRC.Utils.getRandomUID()
const e={
guid:this.AvastWRC.CONFIG.GUID,
plg_guid:this.AvastWRC.CONFIG.PLG_GUID,
hwid:this.AvastWRC.CONFIG.HWID
}
this.AvastWRC.AvastConfig.set(e)
}
})
}
initInstallDate(){
this.AvastWRC.getStorageAsync("InstallDate").then(e=>{
if("string"==typeof e){
const t=2592e6
e=1*new Date(e)+t,this.AvastWRC.setStorage("InstallDate",e)
}
this.AvastWRC.CONFIG.INSTALL_DATE=e
}).catch(()=>{
this.AvastWRC.CONFIG.INSTALL_DATE=Date.now(),this.AvastWRC.setStorage("InstallDate",this.AvastWRC.CONFIG.INSTALL_DATE)
})
}
initModules(){
const e=this._core_modules
let t=[]
return e.forEach(e=>{
if(e&&"function"==typeof e.init){
let n=e.init(this)
n&&"function"==typeof n.then&&t.push(n)
}
}),new Promise(n=>{
Promise.all(t).then(()=>{
e.forEach(e=>{
e&&("function"==typeof e.registerModuleListeners&&e.registerModuleListeners(this._ee),
this._bal_modules.push(e))
}),n(e)
})
})
}
initModuleSettings(){
return new Promise(e=>{
this.AvastWRC.getStorage("settings",t=>{
const n=this.mergeInSettings(t)
this.settings.set(n),this.updateConfigFromSettings(n),this._settingsReadyResolve(this.settings.get()),
e(this._core_modules)
})
})
}
mergeInSettings(e){
const t=this.getDefaultSettings()
if(!e){
return t
}
for(const n in t){
const i=e[n]
if(null==i){
e[n]=t[n]
}else{
for(const i in t[n]){
const a=e[n][i]
null==a&&(e[n][i]=t[n][i])
}
}
}
return e
}
updateConfigFromSettings(e){
this.AvastWRC.CONFIG.PRODUCT_ANALYSIS=e.features.productAnalysis,
this.AvastWRC.CONFIG.ENABLE_SERP=e.features.serp,
this.AvastWRC.CONFIG.ENABLE_SERP_POPUP=e.features.serpPopup,
this.AvastWRC.CONFIG.URL_CONSENT=e.features.urlConsent,
this.AvastWRC.CONFIG.FEEDBACK_CLICKED=e.ui.feedbackClickedTime
}
featureSettingChanged(e,t,n){
this._ee.emit("featureChanged."+e,n,t)
}
hookOnFeatureChange(e,t){
this._ee.on("featureChanged."+e,t),t(this.settings.get().features[e])
}
getDefaultSettings(){
return this.defaultSettings||(this.defaultSettings=this._core_modules.reduce((e,t)=>{
if(void 0!==t&&"function"==typeof t.getModuleDefaultSettings){
const n=t.getModuleDefaultSettings()
n&&Object.assign(e,n)
}
return e
},{})),Bi(this.defaultSettings)
}
troughStorage(e,t){
const n=e
let i=null
return{
get:function(){
return i||(i=t)
},
set:function(e){
i=e,this.AvastWRC.setStorage(n,i)
}.bind(this)
}
}
getHostFromUrl(e){
if(e){
var t=e.toLowerCase()
if(0==t.toLowerCase().indexOf("http")&&0!=t.toLowerCase().indexOf("chrome")&&0!=t.toLowerCase().indexOf("data")&&"about:newtab"!=t.toLowerCase()&&"about:blank"!=t.toLowerCase()){
var n=e.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/)
return n.length>2?n[2]:void 0
}
}
}
getDomainFromHost(e){
if(e){
let t=Pe.a.parse(e)
if(t.domain){
return t.domain
}
}
}
setUninstallURL(e=""){
this.Api.runtime.setUninstallURL(e,()=>{})
}
settingFeatureSet(e,t,n){
let i=!1,a=t
switch(e){
case"dntWebAnalytics":
i="WebAnalytics"
break
case"dntSocial":
i="Social"
break
case"dntAdTracking":
i="AdTracking"
break
case"dntOthers":
i="Others"
}
if(i){
let e=this.DNT,t=e.blockList.get()
if(i&&(t.categories[i]=a,!a)){
let n=e.trackersByCategory[i]
for(let e in n){
let i=n[e]
!0===t.trackers[i]&&delete t.trackers[i]
}
}
e.blockList.set(t)
}
let o=this.settings.get(),r=o.features[e]
return o.features[e]=t,r!==t&&this.featureSettingChanged(e,r,t),this.settings.set(o),
this.updateConfigFromSettings(o),
n&&this.emitEvent("track.settingFeature",n,e,t),
!0
}
feedbackClick(){
const e=this.settings.get()
e.ui.feedbackClickedTime=1*new Date,this.settings.set(e),this.updateConfigFromSettings(e)
}
openFeedback(e){
const t=this.AvastWRC.CONFIG.FEEDBACK_URL
t&&(this.feedbackClick(),this.AvastWRC.bs.openInNewTab(t),this.emitEvent("track.feedbackClicked",e))
}
settingReset(){
this.settingsBeforeReset=this.settings.get()
const e=this.getDefaultSettings()
e.features.urlConsent=this.settingsBeforeReset.features.urlConsent,this.settings.set(e),
this.DNT.resetModuleSettings(),
this.emitEvent("track.settingReset")
}
settingResetUndo(){
this.settings.set(this.settingsBeforeReset),this.DNT.resetModuleSettingsUndo(),
this.emitEvent("track.settingResetUndo")
}
}(va,wa),va.tracking=new class{
constructor(e,t={}){
this.sender=t,this.AvastWRC=e,this.SETTING_FEATURE_MAP={
serp:{
name:"searchEngine",
category:"security"
},
serpPopup:{
name:"searchPopups",
category:"security"
},
secureBrowser:{
name:"SafeZone",
category:"security"
},
dntBadge:{
name:"dntBadge",
category:"privacy"
},
dntAutoBlock:{
name:"dnt",
category:"privacy"
},
dntSocial:{
name:"dntSocial",
category:"privacy"
},
dntAdTracking:{
name:"dntAdTracking",
category:"privacy"
},
dntWebAnalytics:{
name:"dntWebAnalytics",
category:"privacy"
},
dntOthers:{
name:"dntOthers",
category:"privacy"
},
productAnalysis:{
name:"productAnalysis",
category:"privacy"
},
urlConsent:{
name:"urlConsent",
category:"privacy"
}
}
}
_getPreferencesList(){
const e=(this.AvastWRC.bal.settings.get()||{}).features||{},t=[]
for(const n in this.SETTING_FEATURE_MAP){
if(this.SETTING_FEATURE_MAP.hasOwnProperty(n)&&e.hasOwnProperty(n)){
const i=Object.assign({},this.SETTING_FEATURE_MAP[n],{
state:""+e[n]
})
t.push(i)
}
}
return t
}
sendNpsCardStyle(){
const e=this.AvastWRC.bal.NPS.getUiData()
if(e&&e.isOn){
switch(e.style){
case e.styleEnum.topCard:
this.sender.view("npsCard","top")
break
case e.styleEnum.bottomCard:
this.sender.view("npsCard","bottom")
}
}
}
trackPreferences(){
const e=this._getPreferencesList()
this.sender.preferences(e)
}
registerModuleListeners(e){
const t=["Others","WebAnalytics","AdTracking","Social"]
e.on("track.settingFeature",(e,t,n)=>{
let i="settings",a=(n?"check.":"uncheck.")+(this.SETTING_FEATURE_MAP[t]||{
name:t,
category:"unknown"
}).name
"globalblock"===e?(i="globalblock",a=n?"disable.trackers":"enable.trackers"):["MainUi","Consent Page"].indexOf(e)>-1&&(i=e,
a=n?"consent.agree":"consent.disagree"),
this.sender.click(i,a),this.trackPreferences()
}),e.on("track.dntGroup",(e,n)=>{
if(-1===t.indexOf(e)){
return
}
const i=(n?"blockAll.":"allowAll.")+e
this.sender.click("aos setting",i),this.trackPreferences()
}),e.on("track.currentPreferences",()=>{
this.trackPreferences()
}),e.on("rated.positive",e=>{
this.sender.click("webreputation","rated.positive"),
this.sender.vote(e,this.AvastWRC.DEFAULTS.VOTING.POSITIVE)
}),e.on("rated.negative",e=>{
this.sender.click("webreputation","rated.negative"),
this.sender.vote(e,this.AvastWRC.DEFAULTS.VOTING.NEGATIVE)
}),e.on("track.dntTracker",(e,t,n)=>{
const i=n?"block":"allow"
this.sender.click(i,e,t)
}),e.on("track.feedbackClicked",e=>{
this.sender.click("feedback","open",e)
}),e.on("track.settingReset",()=>{
this.sender.click("setting","reset")
}),e.on("track.settingResetUndo",()=>{
this.sender.click("setting","reset.undo")
}),e.on("track.bankbar.open",e=>{
this.sender.click("bankbar","open",e)
}),e.on("track.bankbar.doNotShowAgain",e=>{
this.sender.click("bankbar","doNotShowAgain",e)
}),e.on("track.bankbar.close",e=>{
this.sender.click("bankbar","close",e)
}),e.on("track.nps.cardClick",e=>{
this.sender.click("npsCard","click",e)
}),e.on("message.sidebarShow",()=>{
this.sender.view("main panel"),this.sendNpsCardStyle()
}),e.on("track.settingsOpened",()=>{
this.sender.view("settings")
}),e.on("track.phishing.open",()=>{
this.sender.view("phishing")
}),e.on("track.malware.open",()=>{
this.sender.view("malware")
}),e.on("track.bankbar.show",e=>{
this.sender.view("bankbar",e)
}),e.on("track.nps.page",e=>{
this.sender.view("npsCard",e)
}),e.on("track.nps.cardStyle",e=>{
this.sender.view("npsCard",e)
})
}
}(va,wa),va.bal.secureBrowser=new class{
constructor(e){
this.AvastWRC=e,this.bankRules=new Set,this.sessionHostCache=new Set,
this.isAvailable=!1
}
initLocalService(){
this.AvastWRC.local.isSecureBrowserAvailable().then(e=>{
const t="Avast"===this.AvastWRC.DEFAULTS.BRAND_NAME,n="yes"===e.result[0]
return t&&n
}).then(e=>e?(this.isAvailable=!0,Qi.forEach(this.bankRules.add,this.bankRules),
this.AvastWRC.Shepherd.getBankRules()):null).then(e=>{
if(!e){
return null
}
this.updateBankRules(e)
}).catch(e=>{})
}
checkBankUrl(e,t){
this.validate(e)&&this.showBankbar(e,t)
}
validate(e){
if(!this.isAvailable){
return!1
}
const t=this.AvastWRC.bal.settings.get()
if(!t.features.secureBrowser){
return!1
}
const n=this.AvastWRC.bal.getHostFromUrl(e)
return!t.safeZone.declined[n]&&(!this.sessionHostCache.has(n)&&this.bankRules.has(n))
}
showBankbar(e,t){
const n=this.AvastWRC.bal.getHostFromUrl(e)
this.AvastWRC.bs.messageTab(t,{
message:"showBankbar"
}),this.AvastWRC.bal.emitEvent("track.bankbar.show",n)
}
updateBankRules(e){
if(!this.isAvailable||!e){
return!1
}
(e.extendUrls||[]).forEach(this.bankRules.add,this.bankRules),(e.deleteUrls||[]).forEach(this.bankRules.delete,this.bankRules)
}
open(e){
if(!e){
return
}
const t=this.AvastWRC.bal.getHostFromUrl(e)
this.AvastWRC.local.switchToSecureBrowser(e),this.AvastWRC.bal.emitEvent("track.bankbar.open",t)
}
putUrlToIgnoreList(e){
if(!e){
return
}
const t=this.AvastWRC.bal.getHostFromUrl(e),n=this.AvastWRC.bal.settings.get()
n.safeZone.declined[t]=!0,this.AvastWRC.bal.settings.set(n),this.AvastWRC.bal.emitEvent("track.bankbar.doNotShowAgain",t)
}
close(e){
if(!e){
return
}
const t=this.AvastWRC.bal.getHostFromUrl(e)
this.sessionHostCache.add(t),this.AvastWRC.bal.emitEvent("track.bankbar.close",t)
}
registerModuleListeners(e){
e.on("urlInfo.response",(e,t,n)=>this.checkBankUrl(e,n)),
e.on("local.init",this.initLocalService.bind(this)),
e.on("shepherd.updated",e=>{
e&&e.bankRules&&this.updateBankRules(e.bankRules)
}),e.on("message.bankbar.open",e=>this.open(e.url)),
e.on("message.bankbar.doNotShowAgain",e=>this.putUrlToIgnoreList(e.url)),
e.on("message.bankbar.close",e=>this.close(e.url))
}
}(va),va.Shepherd=new class{
constructor(e){
this.AvastWRC=e,this.loadAsyncPromise=null,this.rules={
expireTime:0
}
}
init(){
this.restore().then(()=>{
if(!this.isValidTtl()){
return this.loadAsync()
}
this.AvastWRC.bal.emitEvent("shepherd.updated",this.rules)
})
}
restore(){
return new Promise(e=>{
this.AvastWRC.getStorage("Shepherd",t=>{
this.rules=JSON.parse(t),e()
})
})
}
load(){
this.AvastWRC.Query.Shepherd((e,t)=>{
e.expireTime=this.getExpirationTime(t),this.rules=e,
this.save()
},e=>{
this.rules=this.rules||{},this.rules.expireTime=this.getExpirationTime(3600),
this.save()
})
}
loadAsync(){
return this.loadAsyncPromise||(this.loadAsyncPromise=new Promise(e=>{
this.AvastWRC.Query.Shepherd((t,n)=>{
t.expireTime=this.getExpirationTime(n),this.rules=t,
this.save(),e(this.rules),this.loadAsyncPromise=null
},t=>{
this.rules=this.rules||{},this.rules.expireTime=this.getExpirationTime(3600),
this.save(),
e(this.rules),this.loadAsyncPromise=null
})
})),this.loadAsyncPromise
}
getExpirationTime(e){
return Date.now()/1e3+parseInt(e)
}
isValidTtl(){
return(this.rules&&this.rules.expireTime||0)>Date.now()/1e3
}
save(){
this.AvastWRC.setStorage("Shepherd",JSON.stringify(this.rules)),this.AvastWRC.bal.emitEvent("shepherd.updated",this.rules)
}
getSerpRule(e){
if(this.isValidTtl()||this.load(),!this.rules||!this.rules.SERP){
return{}
}
var t=this.rules.SERP.rules?this.rules.SERP.rules:[]
for(var n of t){
if(n.url&&e.search(n.url)>-1){
return n
}
}
return{}
}
getBurgerRule(){
return this.isValidTtl()||this.load(),this.rules&&this.rules.Burger?this.rules.Burger:{}
}
getWebshieldRule(e){
if(this.isValidTtl()||this.load(),!this.rules||!this.rules.webShield){
return{}
}
const t=this.rules.webShield.trackDomains?this.rules.webShield.trackDomains:[]
return t[e]?t[e]:t["*"]?t["*"]:{
flags:0
}
}
getBankRules(){
return new Promise(e=>{
this.isValidTtl()?(this.rules&&this.rules.bankRules||e(null),
e(this.rules.bankRules||null)):this.loadAsync().then(t=>e(t.bankRules))
})
}
}(va),va.Query=new class{
constructor(e){
this.AvastWRC=e,this.HTTP_SERVER="http://ui.ff.avast.com",this.HTTP_PORT="80",
this.HTTPS_SERVER="https://uib.ff.avast.com",
this.HTTPS_PORT="443",this.USE_HTTPS=!0,
this.CONST={
HEADERS:{
"Content-Type":"application/octet-stream"
},
SERVER:this.USE_HTTPS?this.HTTPS_SERVER:this.HTTP_SERVER,
PORT:this.USE_HTTPS?this.HTTPS_PORT:this.HTTP_PORT,
HTTPS_SERVER:"https://uib.ff.avast.com:443",
URLINFO:"urlinfo",
URLINFO_V5:"v5/urlinfo",
LOCAL_PORTS:[27275,18821,7754],
LOCAL_PORT:null,
LOCAL_TOKEN:null,
LOCAL_TIMESTAMP:null
},this.Avast=Vi,this.UrlInfo=Mi
}
Shepherd(e,t){
let n=this.AvastWRC.DEFAULTS.SHEPHERD.production
const i=this.AvastWRC.CONFIG.GUID||this.AvastWRC.CONFIG.PLG_GUID||"",a=(this.AvastWRC.CONFIG.VERSION||"").split(".")
n+="p_pro="+this.AvastWRC.DEFAULTS.SHEPHERD_ID+"&",""!==i&&(n+="p_hid="+i+"&"),n+="p_vep="+a[0]+"&",
n+="p_ves="+a[1]+"&",
n+="p_vbd="+a[2]
const o=new XMLHttpRequest
o.open("GET",n,!0),o.onreadystatechange=function(){
let n,i
if(4===o.readyState){
if(n=o.status,200===n){
var a=o.getResponseHeader("ttl")
i=JSON.parse(o.responseText),e&&e(i,a)
}else{
t&&t(n)
}
}
},o.send()
}
}(va),va.bs=new class extends class{
constructor(e){
this.AvastWRC=e,this.Api=this.AvastWRC.Api,this.hostInTab=[]
}
extensionCustomPage(e,t){
this.AvastWRC.bal.emitEvent("control.show",e),this.AvastWRC.bs.aos.updateButtonFromExtensionUrl(t,e)
}
urlInfoChange(e,t){
this.AvastWRC.get([e],n=>this.AvastWRC.bal.emitEvent("urlInfo.response",e,n[0],t,event))
}
onTabUpdated(e,t,n){
"loading"===t.status&&this.AvastWRC.bs.tabExists(e).then(()=>{
if(this.AvastWRC.bs.checkExtensionUrl(n.url)){
return void this.extensionCustomPage(n.id,n.url)
}
if(!this.AvastWRC.bs.checkUrl(n.url)){
return void this.AvastWRC.bal.emitEvent("control.hide",e)
}
this.AvastWRC.bal.emitEvent("control.show",e)
const i=this.AvastWRC.Utils.getBrowserInfo().isFirefox()
;(i&&t.url||!i)&&(this.urlInfoChange(n.url,n),
this.AvastWRC.bal.DNT.initTab(n.id))
const a=this.AvastWRC.bal.getHostFromUrl(n.url)
a&&(this.hostInTab[e]=a)
})
}
onActivated(e){
this.AvastWRC.bs.tabExists(e.tabId).then(()=>{
this.Api.tabs.get(e.tabId,t=>{
this.AvastWRC.bs.checkExtensionUrl(t.url)?this.extensionCustomPage(e.tabId,t.url):this.AvastWRC.bs.checkUrl(t.url)?(this.AvastWRC.bal.emitEvent("control.show",e.tabId),
this.urlInfoChange(t.url,t)):this.AvastWRC.bal.emitEvent("control.hide",e.tabId)
})
})
}
onRedirect(e){
this.AvastWRC.bs.tabExists(e.tabId).then(()=>{
this.Api.tabs.get(e.tabId,t=>{
this.AvastWRC.bs.checkExtensionUrl(e.url)?this.extensionCustomPage(e.tabId,e.url):this.AvastWRC.bs.checkUrl(t.url)?(this.AvastWRC.bal.emitEvent("control.show",e.tabId),
this.AvastWRC.bal.DNT.initTab(e.id),
this.urlInfoChange(e.url,t)):this.AvastWRC.bal.emitEvent("control.hide",e.tabId)
})
})
}
onResponseStarted(e){
"main_frame"===e.type&&this.AvastWRC.bal.DNT&&this.AvastWRC.bal.DNT.initTab&&this.AvastWRC.bal.DNT.initTab(e.tabId)
}
getHostInTab(e){
return this.hostInTab[e]
}
getLocalStorage(e,t){
this.Api.storage.local.get(e,(function(n){
"object"==typeof n&&n[e]?t(n[e]):t(null)
}))
}
setLocalStorage(e,t){
const n={}
n[e]=t,this.Api.storage.local.set(n)
}
checkExtensionUrl(e){
return e&&0===e.indexOf(this.AvastWRC.bs.getLocalResourceURL(""))
}
getMessageFromExtensionUrl(e){
if(!this.checkExtensionUrl(e)){
return!1
}
const t=e.match(/([^/]+\.html)/)
return!!t&&t[1]
}
getDataFromExtensionUrl(e){
if(!this.checkExtensionUrl(e)){
return!1
}
const t=e.match(/\?data=([^&]+)/)
if(!t){
return!1
}
let n,i=t[1]
try{
n=JSON.parse(atob(i))
}catch(e){
n={}
}
return n
}
onTabRemoved(e){
delete this.AvastWRC.initedTabs[e],delete this.AvastWRC.bs.tabsMessagesBuffer[e],
this.AvastWRC.TabReqCache.drop(e),
this.AvastWRC.bs.clearTabMessages(e)
}
init(){
const e=["http://*/*","https://*/*"]
this.Api.tabs.onUpdated.addListener(this.onTabUpdated.bind(this)),this.Api.tabs.onActivated.addListener(this.onActivated.bind(this)),
this.Api.tabs.onRemoved.addListener(this.onTabRemoved.bind(this)),
this.Api.webRequest.onBeforeRedirect.addListener(this.onRedirect.bind(this),{
urls:e,
types:["main_frame"]
}),this.Api.webRequest.onResponseStarted.addListener(this.onResponseStarted.bind(this),{
urls:e,
types:["main_frame"]
}),this.AvastWRC.bs.getActiveTab(e=>{
this.AvastWRC.bs.checkExtensionUrl(e.url)&&this.extensionCustomPage(e.id,e.url)
})
}
}{
constructor(e){
super(e),this.Api=e.Api,this.tabsMessagesBuffer={},this.MAX_TAB_MESSAGES=10,
this.EDITIONS_CONFIG={
extType:this.AvastWRC.EXT_TYPE_AOS,
callerId:1100,
extVer:this.getVersionAsInt()
}
}
getVersion(){
return this.Api.runtime.getManifest().version
}
getVersionAsInt(){
const e=this.getVersion().split(".")
let t=1e6*e[0]
return t+=1e4*e[1],t+=1*e[2],t
}
getActiveTab(e){
this.Api.tabs.query({
active:!0,
lastFocusedWindow:!0
},t=>{
t&&t.length>0&&e(t[0])
})
}
getTabs(e){
this.Api.tabs.query({},(function(t){
e(t)
}))
}
tabRedirect(e,t){
this.tabUpdate(e.id,{
url:t
})
}
tabUpdate(e,t){
this.Api.tabs.update(e,t)
}
getTabId(e){
return e.id
}
messageTab(e,t){
!!this.AvastWRC.initedTabs[e.id]||!1?this.Api.tabs.sendMessage(e.id,t):this._putMessageInBuffer(e.id,t)
}
flushTabMessages(e){
let t=this.tabsMessagesBuffer[e.id]||[]
if(0===t.length){
return
}
let n=t.shift()
for(;n;){
this.messageTab(e,n),n=t.shift()
}
}
_putMessageInBuffer(e,t){
this.tabsMessagesBuffer[e]=this.tabsMessagesBuffer[e]||[],
this.tabsMessagesBuffer[e].push(t),
this.tabsMessagesBuffer[e].length>this.MAX_TAB_MESSAGES&&delete this.tabsMessagesBuffer[e]
}
clearTabMessages(e){
this.tabsMessagesBuffer[e]=[]
}
getLocalResourceURL(e){
return this.Api.extension.getURL(e)
}
checkUrl(e){
if(""==e){
return!1
}
for(var t=0,n=this.AvastWRC.DEFAULTS.IGNORE_TABS.length;t<n;t++){
var i=new RegExp(this.AvastWRC.DEFAULTS.IGNORE_TABS[t],"i")
if(e.match(i)){
return!1
}
}
return!0
}
tabExists(e){
return new Promise(t=>{
this.Api.tabs.query({},n=>{
const i=n.find(t=>t.id===e)
i&&t(i)
})
})
}
openAfterInstallPage(){
const e={
type:"afterInstallPage",
brandName:this.AvastWRC.DEFAULTS.BRAND_NAME
},t=this.getLocalResourceURL("common/messagebox.html?data="+btoa(JSON.stringify(e)))
this.openInNewTab(t)
}
openNpsPage(){
const e=this.getLocalResourceURL("common/messagebox.html?data="+btoa(JSON.stringify({
type:"nps"
})))
this.openInNewTab(e)
}
openInNewTab(e){
this.Api.tabs.create({
url:e
})
}
closeTab(e,t){
this.Api.tabs.remove(e.id,t)
}
openStore(e){
this.closeTab(e,()=>{
this.openInNewTab(this.AvastWRC.DEFAULTS.STORE_URL)
})
}
}(va),va.bs.icon=new class{
constructor(e){
this.AvastWRC=e,this.Api=this.AvastWRC.Api,this.animateInterval=null,
this.isNpsBadgeAnimation=!1,
this.textList={},this.iconList={},this.titleList={}
}
show(e){
this.AvastWRC.Utils.getBrowserInfo().isEdge()?this.Api.browserAction.enable(e):this.Api.browserAction.enable(e,()=>{
this.Api.runtime.lastError
})
}
hide(e){
this.AvastWRC.Utils.getBrowserInfo().isEdge()?this.Api.browserAction.disable(e):this.Api.browserAction.disable(e,()=>{
this.Api.runtime.lastError
})
}
showText(e,t,n){
this.AvastWRC.bs.tabExists(e).then(()=>{
this.isNpsBadgeAnimation&&(this.textList[e]={
text:t,
color:n
},t="",n=void 0),this.Api.browserAction.setBadgeText({
tabId:e,
text:t||""
}),this._setBadgeColor(e),this._setBadgeBgColor(e,n)
})
}
_setBadgeColor(e){
this.Api.browserAction.setBadgeTextColor({
tabId:e,
color:"#FFFFFF"
})
}
_setBadgeBgColor(e,t){
t&&this.Api.browserAction.setBadgeBackgroundColor({
tabId:e,
color:t
})
}
setTitle(e,t){
this.AvastWRC.bs.tabExists(e).then(()=>{
this.isNpsBadgeAnimation&&(this.titleList[e]=t,
t=this.AvastWRC.localization.localizeString("background.icon.nps",[this.AvastWRC.DEFAULTS.BRAND_NAME])),
this.Api.browserAction.setTitle({
tabId:e,
title:t||""
})
})
}
setIcon(e,t){
this.AvastWRC.bs.tabExists(e).then(()=>{
this.isNpsBadgeAnimation?this.iconList[e]=t:this.Api.browserAction.setIcon({
tabId:e,
path:t
})
})
}
animateBadge(){
if(this.isNpsBadgeAnimation){
return
}
this.isNpsBadgeAnimation=!0
let e=0
this.animateInterval=setInterval(()=>{
e=++e%6
const t="common/ui/icons/nps-badge-"+e+".png"
this.Api.browserAction.setIcon({
path:t
})
},250)
}
stopAnimateBadge(){
this.isNpsBadgeAnimation=!1,clearInterval(this.animateInterval),
Object.entries(this.textList).forEach(([e,t])=>this.showText(+e,t.text,t.color)),
Object.entries(this.iconList).forEach(([e,t])=>this.setIcon(+e,t)),
Object.entries(this.titleList).forEach(([e,t])=>this.setTitle(+e,t))
}
init(){
this.Api.browserAction.onClicked.addListener(e=>{
this.AvastWRC.bs.messageTab(e,{
message:"toggleSidebar"
})
})
}
registerModuleListeners(e){
e.on("control.show",this.show.bind(this)),e.on("control.hide",this.hide.bind(this)),
e.on("control.showText",this.showText.bind(this)),
e.on("control.setTitle",this.setTitle.bind(this)),
e.on("control.setIcon",this.setIcon.bind(this)),
e.on("control.animateBadge",this.animateBadge.bind(this)),
e.on("control.stopAnimateBadge",this.stopAnimateBadge.bind(this))
}
}(va),va.bs.aos=new class{
constructor(e){
this.AvastWRC=e,this.Api=this.AvastWRC.Api
}
getButtonTitle(e){
let t=""
const n=[this.AvastWRC.DEFAULTS.BRAND_NAME]
switch(e.getRatingCategory()){
case this.AvastWRC.RATING_NONE:
t=this.AvastWRC.localization.localizeString("background.icon.unknown",n)
break
case this.AvastWRC.RATING_GOOD:
t=this.AvastWRC.localization.localizeString("background.icon.safe",n)
break
case this.AvastWRC.RATING_AVERAGE:
t=this.AvastWRC.localization.localizeString("background.icon.bad",n)
break
case this.AvastWRC.RATING_BAD:
t=this.AvastWRC.localization.localizeString("background.icon.unsafe",n)
}
return t
}
getButtonIcon(e){
if(!1===this.AvastWRC.CONFIG.URL_CONSENT){
return"icon-danger.png"
}
switch(e.getRatingCategory()){
case this.AvastWRC.RATING_NONE:
return"icon-unknown.png"
case this.AvastWRC.RATING_GOOD:
return"icon-ok.png"
case this.AvastWRC.RATING_AVERAGE:
return"icon-bad.png"
case this.AvastWRC.RATING_BAD:
return"icon-danger.png"
default:
return"icon-unknown.png"
}
}
updateButton(e,t){
this.AvastWRC.bs.tabExists(t.id).then(()=>{
const n=this.getButtonIcon(e)
if(this.AvastWRC.bal.emitEvent("control.setIcon",t.id,"common/ui/icons/"+n),!this.AvastWRC.Utils.getBrowserInfo().isEdge()){
const n=this.getButtonTitle(e)
this.AvastWRC.bal.emitEvent("control.setTitle",t.id,n)
}
})
}
updateButtonFromExtensionUrl(e,t){
this.AvastWRC.bs.tabExists(t).then(()=>{
const n=this.AvastWRC.bs.getMessageFromExtensionUrl(e),i=this.AvastWRC.bs.getDataFromExtensionUrl(e)
if(i&&"messagebox.html"===n){
switch(i.type){
case"phishing":
case"malware":
if(this.AvastWRC.bal.emitEvent("control.setIcon",t,"common/ui/icons/icon-danger.png"),
!this.AvastWRC.Utils.getBrowserInfo().isEdge()){
const e=this.AvastWRC.localization.localizeString("background.icon.unsafe",[this.AvastWRC.DEFAULTS.BRAND_NAME])
this.AvastWRC.bal.emitEvent("control.setTitle",t,e)
}
break
case"afterInstallAction":
case"nps":
this.AvastWRC.bal.emitEvent("control.setIcon",t,"common/ui/icons/icon-ok.png")
}
}
})
}
onTabUpdated(e,t,n){
"complete"===t.status&&this.AvastWRC.CONFIG.ENABLE_SERP&&this.AvastWRC.bal.search&&this.AvastWRC.bal.search.checkSearch(n)
}
onMessage(e,t){
this.AvastWRC.bal.aos.commonMessageHubAos(e.message,e,t.tab),"contentReady"===e.message&&this.Api.tabs.sendMessage(t.tab.id,{
message:"domData",
domData:this.AvastWRC.TabReqCache.get(t.tab.id,"domData")
}),"domData"===e.message&&this.AvastWRC.TabReqCache.set(t.tab.id,"domData",e.domData)
}
checkDNT(e){
if("main_frame"!==e.type&&this.AvastWRC.bal.DNT.isTracking(e.url,this.AvastWRC.bs.getHostInTab(e.tabId),e.tabId)){
if("sub_frame"===e.type){
return{
redirectUrl:"about:blank"
}
}
if("image"===e.type){
return{
redirectUrl:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAFElEQVR4XgXAAQ0AAABAMP1L30IDCPwC/o5WcS4AAAAASUVORK5CYII="
}
}
var t=this.AvastWRC.Utils.resolveLocalMock(e.url)
return t?{
redirectUrl:this.Api.extension.getURL("common/mocks/"+t)
}:{
cancel:!0
}
}
return{
cancel:!1
}
}
init(){
this.Api.runtime.onMessage.addListener(this.onMessage.bind(this)),this.Api.tabs.onUpdated.addListener(this.onTabUpdated.bind(this)),
this.AvastWRC.bal.hookOnFeatureChange("dnt",this.dntFeatureChanged.bind(this))
}
dntFeatureChanged(e){
this.checkDNTRef=this.checkDNT.bind(this),e?this.Api.webRequest.onBeforeRequest.addListener(this.checkDNTRef,{
urls:["http://*/*","https://*/*"]
},["blocking"]):(this.Api.webRequest.onBeforeRequest.removeListener(this.checkDNTRef),
this.AvastWRC.bal.DNT.resetAllTabs())
}
registerModuleListeners(e){
e.on("dnt.changed",()=>{
this.AvastWRC.bal.DNT&&this.AvastWRC.bal.DNT.updateAllTabs&&this.AvastWRC.bal.DNT.updateAllTabs()
}),
e.on("badgeInfoUpdated",(e,t,n)=>{
if(!1===this.AvastWRC.CONFIG.URL_CONSENT){
return void this.AvastWRC.bal.emitEvent("control.showText",e)
}
const i=n(e,t)
if(i){
!1===this.AvastWRC.bal.settings.get().features.dntBadge?this.AvastWRC.bal.emitEvent("control.showText",e):this.AvastWRC.bal.emitEvent("control.showText",e,i.text,i.color)
}
}),e.on("urlInfo.response",(e,t,n)=>{
this.updateButton(t,n),this.AvastWRC.local.retrieveWebshieldSettings(),
this.AvastWRC.local.retrieveVersions()
})
}
}(va),va.Voting=new class{
constructor(e){
this.AvastWRC=e,this.storedVotes={},this.AvastWRC.getStorage("votes",e=>{
"string"==typeof e&&(this.storedVotes=JSON.parse(e))
})
}
save(){
this.AvastWRC.setStorage("votes",JSON.stringify(this.storedVotes))
}
urlToDomain(e){
const t=e.match(new RegExp("^(ftp|http|https)://(w+:{0,1}w*@)?([a-z0-9-.]+[a-z]{2,6})(:[0-9]+)?(.*)?$"))
if(t&&t.length>4){
const e=t[3],n=ra.parse(e)
if(n.domain){
return n.domain
}
}
return null
}
get(e){
const t=this.urlToDomain(e)
return this.storedVotes[t]
}
_set(e,t){
const n=this.urlToDomain(e)
this.storedVotes[n]=t,this.save()
}
registerModuleListeners(e){
e.on("rated.positive",e=>this._set(e,this.AvastWRC.DEFAULTS.VOTING.POSITIVE)),
e.on("rated.negative",e=>this._set(e,this.AvastWRC.DEFAULTS.VOTING.NEGATIVE)),
e.on("rated.remove",e=>this._set(e,null))
}
}(va),va.panelbl=new class{
constructor(e){
this.AvastWRC=e,this.Api=this.AvastWRC.Api,this._tabPanelHandlers={}
}
init(){
this.Api.tabs.onActivated.addListener(e=>{
let t=e.tabId
for(let e in this._tabPanelHandlers){
t!=e&&this._tabPanelHandlers[e].viewClose(!0)
}
})
}
registerModuleListeners(e){
e.on("message.iframeReady",(e,t)=>{
const n=new $i(this.AvastWRC,{
tabId:t.id,
url:t.url
})
this._tabPanelHandlers[t.id]=n,n.init()
}),e.on("message.sidebarShow",(e,t)=>{
const n=this._tabPanelHandlers[t.id]
n&&n.messageHandler("panelOpening")
}),e.on("message.sidebarHide",(e,t)=>{
const n=this._tabPanelHandlers[t.id]
n&&n.messageHandler("panelClosing")
}),e.on("message.panelAction",(e,t)=>{
const n=this._tabPanelHandlers[t.id]
let i=e.data
n&&n.messageHandler(i.type,i)
})
}
}(va),va.localization=new class{
constructor(e,t,n){
this.AvastWRC=e,this.Api=this.AvastWRC.Api,this.messages=t,this.plurals=n,
this.locale=this.getLocale(),
this.lang=this.getDefaultLanguage()
}
getDefaultLanguage(){
let e="en"
const{browserLang:t,browserLang2:n}=this.getLanguages()
return this.messages?t in this.messages?e=t:n in this.messages&&(e=n):e=t,e
}
getLocale(){
if(!this.locale){
const e=window.navigator.language
this.locale=e.split("-").pop()
}
return this.locale
}
getLanguages(){
const e=this.Api.i18n.getUILanguage(),t=e.substring(0,2)
return{
browserLang:e,
browserLang2:t
}
}
localizeString(e,t){
let n=this.lang
if(this.messages){
this.messages[n][e]||(n="en")
let i=this.messages[n][e],a=!1
if(void 0!==t[0]&&"number"==typeof t[0]&&(a=this.plurals[n](t[0])),!1!==a){
let e=i.split(" | ")
void 0!==e[a]&&(i=e[a])
}
for(let e=0;e<t.length;e+=1){
let n=new RegExp("\\{"+e+"\\}","g")
i=i.replace(n,t[e])
}
return i
}
return this.Api.i18n.getMessage(e)
}
}(va,fa,ya.a),va.heartbeat=new class{
constructor(e,t={}){
this.AvastWRC=e,this.sender=t,this.timeoutId=null,this.lastHeartBeatTime=null,
this.AvastWRC.getStorage("lastHeartbeatTime",e=>{
this.lastHeartBeatTime=this.AvastWRC.bal.troughStorage("lastHeartbeatTime",e)
})
this.BEAT_INTERVAL=this.BEAT_INTERVAL_DEFAULT=216e5,this.CHECK_WINDOW=this.CHECK_WINDOW_DEFAULT=36e5,
this.IS_HB_ON=this.IS_HB_ON_DEFAULT=!0
}
init(){
setTimeout(()=>{
this.startHB()
},3e4)
}
updateTimesFromShepherd(){
const e=this.AvastWRC.Shepherd.getBurgerRule().heartbeat||{}
this.BEAT_INTERVAL=36e5*e.intervalInHours||this.BEAT_INTERVAL_DEFAULT,this.CHECK_WINDOW=36e5*e.checkInHours||this.CHECK_WINDOW_DEFAULT,
this.IS_HB_ON=void 0===e.isHbOn?this.IS_HB_ON_DEFAULT:e.isHbOn
}
startHB(){
this.updateTimesFromShepherd()
const e=this.lastHeartBeatTime.get()||null,t=Date.now()-e,n=this.BEAT_INTERVAL-t,i=t>this.BEAT_INTERVAL,a=n<this.CHECK_WINDOW
this.sender.log("Last HB:",new Date(e)),this.sender.log("Time since last HB :",{
s:Math.floor(t/10)/100,
min:Math.floor(t/10/60)/100,
hours:Math.floor(t/10/60/60)/100
}),i?this.sendHBnow():a?this.postponeHB(n):this.postponeHB(this.CHECK_WINDOW)
}
sendHBnow(){
this.lastHeartBeatTime.set(Date.now()),this.IS_HB_ON?this.sender.sendHB():this.sender.log("HeartBeat is turned off via Shepherd"),
this.startHB()
}
postponeHB(e){
this.sender.log("Postponing heartbeat by:",{
s:Math.floor(e/10)/100,
min:Math.floor(e/10/60)/100,
hours:Math.floor(e/10/60/60)/100
}),clearTimeout(this.timeoutId),this.timeoutId=setTimeout(()=>{
clearTimeout(this.timeoutId),
this.sender.log("Timout expired, starting HB again"),
this.startHB()
},e)
}
}(va,wa),va.bs.webshield=new class{
constructor(e,t={}){
this.AvastWRC=e,this.Api=this.AvastWRC.Api,this.sender=t,this.bufferSize=1,
this.buffer=[],
this.webRequests={},this.tabs={},this.webshieldData=[],this.Api.runtime.onMessage.addListener((e,t,n)=>{
"getWebshieldData"===e.message&&n({
webshieldData:this.webshieldData
})
})
}
requestOnSendHeaders(e){
const t=e.tabId
if(-1===t){
return
}
const n=e.requestId,i={
requestId:n,
tabId:t,
url:e.url,
type:e.type,
contentType:null,
timeSendHeaders:e.timeStamp,
timeHeadersReceived:null,
timeResponseStarted:null,
timeRequestCompleted:null,
timeDOMLoaded:null,
timePageLoaded:null
}
if(this.webRequests[n]=i,"main_frame"===i.type){
if(this.tabs[t]){
const e=this.tabs[t]
e.requestId!==n&&delete this.webRequests[e.requestId]
}
this.tabs[t]={
tabId:t,
requestId:n
}
}
}
requestOnHeadersReceived(e){
const t=e.requestId
if(this.webRequests[t]){
this.webRequests[t].timeHeadersReceived=e.timeStamp
for(let n=0;n<e.responseHeaders.length;n++){
const i=e.responseHeaders[n]
if("content-type"===i.name.toLowerCase()){
const e=i.value.replace(/([a-zA-Z0-9]+\/[a-zA-Z0-9]+).*/,"$1").toLowerCase()
this.webRequests[t].contentType=e
break
}
}
}
}
requestOnResponseStarted(e){
const t=e.requestId
if(this.webRequests[t]&&(this.webRequests[t].timeResponseStarted=e.timeStamp,e.fromCache)){
const e=this.webRequests[t]
"main_frame"===e.type&&delete this.tabs[e.tabId],delete this.webRequests[t]
}
}
requestOnCompleted(e){
const t=e.requestId
if(this.webRequests[t]&&(this.webRequests[t].timeRequestCompleted=e.timeStamp,"main_frame"!==this.webRequests[t].type)){
this.bufferAppend(t)
const e=this.webRequests[t]
"main_frame"===e.type&&delete this.tabs[e.tabId],delete this.webRequests[t]
}
}
requestOnErrorOccurred(e){
const t=e.requestId
if(!this.webRequests[t]){
return
}
const n=this.webRequests[t]
"main_frame"===n.type&&delete this.tabs[n.tabId],delete this.webRequests[t]
}
navigationOnDOMContentLoaded(e){
if(0!==e.frameId){
return
}
const t=e.tabId
if(!this.tabs[t]){
return
}
const n=this.tabs[t].requestId
this.webRequests[n]&&this.webRequests[n].timeRequestCompleted&&(this.webRequests[n].timeDOMLoaded=e.timeStamp)
}
navigationOnCompleted(e){
if(0!==e.frameId){
return
}
const t=e.tabId
if(!this.tabs[t]){
return
}
const n=this.tabs[t].requestId
if(!this.webRequests[n]){
return
}
if(!this.webRequests[n].timeRequestCompleted){
return
}
this.webRequests[n].timePageLoaded=e.timeStamp,this.bufferAppend(n)
const i=this.webRequests[n]
"main_frame"===i.type&&delete this.tabs[i.tabId],delete this.webRequests[n]
}
navigationOnErrorOccurred(e){
if(0!==e.frameId){
return
}
const t=e.tabId
if(!this.tabs[t]){
return
}
const n=this.tabs[t].requestId,i=this.webRequests[n]
"main_frame"===i.type&&delete this.tabs[i.tabId],delete this.webRequests[n]
}
init(){
const e={
urls:["http://*/*","https://*/*"]
}
this.Api.webRequest.onSendHeaders.addListener(this.requestOnSendHeaders.bind(this),e),
this.Api.webRequest.onHeadersReceived.addListener(this.requestOnHeadersReceived.bind(this),e,["responseHeaders"]),
this.Api.webRequest.onResponseStarted.addListener(this.requestOnResponseStarted.bind(this),e),
this.Api.webRequest.onCompleted.addListener(this.requestOnCompleted.bind(this),e),
this.Api.webRequest.onErrorOccurred.addListener(this.requestOnErrorOccurred.bind(this),e),
this.Api.webNavigation.onDOMContentLoaded.addListener(this.navigationOnDOMContentLoaded.bind(this)),
this.Api.webNavigation.onCompleted.addListener(this.navigationOnCompleted.bind(this)),
this.Api.webNavigation.onErrorOccurred.addListener(this.navigationOnErrorOccurred.bind(this))
}
getWebshieldSetting(){
return new Promise((e,t)=>{
const n=["avcfg://WebShield/Common/ProviderEnabled","avcfg://WebShield/Common/TemporaryDisabled","avcfg://WebShield/WebScanner/HttpsScanning","avcfg://WebShield/WebScanner/WebScanning"]
this.AvastWRC.local.getProperties(n).then(i=>{
if(i&&i.length===n.length){
const t=1,n=0,a=1,o=1
e({
ProviderEnabled:""===i[0]?t:1*i[0],
TemporaryDisabled:""===i[1]?n:1*i[1],
HttpsScanning:""===i[2]?a:1*i[2],
WebScanning:""===i[3]?o:1*i[3]
})
}else{
t(null)
}
})
})
}
bufferAppend(e){
if(!this.AvastWRC.Shepherd){
return
}
const t=this.webRequests[e],n=t.url,i=n.match(new RegExp("^(ftp|http|https)://(w+:{0,1}w*@)?([a-z0-9-.]+[a-z]{2,6})(:[0-9]+)?(.*)?$"))
if(!i||i.length<=4){
return
}
const a=Fi.parse(i[3]),o=this.AvastWRC.Shepherd.getWebshieldRule(a.domain),r=!!(1&o.flags),s=!!(2&o.flags),u=!!(4&o.flags)
let l=!1
if(r&&"main_frame"===t.type?l=!0:!s||"main_frame"===t.type||"text/html"!==t.contentType&&"application/json"!==t.contentType?u&&"main_frame"!==t.type&&"text/html"!==t.contentType&&"application/json"!==t.contentType&&(l=!0):l=!0,
l){
const e={
url:n,
timeHeadersReceived:Math.round(t.timeHeadersReceived-t.timeSendHeaders),
timeResponseStarted:Math.round(t.timeResponseStarted-t.timeSendHeaders),
timeRequestCompleted:Math.round(t.timeRequestCompleted-t.timeSendHeaders)
}
"main_frame"===t.type&&(e.timeDOMLoaded=Math.round(t.timeDOMLoaded-t.timeSendHeaders),
e.timePageLoaded=Math.round(t.timePageLoaded-t.timeSendHeaders)),
this.buffer.push(e),
this.buffer.length>=this.bufferSize&&this.bufferSend()
}
}
bufferSend(){
const e=this.buffer
this.buffer=[],!1!==this.AvastWRC.CONFIG.PRODUCT_ANALYSIS&&this.getWebshieldSetting().then(t=>{
let n=0
n+=1*t.ProviderEnabled,n+=2*t.TemporaryDisabled,n+=4*t.HttpsScanning,n+=8*t.WebScanning
for(let t=0;t<e.length;t++){
const i=e[t],a=this.AvastWRC.bal.getHostFromUrl(i.url)
this.sender.sendWebshield(n,a,i.timeHeadersReceived,i.timeResponseStarted,i.timeRequestCompleted,i.timeDOMLoaded,i.timePageLoaded)
}
for(let t=0;t<e.length;t++){
const i=e[t]
this.webshieldData.push([n,i.url,i.timeHeadersReceived,i.timeResponseStarted,i.timeRequestCompleted,i.timeDOMLoaded,i.timePageLoaded]),
this.webshieldData.length>1e3&&this.webshieldData.shift()
}
})
}
}(va,wa),va.bal.registerModule(va.bal.search),va.bal.registerModule(va.bal.aos),
va.bal.registerModule(va.bal.secureBrowser),
va.bal.registerModule(va.bal.DNT),va.bal.registerModule(va.bal.NPS),
va.bal.registerModule(va.tracking),
va.bal.registerModule(va.Shepherd),va.bal.registerModule(va.bs),
va.bal.registerModule(va.bs.icon),
va.bal.registerModule(va.bs.webshield),va.bal.registerModule(va.bs.aos),
va.bal.registerModule(va.panelbl),
va.bal.registerModule(wa),va.bal.registerModule(va.Voting),
va.bal.registerModule(va.heartbeat),
va.init(va.bs.EDITIONS_CONFIG.callerId),va.bal.init(va.bs.EDITIONS_CONFIG)
}])
