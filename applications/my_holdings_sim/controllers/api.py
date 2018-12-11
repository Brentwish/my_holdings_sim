# Here go your api methods.

import requests

@auth.requires_signature()
def get_purchases():
    email = auth.user.email
    fields = " s.symbol, s.name, s.price, s.mktcap, s.logo, p.quantity "
    tables = " stocks s, purchases p "
    cond = " p.user_email = '" + email + "' AND p.symbol = s.symbol"
    purchases = db.executesql("SELECT" + fields + "FROM" + tables + "WHERE" + cond + ";")
    result = []
    for p in purchases:
        result.append({
            'symbol': p[0],
            'name': p[1],
            'price': p[2],
            'mktcap': p[3],
            'logo': p[4],
            'quantity': p[5]
        })
    return response.json(dict(ok=True, purchases=result))

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
    result = {}
    select = "SELECT s.symbol, s.name, s.price, s.mktcap, s.logo "
    where = "WHERE ws.symbol = s.symbol AND ws.user_email = '" + email + "';"
    watched_stocks = db.executesql(select + "FROM watched_stocks ws, stocks s " + where)
    for s in watched_stocks:
        result[s[0]] = {
            'symbol': s[0],
            'name': s[1],
            'price': s[2],
            'mktcap': s[3],
            'logo': s[4]
        }
    return response.json(dict(stocks=result))

def search():
    result = {}
    q = request.vars.query.lower()
    iex = "https://api.iextrading.com/1.0"
    select = "SELECT last_updated, symbol, name, price, mktcap, logo"
    where = "WHERE LOWER(symbol) LIKE '%" + q + "%' OR LOWER(symbol) LIKE '" + q + "';"
    search_result = db.executesql(select + " FROM stocks " + where)
    should_update = any(map(lambda s:
        (s[0] is None or s[0] > get_current_time() + timedelta(minutes=1)), search_result
    ))
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

@auth.requires_signature()
def buy_stock():
    email = auth.user.email
    if email is None:
        return response.json(dict(ok=False))

    symbol = request.vars.symbol
    if symbol is None:
        return response.json(dict(ok=False))
    symbol = symbol.upper()

    quantity = request.vars.quantity
    if quantity is None:
        return response.json(dict(ok=False))
    quantity = int(quantity)

    select = "SELECT s.price FROM stocks s WHERE s.symbol = '" + symbol + "';"
    stock_price = db.executesql(select)[0][0]
    if stock_price is None:
        return response.json(dict(ok=False))
    stock_price = int(float(stock_price))

    balance = db.executesql("SELECT u.balance FROM auth_user u WHERE u.email = '" + email + "';")[0][0]
    if balance is None:
        return response.json(dict(ok=False))
    balance = int(float(balance))

    purchase_total = quantity * stock_price
    if purchase_total > balance:
        return response.json(dict(ok=False, err="Insufficient balance"))

    db.purchases.insert(
        user_email=email,
        symbol=symbol,
        quantity=quantity,
        purchase_price=stock_price,
        purchase_date=get_current_time()
    )

    new_balance = str(balance - purchase_total)
    db.executesql("UPDATE auth_user SET balance = " + new_balance + " WHERE email = '" + email + "';")

    redirect(URL(c='default', f='index'), client_side=True)
    return response.json(dict(ok=True))

@auth.requires_signature()
def sell_stock():
    email = auth.user.email
    if email is None:
        return response.json(dict(ok=False))
    print(email)

    symbol = request.vars.symbol
    if symbol is None:
        return response.json(dict(ok=False))
    print(symbol)

    select = "SELECT s.price FROM stocks s WHERE s.symbol = '" + symbol + "';"
    current_stock_price = db.executesql(select)[0][0]
    if current_stock_price is None:
        return response.json(dict(ok=False))
    current_stock_price = int(float(current_stock_price))
    print(current_stock_price)

    select = "SELECT p.quantity, p.id FROM purchases p WHERE p.symbol = '" + symbol + "';"
    purchase = db.executesql(select)[0]

    purchased_stock_quantity = purchase[0]
    if purchased_stock_quantity is None:
        return response.json(dict(ok=False))
    purchased_stock_quantity = int(purchased_stock_quantity)
    print(purchased_stock_quantity)

    purchase_id = purchase[1]

    balance = db.executesql("SELECT u.balance FROM auth_user u WHERE u.email = '" + email + "';")[0][0]
    if balance is None:
        return response.json(dict(ok=False))
    balance = int(float(balance))
    print(balance)

    profit = purchased_stock_quantity*(current_stock_price)
    print(profit)

    new_balance = str(balance + profit)
    db.executesql("UPDATE auth_user SET balance = " + new_balance + " WHERE email = '" + email + "';")
    db.executesql("DELETE FROM purchases WHERE id = " + str(purchase_id) + ";")


    redirect(URL(c='default', f='index'), client_side=True)
    return response.json(dict(ok=True))
