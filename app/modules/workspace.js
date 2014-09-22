define([],

function() {
	var Workspace = {};

	// ---------- Models

	Workspace.Model = Backbone.Model.extend({
		url: function() {
    		return this.get("id") ? "/workspaces/" + this.get("id") : "/workspaces";
		}
	});


	// ---------- Views

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
				var newWorkspace = new Workspace.Model({
				    title: title.trim()
				});

				newWorkspace.save({}, {
					success: function(response) {
						if (response.get("status") == "success") {
							that.parent.trigger("workspaceAdded", response.get("workspace"));
						}
						else {
							that.$("#create-error-message").html(response.get("message"));
						}
					}
				});
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

	Workspace.ListItem = Backbone.View.extend({
    	el: "<tr>",

		initialize: function() {
			this.render();
      	},

		render: function(){
			var that = this;

			$.get("/app/templates/Workspace/listItem.html", function(contents) {
				that.$el.html(_.template(contents, that.model.toJSON()));

				that.afterRender();
			}, "text");
		},

		afterRender: function() {
			if (!this.model.get("isOwner")) this.$("#workspace-share_" + this.model.get("id"));
		}
	});

	return Workspace;
});