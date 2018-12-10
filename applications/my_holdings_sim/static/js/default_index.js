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
      console.log(res.result);
    });

    //If they searched before all_stocks loads return from function
    //if (!self.vue.all_stocks) return false;

    ////Filter out strings that don't contain self.vue.search_query
    ////Reduce it into a comma separated string of tickers for the path params
    //let symbols = Object.keys(self.vue.all_stocks)
    //  .filter( s => s.match(self.vue.search_query.toUpperCase()))
    //  .slice(0, MAX_SEARCH_RESULT)
    //  .reduce((s, c) => s + c + ",", "").slice(0, -1);
    //let result = {};

    //if (!symbols) {
    //  self.vue.search_result = {};
    //} else {
    //  symbols = "symbols=" + symbols;
    //  const types = "types=stats,price,logo";
    //  const path = `${ iex }/stock/market/batch?${ symbols }&${ types }`;

    //  $.get(path, res => {
    //    Object.keys(res).forEach( s => {
    //      result[s] = self.vue.all_stocks[s];
    //      result[s]["mktcap"] = res[s]["stats"]["marketcap"];
    //      result[s]["price"] = res[s]["price"];
    //      result[s]["logo"] = res[s]["logo"]["url"];
    //    });
    //    self.vue.search_result = result;
    //  });
    //}
  }

  self.get_all_stocks = () => {
    let result = {};
    $.get(`${ iex }/ref-data/symbols`, res => {
      res.forEach( s => result[s.symbol] = s );
      self.vue.all_stocks = result;
    })
  }

  self.is_watching = symbol => {
    if (self.vue.watched_stocks)
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
    if (is_logged_in) {
      $.get(get_watched_stocks_ep, {}, res => {
        console.log(res);
        res["symbols"].forEach( s => result[s] = true);
        console.log(self.vue.watched_stocks);
      });
    }
    return result;
  }

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
      search_query: ""
    },
    methods: {
      search: self.search,
      get_all_stocks: self.get_all_stocks,
      is_watching: self.is_watching,
      watch_stock: self.watch_stock,
      get_watched_stocks: self.get_watched_stocks,
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
