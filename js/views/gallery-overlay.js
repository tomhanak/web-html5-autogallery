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
	'bootstrap',
	'text!templates/gallery-overlay.html',
], function($, _, Backbone, Bootstrap, galleryOverlayTemplate) {
	var GalleryOverlayView = Backbone.View.extend({
		template: _.template(galleryOverlayTemplate), // Class variable (not per-instance variable)
		initialize: function(options) {
			this.options = options;
			this.render();
		},
		_activate: function() {
			this.$overlay = this.$('.modal');
			//this.$overlayDialog = this.$('.modal-dialog');
			//this.$overlayContent = this.$('.modal-content');
			//this.$overlayBody = this.$('.modal-body');
			//this.$overlayFooter = this.$('.modal-footer');
			this.$mediaContainer = this.$('.media-container');
			this.$previous = this.$('.media-previous');
			this.$next = this.$('.media-next');
			this.$title = this.$('.media-title');
			this.$original = this.$('.media-original');
			this.$counterCurrent = this.$('.filter-counter .filter-current');
			this.$counterVisible = this.$('.filter-counter .filter-visible');

			this._initShortcuts();

			$(window).resize($.proxy(this._updateSize, this));

			if (this.options.onReady) {
				setTimeout(this.options.onReady, 0); // Run asynchronously
			}
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

			switch (type) {
				case 'Image': {
					this.$mediaContainer.html($('<img>')
						.addClass('media')
						.addClass('img-fluid')
						.addClass('object-fit-scale-down')
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
						.addClass('img-fluid')
						.addClass('object-fit-scale-down')
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
						.addClass('img-fluid')
						.addClass('object-fit-scale-down')
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

			this.$title.html(currentItem.get('title'));
			this.$original.attr('href', '/' + currentItem.get('original'));
			this.$counterCurrent.html(this.currentItemIndex + 1);

			if (this.currentItemIndex > 0) {
				this.$previous.removeClass('invisible'); // Show
				this.$previous.off('click');
				this.$previous.on('click', $.proxy(function() {
					this.currentItemIndex--;
					this._update();
				}, this));
			}
			else {
				this.$previous.addClass('invisible'); // Hide
				this.$previous.off('click');
			}

			if (this.currentItemIndex < this.visibleItems.length - 1) {
				this.$next.removeClass('invisible'); // Show
				this.$next.off('click');
				this.$next.on('click', $.proxy(function() {
					this.currentItemIndex++;
					this._update();
				}, this));
			}
			else {
				this.$next.addClass('invisible'); // Hide
				this.$next.off('click');
			}

			this._updateSize();
		},
		_updateSize: function() {
			var modal = Bootstrap.Modal.getInstance(this.$overlay);
			if (modal)
				modal.handleUpdate();

			var $media = this.$('.media');

			var windowWidth = this.$mediaContainer.width();
			var windowHeight = this.$mediaContainer.height();

			if (windowWidth > 0 && windowHeight > 0) {
				// Take real media size, not currently rendered size in viewer
				var mediaWidth = toInt($media.attr('width'));
				var mediaHeight = toInt($media.attr('height'));

				var boundedWidth = Math.min(mediaWidth, windowWidth);
				var boundedHeight = Math.min(mediaHeight, windowHeight);

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

				$media.css('width', newWidth);
				$media.css('height', newHeight);
			}

			// TODO: Scroll only if not in viewport
			var currentItem = this.visibleItems[this.currentItemIndex];
			this.galleryView.scrollToItem(currentItem);
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

				this.$counterVisible.html(this.visibleItems.length);

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
