define([
	"modules/card.services",
	"modules/cluster.services",
	"modules/workspace.services",
	"jquery",
    'jqueryUI',
    'touchpunch',
	"spectrum"
],

function(Card_Services, Cluster_Services, Workspace_Services) {
	var Card = {};

	Card.GenerateModel = function(model, parentId) {
		var parentIsVoting = false, 
			isVoting = false, 
			votesReceived = 0;

		if  (model.parentIsVoting) parentIsVoting = model.parentIsVoting;
		if  (model.isVoting) isVoting = model.isVoting;
		if  (model.votesReceived) votesReceived = model.votesReceived;

		var cardModel = {
			id: model.id, 
			boardId: model.boardId,
			type: model.type,
			title: model.title, 
			content: model.content,
			cards: [], 
			parentIsVoting: parentIsVoting, 
			isVoting: false, 
			votesReceived: votesReceived, 
			isLocked: model.isLocked, 
			xPos: model.xPos, 
			yPos: model.yPos, 
			created: model.created, 
			createdDate: new Date(model.created),
			width: model.width,
			height: model.height,
			color: model.color
		};

		if (model.votesReceived > 0) {
			if (model.type.trim().toLowerCase() == "text") cardModel.content = model.content + " (+" + model.votesReceived + ")";
			else cardModel.title = model.title + " (+" + model.votesReceived + ")";

			cardModel.votesReceived = 0;
		}

		if (parentId) cardModel.parentId = parentId;
		else cardModel.parentId = null;

		return cardModel;
	};
	// Card Views

  	Card.Item = Backbone.View.extend({
    	tagName: "div",

    	_isMobile: null,
    	_workspace: null,
    	_parent: null,

    	_resizing: false,

    	// {{ Contructor }}

		initialize: function(options) {
			this.el.id = "item-content-container_" + this.model.id;

			this._isMobile = options.isMobile;
			this._workspace = options.workspace;
			this._parent = options.parent;
		},

		// {{ Object Building }}

		render: function() {
			var that = this;
			
			var template = "/app/templates/card/item.html";
			if (this.model.parentId) template = "/app/templates/card/clusteredItem.html";

			$.get(template, function(contents) {
				that.$el.html(_.template(contents, that.model));

				that.afterRender();				

				that.unbind();
				that.bind();
			}, "text");
		},

	    afterRender: function() {
	    	var that = this;

			if (this.model.parentId) this.el.className = "box clustered-item-content-container";
			else this.el.className = "box item-content-container";

			_.defer(function() { 
	    		that.$el.attr("element-id", that.model.id);
	    		that.$el.attr("object-type", "card");

		    	// Figure out the the default card height and width is
				if (that.model.type.trim().toLowerCase() != "text") {
					if ((!that.$el.css("min-width")) && (!that.$el.css("min-height"))) {
						that.$el.css({ minWidth: that.$el.width() });
						that.$el.css({ minHeight: that.$el.height() });
					}
				}
				else {
					if ((!that.$el.css("min-width")) || (that.$el.css("min-width") == "0px")) {
						that.$el.css({ minWidth: 180 });
						that.$el.css({ minHeight: that.$el.height() });
					}
				}

				// Set the defined position
				if ((!that._parent) && (that.model.xPos && that.model.yPos)) that.$el.css({top: that.model.yPos, left: that.model.xPos, position: 'absolute'});
					
				if ((!that._parent) && (that.model.zPos != null)) that.$el.zIndex(that.model.zPos);

				if ((that.model.width) || (that.model.height)) {
		    		that.$el.attr("is-resized", "true");

		    		if (that.model.width) that.$el.css({ width: that.model.width });
		    		else that.$el.css({ width: "" });

		    		if (that.model.height) that.$el.css({ height: that.model.height });
		    		else that.$el.css({ height: "" });
				}

				if (that.model.color) that.$el.css({ backgroundColor: that.model.color });

				if (that.model.isLocked) that.$el.addClass("locked");

				// Check that the height of the card also includes the text bar, this can get out of sync

				if (that.model.type.trim().toLowerCase() != "text") {
					that.$("#card-body-image_" + that.model.id).load(function() {
			    		if (that.$el.attr("is-resized") == "true") {
							var cardHeight = (that.$("#card-body-image_" + that.model.id).height() + 20);

			    			if ((that.model.title) && (that.model.title.trim().length > 0)) cardHeight = (that.$("#card-body-image_" + that.model.id).height() + 20 + that.$("#card-image-title").height() + 10);
			    			
			    			if (cardHeight != that.$el.height()) {
								that.$el.css("height", null );
								that.$el.css("height", cardHeight);

								that.saveCardSize(that.$el.width(), that.$el.height());
							}
						}
					}).attr("src", "/workspace/boards/cards/image/" + that.model.get("boardId") + "/" + that.model.id + "?random=" + new Date().getTime());
				}

	    		if (that.$el.attr("is-resized") == "true") {
					if (that.model.type.trim().toLowerCase() == "text") {
						if ((that.$("#card-body-text").height() + 20) > that.$el.height()) {
							that.$el.css({ height: (that.$("#card-body-text").height() + 20) });

							that.saveCardSize(that.$el.width(), that.$el.height());
						}
					}
				}
		    });
	    },

	    unbind: function() {
			if (!this._isMobile) {
				this.$el.unbind("click");
				this.$el.unbind("mouseup");
				this.$el.unbind("dblclick");
				this.$el.unbind("mouseover");
				this.$el.unbind("mouseout");

				this.$("#card-settings-button_" + this.model.id).unbind("click");
			}
			
			this.$el.unbind("draggable");
			this.$el.unbind("droppable");

			this.$("#card-resize-button").unbind("click");
			this.$("#card-lock-button").unbind("click");
			this.$("#undo-card-resize-button").unbind("click");
			this.$("#card-delete-button").unbind("click");
			this.$("#vote-container").unbind("click");
	    },

	    bind: function() {
	    	var that = this;

			if (this._isMobile) {
				// Bind mobile es (only need to be bound once and not per render)
				if (!this._mobileEventsBound) {
					var touchComplete = null;

	      			this.$el.click(function(e) {
	   					e.stopPropagation();
	   					e.preventDefault();
	      			});

					this.$el.on("touchstart touchend taphold", function(e) {
	   					e.stopPropagation();
	   					e.preventDefault();

	   					if (e.type.toString() == "touchstart") {
							touchComplete = function() {
		   						if (that._showSettingsIcon) that.clearSettingsmenu(e);
					        	else {
									if (that.model.isLocked) {
					        			that._workspace._dropPosition = { x: e.originalEvent.touches[0].pageX,  y: e.originalEvent.touches[0].pageY };
					        			that._workspace._cardsDroppedInPosition = 0;

										that._workspace.showAddCard();
									}
									else {		
										if ((e.target.id != "vote-container") && (e.target.id != "add-vote")) that.editItem(e);
							        }
							    }
							}
	   					}
	   					else if (e.type.toString() == "taphold") {
							if (!that._isDragging) {
								that.$("#card-action-container").show();
							
								that.showSettingsMenu(e);
							
								touchComplete = null;
							}
	   					}
	   					else if (e.type.toString() == "touchend") {
	   						if ((!that._isDragging) && (touchComplete != null)) touchComplete();
							else that._isDragging = false;

							touchComplete = null;

			    			if ((that._workspace.getSelectedPageTool() == "pen") || (that._workspace.getSelectedPageTool() == "eraser")) that._workspace.stopDrawing();
	   					}
					});
				}
			}
			else {
				this.$el.click(function(e) {
					e.stopPropagation();

					that.clearSettingsmenu(e);

					if (that._parent) that._parent.bubbleClearSettingsmenu();
				});

				this.$el.mouseup(function(e) {
					if ((that._workspace.getSelectedPageTool() == "pen") || (that._workspace.getSelectedPageTool() == "eraser")) that._workspace.stopDrawing();
				});

				this.$el.dblclick(function(e) {
					if (that.model.isLocked) {
	        			that._workspace._dropPosition = { x: that._workspace._currentMousePosition.x,  y: that._workspace._currentMousePosition.y };
	        			that._workspace._cardsDroppedInPosition = 0;

						that._workspace.showAddCard();
					}
					else {
						if ((e.target.id != "vote-container") && (e.target.id != "add-vote")) {
							that.editItem(e);
						}
					}
				});

				this.$el.mouseover(function(e) {
					that.showHoverIcons(e);
				});

				this.$el.mouseout(function(e) {
					that.hideHoverIcons(e);
				});

				this.$("#card-settings-button_" + this.model.id).click(function(e) {					
					if (that._parent) that._parent.bubbleClearSettingsmenu();

					that.showSettingsMenu(e);
				});
			}

			this.$("#card-resize-button").click(function(e) {
				that.resizeCard(e);
			});

			this.$("#card-lock-button").click(function(e) {
				that.lockCard(e);
			});

			this.$("#undo-card-resize-button").click(function(e) {
				that.undoResizing(e);
			});

			this.$("#card-duplicate-button").click(function(e) {
				that.duplicateCard(e);
			});

			this.$("#card-delete-button").click(function(e) {
				that.deleteCard(e);
			});

			this.$("#vote-container").click(function(e) {
				that.addVote(e);
			});

			if (!that.model.isLocked) {
	        	var startDragX = null,
	        	startDragY = null;

	        	that.$el.draggable({
					start: function(e,ui) {
						that.$el.zIndex(999999999);

						if (!that._isMobile) {
							that._isDragging = true;
						}
						else {
							startDragX = e.clientX;
		        			startDragY = e.clientY;
						}
					},
					drag: function(e,ui) {
						if (that._isMobile) {
							var distanceFromStartX = e.clientX - startDragX;
							var distanceFromStartY = e.clientY - startDragY;

							if (((distanceFromStartX > 5) || (distanceFromStartX < -5)) || ((distanceFromStartY > 5) || (distanceFromStartY < -5))) that._isDragging = true;
						}
					},
					stop: function(e,ui) {
						e.stopPropagation();

						var elementId = that._workspace.checkPositionTaken(that.model.id);

						if (elementId == -1) {
							if (that.model.parentId) {
								that.model.xPos = (that._parent.$el.position().left + that.$el.position().left + that._workspace.$("#board-container").scrollLeft());
								that.model.yPos = (that._parent.$el.position().top + that.$el.position().top + that._workspace.$("#board-container").scrollTop());

								that._parent.removeCard(that.model.id);

						    	that._workspace.addCardToBoard(that.model);
							}
							else {
								that.model.xPos = (that.$el.position().left + that._workspace.$("#board-container").scrollLeft());
								that.model.yPos = (that.$el.position().top + that._workspace.$("#board-container").scrollTop());
							}

							Card_Services.UpdatePosition(that.model.boardId, that.model.id, that.model.xPos, that.model.yPos);

					    	that._workspace.sortZIndexes(that.model.id,true);
		        		}
			        	else {
    						if (!that.$el.attr("is-resized")) {
				        		var objectModel = that._workspace.getObjectModel(elementId);

								if (((objectModel.cards == null) || (objectModel.cards.length == 0)) && (!objectModel.isLocked)) that._workspace.createClusterFromCard(that.model.id, elementId);
			           		}
				        	else Card_Services.UpdatePosition(that.model.boardId, that.model.id, (that.$el.position().left + that._workspace.$("#board-container").scrollLeft()), (that.$el.position().top + that._workspace.$("#board-container").scrollTop()));
			        	}
					}
				});
	    	}

			this._mobileEventsBound = true;
	    },

	    // {{ Getters }}

	    getModel: function() {
	    	return this.model;
	    },

	    getId: function() {
	    	return this.model.id;
	    },

	    getXPos: function() {
	    	return this.model.xPos;
	    },

	    getYPos: function() {
	    	return this.model.yPos;
	    },

	    getZPos: function() {
	    	return this.model.zPos;
	    },

	    getWidth: function() {
	    	return this.model.width;
	    },

	    getHeight: function() {
	    	return this.model.height;
	    },

	    getIsLocked: function() {
	    	return this.model.isLocked;
	    },

	    getType: function() {
	    	return "card";
	    },

	    // {{ Setters }}

	    setZPos: function(value) {
	    	this.model.zPos = value;
	    },

	    // {{ Methods }}

		// ---------- Actions for displaying edit icons

		showHoverIcons: function (e) {
			e.stopPropagation();

			this.$("#card-action-container_" + this.model.id).show();
		},

	    hideHoverIcons: function(e) {
	    	if (!this._showSettingsIcon) this.$("#card-action-container_" + this.model.id).hide();
	    },

		// ---------- Actions for displaying sthe settings menu

		showSettingsMenu: function(e) {
			e.stopPropagation();

			if (!this.$("#card-settings-menu_" + this.model.id).is(':visible')) {
				this._showSettingsIcon = true;

				if (this._isMobile) this.$("#card-resize-button").hide();

				this.$("#card-settings-menu_" + this.model.id).show();
			}
			else this.clearSettingsmenu();
		},

		bubbleClearSettingsmenu: function() {
			this.clearSettingsmenu();

			if (this._parent) this._parent.bubbleClearSettingsmenu();
		},

		clearSettingsmenu: function() {
			this._showSettingsIcon = false;

			this.$("#card-settings-menu_" + this.model.id).hide();
			this.$("#card-action-container_" + this.model.id).hide();
		},

		// ---------- Actions for setting card position

		setCardPosition: function(cardId,left,top) { 
			if (this.model.id == cardId) {
				this.model.xPos = left;
				this.model.yPos = top;

				if (this.$el.hasClass("new-card")) {
					this.$el.removeClass("new-card");
					this.$el.addClass("item-content-container");
				}

				this.render();
			}	
		},

		updateCardPosition: function(left,top) {
			var that = this;

			this.model.xPos = left;
			this.model.yPos = top;

			Card_Services.UpdatePosition(this.model.boardId, this.model.id, left, top);

			this._workspace.sendSocket(JSON.stringify({ 
				action:"updateCardPosition", 
				board: that.model.boardId, 
				position: {
		        	id: that.model.id,
		        	xPos: left,
		        	yPos: top
		        } 
			}));

			if (this.$el.hasClass("new-card")) {
				this.$el.removeClass("new-card");
				this.$el.addClass("item-content-container");
			}
		},

		// ---------- Actions to edit a card

		editItem: function(e) {
			e.stopPropagation();

			this.stopCardResize();

			if (this.model.type.toLowerCase() == "text") this.editText(e);
			else this.editImage(e);
		},

		editText: function(e) {
			this._workspace.showEditCard(this.model);
		},

		editImage: function(e) {
	   		//try {
		    	this._editing = true;
		    	
				this.$("#card-edit-overlay").append(editImageView.el);
				this.$("#card-edit-overlay").show();
			//}
			//catch (err) {
			//	this.sendClientError("editImage", err);
			//}
		},

		updateCardContent: function(cardId,content,title,color) {
			if (this.model.id == cardId) {
				var cardUpdated = false;

				if (content) {
					this.model.content = content;

					cardUpdated = true;
				}

				if (title) {
					this.model.title = title;

					cardUpdated = true;
				}

				if (color) {
					this.model.color = color;

					cardUpdated = true;
				}

				if (cardUpdated) this.render();
			}
		},

		// ---------- Actions to resize a card

		resizeCard: function(e) {
			e.stopPropagation();

			var that = this;

			this.clearSettingsmenu();

			this.$("#card-resize-button").hide();

			if(this.model.parentId == null) {
				var currentWidth = this.$el.width(),
					currentHeight = this.$el.height(),
					lastX = null;

				this._resizing = true;

				this.$el.addClass("resizing-content");

				if (this.model.type.trim().toLowerCase() == "text") this.$el.append("<div id=\"resize-right\" class=\"resize-right\"></div><div id=\"resize-left\" class=\"resize-left\"></div><div id=\"resize-top\" class=\"resize-top\"></div><div id=\"resize-bottom\" class=\"resize-bottom\"></div>");
				else this.$el.append("<div id=\"resize-top-right\" class=\"resize-top-right\"></div><div id=\"resize-top-left\" class=\"resize-top-left\"></div><div id=\"resize-bottom-right\" class=\"resize-bottom-right\"></div><div id=\"resize-bottom-left\" class=\"resize-bottom-left\"></div>");
			
				try {
					this.$el.resizable( "destroy" );
				}
				catch(err) {}

	    		this.$el.resizable({
	    			handles: "n,s,e,w",
	    			resize: function(e,ui) {
	    				that.$("#undo-card-resize-button").show();

	    				if (that.model.type.trim().toLowerCase() != "text") {

						}
						else {
							if (that.$el.height() < (that.$("#card-body-text").height() + 20)) that.$el.css({ height: that.$("#card-body-text").height() + 20 });	
						}

	    				if (that.$el.width() == 180) that.$el.css({ left: lastX });

	    				lastX = that.$el.position().left;
	    			}
				});
			}
		},

		// Called when the resize is finished

		stopCardResize: function() {
			if (this._resizing) {
				this.removeResizeStyling();

	        	var isStartSize = false;

				if (this.model.type.trim().toLowerCase() != "text") {
					if (((this.$el.width() + "px") == this.$el.css("min-width")) && ((this.$el.height() + "px") == this.$el.css("min-height"))) isStartSize = true;
				}
				else {
					if (((this.$el.width() + "px") == this.$el.css("min-width")) && ((this.$el.height() + "px") == this.$el.css("min-height"))) isStartSize = true;
				}

				if (!isStartSize) {
					this.saveCardSize(this.$el.width(), this.$el.height());

		        	this.updateCardPosition((this.$el.position().left + this._workspace.$("#board-container").scrollLeft()), (this.$el.position().top + this._workspace.$("#board-container").scrollTop()));
				}
				else this.saveUndoResizing();
			}
		},

		removeResizeStyling: function() {
			try {
				this.$el.resizable( "destroy" );
			}
			catch(err) {}

			this.$("#resize-left").remove();
			this.$("#resize-right").remove();
			this.$("#resize-top").remove();
			this.$("#resize-bottom").remove();

			this.$("#resize-top-left").remove();
			this.$("#resize-top-right").remove();
			this.$("#resize-bottom-left").remove();
			this.$("#resize-bottom-right").remove();

			this.$el.removeClass("resizing-content");

			this.$("#card-resize-button").show();

			this._resizing = false;
		},

		saveCardSize: function(width,height) {
			var that = this;

			this.model.width = width;
			this.model.height = height;

	        var sizeValues = {
	        	id: this.model.id,
	        	width: width,
	        	height: height
	        };

	        Card_Services.Resize(this.model.boardId, this.model.id, sizeValues, function(response) {
				that._workspace.sendSocket(JSON.stringify({ 
					action:"updateCardSize", 
					board: that.model.boardId, 
					size: sizeValues 
				}));
	        });

			this.$el.attr("is-resized", "true");

			try {
				this.$el.droppable("destroy");
			}
			catch(err) {}
		},

		setCardSize: function(cardId,width,height) { 
			if ((this.model.id == cardId) && (!this._resizing)) {
				this.model.width = width;
				this.model.height = height;

	    		if (width) {
		    		this.$el.attr("is-resized", "true");
					this.$el.css({ width: width });
				}

				if (height) {
		    		this.$el.attr("is-resized", "true");
					this.$el.css({ height: height });
				}
			}	
		},

		// ---------- Actions to undo a resize

		undoResizing: function(e) {
			e.stopPropagation();

			this.clearSettingsmenu();

			this.removeResizeStyling();

        	this.saveUndoResizing();

			this.render();
		},

		saveUndoResizing: function() {
			var that = this;

	        var sizeValues = {
	        	id: this.model.id,
	        	width: null,
	        	height: null
	        };

	        Card_Services.Resize(this.model.boardId, this.model.id, sizeValues, function(response) {
				that._workspace.sendSocket(JSON.stringify({ 
					action:"undoCardResize", 
					board: that.model.boardId, 
					size: sizeValues 
				}));
	        });

        	this.setCardUnsized();
		},

		setCardUnsized: function() {
			if (!this._resizing) {
				this.$("#undo-card-resize-button").hide();

				this.model.width = null;
				this.model.height = null;
				this.$el.removeAttr("is-resized");

				this.$el.css({ width: "" });
				this.$el.css({ width: null });

				this.$el.css({ height: "" });
				this.$el.css({ height: null });
			}
		},

		// ---------- Actions for card duplicate

		duplicateCard: function(e) {
			var that = this;

			Card_Services.Duplicate(this.model.boardId, this.model.id, function(response) {
				that._workspace.addCardToBoard(response.card);

				that._workspace.sendSocket(JSON.stringify({ 
					action:"boardCardAdded", 
					board: that.model.boardId, 
					card: response.card 
				}));
			});

			this.clearSettingsmenu();
		},

		// ---------- Actions for card locking

		lockCard: function(e) {
			e.stopPropagation();

			var that = this;

			this.disableResizeCard();

        	Card_Services.Lock(this.model.boardId, this.model.id, function(response) {
				that._workspace.sendSocket(JSON.stringify({ 
					action:"lockCard", 
					board: that.model.boardId, 
					card: { 
						id: that.model.id
					} 
				}));
	        });

			this.setCardLocked();

	    	this._workspace.sortZIndexes(this.model.id,true);
		},

		setCardLocked: function() {
			this.model.isLocked = true;

			try {
				this.$el.draggable("destroy");
			}
			catch(err) {}

			try {
				this.$el.droppable("destroy");
			}
			catch(err) {}

			this.render();
		},

		unlockCard: function() {
        	Card_Services.Unlock(this.model.boardId, this.model.id, function(response) {
				that._workspace.sendSocket(JSON.stringify({ 
					action:"unlockCard", 
					board: that.model.boardId, 
					card: { 
						id: that.model.id
					} 
				}));
	        });

			this.setCardUnlocked();
		},

		setCardUnlocked: function() {
			this.model.isLocked = false;
			
			this.$el.removeClass("locked");

			this.render();
		},

		// ---------- Actions to delete a card

		deleteCard: function(e) {
			e.stopPropagation();

			var that = this;

			var cardToDelete = {
				id: this.model.id,
				type: this.model.type,
				owner: this.model.owner,
				boardId: this.model.boardId,
				parentId: this.model.parentId
			};

			Card_Services.Delete(this.model.boardId, this.model.id, function(response) {
				that._workspace.sendSocket(JSON.stringify({ 
					action:"boardCardDeleted", 
					board: that.model.boardId, 
					card: cardToDelete 
				}));
			});

			if (this._parent) {
				this._parent.removeCard(cardToDelete.id);

				if (this._parent.saveSortPosition) this._parent.saveSortPosition();
			}
			else  this._workspace.removeCardFromBoard(cardToDelete);
		},

		// ---------- Actions for dot voting

		addVote: function(e) {
			e.stopPropagation();

			var that = this;

			Cluster_Services.AddVote(this.model.boardId, this.model.id, function(response) {
				that._workspace.sendSocket(JSON.stringify({ 
					action:"addVote", 
					board: that.model.boardId,
					vote: { 
						cluster: that.model.parentId,
						card: that.model.id
					}
				}));
			});

			this.increaseVoteCount();
		},

		increaseVoteCount: function() {
			if (this.model.votesReceived === 0) this.$("#add-vote").attr("src","/img/voteSelected.png");

			this.model.votesReceived++;

			this.$("#vote-count").html(this.model.votesReceived);
		},

		// ---------- Actions to set the card z index

		setZIndex: function(zIndex) {
    		this.model.zPos = zIndex;
			
			this.$el.zIndex(zIndex);
		}
  	});

	Card.AddText = Backbone.View.extend({
    	el: "<div>",

    	_cardModel: null,
    	_isMobile: null,
    	_workspace: null,

		initialize: function(options) {
    		this.el.id = "card-create-container";

    		this._isMobile = options.isMobile;
    		this._workspace = options.workspace;
		},

		render: function() {
			var that = this;

			var template = "/app/templates/card/addText.html";
			if (this._isMobile) template = "/app/templates/card/addText.mobile.html";

			$.get(template, function(contents) {
				that.$el.html(_.template(contents, that.model));

				that.afterRender();				

				that.unbind();
				that.bind();
			}, "text");
		},

		afterRender: function() {
			var that = this;

			this.$el.addClass("card-input-container");

	    	this.$("#card-color-select").spectrum("destroy");

	    	this.$("#card-color-select").spectrum({
			    color: this._workspace.getSelectedColor(),
			    showInput: true,
			    className: "card-color-spectrum",
			    showInitial: true,
			    showPaletteOnly: true,
			    showPalette:true,
			    maxPaletteSize: 10,
			    preferredFormat: "hex",
			    localStorageKey: "spectrum.boardthing.card",
			    palette: ["rgb(255,255,153)", "rgb(255,255,0)", "rgb(255,204,102)", "rgb(255,153,0)", "rgb(255,102,255)", "rgb(255,0,204)", "rgb(204,153,255)", "rgb(153,153,255)", "rgb(102,255,255)", "rgb(51,204,255)", "rgb(153,255,102)", "rgb(102,255,0)", "rgb(255,255,255)", "rgb(204,204,204)", "rgb(255,0,51)"]
			});
			
			if (this._isMobile) this.$el.addClass("mobile");
    		else this.$el.addClass("desktop");
		},

		unbind: function() {
			this.$el.unbind("click");

			this.$("#cancel-card").unbind("click");
			this.$("#post-card").unbind("click");
			this.$("#card-text").unbind("click");
			this.$("#add-image-btn").unbind("click");
		},

		bind: function() {
			var that = this;

  			this.$el.click(function(e) {
				e.stopPropagation();
  			});

			this.$("#cancel-card").click(function(e) {
				e.stopPropagation();
				
				that._workspace.hideAddCard();
			});

			this.$("#post-card").click(function(e) {
				e.stopPropagation();
				
				that.saveCard();
			});

			this.$("#card-text").keypress(function(e) {
			  	var charCode = e.charCode || e.keyCode;

		        if ((e) && (!e.shiftKey) && (charCode == 13)) {
		        	e.preventDefault();

		        	that.saveCard();
		        }
			});
		},

		setCardModel: function(cardModel) {
			if (cardModel) {
				this._cardModel = cardModel;

				this.$("#card-text").val(cardModel.content)
				this.$("#card-color-select").spectrum("set", cardModel.color);

				this.$("#post-card").html("Update");
			}
			else {
				this._cardModel = null;

				this.$("#post-card").html("Post");
			}
		},

		saveCard: function(e) {
			var that = this,
				boardId = this._workspace.getSelectedBoardId();


			if (this.$("#card-text").val().trim().length > 0) {
				if (!this._cardModel) {
					var newCard = {
						boardId: boardId,
						content: this.$("#card-text").val(),
						color: this.$("#card-color-select").spectrum("get").toString()
					};
					
					Card_Services.InsertTextCard(boardId, newCard, function(response) {
						that._workspace.cardAdded(response.card);

						that._workspace.sendSocket(JSON.stringify({ 
							action:"boardCardAdded", 
							board: boardId, 
							card: newCard 
						}));
					});
				}
				else {
					var updateModel = null;

					if ((this._cardModel.cards == null)|| (this._cardModel.cards.length === 0)) {
						var updateModel = {
							id: this._cardModel.id,
							parentId: this._cardModel.parentId,
							content: this.$("#card-text").val(),
							color: this.$("#card-color-select").spectrum("get").toString()
						};

						Card_Services.UpdateTextCard(boardId, this._cardModel.id, updateModel, function(response) {
							that._workspace.sendSocket(JSON.stringify({ 
								action:"boardCardUpdated", 
								board: boardId, 
								card: updateModel 
							}));
						});
					}
					else {
						updateModel = {
							id: this._cardModel.id, 
							boardId: boardId,
			  				action: "update",
							color: this.$("#card-color-select").spectrum("get").toString()
			  			};

			  			if (this._cardModel.type == "text") updateModel.content = this.$("#card-text").val();
			  			else updateModel.title = this.$("#card-text").val();

						Cluster_Services.Insert(boardId, this._cardModel.id, updateModel, function(response) {
							that._workspace.sendSocket(JSON.stringify({ 
								action:"boardClusterUpdated", 
								board: boardId, 
								cluster: updateModel 
							}));
						});
					}
					
					that._workspace.cardEdited(updateModel);
				}
			}

			this._workspace.hideAddCard();
		},

		focusCardText: function() {
			this.$("#card-text").focus();
		},

		clearCardText: function() {
			this.$("#card-text").val("");
		}
	});

	Card.AddImage = Backbone.View.extend({
    	el: "<div>",
    	_isMobile: null,
    	_workspace: null,
    	_cardsAdded: false,

		initialize: function(options) {
    		this.el.id = "add-image-container";

    		this._isMobile = options.isMobile;
    		this._workspace = options.workspace;
		},

		render: function() {
			var that = this;

			var template = "/app/templates/card/addImage.html";
			if (this._isMobile) template = "/app/templates/card/addImage.mobile.html";

			$.get(template, function(contents) {
				that.$el.html(_.template(contents, that.model));

				that.afterRender();				

				that.unbind();
				that.bind();
			}, "text");
		},

		afterRender: function() {
			var that = this,
				cardColor = this._workspace.getSelectedColor();

	    	this.$("#upload-card-color-select").spectrum("destroy");

	    	this.$("#upload-card-color-select").spectrum({
			    color: cardColor,
			    showInput: true,
			    className: "upload-image-spectrum",
			    showInitial: true,
			    showPaletteOnly: true,
			    showPalette:true,
			    maxPaletteSize: 10,
			    preferredFormat: "hex",
			    localStorageKey: "spectrum.boardthing.card",
			    palette: ["rgb(255,255,153)", "rgb(255,255,0)", "rgb(255,204,102)", "rgb(255,153,0)", "rgb(255,102,255)", "rgb(255,0,204)", "rgb(204,153,255)", "rgb(153,153,255)", "rgb(102,255,255)", "rgb(51,204,255)", "rgb(153,255,102)", "rgb(102,255,0)", "rgb(255,255,255)", "rgb(204,204,204)", "rgb(255,0,51)"],
			    change: function(color) {
			    	that.$("#link-card-color-select").spectrum("set", color.toString());
				}
			});
	    
	    	this.$("#link-card-color-select").spectrum("destroy");

	    	this.$("#link-card-color-select").spectrum({
			    color: cardColor,
			    showInput: true,
			    className: "link-image-spectrum",
			    showInitial: true,
			    showPaletteOnly: true,
			    showPalette:true,
			    maxPaletteSize: 10,
			    preferredFormat: "hex",
			    localStorageKey: "spectrum.boardthing.card",
			    palette: ["rgb(255,255,153)", "rgb(255,255,0)", "rgb(255,204,102)", "rgb(255,153,0)", "rgb(255,102,255)", "rgb(255,0,204)", "rgb(204,153,255)", "rgb(153,153,255)", "rgb(102,255,255)", "rgb(51,204,255)", "rgb(153,255,102)", "rgb(102,255,0)", "rgb(255,255,255)", "rgb(204,204,204)", "rgb(255,0,51)"],
			    change: function(color) {
			    	that.$("#upload-card-color-select").spectrum("set", color.toString());
				}
			});

	    	var filesToUpload = [];

			this.$('#imageUpload').fileupload({ 	
		        dataType: 'json',
    			disableImageResize: false,
			    imageMaxWidth: 1000,
			    imageMaxHeight: 1000,
			    imageCrop: false,
			    autoUpload: false,
		        add: function (e, data) {
		        	that._cardsAdded = true;

		            data.context = that.$('#upload-image-button').click(function () {
						that.$('#progress').show();

                    	data.submit();
	                });

	            	that.$("#selected-files-container").show();
		            for (var i=0, filesLength=data.files.length; i<filesLength; i+=1) {
		            	that.$("#selected-files-container").append("<div class=\"file-to-upload\">" + data.files[i].name + "</div>");
		            }
		        },
		        done: function (e, data) {
		        	if (data.result.message.toLowerCase() == "success") {
			        	var addedIdea = data.result.card;
			        	addedIdea.title = that.$("#photo-upload-title").val();
			        	addedIdea.color = that.$("#upload-card-color-select").spectrum("get").toString();

			        	Card_Services.UpdateImageCard(that.model.id, addedIdea.id, {
				        	title: that.$("#photo-upload-title").val(),
							color: that.$("#upload-card-color-select").spectrum("get").toString()
				        });

		        		that._workspace.cardAdded(addedIdea);
		        	}

					that._workspace.hideAddCard();

					that.removeAddImage();
		        },
		        progressall: function (e, data) {
		            var progress = parseInt(data.loaded / data.total * 100, 10);

		            $('#progress .progress-bar').css(
		                'width',
		                progress + '%'
		            );
		        }
		    });

			if (this._isMobile) this.$el.addClass("mobile");
	    	else this.$el.addClass("desktop");
		},

		unbind: function() {
			this.$el.unbind("click");

			this.$(".cancel-card").unbind("click");
			this.$("#link-to-photo-header").unbind("click");
			this.$("#upload-photo-header").unbind("click");

			this.$("#add-image-button").unbind("click");
			this.$("#back-image-button").unbind("click");
			this.$("#photo-url-title").unbind("keyup");
			this.$("#photo-upload-title").unbind("keyup");
			this.$("#upload-image-button").unbind("click");
		},

		bind: function() {
			var that = this;
			
  			this.$el.click(function(e) {
				e.stopPropagation();
  			});

			this.$(".cancel-card").click(function(e) {
				e.stopPropagation();
				
				that._workspace.hideAddImage();

				that.destroy();
			});

			this.$("#link-to-photo-header").click(function(e) {
				e.stopPropagation();
				
	    		that.$("#add-upload-image-body").hide();
	    		that.$("#add-linked-image-body").show();

	    		that.$("#link-to-photo-header").removeClass('popup-inactive-item').removeClass('popup-active-item').addClass('popup-active-item');
	    		that.$("#upload-photo-header").removeClass('popup-inactive-item').removeClass('popup-active-item').addClass('popup-inactive-item');
			});

			this.$("#upload-photo-header").click(function(e) {
				e.stopPropagation();
				
	    		that.$("#add-upload-image-body").show();
	    		that.$("#add-linked-image-body").hide();

	    		that.$("#link-to-photo-header").removeClass('popup-inactive-item').removeClass('popup-active-item').addClass('popup-inactive-item');
	    		that.$("#upload-photo-header").removeClass('popup-inactive-item').removeClass('popup-active-item').addClass('popup-active-item');
			});

			this.$("#add-image-button").click(function(e) {
				e.stopPropagation();

				var urlValid = true;

				if (that.$("#photo-url-location").val().trim().length == 0) {
					that.$("#photo-url-location").css("border", "1px solid #ff0000");

					urlValid = false;
				}
				else that.$("#photo-url-location").css("border", "1px solid #b9b9b9");

				if (urlValid) {
					that.$("#loading-container").show();
					that.$("#photo-url-title").prop('disabled', true);
					that.$("#photo-url-location").prop('disabled', true);
					that.$("#photo-upload-title").prop('disabled', true);
					that.$("#add-image-button").prop('disabled', true);
					that.$("#upload-image-button").prop('disabled', true);

			        imageValues = {
			        	title: that.$("#photo-url-title").val(),
						color: that.$("#link-card-color-select").spectrum("get").toString(),
			            imageLocation: that.$("#photo-url-location").val()
			        };

			        Card_Services.DownloadImage(that.model.id, imageValues, function(response) {
			        	if (response.message == "success") {
							that._workspace.cardAdded(response.card);

							that._workspace.hideAddImage();

							that.destroy();
			        	}
			        	else {
							that.$("#loading-container").hide();
							that.$("#photo-url-title").prop('disabled', false);
							that.$("#photo-url-location").prop('disabled', false);
							that.$("#photo-upload-title").prop('disabled', false);
							that.$("#add-image-button").prop('disabled', false);
							that.$("#upload-image-button").prop('disabled', false);

			        		that.$("#add-linked-image-body").hide();
			        		that.$("#add-linked-error-body").show();
			        		that.$("#back-image-error").html("The image you selected could not be uploaded");
			        	}
		            });
				}
			});

			this.$("#back-image-button").click(function(e) {
				that.$("#add-linked-image-body").show();
				that.$("#add-linked-error-body").hide();
			});

			this.$("#photo-url-title").keyup(function(e) {
    			that.$("#photo-upload-title").val(that.$("#photo-url-title").val());
			});

			this.$("#photo-upload-title").keyup(function(e) {
    			that.$("#photo-url-title").val(that.$("#photo-upload-title").val());
			});

			this.$("#upload-image-button").click(function(e) {
				if (that._cardsAdded) {
					that.$("#loading-container").show();
					that.$("#photo-url-title").prop('disabled', true);
					that.$("#photo-url-location").prop('disabled', true);
					that.$("#photo-upload-title").prop('disabled', true);
					that.$("#add-image-button").prop('disabled', true);
					that.$("#upload-image-button").prop('disabled', true);

		        	that.$("#progress").show();
	        	}
			});
		},

        urlEndsWith: function(str, suffix) {
		    return str.indexOf(suffix, str.length - suffix.length) !== -1;
		},

		destroy: function() {
			$('#imageUpload').detach();
			this.$el.detach();
			this.remove();
		}
	});

	return Card;
});