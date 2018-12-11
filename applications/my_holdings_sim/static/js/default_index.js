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

  self.search = () => {
    $.get(search_ep, { query: self.vue.search_query }, res => {
      self.vue.search_result = res.result;
    });
  }

  self.get_all_stocks = () => {
    let result = {};
    $.get(`${ iex }/ref-data/symbols`, res => {
      res.forEach( s => result[s.symbol] = s );
      self.vue.all_stocks = result;
    })
  }

  self.is_watching = symbol => {
    const s = self.vue.watched_stocks;
    if (s) {
      return s[symbol] !== undefined;
    }
    return false;
  }

  self.watch_stock = symbol => {
    if (self.vue.watched_stocks[symbol]) {
      $.post(watch_stock_ep, { symbol, val: false }, res => {
        Vue.set(self.vue.watched_stocks, symbol, undefined);
        delete self.vue.watched_stocks[symbol]
      });
    } else {
      $.post(watch_stock_ep, { symbol, val: true }, res => {
        Vue.set(self.vue.watched_stocks, symbol, self.vue.search_result[symbol]);
      });
    }
  }

  self.get_watched_stocks = () => {
    let result = {};
    if (is_logged_in) {
      $.get(get_watched_stocks_ep, {}, res => {
        console.log("Watched Stocks: ");
        console.log(res["stocks"]);
        self.vue.watched_stocks = res["stocks"];
      });
    }
  };

  self.buy = symbol => {
    window.location.href = `${buy}?s=${symbol}`;
  };

  self.buy_stock = (s, q) => {
    $.post(buy_stock_ep, { symbol:s, quantity:q }, res => {
      console.log(res);
    });
  };

  // Complete as needed.
  self.vue = new Vue({
    el: "#vue-div",
    delimiters: ['${', '}'],
    unsafeDelimiters: ['!{', '}'],
    data: {
      user_email: user_email,
      all_stocks: self.get_all_stocks(),
      watched_stocks: self.get_watched_stocks(),
      search_result: {},
      search_query: "",
      buy_symbol: "",
      buy_quantity: "",
    },
    methods: {
      search: self.search,
      get_all_stocks: self.get_all_stocks,
      is_watching: self.is_watching,
      watch_stock: self.watch_stock,
      get_watched_stocks: self.get_watched_stocks,
      buy_stock: self.buy_stock,
      buy: self.buy,
    },
  });
  return self;
};

var APP = null;

// No, this would evaluate it too soon.
// var APP = app();

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});
