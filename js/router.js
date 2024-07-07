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
	'views/news',
	'views/galleries',
	'views/gallery',
	'views/gallery-overlay',
	'views/projects',
], function($, _, Backbone, NewsView, GalleriesView, GalleryView, GalleryOverlayView, ProjectsView) {
	var Router = Backbone.Router.extend({
		routes: {
			'galleries': 'showGalleries',
			'galleries/:galleryId(/:itemId)': 'showGallery',
			'projects': 'showProjects',

			// Default route
			'*path': 'showNews',
		},
	});

	var initialize = function() {
		var router = new Router();

		var newsView = null;
		var galleriesView = null;
		var galleryViews = [];
		var galleryOverlayView = null;
		var projectsView = null;

		var updateWindowTitle = function($element) {
			var $titleElement = $element.find('.window-title');
			if ($titleElement.length > 0) {
				var title = $titleElement.text();
				document.title = $('.document-title-base').text() + ((title == '') ? '' : ' | ' + title);
			}
		};
		var showTabPane = function($tabPane, scroll, scrollToTop) {
			if (typeof scroll !== 'boolean') {
				scroll = true;
			}
			if (typeof scrollToTop !== 'boolean') {
				scrollToTop = false;
			}
			updateWindowTitle($tabPane);
			// Modified Bootstrap's Tab::activate method
			var $activeTabPane = $tabPane.parent().find('> .active');
			var hasActiveTabPane = ($activeTabPane.length > 0);
			var transition = $.support.transition;
			if (transition && hasActiveTabPane) {
				transition = $activeTabPane.hasClass('fade');
			}
			var activate = function() {
				$activeTabPane.removeClass('active');
				$tabPane.addClass('active');
				if (transition) {
					$tabPane[0].offsetWidth; // Reflow for transition
					$tabPane.addClass('in');
					if (scroll) {
						var pos = (scrollToTop) ? 0 : $tabPane.offset().top;
						$('html, body').animate({ scrollTop: pos }, 500);
					}
				}
				else {
					$tabPane.removeClass('fade');
				}
			};
			if (hasActiveTabPane) {
				if ($activeTabPane[0] !== $tabPane[0]) {
					transition
						? $activeTabPane
							.one($.support.transition.end, activate)
							.emulateTransitionEnd(150)
						: activate();
					$activeTabPane.removeClass('in');
				}
			}
			else {
				activate();
			}
		};
		var hideGalleryOverlay = function() {
			if (galleryOverlayView != null) {
				galleryOverlayView.hide();
			}
		};

		router.on('route:showNews', function(path) {
			hideGalleryOverlay();
			var selector = '#news';
			if (newsView == null) {
				var options = {
					el: selector,
					onReady: function() {
						G_initSubPage(newsView.$el);
						showTabPane(newsView.$el, true, true);
					},
					onError: function() {
						// Do nothing
					},
				};
				newsView = new NewsView(options);
			}
			else {
				showTabPane(newsView.$el, true, true);
			}
			if (path !== '') {
				router.navigate('', { trigger: false, replace: true });
			}
		});

		router.on('route:showGalleries', function() {
			hideGalleryOverlay();
			var selector = '#galleries';
			if (galleriesView == null) {
				var options = {
					el: selector,
					onReady: function() {
						G_initSubPage(galleriesView.$el);
						showTabPane(galleriesView.$el);
					},
					onError: function() {
						delete galleriesView;
						router.navigate('', { trigger: true, replace: true });
					},
				};
				galleriesView = new GalleriesView(options);
			}
			else {
				showTabPane(galleriesView.$el);
			}
		});

		router.on('route:showGallery', function(galleryId, itemId) {
			var galleryIdValid = (toIntStrict(galleryId, -1) > -1);
			var itemIdValid = (toIntStrict(itemId, -1) > -1);
			var fallbackToGalleries = function() {
				router.navigate('galleries', { trigger: true, replace: true });
			};
			var fallbackToGallery = function(galleryId) {
				router.navigate('galleries/' + galleryId, { trigger: false, replace: true });
			};
			if (!itemIdValid) {
				hideGalleryOverlay();
			}
			if (galleryIdValid) {
				var selector = '#gallery' + galleryId;
				var showGallery = function(itemId) {
					if (itemIdValid) {
						var selector = '#galleryOverlay';
						if (galleryOverlayView == null) {
							var options = {
								el: selector,
								onReady: function() {
									G_initSubPage(galleryViews[galleryId].$el);
									galleryOverlayView.show(galleryViews[galleryId], itemId);
								},
								onError: function() {
									galleryOverlayView.hide();
								},
							};
							galleryOverlayView = new GalleryOverlayView(options);
						}
						else {
							galleryOverlayView.show(galleryViews[galleryId], itemId);
						}
					}
					else {
						if (itemId != null && itemId != '') {
							fallbackToGallery(galleryId);
						}
					}
				};
				if (typeof galleryViews[galleryId] === 'undefined') {
					$('.main-container .tab-content').append(
						$('<div>')
						.attr('id', selector.replace('#', ''))
						.addClass('gallery tab-pane fade')
					);
					var options = {
						el: selector,
						galleryId: galleryId,
						onReady: function() {
							G_initSubPage(galleryViews[galleryId].$el);
							showTabPane(galleryViews[galleryId].$el, !itemIdValid);
							showGallery(itemId);
						},
						onError: function() {
							galleryViews[galleryId].remove();
							delete galleryViews[galleryId];
							fallbackToGalleries();
						},
					};
					galleryViews[galleryId] = new GalleryView(options);
				}
				else {
					showTabPane(galleryViews[galleryId].$el, !itemIdValid);
					showGallery(itemId);
				}
			}
			else {
				fallbackToGalleries();
			}
		});

		router.on('route:showProjects', function() {
			hideGalleryOverlay();
			var selector = '#projects';
			if (projectsView == null) {
				var options = {
					el: selector,
					onReady: function() {
						G_initSubPage(projectsView.$el);
						showTabPane(projectsView.$el);
					},
					onError: function() {
						delete projectsView;
						router.navigate('', { trigger: true, replace: true });
					},
				};
				projectsView = new ProjectsView(options);
			}
			else {
				showTabPane(projectsView.$el);
			}
		});

		Backbone.history.start({ pushState: false });
		//Backbone.history.start({ pushState: true });

		// Backbone.history._hasPushState used around to check whether to prepend # for URLs or not
	};

	return {
		initialize: initialize,
	};
});
