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
	'collections/news',
	'text!templates/news.html',
], function($, _, Backbone, NewsCollection, newsTemplate) {
	var NewsView = Backbone.View.extend({
		template: _.template(newsTemplate),
		initialize: function(options) {
			this.options = options;
			this.collection = new NewsCollection();
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
			this.render();
		},
		render: function() {
			var galleriesPath = (Backbone.history._hasPushState) ? 'galleries' : '#galleries';
			this.$el.html(this.template({ galleriesPath: galleriesPath, news: this.collection.toJSON() }));
			if (this.options.onReady) {
				setTimeout(this.options.onReady, 0); // Run Asynchronously
			}
		},
	});

	return NewsView;
});
