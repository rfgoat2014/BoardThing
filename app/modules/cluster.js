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

		if (model.clusters) clusterModel.clusters = model.clusters;
		else clusterModel.clusters = [];

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

		this._cards = [];

		this._isDragging = false;

		this.getId = function() {
			return that._model.id;
		};

		this.getType = function() {
			return "cluster";
		};

		this.getIsDragging = function() {
			return that._isDragging;
		};

		this.getSVGShapePosition = function() {
			return { 
				x: that._svgShape.attr("x"), 
				y: that._svgShape.attr("y")
			};
		};

		this.addCard = function(cardModel) {
			that._cards.push(new Card.Item(that._workspace, that, that._paper, cardModel));
		}

		// ---- Check if a specified X/Y position touches the current shape
		this.isHitting = function(x, y) {
			if (that._svgShape) {
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
					maxWidth = that._model.width-(that._shapeAttributes.padding*2),
					tempText = "";

				for (var i=0, wordsLength = words.length; i<wordsLength; i++) {
					that._svgText.attr("text", tempText + " " + words[i]);

					if (that._svgText.getBBox().width > maxWidth) tempText = tempText + "\n" + words[i];
					else tempText = tempText + " " + words[i];

					that._svgText.attr("text", tempText);
				}

				that._svgText.attr({
					y: ((that._model.yPos+that._shapeAttributes.padding)+(that._svgText.getBBox().height/2))
				});

				// figure out what size the cluster should be
				var width = that._svgText.getBBox().width+(that._shapeAttributes.padding*2);
				if (width < 180) width = 180;

				var height = that._svgText.getBBox().height+(that._shapeAttributes.padding*2);

				// set the card position in the cluster and draw it out
				for (var i=0, boardCardsLength=that._cards.length; i<boardCardsLength; i+=1) {
					that._cards[i].setX((that._model.xPos+that._shapeAttributes.padding));
					that._cards[i].setY(that._model.yPos+height);
					that._cards[i].draw();

					if ((that._cards[i].getWidth()+(that._shapeAttributes.padding*2)) > width) width = (that._cards[i].getWidth()+(that._shapeAttributes.padding*2));
					height += that._cards[i].getHeight() + that._shapeAttributes.padding;
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

				that._svgDropShadowCover.toBack();
				that._svgDropShadow.toBack();

				// create the drop shadow
				that._svgDropShadowGlow = that._svgDropShadow.glow({
					offsetx: 0.5,
					offsety: 0.5,
					opacity: 0.6, 
					color: "#bbbbbb", 
					width: 3
				});

				that._svgShape.toFront();
				that._svgText.toFront();

				// bring all the cards to the front
				for (var i=0, boardCardsLength=that._cards.length; i<boardCardsLength; i+=1) {
					that._cards[i].bringToFront();
				}

				// adding shape listeners
				that._paper.set(that._svgShape, that._svgText).drag(that.move, that.start, that.up);
				that._paper.set(that._svgShape, that._svgText).mouseover(that.mouseOver);
				that._paper.set(that._svgShape, that._svgText).mouseout(that.mouseOut);
			}
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
		};

		// ----- Handler for the start of a drag action for this board object
		this.start = function() {
			that._isDragging = true;

			that._svgText.startX = that._svgText.attr("x");
			that._svgText.startY = that._svgText.attr("y");

			that._svgShape.startX = that._svgShape.attr("x");
			that._svgShape.startY = that._svgShape.attr("y");

			that._svgDropShadowCover.startX = that._svgDropShadowCover.attr("x");
			that._svgDropShadowCover.startY = that._svgDropShadowCover.attr("y");

			that._svgDropShadow.startX = that._svgDropShadow.attr("x");
			that._svgDropShadow.startY = that._svgDropShadow.attr("y");

			that._svgDropShadow.toFront();
			that._svgDropShadowCover.toFront();
			that._svgShape.toFront();
			that._svgText.toFront();

			for (var i=0, boardCardsLength=that._cards.length; i<boardCardsLength; i+=1) {
				that._cards[i].start();
			}
		};

		// ----- Handler for moving a board around the board map
		this.move = function (dx, dy, x, y, e) {
			that._svgText.attr({
				x: that._svgText.startX+dx,
				y: that._svgText.startY+dy
			});

			that._svgShape.attr({
				x: that._svgShape.startX+dx,
				y: that._svgShape.startY+dy
			});

			that._svgDropShadowGlow.remove();

			that._svgDropShadow.attr({
				x: that._svgDropShadow.startX+dx,
				y: that._svgDropShadow.startY+dy
			});

			that._svgDropShadowCover.attr({
				x: that._svgDropShadowCover.startX+dx,
				y: that._svgDropShadowCover.startY+dy
			});

			that._svgDropShadowGlow = that._svgDropShadow.glow({
				offsetx: 0.5,
				offsety: 0.5,
				opacity: 0.6, 
				color: "#bbbbbb", 
				width: 3
			});

			for (var i=0, boardCardsLength=that._cards.length; i<boardCardsLength; i+=1) {
				that._cards[i].move(dx, dy, x, y, e);
			}
		};

		// ----- Handler for finishing the drag of a board around the board map
    	this.up = function (e, fromCluster) {
    		that._isDragging = false;

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

			for (var i=0, boardCardsLength=that._cards.length; i<boardCardsLength; i+=1) {
				that._cards[i].up(e, true);
			}

			// this movement was a result of a parents position being updated
        	if (!fromCluster) that._workspace.trigger("clusterPositionUpdated", that._model.id, e.layerX, e.layerY);
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