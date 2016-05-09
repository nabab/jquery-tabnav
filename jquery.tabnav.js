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

  $.widget("ui.tabNav", {

    // Options passable to the constructor
    options: {
      baseURL: false,
      closeClass: "fa fa-times-circle",
      menuClass: "fa fa-caret-down",
      // Pre-loaded list
      list: [],
      activate: false,
      close: false,
      transform: false,
      afterClose: false,
      scrollable: false,
      tabPosition: "top",
      baseTitle: '',
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
        parent = $$.element.closest("." + this.widgetFullName);

      /**
       * current state of the list (of tabs) made of objects of this type:
       * {
     *    url: "my/tab/url",
     *    title: "My title",
     *    content: "<h1>My tab content</h1>",
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
     *      alert("I am called every time the tab or one of its parents is resized");
     *    },
     *    afterClose: function(container, listItem, list, widget){
     *      alert("I am called every time the tab or one of its parents is resized");
     *    },
     *    current: "my/tab/url/is/now/like/this",
     *    pinned: true,
     **/
      $$.activated = false;
      $$.list = [];

      // If set to true activate will be triggered - always the first time
      $$.changed = true;

      // jQuery object of the nearest parent tabNav if exists
      $$.parent = parent.length ? parent : false;

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

      $$.updateBaseURL();

      /** @var wid Instance of the tabstrip widget - Creation */
      $$.wid = $$.element.addClass(this.widgetFullName).kendoTabStrip({
        animation:false,
        scrollable: o.scrollable ? { distance: 300 } : false,
        tabPosition: o.tabPosition,
        activate: function(e){
          $$.onActivate(e.item);
        }
      }).data("kendoTabStrip");

      // Creation of an initial tab configuration
      if ( $.isArray(o.list) && o.list.length ){
        $.each(o.list, function(i, v){
          $$.add($.ui.tabNav.defaultObj(v, $$));
        });

        var url;
        if ( o.current ){
          $$.activate(o.current, true);
          o.current = false;
        }
        // The page is loading first time
        else if ( !appui.env.old_path && (url = appui.env.path.substr($$.getFullBaseURL().length)) ){
          $$.activate(url, true);
        }
        else{
          $$.activate(false, true);
        }
      }
      return this;
    },

    // Sets the baseURL based on parent if any or on option's value if defined, leaves it empty otherwise
    updateBaseURL: function(){
      var $$ = this,
        o = $$.options;
      // Case where we have a parent tabNav widget
      if ( $$.parent ){
        var tmp = $$.parent.tabNav("getURL", $$.element);
        if ( tmp ){
          tmp += '/';
        }
        else{
          tmp = '';
        }
        $$.baseURL = tmp;
      }
      else if ( o.baseURL ){
        $$.baseURL = o.baseURL;
      }
      return this;
    },

    getFullBaseURL: function(){
      var t = this.element,
          base = '',
          tmp;
      while ( tmp = t.tabNav("getBaseURL") ){
        base = tmp + base;
        if ( !(t = t.tabNav("getParent")) ){
          return base;
        }
      }
      return base;
    },

    getParent: function(){
      return this.parent;
    },

    // Triggered when manually activating a tab. Launches the activate function
    onActivate: function(item){
      var idx = $(item).index();
      if ( this.list[idx] && (this.options.selected !== idx) ){
        this.activate(this.list[idx].currentURL ? this.list[idx].currentURL : this.list[idx].url);
      }
    },

    // Returns the current URL from the root tabNav without the hostname (if it has a baseURL it will start after)
    getFullURL: function(){
      return this.parent ? this.parent.tabNav("getFullURL") : (this.currentURL ? this.currentURL : '');
    },

    // Returns the baseURL property
    getBaseURL: function(){
      return this.baseURL;
    },

    close: function(idx, non_activate){
      if ( (idx = this.getIndex(idx)) !== false ){
        var $$ = this,
          o = $$.options,
          ok = 1,
          cont = this.getContainer(idx);
        if ( $.isFunction(o.beforeClose) ){
          o.beforeClose($$.element, idx, $$);
        }
        if ( ($$.list[idx].close !== undefined) &&
          $.isFunction($$.list[idx].close) &&
          !$$.list[idx].close(cont, $$.list[idx], idx) ){
          ok = false;
        }
        if ( ok ){
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
            else if ( idx === $$.options.selected ) {
              $$.activate($$.list[idx] ? idx : idx - 1, 1);
            }
          }
          if ( $.isFunction(o.afterClose) ){
            o.afterClose($$.element, idx, $$);
          }
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

    getURL: function(idx, force){
      idx = this.getIndex(idx, force);
      return this.list[idx] ? this.list[idx].url : false;
    },

    getContainer: function(idx, force){
      if ( ((idx = this.getIndex(idx, force)) !== false) && (this.wid.contentElements.length > idx) ){
        return this.wid.contentElements[idx];
      }
    },

    getContent: function(idx, force){
      if ( (idx = this.getIndex(idx, force)) !== false ){
        return this.wid.contentHolder(idx).html();
      }
    },

    getTab: function(idx, force){
      if ( (idx = this.getIndex(idx, force)) !== false ){
        return this.wid.items()[idx];
      }
    },

    getActiveTab: function(){
      return this.element.children("div.k-content").eq(this.options.selected);
    },

    getLength: function(){
      return this.list.length;
    },

    getList: function(){
      return this.list;
    },

    setContent: function(content, idx){
      if ( (idx = this.getIndex(idx)) !== false ){
        $(this.getContainer(idx)).html(content);
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

    setData: function(data, idx){
      if ( (idx = this.getIndex(idx)) !== false ){
        this.list[idx].data = window.kendo !== undefined ? kendo.observable(data) : data;
      }
      return this;
    },

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
                    $$.reload(ob.currentURL ? ob.currentURL : ob.url);
                  }
                });
                if ($$.list[idx].pinned) {
                  ctx.push({
                    text: appui.lng.unpin,
                    fn: function (i, ob) {
                      $$.list[idx].pinned = false;
                      $closeBtn.show();
                    }
                  });
                }
                else {
                  ctx.push({
                    text: appui.lng.pin,
                    fn: function (i, ob) {
                      $$.list[idx].pinned = true;
                      $closeBtn.hide();
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
            }
          }
        })
      );

    },

    // Returns the url relative to the current tabNav from the given url
    parseURL: function(url){
      var $$ = this;
      if ( url.indexOf(appui.env.root) === 0 ){
        url = url.substr(appui.env.root.length);
      }
      if ( $$.baseURL && (url.indexOf($$.baseURL) === 0) ){
        return url.substr($$.baseURL.length);
      }
      else if ( $$.baseURL === (url + '/') ){
        return '';
      }
      return url;
    },

    /**\
     * Adds an object to the list array, and a corresponding tab in the tabstrip
     * @param obj
     * @param idx
     * @returns {ui.tabNav}
     */
    add: function(obj, idx){
      var $$ = this,
        o = $$.options,
        r,
        $tab,
        menu = 1,
        newIndex,
        $closeBtn;

      if ( $.isFunction(o.transform) ){
        obj = o.transform(obj);
      }

      // A URL is mandatory
      if ( obj.url ) {


        // Searching the URL among the tabs to check if it doesn't exist
        if ((newIndex = $$.search(obj.url)) !== -1) {

          // In this case we
          for (var k in obj) {
            if (k === 'content') {
              $$.setContent(obj[k], newIndex);
            }
            else if (k === 'title') {
              $$.setTitle(obj[k], newIndex);
            }
            else if (k === 'data') {
              $$.setData(obj[k], newIndex);
            }
            // Color for IDE tabs
            else if ( k === 'bcolor' ){
              $$.list[newIndex][k] = obj[k];
              var col = tinycolor(obj[k].bcolor);
              for ( var i = 1; i < 100; i++ ){
                col = col.lighten(i);
                if ( col.getLuminance() > 0.7 ){
                  break;
                }
              }
              $$.getTab(newIndex).css("background-color", col.toHexString());
            }
            else if ( k === 'fcolor' ){
              $$.list[newIndex][k] = obj[k];
              $$.getTab(newIndex).children().css("color", tinycolor(obj.fcolor).darken(80).toHexString());
            }
            else{
              $$.list[newIndex][k] = obj[k];
            }
          }
        }
        else {
          if (!obj.title) {
            obj.title = 'Untitled';
          }
          r = {
            text: obj.title,
            content: ' ',
            encoded: false
          };
          if ( obj.data && window.kendo ){
            obj.data = kendo.observable(obj.data);
          }
          if ((idx === undefined) || (idx >= $$.list.length)) {
            idx = $$.list.length;
            $$.list.push(obj);
            $$.wid.append(r);
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
          if ( obj.static ) {
            $closeBtn.hide();
          }
          $tab.children().each(function () {
            if ($(this).hasClass(o.menuClass)) {
              menu = false;
            }
          });

          // Indivual tabs' menu
          if ( menu ) {
            $$.buildMenu(obj, $tab);
          }

          if (obj.content) {
            $$.setContent(obj.content, idx);
            obj.content = r.content;
          }
          // Disabling disabled
          if (obj.disabled) {
            $$.wid.disable($$.getTab(idx));
          }
          // Color for IDE tabs
          if ( obj.bcolor ){
            var col = tinycolor($$.getObs(idx).bcolor);
            for ( var i = 1; i < 100; i++ ){
              col = col.lighten(i);
              if ( col.getLuminance() > 0.7 ){
                break;
              }
            }
            $tab.css("background-color", col.toHexString());
          }
          if ( obj.fcolor ){
            $tab.children().css("color", tinycolor(obj.fcolor).darken(80).toHexString());
          }
        }
      }
      return $$;
    },

    // Sets the current url of the widget, and of the widgets above
    setCurrent: function(url, idx){
      var $$ = this;
      if ( !$$.list[idx] ){
        throw new Error("The index " + idx + " doesn't exist in the list which has " + $$.list.length + " elements");
        return false;
      }
      if ( url.indexOf($$.list[idx].url) === 0 ){
        $$.list[idx].currentURL = url;
        $$.currentURL = url;
        if ( $$.parent ){
          $$.parent.tabNav("setCurrent", $$.baseURL + url, $$.parent.tabNav("getIndex", $$.element));
        }
      }
    },

    // Loads a remote content and injects it as a new tab
    link: function(url, force){

      // Analyses the arguments
      $.each(arguments, function(i, v){
        if ( (typeof(v) === "boolean") || (v === 0) || (v === 1) ){
          force = v ? true : false;
        }
        else if ( typeof(v) === "number" ){
          url = v.toString();
        }
        else if ( typeof(v) === "string" ){
          url = v;
        }
      });
      // if no URL we use the current one
      if ( url === '' ){
        url = this.currentURL;
      }

      var $$ = this,
          ele,
          idx = $$.search(url),
          sidx = $$.search(url, true);

      if ( idx != -1 ){
        $$.activate(url);
        if ( (ele = $$.getSubTabNav(idx)) && (sidx == -1) ){
          ele.tabNav("link", url.substr($$.list[idx].url.length + 1), force);
          return;
        }
      }
      if ( (idx == -1) || force ){
        appui.fn.post($$.getFullBaseURL() + url, {
          appui_baseURL: $$.baseURL
        }, function(obj){
          if ( obj.content ){
            if ( obj.url && (url.indexOf(obj.url) === 0) ){
              obj.currentURL = url;
            }
            /** @todo shouldn't the subtab load also if the remaining url is not empty */
            $$.navigate(obj);
          }
        })

      }
    },

    /**
     * FROM HERE NOT SURE
     *
     */

    getObs: function(idx){
      return ( (idx = this.getIndex(idx)) !== false ) && this.list[idx] ? this.list[idx] : false;
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

    reset: function(idx, with_title){
      var $$ = this,
        o = $$.options;
      idx = $$.getIndex(idx);
      if ( idx !== false ) {
        $$.setContent(" ", idx);
        $$.list[idx] = {url: $$.list[idx].url, title: $$.list[idx].title};
        if ( with_title ) {
          $$.setTitle(" ", idx);
        }
      }
    },

    // Will return true if the URL has changed
    isChanged: function(){
      if ( this.changed ){
        return true;
      }
      if ( this.parent ){
        return this.parent.tabNav("isChanged");
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
        appui.fn.log(tab, cont, ptab, pcont, $$.wid);
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

    getData: function(idx){
      if ( (idx = this.getIndex(idx)) !== false ){
        return this.list[idx].data;
      }
      return false;
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

    reload: function(url){
      var $$ = this,
        idx = $$.getIndex(url);
      $$.reset(idx);
      $$.link(url, 1);
    },



    /**
     * FROM HERE TO DO
     *
     */


    // This function is the callback after activating a tab, but activates a given tab if not already
    activate: function(idx, force){
      // if no parameter is passed we use the current url
      var $$ = this,
        o = $$.options,
      // either the requested url or the url corresponding to the target index
        url = typeof(idx) === 'string' ? $$.parseURL(idx) : false;
      idx = $$.getIndex(idx, true);
      if ( (idx === false) || ($$.list[idx] === undefined) ){
        throw new Error("Impossible to find an index for " + url + " in element with ID " + $$.element.id);
        return this;
      }
      if ( !url ){
        url = $$.list[idx].currentURL ? $$.list[idx].currentURL : $$.list[idx].url;
        if ( !url ){
          throw new Error("No url defined for this tab");
          return this;
        }
      }
      //appui.fn.log("ACTIVATE", idx, url);
      // actual tab
      var tab = $$.getTab(idx),
      // Container
        cont = $$.getContainer(idx),
      // jQuery objects
        $cont = $(cont),
        $tab = $(tab),
      // Set to true the URL will be replaced instead of added (address correction)
        rep = false,
      // A subtab element if exists
        subtab,
      // data as it will be used in the event functions
        data = $$.getData(idx),
      // Numeric index of the previously selected tab
        oldURL = $$.getFullURL(),
      // Previously selected index
        oldSelected = o.selected,
      // Previous "current url"
        oldCurrent = $$.currentURL;

      if ( !$cont.length || !$tab.length ){
        throw new Error("There is a problem with the widget...?");
        return this;
      }

      if ( oldCurrent !== url ){
        // This is the only moment where changed is set
        $$.changed = true;
        // If it's not already activated we do programmatically, it won't execute the callback function
        if ( !$tab.hasClass("k-state-active") ){
          $$.wid.activateTab($tab);
        }
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

        if ( $.isFunction(o.activate) ){
          o.activate($$.element, idx, $$);
        }

        $$.resize();

        if ( $$.list[idx].load ){
          $$.list[idx].load = false;
          $$.link(url, 1);
          return this;
        }
        // If there is a callonce attached to this index we execute it and delete it
        if ($$.list[idx].callonce) {
          $$.list[idx].callonce(cont, idx, $$.list[idx].data, $$);
          $$.list[idx].callonce = false;
          $$.resize();
        }
        // If there is a callback attached to this index we execute it
        if ($$.list[idx].callback && !$$.list[idx].disabled) {
          $$.list[idx].callback(cont, idx, $$.list[idx].data, $$);
          $$.resize();
        }

        // Looking for another tabNav widget inside the selected tab panel
        subtab = $cont.find("div." + $$.widgetFullName + ":first");
        /*
         appui.fn.log(
         "-------------",
         this.element.attr("id"),
         "List length: " + $$.list.length,
         "url: " + url,
         "getFullURL(): " + $$.getFullURL(),
         "oldURL: " + oldURL,
         "oldCurrent: " + oldCurrent,
         "surl: " + url.substr($$.list[idx].url.length),
         subtab,
         "-------------"
         );
         */

        //alert("ACTIVATED WITH" + url);
        if (subtab.length && subtab.tabNav("getLength")) {
          // It will activate the next tabNav and so on
          // if current URL longer than this tab's URL, use the diff to activate the lower tabnav
          subtab.tabNav("activate", url.substr($$.list[idx].url.length+1), force);
        }
        // Until the very last tabNav which will be the one determining the final URL and executing appui.fn.setNavigationVars
        else {
          // Changing the current url configuration
          $$.setCurrent(url, idx);
          $$.changeOK();
          appui.fn.setNavigationVars($$.getFullURL(), o.baseTitle + $$.list[idx].title, data, rep);
        }

        // Change tab color if defined
        if ($$.list[idx].bcolor) {
          $($$.getTab(idx)).animate({backgroundColor: $$.list[idx].bcolor});
          if ($$.list[idx].url !== $$.getObs(oldSelected).url) {
            var tab = $($$.getTab(oldSelected)), col = tinycolor($$.getObs(oldSelected).bcolor);
            for (var i = 1; i < 100; i++) {
              col = col.lighten(i);
              if (col.getLuminance() > 0.7) {
                break;
              }
            }
            tab.animate({backgroundColor: col.toHexString()});
          }
        }
        if ($$.list[idx].fcolor) {
          $($$.getTab(idx)).children().css("color", $$.list[idx].fcolor);
          if ($$.list[idx].url !== $$.getObs(oldSelected).url) {
            $($$.getTab(oldSelected)).children().animate({color: tinycolor($$.getObs(oldSelected).fcolor).darken(80).toHexString()});
          }
        }
        appui.env.ele = $$.getContainer(idx);
      }
      else{
        appui.fn.log("NOT ACTIVATED WITH " + url, $$.element, $$.list);
      }
      return this;
    },
    
    isValidIndex: function(idx){
      if ( idx === 0 ){
        return true;
      }
      if ( !idx ){
        return false;
      }
      if ( (typeof(idx) === 'number') && (idx > -1) ){
        return true;
      }
      if ( (typeof(idx) === 'string') ){
        return true;
      }
      if ( (typeof(idx) === 'object') ){
        return true;
      }
      return false;
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
        if ( o.current ){
          idx = o.current;
          o.current = false;
        }
        else if ( o.selected > -1 ){
          idx = o.selected;
        }
      }
      if ( $$.isValidIndex(idx) ) {
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
      if ( typeof(url) !== 'string' ){
        return false;
      }
      if ( url.indexOf(appui.env.root) === 0 ){
        url = url.substr(appui.env.root.length);
      }

      var $$ = this,
        o = $$.options,
        tmp = $$.baseURL ? url.replace($$.baseURL, '') : url,
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

    navigate: function(obj, idx){
      var $$ = this,
          o = $$.options;
      obj = $.ui.tabNav.defaultObj(obj, $$);
      if ( obj.url ) {
        $$.add(obj, idx);
        return $$.activate(obj.currentURL ? obj.currentURL : obj.url, true);
      }
    },

  });
  $.extend($.ui.tabNav, {
    version: "0.1",
    listAll: function(){
      return $("." + $.ui.tabNav.prototype.widgetFullName).first().tabNav("getList");
    },
    defaultObj: function(obj, widget){
      var def = {
        callonce: false,
        content: ' ',
        encoded: false,
        title: 'Untitled',
        url: false,
        pinned: false,
        data: {},
      };
      if ( typeof(obj) === 'object' ){
        if ( !obj.callonce && obj.script ){
          var sc = obj.script;
          delete obj.script;
          obj.callonce = function(ele, idx, data, widget){
            eval(sc);
          };
        }
        return $.extend(def, obj);
      }
      return def;
    },
    resize: false
  });
})(jQuery);
