define([
	"jquery"
],

function() {
	var CSSHelpers = {};

	CSSHelpers.setZoom = function(element,zoom) {
	  	element.css("zoom", zoom);
	}

	return CSSHelpers;
});