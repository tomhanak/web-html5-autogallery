/*******************************************************************************

	Copyright (C) 2013 Tomáš Hanák <tomas.hanak@gmail.com>

	This file is part of web-html5-autogallery project.

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.

*******************************************************************************/

define([
	'jquery',
	'underscore',
	'backbone',
	'text!templates/gallery-overlay.html',
], function($, _, Backbone, galleryOverlayTemplate) {
	var GalleryOverlayView = Backbone.View.extend({
		template: _.template(galleryOverlayTemplate), // Class variable (not per-instance variable)
		initialize: function(options) {
			this.options = options;
			this.render();
		},
		_activate: function() {
			this.$overlay = this.$('.modal');
			this.$overlayDialog = this.$('.modal-dialog');
			this.$overlayContent = this.$('.modal-content');
			this.$overlayBody = this.$('.modal-body');
			this.$overlayFooter = this.$('.modal-footer');
			this.$overlayFooterContent = this.$('.modal-footer .content');
			this.$mediaContainer = this.$('.media-container');
			this.$previous = this.$('.previous');
			this.$next = this.$('.next');
			this.$title = this.$('.title');
			this.$original = this.$('.original');
			this.$counterCurrent = this.$('.counter .current');
			this.$counterTotal = this.$('.counter .total');

			this._initConstants($.proxy(function() {
				this._initShortcuts();
				$(window).resize($.proxy(this._updateSize, this));
				if (this.options.onReady) {
					setTimeout(this.options.onReady, 0); // Run asynchronously
				}
			}, this));
		},
		_initConstants: function(onReady) {
			var that = this;

			that.consts = {};
			that.consts.CONTROLS_HEIGHT = 40; // In pixels

			// Last chain element
			var nextImg = new Image();
			nextImg.onload = function() {
				that.consts.NEXT_WIDTH = toInt(this.width);
				that.consts.NEXT_HEIGHT = toInt(this.height);
				that.consts.MEDIA_MIN_WIDTH = that.consts.PREVIOUS_WIDTH + that.consts.NEXT_WIDTH;
				that.consts.MEDIA_MIN_HEIGHT = 2 * that.consts.CONTROLS_HEIGHT
					+ Math.max(that.consts.PREVIOUS_HEIGHT, that.consts.NEXT_HEIGHT);

				// Initialize the rest once we have all constants ready
				onReady();
			};

			// First chain element
			var previousImg = new Image();
			previousImg.onload = function() {
				that.consts.PREVIOUS_WIDTH = toInt(this.width);
				that.consts.PREVIOUS_HEIGHT = toInt(this.height);

				// Using \1 does not work in IE (at the end stay double quote in form of %22)
				//nextImg.src = that.$next.css('background-image').replace(/^url\((['"]?)|\1\)$/g, '');
				nextImg.src = that.$next.css('background-image').replace(/^url\(['"]?|['"]?\)$/g, '');
			};

			// Start chain loading
			// Using \1 does not work in IE (at the end stay double quote in form of %22)
			//previousImg.src = that.$previous.css('background-image').replace(/^url\((['"]?)|\1\)$/g, '');
			previousImg.src = that.$previous.css('background-image').replace(/^url\(['"]?|['"]?\)$/g, '');
		},
		_initShortcuts: function() {
			this.$overlay.on('shown.bs.modal', $.proxy(function() {
				this.$overlay.on('keyup', $.proxy(function(ev) {
					// Left arrow
					if (ev.keyCode == 37) {
						ev.preventDefault();
						this.$previous.trigger('click');
					}
					// Right arrow
					if (ev.keyCode == 39) {
						ev.preventDefault();
						this.$next.trigger('click');
					}
					// Space bar
					if (ev.keyCode == 32) {
						ev.preventDefault();
						$av = this.$('video.media');
						if ($av.length <= 0) {
							$av = this.$('audio.media');
						}
						if ($av.length > 0) {
							if ($av[0].paused) {
								$av[0].play();
							}
							else {
								$av[0].pause();
							}
						}
					}
				}, this));
			}, this));
			this.$overlay.on('hidden.bs.modal', $.proxy(function() {
				this.$overlay.off('keyup');
				this.$('.media').remove(); // Stop playing video/audio
			}, this));
		},
		_update: function() {
			var currentItem = this.visibleItems[this.currentItemIndex];

			var url = 'galleries/' + this.galleryView.gallery.id + '/' + currentItem.id;
			Backbone.history.navigate(url, { trigger: false, replace: true });

			var currentItemPoster = currentItem.get('poster');
			var width = currentItemPoster.width;
			var height = currentItemPoster.height;
			var base = 'site-metadata/' + url;
			var type = currentItem.get('type');

			// For transitions only, don't animate media always from zero size
			var oldMediaWidth = 0;
			var oldMediaHeight = 0;
			var $media = this.$('.media');
			if ($media) {
				oldMediaWidth = toInt($media.css('width'));
				oldMediaHeight = toInt($media.css('height'));
			}

			switch (type) {
				case 'Image': {
					this.$mediaContainer.html($('<img>')
						.addClass('media')
						.attr({
							onerror: 'onPosterLoadError(this)',
							width: width,
							height: height,
							src: '/' + currentItemPoster.path,
						})
					);
					break;
				}
				case 'Video': {
					this.$mediaContainer.html($('<video>')
						.addClass('media')
						.attr({
							onerror: 'onPosterLoadError(this)',
							controls: 'controls',
							preload: 'metadata',
							width: width,
							height: height,
							poster: '/' + currentItemPoster.path,
						})
						// mp4 source has to be first to work on iPad
						.append($('<source>')
							.attr({
								//type: 'video/mp4; codecs=\'avc1, mp4a\'',
								type: 'video/mp4',
								src: '/' + base + '.mp4',
							})
						)
						.append($('<source>')
							.attr({
								//type: 'video/ogg; codecs=\'theora, vorbis\'',
								type: 'video/ogg',
								src: '/' + base + '.ogv',
							})
						)
						.append($('<source>')
							.attr({
								//type: 'video/webm; codecs=\'vp8, vorbis\'',
								type: 'video/webm',
								src: '/' + base + '.webm',
							})
						)
						.append('Your browser does not support the HTML5 Video element.')
					);
					break;
				}
				case 'Audio': {
					this.$mediaContainer.html($('<img>')
						.addClass('media')
						.attr({
							id: 'GalleryOverlayAudioPosterID',
							width: width,
							height: height,
							src: '/' + currentItemPoster.path,
						})
					);
					this.$mediaContainer.append($('<audio>')
						.addClass('media')
						.attr({
							onerror: 'onPosterLoadError(#GalleryOverlayAudioPosterID)',
							controls: 'controls',
							preload: 'metadata',
						})
						// mp3 source has to be first to work on ???
						.append($('<source>')
							.attr({
								type: 'audio/mp3',
								src: '/' + base + '.mp3',
							})
						)
						.append($('<source>')
							.attr({
								//type: 'audio/ogg; codecs=\'vorbis\'',
								type: 'audio/ogg',
								src: '/' + base + '.ogg',
							})
						)
						.append('Your browser does not support the HTML5 Audio element.')
					);
					break;
				}
				default: {
					break;
				}
			}

			// For transitions only, don't animate media always from zero size
			var $media = this.$('.media'); // Has to be here for 2nd time
			if ($media && oldMediaWidth > 0 && oldMediaHeight > 0) {
				$media.css('width', oldMediaWidth);
				$media.css('height', oldMediaHeight);
			}

			this.$title.html(currentItem.get('title'));
			this.$original.attr('href', '/' + currentItem.get('original'));
			this.$counterCurrent.html(this.currentItemIndex + 1);

			if (this.currentItemIndex > 0) {
				this.$previous.removeClass('hide');
				this.$previous.off('click');
				this.$previous.on('click', $.proxy(function(){
					this.currentItemIndex--;
					this._update();
				}, this));
			}
			else {
				this.$previous.addClass('hide');
				this.$previous.off('click');
			}

			if (this.currentItemIndex < this.visibleItems.length - 1) {
				this.$next.removeClass('hide');
				this.$next.off('click');
				this.$next.on('click', $.proxy(function() {
					this.currentItemIndex++;
					this._update();
				}, this));
			}
			else {
				this.$next.addClass('hide');
				this.$next.off('click');
			}

			this._updateSize();
		},
		_updateSize: function() {
			var mbpWidth = function($element) {
				// Left and right margin + border + padding
				return $element.outerWidth(true) - $element.width();
			};
			var mbpHeight = function($element) {
				// Top and bottom margin + border + padding
				return $element.outerHeight(true) - $element.height();
			};
			$window = $(window);
			var windowWidth = $window.width();
			var windowHeight = $window.height();

			var $media = this.$('.media');

			var overlayAddWidth = 0 // For nicer wrapping ;-)
				+ mbpWidth(this.$overlay)
				+ mbpWidth(this.$overlayDialog)
				+ mbpWidth(this.$overlayContent)
				+ mbpWidth(this.$overlayBody);
			var overlayAddHeight = 0 // For nicer wrapping ;-)
				+ mbpHeight(this.$overlay)
				+ mbpHeight(this.$overlayDialog)
				+ mbpHeight(this.$overlayContent)
				+ mbpHeight(this.$overlayBody)
				+ this.$overlayFooter.outerHeight(true); // Might be zero if overlay was not already visible

			var availWidth = windowWidth - overlayAddWidth;
			var availHeight = windowHeight - overlayAddHeight;

			// Take real media size, not currently rendered size in viewer
			var mediaWidth = toInt($media.attr('width'));
			var mediaHeight = toInt($media.attr('height'));

			var boundedWidth = Math.min(mediaWidth, Math.max(availWidth, this.consts.MEDIA_MIN_WIDTH));
			var boundedHeight = Math.min(mediaHeight, Math.max(availHeight, this.consts.MEDIA_MIN_HEIGHT));

			var zoomWidth = boundedWidth / mediaWidth;
			var zoomHeight = boundedHeight / mediaHeight;

			var newWidth;
			var newHeight;
			if (zoomHeight > zoomWidth) {
				newWidth = Math.ceil(mediaWidth * boundedWidth / mediaWidth);
				newHeight = Math.ceil(mediaHeight * boundedWidth / mediaWidth);
			}
			else {
				newWidth = Math.ceil(mediaWidth * boundedHeight / mediaHeight);
				newHeight = Math.ceil(mediaHeight * boundedHeight / mediaHeight);
			}

			//var newTop = this.consts.MIN_MARGIN + (windowHeight - (overlayAddHeight + newHeight)) / 2;
			//var newLeft = this.consts.MIN_MARGIN + (windowWidth - (overlayAddWidth + newWidth)) / 2;
			//this.$overlay.css('top', newTop);
			//this.$overlay.css('left', newLeft);

			//var newTop = (windowHeight - (overlayAddHeight + newHeight)) / 2;
			//this.$overlay.css('padding-top', newTop);

			$media.css('width', newWidth);
			$media.css('height', newHeight); // Has to be set to force correct media height

			this.$overlayFooterContent.css('width', newWidth); // Has to be set to force title to be shorten with elipses

			var currentItem = this.visibleItems[this.currentItemIndex];
			//this.galleryView.scrollToItem(currentItem);
		},
		render: function() {
			this.$el.html(this.template({}));
			this._activate();
		},
		show: function(galleryView, itemId) {
			this.galleryView = galleryView;
			var currentItem = this.galleryView.collection.get(itemId);
			if (currentItem) {
				this.galleryView._setItemVisibility(currentItem, true); // Ensure item is visible
				this.visibleItems = this.galleryView.collection.where({ visible: true });
				this.currentItemIndex = this.visibleItems.indexOf(currentItem);

				this.$counterTotal.html(this.visibleItems.length);

				// Update overlay content (and size but hidden elements' sizes are wrong (zero))
				this._update();
				// Show overlay (if was hidden size might be inaccurate)
				this.$overlay.modal('show');
				// Fix overlay size once it's shown
				this.$overlay.one('shown.bs.modal', $.proxy(this._updateSize, this));
				// Update url on hide
				this.$overlay.one('hidden.bs.modal', $.proxy(this._navigateToGallery, this));
			}
			else {
				if (this.options.onError) {
					setTimeout(this.options.onError, 0); // Run asynchronously
				}
			}
		},
		hide: function() {
			this.$overlay.modal('hide');
			this._navigateToGallery();
		},
		_navigateToGallery: function() {
			this.galleryView._updateItemsVisibility();
			var url = 'galleries/' + this.galleryView.gallery.id;
			var newUrl = document.location.href;
			if (newUrl.indexOf(url) >= 0) {
				Backbone.history.navigate(url, { trigger: false, replace: true });
			}
		},
	});

	return GalleryOverlayView;
});
