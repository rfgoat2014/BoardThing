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

			this._rows = [];

			this._topEdgeRow = null;
			this._bottomEdgeRow = null;
		},

		// {{ Object Building }}

		render: function() {
			if (this._rows.length > 0) {
				// Top edge add button row

				if (this._topEdgeRow) {
					this._topEdgeRow.destroy();
					this._topEdgeRow = null;
				}

				var topRowColumns = this._rows[0].getColumns(),
					topRowIndex = topRowColumns[0].getPositionY()-1;

				if (topRowIndex == 0) topRowIndex = -1;

				this._topEdgeRow = new BoardMap.EdgeRow({ index: topRowIndex, workspace: this._workspace });

				for (var i=0, topRowColumnsLength=topRowColumns.length; i<topRowColumnsLength; i+=1) {
					if (topRowColumns[i].getType() == "board") this._topEdgeRow.addAddColumn();
					else this._topEdgeRow.addPlaceholderColumn();
				}

				this._topEdgeRow.render();

            	this.$el.append(this._topEdgeRow.$el);

            	// Main body layout

	            for (var i=0, rowsLength = this._rows.length; i<rowsLength; i+=1) {
	            	this._rows[i].render();

	            	this.$el.append(this._rows[i].$el);
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
			var newRow = false,
				rowIndex = -1,
				newColumn = false,
				columnIndex = -1;

			if (this._rows.length > 0) {
	            for (var i=0, rowsLength = this._rows.length; i<rowsLength; i+=1) {
					if ((i === 0) && (this._rows[i].getIndex() > yPos)) {
						this.addRow(yPos, 0);
						rowIndex = 0;
						newRow = true;
						break;
					}
					else if (this._rows[i].getIndex() == yPos) {
						rowIndex = i;
						break;
					}
				}

				if (rowIndex === -1) {
					this.addRow(yPos, this._rows.length);
					rowIndex = this._rows.length-1;
					newRow = true;
				}
			}
			else {
				this.addRow(yPos, 0);
				rowIndex = 0;
				newRow = true;
			}

			if (rowIndex != -1) {
				var referenceRowColumns = [],
					rowColumns = this._rows[rowIndex].getColumns();

				if (rowIndex != 0) referenceRowColumns = this._rows[0].getColumns();
				else if (this._rows.length > 1) referenceRowColumns = this._rows[1].getColumns();

				if (referenceRowColumns.length > 0) {
					for (var i=0, referenceRowColumnsLength=referenceRowColumns.length; i<referenceRowColumnsLength; i+=1) {
						if ((i === 0) && (referenceRowColumns[i].getPositionX() > xPos)) {
							this._rows[rowIndex].addColumnAtPosition(0, board);
							columnIndex = 0;
							newColumn = true;
						}
						else if ((rowColumns[i] != null ) && (rowColumns[i].getPositionX() == xPos)) {
							this._rows[rowIndex].replaceColumnAtPosition(i, board);
							columnIndex = i;
							break;
						}
						else if ((rowColumns[i] == null ) && (referenceRowColumns[i].getPositionX() == xPos)) {
							this._rows[rowIndex].addColumnAtPosition(i, board);
							columnIndex = i;
						}
						else if (newRow) {
							this._rows[rowIndex].addColumnAtPosition(i, new AddBoard.Index({ workspace: this._workspace, positionX: referenceRowColumns[i].getPositionX(), positionY: this._rows[rowIndex].getIndex(), direction: "m" }));
						}
					}

					if (columnIndex === -1) {
						this._rows[rowIndex].addColumnAtPosition(this._rows.length, board);
						columnIndex = rowColumns.length-1;
						newColumn = true;
					}
				}
				else {
					this._rows[rowIndex].addColumnAtPosition(0, board);
					columnIndex = 0;
					newColumn = true;
				}

				if (newColumn) {
					var referenceColumns = this._rows[rowIndex].getColumns();

	            	for (var i=0, rowsLength = this._rows.length; i<rowsLength; i+=1) {
						for (var j=0, rowColumnsLength=this._rows[i].getColumns().length; j<rowColumnsLength; j+=1) {
							if ((i != rowIndex) && (j == columnIndex)) this._rows[i].addColumnAtPosition(j, new AddBoard.Index({ workspace: this._workspace, positionX: referenceColumns[j].getPositionX(), positionY: this._rows[i].getIndex(), direction: "m" }));
	            		}
	            	}
				}
			}

			this.destroyRows();
			this.render();
		},

		// {{ Public Methods }}

		addRow: function(yPos, position) {
			var boardRow = new BoardMap.Row({ index: yPos, parent: this, workspace: this._workspace });

			if (position == null) position = this._rows.length;

			if (position == this._rows.length) this._rows.push(boardRow)
			else this._rows.splice(position, 0, boardRow);

			return boardRow;
		},

		center: function() {
			CSSHelpers.center(this.$el, this._workspace.getZoom());
		},

		destroyRows: function() {
			if (this._topEdgeRow) this._topEdgeRow.destroy();
			if (this._bottomEdgeRow) this._bottomEdgeRow.destroy();

            for (var i=0, rowsLength = this._rows.length; i<rowsLength; i+=1) {
            	this._rows[i].destroy();
            }
        },

		destroy: function() {
			this.destroyRows();

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
			if (this._columns[0].getType() == "board") {
				var startPositionX = 1;
				if (this._columns.length > 0) startPositionX = this._columns[0].getPositionX()-1;
				if (startPositionX == 0) startPositionX = -1;

				this._edgeAddBoards.push(new AddBoard.Index({ positionX: startPositionX, positionY: this._index, direction: "x", workspace: this._workspace }));
			}
			else this._edgeAddBoards.push(new Placeholder.Index({ width: 100, height: this._workspace.getBoardHeight() }));
			
			this.$el.append(this._edgeAddBoards[(this._edgeAddBoards.length-1)].$el);
			
            for (var i=0, columnsLength = this._columns.length; i<columnsLength; i+=1) {
            	this._columns[i].render();

            	this.$el.append(this._columns[i].$el);
            }

			if (this._columns[(this._columns.length-1)].getType() == "board") {
				var startPositionX = 1;
				if (this._columns.length > 0) startPositionX = this._columns[(this._columns.length-1)].getPositionX()+1;

				this._edgeAddBoards.push(new AddBoard.Index({ positionX: (this._columns.length+1), positionY: this._index, direction: "x", workspace: this._workspace }));
			}
			else this._edgeAddBoards.push(new Placeholder.Index({ width: 100, height: this._workspace.getBoardHeight() }));

			this.$el.append(this._edgeAddBoards[(this._edgeAddBoards.length-1)].$el);
        },

		// {{ Getters }}

		getIndex: function() {
			return this._index;
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
			if (index == this._columns.length) this._columns.push(boardColumn);
			else this._columns.splice(index, 0, boardColumn);
		},

		replaceColumnAtPosition: function(index, boardColumn) {
			this._columns[index].destroy();

			this._columns[index] = boardColumn;
		},

		addColumn: function(boardColumn) {
			this._columns.push(boardColumn);
		},

		destroy: function() {
            for (var i=0, columnsLength = this._columns.length; i<columnsLength; i+=1) {
            	this._columns[i].destroy();
            }

            for (var i=0, columnsLength = this._edgeAddBoards.length; i<columnsLength; i+=1) {
            	this._edgeAddBoards[i].destroy();
            }

			$(this.el).detach();
			this.remove();
		}
	});

	return BoardMap;
});