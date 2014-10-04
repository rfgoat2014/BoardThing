define([
	"modules/card.services",
	"modules/workspace.services",
	"raphael",
	"spectrum"
],

function(Card_Services, Workspace_Services) {
	var Card = {};

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
	Card.Text = function(parent, paper, model) {
		var that = this;

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

		this.getType = function() {
			return "text";
		}

		this.bringToFront = function() {
			that._paper.set(that._svgShape, that._svgText).toFront();
		}

		this.sendToBack = function() {
			that._paper.set(that._svgShape, that._svgText).toBack();
		}

		this.getIsDragging = function() {
			return that._isDragging;
		}

		// ---- Check if a specified X/Y position touches the current shape
		this.isHitting = function(x, y) {
			var rectStartX = (that._xPos-1)*that._width,
				rectStartY = (that._yPos-1)*that._height;

			if ((!that._isDragging) && 
				((x >= rectStartX) && (x <= (rectStartX+that._width)) &&
				 (y >= rectStartY) && (y <= (rectStartY+that._height)))) {
				return true;
			}

			return false;
		};

		this.getBounds = function() {
			return {
				startX: ((that._xPos-1)*that._width),
				endX: (((that._xPos-1)*that._width)+that._width),
				startY: ((that._yPos-1)*that._height),
				endY: (((that._yPos-1)*that._height)+that._height)
			};
		};

		this.draw = function() {
			var wrapText = function(text) {
				var svgText = that._paper.text(100, 100).attr('text-anchor', 'start');
				svgText.attr({ "font-size": that._shapeAttributes.fontSize, "font-family": that._shapeAttributes.fontFamily });

				var words = text.split(" ");

				var tempText = "";

				for (var i=0, wordsLength = words.length; i<wordsLength; i++) {
					svgText.attr("text", tempText + " " + words[i]);

					if (svgText.getBBox().width > maxWidth) tempText += "\n" + words[i];
					else tempText += " " + words[i];
				}

				return tempText;
			}

			if (!that._isDragging) {
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

				that._svgText = that._paper.text((that._model.xPos+that._shapeAttributes.padding), (that._model.yPos+that._shapeAttributes.padding));
				that._svgText.attr({ 
					"text-anchor": "start",
					"font-size": that._shapeAttributes.fontSize, 
					"font-family": that._shapeAttributes.fontFamily 
				});

				var words = that._model.content.split(" "),
					maxWidth = that._model.width+(that._shapeAttributes.padding*2),
					tempText = "";

				for (var i=0, wordsLength = words.length; i<wordsLength; i++) {
					that._svgText.attr("text", tempText + " " + words[i]);

					if (that._svgText.getBBox().width > maxWidth) tempText += "\n" + words[i];
					else tempText += " " + words[i];
				}

				that._svgText.attr({
					y: ((that._model.yPos+that._shapeAttributes.padding)+(that._svgText.getBBox().height/2))
				});

				var width = that._svgText.getBBox().width+(that._shapeAttributes.padding*2);
				if (width < 180) width = 180;

				that._svgShape = that._paper.rect(that._model.xPos, that._model.yPos, width, that._svgText.getBBox().height+(that._shapeAttributes.padding*2));
				that._svgShape.attr({ 
					stroke: "none",
					fill: "#ffffff" 
				});	

				that._svgDropShadow = that._paper.rect(that._model.xPos, that._model.yPos, width, that._svgText.getBBox().height+(that._shapeAttributes.padding*2));
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

				that._svgDropShadow.toBack();
				that._svgShape.toFront();
				that._svgText.toFront();

				// draw the board and it's title on the board map
				that._paper.set(that._svgShape, that._svgText).drag(that.move, that.start, that.up);
				that._paper.set(that._svgShape, that._svgText).mouseover(that.mouseOver);
				that._paper.set(that._svgShape, that._svgText).mouseout(that.mouseOut);
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

			that._svgDropShadow.toFront();
			that._svgShape.toFront();
			that._svgText.toFront();
		};

		// ----- Handler for moving a board around the board map
		this.move = function (dx, dy, x, y, e) {
			that._svgDropShadowGlow.remove();

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

			that._svgDropShadowGlow = that._svgDropShadow.glow({
				offsetx: 0.5,
				offsety: 0.5,
				opacity: 0.6, 
				color: "#bbbbbb", 
				width: 3
			});
		};

		// ----- Handler for finishing the drag of a board around the board map
    	this.up = function () {
    		that._isDragging = false;

			that._svgText.startX = null;
			that._svgText.startY = null;

			that._svgShape.startX = null;
			that._svgShape.startY = null;

			that._svgDropShadow.startX = null;
			that._svgDropShadow.startY = null;

        	that._parent.trigger("updateCardPosition", that._model.id, that._svgShape.attr("x"), that._svgShape.attr("y"));
        };

        this.mouseOver = function() {
        	that._parent.$("#board").css('cursor','pointer');
        };

        this.mouseOut = function() {
        	that._parent.$("#board").css('cursor','default');
        };
	}

	/*// ===== Generates the add board buttons on the board map

	BoardMap.BoardAdd = function(parent, paper, placement, parentPosition, parentWidth, parentHeight) {
		var that = this;

		this._paper = paper;
		this._parent = parent;

		this._placement = placement;

		if (parentPosition.split(".").length == 2) {
			this._parentXPos = parseInt(parentPosition.split(".")[0]);
			this._parentYPos = parseInt(parentPosition.split(".")[1]);
		}

		this._parentWidth = parentWidth;
		this._parentHeight = parentHeight;

		this._imageLocation = "/img/addBoard.png"
		this._width = 15;
		this._height = 15;

		this._svgShape = null;
		this._isOver = false;

		this.draw = function() {
			var rectStartX = (that._parentXPos-1)*that._parentWidth,
				rectStartY = (that._parentYPos-1)*that._parentHeight;

			switch(this._placement) {
				case "north":
				that._svgShape = that._paper.image(that._imageLocation, ((rectStartX+(that._parentWidth/2))-(that._width/2)), (rectStartY-(that._height/2)), that._width, that._height);
				break;
				case "south":
				that._svgShape = that._paper.image(that._imageLocation, ((rectStartX+(that._parentWidth/2))-(that._width/2)), ((rectStartY+that._parentHeight)-(that._height/2)), that._width, that._height);
				break;
				case "east":
				that._svgShape = that._paper.image(that._imageLocation, ((rectStartX+that._parentWidth)-(that._width/2)), ((rectStartY+(that._parentHeight/2))-(that._height/2)), that._width, that._height);
				break;
				case "west":
				that._svgShape = that._paper.image(that._imageLocation, (rectStartX-(that._width/2)), ((rectStartY+(that._parentHeight/2))-(that._height/2)), that._width, that._height);
				break;
			}

			that._svgShape.toFront();

			that._paper.set(that._svgShape).mouseout(that.mouseOut);
		}

		this.undraw = function() {
			if (that._svgShape) that._svgShape.remove();
		}

        this.mouseOut = function(e) {
       		that._parent.clearAddButtons();
        }
	}*/

	return Card;
});