// PixlCore.com Web App
// Author: Joseph Huckaby
// Copyright (c) 2024 Joseph Huckaby

if (!window.app) throw new Error("App Framework is not present.");

app.extend({
	
	name: 'PixlCore',
	epoch: time_now(),
	default_prefs: {
		
	},
	debug_cats: {
		all: true,
		api: true,
		comm: true
	},
	preload_images: [
		'/images/orchestra-logomark.png',
		'/images/orchestra-logomark-hover.png'
	],
	
	colors: ["#008FFB", "#00E396", "#FEB019", "#FF4560", "#775DD0", "#3F51B5", "#4CAF50", "#546E7A", "#D4526E", "#A5978B", "#C7F464", "#81D4FA", "#2B908F", "#F9A3A4", "#90EE7E", "#FA4443", "#449DD1", "#F86624", "#69D2E7", "#EA3546", "#662E9B", "#C5D86D", "#D7263D", "#1B998B", "#2E294E", "#F46036", "#E2C044", "#662E9B", "#F86624", "#F9C80E", "#EA3546", "#43BCCD", "#5C4742", "#A5978B", "#8D5B4C", "#5A2A27", "#C4BBAF", "#A300D6", "#7D02EB", "#5653FE", "#2983FF", "#00B1F2", "#03A9F4", "#33B2DF", "#4ECDC4", "#13D8AA", "#FD6A6A", "#F9CE1D", "#FF9800"],
	
	receiveConfig: function(config) {
		// receive config from server
		window.config = config;
		
		if (config.debug) {
			Debug.enable( this.debug_cats );
			Debug.trace('system', "PixlCore Client Starting Up");
		}
		
		// preload a few essential images
		for (var idx = 0, len = this.preload_images.length; idx < len; idx++) {
			var img = new Image();
			img.src = this.preload_images[idx];
		}
		
		// load prefs and populate for first time users
		this.initPrefs();
		
		// setup theme (light / dark)
		this.initTheme();
		
		// accessibility
		this.initAccessibility();
		this.updateAccessibility();
		
		// header
		this.updateHeaderInfo();
		
		// mouse events
		this.setupMouseEvents();
		
		Dialog.hideProgress();
		
		// hook up mobile sidebar pullover
		$('#d_sidebar_toggle').on('mouseup', function() { app.pullSidebar(); } );
		
		window.addEventListener( "scroll", this.onScroll.bind(this), false );
		window.addEventListener( "scroll", debounce(this.onScrollDelay.bind(this), 250), false );
		
		this.page_manager = new PageManager( [] );
		this.div = $('div.main > div.page');
		
		var func = 'gosub_' + config.page;
		this[func]( config );
	},
	
	init: function() {
		// called by base.js
		setTimeout( function() { $('body').addClass('loaded'); }, 100 );
	},
	
	gosub_home(args) {
		// home page
		app.setWindowTitle( title );
		app.setHeaderTitle( '<i class="mdi mdi-home">&nbsp;</i>Welcome!' );
		
		// blurb
		
		// coming soon: orchestra
		
		// product spotlight: cronicle
		
		// latest blog article
	},
	
	gosub_special(args) {
		// special page (e.g. about)
		// args: { slug, meta, body }
		// meta: { title, icon, org, repo, branch, file }
		var self = this;
		var meta = args.meta;
		var html = '';
		
		app.setWindowTitle( meta.title );
		app.setHeaderTitle( '<i class="mdi mdi-' + meta.icon + '">&nbsp;</i>' + meta.title );
		
		html += '<div class="box">';
		
		// html += '<div class="box_title repo">';
		// 	html += '<i class="mdi mdi-' + meta.icon + '">&nbsp;</i>' + meta.title;
		// 	html += '<div class="button right" onClick="app.goRepo()" title="GitHub Repo for ' + meta.title + '..."><i class="mdi mdi-github">&nbsp;</i>GitHub Repo</div>';
		// 	html += '<div class="clear"></div>';
		// html += '</div>';
		
		html += '<div class="box_content">';
		html += '<div class="markdown-body" style="margin-top:15px; margin-bottom:15px;">';
		
		html += args.body;
		
		html += '<p class="article_fin"><i class="mdi mdi-console-line"></i></p>';
		
		html += '</div>'; // markdown-body
		html += '</div>'; // box_content
		html += '</div>'; // box
		
		this.div.html(html);
		this.expandInlineImages();
		this.highlightCodeBlocks();
		this.setupHeaderLinks();
		this.setupDetailSections();
	},
	
	gosub_repo(args) {
		// show github repo as page content
		// args: { slug, meta, body }
		// meta: { title, icon, org, repo, branch, file }
		var self = this;
		var meta = args.meta;
		var html = '';
		var group = this.findSidebarGroup(args.slug);
		
		if (!meta.title) meta.title = args.slug;
		
		app.setWindowTitle( meta.title + ' | ' + group.title );
		// app.setHeaderTitle( '<i class="mdi mdi-' + meta.icon + '">&nbsp;</i>' + meta.title );
		app.setHeaderTitle( '<i class="mdi mdi-' + group.icon + '"></i>' + group.title + '&nbsp;<i class="mdi mdi-chevron-right"></i>' + meta.title );
		
		html += '<div class="box">';
		
		html += '<div class="box_title repo">';
			html += '<i class="mdi mdi-' + meta.icon + '">&nbsp;</i>' + meta.title;
			html += '<div class="button right" onClick="app.goRepo()" title="GitHub Repo for ' + meta.title + '..."><i class="mdi mdi-github">&nbsp;</i>GitHub Repo</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		
		html += '<div class="box_content">';
		html += '<div class="markdown-body">';
		
		html += args.body;
		
		html += '<p class="article_fin"><i class="mdi mdi-console-line"></i></p>';
		
		html += '</div>'; // markdown-body
		html += '</div>'; // box_content
		html += '</div>'; // box
		
		this.div.html(html);
		this.expandInlineImages();
		this.highlightCodeBlocks();
		this.setupHeaderLinks();
		this.setupDetailSections();
		this.redirectGitHubLinks();
		this.wrapTables();
	},
	
	gosub_doc(args) {
		// show specific markdown file from specific github repo as page content
		// args: { slug, meta, body }
		// meta: { title, icon, org, repo, branch, file }
		var self = this;
		var meta = args.meta;
		var html = '';
		var group = this.findSidebarGroup(args.slug);
		
		if (!meta.title) meta.title = args.slug;
		
		// try to sniff out the subtitle by the first heading (ugh)
		if (args.body.match(/<h[123][^>]*>([^<]+)<\/h\d>/)) meta.subtitle = RegExp.$1;
		else meta.subtitle = 'Misc';
		
		app.setWindowTitle( meta.subtitle + ' | ' + meta.title + ' | ' + group.title );
		// app.setHeaderTitle( '<i class="mdi mdi-' + meta.icon + '">&nbsp;</i>' + meta.title );
		app.setHeaderTitle( '<i class="mdi mdi-' + group.icon + '"></i>' + group.title + '&nbsp;<i class="mdi mdi-chevron-right"></i>' + meta.title + '&nbsp;<i class="mdi mdi-chevron-right"></i>' + meta.subtitle );
		
		html += '<div class="box">';
		
		html += '<div class="box_title repo">';
			html += '<i class="mdi mdi-' + meta.icon + '">&nbsp;</i>' + meta.title + ' Documentation';
			html += '<div class="button right" onClick="app.goRepo()" title="GitHub Repo for ' + meta.title + '..."><i class="mdi mdi-github">&nbsp;</i>GitHub Repo</div>';
			html += '<div class="clear"></div>';
		html += '</div>';
		
		html += '<div class="box_content">';
		html += '<div class="markdown-body">';
		
		html += args.body;
		
		html += '<p class="article_fin"><i class="mdi mdi-console-line"></i></p>';
		
		html += '</div>'; // markdown-body
		html += '</div>'; // box_content
		html += '</div>'; // box
		
		this.div.html(html);
		this.expandInlineImages();
		this.highlightCodeBlocks();
		this.setupHeaderLinks();
		this.setupDetailSections();
		this.redirectGitHubLinks();
		this.wrapTables();
	},
	
	gosub_blog(args) {
		// show blog article
		// args: authors, sidebar, archives, article, slug, body, page
		var self = this;
		var article = args.article;
		var author = args.authors[ article.author ];
		var html = '';
		
		// args.archives.push({"slug":"test1","words":242,"title":"Now is the time for all good men to come to the aid of their country.","summary":"The quick brown fox jumped over the lazy, sleeping dog.","author":"jhuckaby","date":1704096000,"tags":["Networking","Linux","Perl"]});
		
		var nice_date = this.getNiceDateText( article.date );
		var word_count = article.words;
		var read_minutes = Math.ceil( word_count / 200 );
		var nice_reading_time = '' + read_minutes + ' ' + pluralize('minute', read_minutes);
		
		app.setWindowTitle( article.title );
		app.setHeaderTitle( '<i class="mdi mdi-script-text-outline">&nbsp;</i>The PixlCore Blog' );
		
		html += '<div class="box">';
		html += '<div class="box_title blog">';
			html += article.title;
			html += '<div class="box_subtitle author_box">';
				html += '<div class="author_avatar" style="background-image:url(' + author.avatar + ')"></div>';
				html += '<div class="article_info">';
					html += '<div><i class="mdi mdi-account">&nbsp;</i><a href="' + author.link + '">' + author.name + '</a></div>';
					html += '<div><i class="mdi mdi-calendar-today-outline">&nbsp;</i>' + nice_date + '</div>';
					html += '<div><i class="mdi mdi-timer-outline">&nbsp;</i>' + nice_reading_time + '</div>';
				html += '</div>';
			html += '</div>';
		html += '</div>';
		html += '<div class="box_content">';
		html += '<div class="markdown-body">';
		
		html += args.body;
		
		html += '<p class="article_fin"><i class="mdi mdi-console-line" title="End of article"></i></p>';
		
		html += '</div>'; // markdown-body
		html += '</div>'; // box_content
		html += '</div>'; // box
		
		// prev article preview box
		var prev_article_idx = find_object_idx( args.archives, { slug: args.slug } ) + 1;
		
		if (prev_article_idx < args.archives.length) {
			var prev_article = args.archives[ prev_article_idx ];
			var prev_author = args.authors[ prev_article.author ];
			var nice_prev_date = this.getNiceDateText( prev_article.date );
			var prev_read_minutes = Math.ceil( prev_article.words / 200 );
			var prev_reading_time = '' + prev_read_minutes + ' ' + pluralize('minute', prev_read_minutes);
			
			html += '<div class="box">';
			html += '<div class="box_title">Previous Article</div>';
			html += '<div class="box_content table">';
			
			html += '<div class="article_preview_title"><i class="mdi mdi-script-text-outline">&nbsp;</i><a href="/blog/' + prev_article.slug + '">' + prev_article.title + '</a></div>';
			html += '<div class="article_preview_summary">' + prev_article.summary + '</div>';
			
			html += '<div class="article_preview_info">';
				html += '<div><i class="mdi mdi-account">&nbsp;</i>' + prev_author.name + '</div>';
				html += '<div><i class="mdi mdi-calendar-today-outline">&nbsp;</i>' + nice_prev_date + '</div>';
				html += '<div><i class="mdi mdi-timer-outline">&nbsp;</i>' + prev_reading_time + '</div>';
			html += '</div>';
			
			html += '</div>'; // box_content
			html += '</div>'; // box
		} // prev article
		
		// article index box
		html += '<div class="box">';
		html += '<div class="box_title">All Articles</div>';
		html += '<div class="box_content table">';
		
		var last_date = '';
		args.archives.forEach( function(article) {
			var nice_date = self.getNiceMonthText( article.date );
			if (nice_date != last_date) {
				html += '<div class="article_index_month">' + nice_date + '</div>';
				last_date = nice_date;
			}
			html += '<div class="article_index_title"><i class="mdi mdi-script-text-outline">&nbsp;</i><a href="/blog/' + article.slug + '">' + article.title + '</a></div>';
		} );
		
		html += '</div>'; // box_content
		html += '</div>'; // box
		
		this.div.html(html);
		this.expandInlineImages();
		this.highlightCodeBlocks();
		this.setupHeaderLinks();
		this.setupDetailSections();
		this.redirectGitHubLinks();
		this.loadBlogPlugins();
		this.wrapTables();
	},
	
	goRepo() {
		// click on github link
		var meta = config.meta;
		var url = 'https://github.com/' + meta.org + '/' + meta.repo;
		window.open( url );
	},
	
	findSidebarGroup(slug) {
		// locate matching sidebar group from slug
		var groups = config.sidebar;
		
		for (var idx = 0, len = groups.length; idx < len; idx++) {
			var group = groups[idx];
			var items = group.items;
			
			for (var idy = 0, ley = items.length; idy < ley; idy++) {
				if (items[idy] === slug) return group;
			}
		}
		
		return null;
	},
	
	expandInlineImages(elem) {
		// expand all inline image URLs on page
		// this is for markdown docs
		var self = this;
		if (!elem) elem = this.div;
		else if (typeof(elem) == 'string') elem = $(elem);
		
		elem.find('div.markdown-body p a').each( function() {
			var $this = $(this);
			var href = $this.attr('href') || '';
			if (!href.match(/\.(jpg|jpeg|gif|png)(\?|$)/i)) return; // supported images only
			if ($this.data('expanded')) return; // do not re-expand an expanded link
			if ($this.next().length) return; // only process links at the end of parent blocks
			if (!$this.text().match(/^\w+\:\/\//)) return; // only process visible URL links
			
			$this.after('<img src="' + href + '" class="inline_image" onClick="window.open(this.src)">');
			// $this.data('expanded', true);
			$this.remove();
		});
		
		var anchor = ('' + location.hash).replace(/\#/, '');
		var heading = anchor ? $('#' + anchor).get(0) : null;
		
		elem.find('div.markdown-body p img').each( function() {
			var $this = $(this);
			if (!$this.hasClass('inline_image')) {
				$this.addClass('inline_image').on('mouseup', function() { window.open(this.src); } ); // .attr('title', "Open image in new window.")
				if ($this.attr('title')) {
					$this.after( '<div class="caption">' + $this.attr('title') + '</div>' );
					$this.attr('title', '');
				}
			}
			if (heading) $this.on('load', function() {
				setTimeout( function() { heading.scrollIntoView(true); }, 100 );
			});
		});
	},
	
	highlightCodeBlocks(elem) {
		// highlight code blocks inside markdown doc
		var self = this;
		if (!elem) elem = this.div;
		else if (typeof(elem) == 'string') elem = $(elem);
		
		elem.find('div.markdown-body pre code').each( function() {
			var $this = $(this);
			
			var lang = ($this.attr('class') || '').replace(/language-/, '');
			if (!lang) return; // plain text
			
			var info = CodeMirror.findModeByExtension( lang ) || CodeMirror.findModeByName( lang );
			if (!info) return; // unsupported language
			
			var code = '' + this.innerText;
			var $pre = $this.parent();
			$pre.empty().addClass( (app.getPref('theme') == 'light') ? "cm-s-default" : "cm-s-shadowfox" );
			
			CodeMirror.runMode(code, info.mime, $pre.get(0));
		});
	},
	
	setupHeaderLinks(elem) {
		// add links to article section headers
		var self = this;
		if (!elem) elem = this.div;
		else if (typeof(elem) == 'string') elem = $(elem);
		
		var anchor = ('' + location.hash).replace(/\#/, '');
		
		elem.find('div.markdown-body').find('h1, h2, h3, h4, h5, h6').each( function() {
			var $this = $(this);
			var id = $this.prop('id');
			$this.addClass('heading').prepend( '<a href="#' + id + '" class="anchor"><i class="mdi mdi-link-variant"></i></a>' );
			if (anchor && (id == anchor)) this.scrollIntoView(true);
		});
	},
	
	setupDetailSections(elem) {
		// make detail sections animate smoothly
		var self = this;
		if (!elem) elem = this.div;
		else if (typeof(elem) == 'string') elem = $(elem);
		
		elem.find('div.markdown-body details').each( function() {
			var $details = $(this);
			var $summary = $details.find('summary');
			var sum_html = $summary.html();
			$summary.css('display', 'none');
			
			var $title = $('<div></div>');
			$title.addClass('detail_title').html( '<i class="ctrl mdi mdi-chevron-down"></i>' + sum_html );
			$details.before($title);
			$title.off('mouseup').on('mouseup', function() {
				self.toggleDetailsSection(this);
			});
			
			$details.attr('open', 'open').css('height', 0).scrollTop( $details[0].scrollHeight );
		});
	},
	
	toggleDetailsSection(sect) {
		// toggle details section open/closed
		var $sect = $(sect);
		if ($sect.hasClass('expanded')) this.collapseDetailsSection(sect);
		else this.expandDetailsSection(sect);
	},
	
	collapseDetailsSection(sect) {
		// collapse tab section in sidebar
		var $sect = $(sect);
		if ($sect.hasClass('expanded')) {
			$sect.removeClass('expanded');
			$sect.next().animate({
				scrollTop: $sect.next()[0].scrollHeight,
				height: 0
			}, {
				duration: 500,
				easing: 'easeOutQuart'
			});
		}
	},
	
	expandDetailsSection(sect) {
		// expand tab section in sidebar
		var $sect = $(sect);
		if (!$sect.hasClass('expanded')) {
			$sect.addClass('expanded');
			$sect.next().animate({
				scrollTop: 0,
				height: $sect.next()[0].scrollHeight
			}, {
				duration: 500,
				easing: 'easeOutQuart'
			});
		}
	},
	
	redirectGitHubLinks(elem) {
		// redirect select github links to our own site
		var self = this;
		if (!elem) elem = this.div;
		else if (typeof(elem) == 'string') elem = $(elem);
		
		elem.find('div.markdown-body a').each( function() {
			var $this = $(this);
			var url = $this.attr('href');
			
			// convert links to our top-level repos, but only if they're in our sidebar too
			// e.g. https://www.npmjs.com/package/pixl-server or https://github.com/jhuckaby/pixl-server
			if (url.match(/^\w+\:\/\/(www.npmjs.com\/package|npmjs.com\/package|github.com\/jhuckaby|github.com\/pixlcore)\/([\w\-]+)\/?$/)) {
				var repo = RegExp.$2;
				repo = repo.toLowerCase();
				if (config.pages[repo]) $this.attr('href', '/view/' + repo);
			}
			
			// convert all links to GH markdown files, in our repos
			// e.g. https://github.com/jhuckaby/pixl-server-storage/blob/master/docs/Hashes.md
			if (url.match(/^\w+\:\/\/github.com\/(jhuckaby|pixlcore)\/([\w\-]+)\/blob\/(\w+)\/(.+\.md)(\#[\w\-]+)?$/)) {
				var repo = RegExp.$2;
				// var branch = RegExp.$3;
				var path = RegExp.$4;
				var hash = RegExp.$5;
				
				repo = repo.toLowerCase();
				if (config.pages[repo]) {
					if (path === 'README.md') $this.attr('href', '/view/' + repo + hash);
					else $this.attr('href', '/doc/' + repo + '/' + path + hash);
				}
			}
		});
	},
	
	wrapTables(elem) {
		// wrap all tables with DIVs with special class, for overflow
		var self = this;
		if (!elem) elem = this.div;
		else if (typeof(elem) == 'string') elem = $(elem);
		
		elem.find('div.markdown-body table').each( function() {
			$(this).wrap('<div class="table"></div>');
		});
	},
	
	loadBlogPlugins() {
		// find all plugin sections and load appropriate code
		var elem = this.div;
		var ids = {};
		
		this.plugins = {};
		this.sections = [];
		
		elem.find('div.markdown-body div.plugin').each( function() {
			var $this = $(this);
			var id = $this.data('plugin');
			ids[id] = 1;
		});
		
		this.num_plugins = num_keys(ids);
		this.num_loaded = 0;
		
		Object.keys(ids).forEach( function(plugin_id) {
			var url = '/js/blog/' + plugin_id + '.js';
			var script = document.createElement('script');
			script.async = true;
			script.src = url;
			document.body.appendChild(script);
		} );
	},
	
	registerBlogPlugin(plugin_id, plugin_class) {
		// blog plugin code has finished loading
		if (!this.plugins) this.plugins = {};
		this.plugins[plugin_id] = plugin_class;
		
		// keep track of how many plugins loaded
		this.num_loaded++;
		if (this.num_loaded == this.num_plugins) this.finishBlogPlugins();
	},
	
	finishBlogPlugins() {
		// finish setting up blog plugins (all code loaded)
		var plugins = this.plugins;
		var sections = this.sections;
		
		this.div.find('div.markdown-body div.plugin').each( function() {
			var elem = $(this);
			var id = elem.data('plugin');
			var plugin_class = plugins[id];
			var plugin = new plugin_class( elem );
			sections.push({ id, elem, plugin, dirty: true });
		});
		
		this.checkPluginSections();
		
		// cleanup
		delete this.num_plugins;
		delete this.num_loaded;
	},
	
	checkPluginSections() {
		// check all plugin sections for redraw need, but only process one at a time
		var self = this;
		if (!this.sections) return;
		
		var section = this.sections.filter( function(section) { return section.dirty && self.isVisible(section.elem); } ).shift();
		if (!section) return;
		
		section.plugin.render();
		section.dirty = false;
		
		// since we rendered one, there may be more dirty+visible, so recheck quickly while this is still true
		requestAnimationFrame( this.checkPluginSections.bind(this) );
	},
	
	addStylesheet(css) {
		// dynamically add css stylesheet to DOM
		const style = document.createElement('style');
    	style.appendChild(document.createTextNode(css));
		document.head.appendChild(style);
	},
	
	handleResize() {
		// window has resized
		this.checkPluginSections();
		
		if (this.sections) this.sections.forEach( function(section) {
			section.plugin.onResize();
		} );
	},
	
	isVisible(elem) {
		// return true if dom element is currently visible
		
		// Note: getBoundingClientRect is local to the viewport, not the page
		var rect = elem.get(0).getBoundingClientRect();
		
		if (rect.width == 0) return false;
		if (rect.height == 0) return false;
		if (rect.right < 0) return false;
		if (rect.left >= window.innerWidth) return false;
		if (rect.bottom < 0) return false;
		if (rect.top >= window.innerHeight) return false;
		
		return true;
	},
	
	updateHeaderInfo: function(bust) {
		// update top-right display
		var html = '';
		
		// html += '<div class="header_widget icon"><i class="mdi mdi-power-standby" onClick="app.doUserLogout()" title="Logout"></i></div>';
		// html += '<div class="header_widget user" style="background-image:url(' + this.getUserAvatarURL( this.retina ? 64 : 32, bust ) + ')" onClick="app.doMyAccount()" title="My Account (' + app.username + ')"></div>';
		// html += '<div class="header_widget icon"><i class="mdi mdi-tune-vertical-variant" onClick="app.doMySettings()" title="Edit Settings"></i></div>';
		// html += '<div class="header_widget icon"><i class="mdi mdi-bell-ring-outline" onClick=""></i></div>'; 
		
		html += '<div id="d_rss_btn" class="header_widget icon" onClick="app.copyRSSFeed()" title="Copy Blog RSS Link"><i class="mdi mdi-rss"></i></div>'; 
		html += '<div id="d_theme_ctrl" class="header_widget icon" onClick="app.openThemeSelector()" title="Select Theme"></div>';
		html += '<div id="d_color_ctrl" class="header_widget icon" onClick="app.openFilterControls()" title="Visual Preferences"><i class="mdi mdi-palette"></i></div>';
		html += '<div id="d_sidebar_ctrl" class="header_widget icon mobile_hide" onClick="app.toggleSidebar()" title="Toggle Sidebar"></div>';
		
		// html += '<div id="d_header_clock" class="header_clock"></div>';
		// html += '<div class="header_search_widget"><i class="mdi mdi-magnify">&nbsp;</i><input type="text" size="15" id="fe_header_search" placeholder="Quick Search" onKeyDown="app.qsKeyDown(this,event)"/></div>';
		
		$('#d_header_user_container').html( html );
		this.initTheme();
		this.initSidebarTabs();
		this.initSidebarToggle();
	},
	
	copyRSSFeed() {
		// copy RSS link to clipboard
		copyToClipboard( location.protocol + '//' + location.host + '/feed.rss' );
		this.showMessage( 'success', "RSS link copied to clipboard." );
	},
	
	initSidebarToggle: function() {
		// setup sidebar toggler
		this.setSidebarVisibility( !this.getPref('focus') );
	},
	
	setSidebarVisibility: function(enabled) {
		// view or hide sidebar
		var $body = $('body');
		
		if (enabled) {
			$body.removeClass('relative').addClass('sidebar');
			$('#d_sidebar_ctrl').html('<i class="mdi mdi-menu-open"></i>');
			this.setPref('focus', false);
		}
		else {
			$body.removeClass('sidebar').addClass('relative');
			$('#d_sidebar_ctrl').html('<i class="mdi mdi-menu-close"></i>');
			this.setPref('focus', true);
		}
	},
	
	toggleSidebar: function() {
		// toggle sidebar on/off
		var $body = $('body');
		
		if ($body.hasClass('sidebar')) {
			this.setSidebarVisibility(false);
		}
		else {
			this.setSidebarVisibility(true);
		}
	},
	
	initAccessibility() {
		// initialize accessibility subsystem
		var rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		this.sysReducedMotion = rmQuery.matches;
		
		rmQuery.addEventListener('change', function(event) {
			app.sysReducedMotion = event.matches;
			app.updateAccessibility();
		});
		
		// we need multiple queries for contrast
		var conHighQuery = window.matchMedia('(prefers-contrast: high)');
		var conLowQuery = window.matchMedia('(prefers-contrast: low)');
		this.sysContrast = (conHighQuery.matches ? 'high' : (conLowQuery.matches ? 'low' : 'normal'));
		
		var handleContrastChange = function() {
			app.sysContrast = (conHighQuery.matches ? 'high' : (conLowQuery.matches ? 'low' : 'normal'));
			app.updateAccessibility();
		};
		
		conHighQuery.addEventListener('change', handleContrastChange);
		conLowQuery.addEventListener('change', handleContrastChange);
		
		// init filters to defaults
		if (!this.getPref('filters')) {
			this.setPref('filters', { brightness: 100, contrast: 100, hue: 0, saturation: 100, sepia: 0, grayscale: 0, invert: 0 });
		}
	},
	
	updateAccessibility() {
		// update accessibility settings, after user login, user settings change or CSS event
		var $body = $('body');
		
		// motion setting
		if (this.reducedMotion()) $body.addClass('reduced'); else $body.removeClass('reduced');
		
		// contrast setting
		$body.removeClass(['highcon', 'lowcon']);
		var con = this.userContrast();
		if (con == 'high') $body.addClass('highcon');
		else if (con == 'low') $body.addClass('lowcon');
		
		// color accessibilty
		if (this.getPref('color_acc')) $body.addClass('coloracc'); else $body.removeClass('coloracc');
		
		// apply user filters
		this.applyUserFilters();
	},
	
	applyUserFilters() {
		// filters go
		var filters = this.getPref('filters');
		if (!filters) return; // sanity
		
		if ((filters.brightness != 100) || (filters.contrast != 100) || (filters.hue != 0) || (filters.saturation != 100) || (filters.sepia != 0) || (filters.grayscale != 0) || (filters.invert != 0)) {
			var filts = [];
			if (filters.brightness != 100) filts.push(`brightness(${filters.brightness}%)`);
			if (filters.contrast != 100) filts.push(`contrast(${filters.contrast}%)`);
			if (filters.hue != 0) filts.push(`hue-rotate(${filters.hue}deg)`);
			if (filters.saturation != 100) filts.push(`saturate(${filters.saturation}%)`);
			if (filters.sepia != 0) filts.push(`sepia(${filters.sepia}%)`);
			if (filters.grayscale != 0) filts.push(`grayscale(${filters.grayscale}%)`);
			if (filters.invert != 0) filts.push(`invert(${filters.invert}%)`);
			$('#filter_overlay').css('backdropFilter', filts.join(' ')).show();
		}
		else {
			$('#filter_overlay').css('backdropFilter', 'none').hide();
		}
	},
	
	reducedMotion() {
		// return true if user prefers reduced motion, false otherwise
		if (this.getPref('motion') == 'full') return false;
		else if (this.getPref('motion') == 'reduced') return true;
		else return this.sysReducedMotion;
	},
	
	userContrast() {
		// return user contrast preference
		if (this.getPref('contrast') == 'high') return 'high';
		else if (this.getPref('contrast') == 'normal') return 'normal';
		else if (this.getPref('contrast') == 'low') return 'low';
		else return this.sysContrast;
	},
	
	openFilterControls(elem) {
		// allow user to adjust colors
		var $elem = $(elem || '#d_color_ctrl');
		$elem.data('popover-z-index', 20001);
		$elem.data('popover-hide-overlay', true);
		
		var html = '';
		html += '<div class="sel_dialog_label">Visual Preferences</div>';
		html += '<div id="d_sel_dialog_scrollarea" class="sel_dialog_scrollarea" style="max-height:80vh;">';
		
		// brightness
		html += '<div class="info_label" style="margin-top:15px">Brightness</div>';
		html += '<div class="info_value"><input type="range" id="fe_fctrl_brightness" min="25" max="200" value="100" style="width:200px"></div>';
		
		// contrast
		html += '<div class="info_label">Contrast</div>';
		html += '<div class="info_value"><input type="range" id="fe_fctrl_contrast" min="25" max="200" value="100" style="width:200px"></div>';
		
		// hue
		html += '<div class="info_label">Hue</div>';
		html += '<div class="info_value"><input type="range" id="fe_fctrl_hue" min="-180" max="180" value="0" style="width:200px"></div>';
		
		// saturation
		html += '<div class="info_label">Saturation</div>';
		html += '<div class="info_value"><input type="range" id="fe_fctrl_saturation" min="0" max="200" value="100" style="width:200px"></div>';
		
		// sepia
		html += '<div class="info_label">Sepia</div>';
		html += '<div class="info_value"><input type="range" id="fe_fctrl_sepia" min="0" max="100" value="0" style="width:200px"></div>';
		
		// grayscale
		html += '<div class="info_label">Grayscale</div>';
		html += '<div class="info_value"><input type="range" id="fe_fctrl_grayscale" min="0" max="100" value="0" style="width:200px"></div>';
		
		// invert
		html += '<div class="info_label">Invert</div>';
		html += '<div class="info_value"><input type="range" id="fe_fctrl_invert" min="0" max="100" value="0" style="width:200px"></div>';
		
		// reset button
		html += '<div class="sel_dialog_button_container">';
			html += '<div class="button primary" id="btn_sel_dialog_reset">Reset</div>';
		html += '</div>';
		
		html += '</div>';
		Popover.attach( $elem, '<div style="padding:15px;">' + html + '</div>', true );
		
		// wire up controls
		var filters = this.getPref('filters');
		
		Object.keys(filters).forEach(key => {
			const el = document.getElementById('fe_fctrl_' + key);
			el.value = filters[key];
			
			el.addEventListener('input', () => {
				filters[key] = el.valueAsNumber;
				app.applyUserFilters();
			});
			el.addEventListener('change', () => {
				app.savePrefs();
			});
		});
		
		const resetBtn = document.getElementById('btn_sel_dialog_reset');
		resetBtn.addEventListener('click', () => {
			filters.brightness = 100;
			filters.contrast = 100;
			filters.hue = 0;
			filters.saturation = 100;
			filters.sepia = 0;
			filters.grayscale = 0;
			filters.invert = 0;
			
			app.applyUserFilters();
			app.savePrefs();
			
			Object.keys(filters).forEach(key => {
				document.getElementById('fe_fctrl_' + key).value = filters[key];
			});
		});
	},
	
	openThemeSelector: function() {
		// show light/dark/auto theme selector
		var self = this;
		var $elem = $('#d_theme_ctrl');
		var html = '';
		var themes = [
			{ id: 'light', title: 'Light', icon: 'weather-sunny' },
			{ id: 'dark', title: 'Dark', icon: 'weather-night' },
			{ id: 'auto', title: 'Auto', icon: 'circle-half-full' }
		];
		
		html += '<div class="sel_dialog_label">Select Theme</div>';
		html += '<div id="d_sel_dialog_scrollarea" class="sel_dialog_scrollarea">';
		for (var idy = 0, ley = themes.length; idy < ley; idy++) {
			var theme = themes[idy];
			var sel = (this.getPref('theme') == theme.id);
			html += '<div class="sel_dialog_item check ' + (sel ? 'selected' : '') + '" data-value="' + theme.id + '">';
			if (theme.icon) html += '<i class="mdi mdi-' + theme.icon + '">&nbsp;</i>';
			html += '<span>' + theme.title + '</span>';
			html += '<div class="sel_dialog_item_check"><i class="mdi mdi-check"></i></div>';
			html += '</div>';
		}
		html += '</div>';
		
		Popover.attach( $elem, '<div style="padding:15px;">' + html + '</div>', true );
		
		$('#d_sel_dialog_scrollarea > div.sel_dialog_item').on('mouseup', function() {
			// select item, close dialog and update theme
			var $item = $(this);
			var value = $item.data('value');
			
			Popover.detach();
			app.setTheme(value);
		});
	},
	
	onThemeChange: function() {
		// called with theme changes
		var theme = app.getPref('theme');
		
		// swap theme on all highlighted code sections
		var old_class = (theme == 'light') ? "cm-s-shadowfox" : "cm-s-default";
		var new_class = (theme == 'light') ? "cm-s-default" : "cm-s-shadowfox";
		if (this.div) this.div.find('.markdown-body pre.' + old_class).removeClass(old_class).addClass(new_class);
	},
	
	initSidebarTabs: function() {
		// setup dynamic tabs
		var html = '';
		var color_idx = 0;
		
		config.sidebar.forEach( function(group) {
			// id, title, icon, items
			html += '<div class="section_title expanded"><i class="ctrl mdi mdi-chevron-down"></i><i class="icon mdi mdi-' + group.icon + '">&nbsp;</i>' + group.title + '</div>';
			html += '<div class="section">';
			
			group.items.forEach( function(item) {
				if (typeof(item) == 'string') {
					var id = item;
					item = config.pages[item];
					item.id = id;
				}
				if (!item.title) item.title = item.id;
				if (!item.icon) item.icon = 'source-branch';
				if (!item.loc) item.loc = '/view/' + item.id;
				
				var classes = 'section_item';
				if (config.page == item.id) classes += ' active';
				else if (config.slug == item.id) classes += ' active';
				
				html += '<a href="' + item.loc + '" id="tab_' + item.id + '" class="' + classes + '"><i class="icon mdi mdi-' + item.icon + '">&nbsp;</i>' + item.title + '</a>';
				
				color_idx++;
				if (color_idx >= app.colors.length) color_idx = 0;
			} ); // foreach item
			
			html += '</div>';
		} ); // foreach group
		
		$('#d_dynamic_sidebar').html( html );
		
		// calling this again as we've dynamically constructed the sidebar
		setTimeout( function() { app.page_manager.initSidebar(); }, 1 );
	},
	
	getDateOptions(opts = {}) {
		// get combined date/time options with user locale settings
		var ropts = Intl.DateTimeFormat().resolvedOptions();
		var [lang, reg] = ropts.locale.split(/\-/);
		
		if (!opts.locale) opts.locale = lang + '-' + reg;
		if (!opts.timeZone) opts.timeZone = ropts.timeZone;
		if (!opts.numberingSystem) opts.numberingSystem = ropts.numberingSystem;
		
		if (opts.locale === false) delete opts.locale;
		if (opts.timeZone === false) delete opts.timeZone;
		if (opts.numberingSystem === false) delete opts.numberingSystem;
		if (opts.hourCycle === false) delete opts.hourCycle;
		
		return opts;
	},
	
	formatDate(epoch, opts) {
		// format date and/or time according to user locale settings
		opts = this.getDateOptions(opts);
		return (new Date( epoch * 1000 )).toLocaleString( opts.locale, opts );
	},
	
	getNiceDateText(epoch) {
		// format date according to user's prefs, plain text
		return this.formatDate(epoch, { 
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	},
	
	getNiceMonthText(epoch) {
		// format date according to user's prefs, plain text
		return this.formatDate(epoch, { 
			year: 'numeric',
			month: 'long'
		});
	},
	
	onScroll: function() {
		// called immediately while scrolling
		if (app.page_manager && app.page_manager.current_page_id) {
			var page = app.page_manager.find(app.page_manager.current_page_id);
			if (page && page.onScroll) page.onScroll();
		}
		
		this.checkPluginSections();
	},
	
	onScrollDelay: function() {
		// called every so often while scrolling
		if (app.page_manager && app.page_manager.current_page_id) {
			var page = app.page_manager.find(app.page_manager.current_page_id);
			if (page && page.onScrollDelay) page.onScrollDelay();
			if (page && page.updateBoxButtonFloaterState) page.updateBoxButtonFloaterState();
		}
	},
	
	onKeyDown: function(event) {
		// capture keydown if not focused in text field
		// if (event.key === "Escape") app.openFilterControls();
	},
	
	setupMouseEvents() {
		// capture mouse events and route to custom object, if applicable
		$(window).on('mousemove', function(event) {
			if (app.mouseHandler) app.mouseHandler.mouseMove(event);
		});
		$(window).on('mouseup', function(event) {
			if (app.mouseHandler) {
				app.mouseHandler.mouseUp(event);
				delete app.mouseHandler;
			}
		});
	}
	
}); // app

// base class for all blog plugins
class BlogPlugin {
	render() {}
	onResize() {}
}

// Polyfill for Math.clamp
if (!Math.clamp) Math.clamp = function(val, min, max) {
	return Math.max(min, Math.min(max, val));
};
