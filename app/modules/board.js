define([
	"jquery"
],

function() {
	var Board = {};
	
  	Board.Add = Backbone.View.extend({
		el: "<div>",
	
		initialize: function(options) {
			this.el.className = "cell";

			this.render();
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