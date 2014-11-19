define([
	"modules/board.add",
	"modules/board",
	"modules/board.placeholder",
	"modules/CSS.helpers",
	"modules/board.services",
	"modules/workspace.services",
	"jquery",
	"jqueryUI"
],

function(AddBoard, Board, Placeholder, CSSHelpers, Board_Services, Workspace_Services) {
	var BoardMap = {};

	//////////////////////// Views

	// ===== View for viewing a workspace via the board map

	BoardMap.Index = Backbone.View.extend({
		el: "<div>",
	
		_rows: [],

		_topEdgeRow: null,
		_bottomEdgeRow: null,

    	// {{ Contructor }}

		initialize: function(options) {
			this.el.id = "table-container";
			this.el.className = "table-container";

			this._workspace = options.workspace;
		},

		// {{ Object Building }}

		render: function() {
			if (this._rows.length > 0) {
				var maxwidth = 0,
					totalHeight = 0;

				// Top edge add button row

				if (this._topEdgeRow) {
					this._topEdgeRow.destroy();
					this._topEdgeRow = null;
				}

				this._topEdgeRow = new BoardMap.EdgeRow({ index:0, workspace: this._workspace });

				var topRowColumns = this._rows[0].getColumns();

				for (var i=0, topRowColumnsLength=topRowColumns.length; i<topRowColumnsLength; i+=1) {
					if (topRowColumns[i].getType() == "board") this._topEdgeRow.addAddColumn();
					else this._topEdgeRow.addPlaceholderColumn();
				}

				this._topEdgeRow.render();

            	this.$el.append(this._topEdgeRow.$el);

            	totalHeight += 102;

            	// Main body layout

	            for (var i=0, rowsLength = this._rows.length; i<rowsLength; i+=1) {
	            	this._rows[i].render();

	            	this.$el.append(this._rows[i].$el);

	            	var rowWidth = this._rows[i].getWidth();

	            	if (rowWidth > maxwidth) maxwidth = rowWidth;

	            	totalHeight += this._rows[i].getHeight();
	            }

				// Bottom edge add button row

				if (this._bottomEdgeRow) {
					this._bottomEdgeRow.destroy();
					this._bottomEdgeRow = null;
				}

				this._bottomEdgeRow = new BoardMap.EdgeRow({ index: this._rows.length+1, workspace: this._workspace });

				var bottomRowColumns = this._rows[this._rows.length-1].getColumns();

				for (var i=0, bottomRowColumnsLength=bottomRowColumns.length; i<bottomRowColumnsLength; i+=1) {
					if (bottomRowColumns[i].getType() == "board") this._bottomEdgeRow.addAddColumn();
					else this._bottomEdgeRow.addPlaceholderColumn();
				}

				this._bottomEdgeRow.render();

            	this.$el.append(this._bottomEdgeRow.$el);

            	totalHeight += 102;

            	// Set up board container

	            this.$el.css({ width: maxwidth });
	            this.$el.css({ height: totalHeight });
			}

            this.center();
		},

		// {{ Getters }}

		getBoard: function(boardId) {
            for (var i=0, rowsLength = this._rows.length; i<rowsLength; i+=1) {
            	var boards = this._rows[i].getBoards();

            	for (var j=0, boardsLength = boards.length; j<boardsLength; j+=1) {
            		if (boards[j].getId() == boardId) return boards[j];
            	}
            }

            return null;
		},

		getBoardInPosition: function(xPos, yPos) {
            for (var i=0, rowsLength = this._rows.length; i<rowsLength; i+=1) {
            	var boards = this._rows[i].getBoards();

            	for (var j=0, boardsLength = boards.length; j<boardsLength; j+=1) {
            		var boardStartX = boards[j].getXPos(),
            			boardEndX = boardStartX+boards[j].getWidth(),
            			boardStartY = boards[j].getYPos(),
            			boardEndY = boardStartY+boards[j].getHeight();

 					if (((xPos > boardStartX) && (xPos < boardEndX)) && 
 						((yPos > boardStartY) && (yPos < boardEndY))) return boards[j];
        		}
            }

            return null;
		},

		// {{ Setters }}

		setZoom: function(zoom) {
			CSSHelpers.setZoom(this.$el, zoom);
		},

		addBoardInPosition: function(xPos, yPos, board) {
			if (xPos === 0) {
	            for (var i=0, rowsLength = this._rows.length; i<rowsLength; i+=1) {
					var bottomRowColumns = this._rows[i].getColumns();

					for (var j=0, bottomRowColumnsLength=bottomRowColumns.length; j<bottomRowColumnsLength; j+=1) {
						var positionParts = bottomRowColumns[j].getPosition().split("."),
							newPosition = positionParts[0] + "." + (parseInt(positionParts[1])+1);

						bottomRowColumns[j].setPosition();

						Board_Services.UpdatePosition(this._workspace.getId(), bottomRowColumns[j].getId(), newPosition);
					}

					if (i == yPos) this._rows[i].addColumnAtPosition(0, board);
					else this._rows[i].addColumnAtPosition(0, null);
				}
			}

			if (yPos === 0) {
				var boardRow = new BoardMap.Row({ index: 1, parent: this, workspace: this._workspace }),
					maxColumnLength = 0;

	            for (var i=0, rowsLength = this._rows.length; i<rowsLength; i+=1) {
					var bottomRowColumns = this._rows[i].getColumns();

					for (var j=0, bottomRowColumnsLength=bottomRowColumns.length; j<bottomRowColumnsLength; j+=1) {
						var positionParts = bottomRowColumns[j].getPosition().split("."),
							newPosition = (parseInt(positionParts[0])+1).toString() + "." + positionParts[1];

						bottomRowColumns[j].setPosition(newPosition);

						console.log(newPosition)

						Board_Services.UpdatePosition(this._workspace.getId(), bottomRowColumns[j].getId(), newPosition);

						if (bottomRowColumnsLength > maxColumnLength) maxColumnLength = bottomRowColumnsLength;
					}
				}

	            for (var i=0; i<maxColumnLength; i+=1) {
					boardRow.addColumn();
				}
			}

			console.log(this._rows)
		},

		// {{ Public Methods }}

		addRow: function() {
			var boardRow = new BoardMap.Row({ index: (this._rows.length+1), parent: this, workspace: this._workspace });

			this._rows.push(boardRow);

			return boardRow;
		},

		center: function() {
			CSSHelpers.center(this.$el, this._workspace.getZoom());
		},

		destroy: function() {
            for (var i=0, rowsLength = this._rows.length; i<rowsLength; i+=1) {
            	this._rows[i].destroy();
            }

			$(this.el).detach();
			this.remove();
		}
	});
	
  	BoardMap.EdgeRow = Backbone.View.extend({
		el: "<div>",

		_columns: [],

		_index: -1,

    	// {{ Contructor }}

		initialize: function(options) {
			this._index = options.index;

			this.el.id = "board-row_" + this._index;
			this.el.className = "row";

			this._workspace = options.workspace;
			this._columns = [];

			this._columns.push(new Placeholder.Index({ width: 100, height: 100 }));
			this._columns.push(new Placeholder.Index({ width: 100, height: 100 }));
		},

		// {{ Object Building }}

		render: function() {			
            for (var i=0, columnsLength = this._columns.length; i<columnsLength; i+=1) {
            	this._columns[i].render();

            	this.$el.append(this._columns[i].$el);
            }
        },

		// {{ Public Methods }}

		addPlaceholderColumn: function() {
			this._columns.splice((this._columns.length-1), 0, new Placeholder.Index({ width: this._workspace.getBoardWidth(), height: 100 }));
		},

		addAddColumn: function() {
			this._columns.splice((this._columns.length-1), 0, new AddBoard.Index({ positionX: (this._columns.length-1), positionY: this._index, direction: "y", workspace: this._workspace }));
		},

		destroy: function() {
            for (var i=0, columnsLength = this._columns.length; i<columnsLength; i+=1) {
            	this._columns[i].destroy();
            	this._columns[i] = null;
            }

            this._columns = [];

			$(this.el).detach();
			this.remove();
		}
  	});
	
  	BoardMap.Row = Backbone.View.extend({
		el: "<div>",

		_index: -1,

		_columns: [],
		_edgeAddBoards: [],

    	// {{ Contructor }}
	
		initialize: function(options) {
			this._index = options.index;

			this.el.id = "board-row_" + this._index;
			this.el.className = "row";

			this._parent = options.parent;
			this._workspace = options.workspace;

			this._columns = [];
			this._edgeAddBoards = [];
		},

		// {{ Object Building }}

		render: function() {
			if (this._columns[0].getType() == "board") this._edgeAddBoards.push(new AddBoard.Index({ positionX: 0, positionY: this._index, direction: "x", workspace: this._workspace }));
			else this._edgeAddBoards.push(new Placeholder.Index({ width: 100, height: this._workspace.getBoardHeight() }));
			
			this.$el.append(this._edgeAddBoards[(this._edgeAddBoards.length-1)].$el);
			
            for (var i=0, columnsLength = this._columns.length; i<columnsLength; i+=1) {
            	this._columns[i].render();

            	this.$el.append(this._columns[i].$el);
            }

			if (this._columns[(this._columns.length-1)].getType() == "board") this._edgeAddBoards.push(new AddBoard.Index({ positionX: (this._columns.length+1), positionY: this._index, direction: "x", workspace: this._workspace }));
			else this._edgeAddBoards.push(new Placeholder.Index({ width: 100, height: this._workspace.getBoardHeight() }));

			this.$el.append(this._edgeAddBoards[(this._edgeAddBoards.length-1)].$el);
        },

		// {{ Getters }}

		getIndex: function() {
			return this._index;
		},

		getWidth: function() {
			var width = 0;

            for (var i=0, columnsLength = this._columns.length; i<columnsLength; i+=1) {
            	width += (this._columns[i].getWidth()+2);
            }

            for (var i=0, edgesLength = this._edgeAddBoards.length; i<edgesLength; i+=1) {
            	width += (this._edgeAddBoards[i].getWidth()+2);
        	}

            return width;
		},

		getHeight: function() {
			return this._workspace.getBoardHeight()+2;
		},

		getColumns: function() {
			return this._columns;
		},

        getBoards: function() {
        	var boards = [];

            for (var i=0, columnsLength = this._columns.length; i<columnsLength; i+=1) {
            	if (this._columns[i].getType() == "board") boards.push(this._columns[i]);
            }

        	return boards;
        },

        getColumnCount: function() {
        	return this._columns.length;
        },

		// {{ Public Methods }}

		addColumnAtPosition: function(index, boardColumn) {
			if (boardColumn) this._columns.splice(index, 0, boardColumn);
			else this._columns.splice(index, 0, new AddBoard.Index({ workspace: this._workspace, positionX: (index+1), positionY: this._index, direction: "m" }));
		},

		addColumn: function(boardColumn) {
			var columnIndex = this._columns.length+1;

			if (boardColumn) this._columns.push(boardColumn);
			else this._columns.push(new AddBoard.Index({ workspace: this._workspace, positionX: columnIndex, positionX: columnIndex, positionY: this._index, direction: "m" }));
		},

		destroy: function() {
            for (var i=0, columnsLength = this._columns.length; i<columnsLength; i+=1) {
            	this._columns[i].destroy();
            }

			$(this.el).detach();
			this.remove();
		}
	});

	return BoardMap;
});