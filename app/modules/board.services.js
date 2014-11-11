define([
	"jquery"
],

function() {
	var Board = {};

	Board.GetCards = function(id, callback) {
		$.ajax({
			type: "GET",
			url: "/workspace/boards/cards/" + id,
			success: function(response) {
				if (callback) callback(response);
			}
		});
	};

	Board.UpdateCardZIndexes = function(workspaceId, boardId, sortedCards, callback) {
        $.ajax({
            url: "/workspace/boards/cards/zindex/" + workspaceId + "/" + boardId,
            type: 'PUT',
            dataType: "json",
            data: { 
            	cards: sortedCards 
            },
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	}
	
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