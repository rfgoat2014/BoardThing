define([
	"modules/board",
	"modules/card",
	"modules/boardMap",
	"modules/utils",
	"modules/card.services",
	"modules/workspace.services",
	"raphael"
],

function(Board, Card, BoardMap, Utils, Card_Services, Workspace_Services) {
	var Workspace = {};

	//////////////////////// Views

	// ===== View for viewing a workdspace

	Workspace.Index = Backbone.View.extend({
		el: "<div>",
		_paper: null,
		_selectedBoard: null,

		initialize: function(options) {
			this.render();

		    // Check if is being viewed on a mobile device

			var iOS = navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false;
			var android = navigator.userAgent.match(/Android/i) ? true : false;

		    this._isMobile = (iOS || android);	
		},

      	events: {
      		"click #view-board-map": "viewBoardMap"
      	},

		render: function() {
			var that = this;

			$.get("/app/templates/workspace/index.html", function(contents) {
				var boards = that.model.get("boards");

				for (var i=0, boardsLength=boards.length; i<boardsLength; i+=1) {
					if ((that.model.get("startBoardId")) && (that.model.get("startBoardId").toString() == boards[i].id.toString())) that._selectedBoard = new Board.Model(boards[i]);
					else if ((!that.model.get("startBoardId")) && (boards[i].position == 1)) that._selectedBoard = new Board.Model(boards[i]);
				
					if (that._selectedBoard) break;
				}

				if ((!that._selectedBoard) && (boards.length > 0)) that._selectedBoard = new Board.Model(boards[0]);
				else if (!that._selectedBoard) that._selectedBoard = new Board.Model({ id: "", title: "", cards: [] });

				that.$el.html(_.template(contents, that._selectedBoard.toJSON()));

				that.connectSockets();

				that.afterRender();
			}, "text");
		},

		afterRender: function() {
			var that = this;

			this.setupBoard();
		},

		setupBoard: function() {
			if (this._paper) {
				this._paper.remove();
				this._paper = null;
			}
			
			this.$("#board").empty();

			this.$("#board").width(this._selectedBoard.get("width"));
			this.$("#board").height(this._selectedBoard.get("height"));

			var overflowWidth = this._selectedBoard.get("width") - $(window).width(),
				overflowHeight = this._selectedBoard.get("height") - $(window).height();

			if (overflowWidth > 0) this.$("#board-container").scrollLeft(overflowWidth/2);
			if (overflowHeight > 0) this.$("#board-container").scrollTop(overflowHeight/2);

			this._paper = Raphael(document.getElementById("board"), this._selectedBoard.get("width"), this._selectedBoard.get("height"));
		},

		getBoardItems: function() {
			var that = this;

			var boards = this.model.get("boards");

			for (var i=0, boardsLength=boards.length; i<boardsLength; i+=1) {
				Card_Services.Get(boards[i].id, function(response) {
					if (response.status == "success") {
						for (var j=0, boardsLength=boards.length; j<boardsLength; j+=1) {
							if (response.board.id.toString() == boards[j].id.toString()) {
								boards[j].cards = response.board.cards;
								break;
							}
						}

						if (response.board.id.toString() == that._selectedBoard.get("id").toString()) {
							that._selectedBoard.set("cards", response.board.cards);
						
							that.drawBoardItems();
						}
					}
				});
			}

			this.createAddCardDialog();
		},

		drawBoardItems: function() {
			console.log("Drawing Cards");
		},

		createAddCardDialog: function() {
			var that = this;

			this._addCard = new Card.Add({ parent: this, isMobile: this._isMobile });
			this._addCard.render();

			this.$("#card-create-overlay").html(this._addCard.el);

  			document.addEventListener("keydown", function(e) {
  				var charCode = e.charCode || e.keyCode;

  				var valid = (charCode > 47 && charCode < 58) || charCode == 32 || charCode == 13 || (charCode > 64 && charCode < 91) || (charCode > 95 && charCode < 112) || (charCode > 185 && charCode < 193) || (charCode > 218 && charCode < 223);
  				
  				if ((valid) && (!that._blockAddCard)) {
					that.showAddCard();
				}
  			}, false);
		},
		
		showAddCard: function() {
    		try {
				this._blockAddCard = true;

				if (this._addCard) {
					this.$("#card-create-overlay").show();
					this._addCard.setSelectedColor(this.getSelectedColor);
					this._addCard.focusCardText();
				}	
			}
			catch (err) {
				Utils.sendClientError("showAddCard", err);
			}
		},

		hideAddCard: function() {
    		try {
				this._blockAddCard = false;
				
				if (this._addCard) {
					this.$("#card-create-overlay").hide();
					this._addCard.clearCardText();
				}
			}
			catch (err) {
				Utils.sendClientError("hideAddCard", err);
			}
		},

		getWorkspaceId: function() {
			return this.model.get("id");
		},

		getSelectedBoardId: function() {
			return this._selectedBoard.get("id");
		},

		getSelectedColor: function() {
			return "#ffffff";
		},

		viewBoardMap: function() {
			this._boardMap = new BoardMap.Index({ model: this.model});

			this.$("#overlay").html(this._boardMap.el);
			this.$("#overlay").show();
		},

		connectSockets: function() {
			var that = this;

			if (this._socket != null) {
				try
				{
					console.log("Retrying websocket connection");
				}
				catch (er) {}

    			this._socket.removeAllListeners();
    			this._socket = null;
			}

			this._socket = eio("http://localhost:8080?random=" + new Date().getTime());

			// Handle socket actions

		  	this._socket.on("open", function() {
		  		try
		  		{
		  			console.log("Connected to websocket");
				}
				catch (er) {}

				that._socket.send(JSON.stringify({ topic: that.model.get("id"), action: "Establishing connection" }));

			    that._socket.on("message", function(package) {
			  		that._connectionAttempts = 0;

			  		if (!that._boardBuilt) {

			      		// Render the board items

			        	that.getBoardItems();

			  			that._boardBuilt= true;
			  		}

			  		var socketPackage = null;

			  		try {
			    		socketPackage = JSON.parse(package);
			    	}
			    	catch (err) {
			    		try {
				    		console.log("Error parsing data packag: " + err);
				    	}
				    	catch (err) {}
			    	}

			    	if ((socketPackage != null) && (socketPackage.action != null) && (that._boardContentLoaded)) {
			    		try {
			    			switch(socketPackage.action) {
			    			}
			    		}	
						catch (err) {
							Utils.sendClientError("connectSockets", err);
						}
			    	}
			    });

			  	that._socket.on("close", function() {
			  		try
			  		{
			  			console.log("Disconnected from websocket");
					}
					catch (er) {}

			  		if (that._attemptReconnect) {
				  		that._connectionAttempts++;

				  		if (that._connectionAttempts < 10) {
				  			console.log(that._connectionAttempts);
		        			that.connectSockets();
				  		}
			  		}
			  	});

			  	that._socket.on("error", function() {
			  		try
			  		{
			  			console.log("Error with websocket");
					}
					catch (er) {}

			  		if (that._attemptReconnect) {
				  		that._connectionAttempts++;

				  		if (that._connectionAttempts < 10) {
				  			console.log(that._connectionAttempts);
		        			that.connectSockets();
				  		}
			  		}
			  	});
			});
		},

		closeSockets: function() {
        	this._attemptReconnect = false;
        	
			this._socket.close();

			this._socket.removeAllListeners();
			this._socket = null;
		}
	});

	// ===== View to create a new workspace

	Workspace.Add = Backbone.View.extend({
    	el: "<div>",

		initialize: function(options) {
			this.el.id = "add-workspace";
			this.el.className = "popup-container";

			this.parent = options.parent;

			$(this.el).click(function(e) {
				e.stopPropagation();
				e.preventDefault();
			});

			this.render();
      	},

      	events: {
      		"click #cancel-button": "cancel",
      		"click #add-button": "create"
      	},

		render: function() {
			var that = this;

			$.get("/app/templates/workspace/add.html", function(contents) {
				that.$el.html(_.template(contents));
			}, "text");
		},

		cancel: function() {
			this.parent.trigger("cancelAddWorkspace");
		},

		create: function() {
			var that = this;

			this.$("#create-error-message").empty();

			var title = this.$("#title").val();

			if ((title) && (title.trim().length > 0)) {
				Workspace_Services.Insert(title.trim(), function(response) {
					if (response.status == "success") that.parent.trigger("workspaceAdded", response.workspace);
					else that.$("#create-error-message").html(response.message);
				})
			}
			else {
				this.$("#create-error-message").html("Workspaces require a title");
			}
		},

		removeDialog: function() {
			$(this.el).detach();
			this.remove();
		}
	});

	// ===== View of workspace on main page

	Workspace.ListItem = Backbone.View.extend({
    	el: "<tr>",

		initialize: function(options) {
			this.render();

			this.parent = options.parent;
      	},

		render: function(){
			var that = this;

			$.get("/app/templates/workspace/listItem.html", function(contents) {
				that.$el.html(_.template(contents, that.model.toJSON()));

				that.afterRender();

				that.bindEvents();
			}, "text");
		},

		afterRender: function() {
			if (!this.model.get("isOwner")) this.$("#workspace-share_" + this.model.get("id"));
		},

		bindEvents: function() {
			var that = this;

			this.$el.click(function(e) {
				e.stopPropagation();
				e.preventDefault();

				that.parent.trigger("viewWorkspace", that.model.get("id"));
			});
		}
	});

	//////////////////////// Models

	Workspace.Model = Backbone.Model.extend();

	return Workspace;
});