define([
	"modules/card",
	"raphael"
],

function(Card) {
	var Cluster = {};

	Cluster.GenerateModel = function(model, parentId) {
		var clusterModel = {
			id: model.id, 
			type: model.type, 
			collapsed: model.collapsed, 
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

		if (model.votesReceived > 0) {
			if (model.type.trim().toLowerCase() == "text") clusterModel.content = model.content + " (+" + model.votesReceived + ")";
			else clusterModel.title = model.title + " (+" + model.votesReceived + ")";
		}

		if (model.cards) clusterModel.cards = model.cards;
		else clusterModel.cards = [];

		return clusterModel;
	}

	Cluster.Item = function(workspace, parent, paper, model) {
		var that = this;

		this._workspace = workspace;
		this._paper = paper;
		that._parent = parent;

		this._model = model;

		this._shapeAttributes = {
			padding: 10,
			fontSize: 14, 
			fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif"
		},

		this._entities = [];

		this._isDragging = false;

		this._model.cards.sort(function (a, b) { return a.zPos > b.zPos ? 1 : a.zPos < b.zPos ? -1 : 0; });

		// {{ Getters }}

		this.getId = function() {
			return that._model.id;
		};

		this.getModel = function() {
			return that._model;
		};

		this.getChildModel = function(modelId) {
			if (this._model.id == modelId) return that._model;
			else {
				for (var i=0, entitiesLength=that._entities.length; i<entitiesLength; i+=1) {
					if (that._entities[i].getType() == "cluster") {
						childModel = that._entities[i].getChildModel(modelId);

						if (childModel) return getChildModel;
					}
				}
			}

			return null;
		};

		this.getType = function() {
			return "cluster";
		};

		this.getParentId = function() {
			return this._model.parentId;
		};

		this.getIsDragging = function() {
			return that._isDragging;
		};

		this.getChildSVGShape = function(id) {
			for (var i=0, entitiesLength=that._entities.length; i<entitiesLength; i+=1) {
				if (that._entities[i].getId() == id) return { x: that._entities[i].getSVGShapeX(), y: that._entities[i].getSVGShapeY() };
				
				if (that._entities[i].getType() == "cluster") {
					var childShape = that._entities[i].getChildSVGShape(id);
					if (childShape) return childShape;
				}
			}

			return null;
		};

		this.getSVGShapeX = function() {
			return that._svgShape.attr("x");
		};

		this.getSVGShapeY = function() {
			return that._svgShape.attr("y");
		};

		this.getWidth = function() {
			return that._svgShape.attr("width");
		};

		this.getHeight = function() {
			return that._svgShape.attr("height");
		};

		this.getCollapsed = function() {
			return that._model.collapsed;
		};

		this.getIsValidCluster = function() {
			if (that._model.cards.length > 0) return true;
			else return false
		};

		this.getEntity = function(id) {
			for (var i=0, cardsLength=that._model.cards.length; i<cardsLength; i+=1) {
				if (that._model.cards[i].id == id) {
					var card = that._model.cards[i];

					that._model.cards.splice(i,1);

					return { parentId: that._model.id, card: card};
				}
			}

			// Check if this the selected entity is the child of this cluster
			for (var i=0, entitiesLength=that._entities.length; i<entitiesLength; i+=1) {
				if (that._entities[i].getType() == "cluster") {
					var entity = that._entities[i].getEntity(id);

					if (entity) return entity;
				}
			}

			return null;
		};

		this.getIsChildEntity = function(id) {
			for (var i=0, entitiesLength=that._entities.length; i<entitiesLength; i+=1) {
				if (that._entities[i].getId() == id) return true;
				else if ((that._entities[i].getType() == "cluster") && (that._entities[i].getIsChildEntity(id))) return true;
			}

			return false;
		};

		// {{ Setters }}

		this.setParentId = function(parentId) {
			this._model.parentId = parentId;
		};

		this.setX = function (xPos) {
			that._model.xPos = xPos;
		};

		this.setY = function (yPos) {
			that._model.yPos = yPos;
		};

		// {{ Public Methods}}

		// ---- Check if a specified X/Y position touches the current shape
		this.isHitting = function(x, y) {
			if ((that._svgShape) && (!that._model.collapsed)) {
				var bounds = {
					startX: that._svgShape.attr("x"),
					endX: that._svgShape.attr("x")+that._svgShape.attr("width"),
					startY: that._svgShape.attr("y"),
					endY: that._svgShape.attr("y")+that._svgShape.attr("height"),
				}

				if ((x > bounds.startX) && (x < bounds.endX) && (y > bounds.startY) && (y < bounds.endY)) return true;
				else return false;
			}
			else return false;
		};

		this.bringToFront = function() {
			that._paper.set(that._svgDropShadowGlow, that._svgDropShadowCover, that._svgShape, that._svgText).toFront();

			if (that._svgCardCount) that._paper.set(that._svgCardCount).toFront();

			for (var i=0, entitiesLength=that._entities.length; i<entitiesLength; i+=1) {
				that._entities[i].bringToFront();
			}
		};

		this.sendToBack = function() {
			that._paper.set(that._svgDropShadow, that._svgDropShadowCover, that._svgShape, that._svgText).toBack();
		};

		this.expandCollapse = function() {
			if (that._model.collapsed) {
				that._model.collapsed = false;
        		if (that._parent == null) that._workspace.trigger("updateClusterExpanded", that._model.id);
			}
			else {
				that._model.collapsed = true;
				if (that._parent == null) that._workspace.trigger("updateClusterCollapsed", that._model.id);
			}

			that.parentGenerateEntities();
		};

		this.addCard = function(x, y, cardModel) {
			for (var i=0, entitiesLength=that._entities.length; i<entitiesLength; i++) {
				if ((that._entities[i].getId() != cardModel.id) && (that._entities[i].getType() == "cluster") && (!that._entities[i].getCollapsed())) { 
					var svgShapeX = that._entities[i].getSVGShapeX(),
						svgShapeY = that._entities[i].getSVGShapeY();

					if ((that._entities[i].getId() != cardModel.id) &&
						((x >= svgShapeX) && (x < (svgShapeX + that._entities[i].getWidth()))) && 
						((y >= svgShapeY) && (y <= (svgShapeY + that._entities[i].getHeight())))) {
						var cardId = that._entities[i].addCard(x, y, cardModel);
						
						if (cardId) return cardId;
					} 
				}
			}

			var insertPostion = that._model.cards.length;

			for (var i=(that._model.cards.length-1); i>=0; i-=1) {
				if (cardModel.yPos < that._model.cards[i].yPos) insertPostion = i;
			}

			that._model.cards.splice(insertPostion, 0, cardModel);

			return that._model.id;
		};

		this.addCluster = function(x, y, clusterModel) {
			for (var i=0, entitiesLength=that._entities.length; i<entitiesLength; i++) {
				if ((that._entities[i].getId() != clusterModel.id) && (that._entities[i].getType() == "cluster") && (!that._entities[i].getCollapsed())) { 
					var svgShapeX = that._entities[i].getSVGShapeX(),
						svgShapeY = that._entities[i].getSVGShapeY();

					if ((that._entities[i].getId() != clusterModel.id) &&
						((x >= svgShapeX) && (x < (svgShapeX + that._entities[i].getWidth()))) && 
						((y >= svgShapeY) && (y <= (svgShapeY + that._entities[i].getHeight())))) {
						var clusterId = that._entities[i].addCluster(x, y, clusterModel);
						
						if (clusterId) return clusterId;
					} 
				}
			}

			clusterModel.collapsed = true;

			var insertPostion = that._model.cards.length;

			for (var i=(that._model.cards.length-1); i>=0; i-=1) {
				if (clusterModel.yPos < that._model.cards[i].yPos) insertPostion = i;
			}

			that._model.cards.splice(insertPostion, 0, clusterModel);

			return that._model.id;
		};

		this.parentGenerateEntities = function() {
			if (that._parent == null) that.generateEntities();
			else that._parent.draw();
		}

		this.generateEntities = function() {
			if (that._svgCardCount) {
				that._svgCardCount.remove();
				that._svgCardCount = null;
			}

			for (var i=0, entitiesLength=that._entities.length; i<entitiesLength; i++) {
				that._entities[i].undraw();
				that._entities[i] = null;
			}

			that._entities = [];

			if (!that._model.collapsed) {
				for (var i=0, cardsLength=that._model.cards.length; i<cardsLength; i++) {
					if (that._model.cards[i]) {
						if ((that._model.cards[i].cards == null) || (that._model.cards[i].cards.length == 0)) that._entities.push(new Card.Item(that._workspace, that, that._paper, that._model.cards[i]));
						else that._entities.push(new Cluster.Item(that._workspace, that, that._paper, that._model.cards[i]));
					}
				}
			}

			that.draw();
		},

		// {{ Drawing methods }}

		this.draw = function() {
			if (!that._isDragging) {
				that.undraw();

				that._svgText = that._paper.text((that._model.xPos+that._shapeAttributes.padding), (that._model.yPos+that._shapeAttributes.padding));
				that._svgText.attr({ 
					"text-anchor": "start",
					"font-size": that._shapeAttributes.fontSize, 
					"font-family": that._shapeAttributes.fontFamily,
					"font-weight": "bold"
				});

				// there is no word wrapping in svg text so we need to manually wrap it
				var words = that._model.content.split(" "),
					maxWidth = 180,
					tempText = "";

				for (var i=0, wordsLength = words.length; i<wordsLength; i++) {
					that._svgText.attr("text", tempText + " " + words[i]);

					if (that._svgText.getBBox().width > maxWidth) tempText = tempText + "\n" + words[i];
					else tempText = tempText + " " + words[i];

					that._svgText.attr("text", tempText);
				}

				that._svgText.attr({
					y: ((that._model.yPos+that._shapeAttributes.padding)+(that._svgText.getBBox().height/2))
				})

				// figure out what size the cluster should be
				var width = that._svgText.getBBox().width+(that._shapeAttributes.padding*2);
				if (width < 180) width = 180;

				var height = that._svgText.getBBox().height+(that._shapeAttributes.padding*2);

				// We don't actually need this if as collapsed clusters have no entities. Just there for sanity.
				if (!that._model.collapsed) {
					// set the position in the cluster and draw it out
					for (var i=0, boardCardsLength=that._entities.length; i<boardCardsLength; i+=1) {
						that._entities[i].setX((that._model.xPos+that._shapeAttributes.padding));
						that._entities[i].setY(that._model.yPos+height);
						
						if (that._entities[i].getType() == "cluster") that._entities[i].generateEntities();
						else that._entities[i].draw();

						if ((that._entities[i].getWidth()+(that._shapeAttributes.padding*2)) > width) width = (that._entities[i].getWidth()+(that._shapeAttributes.padding*2));
						
						height += that._entities[i].getHeight() + that._shapeAttributes.padding;
					}
				}
				else {
					that._svgCardCount = that._paper.text((that._model.xPos+that._shapeAttributes.padding), (that._model.yPos+height), that._model.cards.length);

					height += that._svgCardCount.getBBox().height;
				}

				that._svgShape = that._paper.rect(that._model.xPos, that._model.yPos, width, height);
				that._svgShape.attr({ 
					fill: "#2B3534",
					opacity: "0.1"
				});

				// we need to block the inner glow as the cluser is transparent
				that._svgDropShadowCover = that._paper.rect(that._svgShape.attr("x"), that._svgShape.attr("y"), that._svgShape.attr("width"), that._svgShape.attr("height"));
				that._svgDropShadowCover.attr({ 
					fill: "#ffffff",
					stroke: "none"
				});	

				// this has the glow applied to it to give it a drop shadow
				that._svgDropShadow = that._paper.rect(that._svgShape.attr("x"), that._svgShape.attr("y"), that._svgShape.attr("width"), that._svgShape.attr("height"));
				that._svgDropShadow.attr({
					stroke: "none"
				});	

				// create the drop shadow
				if (that._svgDropShadowGlow) that._svgDropShadowGlow.remove();
				that._svgDropShadowGlow = that._svgDropShadow.glow({
					offsetx: 0.5,
					offsety: 0.5,
					opacity: 0.6, 
					color: "#bbbbbb", 
					width: 3
				});

				// bring this cluster to the front of whatever shape it's sitting on
				that.bringToFront();

				// bring all the cards to the front
				for (var i=0, entitiesLength=that._entities.length; i<entitiesLength; i+=1) {
					that._entities[i].bringToFront();
				}

				// adding shape listeners
				that._paper.set(that._svgShape, that._svgText).drag(that.move, that.start, that.up);
				that._paper.set(that._svgShape, that._svgText).mouseover(that.mouseOver);
				that._paper.set(that._svgShape, that._svgText).mouseout(that.mouseOut);
			}
		};

        this.drawDropShadow = function() {
			if (that._svgDropShadowGlow) that._svgDropShadowGlow.remove();

			that._svgDropShadowGlow = that._svgDropShadow.glow({
				offsetx: 0.5,
				offsety: 0.5,
				opacity: 0.6, 
				color: "#bbbbbb", 
				width: 3
			});
        };

		this.undraw = function() {
			// clear the current SVG shape  representing the board on the board map
			if (that._svgShape) {
				that._svgShape.remove();
				that._svgShape = null;
			}	

			// clear the current SVG shape for the board title
			if (that._svgText) {
				that._svgText.remove();
				that._svgText = null;
			}

			if (that._svgDropShadowCover) {
				that._svgDropShadowCover.remove();
				that._svgDropShadowCover = null;
			}

			// clear the current SVG shape for the board title
			if (that._svgDropShadow) {
				that._svgDropShadow.remove();
				that._svgDropShadow = null;
			}

			if (that._svgDropShadowGlow) {
				that._svgDropShadowGlow.remove();
				that._svgDropShadowGlow = null;
			}

			if (that._svgCardCount) {
				that._svgCardCount.remove();
				that._svgCardCount = null;
			}

			for (var i=0, boardCardsLength=that._entities.length; i<boardCardsLength; i+=1) {
				that._entities[i].undraw();
			}
		};

		// {{ Event handlers }}

		// ----- Handler for the start of a drag action for this board object
		this.start = function(x, y, e) {
			if (e) {
				e.preventDefault();
				e.stopPropagation();
			}

			that._svgText.startX = that._svgText.attr("x");
			that._svgText.startY = that._svgText.attr("y");

			that._svgShape.startX = that._svgShape.attr("x");
			that._svgShape.startY = that._svgShape.attr("y");

			that._svgDropShadowCover.startX = that._svgDropShadowCover.attr("x");
			that._svgDropShadowCover.startY = that._svgDropShadowCover.attr("y");

			that._svgDropShadow.startX = that._svgDropShadow.attr("x");
			that._svgDropShadow.startY = that._svgDropShadow.attr("y");

			if (that._svgCardCount) {
				that._svgCardCount.startX = that._svgCardCount.attr("x");
				that._svgCardCount.startY = that._svgCardCount.attr("y");
			}

			for (var i=0, boardCardsLength=that._entities.length; i<boardCardsLength; i+=1) {
				that._entities[i].start();
			}
		};

		// ----- Handler for moving a board around the board map
		this.move = function (dx, dy, x, y, e) {
			that._isDragging = true;

			that._svgText.attr({
				x: that._svgText.startX+dx,
				y: that._svgText.startY+dy
			});

			that._svgShape.attr({
				x: that._svgShape.startX+dx,
				y: that._svgShape.startY+dy
			});

			that._svgDropShadow.attr({
				x: that._svgDropShadow.startX+dx,
				y: that._svgDropShadow.startY+dy
			});

			that._svgDropShadowCover.attr({
				x: that._svgDropShadowCover.startX+dx,
				y: that._svgDropShadowCover.startY+dy
			});

			if (that._svgCardCount) {
				that._svgCardCount.attr({
					x: that._svgCardCount.startX+dx,
					y: that._svgCardCount.startY+dy
				});
			}

			for (var i=0, boardCardsLength=that._entities.length; i<boardCardsLength; i+=1) {
				that._entities[i].move(dx, dy, x, y, e);
			}

			that.drawDropShadow();

			that.bringToFront();
		};

		// ----- Handler for finishing the drag of a board around the board map
    	this.up = function (e, fromCluster) {

			that._svgText.startX = null;
			that._svgText.startY = null;

			that._svgShape.startX = null;
			that._svgShape.startY = null;

			that._svgDropShadowCover.startX = null;
			that._svgDropShadowCover.startY = null;

			that._svgDropShadow.startX = null;
			that._svgDropShadow.startY = null;

			that._model.xPos = that._svgShape.attr("x");
			that._model.yPos = that._svgShape.attr("y");

			if (that._svgCardCount) {
				that._svgCardCount.startX = null;
				that._svgCardCount.startY = null;
			}

			for (var i=0, boardCardsLength=that._entities.length; i<boardCardsLength; i+=1) {
				that._entities[i].up(e, true);
			}

			that.drawDropShadow();

			that.bringToFront();

			// this movement was a result of a parents position being updated
			if ((that._isDragging) && (!fromCluster)) that._workspace.trigger("cardPositionUpdated", that._model, e.layerX, e.layerY);

    		that._isDragging = false;

			// This is a greedy function so we have to manually build a double click event

			if (that._singleClick) {
	   			clearTimeout(that._clickTimer);
				that._singleClick = false;

				that.expandCollapse();
	   		}
	   		else {
				that._singleClick = true;

			    that._clickTimer = setTimeout(function() {
			        clearTimeout(that._clickTimer);
			        that._singleClick = false;
			    }, 250);
		    }
        };

        this.mouseOver = function() {
        	that._workspace.$("#board").css('cursor','pointer');
        };

        this.mouseOut = function() {
        	that._workspace.$("#board").css('cursor','default');
        };
	};

	return Cluster;
});