define([
	"jquery"
],

function() {
	var CSSHelpers = {};

	CSSHelpers.setZoom = function(selector,zoom) {
	  	$(selector).css("zoom", zoom);
	}

	return CSSHelpers;
});