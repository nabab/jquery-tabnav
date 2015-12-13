(function($){
  $.widget("ui.tabNav", {

    // Options passable to the constructor
    options: {
      closeClass: "fa fa-times-circle",
      menuClass: "fa fa-caret-down",
      list: [],
      baseURL: '',
      scrollable: false,
      baseTitle: '',
      selected: -1
    },

    // Makes the instance, initializes the list
    _create: function(){
      var $$ = this,
        o = $$.options;

      // this.list is the current state of the list
      $$.list = [];
      // this.wid will be the instance of kendo widget
      if ( window.kendo === undefined ){
        alert("No kendo");
        return;
      }
      $$.wid = $$.element.addClass(this.widgetFullName).kendoTabStrip({
        animation:false,
        scrollable: o.scrollable,
        activate: function(e){
          var tab = $(e.item),
            m = tab.index();
          if ( $$.list[m] && (o.selected !== m) ){
            $$.activate(m);
          }
        }
      }).data("kendoTabStrip");

      // Creation of an initial tab configuration
      if ( $.isArray(o.list) ){
        $.each(o.list, function(i, v){
          $$.add(v);
        });
        if ( (o.selected === -1) && $$.list.length ){
          //$$.activate(0);
        }
      }
    },

    activateDefault: function(){
    },

    // This function is the callback after activating a tab, but can also be used to activate a given tab
    activate: function(idx, force){
      var tmp = this.getIdx(idx);
      if ( (tmp !== false) && (force || (idx !== this.options.selected)) ){
        var $$ = this,
          o = $$.options,
          original = typeof(idx) === 'string' ? idx : ($$.list[tmp].current ? $$.list[tmp].current : appui.v.path),
          idx = tmp,
          tab = $$.getTab(idx),
          cont = $$.getContainer(idx),
          $cont = $(cont),
          $tab = $(tab),
          rep = false,
          subtab,
          data = {},
          oldSelected = o.selected;

        // This is the only moment where selected is set
        o.selected = idx;

        // If it's not already activated we do programmatically
        if ( !$tab.hasClass("k-state-active") ){
          $$.wid.activateTab($tab);
        }

        // If there is a callonce attached to this index we execute it and delete it
        if ( $$.list[idx].callonce ){
          $$.list[idx].callonce(idx, $$.list[idx]);
          $$.list[idx].callonce = false;
        }
        // If there is a callback attached to this index we execute it
        if ( $$.list[idx].callback && !$$.list[idx].disabled ){
          $$.list[idx].callback(cont, $$.list[idx], idx);
          $$.resize();
        }
        else{
          $$.resize();
        }
        $tab.trigger("resize");

        // Looking for another tabNav widget inside this one
        subtab = $cont.find("div." + $$.widgetFullName + ":first");

        if ( subtab.length && subtab.tabNav("getLength") ){
          // It will activate the next tabNav and so on
          // if current URL longer than this tab's URL, use the diff to activate the lower tabnav
          if ( (original.indexOf($$.list[idx].url) === 0) ){
            subtab.tabNav("activate", original.substr($$.list[idx].url.length+1));
          }
          // Otherwise activate the default one
          else{
            subtab.tabNav("activate");
          }
        }
        // Until the very last tabNav which will be the one determining the final URL and executing appui.f.setNavigationVars
        else if ( (appui.v.path === o.baseURL + $$.list[idx].url) ||
          (appui.v.path.indexOf(o.baseURL + $$.list[idx].url + '/') === -1) ){
          $$.element.parents("." + $$.widgetFullName).each(function(){
            if ( $(this).tabNav("getURL") === appui.v.path ){
              rep = 1;
              return false;
            }
            if ( (appui.v.old_path === null) && ($(this).tabNav("getURL") !== appui.v.path) ){
              rep = 1;
              return false;
            }
          });
          var url = o.baseURL + ( (
            typeof(original) === 'string' &&
            ($$.list[idx].url !== original) &&
            (original !== '') &&
            (original.indexOf($$.list[idx].url) === 0)
          ) ? original : $$.list[idx].url );
          // This is the only moment where current is set
          $$.list[idx].current = url;
          appui.f.setNavigationVars(url, o.baseTitle + $$.list[idx].title, data, rep);
        }

        // Change tab color if defined
        if( $$.list[idx].bcolor ){
          $($$.getTab(idx)).animate({backgroundColor: $$.list[idx].bcolor});
          if ( $$.list[idx].url !== $$.getObs(oldSelected).url ) {
            var tab = $($$.getTab(oldSelected)), col = tinycolor($$.getObs(oldSelected).bcolor);
            for ( var i = 1; i < 100; i++ ){
              col = col.lighten(i);
              if ( col.getLuminance() > 0.7 ){
                break;
              }
            }
            tab.animate({backgroundColor: col.toHexString()});
          }
        }
        if( $$.list[idx].fcolor ){
          $($$.getTab(idx)).children().css("color", $$.list[idx].fcolor);
          if ( $$.list[idx].url !== $$.getObs(oldSelected).url ) {
            $($$.getTab(oldSelected)).children().animate({color:  tinycolor($$.getObs(oldSelected).fcolor).darken(80).toHexString()});
          }
        }

        appui.v.ele = $$.getContainer(idx);
        return appui.v.ele;
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
      if ( this.list.length ) {
        var $$ = this,
            idx = $$.list.length - 1;
        $$.addAfterClose(function () {
          $$.closeAll();
        }, idx);
        $$.close(idx, false);
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
      if ( url.indexOf(appui.v.root) === 0 ){
        url = url.substr(appui.v.root.length);
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
          if ( data[n] !== this.list[idx].data.get(n) ){
            this.list[idx].data.set(n, data[n]);
            change = 1;
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

    reload: function(idx){
      var $$ = this;
      $$.close(idx);
      appui.f.link(idx, 1);
    },

    reset: function(idx, with_title){
      var $$ = this,
        o = $$.options;
      idx = $$.getIdx(idx);
      if ( idx !== false ) {
        $$.setContent(" ", idx);
        if ( with_title ) {
          $$.setTitle(" ", idx);
        }
        $$.setData({}, idx);
        delete $$.list[idx].callonce;
        delete $$.list[idx].callback;
        delete $$.list[idx].close;
        delete $$.list[idx].afterClose;
      }
    },

    getURL: function(idx){
      if ( idx === undefined ){
        idx = this.options.selected;
      }
      return this.list[idx] ? this.list[idx].url : false;
    },

    // Gets the index of a tab from various parameters: index (!), URL, a DOM element (or jQuery object) inside a tab, a tab, or the currently selected index if there is no argument
    getIdx: function(idx){
      if ( idx === undefined ){
        idx = this.options.selected;
      }
      else if ( typeof(idx) === 'string' ){
        idx = this.search(idx);
      }
      else if ( typeof(idx) === 'object' ){
        // Not jQuery
        if ( !idx.length ){
          idx = $(idx);
        }
        if ( idx.length && $.isFunction(idx.index) ){
          var p = idx.parent();
          while ( p.length && (p[0] !== this.element[0]) ){
            idx = p;
            p = idx.parent();
          }
          idx = p.length ? p.children("div[role=tabpanel]").index(idx) : -1;
        }
      }
      if ( idx === -1 ){
        for ( var i = 0; i < this.list.length; i++ ){
          if ( !this.list[i].disabled ){
            return i;
          }
        }
      }
      return this.list[idx] ? idx : false;
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
      if ( url.indexOf(appui.v.root) === 0 ){
        url = url.substr(appui.v.root.length);
      }

      var $$ = this,
        o = $$.options,
        tmp = o.baseURL ? url.replace(o.baseURL, '') : url,
        slash,
        i;

      // We look for at tab eith the same URL, full or partial
      while ( tmp !== '' ){
        i = appui.f.search($$.list, "url", tmp);
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
        r, $tab, menu = 1, newIdx;
      // Sinon on rajoute un tab
      // Si idx n'est pas d�fini, ce sera le dernier tab
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
              $$.setData(obj[k], newIdx);
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
          // Adding a close button is item is not static
          if (!obj.static || (obj.static === undefined)) {
            $tab.addClass("with_button").append(
              $('<i/>').addClass(o.closeClass).click(function () {
                $$.close($(this).closest("li").index());
              })
            );
            if ( obj.url && !obj.menu ) {
              obj.menu = [{
                text: appui.l.reload,
                fn: function(i, ob){
                  $$.reload(ob.current ? ob.current : ob.url);
                }
              }];
            }
          }
          if (obj.menu && obj.menu.length) {
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
                    $menu_ct = $('<ul/>').appendTo(document.body);
                  $.each(obj.menu, function (i, v) {
                    if ( v.text ){
                      $li = $('<li/>');
                      $a = $('<a/>').html(v.text);
                      $menu_ct.append($li.append($a));
                      $a.attr("href", v.url ? v.url : 'javascript:;');
                      if ( v.fn && $.isFunction(v.fn) ){
                        $a.click(function(){
                          v.fn(idx, obj);
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
          subtab = tab.find("div[data-role=tabstrip]:first"),
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
      if ( obj.old_path !== undefined ){
        var i = $$.search(obj.old_path);
        if ( i > -1 ){
          $$.list[i].url = obj.url;
        }
      }
      if ( obj.url ){
        $$.add(obj);
        return $$.activate(obj.old_path && (obj.old_path.indexOf(obj.url) === 0) ? obj.old_path : obj.url);
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
