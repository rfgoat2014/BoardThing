define([
	"modules/add.board",
	"modules/board",
	"modules/board.services",
	"modules/workspace.services",
	"jquery",
	"jqueryUI"
],

function(AddBoard, Board, Board_Services, Workspace_Services) {
	var BoardMap = {};

	//////////////////////// Views

	// ===== View for viewing a workspace via the board map

	BoardMap.Index = Backbone.View.extend({
		el: "<div>",
	
		_rows: [],

		initialize: function(options) {
			this._workspace = options.workspace;

			this.el.className = "table-container";
		},

		render: function() {
			var maxColCount = 0;

            for (var i=0, rowsLength = this._rows.length; i<rowsLength; i+=1) {
            	this._rows[i].render();

            	this.$el.append(this._rows[i].$el);

            	if (this._rows[i].getColumnCount() > maxColCount) maxColCount = this._rows[i].getColumnCount();
            }

            this.$el.css({ width: this._workspace.getBoardWidth()*maxColCount+(2*maxColCount) });
		},

		addRow: function(boardRow) {
			this._rows.push(boardRow);
		},

		getBoard: function(xPos, yPos) {
            for (var i=0, rowsLength = this._rows.length; i<rowsLength; i+=1) {
            	var boards = this._rows[i].getBoards();

            	for (var i=0, boardsLength = boards.length; i<boardsLength; i+=1) {
            		var boardStartX = boards[i].$el.position().left,
            			boardEndX = boardStartX+boards[i].getWidth(),
            			boardStartY = boards[i].$el.position().top,
            			boardEndY = boardStartY+boards[i].getHeight();

 					if (((xPos > boardStartX) && (xPos < boardEndX)) && 
 						((yPos > boardStartY) && (yPos < boardEndY))) return boards[i];
        		}
            }

            return null;
		},

		destroy: function() {
            for (var i=0, rowsLength = this._rows.length; i<rowsLength; i+=1) {
            	this._rows[i].destroy();
            }

			$(this.el).detach();
			this.remove();
		}
	});
	
  	BoardMap.Row = Backbone.View.extend({
		el: "<div>",

		_index: -1,

		_columns: [],
	
		initialize: function(options) {
			this._index = options.index;

			this.el.id = "board-row_" + this._index;
			this.el.className = "row";
		},

		render: function() {
            for (var i=0, columnsLength = this._columns.length; i<columnsLength; i+=1) {
            	this._columns[i].render();

            	this.$el.append(this._columns[i].$el);
            }
        },

        getBoards: function() {
        	return this._columns;
        },

        getColumnCount: function() {
        	return this._columns.length;
        },

		addColumn: function(boardColumn) {
			this._columns.push(boardColumn);
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