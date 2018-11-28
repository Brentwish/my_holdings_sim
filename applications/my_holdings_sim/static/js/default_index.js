// This is the js for the default/index.html view.
var app = function() {

  var self = {};

  Vue.config.silent = false; // show all warnings

  // Extends an array
  self.extend = function(a, b) {
    for (var i = 0; i < b.length; i++) {
      a.push(b[i]);
    }
  };

  // Enumerates an array.
  var enumerate = function(v) { var k=0; return v.map(function(e) {e._idx = k++;});};

  // Alternative version.
  var enumerate = function (v) {
    for (var i = 0; i < v.length; i++) {
      v[i]._idx = i;
    }
  }

  self.add_post = function () {
    // We disable the button, to prevent double submission.
    $.web2py.disableElement($("#add-post"));
    var sent_title = self.vue.form_title; // Makes a copy
    var sent_content = self.vue.form_content; //
    $.post(add_post_url,
      // Data we are sending.
      {
        post_title: self.vue.form_title,
        post_content: self.vue.form_content
      },
      // What do we do when the post succeeds?
      function (data) {
        // Re-enable the button.
        $.web2py.enableElement($("#add-post"));
        // Clears the form.
        self.vue.form_title = "";
        self.vue.form_content = "";
        // Adds the post to the list of posts.
        var new_post = {
          id: data.post_id,
          post_title: sent_title,
          post_content: sent_content,
          // When we add a new post, we have to make it look like what we get
          // from the server. See get_post_list in API, we have to define all
          // the fields that we define there.
          post_author: user_email,
          like: false,
          rating: null // We could also use 0 here I guess. 
        };
        self.vue.post_list.unshift(new_post);
        // We re-enumerate the array.
        self.process_posts();
      });
    // If you put code here, it is run BEFORE the call comes back.
  };

  self.get_posts = function() {
    $.getJSON(get_post_list_url,
      function(data) {
        // I am assuming here that the server gives me a nice list
        // of posts, all ready for display.
        self.vue.post_list = data.post_list;
        // Post-processing.
        self.process_posts();
      }
    );
  };

  self.process_posts = function() {
    // This function is used to post-process posts, after the list has been modified
    // or after we have gotten new posts.
    // We add the _idx attribute to the posts.
    enumerate(self.vue.post_list);
    // We initialize the smile status to match the like.
    self.vue.post_list.map(function (e) {
      // I need to use Vue.set here, because I am adding a new watched attribute
      // to an object.  See https://vuejs.org/v2/guide/list.html#Object-Change-Detection-Caveats
      // Did I like it?
      // If I do e._smile = e.like, then Vue won't see the changes to e._smile .
      Vue.set(e, '_smile', e.like);
      // Who liked it?
      Vue.set(e, '_likers', []);
      // Do I know who liked it? (This could also be a timestamp to limit refresh)
      Vue.set(e, '_likers_known', false);
      // Do I show who liked?
      Vue.set(e, '_show_likers', false);
      // Number of stars to display.
      Vue.set(e, '_num_stars_display', e.rating);
    });
  };

  // Code for getting and displaying the list of likers.
  self.show_likers = function(post_idx) {
    var p = self.vue.post_list[post_idx];
    p._show_likers = true;
    if (!p._likers_known) {
      $.getJSON(get_likers_url, {post_id: p.id}, function (data) {
        p._likers = data.likers
        p._likers_known = true;
      })
    }
  };

  self.hide_likers = function(post_idx) {
    var p = self.vue.post_list[post_idx];
    p._show_likers = false;
  };

  // Smile change code.
  self.like_mouseover = function (post_idx) {
    // When we mouse over something, the face has to assume the opposite
    // of the current state, to indicate the effect.
    var p = self.vue.post_list[post_idx];
    p._smile = !p.like;
  };

  self.like_click = function (post_idx) {
    // The like status is toggled; the UI is not changed.
    var p = self.vue.post_list[post_idx];
    p.like = !p.like;
    // We need to post back the change to the server.
    $.post(set_like_url, {
      post_id: p.id,
      like: p.like
    }); // Nothing to do upon completion.
  };

  self.like_mouseout = function (post_idx) {
    // The like and smile status coincide again.
    var p = self.vue.post_list[post_idx];
    p._smile = p.like;
  };

  // Code for star ratings.
  self.stars_out = function (post_idx) {
    // Out of the star rating; set number of visible back to rating.
    var p = self.vue.post_list[post_idx];
    p._num_stars_display = p.rating;
  };

  self.stars_over = function(post_idx, star_idx) {
    // Hovering over a star; we show that as the number of active stars.
    var p = self.vue.post_list[post_idx];
    p._num_stars_display = star_idx;
  };

  self.set_stars = function(post_idx, star_idx) {
    // The user has set this as the number of stars for the post.
    var p = self.vue.post_list[post_idx];
    p.rating = star_idx;
    // Sends the rating to the server.
    $.post(set_stars_url, {
      post_id: p.id,
      rating: star_idx
    });
  };

  self.delete_post = function(post_idx) {
    var p = self.vue.post_list[post_idx];
    $.post(delete_post_url, {
      post_id: p.id,
    },
      function (data) {
        // We need to remove the post client-side.
        // splice does the job.
        self.vue.post_list.splice(post_idx, 1);
      }
    );
  };

  self.search = () => {
    //If they searched before all_stocks loads return from function
    if (!self.vue.all_stocks) return false;

    //Filter out strings that don't contain self.vue.search_query
    //Reduce it into a comma separated string of tickers for the path params
    let symbols = Object.keys(self.vue.all_stocks)
      .filter( s => s.match(self.vue.search_query.toUpperCase()))
      .slice(0, MAX_SEARCH_RESULT)
      .reduce((s, c) => s + c + ",", "").slice(0, -1);
    let result = {};

    if (!symbols) {
      self.vue.search_result = {};
    } else {
      symbols = "symbols=" + symbols;
      const types = "types=stats,price,logo";
      const path = `${ iex }/stock/market/batch?${ symbols }&${ types }`;

      $.get(path, res => {
        Object.keys(res).forEach( s => {
          result[s] = self.vue.all_stocks[s];
          result[s]["mktcap"] = res[s]["stats"]["marketcap"];
          result[s]["price"] = res[s]["price"];
          result[s]["logo"] = res[s]["logo"]["url"];
        });
        self.vue.search_result = result;
      });
    }
  }

  self.get_all_stocks = () => {
    let result = {};
    $.get(`${ iex }/ref-data/symbols`, res => {
      res.forEach( s => result[s.symbol] = s );
      self.vue.all_stocks = result;
    })
  }

  self.is_watching = symbol => {
    return self.vue.watched_stocks[symbol];
  }

  self.watch_stock = symbol => {
    if (self.vue.watched_stocks[symbol]) {
      $.post(watch_stock_ep, { symbol, val: false }, res => {
        Vue.set(self.vue.watched_stocks, symbol, false);
      });
    } else {
      $.post(watch_stock_ep, { symbol, val: true }, res => {
        Vue.set(self.vue.watched_stocks, symbol, true);
      });
    }
  }

  self.get_watched_stocks = () => {
    let result = {};
    $.get(get_watched_stocks_ep, {}, res => {
      console.log(res);
      res["symbols"].forEach( s => result[s] = true);
      self.vue.watched_stocks = result;
      console.log(self.vue.watched_stocks);
    });
  }

  // Complete as needed.
  self.vue = new Vue({
    el: "#vue-div",
    delimiters: ['${', '}'],
    unsafeDelimiters: ['!{', '}'],
    data: {
      user_email: user_email,
      form_title: "",
      form_content: "",
      post_list: [],
      star_indices: [1, 2, 3, 4, 5],

      all_stocks: self.get_all_stocks(),
      watched_stocks: self.get_watched_stocks(),
      search_result: {},
      search_query: ""
    },
    methods: {
      add_post: self.add_post,
      search: self.search,
      get_all_stocks: self.get_all_stocks,
      is_watching: self.is_watching,
      watch_stock: self.watch_stock,
      get_watched_stocks: self.get_watched_stocks,
      // Likers.
      like_mouseover: self.like_mouseover,
      like_mouseout: self.like_mouseout,
      like_click: self.like_click,
      // Show/hide who liked.
      show_likers: self.show_likers,
      hide_likers: self.hide_likers,
      // Star ratings.
      stars_out: self.stars_out,
      stars_over: self.stars_over,
      set_stars: self.set_stars,
      // Delete post.
      delete_post: self.delete_post
    },

  });

  // If we are logged in, shows the form to add posts.
  if (is_logged_in) {
    $("#add_post").show();
  }

  // Gets the posts.
  self.get_posts();

  return self;
};

var APP = null;

// No, this would evaluate it too soon.
// var APP = app();

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});
