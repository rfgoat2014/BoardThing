define([
	"modules/workspace",
	"modules/workspace.services"
],

function(Workspace, Workspace_Services) {
	var Main = {};

	// ---------- Views

	Main.Index = Backbone.View.extend({
    	el: "<div>",
    	_workspaces: [],

		initialize: function() {
			this.on("cancelAddWorkspace", this.cancelAddWorkspace);
			this.on("workspaceAdded", this.workspaceAdded);
			this.on("openWorkspace", this.openWorkspace);

			this.render();
      	},

      	events: {
      		"click #create-workspace-button": "createWorkspace"
      	},

		render: function(){
			var that = this;

			$.get("/app/templates/main/index.html", function(contents) {
				that.$el.html(_.template(contents));
			
				that.afterRender();
			}, "text");
		},

		afterRender: function() {
			var that = this;

			Workspace_Services.GetAll(function(response) {
				if (response.status == "success") {
					var workspaces = response.workspaces;

					for (var i=0, workspacesLength=workspaces.length; i<workspacesLength; i+=1) {
						that._workspaces.push(new Workspace.ListItem({ model: new Workspace.Model(workspaces[i]), parent: that }));
					}

					that.renderWorkspaces();
				}
			});
		},

		renderWorkspaces: function() {
			this.$("#workspace-list-body").empty();

			this._workspaces.sort(function (a, b) {
				return a.model.get("created") < b.model.get("created") ? 1 : a.model.get("created") > b.model.get("created") ? -1 : 0; 
			});

			for (var i=0, workspacesLength=this._workspaces.length; i<workspacesLength; i++) {
				this.$("#workspace-list-body").append(this._workspaces[i].el);
			}
		},

		createWorkspace: function() {
			this._addWorkspace = new Workspace.Add({ parent: this });

			this.$("#modal-overlay").html(this._addWorkspace.el);
			this.$("#modal-overlay").show();
		},

		workspaceAdded: function(workspace) {
			this._addWorkspace.removeDialog();

			this.$("#modal-overlay").empty();
			this.$("#modal-overlay").hide();

			this._workspaces.push(new Workspace.ListItem({ model: new Workspace.Model(workspace), parent: this }));

			this.renderWorkspaces();
		},

		cancelAddWorkspace: function() {
			this._addWorkspace.removeDialog();

			this.$("#modal-overlay").empty();
			this.$("#modal-overlay").hide();
		}
	});

	return Main;
});