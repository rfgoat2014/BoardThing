define([
	"jquery"
],

function() {
	var Board = {};

	Board.Insert = function(id, title, callback) {
		$.ajax({
			type: "POST",
			url: "/workspaces/boards/" + id,
			data:  {
				title: title
			},
			success: function(response) {
				if (callback) callback(response);
			}
		});
	};

	return Board;
});