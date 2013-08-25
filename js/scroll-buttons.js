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
		var $mainContent = $('.scroll-button-container');
		if ($mainContent.length <= 0) {
			return;
		}
		var $window = $(window);

		var $scrollButtonTop = $('<a href="#" class="scroll-button-top"></a>')
			.html('<i class="icon-fast-backward icon-white"></i>')
			.click(function() {
				var maxPosition = Math.max(0, $mainContent.height() - $window.height());
				var delta = $window.scrollTop();
				var position = 0;
				var duration = Math.min(Math.max(500, 50 * delta / $window.height()), 3000);
				$("html, body").animate({ scrollTop: position }, duration, 'swing');
				return false;
			});
		var $scrollButtonBottom = $('<a href="#" class="scroll-button-bottom"></a>')
			.html('<i class="icon-fast-forward icon-white"></i>')
			.click(function() {
				var maxPosition = Math.max(0, $mainContent.height() - $window.height());
				var delta = maxPosition - $window.scrollTop();
				var position = maxPosition;
				var duration = Math.min(Math.max(500, 50 * delta / $window.height()), 3000);
				$("html, body").animate({ scrollTop: position }, duration, 'swing');
				return false;
			});
		var $scrollButtonUp = $('<a href="#" class="scroll-button-up"></a>')
			.html('<i class="icon-arrow-left icon-white"></i>')
			.click(function() {
				var delta = 3 * $window.height();
				var position = Math.max(0, $window.scrollTop() - delta);
				$("html, body").animate({ scrollTop: position }, 500, 'swing');
				return false;
			});
		var $scrollButtonDown = $('<a href="#" class="scroll-button-down"></a>')
			.html('<i class="icon-arrow-right icon-white"></i>')
			.click(function() {
				var maxPosition = Math.max(0, $mainContent.height() - $window.height());
				var delta = 3 * $window.height();
				var position = Math.min($window.scrollTop() + delta, maxPosition);
				$("html, body").animate({ scrollTop: position }, 500, 'swing');
				return false;
			});

		$mainContent.append($scrollButtonTop);
		$mainContent.append($scrollButtonBottom);
		$mainContent.append($scrollButtonUp);
		$mainContent.append($scrollButtonDown);

		var update = function() {
			var hide = function() {
				delete $mainContent.timerId;
				$scrollButtonTop.addClass('active-hidden');
				$scrollButtonUp.addClass('active-hidden');
				$scrollButtonBottom.addClass('active-hidden');
				$scrollButtonDown.addClass('active-hidden');
			};
			var startTimer = false;
			if ($window.scrollTop() > ($window.height() / 2)) {
				$scrollButtonTop.addClass('active');
				$scrollButtonUp.addClass('active');
				$scrollButtonTop.removeClass('active-hidden');
				$scrollButtonUp.removeClass('active-hidden');
				startTimer = true;
			}
			else {
				$scrollButtonTop.removeClass('active active-hidden');
				$scrollButtonUp.removeClass('active active-hidden');
			}
			if ($window.scrollTop() < $mainContent.height() - (3 * $window.height() / 2)) {
				$scrollButtonBottom.addClass('active');
				$scrollButtonDown.addClass('active');
				$scrollButtonBottom.removeClass('active-hidden');
				$scrollButtonDown.removeClass('active-hidden');
				startTimer = true;
			}
			else {
				$scrollButtonBottom.removeClass('active active-hidden');
				$scrollButtonDown.removeClass('active active-hidden');
			}
			if (typeof $mainContent.timerId === 'number') {
				clearTimeout($mainContent.timerId);
				delete $mainContent.timerId;
			}
			if (startTimer) {
				$mainContent.timerId = setTimeout(hide, 3000);
			}
		};

		$window.scroll(update);
	};

	return { 
		initialize: initialize,
		//update: update,
	};
});
