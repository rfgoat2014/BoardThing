define([
	"modules/board.services",
	"modules/workspace.services",
	"jquery",
	"jqueryUI"
],

function(Board_Services, Workspace_Services) {
	var BoardMap = {};

	//////////////////////// Views

	// ===== View for viewing a workspace via the board map

	BoardMap.Index = Backbone.View.extend({
		el: "<div>",
		_boards: [],

		initialize: function(options) {
			this.el.id = "board-map-popup-container";
			this.el.className = "popup-container";

			this.on("addBoard", this.addBoard);

			this._workspace = options.workspace;

			this.render();
		},

		render: function(){
			var that = this;

			$.get("/app/templates/boardMap/index.html", function(contents) {
				that.$el.html(_.template(contents, that.model));

				that.afterRender();

				that.unbind();
				that.bind();
			}, "text");
		},

		afterRender: function() {
            var boards = this._workspace.getBoards();

            this._boards = [];

            for (var i=0, boardsLength = boards.length; i<boardsLength; i+=1) {
            	this._boards.push(new BoardMap.Board({ model: boards[i], parent: this, workspace: this._workspace }));
            }

            this.drawBoardMap();
		},

		unbind: function() {
			try {
				this.$("#board-map-container").sortable("destroy");
			}
			catch (err) {}
		},

		bind: function() {
			var that = this;

    		this.$("#board-map-container").sortable({
    			items: ".board-map-board-container",
				stop: function( event, ui ) {
					var allBoards = $(this).children(),
						newBoardOrder = [];

					for (var i=0, boardsLength=allBoards.length; i<boardsLength; i+=1) {
						var boardIdParts = allBoards[i].id.split("_");

						if (boardIdParts.length == 2) newBoardOrder.push(boardIdParts[1]);
					}

					for (var i=0, boardsLength=that._boards.length; i<boardsLength; i+=1) {
						for (var j=0, newBoardOrderLength=newBoardOrder.length; j<newBoardOrderLength; j+=1) {
							if (that._boards[i].getBoardId() == newBoardOrder[j]) {
								that._boards[i].setBoardPosition((j+1));
								that._boards[i].render();
								break;
							}
						}
					}

					that.storeBoardPositions();
				}
			});
		},

		drawBoardMap: function(unbind) {
			this.$("#board-map-container").empty();

			this._boards.sort(function (a, b) { return a.getBoardPosition() > b.getBoardPosition() ? 1 : a.getBoardPosition() < b.getBoardPosition() ? -1 : 0; });

            for (var i=0, boardsLength = this._boards.length; i<boardsLength; i+=1) {
            	this.$("#board-map-container").append(this._boards[i].el);
            }	

            if (this._addBoardMap) this._addBoardMap.destroy();
            this._addBoardMap = new BoardMap.AddBoard({ parent: this });
            this.$("#board-map-container").append(this._addBoardMap.el);
		},

		storeBoardPositions: function() {
            var boardPositions = [];

            for (var i=0, boardsLength = this._boards.length; i<boardsLength; i+=1) {
            	boardPositions.push({
            		boardId: this._boards[i].getBoardId(),
            		position: this._boards[i].getBoardPosition()
            	});
            }

            Workspace_Services.UpdateBoardPositions(this._workspace.getWorkspaceId(), boardPositions);
		},

		addBoard: function() {
			var that = this;

            Board_Services.Insert(this.model.get("id"), "New Board", function(response) {
            	that._boards.push(new BoardMap.Board({ model: response.board, parent: that }));

            	that.drawBoardMap();

				that.unbind();
				that.bind();
            });
		},

		destroy: function() {
            for (var i=0, boardsLength = this._boards.length; i<boardsLength; i+=1) {
            	this._boards[i].destroy();
            }

			$(this.el).detach();
			this.remove();
		}
	});

	BoardMap.Board = Backbone.View.extend({
		el: "<div>",
	
		initialize: function(options) {
			this.el.id = "board-map-board_" + this.model.id;
			this.el.className = "board-map-board-container";

			this._parent = options.parent;

			this._workspace = options.workspace;
		
			this.render()
		},

		render: function() {
			var that = this;

			$.get("/app/templates/boardMap/board.html", function(contents) {
				that.$el.html(_.template(contents, that.model));

				that.unbind();
				that.bind();
			}, "text");
		},

		unbind: function() {
			this.$(".board-map-board").unbind("dblclick");
		},

		bind: function() {
			var that = this;

			this.$(".board-map-board").dblclick(function(e) {
				that._workspace.setSelectedBoard($(this).attr("element-id"));
				that._workspace.hideBoardMap();
			});
		},

		getBoardId: function() {
			return this.model.id;
		},

		getBoardPosition: function() {
			return this.model.position;
		},

		setBoardPosition: function(position) {
			this.model.position = position;
		},

		destroy: function() {
			$(this.el).detach();
			this.remove();
		}
	});

	BoardMap.AddBoard = Backbone.View.extend({
		el: "<div>",
	
		initialize: function(options) {
			this.el.id = "add-board-map-board";

			this._parent = options.parent;
		
			this.render()
		},

		render: function() {
			var that = this;

			$.get("/app/templates/boardMap/addBoard.html", function(contents) {
				that.$el.html(_.template(contents));

				that.bind();
			}, "text");
		},

		bind: function() {
			var that = this;

			this.$("#add-board").unbind("click");

			this.$("#add-board").click(function(e) {
				that._parent.trigger("addBoard");
			});
		},

		destroy: function() {
			$(this.el).detach();
			this.remove();
		}
	});

	return BoardMap;
});