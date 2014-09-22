define([
	"jquery"
],

function() {
	var Services = {};

	Services.Athenticate = function(username, password, callback) {
		$.ajax({
			type: "POST",
			url: "/auth",
			data: {
				username: username,
				password: password
			},
			success: function(response) {
				if (callback) callback(response);
			}
		});
	};

	return Services;
});