define([
	"jquery"
],

function() {
	var Workspace = {};

	Workspace.GetAll = function(callback) {
		$.ajax({
			type: "GET",
			url: "/workspaces",
			success: function(response) {
				if (callback) callback(response);
			}
		});
	};

	return Workspace;
});