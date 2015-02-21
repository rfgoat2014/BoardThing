define([
	"modules/card.services",
	"modules/cluster.services",
	"uiwidget",
    'fileupload',
    "loadimage",
    "canvastoblob",
    "iframetransport",
    "fileuploadprocess",
    "fileuploadimage",
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

			var template = "/app/templates/card/addCard.html";
			if (this._isMobile) template = "/app/templates/card/addCard.mobile.html";

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

			if (this._isMobile) this.$el.addClass("mobile");
    		else this.$el.addClass("desktop");

	    	this.$("#card-color-select").spectrum("destroy");
	    	this.$("#upload-card-color-select").spectrum("destroy");
	    	this.$("#link-card-color-select").spectrum("destroy");

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
			    palette: ["rgb(255,255,153)", "rgb(255,255,0)", "rgb(255,204,102)", "rgb(255,153,0)", "rgb(255,102,255)", "rgb(255,0,204)", "rgb(204,153,255)", "rgb(153,153,255)", "rgb(102,255,255)", "rgb(51,204,255)", "rgb(153,255,102)", "rgb(102,255,0)", "rgb(255,255,255)", "rgb(204,204,204)", "rgb(255,0,51)"],
			    change: function(color) {
					that.$el.css({ "background-color": color.toHexString() });
					that.$(".popup-active-item").css({ "background-color": color.toHexString() });
					that.$("#upload-card-color-select").spectrum("set", color.toHexString());
					that.$("#link-card-color-select").spectrum("set", color.toHexString());
				}
			});

	    	this.$("#upload-card-color-select").spectrum({
			    color: this._workspace.getSelectedColor(),
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
					that.$el.css({ "background-color": color.toHexString() });
					that.$(".popup-active-item").css({ "background-color": color.toHexString() });
					that.$("#card-color-select").spectrum("set", color.toHexString());
					that.$("#link-card-color-select").spectrum("set", color.toHexString());
				}
			});

	    	this.$("#link-card-color-select").spectrum({
			    color: this._workspace.getSelectedColor(),
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
					that.$el.css({ "background-color": color.toHexString() });
					that.$(".popup-active-item").css({ "background-color": color.toHexString() });
					that.$("#card-color-select").spectrum("set", color.toHexString());
					that.$("#upload-card-color-select").spectrum("set", color.toHexString());
				}
			});
			
			this.$('#imageUpload').fileupload({ 	
		        dataType: 'json',
    			disableImageResize: false,
			    imageMaxWidth: 1000,
			    imageMaxHeight: 1000,
			    imageCrop: false,
			    autoUpload: false,
		        add: function (e, data) {
		        	that._cardsAdded = true;

		            data.context = that.$("#upload-image-button").click(function () {
						that.$('#imageUpload').fileupload({ url: "/workspace/boards/cards/image/" + that._workspace.getId() + "/" + that._workspace.getDropBoardId() });

						that.$('#progress').show();

                    	data.submit();
	                });

	            	that.$("#selected-files-container").show();

		            for (var i=0; i < data.files.length; i++) {
		            	that.$("#selected-files-container").append("<div class=\"file-to-upload\">" + data.files[i].name + "</div>");
		            }
		        },
		        done: function (e, data) {
		        	var addedImage = data.result.card;
					addedImage.boardId = that._workspace.getDropBoardId();
		        	addedImage.title = that.$("#photo-upload-title").val();
		        	addedImage.color = that.$("#upload-card-color-select").spectrum("get").toString();

		        	imageValues = {
			        	title: that.$("#photo-upload-title").val(),
						color: that.$("#upload-card-color-select").spectrum("get").toString()
			        };

			        $.ajax({
			            url: "/workspace/boards/cards/image/" + that._workspace.getId() + "/" + addedImage.boardId + "/" + addedImage.id,
			            type: 'PUT',
			            dataType: "json",
			            data: imageValues
		        	});

					that._workspace.cardAdded(addedImage);

			    	that.$("#card-color-select").spectrum("hide");

					that._workspace.hideAddCard();
		        },
		        progressall: function (e, data) {
		            var progress = parseInt(data.loaded / data.total * 100, 10);
		            $('#progress .progress-bar').css(
		                'width',
		                progress + '%'
		            );
		        }
		    });
		},

		unbind: function() {
			this.$el.unbind("click");

			this.$("#cancel-card").unbind("click");
			this.$("#post-card").unbind("click");
			this.$("#card-text").unbind("click");
			this.$("#add-image-btn").unbind("click");

			this.$(".add-card-btn").unbind("click");
			this.$("#show-add-image-btn").unbind("click");

			this.$("#link-to-photo-header").unbind("click");
			this.$("#upload-photo-header").unbind("click");

			this.$("#add-image-button").unbind("click");
			this.$("back-image-button").unbind("click");
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
				
				that.saveTextCard();
			});

			this.$("#card-text").keypress(function(e) {
			  	var charCode = e.charCode || e.keyCode;

		        if ((e) && (!e.shiftKey) && (charCode == 13)) {
		        	e.preventDefault();

		        	that.saveTextCard();
		        }
			});

			this.$(".add-card-btn").click(function(e) {
				e.stopPropagation();

				that.showAddText();
			});

			this.$("#show-add-image-btn").click(function(e) {
				e.stopPropagation();

				that.showAddImage();
			});

			this.$("#link-to-photo-header").click(function(event) {
				event.stopPropagation();
				
				that.showLinkPhoto();
			});

			this.$("#upload-photo-header").click(function(event) {
				event.stopPropagation();
				
				that.showUploadPhoto();
			});

			this.$("#add-image-button").click(function(event) {
				event.stopPropagation();

				that.addImageFromURL();
			});

			this.$("#back-image-button").click(function(event) {
				event.stopPropagation();

				that.showLinkPhoto();
			});
		},

		showAddText: function() {
			this.$("#add-text-container").show();
			this.$("#add-image-container").hide();
    		this.$("#add-linked-error-body").hide();
		},
		
		showAddImage: function() {
			this.$("#add-text-container").hide();
			this.$("#add-image-container").show();
    		this.$("#add-linked-error-body").hide();
		},

        showLinkPhoto: function() {
    		this.$("#add-upload-image-body").hide();
    		this.$("#add-linked-image-body").show();
    		this.$("#add-linked-error-body").hide();

			this.$(".popup-active-item").css({ "background-color": "" });
			this.$("#link-to-photo-header").css({ "background-color": this.$("#card-color-select").spectrum("get").toString() });
    		this.$("#link-to-photo-header").removeClass('popup-inactive-item').removeClass('popup-active-item').addClass('popup-active-item');
    		this.$("#upload-photo-header").removeClass('popup-inactive-item').removeClass('popup-active-item').addClass('popup-inactive-item');
        },

        showUploadPhoto: function() {
    		this.$("#add-upload-image-body").show();
    		this.$("#add-linked-image-body").hide();
    		this.$("#add-linked-error-body").hide();

			this.$(".popup-active-item").css({ "background-color": "" });
			this.$("#upload-photo-header").css({ "background-color": this.$("#card-color-select").spectrum("get").toString() });
    		this.$("#link-to-photo-header").removeClass('popup-inactive-item').removeClass('popup-active-item').addClass('popup-inactive-item');
    		this.$("#upload-photo-header").removeClass('popup-inactive-item').removeClass('popup-active-item').addClass('popup-active-item');
        },

		setCardModel: function(cardModel) {
			if (cardModel) {
				this._cardModel = cardModel;

				if (cardModel.type == "text") this.$("#card-text").val(cardModel.content);
				else this.$("#card-text").val(cardModel.title);

				this.$("#card-color-select").spectrum("set", cardModel.color);

				this.$("#post-card").html("Update");
			}
			else {
				this._cardModel = null;

				this.$("#post-card").html("Post");
			}
		},

		saveTextCard: function(e) {
			var that = this;

			if (this.$("#card-text").val().trim().length > 0) {
				if (!this._cardModel) {
					var boardId = this._workspace.getDropBoardId();

					var newCard = {
						type: "text",
						boardId: boardId,
						content: this.$("#card-text").val(),
						color: this.$("#card-color-select").spectrum("get").toString()
					};
					
					Card_Services.InsertTextCard(this._workspace.getId(), boardId, newCard, function(response) {
						var addedCard = response.card;
						addedCard.boardId = boardId;

						that._workspace.cardAdded(addedCard);

						that._workspace.sendSocket(JSON.stringify({ 
							action:"boardCardAdded", 
							workspace: that._workspace.getId(), 
							card: addedCard
						}));
					});
				}
				else {
					var updateModel = null;

					if ((this._cardModel.cards == null)|| (this._cardModel.cards.length === 0)) {
						if (this._cardModel.type == "text") {
							var updateModel = {
								id: this._cardModel.id,
								parentId: this._cardModel.parentId,
								content: this.$("#card-text").val(),
								color: this.$("#card-color-select").spectrum("get").toString()
							};

							Card_Services.UpdateTextCard(this._workspace.getId(), this._cardModel.boardId, this._cardModel.id, updateModel, function(response) {
								that._workspace.sendSocket(JSON.stringify({ 
									action:"boardCardUpdated", 
									workspace: that._workspace.getId(),
									card: updateModel 
								}));
							});
						}
						else {
							var updateModel = {
								id: this._cardModel.id,
								parentId: this._cardModel.parentId,
								title: this.$("#card-text").val(),
								color: this.$("#card-color-select").spectrum("get").toString()
							};

							Card_Services.UpdateImageCard(this._workspace.getId(), this._cardModel.boardId, this._cardModel.id, updateModel, function(response) {
								that._workspace.sendSocket(JSON.stringify({ 
									action:"boardCardUpdated", 
									workspace: that._workspace.getId(),
									card: updateModel 
								}));
							});
						}
					}
					else {
						updateModel = {
							id: this._cardModel.id, 
							type: "text",
							boardId: this._cardModel.boardId,
			  				action: "update",
							color: this.$("#card-color-select").spectrum("get").toString()
			  			};

			  			if (this._cardModel.type == "text") updateModel.content = this.$("#card-text").val();
			  			else updateModel.title = this.$("#card-text").val();

						Cluster_Services.Insert(this._workspace.getId(), this._cardModel.boardId, this._cardModel.id, updateModel, function(response) {
							that._workspace.sendSocket(JSON.stringify({ 
								action:"boardClusterUpdated", 
								workspace: that._workspace.getId(),
								cluster: updateModel 
							}));
						});
					}
					
					that._workspace.cardEdited(updateModel);
				}
			}

	    	this.$("#card-color-select").spectrum("hide");

			this._workspace.hideAddCard();

			that.$el.empty();
			that.render();
		},

        addImageFromURL: function(){
			var urlValid = true,
		        that = this,
		        boardId = this._workspace.getDropBoardId();

			if (this.$("#photo-url-location").val().trim().length == 0) {
				this.$("#photo-url-location").css("border", "1px solid #ff0000");
				urlValid = false;
			}
			else this.$("#photo-url-location").css("border", "1px solid #b9b9b9");

			if (urlValid) {
				this.$("#loading-container").show();
				this.$("#photo-url-title").prop('disabled', true);
				this.$("#photo-url-location").prop('disabled', true);
				this.$("#photo-upload-title").prop('disabled', true);
				this.$("#add-image-button").prop('disabled', true);
				this.$("#upload-image-button").prop('disabled', true);

				var imageLocation = this.$("#photo-url-location").val();

		        imageValues = {
		        	title: this.$("#photo-url-title").val(),
					color: this.$("#link-card-color-select").spectrum("get").toString(),
		            imageLocation: imageLocation
		        };

		        $.ajax({
		            url: "/workspace/boards/cards/downloadImage/" + this._workspace.getId() + "/" + boardId,
		            type: 'POST',
		            dataType: "json",
		            data: imageValues,
		            success: function(response) {
			        	if (response.code == 200) {
							var addedCard = response.card;
							addedCard.boardId = boardId;

							that._workspace.cardAdded(addedCard);

							that._workspace.sendSocket(JSON.stringify({ 
								action:"boardCardAdded", 
								workspace: that._workspace.getId(), 
								card: addedCard
							}));

							that._workspace.hideAddCard();

							that.$el.empty();
							that.render();
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
		            }
	        	});
			}
        },

		focusCardText: function() {
			this.$("#card-text").focus();
		}
	});

	return AddCard;
});