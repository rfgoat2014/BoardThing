define([
	"jquery"
],

function() {
	var Cluster = {};

	Cluster.Insert = function(boardId, clusterId, cardId, callback) {
		$.ajax({
			type: "PUT",
			url: "/workspace/boards/clusters/" + boardId + "/" + clusterId,
			data: {
  				action: "create",
  				cards: [{ id: cardId }]
			},
			success: function(response) {
				if (callback) callback(response);
			}
		});
	};

	Cluster.AttachCard = function(boardId, clusterId, cardId, callback) {
        $.ajax({
            url: "/workspace/boards/clusters/cards/" + boardId + "/" + clusterId + "/" + cardId,
            type: 'POST',
            dataType: "json",
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	};

	Cluster.DetachCardFromcluster = function(boardId, clusterId, cardId, callback) {
        $.ajax({
            url: "/workspace/boards/clusters/cards/" + boardId + "/" + clusterId + "/" + cardId,
            type: 'DELETE',
            dataType: "json",
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	};

	Cluster.UpdatePosition = function(boardId, clusterId, xPos, yPos, callback) {
        $.ajax({
            url: "/workspace/boards/clusters/position/" + boardId + "/" + clusterId,
            type: 'PUT',
            dataType: "json",
			data: {
	        	xPos: xPos,
	        	yPos: yPos
	        },
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	};

	Cluster.Expand = function(boardId, clusterId, callback) {
        $.ajax({
            url: "/workspace/boards/clusters/expand/" + boardId + "/" + clusterId,
            type: 'PUT',
            dataType: "json",
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	};

	Cluster.Collapse = function(boardId, clusterId, callback) {
        $.ajax({
            url: "/workspace/boards/clusters/collapse/" + boardId + "/" + clusterId,
            type: 'PUT',
            dataType: "json",
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	};

	Cluster.Sort = function(boardId, clusterId, cards, callback) {
		$.ajax({
		    url: "/workspace/boards/clusters/sort/" + boardId + "/" + clusterId,
		    type: 'PUT',
		    dataType: "json",
		    data: {
		    	cards: cards
		    },
			success: function(response) {
				if (callback) callback(response);
			}
		});
	}

	return Cluster;
});