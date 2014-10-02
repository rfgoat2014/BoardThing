define([
	"raphael",
	"modules/boardMap",
	"modules/card.services",
	"modules/workspace.services"
],

function(raphael, BoardMap, Card_Services, Workspace_Services) {
	var Workspace = {};

	//////////////////////// Views

	// ===== View for viewing a workdspace

	Workspace.Index = Backbone.View.extend({
		el: "<div>",
		_paper: null,
		_selectedBoard: null,

		initialize: function(options) {
			this.render();
		},

      	events: {
      		"click #view-board-map": "viewBoardMap"
      	},

		render: function() {
			var that = this;

			$.get("/app/templates/workspace/index.html", function(contents) {
				var boards = that.model.get("boards");

				for (var i=0, boardsLength=boards.length; i<boardsLength; i+=1) {
					if ((that.model.get("startBoardId")) && (that.model.get("startBoardId").toString() == boards[i].id.toString())) that._selectedBoard = boards[i];
					else if ((!that.model.get("startBoardId")) && (boards[i].position == 1)) that._selectedBoard = boards[i];
				
					if (that._selectedBoard) break;
				}

				if ((!that._selectedBoard) && (boards.length > 0)) that._selectedBoard = boards[0];
				else if (!that._selectedBoard) that._selectedBoard = { id: "", title: "", cards: [] };

				that.$el.html(_.template(contents, that._selectedBoard));
			
				that.afterRender();
			}, "text");
		},

		afterRender: function() {
			var that =this;

			this.setupBoard();

			var boards = this.model.get("boards");

			for (var i=0, boardsLength=boards.length; i<boardsLength; i+=1) {
				Card_Services.Get(boards[i].id, function(response) {
					if (response.status == "success") {
						for (var j=0, boardsLength=boards.length; j<boardsLength; j+=1) {
							if (response.board.id.toString() == boards[j].id.toString()) {
								boards[j].cards = response.board.cards;
								break;
							}
						}

						if (response.board.id.toString() == that._selectedBoard.id.toString()) {
							that._selectedBoard.cards = response.board.cards;
						
							that.drawBoard();
						}
					}
				});
			}
		},

		setupBoard: function() {
			if (this._paper) {
				this._paper.remove();
				this._paper = null;
			}
			
			this.$("#board").empty();

			this.$("#board").width(this._selectedBoard.width);
			this.$("#board").height(this._selectedBoard.height);

			var overflowWidth = this._selectedBoard.width - $(window).width(),
				overflowHeight = this._selectedBoard.height - $(window).height();

			if (overflowWidth > 0) this.$("#board-container").scrollLeft(overflowWidth/2);
			if (overflowHeight > 0) this.$("#board-container").scrollTop(overflowHeight/2);

			this._paper = Raphael(document.getElementById("board"), this._selectedBoard.width, this._selectedBoard.height);
		},

		drawBoard: function() {
			console.log("Drawing Cards");
		},

		viewBoardMap: function() {
			this._boardMap = new BoardMap.Index({ model: this.model});

			this.$("#overlay").html(this._boardMap.el);
			this.$("#overlay").show();
		}
	});

	// ===== View to create a new workspace

	Workspace.Add = Backbone.View.extend({
    	el: "<div>",

		initialize: function(options) {
			this.el.id = "add-workspace";
			this.el.className = "popup-container";

			this.parent = options.parent;

			$(this.el).click(function(e) {
				e.stopPropagation();
				e.preventDefault();
			});

			this.render();
      	},

      	events: {
      		"click #cancel-button": "cancel",
      		"click #add-button": "create"
      	},

		render: function() {
			var that = this;

			$.get("/app/templates/workspace/add.html", function(contents) {
				that.$el.html(_.template(contents));
			}, "text");
		},

		cancel: function() {
			this.parent.trigger("cancelAddWorkspace");
		},

		create: function() {
			var that = this;

			this.$("#create-error-message").empty();

			var title = this.$("#title").val();

			if ((title) && (title.trim().length > 0)) {
				Workspace_Services.Insert(title.trim(), function(response) {
					if (response.status == "success") that.parent.trigger("workspaceAdded", response.workspace);
					else that.$("#create-error-message").html(response.message);
				})
			}
			else {
				this.$("#create-error-message").html("Workspaces require a title");
			}
		},

		removeDialog: function() {
			$(this.el).detach();
			this.remove();
		}
	});

	// ===== View of workspace on main page

	Workspace.ListItem = Backbone.View.extend({
    	el: "<tr>",

		initialize: function(options) {
			this.render();

			this.parent = options.parent;
      	},

		render: function(){
			var that = this;

			$.get("/app/templates/workspace/listItem.html", function(contents) {
				that.$el.html(_.template(contents, that.model.toJSON()));

				that.afterRender();

				that.bindEvents();
			}, "text");
		},

		afterRender: function() {
			if (!this.model.get("isOwner")) this.$("#workspace-share_" + this.model.get("id"));
		},

		bindEvents: function() {
			var that = this;

			this.$el.click(function(e) {
				e.stopPropagation();
				e.preventDefault();

				that.parent.trigger("viewWorkspace", that.model.get("id"));
			});
		}
	});

	//////////////////////// Models

	Workspace.Model = Backbone.Model.extend();

	return Workspace;
});