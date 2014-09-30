define([
	"raphael",
	"modules/workspace.services"
],

function(raphael, Workspace_Services) {
	var BoardMap = {};

	//////////////////////// Views

	// ===== View for viewing a workspace via the board map

	BoardMap.Index = Backbone.View.extend({
		el: "<div>",
		_boards: [],

		initialize: function(options) {
			this.el.id = "board-map-popup-container";
			this.el.className = "popup-container";

			this.render();
		},

		render: function(){
			var that = this;

			$.get("/app/templates/boardMap/index.html", function(contents) {
				that.$el.html(_.template(contents, that.model.toJSON()));

				that.afterRender();
			}, "text");
		},

		afterRender: function() {
            this._paper = Raphael("board-map", this.$("#board-map-container").width(), this.$("#board-map-container").height());

            var boards = this.model.get("boards");

            for (var i=0, boardsLength = boards.length; i<boardsLength; i+=1) {
            	var board = new BoardMap.Board(this, this._paper, boards[i].id, boards[i].title, boards[i].position);
            	board.draw();

            	this._boards.push(board);
            }
		},

		// ----- Chack if any boards in the map are currently being dragged
		isBoardDragging: function() {
            for (var i=0, boardsLength = this._boards.length; i<boardsLength; i+=1) {
            	if (this._boards[i].getIsDragging()) return true;
            }

            return false;
		},

		// ----- Searches through all the currently defined boards to see what positions are available for new boards
		getAvailableAddSpots: function(boardId,xPos,yPos) {
			var nFree = true,
				sFree = true,
				eFree = true,
				wFree = true;

			// if this is the top or furthest west the new boards can't be added above or to the lest
			if (yPos == 1) nFree = false;
			if (xPos == 1) wFree = false;

			// search through all the boards and check what positions are taken in relation to the current board 
            for (var i=0, boardsLength = this._boards.length; i<boardsLength; i+=1) {
            	// if at any point every spot is determined to be taken then return an empty array
            	if ((!nFree) && (!sFree) && (!eFree) && (!wFree)) return [];

            	if (this._boards[i].id != boardId) {
            		if ((this._boards[i].getXPos() == xPos) && (this._boards[i].getYPos() == (yPos-1))) nFree = false;
            		else if ((this._boards[i].getXPos() == xPos) && (this._boards[i].getYPos() == (yPos+1))) sFree = false;
            		else if ((this._boards[i].getYPos() == yPos) && (this._boards[i].getXPos() == (xPos+1))) eFree = false;
            		else if ((this._boards[i].getYPos() == yPos) && (this._boards[i].getXPos() == (xPos-1))) wFree = false;
            	}
            }

            // check which spots are now available to add a board at
            var spotsAvailable = [];

            if (nFree) spotsAvailable.push("n");
            if (sFree) spotsAvailable.push("s");
            if (eFree) spotsAvailable.push("e");
            if (wFree) spotsAvailable.push("w");

            return spotsAvailable;
		},

		// ------ a board have been moved through a drag action so reset the positions of boards
		boardMoved: function(x, y, position) {
			var sourceBoardIndex = null,
				targetBoardIndex = null;

            for (var i=0, boardsLength = this._boards.length; i<boardsLength; i+=1) {
            	if (this._boards[i].getPosition() != position) {
	            	if (this._boards[i].isHitting(x,y)) {
	            		targetBoardIndex = i;
	            	}
	            }
	            else {
	            	sourceBoardIndex = i;
	            }
        	}

        	if ((sourceBoardIndex != null) && (targetBoardIndex != null)) {
        		var newSourceBoardPosition = this._boards[targetBoardIndex].getPosition(),
        			newTargetBoardPosition = this._boards[sourceBoardIndex].getPosition();

        		this._boards[sourceBoardIndex].setPosition(newSourceBoardPosition);
        		this._boards[targetBoardIndex].setPosition(newTargetBoardPosition);
        		this._boards[targetBoardIndex].draw();
        	}
		},

		storeBoardPositions: function() {
            var boardPositions = [];

            for (var i=0, boardsLength = this._boards.length; i<boardsLength; i+=1) {
            	boardPositions.push({
            		boardId: this._boards[i].getId(),
            		position: this._boards[i].getPosition()
            	});
            }

            Workspace_Services.UpdateBoardPositions(this.model.get("id"), boardPositions);
		}
	});

	// ===== Obect responsible for drawing and manipulating the SVG object on the canvas

	BoardMap.Board = function(parent, paper, id, name, position) {
		var that = this;

		this._paper = paper;
		that._parent = parent;

		this._id = id;
		this._name = name;
		this._position = position;

		if (position.split(".").length == 2) {
			this._xPos = parseInt(position.split(".")[0]);
			this._yPos = parseInt(position.split(".")[1]);
		}

		this._width = 200;
		this._height = 100;

		this._svgShape = null;
		this._svgText = null;

		this._isDragging = false;

		this._addBoardButtons = [];

		this.getId = function() {
			return this._id;
		}

		// ----- Gets the position of the board. This takes the form xGridReference/yGridReference
		this.getPosition = function() {
			if ((that._isDragging) && (that._newPosition)) return that._newPosition;
			else return that._position;
		}

		this.getXPos = function() {
			return this._xPos;
		}

		this.getYPos = function() {
			return this._yPos;
		}

		// ----- Sets the position of of the board on the board map. This is not a literal x/y point position but a grid reference e.g. 1.2
		this.setPosition = function(position) {
			if (that._isDragging) {
				that._newPosition = position;
			}
			else {
				that._position = position;

				var posLocation = position.split(".");

				if (posLocation.length == 2) {
					that._xPos = parseInt(posLocation[0]);
					that._yPos = parseInt(posLocation[1]);
				}
			}
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
		}

		this.draw = function() {
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

				// determine the original x/y positions of the board
				var rectStartX = (that._xPos-1)*that._width,
					rectStartY = (that._yPos-1)*that._height,
					txtStartX = rectStartX+(that._width/2),
					txtStartY = rectStartY+(that._height/2);

				// draw the board and it's title on the board map
				that._svgShape = that._paper.rect(rectStartX, rectStartY, that._width, that._height).attr({ fill: "#ffffff" });	
				that._svgText = that._paper.text(txtStartX, txtStartY, that._name);

				that._svgText.toBack();
				that._svgShape.toBack();

				that._paper.set(that._svgShape, that._svgText).drag(that.move, that.start, that.up);
				that._paper.set(that._svgShape, that._svgText).mouseover(that.mouseOver);
				that._paper.set(that._svgShape, that._svgText).mouseout(that.mouseOut);
			}
		};

		// ----- Handler for the start of a drag action for this board object
		this.start = function() {
			that._isDragging = true;

        	that.clearAddButtons();
			
			that._svgShape.toFront();
			that._svgText.toFront();
		};

		// ----- Handler for moving a board around the board map
		this.move = function (dx, dy, x, y, e) {
			// determine the original x/y positions of the board
			var rectStartX = (that._xPos-1)*that._width,
				rectStartY = (that._yPos-1)*that._height;

			// determine the the x/y position of the board
			var newRectStartX = rectStartX+dx,
				newRectStartY = rectStartY+dy;

			// check that we're not going outside the boundries of the SVG
			if (newRectStartX < 0) newRectStartX = 0;
			else if ((newRectStartX+that._width) > that._paper.width) newRectStartX = that._paper.width-that._width;

			if (newRectStartY < 0) newRectStartY = 0;
			else if ((newRectStartY+that._height) > that._paper.height) newRectStartY = that._paper.height-that._height;

			// determine the new text position on the board
			var newTxtStartX = newRectStartX+(that._width/2),
				newTxtStartY = newRectStartY+(that._height/2);

            that._svgShape.attr({ x: newRectStartX, y: newRectStartY });
            that._svgText.attr({ x: newTxtStartX, y: newTxtStartY });

            if (that._newPosition) that._parent.boardMoved(newRectStartX,newRectStartY,that._newPosition);
            else that._parent.boardMoved(newRectStartX,newRectStartY,that._position);
		};

		// ----- Handler for finishing the drag of a board around the board map
    	this.up = function () {
    		that._isDragging = false;

			if (that._newPosition) {
				that.setPosition(that._newPosition);
				that._newPosition = null;
			}

			that.draw();
			
			that._parent.storeBoardPositions();
        };

        // ----- Handler for when the mouse hovers over the board object
        this.mouseOver = function(e) {
        	if (!that._parent.isBoardDragging()) {
				that.clearAddButtons();

				// check which spots n/s/e/w relative to the current board are available for new baords to be added
				var availableAddBoardPositions = that._parent.getAvailableAddSpots(that._id, that._xPos, that._yPos);

				if (availableAddBoardPositions.length > 0) {
					if (availableAddBoardPositions.indexOf("n") != -1) that._addBoardButtons.push(new BoardMap.BoardAdd(that, that._paper, "north", that._position, that._width, that._height));
					if (availableAddBoardPositions.indexOf("s") != -1) that._addBoardButtons.push(new BoardMap.BoardAdd(that, that._paper, "south", that._position, that._width, that._height));
					if (availableAddBoardPositions.indexOf("e") != -1) that._addBoardButtons.push(new BoardMap.BoardAdd(that, that._paper, "east", that._position, that._width, that._height));
					if (availableAddBoardPositions.indexOf("w") != -1) that._addBoardButtons.push(new BoardMap.BoardAdd(that, that._paper, "west", that._position, that._width, that._height));
				}

				for (var i=0, addBoardButtonsLength = that._addBoardButtons.length; i<addBoardButtonsLength; i+=1) {
					that._addBoardButtons[i].draw()
				}
			}
        }

        // Handler for when the mouse leaves the board object
        this.mouseOut = function(e) {
        	var boardBounds = that.getBounds();

        	if ((e.offsetX < boardBounds.startX) || (e.offsetX > boardBounds.endX) || (e.offsetY < boardBounds.startY) || (e.offsetY > boardBounds.endY)) that.clearAddButtons();
        }

        this.clearAddButtons = function() {
			// clear out the current SVG add button icons and empty the container array
			for (var i=0, addBoardButtonsLength = that._addBoardButtons.length; i<addBoardButtonsLength; i+=1) {
				if (that._addBoardButtons[i]) {
					that._addBoardButtons[i].undraw();
					that._addBoardButtons[i] = null;

				}
			}

			that._addBoardButtons = [];
        }
	}

	// ===== Generates the add board buttons on the board map

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
	}

	return BoardMap;
});