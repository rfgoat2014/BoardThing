define([
	"raphael"
],

function() {
	var BoardMap = {};

	//////////////////////// Views

	// ===== View for viewing a workdspace

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
            	var board = new BoardMap.Board(this, this._paper, boards[i].title, boards[i].position);
            	board.draw();

            	this._boards.push(board);
            }
		},

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
		}
	});

	BoardMap.Board = function(parent, paper, name, position) {
		var that = this;

		this._paper = paper;
		that._parent = parent;

		this._name = name;
		this._position = position;

		this._width = 200;
		this._height = 100;

		this._svgShape = null;
		this._svgText = null;

		this._isDragging = false;

		this.getPosition = function() {
			if ((that._isDragging) && (that._newPosition)) return that._newPosition;
			else return that._position;
		}

		this.setPosition = function(position) {
			if (that._isDragging) that._newPosition = position;
			else that._position = position;
		}

		this.isHitting = function(x, y) {
			var posLocation = that._position.split(".");

			if (position.length = 2) {
				var xPos = parseInt(posLocation[0]);
				var yPos = parseInt(posLocation[1]);
				
				var rectStartX = (xPos-1)*that._width,
					rectStartY = (yPos-1)*that._height;

				if ((!that._isDragging) && 
					((x >= rectStartX) && (x <= (rectStartX+that._width)) &&
					 (y >= rectStartY) && (y <= (rectStartY+that._height)))) {
					return true;
				}
			}

			return false;
		};

		this.draw = function() {
			if (!that._isDragging) {
				var posLocation = that._position.split(".");

				if (position.length = 2) {
					var xPos = parseInt(posLocation[0]);
					var yPos = parseInt(posLocation[1]);

					if (that._svgShape) {
						that._svgShape.remove();
						that._svgShape = null;
					}	

					if (that._svgText) {
						that._svgText.remove();
						that._svgText = null;
					}

					// determine the original x/y positions of the board
					var rectStartX = (xPos-1)*that._width,
						rectStartY = (yPos-1)*that._height,
						txtStartX = rectStartX+(that._width/2),
						txtStartY = rectStartY+(that._height/2);

					that._svgShape = that._paper.rect(rectStartX, rectStartY, that._width, that._height).attr({ fill: "#ffffff" });	
					that._svgText = that._paper.text(txtStartX, txtStartY, that._name);

					that._paper.set(that._svgShape, that._svgText).drag(that.move, that.start, that.up);
				}
			}
		};

		this.start = function() {
			that._isDragging = true;
		};

		this.move = function (dx, dy, x, y, e) {
			var posLocation = that._position.split(".");

			if (position.length = 2) {
				var xPos = parseInt(posLocation[0]);
				var yPos = parseInt(posLocation[1]);
				
				// determine the original x/y positions of the board
				var rectStartX = (xPos-1)*that._width,
					rectStartY = (yPos-1)*that._height;

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
	        }
		};

    	this.up = function () {
    		that._isDragging = false;

			if (that._newPosition) {
				that._position = that._newPosition;
				that._newPosition = null;
			}

			that.draw();
			
			that._parent.storeBoardPositions();
        };
	}

	return BoardMap;
});