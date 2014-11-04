define(["jquery"],

function() {
	var AddBoard = {};

	AddBoard.New = Backbone.View.extend({
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
				that._parent.addBoard();
			});
		},

		destroy: function() {
			$(this.el).detach();
			this.remove();
		}
	});

	return AddBoard;
});