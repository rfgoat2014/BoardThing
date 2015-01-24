// This is the runtime configuration file.  It complements the Gruntfile.js by
// supplementing shared properties.
require.config({
	paths: {
		"almond": "/libs/almond",
		"underscore": "/libs/lodash.underscore",
		"jquery": "/libs/jquery",
		"jqueryUI": "/libs/jquery-ui.min",
    	"touchpunch": "/libs/jquery.ui.touch-punch.min",
    	"cookies": "/libs/jquery.cookie",
		"backbone": "/libs/backbone",
    	"spectrum": "/libs/spectrum"
	},
	shim: {
		"jqueryUI": {
			deps: ["jquery"],
			exports: "jqueryUI"
		},
	    'touchpunch': {
	        deps: ['jquery', 'jqueryUI' ],
	        exports: 'touchpunch'
	    },
	    "cookie": {
	        deps: ["jquery"],
	        exports: "cookies"
	    },
	    'spectrum': {
	        deps: ['jquery'],
	        exports: 'spectrum'
	    }
	}
});
