/*
 * JavaScript Load Image Exif Parser 1.0.0
 * https://github.com/blueimp/JavaScript-Load-Image
 *
 * Copyright 2013, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

/*jslint unparam: true */
/*global define, window, console */
(function(e){"use strict";if(typeof define==="function"&&define.amd){define(["loadimage","loadimagemeta"],e)}else{e(window.loadImage)}})(function(e){"use strict";e.ExifMap=function(){return this};e.ExifMap.prototype.map={Orientation:274};e.ExifMap.prototype.get=function(e){return this[e]||this[this.map[e]]};e.getExifThumbnail=function(e,t,n){var r,i,s;if(!n||t+n>e.byteLength){console.log("Invalid Exif data: Invalid thumbnail data.");return}r=[];for(i=0;i<n;i+=1){s=e.getUint8(t+i);r.push((s<16?"0":"")+s.toString(16))}return"data:image/jpeg,%"+r.join("%")};e.exifTagTypes={1:{getValue:function(e,t){return e.getUint8(t)},size:1},2:{getValue:function(e,t){return String.fromCharCode(e.getUint8(t))},size:1,ascii:true},3:{getValue:function(e,t,n){return e.getUint16(t,n)},size:2},4:{getValue:function(e,t,n){return e.getUint32(t,n)},size:4},5:{getValue:function(e,t,n){return e.getUint32(t,n)/e.getUint32(t+4,n)},size:8},9:{getValue:function(e,t,n){return e.getInt32(t,n)},size:4},10:{getValue:function(e,t,n){return e.getInt32(t,n)/e.getInt32(t+4,n)},size:8}};e.exifTagTypes[7]=e.exifTagTypes[1];e.getExifValue=function(t,n,r,i,s,o){var u=e.exifTagTypes[i],a,f,l,c,h,p;if(!u){console.log("Invalid Exif data: Invalid tag type.");return}a=u.size*s;f=a>4?n+t.getUint32(r+8,o):r+8;if(f+a>t.byteLength){console.log("Invalid Exif data: Invalid data offset.");return}if(s===1){return u.getValue(t,f,o)}l=[];for(c=0;c<s;c+=1){l[c]=u.getValue(t,f+c*u.size,o)}if(u.ascii){h="";for(c=0;c<l.length;c+=1){p=l[c];if(p==="\0"){break}h+=p}return h}return l};e.parseExifTag=function(t,n,r,i,s){var o=t.getUint16(r,i);s.exif[o]=e.getExifValue(t,n,r,t.getUint16(r+2,i),t.getUint32(r+4,i),i)};e.parseExifTags=function(e,t,n,r,i){var s,o,u;if(n+6>e.byteLength){console.log("Invalid Exif data: Invalid directory offset.");return}s=e.getUint16(n,r);o=n+2+12*s;if(o+4>e.byteLength){console.log("Invalid Exif data: Invalid directory size.");return}for(u=0;u<s;u+=1){this.parseExifTag(e,t,n+2+12*u,r,i)}return e.getUint32(o,r)};e.parseExifData=function(t,n,r,i,s){if(s.disableExif){return}var o=n+10,u,a,f;if(t.getUint32(n+4)!==1165519206){return}if(o+8>t.byteLength){console.log("Invalid Exif data: Invalid segment size.");return}if(t.getUint16(n+8)!==0){console.log("Invalid Exif data: Missing byte alignment offset.");return}switch(t.getUint16(o)){case 18761:u=true;break;case 19789:u=false;break;default:console.log("Invalid Exif data: Invalid byte alignment marker.");return}if(t.getUint16(o+2,u)!==42){console.log("Invalid Exif data: Missing TIFF marker.");return}a=t.getUint32(o+4,u);i.exif=new e.ExifMap;a=e.parseExifTags(t,o,o+a,u,i);if(a&&!s.disableExifThumbnail){f={exif:{}};a=e.parseExifTags(t,o,o+a,u,f);if(f.exif[513]){i.exif.Thumbnail=e.getExifThumbnail(t,o+f.exif[513],f.exif[514])}}if(i.exif[34665]&&!s.disableExifSub){e.parseExifTags(t,o,o+i.exif[34665],u,i)}if(i.exif[34853]&&!s.disableExifGps){e.parseExifTags(t,o,o+i.exif[34853],u,i)}};e.metaDataParsers.jpeg[65505].push(e.parseExifData)})