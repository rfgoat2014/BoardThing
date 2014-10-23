define([
	"modules/card.services",
	"modules/cluster.services",
	"modules/workspace.services",
	"spectrum"
],

function(Card_Services, Cluster_Services, Workspace_Services) {
	var Card = {};

	Card.GenerateModel = function(model, parentId) {
		var cardModel = {
			id: model.id, 
			boardId: model.boardId,
			type: model.type,
			title: model.title, 
			content: model.content,
			cards: [], 
			parentIsVoting: false, 
			isVoting: false, 
			votesReceived: 0, 
			isLocked: false, 
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

    	// {{ Contructor }}

		initialize: function(options) {
			this.el.id = "item-content-container_" + this.model.id;

			this._isMobile = this.options.isMobile;
			this._workspace = this.options.workspace;
			this._parent = this.options.parent;
		},

		// {{ Object Building }}

		render: function() {
			var that = this;
			
			var template = "/app/templates/card/item";
			if (this.model.parentId) template = "/app/templates/card/clusteredItem";

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

				// Set the defined position and height/width

				if ((!that.model.parentId) && (that.model.xPos && that.model.yPos)) that.$el.css({top: that.model.yPos, left: that.model.xPos, position: 'absolute'});
					
				if ((!that.model.parentId) && (that.model.zPos != null)) that.$el.zIndex(that.model.zPos);

				if (that.model.width) {
		    		that.$el.attr("is-resized", "true");
					that.$el.css({ width: that.model.width });
				}
				else that.$el.css({ width: "" });

				if (that.model.height) {
		    		that.$el.attr("is-resized", "true");
					that.$el.css({ height: that.model.height });
				}
				else that.$el.css({ height: "" });

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

				this.$("#card-settings-button").unbind("click");
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

			    			if ((that._workspace.selectedPageTool == "pen") || (that._workspace.selectedPageTool == "eraser")) that._workspace.stopDrawing();
	   					}
					});
				}
			}
			else {
				this.$el.click(function(e) {
					e.stopPropagation();
				});

				this.$el.mouseup(function(e) {
					if ((that._workspace.selectedPageTool == "pen") || (that._workspace.selectedPageTool == "eraser")) that._workspace.stopDrawing();
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

				this.$("#card-settings-button").click(function(e) {
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

						if (!that._workspace.workspace._isMobile) {
							that._isDragging = true;
						}
						else {
							startDragX = e.clientX;
		        			startDragY = e.clientY;
						}
					},
					drag: function(e,ui) {
						if (that._workspace.workspace._isMobile) {
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
								var clusterId = that.model.parentId.
									cardId = that.model.id,
									currentMousePosition = that._workspace.getCurrentMousePosition();
								
								Cluster_Services.DetachCard(that.model.boardId, clusterId, cardId, function(response) {
					            	if (response.status == "success") {
										that._workspace.sendSocket(JSON.stringify({ 
											action:"removeCardFromCluster", 
											board: that.model.boardId, 
											updateDetail: {
												clusterId: clusterId,
												cardId: cardId,
												xPos: currentMousePosition.x,
												yPos: currentMousePosition.y
											} 
										}));
									}
								});

						    	that._workspace.removeCardFromCluster(updateDetail);

						    	that._parent.saveSortPosition();
							}
							else {
								var currentPosition = that.$el.position();

								Card_Services.UpdatePosition(that.model.boardId, that.model.id, (currentPosition.left + that._workspace.$("#board-cards").scrollLeft()), (currentPosition.top + that._workspace.$("#board-cards").scrollTop()));
					        }

					    	that._workspace.sortZIndexes(that.model.id,true);
		        		}
			        	else {
    						if ((that.$el.attr("is-resized") == undefined) || (that.$el.attr("is-resized") != "true")) {
				        		if (that.model.parentId == elementId) that.$el.css({ top: 0, left: 0, position: 'relative' });
				        	}
				        	else {
								var currentPosition = that.$el.position();

								Card_Services.UpdatePosition(that.model.boardId, that.model.id, (currentPosition.left + that._workspace.$("#board-cards").scrollLeft()), (currentPosition.top + that._workspace.$("#board-cards").scrollTop()));
					        }
			        	}
					}
				});

				if ((!that.model.parentId) && ((!(that.$el.attr("is-resized"))) || (that.$el.attr("is-resized") == "false"))) {
		        	that.$el.droppable({
		        		accept: ".new-card,.item-content-container,.clustered-item-content-container,.clustered-cluster-content-container-collapsed,.clustered-cluster-content-container,.cluster-content-container-collapsed,.cluster-content-container",
		        		tolerance: "pointer",
		           		drop: function(e, ui) {
		           			if (!this._resizing) {
			           			if (ui.draggable.context.id.trim().toLowerCase().indexOf("item-content-container") == 0) {
			           				var droppedCardId = null;

			       					if (ui.draggable.find('#card-body').length > 0) droppedCardId = ui.draggable.find('#card-body').attr("element-id");
									else if (ui.draggable.find('#clustered-card-body').length > 0) droppedCardId = ui.draggable.find('#clustered-card-body').attr("element-id");
			       					
			       					if ((droppedCardId) && ((!$(ui.draggable).attr("is-resized")) || ($(ui.draggable).attr("is-resized") == "false"))) that._workspace.createClusterFromCard(droppedCardId, that.model.id);
					           	}
			           			else if (ui.draggable.context.id.trim().toLowerCase().indexOf("cluster-content-container") == 0) {
			           				var droppedClusterId = null;

			       					if (ui.draggable.find('#cluster-body').length > 0) droppedClusterId = ui.draggable.find('#cluster-body').attr("element-id");
									else if (ui.draggable.find('#cluster-body-collapsed').length > 0) droppedClusterId = ui.draggable.find('#cluster-body-collapsed').attr("element-id");
			       					else if (ui.draggable.find('#clustered-cluster-body').length > 0) droppedClusterId = ui.draggable.find('#clustered-cluster-body').attr("element-id");
			       					

			       					if (droppedClusterId) that._workspace.createClusterFromCluster(droppedClusterId, that.model.id);
			           			}
		           			}
		           		}
		        	});
		        }
	    	}

			this._mobileEventsBound = true;
	    },

	    // {{ Getters }}

	    getId: function() {
	    	return this.model.id;
	    },

	    getXPos: function() {
	    	return this.model.xPos;
	    },

	    getYPos: function() {
	    	return this.model.yPos;
	    },

	    getWidth: function() {
	    	return this.model.width;
	    },

	    getHeight: function() {
	    	return this.model.height;
	    },

	    getType: function() {
	    	return "card";
	    },

	    // {{ Methods }}

		// ---------- Actions for displaying edit icons

		showHoverIcons: function (e) {
			e.stopPropagation();

			this.$("#card-action-container").show();
		},

	    hideHoverIcons: function(e) {
	    	if (!this._showSettingsIcon) this.$("#card-action-container").hide();
	    },

		// ---------- Actions for displaying sthe settings menu

		showSettingsMenu: function(e) {
			e.stopPropagation();

			if (!this.$("#card-settings-menu").is(':visible')) {
				this._showSettingsIcon = true;

				if (this._isMobile) this.$("#card-resize-button").hide();

				this.$("#card-settings-menu").show();
			}
			else this.clearSettingsmenu();
		},

		clearSettingsmenu: function() {
			this._showSettingsIcon = false;

			this.$("#card-settings-menu").hide();
			this.$("#card-action-container").hide();
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

			this.disableResizeCard();

			if (this.model.type.toLowerCase() == "text") this.editText(e);
			else this.editImage(e);
		},

		editText: function(e) {
			this._workspace.editText(this.model);
		},

		editImage: function(e) {
			this._workspace.editImage(this.model);
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
				var startX = null;
				var startY = null;

				var currentWidth = this.$el.width();
				var currentHeight = this.$el.height();

				this.$el.addClass("resizing-content");

				if (this.model.type.trim().toLowerCase() == "text") this.$el.append("<div id=\"resize-right\" class=\"resize-right\"></div><div id=\"resize-left\" class=\"resize-left\"></div><div id=\"resize-top\" class=\"resize-top\"></div><div id=\"resize-bottom\" class=\"resize-bottom\"></div>");
				else this.$el.append("<div id=\"resize-top-right\" class=\"resize-top-right\"></div><div id=\"resize-top-left\" class=\"resize-top-left\"></div><div id=\"resize-bottom-right\" class=\"resize-bottom-right\"></div><div id=\"resize-bottom-left\" class=\"resize-bottom-left\"></div>");
			
				try {
					this.$el.resizable( "destroy" );
				}
				catch(err) {}

				this._resizing = true;

	    		this.el$.resizable({
	    			handles: "n,s,e,w",
					start: function(e,ui) {
						startX = that.$el.position().left;
						startY = that.$el.position().top;
					},
	    			resize: function(e,ui) {
	    				that.$("#undo-card-resize-button").show();

	    				if ((startX) && (startY) && (that.$el.width() == 180)) {
							that.$el.css({ left: startX });

							if (that.$el.height() < currentHeight)  that.$el.css({ top: startY });
	    				}

	    				if (that.model.type.trim().toLowerCase() != "text") {
    						if (that.$el.width() > 180) {
			    				if (currentWidth != that.$el.width()) {
									that.$("#card-body-image_" + that.model.id).css({ height: "auto", width: that.$el.width()-20 });
			    				}
			    				else if (currentHeight != that.$el.height()) {
									that.$("#card-body-image_" + that.model.id).css({ height: that.$el.height()-20, width: "auto" });
									
									that.$el.css({ width: that.$("#card-body-image_" + that.model.id).width() + 20 });
			    				}

								if ((that.model.title) && (that.model.title.length > 0)) that.$el.css({ height: that.$("#card-body-image_" + that.model.id).height() + 20 + that.$("#card-image-title").height() + 10 });
								else that.$el.css({ height: that.$("#card-body-image_" + that.model.id).height() + 20 });
							}
							else if (that.$el.height() > currentHeight) {
								that.$("#card-body-image_" + that.model.id).css({ height: that.$el.height()-20 });
								that.$("#card-body-image_" + that.model.id).css({ width: "auto" });
								
								that.$el.css({ width: that.$("#card-body-image_" + that.model.id).width() + 20 });
							
								if ((that.model.title) && (that.model.title.length > 0)) that.$el.css({ height: that.$("#card-body-image_" + that.model.id).height() + 20 + that.$("#card-image-title").height() + 10 });
								else that.$el.css({ height: that.$("#card-body-image_" + that.model.id).height() + 20 });
							}
							else {	
								that.$("#card-body-image_" + that.model.id).css({ height: "auto", width: 160 });

								that.$el.css({ width: that.$("#card-body-image_" + that.model.id).width() + 20 });

								if ((that.model.title) && (that.model.title.length > 0)) that.$el.css({ height: that.$("#card-body-image_" + that.model.id).height() + 20 + that.$("#card-image-title").height() + 10 });
								else that.$el.css({ height: that.$("#card-body-image_" + that.model.id).height() + 20 });
							}

							currentWidth = that.$el.width();
							currentHeight = that.$el.height();
						}
						else {
							if (that.$el.height() < (that.$("#card-body-text").height() + 20)) that.$el.css({ height: that.$("#card-body-text").height() + 20 });	
						}

	    				if (that.$el.width() == 180) {
							startX = that.$el.position().left;
							startY = that.$el.position().top;
	    				}
	    			}
				});
			}
		},

		// Called when the resize is finished

		disableResizeCard: function() {
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

		        	this.updateCardPosition((this.$el.position().left + this._workspace.$("#board-cards").scrollLeft()), (this.$el.position().top + this._workspace.$("#board-cards").scrollTop()));
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

			Card_Services.Duplicate(this.model.boardId + "/" + this.model.id, function(response) {
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
					topic: this.model.boardId, 
					card: cardToDelete 
				}));
			});

			this._parent.removeCard(cardToDelete);

			if (this._parent.saveSortPosition) this._parent.saveSortPosition();
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

    	_isMobile: null,
    	_workspace: null,

		initialize: function(options) {
    		this.el.id = "card-create-container";

    		this._isMobile = this.options.isMobile;
    		this._workspace = this.options.workspace;
		},

		render: function() {
			var that = this;

			var template = "/app/templates/card/addText";
			if (this._isMobile) template = "/app/templates/card/addText.mobile";

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

		saveCard: function(e) {
			var that = this;

			if (this.$("#card-text").val().trim().length > 0) {
				var boardId = this._workspace.getSelectedBoardId();

				var newCard = {
					boardId: boardId,
					content: this.$("#card-text").val(),
					color: this.$("#card-color-select").spectrum("get").toString()
				};
				
				Card_Services.InsertTextCard(boardId, newCard, function(response) {
					that._workspace.cardAdded(response.card);
				});
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

    		this._isMobile = this.options.isMobile;
    		this._workspace = this.options.workspace;
		},

		render: function() {
			var that = this;

			var template = "/app/templates/card/addImage";
			if (this._isMobile) template = "/app/templates/card/addImage.mobile";

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

	Card.EditText = Backbone.View.extend({
    	el: "<div>",

    	_isMobile: null,
    	_workspace: null,

		initialize: function(options) {
    		this.el.id = "edit-card-container";

    		this._isMobile = this.options.isMobile;
    		this._workspace = this.options.workspace;
		},

		render: function() {
			var that = this;

			var template = "/app/templates/card/editText";
			if (this._isMobile) template = "/app/templates/card/editText.mobile";

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
			    color: this.model.color,
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

			var data = this.$("#edit-card-content_" + this.model.id).val();

			if (this._isMobile) this.$el.addClass("mobile");
	    	else this.$el.addClass("desktop");
	    },

	    unbind: function() {
			this.$el.unbind("click");

			this.$("#card-content_" + this.model.id).unbind("keypress");
			this.$("#update-card").unbind("click");
	    },

	    bind: function() {
			var that = this;

  			this.$el.click(function(e) {
				e.preventDefault();
  			});

			this.$("#card-content_" + this.model.id).keypress(function(e) {
			  	var charCode = e.charCode || e.keyCode;

		        if ((e) && (charCode == 13)) {
		        	e.preventDefault();

		        	this.updateCard();
		        }
			});

			this.$("#update-card").click(function(e) {
				e.stopPropagation();
				
				that.updateCard();
			});
	    },

		updateCard: function() {
			var that = this;

			if ((this.$("#edit-card-content_" + this.model.id).val().trim().length > 0) && (!this._ideaUpdated)) {
    			this._ideaUpdated = true;

				var parentId = null
				if (this.model.parentId) parentId = this.model.parentId;

				var updateTextModel = {
					id: this.model.id,
					parentId: parentId,
					content: this.$("#edit-card-content_" + this.model.id).val(),
					color: this.$("#card-color-select").spectrum("get").toString(),
					boardId: this.model.boardId
				};

				Card_Services.UpdateTextCard(this.model.boardId, this.model.id, updateTextModel, function(response) {
					_workspace.editCardComplete(updateIdeaModel);

					that._workspace.sendSocket(JSON.stringify({ 
						action:"topicCardUpdated", 
						board: that._model.boardId, 
						card: updateTextModel 
					}));

					that.destroy();
				});
			}
		},

		destroy: function() {
			this.$el.detach();
			this.remove();
		},
	});

	Card.EditImage = Backbone.View.extend({
		el: "<div>",

    	_isMobile: null,
    	_workspace: null,

		initialize: function(options) {
    		this.el.id = "edit-image-container";

    		this._isMobile = this.options.isMobile;
    		this._workspace = this.options.workspace;
		},

		render: function() {
			var that = this;

			var template = "/app/templates/card/editImage";
			if (this._isMobile) template = "/app/templates/card/editImage.mobile";

			$.get(template, function(contents) {
				that.$el.html(_.template(contents, that.model));

				that.afterRender();				

				that.unbind();
				that.bind();
			}, "text");
		},

	    afterRender: function() {
	    	var that = this;

	    	this.$("#card-color-select").spectrum("destroy");

	    	this.$("#card-color-select").spectrum({
			    color: this.model.color,
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

			this.$("#image-title_" + this.model.id).unbind("keypress");
			this.$("#update-card").unbind("click");
	    },

	    bind: function() {
			var that = this;

  			this.$el.click(function(e) {
				e.stopPropagation();
  			});

			this.$("#image-title_" + this.model.id).keypress(function(e) {
			  	var charCode = e.charCode || e.keyCode;

		        if ((e) && (charCode == 13)) {
		        	e.preventDefault();

		        	this.updateCard();
		        }
			});

			this.$("#update-card").click(function(e) {
				e.stopPropagation();
				
				that.updateCard();
			});
	    },

		updateCard: function() {
			var that = this;

			var parentId = null
			if (this.model.parentId) parentId = this.model.parentId;

			var updateImageModel = {
				id: this.model.id,
				boardId: this.model.boardId,
				parentId: parentId,
				title: this.$("#image-title_" + that.model.id).val(),
				color: this.$("#card-color-select").spectrum("get").toString()
			};
	      
			Card_Services.UpdateImageCard(this.model.boardId, this.model.id, updateImageModel, function(response) {
				that._workspace.editCardComplete(updateImageModel);

				that._workspace.sendSocket(JSON.stringify({ 
					action:"topicCardUpdated", 
					board: that._model.boardId, 
					card: updateImageModel 
				}));

				that.destroy();
			});
		},

		destroy: function() {
			this.$el.detach();
			this.remove();
		}
	});

	return Card;
});