define([
	"modules/card",
	"modules/card.services",
	"modules/cluster.services",
	"modules/utils",
],

function(Card, Card_Services, Cluster_Services, Utils) {
	var Cluster = {};

	Cluster.GenerateModel = function(model, parentId) {
		var clusterModel = {
			id: model.id, 
			boardId: model.boardId,
			type: model.type, 
			parentId: parentId,
			parentIsVoting: false, 
			isVoting: false, 
			votesReceived: 0, 
			xPos: model.xPos,
			yPos: model.yPos,
			width: model.width,
			height: model.height,
			color: model.color, 
			title: model.title, 
			content: model.content, 
			parentId: model.parentId, 
			created: model.created, 
			createdDate: new Date(model.created)
		};
		
		if (model.collapsed == null) {
			if (parentId == null) clusterModel.collapsed = false;
			else clusterModel.collapsed = true;
		}
		else clusterModel.collapsed = model.collapsed;

		if (model.votesReceived > 0) {
			if (model.type.trim().toLowerCase() == "text") clusterModel.content = model.content + " (+" + model.votesReceived + ")";
			else clusterModel.title = model.title + " (+" + model.votesReceived + ")";
		}

		if (model.cards) clusterModel.cards = model.cards;
		else clusterModel.cards = [];

		return clusterModel;
	};

  	Cluster.Item = Backbone.View.extend({
    	tagName: "div",

    	_isMobile: null,
    	_workspace: null,
    	_parent: null,

    	_editing: false,
    	_editable: true,
		_clusterClickCount: 0,

		_childViews: [],

    	// {{ Contructor }}

		initialize: function(options) {
			this.el.id = "cluster-content-container_" + this.model.id;

			this._isMobile = options.isMobile;
			this._workspace = options.workspace;
			this._parent = options.parent;
		},

		// {{ Object Building }}

		render: function() {
			var that = this,
				template = null;

    		if (this.model.parentId != null) {
	    		if (this.model.collapsed) template = "/app/templates/cluster/clusteredCollapsed.html";
	    		else template = "/app/templates/cluster/clusteredItem.html";
    		}
    		else {
	    		if (this.model.collapsed) template = "/app/templates/cluster/collapsed.html";
	    		else template = "/app/templates/cluster/item.html";
    		}

			$.get(template, function(contents) {
				that.$el.html(_.template(contents, that.model));

				that.afterRender();				

				that.unbind();
				that.bind();
			}, "text");
		},

		afterRender: function() {
    		this.$el.attr("element-id", this.model.id);
    		this.$el.attr("object-type", "cluster");

			if (!this._parent) {
				if ((this.model.xPos) && (this.model.yPos)) this.$el.css({top: this.model.yPos, left: this.model.xPos, position: 'absolute'});
				
				if (this.model.zPos != null) this.$el.zIndex(this.model.zPos);
			}

			if ((this.model.color) && (this.model.color.trim().toLowerCase() != "#ffffff")) this.$el.css({ backgroundColor: "rgba(" + Utils.hexToRgb(that.model.color) + ",0.20);" });
			
			// Build up the clusters child cards and clusters
      		this._childViews = [];

			for (var i=0, cardsLength=this.model.cards.length; i<cardsLength; i+=1) {
        		this.model.cards[i].cluster = this;
        		this.model.cards[i].parentIsVoting = this.model.isVoting;

				if ((this.model.cards[i].cards == null) || (this.model.cards[i].cards.length === 0)) {
					var cardView = new Card.Item({ model: this.model.cards[i], workspace: this._workspace, parent: this });
					cardView.render();

	    			this._childViews.push(cardView);
	    		}
	    		else {
					var clusterView = new Cluster.Item({ model: this.model.cards[i], workspace: this._workspace, parent: this });
					clusterView.render();

	    			this._childViews.push(clusterView);
	    		}
        	}

			if (!this.model.collapsed) {
				this._childViews.sort(function (a, b) { return a.model.zPos > b.model.zPos ? 1 : a.model.zPos < b.model.zPos ? -1 : 0; });

				for (var i=0; i<this._childViews.length; i++) {
	    			this.$("#cards-container_" + this.model.id).append(this._childViews[i].el);
				}
			}

    		if (this.model.parentId != null) {
	    		if (this.model.collapsed) this.el.className = "box clustered-cluster-content-container-collapsed";
	    		else this.el.className = "box clustered-cluster-content-container";
    		}
    		else {
	    		if (this.model.collapsed) this.el.className = "box cluster-content-container-collapsed";
	    		else this.el.className = "box cluster-content-container";
    		}		
    	},

	    unbind: function() {
			if (!this._isMobile) {
				this.$el.unbind("click");
				this.$el.unbind("mouseup");
				this.$el.unbind("dblclick");
				this.$el.unbind("mouseover");
				this.$el.unbind("mouseout");

				this.$("#cluster-settings-button_" + this.model.id).unbind("click");
			}

			this.$el.unbind("keypress");
			this.$el.unbind("draggable");
			this.$el.unbind("droppable");

			this.$("#edit-title_" + this.model.id).unbind("click");
			this.$("#start-dot-vote").unbind("click");
			this.$("#stop-dot-vote").unbind("click");
	        this.$("#editable-title_" + this.model.id).unbind("blur");
			this.$("#add-vote").unbind("click");
	    },

	    bind: function() {
	    	var that = this;

			if (this._isMobile) {
				if (!this._mobileEventsBound) {
					var touchComplete = null;

	      			this.$el.click(function(e) {
	   					e.stopPropagation();
	   					e.preventDefault();
	      			});

					this.$el.on("touchstart touchend taphold", function(e) {
	   					e.preventDefault();
	   					e.stopPropagation();
	   					
	   					if (e.type.toString() == "touchstart") {
							touchComplete = function() {
		   						if (that._showSettingsIcon) that.clearSettingsmenu(e);

					        	that.touchTapped();
							}
	   					}
	   					else if (e.type.toString() == "taphold") {
							if ((!that.model.parentId) && (!that._dragging)) {
								touchComplete = function() {
									that.$("#cluster-action-container_" + that.model.id).show();
									
									that.showSettingsMenu(e);
								}
							}
							else {
								touchComplete = null;
							}
	   					}
	   					else if (e.type.toString() == "touchend") {
	   						if ((!that._dragging) && (touchComplete != null)) touchComplete();
							else that._dragging = false;

							touchComplete = null;

			    			if ((that._workspace.selectedPageTool == "pen") || (that._workspace.selectedPageTool == "eraser")) that._workspace.stopDrawing();
	   					}
					});
				}
			}
			else {
	  			this.$el.click(function(e) {
		        	that.clearSettingsmenu();
	  			});

				this.$el.mouseup(function(e) {
			    	if ((that._workspace.selectedPageTool == "pen") || (that._workspace.selectedPageTool == "eraser")) that._workspace.stopDrawing();
				});

	  			this.$el.dblclick(function(e) {
					e.stopPropagation();

					that.toggleCollapsed();
				});

	  			this.$("#cluster-settings-button_" + this.model.id).click(function(e) {
		        	that.showSettingsMenu(e);
	  			});

	        	this.$el.mouseover(function() {
	        		if (that._parent) { 
	        			if (that._parent._editable) that._parent._editable = false;

	        			if (that._parent.hideHoverIcons) that._parent.hideHoverIcons();
	        		}

	        		that.showHoverIcons();
	        	});

	        	this.$el.mouseout(function() {
	        		if ((that._parent != undefined) && (that._parent._editable != undefined)) that._parent._editable = true;
	    			
	        		that.hideHoverIcons();
	        	});
	        }

        	this.$el.keypress(function(e) {
			  	if (e) {
				  	var charCode = e.charCode || e.keyCode;

			        if (charCode == 13) {
			        	e.preventDefault();

			        	that.updateCluster();

						that.$("#editable-title_" + that.model.id).blur();
			        }
			    }
        	});

        	this.$("#edit-title_" + this.model.id).click(function(e) {
	        	that.clearSettingsmenu();

        		that.editCluster(e);
				
				that.$("#editable-title_" + that.model.id).focus().val('').val(that.$("#cluster-title_" + that.model.id).html());
        	});

        	this.$("#start-dot-vote").click(function(e) {
	        	that.clearSettingsmenu();

        		that.startDotVoting(e);
        	});

        	this.$("#stop-dot-vote").click(function(e) {
	        	that.clearSettingsmenu();

        		that.stopDotVoting(e);
        	});

        	this.$("#editable-title_" + this.model.id).blur(function(e) {
        		that.updateCluster();
        	});

        	this.$("#add-vote").click(function(e) {
        		that.addVote(e);
        	});

        	var startDragX = null,
        		startDragY = null;

        	this.$el.draggable({
				start: function( e, ui ) {
					startDragX = e.clientX;
        			startDragY = e.clientY;

					if (!that._isMobile) that._dragging = true;

					that.$el.zIndex(999999999999999);
				},
				drag: function( e, ui ) {
					if (that._isMobile) {
						var distanceFromStartX = e.clientX - startDragX,
							distanceFromStartY = e.clientY - startDragY;

						if (((distanceFromStartX > 5) || (distanceFromStartX < -5)) || ((distanceFromStartY > 5) || (distanceFromStartY < -5))) that._dragging = true;
					}
				},
				stop: function( e, ui ) {
					e.stopPropagation();

					var elementId = that._workspace.checkPositionTaken(that.model.id);

					if (elementId == -1) {
						if (that.model.parentId) {
							var updateDetail = {
								clusterId: that.model.id,
								xPos: that._workspace._currentMousePosition.x,
								yPos: that._workspace._currentMousePosition.y
							};

							Cluster_Services.Insert(that.model.boardId, updateDetail.clusterId, updateDetail, function(response) {
				            	if (response.status == "success") {
									that._workspace.sendSocket(JSON.stringify({ 
										action:"removeClusterFromCluster", 
										board: that.model.boardId, 
										updateDetail: updateDetail
									}));
								}
							});

					    	that._workspace.removeClusterFromCluster(updateDetail);

					    	that._parent.saveSortPosition();
						}
						else if (!that.model.parentId) {
							that.model.xPos = that._workspace.$("#board-container").scrollLeft()+that.$el.position().left;
							that.model.yPos = that._workspace.$("#board-container").scrollTop()+that.$el.position().top;

				        	that.updateClusterPosition(that.model.xPos, that.model.yPos);
			        	}
			        	
				    	that._workspace.sortZIndexes(that.model.id,true);
		        	}
		        	else {
		        		if (that.model.parentId == elementId) that.$el.css({ top: 0, left: 0, position: 'relative' });
		        	}
				}
			});

			if (!that.model.collapsed) {
	        	this.$el.droppable({
	        		accept: ".new-card,.item-content-container,.clustered-item-content-container,.clustered-cluster-content-container-collapsed,.clustered-cluster-content-container,.cluster-content-container-collapsed,.cluster-content-container",
	        		tolerance: "pointer",
	            	greedy:true,
	           		drop: function(e, ui) {
						e.stopPropagation();

	 					if (!that.model.collapsed) {
		   					var isChild = false;

		       				if  ($(ui.draggable).attr("object-type") == "card") {
		       					var updateDetail = {
									clusterId: that.model.id,
									cardId: $(ui.draggable).attr("element-id")
								};

		       					if (updateDetail) {
		       						if ((!$(ui.draggable).attr("is-resized")) || ($(ui.draggable).attr("is-resized") == "false")) {
				       					for (var i=0; i<that._childViews.length; i++) {
				       						if ((that._childViews[i].getType() == "card") && (that._childViews[i].model.id.toString()== updateDetail.cardId.toString())) isChild = true;
				       					}

				       					if (!isChild) {	
											Cluster_Services.AttachCard(that.model.boardId, updateDetail.clusterId, updateDetail.cardId, function(response) {
												that._workspace.sendSocket(JSON.stringify({ 
													action:"addCardToCluster", 
													board: that.model.boardId, 
													updateDetail: updateDetail
												}));
											});

											that._workspace.addCardToCluster(updateDetail.clusterId, updateDetail.cardId);
										}
									}
								}
		       				}
		       				else if ($(ui.draggable).attr("object-type") == "cluster") {
		       					var updateDetail = {
									targetClusterId: that.model.id,
									sourceClusterId: $(ui.draggable).attr("element-id")
								};

		       					for (var i=0; i<that._childViews.length; i++) {
		       						if ((that._childViews[i].getType() == "cluster") && (that._childViews[i].model.id == updateDetail.sourceClusterId)) isChild = true;
		       					}

		       					if ((!isChild) && (updateDetail.targetClusterId != updateDetail.sourceClusterId)) {
		       						Cluster.AttachCluster(boardId, updateDetail.targetClusterId, updateDetail.sourceClusterId, function(response) {
		       							that._workspace.sendSocket(JSON.stringify({ 
		       								action:"addClusterToCluster", 
		       								board: that.model.boardId, 
		       								updateDetail: updateDetail 
		       							}));
		       						});
										
									that._workspace.addClusterToCluster(updateDetail);
								}
		       				}

		       				if (isChild) {
		       					var elementId = $(ui.draggable).attr("element-id");

		       					if (elementId) {
			       					var selectedElement = null;

			       					for (var i=0; i<that._childViews.length; i++) {
			       						if (that._childViews[i].model.id == elementId) {
			       							selectedElement = that._childViews[i];
			       							break;
			       						}

			       					}

				       				if (selectedElement) that.changeSortPosition(selectedElement);
		       					}
		       				}
		           		}
	        		}
	        	});
			}

			this._mobileEventsBound = true;
		},

		touchTapped: function() {
			var that = this;
 
			this._clusterClickCount++;

		    if (this._clusterClickCount === 1) {
		        singleClickTimer = setTimeout(function() { 
		            that._clusterClickCount = 0;
		        }, 250);
		    } else if (this._clusterClickCount === 2) {
		        clearTimeout(singleClickTimer);
		
		        this._clusterClickCount = 0;

		        this.toggleCollapsed();
		    }
		},

	    // {{ Getters }}

	    // ----- Global card view getters

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
	    	return "cluster";
	    },

	    // ----- Cluster specific getters

	    getChildCardCount: function() {
	    	return this.model.cards.length;
	    },

	    // {{ Setters }}

	    setZPos: function(value) {
	    	this.model.zPos = value;
	    },

	    addCard: function(cardModel) {
	    	this.model.cards.push(cardModel);
	    },

	    // {{ Methods }}

		// ---------- Actions for displaying edit icons

		showHoverIcons: function () {
			if ((this._editable) && (!this._editing)) this.$("#cluster-action-container_" + this.model.id).show();
		},

	    hideHoverIcons: function() {
	    	if (!this._showSettingsIcon) this.$("#cluster-action-container_" + this.model.id).hide();
	    },

		// ---------- Actions for showing the settings menu

		showSettingsMenu: function(e) {
			e.stopPropagation();

			if (!this.$("#cluster-settings-menu_" + this.model.id).is(':visible')) {
				this.$("#cluster-settings-menu_" + this.model.id).show();

				this._showSettingsIcon = true;
			}
			else this.clearSettingsmenu();
		},

		clearSettingsmenu: function() {
			this.$("#cluster-settings-menu_" + this.model.id).hide();
			this.$("#cluster-action-container_" + this.model.id).hide();

			this._showSettingsIcon = false;

			for (var i = 0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
				this._childViews[i].clearSettingsmenu();
			}
		},

		// ---------- Actions for setting cluster position

		updateClusterPosition: function(left,top) {
			Cluster_Services.UpdatePosition(this.model.boardId, this.model.id, left, top);

			this._workspace.sendSocket(JSON.stringify({
				action:"updateClusterPosition",
				board: this.model.boardId,
				position: {
		        	id: this.model.id,
		        	xPos: left,
		        	yPos: top
		        }
			}));
		},

		setClusterPosition: function(clusterId,left,top) { 
			if (this.model.id == clusterId) {
				this.model.xPos = left;
				this.model.yPos = top;

				this.render();
			}	
		},

		// ----- Set switch the clusters collapsed position

		toggleCollapsed: function() {
	        if (this.model.parentId) {
				if (this.model.collapsed) this.expandCluster();
				else this.collapseCluster();
			}
			else {
				if (this.model.collapsed) this.saveAndExpandCluster();
				else this.saveAndCollapseCluster();
			}
		},

		// ---------- Actions to update sort position

		changeSortPosition: function(selectedElement) {
			var that = this;

			if (selectedElement) {
				var orderedArray = new Array(),
					tmpArray = new Array();

				for (var i = 0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
					tmpArray[this._childViews[i].model.zPos-1] = this._childViews[i];
        		}

	        	tmpArray.forEach(function(entry) {
	        		orderedArray.push(entry);
	        	});

        		tmpArray = null;

				for (var i = 0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
					var cardOrdered = false;

					for (var j = 0, orderedArrayLength=orderedArray.length; j<orderedArrayLength; j+=1) {
						if (this._childViews[i].getId() == orderedArray[j].getId()) {
							cardOrdered = true;
							break;
						}
					};

					if (!cardOrdered) orderedArray.push(this._childViews[i]);
        		}

				var newZPos = null;

				for (var i=0, orderedArrayLength=orderedArray.length; i<orderedArrayLength; i++) {
					if (newZPos === null) {
						if ((orderedArray[i]) && (selectedElement) && (orderedArray[i].getId() != selectedElement.getId())) {
							var cardViewCenter = $(orderedArray[i].el).position().top + Math.round($(orderedArray[i].el).height()/2);

							if ((this._workspace._currentMousePosition.y-(this._workspace.$("#board-cards").scrollTop()+this.$el.position().top)) < cardViewCenter) newZPos = i;
						}
					}
				}

				if (newZPos === null) newZPos = orderedArray.length;

				if (newZPos != selectedElement.model.zPos) {
					var arrayPart1 = orderedArray.slice(0,newZPos),
						arrayPart2 = orderedArray.slice(newZPos);

					for (var i=0, arrayPartLength=arrayPart1.length; i<arrayPartLength; i+=1) {
						if (arrayPart1[i].getId() == selectedElement.getId()) {
							arrayPart1.splice(i,1);
							break;
						}
					}

					for (var i=0, arrayPartLength=arrayPart2.length; i<arrayPartLength; i+=1) {
						if (arrayPart2[i].getId() == selectedElement.getId()) {
							arrayPart2.splice(i,1);
							break;
						}
					}

					orderedArray = arrayPart1.concat(selectedElement);
					orderedArray = orderedArray.concat(arrayPart2);

					var cardOrder = [];

					for (var i=0, orderedArrayLength=orderedArray.length; i<orderedArrayLength; i+=1) {
						var elementFound = false;

						for (var j=0, cardsLength=this.model.cards.length; j<cardsLength; j+=1) {
	   						if (this.model.cards[j].id == orderedArray[i].getId()) {
								elementFound = true;

								this.model.cards[j].zPos = i+1;

	   							cardOrder.push(this.model.cards[j].id);
	   						}
			        	}

	   					if (!elementFound) {
							for (var j=0, clustersLength=this.model.clusters.length; j<clustersLength; j+=1) {
	       						if ((orderedArray[i]) && (this.model.clusters[j].id == orderedArray[i].getId())) {
	   								this.model.clusters[j].zPos = i+1;

	   								cardOrder.push(this.model.clusters[j].id);
	       						}
				        	}
				        }
					}

					orderedArray = null;

					Cluster_Services.Sort(this.model.boardId, this.model.id, cardOrder, function(response) {
						that._workspace.sendSocket(JSON.stringify({ 
							action:"sortCluster", 
							board: that.model.boardId, 
							sortOrder: cardOrder 
						}));
					});
				}

				this.render();
			}
		},

		saveSortPosition: function() {
			var that=this,
				orderedArray = new Array(),
				tmpArray = new Array(),
				cardOrder = [];

			for (var i=0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
				tmpArray[this._childViews[i].model.zPos-1] = this._childViews[i];
        	}

        	tmpArray.forEach(function(entry) {
        		orderedArray.push(entry);
        	});

        	tmpArray = null;

			for (var i=0, orderedArrayLength=orderedArray.length; i<orderedArrayLength; i+=1) {
				var elementFound = false;

				for (var j=0, cardsLength=this.model.cards.length; j<cardsLength; j+=1) {
					if (this.model.cards[j].id == orderedArray[i].getId()) {
						elementFound = true;

						this.model.cards[j].zPos = i+1;

						cardOrder.push(this.model.cards[j].id);
					}
	        	}
			}

			Cluster_Services.Sort(this.model.boardId, this.model.id, cardOrder, function(response) {
				that._workspace.sendSocket(JSON.stringify({ 
					action:"sortCluster", 
					board: that.model.boardId, 
					sortOrder: cardOrder 
				}));
			});

	    	this.render();
		},

		updateSortPosition: function(cards) {
			var that = this;

			for (var i=0, cardsLength=cards.length; i<cardsLength; i+=1) {
				var elementFound = false;

				for (var j=0, existingCardsLength=this.model.cards.length; j<existingCardsLength; j+=1) {
					if (this.model.cards[j].id == cards[i].id) {
						elementFound = true;

						this.model.cards[j].zPos = (i+1);
					}
	        	}

				if (!elementFound) {
					for (var j=0, clustersLength=this.model.clusters.length; j<clustersLength; j+=1) {
   						if (this.model.clusters[j].id == cards[i].id) this.model.clusters[j].zPos = i+1;
		        	}
		        }
			}

			this.render();
		},

		// ---------- Actions for collapse and expand clusters

		saveAndCollapseCluster: function() {
			var that = this;

			Cluster_Services.Collapse(this.model.boardId, this.model.id, function(response) {
				that._workspace.sendSocket(JSON.stringify({ 
					action:"collapseCluster", 
					board: that.model.boardId, 
					cluster: { 
						id:  that.model.id
					}
				}));
			});

			this.collapseCluster();
		},

		collapseCluster: function(clusterId) {
			if (clusterId) {
				if (this.model.id == clusterId) {
					this.model.collapsed = true;

					this.render();
				}

				for (var i=0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
					if (this._childViews[i].getType() == "cluster") this._childViews[i].collapseCluster(clusterId);
				}
			}
			else {
				this.model.collapsed = true;

				this.render();
			}
		},

		saveAndExpandCluster: function() {
			var that = this;

			Cluster_Services.Expand(this.model.boardId, this.model.id, function(response) {
				that._workspace.sendSocket(JSON.stringify({ 
					action:"expandCluster", 
					board: that.model.boardId, 
					cluster: { 
						id:  that.model.id
					}
				}));
			});

			this.expandCluster();
		},

		expandCluster: function(clusterId) {
			if (clusterId) {
				if (this.model.id == clusterId) {
					this.model.collapsed = false;

					this.render();
				}

				for (var i=0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
					if (this._childViews[i].getType() == "cluster") this._childViews[i].expandCluster(clusterId);
				}
			}
			else {
				this.model.collapsed = false;

				this.render();
			}
		},

		// ---------- Actions for editing cluster

		editCluster: function(e) {
			e.stopPropagation();

			var that = this;

			this.$("#cluster-title_" + this.model.id).hide();
			this.$("#cluster-editable-title_" + this.model.id).show();

    		this._editing = true;
			this._workspace.setEditing();

    		this.hideHoverIcons();
		},

		updateCluster: function() {
			var that = this,
				clusterValid = true;

			if (this.$("#editable-title_" + this.model.id).val().trim().length == 0) clusterValid = false;

			if (clusterValid) {
				// Update styles
				if (this.model.type.trim().toLowerCase() == "text") this.model.content = this.$("#editable-title_" + this.model.id).val();
				else this.model.title = this.$("#editable-title_" + this.model.id).val();

				this.$("#cluster-title_" + this.model.id).html(this.$("#editable-title_" + this.model.id).val());
				
				this.$("#cluster-title_" + this.model.id).show();
				this.$("#cluster-editable-title_" + this.model.id).hide();

				// Save updates
				var clusterModel = null;

				if (this.model.type == "text") {
		  			clusterModel = {
						id: this.model.id, 
						boardId: this.model.boardId,
		  				action: "update",
						content: this.model.content
					};
				}
				else {
		  			clusterModel = {
						id: this.model.id, 
						boardId: this.model.boardId,
		  				action: "update",
						title: this.model.title
					};	
				}

				Cluster_Services.Insert(this.model.boardId, this.model.id, clusterModel, function(response) {
					that._workspace.sendSocket(JSON.stringify({ 
						action:"boardClusterUpdated", 
						board: that.model.boardId, 
						cluster: clusterModel 
					}));
				});

    			this._editing = false;
				this._workspace.disableEditing();
			}
		},

		updateClusterTitle: function(clusterId, title, content) {
			if (this.model.id == clusterId) {
				if (title) {
					this.model.title = title;

					this.$("#cluster-title_" + this.model.id).html(title);
					this.$("#editable-title_" + this.model.id).val(title);
				}
				else if (content) {
					this.model.content = content;

					this.$("#cluster-title_" + this.model.id).html(content);
					this.$("#editable-title_" + this.model.id).val(content);
				}
			}

			for (var i=0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
				if (this._childViews[i].getType() == "cluster") this._childViews[i].updateClusterTitle(clusterId, title, content);
			}
		},

		// ---------- Actions for deleting cards

		deleteCard: function(cardId) {
			var that = this,
				clusterUpdated = false;

			for (var i=0, cardsLength=this.model.cards.length; i<cardsLength; i+=1) {
				if ((this.model.cards[i] != null) && (this.model.cards[i].id == cardId)) {
					that.model.this.model.cards.splice(i,1);
					clusterUpdated = true;
				}
			}

			if (clusterUpdated) {
				if (that.model.cards.length > 0) this.render();
				else this._parent.makeClusterCard(this.model.id);
			}

			for (var i=0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
				if (this._childViews[i].getType() == "cluster") this._childViews[i].deleteCard(cardId);
			}
		},

		removeCard: function(cardId) {
			var that = this,
				cardModel = null,
				clusterUpdated = false;

			for (var i=0, cardsLength=this.model.cards.length; i<cardsLength; i+=1) {
				if ((this.model.cards[i] != null) && (this.model.cards[i].id == cardId)) {
					cardModel = this.model.cards[i];

					this.model.cards.splice(i,1);

					Cluster_Services.DetachCard(that.model.boardId, that.model.id, cardId, function(response) {
		            	if (response.status == "success") {
							that._workspace.sendSocket(JSON.stringify({ 
								action:"removeCardFromCluster", 
								board: that.model.boardId, 
								updateDetail: {
									clusterId: that.model.id,
									cardId: cardId
								}
							}));
						}
					});

					clusterUpdated = true;

					break;
				}
			}
					
			if (clusterUpdated) {
				if (this.model.cards.length === 0) {
					if (this._parent) this._parent.render();
					else this._workspace.setClusterToCard(this.model.id);
				}
				else this.render();

				return cardModel;
			}
			else {
				for (var i=0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
					if (this._childViews[i].getType() == "cluster") {
						cardModel = this._childViews[i].removeCard(cardId);

						if (cardModel) return cardModel;
					}
				}
			}
		},

		makeClusterCard: function(clusterId) {
			var clusterUpdated = false,
				clusters = this.model.clusters;

			for (var i=0, clustersLength=clusters.length; i<clustersLength; i+=1) {
				if ((clusters[i] != null) && (clusters[i].id == clusterId)) {
					that.model.clusters.splice(i,1);

					clusterUpdated = true;
				}
			}

			if (clusterUpdated) this.render();
		},

		removeCluster: function(clusterId) {
			var that = this,
				clusters = this.model.clusters;

			for (var i=0, clustersLength=clusters.length; i<clustersLength; i+=1) {
				if ((clusters[i] != null) && (clusters[i].id == clusterId)) that.model.clusters.splice(i,1);
			}

			for (var i=0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
				if ((this._childViews[i].getType() == "cluster") && (this._childViews[i].getId() == clusterId)) {
					var clusterXpos = this._childViews[i].getXPos(),
						clusterYpos = this._childViews[i].getYPos(),
						cardCount = 0;

					for (var j=0, clusterViewCardsLength=this._childViews[i]._childViews.length; j<clusterViewCardsLength; j+=1) {
						if (this._childViews[i]._childViews.getType() == "card") {
							var cardModel = Card.GenerateModel(this._childViews[i]._childViews[j].model, this._childViews[i].getId());
								cardModel.xPos = clusterXpos + (cardCount*10);
								cardModel.yPos = clusterYpos + (cardCount*10);

							that.model.cards.push(cardModel);

							var cardView = new Card.Item({ model: cardModel, board: this._workspace, parent: this });
							cardView.storeIdeaPosition((clusterXpos + (i*10)), (clusterYpos + (i*10)));
							cardView.render();

			    			this.$("#cards-container_" + this.model.id).append(cardView.el);

		    				this._childViews.push(cardView);
						}
						else if (this._childViews[i]._childViews.getType() == "cluster") {
							var clusterModel = Cluster.GenerateModel(this._childViews[i]._childViews[j].model);
							clusterModel.parentId = this.model.id;
							clusterModel.collapsed = true;

							that.model.clusters.push(clusterModel);

							var clusterView = new Cluster.Item({ model: clusterModel, board: this._workspace, parent: this });
							clusterView.updateClusterPosition((clusterXpos + (cardCount*10)), (clusterYpos + (cardCount*10)));
							clusterView.render();

		    				this._childViews.push(clusterView);
						}

		    			cardCount++;
					}

					this._childViews[i].remove();
      				this._childViews.splice(i, 1);
				
					this._parent.checkIfClusterIsEmpty(this.model.id);
				}
			}
		},

		// ---------- Actions for managing attached cards

		addCardToCluster: function(clusterId, cardModel) {
			if (this.model.id == clusterId) {
				if (this.model.isVoting) {
					var existingVotes = 0,
						voteCountMatches = [];

	  				if (cardModel.type == "text") {
	  					voteCountMatches = cardModel.content.match(/ \(\+(.*?)\)/g);

	  					if ((voteCountMatches == null) || (voteCountMatches.length == 0)) voteCountMatches = cardModel.content.match(/\(\+(.*?)\)/g);
	  				}
	  				else {
	  					voteCountMatches = cardModel.title.match(/ \(\+(.*?)\)/g);

	  					if ((voteCountMatches == null) || (voteCountMatches.length == 0)) voteCountMatches = cardModel.title.match(/\(\+(.*?)\)/g);
	  				}

					if ((voteCountMatches != null) && (voteCountMatches.length > 0)) {
						existingVotes = voteCountMatches[0].trim().replace("(+","").replace(")","");

	  					if (cardModel.type == "text") cardModel.content = cardModel.content.replace(voteCountMatches[0],"");
	  					else cardModel.title = cardModel.title.replace(voteCountMatches[0],"");
					}

	      			cardModel.votesReceived = parseInt(existingVotes);
      			}

      			cardModel.parentId = this.model.id;
				cardModel.parentIsVoting = this.model.isVoting;
				cardModel.zPos = (this._childViews.length + 1);

				this.model.cards.push(cardModel);

				var cardView = new Card.Item({ model: cardModel, board: this._workspace, parent: this });
				cardView.render();

		    	this.$("#cards-container_" + this.model.id).first().append(cardView.el);

				this._childViews.push(cardView);
			}

			for (var i=0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
	  			if (this._childViews[i].getType() == "cluster") this._childViews[i].addCardToCluster(clusterId, cardModel);
			}
		},

		detachAndReturnCard: function(cardId) {
			var that = this;

			if (this._childViews.length > 0) {
				for (var i=0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
					if ((this._childViews[i].getType() == "card") && (this._childViews[i].getId() == cardId)) {
						for (var j=0, cardsLength=this.model.cards.length; j<cardsLength; j+=1) {
							if ((this.model.cards[j]) && (this.model.cards[j].id == cardId)) that.model.cards.splice(j,1);
						}

						var returnCard = this._childViews[i];

						if (this.model.cards.length === 0) {
							if (this._parent) this._parent.render();
							else this._workspace.setClusterToCard(returnCard.getId());
						}
						else this.render();

						return returnCard;
					}
				}
			}

			for (var i=0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
				if (this._childViews[i].getType() == "cluster") {
					var searchedCard = this._childViews[i].detachAndReturnCard(cardId);

					if (searchedCard) return searchedCard;
				}
			}

			return null;
		},

		updateCardContent: function(cardId,content,title,color) {
			for (var i=0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
				this._childViews[i].updateCardContent(cardId,content,title,color);
			}
		},

		// ---------- Actions for managing attached clusters

		attachCluster: function(newModel) {
			if (this.model.id == newmodel.parentId) {
				if (this.model.isVoting) {
					var existingVotes = 0,
						voteCountMatches = [];

	  				if (newModel.type == "text") {
	  					voteCountMatches = newModel.content.match(/ \(\+(.*?)\)/g);

	  					if ((voteCountMatches == null) || (voteCountMatches.length == 0)) voteCountMatches = newModel.content.match(/\(\+(.*?)\)/g);
	  				}
	  				else {
	  					voteCountMatches = newModel.title.match(/ \(\+(.*?)\)/g);

	  					if ((voteCountMatches == null) || (voteCountMatches.length == 0)) voteCountMatches = newModel.title.match(/\(\+(.*?)\)/g);
	  				}

					if ((voteCountMatches != null) && (voteCountMatches.length > 0)) {
						existingVotes = voteCountMatches[0].trim().replace("(+","").replace(")","");

	  					if (newModel.type.trim().toLowerCase() == "text") newModel.content = newModel.content.replace(voteCountMatches[0],"");
	  					else newModel.title = newModel.title.replace(voteCountMatches[0],"");
					}

	      			newModel.votesReceived = parseInt(existingVotes);
      			}

				newModel.parentIsVoting = this.model.isVoting;
				newModel.zPos = (this._childViews.length + 1);

				this.model.clusters.push(newModel);

				var clusterView = new Cluster.Item({ model: newModel, board: this._workspace, parent: this });
				clusterView.render();

    			this.$("#cards-container_" + this.model.id).first().append(clusterView.el);
    			this._childViews.push(clusterView);
			}
			else {
				for (var i=0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
					if (this._childViews[i].getType() == "cluster") this._childViews[i].attachCluster(newModel);
				}
			}
		},

		detachAndReturnCluster: function(clusterId) {
			var that = this;

			if ((this._childViews) && (this._childViews.length > 0)) {
				for (var i=0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
					if (this._childViews[i].getType() == "cluster") {
						if (this._childViews[i].getId() == clusterId) {
							for (var j=0, clustersLength=this.model.clusters.length; j<clustersLength; j+=1) {
								if ((this.model.clusters[j]) && (this.model.clusters[j].id == clusterId)) that.model.clusters.splice(j,1);
							}

							var returnCluster = this._childViews[i];

							this._childViews[i].remove();
							this._childViews.splice(i,1);

							this._parent.checkIfClusterIsEmpty(this.model.id);
							
							return returnCluster;
						}
						else {
							var detachedCluster = this._childViews[i].detachAndReturnCluster(clusterId);
							if (detachedCluster) return detachedCluster;
						}
					}
				}
			}

			return null;
		},

		checkIfClusterIsEmpty: function(clusterId) {
			var that = this;

			for (var i=0, clusterViewsLength=this._childViews.length; i<clusterViewsLength; i+=1) {
				if ((this._childViews[i].getType() == "cluster") && (this._childViews[i].getId() == clusterId)) {
					// Check if this cluster still hard cards and if not turn it back into a card
					if (this._childViews[i]._childViews.length == 0) {
						for (var j=0, clustersLength=this.model.clusters.length; j<clustersLength; j+=1) {
							if ((this.model.clusters[j]) && (this.model.clusters[j].id == clusterId))  that.model.clusters.splice(j,1);
						}

						this.model.isVoting = false;

						this.model.cards.push(Card.GenerateModel(this._childViews[i].model,this.model.id));
						
						this.render();
					}
				}
			}
		},

		// ---------- Actions for Dot Voting

		startDotVoting: function(e) {
			e.stopPropagation();

			var that = this;

			Cluster.StartDotVoting(this.model.boardId, this.model.id, function(response) {
				that._workspace._socket.send(JSON.stringify({ 
					action:"startDotVoting",
					board: this.model.boardId,
					cluster: { 
						id: this.model.id
					} 
				}));
			});

			this.displayStartDotVoting();
		},

		displayStartDotVoting: function() {
        	this.model.isVoting = true;

			for (var i=0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
				var existingVotes = 0,
					voteCountMatches = [];

  				if (this._childViews[i].model.type == "text") {
  					voteCountMatches = this._childViews[i].model.content.match(/ \(\+(.*?)\)/g);

  					if ((voteCountMatches == null) || (voteCountMatches.length == 0)) voteCountMatches = this._childViews[i].model.content.match(/\(\+(.*?)\)/g);
  				}
  				else {
  					voteCountMatches = this._childViews[i].model.title.match(/ \(\+(.*?)\)/g);

  					if ((voteCountMatches == null) || (voteCountMatches.length == 0)) voteCountMatches = this._childViews[i].model.title.match(/\(\+(.*?)\)/g);
  				}

				if ((voteCountMatches != null) && (voteCountMatches.length > 0)) {
					existingVotes = voteCountMatches[0].trim().replace("(+","").replace(")","");

  					if (this._childViews[i].model.type.trim().toLowerCase() == "text") this._childViews[i].model.content = this._childViews[i].model.content.replace(voteCountMatches[0],"");
  					else this._childViews[i].model.title = this._childViews[i].model.title.replace(voteCountMatches[0],"");
				}

      			this._childViews[i].model.parentIsVoting = true;
      			this._childViews[i].model.votesReceived = parseInt(existingVotes);
      		}

        	this.render();
		},

		stopDotVoting: function(e) {
			e.stopPropagation();

			var that = this;

			Cluster.StopDotVoting(this.model.boardId, this.model.id, function(response) {
				that._workspace._socket.send(JSON.stringify({ 
					action:"stopDotVoting",
					board: this.model.boardId,
					cluster: { 
						id: this.model.id
					}
				}));
			});

			this.displayStopDotVoting();
		},

		displayStopDotVoting: function() {
        	this.model.isVoting = false;

			for (var i=0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
      			if (this._childViews[i].model.votesReceived > 0) {
      				if (this._childViews[i].model.type == "text") this._childViews[i].model.content = this._childViews[i].model.content + " (+" + this._childViews[i].model.votesReceived + ")";
      				else this._childViews[i].model.title = this._childViews[i].model.title + " (+" + this._childViews[i].model.votesReceived + ")";
      			}

      			this._childViews[i].model.parentIsVoting = false;
      			this._childViews[i].model.votesReceived = 0;
      		}

        	this.render();
		},

		addVote: function(e) {
			e.stopPropagation();

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
			var updateIconToSelected = false;
			if (this.model.votesReceived === 0) updateIconToSelected = true;

			this.model.votesReceived = this.model.votesReceived+1;

			this.$("#vote-count").html(this.model.votesReceived);

			if (updateIconToSelected) this.$("#add-vote").attr("src","/img/voteSelected.png");
		},

		updateChildVotes: function(cardId) {
			for (var i=0, childViewsLength=this._childViews.length; i<childViewsLength; i+=1) {
      			if (this._childViews[i].getId() == cardId) this._childViews[i].increaseVoteCount();
      		}
		},

		// ---------- Actions for setting z-index

		setZIndex: function(zIndex) {
    		this.model.zPos = zIndex;
			
			this.$el.zIndex(zIndex);
		}
  	});

	return Cluster;
});