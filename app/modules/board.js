define([
	"jquery"
],

function() {
	var Board = {};
	
  	Board.Item = Backbone.View.extend({
		el: "<div>",

		_boardRendered: false,
	
		initialize: function(options) {
			this.el.id = "board_" + this.model.id;
			this.el.className = "board";

			this._workspace = options.workspace;

			this._mode = options.mode;

			this._boardRendered = false;
		},

		render: function() {
			var that = this;

			$.get("/app/templates/board/item.html", function(contents) {
				that.$el.html(_.template(contents, that.model));

				that.afterRender();

				that.unbind();
				that.bind();
			}, "text");
		},

		afterRender: function() {
			this.$el.width(this.model.width);
			this.$el.height(this.model.height);

			this.$el.addClass("outlined")

			if (this._mode == "boardMap") this.$el.addClass("cell");

			this.$("#board-cards_" + this.model.id).empty();

			this._boardRendered = true;

			this._workspace.unbindBoard(this.model.id);
			this._workspace.bindBoard(this.model.id);		

			this._workspace.getBoardItems(this.model.id);
		},

		unbind: function() {
			this.$el.unbind("mouseover");
			this.$el.unbind("mousemove");
			this.$el.unbind("mouseout");
		},

		bind: function() {
			var that = this;
		    
		    this.$el.mouseover(function(event) {
		    	that._workspace.setCurrentMousePosition({ x: event.pageX-that.$el.offset().left, y: event.pageY-that.$el.offset().top});
		    });

		    this.$el.mousemove(function(event) {
		    	that._workspace.setCurrentMousePosition({ x: event.pageX-that.$el.offset().left, y: event.pageY-that.$el.offset().top});
		    });

		    this.$el.mouseout(function(event) {
		    	that._workspace.setCurrentMousePosition({ x: -1, y: -1});
		    });
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

		getPosition: function() {
			return this.model.position;
		}
  	});
	
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