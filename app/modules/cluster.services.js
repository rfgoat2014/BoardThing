define([
	"jquery"
],

function() {
	var Cluster = {};

	Cluster.Insert = function(boardId, clusterId, cluster, callback) {
		$.ajax({
			type: "PUT",
			url: "/workspace/boards/clusters/" + boardId + "/" + clusterId,
			data: cluster,
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

	Cluster.DetachCard = function(boardId, clusterId, cardId, callback) {
        $.ajax({
            url: "/workspace/boards/clusters/cards/" + boardId + "/" + clusterId + "/" + cardId,
            type: 'DELETE',
            dataType: "json",
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	};

	Cluster.AttachCluster = function(boardId, targetClusterId, sourceClusterId, callback) {
        $.ajax({
            url: "/workspace/boards/clusters/clusters/" + boardId + "/" + targetClusterId + "/" + sourceClusterId,
            type: 'POST',
            dataType: "json",
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	};

	Cluster.DetachCluster = function(boardId, targetClusterId, sourceClusterId, callback) {
        $.ajax({
            url: "/workspace/boards/clusters/clusters/" + boardId + "/" + targetClusterId + "/" + sourceClusterId,
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

	Cluster.StartDotVoting = function(boardId, clusterId, callback) {
        $.ajax({
            url: "/workspace/boards/clusters/startVoting/" + boardId + "/" + clusterId,
            type: 'PUT',
            dataType: "json",
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	};

	Cluster.StopDotVoting = function(boardId, clusterId, callback) {
        $.ajax({
            url: "/workspace/boards/clusters/stopVoting/" + boardId + "/" + clusterId,
            type: 'PUT',
            dataType: "json",
			success: function(response) {
				if (callback) callback(response);
			}
    	});
	};

	Cluster.AddVote = function(boardId, cardId, callback) {
        $.ajax({
            url: "/workspace/boards/clusters/addVote/" + boardId + "/" + cardId,
            type: "POST",
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