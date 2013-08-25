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
], function($) {
	var initialize = function() {
		var $head = $('head');
		var title = $head.find('title').text() + ' - RSS';
		var $headRssLink = $head.find('> link[type="application/rss+xml"]');
		if ($headRssLink.length > 0) {
			$headRssLink.attr({
				title: title,
				href: location.protocol + '//' + location.host + '/site-metadata/rss.xml',
			});
		}
		var $footer = $('.footer-container');
		var $footerRssLink = $footer.find('a.rss');
		if ($footerRssLink.length > 0) {
			$footerRssLink.attr({
				href: location.protocol + '//' + location.host + '/site-metadata/rss.xml',
			});
		}
		var $footerRssImage = $footer.find('a.rss img');
		if ($footerRssImage.length > 0) {
			$footerRssImage.attr({
				title: title,
			});
		}
	};

	return { 
		initialize: initialize,
	};
});
