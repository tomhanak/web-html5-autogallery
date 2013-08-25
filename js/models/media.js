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
], function($, _, Backbone) {
	var MediaModel = Backbone.Model.extend({
		defaults: {
			type: '', // 'Image', 'Video', 'Audio'
			id: '0', // Number as string
			title: '',
			tags: [], // List of URL encoded strings
			original: '', // URL encoded path
			thumbnail: {
				path: '', // URL encoded path
				width: 0,
				height: 0,
			},
			poster: {
				path: '', // URL encoded path
				width: 0,
				height: 0,
			},
			galleryId: '0', // Number as string
			galleryTitle: '',
		},
	});

	return MediaModel;
});
