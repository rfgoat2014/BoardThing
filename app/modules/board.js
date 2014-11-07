define([
	"jquery"
],

function() {
	var Board = {};
	
  	Board.Item = Backbone.View.extend({
		el: "<div>",

		_boardRendered: false,
	
		initialize: function(options) {
			this.el.id = "board-_" + this.model.id;
			this.el.className = "board";

			this._workspace = options.workspace;

			this._boardRendered = false;
		
			this.render();
		},

		render: function() {
			var that = this;

			$.get("/app/templates/board/item.html", function(contents) {
				that.$el.html(_.template(contents, that.model));

				that.afterRender();
			}, "text");
		},

		afterRender: function() {
			this.$("#board-cards_" + this.model.id).empty();

			this.$("#board-cards_" + this.model.id).width(this.model.width);
			this.$("#board-cards_" + this.model.id).height(this.model.height);

			this.$("#page-canvas_" + this.model.id).width(this.model.width);
			this.$("#page-canvas_" + this.model.id).height(this.model.height);

			this._boardRendered = true;

			this._workspace.unbindBoard(this.model.id);
			this._workspace.bindBoard(this.model.id);		

			if (this._renderItems) this._workspace.getBoardItems(this.model.id);
		},

		getId: function() {
			return this.model.id;
		},

		getWidth: function() {
			return this.model.width;
		},

		getHeight: function() {
			return this.model.height;
		},

		renderBoardItems: function() {
			if (this._boardRendered) this._workspace.getBoardItems(this.model.id);
			else this._renderItems = true;
		}
  	});

	Board.List = Backbone.View.extend({
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

	return Board;
});