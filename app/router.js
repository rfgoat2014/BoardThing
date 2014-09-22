define([
  "require", 
  "exports", 
  "module",
  "modules/home",
  "modules/main",
  "cookies"
],

function(require, exports, module, Home, Main, Painting) {
  "use strict";

  // External dependencies.
  var Backbone = require("backbone");

  // Defining the application router.
  module.exports = Backbone.Router.extend({
    routes: {
      "": "splash",
      "login": "login",
      "signup": "signup",
      "main": "main"
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
    }
  });
});
