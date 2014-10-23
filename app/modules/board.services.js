define([
	"jquery"
],

function() {
	var Board = {};

	Card.GetCards = function(id, callback) {
		$.ajax({
			type: "GET",
			url: "/workspace/boards/cards/" + id,
			success: function(response) {
				if (callback) callback(response);
			}
		});
	};
	
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