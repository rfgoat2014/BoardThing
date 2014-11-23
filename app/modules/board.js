define([
	"modules/CSS.helpers",
	"jquery"
],

function(CSSHelpers) {
	var Board = {};
	
  	Board.Index = Backbone.View.extend({
		el: "<div>",

    	// {{ Contructor }}
	
		initialize: function(options) {
			this.el.id = "board_" + this.model.id;
			this.el.className = "board outlined";

			this._workspace = options.workspace;

			this._mode = options.mode;
		},

		// {{ Object Building }}

		render: function() {
			var that = this;

			$.get("/app/templates/board/item.html", function(contents) {
				that.$el.html(_.template(contents, that.model));

				that.afterRender();
			}, "text");
		},

		afterRender: function() {
			this.$el.width(this.model.width);
			this.$el.height(this.model.height);

			this.$("#board-cards_" + this.model.id).width(this.model.width);
			this.$("#board-cards_" + this.model.id).height(this.model.height);

			this.$("#page-canvas_" + this.model.id).width(this.model.width);
			this.$("#page-canvas_" + this.model.id).height(this.model.height);

			if (this._mode == "boardMap") this.$el.addClass("cell");

			this.$("#board-cards_" + this.model.id).empty();

			this._workspace.unbindBoard(this.model.id);
			this._workspace.bindBoard(this.model.id);		

			this._workspace.getBoardItems(this.model.id);

			if (this._mode == "individual") this.center();
		},

		// {{ Getters }}

		getId: function() {
			return this.model.id;
		},

		getType: function() {
			return "board";
		},

		getXPos: function() {
			return this.$el.position().left+this._workspace.getBoardScrollWidth();
		},

		getYPos: function() {
			return this.$el.position().top+this._workspace.getBoardScrollHeight();
		},

		getWidth: function() {
			return this.model.width;
		},

		getHeight: function() {
			return this.model.height;
		},

		getPositionX: function() {
			return this.model.positionX;
		},

		getPositionY: function() {
			return this.model.positionY;
		},

		// {{ Setters }}

		setZoom: function(zoom) {
			CSSHelpers.setZoom(this.$el, zoom);
		},

		setPosition: function(position) {
			this._position = position;
		},

		// {{ Public Methods }}

		center: function() {
			CSSHelpers.center(this.$el, this._workspace.getZoom());
		},

		destroy: function() {
			$(this.el).detach();
			this.remove();
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