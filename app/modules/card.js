define([
	"modules/card.services",
	"modules/workspace.services",
	"raphael",
	"spectrum"
],

function(Card_Services, Workspace_Services) {
	var Card = {};

	Card.GenerateModel = function(model, parentId) {
		var cardModel = {
			id: model.id, 
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
	}

	Card.Add = Backbone.View.extend({
    	el: "<div>",

		initialize: function(options) {
    		this.el.id = "card-create-container";

    		this._isMobile = options.isMobile;
    		this._parent = options.parent;

			if (this._isMobile) this.el.className = "card-input-container mobile";
    		else this.el.className = "card-input-container desktop";
		},

		render: function() {
			var that = this;

			$.get("/app/templates/card/add.html", function(contents) {
				that.$el.html(_.template(contents));

				that.unbind();
				that.bind();
			}, "text");
		},

		unbind: function() {
	    	this.$("#card-color-select").spectrum("destroy");

			this.$el.unbind("click");
			this.$("#cancel-card").unbind("click");
			this.$("#post-card").unbind("click");
			this.$("#card-text").unbind("click");
			this.$("#add-image-btn").unbind("click");
		},

		bind: function() {
			var that = this;

	    	this.$("#card-color-select").spectrum({
			    color: this._parent.getSelectedColor(),
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
			
  			$(this.el).click(function(e) {
				e.stopPropagation();
  			});

			this.$("#cancel-card").click(function(event) {
				event.stopPropagation();
				
				that.options.board.hideAddCard();
			});

			this.$("#post-card").click(function(event) {
				event.stopPropagation();
				
				that.saveCard();
			});

			this.$("#card-text").keypress(function(event) {
				that.checkCardInput(event);
			});
		},

	 	checkCardInput: function(event) {
	        if ((event) && (!event.shiftKey) && (event.keyCode == 13)) {
	        	event.preventDefault();

	        	this.saveCard();
	        }
	 	},

		saveCard: function() {
			var that = this;

			if (this.$("#card-text").val().trim().length > 0) {
				var newCard = {
					content: this.$("#card-text").val(),
					color: this.$("#card-color-select").spectrum("get").toString()
				};

				Card_Services.Insert(this._parent.getSelectedBoardId(), newCard, function(response) {
					if (response.status == "success") that._parent.trigger("cardAdded", response.card);
				});
			}

			this._parent.hideAddCard();
		},

		focusCardText: function() {
			this.$("#card-text").focus();
		},

		clearCardText: function() {
			this.$("#card-text").val("");
		},

		setSelectedColor: function(color) {
			this.$("#card-color-select").spectrum("set", color);
		}
	});

	// ===== Obect responsible for drawing and manipulating the SVG object on the canvass
	Card.Item = function(workspace, parent, paper, model) {
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

		this._svgText = null;
		this._svgShape = null;
		this._svgDropShadow = null;

		this._isDragging = false;

		this.getId = function() {
			return that._model.id;
		};

		this.getModel = function() {
			return that._model;
		};

		this.getType = function() {
			return "card";
		};

		this.getCardType = function() {
			return "text";
		};

		this.getParentId = function() {
			return this._model.parentId;
		};

		this.setParentId = function() {
			this._model.parentId = parentId;
		};

		this.getIsDragging = function() {
			return that._isDragging;
		};

		this.getSVGShapeX = function() {
			return that._svgShape.attr("x");
		};

		this.getSVGShapeY = function() {
			return that._svgShape.attr("y");
		};

		this.setX = function (xPos) {
			that._model.xPos = xPos;
		};

		this.setY = function (yPos) {
			that._model.yPos = yPos;
		};

		this.getWidth = function() {
			return that._svgShape.attr("width");
		};

		this.getHeight = function() {
			return that._svgShape.attr("height");
		};

		this.bringToFront = function() {
			that._paper.set(that._svgDropShadow, that._svgDropShadowGlow, that._svgShape, that._svgText).toFront();
		};

		this.sendToBack = function() {
			that._paper.set(that._svgDropShadow, that._svgDropShadowGlow, that._svgShape, that._svgText).toBack();
		};

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
					"font-family": that._shapeAttributes.fontFamily 
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

				// figure out what width the card should be
				var width = that._svgText.getBBox().width+(that._shapeAttributes.padding*2);
				if (width < 180) width = 180;

				that._svgShape = that._paper.rect(that._model.xPos, that._model.yPos, width, that._svgText.getBBox().height+(that._shapeAttributes.padding*2));
				that._svgShape.attr({ 
					stroke: "none",
					fill: "#ffffff" 
				});	

				that._svgDropShadow = that._paper.rect(that._svgShape.attr("x"), that._svgShape.attr("y"), that._svgShape.attr("width"), that._svgShape.attr("height"));
				that._svgDropShadow.attr({ 
					stroke: "none"
				});	

				that._svgDropShadowGlow = that._svgDropShadow.glow({
					offsetx: 0.5,
					offsety: 0.5,
					opacity: 0.6, 
					color: "#bbbbbb", 
					width: 3
				});

				that.bringToFront();

				// draw the board and it's title on the board map
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

			that._svgDropShadow.startX = that._svgDropShadow.attr("x");
			that._svgDropShadow.startY = that._svgDropShadow.attr("y");

			that.drawDropShadow();

			that.bringToFront();
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

			that._svgDropShadow.attr({
				x: that._svgDropShadow.startX+dx,
				y: that._svgDropShadow.startY+dy
			});

			that.drawDropShadow();
		};

		// ----- Handler for finishing the drag of a board around the board map
    	this.up = function (e, fromCluster) {
    		that._isDragging = false;

			that._svgText.startX = null;
			that._svgText.startY = null;

			that._svgShape.startX = null;
			that._svgShape.startY = null;

			that._svgDropShadow.startX = null;
			that._svgDropShadow.startY = null;

			that._model.xPos = that._svgShape.attr("x");
			that._model.yPos = that._svgShape.attr("y");

			that.drawDropShadow();

			// this movement was a result of a parents position being updated
        	if (!fromCluster) that._workspace.trigger("cardPositionUpdated", that._model.id, e.layerX, e.layerY);
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

        this.mouseOver = function() {
        	that._workspace.$("#board").css('cursor','pointer');
        };

        this.mouseOut = function() {
        	that._workspace.$("#board").css('cursor','default');
        };
	}

	return Card;
});