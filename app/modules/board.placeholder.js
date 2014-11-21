define([
	"jquery"
],

function() {
	var Placeholder = {};
	
  	Placeholder.Index = Backbone.View.extend({
		el: "<div>",

    	// {{ Contructor }}
	
		initialize: function(options) {
			this.el.id = "placeholder_" + this.cid;
			this.el.className = "dummy cell";

			this._workspace = options.workspace;

			this._width = options.width;
			this._height = options.height;

			this.$el.width(this._width);
			this.$el.height(this._height);
		},

		render: function() {
		},

		getType: function() {
			return "dummy";
		},

		getWidth: function() {
			return this._width;
		},

		getHeight: function() {
			return this._height;
		},

		destroy: function() {
			$(this.el).detach();
			this.remove();
		}
  	});

  	return Placeholder;
 });