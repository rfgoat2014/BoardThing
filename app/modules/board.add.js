define(["jquery"],

function() {
	var AddBoard = {};

	AddBoard.Index = Backbone.View.extend({
		el: "<div>",

    	// {{ Contructor }}
	
		initialize: function(options) {
			this.el.id = "add-board_" + options.positionY + "_" + options.positionX;
			this.el.className = "add-board cell";

			this._positionX = options.positionX;
			this._positionY = options.positionY;
			
			this._direction = options.direction;
			this._workspace = options.workspace;
		
			if (this._direction == "x") {
				this._width = 100;
				this._height = this._workspace.getBoardHeight();
			}
			else if (this._direction == "y") {
				this._width = this._workspace.getBoardWidth();
				this._height = 100;
			}

			this.render()
		},

		// {{ Object Building }}

		render: function() {
			var that = this;

			$.get("/app/templates/board.add/index.html", function(contents) {
				that.$el.html(_.template(contents));

				that.afterRender()

				that.unbind();
				that.bind();
			}, "text");
		},

		afterRender: function() {
			this.$el.width(this._width);
			this.$el.height(this._height);
		},

		// {{ Event Binding }}

		unbind: function() {
			this.$el.unbind("click");
		},

		bind: function() {
			var that = this;

			this.$el.click(function(e) {
				that._workspace.addBoard(that._positionX, that._positionY);
			});
		},

		// {{ Getters }}

		getPositionX: function() {
			return this._positionX;
		},

		getPositionY: function() {
			return this._positionY;
		},

		getType: function() {
			return "addBoard";
		},

		getWidth: function() {
			return this._width;
		},

		getHeight: function() {
			return this._height;
		},

		// {{ Setters }}

		setPosition: function(positionX, positionY) {
			this._positionX = positionX;
			this._positionY = positionY;
		},

		// {{ Public Methods }}

		destroy: function() {
			$(this.el).detach();
			this.remove();
		}
	});

	AddBoard.Dialog = Backbone.View.extend({
		el: "<div>",

    	// {{ Contructor }}
	
		initialize: function(options) {
			this._position = options.position;
		}
	});	

	return AddBoard;
});