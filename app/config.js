// This is the runtime configuration file.  It complements the Gruntfile.js by
// supplementing shared properties.
require.config({
	paths: {
		"almond": "/libs/almond",
		"underscore": "/libs/lodash.underscore",
		"jquery": "/libs/jquery",
		"jqueryUI": "/libs/jquery-ui.min",
    	"cookies": "/libs/jquery.cookie",
		"backbone": "/libs/backbone",
		"raphael": "/libs/raphael-min",
	},
	shim: {
		"jqueryUI": {
			deps: ["jquery"],
			exports: "jqueryUI"
		},
	    "cookie": {
	        deps: ["jquery"],
	        exports: "cookies"
	    }
	}
});
