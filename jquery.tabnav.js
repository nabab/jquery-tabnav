/**
 * @fileOverview
 * @version 2.0
 *
 * @namespace jQuery.ui.tabNav
 */
(function($){
  "use strict";

  if ( !window.appui ){
    alert("appui library is mandatory");
    return;
  }
  if ( !window.kendo ){
    alert("No kendo");
    return;
  }

  var
    prefix = "appui-tabNav-node-",
    _storageHas = function(){
      return window.store !== undefined;
    },

    _storageGet = function(){
      if ( _storageHas() ){
        return store.get("tabNav");
      }
    },

    _storageSet = function(value){
      if ( _storageHas() ){
        return store.set("tabNav", value);
      }
    },

    _storageInit = function(force){
      if ( _storageHas() ){
        var storage = _storageGet();
        if ( !storage || force ){
          storage = {};
          store.set("tabNav", storage);
        }
      }
    },

    _storageObject = function(obj){
      var res = false;
      if ( obj.url ){
        res = {
          url: obj.url,
          load: true,
          title: obj.title ? obj.title : appui.lng.untitled
        };
        if ( obj.list && obj.list.length ){
          res.list = {};
          $.each(obj.list, function(i, v){
            res.list[v.url] = _storageObject(v);
          });
        }
        if ( obj.pinned ){
          res.pinned = obj.pinned;
        }
        if ( obj.static ){
          res.static = obj.static;
        }
        if ( obj.current ){
          res.current = obj.current;
        }
        if ( obj.bcolor ){
          res.bcolor = obj.bcolor;
        }
        if ( obj.fcolor ){
          res.fcolor = obj.fcolor;
        }
      }
      return res;
    },

    _storageItem = function(url, storage){
      for ( var n in storage ){
        if ( (url === n) || (url.indexOf(n+'/') === 0) ){
          if ( url === n ){
            return storage[n];
          }
          else if ( storage[n].list !== undefined ){
            var r = _storageItem(url.substr(n.length+1), storage[n].list);
            // If it doesn't exist we create it
            if ( !r ){
              storage[n].list[url.substr(n.length+1)] = {};
              r = storage[n].list[url.substr(n.length+1)];
            }
            return r;
          }
          else{
            return storage[n];
          }
        }
      }
			for ( var n in storage ) {
				if ( n.indexOf(url+'/') === 0 ){
					storage[url] = $.extend({current: n}, storage[n]);
          storage[url].url = url;
					delete storage[n];
          return storage[url];
				}
			}
      // If it doesn't exist we create it
      storage[url] = {};
			return storage[url];
		},

    _storageAddTabNav = function(baseurl){
      if ( _storageHas() ){
				_storageInit();
				if ( baseurl.length ){
          var storage = _storageGet(),
              item = _storageItem(baseurl.substr(0, baseurl.length-1), storage);
          if ( item && item.url && (item.list === undefined) ){
            item.list = {};
            _storageSet(storage);
          }
				}
      }
    },

    _storageAdd = function(obj, baseurl){
      if ( _storageHas() && obj.url ){
        var storage = _storageGet(),
            item = _storageItem(baseurl + obj.url, storage);
        //appui.fn.log("ADD", baseurl + obj.url, obj.url, item.current, obj.current);
        if ( item.current && (item.current.indexOf(obj.current) === 0) ){
          obj.current = item.current;
        }
				$.extend(item, _storageObject(obj));
        _storageSet(storage);
      }
    },

    _storageRemove = function(url, baseurl){
      if ( _storageHas() ){
        var storage = store.get("tabNav");
        if ( storage[baseurl][url] ){
          delete storage[baseurl][url];
          store.set("tabNav", storage);
        }
      }
    },

    _storageEmpty = function(url){
      if ( _storageHas() ){
        var storage = store.get("tabNav");
        store.set("tabNav", {});
      }
    };


  _storageInit();

  $.widget("ui.tabNav", {

		// Options passable to the constructor
		options: {
			// if the tabNav is inside another tabNav it will have a baseURL, the one of the selected tab
			baseURL: false,
			// And this tab's title
			baseTitle: '',
			closeClass: "fa fa-times-circle",
			menuClass: "fa fa-caret-down",
			// Pre-loaded list
			list: [],
			// General callbacks
			activate: false,
			beforeClose: false,
			transform: false,
			afterClose: false,
			// Widget options
			scrollable: false,
			tabPosition: "top",
			autoload: false,
			// Default selected tab
			selected: -1,
			// Will override all other settings, change has no effect once created
			current: ''
		},


		/**
		 * @private
		 * @constructor
		 **/
		_create: function(){
			if ( this.element.hasClass(this.widgetFullName) ){
				throw new Error("The widget has already been created, impossible to recreate");
				return false;
			}
			var $$ = this,
          o = $$.options,
          parent = $$.element.closest("." + this.widgetFullName),
          url;
      appui.fn.log("INITIAL", o.list.length, JSON.stringify(o.list), $$.element);

			// Will be set on 1 at the end of this function
			$$.isLoaded = false;
      $$.bgColorIsLight = null;
			$$.closeClassSelector = "." + appui.fn.replaceAll(" ", ".", o.closeClass);
			$$.menuClassSelector = "." + appui.fn.replaceAll(" ", ".", o.closeClass);
			/**
			 * current state of the list (of tabs) made of objects of this type:
			 * {
	     *    url: "my/tab/url",
	     *    title: "My title",
	     *    content: "<h1>My tab content</h1>",
	     *    bcolor: '#FFF',
	     *    fcolor: '#000',
	     *    data: {foo: "bar"},
	     *    callback: function(container, listItem, list, widget){
	     *      alert("I am called every time the tab is activated");
	     *    },
	     *    callonce: function(container, listItem, list, widget){
	     *      alert("I am called the first time the tab is activated");
	     *    },
	     *    resize: function(container, listItem, list, widget){
	     *      alert("I am called every time the tab or one of its parents is resized");
	     *    },
	     *    close: function(container, listItem, list, widget){
	     *      alert("I am called every time the tab or one of its parents is closed");
	     *    },
	     *    afterClose: function(container, listItem, list, widget){
	     *      alert("I am called every time the tab or one of its parents is closed");
	     *    },
	     *    current: "my/tab/url/is/now/like/this",
	     *    pinned: true, // You can unpin it
	     *    static: true, // You can't unpin it,
	     *    load: true, //content and other properties will be loaded on 1st activation
	     **/
			$$.list = [];

			// If set to true activate will be triggered - always the first time
			$$.changed = true;

			// jQuery object of the nearest parent tabNav if exists
			$$.parent = parent.length ? parent : false;

      if ( $$.parent && (o.autoload === undefined) && $$.parent.tabNav("option", "autoload") ){
        o.autoload = true;
      }

			// The URL on top of which the tabNav is (automatically set if parent exists, depends on options otherwise)
			$$.baseURL = '';

			// The current URL is the full URL of the widget starting after baseURL
			$$.currentURL = false;

			// The parent element mustn't show scrollbars
			$$.element.parent().css({
				overflow: "hidden",
				padding: 0,
				margin: 0
			});

			// Sets the baseURL and baseTitle properties;;sadwerwerasdasdasda
			$$.updateBaseURL(o.baseURL);

			/** @var wid Instance of the tabstrip widget - Creation */
			$$.wid = $$.element.addClass(this.widgetFullName).kendoTabStrip({
				animation:false,
				scrollable: o.scrollable ? { distance: 300 } : false,
				tabPosition: o.tabPosition,
				activate: function(e){
					$$.onActivate(e.item);
				}
			}).data("kendoTabStrip");

			// Adds to the list array of the tabNav instances
			$.ui.tabNav.addTabNav($$.element);

      // Through internal storage a popup will show up asking the user
      // if he wants to reopen previous tabs showing the stored tree
      // Conditions for tabs restoration
      if ( _storageHas() && $.jstree && o.autoload ) {
        // Asking if we want to restore only for top tabNav
        if ( !$$.parent ) {
          // The restoration content
          var readonly_ids = [],
              _storageTree = function(optionList, part, baseurl) {
                if (!part) {
                  part = _storageGet();
                  baseurl = '';
                }
                var st = false, disabled, id;
                for (var n in part) {
                  disabled = '';
                  id = baseurl + part[n].url;
                  if (!st) {
                    st = '<ul>';
                  }
                  //appui.fn.log("URL", appui.env.path);
                  if (
                    (optionList.length && appui.fn.get_row(optionList, "url", part[n].url)) ||
                    (appui.env.path && (
                      (id === appui.env.path) ||
                      ((baseurl + part[n].current) === appui.env.path)
                    ))
                  ){
                    disabled = ' data-selected="true"';
                    readonly_ids.push(id);
                  }
                  st += '<li data-expanded="true" data-url="' + part[n].url + '" data-current="' + (part[n].current ? part[n].current : part[n].url) + '"' + disabled + ' data-key="' + id + '">' + part[n].title;
                  if ( part[n].list ) {
                    var subTree = _storageTree([], part[n].list, baseurl + part[n].url + '/');
                    if (subTree) {
                      st += subTree;
                    }
                  }
                  st += '</li>';
                }
                if (st) {
                  st += '</ul>';
                }
                return st;
              },
              content = _storageTree(o.list);
          if ( content.length ) {
            if (confirm("Do you want to load the previously opened tabs?")) {
              // Opening restoration window
              appui.fn.alert(
                '<div class="appui-form-full">' + content + '</div>' +
                '<div class="appui-c appui-form-full">' +
                '<button class="k-button"><i class="fa fa-check"> </i> OK</button>' +
                '<button class="k-button"><i class="fa fa-times"> </i> Cancel</button>' +
                '</div>',
                "What to restore", 500, {actions: []}, function (cont) {
                  // JSTree creation
                  var $tree = cont.find(".appui-form-full:first");
                  $tree.fancytree({
                    checkbox: true,
                    selectMode: 3,
                    select: function(ev, data){
                      cont.find(".fancytree-active").removeClass("fancytree-active");
                    },
                    click: function(ev, data){
                      if ( $.inArray(data.node.key, readonly_ids) > -1 ){
                        ev.stopImmediatePropagation();
                        ev.preventDefault();
                        return false;
                      }
                    }
                  });
                  var treeInst = $tree.fancytree("getTree");

                  // Click on confirm
                  cont.find("button.k-button:first").click(function () {
                    var loop = function(ar, list, baseurl){
                          if ( !baseurl ){
                            baseurl = '';
                          }
                          if ( $.isArray(ar) && ar.length ){
                            $.each(ar, function(i, v){
                              appui.fn.log("V", v);
                              var idx,
                                  obj = {
                                    url: v.data.url,
                                    title: v.title,
                                    load: true,
                                    current: v.data.current
                                  };
                              if ( v.partsel ){
                                idx = appui.fn.search(list, "url", v.data.url);
                                if ( idx === -1 ){
                                  idx = appui.fn.search(list, "url", v.data.url+'/', "starti");
                                }
                                if ( idx > -1 ){
                                  $.extend(list[idx], obj);
                                }
                                else{
                                  idx = list.length;
                                  list.push(obj);
                                }
                                if ( v.children ){
                                  if ( list[idx].list === undefined ){
                                    list[idx].list = [];
                                  }
                                  loop(v.children, list[idx].list, v.key + '/');
                                }
                              }
                            })
                          }
                        };
                    loop(treeInst.rootNode.children, o.list);
                    appui.fn.closeAlert();
                    _storageInit(true);
                    $$._initialize();
                  });

                  // Click on cancel
                  cont.find("button.k-button:last").click(function () {
                    appui.fn.closeAlert();
                    _storageInit(true);
                    $$._initialize();
                  });
                });
              return this;
            }
            // Don't confirm
            else {
              _storageInit(true);
            }
          }
        }
        // If we are in a child tabNav, we compare the content to be restored to the option's list
        else{
        }
      }
      $$._initialize();
			return this;
		},

    _initialize: function(){
      var $$ = this,
          o = $$.options,
          url;
      if ( o.autoload && $$.parent ){
        var idx = $$.parent.tabNav("getIndex", $$.element),
            obj = $$.parent.tabNav("getObs", idx),
            k;
        appui.fn.log("LIST", $$.element, JSON.stringify(obj.list), JSON.stringify(o.list));
        // Preloaded list from session
        if ( obj && obj.list && obj.list.length ){
          //alert("STOP");
          //appui.fn.log("INIT", obj, o);
          $.each(obj.list, function(i, v){
            k = appui.fn.search(o.list, "url", v.url, "startsi");
            appui.fn.log("K", k, JSON.stringify(o.list), v.url);
            if ( k > -1 ){
              $.extend(o.list[k], v);
            }
            else{
              o.list.push(v);
            }
          })
          appui.fn.log("LIST2", $$.element, JSON.stringify(obj.list), JSON.stringify(o.list));
        }
      }
      // Creation of an initial tab configuration
      //appui.fn.log("CREATE WITH LIST", o.list, appui.env.old_path, appui.env.path);
      if ( $.isArray(o.list) && o.list.length ){
        $.each(o.list, function(i, v){
          $$.add(v, i);
        });
      }
      //appui.fn.log("AFTER", o.list, $$.list);
      if ( o.current ){
        appui.fn.log("hasCurrent", o.current);
        //appui.fn.log("CURRENT IS " + o.current);
        $$.activate(o.current);
        /** @todo check why o.current is set to false */
        o.current = false;
      }
      // The page is loading first time
      else if ( !appui.env.old_path && (url = appui.env.path.substr($$.getFullBaseURL().length)) ){
        //appui.fn.log("URL IS " + url);
        $$.activate(url);
      }
      else{
        $$.activateDefault();
      }
      if ( !$$.isLoaded ){
        $$.isLoaded = true;
      }
    },

		/********************* Operations with URL ***************************************/

		// Sets the baseURL based on parent if any or on option's value if defined, leaves it empty otherwise
		updateBaseURL: function(){
			var $$ = this,
				o = $$.options;
      if ( o.baseURL ){
        if ( o.baseURL.substr(-1) === '/' ){
          o.baseURL = o.baseURL.substr(o.baseURL.length-1);
        }
        if ( o.baseURL.substr(0, 1) === '/' ){
          o.baseURL = o.baseURL.substr(1);
        }
      }
			// Case where we have a parent tabNav widget
			if ( $$.parent ){
				var tmp = $$.parent.tabNav("getURL", $$.element);
        if ( o.baseURL && (o.baseURL !== (tmp + '/')) ) {
          if ($$.parent.tabNav("isAutoload") && (tmp.indexOf(o.baseURL) === 0)) {
            $$.parent.tabNav("setURL", o.baseURL, $$.element);
            o.current = tmp.substr(o.baseURL.length + 1);
            $$.baseURL = o.baseURL;
          }
        }
        else{
          $$.baseURL = tmp;
        }
        /*
        if ( !o.current ){
          o.current = tmp.substr($$.baseURL.length+1, tmp.length - o.baseURL.length - 2);
          appui.fn.log("Setting o.current to " + o.current);
        }
        */
			}
			else if ( o.baseURL ){
				$$.baseURL = o.baseURL;
			}
			if ( ($$.baseURL !== '') && ($$.baseURL.substr(-1) !== '/') ){
        $$.baseURL += '/';
      }
      //appui.fn.log("baseURL", $$.baseURL);
			return this;
		},

		getFullBaseURL: function(){
			var t = this.element,
				base = '',
				tmp;
			while ( tmp = t.tabNav("getBaseURL") ){
				base = tmp + base;
        t = t.tabNav("getParent")
				if ( !t.length ){
					return base;
				}
			}
			return base;
		},

		// Returns the current URL from the root tabNav without the hostname (if it has a baseURL it will start after)
		getFullURL: function(){
		  var $$ = this;
			return $$.parent ?
        $$.parent.tabNav("getFullURL") :
        $$.getBaseURL() + ($$.currentURL ? $$.currentURL : '');
		},

		// Returns the baseURL property
		getBaseURL: function(){
			return this.baseURL;
		},

    getCurrentURL: function(idx, force){
      idx = this.getIndex(idx, force);
      if ( this.list[idx] ){
        return this.list[idx].currentURL ?
          this.list[idx].currentURL : (
            this.options.list[idx].current ?
              this.options.list[idx].current :
              this.list[idx].url
          );
      }
      return false;
    },

    getURL: function(idx, force){
			idx = this.getIndex(idx, force);
			/** @todo Check if the current property wouldn't be more appropriated */
			return this.list[idx] ? this.list[idx].url : false;
		},

		// Returns the url relative to the current tabNav from the given url
		parseURL: function(fullURL){
			var $$ = this,
          FullBaseURL = $$.getFullBaseURL();
      if ( fullURL === undefined ){
        return '';
      }
			if ( typeof(fullURL) !== 'string' ){
        return fullURL.toString();
			}
			if ( fullURL.indexOf(appui.env.root) === 0 ){
        fullURL = fullURL.substr(appui.env.root.length);
			}
			if ( FullBaseURL && (fullURL.indexOf(FullBaseURL) === 0) ){
				return fullURL.substr(FullBaseURL.length);
			}
			/*if ( $$.baseURL && (url.indexOf($$.baseURL) === 0) ){
				return url.substr($$.baseURL.length);
			}
			else if ( $$.baseURL === (url + '/') ){
				return '';
			}*/
			return fullURL;
		},

		// Sets the current url of the widget, and of the widgets above
		setCurrent: function(url, idx){
			var $$ = this,
          o = $$.options;
			if ( !$$.list[idx] ){
				throw new Error("The index " + idx + " doesn't exist in the list which has " + $$.list.length + " elements");
				return false;
			}
			//appui.fn.log("setCurrent", url);
			//url = $$.parseURL(url);
			if ( url && (url.indexOf($$.list[idx].url) === 0) ){
        //appui.fn.log("Setting URL to " + url, $$.element);
				$$.list[idx].currentURL = url;
				$$.currentURL = url;
        if ( o.autoload ){
          //appui.fn.log("AUTOLOAD", url, $$.getFullBaseURL());
          _storageAdd($.extend({}, $$.list[idx], {current: url}), $$.getFullBaseURL());
        }
				if ( $$.parent ){
          //appui.fn.log("parent", $$.getFullBaseURL() + url);
					$$.parent.tabNav("setCurrent", $$.getBaseURL() + url, $$.parent.tabNav("getIndex", $$.element));
				}
				return $$;
			}
      throw new Error("The page " + url + " doesn't exist in the list");
		},

    _urlActivation: function(url, idx, force){
      var $$ = this,
          o = $$.options;
      appui.fn.log("_urlActivation: " + url);
      if ( $$.isValidIndex(idx) ){
        // Looking for another tabNav widget inside the selected tab panel
        var subtab = $$.getSubTabNav(idx);
        //appui.fn.log("activate url: " + url);
        if (subtab.length && subtab.tabNav("getLength")) {
          // It will activate the next tabNav and so on
          // if current URL longer than this tab's URL, use the diff to activate the lower tabnav
          subtab.tabNav("activate", url.substr($$.list[idx].url.length+1), force);
          //appui.fn.log("activating subtab");
        }
        // Until the very last tabNav which will be the one determining the final URL and executing appui.fn.setNavigationVars
        else {
          // Changing the current url configuration
          $$.setCurrent(url, idx);
          $$.changeOK();
          /** @todo how rep state is changed? Is it of any use? */
          //appui.fn.log("new URL: " + $$.getFullURL());
          appui.fn.setNavigationVars($$.getFullURL(), o.baseTitle + $$.list[idx].title, $$.getData(idx), false);
        }
      }
      return $$;
    },

		/********************* Activating Tabs ***************************************/

		// Triggered when manually activating a tab. Launches the activate function
		onActivate: function(item){
			var idx = $(item).index(),
				$$ = this;
			if ( $$.isLoaded ){
				if ( $$.list[idx] && ($$.options.selected !== idx) ){
					this.activate(this.list[idx].currentURL ? this.list[idx].currentURL : this.list[idx].url);
				}
			}
		},

		activateIdx: function(idx, force){
			idx = this.getIndex(idx);
			if ( this.list[idx] ){
				this.activate(this.list[idx].current ? this.list[idx].current : this.list[idx].url);
			}
			else if ( force ){
				this.activateDefault();
			}
			return this;
		},

		activateDefault: function(){
			if ( this.list.length ){
				var idx = false;
				$.each(this.list, function(i, it){
					if ( it.default ){
						idx = i;
						return false;
					}
					if ( idx === false ){
						idx = i;
					}
				});
				if ( idx !== false ){
					this.activate(this.list[idx].current ? this.list[idx].current : this.list[idx].url);
				}
			}
			return this;
		},

		/**
		 * Called when activating a tab manually with the corresponding URL
		 * Or called manually with an URL and will activate the given tab programmatically
		 */
		activate: function(url, force){

			// if no parameter is passed we use the current url
			var $$ = this,
				o = $$.options,
				idx;
			// either the requested url or the url corresponding to the target index


			// No URL has been given -> we activate the default tab
			if ( !url ){
				//appui.fn.log("activateDefault");
				return $$.activateDefault();
			}

			idx = $$.getIndex(url);
			// No index found
			if ( (idx === false) || ($$.list[idx] === undefined) ){
				// autoload is set to true we launch the link function which will activate the newly created tab
				if ( o.autoload ){
					//appui.fn.log("link from autoload: " + url);
					$$.link($$.getFullBaseURL() + url);
				}
				else{
					var id = $$.element.attr("id");
					if ( !id ){
						id = "classes " + $$.element.attr("class");
					}
					else{
						id = "ID " + id;
					}
					throw new Error("Impossible to find an index for " + url + " in element with " + id);
				}
				return this;
			}

			// actual tab
			var tab = $$.getTab(idx),
				// Container
				cont = $$.getContainer(idx),
				// jQuery objects
				$cont = $(cont),
				$tab = $(tab),
				// URL before activation
				oldURL = $$.getFullURL(),
				// Numeric index of the previously selected tab
				oldSelected = o.selected,
				// Previous "current url"
				oldCurrent = $$.currentURL;

			// Do nothing if the tab is already activated and force is not true or the widget loads for the first time
			if ( $tab.data("appui-tabnav-activated") && (!force || !$$.isLoaded) ){
        $$._urlActivation(url, idx, force);
				//appui.fn.log("It seems tabnav-activated is on " + $tab.data("appui-tabnav-activated"));
        if ( !$$.list.length ){
          throw new Error("It seems tabnav-activated is on " + $tab.data("appui-tabnav-activated"));
        }
        return this;
			}
			// Error if one element is missing
			if ( !$cont.length || !$tab.length ){
				throw new Error("There is a problem with the widget...?");
				return this;
			}

			// Checking difference between former and new URLs
			if ( oldCurrent !== url ){
				// This is the only moment where changed is set
				$$.changed = true;
				// If it's not already activated we do programmatically, it won't execute the callback function
				if ( !$tab.hasClass("k-state-active") ){
					$$.wid.activateTab($tab);
					if ( $$.isLoaded ){
						return this;
					}
				}
			}

			// In this case the tab exists but we load its content the first time it is activated
			if ( $$.list[idx].load ){
			  //appui.fn.log("loading content from list load parameter");
				$$.list[idx].load = false;
				$$.loadContent($$.getFullBaseURL() + url);
				return $$;
			}
			// Only if either:
			// - the tabNav has never been activated
			// - the force parameter has been sent
			// - the URL is different
			// We really activate it
			if ( force || $$.isChanged() ) {
				//appui.fn.log("Activation", url, $$.element);
				// This is the only moment where selected is set
				o.selected = idx;

				//appui.fn.log("Ca marche..." + url);
				if ( $.isFunction(o.activate) ){
					o.activate($$.element, idx, $$);
				}

				$$.resize();

				// If there is a callonce attached to this index we execute it and delete it
				if ($$.list[idx].callonce) {
					$$.list[idx].callonce(cont, idx, $$.list[idx].data, $$);
					$cont.data("appui-tabnav-callonce", $$.list[idx].callonce);
					$$.list[idx].callonce = false;
					$$.resize();
				}
				// If there is a callback attached to this index we execute it
				if ($$.list[idx].callback && !$$.list[idx].disabled) {
					$$.list[idx].callback(cont, idx, $$.list[idx].data, $$);
					$$.resize();
				}

        //appui.fn.log("_urlActivation: " + url);
        $$._urlActivation(url, idx, force);

        $$.activateColor(idx, oldSelected);
				//appui.fn.log("***COUNT****", $tab.length, $tab.siblings().length);
				$tab.data("appui-tabnav-activated", 1).siblings().data("appui-tabnav-activated", 0);
			}
			else{
			  throw new Error("NOT ACTIVATED WITH " + url);
				//appui.fn.log("NOT ACTIVATED WITH " + url, $$.element, $$.list);
			}
			return this;
		},

		/********************* Dealing with elements ***************************************/

    getParent: function(){
      return this.parent;
    },

    getFirst: function(){
      if ( !this.parent ){
        return this.element;
      }
      return this.parent.tabNav("getFirst");
    },

    getContainer: function(idx, force){
			if ( ((idx = this.getIndex(idx, force)) !== false) && (this.wid.contentElements.length > idx) ){
				return this.wid.contentElements[idx];
			}
		},

		getContent: function(idx, force){
			if ( (idx = this.getIndex(idx, force)) !== false ){
				return this.wid.contentHolder(idx).html();
				return this.wid.contentHolder(idx).html();
			}
		},

		getTab: function(idx, force){
			if ( (idx = this.getIndex(idx, force)) !== false ){
				return this.wid.items()[idx];
			}
		},

		getSubTabNav: function(idx){
			var $$ = this,
				ele,
				idx = $$.getIndex(idx);
			if ( idx !== false ){
				ele = $("div." + $$.widgetFullName + ":first", $$.getContainer(idx));
				if ( ele.length ){
					return ele;
				}
			}
			return false;
		},

		getActiveTab: function(){
			return this.element.children("div.k-content").eq(this.options.selected);
		},


		/********************* Tabs operations ***************************************/

    _createTab: function(obj){
      var $$ = this,
          o = $$.options;

    },

    _setTab: function(obj, idx){
      if ( typeof(obj) !== 'object' ){
        throw new Error("An object must be passed as argument for the function _setTab");
      }
      if ( !obj.url ){
        throw new Error("The configuration object must have an 'url' property in the function _setTab");
      }
      var $$ = this,
          o = $$.options;
      if ( !$$.isValidIndex(idx) ){
        //appui.fn.log($$.list);
        throw new Error("The index " + idx.toString() + "dosn't exist in the list");
      }
      if ( !obj.bcolor && o.bcolor ){
        obj.bcolor = o.bcolor;
        obj.fcolor = o.fcolor ? o.fcolor : '#FFF';
      }
      for ( var k in obj ) {
        if (k === 'content'){
          $$.setContent(obj[k], idx);
        }
        else if (k === 'title'){
          $$.setTitle(obj[k], idx);
        }
        else if (k === 'data'){
          $$.setData(obj[k], idx);
        }
        // Color for IDE tabs
        else if (k === 'bcolor'){
          $$.setColor([obj.bcolor, obj.fcolor ? obj.fcolor : "#FFF"], idx, 1);
        }
        else{
          $$.list[idx][k] = obj[k];
        }
      }
      if ( o.autoload ){
        _storageAdd(
          $.extend({}, $$.list[idx], {current: obj.currentURL ? obj.currentURL : obj.url}),
          $$.getFullBaseURL()
        );
      }
    },

		/**
		 * Adds an object to the list array, and a corresponding tab in the tabstrip
		 * @param obj
		 * @param idx
		 * @returns int The index found or actually added
		 */
		add: function(obj, idx){
			var $$ = this,
				o = $$.options,
				kendoCfg,
				$tab,
				menu = 1,
				newIndex = -1,
				$closeBtn;

      //appui.fn.log("BEFORE ADD", obj);
			obj = $.ui.tabNav.defaultObj(obj, $$);
      //appui.fn.log("ADD1", obj);

			/** @todo What is the interest of this callback? */
			if ( $.isFunction(o.transform) ){
				obj = o.transform(obj);
			}

			//appui.fn.log("ADD", obj);

			// A URL is mandatory
			if ( obj.url ) {

        // Searching the URL among the tabs to check if it doesn't exist
				if ( (newIndex = $$.search(obj.url)) === -1) {

          kendoCfg = {
            text: obj.title,
            content: ' ',
            encoded: false
          };

          if ((idx === undefined) || (idx >= $$.list.length)) {
            idx = $$.list.length;
            $$.list.push(obj);
            $$.wid.append(kendoCfg);
          }
          else if (idx < $$.list.length) {
            $$.list.splice(idx, 0, obj);
            $$.wid.insertBefore(r, $$.getTab(idx));
          }
          else {
            throw new Error("Wrong tab index!");
            return;
          }

          $tab = $($$.getTab(idx));
          $closeBtn = $('<i/>').addClass(o.closeClass).click(function () {
            $$.close($(this).closest("li").index());
          });
          // Adding a close button is item is not static
          $tab.addClass("with_button").append($closeBtn);
          if ( obj.static ){
            $closeBtn.hide();
          }
          $tab.children().each(function(){
            if ($(this).hasClass($$.menuClassSelector)) {
              menu = false;
            }
          });

          // Indivual tabs' menu
          if ( menu ){
            $$.buildMenu(obj, $tab);
          }
				}
				else{
				  idx = newIndex;
        }
			}
			if ( $$.list[idx] ){
        $$._setTab(obj, idx);
        return idx;
      }
      return false;
		},

		close: function(idx, non_activate){
			if ( (idx = this.getIndex(idx)) !== false ){
				var $$ = this,
					o = $$.options,
					ok = 1,
					cont = this.getContainer(idx),
					subtab = this.getSubTabNav(idx),
					res = 1;

				if ( $.isFunction(o.beforeClose) ){
					if ( !o.beforeClose($$.element, idx, $$) ){
						return;
					}
				}
				if ( subtab.length ){
					$.ui.tabNav.removeTabNav(subtab);
				}
				if ( ($$.list[idx].close !== undefined) && $.isFunction($$.list[idx].close) ) {
					res = $$.list[idx].close(cont, $$.list[idx], idx);
				}
				var cfg = $$.list[idx],
					after = false;
				if ( ($$.list[idx].afterClose !== undefined) && $.isFunction($$.list[idx].afterClose) ) {
					after = $$.list[idx].afterClose;
				}
				$$.list.splice(idx, 1);
				$$.wid.remove(idx);
				if ( after ) {
					after(cfg, idx);
				}
				if ( !non_activate && $$.list.length ){
					if ( idx < $$.options.selected ){
						$$.options.selected--;
					}
					else if ( $$.list.length && (idx === $$.options.selected) ) {
						if ( $$.list[idx] === undefined ) {
							idx--;
						}
						$$.activate($$.list[idx].currentURL ? $$.list[idx].currentURL : $$.list[idx].url, true);
					}
				}
				if ( res && $.isFunction(o.afterClose) ){
					o.afterClose($$.element, idx, $$);
				}
			}
		},

		closeAll: function(){
			for ( var j = 0; j < this.list.length; j++ ){
				if ( !this.list[j].static ){
					this.close(j);
					j--;
				}
			}
		},

		/********************* Tabs properties setters ***************************************/

		disable: function(idx){
			this.wid.disable(this.getTab(idx));
		},

		enable: function(idx){
			this.wid.enable(this.getTab(idx));
		},

    setContent: function(content, idx){
      if ( (idx = this.getIndex(idx)) !== false ){
        $(this.getContainer(idx)).html(content);
      }
      return this;
    },

    setURL: function(url, idx){
      if ( (idx = this.getIndex(idx)) !== false ){
        this.list[idx].url = url;
      }
      return this;
    },

    setTitle: function(title, idx){
			if ( (idx = this.getIndex(idx)) !== false ){
				var tab = this.getTab(idx);
				if ( !title ){
					title = "Untitled";
				}
				this.list[idx].title = title;
				$(tab).children("span.k-link").html(title);
			}
			return this;
		},

		setColor: function(col, idx, setCss) {
			if ( window.tinycolor ){
        var $$ = this,
          tab = $$.getTab(idx),
          // Backgroud color inactive
          bc = false,
          // Backgroud color active
          bca = false,
          // Font color inactive
          fc = false,
          // Font color active
          fca = false,
          // TinyColor
          tc = false,
          res = {};

        if ( $$.bgColorIsLight === null ){
          var bg = $($$.getTab(idx)).css("backgroundColor");
          $$.bgColorIsLight = (tinycolor(bg)).isLight();
        }

        if ( $.isArray(col) && col.length ){
          bca = col[0];
          if ( col[1] !== undefined ){
            fca = col[1];
          }
        }
        else {
          bca = col;
        }
        if ( bca ){
          // We'll lighten the active color to get the inactive color
          bc = tinycolor(bca);
          for ( var i = 1; i < 100; i++ ){
            if ( $$.bgColorIsLight ){

            }
            bc = bc.lighten(i);
            if ( bc.getLuminance() > 0.7 ){
              bc = bc.toHexString();
              break;
            }
          }
          if ( bc && bca ){
            $$.set('bColor', bc, idx);
            $$.set('bColorAct', bca, idx);
          }
          tc = tinycolor(bca);
          if ( tc ){
            if ( tc.getLuminance() < 0.7 ){
              fca = fca ? fca : '#FFF';
              fc = '#313131';
            }
            else {
              fca = fca ? fca : '#000';
              fc = '#FFF';
            }
            if ( fc && fca ){
              $$.set('fColor', fc, idx);
              $$.set('fColorAct', fca, idx);
            }
          }
        }
      }
		},

    activateColor: function(idx, oldSelected){
      var $$ = this,
          o = $$.options;
      if ( $$.isValidIndex(idx) ){
        // Change tab color if defined
        if ( $$.list[idx].bColorAct && $$.list[idx].fColorAct ) {
          $($$.getTab(idx)).animate({
            backgroundColor: $$.list[idx].bColorAct
          }).children().animate({
            color: $$.list[idx].fColorAct
          });
        }
        if ( $$.isValidIndex(oldSelected) && ($$.list[idx].url !== $$.getObs(oldSelected).url) ){
          if ( $$.list[oldSelected].bColor && $$.list[oldSelected].fColor ){
            //appui.fn.log($$.list[oldSelected].bColor +'/'+ $$.list[oldSelected].fColor);
            $($$.getTab(oldSelected)).animate({
              backgroundColor: $$.list[oldSelected].fColor
            }).children().animate({
              color: $$.list[oldSelected].bColor
            });
          }
        }
      }
      return this;
    },

		reset: function(idx, with_title){
			var $$ = this,
          o = $$.options;
			idx = $$.getIndex(idx);
			if ( idx !== false ) {
				$$.setContent(" ", idx);
				$$.list[idx] = {url: $$.list[idx].url, title: $$.list[idx].title};
				var $cont = $$.getContainer(idx),
					tab = $$.getTab(idx),
					fn;
				$(tab).data("appui-tabnav-activated", 0);
				if ( $cont.length ){
					fn  = $cont.data("appui-tabnav-callonce");
				}
				if ( fn ){
					$$.list[idx].callonce = fn;
					$cont.removeData("appui-tabnav-callonce");
				}
				if ( with_title ) {
					$$.setTitle(" ", idx);
				}
			}
		},

		set: function(prop, val, idx){
			var $$ = this,
				o = $$.options;
			idx = $$.getIndex(idx);
			if ( idx !== undefined ){
				$$.list[idx][prop] = val;
			}
		},

		addData: function(data, idx){
			if ( (idx = this.getIndex(idx)) !== false ){
				var change = false;
				if ( !this.list[idx].data ){
					this.setData({}, idx);
					change = 1;
				}
				for ( var n in data ){
					if ( (this.list[idx].data !== undefined) && $.isFunction(this.list[idx].data.set) ){
						if ( data[n] !== this.list[idx].data.get(n) ){
							this.list[idx].data.set(n, data[n]);
							change = 1;
						}
					}
					else{
						if ( data[n] !== this.list[idx].data[n] ){
							this.list[idx].data[n] = data[n];
							change = 1;
						}
					}
				}
				if ( change && (idx === this.options.selected) ){
					this.resize();
				}
			}
			return this;
		},

		setData: function(data, idx){
			if ( (idx = this.getIndex(idx)) !== false ){
				this.list[idx].data = /*window.kendo !== undefined ? kendo.observable(data) : */data;
			}
			return this;
		},

		removeData: function(idx, propName){
			if ( (idx = this.getIndex(idx)) !== false ){
				if ( !propName ){
					this.setData({}, idx);
				}
				else {
					if ( this.list[idx].data[propName] !== undefined ){
						delete this.list[idx].data[propName];
					}
				}
				if ( idx === this.options.selected ){
					this.resize();
				}
			}
			return this;
		},

		/********************* Tabs properties getters ***************************************/

		getObs: function(idx){
			return this.isValidIndex(idx) ? this.list[idx] : false;
		},

		/********************* TabNav properties ***************************************/

		getLength: function(){
			return this.list.length;
		},

		getData: function(idx){
			if ( (idx = this.getIndex(idx)) !== false ){
				return this.list[idx].data;
			}
			return false;
		},

		getList: function(){
			return this.list;
		},

		/********************* Callback functions ***************************************/

		// Adds a function to an existing one or set it if not exists
		// The previous function must return true in order to have the following executed
		addToFunction: function(name, func, idx){
			var $$ = this;
			if ( (idx = $$.getIndex(idx)) !== false ){
				if ( ($$.list[idx][name] === undefined) || !$.isFunction($$.list[idx][name]) ){
					$$.list[idx][name] = func;
				}
				else if ( ($$.list[idx][name] !== undefined) && (this.list[idx][name] !== func) ){
					var f = this.list[idx][name],
						cont = $$.getContainer(idx);
					$$.list[idx][name] = function(){
						var r = f(cont, idx, $$.list[idx].data, $$);
						if ( r ){
							return func(cont, idx, $$.list[idx].data, $$);
						}
						return r;
					}
				}
			}
		},

		addCallback: function(func, idx){
			return this.addToFunction('callback', func, idx);
		},

		addCallonce: function(func, idx){
			return this.addToFunction('callonce', func, idx);
		},

		addClose: function(func, idx){
			return this.addToFunction('close', func, idx);
		},

		addAfterClose: function(func, idx){
			return this.addToFunction('afterClose', func, idx);
		},

		addResize: function(func, idx){
			return this.addToFunction('resize', func, idx);
		},

		/********************* Loading content ***************************************/

		// Loads a remote content and injects it as a new tab
		link: function(fullURL, force){
      var $$ = this;
			// Analyses the arguments
			$.each(arguments, function(i, v){
				if ( (typeof(v) === "boolean") ){
					force = v ? true : false;
				}
				else if ( typeof(v) === "number" ){
          fullURL = v.toString();
				}
				else if ( typeof(v) === "string" ){
          fullURL = v;
				}
			});
			// if no URL we use the current one
			if ( !fullURL ){
        fullURL = $$.getFullURL();
			}
			var ele,
          url = $$.parseURL(fullURL),
          idx = $$.search(url),
          sidx = $$.search(url, true);

			//appui.fn.log("Method: link - line: 1322 - INDEX: " + idx + " - URL: " + url, $$.element);

			if ( idx != -1 ){
				$$.activate(url);
        ele = $$.getSubTabNav(idx);
				if ( ele.length && (sidx == -1) ){
					//appui.fn.log("LINK FN");
					ele.tabNav("link", fullURL, force);
					return;
				}
			}
			if ( (idx == -1) || force ){
				//appui.fn.log("loadContent FN: " + url);
				$$.loadContent(fullURL);
			}
		},

		loadContent: function(fullURL){
			var $$ = this,
          change = false,
          data = {
            appui_baseURL: $$.getFullBaseURL()
          };
			if ( $.ui.tabNav.globalChange ){
				data.appui_tabnav = $.ui.tabNav.globalList;
				$.ui.tabNav.globalChange = false;
			}
			appui.fn.post(fullURL, data, function(obj){
				if ( obj && obj.content ){
          if ( !obj.url ){
            obj.url = $$.parseURL(fullURL);
          }
					/** @todo shouldn't the subtab load also if the remaining url is not empty */
					$$.navigate(obj);
				}
			});
		},

		/********************* Tabs index ***************************************/

		// Changes the position of a tab, relatively to others
		move: function(old_idx, idx){
			var $$ = this,
				o = $$.options,
				old_idx = $$.getIndex(old_idx),
				idx = $$.getIndex(idx);
			if ( (old_idx !== false) && (idx !== false) && (idx !== old_idx) ){
				var tab = $($$.getTab(old_idx)),
					cont = $($$.getContainer(old_idx)),
					ttab = $($$.getTab(idx)),
					tcont = $($$.getContainer(idx)),
					ptab = tab.parent(),
					pcont = cont.parent();
				//appui.fn.log(tab, cont, ptab, pcont, $$.wid);
				var d = $$.list.splice(old_idx, 1);
				$$.list.splice(idx, 0, d[0]);
				if ( idx === $$.list.length ){
					pcont.append(cont);
					ptab.append(tab);
					$$.list.push(d);
				}
				else {
					tab.insertBefore(ttab);
					cont.insertBefore(tcont);
					$$.list.splice(old_idx < idx ? idx - 1 : idx, 0, d);
				}
			}
			return $$;
		},

		isValidIndex: function(idx){
			return this.list[idx] !== undefined;
		},

		// Gets the index of a tab from various parameters: index (!), URL, a DOM element (or jQuery object) inside a tab, a tab, or the currently selected index if there is no argument
		getIndex: function(idx, force){
			var $$ = this,
				o = $$.options,
				url = idx;
			if ( !$$.list.length ){
				return false;
			}
			if ( !$$.isValidIndex(idx) ) {
				if ( typeof(idx) === 'string' ){
					idx = $$.search(idx);
				}
				else if ( typeof(idx) === 'object' ){
					// Not jQuery
					if ( !idx.length ){
						idx = $(idx);
					}
					if ( idx.length && $.isFunction(idx.index) ){
						var p = idx.parent();
						while ( p.length && (p[0] !== $$.element[0]) ){
							idx = p;
							p = idx.parent();
						}
						idx = p.length ? p.children("div[role=tabpanel]").index(idx) : -1;
					}
				}
				/*
				else if ( o.current ){
					idx = o.current;
					o.current = false;
				}
				*/
				else if ( o.selected > -1 ){
					idx = o.selected;
				}
			}
			if ( !$$.isValidIndex(idx) && force ) {
				for ( var i = 0; i < $$.list.length; i++ ){
					if ( !$$.list[i].disabled ){
						if ( $$.list[i].default ){
							return i;
						}
						else if ( !$$.isValidIndex(idx) ){
							idx = i;
						}
					}
				}
			}
			return $$.list[idx] ? idx : false;
		},

		/**
		 * @return {int} The index of the tab with the same URL
		 */
		search: function(url, strict){
			if ( !url ){
				return -1;
			}
			var $$ = this,
				o = $$.options,
				tmp = url,
				slash,
				i;

			// We look for at tab eith the same URL, full or partial
			while ( tmp !== '' ){
				i = appui.fn.search($$.list, "url", tmp);
				if ( i > -1 ){
					// If we find we give the index
					return i;
				}
				// Otherwise we shorten the URL
				if ( !strict && tmp && (slash = tmp.lastIndexOf("/")) ){
					tmp = tmp.substr(0, slash);
				}
				else{
					tmp = '';
				}
			}
			// If not found we return -1
			return -1;
		},

		/********************* MISC ***************************************/

		buildMenu: function(obj, $tab){
			var $$ = this,
				o = $$.options;
			$tab.append(
				$('<i/>').addClass(o.menuClass).click(function (e) {
					var iEle = this,
						$li,
						$a,
						menuEle,
						$menu_ct = $('<ul/>').appendTo(document.body),
						idx = $$.getIndex(obj.url),
						ctx = [];
					if ( $$.list[idx] !== undefined ) {
						if ($$.list[idx].menu) {
							ctx = $$.list[idx].menu;
						}
						if ($$.list[idx].menu !== false) {
							if (!$$.list[idx].static) {
								ctx.push({
									text: appui.lng.reload,
									fn: function (i, ob) {
										//appui.fn.log(ob);
										$$.reload(appui.env.path);
									}
								});
								if ($$.list[idx].pinned) {
									ctx.push({
										text: appui.lng.unpin,
										fn: function (i, ob) {
											$$.list[idx].pinned = false;
											$($$.closeClassSelector, $$.getTab(idx)).show();
										}
									});
								}
								else {
									ctx.push({
										text: appui.lng.pin,
										fn: function (i, ob) {
											$$.list[idx].pinned = true;
											//appui.fn.log($($$.closeClassSelector, $$.getTab(idx)).length, $$.getTab(idx), $$.closeClassSelector);
											$($$.closeClassSelector, $$.getTab(idx)).hide();
										}
									});
									ctx.push({
										text: appui.lng.close,
										fn: function (i, ob) {
											$$.close(i);
										}
									});
									ctx.push({
										text: appui.lng.closeAll,
										fn: function (i, ob) {
											$$.closeAll();
										}
									});
								}
							}
							if ($$.list.length) {
								var hasClosable = false;
								$.each($$.list, function (i, v) {
									if (!v.static) {
										hasClosable = 1;
										return false;
									}
								});
								if (hasClosable) {
									ctx.push({
										text: appui.lng.closeOthers,
										fn: function (i, ob) {
											for (var j = 0; j < $$.list.length; j++) {
												if ((j !== i) && !$$.list[j].static) {
													$$.close(j);
													if (j < i) {
														i--;
													}
													j--;
												}
											}
										}
									});
								}
							}
							$.each(ctx, function (i, v) {
								if (v.text) {
									$li = $('<li style="white-space: nowrap"/>');
									$a = $('<a/>').html(v.text);
									$menu_ct.append($li.append($a));
									$a.attr("href", v.url ? v.url : 'javascript:;');
									if (v.fn && $.isFunction(v.fn)) {
										$a.click(function () {
											v.fn(idx, obj, $$.getContainer(idx));
										})
									}
								}
							});
							$menu_ct.kendoContextMenu({
								close: function (e) {
									e.preventDefault();
									$menu_ct.data("kendoContextMenu").destroy();
									$menu_ct.remove();
								},
								target: e.target
							});
							$menu_ct.data("kendoContextMenu").open();
							$menu_ct.css({fontFamily: "inherit", fontSize: "inherit"});
						}
					}
				})
			);

		},

    isAutoload: function(){
		  return this.options.autoload ? true : false;
    },

		// Based on this.isChanged
		isChanged: function(){
			if ( this.changed ){
				return true;
			}
			if ( this.parent ){
				return this.parent.tabNav("isChanged");
			}
			return false;
		},

		// Resize the tab content and the subtabs
		resize: function(){
			if ( this.list[this.options.selected] ) {
				var $$ = this,
					o = $$.options,
					idx = o.selected,
					w,
					tab = $$.element.children("div.k-content.k-state-active:first"),
					subtab = tab.find("div." + $$.widgetFullName + ":first"),
					subtabs = subtab.children("ul").children("li"),
					containerHeight = $$.element.parent().hasClass("k-tabstrip-wrapper") ? $$.element.parent().parent().height() : $$.element.parent().height(),
					titleHeight = parseInt($$.element.children("ul").outerHeight(true)),
					mainMargin = parseInt(
						parseFloat(tab.outerHeight(true)) -
						parseFloat(tab.height())
					);
				tab.height(parseInt(containerHeight - (titleHeight + mainMargin))).redraw();

				if ($.isFunction($$.list[idx].resize) ) {
					$$.list[idx].resize(tab, $$.list[idx]);
				}
				if (subtab.length > 0) {
					subtab.tabNav("resize", tab, $$.list);
				}
				if ( $.ui.tabNav.resize ){
					$.ui.tabNav.resize(tab, $$.list[idx]);
				}
				return 1;
			}
			return false;
		},

		// Sets back the change parameter to true and cascade ascending
		/** @todo Why?? */
		changeOK: function(){
			this.changed = false;
			if ( this.parent ){
				this.parent.tabNav("changeOK");
			}
			return false;
		},

		navigate: function(obj, idx){
			var $$ = this,
				o = $$.options;
			if ( obj.url ) {
        idx = $$.add(obj, idx);
        //appui.fn.log("NAV", idx, $$.list[idx], obj, "END");
        if ( idx !== false ){
          return $$.activate($$.list[idx].currentURL ? $$.list[idx].currentURL : $$.list[idx].url, true);
        }
			}
			return false;
		},

	});

  /** Global function */
  $.extend($.ui.tabNav, {

    version: "0.2",
    globalList: [],
    globalChange: false,
    addTabNav: function(ele){
      var baseURL = ele.tabNav("getFullBaseURL");
      if ( $.inArray(baseURL, $.ui.tabNav.globalList) === -1 ){
        $.ui.tabNav.globalList.push(baseURL);
        $.ui.tabNav.globalChange = 1;
      }
      if ( ele.tabNav("isAutoload") ){
        _storageAddTabNav(baseURL);
      }
    },
    removeTabNav: function(ele){
      var baseURL = ele.tabNav("getFullBaseURL");
      //appui.fn.log("removeTabNav", baseURL);
      $.ui.tabNav.globalList = $.grep($.ui.tabNav.globalList, function(url){
        return (url !== baseURL) && (url.indexOf(baseURL) !== 0) ? true : false;
      });
      $.ui.tabNav.globalChange = 1;
    },
    defaultObj: function(obj, widget){
      //appui.fn.log("BEFORE DEFAULT", obj);
      var r = {
        callonce: false,
        content: ' ',
        encoded: false,
        title: 'Untitled',
        url: false,
        pinned: false,
        data: {},
      };
      if ( (typeof(obj) === 'object') && obj.url ){
        //appui.fn.log("HAS URL1", obj, JSON.stringify(def));
        $.extend(r, obj);
        if ( r.current ){
          r.currentURL = r.current;
          delete r.current;
        }
        r.url = widget.parseURL(obj.url);
        r.currentURL = r.currentURL ? r.currentURL : r.url;
        // This is when working in conjunction with appui (which gives script)
        if ( !r.callonce && r.script ){
          var sc = r.script;
          delete r.script;
          r.callonce = function(ele, idx, data, widget){
            eval(sc);
          };
        }
        //appui.fn.log("AFTER DEFAULT", r);
        //appui.fn.log("HAS URL2", r);
        return r;
      }
      return def;
    },
    resize: false
  });
})(jQuery);
