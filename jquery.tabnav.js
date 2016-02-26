(function($){
  if ( !window.appui ){
    alert("appui library is mandatory");
  }
  $.widget("ui.tabNav", {

    // Options passable to the constructor
    options: {
      closeClass: "fa fa-times-circle",
      menuClass: "fa fa-caret-down",
      list: [],
      scrollable: false,
      tabPosition: "top",
      baseTitle: '',
      selected: -1,
      current: ''
    },

    // Makes the instance, initializes the list
    _create: function(){
      var $$ = this,
        o = $$.options;
      // The current URL of the tabNav is not yet set
      $$.current = false;
      // If set true activate will be triggered - always the first time
      $$.changed = true;
      $$.baseURL = '';
      $$.parent = $$.element.parents("." + this.widgetFullName + ":first");
      if ( !$$.parent.length ){
        $$.parent = false;
      }
      else{
        var tmp = $$.parent.tabNav("getURL", $$.element);
        if ( tmp ){
          tmp += '/';
        }
        else{
          tmp = '';
        }
        $$.baseURL = tmp;
      }

      // this.list is the current state of the list
      $$.list = [];
      // this.wid will be the instance of kendo widget
      if ( window.kendo === undefined ){
        alert("No kendo");
        return;
      }
      $$.wid = $$.element.addClass(this.widgetFullName).kendoTabStrip({
        animation:false,
        scrollable: o.scrollable ? { distance: 300 } : false,
        tabPosition: o.tabPosition,
        activate: function(e){
          var tab = $(e.item),
            m = tab.index();
          if ( $$.list[m] && ($$.getIdx() !== m) ){
            $$.activate($$.list[m].current ? $$.list[m].current : $$.list[m].url);
          }
        }
      }).data("kendoTabStrip");


      // Creation of an initial tab configuration
      if ( $.isArray(o.list) ){
        $.each(o.list, function(i, v){
          $$.add(v);
        });
        if ( o.current ){
          $$.activate(o.current, true);
        }
        else if ( !appui.env.old_path ){
          $$.activate();
        }
      }
    },

    getFullURL: function(){
      return this.parent ? this.parent.tabNav("getFullURL") : (this.current ? this.current : '');
    },

    getBaseURL: function(){
      return this.baseURL;
    },

    isChanged: function(){
      if ( this.changed ){
        return true;
      }
      if ( this.parent ){
        return this.parent.tabNav("isChanged");
      }
      return false;
    },

    changeOK: function(){
      this.changed = false;
      if ( this.parent ){
        this.parent.tabNav("changeOK");
      }
      return false;
    },

    parseURL: function(url){
      var $$ = this;
      if ( $$.baseURL && (url.indexOf($$.baseURL) === 0) ){
        return url.substr($$.baseURL.length);
      }
      else if ( $$.baseURL === (url + '/') ){
        return '';
      }
      return url;
    },

    activateDefault: function(){
    },

    setCurrent: function(url){
      var $$ = this;
      if ( (idx = $$.getIdx(url)) === false ) {
        url = '';
      }
      else{
        $$.list[idx].current = url;
      }
      $$.current = url;
      if ( $$.parent ){
        $$.parent.tabNav("setCurrent", $$.baseURL + url);
      }
    },

    // This function is the callback after activating a tab, but activates a given tab if not already
    activate: function(idx, force){
      var $$ = this,
        o = $$.options,
        tmp = this.getIdx(idx);
      if ( (tmp !== false) && (force || (idx !== this.options.selected)) ){
        // Is either the requested url or the target one
        var original = (typeof(idx) === 'string') && idx ? $$.parseURL(idx) : ($$.list[tmp].current ? $$.list[tmp].current : $$.list[tmp].url),
        // Numeric index
          idx = tmp,
        // actual tab
          tab = $$.getTab(idx),
        // Container
          cont = $$.getContainer(idx),
        // jQuery objects
          $cont = $(cont),
          $tab = $(tab),
        // Set to true the URL will be replaced instead of added (address correction)
          rep = false,
        // A subtab element if exists
          subtab,
          data = $$.getData(idx),
        // Numeric index of the previously selected tab
          oldURL = $$.getFullURL(),
          oldSelected = o.selected,
          oldCurrent = $$.current;

        if ( !original ){
          original = $$.list[idx].url;
        }
        if ( oldCurrent !== original ){
          $$.changed = true;
        }
        $$.setCurrent(original);

        //appui.fn.log("-------------", this.element.attr("id") + '/' + ex, original, $$.getFullURL(), oldURL);

        // This is the only moment where selected is set
        o.selected = idx;

        // If it's not already activated we do programmatically
        if ( !$tab.hasClass("k-state-active") ){
          $$.wid.activateTab($tab);
        }

        // Only if either:
        // - the tabNav has never been activated
        // - the force parameter has been sent
        // - the URL is different
        // We really activate it
        if ( force || $$.isChanged() ) {
          // If there is a callonce attached to this index we execute it and delete it
          if ($$.list[idx].callonce) {
            $$.list[idx].callonce(cont, idx, $$.list[idx].data);
            $$.list[idx].callonce = false;
          }
          // If there is a callback attached to this index we execute it
          if ($$.list[idx].callback && !$$.list[idx].disabled) {
            $$.list[idx].callback(cont, idx, $$.list[idx].data);
            $$.resize();
          }
          else {
            $$.resize();
          }

          // Looking for another tabNav widget inside this one
          subtab = $cont.find("div." + $$.widgetFullName + ":first");

          if (subtab.length && subtab.tabNav("getLength")) {
            // It will activate the next tabNav and so on
            // if current URL longer than this tab's URL, use the diff to activate the lower tabnav
            subtab.tabNav("activate", original);
          }
          // Until the very last tabNav which will be the one determining the final URL and executing appui.fn.setNavigationVars
          else {
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
        }

        //appui.fn.log("------------", this.element.attr("id") + '/' + ex, $$.current, $$.list[idx].current, $$.list[idx].url, $$.baseURL);
        appui.env.ele = $$.getContainer(idx);
        return appui.env.ele;
      }
    },

    close: function(idx, non_activate){
      if ( (idx = this.getIdx(idx)) !== false ){
        var $$ = this,
          ok = 1,
          cont = this.getContainer(idx);
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

    getContainer: function(idx){
      if ( (idx = this.getIdx(idx)) !== false ){
        return this.wid.contentHolder(idx)[0];
      }
    },

    getContent: function(idx){
      if ( (idx = this.getIdx(idx)) !== false ){
        return this.wid.contentHolder(idx).html();
      }
    },

    getTab: function(idx){
      if ( (idx = this.getIdx(idx)) !== false ){
        return this.wid.items()[idx];
      }
    },

    getSubTabNav: function(url){
      if ( typeof(url) !== 'string' ){
        return false;
      }
      if ( url.indexOf(appui.env.root) === 0 ){
        url = url.substr(appui.env.root.length);
      }
      var $$ = this,
        idxParent = $$.search(url),
        contParent = $$.getContainer(idxParent),
        $contParent = $(contParent),
        tabParent = $contParent.find("div." + $$.widgetFullName + ":first");

      if ( tabParent.length ){
        return tabParent.data($$.widgetFullName);
      }
      return false;
    },

    setContent: function(content, idx){
      if ( (idx = this.getIdx(idx)) !== false ){
        $(this.getContainer(idx)).html(content);
      }
    },

    setTitle: function(title, idx){
      if ( (idx = this.getIdx(idx)) !== false ){
        var tab = this.getTab(idx);
        if ( !title ){
          title = "Untitled";
        }
        this.list[idx].title = title;
        $(tab).children("span.k-link").html(title);
      }
    },

    setData: function(data, idx){
      if ( (idx = this.getIdx(idx)) !== false ){
        this.list[idx].data = new kendo.data.ObservableObject(data);

      }
      return this;
    },

    addToFunction: function(name, func, idx){
      var $$ = this;
      if ( (idx = $$.getIdx(idx)) !== false ){
        if ( ($$.list[idx][name] === undefined) || !$.isFunction($$.list[idx][name]) ){
          $$.list[idx][name] = func;
        }
        else if ( ($$.list[idx][name] !== undefined) && (this.list[idx][name] !== func) ){
          var f = this.list[idx][name],
            cont = $$.getContainer(idx);
          $$.list[idx][name] = function(){
            var r = f(cont, $$.list[idx], idx);
            if ( r ){
              return func(cont, $$.list[idx], idx);
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

    addData: function(data, idx){
      if ( (idx = this.getIdx(idx)) !== false ){
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

    removeData: function(type, idx){
      if ( (idx = this.getIdx(idx)) !== false ){
        if ( !type ){
          this.setData({}, idx);
        }
        else {
          var vars = type.split("."),
            v = this.list[idx].data;
          for (var i = 0; i < vars.length; i++) {
            if (v[vars[i]] !== undefined) {
              v = v[vars[i]];
            }
          }
          if (v !== undefined) {
            delete v;
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
        idx = $$.getIdx(idx);
      $$.reset(idx);
      appui.fn.link($$.baseURL + url, 1);
    },

    reset: function(idx, with_title){
      var $$ = this,
        o = $$.options;
      idx = $$.getIdx(idx);
      if ( idx !== false ) {
        $$.setContent(" ", idx);
        $$.list[idx] = {url: $$.list[idx].url, title: $$.list[idx].title};
        if ( with_title ) {
          $$.setTitle(" ", idx);
        }
      }
    },

    getURL: function(idx){
      idx = this.getIdx(idx);
      return this.list[idx] ? this.list[idx].url : false;
    },

    // Gets the index of a tab from various parameters: index (!), URL, a DOM element (or jQuery object) inside a tab, a tab, or the currently selected index if there is no argument
    getIdx: function(idx){
      var $$ = this,
        original = idx;
      if ( idx === undefined ){
        idx = $$.options.selected;
      }
      else if ( typeof(idx) === 'string' ){
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
      if ( idx === -1 ){
        for ( var i = 0; i < $$.list.length; i++ ){
          if ( $$.list[i].default ){
            return i;
          }
          if ( !$$.list[i].disabled && (idx === -1) ){
            idx = i;
          }
        }
      }
      return $$.list[idx] ? idx : false;
    },

    getObs: function(idx){
      return ( (idx = this.getIdx(idx)) !== false ) && this.list[idx] ? this.list[idx] : false;
    },

    getData: function(idx){
      if ( (idx = this.getIdx(idx)) !== false ){
        return this.list[idx].data;
      }
      return false;
    },

    set: function(prop, val, idx){
      var $$ = this,
        o = $$.options;
      idx = $$.getIdx(idx);
      if ( idx !== undefined ){
        $$.list[idx][prop] = val;
      }
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

    // Changes the position of a tab, relatively to others
    move: function(old_idx, idx){
      var $$ = this,
        o = $$.options;
      old_idx = $$.search(old_idx);
      if ( ($$.list[old_idx] !== undefined) && ($$.list[idx] !== undefined) ){
        var d = $$.list.splice(old_idx, 1);
        $$.list.splice(idx, 0, d[0]);
      }
      return $$;
    },

    select: function(url){
      var $$ = this,
        o = $$.options,
        i;
      if ( (idx = this.getIdx(url)) !== false ){
        $$.wid.select(idx);
        return true;
        if ( url === $$.list[i].url ){
          return true;
        }
        var $ts = $$.element.find("div[data-role=tabstrip]:first");
        if ( $ts.length ){
          var list = $ts.tabNav("getList")
          return $ts;//.tabNav("select", url.substr($$.list[i].url.length));
        }
      }
      return false;
    },

    add: function(obj, idx){
      var $$ = this,
        o = $$.options,
        r, $tab, menu = 1, newIdx, $closeBtn;
      // Sinon on rajoute un tab
      // Si idx n'est pas défini, ce sera le dernier tab
      if ( obj.url ) {
        if ((newIdx = $$.search(obj.url)) !== -1) {
          for (var k in obj) {
            if (k === 'content') {
              $$.setContent(obj[k], newIdx);
            }
            else if (k === 'title') {
              $$.setTitle(obj[k], newIdx);
            }
            else if (k === 'data') {
              $$.setData(obj[k], newIdx);
            }
            else{
              $$.list[newIdx][k] = obj[k];
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
          if ((idx === undefined) || (idx >= $$.list.length)) {
            idx = $$.list.length;
            $$.wid.append(r);
          }
          else if (idx < $$.list.length) {
            $$.wid.insertBefore(r, $$.getTab(idx));
          }
          else {
            throw new Error("Wrong tab index!");
            return;
          }
          $$.list.push(obj);
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
          if (menu && obj.url) {
            $tab.append(
              $('<i/>').addClass(o.menuClass).click(function (e) {
                var iEle = this,
                  $li,
                  $a,
                  menuEle,
                  $menu_ct = $('<ul/>').appendTo(document.body),
                  idx = $$.getIdx(obj.url),
                  ctx = [];

                if ($$.list[idx].menu) {
                  ctx = $$.list[idx].menu;
                }
                if ( !$$.list[idx].static ){
                  ctx.push({
                    text: appui.lng.reload,
                    fn: function (i, ob) {
                      $$.reload(ob.current ? ob.current : ob.url);
                    }
                  });
                  if ( $$.list[idx].pinned ){
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
                      fn: function(i, ob){
                        $$.close(i);
                      }
                    });
                    ctx.push({
                      text: appui.lng.closeAll,
                      fn: function(i, ob){
                        $$.closeAll();
                      }
                    });
                  }
                }
                if ( $$.list.length ) {
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
                $.each(ctx, function (i, v) {
                  if ( v.text ){
                    $li = $('<li style="white-space: nowrap"/>');
                    $a = $('<a/>').html(v.text);
                    $menu_ct.append($li.append($a));
                    $a.attr("href", v.url ? v.url : 'javascript:;');
                    if ( v.fn && $.isFunction(v.fn) ){
                      $a.click(function(){
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
                  }
                });
                $menu_ct.data("kendoContextMenu").open(-1000,-1000);
                var $li = $(e.target).closest("li"),
                  offset = $li.offset(),
                  w = $menu_ct.data("kendoContextMenu").wrapper.width(),
                  x = offset.left + $li.outerWidth(true) - w,
                  y = offset.top + $li.outerHeight(true);
                if ( x < 0 ){
                  x = 0;
                }
                $menu_ct.css({left: x, top: y});
              })
            );
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

    resize: function(){
      if ( this.list[this.options.selected] ) {
        var $$ = this,
          idx = this.options.selected,
          o = $$.options,
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

    getActiveTab: function(){
      return this.element.children("div.k-content").eq(this.options.selected);
    },

    getLength: function(){
      return this.list.length;
    },

    getList: function(){
      return this.list;
    },

    navigate: function(obj, ele){
      var $$ = this,
        o = $$.options;
      if ( !obj.url && obj.html ){
        obj.url = 'home';
      }
      if ( obj.html ){
        obj.content = obj.html;
        delete obj.html;
      }
      if ( obj.url ) {
        if ( obj.old_path !== undefined ){
          var i = $$.search(obj.old_path);
          if ( i > -1 ){
            $$.list[i].url = obj.url;
          }
        }
        $$.add(obj);
        return $$.activate(obj.old_path && (obj.old_path.indexOf(obj.url) === 0) ? obj.old_path : (obj.current ? obj.current : obj.url), 1);
      }
    }
  });
  $.extend($.ui.tabNav, {
    version: "0.1",
    listAll: function(){
      $("." + $.ui.tabNav.prototype.widgetFullName).each(function(){
        return $(this).tabNav("getList");
      });
    },
    resize: false
  });
})(jQuery);
