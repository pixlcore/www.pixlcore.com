// PixlCore API Layer
// Copyright (c) 2024 Joseph Huckaby

const fs = require('fs');
const Path = require('path');
const assert = require("assert");
const async = require('async');

const XML = require('pixl-xml');
const Tools = require("pixl-tools");
const PixlRequest = require("pixl-request");
const LRU = require('pixl-cache');
const marked = require('marked');

const config = require('../config.json');

// setup marked
marked.use({ renderer: {
	blockquote: function(html) {
		html = html.trim().replace(/^<p>([\s\S]+)<\/p>$/, '$1');
		
		if (html.match(/^\[\!(\w+)\]\s*/)) {
			var type = RegExp.$1.toLowerCase();
			var title = Tools.ucfirst(type);
			var icons = { note: 'information-outline', tip: 'lightbulb-on-outline', important: 'alert-decagram', warning: 'alert-circle', caution: 'fire-alert' };
			var icon = icons[type];
			
			html = html.replace(/^\[\!(\w+)\]\s*/, '');
			return `<div class="blocknote ${type}"><div class="bn_title"><i class="mdi mdi-${icon}">&nbsp;</i>${title}</div><div class="bn_content">${html}</div></div>`;
		}
		else return `<blockquote>${html}</blockquote>`;
	}
} });

module.exports = {
	
	startup: function(callback) {
		this.cache = new LRU({ 
			maxAge: 86400,
			maxItems: 5000, 
			maxBytes: 1024 * 1024 * 50
		});
		this.html = fs.readFileSync( Path.join( Path.dirname(__dirname), 'htdocs', 'index.html'), 'utf8');
		
		this.request = new PixlRequest( "PixlCore.com v1.0" );
		this.request.setTimeout( 30 * 1000 );
		this.request.setFollow( 5 );
		this.request.setAutoError( true );
		this.request.setKeepAlive( true );
		
		this.preloadBlog(callback);
		// callback();
	},
	
	preloadBlog(callback) {
		// preload all blog articles, cache in memory
		var self = this;
		this.articles = {};
		
		async.eachLimit( config.articles, 8,
			function(slug, callback) {
				var url = 'https://raw.githubusercontent.com/pixlcore/blog/main/' + slug + '.md';
				self.logDebug(4, "Preloading blog article: " + slug + ": " + url);
				
				self.get_cached_url( url, function(err, text) {
					if (err) return callback(err);
					
					/* <!-- Title: Process-Level Network Monitoring Using eBPF Kernel Probes -->
					<!-- Summary: My journey attempting to create a process-specific network bandwidth monitor, similar to Nethogs, using built-in Linux tools and libraries. -->
					<!-- Author: jhuckaby -->
					<!-- Date: 2024/01/01 -->
					<!-- Tags: Networking, Linux, Perl --> */
					
					var article = {
						slug: slug,
						words: text.replace(/<.+?>/g, '').replace(/```[\S\s]+?```/g, '').replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '$1').match(/\w+/g).length
						// body: text
					};
					text.replace( /<\!--\s*(\w+):\s*(.+?)\s*-->/g, function(m_all, key, value) {
						article[ key.toLowerCase() ] = value;
						return m_all;
					} );
					article.date = Math.floor( (new Date(article.date + ' 00:00:00')).getTime() / 1000 );
					article.tags = article.tags.split(/\,\s*/);
					self.articles[slug] = article;
					
					callback();
				});
			},
			callback
		);
	},
	
	handler: function(args, callback) {
		// handler for /doc and /blog
		var uri = args.request.url.replace(/\?.*$/);
		
		if (uri.match(/^\/blog\/(.+?)\/?$/)) {
			// specific blog article by slug
			this.handle_blog( RegExp.$1, args, callback );
		}
		else if (uri.match(/^\/blog\/?$/)) {
			// latest blog article
			var slug = config.articles[0];
			this.handle_blog( slug, args, callback );
		}
		else if (uri.match(/^\/view\/([\w\-]+)\/?$/)) {
			// github repo markdown file by id
			var id = RegExp.$1;
			this.handle_page(id, args, callback);
		}
		else if (uri.match(/^\/doc\/([\w\-]+)\/(.+)$/)) {
			// specific markdown file in specific repo
			this.handle_doc( RegExp.$1, RegExp.$2, args, callback );
		}
		else if (uri.match(/^\/feed/)) {
			// feed
			this.handle_feed(args, callback);
		}
		else {
			// homepage
			this.handle_home(args, callback);
		}
	},
	
	handle_feed: function(args, callback) {
		// rss feed
		var self = this;
		var latest_slug = config.articles[0];
		var latest_epoch = this.articles[latest_slug].date;
		var base_url = args.url.replace(/\/feed\.\w+$/, '');
		
		var feed = {
			_Attribs: { version: "2.0" },
			channel: {
				title: "The PixlCore Blog",
				description: "Articles originally posted at PixlCore.com.",
				link: base_url + '/blog/',
				category: { _Attribs: { domain: "pixlcore.com" }, _Data: "Computers/Software/Internet/Site Management/Content Management" },
				copyright: "Copyright 2024 PixlCore.com",
				language: "en-us",
				lastBuildDate: this.get_rss_date(latest_epoch),
				generator: 'PixlCore RSS Generator v1.0',
				ttl: 60,
				image: {
					url: base_url + '/images/favicon-32x32.png',
					title: 'PixlCore.com',
					link: base_url + '/',
					width: 32,
					height: 32
				},
				item: []
			}
		};
		
		config.articles.forEach( function(slug) {
			var article = self.articles[slug];
			var author = config.authors[ article.author ];
			
			feed.channel.item.push({
				title: article.title,
				link: base_url + '/blog/' + slug,
				guid: base_url + '/blog/' + slug,
				description: article.summary,
				pubDate: self.get_rss_date(article.date),
				category: article.tags
			});
		});
		
		var parser = new XML.Parser( '<rss/>', { preserveAttributes: true } );
		parser.tree = feed;
		parser.piNodeList = [ '?xml version="1.0" encoding="UTF-8"?' ];
		
		callback( "200 OK", {
			'Content-Type': "text/xml",
			'Cache-Control': 'public, max-age=86400'
		}, parser.compose() );
	},
	
	handle_home: function(args, callback) {
		// home page
		var self = this;
		var slug = config.articles[0];
		var article = this.articles[slug];
		
		var payload = JSON.stringify({
			pages: config.pages,
			sidebar: config.sidebar,
			article: article,
			page: 'home'
		});
		
		var contents = this.html.replace(/<\!\-\-\s+DATA\s+\-\-\>/, payload);
		callback( "200 OK", {
			'Content-Type': "text/html",
			'Cache-Control': 'public, max-age=86400'
		}, contents );
	},
	
	handle_page: function(id, args, callback) {
		// show github repo markdown file as page content
		var self = this;
		var page = config.pages[id];
		if (!page) return callback( "404 Not Found", {}, "Unable to locate the requested page." );
		
		if (!page.file) page.file = 'README.md';
		var url = 'https://raw.githubusercontent.com/' + page.org + '/' + page.repo + '/' + page.branch + '/' + page.file;
		
		this.get_cached_html( url, function(err, html) {
			if (err) return callback( "404 Not Found", {}, "Unable to locate the requested file." );
			
			var payload = JSON.stringify({
				pages: config.pages,
				sidebar: config.sidebar,
				meta: page,
				slug: id,
				body: html,
				page: page.page || 'repo'
			});
			
			payload = payload.replace(/<\/script>/g, '</scr"+"ipt>');
			
			var contents = self.html.replace(/<\!\-\-\s+DATA\s+\-\-\>/, payload);
			callback( "200 OK", {
				'Content-Type': "text/html",
				'Cache-Control': 'public, max-age=86400'
			}, contents );
		} );
	},
	
	handle_doc: function(repo, path, args, callback) {
		// show github repo markdown file as page content
		var self = this;
		var page = config.pages[repo];
		if (!page) return callback( "404 Not Found", {}, "Unable to locate the requested repository." );
		
		page = Tools.copyHash(page);
		page.file = path;
		var url = 'https://raw.githubusercontent.com/' + page.org + '/' + page.repo + '/' + page.branch + '/' + page.file;
		
		this.get_cached_html( url, function(err, html) {
			if (err) return callback( "404 Not Found", {}, "Unable to locate the requested file." );
			
			var payload = JSON.stringify({
				pages: config.pages,
				sidebar: config.sidebar,
				meta: page,
				slug: repo,
				body: html,
				page: 'doc'
			});
			
			payload = payload.replace(/<\/script>/g, '</scr"+"ipt>');
			
			var contents = self.html.replace(/<\!\-\-\s+DATA\s+\-\-\>/, payload);
			callback( "200 OK", {
				'Content-Type': "text/html",
				'Cache-Control': 'public, max-age=86400'
			}, contents );
		} );
	},
	
	handle_blog: function(slug, args, callback) {
		// show blog article
		var self = this;
		this.logDebug(5, "Fetching article: " + slug);
		
		var article = this.articles[slug];
		if (!article) return callback( "404 Not Found", {}, "Unable to locate the requested article: " + slug );
		
		var archives = [];
		config.articles.forEach( function(slug) {
			archives.push( self.articles[slug] );
		});
		
		var url = 'https://raw.githubusercontent.com/pixlcore/blog/main/' + slug + '.md';
		
		this.get_cached_html( url, function(err, html) {
			if (err) return callback( "404 Not Found", {}, "Unable to locate the requested file." );
			
			var payload = JSON.stringify({
				pages: config.pages,
				authors: config.authors,
				sidebar: config.sidebar,
				archives: archives,
				article: article,
				slug: slug,
				body: html,
				page: 'blog'
			});
			
			var contents = self.html.replace(/<\!\-\-\s+DATA\s+\-\-\>/, payload);
			callback( "200 OK", {
				'Content-Type': "text/html",
				'Cache-Control': 'public, max-age=86400'
			}, contents );
		} );
	},
	
	get_cached_html: function(url, callback) {
		// fetcn url, convert to html, and cache result
		var self = this;
		var cache_id = 'MARKED:' + url;
		
		if (this.cache.has(cache_id)) {
			var html = this.cache.get(cache_id);
			return setImmediate( function() { callback(null, html); } );
		}
		
		this.get_cached_url( url, function(err, text) {
			if (err) return callback(err);
			
			var html = marked.parse(text, {
				gfm: true,
				tables: true,
				breaks: false,
				pedantic: false,
				sanitize: false,
				smartLists: true,
				smartypants: false,
				silent: true,
				headerIds: true,
				mangle: false
			});
			
			// if running in local debug mode, return without caching
			if (self.serverConfig.debug) return callback(null, html);
			
			self.cache.set( cache_id, html );
			callback(null, html);
		});
	},
	
	get_cached_url: function(url, callback) {
		// fetch url and cache response
		var self = this;
		
		// use local blog files in debug mode
		if (this.serverConfig.debug && url.match(/\/pixlcore\/blog\/main\/(.+)\.md$/)) {
			var slug = RegExp.$1;
			var file = '/Users/jhuckaby/git/blog/' + slug + '.md';
			this.logDebug(9, "Using local file: " + file);
			
			fs.readFile( file, 'utf8', function(err, text) {
				if (err) return callback(err);
				callback(null, text);
			} );
			
			return;
		}
		
		if (this.cache.has(url)) {
			this.logDebug(9, "Using value from cache: " + url);
			var text = this.cache.get(url);
			return setImmediate( function() { callback(null, text); } );
		}
		
		this.logDebug(9, "Fetching URL: " + url);
		
		this.request.get(url, function(err, resp, data, perf) {
			if (err) return callback(err);
			var text = data.toString();
			self.cache.set( url, text );
			callback(null, text);
		});
	},
	
	get_rss_date: function(epoch) {
		// given epocn, return rss-compatible date
		var dargs = Tools.getDateArgs(epoch);
		var abs_tz_offset_hours = Math.abs( dargs.offset );
		var tz_offset_polarity = (dargs.offset < 0) ? '-' : '+';
		var nice_rss_tz = tz_offset_polarity + Tools.zeroPad( abs_tz_offset_hours, 2 ) + '00';
		
		// <pubDate>Tue, 19 Oct 2004 13:38:55 -0400</pubDate>
		return Tools.sub( '[ddd], [dd] [mmm] [yyyy] [hh]:[mi]:[ss]', dargs ) + ' ' + nice_rss_tz;
	},
	
	shutdown: function(callback) {
		callback();
	}
	
};
