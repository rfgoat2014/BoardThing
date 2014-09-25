define([
	"raphael"
],

function() {
	var BoardMap = {};

	//////////////////////// Views

	// ===== View for viewing a workdspace

	BoardMap.Index = Backbone.View.extend({
		el: "<div>",

		initialize: function(options) {
			this.el.id = "board-map-popup-container";
			this.el.className = "popup-container";


			this.render();
		},

		render: function(){
			var that = this;

			$.get("/app/templates/boardMap/index.html", function(contents) {
				that.$el.html(_.template(contents, that.model.toJSON()));

				that.afterRender();
			}, "text");
		},

		afterRender: function() {
            this._paper = Raphael("board-map", this.$("#board-map-container").width(), this.$("#board-map-container").height());
		}
	});

	return BoardMap;
});