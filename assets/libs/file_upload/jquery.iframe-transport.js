/*
 * jQuery Iframe Transport Plugin 1.7
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2011, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

/*jslint unparam: true, nomen: true */
/*global define, window, document */
(function(e){"use strict";if(typeof define==="function"&&define.amd){define(["jquery"],e)}else{e(window.jQuery)}})(function(e){"use strict";var t=0;e.ajaxTransport("iframe",function(n){if(n.async){var r,i,s;return{send:function(o,u){r=e('<form style="display:none;"></form>');r.attr("accept-charset",n.formAcceptCharset);s=/\?/.test(n.url)?"&":"?";if(n.type==="DELETE"){n.url=n.url+s+"_method=DELETE";n.type="POST"}else if(n.type==="PUT"){n.url=n.url+s+"_method=PUT";n.type="POST"}else if(n.type==="PATCH"){n.url=n.url+s+"_method=PATCH";n.type="POST"}t+=1;i=e('<iframe src="javascript:false;" name="iframe-transport-'+t+'"></iframe>').bind("load",function(){var t,s=e.isArray(n.paramName)?n.paramName:[n.paramName];i.unbind("load").bind("load",function(){var t;try{t=i.contents();if(!t.length||!t[0].firstChild){throw new Error}}catch(n){t=undefined}u(200,"success",{iframe:t});e('<iframe src="javascript:false;"></iframe>').appendTo(r);window.setTimeout(function(){r.remove()},0)});r.prop("target",i.prop("name")).prop("action",n.url).prop("method",n.type);if(n.formData){e.each(n.formData,function(t,n){e('<input type="hidden"/>').prop("name",n.name).val(n.value).appendTo(r)})}if(n.fileInput&&n.fileInput.length&&n.type==="POST"){t=n.fileInput.clone();n.fileInput.after(function(e){return t[e]});if(n.paramName){n.fileInput.each(function(t){e(this).prop("name",s[t]||n.paramName)})}r.append(n.fileInput).prop("enctype","multipart/form-data").prop("encoding","multipart/form-data")}r.submit();if(t&&t.length){n.fileInput.each(function(n,r){var i=e(t[n]);e(r).prop("name",i.prop("name"));i.replaceWith(r)})}});r.append(i).appendTo(document.body)},abort:function(){if(i){i.unbind("load").prop("src","javascript".concat(":false;"))}if(r){r.remove()}}}}});e.ajaxSetup({cache:false,converters:{"iframe text":function(t){return t&&e(t[0].body).text()},"iframe json":function(t){return t&&e.parseJSON(e(t[0].body).text())},"iframe html":function(t){return t&&e(t[0].body).html()},"iframe xml":function(t){var n=t&&t[0];return n&&e.isXMLDoc(n)?n:e.parseXML(n.XMLDocument&&n.XMLDocument.xml||e(n.body).html())},"iframe script":function(t){return t&&e.globalEval(e(t[0].body).text())}}})})