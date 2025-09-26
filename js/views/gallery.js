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
	'collections/gallery',
	'text!templates/gallery.html',
], function($, _, Backbone, GalleryCollection, galleryTemplate) {
	var GalleryView = Backbone.View.extend({
		template: _.template(galleryTemplate), // Class variable (not per-instance variable)
		initialize: function(options) {
			this.options = options;
			if (options.galleryId == '') {
				console.log('GalleryView: Initialized without gallery ID');
			}

			this.gallery = {
				id: options.galleryId,
				title: '',
				tags: {}, // Associative array, key: tag name, value: tag's occurences
			};

			this.collection = new GalleryCollection({ galleryId: this.gallery.id });
			this.collection.fetch({
				reset: true,
				success: $.proxy(this.collectionSuccess, this),
				error: $.proxy(this.collectionError, this),
			});
		},
		collectionError: function(collection) {
			delete this.collection;
			if (this.options.onError) {
				setTimeout(this.options.onError, 0); // Run Asynchronously
			}
		},
		collectionSuccess: function(collection) {
			var tags = {};
			_.each(collection.models, $.proxy(function(item) {
				if (this.gallery.title == '') {
					this.gallery.title = item.get('galleryTitle');
				}
				_.each(item.get('tags'), function(tag) {
					if (typeof tags[tag] == 'undefined') {
						tags[tag] = 1;
					}
					else {
						tags[tag]++;
					}
				});
			}, this));
			var sortedKeys = Object.keys(tags).sort();
			_.each(sortedKeys, $.proxy(function(key) {
				this.gallery.tags[key] = tags[key];
			}, this));
			this.render();
		},
		_activate: function() {
			this.$filter = this.$('.gallery-filter');
			this.$filter.find('.filter-select-all').on('click', $.proxy(this._checkAllFilterTags, this));
			this.$filter.find('.filter-unselect-all').on('click', $.proxy(this._uncheckAllFilterTags, this));
			this.$filter.find('.filter-pattern').on('change', $.proxy(this._updateItemsVisibility, this));
			this.$filter.find('.filter-type').on('change', $.proxy(this._updateItemsVisibility, this));
			this.$filter.find('.filter-tags .filter-tag').on('click', $.proxy(function(ev) {
				$(ev.target).toggleClass('active');
				this._updateItemsVisibility();
			}, this));
			this.$filterCounterVisible = this.$filter.find('.filter-counter .filter-visible');
			this.$filterCounterTotal = this.$filter.find('.filter-counter .filter-total');
			this.$filterCounterTotal.html(this.collection.length);
			this._updateItemsVisibility();
		},
		_checkAllFilterTags: function() {
			this.$filter.find('.filter-tags .filter-tag').addClass('active');
			this._updateItemsVisibility();
		},
		_uncheckAllFilterTags: function() {
			this.$filter.find('.filter-tags .filter-tag').removeClass('active');
			this._updateItemsVisibility();
		},
		_setItemVisibility: function(item, visible) {
			// Set collection item visibility
			item.attributes['visible'] = visible; // Don't use item.set(...), it would fire change event on model
			// Set DOM element visibility
			var itemElementId = '#gallery' + this.gallery.id + '_' + item.get('id');
			$itemElement = $(itemElementId);
			if (visible) {
				$itemElement.removeClass('d-none'); // Show
			}
			else {
				$itemElement.addClass('d-none'); // Hide
			}
		},
		scrollToItem: function(item) {
			var itemElementId = 'gallery' + this.gallery.id + '_' + item.get('id');
			document.getElementById(itemElementId).scrollIntoView()
		},
		_updateItemsVisibility: function() {
			var pattern = this.$filter.find('.filter-pattern').val();
			var type = this.$filter.find('.filter-type').val();
			var selectedTags = [];
			this.$filter.find('.filter-tags .filter-tag.active').each(function() {
				selectedTags.push($(this).val());
			});
			this.collection.each($.proxy(function(item) {
				var itemTags = item.get('tags');
				var visible = false;
				switch (pattern) {
					case 'MatchAtLeastOneTag': {
						visible = false;
						itemTags.every(function(itemTag) {
							if (selectedTags.indexOf(itemTag) > -1) {
								visible = true;
							}
							return !visible;
						});
						break;
					}
					case 'MatchAllTags': {
						visible = true;
						selectedTags.every(function(selectedTag) {
							if (itemTags.indexOf(selectedTag) <= -1) {
								visible = false;
							}
							return visible;
						});
						break;
					}
					default:
						break;
				}
				if (type != "AllTypes" && visible) {
					visible = (type == item.get('type'));
				}
				this._setItemVisibility(item, visible);
			}, this));
			this.$filterCounterVisible.html(this.collection.where({ visible: true }).length);
		},
		render: function() {
			var galleriesPath = (Backbone.history._hasPushState) ? 'galleries' : '#galleries';
			this.$el.html(this.template({ galleriesPath: galleriesPath, gallery: this.gallery, items: this.collection.toJSON() }));
			this._activate();
			if (this.options.onReady) {
				setTimeout(this.options.onReady, 0); // Run Asynchronously
			}
		},
	});

	return GalleryView;
});
