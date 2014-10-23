define([
	"modules/card",
	"raphael"
],

function(Card) {
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
	}

  	Cluster.Item = Backbone.View.extend({
    	tagName: "div",

    	_isMobile: null,
    	_workspace: null,
    	_parent: null,
    	
    	_editing: false,
    	_editable: true,
		_clusterClickCount: 0,

		initialize: function(options) {
			this.el.id = "cluster-content-container_" + this.model.id;

			this._isMobile = this.options.isMobile;
			this._workspace = this.options.workspace;
			this._parent = this._parent;
		},

		render: function() {
			var that = this;
			
			var template = null;

    		if (this.model.parentId != null) {
	    		if (this.model.collapsed) template = "/app/templates/cluster/clusteredCollapsed";
	    		else template = "/app/templates/cluster/clusteredItem";
    		}
    		else {
	    		if (model.collapsed) template = "/app/templates/cluster/collapsed";
	    		else template = "/app/templates/cluster/item";
    		}

			$.get(template, function(contents) {
				that.$el.html(_.template(contents, that.model));

				that.afterRender();				

				that.unbind();
				that.bind();
			}, "text");
		},

		afterRender: function() {
			var that = this;

			if (!this._isMobile) that.$("#editable-title_" + this.model.id).autosize();

			if ((!this.model.parentId) && this.model.xPos && this.model.yPos) this.$el.css({top: this.model.yPos, left: this.model.xPos, position: 'absolute'});
			
			if ((!this.model.parentId) && (this.model.zPos != null)) this.$el.zIndex(this.model.zPos);

			if ((that.model.color) && (that.model.color.trim().toLowerCase() != "#ffffff")) that.$el.css({ backgroundColor: "rgba(" + Utils.hexToRgb(that.model.color) + ",0.20);" });
			
      		this._cardViews = [];
      		this._clusterViews = [];

      		var allViews = [];

			var cards = this.model.cards;

			for (var i=0, cardsLength=cards.length; i<cardsLength; i+=1) {
        		cards[i].cluster = that;

				var cardView = new Card.Item({ model: cards[i], workspace: that._workspace, parent: that });
				cardView.render();

				allViews.push(cardView);

    			that._cardViews.push(cardView);
        	}

			var clusters = this.model.clusters;

			for (var i=0, clustersLength=cards.length; i<clustersLength; i+=1) {
        		clusters[i].cluster = that;

				var clusterView = new Cluster.Item({ model: clusters[i], workspace: that._workspace, parent: that });
				clusterView.render();

				allViews.push(clusterView);

    			that._clusterViews.push(clusterView);
        	}

			if (!this.model.collapsed) {
				allViews.sort(function (a, b) { return a.model.zPos > b.model.zPos ? 1 : a.model.zPos < b.model.zPos ? -1 : 0; });

				for (var i=0; i<allViews.length; i++) {
	    			that.$("#cards-container_" + this.model.id).append(allViews[i].el);
				}
			}

    		if (this.model.parentId != null) {
	    		if (this.model.collapsed) this.el.className = "box clustered-cluster-content-container-collapsed";
	    		else this.el.className = "box clustered-cluster-content-container";
    		}
    		else {
	    		if (model.collapsed) this.el.className = "box cluster-content-container-collapsed";
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
	        		if ((that._parent != undefined) && (that._parent._editable != undefined)) that._parent._editable = false;
	        		
	        		if (that._parent.hideHoverIcons) that._parent.hideHoverIcons();

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
							var currentPosition = that.$el.position().
								newXPos = that._workspace.$("#board-cards").scrollLeft()+currentPosition.left,
								newYPos = that._workspace.$("#board-cards").scrollTop()+currentPosition.top;

							that.model.xPos = newXPos;
							that.model.yPos = newYPos;

				        	that.updateClusterPosition(newXPos, newYPos);
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

		       				if (ui.draggable.context.id.trim().toLowerCase().indexOf("item-content-container") == 0) {
		       					var updateDetail = null;

		       					if (ui.draggable.find('#card-body').length > 0) {
									updateDetail = {
										clusterId: that.model.id,
										cardId: ui.draggable.find('#card-body').attr("element-id")
									};
								}
		       					else if (ui.draggable.find('#clustered-card-body').length > 0) {
									updateDetail = {
										clusterId: that.model.id,
										cardId: ui.draggable.find('#clustered-card-body').attr("element-id")
									};
		       					}

		       					if (updateDetail) {
		       						if ((!$(ui.draggable.context).attr("is-resized")) || ($(ui.draggable.context).attr("is-resized") == "false")) {
				       					for (var i=0; i<that._cardViews.length; i++) {
				       						if (that._cardViews[i].model.id.toString()== updateDetail.cardId.toString()) {
				       							isChild = true;
				       						}
				       					}

				       					if (!isChild) {	
											Cluster.AttachCard(that.model.boardId, updateDetail.clusterId, updateDetail.cardId, function(response) {
												that._workspace.sendSocket(JSON.stringify({ 
													action:"addCardToCluster", 
													board: that.model.boardId, 
													updateDetail: updateDetail
												}));
											});

											that._workspace.addCardToCluster(updateDetail);
										}
									}
								}
		       				}
		       				else if (ui.draggable.context.id.trim().toLowerCase().indexOf("cluster-content-container") == 0) {
		       					if (ui.draggable.find('#cluster-body').length > 0) {
									var updateDetail = {
										targetClusterId: that.model.id,
										sourceClusterId: ui.draggable.find('#cluster-body').attr("element-id")
									};
		       					}
		       					else if (ui.draggable.find('#cluster-body-collapsed').length > 0) {
									var updateDetail = {
										targetClusterId: that.model.id,
										sourceClusterId: ui.draggable.find('#cluster-body-collapsed').attr("element-id")
									};
		       					}
		       					else if (ui.draggable.find('#clustered-cluster-body').length > 0) {
									var updateDetail = {
										targetClusterId: that.model.id,
										sourceClusterId: ui.draggable.find('#clustered-cluster-body').attr("element-id")
									};
		       					}

		       					for (var i=0; i<that._clusterViews.length; i++) {
		       						if (that._clusterViews[i].model.id == updateDetail.sourceClusterId) {
		       							isChild = true;
		       						}
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
		       					var elementId = null;

			       				if (ui.draggable.context.id.trim().toLowerCase().indexOf("item-content-container") == 0) {
			       					if (ui.draggable.find('#card-body').length > 0) elementId = ui.draggable.find('#card-body').attr("element-id");
									else if (ui.draggable.find('#clustered-card-body').length > 0) elementId = ui.draggable.find('#clustered-card-body').attr("element-id");
			       				}
			       				else if (ui.draggable.context.id.trim().toLowerCase().indexOf("cluster-content-container") == 0) {
			       					if (ui.draggable.find('#cluster-body').length > 0) elementId = ui.draggable.find('#cluster-body').attr("element-id");
			       					else if (ui.draggable.find('#cluster-body-collapsed').length > 0) elementId = ui.draggable.find('#cluster-body-collapsed').attr("element-id");
			       					else if (ui.draggable.find('#clustered-cluster-body').length > 0)  elementId = ui.draggable.find('#clustered-cluster-body').attr("element-id");
			       				}

		       					if (elementId) {
			       					var selectedElement = null;

			       					for (var i=0; i<that._cardViews.length; i++) {
			       						if (that._cardViews[i].model.id == elementId) {
			       							selectedElement = that._cardViews[i];
			       							break;
			       						}

			       					}

			       					if (!selectedElement) {
				       					for (var i=0; i<that._clusterViews.length; i++) {
				       						if (that._clusterViews[i].model.id == elementId) {
				       							selectedElement = that._clusterViews[i];	
			       								break;
				       						}
				       					}
				       				}

				       				that.changeSortPosition(selectedElement);
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

			for (var i = 0, cardViewsLength=this._cardViews.length; i<cardViewsLength; i+=1) {
				this._cardViews[i].clearSettingsmenu();
			}

			for (var i = 0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
				this._clusterViews[i].clearSettingsmenu();
			}
		},

		// ---------- Actions for setting cluster position

		updateClusterPosition: function(left,top) {
			Cluster_Services.UpdatePosition(that.model.boardId, that.model.id, left, top);

			that._workspace.sendSocket(JSON.stringify({
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
				this.model.xPos = left);
				this.model.yPos = top);

				this.render();
			}	
		},

		// ---------- Actions to update sort position

		changeSortPosition: function(selectedElement) {
			var that = this;

			if (selectedElement) {
				var orderedArray = new Array(),
					tmpArray = new Array();

				for (var i = 0, cardViewsLength=this._cardViews.length; i<cardViewsLength; i+=1) {
					tmpArray[this._cardViews[i].model.zPos-1] = this._cardViews[i];
        		}

				for (var i = 0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
					tmpArray[this._clusterViews[i].model.zPos-1] = this._clusterViews[i];
        		}

	        	tmpArray.forEach(function(entry) {
	        		orderedArray.push(entry);
	        	});

        		tmpArray = null;

				for (var i = 0, cardViewsLength=this._cardViews.length; i<cardViewsLength; i+=1) {
					var cardOrdered = false;

					for (var j = 0, orderedArrayLength=orderedArray.length; j<orderedArrayLength; j+=1) {
						if (this._cardViews[i].model.id == orderedArray[j].model.id) {
							cardOrdered = true;
							break;
						}
					};

					if (!cardOrdered) orderedArray.push(this._cardViews[i]);
        		}

				for (var i = 0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
					var cardOrdered = false;

					for (var j = 0, orderedArrayLength=orderedArray.length; j<orderedArrayLength; j+=1) {
						if (this._clusterViews[i].model.id == orderedArray[j].model.id) {
							cardOrdered = true;
							break;
						}
					}

					if (!cardOrdered) orderedArray.push(this._cardViews[i]);
        		}

				var newZPos = null;

				for (var i=0, orderedArrayLength=orderedArray.length; i<orderedArrayLength; i++) {
					if (newZPos === null) {
						if ((orderedArray[i]) && (selectedElement) && (orderedArray[i].model.id != selectedElement.model.id)) {
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
						if (arrayPart1[i].model.id == selectedElement.model.id) {
							arrayPart1.splice(i,1);
							break;
						}
					}

					for (var i=0, arrayPartLength=arrayPart2.length; i<arrayPartLength; i+=1) {
						if (arrayPart2[i].model.id == selectedElement.model.id) {
							arrayPart2.splice(i,1);
							break;
						}
					}

					orderedArray = arrayPart1.concat(selectedElement);
					orderedArray = orderedArray.concat(arrayPart2);

					var cardOrder = [];

					for (var i=0, orderedArrayLength=orderedArray.length; i<orderedArrayLength; i+=1) {
						var elementFound = false;

						var cards = this.model.cards;

						for (var j=0, cardsLength=cards.length; j<cardsLength; j+=1) {
	   						if (cards[j].id == orderedArray[i].model.id) {
								elementFound = true;

								cards[j].zPos = i+1;

	   							cardOrder.push(cards[j].id);
	   						}
			        	}

	   					if (!elementFound) {
							var clusters = this.model.clusters;

							for (var j=0, clustersLength=clusters.length; j<clustersLength; j+=1) {
	       						if ((orderedArray[i]) && (clusters[j].id == orderedArray[i].model.id)) {
	   								clusters[j].zPos = i+1;

	   								cardOrder.push(clusters[j].id);
	       						}
				        	}
				        }
					}

					orderedArray = null;

					Cluster_Services.Sort(this.model.boardId, updateDetail.clusterId, cardOrder, function(response) {
						this._workspace.sendSocket(JSON.stringify({ 
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
				tmpArray = new Array();

			for (var i = 0, cardViewsLength=this._cardViews.length; i<cardViewsLength; i+=1) {
				tmpArray[this._cardViews[i].model.zPos-1] = this._cardViews[i];
        	}

			for (var i = 0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
				tmpArray[this._clusterViews[i].model.zPos-1] = this._clusterViews[i];
        	};

        	tmpArray.forEach(function(entry) {
        		orderedArray.push(entry);
        	});

        	tmpArray = null;

			var cardOrder = [];

			for (var i=0, orderedArrayLength=orderedArray.length; i<orderedArrayLength; i+=1) {
				var elementFound = false,
					cards = this.model.cards;

				for (var j=0, cardsLength=cards.length; j<cardsLength; j+=1) {
					if (cards[j].id == orderedArray[i].model.id) {
						elementFound = true;

						cards[j].zPos = i+1;

						cardOrder.push(cards[j].id);
					}
	        	}

				if (!elementFound) {
					var clusters = this.model.clusters;

					for (var j=0, clustersLength=clusters.length; j<clustersLength; j+=1) {
						if (clusters[j].id == orderedArray[i].model.id) {
							clusters[j].zPos = i+1;

							cardOrder.push(clusters[j].id);
						}
		        	}
		        }
			}

			Cluster_Services.Sort(this.model.boardId, updateDetail.clusterId, cardOrder, function(response) {
				this._workspace.sendSocket(JSON.stringify({ 
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
				var elementFound = false,
					existingCards = this.model.cards;

				for (var j=0, existingCardsLength=existingCards.length; j<existingCardsLength; j+=1) {
					if (existingCards[j].id == cards[i].id) {
						elementFound = true;

						existingCards[j].zPos = (i+1);
					}
	        	}

				if (!elementFound) {
					var clusters = this.model.clusters;

					for (var j=0, clustersLength=clusters.length; j<clustersLength; j+=1) {
   						if (clusters[j].id == cards[i].id) clusters[j].zPos = i+1;
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

				for (var i=0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
					this._clusterViews[i].collapseCluster(clusterId);
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

				for (var i=0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
					this._clusterViews[i].expandCluster(clusterId);
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
				else this.model.title = this.$("#editable-title_" + this.model.id).val());

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
						action:"topicClusterUpdated", 
						topic: that.model.boardId, 
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

			for (var i=0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
				this._clusterViews[i].updateClusterTitle(clusterId, title, content);
			}
		},

		// ---------- Actions for deleting cards

		deleteCard: function(cardId) {
			var that = this,
				clusterUpdated = false.
				cards = this.model.cards;

			for (var i=0, cardsLength=cards.length; i<cardsLength; i+=1) {
				if ((cards[i] != null) && (cards[i].id == cardId)) {
					that.model.cards.splice(i,1);
					clusterUpdated = true;
				}
			}

			if (clusterUpdated) {
				if (that.model.cards.length > 0) this.render();
				else this._parent.makeClusterCard(this.model.id);
			}

			for (var i=0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
				this._clusterViews[i].deleteCard(cardId);
			}
		},

		removeCard: function(card) {
			var that = this,
				clusterUpdated = false,
				cards = this.model.cards;

			for (var i=0, cardsLength=cards.length; i<cardsLength; i+=1) {
				if ((cards[i] != null) && (cards[i].id == card.id)) {
					that.model.cards.splice(i,1);

					clusterUpdated = true;
				}
			}

			for (var i=0, cardViewsLength=this._cardViews.length; i<cardViewsLength; i+=1) {
				if (this._cardViews[i].model.id == card.id) {
					this._cardViews[i].remove();
	  				this._cardViews.splice(i, 1);

					clusterUpdated = true;
				}
			}
					
			if (clusterUpdated) this._parent.checkIfClusterIsEmpty(this.model.id);

			for (var i=0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
				this._clusterViews[i].removeCard(card);
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

			for (var i=0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
				if (this._clusterViews[i].model.id == clusterId) {
					var clusterXpos = this._clusterViews[i].model.xPos.
						clusterYpos = this._clusterViews[i].model.yPos,
						cardCount = 0;

					for (var j=0, clusterViewCardsLength=this._clusterViews[i]._cardViews.length; j<clusterViewCardsLength; j+=1) {
						var cardModel = Card.GenerateModel(this._clusterViews[i]._cardViews[j].model, this._clusterViews[i].model.id);
						cardModel.xPos = clusterXpos + (cardCount*10);
						cardModel.yPos = clusterYpos + (cardCount*10);

						that.model.cards.push(cardModel);

						var cardView = new Card.Item({ model: cardModel, board: this._workspace, parent: this });
						cardView.storeIdeaPosition((clusterXpos + (i*10)), (clusterYpos + (i*10)));
						cardView.render();

		    			this.$("#cards-container_" + this.model.id).append(cardView.el);

		    			this._cardViews.push(cardView);

		    			cardCount++;
					}

					for (var j=0, clusterViewClustersLength=this._clusterViews[i]._clusterViews.length; j<clusterViewClustersLength; j+=1) {
						var clusterModel = Cluster.GenerateModel(this._clusterViews[i]._clusterViews[j].model);
						clusterModel.parentId = this.model.id;
						clusterModel.collapsed = true;

						that.model.clusters.push(clusterModel);

						var clusterView = new Cluster.Item({ model: clusterModel, board: this._workspace, parent: this });
						clusterView.updateClusterPosition((clusterXpos + (cardCount*10)), (clusterYpos + (cardCount*10)));
						clusterView.render();

		    			this.$("#cards-container_" + this.model.id).append(clusterView.el);

		    			this._clusterViews.push(clusterView);

		    			cardCount++;
					}

					this._clusterViews[i].remove();
      				this._clusterViews.splice(i, 1);
				
					this._parent.checkIfClusterIsEmpty(this.model.id);
				}
			}
		},

		// ---------- Actions for managing attached cards

		addCardToCluster: function(clusterId, cardModel) {
			if (!this._cardViews) this._cardViews = [];

			if (!this._clusterViews) this._clusterViews = [];

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

				cardModel.parentIsVoting = this.model.isVoting;
				cardModel.zPos = (this._cardViews.length + this._clusterViews.length + 1);

				this.model.cards.push(cardModel);

				var cardView = new Card.Item({ model: cardModel, board: this._workspace, parent: this });
				cardView.render();

		    	this.$("#cards-container_" + this.model.id).first().append(cardView.el);

				this._cardViews.push(cardView);
			}

			for (var i=0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
	  			this._clusterViews[i].addCardToCluster(clusterId, cardModel);
			}
		},

		detachAndReturnCard: function(cardId) {
			var that = this;

			if (this._cardViews.length > 0) {
				for (var i=0, cardViewsLength=this._cardViews.length; i<cardViewsLength; i+=1) {
					if (this._cardViews[i].model.id == cardId) {
						var cards = this.model.cards;

						for (var j=0, cardsLength=cards.length; j<cardsLength; j+=1) {
							if ((cards[j]) && (cards[j].id == cardId)) that.model.cards.splice(j,1);
						}

						var returnCard = this._cardViews[i];

						this._cardViews[i].remove();
						this._cardViews.splice(i,1);

						this._parent.checkIfClusterIsEmpty(this.model.id);
						
						return returnCard;
					}
				}
			}

			for (var i=0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
				var searchedCard = this._clusterViews[i].detachAndReturnCard(cardId);

				if (searchedCard) return searchedCard;
			}

			return null;
		},

		updateCardContent: function(cardId,content,title,color) {
			for (var i=0, cardViewsLength=this._cardViews.length; i<cardViewsLength; i+=1) {
				this._cardViews[i].updateCardContent(cardId,content,title,color);
			}

			for (var i=0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
				this._clusterViews[i].updateCardContent(cardId,content,title,color);
			}
		},

		// ---------- Actions for managing attached clusters

		attachCluster: function(newModel) {
			if (this.model.id == newmodel.parentId) {
				if (!this._cardViews) this._cardViews = [];

				if (!this._clusterViews) this._clusterViews = [];

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
				newModel.zPos = (this._cardViews.length + this._clusterViews.length + 1);

				this.model.clusters.push(newModel);

				var clusterView = new Cluster.Item({ model: newModel, board: this._workspace, parent: this });
				clusterView.render();

    			this.$("#cards-container_" + this.model.id).first().append(clusterView.el);
    			this._clusterViews.push(clusterView);
			}
			else {
				for (var i=0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
					this._clusterViews[i].attachCluster(newModel);
				}
			}
		},

		detachAndReturnCluster: function(clusterId) {
			var that = this,
				allClusterViews = [];

			if ((this._clusterViews) && (this._clusterViews.length > 0)) {
				for (var i=0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
					if (this._clusterViews[i].model.id == clusterId) {
						var clusters = this.model.clusters;

						for (var j=0, clustersLength=clusters.length; j<clustersLength; j+=1) {
							if ((clusters[j]) && (clusters[j].id == clusterId)) that.model.clusters.splice(j,1);
						}

						var returnCluster = this._clusterViews[i];

						this._clusterViews[i].remove();
						this._clusterViews.splice(i,1);

						this._parent.checkIfClusterIsEmpty(this.model.id);
						
						return returnCluster;
					}
					else allClusterViews.push(this._clusterViews[i].detachAndReturnCluster(clusterId));
				}

				for (var i=0, allClusterViewsLength = allClusterViews.length; i<allClusterViewsLength; i++) {
					if (allClusterViews[i]) return allClusterViews[i];
				}

				return null;
			}
			else return null;
		},

		checkIfClusterIsEmpty: function(clusterId) {
			var that = this;

			for (var i=0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
				if (this._clusterViews[i].model.id == clusterId) {
					// Check if this cluster still hard cards and if not turn it back into a card
					if ((this._clusterViews[i]._cardViews.length == 0) && (this._clusterViews[i]._clusterViews.length == 0)) {
						var clusters = this.model.clusters;

						for (var j=0, clustersLength=clusters.length; j<clustersLength; j+=1) {
							if ((clusters[j]) && (clusters[j].id == clusterId))  that.model.clusters.splice(j,1);
						}

						this.model.isVoting = false;

						this.model.cards.push(Card.GenerateModel(this._clusterViews[i].model,this.model.id));
						
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
					topic: this.model.boardId,
					cluster: { 
						id: this.model.id
					} 
				}));
			});

			this.displayStartDotVoting();
		},

		displayStartDotVoting: function() {
        	this.model.isVoting = true;

			for (var i=0, cardViewsLength=this._cardViews.length; i<cardViewsLength; i+=1) {
				var existingVotes = 0,
					voteCountMatches = [];

  				if (this._cardViews[i].model.type == "text") {
  					voteCountMatches = this._cardViews[i].model.content.match(/ \(\+(.*?)\)/g);

  					if ((voteCountMatches == null) || (voteCountMatches.length == 0)) voteCountMatches = this._cardViews[i].model.content.match(/\(\+(.*?)\)/g);
  				}
  				else {
  					voteCountMatches = this._cardViews[i].model.title.match(/ \(\+(.*?)\)/g);

  					if ((voteCountMatches == null) || (voteCountMatches.length == 0)) voteCountMatches = this._cardViews[i].model.title.match(/\(\+(.*?)\)/g);
  				}

				if ((voteCountMatches != null) && (voteCountMatches.length > 0)) {
					existingVotes = voteCountMatches[0].trim().replace("(+","").replace(")","");

  					if (this._cardViews[i].model.type.trim().toLowerCase() == "text") this._cardViews[i].model.content = this._cardViews[i].model.content.replace(voteCountMatches[0],"");
  					else this._cardViews[i].model.title = this._cardViews[i].model.title.replace(voteCountMatches[0],"");
				}

      			this._cardViews[i].model.parentIsVoting = true;
      			this._cardViews[i].model.votesReceived = parseInt(existingVotes);
      		}

			for (var i=0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
				var existingVotes = 0,
					voteCountMatches = [];

  				if (this._clusterViews[i].model.type == "text") {
  					voteCountMatches = this._clusterViews[i].model.content.match(/ \(\+(.*?)\)/g);

  					if ((voteCountMatches == null) || (voteCountMatches.length == 0)) voteCountMatches = this._clusterViews[i].model.content.match(/\(\+(.*?)\)/g);
  				}
  				else {
  					voteCountMatches = this._clusterViews[i].model.title.match(/ \(\+(.*?)\)/g);

  					if ((voteCountMatches == null) || (voteCountMatches.length == 0)) voteCountMatches = this._clusterViews[i].model.title.match(/\(\+(.*?)\)/g);
  				}

				if ((voteCountMatches != null) && (voteCountMatches.length > 0)) {
					existingVotes = voteCountMatches[0].trim().replace("(+","").replace(")","");

  					if (this._clusterViews[i].model.type.trim().toLowerCase() == "text") this._clusterViews[i].model.content = this._clusterViews[i].model.content.replace(voteCountMatches[0],"");
  					else this._clusterViews[i].model.title = this._clusterViews[i].model.title.replace(voteCountMatches[0],"");
				}

      			this._clusterViews[i].model.parentIsVoting = true;
      			this._clusterViews[i].model.votesReceived = parseInt(existingVotes);
      		}

        	this.render();
		},

		stopDotVoting: function(e) {
			e.stopPropagation();

			var that = this;

			Cluster.StopDotVoting(this.model.boardId, this.model.id, function(response) {
				that._workspace._socket.send(JSON.stringify({ 
					action:"stopDotVoting",
					topic: this.model.boardId,
					cluster: { 
						id: this.model.id
					}
				}));
			});

			this.displayStopDotVoting();
		},

		displayStopDotVoting: function() {
        	this.model.isVoting = false;

			for (var i=0, cardViewsLength=this._cardViews.length; i<cardViewsLength; i+=1) {
      			if (this._cardViews[i].model.votesReceived > 0) {
      				if (this._cardViews[i].model.type == "text") this._cardViews[i].model.content = this._cardViews[i].model.content + " (+" + this._cardViews[i].model.votesReceived + ")";
      				else this._cardViews[i].model.title = this._cardViews[i].model.title + " (+" + this._cardViews[i].model.votesReceived + ")";
      			}

      			this._cardViews[i].model.parentIsVoting = false;
      			this._cardViews[i].model.votesReceived = 0;
      		}

			for (var i=0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
      			if (this._clusterViews[i].model.votesReceived > 0) {
      				if (this._clusterViews[i].model.type.trim().toLowerCase() == "text") this._clusterViews[i].model.content = this._clusterViews[i].model.content + " (+" + this._clusterViews[i].model.votesReceived + ")";
      				else this._clusterViews[i].model.title = this._clusterViews[i].model.title + " (+" + this._clusterViews[i].model.votesReceived + ")";
      			}

      			this._clusterViews[i].model.parentIsVoting = false;
      			this._clusterViews[i].model.votesReceived = 0;
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
			for (var i=0, cardViewsLength=this._cardViews.length; i<cardViewsLength; i+=1) {
      			if (this._cardViews[i].model.id == cardId) this._cardViews[i].increaseVoteCount();
      		}

			for (var i=0, clusterViewsLength=this._clusterViews.length; i<clusterViewsLength; i+=1) {
      			if (this._clusterViews[i].model.id == cardId)this._clusterViews[i].increaseVoteCount();
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