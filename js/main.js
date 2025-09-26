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

// Require.js allows us to configure shortcut alias
require.config({
	baseUrl: 'js',
	paths: {
		jquery: 'libs/jquery-3.7.1.min',
		underscore: 'libs/underscore-min',
		backbone: 'libs/backbone-min',
		text: 'libs/text.min',
		bootstrap: 'libs/bootstrap.bundle.min',
		rss: 'rss',
		scroll_buttons: 'scroll-buttons',

		templates: '../templates',

		data: '../site-data',
		metadata: '../site-metadata',
	},
	shim: {
		jquery: {
			exports: '$',
		},
		underscore: {
			exports: '_',
		},
		backbone: {
			deps: ['jquery', 'underscore'],
			exports: 'Backbone',
		},
		bootstrap: {
			deps: ['jquery'],
		},
		rss: {
			deps: ['jquery'],
		},
		scroll_buttons: {
			deps: ['jquery'],
		},
	},
});

require([
	'app',
], function(App) {
	App.initialize();
});
