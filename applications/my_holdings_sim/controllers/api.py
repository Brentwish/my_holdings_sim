# Here go your api methods.

import requests

@auth.requires_signature()
def watch_stock():
    val = request.vars.val
    symbol = request.vars.symbol
    email = auth.user.email
    if val == "true":
        db.watched_stocks.insert(user_email = email, symbol = symbol)
    else:
        db(db.watched_stocks.user_email == email and db.watched_stocks.symbol == symbol).delete()
    return response.json(dict(ok=True))

@auth.requires_signature()
def get_watched_stocks():
    email = auth.user.email
    result = []
    for row in db(db.watched_stocks.user_email == email).select():
        result.append(row.symbol)
    return response.json(dict(symbols=result))

def search():
    result = {}
    q = request.vars.query.lower()
    iex = "https://api.iextrading.com/1.0"
    select = "SELECT last_updated, symbol, name, price, mktcap, logo"
    where = "WHERE LOWER(symbol) LIKE '%" + q + "%' OR LOWER(symbol) LIKE '" + q + "';"
    search_result = db.executesql(select + " FROM stocks " + where)[:20]
    should_update = any(map(lambda s: (s[0] is None), search_result))
    if should_update:
        symbols = 'symbols=' + ','.join(map((lambda s: s[1]), search_result))
        types = 'types=' + ','.join(['price', 'stats', 'logo'])
        r = requests.get(iex + "/stock/market/batch?" + symbols + "&" + types)
        stocks = r.json()
        # data is a dictionary where each key is a symbol and the value
        # is the stock.
        for symbol, stock in stocks.iteritems():
            result[symbol] = {
                'symbol': symbol,
                'name': stock["stats"]["companyName"],
                'price': stock["price"],
                'mktcap': stock["stats"]["marketcap"],
                'logo': stock["logo"]["url"]
            }
            row = db(db.stocks.symbol == symbol).select().first()
            if row:
                print("Updating db.stocks row: " + symbol)
                row.update_record(
                    last_updated=get_current_time(),
                    name=stock["stats"]["companyName"],
                    price=stock["price"],
                    mktcap=stock["stats"]["marketcap"],
                    logo=stock["logo"]["url"]
                )
    else:
        for s in search_result:
            result[s[1]] = {
                'symbol': s[1],
                'name': s[2],
                'price': s[3],
                'mktcap': s[4],
                'logo': s[5]
            }


    return response.json(dict(result=result))
