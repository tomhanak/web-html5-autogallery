#!/usr/bin/env python3
# -*- coding: utf-8 -*-

#import locale
#locale.setlocale(locale.LC_ALL, 'cs_CZ')

from collections import namedtuple
from email.utils import formatdate
import concurrent.futures
import datetime
import html
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.parse

# Install package python-pillow
try:
	from PIL import Image
except ImportError:
	print('Cannot import Python\'s PIL module.')
	print('Install package "python-pillow" or similar and try again.')
	exit(10)

# Install package python-simplejson
try:
	import json
except ImportError:
	print('Cannot import Python\'s json module.')
	print('Install package "python-simplejson" or similar and try again.')
	exit(10)

#***** Constants

#**
#WebProductionMode = False
WebProductionMode = True
WebTitle = 'T.O.M.ův web'
WebLocation = 'https://www.tomovo.cz' if WebProductionMode else 'http://localhost:8000'

#** Main locations
SiteData = 'site-data'
SiteMetaData = 'site-metadata'

#** Item types' locations
Galleries = 'galleries'

#** Misc.
MediaThumbnailSuffix = '.thumbnail'
MediaPosterSuffix = '.poster'

#** Predefined resources
VideoThumbnailWatermark = os.path.join('images', 'gallery', 'video-thumbnail-watermark.png')
AudioThumbnail = os.path.join('images', 'gallery', 'generic-audio' + MediaThumbnailSuffix + '.png')
AudioPoster = os.path.join('images', 'gallery', 'generic-audio' + MediaPosterSuffix + '.png')

#** Media max. sizes
MaxThumbnailWidth = 200
MaxThumbnailHeight = 200
MaxImagePosterWidth = 1500
MaxImagePosterHeight = 1000
MaxVideoWidth = 640
MaxVideoHeight = 640

#***** Logging

LogTag = 'TOMuvWeb'
LogDebugMessages = False
#LogDebugMessages = True

def logE(message):
	print(LogTag + ' (E): ' + message, file = sys.stderr)
def logW(message):
	print(LogTag + ' (W): ' + message)
def logI(message):
	print(LogTag + ' (I): ' + message)
def logD(message):
	if LogDebugMessages:
		print(LogTag + ' (D): ' + message)

#***** Tools

# Change to absolute path if your tools are not in PATH
ToolConvert = 'convert'
ToolComposite = 'composite'
ToolFFmpeg = 'ffmpeg'
ToolFFprobe = 'ffprobe'
ToolIdentify = 'identify'

def checkTools():
	# Check convert binary
	if shutil.which(ToolConvert) == 'None':
		logE('Cannot find executable tool "{0}"'.format(ToolConvert))
		logI('Install package "imagemagick" or similar and try again.')
		return 11
	# Check composite binary
	if shutil.which(ToolComposite) == 'None':
		logE('Cannot find executable tool "{0}"'.format(ToolComposite))
		logI('Install package "imagemagick" or similar and try again.')
		return 12
	# Check identify binary
	if shutil.which(ToolIdentify) == 'None':
		logE('Cannot find executable tool "{0}"'.format(ToolIdentify))
		logI('Install package "imagemagick" or similar and try again.')
		return 13
	# Check ffmpeg binary
	if shutil.which(ToolFFmpeg) == 'None':
		logE('Cannot find executable tool "{0}"'.format(ToolFFmpeg))
		logI('Install package "ffmpeg" or similar and try again.')
		return 14
	# Check ffprobe binary
	if shutil.which(ToolFFprobe) == 'None':
		logE('Cannot find executable tool "{0}"'.format(ToolFFprobe))
		logI('Install package "ffmpeg" or similar and try again.')
		return 15
	return 0

#***** Usage

ArgDryRun = '--dry-run'
ArgRss = '--rss'
ArgJson = '--json'
ArgMedia = '--media'
ArgAll = '--all'
ArgDelete = '--delete-unreferenced-media' # TODO: Implement

def displayHelp():
	print('')
	print('Usage: ' + os.path.basename(sys.argv[0]) + ' [OPTIONS]')
	print('')
	print('Generate metadata files for site data.')
	print('')
	print('This script has to be executed in web root folder containing both folders,')
	print('site data as input ("' + os.path.join(os.getcwd(), SiteData) + '") and')
	print('site metadata as output ("' + os.path.join(os.getcwd(), SiteMetaData) + '").')
	print('In case some output folder does not exist it is created.')
	print('')
	print('Options:')
	print('  -h, --help')
	print('    Print out this help')
	print('  ' + ArgDryRun)
	print('    Process all commands as expected except the final execution')
	print('    that usually takes some time. Full command is printed out instead.')
	print('  ' + ArgRss)
	print('    Generate RSS feed containing records for items that exist in site')
	print('    data folder (input) and do not exist in site metadata folder')
	print('    (output) yet.')
	print('    Output files are automatically overwritten.')
	print('  ' + ArgJson)
	print('    Generate JSON data for sub-pages in site metadata from existing')
	print('    files in site metadata folder (output).')
	print('    Output file is automatically overwritten.')
	print('  ' + ArgMedia)
	print('    Generate media files in site metadata folder (output),')
	print('    like image thumbnails, video in HTML5 supported formats,')
	print('    pages, etc.')
	print('    No output files are overwritten, only new files are created.')
	print('    To re-generate any file delete it manually first.')
	print('  ' + ArgAll)
	print('    Combines all previous arguments: ' + ArgRss + ', ' + ArgJson + ' and ' + ArgMedia)
	print('    together for convenience.')
	print('')
	print('Warning:')
	print('  Use either argument ' + ArgAll + ' or run with ' + ArgRss + ' and ' + ArgJson)
	print('  before ' + ArgMedia + ', otherwise RSS feed and News page will be empty!')
	print('')
	print('If no option is given, only statistical information is printed out with')
	print('proposed possible actions.')
	print('')
	print('Report bugs to: tomas.hanak@gmail.com')

#***** Helper "structures"

#*** Packed size of gallery item
# width: integer in pixels
# height: integer in pixels
Size = namedtuple('Size', 'width height')

class ImageSrc(dict):
	_keys = 'path width height'.split()
	def __init__(self):
		dict.__init__(self)
		self['path'] = '' # String (file name with path relative to root folder)
		self['width'] = 0 # Number in pixels
		self['height'] = 0 # Number in pixels
	def __setitem__(self, key, value):
		if key not in ImageSrc._keys:
			raise KeyError
		dict.__setitem__(self, key, value)
	def size(self):
		return Size(self['width'], self['height'])
	def setSize(self, size):
		self['width'] = size.width
		self['height'] = size.height

class MediaItem(dict):
	_keys = 'type id title tags original thumbnail poster galleryId galleryTitle'.split()
	def __init__(self):
		dict.__init__(self)
		self['type'] = '' # String 'Image', 'Video', 'Audio' or '' for undefined type
		self['id'] = '' # String containg a number
		self['title'] = ''
		self['tags'] = [] # Array of strings
		self['original'] = '' # String (original file name with path relative to root folder)
		self['thumbnail'] = ImageSrc()
		self['poster'] = ImageSrc()
		self['galleryId'] = '' # String containg a number
		self['galleryTitle'] = ''
	def __setitem__(self, key, value):
		if key not in MediaItem._keys:
			raise KeyError
		dict.__setitem__(self, key, value)

#***** Gallery-related methods

def mediaType(fileExt):
	ImageExts = ['.jpg', '.jpeg', '.png']
	VideoExts = ['.avi', '.mp4', '.ogv', '.webm', '.mov']
	AudioExts = ['.mp3', '.ogg' ]
	if ImageExts.count(fileExt) > 0:
		return 'Image'
	if VideoExts.count(fileExt) > 0:
		return 'Video'
	if AudioExts.count(fileExt) > 0:
		return 'Audio'
	else:
		return ''

def mediaId(fileBase):
	# Gallery name format "INDEX-TITLE" (- escaped using --)
	# Gallery item name format "INDEX-TAG-...-TAG-TITLE" (- escaped using --)
	id = re.sub('--', '–', fileBase) # Pay attention to unicode en-dash character
	# Take leading digits
	id = re.sub(r'^([0-9]+)-.*$', r'\1', id)
	return id

def mediaTitle(fileBase):
	# Gallery name format "INDEX-TITLE" (- escaped using --)
	# Gallery item name format "INDEX-TAG-...-TAG-TITLE" (- escaped using --)
	title = re.sub('--', '–', fileBase) # Pay attention to unicode en-dash character
	# Take substring after last dash
	title = re.sub(r'^.*-([^-]*)$', r'\1', title)
	return title

def mediaTags(fileBase):
	# Gallery item name format "INDEX-TAG-...-TAG-TITLE" (- escaped using --)
	text = re.sub('--', '–', fileBase) # Pay attention to unicode en-dash character
	# Remove leading digits and substring after last dash
	text = re.sub(r'^[0-9]+-(.*)-[^-]*$', r'\1', text)
	tags = text.split('-')
	return tags

def mediaSize(filePath):
	fileExt = os.path.splitext(filePath)[1]
	type = mediaType(fileExt)
	width = 0
	height = 0
	if type == 'Image':
		# ImageMagick's identify
		#stdout = subprocess.Popen([ToolIdentify, '-format', '%wx%h', filePath], stdout = subprocess.PIPE).communicate()[0].decode('utf-8')
		#width, height = [ int(x) for x in stdout.split('x') ]
		# OR
		#stdout = subprocess.check_output([ToolIdentify, '-format', '%wx%h', filePath], universal_newlines = True)
		#width, height = [ int(x) for x in stdout.split('x') ]
		# python-pillow
		image = Image.open(filePath);
		width, height = image.size
	elif type == 'Video':
		stdout = subprocess.Popen([ ToolFFprobe, filePath, '-show_streams' ], stdout = subprocess.PIPE, stderr = subprocess.DEVNULL).communicate()[0].decode('utf-8')
		width = int(re.search(r'^width=([0-9]+)$', stdout, re.MULTILINE).groups()[0])
		height = int(re.search(r'^height=([0-9]+)$', stdout, re.MULTILINE).groups()[0])
	else: # Audio or unknown
		logE('Cannot get dimension for "{0}"'.format(os.path.join(os.getcwd(), filePath)))
	return Size(width, height)
AudioThumbnailWidth, AudioThumbnailHeight = mediaSize(AudioThumbnail)
AudioPosterWidth, AudioPosterHeight = mediaSize(AudioPoster)

def mediaShrunkenSize(originalSize, maxWidth, maxHeight):
	width = 0
	height = 0
	if originalSize.width > originalSize.height:
		# Landscape
		width = min(originalSize.width, maxWidth)
		zoom = float(originalSize.height) / originalSize.width;
		height = round(zoom * width)
	else:
		#Portrait
		height = min(originalSize.height, maxHeight)
		zoom = float(originalSize.width) / originalSize.height;
		width = round(zoom * height)
	return Size(width, height)

def convertOriginalToMediaItem(galleryId, galleryName, fileName):
	mediaItem = MediaItem()
	fileBase = os.path.splitext(fileName)[0]
	fileExt = os.path.splitext(fileName)[1]
	type = mediaType(fileExt)
	if type != '':
		mediaItem['type'] = type
		id = mediaId(fileBase)
		mediaItem['id'] = id
		mediaItem['title'] = mediaTitle(fileBase)
		mediaItem['tags'] = mediaTags(fileBase)
		original = os.path.join(SiteData, Galleries, galleryName, fileName)
		mediaItem['original'] = original
		base = os.path.join(SiteMetaData, Galleries, galleryId, id)
		if type == 'Image':
			originalSize = mediaSize(original)
			thumbnailSize = mediaShrunkenSize(originalSize, MaxThumbnailWidth, MaxThumbnailHeight)
			mediaItem['thumbnail']['path'] = base + MediaThumbnailSuffix + '.jpg'
			mediaItem['thumbnail'].setSize(thumbnailSize)
			posterSize = mediaShrunkenSize(originalSize, MaxImagePosterWidth, MaxImagePosterHeight)
			mediaItem['poster']['path'] = base + MediaPosterSuffix + '.jpg'
			mediaItem['poster'].setSize(posterSize)
		elif type == 'Video':
			originalSize = mediaSize(original)
			thumbnailSize = mediaShrunkenSize(originalSize, MaxThumbnailWidth, MaxThumbnailHeight)
			mediaItem['thumbnail']['path'] = base + MediaThumbnailSuffix + '.jpg'
			mediaItem['thumbnail'].setSize(thumbnailSize)
			posterSize = mediaShrunkenSize(originalSize, MaxVideoWidth, MaxVideoHeight)
			mediaItem['poster']['path'] = base + MediaPosterSuffix + '.jpg'
			mediaItem['poster'].setSize(posterSize)
		elif type == 'Audio':
			thumbnailSize = Size(AudioThumbnailWidth, AudioThumbnailHeight)
			mediaItem['thumbnail']['path'] = AudioThumbnail
			mediaItem['thumbnail'].setSize(thumbnailSize)
			posterSize = Size(AudioPosterWidth, AudioPosterHeight)
			mediaItem['poster']['path'] = AudioPoster
			mediaItem['poster'].setSize(posterSize)
		else:
			logE('Unknown type "{0}" for file {1}'.format(type, fileName))
		mediaItem['galleryId'] = galleryId
		mediaItem['galleryTitle'] = mediaTitle(galleryName)
	return mediaItem

#def encodeUri(text):
#	# TODO: Do better to not encode e.g. http:// to http%3A//
#	return urllib.parse.quote(text)

def encodeHtml(text):
	return html.escape(text)

def storeToFile(filePath, data):
	try:
		fileOpen = False
		if not argDryRun:
			f = open(filePath, 'w')
			fileOpen = True
			f.write(data)
		else:
			print(data)
		logI('Generated "{0}"'.format(filePath))
	except Exception as ex:
		logE('Cannot write to "{0}" ({1})'.format(filePath), str(ex))
		logI('  Current folder is: "{0}"'.format(os.getcwd()))
	finally:
		if fileOpen:
			f.close()

def generateRss(galleriesIn, galleriesOut, galleryNames):
	def rssItem(title, link, guid, date, description):
		item = '''
	<item>
		<title>''' + title + '''</title>
		<link>''' + os.path.join(WebLocation, link) + '''</link>
		<guid isPermaLink="false">''' + guid + '''</guid>
		<pubDate>''' + itemDate + '''</pubDate>
		<description>''' + encodeHtml(description) + '''
		</description>
	</item>'''
		return item

	def descriptionItem(galleryId, itemId):
		mediaItem = galleriesIn[galleryId][itemId]
		item = '''
				<li><a href="''' + os.path.join(WebLocation, '#' + Galleries, str(galleryId), str(itemId)) + '''">
					<img width="''' + str(mediaItem['thumbnail']['width']) + '''" height="''' + str(mediaItem['thumbnail']['height']) + '''"
						alt="''' + mediaItem['title'] + '''"
						title="''' + mediaItem['title'] + '''"
						src="''' + os.path.join(WebLocation, mediaItem['thumbnail']['path']) + '''"></li>'''
		return item

	rssFile_Items = ''

	itemDate = formatdate(time.time(), localtime = True)

	# Generate RSS records for new galleries
	galleryIds = sorted([ galId for galId in galleriesIn.keys() if galId not in galleriesOut.keys() ])
	if len(galleryIds) > 0:
		logI('')
		logI('New galleries:')
	for galleryId in galleryIds:
		itemDescription_Items = ''
		totalItemsCount = len(galleriesIn[galleryId])
		itemsCount = 0
		for itemId in sorted(galleriesIn[galleryId].keys()):
			# Show at least 5 items and use "... and X more" for X >= 3
			if itemsCount < 5 or itemsCount + 3 > totalItemsCount:
				itemDescription_Items += descriptionItem(galleryId, itemId)
			else:
				itemDescription_Items += '''
				<li>... a ''' + str(totalItemsCount - itemsCount) + ''' dalších</li>'''
				break
			itemsCount += 1
		if totalItemsCount > 0:
			itemDescription = '''
			<style>li{{list-style:none;}}</style>
			<div>Obsahuje {0} položek:</div>
			<ul>{1}
			</ul>'''.format(totalItemsCount, itemDescription_Items)
		else:
			itemDescription = '''
			<div>Galerie je zatím prázdná.</div>'''

		itemTitle = 'Nová gallerie: {0}'.format(mediaTitle(galleryNames[galleryId]))
		itemLink = os.path.join('#' + Galleries, galleryId)
		itemGuid = itemLink
		rssFile_Items += rssItem(itemTitle, itemLink, itemGuid, itemDate, itemDescription)
		logI('    "{0}" ({1} items)'.format(galleryNames[galleryId], str(totalItemsCount)))

	# Generate RSS records for modified galleries
	galleryIds = sorted([ galId for galId in galleriesIn.keys() if galId in galleriesOut.keys() ])
	if len(galleryIds) > 0:
		logI('')
		logI('Modified galleries:')
	for galleryId in galleryIds:
		itemIds = sorted([ itemId for itemId in galleriesIn[galleryId].keys() if itemId not in galleriesOut[galleryId].keys() ])
		totalItemsCount = len(itemIds)
		itemDescription_Items = ''
		itemsCount = 0
		for itemId in itemIds:
			# Show at least 5 items and use "... and X more" for X >= 3
			if itemsCount < 5 or itemsCount + 3 > totalItemsCount:
				itemDescription_Items += descriptionItem(galleryId, itemId)
			else:
				itemDescription_Items += '''
				<li>... a ''' + str(totalItemsCount - itemsCount) + ''' dalších</li>'''
				break
			itemsCount += 1
		itemDescription = '''
			<style>li{{list-style:none;}}</style>
			<div>Přidáno {0} položek:</div>
			<ul>{1}
			</ul>'''.format(totalItemsCount, itemDescription_Items)

		if totalItemsCount > 0:
			itemTitle = 'Změny v gallerii: {0}'.format(mediaTitle(galleryNames[galleryId]))
			itemLink = os.path.join('#' + Galleries, galleryId)
			itemGuid = itemLink
			rssFile_Items += rssItem(itemTitle, itemLink, itemGuid, itemDate, itemDescription)
			logI('    "{0}" (added {1} items)'.format(galleryNames[galleryId], str(totalItemsCount)))

	# Store list of galleries
	if rssFile_Items != '':
		rssFileData = '''<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
	<title>''' + WebTitle + '''</title>
	<link>''' + WebLocation + '''</link>
	<atom:link href="''' + os.path.join(WebLocation, SiteMetaData, 'rss.xml') + '''" rel="self" type="application/rss+xml" />
	<description></description>
	<language>cs</language>
	<image>
		<url>''' + os.path.join(WebLocation, 'apple-touch-icon.png') + '''</url>
		<title>''' + WebTitle + '''</title>
		<link>''' + WebLocation + '''</link>
	</image>''' + rssFile_Items + '''
</channel>
</rss>
'''
		rssFilePath = os.path.join(SiteMetaData, 'rss.xml')
		storeToFile(rssFilePath, rssFileData)

def generateJson_News(galleriesIn, galleriesOut, galleryNames):
	newGalleries = []
	for galleryId in sorted([ galId for galId in galleriesIn.keys() if galId not in galleriesOut.keys() ]):
		itemIds = sorted(galleriesIn[galleryId].keys())
		totalItemsCount = len(itemIds)
		itemsCount = 0
		showItems = []
		notListedItemsCount = 0
		for itemId in itemIds:
			# Show at least 10 items and use "... and X more" for X >= 5
			if itemsCount < 10 or itemsCount + 5 > totalItemsCount:
				showItems.append(galleriesIn[galleryId][itemId])
			else:
				notListedItemsCount = totalItemsCount - itemsCount
				break
			itemsCount += 1
		if len(showItems) > 0:
			newGallery = {}
			newGallery['id'] = galleryId
			newGallery['title'] = mediaTitle(galleryNames[galleryId])
			newGallery['items'] = showItems
			newGallery['notListedItemsCount'] = notListedItemsCount
			newGallery['removedItemsCount'] = 0
			newGalleries.append(newGallery)

	modifiedGalleries = []
	for galleryId in sorted([ galId for galId in galleriesIn.keys() if galId in galleriesOut.keys() ]):
		newItemIds = sorted([ itemId for itemId in galleriesIn[galleryId].keys() if itemId not in galleriesOut[galleryId].keys() ])
		totalNewItemsCount = len(newItemIds)
		removedItemIds = sorted([ itemId for itemId in galleriesOut[galleryId].keys() if itemId not in galleriesIn[galleryId] ])
		removedItemsCount = len(removedItemIds)
		itemsCount = 0
		showItems = []
		notListedItemsCount = 0
		for itemId in newItemIds:
			# Show at least 10 items and use "... and X more" for X >= 5
			if itemsCount < 10 or itemsCount + 5 > totalNewItemsCount:
				showItems.append(galleriesIn[galleryId][itemId])
			else:
				notListedItemsCount = totalNewItemsCount - itemsCount
				break
			itemsCount += 1
		if len(showItems) > 0 or removedItemsCount:
			modifiedGallery = {}
			modifiedGallery['id'] = galleryId
			modifiedGallery['title'] = mediaTitle(galleryNames[galleryId])
			modifiedGallery['items'] = showItems
			modifiedGallery['notListedItemsCount'] = notListedItemsCount
			modifiedGallery['removedItemsCount'] = removedItemsCount
			modifiedGalleries.append(modifiedGallery)

	newsFilePath = os.path.join(SiteMetaData, 'news.json')
	if len(newGalleries) > 0 or len(modifiedGalleries) > 0 or not os.path.isfile(newsFilePath):
		newsRecord = {}
		newsRecord['date'] = datetime.datetime.now().strftime('%d. %B %Y')
		newsRecord['newGalleries'] = newGalleries
		newsRecord['modifiedGalleries'] = modifiedGalleries
		newsRecords = [ newsRecord ] # Array with one item only
		newsFileData = json.dumps(newsRecords, separators = (',', ':'), sort_keys = True, ensure_ascii = False, indent = 1)
		storeToFile(newsFilePath, newsFileData)

def generateJson_Galleries(galleriesIn, galleriesOut, galleryNames):
	galleriesRecords = []
	for galleryId in sorted(galleriesIn.keys()):
		lastItemId = sorted(galleriesIn[galleryId].keys())[-1]
		galleriesRecord = {}
		galleriesRecord['id'] = galleryId
		galleriesRecord['title'] = mediaTitle(galleryNames[galleryId])
		galleriesRecord['lastItem'] = galleriesIn[galleryId][lastItemId]
		galleriesRecords.append(galleriesRecord)
	galleriesFileData = json.dumps(galleriesRecords, separators = (',', ':'), sort_keys = True, ensure_ascii = False, indent = 1)
	galleriesFilePath = os.path.join(SiteMetaData, 'galleries.json')
	storeToFile(galleriesFilePath, galleriesFileData)

	for galleryId in sorted(galleriesIn.keys()):
		galleryRecords = [ galleriesIn[galleryId][itemId] for itemId in sorted(galleriesIn[galleryId].keys()) ]
		galleryFileData = json.dumps(galleryRecords, separators = (',', ':'), sort_keys = True, ensure_ascii = False, indent = 1)
		galleryFilePath = os.path.join(SiteMetaData, Galleries, galleryId + '.json')
		storeToFile(galleryFilePath, galleryFileData)

def generateJson(galleriesIn, galleriesOut, galleryNames):
	logI('')
	generateJson_News(galleriesIn, galleriesOut, galleryNames)
	generateJson_Galleries(galleriesIn, galleriesOut, galleryNames)
	#generateJson_Projects(galleriesIn, galleriesOut, galleryNames)
	#generateJson_Japanese(galleriesIn, galleriesOut, galleryNames)

def videoScaleArg(size):
	scale = ''
	if size.width > size.height:
		# Landscape
		scale = 'scale={0}:trunc(ow/a/2)*2'.format(size.width)
	else:
		# Portrait
		scale = 'scale=trunc(oh*a/2)*2:{0}'.format(size.height)
	return scale

def createImageThumbnail(mediaItem, fileName):
	try:
		if not argDryRun:
			image = Image.open(mediaItem['original'], 'r')
			image.thumbnail(mediaItem['thumbnail'].size(), Image.ANTIALIAS)
			image.save(fileName, "JPEG")
		logI('Created "{0}"'.format(fileName))
	except Exception as ex:
		logE('Cannot write to "{0}" ({1})'.format(os.path.join(os.getcwd(), fileName), str(ex)))
def createImagePoster(mediaItem, fileName):
	try:
		if not argDryRun:
			image = Image.open(mediaItem['original'], 'r')
			#image.resize(mediaItem['poster'].size(), Image.ANTIALIAS) # File is too big
			image.thumbnail(mediaItem['poster'].size(), Image.ANTIALIAS)
			image.save(fileName, "JPEG")
		logI('Created "{0}"'.format(fileName))
	except Exception as ex:
		logE('Cannot write to "{0}" ({1})'.format(os.path.join(os.getcwd(), fileName), str(ex)))
def createAudioMp3(mediaItem, fileName):
	try:
		if not argDryRun:
			command = [ ToolFFmpeg, '-i',  mediaItem['original'], '-vn', '-codec:a', 'libmp3lame', '-b:a', '160k', '-ar', '44100', '-ac', '2', '-f', 'mp3', fileName ]
			subprocess.check_call(command, stderr = subprocess.DEVNULL)
		logI('Created "{0}"'.format(fileName))
	except Exception as ex:
		logE('Cannot write to "{0}" ({1})'.format(os.path.join(os.getcwd(), fileName), str(ex)))
def createAudioOgg(mediaItem, fileName):
	try:
		if not argDryRun:
			command = [ ToolFFmpeg, '-i',  mediaItem['original'], '-vn', '-codec:a', 'libvorbis', '-b:a', '160k', '-ar', '44100', '-ac', '2', '-f', 'ogg', fileName ]
			subprocess.check_call(command, stderr = subprocess.DEVNULL)
		logI('Created "{0}"'.format(fileName))
	except Exception as ex:
		logE('Cannot write to "{0}" ({1})'.format(os.path.join(os.getcwd(), fileName), str(ex)))
def createVideoThumbnail(mediaItem, fileName):
	try:
		if not argDryRun:
			scale = videoScaleArg(mediaItem['thumbnail'].size())
			# Create thumbnail
			command = [ ToolFFmpeg, '-i',  mediaItem['original'], '-filter:v', scale, '-ss', '00:00:00', '-frames:v', '1', '-r', '1', '-q:v', '1', '-f', 'image2', fileName ]
			subprocess.check_call(command, stderr = subprocess.DEVNULL)
			# Add video watermark into thumbnail
			command = [ ToolComposite, '-dissolve', '50%', '-gravity', 'center', VideoThumbnailWatermark, fileName, fileName ]
			subprocess.check_call(command, stderr = subprocess.DEVNULL)
		logI('Created "{0}"'.format(fileName))
	except Exception as ex:
		logE('Cannot write to "{0}" ({1})'.format(os.path.join(os.getcwd(), fileName), str(ex)))
def createVideoPoster(mediaItem, fileName):
	try:
		if not argDryRun:
			scale = videoScaleArg(mediaItem['poster'].size())
			command = [ ToolFFmpeg, '-i',  mediaItem['original'], '-filter:v', scale, '-ss', '00:00:00', '-frames:v', '1', '-r', '1', '-q:v', '1', '-f', 'image2', fileName ]
			subprocess.check_call(command, stderr = subprocess.DEVNULL)
		logI('Created "{0}"'.format(fileName))
	except Exception as ex:
		logE('Cannot write to "{0}" ({1})'.format(os.path.join(os.getcwd(), fileName), str(ex)))
def createVideoMp4(mediaItem, fileName):
	try:
		if not argDryRun:
			scale = videoScaleArg(mediaItem['poster'].size())
			command = [ ToolFFmpeg, '-i',  mediaItem['original'], '-filter:v', scale, '-codec:v', 'libx264', '-b:v', '500k', '-codec:a', 'aac', '-b:a', '160k', '-ar', '44100', '-ac', '2', '-strict', 'experimental', '-f', 'mp4', fileName ]
			subprocess.check_call(command, stderr = subprocess.DEVNULL)
		logI('Created "{0}"'.format(fileName))
	except Exception as ex:
		logE('Cannot write to "{0}" ({1})'.format(os.path.join(os.getcwd(), fileName), str(ex)))
def createVideoOgv(mediaItem, fileName):
	try:
		if not argDryRun:
			scale = videoScaleArg(mediaItem['poster'].size())
			command = [ ToolFFmpeg, '-i',  mediaItem['original'], '-filter:v', scale, '-codec:v', 'libtheora', '-b:v', '500k', '-codec:a', 'libvorbis', '-b:a', '160k', '-ar', '44100', '-ac', '2', '-f', 'ogg', fileName ]
			subprocess.check_call(command, stderr = subprocess.DEVNULL)
		logI('Created "{0}"'.format(fileName))
	except Exception as ex:
		logE('Cannot write to "{0}" ({1})'.format(os.path.join(os.getcwd(), fileName), str(ex)))
def createVideoWebm(mediaItem, fileName):
	try:
		if not argDryRun:
			scale = videoScaleArg(mediaItem['poster'].size())
			command = [ ToolFFmpeg, '-i',  mediaItem['original'], '-filter:v', scale, '-codec:v', 'libvpx', '-b:v', '500k', '-codec:a', 'libvorbis', '-b:a', '160k', '-ar', '44100', '-ac', '2', '-f', 'webm', fileName ]
			subprocess.check_call(command, stderr = subprocess.DEVNULL)
		logI('Created "{0}"'.format(fileName))
	except Exception as ex:
		logE('Cannot write to "{0}" ({1})'.format(os.path.join(os.getcwd(), fileName), str(ex)))

def generateMedia(galleriesIn, galleriesOut, galleryNames):
	def createFileFuture(fn, galleryId, itemId, fileName):
		if galleryId not in galleriesOut.keys() or itemId not in galleriesOut[galleryId].keys() or os.path.split(fileName)[1] not in galleriesOut[galleryId][itemId]:
			if not argDryRun:
				future = executor.submit(fn, galleriesIn[galleryId][itemId], fileName)
				futures[future] = fileName
			else:
				logI('Created "{0}"'.format(fileName))

	logI('')
	logI('>>>>> Creating media metadata files started...')

	# Collect futures for parallel execution
	if not argDryRun:
		#executor = concurrent.futures.ProcessPoolExecutor(max_workers = 1) # TODO: Remove parameter to use all CPUs?
		executor = concurrent.futures.ProcessPoolExecutor()
		futures = {}

	# Create missing folders
	for galleryId in sorted([ galId for galId in galleriesIn.keys() if galId not in galleriesOut.keys() ]):
		galleryPath = os.path.join(SiteMetaData, Galleries, galleryId)
		if not os.path.isdir(galleryPath):
			if not argDryRun:
				os.makedirs(galleryPath, mode = 0o755, exist_ok = True)
			logI('Created folder "{0}"'.format(galleryPath))

	# Create features for missing items/files
	for galleryId in sorted(galleriesIn.keys()):
		for itemId in sorted(galleriesIn[galleryId]):
			mediaItem = galleriesIn[galleryId][itemId]
			mediaItemBasePath = os.path.join(SiteMetaData, Galleries, galleryId, itemId)
			if mediaItem['type'] == 'Image':
				createFileFuture(createImageThumbnail, galleryId, itemId, mediaItem['thumbnail']['path'])
				createFileFuture(createImagePoster, galleryId, itemId, mediaItem['poster']['path'])
			if mediaItem['type'] == 'Audio':
				createFileFuture(createAudioMp3, galleryId, itemId, mediaItemBasePath + '.mp3')
				createFileFuture(createAudioOgg, galleryId, itemId, mediaItemBasePath + '.ogg')
			if mediaItem['type'] == 'Video':
				createFileFuture(createVideoThumbnail, galleryId, itemId, mediaItem['thumbnail']['path'])
				createFileFuture(createVideoPoster, galleryId, itemId, mediaItem['poster']['path'])
				createFileFuture(createVideoMp4, galleryId, itemId, mediaItemBasePath + '.mp4')
				createFileFuture(createVideoOgv, galleryId, itemId, mediaItemBasePath + '.ogv')
				createFileFuture(createVideoWebm, galleryId, itemId, mediaItemBasePath + '.webm')

	# Wait for finishing all operations
	if not argDryRun:
		logD('{0} operations queued'.format(str(len(futures))))
		concurrent.futures.wait(futures)

	logI('<<<<< Creating media metadata files finished.')

def displayStatisticalData(galleriesIn, galleriesOut, galleryNames):
	logI('')
	logI('New galleries (*):')
	for galleryId in sorted([ galId for galId in galleriesIn.keys() if galId not in galleriesOut.keys() ]):
		itemsCount = len(galleriesIn[galleryId].keys())
		logI('    "{0}" ({1} items/files)'.format(galleryNames[galleryId], str(itemsCount)))

	logI('')
	logI('New items in existing galleries (*):')
	for galleryId in sorted([ galId for galId in galleriesIn.keys() if galId in galleriesOut.keys() ]):
		itemIds = sorted([ itemId for itemId in galleriesIn[galleryId].keys() if itemId not in galleriesOut[galleryId].keys() ])
		itemsCount = len(itemIds)
		if itemsCount > 0:
			logI('    "{0}" ({1} items/files)'.format(galleryNames[galleryId], str(itemsCount)))
		for itemId in itemIds:
			logI('        "{0}"'.format(os.path.basename(galleriesIn[galleryId][itemId]['original'])))

	logI('')
	logI('Removed galleries (**):')
	for galleryId in sorted([ galId for galId in galleriesOut.keys() if galId not in galleriesIn.keys() ]):
		itemsCount = len(galleriesOut[galleryId].keys())
		filesCount = 0
		for itemId in galleriesOut[galleryId].keys():
			filesCount += len(galleriesOut[galleryId][itemId])
		logI('    "{0}" ({1} items / {2} files)'.format(galleryNames[galleryId], str(itemsCount), str(filesCount)))

	logI('')
	logI('Deleted items in existing galleries (**):')
	for galleryId in sorted([ galId for galId in galleriesOut.keys() if galId in galleriesIn.keys() ]):
		itemIds = sorted([ itemId for itemId in galleriesOut[galleryId].keys() if itemId not in galleriesIn[galleryId] ])
		itemsCount = len(itemIds)
		filesCount = 0
		for itemId in itemIds:
			filesCount += len(galleriesOut[galleryId][itemId])
		if itemsCount > 0:
			logI('    "{0}" ({1} items / {2} files)'.format(galleryNames[galleryId], str(itemsCount), str(filesCount)))
		for itemId in itemIds:
			logI('        "{0}-???"'.format(itemId))
			for itemFile in galleriesOut[galleryId][itemId]:
				logI('            "{0}"'.format(itemFile))

	logI('')
	logI('*) RUN script with any combination of arguments ({0}, {1}, {2}) to update site metadata.'.format(ArgRss, ArgJson, ArgMedia))
	# TODO: Add script argument to help clean
	logI('**) DELETE files/folders manually from "{0}"'.format(os.path.join(os.getcwd(), SiteMetaData, Galleries)))

#**********

if __name__ == '__main__':
	argDryRun = False
	argRss = False
	argJson = False
	argMedia = False

	firstArg = True
	for arg in sys.argv:
		if firstArg:
			firstArg = False
			continue # Skip program name
		if arg == '-h' or arg == '--help':
			displayHelp()
			exit(0)
		if arg == ArgDryRun:
			logW('>>>>>>>> RUNNING IN DRY MODE <<<<<<<<')
			logW('>>>>> No changes will be stored <<<<<')
			argDryRun = True
			continue
		if arg == ArgRss:
			argRss = True
			continue
		if arg == ArgJson:
			argJson = True
			continue
		if arg == ArgMedia:
			argMedia = True
			continue
		if arg == ArgAll:
			argRss = True
			argJson = True
			argMedia = True
			continue

	toolsCheckResult = checkTools()
	if toolsCheckResult != 0:
		exit(toolsCheckResult)

	# Check source root folder
	if not os.access(SiteData, os.R_OK | os.X_OK):
		logE('Cannot read from folder "{0}"'.format(os.path.join(os.getcwd(), SiteData)))
		exit(21)
	# Check source galleries folder
	if not os.access(os.path.join(SiteData, Galleries), os.R_OK | os.X_OK):
		logE('Cannot read from folder "{0}"'.format(os.path.join(os.getcwd(), SiteData, Galleries)))
		exit(31)

	# TODO: Replace by os.makedirs(path, mode = 0o750, exist_ok = True) when creating final folder
	#if not argDryRun:
	#	# Ensure target root folder exists and is writable
	#	if not os.path.isdir(SiteMetaData):
	#		os.mkdir(SiteMetaData, 0o750)
	#	if not os.access(SiteMetaData, os.W_OK | os.X_OK):
	#		logE('Cannot write to folder "{0}"'.format(os.path.join(os.getcwd(), SiteMetaData)))
	#		exit(22)
	#	# Ensure target galleries folder exists and is writable
	#	if not os.path.isdir(os.path.join(SiteMetaData, Galleries)):
	#		os.mkdir(os.path.join(SiteMetaData, Galleries), 0o750)
	#	if not os.access(os.path.join(SiteMetaData, Galleries), os.W_OK | os.X_OK):
	#		logE('Cannot write to folder "{0}"'.format(os.path.join(os.getcwd(), SiteMetaData, Galleries)))
	#		exit(32)


	try:
		# Key: gallery ID (number as string)
		# Value: dictionary
		#     Key: media item ID (number as string)
		#     Value: MediaItem
		galleriesIn = {}
		# Key: gallery ID (number as string)
		# Value: dictionary
		#     Key: item ID (number as string)
		#     Value: item related files (array of strings)
		galleriesOut = {}

		# Key: gallery ID (number as string)
		# Value: gallery folder name (string)
		galleryNames = {}

		galleriesIn_Names = [name for name in sorted(os.listdir(os.path.join(SiteData, Galleries))) if os.path.isdir(os.path.join(SiteData, Galleries, name)) ]
		for galleryName in galleriesIn_Names:
			logD('In Gallery: ' + galleryName)
			galleryId = mediaId(galleryName)
			if galleryId in galleriesIn.keys():
				logE('          : Gallery ID {0} already exists!'.format(galleryId))
				logW('          : Gallery "{0}" will be unabailable in favor of "{1}"'.format(galleryNames[galleryId], galleryName))
			galleryNames[galleryId] = galleryName
			galleriesIn[galleryId] = {}
			galleryPath = os.path.join(SiteData, Galleries, galleryName)
			fileNames = [name for name in sorted(os.listdir(galleryPath)) if os.path.isfile(os.path.join(galleryPath, name)) ]
			for fileName in fileNames:
				logD('In    Item: ' + fileName)
				mediaItem = convertOriginalToMediaItem(galleryId, galleryNames[galleryId], fileName)
				if mediaItem['type'] == '':
					logE('          : Ignored unsupported media type "{0}"'.format(fileName))
				else:
					itemId = mediaItem['id']
					if itemId in galleriesIn[galleryId].keys():
						logE('          : Gallery ID {0} already has item with ID {1}!'.format(galleryId, itemId))
						logW('          : File "{0}" will be unabailable in favor of "{1}"'.format(galleryNames[galleryId]['original'], mediaItem['original']))
					else:
						galleriesIn[galleryId][itemId] = mediaItem

		if os.path.isdir(os.path.join(SiteMetaData, Galleries)):
			galleriesOut_Names = [name for name in sorted(os.listdir(os.path.join(SiteMetaData, Galleries))) if os.path.isdir(os.path.join(SiteMetaData, Galleries, name)) ]
			for galleryName in galleriesOut_Names:
				logD('Out Gallery: ' + galleryName)
				galleryId = galleryName
				if galleryId in galleriesOut.keys():
					logE('          : Gallery ID {0} already exists!'.format(galleryId))
					logW('          : Gallery "{0}" will be unabailable in favor of "{1}"'.format(galleryNames[galleryId], galleryName))
				galleriesOut[galleryId] = {}
				galleryPath = os.path.join(SiteMetaData, Galleries, galleryName)
				fileNames = [name for name in sorted(os.listdir(galleryPath)) if os.path.isfile(os.path.join(galleryPath, name)) ]
				for fileName in fileNames:
					logD('Out    Item: ' + fileName)
					#itemId = mediaId(os.path.splitext(fileName)[0])
					itemId = re.sub(r'^([0-9]+)\..*$', r'\1', os.path.splitext(fileName)[0]) # File name starts with digits followed at least by a dot
					if itemId not in galleriesOut[galleryId].keys():
						galleriesOut[galleryId][itemId] = []
					if fileName in galleriesOut[galleryId][itemId]:
						logE('          : File "{0}" already registered for gallery ID {1} and item ID {2}!'.format(fileName, galleryId, itemId))
						logW('          : Fix this inconsistency manually')
					galleriesOut[galleryId][itemId].append(fileName)

		logD('')
		logD('Gallery items in folder "{0}":'.format(os.path.join(os.getcwd(), SiteData, Galleries)))
		for galleryId in sorted(galleriesIn.keys()):
			logD('    "{0}"'.format(galleryNames[galleryId]))
			for itemId in sorted(galleriesIn[galleryId].keys()):
				logD('        "{0}"'.format(os.path.basename(galleriesIn[galleryId][itemId]['original'])))

		logD('')
		logD('Gallery items in folder "{0}":'.format(os.path.join(os.getcwd(), SiteMetaData, Galleries)))
		for galleryId in sorted(galleriesOut.keys()):
			logD('    "{0}"'.format(galleryNames[galleryId]))
			for itemId in sorted(galleriesOut[galleryId].keys()):
				logD('        "{0}"'.format(itemId))
				for itemFile in sorted(galleriesOut[galleryId][itemId]):
					logD('            "{0}"'.format(itemFile))

		if not argRss and not argMedia and not argJson:
			displayStatisticalData(galleriesIn, galleriesOut, galleryNames)
		else:
			if argRss:
				generateRss(galleriesIn, galleriesOut, galleryNames)
			if argJson:
				generateJson(galleriesIn, galleriesOut, galleryNames)
			if argMedia:
				generateMedia(galleriesIn, galleriesOut, galleryNames)

	except Exception as ex:
		logE('Unhandled exception occured!!! ({0})'.format(str(ex)))
		exit(1)

	finally:
		pass

	exit(0)
