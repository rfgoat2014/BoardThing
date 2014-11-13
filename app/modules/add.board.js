define(["jquery"],

function() {
	var AddBoard = {};

	AddBoard.New = Backbone.View.extend({
		el: "<div>",

    	// {{ Contructor }}
	
		initialize: function(options) {
			this.el.id = "add-board-map-board";

			this._parent = options.parent;
		
			this.render()
		},

		// {{ Object Building }}

		render: function() {
			var that = this;

			$.get("/app/templates/boardMap/addBoard.html", function(contents) {
				that.$el.html(_.template(contents));

				that.bind();
			}, "text");
		},

		// {{ Event Binding }}

		bind: function() {
			this.$("#add-board").unbind("click");
		},


		bind: function() {
			var that = this;

			this.$("#add-board").click(function(e) {
				that._parent.addBoard();
			});
		},

		// {{ Public Methods }}

		destroy: function() {
			$(this.el).detach();
			this.remove();
		}
	});

	return AddBoard;
});