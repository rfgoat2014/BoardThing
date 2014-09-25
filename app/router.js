define([
  "require", 
  "exports", 
  "module",
  "modules/home",
  "modules/main",
  "modules/workspace",
  "modules/user.services",
  "modules/workspace.services",
  "modules/utils.services",
  "cookies"
],

function(require, exports, module, Home, Main, Workspace, User_Services, Workspace_Services, Utils_Services) {
  "use strict";

  // External dependencies.
  var Backbone = require("backbone");

  // Defining the application router.
  module.exports = Backbone.Router.extend({
    routes: {
      "": "splash",
      "login": "login",
      "signup": "signup",
      "main": "main",
      "workspace/:id": "workspace"
    },

    splash: function() {
      var splashView = new Home.Splash();
      
      $("#page-content").html(splashView.el);
    },

    login: function() {
      var loginView = new Home.Login();
      
      $("#page-content").html(loginView.el);
    },

    signup: function() {
      var signUpView = new Home.SignUp();
      
      $("#page-content").html(signUpView.el);
    },

    main: function() {
      var mainView = new Main.Index();
      
      $("#page-content").html(mainView.el);
    },

    workspace: function(id) {
      window.onerror = function (e, url, line) { 
        Utils_Services.PostError(e, url, line, navigator.appName, navigator.userAgent);
      }

      $("html").unbind('click');

      User_Services.CheckAuthenticated(function (userResponse) {
        if (($.cookie("BoardThing_rememberMe_sessionId") != undefined) && ($.cookie("BoardThing_rememberMe_sessionId") != null)) {
          $.cookie("BoardThing_sessionId", $.cookie("BoardThing_rememberMe_sessionId"), { path: '/' });
        }

        if (userResponse.status.trim().toLowerCase() == "success") {
          $.cookie("BoardThing_rememberMe_sessionId", userResponse.user.sessionId, { path: '/' });
          $.cookie("BoardThing_sessionId", userResponse.user.sessionId, { path: '/' });
          $.cookie("BoardThing_username", userResponse.user.username, { path: '/' });
        }

        var workspaceModel = new Workspace.Model({ id: id });
        
        Workspace_Services.Get(id, function(workspaceResponse) {
          if ((workspaceResponse != null) && (workspaceResponse.status == "success")) {
            $("#page-loading-status").html("Creating workspace layout");

            var displayView = new Workspace.Index({ model: new Workspace.Model(workspaceResponse.workspace) });

            $("body").empty();
            $("body").html(displayView.el);
          }
        });
      });
    }
  });
});
