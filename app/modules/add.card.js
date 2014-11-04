define([
	"modules/card.services",
	"modules/cluster.services",
	"jquery",
    'jqueryUI',
    'touchpunch',
	"spectrum"
],

function(Card_Services, Cluster_Services) {
	var AddCard = {};

	AddCard.Text = Backbone.View.extend({
    	el: "<div>",

    	_cardModel: null,
    	_isMobile: null,
    	_workspace: null,

		initialize: function(options) {
    		this.el.id = "card-create-container";

    		this._isMobile = options.isMobile;
    		this._workspace = options.workspace;
		},

		render: function() {
			var that = this;

			var template = "/app/templates/card/addText.html";
			if (this._isMobile) template = "/app/templates/card/addText.mobile.html";

			$.get(template, function(contents) {
				that.$el.html(_.template(contents, that.model));

				that.afterRender();				

				that.unbind();
				that.bind();
			}, "text");
		},

		afterRender: function() {
			var that = this;

			this.$el.addClass("card-input-container");

	    	this.$("#card-color-select").spectrum("destroy");

	    	this.$("#card-color-select").spectrum({
			    color: this._workspace.getSelectedColor(),
			    showInput: true,
			    className: "card-color-spectrum",
			    showInitial: true,
			    showPaletteOnly: true,
			    showPalette:true,
			    maxPaletteSize: 10,
			    preferredFormat: "hex",
			    localStorageKey: "spectrum.boardthing.card",
			    palette: ["rgb(255,255,153)", "rgb(255,255,0)", "rgb(255,204,102)", "rgb(255,153,0)", "rgb(255,102,255)", "rgb(255,0,204)", "rgb(204,153,255)", "rgb(153,153,255)", "rgb(102,255,255)", "rgb(51,204,255)", "rgb(153,255,102)", "rgb(102,255,0)", "rgb(255,255,255)", "rgb(204,204,204)", "rgb(255,0,51)"]
			});
			
			if (this._isMobile) this.$el.addClass("mobile");
    		else this.$el.addClass("desktop");
		},

		unbind: function() {
			this.$el.unbind("click");

			this.$("#cancel-card").unbind("click");
			this.$("#post-card").unbind("click");
			this.$("#card-text").unbind("click");
			this.$("#add-image-btn").unbind("click");
		},

		bind: function() {
			var that = this;

  			this.$el.click(function(e) {
				e.stopPropagation();
  			});

			this.$("#cancel-card").click(function(e) {
				e.stopPropagation();
				
				that._workspace.hideAddCard();
			});

			this.$("#post-card").click(function(e) {
				e.stopPropagation();
				
				that.saveCard();
			});

			this.$("#card-text").keypress(function(e) {
			  	var charCode = e.charCode || e.keyCode;

		        if ((e) && (!e.shiftKey) && (charCode == 13)) {
		        	e.preventDefault();

		        	that.saveCard();
		        }
			});
		},

		setCardModel: function(cardModel) {
			if (cardModel) {
				this._cardModel = cardModel;

				this.$("#card-text").val(cardModel.content)
				this.$("#card-color-select").spectrum("set", cardModel.color);

				this.$("#post-card").html("Update");
			}
			else {
				this._cardModel = null;

				this.$("#post-card").html("Post");
			}
		},

		saveCard: function(e) {
			var that = this,
				boardId = this._workspace.getSelectedBoardId();


			if (this.$("#card-text").val().trim().length > 0) {
				if (!this._cardModel) {
					var newCard = {
						boardId: boardId,
						content: this.$("#card-text").val(),
						color: this.$("#card-color-select").spectrum("get").toString()
					};
					
					Card_Services.InsertTextCard(boardId, newCard, function(response) {
						that._workspace.cardAdded(response.card);

						that._workspace.sendSocket(JSON.stringify({ 
							action:"boardCardAdded", 
							board: boardId, 
							card: newCard 
						}));
					});
				}
				else {
					var updateModel = null;

					if ((this._cardModel.cards == null)|| (this._cardModel.cards.length === 0)) {
						var updateModel = {
							id: this._cardModel.id,
							parentId: this._cardModel.parentId,
							content: this.$("#card-text").val(),
							color: this.$("#card-color-select").spectrum("get").toString()
						};

						Card_Services.UpdateTextCard(boardId, this._cardModel.id, updateModel, function(response) {
							that._workspace.sendSocket(JSON.stringify({ 
								action:"boardCardUpdated", 
								board: boardId, 
								card: updateModel 
							}));
						});
					}
					else {
						updateModel = {
							id: this._cardModel.id, 
							boardId: boardId,
			  				action: "update",
							color: this.$("#card-color-select").spectrum("get").toString()
			  			};

			  			if (this._cardModel.type == "text") updateModel.content = this.$("#card-text").val();
			  			else updateModel.title = this.$("#card-text").val();

						Cluster_Services.Insert(boardId, this._cardModel.id, updateModel, function(response) {
							that._workspace.sendSocket(JSON.stringify({ 
								action:"boardClusterUpdated", 
								board: boardId, 
								cluster: updateModel 
							}));
						});
					}
					
					that._workspace.cardEdited(updateModel);
				}
			}

			this._workspace.hideAddCard();
		},

		focusCardText: function() {
			this.$("#card-text").focus();
		},

		clearCardText: function() {
			this.$("#card-text").val("");
		}
	});

	AddCard.Image = Backbone.View.extend({
    	el: "<div>",
    	_isMobile: null,
    	_workspace: null,
    	_cardsAdded: false,

		initialize: function(options) {
    		this.el.id = "add-image-container";

    		this._isMobile = options.isMobile;
    		this._workspace = options.workspace;
		},

		render: function() {
			var that = this;

			var template = "/app/templates/card/addImage.html";
			if (this._isMobile) template = "/app/templates/card/addImage.mobile.html";

			$.get(template, function(contents) {
				that.$el.html(_.template(contents, that.model));

				that.afterRender();				

				that.unbind();
				that.bind();
			}, "text");
		},

		afterRender: function() {
			var that = this,
				cardColor = this._workspace.getSelectedColor();

	    	this.$("#upload-card-color-select").spectrum("destroy");

	    	this.$("#upload-card-color-select").spectrum({
			    color: cardColor,
			    showInput: true,
			    className: "upload-image-spectrum",
			    showInitial: true,
			    showPaletteOnly: true,
			    showPalette:true,
			    maxPaletteSize: 10,
			    preferredFormat: "hex",
			    localStorageKey: "spectrum.boardthing.card",
			    palette: ["rgb(255,255,153)", "rgb(255,255,0)", "rgb(255,204,102)", "rgb(255,153,0)", "rgb(255,102,255)", "rgb(255,0,204)", "rgb(204,153,255)", "rgb(153,153,255)", "rgb(102,255,255)", "rgb(51,204,255)", "rgb(153,255,102)", "rgb(102,255,0)", "rgb(255,255,255)", "rgb(204,204,204)", "rgb(255,0,51)"],
			    change: function(color) {
			    	that.$("#link-card-color-select").spectrum("set", color.toString());
				}
			});
	    
	    	this.$("#link-card-color-select").spectrum("destroy");

	    	this.$("#link-card-color-select").spectrum({
			    color: cardColor,
			    showInput: true,
			    className: "link-image-spectrum",
			    showInitial: true,
			    showPaletteOnly: true,
			    showPalette:true,
			    maxPaletteSize: 10,
			    preferredFormat: "hex",
			    localStorageKey: "spectrum.boardthing.card",
			    palette: ["rgb(255,255,153)", "rgb(255,255,0)", "rgb(255,204,102)", "rgb(255,153,0)", "rgb(255,102,255)", "rgb(255,0,204)", "rgb(204,153,255)", "rgb(153,153,255)", "rgb(102,255,255)", "rgb(51,204,255)", "rgb(153,255,102)", "rgb(102,255,0)", "rgb(255,255,255)", "rgb(204,204,204)", "rgb(255,0,51)"],
			    change: function(color) {
			    	that.$("#upload-card-color-select").spectrum("set", color.toString());
				}
			});

	    	var filesToUpload = [];

			this.$('#imageUpload').fileupload({ 	
		        dataType: 'json',
    			disableImageResize: false,
			    imageMaxWidth: 1000,
			    imageMaxHeight: 1000,
			    imageCrop: false,
			    autoUpload: false,
		        add: function (e, data) {
		        	that._cardsAdded = true;

		            data.context = that.$('#upload-image-button').click(function () {
						that.$('#progress').show();

                    	data.submit();
	                });

	            	that.$("#selected-files-container").show();
		            for (var i=0, filesLength=data.files.length; i<filesLength; i+=1) {
		            	that.$("#selected-files-container").append("<div class=\"file-to-upload\">" + data.files[i].name + "</div>");
		            }
		        },
		        done: function (e, data) {
		        	if (data.result.message.toLowerCase() == "success") {
			        	var addedIdea = data.result.card;
			        	addedIdea.title = that.$("#photo-upload-title").val();
			        	addedIdea.color = that.$("#upload-card-color-select").spectrum("get").toString();

			        	Card_Services.UpdateImageCard(that.model.id, addedIdea.id, {
				        	title: that.$("#photo-upload-title").val(),
							color: that.$("#upload-card-color-select").spectrum("get").toString()
				        });

		        		that._workspace.cardAdded(addedIdea);
		        	}

					that._workspace.hideAddCard();

					that.removeAddImage();
		        },
		        progressall: function (e, data) {
		            var progress = parseInt(data.loaded / data.total * 100, 10);

		            $('#progress .progress-bar').css(
		                'width',
		                progress + '%'
		            );
		        }
		    });

			if (this._isMobile) this.$el.addClass("mobile");
	    	else this.$el.addClass("desktop");
		},

		unbind: function() {
			this.$el.unbind("click");

			this.$(".cancel-card").unbind("click");
			this.$("#link-to-photo-header").unbind("click");
			this.$("#upload-photo-header").unbind("click");

			this.$("#add-image-button").unbind("click");
			this.$("#back-image-button").unbind("click");
			this.$("#photo-url-title").unbind("keyup");
			this.$("#photo-upload-title").unbind("keyup");
			this.$("#upload-image-button").unbind("click");
		},

		bind: function() {
			var that = this;
			
  			this.$el.click(function(e) {
				e.stopPropagation();
  			});

			this.$(".cancel-card").click(function(e) {
				e.stopPropagation();
				
				that._workspace.hideAddImage();

				that.destroy();
			});

			this.$("#link-to-photo-header").click(function(e) {
				e.stopPropagation();
				
	    		that.$("#add-upload-image-body").hide();
	    		that.$("#add-linked-image-body").show();

	    		that.$("#link-to-photo-header").removeClass('popup-inactive-item').removeClass('popup-active-item').addClass('popup-active-item');
	    		that.$("#upload-photo-header").removeClass('popup-inactive-item').removeClass('popup-active-item').addClass('popup-inactive-item');
			});

			this.$("#upload-photo-header").click(function(e) {
				e.stopPropagation();
				
	    		that.$("#add-upload-image-body").show();
	    		that.$("#add-linked-image-body").hide();

	    		that.$("#link-to-photo-header").removeClass('popup-inactive-item').removeClass('popup-active-item').addClass('popup-inactive-item');
	    		that.$("#upload-photo-header").removeClass('popup-inactive-item').removeClass('popup-active-item').addClass('popup-active-item');
			});

			this.$("#add-image-button").click(function(e) {
				e.stopPropagation();

				var urlValid = true;

				if (that.$("#photo-url-location").val().trim().length == 0) {
					that.$("#photo-url-location").css("border", "1px solid #ff0000");

					urlValid = false;
				}
				else that.$("#photo-url-location").css("border", "1px solid #b9b9b9");

				if (urlValid) {
					that.$("#loading-container").show();
					that.$("#photo-url-title").prop('disabled', true);
					that.$("#photo-url-location").prop('disabled', true);
					that.$("#photo-upload-title").prop('disabled', true);
					that.$("#add-image-button").prop('disabled', true);
					that.$("#upload-image-button").prop('disabled', true);

			        imageValues = {
			        	title: that.$("#photo-url-title").val(),
						color: that.$("#link-card-color-select").spectrum("get").toString(),
			            imageLocation: that.$("#photo-url-location").val()
			        };

			        Card_Services.DownloadImage(that.model.id, imageValues, function(response) {
			        	if (response.message == "success") {
							that._workspace.cardAdded(response.card);

							that._workspace.hideAddImage();

							that.destroy();
			        	}
			        	else {
							that.$("#loading-container").hide();
							that.$("#photo-url-title").prop('disabled', false);
							that.$("#photo-url-location").prop('disabled', false);
							that.$("#photo-upload-title").prop('disabled', false);
							that.$("#add-image-button").prop('disabled', false);
							that.$("#upload-image-button").prop('disabled', false);

			        		that.$("#add-linked-image-body").hide();
			        		that.$("#add-linked-error-body").show();
			        		that.$("#back-image-error").html("The image you selected could not be uploaded");
			        	}
		            });
				}
			});

			this.$("#back-image-button").click(function(e) {
				that.$("#add-linked-image-body").show();
				that.$("#add-linked-error-body").hide();
			});

			this.$("#photo-url-title").keyup(function(e) {
    			that.$("#photo-upload-title").val(that.$("#photo-url-title").val());
			});

			this.$("#photo-upload-title").keyup(function(e) {
    			that.$("#photo-url-title").val(that.$("#photo-upload-title").val());
			});

			this.$("#upload-image-button").click(function(e) {
				if (that._cardsAdded) {
					that.$("#loading-container").show();
					that.$("#photo-url-title").prop('disabled', true);
					that.$("#photo-url-location").prop('disabled', true);
					that.$("#photo-upload-title").prop('disabled', true);
					that.$("#add-image-button").prop('disabled', true);
					that.$("#upload-image-button").prop('disabled', true);

		        	that.$("#progress").show();
	        	}
			});
		},

        urlEndsWith: function(str, suffix) {
		    return str.indexOf(suffix, str.length - suffix.length) !== -1;
		},

		destroy: function() {
			$('#imageUpload').detach();
			this.$el.detach();
			this.remove();
		}
	});

	return AddCard;
});