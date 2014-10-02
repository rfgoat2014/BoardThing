define([
	"jquery"
],

function() {
	var Utils = {};


	Utils.sendClientError = function(methodName, err) {
		var error = new Error(err);

		$.ajax({
			url: "/clientError",
			type: "POST",
			data: {
				error: methodName + ": " + error.stack,
				line: "",
				uri: "",
				client: navigator.appName,
				version: navigator.userAgent
			}
		});
	};

	return Utils;
});