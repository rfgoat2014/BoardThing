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
		_boards: [],

		initialize: function(options) {
			this.el.id = "board-map-popup-container";
			this.el.className = "popup-container";

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
            	this._boards.push(new Board.List({ model: boards[i], parent: this, workspace: this._workspace }));
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

					that._boards.sort(function (a, b) { return a.getBoardPosition() > b.getBoardPosition() ? 1 : a.getBoardPosition() < b.getBoardPosition() ? -1 : 0; });

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

            this._addBoardMap = new AddBoard.New({ parent: this });
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

            Workspace_Services.UpdateBoardPositions(this._workspace.getId(), boardPositions);
		},

		addBoard: function() {
			var that = this;

            Board_Services.Insert(this._workspace.getId(), "New Board", function(response) {
            	if (response.status == "success") {
	            	that._boards.push(new Board.List({ model: response.board, workspace: that._workspace, parent: that }));

	            	that._workspace.addBoard(response.board);

	            	that.drawBoardMap();

					that.unbind();
					that.bind();
				}
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

	return BoardMap;
});