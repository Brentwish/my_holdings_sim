// This is the js for the default/index.html view.
var app = function() {
  var self = {};
  Vue.config.silent = false; // show all warnings

  self.search = () => {
    $.get(search_ep, { query: self.vue.search_query }, res => {
      self.vue.search_result = res.result;
    });
  }

  self.is_watching = symbol => {
    if (is_logged_in) {
      const s = self.vue.watched_stocks;
      if (s) {
        return s[symbol] !== undefined;
      }
      return false;
    }
  };

  self.watch_stock = symbol => {
    if (is_logged_in) {
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
  };

  self.get_watched_stocks = () => {
    if (is_logged_in) {
      let result = {};
      if (is_logged_in) {
        $.get(get_watched_stocks_ep, {}, res => {
          console.log("Watched Stocks: ");
          console.log(res["stocks"]);
          self.vue.watched_stocks = res["stocks"];
        });
      }
    }
  };

  self.buy = symbol => {
    if (is_logged_in) {
      window.location.href = `${buy}?s=${symbol}`;
    }
  };

  self.buy_stock = (s, q) => {
    if (is_logged_in) {
      $.post(buy_stock_ep, { symbol:s, quantity:q }, res => {
        console.log(res);
      });
    }
  };

  self.get_purchases = () => {
    if (is_logged_in) {
      $.get(get_purchases_ep, {}, res => {
        self.vue.purchases = res["purchases"];
      });
    }
  }

  // Complete as needed.
  self.vue = new Vue({
    el: "#vue-div",
    delimiters: ['${', '}'],
    unsafeDelimiters: ['!{', '}'],
    data: {
      user_email: user_email,
      purchases: self.get_purchases(),
      watched_stocks: self.get_watched_stocks(),
      search_result: {},
      search_query: "",
      buy_symbol: "",
      buy_quantity: "",
    },
    methods: {
      search: self.search,
      is_watching: self.is_watching,
      watch_stock: self.watch_stock,
      get_watched_stocks: self.get_watched_stocks,
      get_purchases: self.get_purchases,
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
