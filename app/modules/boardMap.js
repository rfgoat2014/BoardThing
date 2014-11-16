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

    	// {{ Contructor }}

		initialize: function(options) {
			this._workspace = options.workspace;

			this.el.id = "table-container";
			this.el.className = "table-container";
		},

		// {{ Object Building }}

		render: function() {
			var maxColCount = 0;

            for (var i=0, rowsLength = this._rows.length; i<rowsLength; i+=1) {
            	this._rows[i].render();

            	this.$el.append(this._rows[i].$el);

            	if (this._rows[i].getColumnCount() > maxColCount) maxColCount = this._rows[i].getColumnCount();
            }

            this.$el.css({ width: this._workspace.getBoardWidth()*maxColCount+(2*maxColCount) });
            this.$el.css({ height: this._workspace.getBoardHeight()*this._rows.length+(2*this._rows.length) });

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

		// {{ Public Methods }}

		addRow: function(boardRow) {
			this._rows.push(boardRow);
		},

		center: function() {
		    this.$el.css("position","absolute");

		    var top = (($(window).height()/this._workspace.getZoom()) / 2) - (this.$el.outerHeight() / 2),
		    	left = (($(window).width()/this._workspace.getZoom()) / 2) - (this.$el.outerWidth() / 2);

		    if (top < 0) top = 0;
		    if (left < 0) left = 0;

		    this.$el.css("top", top);
		    this.$el.css("left", left);
		    
		    return this;
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

    	// {{ Contructor }}
	
		initialize: function(options) {
			this._index = options.index;

			this.el.id = "board-row_" + this._index;
			this.el.className = "row";
		},

		// {{ Object Building }}

		render: function() {
            for (var i=0, columnsLength = this._columns.length; i<columnsLength; i+=1) {
            	this._columns[i].render();

            	this.$el.append(this._columns[i].$el);
            }
        },

		// {{ Getters }}

        getBoards: function() {
        	return this._columns;
        },

        getColumnCount: function() {
        	return this._columns.length;
        },

		// {{ Public Methods }}

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
	
  	BoardMap.Board = Backbone.View.extend({
		el: "<div>",

    	// {{ Contructor }}
	
		initialize: function(options) {
			this.el.id = "board_" + this.model.id;
			this.el.className = "board";

			this._workspace = options.workspace;

			this._mode = options.mode;
		},

		// {{ Object Building }}

		render: function() {
			var that = this;

			$.get("/app/templates/board/item.html", function(contents) {
				that.$el.html(_.template(contents, that.model));

				that.afterRender();

				that.unbind();
				that.bind();
			}, "text");
		},

		afterRender: function() {
			this.$el.width(this.model.width);
			this.$el.height(this.model.height);

			this.$el.addClass("outlined")

			this.$("#board-cards_" + this.model.id).width(this.model.width);
			this.$("#board-cards_" + this.model.id).height(this.model.height);

			this.$("#page-canvas_" + this.model.id).width(this.model.width);
			this.$("#page-canvas_" + this.model.id).height(this.model.height);

			if (this._mode == "boardMap") this.$el.addClass("cell");

			this.$("#board-cards_" + this.model.id).empty();

			this._workspace.unbindBoard(this.model.id);
			this._workspace.bindBoard(this.model.id);		

			this._workspace.getBoardItems(this.model.id);

			if (this._workspace.getMode() == "individual") this.center();
		},

		// {{ Event Binding }}

		unbind: function() {
			this.$el.unbind("mouseover");
			this.$el.unbind("mousemove");
			this.$el.unbind("mouseout");
		},

		bind: function() {
			var that = this;
		    
		    this.$el.mouseover(function(event) {
		    	that._workspace.setCurrentMousePosition({ x: event.pageX-that.getXPos(), y: event.pageY-that.getYPos() });
		    });

		    this.$el.mousemove(function(event) {
		    	that._workspace.setCurrentMousePosition({ x: event.pageX-that.getXPos(), y: event.pageY-that.getYPos() });
		    });

		    this.$el.mouseout(function(event) {
		    	that._workspace.setCurrentMousePosition({ x: -1, y: -1});
		    });
		},

		// {{ Getters }}

		getId: function() {
			return this.model.id;
		},

		getXPos: function() {
			return this.$el.position().left+this._workspace.getBoardScrollWidth();
		},

		getYPos: function() {
			return this.$el.position().top+this._workspace.getBoardScrollHeight();
		},

		getWidth: function() {
			return this.model.width;
		},

		getHeight: function() {
			return this.model.height;
		},

		getPosition: function() {
			return this.model.position;
		},

		// {{ Public Methods }}

		center: function() {
			this.$el.center();
		},

		destroy: function() {
			$(this.el).detach();
			this.remove();
		}
  	});

	return BoardMap;
});