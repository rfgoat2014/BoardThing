define([
	"jquery"
],

function() {
	var CSSHelpers = {};

	CSSHelpers.generateZoomAttributes = function(selector,zoom) {
	  	$(selector).css("zoom", zoom);
	  	$(selector).css("-moz-transform", zoom);
	  	$(selector).css("-moz-transform-origin", "0 0");
	  	$(selector).css("-o-transform", zoom);
	  	$(selector).css("-o-transform-origin", "0 0");
	  	$(selector).css("-webkit-transform", zoom);
	  	$(selector).css("-webkit-transform-origin", "0 0");
	  	$(selector).css("transform", zoom);
	  	$(selector).css("transform-origin", "0 0");
	}

	return CSSHelpers;
});