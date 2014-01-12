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
	paths: {
		jquery: 'libs/jquery-1.10.2.min',
		underscore: 'libs/underscore-1.5.1.min',
		backbone: 'libs/backbone-1.0.0.min',
		text: 'libs/text.min',
		bootstrap: 'libs/bootstrap-3.0.2.min',
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
