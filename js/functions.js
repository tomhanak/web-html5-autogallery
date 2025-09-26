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

function toInt(string, defaultValue, radix) {
	defaultValue = (typeof defaultValue == 'undefined') ? 0 : defaultValue;
	radix = (typeof radix == 'undefined') ? 10 : radix;
	var value = parseInt(string, radix);
	return (isNaN(value)) ? defaultValue : value;
}
function toIntStrict(string, defaultValue, radix) {
	defaultValue = (typeof defaultValue == 'undefined') ? 0 : defaultValue;
	radix = (typeof radix == 'undefined') ? 10 : radix;
	var value = parseInt(string, radix);
	return (string == '' || isNaN(value) || isNaN(string)) ? defaultValue : value;
}

function onThumbnailLoadError(image) {
	$(image).attr({
		src: '/images/gallery/not-available.thumbnail.jpg',
		width: 200,
		height: 113
	});
}
function onPosterLoadError(image) {
	$(image).attr({
		src: '/images/gallery/not-available.poster.jpg',
		width: 320,
		height: 180
	});
}

function G_initSubPage($subPage) {
	// Add extra icons for link outside this web
	$subPage.find('a[target="_blank"]').after('<sup>&nbsp;<i class="bi bi-box-arrow-up-right"></i></sup>');
	// Trigger first scroll for scroll-buttons
	$(window).trigger('scroll');
}
