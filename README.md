# HTML5 Web with Multimedia Gallery

This project is designed to replace personal web pages or blogs based on any CMS with strong focus to multimedia content.

Whole web is build on HTML5, CSS3 and JavaScript and is fully responsive. Web source data is not directly visible in browser. Instead of that a Python 3 script converts it into metadata which is processed by browser on client side then.

Source data supports:
 * Static HTML page segments (useful for not too frequently changed blogs or static pages)
 * Multimedia (directory based) galleries for:
   * Image
   * Video
   * Audio

Update Python script generates:
 * Thumbnails for images and videos
 * Images smaller than original suitable for web browsers (up to 1500x1000 px)
 * Videos in HTML5 supported formats mp4, ogv and webm (up to 360p)
 * Audio files in HTML5 supported formats mp3 and ogg
 * Web metadata in HTML or JSON format
 * RSS and news metadata which summarizes changes from last run (currently recognizes only changes in galleries)
 * Multimedia processing is run in parallel and utilizes all available CPUs
 * The script also supports a "dry run" that only shows what would be done without real changes on storage
