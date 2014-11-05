define([
	"modules/board.model",
	"modules/add.card",
	"modules/card",
	"modules/card.model",
	"modules/cluster",
	"modules/cluster.model",
	"modules/boardMap",
	"modules/utils",
	"modules/workspace.services",
	"modules/board.services",
	"modules/card.services",
	"modules/cluster.services",
	"jquery"
],

function(BoardModel, AddCard, Card, CardModel, Cluster, ClusterModel, BoardMap, Utils, Workspace_Services, Board_Services, Card_Services, Cluster_Services) {
	var Workspace = {};

	// ===== View for viewing a workdspace

	Workspace.Index = Backbone.View.extend({
		el: "<div>",

		_editing: false,

		_currentMousePosition: { x: -1, y: -1 },

		_selectedBoard: null,
		_boardEntities: [],
		_dropPosition: null,
	    _cardsDroppedInPosition: 0,

		initialize: function(options) {
			this.render();

		    // Check if is being viewed on a mobile device

			var iOS = navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false;
			var android = navigator.userAgent.match(/Android/i) ? true : false;

		    this._isMobile = (iOS || android);	
		},

      	// {{ Build Workspace }}

		render: function() {
			var that = this;

			$.get("/app/templates/workspace/index.html", function(contents) {
				var boards = that.model.boards;

				for (var i=0, boardsLength=boards.length; i<boardsLength; i+=1) {
					if ((that.model.startBoardId) && (that.model.startBoardId.toString() == boards[i].id.toString())) that._selectedBoard = boards[i];
					else if ((!that.model.startBoardId) && (boards[i].position == 1)) that._selectedBoard = boards[i];
				
					if (that._selectedBoard) break;
				}

				if ((!that._selectedBoard) && (boards.length > 0)) that._selectedBoard = boards[0];
				else if (!that._selectedBoard) that._selectedBoard = { id: "", title: "", cards: [] };

				that.$el.html(_.template(contents, that._selectedBoard));

				that.connectSockets();

				that.setupBoard();

				that.unbind();
				that.bind();
			}, "text");
		},

		setupBoard: function() {
			this.$("#board-cards").empty();

			this.$("#board-cards").width(this._selectedBoard.width);
			this.$("#board-cards").height(this._selectedBoard.height);

			this.$("#page-canvas").width(this._selectedBoard.width);
			this.$("#page-canvas").height(this._selectedBoard.height);

			var overflowWidth = this._selectedBoard.width - $(window).width(),
				overflowHeight = this._selectedBoard.height - $(window).height();

			if (overflowWidth > 0) this.$("#board-container").scrollLeft(overflowWidth/2);
			if (overflowHeight > 0) this.$("#board-container").scrollTop(overflowHeight/2);
		},

		unbind: function() {
			this.$("#board-cards").unbind("mousemove");

			if (this._isMobile) {
      			this.$("#board-cards").unbind("click");
			}
			else {
				var canvas = document.getElementById("page-canvas");

				try {
					canvas.removeEventListener('click');
				}
				catch (err) {}

				try {
					canvas.removeEventListener('dblclick');
				}
				catch (err) {}
			}

			this.$("#card-create-overlay").unbind("click");
		},

		bind: function() {
			var that = this,
				canvas = document.getElementById("page-canvas");

			if (this._isMobile) {
      			this.$("#board-cards").click(function(e) {
					var selectedPageTool = that.getSelectedPageTool();

					if (selectedPageTool == "card") {
	        			that._dropPosition = { x: ($(this).scrollLeft() + e.pageX),  y: ($(this).scrollTop() + e.pageY) };

	        			that._cardsDroppedInPosition = 0;

						that.showAddCard();
					}
		        });

				canvas.addEventListener("touchstart", function(e) {
				}, false);

				canvas.addEventListener("touchend", function(e) {
				}, false);

				canvas.addEventListener("touchmove", function(e) {
				}, false);
			}
			else {
	            canvas.addEventListener('click', function(e) {
					that.removePopups();
				});

	            canvas.addEventListener('dblclick', function(e) {
					if (that.getSelectedPageTool() == "card") {
	        			that._dropPosition = { x: that._currentMousePosition.x,  y: that._currentMousePosition.y };

	        			that._cardsDroppedInPosition = 0;

						that.showAddCard();
				    }
				});

				canvas.onmousedown = function(e) {
				};

				canvas.onmouseup = function(e) {
				}
			}

			this.$("#view-board-map").click(function(event) {
				that.viewBoardMap();
			});

		    this.$("#board-container").mousemove(function(event) {
		        that._currentMousePosition.x = that.$("#board-container").scrollLeft() + event.pageX;
		        that._currentMousePosition.y = that.$("#board-container").scrollTop() + event.pageY;
		    });

			this.$("#card-create-overlay").click(function(event) {
				that.hideAddCard();
			});
		},

		getBoardItems: function() {
			var that = this,
				boards = this.model.boards;

			for (var i=0, boardsLength=boards.length; i<boardsLength; i+=1) {
				if (boards[i].id == that._selectedBoard.id) {
					Board_Services.GetCards(boards[i].id, function(response) {
						if (response.code == 200) {
							boards[i].cards = response.board.cards;
							
							that._selectedBoard.cards = response.board.cards;

							that.drawBoardItems();
						}
					});

					break;
				}
			}

			this.createAddCardDialog();
		},

		drawBoardItems: function() {
			//Clear out the board entities array. Being really rigorous to stop memory leaks
			if (this._boardEntities.length > 0) {
				for (var i=0, boardEntitiesLength=this._boardEntities.length; i<boardEntitiesLength; i+=1) {
					this._boardEntities[i] = null;
				}

				this._boardEntities = [];
			}

			// Get all the cards the exist in the selected board and draw them;
			if (this._selectedBoard.cards) {
				for (var i=0, boardCardsLength=this._selectedBoard.cards.length; i<boardCardsLength; i+=1) {
					if (this._selectedBoard.cards[i].cards.length == 0) this.addCardToBoard(this._selectedBoard.cards[i]);
					else this.addClusterToBoard(this._selectedBoard.cards[i]);
				}
			}

			this._boardContentLoaded = true;
		},

		// {{ Getters }}

		getCurrentMousePosition: function() {
			return this._currentMousePosition;
		},

		getSelectedColor: function() {
			return "#ffffff";
		},

		getSelectedPageTool: function() {
			return "card";
		},

		getId: function() {
			return this.model.id;
		},

		getWidth: function() {
			return this.model.width;
		},

		getHeight: function() {
			return this.model.height;
		},

		getBoards: function() {
			return this.model.boards;
		},

		getSelectedBoardId: function() {
			return this._selectedBoard.id;
		},

		getObjectModel: function(id) {
			for (var i=0, boardEntitiesLength=this._boardEntities.length; i<boardEntitiesLength; i+=1) {
				if (this._boardEntities[i].getId() == id) return this._boardEntities[i].getModel();
				else if (this._boardEntities[i].getType() == "cluster") {
					var objType = this._boardEntities[i].getObjectModel(id);

					if (objType) return objType;
				}
			}

			return null;
		},

		// {{ Board map }}

		viewBoardMap: function() {
			this._boardMap = new BoardMap.Index({ workspace: this });

			this.$("#overlay").html(this._boardMap.el);
			this.$("#overlay").show();
		},


		hideBoardMap: function() {
			this._boardMap.destroy();
			delete this._boardMap;

			this.$("#overlay").empty();
			this.$("#overlay").hide();
		},

		addBoard: function(board) {
			this.model.boards.push(BoardModel.Generate(board, this.model.id));
		},

		setSelectedBoard: function(boardId) {
			var that = this,
				boards = this.model.boards;
			
			this._boardContentLoaded = false;

			for (var i=0, boardsLength=boards.length; i<boardsLength; i+=1) {
				if ((boardId) && (boards[i].id.toString() == boardId)) {

					boards[i].cards = [];	

					this._selectedBoard = boards[i];	

					this.setupBoard();	

					this.$("#board-title").html(this._selectedBoard.title);
					
					this.unbind();
					this.bind();

					Board_Services.GetCards(boards[i].id, function(response) {
						if (response.code == 200) {
							boards[i].cards = response.board.cards;

							that._selectedBoard.cards = response.board.cards;

							that.drawBoardItems();
						}
					});

					break;
				}
			}


			this.drawBoardItems();
		},

		// {{ Adding cards }}

		createAddCardDialog: function() {
			var that = this;

			this._addCard = new AddCard.Text({ 
				workspace: this, 
				parent: null, 
				isMobile: this._isMobile 
			});
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

					this._addCard.setCardModel(null);
					this._addCard.clearCardText();
				}
			}
			catch (err) {
				Utils.sendClientError("hideAddCard", err);
			}
		},

		cardAdded: function(card) {
    		try {
				var that = this,
					xPos = Math.floor(this.$("#board-cards").width()/2)+this.$("#board-container").scrollLeft()-90,
					yPos = Math.floor(this.$("#board-cards").height()/2)+this.$("#board-container").scrollTop();

				if (this._dropPosition) {
					xPos = this._dropPosition.x;
					yPos = this._dropPosition.y;
				}

				var newCard = {
					id: card.id, 
					parentId: null,
					type: card.type,  
					boardId: this._selectedBoard.id,
					boardOwner: this.model.owner,	
					title: card.title, 
					content: card.content, 
					isLocked: false, 
					cards: [],
					created: card.created, 
					createdDate: new Date(card.created),
					width: null,
					height: null,
					xPos: (xPos + (this._cardsDroppedInPosition*10)),
					yPos: (yPos + (this._cardsDroppedInPosition*10)),
					color: card.color
				};

				Card_Services.UpdatePosition(this._selectedBoard.id, newCard.id, newCard.xPos, newCard.yPos, function() {
					console.log(newCard.id)
					that.sendSocket(JSON.stringify({ 
						action:"updateCardPosition", 
						workspace: that.model.id,
						position: {
				        	id: newCard.id,
				        	xPos: newCard.xPos,
				        	yPos: newCard.yPos
				        } 
					}));
				});

	        	this._cardsDroppedInPosition++;

				this.addCardToBoard(newCard);
			}
			catch (err) {
				Utils.sendClientError("cardAdded", err);
			}
		},

		// {{ Editing cards }}

		showEditCard: function(cardModel) {
	   		try {
				this._blockAddCard = true;

				if (this._addCard) {
					this.$("#card-create-overlay").show();

					this._addCard.focusCardText();
					this._addCard.setCardModel(cardModel);
				}	
		    	
			}
			catch (err) {
				Utils.sendClientError("editCard", err);
			}
		},

		cardEdited: function(card) {
	   		try {
		    	this._blockAddCard = false;

		   		if ((card) && (this._boardEntities)) {
					for (var i=0; i<this._boardEntities.length; i++) {
						this._boardEntities[i].updateCardContent(card.id, card.content, card.title, card.color);
					}
		   		}
			}
			catch (err) {
				Utils.sendClientError("editCardComplete", err);
			}
		},

		// {{ Managing board cards }}

		addCardToBoard: function(cardModel) {
			try {
				var card = new Card.Item({ 
					model: CardModel.Generate(cardModel), 
					isMobile: this._isMobile, 
					workspace: this, 
					parent: null 
				});

				card.render();

				this.$("#board-cards").append(card.el);

				this._boardEntities.push(card);

				return card;
			}
			catch (err) {
				Utils.sendClientError("addCardToBoard", err);
			}
		},

		addCardToCluster: function(clusterId, cardId) {
			try {
				var card = null;
				
				for (var i=0, boardEntitiesLength=this._boardEntities.length; i<boardEntitiesLength; i+=1) {
					if ((this._boardEntities[i].getType() == "card") && (this._boardEntities[i].getId() == cardId)) {
						card = this._boardEntities[i].getModel();

						this._boardEntities[i].remove();
	      				this._boardEntities.splice(i, 1);
						break;
					}
					else if (this._boardEntities[i].getType() == "cluster") {
						card = this._boardEntities[i].removeCard(cardId);
						
						if (card) break;
					}
				}

				if (card) {
					for (var i=0, boardEntitiesLength=this._boardEntities.length; i<boardEntitiesLength; i+=1) {
						if (this._boardEntities[i].getType() == "cluster") this._boardEntities[i].addCardToCluster(clusterId, CardModel.Generate(card));
					}
				}
			}
			catch (err) {
				Utils.sendClientError("addCardToCluster", err);
			}
		},

		addClusterToBoard: function(clusterModel, cardModel) {
			try {
				var cluster = new Cluster.Item({ 
					model: ClusterModel.Generate(clusterModel), 
					isMobile: this._isMobile, 
					workspace: this, 
					parent: null 
				});

				if (cardModel) {
					if (cardModel.cards === 0) cluster.addCard(CardModel.Generate(cardModel, cluster.getId()));
					else cluster.addCard(ClusterModel.Generate(cardModel, cluster.getId()));
				} 

				cluster.render();

				this.$("#board-cards").append(cluster.el);

				this._boardEntities.push(cluster);

				return cluster;
			}
			catch (err) {
				Utils.sendClientError("addClusterToBoard", err);

				return null;
			}
		},

		addClusterToCluster: function(sourceClusterId, targetClusterId) {
			try {
				var cluster = null;
				
				for (var i=0, boardEntitiesLength=this._boardEntities.length; i<boardEntitiesLength; i+=1) {
					if ((this._boardEntities[i].getType() == "cluster") && (this._boardEntities[i].getId() == sourceClusterId)) {
						cluster = this._boardEntities[i].getModel();

						this._boardEntities[i].remove();
	      				this._boardEntities.splice(i, 1);
						break;
					}
					else if (this._boardEntities[i].getType() == "cluster") {
						cluster = this._boardEntities[i].removeCard(sourceClusterId);
						
						if (cluster) break;
					}
				}

				if (cluster) {
					for (var i=0, boardEntitiesLength=this._boardEntities.length; i<boardEntitiesLength; i+=1) {
						if (this._boardEntities[i].getType() == "cluster") this._boardEntities[i].addClusterToCluster(targetClusterId, ClusterModel.Generate(cluster));
					}
				}
			}
			catch (err) {
				Utils.sendClientError("addClusterToCluster", err);
			}
		},

		createClusterFromCard: function(sourceCardId, targetCardId) {
			try {
				var that = this,
					sourceCard = null,
					targetCard = null;

				for (var i=0, boardEntitiesLength=this._boardEntities.length; i<boardEntitiesLength; i+=1) {
					if ((this._boardEntities[i].getType() == "card") && (this._boardEntities[i].getId() == sourceCardId)) {
						sourceCard = this._boardEntities[i].getModel();

						this._boardEntities[i].remove();
	      				this._boardEntities.splice(i, 1);

	      				break;
					}
					else if (this._boardEntities[i].getType() == "cluster") {
						sourceCard = this._boardEntities[i].removeCard(sourceCardId);

						if (sourceCard) break;
					}
				}

				if (sourceCard) {
					for (var i=0, boardEntitiesLength=this._boardEntities.length; i<boardEntitiesLength; i+=1) {
						if ((this._boardEntities[i].getType() == "card") && (this._boardEntities[i].getId() == targetCardId)) {
							targetCard = this._boardEntities[i].getModel();

							this._boardEntities[i].remove();
		      				this._boardEntities.splice(i, 1);
		
		      				break;
						}
					}

					if (targetCard) {
			  			var clusterModel = {
			  				id: targetCard.id,
			  				boardId: this._selectedBoard.id,
			  				action: "create",
			  				cards: [{ id: sourceCard.id }]
			  			};

			  			Cluster_Services.Insert(this._selectedBoard.id, targetCard.id, clusterModel, function() {
			  				that._socket.send(JSON.stringify({ 
			  					action:"createClusterFromCard", 
			  					workspace: that.model.id, 
			  					cluster: clusterModel 
			  				}));
			  			});

			  			this.addClusterToBoard(targetCard, sourceCard);

						this.sortZIndexes(targetCard.id, true);
					}
				}
			}
			catch (err) {
				Utils.sendClientError("createClusterFromCard", err);
			}
		},

		createClusterFromCluster: function(sourceClusterId, targetCardId) {
			try {
				var that = this,
					sourceCluster = null,
					targetCard = null;

				for (var i=0, boardEntitiesLength=this._boardEntities.length; i<boardEntitiesLength; i+=1) {
					if ((this._boardEntities[i].getType() == "cluster") && (this._boardEntities[i].getId() == sourceClusterId)) {
						sourceCluster = this._boardEntities[i].getModel();

						this._boardEntities[i].remove();
	      				this._boardEntities.splice(i, 1);

	      				break;
					}
					else if (this._boardEntities[i].getType() == "cluster") {
						sourceCluster = this._boardEntities[i].removeCard(sourceClusterId);

						if (sourceCluster) break;
					}
				}

				if (sourceCluster) {
					for (var i=0, boardEntitiesLength=this._boardEntities.length; i<boardEntitiesLength; i+=1) {
						if ((this._boardEntities[i].getType() == "card") && (this._boardEntities[i].getId() == targetCardId)) {
							targetCard = this._boardEntities[i].getModel();

							this._boardEntities[i].remove();
		      				this._boardEntities.splice(i, 1);
		
		      				break;
						}
					}

					if (targetCard) {
			  			var clusterModel = {
			  				id: targetCard.id,
			  				boardId: this._selectedBoard.id,
			  				action: "create",
			  				cards: [{ id: sourceCluster.id }]
			  			};

			  			Cluster_Services.Insert(this._selectedBoard.id, targetCard.id, clusterModel, function() {
			  				that._socket.send(JSON.stringify({ 
			  					action:"createClusterFromCluster", 
			  					workspace: that.model.id, 
			  					cluster: clusterModel 
			  				}));
			  			});

			  			sourceCluster.collapsed = true;

			  			var cluster = this.addClusterToBoard(targetCard, sourceCluster);

						this.sortZIndexes(targetCard.id, true);
					}
				}
			}
			catch (err) {
				Utils.sendClientError("createClusterFromCluster", err);
			}
		},

		removeCardFromBoard: function(card) {
			try {
				for (var i=0, boardEntitiesLength=this._boardEntities.length; i<boardEntitiesLength; i+=1) {
					if (this._boardEntities[i].getId() == card.id) {
						this._boardEntities[i].remove();
	      				this._boardEntities.splice(i, 1);
	      				break;
					}
				}
			}
			catch (err) {
				Utils.sendClientError("editCardComplete", err);
			}
		},

		setClusterToCard: function(clusterId) {
			try {
				for (var i=0, boardEntitiesLength=this._boardEntities.length; i<boardEntitiesLength; i+=1) {
					if (this._boardEntities[i].getType() == "cluster") {
						if (this._boardEntities[i].getId() == clusterId) {
							var cardModel = this._boardEntities[i].getModel();

							this._boardEntities[i].remove();
							this._boardEntities[i] = null;
							this._boardEntities.splice(i, 1);

							Cluster_Services.StopDotVoting(this._selectedBoard.id, clusterId);

							this.addCardToBoard(cardModel);
							break;
						}
					}
				}
			}
			catch (err) {
				Utils.sendClientError("createClusterFromCluster", err);
			}
		},

		//  ---- Check if an element exists at the specified position
		checkPositionTaken: function(elementId) {
			try {
				for (var i=0, boardEntitiesLength=this._boardEntities.length; i<boardEntitiesLength; i++) {
					if (this._boardEntities[i].getId() != elementId) {
						var xposStart = this._boardEntities[i].getXPos();
						var xposEnd = xposStart + this._boardEntities[i].$el.width();

						var yposStart = this._boardEntities[i].getYPos();
						var yposEnd = yposStart + this._boardEntities[i].$el.height();

	 					if (((this._currentMousePosition.x > xposStart) && (this._currentMousePosition.x < xposEnd)) && 
	 						((this._currentMousePosition.y > yposStart) && (this._currentMousePosition.y < yposEnd))) {
							if ((!this._boardEntities[i].getWidth()) && (!this._boardEntities[i].getHeight())) return this._boardEntities[i].getId();
	 					}
					}
				}
				
				return -1;
			}
			catch (err) {
				Utils.sendClientError("checkPositionTaken", err);
			}
		},

		sortZIndexes: function(elementId, publish) {
			try {
				var that = this,
					lockedElements = new Array(),
					unlockedElements = new Array();

				for (var i=0, boardEntitiesLength=this._boardEntities.length; i<boardEntitiesLength; i++) {
					if ((elementId) && (this._boardEntities[i].getId() == elementId)) this._boardEntities[i].setZPos(999999999999999);

					if (this._boardEntities[i].getIsLocked()) lockedElements.push(this._boardEntities[i]);
					else unlockedElements.push(this._boardEntities[i]);
	    		}

				lockedElements.sort(function (a, b) { 
					return a.getZPos() > b.getZPos() ? 1 : a.getZPos() < b.getZPos() ? -1 : 0;
				});
				unlockedElements.sort(function (a, b) { 
					return a.getZPos() > b.getZPos() ? 1 : a.getZPos() < b.getZPos() ? -1 : 0; 
				});

				var sortedCards = new Array();

				for (var i=0; i<lockedElements.length; i++) {
					sortedCards.push({
						cardId: lockedElements[i].getId(),
						zPos: i
					});

					lockedElements[i].setZIndex(i);
				}

				$("#page-canvas").zIndex(lockedElements.length);

				for (var i=0; i<unlockedElements.length; i++) {
					sortedCards.push({
						cardId: unlockedElements[i].getId(),
						zPos: (i+(lockedElements.length+1))
					});

					unlockedElements[i].setZIndex((i+(lockedElements.length+1)));
				}

				if ((elementId) && (publish)) {
					Board_Services.UpdateCardZIndexes(this._selectedBoard.id, sortedCards, function(response) {
		            	that._socket.send(JSON.stringify({ 
		            		action:"sortZIndexes", 
		            		board: that._selectedBoard.id, 
		            		card: { id: elementId } 
		            	}));
	            	});
	        	}
			}
			catch (err) {
				Utils.sendClientError("sortZIndexes", err);
			}
		},
				
		removePopups: function(calledBy) {
			if (calledBy != "authenticate") {
				this.$("#authenticate-user-container").remove();
			}
			
			if (calledBy != "saveAs") {
				this.$("#save-as-board-container").remove();
			}

			if (this._boardEntities) {
				for (var i=0, boardEntitiesLength=this._boardEntities.length; i<boardEntitiesLength; i++) {
					this._boardEntities[i].clearSettingsmenu();

					if (this._boardEntities[i].getType() == "card") this._boardEntities[i].stopCardResize();
				}
			}
		},

		// {{ Managing web sockets }}

		sendSocket: function(package) {
			this._socket.send(package);
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

				that._socket.send(JSON.stringify({ workspace: that.model.id, action: "Establishing connection" }));

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
								case "boardCardAdded":
			    					var card = socketPackage.card,
			    						cardExists = false;

		    						if (that._boardEntities) {
										for (var i=0, boardEntitiesLength=that._boardEntities.length; i<boardEntitiesLength; i++) {
											if (that._boardEntities[i].getId() == card.id) {
												cardExists = true;
												break;
											}
										}
									}

									if (!cardExists) that.addCardToBoard(card);
								break;
								case "boardCardUpdated":
			    					var card = socketPackage.card;

		    						if (that._boardEntities) {
										for (var i=0, boardEntitiesLength=that._boardEntities.length; i<boardEntitiesLength; i++) {
											that._boardEntities[i].updateCardContent(card.id, card.content, card.title, card.color);
										}
									}
								break;
								case "boardCardDeleted":
			    					var card = socketPackage.card;

									that.removeCardFromBoard(card);

		    						if (that._boardEntities) {
										for (var i=0, boardEntitiesLength=that._boardEntities.length; i<boardEntitiesLength; i++) {
											if (this._boardEntities[i].getType() == "cluster") that._boardEntities[i].removeCard(card);
										}
									}
								break;
								case "updateCardPosition":
		    						var position = socketPackage.position;

		    						if (that._boardEntities) {
										for (var i=0, boardEntitiesLength=that._boardEntities.length; i<boardEntitiesLength; i++) {
											if (that._boardEntities[i].getId() == position.id) that._boardEntities[i].setCardPosition(position.id,position.xPos,position.yPos); 
										}
									}
								break;
								case "updateCardSize":
		    						var size = socketPackage.size;

		    						if (that._boardEntities) {
										for (var i=0, boardEntitiesLength=that._boardEntities.length; i<boardEntitiesLength; i++) {
											if (that._boardEntities[i].getId() == size.id) that._boardEntities[i].setCardSize(size.id,size.width,size.height);
										}
									}
					    			break;
					    		case "undoCardResize":
		    						var size = socketPackage.size;

		    						if (that._boardEntities) {
										for (var i=0, boardEntitiesLength=that._boardEntities.length; i<boardEntitiesLength; i++) {
											if (that._boardEntities[i].getId() == size.id) that._boardEntities[i].setCardUnsized();
										}
									}
					    			break;
								case "lockCard":
		    						var card = socketPackage.card;

		    						if (that._boardEntities) {
										for (var i=0, boardEntitiesLength=that._boardEntities.length; i<boardEntitiesLength; i++) {
											if ((that._boardEntities[i].getType() == "card") && (that._boardEntities[i].getId() == card.id)) that._boardEntities[i].setCardLocked();
										}
									}
				    			break;
								case "unlockCards":
		    						var card = socketPackage.card;

		    						if (that._boardEntities) {
										for (var i=0, boardEntitiesLength=that._boardEntities.length; i<boardEntitiesLength; i++) {
											if ((that._boardEntities[i].getType() == "card") && (that._boardEntities[i].getId() == card.id) && (that._boardEntities[i].getIsLocked())) that._cardViews[i].setCardUnlocked();
										}
									}
								break;
								case "boardClusterUpdated":
		    						var cluster = socketPackage.cluster;

		    						if (that._boardEntities) {
										for (var i=0, boardEntitiesLength=that._boardEntities.length; i<boardEntitiesLength; i++) {
											if (that._boardEntities[i].getType() == "cluster") that._boardEntities[i].updateClusterTitle(cluster.id, cluster.title, cluster.content);
										}
									}
				    			break;
								case "updateClusterPosition":
		    						var position = socketPackage.position;

		    						if (that._boardEntities) {
										for (var i=0, boardEntitiesLength=that._boardEntities.length; i<boardEntitiesLength; i++) {
											if (that._boardEntities[i].getId() == position.id) that._boardEntities[i].setClusterPosition(position.id,position.xPos,position.yPos); 
										}
									}
								break;
					    		case "expandCluster":
									var cluster = socketPackage.cluster;

									if (that._boardEntities) {
										for (var i=0, boardEntitiesLength=that._boardEntities.length; i<boardEntitiesLength; i++) {
											if (that._boardEntities[i].getType() == "cluster") that._boardEntities[i].expandCluster(cluster.id);
										}
									}
				    			break;
					    		case "collapseCluster":
									var cluster = socketPackage.cluster;

									if (that._boardEntities) {
										for (var i=0, boardEntitiesLength=that._boardEntities.length; i<boardEntitiesLength; i++) {
											if (that._boardEntities[i].getType() == "cluster") that._boardEntities[i].collapseCluster(cluster.id);
										}
									}
				    			break;
								case "sortCluster":
					    			var sortOrder = socketPackage.sortOrder;

									if (that._boardEntities) {
										for (var i=0, boardEntitiesLength=that._boardEntities.length; i<boardEntitiesLength; i++) {
											if ((that._boardEntities[i].getType() == "cluster") && (that._boardEntities[i].getId() == sortOrder.clusterId)) that._boardEntities[i].updateSortPosition(sortOrder.cards);
										}
									}
								break;
					    		case "startDotVoting":
		    						var cluster = socketPackage.cluster;

									if (that._boardEntities) {
										for (var i=0, boardEntitiesLength=that._boardEntities.length; i<boardEntitiesLength; i++) {
											if ((that._boardEntities[i].getType() == "cluster") && (that._boardEntities[i].getId() == cluster.id)) that._boardEntities[i].displayStartDotVoting();
										}
									}
					    			break;
					    		case "stopDotVoting":
		    						var cluster = socketPackage.cluster;

									if (that._boardEntities) {
										for (var i=0, boardEntitiesLength=that._boardEntities.length; i<boardEntitiesLength; i++) {
											if ((that._boardEntities[i].getType() == "cluster") && (that._boardEntities[i].getId() == cluster.id)) that._boardEntities[i].displayStopDotVoting();
										}
									}
					    			break;
								case "addVote":
		    						var vote = socketPackage.vote;

									if (that._boardEntities) {
										for (var i=0, boardEntitiesLength=that._boardEntities.length; i<boardEntitiesLength; i++) {
											if (that._boardEntities[i].getId() == vote.cluster) {
												that._boardEntities[i].updateChildVotes(vote.card);
											}
										}
									}
								break;
								case "addCardToCluster":
		    						var updateDetail = socketPackage.updateDetail;

		    						that.addCardToCluster(updateDetail.clusterId, updateDetail.cardId);
								break;
								case "removeCardFromCluster":
		    						var updateDetail = socketPackage.updateDetail;

		    						that.removeCardFromCluster(updateDetail);
								break;
								case "addClusterToCluster":
		    						var updateDetail = socketPackage.updateDetail;

		    						that.addClusterToCluster(updateDetail.sourceClusterId, updateDetail.targetClusterId);
								break;
								case "removeClusterFromCluster":
		    						var updateDetail = socketPackage.updateDetail;

		    						that.removeClusterFromCluster(updateDetail);
								break;
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

	// ===== View of workspace on main page

	Workspace.List = Backbone.View.extend({
    	el: "<tr>",

		initialize: function(options) {
			this.render();

			this.parent = options.parent;
      	},

		render: function(){
			var that = this;

			$.get("/app/templates/workspace/list.html", function(contents) {
				that.$el.html(_.template(contents, that.model));

				that.afterRender();

				that.bindEvents();
			}, "text");
		},

		afterRender: function() {
			if (!this.model.isOwner) this.$("#workspace-share_" + this.model.id);
		},

		bindEvents: function() {
			var that = this;

			this.$el.click(function(e) {
				e.stopPropagation();
				e.preventDefault();

				that.parent.viewWorkspace(that.model.id);
			});
		}
	});

	return Workspace;
});