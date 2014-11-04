define([
	"modules/user.services",
	"jquery"
],
	
function(User_Services) {
	var Home = {};

	// ===== View when you first come to BoardThing

	Home.Splash = Backbone.View.extend({
    	el: "<div>",

		initialize: function() {
			this.el.id = "splash-container";

			this.render();
      	},

      	events: {
      		"click #signup-button": "signUp",
      		"click #login-button": "login"
      	},

		render: function(){
			var that = this;

			$.get("/app/templates/home/splash.html", function(contents) {
				that.$el.html(_.template(contents));
			}, "text");
		},

		signUp: function() {
  			Backbone.history.navigate("signup", true);
		},

		login: function() {
			Backbone.history.navigate("login", true);
		}
	});

	// ===== View allowing user login to BoardThing

	Home.Login = Backbone.View.extend({
    	el: "<div>",

		initialize: function() {
			this.el.id = "splash-container";

			this.render();
      	},

      	events: {
      		"click #splash-logo": "index",
      		"click #signup-button": "signUp",
      		"click #login-button": "login",
      		"click #create-account-link": "signUp",
      		"click #log-in-button": "loginUser"
      	},

		render: function(){
			var that = this;

			$.get("/app/templates/home/login.html", function(contents) {
				that.$el.html(_.template(contents));
			}, "text");
		},

		index: function() {
  			Backbone.history.navigate("", true);
		},

		signUp: function() {
  			Backbone.history.navigate("signup", true);
		},

		login: function() {
			Backbone.history.navigate("login", true);
		},

		loginUser: function() {
			var that = this;

			var email = this.$("#email").val();
			var password = this.$("#password").val();

			if (((email) && (email.trim().toLowerCase().length > 0)) && 
				((password) && (password.trim().toLowerCase().length > 0))) {
				User_Services.Athenticate(email, password, function(response) {
					if (response.status == "success") {
						Backbone.history.navigate("/main", true);
					}
					else {
						that.$("#password").val("");
						that.$("#login-error-message").html(response.message);
					}
				});
			}
			else {
				if (((!email) || (email.trim().toLowerCase().length == 0)) && ((!password) || (password.trim().toLowerCase().length == 0))) {
					this.$("#login-error-message").html("E-mail and password required");
				}
				else if ((!email) || (email.trim().toLowerCase().length == 0)) {
					this.$("#login-error-message").html("E-mail required");
				}
				else if ((!password) || (password.trim().toLowerCase().length == 0)) {
					this.$("#login-error-message").html("Password required");
				}
			}
		}
	});

	// ===== View allowing user sign up to BoardThing

	Home.SignUp = Backbone.View.extend({
    	el: "<div>",
    	id: "splash-container",

		initialize: function() {
			this.el.id = "splash-container";

			this.render();
      	},

      	events: {
      		"click #splash-logo": "index",
      		"click #signup-button": "signUp",
      		"click #login-button": "login",
      		"click #create-account-button" : "createAcount"
      	},

		render: function(){
			var that = this;

			$.get("/app/templates/home/signUp.html", function(contents) {
				that.$el.html(_.template(contents));
			}, "text");
		},

		index: function() {
  			Backbone.history.navigate("", true);
		},

		signUp: function() {
  			Backbone.history.navigate("signup", true);
		},

		login: function() {
			Backbone.history.navigate("login", true);
		},

		createAcount: function() {
			var that = this;

			var username = this.$("#username").val();
			var email = this.$("#email").val();
			var password = this.$("#password").val();
			var passwordConfirm = this.$("#password-confirm").val();

			if (((username) && (username.trim().toLowerCase().length > 0)) && 
				((email) && (email.trim().toLowerCase().length > 0)) && 
				((password) && (password.trim().toLowerCase().length > 0))) {
				if (password == passwordConfirm) {
					var emailFilter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
		
					if (emailFilter.test(email)) {
						User_Services.Insert(username, email, password, function(response) {
							if (response.status.trim().toLowerCase() == "success") {
								User_Services.Athenticate(email, password, function(loginResponse) {
									if (loginResponse.status == "success") {
										Backbone.history.navigate("/main", true);
									}
									else {
										that.$("#password").val("");
										that.$("#password-confirm").val("");
										that.$("#login-error-message").html(loginResponse.message);
									}
								});
							}
							else {
								that.$("#password").val("");
								that.$("#password-confirm").val("");
								that.$("#signup-error-message").html(response.message);
							}
						});
					}
					else {
						this.$("#password").val("");
						this.$("#password-confirm").val("");
						this.$("#signup-error-message").html("Invalid e-mail");
					}
				}
				else {
					this.$("#password").val("");
					this.$("#password-confirm").val("");
					this.$("#signup-error-message").html("Passwords much match");
				}
			}
			else {
				if (((!username) || (username.trim().toLowerCase().length == 0)) && ((!password) || 
					(!email) || (email.trim().toLowerCase().length == 0)) && 
					((!password) || (password.trim().toLowerCase().length == 0))) {
					this.$("#signup-error-message").html("Username, e-mail and password required");
				}
				if (((!email) || (email.trim().toLowerCase().length == 0)) && ((!password) ||
					(password.trim().toLowerCase().length == 0))) {
					this.$("#signup-error-message").html("E-mail and password required");
				}
				else if ((!email) || (email.trim().toLowerCase().length == 0)) {
					this.$("#signup-error-message").html("E-mail required");
				}
				else if ((!password) || (password.trim().toLowerCase().length == 0)) {
					this.$("#signup-error-message").html("Password required");
				}
			}
		}
	});

	return Home;
});